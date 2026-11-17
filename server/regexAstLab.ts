import { Request, Response } from 'express';
import { transformSync } from 'esbuild';
import * as acorn from 'acorn';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

export interface AstNodeSummary {
  kind: string;
  line: number;
  column: number;
  text: string;
  children: AstNodeSummary[];
}

export interface TokenSummary {
  kind: string;
  text: string;
  line: number;
  column: number;
}

function isAstNodeLike(val: unknown): val is acorn.AnyNode {
  return (
    typeof val === 'object' &&
    val !== null &&
    typeof (val as Record<string, unknown>).type === 'string' &&
    typeof (val as Record<string, unknown>).start === 'number' &&
    typeof (val as Record<string, unknown>).end === 'number'
  );
}

function getChildNodes(node: acorn.AnyNode): acorn.AnyNode[] {
  const children: acorn.AnyNode[] = [];
  const record = node as unknown as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
    const val = record[key];
    if (Array.isArray(val)) {
      for (const item of val) {
        if (isAstNodeLike(item)) {
          children.push(item);
        }
      }
    } else if (isAstNodeLike(val)) {
      children.push(val);
    }
  }
  return children;
}

function buildTsAst(source: string): { ast: AstNodeSummary; tokens: TokenSummary[]; error?: string } {
  let jsCode = source;
  try {
    const transformed = transformSync(source, {
      loader: 'tsx',
      jsx: 'transform',
      format: 'esm',
    });
    jsCode = transformed.code;
  } catch (err: any) {
    const msg = err?.errors?.[0]?.text || err?.message || 'Failed to parse TypeScript syntax';
    return {
      ast: { kind: 'SyntaxError', line: 1, column: 1, text: String(msg).slice(0, 120), children: [] },
      tokens: [],
      error: msg,
    };
  }

  let program: acorn.Program;
  try {
    program = acorn.parse(jsCode, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    });
  } catch (err: any) {
    const msg = err?.message || 'Syntax error';
    return {
      ast: { kind: 'SyntaxError', line: 1, column: 1, text: String(msg).slice(0, 120), children: [] },
      tokens: [],
      error: msg,
    };
  }

  let nodeBudget = 320;
  const visit = (node: acorn.AnyNode): AstNodeSummary => {
    const rawText = jsCode.slice(node.start, node.end).replace(/\s+/g, ' ').trim();
    const children: AstNodeSummary[] = [];
    if (nodeBudget > 0) {
      for (const child of getChildNodes(node)) {
        if (nodeBudget <= 0) break;
        nodeBudget -= 1;
        children.push(visit(child));
      }
    }
    return {
      kind: node.type,
      line: node.loc?.start.line ?? 1,
      column: (node.loc?.start.column ?? 0) + 1,
      text: rawText.slice(0, 64),
      children,
    };
  };

  const tokens: TokenSummary[] = [];
  try {
    for (const tok of acorn.tokenizer(jsCode, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    })) {
      if (tokens.length >= 250) break;
      const tokValue = (tok as unknown as { value?: unknown }).value;
      const tokenText =
        typeof tokValue === 'string' || typeof tokValue === 'number'
          ? String(tokValue)
          : jsCode.slice(tok.start, tok.end) || tok.type.label;
      tokens.push({
        kind: tok.type.keyword ? `Keyword(${tok.type.keyword})` : tok.type.label || 'Token',
        text: tokenText.slice(0, 48),
        line: tok.loc?.start.line ?? 1,
        column: (tok.loc?.start.column ?? 0) + 1,
      });
    }
  } catch {
    // Return parsed AST even if partial tokenization terminates early
  }

  return { ast: visit(program), tokens };
}

function inspectPythonAst(source: string): Promise<{ ast: AstNodeSummary; tokens: TokenSummary[]; error?: string }> {
  return new Promise((resolve) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compillo-ast-'));
    const script = `
import ast, tokenize, io, json

SRC = ${JSON.stringify(source)}

def _to_node(node, budget):
    if budget[0] <= 0:
        return None
    budget[0] -= 1
    kind = type(node).__name__
    line = getattr(node, 'lineno', 1)
    col = getattr(node, 'col_offset', 0) + 1
    label = ''
    for attr in ('id', 'name', 'arg', 'attr', 'value'):
        if hasattr(node, attr) and isinstance(getattr(node, attr), (str, int, float, bool)):
            label = str(getattr(node, attr))
            break
    children = []
    for child in ast.iter_child_nodes(node):
        sub = _to_node(child, budget)
        if sub is not None:
            children.append(sub)
    return {"kind": kind, "line": line, "column": col, "text": label[:64], "children": children}

try:
    tree = ast.parse(SRC)
    root = _to_node(tree, [320])
    toks = []
    for t in tokenize.generate_tokens(io.StringIO(SRC).readline):
        if len(toks) >= 250:
            break
        if t.type in (tokenize.NL, tokenize.ENCODING, tokenize.ENDMARKER):
            continue
        toks.append({
            "kind": tokenize.tok_name.get(t.type, str(t.type)),
            "text": t.string[:48],
            "line": t.start[0],
            "column": t.start[1] + 1,
        })
    print("__AST_JSON__" + json.dumps({"ast": root, "tokens": toks}))
except SyntaxError as e:
    print("__AST_ERR__" + json.dumps({"error": f"SyntaxError (line {e.lineno}): {e.msg}"}))
`;
    const file = path.join(tempDir, 'inspect_ast.py');
    fs.writeFileSync(file, script, 'utf-8');
    const pyBin = fs.existsSync('/usr/bin/python3') ? '/usr/bin/python3' : 'python3';
    const child = spawn(pyBin, [file], { cwd: tempDir });
    let out = '';
    let err = '';
    child.stdout.on('data', (c) => (out += c.toString('utf-8')));
    child.stderr.on('data', (c) => (err += c.toString('utf-8')));
    child.on('close', () => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
      const okLine = out.split('\n').find((l) => l.startsWith('__AST_JSON__'));
      if (okLine) {
        resolve(JSON.parse(okLine.replace('__AST_JSON__', '')));
        return;
      }
      const errLine = out.split('\n').find((l) => l.startsWith('__AST_ERR__'));
      if (errLine) {
        const parsed = JSON.parse(errLine.replace('__AST_ERR__', ''));
        resolve({
          ast: { kind: 'SyntaxError', line: 1, column: 1, text: parsed.error, children: [] },
          tokens: [],
          error: parsed.error,
        });
        return;
      }
      resolve({
        ast: { kind: 'Error', line: 1, column: 1, text: err || 'Failed to parse Python AST', children: [] },
        tokens: [],
        error: err || 'Failed to parse Python AST',
      });
    });
  });
}

export async function handleAstInspect(req: Request, res: Response) {
  try {
    const { code, language } = req.body || {};
    if (typeof code !== 'string') {
      res.status(400).json({ ok: false, error: 'Source code string is required.' });
      return;
    }
    const bounded = code.slice(0, 40_000);
    const lang = String(language || 'typescript').toLowerCase();

    if (lang === 'python') {
      const result = await inspectPythonAst(bounded);
      res.json({ ok: !result.error, language: 'python', ...result });
      return;
    }

    const result = buildTsAst(bounded);
    res.json({ ok: !result.error, language: 'typescript', ...result });
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      error: err?.message || 'AST inspection failed',
      ast: { kind: 'Error', line: 1, column: 1, text: err?.message || 'AST error', children: [] },
      tokens: [],
    });
  }
}
