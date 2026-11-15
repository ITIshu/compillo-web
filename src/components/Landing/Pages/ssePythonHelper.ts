export async function runPythonSnippet(
  code: string,
  filename = 'main.py'
): Promise<{ stdout: string; stderr: string; exitCode: number; elapsedMs: number }> {
  const t0 = performance.now();
  const res = await fetch('/api/python/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, filename }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    return {
      stdout: '',
      stderr: msg || `HTTP ${res.status}`,
      exitCode: 1,
      elapsedMs: Math.round(performance.now() - t0),
    };
  }

  const reader = res.body?.getReader();
  if (!reader) {
    return { stdout: '', stderr: 'No stream body', exitCode: 1, elapsedMs: 0 };
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';
    for (const block of blocks) {
      let ev = 'message';
      let dataLine = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) ev = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLine = line.slice(5).trim();
      }
      if (!dataLine) continue;
      try {
        const parsed = JSON.parse(dataLine);
        if (ev === 'stdout' && typeof parsed.text === 'string') stdout += parsed.text;
        else if (ev === 'stderr' && typeof parsed.text === 'string') stderr += parsed.text;
        else if (ev === 'exit' && typeof parsed.code === 'number') exitCode = parsed.code;
      } catch {
        // ignore partial JSON chunk
      }
    }
  }

  return {
    stdout,
    stderr,
    exitCode,
    elapsedMs: Math.round((performance.now() - t0) * 10) / 10,
  };
}
