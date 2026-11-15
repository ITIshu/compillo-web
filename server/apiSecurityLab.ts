import type { Request, Response } from 'express';
import { spawn } from 'child_process';

export type AuditLanguage = 'python' | 'javascript' | 'html' | 'cpp';

export interface AuditFinding {
  line: number;
  severity: 'critical' | 'warning' | 'info';
  rule: string;
  message: string;
  fixHint: string;
}

const MAX_CODE_BYTES = 64 * 1024;
const PYTHON_AUDIT_SCRIPT = `
import ast, json, re, sys

source = sys.stdin.read()
findings = []

# Secret scan
secret_patterns = [
    (r'sk-[A-Za-z0-9]{16,}', 'hardcoded-openai-key', 'Possible OpenAI/Stripe secret key literal detected.'),
    (r'AIza[0-9A-Za-z_-]{20,}', 'hardcoded-google-key', 'Possible Google/Firebase API key literal detected.'),
    (r'ghp_[0-9A-Za-z]{20,}', 'hardcoded-github-token', 'Possible GitHub Personal Access Token detected.'),
    (r'AKIA[0-9A-Z]{16}', 'hardcoded-aws-key', 'Possible AWS Access Key ID detected.'),
]
for line_no, raw_line in enumerate(source.splitlines(), 1):
    for pat, rule, msg in secret_patterns:
        if re.search(pat, raw_line):
            findings.append({
                "line": line_no,
                "severity": "critical",
                "rule": rule,
                "message": msg,
                "fixHint": "Move credentials into environment variables (os.environ.get(...)) instead of source code."
            })

try:
    tree = ast.parse(source)
except SyntaxError as e:
    findings.append({
        "line": e.lineno or 1,
        "severity": "critical",
        "rule": "python-syntax-error",
        "message": f"SyntaxError: {e.msg}",
        "fixHint": "Fix syntax syntax near column " + str(e.offset or 1) + " before running or deploying."
    })
    print(json.dumps({"findings": findings}))
    sys.exit(0)

def has_loop_exit(body):
    for stmt in body:
        for sub in ast.walk(stmt):
            if isinstance(sub, (ast.Break, ast.Return, ast.Raise)):
                return True
            if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Attribute) and sub.func.attr == 'exit':
                return True
            if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Name) and sub.func.id in ('exit', 'quit'):
                return True
    return False

for node in ast.walk(tree):
    if isinstance(node, ast.Call):
        func_name = ''
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
        elif isinstance(node.func, ast.Attribute):
            parent = node.func.value.id if isinstance(node.func.value, ast.Name) else ''
            func_name = f"{parent}.{node.func.attr}" if parent else node.func.attr

        if func_name in ('eval', 'exec'):
            findings.append({
                "line": getattr(node, 'lineno', 1),
                "severity": "critical",
                "rule": "unsafe-dynamic-exec",
                "message": f"Call to {func_name}() allows arbitrary code execution.",
                "fixHint": "Use ast.literal_eval() for literals or an explicit parser instead of eval()/exec()."
            })
        elif func_name in ('os.system', 'pickle.loads', 'pickle.load'):
            findings.append({
                "line": getattr(node, 'lineno', 1),
                "severity": "critical",
                "rule": "unsafe-system-or-deserialization",
                "message": f"Call to {func_name}() introduces command injection or unsafe deserialization risk.",
                "fixHint": "Use subprocess.run([...], shell=False) or json.loads() instead."
            })
        elif func_name.startswith('subprocess.'):
            for kw in node.keywords:
                if kw.arg == 'shell' and isinstance(kw.value, ast.Constant) and kw.value.value is True:
                    findings.append({
                        "line": getattr(node, 'lineno', 1),
                        "severity": "critical",
                        "rule": "subprocess-shell-true",
                        "message": "subprocess called with shell=True.",
                        "fixHint": "Pass an argument list with shell=False to prevent shell injection."
                    })

    elif isinstance(node, ast.While):
        if isinstance(node.test, ast.Constant) and node.test.value is True:
            if not has_loop_exit(node.body):
                findings.append({
                    "line": getattr(node, 'lineno', 1),
                    "severity": "critical",
                    "rule": "unbounded-while-true",
                    "message": "while True loop has no break, return, or raise exit path (CPU hang risk).",
                    "fixHint": "Add an explicit termination condition or break guard inside the loop."
                })

    elif isinstance(node, ast.ExceptHandler):
        if node.type is None:
            findings.append({
                "line": getattr(node, 'lineno', 1),
                "severity": "warning",
                "rule": "bare-except",
                "message": "Bare except: catches KeyboardInterrupt and SystemExit, hiding real bugs.",
                "fixHint": "Catch specific exception types such as except ValueError as err:"
            })

    elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        for default in node.args.defaults:
            if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                findings.append({
                    "line": getattr(node, 'lineno', 1),
                    "severity": "warning",
                    "rule": "mutable-default-arg",
                    "message": f"Function '{node.name}' uses a mutable default argument that persists across calls.",
                    "fixHint": "Default to None and initialize inside the function body: if arg is None: arg = []"
                })

print(json.dumps({"findings": findings}))
`;

