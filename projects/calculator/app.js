let angleMode = 'DEG';
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

// Check Python Backend Health & Load Initial History
async function checkBackendHealth() {
  try {
    const res = await fetch('api/health');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    backendStatus.textContent = `Python ${data.pythonVersion} Connected`;
    backendStatus.className = 'font-mono whitespace-nowrap shrink-0 text-emerald-400';
    serverPortLabel.textContent = `Port ${data.port}`;
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
  } catch {
    // ignore
  }
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
  const val = exprInput.value;
  if (val.length > 0) {
    exprInput.value = val.slice(0, -1);
  }
  exprInput.focus();
}

function toggleScientificMode() {
  scientificOpen = !scientificOpen;
  const drawer = document.getElementById('scientific-keys');
  const btn = document.getElementById('mode-toggle-btn');
  if (scientificOpen) {
    drawer.classList.remove('hidden');
    btn.textContent = 'Standard Mode';
  } else {
    drawer.classList.add('hidden');
    btn.textContent = 'Scientific Mode';
  }
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
    if (hasMemory) {
      appendToken(String(memoryValue));
    }
  } else if (action === 'M+') {
    if (!Number.isNaN(currentNum)) {
      memoryValue += currentNum;
      hasMemory = true;
      updateMemoryBadge();
    }
  } else if (action === 'M-') {
    if (!Number.isNaN(currentNum)) {
      memoryValue -= currentNum;
      hasMemory = true;
      updateMemoryBadge();
    }
  }
}

function updateMemoryBadge() {
  memoryIndicator.textContent = `M: ${Number(memoryValue.toPrecision(10))}`;
  memoryIndicator.classList.remove('hidden');
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
    if (Array.isArray(data.history)) {
      renderHistory(data.history);
    }
  } catch (err) {
    errorBanner.textContent = 'Cannot reach Python server (api/calculate)';
  }
}

async function clearServerHistory() {
  try {
    const res = await fetch('api/history', { method: 'DELETE' });
    if (res.ok) {
      renderHistory([]);
    }
  } catch (err) {
    errorBanner.textContent = 'Failed to clear server history';
  }
}

function reuseHistoryEntry(expr) {
  exprInput.value = expr;
  exprInput.focus();
}

function renderHistory(items) {
  if (!items || items.length === 0) {
    historyList.innerHTML = `
      <div class="text-xs text-slate-500 py-8 text-center">
        No calculations recorded yet. Enter an expression and press =.
      </div>
    `;
    return;
  }

  historyList.innerHTML = items
    .map(
      (item) => `
      <button
        type="button"
        onclick="reuseHistoryEntry('${escapeAttr(item.expression)}')"
        class="w-full text-left p-3 rounded-lg bg-[#0B0E17] hover:bg-[#171f33] border border-slate-800/80 hover:border-cyan-500/40 transition-colors space-y-1 group"
      >
        <div class="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span class="truncate">${escapeHtml(item.expression)}</span>
          <span class="shrink-0 ml-2 text-slate-600">${escapeHtml(item.angleMode || 'DEG')}</span>
        </div>
        <div class="text-base font-mono tabular-nums font-semibold text-cyan-400 group-hover:text-cyan-300 text-right">
          = ${escapeHtml(String(item.formatted))}
        </div>
      </button>
    `
    )
    .join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, (tag) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[tag] || tag));
}

function escapeAttr(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// Physical keyboard support
exprInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    evaluateExpression();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    clearAll();
  }
});

document.addEventListener('keydown', (e) => {
  if (document.activeElement === exprInput) return;
  if (/^[0-9+\-*/().%]$/.test(e.key)) {
    e.preventDefault();
    appendToken(e.key);
  } else if (e.key === 'Enter' || e.key === '=') {
    e.preventDefault();
    evaluateExpression();
  } else if (e.key === 'Backspace') {
    e.preventDefault();
    backspace();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    clearAll();
  }
});

checkBackendHealth();
