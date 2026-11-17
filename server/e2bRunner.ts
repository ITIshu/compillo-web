import { Sandbox } from 'e2b';
import { randomUUID } from 'crypto';

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const sessions = new Map<string, { sandbox: any; cwd: string; touchedAt: number }>();
const projectSandboxes = new Map<string, { sandbox: any; touchedAt: number }>();

export function isE2BConfigured() {
  return Boolean(process.env.E2B_API_KEY);
}

export async function createIsolatedSandbox() {
  if (!isE2BConfigured()) throw new Error('E2B_API_KEY is not configured on this service.');
  if (sessions.size + projectSandboxes.size >= 25) {
    throw new Error('Too many active isolated runner sandboxes. Try again after an existing sandbox expires.');
  }
  return Sandbox.create({ timeoutMs: DEFAULT_TIMEOUT_MS });
}

export async function createIsolatedProjectSandbox() {
  const sandbox = await createIsolatedSandbox();
  const id = randomUUID();
  projectSandboxes.set(id, { sandbox, touchedAt: Date.now() });
  return sandbox;
}

export async function killIsolatedSandbox(sandbox: any) {
  for (const [id, entry] of projectSandboxes) {
    if (entry.sandbox === sandbox) projectSandboxes.delete(id);
  }
  await sandbox.kill().catch(() => undefined);
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
  for (const [id, entry] of projectSandboxes) {
    if (entry.touchedAt < cutoff) {
      projectSandboxes.delete(id);
      void entry.sandbox.kill().catch(() => undefined);
    }
  }
}

setInterval(pruneIsolatedSessions, 10 * 60 * 1000).unref();
