import { FileNode } from '../types';

export type RevisionSource = 'save' | 'manual' | 'pre-replace' | 'format' | 'restore';

export interface FileRevision {
  id: string;
  fileId: string;
  filePath: string;
  fileName: string;
  content: string;
  timestamp: string;
  source: RevisionSource;
  label: string;
}

const STORAGE_KEY = 'compillo_file_revisions_v1';
const MAX_REVISIONS_PER_FILE = 20;

function readStore(): Record<string, FileRevision[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, FileRevision[]>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn('Could not persist file revisions:', err);
  }
}

function resolveKey(fileId: string, filePath?: string): string {
  return filePath || fileId;
}

export function recordRevision(
  file: Pick<FileNode, 'id' | 'name' | 'path' | 'content'>,
  source: RevisionSource,
  label?: string
): FileRevision | null {
  if (!file || typeof file.content !== 'string') return null;

  const store = readStore();
  const key = resolveKey(file.id, file.path);
  const existing = store[key] || [];

  // Deduplicate if newest snapshot already matches exact content and isn't a forced manual checkpoint
  if (source !== 'manual' && existing.length > 0 && existing[0].content === file.content) {
    return existing[0];
  }

  const defaultLabels: Record<RevisionSource, string> = {
    save: 'Saved Snapshot',
    manual: 'Manual Checkpoint',
    'pre-replace': 'Before Workspace Replace',
    format: 'Before Prettier Format',
    restore: 'Before Restore',
  };

  const entry: FileRevision = {
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fileId: file.id,
    filePath: file.path,
    fileName: file.name,
    content: file.content,
    timestamp: new Date().toISOString(),
    source,
    label: label || defaultLabels[source],
  };

  store[key] = [entry, ...existing].slice(0, MAX_REVISIONS_PER_FILE);
  writeStore(store);
  return entry;
}

export function getRevisions(fileId: string, filePath?: string): FileRevision[] {
  const store = readStore();
  if (filePath && Array.isArray(store[filePath])) {
    return store[filePath];
  }
  if (Array.isArray(store[fileId])) {
    return store[fileId];
  }
  return [];
}

export function clearRevisions(fileId: string, filePath?: string): void {
  const store = readStore();
  if (filePath) delete store[filePath];
  delete store[fileId];
  writeStore(store);
}

export function formatRevisionTime(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const sec = Math.max(0, Math.floor(diffMs / 1000));
    if (sec < 10) return 'Just now';
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return 'Earlier';
  }
}
