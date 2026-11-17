import { Sandbox } from 'e2b';

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const sessions = new Map<string, { sandbox: any; cwd: string; touchedAt: number }>();

export function isE2BConfigured() {
  return Boolean(process.env.E2B_API_KEY);
}

export async function createIsolatedSandbox() {
  if (!isE2BConfigured()) throw new Error('E2B_API_KEY is not configured on this service.');
  return Sandbox.create({ timeoutMs: DEFAULT_TIMEOUT_MS });
}

export async function getOrCreateIsolatedSession(id: string) {
  let session = sessions.get(id);
  if (!session) {
    if (sessions.size >= 25) throw new Error('Too many active isolated runner sessions. Try again after an existing session expires.');
    session = { sandbox: await createIsolatedSandbox(), cwd: '/home/user', touchedAt: Date.now() };
    sessions.set(id, session);
  }
  session.touchedAt = Date.now();
  return session;
}

export async function writeSandboxFile(sandbox: any, filePath: string, content: string) {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.split('/').some((part) => part === '..')) return;
  const parent = `/home/user/${normalized.split('/').slice(0, -1).join('/')}`;
  if (parent !== '/home/user') await sandbox.commands.run(`mkdir -p ${JSON.stringify(parent)}`);
  await sandbox.files.write(`/home/user/${normalized}`, content);
}

export async function runSandboxCommand(sandbox: any, command: string, options: Record<string, unknown> = {}) {
  return sandbox.commands.run(command, {
    cwd: '/home/user',
    timeoutMs: 15_000,
    ...options,
  });
}

export function removeIsolatedSession(id: string) {
  const session = sessions.get(id);
  if (!session) return false;
  sessions.delete(id);
  void session.sandbox.kill().catch(() => undefined);
  return true;
}

export function pruneIsolatedSessions() {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, session] of sessions) {
    if (session.touchedAt < cutoff) removeIsolatedSession(id);
  }
}

setInterval(pruneIsolatedSessions, 10 * 60 * 1000).unref();
