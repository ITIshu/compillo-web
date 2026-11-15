import { DiagnosticItem, FileNode } from './index';

export interface Disposable {
  dispose: () => void;
}

export interface StatusBarItemRef {
  id: string;
  text: string;
  tooltip?: string;
  command?: string;
  alignment?: 'left' | 'right';
  priority?: number;
  update: (text: string, tooltip?: string) => void;
  dispose: () => void;
}

export interface PluginContext {
  pluginId: string;
  editor: {
    getActiveContent: () => string;
    setActiveContent: (content: string) => void;
    getActiveFile: () => FileNode | null;
    insertText: (text: string) => void;
    formatDocument: () => void;
    onContentChange: (listener: (content: string, file: FileNode) => void) => Disposable;
    onDidSave: (listener: (file: FileNode) => void) => Disposable;
  };
  commands: {
    registerCommand: (id: string, callback: (...args: any[]) => any) => Disposable;
    executeCommand: (id: string, ...args: any[]) => Promise<any>;
  };
  statusBar: {
    createItem: (
      id: string,
      config: { text: string; tooltip?: string; command?: string; alignment?: 'left' | 'right'; priority?: number }
    ) => StatusBarItemRef;
  };
  output: {
    appendLine: (channel: string, message: string, type?: 'log' | 'info' | 'error' | 'success') => void;
    clear: (channel: string) => void;
    showChannel: (channel: string) => void;
  };
  problems: {
    setDiagnostics: (fileId: string, diagnostics: DiagnosticItem[]) => void;
    clearDiagnostics: (fileId: string) => void;
  };
  notifications: {
    show: (message: string, type?: 'info' | 'warning' | 'error', durationMs?: number) => void;
  };
  storage: {
    get: <T>(key: string, defaultValue: T) => T;
    set: <T>(key: string, value: T) => void;
  };
}

export interface PluginCommand {
  id: string;
  title: string;
  category?: string;
  shortcut?: string;
  handler: (...args: any[]) => any;
}

export interface CompilloPlugin {
  id: string;
  name: string;
  displayName: string;
  version: string;
  publisher: string;
  description: string;
  icon?: string;
  category: 'Formatters' | 'Linters' | 'Themes' | 'Tools' | 'AI' | 'Preview';
  enabled: boolean;
  installed: boolean;
  builtIn?: boolean;
  alwaysEssential?: boolean; // Daily-use essentials kept ON across all projects
  defaultEnabled?: boolean; // If false, stays OFF & unloaded until user enables it for a project
  lazyChunk?: boolean; // Dynamically code-split & loaded on-demand via import()
  loaded?: boolean; // True once the chunk module has actually been imported
  estimatedKb?: number; // Estimated lazy chunk footprint saved when disabled
  languages?: string[]; // Language/extension hints for project auto-suggestions (e.g. ['py', 'ts'])
  workspaceFiles?: string[]; // Exact filenames that trigger project suggestion (e.g. ['package.json'])
  authorUrl?: string;
  downloads?: number;
  rating?: number;
  customCode?: string; // If user-created
  activate: (context: PluginContext) => void | Promise<void>;
  deactivate?: () => void;
  contributes?: {
    commands?: PluginCommand[];
    statusBarItems?: Array<{ id: string; text: string; tooltip?: string; command?: string }>;
  };
}

export interface ProjectRecommendation {
  plugin: CompilloPlugin;
  reason: string;
  stackLabel: string;
}

export type VSCodePlugin = CompilloPlugin;
