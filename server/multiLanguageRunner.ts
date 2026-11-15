import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { Response } from 'express';

export interface RunnerSession {
  id: string;
  language: string;
  process?: ChildProcessWithoutNullStreams;
  tempDir: string;
  createdAt: number;
}

const activeSessions = new Map<string, RunnerSession>();

// Cleanup stale sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of activeSessions.entries()) {
    if (now - session.createdAt > 30 * 60 * 1000) {
      try {
        if (session.process && !session.process.killed) {
          session.process.kill('SIGKILL');
        }
        if (fs.existsSync(session.tempDir)) {
          fs.rmSync(session.tempDir, { recursive: true, force: true });
        }
      } catch (e) {
        // ignore
      }
      activeSessions.delete(id);
    }
  }
}, 10 * 60 * 1000);

export function getSystemBinary(candidates: string[]): string | null {
  for (const bin of candidates) {
    if (bin.startsWith('/')) {
      try {
        if (fs.existsSync(bin)) return bin;
      } catch {
        // ignore
      }
    }
  }
  return null;
}

export function getAvailableCompilers() {
  return {
    gcc: !!getSystemBinary(['/usr/bin/gcc', '/usr/local/bin/gcc']),
    gpp: !!getSystemBinary(['/usr/bin/g++', '/usr/local/bin/g++']),
    tcc: !!getSystemBinary(['/usr/bin/tcc', '/usr/local/bin/tcc']),
    go: !!getSystemBinary(['/usr/bin/go', '/usr/local/bin/go']),
    sqlite3: !!getSystemBinary(['/usr/bin/sqlite3', '/usr/local/bin/sqlite3']),
    python3: !!getSystemBinary(['/usr/bin/python3', '/usr/local/bin/python3']),
    node: !!getSystemBinary(['/usr/local/bin/node', '/usr/bin/node']),
    bash: !!getSystemBinary(['/usr/bin/bash', '/bin/bash']),
    rustPlayground: true,
    wandboxOpenJDK: true,
  };
}

const MAX_CONCURRENT_RUNNERS = 25;
const MAX_SOURCE_BYTES = 256 * 1024;
const MAX_RUNNER_OUTPUT_BYTES = 512 * 1024;
const RUNNER_EXEC_TIMEOUT_MS = 20_000;