function scanSecretLines(lines: string[]): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const patterns: Array<{ re: RegExp; rule: string; msg: string }> = [
    { re: /sk-[A-Za-z0-9]{16,}/, rule: 'hardcoded-secret-key', msg: 'Possible secret API key literal detected.' },
    { re: /AIza[0-9A-Za-z_-]{20,}/, rule: 'hardcoded-google-key', msg: 'Possible Google/Firebase key literal detected.' },
    { re: /ghp_[0-9A-Za-z]{20,}/, rule: 'hardcoded-github-token', msg: 'Possible GitHub token literal detected.' },
  ];
  lines.forEach((line, idx) => {
    for (const p of patterns) {
      if (p.re.test(line)) {
        findings.push({
          line: idx + 1,
          severity: 'critical',
          rule: p.rule,
          message: p.msg,
          fixHint: 'Load secrets via server-side environment variables instead of hardcoding them.',
        });
      }
    }
  });
  return findings;
}

function auditJavaScript(code: string): AuditFinding[] {
  const lines = code.split('\n');
  const findings: AuditFinding[] = [...scanSecretLines(lines)];

  lines.forEach((line, idx) => {
    const ln = idx + 1;
    if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(line)) {
      findings.push({
        line: ln,
        severity: 'critical',
        rule: 'unsafe-eval',
        message: 'eval() or new Function() executes arbitrary code and creates XSS/crash vectors.',
        fixHint: 'Replace with JSON.parse() or a safe structured expression parser.',
      });
    }
    if (/\.innerHTML\s*=|\bdocument\.write\s*\(/.test(line)) {
      findings.push({
        line: ln,
        severity: 'critical',
        rule: 'dom-xss-sink',
        message: 'Direct innerHTML / document.write assignment can inject unescaped HTML/XSS.',
        fixHint: 'Use .textContent or sanitize HTML before inserting into the DOM.',
      });
    }
    if (/\bwhile\s*\(\s*true\s*\)/.test(line)) {
      const windowSlice = lines.slice(idx, Math.min(lines.length, idx + 20)).join('\n');
      if (!/\b(break|return|throw)\b/.test(windowSlice)) {
        findings.push({
          line: ln,
          severity: 'critical',
          rule: 'infinite-loop-risk',
          message: 'while (true) loop appears to lack a break/return exit within nearby statements.',
          fixHint: 'Add an explicit loop termination check or iteration limit.',
        });
      }
    }
    if (/catch\s*(\([^)]*\))?\s*\{\s*\}/.test(line)) {
      findings.push({
        line: ln,
        severity: 'warning',
        rule: 'empty-catch-block',
        message: 'Empty catch block silently swallows runtime errors.',
        fixHint: 'Log or surface a user-friendly error state inside catch.',
      });
    }
  });

  return findings;
}

