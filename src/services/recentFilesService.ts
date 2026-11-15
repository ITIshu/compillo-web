export interface RecentFileItem {
  id: string;
  name: string;
  path: string;
  language: string;
  lastOpenedAt: number;
}

const STORAGE_KEY = 'compillo_recent_files_v1';
const MAX_RECENT_FILES = 15;

const listeners = new Set<(items: RecentFileItem[]) => void>();

function notifyListeners(items: RecentFileItem[]) {
  listeners.forEach((listener) => {
    try {
      listener(items);
    } catch (e) {
      console.error('Error in recent files listener:', e);
    }
  });
}

export function getRecentFiles(): RecentFileItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  } catch {
    return [];
  }
}

export function saveRecentFiles(items: RecentFileItem[]): void {
  try {
    const trimmed = items.slice(0, MAX_RECENT_FILES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    notifyListeners(trimmed);
  } catch (e) {
    console.error('Failed to save recent files to storage', e);
  }
}

export function recordRecentFile(file: {
  id: string;
  name: string;
  path: string;
  language?: string;
}): RecentFileItem[] {
  if (!file || !file.id || !file.name) return getRecentFiles();

  const current = getRecentFiles();
  const filtered = current.filter((item) => item.id !== file.id && item.path !== file.path);

  const newItem: RecentFileItem = {
    id: file.id,
    name: file.name,
    path: file.path,
    language: file.language || 'plaintext',
    lastOpenedAt: Date.now(),
  };

  const updated = [newItem, ...filtered].slice(0, MAX_RECENT_FILES);
  saveRecentFiles(updated);
  return updated;
}

export function removeRecentFile(id: string): RecentFileItem[] {
  const current = getRecentFiles();
  const updated = current.filter((item) => item.id !== id);
  saveRecentFiles(updated);
  return updated;
}

export function clearRecentFiles(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    notifyListeners([]);
  } catch (e) {
    console.error('Failed to clear recent files', e);
  }
}

export function subscribeRecentFiles(callback: (items: RecentFileItem[]) => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 45) return 'Just now';
  if (diffSec < 90) return '1m ago';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