export function sendStdinToSession(sessionId: string, input: string): boolean {
  const session = activeSessions.get(sessionId);
  if (!session || !session.process || session.process.killed || !session.process.stdin.writable) {
    return false;
  }
  try {
    const text = input.endsWith('\n') ? input : input + '\n';
    session.process.stdin.write(text, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export function killRunnerSession(sessionId: string): boolean {
  const session = activeSessions.get(sessionId);
  if (!session) return false;

  try {
    if (session.process && !session.process.killed) {
      session.process.kill('SIGINT');
      setTimeout(() => {
        if (session.process && !session.process.killed) {
          session.process.kill('SIGKILL');
        }
      }, 500);
    }
    if (fs.existsSync(session.tempDir)) {
      fs.rmSync(session.tempDir, { recursive: true, force: true });
    }
    activeSessions.delete(sessionId);
    return true;
  } catch {
    return false;
  }
}

function attachProcessSafetyGuards(
  runner: ChildProcessWithoutNullStreams,
  sessionId: string,
  tempDir: string,
  sendEvent: (event: string, data: any) => void,
  res: Response
) {
  let outputBytes = 0;
  let truncated = false;
  let closed = false;

  runner.stdin.on('error', () => {
    // Ignore EPIPE when child exits before stdin completes
  });

  const timeoutTimer = setTimeout(() => {
    if (closed) return;
    sendEvent('stderr', {
      text: `\n⏱ [Safety Timeout] Execution stopped after ${RUNNER_EXEC_TIMEOUT_MS / 1000}s to prevent infinite loops.\n`,
    });
    try {
      runner.kill('SIGKILL');
    } catch {}
  }, RUNNER_EXEC_TIMEOUT_MS);

  const handleChunk = (channel: 'stdout' | 'stderr', chunk: Buffer) => {
    if (truncated || closed) return;
    outputBytes += chunk.length;
    if (outputBytes > MAX_RUNNER_OUTPUT_BYTES) {
      truncated = true;
      sendEvent('stderr', {
        text: '\n🛑 [Output Limit] Output exceeded 512 KB safety cap; process terminated.\n',
      });
      try {
        runner.kill('SIGKILL');
      } catch {}
      return;
    }
    sendEvent(channel, { text: chunk.toString('utf-8') });
  };

  runner.stdout.on('data', (d: Buffer) => handleChunk('stdout', d));
  runner.stderr.on('data', (d: Buffer) => handleChunk('stderr', d));

  runner.on('error', (err) => {
    if (closed) return;
    closed = true;
    clearTimeout(timeoutTimer);
    sendEvent('error', { error: err?.message || 'Process failed to start' });
    if (!res.writableEnded && !res.destroyed) res.end();
    activeSessions.delete(sessionId);
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  runner.on('close', (runCode) => {
    if (closed) return;
    closed = true;
    clearTimeout(timeoutTimer);
    sendEvent('exit', { code: runCode ?? 0 });
    if (!res.writableEnded && !res.destroyed) res.end();
    activeSessions.delete(sessionId);
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  res.on('close', () => {
    clearTimeout(timeoutTimer);
    if (!closed && activeSessions.has(sessionId)) {
      closed = true;
      try {
        runner.kill('SIGKILL');
      } catch {}
      activeSessions.delete(sessionId);
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  });
}

/**
 * Handle multi-language execution over SSE streaming
 */
export async function handleLanguageExecution(
  reqBody: {
    language: string;
    filename: string;
    code: string;
    workspaceFiles?: Array<{ name: string; content: string }>;
  },
  res: Response
) {
  if (activeSessions.size >= MAX_CONCURRENT_RUNNERS) {
    res.status(429).json({ error: 'Too many active runner sessions. Please stop one before starting another.' });
    return;
  }

  const { language = 'plaintext', filename = 'file.txt', code = '', workspaceFiles = [] } = reqBody || {};
  if (typeof code !== 'string' || Buffer.byteLength(code, 'utf-8') > MAX_SOURCE_BYTES) {
    res.status(413).json({ error: 'Source file exceeds 256 KB safety limit.' });
    return;
  }

  const sessionId = 'run_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const tempDir = path.join(os.tmpdir(), `compillo_${sessionId}`);

  try {
    fs.mkdirSync(tempDir, { recursive: true });

    // Write workspace files into directory for header/import resolution
    if (Array.isArray(workspaceFiles)) {
      for (const f of workspaceFiles.slice(0, 40)) {
        if (f && f.name && typeof f.content === 'string') {
          if (Buffer.byteLength(f.content, 'utf-8') > MAX_SOURCE_BYTES) continue;
          const safePath = path.join(tempDir, path.basename(f.name));
          fs.writeFileSync(safePath, f.content, 'utf-8');
        }
      }
    }

    // Write primary source file
    const safeTargetFile = path.basename(String(filename || `main.${language}`)).replace(/[^\w.-]/g, '_') || `main.${language}`;
    const targetFilePath = path.join(tempDir, safeTargetFile);
    fs.writeFileSync(targetFilePath, code, 'utf-8');

    // Setup SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (event: string, data: any) => {
      if (!res.writableEnded && !res.destroyed) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };

    // 1. Rust: Official Rust Foundation Playground (Free, fast, zero config)
    if (language === 'rust') {
      sendEvent('start', {
        sessionId,
        filename: safeTargetFile,
        language,
        engine: 'Rust Foundation Playground (Official Free API)',
      });

      sendEvent('system', { text: `[Rust Playground] Compiling & running stable Rust 2021...\n` });

      try {
        const resp = await fetch('https://play.rust-lang.org/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            channel: 'stable',
            mode: 'debug',
            edition: '2021',
            crateType: 'bin',
            tests: false,
            code,
          }),
        });
        const data: any = await resp.json();
        if (data.stderr) sendEvent('stderr', { text: data.stderr });
        if (data.stdout) sendEvent('stdout', { text: data.stdout });
        sendEvent('exit', { code: data.success ? 0 : 1 });
      } catch (err: any) {
        sendEvent('error', { error: `Rust Playground failed: ${err.message}` });
      } finally {
        if (!res.writableEnded && !res.destroyed) res.end();
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
      }
      return;
    }

    // 2. Java: Free OpenJDK via Wandbox or local Java
    if (language === 'java') {
      sendEvent('start', {
        sessionId,
        filename: safeTargetFile,
        language,
        engine: 'OpenJDK 22 Runtime (100% Free)',
      });

      sendEvent('system', { text: `[Java Runtime] Compiling & executing Java class...\n` });

      try {
        let codeToSend = code;
        // Normalize public class Main so Wandbox doesn't require specific file naming
        if (codeToSend.includes('public class Main')) {
          codeToSend = codeToSend.replace(/public\s+class\s+Main/, 'class Main');
        }

        const resp = await fetch('https://wandbox.org/api/compile.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            compiler: 'openjdk-jdk-22+36',
            code: codeToSend,
          }),
        });
        const data: any = await resp.json();
        if (data.compiler_message) sendEvent('stderr', { text: data.compiler_message });
        if (data.program_message) sendEvent('stdout', { text: data.program_message });
        const exitCode = parseInt(data.status, 10) || 0;
        sendEvent('exit', { code: exitCode });
      } catch (err: any) {
        sendEvent('error', { error: `Java runtime failed: ${err.message}` });
      } finally {
        if (!res.writableEnded && !res.destroyed) res.end();
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
      }
      return;
    }

    // 3. SQL: Native In-Memory SQLite3 Engine with ASCII Box Table
    if (language === 'sql') {
      const sqliteBin = getSystemBinary(['/usr/bin/sqlite3', '/usr/local/bin/sqlite3', 'sqlite3']) || 'sqlite3';
      sendEvent('start', {
        sessionId,
        filename: safeTargetFile,
        language,
        engine: 'SQLite3 In-Memory Relational Engine (Free)',
      });

      sendEvent('system', { text: `[SQLite Engine] Initializing in-memory database and running queries...\n` });

      const child = spawn(sqliteBin, ['-box', ':memory:'], {
        cwd: tempDir,
      });

      const session: RunnerSession = {
        id: sessionId,
        language,
        process: child,
        tempDir,
        createdAt: Date.now(),
      };
      activeSessions.set(sessionId, session);
      attachProcessSafetyGuards(child, sessionId, tempDir, sendEvent, res);

      // Feed SQL code into sqlite3 stdin
      try {
        child.stdin.write(code + '\n', 'utf-8');
        child.stdin.end();
      } catch {}
      return;
    }

    // 4. C: Compile with GCC / TCC, then run binary
    if (language === 'c') {
      if (/#include\s*["<]graphics\.h[">]/i.test(code)) {
        sendEvent('start', {
          sessionId,
          filename: safeTargetFile,
          language,
          engine: 'Borland BGI <graphics.h> Engine',
        });
        sendEvent('system', { text: `[Graphics Engine] Borland BGI <graphics.h> detected: Compillo Virtual Graphics Framebuffer Canvas Window initialized.\n` });
        sendEvent('graphics_fallback', { library: 'graphics.h', filename: safeTargetFile });
        sendEvent('exit', { code: 0 });
        if (!res.writableEnded && !res.destroyed) res.end();
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
        return;
      }

      const gccBin = getSystemBinary(['/usr/bin/gcc', '/usr/local/bin/gcc', '/usr/bin/tcc', 'gcc']);
      if (!gccBin) {
        return runViaWandbox('gcc-head-c', code, 'C (Free Community Compiler)', sessionId, safeTargetFile, language, sendEvent, res, tempDir);
      }

      sendEvent('start', {
        sessionId,
        filename: safeTargetFile,
        language,
        engine: 'Native GCC 12 (Local Container, Free)',
      });

      sendEvent('system', { text: `[Compiling] gcc -O2 -std=c11 "${safeTargetFile}" -o prog.out -lm\n` });

      const outBin = path.join(tempDir, 'prog.out');
      const compiler = spawn(gccBin, ['-O2', '-std=c11', safeTargetFile, '-o', outBin, '-lm'], {
        cwd: tempDir,
      });

      let compileError = '';
      const compileTimeout = setTimeout(() => {
        try { compiler.kill('SIGKILL'); } catch {}
      }, 15000);
      compiler.stderr.on('data', (d) => {
        if (compileError.length < 64_000) compileError += d.toString('utf-8');
      });

      compiler.on('close', (compileCode) => {
        clearTimeout(compileTimeout);
        if (compileCode !== 0) {
          sendEvent('stderr', { text: compileError || `Compilation failed with code ${compileCode}\n` });
          sendEvent('exit', { code: compileCode });
          if (!res.writableEnded && !res.destroyed) res.end();
          try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
          return;
        }

        sendEvent('system', { text: `✓ Compilation successful! Running program with interactive stdin...\n` });

        const runner = spawn(outBin, [], { cwd: tempDir });
        const session: RunnerSession = {
          id: sessionId,
          language,
          process: runner,
          tempDir,
          createdAt: Date.now(),
        };
        activeSessions.set(sessionId, session);
        attachProcessSafetyGuards(runner, sessionId, tempDir, sendEvent, res);
      });
      return;
    }

    // 5. C++: Compile with G++, then run binary
    if (language === 'cpp') {
      if (/#include\s*["<]graphics\.h[">]/i.test(code)) {
        sendEvent('start', {
          sessionId,
          filename: safeTargetFile,
          language,
          engine: 'Borland BGI <graphics.h> Engine',
        });
        sendEvent('system', { text: `[Graphics Engine] Borland BGI <graphics.h> detected: Compillo Virtual Graphics Framebuffer Canvas Window initialized.\n` });
        sendEvent('graphics_fallback', { library: 'graphics.h', filename: safeTargetFile });
        sendEvent('exit', { code: 0 });
        if (!res.writableEnded && !res.destroyed) res.end();
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
        return;
      }

      const gppBin = getSystemBinary(['/usr/bin/g++', '/usr/local/bin/g++', 'g++']);
      if (!gppBin) {
        return runViaWandbox('gcc-head', code, 'C++ (Free Community Compiler)', sessionId, safeTargetFile, language, sendEvent, res, tempDir);
      }

      sendEvent('start', {
        sessionId,
        filename: safeTargetFile,
        language,
        engine: 'Native G++ 12 (Local Container, Free)',
      });

      sendEvent('system', { text: `[Compiling] g++ -O2 -std=c++17 "${safeTargetFile}" -o prog.out\n` });

      const outBin = path.join(tempDir, 'prog.out');
      const compiler = spawn(gppBin, ['-O2', '-std=c++17', safeTargetFile, '-o', outBin], {
        cwd: tempDir,
      });

      let compileError = '';
      const compileTimeout = setTimeout(() => {
        try { compiler.kill('SIGKILL'); } catch {}
      }, 15000);
      compiler.stderr.on('data', (d) => {
        if (compileError.length < 64_000) compileError += d.toString('utf-8');
      });

      compiler.on('close', (compileCode) => {
        clearTimeout(compileTimeout);
        if (compileCode !== 0) {
          sendEvent('stderr', { text: compileError || `Compilation failed with code ${compileCode}\n` });
          sendEvent('exit', { code: compileCode });
          if (!res.writableEnded && !res.destroyed) res.end();
          try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
          return;
        }

        sendEvent('system', { text: `✓ Compilation successful! Running C++ binary with interactive stdin...\n` });

        const runner = spawn(outBin, [], { cwd: tempDir });
        const session: RunnerSession = {
          id: sessionId,
          language,
          process: runner,
          tempDir,
          createdAt: Date.now(),
        };
        activeSessions.set(sessionId, session);
        attachProcessSafetyGuards(runner, sessionId, tempDir, sendEvent, res);
      });
      return;
    }

    // 6. Go: Run with `go run`
    if (language === 'go') {
      const goBin = getSystemBinary(['/usr/bin/go', '/usr/local/bin/go', 'go']);
      if (!goBin) {
        return runViaWandbox('go-1.23.2', code, 'Go Runtime (Free Community)', sessionId, safeTargetFile, language, sendEvent, res, tempDir);
      }

      sendEvent('start', {
        sessionId,
        filename: safeTargetFile,
        language,
        engine: 'Native Go 1.19+ Runtime (Local Container, Free)',
      });

      sendEvent('system', { text: `[Running] go run "${safeTargetFile}"\n` });

      const runner = spawn(goBin, ['run', safeTargetFile], {
        cwd: tempDir,
        env: {
          ...process.env,
          GOCACHE: path.join(tempDir, '.gocache'),
        },
      });

      const session: RunnerSession = {
        id: sessionId,
        language,
        process: runner,
        tempDir,
        createdAt: Date.now(),
      };
      activeSessions.set(sessionId, session);
      attachProcessSafetyGuards(runner, sessionId, tempDir, sendEvent, res);
      return;
    }

    // 7. TypeScript: Run with `tsx`
    if (language === 'typescript') {
      const tsxBin = path.join(process.cwd(), 'node_modules', '.bin', 'tsx');
      const nodeBin = getSystemBinary(['/usr/local/bin/node', '/usr/bin/node', 'node']) || 'node';

      sendEvent('start', {
        sessionId,
        filename: safeTargetFile,
        language,
        engine: 'Native TypeScript Engine (TSX / Node.js 20, Free)',
      });

      sendEvent('system', { text: `[Running] tsx "${safeTargetFile}"...\n` });

      const runner = fs.existsSync(tsxBin)
        ? spawn(tsxBin, [safeTargetFile], { cwd: tempDir })
        : spawn(nodeBin, [safeTargetFile], { cwd: tempDir });

      const session: RunnerSession = {
        id: sessionId,
        language,
        process: runner,
        tempDir,
        createdAt: Date.now(),
      };
      activeSessions.set(sessionId, session);
      attachProcessSafetyGuards(runner, sessionId, tempDir, sendEvent, res);
      return;
    }

    // 8. JavaScript: Run with `node`
    if (language === 'javascript') {
      const nodeBin = getSystemBinary(['/usr/local/bin/node', '/usr/bin/node', 'node']) || 'node';

      sendEvent('start', {
        sessionId,
        filename: safeTargetFile,
        language,
        engine: 'Node.js 20 Runtime (Local Container, Free)',
      });

      sendEvent('system', { text: `[Running] node "${safeTargetFile}"...\n` });

      const runner = spawn(nodeBin, [safeTargetFile], { cwd: tempDir });
      const session: RunnerSession = {
        id: sessionId,
        language,
        process: runner,
        tempDir,
        createdAt: Date.now(),
      };
      activeSessions.set(sessionId, session);
      attachProcessSafetyGuards(runner, sessionId, tempDir, sendEvent, res);
      return;
    }

    // 9. Shell / Bash: Run with `/usr/bin/bash`
    if (language === 'shell') {
      const bashBin = getSystemBinary(['/usr/bin/bash', '/bin/bash', 'bash']) || '/bin/sh';

      sendEvent('start', {
        sessionId,
        filename: safeTargetFile,
        language,
        engine: 'GNU Bash Shell (Linux Container, Free)',
      });

      sendEvent('system', { text: `[Running] bash "${safeTargetFile}"...\n` });

      const runner = spawn(bashBin, [safeTargetFile], { cwd: tempDir });
      const session: RunnerSession = {
        id: sessionId,
        language,
        process: runner,
        tempDir,
        createdAt: Date.now(),
      };
      activeSessions.set(sessionId, session);
      attachProcessSafetyGuards(runner, sessionId, tempDir, sendEvent, res);
      return;
    }

    // Default: Return raw output
    sendEvent('start', {
      sessionId,
      filename: safeTargetFile,
      language,
      engine: 'Generic Document Viewer',
    });
    sendEvent('stdout', { text: `File content loaded (${code.length} bytes, ${code.split('\n').length} lines):\n` });
    sendEvent('stdout', { text: code + '\n' });
    sendEvent('exit', { code: 0 });
    if (!res.writableEnded && !res.destroyed) res.end();
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  } catch (err: any) {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else if (!res.writableEnded && !res.destroyed) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
}

/**
 * Free cloud compiler fallback via Wandbox API (no auth, 100% free)
 */
async function runViaWandbox(
  compiler: string,
  code: string,
  engineName: string,
  sessionId: string,
  filename: string,
  language: string,
  sendEvent: (event: string, data: any) => void,
  res: Response,
  tempDir: string
) {
  sendEvent('start', {
    sessionId,
    filename,
    language,
    engine: engineName,
  });

  sendEvent('system', { text: `[Free Cloud Runner] Compiling via ${compiler}...\n` });

  try {
    const resp = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        compiler,
        code,
      }),
    });
    const data: any = await resp.json();
    if (data.compiler_message) sendEvent('stderr', { text: data.compiler_message });
    if (data.program_message) sendEvent('stdout', { text: data.program_message });
    const exitCode = parseInt(data.status, 10) || 0;
    sendEvent('exit', { code: exitCode });
  } catch (err: any) {
    sendEvent('error', { error: `Compiler request failed: ${err.message}` });
  } finally {
    if (!res.writableEnded && !res.destroyed) res.end();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}