function auditHtml(code: string): AuditFinding[] {
  const lines = code.split('\n');
  const findings: AuditFinding[] = [...scanSecretLines(lines)];

  lines.forEach((line, idx) => {
    const ln = idx + 1;
    if (/\bon(click|load|error|mouseover|input|submit)\s*=/i.test(line)) {
      findings.push({
        line: ln,
        severity: 'warning',
        rule: 'inline-event-handler',
        message: 'Inline HTML on* event attribute weakens Content Security Policy hygiene.',
        fixHint: 'Attach listeners via addEventListener() in a dedicated JS file.',
      });
    }
    if (/href\s*=\s*["']\s*javascript:/i.test(line)) {
      findings.push({
        line: ln,
        severity: 'critical',
        rule: 'javascript-uri',
        message: 'javascript: URI link detected (XSS risk).',
        fixHint: 'Use a <button type="button"> or real https:// route instead.',
      });
    }
    if (/<script[^>]+src\s*=\s*["']http:\/\//i.test(line)) {
      findings.push({
        line: ln,
        severity: 'warning',
        rule: 'insecure-http-script',
        message: 'Insecure http:// external script breaks HTTPS mixed-content security.',
        fixHint: 'Switch script src URL to https:// or self-host the file.',
      });
    }
  });

  if (!/<title>.*<\/title>/is.test(code)) {
    findings.push({
      line: 1,
      severity: 'info',
      rule: 'missing-title',
      message: 'Document is missing a <title> tag.',
      fixHint: 'Add <title>Your App Name</title> inside <head>.',
    });
  }
  if (!/<meta[^>]+name=["']viewport["']/i.test(code)) {
    findings.push({
      line: 1,
      severity: 'info',
      rule: 'missing-viewport-meta',
      message: 'Missing responsive viewport meta tag.',
      fixHint: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">.',
    });
  }

  return findings;
}

function auditCpp(code: string): AuditFinding[] {
  const lines = code.split('\n');
  const findings: AuditFinding[] = [...scanSecretLines(lines)];

  lines.forEach((line, idx) => {
    const ln = idx + 1;
    if (/\b(gets|strcpy|strcat|sprintf)\s*\(/.test(line)) {
      findings.push({
        line: ln,
        severity: 'critical',
        rule: 'unsafe-c-buffer-call',
        message: 'Unbounded C string function (gets/strcpy/strcat/sprintf) risks stack buffer overflow.',
        fixHint: 'Use std::string, fgets(), snprintf(), or strncpy() with explicit bounds.',
      });
    }
    if (/\bwhile\s*\(\s*(true|1)\s*\)/.test(line)) {
      const windowSlice = lines.slice(idx, Math.min(lines.length, idx + 20)).join('\n');
      if (!/\b(break|return|exit)\b/.test(windowSlice)) {
        findings.push({
          line: ln,
          severity: 'critical',
          rule: 'infinite-loop-risk',
          message: 'Unbounded while(true)/while(1) loop without break/return guard.',
          fixHint: 'Add an explicit termination condition or max-iteration cap.',
        });
      }
    }
    if (/->/.test(line) && !/(nullptr|NULL|!= 0|if\s*\()/.test(lines.slice(Math.max(0, idx - 3), idx + 1).join('\n'))) {
      findings.push({
        line: ln,
        severity: 'warning',
        rule: 'pointer-dereference-check',
        message: 'Pointer dereference (->) without an obvious nearby nullptr guard (SIGSEGV risk).',
        fixHint: 'Verify if (ptr == nullptr) return; before dereferencing pointer members.',
      });
    }
  });

  return findings;
}

function runPythonAstAudit(code: string): Promise<AuditFinding[]> {
  return new Promise((resolve, reject) => {
    const pyBin = process.env.PYTHON_BIN || 'python3';
    const child = spawn(pyBin, ['-c', PYTHON_AUDIT_SCRIPT], { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(new Error('Python AST audit timed out after 3 seconds.'));
    }, 3000);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf-8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf-8');
    });
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (exitCode !== 0 && !stdout.trim()) {
        reject(new Error(stderr || `Python exited with code ${exitCode}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(Array.isArray(parsed.findings) ? parsed.findings : []);
      } catch {
        reject(new Error('Failed to parse Python AST audit response.'));
      }
    });

    child.stdin.write(code);
    child.stdin.end();
  });
}

function computeScore(findings: AuditFinding[]): number {
  let score = 100;
  for (const f of findings) {
    if (f.severity === 'critical') score -= 25;
    else if (f.severity === 'warning') score -= 10;
    else score -= 4;
  }
  return Math.max(0, score);
}

export async function handleCodeAudit(req: Request, res: Response) {
  try {
    const languageRaw = String(req.body?.language || 'python').toLowerCase();
    const code = typeof req.body?.code === 'string' ? req.body.code : '';

    if (!['python', 'javascript', 'html', 'cpp'].includes(languageRaw)) {
      res.status(400).json({ ok: false, error: 'Unsupported language. Choose python, javascript, html, or cpp.' });
      return;
    }
    if (!code.trim()) {
      res.status(400).json({ ok: false, error: 'Please paste code to analyze.' });
      return;
    }
    if (Buffer.byteLength(code, 'utf-8') > MAX_CODE_BYTES) {
      res.status(400).json({ ok: false, error: 'Code payload exceeds 64 KB limit.' });
      return;
    }

    const language = languageRaw as AuditLanguage;
    let findings: AuditFinding[];
    if (language === 'python') {
      findings = await runPythonAstAudit(code);
    } else if (language === 'javascript') {
      findings = auditJavaScript(code);
    } else if (language === 'html') {
      findings = auditHtml(code);
    } else {
      findings = auditCpp(code);
    }

    const score = computeScore(findings);
    const criticalCount = findings.filter((f) => f.severity === 'critical').length;
    const warningCount = findings.filter((f) => f.severity === 'warning').length;

    res.json({
      ok: true,
      language,
      score,
      lineCount: code.split('\n').length,
      criticalCount,
      warningCount,
      findings,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Static audit failed' });
  }
}

export async function handleSiteAudit(req: Request, res: Response, port = 3000) {
  try {
    const slug = String(req.body?.slug || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');

    if (!slug) {
      res.status(400).json({ ok: false, error: 'Enter a valid hosted route slug (e.g. ishant-calculator).' });
      return;
    }

    const livePath = `/hosted/${slug}/`;
    const targetUrl = `http://127.0.0.1:${port}${livePath}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const t0 = performance.now();

    let response: globalThis.Response;
    try {
      response = await fetch(targetUrl, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    const bodyText = await response.text();
    const latencyMs = Math.round((performance.now() - t0) * 10) / 10;
    const sizeBytes = Buffer.byteLength(bodyText, 'utf-8');
    const contentType = response.headers.get('content-type') || '';

    const titleMatch = bodyText.match(/<title>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(bodyText);
    const hasDescription = /<meta[^>]+name=["']description["']/i.test(bodyText);
    const hasH1 = /<h1[\s>]/i.test(bodyText);
    const imgTags = bodyText.match(/<img\b[^>]*>/gi) || [];
    const imgsMissingAlt = imgTags.filter((tag) => !/\balt\s*=/i.test(tag)).length;
    const hasInlineJsUri = /javascript:/i.test(bodyText);
    const hasMixedScript = /<script[^>]+src=["']http:\/\//i.test(bodyText);

    const checks = [
      {
        name: 'Route responds with HTTP 200',
        passed: response.status === 200,
        detail: `Returned HTTP ${response.status} in ${latencyMs} ms`,
      },
      {
        name: 'Document <title> present',
        passed: title.length > 0,
        detail: title ? `Title: "${title.slice(0, 60)}"` : 'No <title> element found',
      },
      {
        name: 'Responsive viewport meta configured',
        passed: hasViewport,
        detail: hasViewport ? 'Viewport meta tag found' : 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">',
      },
      {
        name: 'Meta description present',
        passed: hasDescription,
        detail: hasDescription ? 'SEO meta description found' : 'Add <meta name="description" content="...">',
      },
      {
        name: 'Primary <h1> heading present',
        passed: hasH1,
        detail: hasH1 ? 'Semantic <h1> found' : 'No <h1> heading detected',
      },
      {
        name: 'Image accessibility (alt text)',
        passed: imgsMissingAlt === 0,
        detail: imgTags.length === 0 ? 'No <img> elements' : `${imgsMissingAlt} of ${imgTags.length} images missing alt attribute`,
      },
      {
        name: 'No mixed HTTP scripts or javascript: URIs',
        passed: !hasInlineJsUri && !hasMixedScript,
        detail: !hasInlineJsUri && !hasMixedScript ? 'Clean HTTPS/URI hygiene' : 'Detected insecure http:// script or javascript: link',
      },
    ];

    const passedCount = checks.filter((c) => c.passed).length;
    const healthScore = Math.round((passedCount / checks.length) * 100);

    const headerObj: Record<string, string> = {};
    response.headers.forEach((v, k) => {
      headerObj[k] = v;
    });

    res.json({
      ok: true,
      slug,
      livePath,
      status: response.status,
      contentType,
      latencyMs,
      sizeBytes,
      healthScore,
      title,
      headers: headerObj,
      checks,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Site audit failed' });
  }
}

export async function handleLocalHttpTest(req: Request, res: Response, port = 3000) {
  try {
    const method = String(req.body?.method || 'GET').toUpperCase();
    const rawPath = String(req.body?.path || '/api/health').trim();

    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) {
      res.status(400).json({ ok: false, error: 'Unsupported HTTP method.' });
      return;
    }

    if (rawPath.length > 512 || rawPath.includes('..')) {
      res.status(400).json({ ok: false, error: 'Invalid target path.' });
      return;
    }

    const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    if (!normalizedPath.startsWith('/hosted/') && !normalizedPath.startsWith('/api/')) {
      res.status(400).json({
        ok: false,
        error: 'For security, only local Compillo endpoints (/hosted/... or /api/...) are allowed.',
      });
      return;
    }

    if (normalizedPath.startsWith('/api/beta/http-test')) {
      res.status(400).json({ ok: false, error: 'Recursive calls to /api/beta/http-test are blocked.' });
      return;
    }

    const reqHeaders: Record<string, string> = {};
    if (req.body?.headers && typeof req.body.headers === 'object') {
      for (const [k, v] of Object.entries(req.body.headers)) {
        const key = String(k).trim();
        if (key && !['host', 'content-length'].includes(key.toLowerCase())) {
          reqHeaders[key] = String(v);
        }
      }
    }

    let bodyPayload: string | undefined;
    if ((method === 'POST' || method === 'PUT') && typeof req.body?.body === 'string' && req.body.body.trim()) {
      bodyPayload = req.body.body;
      if (!reqHeaders['Content-Type'] && !reqHeaders['content-type']) {
        reqHeaders['Content-Type'] = 'application/json';
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const t0 = performance.now();

    let response: globalThis.Response;
    try {
      response = await fetch(`http://127.0.0.1:${port}${normalizedPath}`, {
        method,
        headers: reqHeaders,
        body: bodyPayload,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const latencyMs = Math.round((performance.now() - t0) * 10) / 10;
    const rawText = await response.text();
    const truncated = rawText.length > 128 * 1024 ? rawText.slice(0, 128 * 1024) + '\n... [truncated]' : rawText;

    let formattedBody = truncated;
    let isJson = false;
    try {
      const parsed = JSON.parse(rawText);
      formattedBody = JSON.stringify(parsed, null, 2);
      isJson = true;
    } catch {
      // plain text or HTML
    }

    const respHeaders: Record<string, string> = {};
    response.headers.forEach((v, k) => {
      respHeaders[k] = v;
    });

    res.json({
      ok: true,
      method,
      path: normalizedPath,
      status: response.status,
      statusText: response.statusText,
      latencyMs,
      sizeBytes: Buffer.byteLength(rawText, 'utf-8'),
      isJson,
      headers: respHeaders,
      body: formattedBody,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'HTTP request failed' });
  }
}
