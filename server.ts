import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import http from 'http';
import net from 'net';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import {
  getAvailableCompilers,
  handleLanguageExecution,
  sendStdinToSession,
  killRunnerSession,
} from './server/multiLanguageRunner';
import { githubRouter } from './server/githubRoutes';
import { googleAuthRouter } from './server/googleRoutes';
import { GoogleGenAI } from '@google/genai';
import { runAgentWorkspace } from './server/agentWorkspaceRunner';
import { handleSqlExecution } from './server/sqlScratchpad';
import { attachCollabWebSocket } from './server/collabWsServer';
import { handleCodeAudit, handleSiteAudit, handleLocalHttpTest } from './server/apiSecurityLab';
import { handlePythonBenchmark } from './server/benchmarkLab';
import {
  handleLeetCodeDaily,
  handleLeetCodeList,
  handleLeetCodeRandom,
  handleLeetCodeQuestion,
  handleLeetCodeRun,
} from './server/leetcodeHub';
import { handleAstInspect } from './server/regexAstLab';

let FIREBASE_CONFIG_CACHE: { projectId?: string; firestoreDatabaseId?: string } = {};
try {
  const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    FIREBASE_CONFIG_CACHE = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  }
} catch {
  // ignore
}

// Probe whether a local TCP port is actively accepting connections
function probeLocalPort(port: number, timeoutMs = 350): Promise<boolean> {
  return new Promise((resolve) => {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      resolve(false);
      return;
    }
    const socket = net.createConnection({ port, host: '127.0.0.1' });
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

// Parse Linux /proc/net/tcp & /proc/net/tcp6 for listening TCP sockets (state === '0A')
async function scanListeningTcpPorts(): Promise<Array<{ port: number; host: string; protocol: string }>> {
  const found = new Map<number, { port: number; host: string; protocol: string }>();
  const sources: Array<{ file: string; protocol: string }> = [
    { file: '/proc/net/tcp', protocol: 'tcp' },
    { file: '/proc/net/tcp6', protocol: 'tcp6' },
  ];

  for (const src of sources) {
    try {
      if (!fs.existsSync(src.file)) continue;
      const raw = fs.readFileSync(src.file, 'utf-8');
      const lines = raw.split('\n').slice(1);
      for (const line of lines) {
        const cols = line.trim().split(/\s+/);
        if (cols.length < 4) continue;
        const localAddr = cols[1];
        const state = cols[3];
        if (state !== '0A') continue; // 0A = TCP_LISTEN
        const colonIdx = localAddr.lastIndexOf(':');
        if (colonIdx === -1) continue;
        const portHex = localAddr.slice(colonIdx + 1);
        const port = parseInt(portHex, 16);
        if (port > 0 && port <= 65535 && !found.has(port)) {
          found.set(port, {
            port,
            host: src.protocol === 'tcp6' ? '::' : '127.0.0.1',
            protocol: src.protocol,
          });
        }
      }
    } catch {
      // ignore unreadable procfs
    }
  }

  return Array.from(found.values()).sort((a, b) => a.port - b.port);
}

// Find Linux PIDs listening on a specific TCP port via /proc/net/tcp* and /proc/<pid>/fd/*
function findPidsByListeningPort(targetPort: number): number[] {
  const inodes = new Set<string>();
  for (const file of ['/proc/net/tcp', '/proc/net/tcp6']) {
    try {
      if (!fs.existsSync(file)) continue;
      const lines = fs.readFileSync(file, 'utf-8').split('\n').slice(1);
      for (const line of lines) {
        const cols = line.trim().split(/\s+/);
        if (cols.length < 10) continue;
        if (cols[3] !== '0A') continue;
        const colonIdx = cols[1].lastIndexOf(':');
        if (colonIdx === -1) continue;
        const port = parseInt(cols[1].slice(colonIdx + 1), 16);
        if (port === targetPort && cols[9]) {
          inodes.add(`socket:[${cols[9]}]`);
        }
      }
    } catch {
      // ignore procfs read errors
    }
  }
  if (inodes.size === 0) return [];

  const pids: number[] = [];
  try {
    const entries = fs.readdirSync('/proc');
    for (const entry of entries) {
      if (!/^\d+$/.test(entry)) continue;
      const pid = parseInt(entry, 10);
      if (pid === process.pid || pid <= 1) continue;
      const fdDir = `/proc/${entry}/fd`;
      try {
        const fds = fs.readdirSync(fdDir);
        for (const fd of fds) {
          try {
            const link = fs.readlinkSync(`${fdDir}/${fd}`);
            if (inodes.has(link)) {
              pids.push(pid);
              break;
            }
          } catch {
            // ignore vanished fd
          }
        }
      } catch {
        // ignore permission-denied proc dirs
      }
    }
  } catch {
    // ignore
  }
  return Array.from(new Set(pids));
}

function normalizeGeminiModel(model?: string): string {
  if (!model || model === 'gemini-3.8-flash') return 'gemini-4-hydrogen';
  return model;
}

function extractReadableApiError(err: any, fallback: string): string {
  const raw = String(err?.message || '').trim();
  if (!raw) return fallback;
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error?.message) return String(parsed.error.message);
      if (parsed?.message) return String(parsed.message);
    } catch {
      // ignore non-JSON
    }
  }
  return raw;
}

interface PythonSession {
  id: string;
  process: ChildProcessWithoutNullStreams;
  tempDir: string;
  createdAt: number;
  resetIdleTimer?: () => void;
}

const activeSessions = new Map<string, PythonSession>();

interface ShellSession {
  id: string;
  rootDir: string;
  cwd: string;
  lastUsed: number;
}

const shellSessions = new Map<string, ShellSession>();

// Cleanup stale sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of activeSessions.entries()) {
    if (now - session.createdAt > 30 * 60 * 1000) {
      try {
        session.process.kill('SIGKILL');
        fs.rmSync(session.tempDir, { recursive: true, force: true });
      } catch (e) {
        // ignore
      }
      activeSessions.delete(id);
    }
  }
  for (const [id, shell] of shellSessions.entries()) {
    if (now - shell.lastUsed > 30 * 60 * 1000) {
      try {
        fs.rmSync(shell.rootDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
      shellSessions.delete(id);
    }
  }
}, 10 * 60 * 1000);

// Ensure matplotlib configuration and paths are correctly configured
function ensureMatplotlibConfig() {
  try {
    const etcRc = '/etc/matplotlibrc';
    if (!fs.existsSync(etcRc)) {
      const candidates = [
        '/usr/share/matplotlib/mpl-data/matplotlibrc',
        '/usr/share/matplotlib/matplotlib.conf/matplotlibrc',
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          fs.copyFileSync(cand, etcRc);
          break;
        }
      }
    }
    const targetMplData = '/usr/lib/python3/dist-packages/matplotlib/mpl-data';
    const srcMplData = '/usr/share/matplotlib/mpl-data';
    if (!fs.existsSync(targetMplData) && fs.existsSync(srcMplData)) {
      try {
        fs.symlinkSync(srcMplData, targetMplData);
      } catch {
        // ignore if exists or permission
      }
    }
  } catch (e) {
    console.warn('Warning: Matplotlib config initialization:', e);
  }
}

/**
 * Auto-sanitizes and heals Python indentation errors
 * Resolves unexpected indents on line 1, copied blocks with uniform indentation,
 * and top-level statements that have accidental indentation.
 */
function autoHealPythonIndentation(source: string): { code: string; wasFixed: boolean; reason?: string } {
  if (!source || typeof source !== 'string') {
    return { code: '', wasFixed: false };
  }

  // 1. Normalize line endings (CRLF / CR -> LF)
  const normalized = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  let lines = normalized.split('\n');
  let modified = false;
  let reason = '';

  // 2. Check if all non-empty lines have a common leading indent (e.g. copied from inside a block)
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
  if (nonEmptyLines.length > 0) {
    const minIndent = Math.min(
      ...nonEmptyLines.map((l) => {
        const match = l.match(/^[ \t]+/);
        return match ? match[0].length : 0;
      })
    );
    if (minIndent > 0) {
      lines = lines.map((l) =>
        l.length >= minIndent && /^[ \t]/.test(l) ? l.slice(minIndent) : l
      );
      modified = true;
      reason = `Dented uniform ${minIndent}-space indentation across file`;
    }
  }

  // 3. Line 1 / first non-comment non-empty line CANNOT have leading whitespace in Python (module root)
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.length > 0) {
      if (!trimmed.startsWith('#')) {
        if (/^[ \t]+/.test(lines[i])) {
          lines[i] = lines[i].replace(/^[ \t]+/, '');
          modified = true;
          reason = `Fixed unexpected leading indentation on line ${i + 1}`;
        }
        break;
      }
    }
  }

  // 4. In Python, top-level statements (before entering any def/class/with/try/if/for/while blocks)
  // cannot have indentation. E.g. "    import matplotlib.pyplot as plt" or "    from datetime import date"
  let inBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.endsWith(':')) {
      inBlock = true;
    }

    if (!inBlock && (trimmed.startsWith('import ') || trimmed.startsWith('from ') || trimmed.startsWith('def ') || trimmed.startsWith('class '))) {
      if (/^[ \t]+/.test(lines[i])) {
        lines[i] = lines[i].replace(/^[ \t]+/, '');
        modified = true;
        if (!reason) reason = `Cleaned unexpected indent on line ${i + 1}`;
      }
    }
  }

  return { code: lines.join('\n'), wasFixed: modified, reason };
}

function getPythonBin(): string {
  const candidates = [
    '/usr/bin/python3',
    '/usr/local/bin/python3',
    '/usr/bin/python',
    '/usr/local/bin/python',
    '/bin/python3',
    'python3',
    'python',
  ];
  for (const bin of candidates) {
    if (bin.startsWith('/')) {
      try {
        if (fs.existsSync(bin)) return bin;
      } catch {
        // ignore
      }
    }
  }
  return 'python3';
}

// Prevent unhandled socket/stream exceptions from crashing the Compillo Studio web server
process.on('uncaughtException', (err) => {
  console.error('[Compillo Safety Guard] Caught uncaughtException:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Compillo Safety Guard] Caught unhandledRejection:', reason);
});

