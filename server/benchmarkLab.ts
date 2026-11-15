import type { Request, Response } from 'express';
import { spawn } from 'child_process';

const MAX_CODE_BYTES = 32 * 1024;
const BENCH_TIMEOUT_MS = 3500;

const BENCH_DRIVER_PY = `
import io, json, sys, time, tracemalloc
from contextlib import redirect_stdout

payload = json.loads(sys.stdin.read())
code_a = payload.get("codeA", "")
code_b = payload.get("codeB", "")
iterations = max(1, min(int(payload.get("iterations", 5)), 50))

def bench_one(src):
    compiled = compile(src, "<benchmark>", "exec")
    timings_ms = []
    peak_kb = 0.0
    last_stdout = ""
    for i in range(iterations):
        buf = io.StringIO()
        ns = {"__name__": "__main__"}
        tracemalloc.start()
        t0 = time.perf_counter()
        try:
            with redirect_stdout(buf):
                exec(compiled, ns, ns)
        finally:
            dt_ms = (time.perf_counter() - t0) * 1000.0
            _, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
        timings_ms.append(dt_ms)
        peak_kb = max(peak_kb, peak / 1024.0)
        if i == iterations - 1:
            last_stdout = buf.getvalue()[:1000]
    timings_sorted = sorted(timings_ms)
    median_ms = timings_sorted[len(timings_sorted) // 2]
    avg_ms = sum(timings_ms) / len(timings_ms)
    return {
        "medianMs": round(median_ms, 3),
        "avgMs": round(avg_ms, 3),
        "minMs": round(min(timings_ms), 3),
        "maxMs": round(max(timings_ms), 3),
        "peakKb": round(peak_kb, 2),
        "stdout": last_stdout,
    }

out = {}
try:
    out["a"] = {"ok": True, **bench_one(code_a)}
except Exception as exc:
    out["a"] = {"ok": False, "error": f"{type(exc).__name__}: {exc}"}

try:
    out["b"] = {"ok": True, **bench_one(code_b)}
except Exception as exc:
    out["b"] = {"ok": False, "error": f"{type(exc).__name__}: {exc}"}

print(json.dumps(out))
`;

export function handlePythonBenchmark(req: Request, res: Response) {
  const codeA = typeof req.body?.codeA === 'string' ? req.body.codeA : '';
  const codeB = typeof req.body?.codeB === 'string' ? req.body.codeB : '';
  const rawIters = Number(req.body?.iterations ?? 5);
  const iterations = Number.isFinite(rawIters) ? Math.max(1, Math.min(25, Math.floor(rawIters))) : 5;

  if (!codeA.trim() || !codeB.trim()) {
    res.status(400).json({ ok: false, error: 'Provide Python snippets for both Implementation A and Implementation B.' });
    return;
  }

  if (
    Buffer.byteLength(codeA, 'utf-8') > MAX_CODE_BYTES ||
    Buffer.byteLength(codeB, 'utf-8') > MAX_CODE_BYTES
  ) {
    res.status(400).json({ ok: false, error: 'Code exceeds 32 KB per snippet limit.' });
    return;
  }

  const pyBin = process.env.PYTHON_BIN || 'python3';
  const child = spawn(pyBin, ['-c', BENCH_DRIVER_PY], { stdio: ['pipe', 'pipe', 'pipe'] });

  let stdout = '';
  let stderr = '';
  let settled = false;

  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    child.kill('SIGKILL');
    res.status(408).json({
      ok: false,
      error: `Benchmark timed out after ${BENCH_TIMEOUT_MS}ms. Check for infinite loops.`,
    });
  }, BENCH_TIMEOUT_MS);

  child.stdout.on('data', (d) => {
    stdout += d.toString('utf-8');
  });
  child.stderr.on('data', (d) => {
    stderr += d.toString('utf-8');
  });
  child.on('error', (err) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    res.status(500).json({ ok: false, error: err.message });
  });
  child.on('close', (code) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (code !== 0 && !stdout.trim()) {
      res.status(500).json({ ok: false, error: stderr || `Python exited with code ${code}` });
      return;
    }
    try {
      const parsed = JSON.parse(stdout);
      res.json({ ok: true, iterations, ...parsed });
    } catch {
      res.status(500).json({ ok: false, error: 'Invalid benchmark output from Python runner.' });
    }
  });

  child.stdin.write(JSON.stringify({ codeA, codeB, iterations }));
  child.stdin.end();
}
