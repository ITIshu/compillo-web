import { Request, Response } from 'express';
import ts from 'typescript';
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

function buildTsAst(source: string): { ast: AstNodeSummary; tokens: TokenSummary[] } {
  const sf = ts.createSourceFile('snippet.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let nodeBudget = 320;

  const visit = (node: ts.Node): AstNodeSummary => {
    const start = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    const rawText = node.getText(sf).replace(/\s+/g, ' ').trim();
    const children: AstNodeSummary[] = [];
    if (nodeBudget > 0) {
      ts.forEachChild(node, (child) => {
        if (nodeBudget > 0) {
          nodeBudget -= 1;
          children.push(visit(child));
        }
      });
    }
    return {
      kind: ts.SyntaxKind[node.kind],
      line: start.line + 1,
      column: start.character + 1,
      text: rawText.slice(0, 64),
      children,
    };
  };

  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, source);
  const tokens: TokenSummary[] = [];
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken && tokens.length < 250) {
    const pos = sf.getLineAndCharacterOfPosition(scanner.getTokenPos());
    tokens.push({
      kind: ts.SyntaxKind[token],
      text: scanner.getTokenText().slice(0, 48),
      line: pos.line + 1,
      column: pos.character + 1,
    });
    token = scanner.scan();
  }

  return { ast: visit(sf), tokens };
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
  res.json({ ok: true, language: 'typescript', ...result });
}
