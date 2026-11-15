import React, { useMemo, useState } from 'react';
import { Copy, Check, GitCompare, Play } from 'lucide-react';
import { WebsiteThemeTokens } from './WebsitePageTheme';

interface BenchmarkDiffBetaPageProps {
  tokens: WebsiteThemeTokens;
}

interface SingleBenchMetrics {
  ok: boolean;
  error?: string;
  medianMs?: number;
  avgMs?: number;
  minMs?: number;
  maxMs?: number;
  peakKb?: number;
  stdout?: string;
}

interface DiffLine {
  type: 'same' | 'add' | 'del';
  leftNo: number | null;
  rightNo: number | null;
  text: string;
}

const BENCH_PRESETS: Array<{
  label: string;
  codeA: string;
  codeB: string;
}> = [
  {
    label: 'Two Sum: Nested O(n²) vs Hash Map O(n)',
    codeA: `# Approach A: Brute-force O(n^2)
nums = list(range(1, 2001))
target = 3999
ans = []
for i in range(len(nums)):
    for j in range(i + 1, len(nums)):
        if nums[i] + nums[j] == target:
            ans = [i, j]
            break
    if ans:
        break
print("Result:", ans)`,
    codeB: `# Approach B: Dictionary Lookup O(n)
nums = list(range(1, 2001))
target = 3999
seen = {}
ans = []
for i, val in enumerate(nums):
    need = target - val
    if need in seen:
        ans = [seen[need], i]
        break
    seen[val] = i
print("Result:", ans)`,
  },
  {
    label: 'Fibonacci: Recursive vs Iterative DP',
    codeA: `# Approach A: Plain recursion
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

print("fib(24) =", fib(24))`,
    codeB: `# Approach B: Bottom-up O(n)
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

print("fib(24) =", fib(24))`,
  },
  {
    label: 'Squares: For-Loop vs List Comprehension',
    codeA: `# Approach A: Explicit loop + append
out = []
for i in range(20000):
    if i % 2 == 0:
        out.append(i * i)
print("Count:", len(out))`,
    codeB: `# Approach B: List comprehension
out = [i * i for i in range(0, 20000, 2)]
print("Count:", len(out))`,
  },
];

function computeLineDiff(leftText: string, rightText: string): DiffLine[] {
  const a = leftText.split('\n');
  const b = rightText.split('\n');
  const n = a.length;
  const m = b.length;

  // Guard LCS DP size for responsiveness
  if (n * m > 160_000) {
    const fallback: DiffLine[] = [];
    const maxLen = Math.max(n, m);
    for (let i = 0; i < maxLen; i++) {
      if (i < n && i < m && a[i] === b[i]) {
        fallback.push({ type: 'same', leftNo: i + 1, rightNo: i + 1, text: a[i] });
      } else {
        if (i < n) fallback.push({ type: 'del', leftNo: i + 1, rightNo: null, text: a[i] });
        if (i < m) fallback.push({ type: 'add', leftNo: null, rightNo: i + 1, text: b[i] });
      }
    }
    return fallback;
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = 1 + dp[i + 1][j + 1];
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', leftNo: i + 1, rightNo: j + 1, text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'del', leftNo: i + 1, rightNo: null, text: a[i] });
      i++;
    } else {
      out.push({ type: 'add', leftNo: null, rightNo: j + 1, text: b[j] });
      j++;
    }
  }
  while (i < n) {
    out.push({ type: 'del', leftNo: i + 1, rightNo: null, text: a[i] });
    i++;
  }
  while (j < m) {
    out.push({ type: 'add', leftNo: null, rightNo: j + 1, text: b[j] });
    j++;
  }
  return out;
}

