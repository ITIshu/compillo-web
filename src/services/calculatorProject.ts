import { FileNode } from '../types';

export function getCalculatorProject(): FileNode[] {
  return [
    {
      id: 'calc-readme',
      name: 'README.md',
      path: '/README.md',
      type: 'file',
      language: 'markdown',
      isOpen: false,
      isDirty: false,
      content: `# PyCalc Studio — Python + HTML/Tailwind/JS Calculator

A full-stack precision calculator with a safe Python AST math engine and responsive Tailwind CSS interface.

## Run Through Compillo Terminal
1. Click **Terminal** in the bottom panel.
2. Start the Python server in the background on port \`5050\`:
   \`\`\`bash
   python3 server.py &
   \`\`\`
   *(Or run from anywhere: \`cd projects/calculator && python3 server.py &\`)*
3. Open it inside Compillo Live Preview:
   \`\`\`bash
   ports open 5050
   \`\`\`

## API Endpoints
- \`GET /api/health\` — Server status, port, and Python version
- \`POST /api/calculate\` — Safely evaluate \`{ expression, angleMode }\` using Python's AST
- \`GET /api/history\` — Fetch calculation tape stored on the Python server
- \`DELETE /api/history\` — Clear calculation tape
`,
    },
    {
      id: 'calc-index-html',
      name: 'index.html',
      path: '/index.html',
      type: 'file',
      language: 'html',
      isOpen: true,
      isDirty: false,
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PyCalc — Python Precision Calculator</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="style.css" />
</head>
<body class="bg-[#0B0E17] text-slate-100 min-h-screen flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
  <header class="border-b border-slate-800/90 bg-[#0F1420]">
    <div class="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-8">
      <div class="text-base font-semibold tracking-tight text-white whitespace-nowrap shrink-0">
        PyCalc Studio
      </div>
      <div class="hidden sm:flex items-center gap-6 text-xs font-medium text-slate-400">
        <span id="backend-status" class="font-mono whitespace-nowrap shrink-0 text-slate-400">
          Checking Python API...
        </span>
        <span class="text-slate-700" aria-hidden="true">/</span>
        <span id="server-port-label" class="font-mono tabular-nums whitespace-nowrap shrink-0 text-slate-400">
          Localhost
        </span>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button
          id="mode-toggle-btn"
          onclick="toggleScientificMode()"
          class="px-3.5 py-1.5 text-xs font-medium rounded-md border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors whitespace-nowrap shrink-0"
        >
          Scientific Mode
        </button>
      </div>
    </div>
  </header>

  <main class="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <section class="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
        <div class="bg-[#07090E] border border-slate-800/90 rounded-lg p-4 space-y-2">
          <div class="flex items-center justify-between text-xs font-mono text-slate-400">
            <div class="flex items-center gap-3">
              <button
                id="angle-mode-btn"
                onclick="toggleAngleMode()"
                class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold transition-colors"
              >
                DEG
              </button>
              <span id="memory-indicator" class="text-amber-400 hidden tabular-nums">M: 0</span>
            </div>
            <span id="eval-engine-label" class="text-slate-500">Python AST Engine</span>
          </div>

          <div class="pt-1">
            <input
              id="expression-input"
              type="text"
              value=""
              placeholder="0"
              autocomplete="off"
              spellcheck="false"
              class="w-full bg-transparent text-right font-mono tabular-nums text-lg sm:text-xl text-slate-300 placeholder-slate-600 outline-none"
            />
          </div>

          <div class="flex items-baseline justify-between gap-3 pt-1 border-t border-slate-800/60">
            <span id="error-banner" class="text-xs font-mono text-rose-400 truncate"></span>
            <div
              id="result-display"
              class="font-mono tabular-nums text-3xl sm:text-4xl font-bold text-white text-right tracking-tight ml-auto break-all"
            >
              0
            </div>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-2">
          <button onclick="memoryAction('MC')" class="calc-utility-btn">MC</button>
          <button onclick="memoryAction('MR')" class="calc-utility-btn">MR</button>
          <button onclick="memoryAction('M+')" class="calc-utility-btn">M+</button>
          <button onclick="memoryAction('M-')" class="calc-utility-btn">M-</button>
        </div>

        <div id="scientific-keys" class="hidden grid grid-cols-5 gap-2 pt-1">
          <button onclick="appendToken('sin(')" class="calc-sci-btn">sin</button>
          <button onclick="appendToken('cos(')" class="calc-sci-btn">cos</button>
          <button onclick="appendToken('tan(')" class="calc-sci-btn">tan</button>
          <button onclick="appendToken('log10(')" class="calc-sci-btn">log</button>
          <button onclick="appendToken('log(')" class="calc-sci-btn">ln</button>
          <button onclick="appendToken('sqrt(')" class="calc-sci-btn">√x</button>
          <button onclick="appendToken('**2')" class="calc-sci-btn">x²</button>
          <button onclick="appendToken('**')" class="calc-sci-btn">xʸ</button>
          <button onclick="appendToken('factorial(')" class="calc-sci-btn">n!</button>
          <button onclick="appendToken('abs(')" class="calc-sci-btn">|x|</button>
          <button onclick="appendToken('pi')" class="calc-sci-btn">π</button>
          <button onclick="appendToken('e')" class="calc-sci-btn">e</button>
          <button onclick="appendToken('(')" class="calc-sci-btn">(</button>
          <button onclick="appendToken(')')" class="calc-sci-btn">)</button>
          <button onclick="appendToken('%')" class="calc-sci-btn">mod</button>
        </div>

        <div class="grid grid-cols-4 gap-2.5">
          <button onclick="clearAll()" class="calc-action-btn text-rose-400">AC</button>
          <button onclick="backspace()" class="calc-action-btn">DEL</button>
          <button onclick="appendToken('(')" class="calc-action-btn">(</button>
          <button onclick="appendToken('/')" class="calc-op-btn">÷</button>
          <button onclick="appendToken('7')" class="calc-num-btn">7</button>
          <button onclick="appendToken('8')" class="calc-num-btn">8</button>
          <button onclick="appendToken('9')" class="calc-num-btn">9</button>
          <button onclick="appendToken('*')" class="calc-op-btn">×</button>
          <button onclick="appendToken('4')" class="calc-num-btn">4</button>
          <button onclick="appendToken('5')" class="calc-num-btn">5</button>
          <button onclick="appendToken('6')" class="calc-num-btn">6</button>
          <button onclick="appendToken('-')" class="calc-op-btn">−</button>
          <button onclick="appendToken('1')" class="calc-num-btn">1</button>
          <button onclick="appendToken('2')" class="calc-num-btn">2</button>
          <button onclick="appendToken('3')" class="calc-num-btn">3</button>
          <button onclick="appendToken('+')" class="calc-op-btn">+</button>
          <button onclick="appendToken('0')" class="calc-num-btn col-span-2">0</button>
          <button onclick="appendToken('.')" class="calc-num-btn">.</button>
          <button onclick="evaluateExpression()" class="calc-equals-btn">=</button>
        </div>
      </section>

      <aside class="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col gap-4 lg:h-[560px]">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 class="text-sm font-semibold text-white">Calculation Tape</h2>
            <p class="text-xs text-slate-400">Stored in Python server memory</p>
          </div>
          <button
            onclick="clearServerHistory()"
            class="px-3 py-1 text-xs font-medium rounded-md border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
          >
            Clear Tape
          </button>
        </div>
        <div id="history-list" class="flex-1 overflow-y-auto space-y-2 pr-1">
          <div class="text-xs text-slate-500 py-8 text-center">
            No calculations recorded yet. Enter an expression and press =.
          </div>
        </div>
        <div class="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Enter: Calculate</span>
          <span>Esc: Clear</span>
          <span>Backspace: Delete</span>
        </div>
      </aside>
    </div>
  </main>
  <script src="app.js"></script>
</body>
</html>
`,
    },
    {
      id: 'calc-style-css',
      name: 'style.css',
      path: '/style.css',
      type: 'file',
      language: 'css',
      isOpen: false,
      isDirty: false,
      content: `:root {
  --font-sans: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

body {
  font-family: var(--font-sans);
}

.font-mono {
  font-family: var(--font-mono);
}

.calc-num-btn,
.calc-op-btn,
.calc-action-btn,
.calc-equals-btn,
.calc-sci-btn,
.calc-utility-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  user-select: none;
  cursor: pointer;
  transition: background-color 140ms cubic-bezier(0.16, 1, 0.3, 1),
              border-color 140ms cubic-bezier(0.16, 1, 0.3, 1),
              transform 90ms ease;
}

.calc-num-btn:active,
.calc-op-btn:active,
.calc-action-btn:active,
.calc-equals-btn:active,
.calc-sci-btn:active,
.calc-utility-btn:active {
  transform: scale(0.97);
}

.calc-num-btn {
  height: 3.25rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: #f8fafc;
  background-color: #1a2234;
  border: 1px solid #263148;
}

.calc-num-btn:hover {
  background-color: #243049;
  border-color: #364666;
}

.calc-action-btn {
  height: 3.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #cbd5e1;
  background-color: #151c2c;
  border: 1px solid #242f45;
}

.calc-action-btn:hover {
  background-color: #1f2940;
  color: #ffffff;
}

.calc-op-btn {
  height: 3.25rem;
  font-size: 1.2rem;
  font-weight: 600;
  color: #22d3ee;
  background-color: #132132;
  border: 1px solid #1e3a56;
}

.calc-op-btn:hover {
  background-color: #193048;
  border-color: #06b6d4;
}

.calc-equals-btn {
  height: 3.25rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #07090e;
  background-color: #06b6d4;
  border: 1px solid #22d3ee;
}

.calc-equals-btn:hover {
  background-color: #22d3ee;
}

.calc-sci-btn {
  height: 2.4rem;
  font-size: 0.78rem;
  font-weight: 500;
  color: #e2e8f0;
  background-color: #131a29;
  border: 1px solid #222d42;
}

.calc-sci-btn:hover {
  background-color: #1d273d;
  color: #38bdf8;
  border-color: #2e4163;
}

.calc-utility-btn {
  height: 2.2rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  background-color: #0f1523;
  border: 1px solid #1e293b;
}

.calc-utility-btn:hover {
  background-color: #182236;
  color: #f1f5f9;
}
`,
    },
    {
      id: 'calc-app-js',
      name: 'app.js',
      path: '/app.js',
      type: 'file',
      language: 'javascript',
      isOpen: false,
      isDirty: false,
      content: `let angleMode = 'DEG';
let scientificOpen = false;
let memoryValue = 0;
let hasMemory = false;
let lastResult = '0';

const exprInput = document.getElementById('expression-input');
const resultDisplay = document.getElementById('result-display');
const errorBanner = document.getElementById('error-banner');
const historyList = document.getElementById('history-list');
const backendStatus = document.getElementById('backend-status');
const serverPortLabel = document.getElementById('server-port-label');
const memoryIndicator = document.getElementById('memory-indicator');
const angleModeBtn = document.getElementById('angle-mode-btn');

async function checkBackendHealth() {
  try {
    const res = await fetch('api/health');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    backendStatus.textContent = \`Python \${data.pythonVersion} Connected\`;
    backendStatus.className = 'font-mono whitespace-nowrap shrink-0 text-emerald-400';
    serverPortLabel.textContent = \`Port \${data.port}\`;
    await loadHistory();
  } catch (err) {
    backendStatus.textContent = 'Python Backend Offline';
    backendStatus.className = 'font-mono whitespace-nowrap shrink-0 text-rose-400';
    errorBanner.textContent = 'Start server.py in Terminal to compute';
  }
}

async function loadHistory() {
  try {
    const res = await fetch('api/history');
    if (!res.ok) return;
    const data = await res.json();
    renderHistory(data.history || []);
  } catch {}
}

function appendToken(token) {
  errorBanner.textContent = '';
  const start = exprInput.selectionStart ?? exprInput.value.length;
  const end = exprInput.selectionEnd ?? exprInput.value.length;
  const val = exprInput.value;
  exprInput.value = val.slice(0, start) + token + val.slice(end);
  const nextPos = start + token.length;
  exprInput.focus();
  exprInput.setSelectionRange(nextPos, nextPos);
}

function clearAll() {
  exprInput.value = '';
  resultDisplay.textContent = '0';
  errorBanner.textContent = '';
  exprInput.focus();
}

function backspace() {
  errorBanner.textContent = '';
  if (exprInput.value.length > 0) {
    exprInput.value = exprInput.value.slice(0, -1);
  }
  exprInput.focus();
}

function toggleScientificMode() {
  scientificOpen = !scientificOpen;
  const drawer = document.getElementById('scientific-keys');
  const btn = document.getElementById('mode-toggle-btn');
  drawer.classList.toggle('hidden', !scientificOpen);
  btn.textContent = scientificOpen ? 'Standard Mode' : 'Scientific Mode';
}

function toggleAngleMode() {
  angleMode = angleMode === 'DEG' ? 'RAD' : 'DEG';
  angleModeBtn.textContent = angleMode;
}

function memoryAction(action) {
  const currentNum = parseFloat(resultDisplay.textContent);
  if (action === 'MC') {
    memoryValue = 0;
    hasMemory = false;
    memoryIndicator.classList.add('hidden');
  } else if (action === 'MR') {
    if (hasMemory) appendToken(String(memoryValue));
  } else if (action === 'M+' && !Number.isNaN(currentNum)) {
    memoryValue += currentNum;
    hasMemory = true;
    memoryIndicator.textContent = \`M: \${Number(memoryValue.toPrecision(10))}\`;
    memoryIndicator.classList.remove('hidden');
  } else if (action === 'M-' && !Number.isNaN(currentNum)) {
    memoryValue -= currentNum;
    hasMemory = true;
    memoryIndicator.textContent = \`M: \${Number(memoryValue.toPrecision(10))}\`;
    memoryIndicator.classList.remove('hidden');
  }
}

async function evaluateExpression() {
  const expression = exprInput.value.trim();
  if (!expression) return;
  errorBanner.textContent = '';
  try {
    const res = await fetch('api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expression, angleMode }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorBanner.textContent = data.error || 'Calculation error';
      return;
    }
    lastResult = String(data.formatted);
    resultDisplay.textContent = lastResult;
    if (Array.isArray(data.history)) renderHistory(data.history);
  } catch (err) {
    errorBanner.textContent = 'Cannot reach Python server (api/calculate)';
  }
}

async function clearServerHistory() {
  const res = await fetch('api/history', { method: 'DELETE' });
  if (res.ok) renderHistory([]);
}

function reuseHistoryEntry(expr) {
  exprInput.value = expr;
  exprInput.focus();
}

function renderHistory(items) {
  if (!items || items.length === 0) {
    historyList.innerHTML = '<div class="text-xs text-slate-500 py-8 text-center">No calculations recorded yet. Enter an expression and press =.</div>';
    return;
  }
  historyList.innerHTML = items.map(item => \`
    <button type="button" onclick="reuseHistoryEntry('\${escapeAttr(item.expression)}')" class="w-full text-left p-3 rounded-lg bg-[#0B0E17] hover:bg-[#171f33] border border-slate-800/80 hover:border-cyan-500/40 transition-colors space-y-1 group">
      <div class="flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span class="truncate">\${escapeHtml(item.expression)}</span>
        <span class="shrink-0 ml-2 text-slate-600">\${escapeHtml(item.angleMode || 'DEG')}</span>
      </div>
      <div class="text-base font-mono tabular-nums font-semibold text-cyan-400 text-right">
        = \${escapeHtml(String(item.formatted))}
      </div>
    </button>
  \`).join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

function escapeAttr(str) {
  return String(str).replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'");
}

exprInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); evaluateExpression(); }
  else if (e.key === 'Escape') { e.preventDefault(); clearAll(); }
});

checkBackendHealth();
`,
    },
    {
      id: 'calc-server-py',
      name: 'server.py',
      path: '/server.py',
      type: 'file',
      language: 'python',
      isOpen: false,
      isDirty: false,
      content: `import ast
import http.server
import json
import math
import operator
import os
import platform
import socketserver
import sys
from urllib.parse import urlparse

def resolve_port():
    if len(sys.argv) > 1:
        return int(sys.argv[1]), True
    env_port = os.environ.get("PYCALC_PORT")
    if env_port:
        return int(env_port), True
    return 5050, False


WEB_DIR = os.path.dirname(os.path.abspath(__file__))

CALC_HISTORY = []
MAX_HISTORY = 50

SAFE_BINARY_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}

SAFE_UNARY_OPS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}

SAFE_CONSTANTS = {
    "pi": math.pi,
    "e": math.e,
    "tau": math.tau,
}


def get_safe_functions(angle_mode: str):
    is_deg = str(angle_mode).upper() == "DEG"
    return {
        "sin": (lambda x: math.sin(math.radians(x))) if is_deg else math.sin,
        "cos": (lambda x: math.cos(math.radians(x))) if is_deg else math.cos,
        "tan": (lambda x: math.tan(math.radians(x))) if is_deg else math.tan,
        "asin": (lambda x: math.degrees(math.asin(x))) if is_deg else math.asin,
        "acos": (lambda x: math.degrees(math.acos(x))) if is_deg else math.acos,
        "atan": (lambda x: math.degrees(math.atan(x))) if is_deg else math.atan,
        "sqrt": math.sqrt,
        "log": math.log,
        "log10": math.log10,
        "exp": math.exp,
        "abs": abs,
        "round": round,
        "floor": math.floor,
        "ceil": math.ceil,
        "factorial": lambda x: math.factorial(int(x)),
        "radians": math.radians,
        "degrees": math.degrees,
    }


def eval_ast(node, funcs):
    if isinstance(node, ast.Expression):
        return eval_ast(node.body, funcs)
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError("Only numeric constants are supported")
    if isinstance(node, ast.Name):
        if node.id in SAFE_CONSTANTS:
            return SAFE_CONSTANTS[node.id]
        raise ValueError(f"Unknown symbol: {node.id}")
    if isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type not in SAFE_BINARY_OPS:
            raise ValueError(f"Unsupported operator: {op_type.__name__}")
        left = eval_ast(node.left, funcs)
        right = eval_ast(node.right, funcs)
        if op_type in (ast.Div, ast.FloorDiv, ast.Mod) and right == 0:
            raise ZeroDivisionError("Cannot divide by zero")
        if op_type == ast.Pow and abs(right) > 1000:
            raise ValueError("Exponent too large")
        return SAFE_BINARY_OPS[op_type](left, right)
    if isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type not in SAFE_UNARY_OPS:
            raise ValueError(f"Unsupported unary operator: {op_type.__name__}")
        return SAFE_UNARY_OPS[op_type](eval_ast(node.operand, funcs))
    if isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name) or node.func.id not in funcs:
            raise ValueError("Unsupported function call")
        args = [eval_ast(arg, funcs) for arg in node.args]
        return funcs[node.func.id](*args)
    raise ValueError("Invalid mathematical expression")


def safe_calculate(expression: str, angle_mode: str = "DEG"):
    cleaned = expression.strip().replace("×", "*").replace("÷", "/").replace("−", "-").replace("^", "**")
    if not cleaned:
        raise ValueError("Empty expression")
    tree = ast.parse(cleaned, mode="eval")
    funcs = get_safe_functions(angle_mode)
    result = eval_ast(tree, funcs)
    if isinstance(result, float):
        if math.isnan(result) or math.isinf(result):
            raise ValueError("Result is undefined")
        rounded = round(result, 12)
        formatted = str(int(rounded)) if rounded.is_integer() else f"{rounded:g}"
    else:
        formatted = str(result)
    return result, formatted


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


class CalculatorHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def send_json(self, status_code: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_HEAD(self):
        parsed = urlparse(self.path)
        if parsed.path in ("/api/health", "/api/history"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            return
        return super().do_HEAD()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self.send_json(200, {
                "status": "ok",
                "port": self.server.server_address[1],
                "pythonVersion": platform.python_version(),
            })
            return
        if parsed.path == "/api/history":
            self.send_json(200, {"history": CALC_HISTORY})
            return
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/calculate":
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length)
            try:
                data = json.loads(raw.decode("utf-8"))
                expr = str(data.get("expression", ""))
                angle_mode = str(data.get("angleMode", "DEG"))
                result, formatted = safe_calculate(expr, angle_mode)
                entry = {
                    "expression": expr,
                    "result": result,
                    "formatted": formatted,
                    "angleMode": angle_mode,
                }
                CALC_HISTORY.insert(0, entry)
                if len(CALC_HISTORY) > MAX_HISTORY:
                    CALC_HISTORY.pop()
                self.send_json(200, {
                    **entry,
                    "history": CALC_HISTORY,
                })
            except ZeroDivisionError as err:
                self.send_json(400, {"error": str(err)})
            except Exception as err:
                self.send_json(400, {"error": f"Invalid expression: {err}"})
            return
        self.send_json(404, {"error": "Endpoint not found"})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/history":
            CALC_HISTORY.clear()
            self.send_json(200, {"history": []})
            return
        self.send_json(404, {"error": "Endpoint not found"})


if __name__ == "__main__":
    requested_port, is_explicit = resolve_port()
    httpd = None
    max_attempts = 1 if is_explicit else 10
    for offset in range(max_attempts):
        candidate_port = requested_port + offset
        try:
            httpd = ReusableTCPServer(("", candidate_port), CalculatorHandler)
            break
        except OSError:
            if offset == max_attempts - 1:
                raise

    bound_port = httpd.server_address[1]
    print(f"PyCalc Python Server running on http://localhost:{bound_port}", flush=True)
    with httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\\nPyCalc server stopped.")
`,
    },
  ];
}