// Lightweight in-memory sliding-window rate limiter to protect compute & AI endpoints
const executionRateBuckets = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of executionRateBuckets.entries()) {
    if (now > bucket.resetAt) executionRateBuckets.delete(key);
  }
}, 60_000);

function checkExecutionRateLimit(req: express.Request, maxPerMinute = 45): boolean {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local')
    .split(',')[0]
    .trim();
  const now = Date.now();
  const bucket = executionRateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    executionRateBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= maxPerMinute) {
    return false;
  }
  bucket.count += 1;
  return true;
}

const MAX_PYTHON_SESSIONS = 25;
const MAX_CODE_BYTES = 256 * 1024;
const MAX_OUTPUT_BYTES = 512 * 1024;
const PYTHON_IDLE_TIMEOUT_MS = 60_000;
const PYTHON_MAX_RUNTIME_MS = 180_000;

async function startServer() {
  ensureMatplotlibConfig();
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Baseline HTTP security headers (preserves iframe preview embedding for Compillo workspace)
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // These endpoints run user-controlled code or interact with local processes.
  // Keep them disabled on public deployments unless execution is isolated in a
  // dedicated sandbox service. Render does not sandbox child processes for us.
  const unsafeExecutionPrefixes = [
    '/api/ports',
    '/api/projects/start',
    '/api/deploy',
    '/api/sql/run',
    '/api/beta/code-audit',
    '/api/beta/site-audit',
    '/api/beta/http-test',
    '/api/beta/benchmark',
    '/api/beta/leetcode/run',
    '/api/beta/ast-parse',
    '/api/runner',
    '/api/python',
  ];
  app.use((req, res, next) => {
    const isUnsafeExecutionRoute = unsafeExecutionPrefixes.some(
      (prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`)
    );
    if (isUnsafeExecutionRoute && process.env.ENABLE_UNSAFE_EXECUTION !== 'true') {
      res.status(503).json({
        error: 'Code execution is disabled until an isolated runner is configured.',
      });
      return;
    }
    next();
  });

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  interface DeployedAppRecord {
    slug: string;
    port?: number;
    project: 'calculator' | 'custom-static' | 'custom-python';
    dir?: string;
    entryFile?: string;
    createdAt: number;
  }

  const HOSTED_ROOT_DIR = path.join(os.tmpdir(), 'compillo_hosted');
  fs.mkdirSync(HOSTED_ROOT_DIR, { recursive: true });
  const DEPLOY_REGISTRY_FILE = path.join(os.tmpdir(), 'compillo_deployments.json');
  const deployedApps = new Map<string, DeployedAppRecord>([
    ['ishant-calculator', { slug: 'ishant-calculator', port: 5050, project: 'calculator', createdAt: Date.now() }],
    ['calculator', { slug: 'calculator', port: 5050, project: 'calculator', createdAt: Date.now() }],
    ['pycalc', { slug: 'pycalc', port: 5050, project: 'calculator', createdAt: Date.now() }],
  ]);

  try {
    if (fs.existsSync(DEPLOY_REGISTRY_FILE)) {
      const saved = JSON.parse(fs.readFileSync(DEPLOY_REGISTRY_FILE, 'utf-8'));
      if (Array.isArray(saved)) {
        for (const item of saved) {
          if (item && typeof item.slug === 'string') {
            deployedApps.set(item.slug, {
              slug: item.slug,
              port: Number.isInteger(item.port) ? item.port : undefined,
              project:
                item.project === 'custom-static' || item.project === 'custom-python'
                  ? item.project
                  : 'calculator',
              dir: typeof item.dir === 'string' ? item.dir : undefined,
              entryFile: typeof item.entryFile === 'string' ? item.entryFile : undefined,
              createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
            });
          }
        }
      }
    }
  } catch {
    // ignore corrupt deployment registry
  }

  const saveDeployRegistry = () => {
    try {
      fs.writeFileSync(DEPLOY_REGISTRY_FILE, JSON.stringify(Array.from(deployedApps.values()), null, 2), 'utf-8');
    } catch {
      // ignore
    }
  };

  let calculatorBootPromise: Promise<{ ok: boolean; error?: string }> | null = null;
  const ensureProjectServerRunning = async (
    targetDir: string,
    targetPort: number,
    restart = false
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!fs.existsSync(targetDir)) {
      return { ok: false, error: 'Project directory not found' };
    }
    const already = await probeLocalPort(targetPort, 200);
    if (already && !restart) {
      return { ok: true };
    }
    if (already && restart) {
      for (const pid of findPidsByListeningPort(targetPort)) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          // ignore
        }
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    try {
      const logFile = path.join(os.tmpdir(), `compillo_app_${targetPort}.log`);
      const outFd = fs.openSync(logFile, 'w');
      const child = spawn('python3', ['server.py', String(targetPort)], {
        cwd: targetDir,
        detached: true,
        stdio: ['ignore', outFd, outFd],
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
      });
      child.unref();
      try {
        fs.closeSync(outFd);
      } catch {
        // ignore
      }

      for (let i = 0; i < 18; i++) {
        await new Promise((r) => setTimeout(r, 180));
        if (await probeLocalPort(targetPort, 200)) {
          return { ok: true };
        }
      }
      return { ok: false, error: `Server did not listen on port ${targetPort}` };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Failed to start hosted app server' };
    }
  };

  const ensureCalculatorRunning = async (targetPort = 5050): Promise<{ ok: boolean; error?: string }> => {
    if (await probeLocalPort(targetPort, 200)) {
      return { ok: true };
    }
    if (calculatorBootPromise) {
      return calculatorBootPromise;
    }

    calculatorBootPromise = ensureProjectServerRunning(
      path.resolve(process.cwd(), 'projects/calculator'),
      targetPort,
      false
    ).finally(() => {
      calculatorBootPromise = null;
    });

    return calculatorBootPromise;
  };

  const proxyToLocalPort = (
    req: express.Request,
    res: express.Response,
    portNum: number,
    mountPrefix: string
  ) => {
    const targetPath = req.url || '/';
    const headers: Record<string, string | string[] | undefined> = { ...req.headers };
    delete headers['accept-encoding'];
    headers.host = `127.0.0.1:${portNum}`;
    headers['x-forwarded-host'] = req.headers.host || `127.0.0.1:${PORT}`;
    headers['x-compillo-proxy'] = '1';

    const proxyReq = http.request(
      {
        hostname: '127.0.0.1',
        port: portNum,
        path: targetPath,
        method: req.method,
        headers,
      },
      (proxyRes) => {
        const respHeaders: Record<string, string | string[] | undefined> = { ...proxyRes.headers };
        // Allow iframe embedding inside Compillo Live Preview pane
        delete respHeaders['x-frame-options'];
        delete respHeaders['content-security-policy'];

        // Rewrite root-relative redirects so they stay within mountPrefix
        if (typeof respHeaders.location === 'string' && respHeaders.location.startsWith('/')) {
          respHeaders.location = `${mountPrefix}${respHeaders.location}`;
        }

        if (!res.headersSent) {
          res.writeHead(proxyRes.statusCode || 502, respHeaders);
        }
        proxyRes.on('error', () => {
          if (!res.writableEnded) res.end();
        });
        proxyRes.pipe(res, { end: true });
      }
    );

    proxyReq.setTimeout(15000, () => {
      proxyReq.destroy(new Error(`Upstream port ${portNum} timed out`));
    });

    req.on('error', () => {
      proxyReq.destroy();
    });

    res.on('close', () => {
      if (!res.writableEnded) {
        proxyReq.destroy();
      }
    });

    proxyReq.on('error', (err) => {
      if (res.headersSent || res.writableEnded || res.destroyed) return;
      const safeMsg = escapeHtml(err.message || 'Connection refused');
      const wantsHtml = (req.headers.accept || '').includes('text/html');
      if (wantsHtml) {
        res.status(502).send(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Port ${portNum} Not Listening</title>
<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{max-width:480px;padding:24px;border:1px solid #334155;border-radius:10px;background:#1e293b}
code{background:#0b1120;padding:2px 6px;border-radius:4px;color:#38bdf8;font-size:13px}</style></head>
<body><div class="card">
<h2 style="margin-top:0;color:#f8fafc">Port ${portNum} is not listening yet</h2>
<p style="color:#94a3b8;font-size:14px;line-height:1.5">Compillo proxy tried connecting to <code>127.0.0.1:${portNum}</code> (${safeMsg}).</p>
<p style="color:#cbd5e1;font-size:13px">Start a server in the <strong>Terminal</strong> tab, e.g.:<br/><br/>
<code>python3 -m http.server ${portNum} &amp;</code></p>
</div></body></html>`);
      } else {
        res.status(502).json({
          error: `Upstream service on port ${portNum} unreachable (${err.message})`,
          port: portNum,
        });
      }
    });

    req.pipe(proxyReq, { end: true });
  };

  const STATIC_MIME_TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };

  // Live HTTP serving & reverse proxy for deployed Compillo apps (/hosted/:slug/)
  app.use('/hosted/:slug', async (req, res) => {
    const slug = String(req.params.slug || '').toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]?$/.test(slug)) {
      res.status(400).send('Invalid hosted app slug.');
      return;
    }

    const qIdx = req.originalUrl.indexOf('?');
    const pathOnly = qIdx === -1 ? req.originalUrl : req.originalUrl.slice(0, qIdx);
    const querySuffix = qIdx === -1 ? '' : req.originalUrl.slice(qIdx);
    if (pathOnly === `/hosted/${slug}`) {
      res.redirect(302, `/hosted/${slug}/${querySuffix}`);
      return;
    }

    let entry = deployedApps.get(slug);
    if (!entry && FIREBASE_CONFIG_CACHE.projectId && FIREBASE_CONFIG_CACHE.firestoreDatabaseId) {
      try {
        const fsUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_CONFIG_CACHE.projectId)}/databases/${encodeURIComponent(FIREBASE_CONFIG_CACHE.firestoreDatabaseId)}/documents/hostedApps/${encodeURIComponent(slug)}`;
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), 3500);
        const fsResp = await fetch(fsUrl, { signal: ac.signal });
        clearTimeout(t);
        if (fsResp.ok) {
          const docJson: any = await fsResp.json();
          const fields = docJson?.fields || {};
          const mode = fields?.mode?.stringValue || 'custom-static';
          const entryFile = fields?.entryFile?.stringValue || 'index.html';
          const arr = Array.isArray(fields?.files?.arrayValue?.values) ? fields.files.arrayValue.values : [];
          if (mode === 'calculator') {
            entry = { slug, port: 5050, project: 'calculator', createdAt: Date.now() };
            deployedApps.set(slug, entry);
          } else if (arr.length > 0) {
            const hostedDir = path.join(HOSTED_ROOT_DIR, slug);
            fs.rmSync(hostedDir, { recursive: true, force: true });
            fs.mkdirSync(hostedDir, { recursive: true });
            let hydratedCount = 0;
            for (const v of arr.slice(0, 50)) {
              const m = v?.mapValue?.fields;
              const fPath = typeof m?.path?.stringValue === 'string' ? m.path.stringValue.replace(/^\/+/, '').replace(/\\/g, '/') : '';
              const fContent = typeof m?.content?.stringValue === 'string' ? m.content.stringValue : '';
              if (!fPath || fPath.includes('..') || Buffer.byteLength(fContent, 'utf-8') > MAX_CODE_BYTES) continue;
              const dest = path.resolve(hostedDir, fPath);
              if (!dest.startsWith(hostedDir + path.sep)) continue;
              fs.mkdirSync(path.dirname(dest), { recursive: true });
              fs.writeFileSync(dest, fContent, 'utf-8');
              hydratedCount++;
            }
            if (hydratedCount > 0) {
              if (mode === 'custom-python') {
                entry = { slug, port: 5101, project: 'custom-python', dir: hostedDir, createdAt: Date.now() };
              } else {
                entry = { slug, project: 'custom-static', dir: hostedDir, entryFile, createdAt: Date.now() };
              }
              deployedApps.set(slug, entry);
              saveDeployRegistry();
            }
          }
        }
      } catch {
        // ignore Firestore hydration timeout or private doc
      }
    }

    if (!entry) {
      res.status(404).send(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>App Not Found — Compillo Cloud</title>
<style>body{font-family:system-ui,sans-serif;background:#0b0e17;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px}
.card{max-width:480px;padding:28px;border:1px solid #1e293b;border-radius:14px;background:#111827}
a{display:inline-block;margin-top:16px;padding:9px 16px;border-radius:8px;background:#38bdf8;color:#0f172a;font-weight:600;text-decoration:none;font-size:13px}</style></head>
<body><div class="card">
<h2 style="margin-top:0;color:#f8fafc">${escapeHtml(slug)} is not deployed yet</h2>
<p style="color:#94a3b8;font-size:14px;line-height:1.5">Deploy this route from the Compillo Website Hosting Manager or upload your own HTML/CSS/JS files first, then revisit this URL.</p>
<a href="/?page=hosting">Open Hosted Sites Manager</a>
</div></body></html>`);
      return;
    }

    if (entry.project === 'custom-static' && entry.dir) {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.status(405).send('Method Not Allowed');
        return;
      }

      const rootDir = path.resolve(entry.dir);
      if (!fs.existsSync(rootDir)) {
        res.status(404).send('Hosted files expired or were removed. Please redeploy.');
        return;
      }

      let relPath = (req.path || '/').replace(/^\/+/, '');
      if (!relPath) {
        relPath = entry.entryFile || 'index.html';
      }
      try {
        relPath = decodeURIComponent(relPath);
      } catch {
        res.status(400).send('Malformed path');
        return;
      }

      const resolved = path.resolve(rootDir, relPath);
      if (resolved !== rootDir && !resolved.startsWith(rootDir + path.sep)) {
        res.status(403).send('Forbidden');
        return;
      }

      let fileToServe = resolved;
      try {
        if (fs.existsSync(fileToServe) && fs.statSync(fileToServe).isDirectory()) {
          fileToServe = path.join(fileToServe, 'index.html');
        }
      } catch {
        // handled below
      }

      if (!fs.existsSync(fileToServe) || !fs.statSync(fileToServe).isFile()) {
        res.status(404).send(`<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;background:#0b0e17;color:#e2e8f0;padding:32px">
<h2>File not found</h2><p>${escapeHtml(relPath)} does not exist in <code>${escapeHtml(slug)}</code>.</p>
<a href="/hosted/${escapeHtml(slug)}/" style="color:#38bdf8">Go to home page</a></body></html>`);
        return;
      }

      const ext = path.extname(fileToServe).toLowerCase();
      const mime = STATIC_MIME_TYPES[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.sendFile(fileToServe);
      return;
    }

    if (entry.project === 'custom-python' && entry.dir && entry.port) {
      const booted = await ensureProjectServerRunning(entry.dir, entry.port, false);
      if (!booted.ok) {
        res.status(502).send(`<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;background:#0b0e17;color:#e2e8f0;padding:32px">
<h2>Failed to start hosted Python app</h2><p>${escapeHtml(booted.error || 'Unknown startup error')}</p></body></html>`);
        return;
      }
      proxyToLocalPort(req, res, entry.port, `/hosted/${slug}`);
      return;
    }

    const calcPort = entry.port || 5050;
    const booted = await ensureCalculatorRunning(calcPort);
    if (!booted.ok) {
      res.status(502).send(`<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;background:#0b0e17;color:#e2e8f0;padding:32px">
<h2>Failed to start hosted runtime</h2><p>${escapeHtml(booted.error || 'Unknown startup error')}</p></body></html>`);
      return;
    }

    proxyToLocalPort(req, res, calcPort, `/hosted/${slug}`);
  });

  // Live HTTP reverse proxy for forwarded container ports (mounted BEFORE body parsers to preserve raw streams)
  app.use('/api/ports/proxy/:port', (req, res) => {
    const portNum = parseInt(req.params.port, 10);
    if (!Number.isInteger(portNum) || portNum < 1024 || portNum > 65535) {
      res.status(400).json({ error: 'Invalid or restricted port number (must be 1024-65535)' });
      return;
    }

    // Prevent infinite proxy recursion on port 3000 hitting /api/ports/proxy/*
    if (portNum === PORT && req.originalUrl.startsWith('/api/ports/proxy/')) {
      res.status(400).json({ error: 'Recursive proxy request blocked' });
      return;
    }

    proxyToLocalPort(req, res, portNum, `/api/ports/proxy/${portNum}`);
  });

  app.use(express.json({ limit: '10mb' }));

  // Scan container listening ports & optionally probe specific ports
  app.get('/api/ports/scan', async (req, res) => {
    try {
      const listening = await scanListeningTcpPorts();
      const extraRaw = typeof req.query.ports === 'string' ? req.query.ports : '';
      const extraPorts = extraRaw
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isInteger(n) && n > 0 && n <= 65535);

      const probed: Record<number, boolean> = {};
      await Promise.all(
        extraPorts.map(async (p) => {
          probed[p] = await probeLocalPort(p);
        })
      );

      res.json({
        listeningPorts: listening.map((item) => ({
          ...item,
          reachable: true,
          proxyPath: `/api/ports/proxy/${item.port}/`,
        })),
        probed,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to scan listening ports' });
    }
  });

  // Probe one or multiple localhost ports to check if a service is listening
  app.post('/api/ports/probe', async (req, res) => {
    const { port, ports } = req.body || {};
    const list: number[] = Array.isArray(ports)
      ? ports.map((n: any) => parseInt(String(n), 10))
      : port !== undefined
      ? [parseInt(String(port), 10)]
      : [];

    const validPorts = Array.from(new Set(list)).filter(
      (n) => Number.isInteger(n) && n >= 1 && n <= 65535
    );

    const results: Record<number, boolean> = {};
    await Promise.all(
      validPorts.map(async (p) => {
        results[p] = await probeLocalPort(p);
      })
    );

    res.json({
      results,
      port: validPorts.length === 1 ? validPorts[0] : undefined,
      reachable: validPorts.length === 1 ? results[validPorts[0]] : undefined,
    });
  });

  // Stop any user-started server listening on a localhost port (protects Compillo IDE ports)
  app.post('/api/ports/stop', async (req, res) => {
    const portNum = parseInt(String(req.body?.port ?? ''), 10);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      res.status(400).json({ error: 'Valid port number is required' });
      return;
    }
    if (portNum === 3000 || portNum === 8080 || portNum === PORT) {
      res.status(403).json({ error: `Port ${portNum} is reserved by Compillo Studio and cannot be stopped` });
      return;
    }

    const pids = findPidsByListeningPort(portNum);
    const killed: number[] = [];
    for (const pid of pids) {
      try {
        process.kill(pid, 'SIGTERM');
        killed.push(pid);
      } catch {
        // ignore already exited
      }
    }

    await new Promise((r) => setTimeout(r, 250));
    let stillOpen = await probeLocalPort(portNum, 200);
    if (stillOpen) {
      for (const pid of pids) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          // ignore
        }
      }
      await new Promise((r) => setTimeout(r, 200));
      stillOpen = await probeLocalPort(portNum, 200);
    }

    res.json({
      port: portNum,
      stopped: !stillOpen,
      killedPids: killed,
    });
  });

  // Launch a Compillo project or workspace Python/HTTP server cleanly in background
  app.post('/api/projects/start', async (req, res) => {
    if (!checkExecutionRateLimit(req, 30)) {
      res.status(429).json({ error: 'Rate limit exceeded. Please wait before starting another project server.' });
      return;
    }

    const { project, port: reqPort, files, restart, entryFile } = req.body || {};
    const projectKey = typeof project === 'string' ? project.toLowerCase() : 'workspace';
    const requestedEntry = typeof entryFile === 'string' ? entryFile.replace(/^\/+/, '').replace(/\\/g, '/').trim() : '';

    let targetPort = parseInt(String(reqPort ?? ''), 10);
    let targetDir = '';
    let scriptName = 'server.py';
    let label = 'Local App Server';

    if (projectKey === 'calculator') {
      if (!Number.isInteger(targetPort)) targetPort = 5050;
      targetDir = path.resolve(process.cwd(), 'projects/calculator');
      label = 'PyCalc Calculator';
    } else if (projectKey === 'craveo') {
      if (!Number.isInteger(targetPort)) targetPort = 5000;
      targetDir = path.resolve(process.cwd(), 'projects/craveo');
      scriptName = 'app.py';
      label = 'Craveo Food Delivery';
    } else {
      if (!Number.isInteger(targetPort)) targetPort = 5100;
      label = 'Workspace Server';
    }

    if (targetPort < 1024 || targetPort > 65535 || targetPort === 3000 || targetPort === 8080 || targetPort === PORT) {
      targetPort = 5100;
    }

    let spawnCwd = targetDir;

    // If workspace files were provided, materialize into a clean run directory so live edits take effect
    if (Array.isArray(files) && files.length > 0) {
      const runDir = path.join(os.tmpdir(), `compillo_app_${targetPort}`);
      fs.mkdirSync(runDir, { recursive: true });
      for (const f of files.slice(0, 300)) {
        if (!f || typeof f.path !== 'string' || typeof f.content !== 'string') continue;
        if (Buffer.byteLength(f.content, 'utf-8') > MAX_CODE_BYTES) continue;
        const rel = f.path.replace(/^\/+/, '');
        if (!rel || rel.includes('..')) continue;
        const full = path.resolve(runDir, rel);
        if (!full.startsWith(runDir + path.sep)) continue;
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, f.content, 'utf-8');
      }
      targetDir = runDir;
      spawnCwd = runDir;

      let resolvedEntry = '';
      if (requestedEntry && !requestedEntry.includes('..')) {
        const candidate = path.resolve(runDir, requestedEntry);
        if (candidate.startsWith(runDir + path.sep) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          resolvedEntry = candidate;
        }
      }

      if (!resolvedEntry) {
        const preferredNames = ['server.py', 'app.py', 'main.py', 'server.js', 'index.js'];
        for (const name of preferredNames) {
          const rootCand = path.join(runDir, name);
          if (fs.existsSync(rootCand)) {
            resolvedEntry = rootCand;
            break;
          }
        }
        // Search nested folders (e.g., imported /craveo/app.py or /my-project/server.py)
        if (!resolvedEntry) {
          const queue: string[] = [runDir];
          while (queue.length > 0 && !resolvedEntry) {
            const dir = queue.shift()!;
            let entries: fs.Dirent[] = [];
            try {
              entries = fs.readdirSync(dir, { withFileTypes: true });
            } catch {
              continue;
            }
            for (const name of preferredNames) {
              const found = entries.find((e) => e.isFile() && e.name === name);
              if (found) {
                resolvedEntry = path.join(dir, found.name);
                break;
              }
            }
            if (!resolvedEntry) {
              for (const entry of entries) {
                if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
                  queue.push(path.join(dir, entry.name));
                }
              }
            }
          }
        }
      }

      if (resolvedEntry) {
        spawnCwd = path.dirname(resolvedEntry);
        scriptName = path.basename(resolvedEntry);
        if (label === 'Workspace Server') {
          label = `${scriptName} Server`;
        }
      } else {
        scriptName = '';
      }
    }

    if (!targetDir || !fs.existsSync(targetDir)) {
      res.status(404).json({ error: 'Project directory not found' });
      return;
    }

    const alreadyListening = await probeLocalPort(targetPort, 250);
    if (alreadyListening && !restart) {
      res.json({
        ok: true,
        alreadyRunning: true,
        port: targetPort,
        label,
        proxyUrl: `/api/ports/proxy/${targetPort}/`,
      });
      return;
    }

    if (alreadyListening && restart) {
      for (const pid of findPidsByListeningPort(targetPort)) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          // ignore
        }
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    const prePorts = new Set((await scanListeningTcpPorts().catch(() => [])).map((p) => p.port));

    const isNodeScript = /\.(js|mjs|cjs)$/i.test(scriptName);
    const runnerBin = isNodeScript ? 'node' : getPythonBin();
    const args = scriptName ? [scriptName, String(targetPort)] : ['-m', 'http.server', String(targetPort)];
    if (!scriptName) {
      label = 'Static Web Server';
    }

    const logFile = path.join(os.tmpdir(), `compillo_app_${targetPort}.log`);
    const outFd = fs.openSync(logFile, 'w');
    const child = spawn(runnerBin, args, {
      cwd: spawnCwd || targetDir,
      detached: true,
      stdio: ['ignore', outFd, outFd],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        PORT: String(targetPort),
        CRAVEO_PORT: String(targetPort),
        PYCALC_PORT: String(targetPort),
      },
    });
    let exitedEarly = false;
    let earlyExitCode: number | null = null;
    child.on('exit', (code) => {
      exitedEarly = true;
      earlyExitCode = code;
    });
    child.unref();
    try {
      fs.closeSync(outFd);
    } catch {
      // ignore
    }

    let ready = false;
    let boundPort = targetPort;
    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 180));
      if (await probeLocalPort(targetPort, 180)) {
        ready = true;
        boundPort = targetPort;
        break;
      }
      // Also detect if the user's server bound a custom hardcoded port (e.g. 5000, 8000, 8888)
      const nowPorts = await scanListeningTcpPorts().catch(() => []);
      const newlyBound = nowPorts.find(
        (p) => !prePorts.has(p.port) && p.port !== 3000 && p.port !== 8080 && p.port !== PORT
      );
      if (newlyBound && (await probeLocalPort(newlyBound.port, 180))) {
        ready = true;
        boundPort = newlyBound.port;
        break;
      }
      if (exitedEarly) {
        break;
      }
    }

    if (!ready) {
      let logTail = '';
      try {
        logTail = fs.readFileSync(logFile, 'utf-8').slice(-600).trim();
      } catch {
        // ignore
      }
      res.status(500).json({
        error: `Server did not listen on port ${targetPort}${exitedEarly ? ` (exited with code ${earlyExitCode ?? 1})` : ''}${logTail ? `: ${logTail}` : ''}`,
      });
      return;
    }

    res.json({
      ok: true,
      port: boundPort,
      pid: child.pid,
      label,
      proxyUrl: `/api/ports/proxy/${boundPort}/`,
    });
  });

  // Publish/deploy either built-in PyCalc or user's own uploaded/editor files to /hosted/:slug/
  app.post('/api/deploy', async (req, res) => {
    if (!checkExecutionRateLimit(req, 30)) {
      res.status(429).json({ error: 'Rate limit exceeded. Please wait before deploying again.' });
      return;
    }

    const rawSlug = typeof req.body?.slug === 'string' ? req.body.slug : '';
    const slug = rawSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);

    if (!slug || !/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]?$/.test(slug)) {
      res.status(400).json({ error: 'Please enter a valid slug (letters, numbers, and hyphens).' });
      return;
    }

    const incomingFiles = req.body?.files;

    // Mode A: Custom user-provided files (static web page / multi-file site / custom server.py)
    if (Array.isArray(incomingFiles) && incomingFiles.length > 0) {
      if (incomingFiles.length > 50) {
        res.status(400).json({ error: 'Maximum 50 files allowed per hosted deployment.' });
        return;
      }

      const ALLOWED_EXT = new Set([
        '.html', '.htm', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.md', '.xml', '.csv', '.py',
      ]);

      const hostedDir = path.join(HOSTED_ROOT_DIR, slug);
      const validFiles: Array<{ rel: string; content: string }> = [];
      let totalBytes = 0;

      for (const f of incomingFiles) {
        if (!f || typeof f.path !== 'string' || typeof f.content !== 'string') continue;
        const size = Buffer.byteLength(f.content, 'utf-8');
        if (size > MAX_CODE_BYTES) {
          res.status(400).json({ error: `File "${f.path}" exceeds 256 KB limit.` });
          return;
        }
        totalBytes += size;
        if (totalBytes > 2 * 1024 * 1024) {
          res.status(400).json({ error: 'Total deployment size exceeds 2 MB limit.' });
          return;
        }

        const rel = f.path.replace(/^\/+/, '').replace(/\\/g, '/').trim();
        if (!rel || rel.includes('..') || rel.startsWith('.') || /[\0\r\n]/.test(rel)) continue;
        const ext = path.extname(rel).toLowerCase();
        if (!ALLOWED_EXT.has(ext)) {
          res.status(400).json({ error: `Unsupported file type "${ext || rel}". Allowed: HTML, CSS, JS, JSON, SVG, TXT, MD, PY.` });
          return;
        }
        const resolved = path.resolve(hostedDir, rel);
        if (!resolved.startsWith(hostedDir + path.sep)) continue;
        validFiles.push({ rel, content: f.content });
      }

      if (validFiles.length === 0) {
        res.status(400).json({ error: 'No valid web files found to deploy.' });
        return;
      }

      // Evict oldest custom deployment if cap exceeded
      if (!deployedApps.has(slug) && deployedApps.size >= 60) {
        for (const [oldSlug, oldRec] of deployedApps.entries()) {
          if (oldSlug !== 'ishant-calculator' && oldSlug !== 'calculator' && oldSlug !== 'pycalc') {
            if (oldRec.dir && fs.existsSync(oldRec.dir)) {
              try {
                fs.rmSync(oldRec.dir, { recursive: true, force: true });
              } catch {
                // ignore
              }
            }
            deployedApps.delete(oldSlug);
            break;
          }
        }
      }

      fs.rmSync(hostedDir, { recursive: true, force: true });
      fs.mkdirSync(hostedDir, { recursive: true });
      for (const vf of validFiles) {
        const dest = path.resolve(hostedDir, vf.rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, vf.content, 'utf-8');
      }

      const hasServerPy = validFiles.some((f) => f.rel === 'server.py');
      if (hasServerPy) {
        // Assign deterministic port in 5101-5149 (or reuse existing port for same slug)
        const existing = deployedApps.get(slug);
        let customPort = existing?.port && existing.port >= 5101 && existing.port <= 5149 ? existing.port : 0;
        if (!customPort) {
          const usedPorts = new Set(Array.from(deployedApps.values()).map((d) => d.port).filter(Boolean));
          for (let p = 5101; p <= 5149; p++) {
            if (!usedPorts.has(p)) {
              customPort = p;
              break;
            }
          }
          if (!customPort) customPort = 5101;
        }

        const booted = await ensureProjectServerRunning(hostedDir, customPort, true);
        if (!booted.ok) {
          res.status(500).json({ error: booted.error || 'Failed to start uploaded server.py' });
          return;
        }

        deployedApps.set(slug, {
          slug,
          port: customPort,
          project: 'custom-python',
          dir: hostedDir,
          createdAt: Date.now(),
        });
        saveDeployRegistry();

        res.json({
          ok: true,
          slug,
          mode: 'custom-python',
          fileCount: validFiles.length,
          livePath: `/hosted/${slug}/`,
        });
        return;
      }

      // Static HTML/CSS/JS site: determine default entry HTML file
      const hasIndexHtml = validFiles.some((f) => f.rel.toLowerCase() === 'index.html');
      const firstHtml = validFiles.find((f) => /\.(html|htm)$/i.test(f.rel));
      const entryFile = hasIndexHtml ? 'index.html' : firstHtml?.rel || validFiles[0].rel;

      deployedApps.set(slug, {
        slug,
        project: 'custom-static',
        dir: hostedDir,
        entryFile,
        createdAt: Date.now(),
      });
      saveDeployRegistry();

      res.json({
        ok: true,
        slug,
        mode: 'custom-static',
        fileCount: validFiles.length,
        entryFile,
        livePath: `/hosted/${slug}/`,
      });
      return;
    }

    // Mode B: Default PyCalc Python backend demo
    const targetPort = 5050;
    const booted = await ensureCalculatorRunning(targetPort);
    if (!booted.ok) {
      res.status(500).json({ error: booted.error || 'Failed to boot hosted Python app server' });
      return;
    }

    deployedApps.set(slug, {
      slug,
      port: targetPort,
      project: 'calculator',
      createdAt: Date.now(),
    });
    saveDeployRegistry();

    res.json({
      ok: true,
      slug,
      mode: 'calculator',
      port: targetPort,
      livePath: `/hosted/${slug}/`,
    });
  });

  // Delete a hosted deployment & stop any running custom Python process for that slug
  app.delete('/api/deploy/:slug', (req, res) => {
    const slug = String(req.params.slug || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');

    if (!slug) {
      res.status(400).json({ error: 'Invalid slug' });
      return;
    }
    if (slug === 'ishant-calculator' || slug === 'calculator' || slug === 'pycalc') {
      res.status(400).json({ error: 'Built-in starter routes cannot be deleted.' });
      return;
    }

    const existing = deployedApps.get(slug);
    if (existing?.project === 'custom-python' && existing.port) {
      for (const pid of findPidsByListeningPort(existing.port)) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          // ignore
        }
      }
    }
    if (existing?.dir && existing.dir.startsWith(HOSTED_ROOT_DIR) && fs.existsSync(existing.dir)) {
      try {
        fs.rmSync(existing.dir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }

    deployedApps.delete(slug);
    saveDeployRegistry();
    res.json({ ok: true, deleted: slug });
  });

  // Interactive Database Schema & SQLite Scratchpad Execution
  app.post('/api/sql/run', (req, res) => {
    if (!checkExecutionRateLimit(req, 45)) {
      res.status(429).json({ ok: false, error: 'Rate limit exceeded. Please wait before running more queries.' });
      return;
    }
    handleSqlExecution(req, res);
  });

  // Beta Labs: Code Security/Crash Scanner, Hosted Site Audit & Safe Local HTTP Tester
  app.post('/api/beta/code-audit', (req, res) => {
    if (!checkExecutionRateLimit(req, 45)) {
      res.status(429).json({ ok: false, error: 'Rate limit exceeded. Please wait before running more audits.' });
      return;
    }
    handleCodeAudit(req, res);
  });

  app.post('/api/beta/site-audit', (req, res) => {
    if (!checkExecutionRateLimit(req, 30)) {
      res.status(429).json({ ok: false, error: 'Rate limit exceeded. Please wait before auditing more sites.' });
      return;
    }
    handleSiteAudit(req, res, PORT);
  });

  app.post('/api/beta/http-test', (req, res) => {
    if (!checkExecutionRateLimit(req, 45)) {
      res.status(429).json({ ok: false, error: 'Rate limit exceeded. Please wait before sending more requests.' });
      return;
    }
    handleLocalHttpTest(req, res, PORT);
  });

  app.post('/api/beta/benchmark', (req, res) => {
    if (!checkExecutionRateLimit(req, 30)) {
      res.status(429).json({ ok: false, error: 'Rate limit exceeded. Please wait before running more benchmarks.' });
      return;
    }
    handlePythonBenchmark(req, res);
  });

  app.get('/api/beta/leetcode/daily', (req, res) => {
    void handleLeetCodeDaily(req, res);
  });

  app.get('/api/beta/leetcode/random', (req, res) => {
    void handleLeetCodeRandom(req, res);
  });

  app.get('/api/beta/leetcode/problems', (req, res) => {
    void handleLeetCodeList(req, res);
  });

  app.get('/api/beta/leetcode/problem/:slug', (req, res) => {
    void handleLeetCodeQuestion(req, res);
  });

  app.post('/api/beta/leetcode/run', (req, res) => {
    if (!checkExecutionRateLimit(req, 35)) {
      res.status(429).json({ ok: false, error: 'Rate limit exceeded. Please wait before running more testcases.' });
      return;
    }
    void handleLeetCodeRun(req, res);
  });

  app.post('/api/beta/ast-parse', (req, res) => {
    if (!checkExecutionRateLimit(req, 60)) {
      res.status(429).json({ ok: false, error: 'Rate limit exceeded.' });
      return;
    }
    void handleAstInspect(req, res);
  });

  // GitHub & Google Auth APIs
  app.use('/api', githubRouter);
  app.use('/', githubRouter);
  app.use('/api', googleAuthRouter);
  app.use('/', googleAuthRouter);

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      pythonAvailable: true,
      time: new Date().toISOString(),
    });
  });

  app.get('/api/python/info', (req, res) => {
    const pythonBin = getPythonBin();
    let responded = false;
    try {
      const py = spawn(pythonBin, ['--version']);
      let output = '';
      py.stdout.on('data', (d) => (output += d.toString()));
      py.stderr.on('data', (d) => (output += d.toString()));
      py.on('error', (err) => {
        if (!responded) {
          responded = true;
          res.json({
            available: false,
            version: 'None',
            executable: pythonBin,
            error: err.message,
          });
        }
      });
      py.on('close', (code) => {
        if (!responded) {
          responded = true;
          res.json({
            available: code === 0,
            version: output.trim() || 'Python 3.10',
            executable: pythonBin,
          });
        }
      });
    } catch (err: any) {
      if (!responded) {
        responded = true;
        res.json({
          available: false,
          version: 'None',
          executable: pythonBin,
          error: err.message,
        });
      }
    }
  });

  // Dedicated download endpoints for Standalone Single-Page Replica
  app.get(['/download/standalone', '/download/compillo-single-page', '/api/download/replica'], (req, res) => {
    const filePath = path.join(process.cwd(), 'public', 'compillo_single_page.html');
    res.download(filePath, 'compillo_single_page.html', (err) => {
      if (err && !res.headersSent) {
        res.status(500).send('Error downloading file');
      }
    });
  });

  // Universal Free Multi-Language Runner API (Python, C, C++, Java, Rust, Go, TS, JS, Shell, SQL, etc.)
  app.get('/api/runner/info', (req, res) => {
    res.json(getAvailableCompilers());
  });

  app.post('/api/runner/run', (req, res) => {
    if (!checkExecutionRateLimit(req, 45)) {
      res.status(429).json({ error: 'Rate limit exceeded. Please wait before running again.' });
      return;
    }
    handleLanguageExecution(req.body, res);
  });

  app.post('/api/runner/stdin', (req, res) => {
    const { sessionId, input = '' } = req.body;
    const success = sendStdinToSession(sessionId, input);
    res.json({ success });
  });

  app.post('/api/runner/kill', (req, res) => {
    const { sessionId } = req.body;
    const success = killRunnerSession(sessionId);
    res.json({ success });
  });

  // Real Workspace Bash Shell Executor (sandboxed temp workspace per session)
  app.post('/api/runner/shell', (req, res) => {
    if (!checkExecutionRateLimit(req, 45)) {
      res.status(429).json({ error: 'Rate limit exceeded. Please wait before executing another command.' });
      return;
    }
    const { sessionId, command, files = [] } = req.body || {};
    if (!command || typeof command !== 'string' || command.length > 16384) {
      res.status(400).json({ error: 'Missing or oversized shell command' });
      return;
    }

    const safeSessionId =
      typeof sessionId === 'string' && /^[a-zA-Z0-9_-]{4,64}$/.test(sessionId)
        ? sessionId
        : `sh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    let session = shellSessions.get(safeSessionId);
    if (!session || !fs.existsSync(session.rootDir)) {
      if (shellSessions.size >= 40) {
        const oldestKey = shellSessions.keys().next().value;
        if (oldestKey) {
          const oldSession = shellSessions.get(oldestKey);
          shellSessions.delete(oldestKey);
          if (oldSession) {
            try {
              fs.rmSync(oldSession.rootDir, { recursive: true, force: true });
            } catch {
              // ignore
            }
          }
        }
      }
      const rootDir = path.join(os.tmpdir(), `compillo_shell_${safeSessionId}`);
      fs.mkdirSync(rootDir, { recursive: true });
      session = { id: safeSessionId, rootDir, cwd: rootDir, lastUsed: Date.now() };
      shellSessions.set(safeSessionId, session);
    }
    session.lastUsed = Date.now();

    try {
      // Expose /app/applet/projects inside shell workspace as "projects" symlink so users can `cd projects/calculator` directly in Terminal
      const hostProjectsDir = path.resolve(process.cwd(), 'projects');
      const shellProjectsLink = path.join(session.rootDir, 'projects');
      try {
        if (fs.existsSync(hostProjectsDir)) {
          let linkExists = false;
          try {
            fs.lstatSync(shellProjectsLink);
            linkExists = true;
          } catch {
            linkExists = false;
          }
          if (!linkExists) {
            fs.symlinkSync(hostProjectsDir, shellProjectsLink, 'dir');
          }
        }
      } catch {
        // ignore symlink failure
      }

      // Materialize workspace files cleanly into rootDir
      if (Array.isArray(files)) {
        for (const f of files.slice(0, 300)) {
          if (!f || typeof f.path !== 'string' || typeof f.content !== 'string') continue;
          if (Buffer.byteLength(f.content, 'utf-8') > MAX_CODE_BYTES) continue;
          const rel = f.path.replace(/^\/+/, '');
          if (!rel || rel.includes('..')) continue;
          const targetPath = path.resolve(session.rootDir, rel);
          if (!targetPath.startsWith(session.rootDir + path.sep)) continue;
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          fs.writeFileSync(targetPath, f.content, 'utf-8');
        }
      }

      if (!fs.existsSync(session.cwd)) {
        session.cwd = session.rootDir;
      }

      const pwdMarker = `__COMPILLO_PWD_${Date.now()}__:`;
      const wrappedCmd = `${command}\n__COMPILLO_RC=$?\necho ""\necho "${pwdMarker}$(pwd -P)"\nexit $__COMPILLO_RC`;

      const child = spawn('bash', ['-c', wrappedCmd], {
        cwd: session.cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          HOME: session.rootDir,
          TERM: 'xterm-256color',
        },
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let finished = false;
      let exitGraceTimer: NodeJS.Timeout | null = null;

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill('SIGKILL');
        } catch {
          // ignore
        }
        finalizeResponse(124);
      }, 15000);

      child.stdout.on('data', (d: Buffer) => {
        if (stdout.length < 200_000) stdout += d.toString('utf-8');
      });

      child.stderr.on('data', (d: Buffer) => {
        if (stderr.length < 200_000) stderr += d.toString('utf-8');
      });

      const finalizeResponse = async (exitCode: number | null) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (exitGraceTimer) clearTimeout(exitGraceTimer);

        const realRootDir = fs.existsSync(session!.rootDir)
          ? fs.realpathSync(session!.rootDir)
          : session!.rootDir;
        const realProjectsDir = fs.existsSync(hostProjectsDir)
          ? fs.realpathSync(hostProjectsDir)
          : hostProjectsDir;

        // Extract updated cwd from marker
        const lines = stdout.split('\n');
        const cleanedLines: string[] = [];
        for (const line of lines) {
          if (line.startsWith(pwdMarker)) {
            const nextPwd = line.slice(pwdMarker.length).trim();
            const resolved = path.resolve(nextPwd);
            const resolvedReal = fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
            if (
              resolvedReal === realRootDir ||
              resolvedReal.startsWith(realRootDir + path.sep) ||
              resolvedReal === realProjectsDir ||
              resolvedReal.startsWith(realProjectsDir + path.sep)
            ) {
              if (fs.existsSync(resolvedReal)) {
                session!.cwd = resolvedReal;
              }
            } else {
              session!.cwd = session!.rootDir;
            }
          } else {
            cleanedLines.push(line);
          }
        }

        const cleanStdout = cleanedLines.join('\n').replace(/\n+$/, '');
        const cwdReal = fs.existsSync(session!.cwd) ? fs.realpathSync(session!.cwd) : session!.cwd;
        let cwdRelative = '';
        if (cwdReal === realProjectsDir || cwdReal.startsWith(realProjectsDir + path.sep)) {
          const relProj = path.relative(realProjectsDir, cwdReal).replace(/\\/g, '/');
          cwdRelative = relProj ? `projects/${relProj}` : 'projects';
        } else {
          cwdRelative = path.relative(realRootDir, cwdReal).replace(/\\/g, '/');
        }

        // Scan workspace root to sync text files modified/created by shell commands
        const syncedFiles: Array<{ path: string; name: string; content: string }> = [];
        const walk = (dir: string) => {
          if (syncedFiles.length >= 300) return;
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (
              entry.name === 'node_modules' ||
              entry.name === '.git' ||
              entry.name.startsWith('.') ||
              entry.isSymbolicLink()
            ) {
              continue;
            }
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              walk(fullPath);
            } else if (entry.isFile()) {
              try {
                const stat = fs.statSync(fullPath);
                if (stat.size <= 200_000) {
                  const buf = fs.readFileSync(fullPath);
                  if (!buf.includes(0)) {
                    const relPath = '/' + path.relative(session!.rootDir, fullPath).replace(/\\/g, '/');
                    syncedFiles.push({
                      path: relPath,
                      name: entry.name,
                      content: buf.toString('utf-8'),
                    });
                  }
                }
              } catch {
                // ignore unreadable files
              }
            }
          }
        };
        try {
          walk(session!.rootDir);
        } catch {
          // ignore
        }

        const listeningPorts = await scanListeningTcpPorts().catch(() => []);

        if (!res.headersSent) {
          res.json({
            sessionId: session!.id,
            stdout: timedOut
              ? `${cleanStdout}\n[Command timed out after 15s. Tip: Append "&" to keep servers running in background, e.g. python3 server.py &]`.trim()
              : cleanStdout,
            stderr: stderr.replace(/\n+$/, ''),
            exitCode: timedOut ? 124 : exitCode ?? 0,
            cwdRelative,
            syncedFiles,
            listeningPorts: listeningPorts.map((p) => p.port),
          });
        }
      };

      child.on('error', (err) => {
        clearTimeout(timer);
        if (exitGraceTimer) clearTimeout(exitGraceTimer);
        if (!finished && !res.headersSent) {
          finished = true;
          res.status(500).json({ error: err.message });
        }
      });

      // Allow backgrounded servers (e.g. `python3 -m http.server 8000 &`) to keep running after bash exits
      child.on('exit', (exitCode) => {
        exitGraceTimer = setTimeout(() => {
          finalizeResponse(exitCode);
        }, 450);
      });

      child.on('close', (exitCode) => {
        finalizeResponse(exitCode);
      });
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || 'Shell execution failed' });
      }
    }
  });

  // Validate and test user-provided API keys (Gemini, OpenAI, Claude)
  app.post('/api/ai/test-key', async (req, res) => {
    if (!checkExecutionRateLimit(req, 30)) {
      res.status(429).json({ success: false, error: 'Rate limit exceeded. Please wait before testing another key.' });
      return;
    }
    const { provider, key } = req.body || {};
    if (!key || typeof key !== 'string' || !key.trim()) {
      res.status(400).json({ success: false, error: 'API key is required' });
      return;
    }

    const trimmedKey = key.trim().replace(/^['"]+|['"]+$/g, '').trim();

    try {
      if (provider === 'gemini') {
        const ai = new GoogleGenAI({
          apiKey: trimmedKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const runGeminiPing = async (modelId: string) => {
          const testPromise = ai.models.generateContent({
            model: modelId,
            contents: 'Reply with OK',
          });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini key verification timed out after 15s')), 15000)
          );
          return Promise.race([testPromise, timeoutPromise]);
        };

        let resolvedModel = 'gemini-4-hydrogen';
        let testRes: any;
        try {
          testRes = await runGeminiPing(resolvedModel);
        } catch (primaryErr: any) {
          const msg = String(primaryErr?.message || '');
          // External AI Studio keys may only have gemini-2.5-flash enabled; fall back gracefully on 404/NOT_FOUND
          if (msg.includes('404') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('not supported')) {
            resolvedModel = 'gemini-2.5-flash';
            testRes = await runGeminiPing(resolvedModel);
          } else {
            throw primaryErr;
          }
        }

        if (testRes?.text !== undefined) {
          res.json({
            success: true,
            resolvedModel,
            message: `Google Gemini API key verified (${resolvedModel})!`,
          });
        } else {
          res.status(400).json({ success: false, error: 'Empty response from Gemini API' });
        }
      } else if (provider === 'openai') {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        try {
          const resp = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${trimmedKey}` },
            signal: controller.signal,
          });
          if (resp.ok) {
            res.json({ success: true, message: 'OpenAI API key verified successfully!' });
          } else {
            const errData = await resp.json().catch(() => ({}));
            const errMsg = (errData as any)?.error?.message || `OpenAI returned status ${resp.status}`;
            res.status(resp.status >= 400 && resp.status < 500 ? resp.status : 400).json({
              success: false,
              error: errMsg,
            });
          }
        } finally {
          clearTimeout(timer);
        }
      } else if (provider === 'claude') {
        const testClaudeModel = async (claudeModel: string) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 15000);
          try {
            return await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'x-api-key': trimmedKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                model: claudeModel,
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Say OK' }],
              }),
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timer);
          }
        };

        let resp = await testClaudeModel('claude-3-5-haiku-20241022');
        if (resp.status === 404) {
          resp = await testClaudeModel('claude-3-5-sonnet-20241022');
        }
        if (resp.ok) {
          res.json({ success: true, message: 'Anthropic Claude API key verified successfully!' });
        } else {
          const errData = await resp.json().catch(() => ({}));
          const errMsg = (errData as any)?.error?.message || `Anthropic returned status ${resp.status}`;
          res.status(resp.status >= 400 && resp.status < 500 ? resp.status : 400).json({
            success: false,
            error: errMsg,
          });
        }
      } else {
        res.status(400).json({ success: false, error: `Unsupported provider: ${provider}` });
      }
    } catch (err: any) {
      const rawMsg = String(err?.message || '');
      const msg = extractReadableApiError(err, `Failed to connect to ${provider} API`);
      const isAuthErr =
        rawMsg.includes('API_KEY_INVALID') ||
        rawMsg.includes('API key not valid') ||
        rawMsg.includes('PERMISSION_DENIED') ||
        rawMsg.includes('401') ||
        rawMsg.includes('403');
      console.error(`Error testing ${provider} key:`, msg);
      res.status(isAuthErr ? 401 : 400).json({
        success: false,
        error: msg,
      });
    }
  });

  // Universal Compillo AI Assistant endpoint supporting Gemini, OpenAI, and Claude
  const handleCompilloAi = async (req: express.Request, res: express.Response) => {
    if (!checkExecutionRateLimit(req, 30)) {
      res.status(429).json({ error: 'AI request rate limit exceeded. Please wait a moment.' });
      return;
    }
    const {
      prompt,
      provider = 'gemini',
      model,
      userApiKey,
      fileName,
      language,
      code,
      selectedCode,
      quickAction,
    } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Missing prompt' });
      return;
    }

    const cleanedUserKey =
      typeof userApiKey === 'string' && userApiKey.trim()
        ? userApiKey.trim().replace(/^['"]+|['"]+$/g, '').trim()
        : undefined;

    const systemInstruction = `You are Compillo AI, an elite AI Software Engineer and Pair Programmer inside Compillo Studio IDE.
ROLE: You assist developers with coding, debugging, refactoring, test generation, and architectural design.
GUIDELINES:
1. Provide concise, high-impact technical explanations.
2. When proposing code solutions or fixes, wrap complete, production-ready code in a single fenced markdown block (\`\`\`${language || 'typescript'} ... \`\`\`) with zero ellipses or lazy placeholders so the developer can apply it directly to their editor.
3. If the task is a major multi-file change or refactor suitable for multi-agent diff review, append a handoff directive at the very end:
[HANDOFF: {"mode": "feature"|"bugfix"|"refactor"|"security", "summary": "1-sentence summary", "prompt": "directive for Agent Studio"}]

Active File: ${fileName || 'untitled'} (${language || 'plaintext'})
${selectedCode ? `Selected Code snippet:\n\`\`\`${language || ''}\n${selectedCode.slice(0, 4000)}\n\`\`\`\n` : ''}
Full File Context:
\`\`\`${language || ''}
${(code || '').slice(0, 10000)}
\`\`\``;

    const fullPrompt = quickAction
      ? `[Action: ${quickAction.toUpperCase()}] ${prompt}`
      : prompt;

    try {
      if (provider === 'gemini') {
        const effectiveKey = cleanedUserKey || process.env.GEMINI_API_KEY;
        if (!effectiveKey) {
          res.json({ fallback: true });
          return;
        }

        const ai = new GoogleGenAI({
          apiKey: effectiveKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        let targetModel = normalizeGeminiModel(model);
        const invokeGemini = async (m: string) => {
          const generatePromise = ai.models.generateContent({
            model: m,
            contents: fullPrompt,
            config: {
              systemInstruction,
            },
          });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API call timed out after 45s')), 45000)
          );
          return Promise.race([generatePromise, timeoutPromise]);
        };

        let response: any;
        try {
          response = await invokeGemini(targetModel);
        } catch (gemErr: any) {
          const msg = String(gemErr?.message || '');
          if (
            cleanedUserKey &&
            targetModel !== 'gemini-2.5-flash' &&
            (msg.includes('404') || msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('not supported'))
          ) {
            targetModel = 'gemini-2.5-flash';
            response = await invokeGemini(targetModel);
          } else {
            throw gemErr;
          }
        }

        const fullText = response.text || '';
        const codeMatch = fullText.match(/```[\w]*\n([\s\S]*?)```/);
        const suggestedCode = codeMatch ? codeMatch[1].trim() : undefined;

        let handoff: { mode: 'feature' | 'bugfix' | 'refactor' | 'security'; summary: string; prompt: string } | undefined = undefined;
        const handoffMatch = fullText.match(/\[HANDOFF:\s*({[\s\S]*?})\]/);
        if (handoffMatch) {
          try {
            const parsed = JSON.parse(handoffMatch[1]);
            handoff = {
              mode: parsed.mode || 'feature',
              summary: parsed.summary || 'Ready to stage multi-file diff in Agent Studio',
              prompt: parsed.prompt || prompt,
            };
          } catch {
            // ignore
          }
        }

        const cleanReply = fullText.replace(/\[HANDOFF:\s*({[\s\S]*?})\]/g, '').trim();

        res.json({
          reply: cleanReply,
          suggestedCode,
          handoff,
          model: targetModel,
          provider: 'gemini',
        });
      } else if (provider === 'openai') {
        const effectiveKey = cleanedUserKey || process.env.OPENAI_API_KEY;
        if (!effectiveKey) {
          res.status(401).json({
            error: 'OpenAI API key missing. Please enter your personal OpenAI key in the Compillo Key Vault.',
            requireKey: true,
            provider: 'openai',
          });
          return;
        }

        const targetModel = model || 'gpt-4o';
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 45000);
        let openAiRes: Response;
        try {
          openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${effectiveKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: targetModel,
              messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: fullPrompt },
              ],
              temperature: 0.2,
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }

        if (!openAiRes.ok) {
          const errData = await openAiRes.json().catch(() => ({}));
          const errMsg = (errData as any)?.error?.message || `OpenAI returned HTTP ${openAiRes.status}`;
          res.status(openAiRes.status).json({
            error: errMsg,
            provider: 'openai',
            isKeyError: openAiRes.status === 401 || openAiRes.status === 403,
          });
          return;
        }

        const data = await openAiRes.json();
        const fullText = (data as any)?.choices?.[0]?.message?.content || '';
        const codeMatch = fullText.match(/```[\w]*\n([\s\S]*?)```/);
        const suggestedCode = codeMatch ? codeMatch[1].trim() : undefined;

        let handoff: { mode: 'feature' | 'bugfix' | 'refactor' | 'security'; summary: string; prompt: string } | undefined = undefined;
        const handoffMatch = fullText.match(/\[HANDOFF:\s*({[\s\S]*?})\]/);
        if (handoffMatch) {
          try {
            const parsed = JSON.parse(handoffMatch[1]);
            handoff = {
              mode: parsed.mode || 'feature',
              summary: parsed.summary || 'Ready to stage multi-file diff in Agent Studio',
              prompt: parsed.prompt || prompt,
            };
          } catch {
            // ignore
          }
        }

        const cleanReply = fullText.replace(/\[HANDOFF:\s*({[\s\S]*?})\]/g, '').trim();

        res.json({
          reply: cleanReply,
          suggestedCode,
          handoff,
          model: targetModel,
          provider: 'openai',
        });
      } else if (provider === 'claude') {
        const effectiveKey = cleanedUserKey || process.env.ANTHROPIC_API_KEY;
        if (!effectiveKey) {
          res.status(401).json({
            error: 'Anthropic Claude API key missing. Please enter your personal Claude key in the Compillo Key Vault.',
            requireKey: true,
            provider: 'claude',
          });
          return;
        }

        const targetModel = model || 'claude-3-5-sonnet-20241022';
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 45000);
        let claudeRes: Response;
        try {
          claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': effectiveKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: targetModel,
              max_tokens: 4096,
              system: systemInstruction,
              messages: [{ role: 'user', content: fullPrompt }],
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }

        if (!claudeRes.ok) {
          const errData = await claudeRes.json().catch(() => ({}));
          const errMsg = (errData as any)?.error?.message || `Anthropic returned HTTP ${claudeRes.status}`;
          res.status(claudeRes.status).json({
            error: errMsg,
            provider: 'claude',
            isKeyError: claudeRes.status === 401 || claudeRes.status === 403,
          });
          return;
        }

        const data = await claudeRes.json();
        const contentArr = (data as any)?.content || [];
        const fullText = contentArr
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n');

        const codeMatch = fullText.match(/```[\w]*\n([\s\S]*?)```/);
        const suggestedCode = codeMatch ? codeMatch[1].trim() : undefined;

        let handoff: { mode: 'feature' | 'bugfix' | 'refactor' | 'security'; summary: string; prompt: string } | undefined = undefined;
        const handoffMatch = fullText.match(/\[HANDOFF:\s*({[\s\S]*?})\]/);
        if (handoffMatch) {
          try {
            const parsed = JSON.parse(handoffMatch[1]);
            handoff = {
              mode: parsed.mode || 'feature',
              summary: parsed.summary || 'Ready to stage multi-file diff in Agent Studio',
              prompt: parsed.prompt || prompt,
            };
          } catch {
            // ignore
          }
        }

        const cleanReply = fullText.replace(/\[HANDOFF:\s*({[\s\S]*?})\]/g, '').trim();

        res.json({
          reply: cleanReply,
          suggestedCode,
          handoff,
          model: targetModel,
          provider: 'claude',
        });
      } else {
        res.status(400).json({ error: `Unsupported provider: ${provider}` });
      }
    } catch (err: any) {
      const rawMsg = String(err?.message || '');
      const msg = extractReadableApiError(err, `Failed to contact ${provider} API`);
      const isAuthErr =
        rawMsg.includes('API_KEY_INVALID') ||
        rawMsg.includes('API key not valid') ||
        rawMsg.includes('PERMISSION_DENIED') ||
        rawMsg.includes('401') ||
        rawMsg.includes('403');
      console.error(`Compillo AI (${provider}) error:`, msg);
      if (cleanedUserKey || provider !== 'gemini') {
        res.status(isAuthErr ? 401 : 400).json({
          error: msg,
          provider,
          isKeyError: isAuthErr,
        });
      } else {
        res.json({ fallback: true, error: msg });
      }
    }
  };

  app.post('/api/ai/compillo', handleCompilloAi);
  app.post('/api/ai/assist', handleCompilloAi);

  // AI Multi-Agent Workspace Orchestrator (Planner -> Coder -> Reviewer -> Tester)
  app.post('/api/ai/agent-workspace', async (req, res) => {
    if (!checkExecutionRateLimit(req, 30)) {
      res.status(429).json({ error: 'AI agent rate limit exceeded. Please wait a moment.' });
      return;
    }
    try {
      const { prompt, workflowType, provider, model, userApiKey, activeFile, workspaceFiles } = req.body || {};
      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'Missing prompt' });
        return;
      }

      const result = await runAgentWorkspace({
        prompt: prompt.trim(),
        workflowType: workflowType || 'feature',
        provider,
        model,
        userApiKey,
        activeFile,
        workspaceFiles: Array.isArray(workspaceFiles) ? workspaceFiles : [],
      });

      res.json(result);
    } catch (err: any) {
      console.error('Agent workspace orchestration error:', err);
      res.status(400).json({ error: err?.message || 'Failed to complete multi-agent workflow', details: err?.message });
    }
  });

  // Start an interactive Python script execution with live streaming I/O
  app.post('/api/python/run', (req, res) => {
    if (!checkExecutionRateLimit(req, 45)) {
      res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment before running again.' });
      return;
    }
    if (activeSessions.size >= MAX_PYTHON_SESSIONS) {
      res.status(429).json({ error: 'Too many active Python sessions. Stop an existing runner first.' });
      return;
    }

    const { code = '', filename = 'main.py', workspaceFiles = [] } = req.body || {};
    if (typeof code !== 'string' || Buffer.byteLength(code, 'utf-8') > MAX_CODE_BYTES) {
      res.status(413).json({ error: 'Source file exceeds 256 KB safety limit.' });
      return;
    }

    const safeFilename = path.basename(String(filename || 'main.py')).replace(/[^\w.-]/g, '_') || 'main.py';
    const sessionId = 'py_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const tempDir = path.join(os.tmpdir(), `compillo_${sessionId}`);

    try {
      fs.mkdirSync(tempDir, { recursive: true });

      // Automatically sanitize and auto-heal Python indentation to prevent IndentationError
      const { code: healedCode, wasFixed, reason } = autoHealPythonIndentation(code);

      // Write any additional workspace files (for multi-file modules, imports, data files, preserving folders)
      if (Array.isArray(workspaceFiles)) {
        for (const file of workspaceFiles.slice(0, 300)) {
          if (file && (file.path || file.name) && typeof file.content === 'string') {
            if (Buffer.byteLength(file.content, 'utf-8') > MAX_CODE_BYTES) continue;
            const rawRel = typeof file.path === 'string' && file.path.trim() ? file.path : String(file.name);
            const rel = rawRel.replace(/^\/+/, '').replace(/\\/g, '/');
            if (!rel || rel.includes('..') || path.basename(rel) === 'sitecustomize.py') continue;
            const safePath = path.resolve(tempDir, rel);
            if (!safePath.startsWith(tempDir + path.sep)) continue;
            fs.mkdirSync(path.dirname(safePath), { recursive: true });
            // Also heal python workspace files if they end in .py
            const fileContent = safePath.endsWith('.py')
              ? autoHealPythonIndentation(file.content).code
              : file.content;
            fs.writeFileSync(safePath, fileContent, 'utf-8');
          }
        }
      }

      // Write sitecustomize.py to support matplotlib.pyplot.show() headless image streaming
      const sitecustomizeCode = `import sys
try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import io, base64

    def _compillo_show(*args, **kwargs):
        try:
            fig = plt.gcf()
            if fig is not None:
                buf = io.BytesIO()
                fig.savefig(buf, format='png', bbox_inches='tight', dpi=100)
                b64 = base64.b64encode(buf.getvalue()).decode('ascii')
                sys.stdout.write(f'\\n[COMPILLO_PLOT_IMAGE:data:image/png;base64,{b64}]\\n')
                sys.stdout.flush()
                plt.close(fig)
        except Exception as err:
            sys.stderr.write(f'Plot render note: {err}\\n')

    plt.show = _compillo_show
except Exception:
    pass
`;
      fs.writeFileSync(path.join(tempDir, 'sitecustomize.py'), sitecustomizeCode, 'utf-8');

      // Write primary target script (strictly confined inside tempDir; preserve relative subfolder if available)
      const rawEntryRel =
        typeof req.body?.filePath === 'string' && req.body.filePath.trim()
          ? req.body.filePath.replace(/^\/+/, '').replace(/\\/g, '/')
          : '';
      let scriptPath = path.join(tempDir, safeFilename);
      let scriptCwd = tempDir;
      if (rawEntryRel && !rawEntryRel.includes('..')) {
        const nestedCandidate = path.resolve(tempDir, rawEntryRel);
        if (nestedCandidate.startsWith(tempDir + path.sep)) {
          fs.mkdirSync(path.dirname(nestedCandidate), { recursive: true });
          scriptPath = nestedCandidate;
          scriptCwd = path.dirname(nestedCandidate);
        }
      }
      fs.writeFileSync(scriptPath, healedCode, 'utf-8');

      // Set headers for Server-Sent Events (SSE) / streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const safeWriteEvent = (event: string, data: any) => {
        if (!res.writableEnded && !res.destroyed) {
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        }
      };

      // Spawn unbuffered python3 with headless matplotlib environment
      const pythonBin = getPythonBin();
      const extraPaths = scriptCwd !== tempDir ? `${scriptCwd}${path.delimiter}${tempDir}` : tempDir;
      const currentPythonPath = process.env.PYTHONPATH ? `${extraPaths}${path.delimiter}${process.env.PYTHONPATH}` : extraPaths;
      const child = spawn(pythonBin, ['-u', scriptPath], {
        cwd: scriptCwd,
        env: {
          ...process.env,
          PATH: `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${process.env.PATH || ''}`,
          PYTHONUNBUFFERED: '1',
          PYTHONDONTWRITEBYTECODE: '1',
          PYTHONIOENCODING: 'utf-8',
          MATPLOTLIBRC: '/etc/matplotlibrc',
          MPLBACKEND: 'Agg',
          PYTHONPATH: currentPythonPath,
        },
      });

      child.stdin.on('error', () => {
        // Prevent EPIPE crash if process exits while client writes stdin
      });

      let totalOutputBytes = 0;
      let truncated = false;
      let isClosed = false;
      let idleTimer: NodeJS.Timeout | null = null;
      let maxTimer: NodeJS.Timeout | null = null;

      const clearTimers = () => {
        if (idleTimer) {
          clearTimeout(idleTimer);
          idleTimer = null;
        }
        if (maxTimer) {
          clearTimeout(maxTimer);
          maxTimer = null;
        }
      };

      const resetIdleTimer = () => {
        if (isClosed) return;
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          if (isClosed) return;
          safeWriteEvent('stderr', {
            text: `\n⏱ [Safety Timeout] Python execution stopped after ${PYTHON_IDLE_TIMEOUT_MS / 1000}s of inactivity. If you are running a web server, use Launch App / "serve" or click Run on the server file.\n`,
          });
          try {
            child.kill('SIGKILL');
          } catch {
            // ignore
          }
        }, PYTHON_IDLE_TIMEOUT_MS);
      };

      const session: PythonSession = {
        id: sessionId,
        process: child,
        tempDir,
        createdAt: Date.now(),
        resetIdleTimer,
      };
      activeSessions.set(sessionId, session);

      // Send initial session start event
      safeWriteEvent('start', { sessionId, filename: safeFilename });

      // Notify user if indentation was automatically fixed
      if (wasFixed) {
        safeWriteEvent('stdout', {
          text: `💡 [Indentation Auto-Heal] ${reason || 'Corrected unexpected indentation on line 1'}\n`,
        });
      }

      resetIdleTimer();
      maxTimer = setTimeout(() => {
        if (isClosed) return;
        safeWriteEvent('stderr', {
          text: `\n⏱ [Safety Timeout] Python script reached maximum runtime limit (${PYTHON_MAX_RUNTIME_MS / 1000}s) and was stopped.\n`,
        });
        try {
          child.kill('SIGKILL');
        } catch {
          // ignore
        }
      }, PYTHON_MAX_RUNTIME_MS);

      child.stdout.on('data', (data: Buffer) => {
        if (truncated) return;
        resetIdleTimer();
        totalOutputBytes += data.length;
        if (totalOutputBytes > MAX_OUTPUT_BYTES) {
          truncated = true;
          safeWriteEvent('stderr', {
            text: '\n🛑 [Output Limit] Output exceeded 512 KB safety cap; process terminated.\n',
          });
          try {
            child.kill('SIGKILL');
          } catch {
            // ignore
          }
          return;
        }
        safeWriteEvent('stdout', { text: data.toString('utf-8') });
      });

      child.stderr.on('data', (data: Buffer) => {
        if (truncated) return;
        resetIdleTimer();
        totalOutputBytes += data.length;
        if (totalOutputBytes > MAX_OUTPUT_BYTES) {
          truncated = true;
          try {
            child.kill('SIGKILL');
          } catch {
            // ignore
          }
          return;
        }
        safeWriteEvent('stderr', { text: data.toString('utf-8') });
      });

      child.on('error', (err: any) => {
        const isNotFound = err.code === 'ENOENT';
        const errorMsg = isNotFound
          ? `Could not find Python binary at '${pythonBin}'. Please check system PATH or restart the session.`
          : err.message;
        safeWriteEvent('error', { error: errorMsg, code: err.code || 'ERROR', binaryNotFound: isNotFound });
      });

      child.on('close', (code, signal) => {
        isClosed = true;
        clearTimers();
        safeWriteEvent('exit', { code, signal });
        if (!res.writableEnded && !res.destroyed) {
          res.end();
        }

        // Cleanup temp files
        activeSessions.delete(sessionId);
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
          // ignore
        }
      });

      res.on('close', () => {
        clearTimers();
        if (!isClosed && activeSessions.has(sessionId)) {
          try {
            child.kill('SIGKILL');
            fs.rmSync(tempDir, { recursive: true, force: true });
          } catch {
            // ignore
          }
          activeSessions.delete(sessionId);
        }
      });
    } catch (err: any) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || 'Failed to start Python process' });
      } else if (!res.writableEnded && !res.destroyed) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
    }
  });

  // Send interactive input to a running Python process (e.g. answering input() calls)
  app.post('/api/python/stdin', (req, res) => {
    const { sessionId, input = '' } = req.body;
    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    const session = activeSessions.get(sessionId);
    if (!session || !session.process || session.process.killed) {
      res.status(404).json({ error: 'Active session not found or already terminated' });
      return;
    }

    try {
      session.resetIdleTimer?.();
      const text = input.endsWith('\n') ? input : input + '\n';
      session.process.stdin.write(text, 'utf-8', (err) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json({ success: true });
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to write to stdin' });
    }
  });

  // Terminate a running Python process (Ctrl+C / Kill)
  app.post('/api/python/kill', (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      res.json({ success: true, message: 'Session already terminated' });
      return;
    }

    try {
      session.process.kill('SIGINT');
      setTimeout(() => {
        if (!session.process.killed) {
          session.process.kill('SIGKILL');
        }
      }, 500);

      activeSessions.delete(sessionId);
      try {
        fs.rmSync(session.tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to terminate process' });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Final Express error middleware (prevents malformed JSON or route errors from crashing server)
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Express Safety Middleware]', err?.message || err);
    if (!res.headersSent) {
      const status = typeof err?.status === 'number' ? err.status : 500;
      res.status(status).json({ error: status === 400 ? 'Malformed request payload' : 'Internal server error' });
    }
  });

  const startListening = (retriesLeft = 3) => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Compillo Studio Server running on http://0.0.0.0:${PORT}`);
    });
    attachCollabWebSocket(server);

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && retriesLeft > 0) {
        console.warn(`Port ${PORT} is in use, retrying in 1s... (${retriesLeft} retries left)`);
        setTimeout(() => startListening(retriesLeft - 1), 1000);
      } else {
        console.error('Server listen error:', err);
        process.exit(1);
      }
    });

    const shutdown = () => {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 500);
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  };

  startListening();
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