export const BenchmarkDiffBetaPage: React.FC<BenchmarkDiffBetaPageProps> = ({ tokens }) => {
  const [tab, setTab] = useState<'benchmark' | 'diff'>('benchmark');

  const [codeA, setCodeA] = useState(BENCH_PRESETS[0].codeA);
  const [codeB, setCodeB] = useState(BENCH_PRESETS[0].codeB);
  const [iterations, setIterations] = useState(5);
  const [runningBench, setRunningBench] = useState(false);
  const [benchError, setBenchError] = useState<string | null>(null);
  const [benchResult, setBenchResult] = useState<{
    iterations: number;
    a: SingleBenchMetrics;
    b: SingleBenchMetrics;
  } | null>(null);

  const [copiedPatch, setCopiedPatch] = useState(false);

  const runBenchmark = async () => {
    setRunningBench(true);
    setBenchError(null);
    try {
      const res = await fetch('/api/beta/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeA, codeB, iterations }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setBenchError(data.error || 'Benchmark failed');
      } else {
        setBenchResult(data);
      }
    } catch (err: any) {
      setBenchError(err?.message || 'Unable to reach benchmark runner');
    } finally {
      setRunningBench(false);
    }
  };

  const diffLines = useMemo(() => computeLineDiff(codeA, codeB), [codeA, codeB]);
  const addedCount = diffLines.filter((l) => l.type === 'add').length;
  const deletedCount = diffLines.filter((l) => l.type === 'del').length;

  const handleCopyUnifiedPatch = () => {
    const patchText = diffLines
      .map((l) => (l.type === 'add' ? `+ ${l.text}` : l.type === 'del' ? `- ${l.text}` : `  ${l.text}`))
      .join('\n');
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(patchText);
    }
    setCopiedPatch(true);
    window.setTimeout(() => setCopiedPatch(false), 2000);
  };

  const winnerInfo = (() => {
    if (!benchResult?.a?.ok || !benchResult?.b?.ok) return null;
    const medA = benchResult.a.medianMs || 0.001;
    const medB = benchResult.b.medianMs || 0.001;
    if (medB < medA) {
      return { faster: 'Approach B', factor: (medA / Math.max(medB, 0.001)).toFixed(1) };
    }
    if (medA < medB) {
      return { faster: 'Approach A', factor: (medB / Math.max(medA, 0.001)).toFixed(1) };
    }
    return { faster: 'Tie', factor: '1.0' };
  })();

  const maxBarMs = Math.max(
    benchResult?.a?.medianMs || 0.01,
    benchResult?.b?.medianMs || 0.01,
    0.01
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b pb-6" style={{ borderColor: tokens.borderColor }}>
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-medium" style={{ color: tokens.fgMuted }}>
            Beta Labs · Performance &amp; Code Comparison
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
            Python Benchmark Profiler &amp; Line Diff Lab
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: tokens.fgMuted }}>
            Race two Python implementations head-to-head with real perf_counter timing and tracemalloc memory profiling, or inspect exact line-by-line diffs.
          </p>
        </div>

        <div
          className="inline-flex items-center gap-1 p-1 rounded-lg border shrink-0"
          style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg }}
        >
          <button
            type="button"
            onClick={() => setTab('benchmark')}
            className="px-4 py-2 rounded-md text-xs font-semibold cursor-pointer"
            style={
              tab === 'benchmark'
                ? { backgroundColor: tokens.accent, color: tokens.accentText }
                : { color: tokens.fgMuted }
            }
          >
            Benchmark Profiler
          </button>
          <button
            type="button"
            onClick={() => setTab('diff')}
            className="px-4 py-2 rounded-md text-xs font-semibold cursor-pointer"
            style={
              tab === 'diff'
                ? { backgroundColor: tokens.accent, color: tokens.accentText }
                : { color: tokens.fgMuted }
            }
          >
            Line Diff Checker ({addedCount}+ / {deletedCount}-)
          </button>
        </div>
      </div>

      {/* Preset Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span style={{ color: tokens.fgMuted }}>Presets:</span>
          {BENCH_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setCodeA(p.codeA);
                setCodeB(p.codeB);
                setBenchResult(null);
              }}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer hover:opacity-90"
              style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg, color: tokens.fgPrimary }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {tab === 'benchmark' && (
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium flex items-center gap-2" style={{ color: tokens.fgMuted }}>
              <span>Runs:</span>
              <select
                value={iterations}
                onChange={(e) => setIterations(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-md border text-xs font-mono"
                style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg, color: tokens.fgPrimary }}
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </label>
            <button
              type="button"
              disabled={runningBench}
              onClick={runBenchmark}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
            >
              <Play size={13} />
              <span>{runningBench ? 'Profiling...' : 'Run Head-to-Head'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Dual Editors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 rounded-xl border space-y-2" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
          <div className="text-xs font-semibold">Implementation A (Baseline / Original)</div>
          <textarea
            rows={11}
            value={codeA}
            onChange={(e) => setCodeA(e.target.value)}
            spellCheck={false}
            className="w-full p-3 rounded-lg border font-mono text-xs leading-relaxed outline-none resize-y"
            style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor, color: tokens.fgPrimary }}
          />
        </div>
        <div className="p-4 rounded-xl border space-y-2" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
          <div className="text-xs font-semibold">Implementation B (Optimized / Modified)</div>
          <textarea
            rows={11}
            value={codeB}
            onChange={(e) => setCodeB(e.target.value)}
            spellCheck={false}
            className="w-full p-3 rounded-lg border font-mono text-xs leading-relaxed outline-none resize-y"
            style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor, color: tokens.fgPrimary }}
          />
        </div>
      </div>

      {tab === 'benchmark' ? (
        <div className="space-y-4">
          {benchError && (
            <div className="p-3.5 rounded-lg border border-rose-500/40 text-xs text-rose-400">
              {benchError}
            </div>
          )}

          {benchResult && (
            <div
              className="p-6 rounded-xl border space-y-6"
              style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4" style={{ borderColor: tokens.borderColor }}>
                <div>
                  <h3 className="text-sm font-bold">Benchmark Results ({benchResult.iterations} iterations)</h3>
                  <p className="text-xs" style={{ color: tokens.fgMuted }}>
                    Measured in real Python 3 subprocess via time.perf_counter() and tracemalloc
                  </p>
                </div>
                {winnerInfo && (
                  <div className="text-sm font-bold font-mono tabular-nums text-emerald-400">
                    {winnerInfo.faster === 'Tie'
                      ? 'Even speed'
                      : `${winnerInfo.faster} is ${winnerInfo.factor}x faster`}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: 'Approach A', data: benchResult.a },
                  { label: 'Approach B', data: benchResult.b },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-4 rounded-lg border space-y-3"
                    style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{item.label}</span>
                      {item.data.ok ? (
                        <span className="text-xs font-mono tabular-nums" style={{ color: tokens.accent }}>
                          Median: {item.data.medianMs} ms · Peak RAM: {item.data.peakKb} KB
                        </span>
                      ) : (
                        <span className="text-xs text-rose-400 font-semibold">Error</span>
                      )}
                    </div>

                    {item.data.ok ? (
                      <>
                        <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: tokens.surfaceBg }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.max(4, Math.min(100, ((item.data.medianMs || 0) / maxBarMs) * 100))}%`,
                              backgroundColor: tokens.accent,
                            }}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px] font-mono tabular-nums" style={{ color: tokens.fgMuted }}>
                          <div>Avg: {item.data.avgMs} ms</div>
                          <div>Min: {item.data.minMs} ms</div>
                          <div>Max: {item.data.maxMs} ms</div>
                        </div>
                        {item.data.stdout && (
                          <pre className="text-[11px] font-mono pt-2 border-t whitespace-pre-wrap" style={{ borderColor: tokens.borderColor, color: tokens.fgPrimary }}>
                            {item.data.stdout.trim()}
                          </pre>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-rose-400 font-mono">{item.data.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
        >
          <div className="px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3" style={{ borderColor: tokens.borderColor }}>
            <div className="flex items-center gap-2 text-xs font-bold">
              <GitCompare size={14} style={{ color: tokens.accent }} />
              <span>Line-by-Line Diff ({addedCount} added, {deletedCount} removed)</span>
            </div>
            <button
              type="button"
              onClick={handleCopyUnifiedPatch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold cursor-pointer"
              style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.fgPrimary }}
            >
              {copiedPatch ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedPatch ? 'Copied Patch' : 'Copy Unified Diff'}</span>
            </button>
          </div>
          <div className="max-h-[420px] overflow-auto font-mono text-xs divide-y" style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor }}>
            {diffLines.map((line, idx) => (
              <div
                key={idx}
                className="flex items-stretch px-3 py-1"
                style={{
                  borderColor: 'transparent',
                  backgroundColor:
                    line.type === 'add'
                      ? 'rgba(16, 185, 129, 0.12)'
                      : line.type === 'del'
                      ? 'rgba(244, 63, 94, 0.12)'
                      : 'transparent',
                  color:
                    line.type === 'add'
                      ? '#34d399'
                      : line.type === 'del'
                      ? '#fb7185'
                      : tokens.fgPrimary,
                }}
              >
                <span className="w-8 shrink-0 text-right pr-2 select-none opacity-60 tabular-nums">
                  {line.leftNo ?? ''}
                </span>
                <span className="w-8 shrink-0 text-right pr-2 select-none opacity-60 tabular-nums">
                  {line.rightNo ?? ''}
                </span>
                <span className="w-5 shrink-0 select-none font-bold">
                  {line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}
                </span>
                <span className="whitespace-pre-wrap break-all">{line.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
