import { DiagnosticItem, FileNode, OutputMessage } from '../types';
import { Disposable, PluginCommand, PluginContext, ProjectRecommendation, StatusBarItemRef, VSCodePlugin } from '../types/plugin';
import { pythonRunner } from './pythonRunner';
import { universalRunner } from './universalRunner';
import { customizationService, ICON_PACKS, SYNTAX_PALETTES } from './customizationService';

type ContentChangeListener = (content: string, file: FileNode) => void;
type SaveListener = (file: FileNode) => void;

const DISABLED_PLUGINS_STORAGE_KEY = 'compillo_disabled_plugins_v1';
const WORKSPACE_PLUGINS_STORAGE_KEY = 'compillo_workspace_plugins_v1';

export class PluginSystemManager {
  private plugins: Map<string, VSCodePlugin> = new Map();
  private commands: Map<string, (...args: any[]) => any> = new Map();
  private statusBarItems: Map<string, StatusBarItemRef> = new Map();
  private pluginDiagnostics: Map<string, Map<string, DiagnosticItem[]>> = new Map(); // pluginId -> (fileId -> diagnostics)
  private pluginDisposables: Map<string, Disposable[]> = new Map();
  private disabledPluginIds: Set<string> = new Set();
  private workspacePluginOverrides: Record<string, Record<string, boolean>> = {};
  private currentWorkspaceKey = 'empty-workspace';
  private detectedStacks: string[] = [];
  private projectRecommendations: ProjectRecommendation[] = [];
  private outputLogs: OutputMessage[] = [
    {
      id: 'log-task-1',
      timestamp: new Date().toLocaleTimeString(),
      channel: 'Tasks',
      text: '> Executing task: npm run dev\n\n  Compillo Dev Server v1.90.0 ready\n  ➜ Local:   http://localhost:3000/\n  ➜ Network: http://127.0.0.1:3000/\n  ➜ ready in 184ms\n  ➜ press h + enter to show help',
      type: 'info',
    },
    {
      id: 'log-task-2',
      timestamp: new Date().toLocaleTimeString(),
      channel: 'Compillo Runtime',
      text: '[Compillo Runtime] Workspace loaded. Environment: Node v20 LTS, TypeScript 5.4.0',
      type: 'success',
    },
  ];
  private contentChangeListeners: Set<ContentChangeListener> = new Set();
  private saveListeners: Set<SaveListener> = new Set();

  private activeFileGetter: () => FileNode | null = () => null;
  private activeContentGetter: () => string = () => '';
  private activeContentSetter: (content: string) => void = () => {};
  private insertTextHandler: (text: string) => void = () => {};
  private formatHandler: () => void = () => {};
  private notificationHandler: (msg: string, type?: 'info' | 'warning' | 'error') => void = () => {};
  private onStateChangeListeners: Set<() => void> = new Set();

  constructor() {
    this.loadDisabledState();
    this.registerBuiltInPlugins();
    const activeCount = this.getPlugins().filter((p) => p.enabled).length;
    const lazyOffCount = this.getPlugins().filter((p) => p.lazyChunk && !p.enabled).length;
    this.outputLogs.push({
      id: 'log-task-3',
      timestamp: new Date().toLocaleTimeString(),
      channel: 'Extension Host',
      text: `[Extension Host] Initialized ${activeCount} core active extensions (${lazyOffCount} specialized language packs kept unloaded until enabled for your project).`,
      type: 'info',
    });
  }

  private loadDisabledState() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(DISABLED_PLUGINS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.disabledPluginIds = new Set(parsed.filter((x) => typeof x === 'string'));
        }
      }
      const wsRaw = localStorage.getItem(WORKSPACE_PLUGINS_STORAGE_KEY);
      if (wsRaw) {
        const parsedWs = JSON.parse(wsRaw);
        if (parsedWs && typeof parsedWs === 'object') {
          this.workspacePluginOverrides = parsedWs;
        }
      }
    } catch {
      // ignore
    }
  }

  private saveDisabledState() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        DISABLED_PLUGINS_STORAGE_KEY,
        JSON.stringify(Array.from(this.disabledPluginIds))
      );
      localStorage.setItem(
        WORKSPACE_PLUGINS_STORAGE_KEY,
        JSON.stringify(this.workspacePluginOverrides)
      );
    } catch {
      // ignore
    }
  }

  private collectAllFilesFlat(nodes: FileNode[]): FileNode[] {
    const out: FileNode[] = [];
    const walk = (list: FileNode[]) => {
      for (const n of list) {
        if (n.type === 'file') out.push(n);
        if (n.children) walk(n.children);
      }
    };
    walk(nodes);
    return out;
  }

  public setWorkspaceFiles(files: FileNode[]) {
    const topNames = files.map((f) => f.name).sort().join('|') || 'empty-workspace';
    const workspaceChanged = topNames !== this.currentWorkspaceKey;
    this.currentWorkspaceKey = topNames;

    const flatFiles = this.collectAllFilesFlat(files);
    const exts = new Set<string>();
    const namesLower = new Set<string>();
    let hasApiCalls = false;

    flatFiles.forEach((f) => {
      const lower = f.name.toLowerCase();
      namesLower.add(lower);
      const ext = lower.includes('.') ? lower.split('.').pop() || '' : '';
      if (ext) exts.add(ext);
      if (f.content && /(\/api\/|fetch\(|axios\.|express\()/.test(f.content)) {
        hasApiCalls = true;
      }
    });

    const stacks: string[] = [];
    const recs: ProjectRecommendation[] = [];
    const addRec = (pluginId: string, reason: string, stackLabel: string) => {
      const plugin = this.plugins.get(pluginId);
      if (plugin && !recs.some((r) => r.plugin.id === pluginId)) {
        recs.push({ plugin, reason, stackLabel });
      }
    };

    if (exts.has('py') || namesLower.has('requirements.txt') || namesLower.has('pyproject.toml')) {
      stacks.push('Python');
      addRec('ms-python.black-formatter', 'Workspace contains Python (.py) files', 'Python');
      addRec('compillo.python-env-pack', 'Scan Python imports & generate docstrings', 'Python');
    }
    if (exts.has('tsx') || exts.has('jsx') || exts.has('html') || exts.has('css') || namesLower.has('package.json')) {
      stacks.push('Web / React');
      addRec('bradlc.vscode-tailwindcss', 'Detected UI/JSX/HTML classes in workspace', 'Web / React');
      addRec('formulahendry.auto-rename-tag', 'Audit HTML/JSX tags & accessibility', 'Web / React');
      if (namesLower.has('package.json')) {
        addRec('compillo.package-dep-inspector', 'Detected package.json manifest', 'Node / NPM');
      }
      if (exts.has('css') || exts.has('scss')) {
        addRec('naumovs.color-highlight', 'Extract CSS palette tokens from stylesheets', 'CSS');
      }
    }
    if (exts.has('sql')) {
      stacks.push('SQL');
      addRec('compillo.sql-schema-studio', 'Detected .sql database query/schema files', 'SQL');
    }
    if (exts.has('json')) {
      addRec('compillo.json-yaml-toolkit', 'Format & sort JSON config/data files', 'JSON');
    }
    if (namesLower.has('.env') || namesLower.has('.env.example') || exts.has('ts') || exts.has('js') || exts.has('py')) {
      addRec('sonarsource.sonarlint-security', 'Scan project code for secrets & XSS/SQL sinks', 'Security');
      if (namesLower.has('.env') || namesLower.has('.env.example')) {
        stacks.push('Env Config');
        addRec('compillo.env-vault-guard', 'Detected .env file — validate & mask keys', 'Security');
      }
    }
    if (hasApiCalls) {
      stacks.push('REST API');
      addRec('humao.rest-client-companion', 'Detected HTTP / /api routes in workspace', 'REST API');
    }
    if (exts.has('md') || exts.has('mmd')) {
      stacks.push('Markdown');
      addRec('compillo.mermaid-diagram-preview', 'Generate Mermaid architecture flowcharts', 'Docs');
      addRec('streetsidesoftware.code-spell-checker', 'Check docs & identifiers for typos', 'Docs');
    }

    this.detectedStacks = stacks;
    this.projectRecommendations = recs;

    if (workspaceChanged) {
      const wsOverrides = this.workspacePluginOverrides[this.currentWorkspaceKey] || {};
      this.plugins.forEach((plugin) => {
        if (!plugin.builtIn || !plugin.lazyChunk || plugin.alwaysEssential) return;
        const desired =
          wsOverrides[plugin.id] !== undefined
            ? wsOverrides[plugin.id]
            : plugin.defaultEnabled !== false;
        if (desired && !plugin.enabled) {
          this.activatePlugin(plugin.id);
        } else if (!desired && plugin.enabled) {
          this.deactivatePlugin(plugin.id);
        }
      });
    }

    this.notify();
  }

  public getRecommendations(): ProjectRecommendation[] {
    return this.projectRecommendations;
  }

  public getDetectedStacks(): string[] {
    return this.detectedStacks;
  }

  public getSpaceStats(): {
    activeCount: number;
    unloadedCount: number;
    savedKb: number;
    activeLazyKb: number;
  } {
    let activeCount = 0;
    let unloadedCount = 0;
    let savedKb = 0;
    let activeLazyKb = 0;
    this.plugins.forEach((p) => {
      const kb = p.estimatedKb || 12;
      if (p.enabled) {
        activeCount++;
        if (p.lazyChunk) activeLazyKb += kb;
      } else if (p.lazyChunk) {
        unloadedCount++;
        savedKb += kb;
      }
    });
    return { activeCount, unloadedCount, savedKb, activeLazyKb };
  }

  public async enableAllRecommended(): Promise<number> {
    let count = 0;
    for (const rec of this.projectRecommendations) {
      if (!rec.plugin.enabled) {
        await this.activatePlugin(rec.plugin.id);
        count++;
      }
    }
    if (count > 0) {
      this.notificationHandler(
        `Loaded ${count} recommended extension(s) for this project.`,
        'info'
      );
    } else {
      this.notificationHandler('All project-recommended extensions are already active.', 'info');
    }
    return count;
  }

  public unloadUnusedSpecialized(): number {
    const recIds = new Set(this.projectRecommendations.map((r) => r.plugin.id));
    let unloaded = 0;
    this.plugins.forEach((p) => {
      if (p.lazyChunk && !p.alwaysEssential && p.enabled && !recIds.has(p.id)) {
        this.deactivatePlugin(p.id);
        unloaded++;
      }
    });
    if (unloaded > 0) {
      this.notificationHandler(
        `Unloaded ${unloaded} unused project extension(s) to free workspace resources.`,
        'info'
      );
    } else {
      this.notificationHandler('No unused specialized extensions are currently loaded.', 'info');
    }
    return unloaded;
  }

  public bindEditor(options: {
    getActiveFile: () => FileNode | null;
    getActiveContent: () => string;
    setActiveContent: (content: string) => void;
    insertText: (text: string) => void;
    formatDocument: () => void;
    showNotification: (msg: string, type?: 'info' | 'warning' | 'error') => void;
  }) {
    this.activeFileGetter = options.getActiveFile;
    this.activeContentGetter = options.getActiveContent;
    this.activeContentSetter = options.setActiveContent;
    this.insertTextHandler = options.insertText;
    this.formatHandler = options.formatDocument;
    this.notificationHandler = options.showNotification;
  }

  public subscribe(listener: () => void): Disposable {
    this.onStateChangeListeners.add(listener);
    return {
      dispose: () => this.onStateChangeListeners.delete(listener),
    };
  }

  private notify() {
    this.onStateChangeListeners.forEach((l) => l());
  }

  public triggerContentChange(content: string, file: FileNode) {
    this.contentChangeListeners.forEach((l) => {
      try {
        l(content, file);
      } catch (e) {
        console.error('Error in content change listener:', e);
      }
    });
  }

  public triggerSave(file: FileNode) {
    this.saveListeners.forEach((l) => {
      try {
        l(file);
      } catch (e) {
        console.error('Error in save listener:', e);
      }
    });
  }

  public getPlugins(): VSCodePlugin[] {
    return Array.from(this.plugins.values());
  }

  public getPlugin(id: string): VSCodePlugin | undefined {
    return this.plugins.get(id);
  }

  public getStatusBarItems(): StatusBarItemRef[] {
    return Array.from(this.statusBarItems.values());
  }

  public getAllDiagnostics(): DiagnosticItem[] {
    const list: DiagnosticItem[] = [];
    this.pluginDiagnostics.forEach((fileMap) => {
      fileMap.forEach((items) => {
        list.push(...items);
      });
    });
    return list;
  }

  public getDiagnosticsForFile(fileId: string): DiagnosticItem[] {
    const list: DiagnosticItem[] = [];
    this.pluginDiagnostics.forEach((fileMap) => {
      const items = fileMap.get(fileId);
      if (items) list.push(...items);
    });
    return list;
  }

  public setFileDiagnostics(fileId: string, diags: DiagnosticItem[], sourcePluginId = 'runtime'): void {
    let map = this.pluginDiagnostics.get(sourcePluginId);
    if (!map) {
      map = new Map();
      this.pluginDiagnostics.set(sourcePluginId, map);
    }
    map.set(fileId, diags);
    this.notify();
  }

  public clearFileDiagnostics(fileId: string, sourcePluginId?: string): void {
    if (sourcePluginId) {
      this.pluginDiagnostics.get(sourcePluginId)?.delete(fileId);
    } else {
      this.pluginDiagnostics.forEach((map) => map.delete(fileId));
    }
    this.notify();
  }

  public getOutputLogs(channel?: string): OutputMessage[] {
    if (!channel || channel === 'All') return this.outputLogs;
    return this.outputLogs.filter((log) => log.channel === channel);
  }

  public appendOutputLog(
    channel: string,
    message: string,
    type: 'log' | 'info' | 'error' | 'success' = 'log'
  ) {
    const timestamp = new Date().toLocaleTimeString();
    this.outputLogs.push({
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      timestamp,
      channel,
      text: message,
      type,
    });
    this.notify();
  }

  public clearOutputLogs(channel?: string) {
    if (!channel || channel === 'All') {
      this.outputLogs = [];
    } else {
      this.outputLogs = this.outputLogs.filter((log) => log.channel !== channel);
    }
    this.notify();
  }

  public async executeCommand(id: string, ...args: any[]): Promise<any> {
    let handler = this.commands.get(id);

    // Zero-friction on-demand loading: if the command belongs to an unloaded/disabled extension, load it now!
    if (!handler) {
      let ownerPlugin: VSCodePlugin | undefined;
      for (const plugin of this.plugins.values()) {
        if (plugin.contributes?.commands?.some((c) => c.id === id)) {
          ownerPlugin = plugin;
          break;
        }
      }

      if (ownerPlugin) {
        await this.activatePlugin(ownerPlugin.id);
        handler = this.commands.get(id);
      }
    }

    if (!handler) {
      this.notificationHandler(`Command not found: ${id}`, 'warning');
      return undefined;
    }

    try {
      const result = await handler(...args);

      // Automatically reveal Output > Tasks for inspection/generator commands
      const outputCommands = new Set([
        'mermaid.generateFlowchart',
        'restClient.extractUrls',
        'regex.inspectFile',
        'sql.inspectSchema',
        'deps.auditPackageJson',
        'envGuard.generateExample',
        'python.extractRequirements',
        'colorizer.extractPalette',
        'metrics.analyzeFile',
        'gitlens.showBlameSummary',
        'todo.listAll',
      ]);
      if (outputCommands.has(id) && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('compillo:open-output-tasks'));
      }

      return result;
    } catch (e: any) {
      console.error(`Error running command ${id}:`, e);
      this.notificationHandler(`Error in command "${id}": ${e?.message || e}`, 'error');
    }
  }

  public getCommands(): Array<{ id: string; title: string; category?: string }> {
    const list: Array<{ id: string; title: string; category?: string }> = [];
    this.plugins.forEach((p) => {
      if (p.enabled && p.contributes?.commands) {
        p.contributes.commands.forEach((c) => {
          list.push({
            id: c.id,
            title: c.title,
            category: c.category || p.displayName,
          });
        });
      }
    });
    return list;
  }

  public getAllCatalogCommands(): Array<{
    id: string;
    title: string;
    category?: string;
    shortcut?: string;
    loaded: boolean;
  }> {
    const list: Array<{
      id: string;
      title: string;
      category?: string;
      shortcut?: string;
      loaded: boolean;
    }> = [];
    this.plugins.forEach((p) => {
      if (p.contributes?.commands) {
        p.contributes.commands.forEach((c) => {
          list.push({
            id: c.id,
            title: c.title,
            category: p.enabled ? c.category || p.displayName : `${p.displayName} (Auto-Load)`,
            shortcut: c.shortcut,
            loaded: p.enabled,
          });
        });
      }
    });
    return list;
  }

  private trackDisposable(pluginId: string, d: Disposable) {
    const arr = this.pluginDisposables.get(pluginId) || [];
    arr.push(d);
    this.pluginDisposables.set(pluginId, arr);
    return d;
  }

  private createContext(pluginId: string): PluginContext {
    return {
      pluginId,
      editor: {
        getActiveContent: () => this.activeContentGetter(),
        setActiveContent: (content: string) => this.activeContentSetter(content),
        getActiveFile: () => this.activeFileGetter(),
        insertText: (text: string) => this.insertTextHandler(text),
        formatDocument: () => this.formatHandler(),
        onContentChange: (listener: ContentChangeListener) => {
          this.contentChangeListeners.add(listener);
          return this.trackDisposable(pluginId, {
            dispose: () => this.contentChangeListeners.delete(listener),
          });
        },
        onDidSave: (listener: SaveListener) => {
          this.saveListeners.add(listener);
          return this.trackDisposable(pluginId, {
            dispose: () => this.saveListeners.delete(listener),
          });
        },
      },
      commands: {
        registerCommand: (id: string, callback: (...args: any[]) => any): Disposable => {
          this.commands.set(id, callback);
          return this.trackDisposable(pluginId, {
            dispose: () => this.commands.delete(id),
          });
        },
        executeCommand: (id: string, ...args: any[]) => this.executeCommand(id, ...args),
      },
      statusBar: {
        createItem: (
          id: string,
          config: {
            text: string;
            tooltip?: string;
            command?: string;
            alignment?: 'left' | 'right';
            priority?: number;
          }
        ): StatusBarItemRef => {
          const itemRef: StatusBarItemRef = {
            id,
            text: config.text,
            tooltip: config.tooltip,
            command: config.command,
            alignment: config.alignment || 'right',
            priority: config.priority || 10,
            update: (text: string, tooltip?: string) => {
              itemRef.text = text;
              if (tooltip !== undefined) itemRef.tooltip = tooltip;
              this.notify();
            },
            dispose: () => {
              this.statusBarItems.delete(id);
              this.notify();
            },
          };
          this.statusBarItems.set(id, itemRef);
          this.trackDisposable(pluginId, {
            dispose: () => this.statusBarItems.delete(id),
          });
          this.notify();
          return itemRef;
        },
      },
      output: {
        appendLine: (channel: string, message: string, type: 'log' | 'info' | 'error' | 'success' = 'log') => {
          const timestamp = new Date().toLocaleTimeString();
          this.outputLogs.push({
            id: 'log-' + Math.random().toString(36).substring(2, 9),
            timestamp,
            channel,
            text: message,
            type,
          });
          this.notify();
        },
        clear: (channel: string) => {
          this.clearOutputLogs(channel);
        },
        showChannel: (_channel: string) => {
          // Handled in bottom panel
        },
      },
      problems: {
        setDiagnostics: (fileId: string, diags: DiagnosticItem[]) => {
          this.setFileDiagnostics(fileId, diags, pluginId);
        },
        clearDiagnostics: (fileId: string) => {
          this.clearFileDiagnostics(fileId, pluginId);
        },
      },
      notifications: {
        show: (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
          this.notificationHandler(message, type);
        },
      },
      storage: {
        get: <T>(key: string, defaultValue: T): T => {
          try {
            const raw = localStorage.getItem(`plugin_${pluginId}_${key}`);
            return raw ? JSON.parse(raw) : defaultValue;
          } catch {
            return defaultValue;
          }
        },
        set: <T>(key: string, value: T): void => {
          try {
            localStorage.setItem(`plugin_${pluginId}_${key}`, JSON.stringify(value));
          } catch (e) {
            console.error(e);
          }
        },
      },
    };
  }

  public async activatePlugin(id: string) {
    const plugin = this.plugins.get(id);
    if (!plugin) return;

    try {
      // Clear any leftover disposables first
      const oldDisposables = this.pluginDisposables.get(id) || [];
      oldDisposables.forEach((d) => d.dispose());
      this.pluginDisposables.set(id, []);

      const context = this.createContext(id);
      await plugin.activate(context);
      plugin.enabled = true;
      plugin.loaded = true;
      if (plugin.lazyChunk) {
        if (!this.workspacePluginOverrides[this.currentWorkspaceKey]) {
          this.workspacePluginOverrides[this.currentWorkspaceKey] = {};
        }
        this.workspacePluginOverrides[this.currentWorkspaceKey][id] = true;
      } else {
        this.disabledPluginIds.delete(id);
      }
      this.saveDisabledState();
      this.notify();
    } catch (e: any) {
      console.error(`Failed to activate plugin ${id}:`, e);
      this.notificationHandler(`Failed to activate ${plugin.displayName}: ${e?.message || e}`, 'error');
    }
  }

  public deactivatePlugin(id: string) {
    const plugin = this.plugins.get(id);
    if (!plugin || !plugin.enabled) return;

    try {
      if (plugin.deactivate) {
        plugin.deactivate();
      }
      const disposables = this.pluginDisposables.get(id) || [];
      disposables.forEach((d) => {
        try {
          d.dispose();
        } catch {
          // ignore
        }
      });
      this.pluginDisposables.delete(id);
      this.pluginDiagnostics.delete(id);
      plugin.enabled = false;
      if (plugin.lazyChunk) {
        plugin.loaded = false;
        if (!this.workspacePluginOverrides[this.currentWorkspaceKey]) {
          this.workspacePluginOverrides[this.currentWorkspaceKey] = {};
        }
        this.workspacePluginOverrides[this.currentWorkspaceKey][id] = false;
      } else {
        this.disabledPluginIds.add(id);
      }
      this.saveDisabledState();
      this.notify();
    } catch (e: any) {
      console.error(`Failed to deactivate plugin ${id}:`, e);
    }
  }

  public togglePlugin(id: string) {
    const plugin = this.plugins.get(id);
    if (!plugin) return;
    if (plugin.enabled) {
      this.deactivatePlugin(id);
    } else {
      this.activatePlugin(id);
    }
  }

  public registerPlugin(plugin: VSCodePlugin) {
    if (plugin.builtIn) {
      if (plugin.lazyChunk) {
        const wsOverrides = this.workspacePluginOverrides[this.currentWorkspaceKey] || {};
        plugin.enabled =
          wsOverrides[plugin.id] !== undefined
            ? wsOverrides[plugin.id]
            : plugin.defaultEnabled !== false;
        plugin.loaded = false;
      } else if (this.disabledPluginIds.has(plugin.id)) {
        plugin.enabled = false;
      }
    }
    this.plugins.set(plugin.id, plugin);
    if (plugin.enabled) {
      this.activatePlugin(plugin.id);
    }
    this.notify();
  }

  public unregisterPlugin(id: string) {
    this.deactivatePlugin(id);
    this.plugins.delete(id);
    this.notify();
  }

  // Register Built-in Essential Extensions
  private registerBuiltInPlugins() {
    // 1. Prettier Code Formatter Plugin
    const prettierPlugin: VSCodePlugin = {
      id: 'esbenp.prettier-compillo',
      name: 'prettier',
      displayName: 'Prettier - Code Formatter',
      version: '10.4.0',
      publisher: 'Prettier',
      description: 'Opinionated code formatter for JS, TS, JSON, CSS, HTML, and Markdown.',
      category: 'Formatters',
      enabled: true,
      installed: true,
      builtIn: true,
      downloads: 48200000,
      rating: 4.8,
      activate: (context) => {
        context.output.appendLine('Prettier', 'Prettier formatter loaded and ready.');

        context.commands.registerCommand('editor.formatDocument', async () => {
          const file = context.editor.getActiveFile();
          if (!file) return;
          const content = context.editor.getActiveContent();

          try {
            let formatted = content;
            if (file.language === 'json') {
              formatted = JSON.stringify(JSON.parse(content), null, 2);
            } else if (file.language === 'javascript' || file.language === 'typescript') {
              formatted = simpleFormatJS(content);
            } else if (file.language === 'css') {
              formatted = simpleFormatCSS(content);
            } else if (file.language === 'python') {
              const pyMod = await import('./extensions/pythonPack');
              formatted = pyMod.formatPythonPep8(content);
            }

            if (formatted !== content) {
              context.editor.setActiveContent(formatted);
              context.output.appendLine('Prettier', `Formatted ${file.name} successfully.`, 'success');
              context.notifications.show(`Document formatted with Prettier`, 'info');
            } else {
              context.output.appendLine('Prettier', `No formatting changes needed for ${file.name}.`);
            }
          } catch (e: any) {
            context.output.appendLine('Prettier', `Format error in ${file.name}: ${e?.message}`, 'error');
            context.notifications.show(`Prettier format error: ${e?.message}`, 'error');
          }
        });

        context.statusBar.createItem('prettier-status', {
          text: 'Prettier ✓',
          tooltip: 'Document Formatter: Prettier Active. Click to Format Document.',
          command: 'editor.formatDocument',
          alignment: 'right',
        });
      },
      contributes: {
        commands: [
          {
            id: 'editor.formatDocument',
            title: 'Format Document',
            category: 'Format',
            shortcut: 'Shift+Alt+F',
            handler: () => {},
          },
        ],
      },
    };

    // 2. ESLint & TypeScript Linter Plugin
    const eslintPlugin: VSCodePlugin = {
      id: 'dbaeumer.compillo-eslint',
      name: 'eslint',
      displayName: 'ESLint & TypeScript Linter',
      version: '3.0.10',
      publisher: 'Microsoft',
      description: 'Integrates ESLint into the editor. Analyzes syntax, unused statements, and code health.',
      category: 'Linters',
      enabled: true,
      installed: true,
      builtIn: true,
      downloads: 32000000,
      rating: 4.7,
      activate: (context) => {
        context.output.appendLine('ESLint', 'ESLint server initialized.');

        const runLint = (content: string, file: FileNode) => {
          if (!file) return;
          const diags: DiagnosticItem[] = [];

          if (file.language === 'json') {
            try {
              JSON.parse(content);
            } catch (err: any) {
              const match = err.message.match(/at position (\d+)/);
              let line = 1;
              let col = 1;
              if (match) {
                const pos = parseInt(match[1], 10);
                const before = content.slice(0, pos);
                const lines = before.split('\n');
                line = lines.length;
                col = lines[lines.length - 1].length + 1;
              }
              diags.push({
                id: 'json-err-' + file.id,
                fileId: file.id,
                filePath: file.path,
                fileName: file.name,
                line,
                column: col,
                message: `JSON Syntax Error: ${err.message}`,
                severity: 'error',
                source: 'eslint:json',
              });
            }
          } else if (file.language === 'javascript' || file.language === 'typescript') {
            const lines = content.split('\n');
            lines.forEach((lineText, idx) => {
              const lineNum = idx + 1;
              if (/\bdebugger\b/.test(lineText)) {
                diags.push({
                  id: `eslint-dbg-${file.id}-${lineNum}`,
                  fileId: file.id,
                  filePath: file.path,
                  fileName: file.name,
                  line: lineNum,
                  column: lineText.indexOf('debugger') + 1,
                  message: 'Unexpected "debugger" statement (no-debugger)',
                  severity: 'warning',
                  source: 'eslint',
                });
              }
              if (/\bconsole\.log\(/.test(lineText)) {
                diags.push({
                  id: `eslint-log-${file.id}-${lineNum}`,
                  fileId: file.id,
                  filePath: file.path,
                  fileName: file.name,
                  line: lineNum,
                  column: lineText.indexOf('console.log') + 1,
                  message: 'Unexpected console statement (no-console)',
                  severity: 'info',
                  source: 'eslint',
                });
              }
              const openBraces = (lineText.match(/\{/g) || []).length;
              if (lineText.trim().startsWith('function') && openBraces === 0 && !lineText.includes(';')) {
                diags.push({
                  id: `eslint-brace-${file.id}-${lineNum}`,
                  fileId: file.id,
                  filePath: file.path,
                  fileName: file.name,
                  line: lineNum,
                  column: lineText.length,
                  message: 'Missing block opening curly brace "{"',
                  severity: 'error',
                  source: 'typescript',
                });
              }
            });
          }

          context.problems.setDiagnostics(file.id, diags);
        };

        context.commands.registerCommand('eslint.restart', () => {
          const cur = context.editor.getActiveFile();
          if (cur) runLint(cur.content || '', cur);
          context.notifications.show('ESLint language server re-analyzed active file.', 'info');
        });

        context.editor.onContentChange((content, file) => runLint(content, file));

        const curFile = context.editor.getActiveFile();
        if (curFile) runLint(curFile.content || '', curFile);
      },
      contributes: {
        commands: [
          {
            id: 'eslint.restart',
            title: 'ESLint: Re-run Diagnostics',
            category: 'ESLint',
            handler: () => {},
          },
        ],
      },
    };

    // 3. Code Runner Plugin
    const codeRunnerPlugin: VSCodePlugin = {
      id: 'formulahendry.code-runner',
      name: 'code-runner',
      displayName: 'Code Runner',
      version: '0.12.2',
      publisher: 'Jun Han',
      description: 'Run code snippets across 15 languages (Python, C++, C, Java, TS, JS, Rust, Go, SQL, Bash, HTML, CSS, JSON, Markdown) for free.',
      category: 'Tools',
      enabled: true,
      installed: true,
      builtIn: true,
      downloads: 24000000,
      rating: 4.9,
      activate: (context) => {
        context.commands.registerCommand('code-runner.run', async () => {
          const file = context.editor.getActiveFile();
          if (!file) {
            context.notifications.show('No active file to run!', 'warning');
            return;
          }

          context.output.clear('Code Runner');
          context.output.appendLine('Code Runner', `[Running] Executing "${file.name}" (${file.language.toUpperCase()})...`);
          context.notifications.show(`Running ${file.name} in Free Code Runner...`, 'info');

          try {
            await universalRunner.runFile(file);
            context.output.appendLine('Code Runner', `[Free Runner] Execution active in Runner panel.`);
          } catch (err: any) {
            context.output.appendLine('Code Runner', `[Error] ${err?.message || err}`, 'error');
            context.notifications.show(`Code Runner Error: ${err?.message || err}`, 'error');
          }
        });
      },
      contributes: {
        commands: [
          {
            id: 'code-runner.run',
            title: 'Run Code',
            category: 'Run',
            shortcut: 'Ctrl+Alt+N',
            handler: () => {},
          },
        ],
      },
    };

    // 4. Todo & Action Item Highlighter
    const todoPlugin: VSCodePlugin = {
      id: 'wayou.compillo-todo-highlight',
      name: 'todo-highlight',
      displayName: 'Todo & Action Item Highlighter',
      version: '2.1.0',
      publisher: 'Wayou Liu',
      description: 'Highlight and index TODO:, FIXME:, NOTE:, BUG: annotations across your project files.',
      category: 'Tools',
      enabled: true,
      installed: true,
      builtIn: true,
      downloads: 8500000,
      rating: 4.8,
      activate: (context) => {
        context.commands.registerCommand('todo.listAll', () => {
          const file = context.editor.getActiveFile();
          if (!file) return;
          const content = context.editor.getActiveContent();
          const lines = content.split('\n');
          const todos: string[] = [];

          lines.forEach((l, i) => {
            if (/(\/\/|#|\/\*)\s*(TODO|FIXME|NOTE|BUG):?/i.test(l)) {
              todos.push(`Line ${i + 1}: ${l.trim()}`);
            }
          });

          context.output.clear('Tasks');
          context.output.appendLine('Tasks', `TODO Scan for ${file.name}: ${todos.length} items found`);
          todos.forEach((t) => context.output.appendLine('Tasks', t, 'info'));
          context.notifications.show(`Found ${todos.length} TODO/FIXME items in ${file.name}`, 'info');
        });
      },
      contributes: {
        commands: [
          {
            id: 'todo.listAll',
            title: 'TODO: List All Comments in File',
            category: 'Todo',
            handler: () => {},
          },
        ],
      },
    };

    // 5. GitLens Mini
    const gitLensPlugin: VSCodePlugin = {
      id: 'eamodio.gitlens',
      name: 'gitlens',
      displayName: 'GitLens — Git Supercharged',
      version: '15.0.0',
      publisher: 'GitKraken',
      description: 'Supercharge Git inside Compillo Studio: branch status, commit history, and visual diffs.',
      category: 'Tools',
      enabled: true,
      installed: true,
      builtIn: true,
      downloads: 38000000,
      rating: 4.9,
      activate: (context) => {
        context.statusBar.createItem('gitlens-branch', {
          text: '$(git-branch) main*',
          tooltip: 'GitLens: main branch active',
          command: 'git.status',
          alignment: 'left',
          priority: 100,
        });
      },
    };

    // 6. Markdown Preview Enhanced
    const markdownPreviewPlugin: VSCodePlugin = {
      id: 'shd101wyy.markdown-preview-enhanced',
      name: 'markdown-preview',
      displayName: 'Markdown Preview Enhanced',
      version: '0.8.12',
      publisher: 'Yiyi Wang',
      description: 'Markdown preview with live side-by-side rendering, math types, and GitHub style.',
      category: 'Preview',
      enabled: true,
      installed: true,
      builtIn: true,
      downloads: 6200000,
      rating: 4.8,
      activate: (context) => {
        context.commands.registerCommand('markdown.showPreviewToSide', () => {
          context.notifications.show('Use the Markdown Split Preview button on Markdown files to preview side-by-side.', 'info');
        });
      },
    };

    // 7. Error Lens (Live Inline Health & Anti-Patterns)
    const errorLensPlugin: VSCodePlugin = {
      id: 'usernamehw.errorlens',
      name: 'errorlens',
      displayName: 'Error Lens',
      version: '3.20.0',
      publisher: 'Alexander',
      description: 'Highlights strict-equality mistakes, empty catch blocks, eval() usage, and long lines inline in Problems & Status Bar.',
      category: 'Linters',
      enabled: true,
      installed: true,
      builtIn: true,
      downloads: 12400000,
      rating: 4.9,
      activate: (context) => {
        const badge = context.statusBar.createItem('errorlens-summary', {
          text: 'ErrorLens: 0',
          tooltip: 'Error Lens: Click to audit active file',
          command: 'errorLens.auditFile',
          alignment: 'left',
          priority: 80,
        });

        const inspect = (content: string, file: FileNode) => {
          if (!file) return;
          const diags: DiagnosticItem[] = [];
          const lines = content.split('\n');
          const isJs = file.language === 'javascript' || file.language === 'typescript';

          lines.forEach((lineText, idx) => {
            const lineNum = idx + 1;
            if (isJs && /[^=!<>]==[^=]/.test(lineText)) {
              diags.push({
                id: `el-eq-${file.id}-${lineNum}`,
                fileId: file.id,
                filePath: file.path,
                fileName: file.name,
                line: lineNum,
                column: lineText.indexOf('==') + 1,
                message: 'Prefer strict equality "===" instead of "==" (Error Lens)',
                severity: 'warning',
                source: 'errorlens',
              });
            }
            if (/\beval\s*\(/.test(lineText)) {
              diags.push({
                id: `el-eval-${file.id}-${lineNum}`,
                fileId: file.id,
                filePath: file.path,
                fileName: file.name,
                line: lineNum,
                column: lineText.indexOf('eval') + 1,
                message: 'Avoid eval() for security and performance safety',
                severity: 'error',
                source: 'errorlens',
              });
            }
            if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(lineText)) {
              diags.push({
                id: `el-catch-${file.id}-${lineNum}`,
                fileId: file.id,
                filePath: file.path,
                fileName: file.name,
                line: lineNum,
                column: lineText.indexOf('catch') + 1,
                message: 'Empty catch block silently swallows exceptions',
                severity: 'warning',
                source: 'errorlens',
              });
            }
          });

          context.problems.setDiagnostics(file.id, diags);
          badge.update(
            `ErrorLens: ${diags.length}`,
            `Error Lens detected ${diags.length} diagnostic(s) in ${file.name}`
          );
        };

        context.commands.registerCommand('errorLens.auditFile', () => {
          const cur = context.editor.getActiveFile();
          if (!cur) return;
          inspect(context.editor.getActiveContent(), cur);
          context.notifications.show(`Error Lens audited ${cur.name}`, 'info');
        });

        context.editor.onContentChange((content, file) => inspect(content, file));
        const cur = context.editor.getActiveFile();
        if (cur) inspect(cur.content || '', cur);
      },
      contributes: {
        commands: [
          {
            id: 'errorLens.auditFile',
            title: 'Error Lens: Audit Active File',
            category: 'Error Lens',
            handler: () => {},
          },
        ],
      },
    };

    // 8. Code Spell Checker (cSpell)
    const TYPO_MAP: Record<string, string> = {
      teh: 'the',
      recieve: 'receive',
      seperate: 'separate',
      occured: 'occurred',
      untill: 'until',
      definately: 'definitely',
      funtion: 'function',
      retrun: 'return',
      improt: 'import',
      documnet: 'document',
      widht: 'width',
      heigth: 'height',
      lenght: 'length',
      responce: 'response',
      passowrd: 'password',
      paramter: 'parameter',
      langauge: 'language',
      authetication: 'authentication',
    };

    const cSpellPlugin: VSCodePlugin = {
      id: 'streetsidesoftware.code-spell-checker',
      name: 'cspell',
      displayName: 'Code Spell Checker',
      version: '4.0.18',
      publisher: 'Street Side Software',
      description: 'Catch spelling typos in identifiers, comments, and strings with one-click typo auto-fix.',
      category: 'Linters',
      enabled: true,
      installed: true,
      builtIn: true,
      downloads: 18900000,
      rating: 4.8,
      activate: (context) => {
        const checkTypos = (content: string, file: FileNode) => {
          if (!file) return;
          const diags: DiagnosticItem[] = [];
          const lines = content.split('\n');
          const pattern = new RegExp(`\\b(${Object.keys(TYPO_MAP).join('|')})\\b`, 'gi');

          lines.forEach((lineText, idx) => {
            let match: RegExpExecArray | null;
            pattern.lastIndex = 0;
            while ((match = pattern.exec(lineText)) !== null) {
              const word = match[0];
              const suggestion = TYPO_MAP[word.toLowerCase()];
              diags.push({
                id: `cspell-${file.id}-${idx + 1}-${match.index}`,
                fileId: file.id,
                filePath: file.path,
                fileName: file.name,
                line: idx + 1,
                column: match.index + 1,
                message: `Unknown word "${word}" — did you mean "${suggestion}"?`,
                severity: 'info',
                source: 'cSpell',
              });
            }
          });
          context.problems.setDiagnostics(file.id, diags);
        };

        context.commands.registerCommand('cspell.fixCommonTypos', () => {
          const cur = context.editor.getActiveFile();
          if (!cur) return;
          let content = context.editor.getActiveContent();
          let fixedCount = 0;
          for (const [bad, good] of Object.entries(TYPO_MAP)) {
            const re = new RegExp(`\\b${bad}\\b`, 'g');
            const matches = content.match(re);
            if (matches) {
              fixedCount += matches.length;
              content = content.replace(re, good);
            }
          }
          if (fixedCount > 0) {
            context.editor.setActiveContent(content);
            context.notifications.show(`Code Spell Checker fixed ${fixedCount} typo(s) in ${cur.name}`, 'info');
          } else {
            context.notifications.show(`No common typos detected in ${cur.name}`, 'info');
          }
        });

        context.editor.onContentChange((content, file) => checkTypos(content, file));
        const cur = context.editor.getActiveFile();
        if (cur) checkTypos(cur.content || '', cur);
      },
      contributes: {
        commands: [
          {
            id: 'cspell.fixCommonTypos',
            title: 'cSpell: Auto-Fix Common Typos',
            category: 'Spell Checker',
            handler: () => {},
          },
        ],
      },
    };

    // 9. Import Sorter & Organizer
    const importSorterPlugin: VSCodePlugin = {
      id: 'compillo.import-organizer',
      name: 'import-organizer',
      displayName: 'Import Sorter & Organizer',
      version: '2.4.0',
      publisher: 'Compillo Essentials',
      description: 'Groups external vs relative imports, strips duplicates, and alphabetizes JS/TS/Python import blocks.',
      category: 'Formatters',
      enabled: true,
      installed: true,
      builtIn: true,
      downloads: 7600000,
      rating: 4.8,
      activate: (context) => {
        context.commands.registerCommand('imports.organize', () => {
          const file = context.editor.getActiveFile();
          if (!file) return;
          const content = context.editor.getActiveContent();
          const lines = content.split('\n');
          const importLines: string[] = [];
          const restLines: string[] = [];
          let passedHeader = false;

          for (const line of lines) {
            const trimmed = line.trim();
            if (!passedHeader && (/^import\s+/.test(trimmed) || /^from\s+\S+\s+import\s+/.test(trimmed))) {
              if (!importLines.includes(trimmed)) importLines.push(trimmed);
            } else {
              if (trimmed !== '' || importLines.length === 0) passedHeader = true;
              restLines.push(line);
            }
          }

          if (importLines.length === 0) {
            context.notifications.show(`No top-level imports found in ${file.name}`, 'info');
            return;
          }

          const external = importLines.filter((l) => !l.includes('./') && !l.includes('../')).sort();
          const relative = importLines.filter((l) => l.includes('./') || l.includes('../')).sort();
          const sortedBlock = [...external, ...(external.length && relative.length ? [''] : []), ...relative];
          const trimmedRest = restLines.join('\n').replace(/^\n+/, '');
          const next = `${sortedBlock.join('\n')}\n\n${trimmedRest}`;
          context.editor.setActiveContent(next);
          context.notifications.show(`Organized ${importLines.length} import(s) in ${file.name}`, 'info');
        });
      },
      contributes: {
        commands: [
          {
            id: 'imports.organize',
            title: 'Organize & Sort Imports',
            category: 'Imports',
            shortcut: 'Shift+Alt+O',
            handler: () => {},
          },
        ],
      },
    };

    // 10. JSON Toolkit [Daily Essential - Lazy Chunk, On by Default]
    const jsonToolkitPlugin: VSCodePlugin = {
      id: 'compillo.json-yaml-toolkit',
      name: 'json-toolkit',
      displayName: 'JSON & Data Toolkit',
      version: '3.2.1',
      publisher: 'Compillo Essentials',
      description: 'Deep-sort JSON object keys, minify payloads, and validate structured JSON data.',
      category: 'Formatters',
      enabled: true,
      alwaysEssential: true,
      defaultEnabled: true,
      lazyChunk: true,
      estimatedKb: 14,
      languages: ['json'],
      installed: true,
      builtIn: true,
      downloads: 9400000,
      rating: 4.9,
      activate: async (context) => {
        const mod = await import('./extensions/sqlDataPack');
        mod.activateJsonToolkit(context);
      },
      contributes: {
        commands: [
          {
            id: 'jsonTools.sortKeys',
            title: 'JSON: Deep Sort Object Keys',
            category: 'JSON',
            handler: () => {},
          },
          {
            id: 'jsonTools.minify',
            title: 'JSON: Minify Document',
            category: 'JSON',
            handler: () => {},
          },
        ],
      },
    };

    // 11. Tailwind CSS IntelliSense & Class Sorter [Lazy Chunk - Off by default]
    const tailwindPlugin: VSCodePlugin = {
      id: 'bradlc.vscode-tailwindcss',
      name: 'tailwindcss',
      displayName: 'Tailwind CSS IntelliSense',
      version: '0.12.8',
      publisher: 'Tailwind Labs',
      description: 'Sort, deduplicate, and audit Tailwind utility classes in JSX, TSX, and HTML documents.',
      category: 'Formatters',
      enabled: false,
      defaultEnabled: false,
      lazyChunk: true,
      estimatedKb: 28,
      languages: ['tsx', 'jsx', 'html', 'css'],
      installed: true,
      builtIn: true,
      downloads: 21500000,
      rating: 4.9,
      activate: async (context) => {
        const mod = await import('./extensions/webReactPack');
        mod.activateTailwindSorter(context);
      },
      contributes: {
        commands: [
          {
            id: 'tailwind.sortClasses',
            title: 'Tailwind CSS: Sort Utility Classes',
            category: 'Tailwind',
            handler: () => {},
          },
        ],
      },
    };

    // 12. Python Black / PEP8 Formatter [Lazy Chunk - Off by default]
    const pythonBlackPlugin: VSCodePlugin = {
      id: 'ms-python.black-formatter',
      name: 'black-formatter',
      displayName: 'Black Formatter (Python PEP8)',
      version: '2025.2.0',
      publisher: 'Microsoft',
      description: 'Opinionated PEP8 formatting for Python files: 4-space indentation, clean blank lines, and EOF newline.',
      category: 'Formatters',
      enabled: false,
      defaultEnabled: false,
      lazyChunk: true,
      estimatedKb: 22,
      languages: ['py'],
      installed: true,
      builtIn: true,
      downloads: 16800000,
      rating: 4.8,
      activate: async (context) => {
        const mod = await import('./extensions/pythonPack');
        mod.activateBlackFormatter(context);
      },
      contributes: {
        commands: [
          {
            id: 'python.formatPep8',
            title: 'Python: Format with Black (PEP8)',
            category: 'Python',
            handler: () => {},
          },
        ],
      },
    };

    // 13. SonarLint Security & Secret Scanner [Daily Essential - Lazy Chunk, On by Default]
    const sonarSecurityPlugin: VSCodePlugin = {
      id: 'sonarsource.sonarlint-security',
      name: 'sonarlint',
      displayName: 'SonarLint Security & Secrets',
      version: '4.11.0',
      publisher: 'SonarSource',
      description: 'Detects hardcoded API secrets, XSS sinks (innerHTML / dangerouslySetInnerHTML), and SQL injection patterns.',
      category: 'Linters',
      enabled: true,
      alwaysEssential: true,
      defaultEnabled: true,
      lazyChunk: true,
      estimatedKb: 36,
      languages: ['ts', 'tsx', 'js', 'jsx', 'py'],
      installed: true,
      builtIn: true,
      downloads: 14300000,
      rating: 4.8,
      activate: async (context) => {
        const mod = await import('./extensions/securityConfigPack');
        mod.activateSonarSecurity(context);
      },
      contributes: {
        commands: [
          {
            id: 'sonarlint.scanActiveFile',
            title: 'SonarLint: Run Security Audit',
            category: 'Security',
            handler: () => {},
          },
        ],
      },
    };

    // 14. REST Client & Curl Extractor [Lazy Chunk - Off by default]
    const restCompanionPlugin: VSCodePlugin = {
      id: 'humao.rest-client-companion',
      name: 'rest-client',
      displayName: 'REST Client & Curl Generator',
      version: '0.25.1',
      publisher: 'Huachao Mao',
      description: 'Extracts API URLs & Express/fetch routes from the active file and generates ready-to-run curl snippets.',
      category: 'Tools',
      enabled: false,
      defaultEnabled: false,
      lazyChunk: true,
      estimatedKb: 18,
      languages: ['ts', 'js', 'py'],
      installed: true,
      builtIn: true,
      downloads: 11200000,
      rating: 4.8,
      activate: async (context) => {
        const mod = await import('./extensions/docsDiagramPack');
        mod.activateRestCompanion(context);
      },
      contributes: {
        commands: [
          {
            id: 'restClient.extractUrls',
            title: 'REST Client: Generate Curl Commands from File',
            category: 'REST',
            handler: () => {},
          },
        ],
      },
    };

    // 15. Regex101 Live Inspector [Lazy Chunk - Off by default]
    const regexInspectorPlugin: VSCodePlugin = {
      id: 'compillo.regex-previewer',
      name: 'regex-previewer',
      displayName: 'Regex101 Inspector & Explainer',
      version: '1.8.0',
      publisher: 'Compillo Essentials',
      description: 'Extracts regular expressions from your active file and prints human-readable token breakdowns.',
      category: 'Tools',
      enabled: false,
      defaultEnabled: false,
      lazyChunk: true,
      estimatedKb: 16,
      languages: ['ts', 'js', 'py'],
      installed: true,
      builtIn: true,
      downloads: 4300000,
      rating: 4.7,
      activate: async (context) => {
        const mod = await import('./extensions/docsDiagramPack');
        mod.activateRegexInspector(context);
      },
      contributes: {
        commands: [
          {
            id: 'regex.inspectFile',
            title: 'Regex: Inspect & Explain Patterns in File',
            category: 'Tools',
            handler: () => {},
          },
        ],
      },
    };

    // 16. HTML / JSX Auto Tag Balance & A11y Checker [Lazy Chunk - Off by default]
    const htmlTagCheckerPlugin: VSCodePlugin = {
      id: 'formulahendry.auto-rename-tag',
      name: 'html-tag-checker',
      displayName: 'HTML & JSX Tag Balance + A11y',
      version: '0.1.10',
      publisher: 'Jun Han',
      description: 'Checks HTML/JSX documents for unclosed tags and missing accessibility attributes like <img alt>.',
      category: 'Preview',
      enabled: false,
      defaultEnabled: false,
      lazyChunk: true,
      estimatedKb: 19,
      languages: ['html', 'jsx', 'tsx', 'svg'],
      installed: true,
      builtIn: true,
      downloads: 19600000,
      rating: 4.7,
      activate: async (context) => {
        const mod = await import('./extensions/webReactPack');
        mod.activateHtmlTagChecker(context);
      },
      contributes: {
        commands: [
          {
            id: 'htmlChecker.validateTags',
            title: 'HTML/JSX: Check Accessibility & Tags',
            category: 'HTML',
            handler: () => {},
          },
        ],
      },
    };

    // 17. CodeMetrics & Complexity Analyzer
    const codeMetricsPlugin: VSCodePlugin = {
      id: 'kisstkondoros.vscode-codemetrics',
      name: 'codemetrics',
      displayName: 'CodeMetrics & Complexity',
      version: '1.26.2',
      publisher: 'Kiss Tamas',
      description: 'Displays live LOC, function count, and cyclomatic complexity estimate for the active editor file.',
      category: 'Tools',
      enabled: true,
      installed: true,
      builtIn: true,
      downloads: 5400000,
      rating: 4.7,
      activate: (context) => {
        const metricItem = context.statusBar.createItem('codemetrics-bar', {
          text: 'LOC 0 · Fn 0',
          tooltip: 'CodeMetrics: Click for full file complexity report',
          command: 'metrics.analyzeFile',
          alignment: 'right',
          priority: 25,
        });

        const compute = (content: string, file: FileNode | null) => {
          const lines = content ? content.split('\n') : [];
          const nonEmpty = lines.filter((l) => l.trim().length > 0).length;
          const fnCount = (content.match(/\b(function|def|func|fn)\s+\w+|=>\s*\{/g) || []).length;
          const branches = (content.match(/\b(if|else if|for|while|switch|case|catch|\?\s*:)\b/g) || []).length + 1;
          metricItem.update(
            `LOC ${nonEmpty} · Cx ${branches}`,
            `${file?.name || 'File'}: ${lines.length} lines (${nonEmpty} non-empty), ~${fnCount} functions, cyclomatic complexity ~${branches}`
          );
          return { totalLines: lines.length, nonEmpty, fnCount, branches };
        };

        context.commands.registerCommand('metrics.analyzeFile', () => {
          const file = context.editor.getActiveFile();
          if (!file) return;
          const m = compute(context.editor.getActiveContent(), file);
          context.output.appendLine(
            'Tasks',
            `[CodeMetrics] ${file.name} -> Total: ${m.totalLines} lines | Code: ${m.nonEmpty} | Functions: ${m.fnCount} | Complexity: ${m.branches}`,
            'info'
          );
          context.notifications.show(
            `${file.name}: ${m.nonEmpty} LOC, ${m.fnCount} fns, Complexity ${m.branches}`,
            'info'
          );
        });

        context.editor.onContentChange((content, file) => compute(content, file));
        const cur = context.editor.getActiveFile();
        if (cur) compute(cur.content || '', cur);
      },
      contributes: {
        commands: [
          {
            id: 'metrics.analyzeFile',
            title: 'CodeMetrics: Analyze Active File Complexity',
            category: 'Metrics',
            handler: () => {},
          },
        ],
      },
    };

    // 18. CSS Color Palette & Token Extractor [Lazy Chunk - Off by default]
    const colorPalettePlugin: VSCodePlugin = {
      id: 'naumovs.color-highlight',
      name: 'color-highlight',
      displayName: 'Color Highlight & Palette Extractor',
      version: '2.8.0',
      publisher: 'Sergii Naumov',
      description: 'Extracts hex/RGB/HSL color tokens from stylesheets & components and generates CSS :root variables.',
      category: 'Preview',
      enabled: false,
      defaultEnabled: false,
      lazyChunk: true,
      estimatedKb: 14,
      languages: ['css', 'scss', 'tsx', 'html'],
      installed: true,
      builtIn: true,
      downloads: 11900000,
      rating: 4.8,
      activate: (context) => {
        context.commands.registerCommand('colorizer.extractPalette', () => {
          const file = context.editor.getActiveFile();
          if (!file) return;
          const content = context.editor.getActiveContent();
          const colors = Array.from(
            new Set(
              content.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g) || []
            )
          );
          context.output.clear('Tasks');
          context.output.appendLine('Tasks', `Color Extractor found ${colors.length} unique token(s) in ${file.name}:`, 'info');
          if (colors.length > 0) {
            const cssVars = colors.map((c, idx) => `  --token-color-${idx + 1}: ${c};`).join('\n');
            context.output.appendLine('Tasks', `:root {\n${cssVars}\n}`, 'log');
          }
          context.notifications.show(`Extracted ${colors.length} color token(s) to Output > Tasks`, 'info');
        });
      },
      contributes: {
        commands: [
          {
            id: 'colorizer.extractPalette',
            title: 'Color Palette: Extract CSS Color Tokens',
            category: 'Preview',
            handler: () => {},
          },
        ],
      },
    };

    // 19. Material & Studio File Icon Pack Switcher
    let iconSubUnsub: (() => void) | null = null;
    const iconPackPlugin: VSCodePlugin = {
      id: 'pkief.material-icon-theme',
      name: 'material-icon-theme',
      displayName: 'Icon Pack Studio (File & Folder Icons)',
      version: '5.14.0',
      publisher: 'Philipp Kief & Compillo',
      description: 'Change file & folder icons across Explorer, Tabs, Search, and Breadcrumbs (Material Vivid, Catppuccin, Neon Cyber, Minimal Mono).',
      category: 'Themes',
      enabled: true,
      installed: true,
      builtIn: true,
      downloads: 29400000,
      rating: 4.9,
      activate: (context) => {
        customizationService.setIconExtensionEnabled(true);

        const getLabel = () => {
          const curId = customizationService.getState().iconPack;
          const pack = ICON_PACKS.find((p) => p.id === curId) || ICON_PACKS[0];
          return `Icons: ${pack.name.replace(' Pack', '')}`;
        };

        const statusItem = context.statusBar.createItem('icons-status', {
          text: getLabel(),
          tooltip: 'Click to change Explorer & Tab file icon pack',
          command: 'icons.openPicker',
          alignment: 'right',
          priority: 18,
        });

        iconSubUnsub = customizationService.subscribe(() => {
          statusItem.update(getLabel());
        });

        context.commands.registerCommand('icons.openPicker', () => {
          window.dispatchEvent(new CustomEvent('compillo:open-customizer', { detail: { tab: 'icons' } }));
        });

        context.commands.registerCommand('icons.cyclePack', () => {
          const next = customizationService.cycleIconPack();
          context.notifications.show(`File Icon Pack switched to "${next.name}".`, 'info');
        });
      },
      deactivate: () => {
        iconSubUnsub?.();
        iconSubUnsub = null;
        customizationService.setIconExtensionEnabled(false);
      },
      contributes: {
        commands: [
          {
            id: 'icons.openPicker',
            title: 'Change File & Folder Icon Pack...',
            category: 'Themes',
            handler: () => {},
          },
          {
            id: 'icons.cyclePack',
            title: 'Cycle Next File Icon Pack',
            category: 'Themes',
            handler: () => {},
          },
        ],
      },
    };

    // 20. Code Colour Studio (Syntax Token Colorizer)
    let syntaxSubUnsub: (() => void) | null = null;
    const codeColorPlugin: VSCodePlugin = {
      id: 'compillo.code-color-changer',
      name: 'code-color-changer',
      displayName: 'Code Colour Studio (Syntax Styler)',
      version: '3.2.0',
      publisher: 'Compillo Themes',
      description: 'Change code syntax colors live (Dracula, Monokai, Tokyo Night, Nord, Synthwave) or customize individual keyword, string & function colors.',
      category: 'Themes',
      enabled: true,
      installed: true,
      builtIn: true,
      downloads: 18900000,
      rating: 4.9,
      activate: (context) => {
        customizationService.setSyntaxExtensionEnabled(true);

        const getLabel = () => {
          const st = customizationService.getState();
          const hasCustom = Object.keys(st.customTokens).length > 0;
          const pal = SYNTAX_PALETTES.find((p) => p.id === st.syntaxPalette) || SYNTAX_PALETTES[0];
          const shortName = pal.id === 'theme-default' ? 'Default' : pal.name.split(' ')[0];
          return `Syntax: ${shortName}${hasCustom ? '*' : ''}`;
        };

        const statusItem = context.statusBar.createItem('code-color-status', {
          text: getLabel(),
          tooltip: 'Click to customize code syntax colors & token palette',
          command: 'codeColor.openPicker',
          alignment: 'right',
          priority: 17,
        });

        syntaxSubUnsub = customizationService.subscribe(() => {
          statusItem.update(getLabel());
        });

        context.commands.registerCommand('codeColor.openPicker', () => {
          window.dispatchEvent(new CustomEvent('compillo:open-customizer', { detail: { tab: 'colors' } }));
        });

        context.commands.registerCommand('codeColor.cyclePalette', () => {
          const next = customizationService.cycleSyntaxPalette();
          context.notifications.show(`Code Syntax Palette set to "${next.name}".`, 'info');
        });

        context.commands.registerCommand('codeColor.reset', () => {
          customizationService.resetSyntaxColors();
          context.notifications.show('Reset code syntax colors to active theme default.', 'info');
        });
      },
      deactivate: () => {
        syntaxSubUnsub?.();
        syntaxSubUnsub = null;
        customizationService.setSyntaxExtensionEnabled(false);
      },
      contributes: {
        commands: [
          {
            id: 'codeColor.openPicker',
            title: 'Customize Code Syntax Colors...',
            category: 'Themes',
            handler: () => {},
          },
          {
            id: 'codeColor.cyclePalette',
            title: 'Cycle Code Colour Palette',
            category: 'Themes',
            handler: () => {},
          },
          {
            id: 'codeColor.reset',
            title: 'Reset Code Colors to Default',
            category: 'Themes',
            handler: () => {},
          },
        ],
      },
    };

    // 21. Python & Data Science Helper [New Lazy Language Pack]
    const pythonEnvPlugin: VSCodePlugin = {
      id: 'compillo.python-env-pack',
      name: 'python-env-pack',
      displayName: 'Python & Data Science Helper',
      version: '2.1.0',
      publisher: 'Compillo Python Labs',
      description: 'Detects third-party Python imports for requirements.txt and generates function docstring stubs on demand.',
      category: 'Tools',
      enabled: false,
      defaultEnabled: false,
      lazyChunk: true,
      estimatedKb: 24,
      languages: ['py'],
      workspaceFiles: ['requirements.txt', 'pyproject.toml'],
      installed: true,
      builtIn: true,
      downloads: 8700000,
      rating: 4.9,
      activate: async (context) => {
        const mod = await import('./extensions/pythonPack');
        mod.activatePythonEnvHelper(context);
      },
      contributes: {
        commands: [
          {
            id: 'python.extractRequirements',
            title: 'Python: Scan Imports -> requirements.txt',
            category: 'Python',
            handler: () => {},
          },
          {
            id: 'python.addDocstrings',
            title: 'Python: Generate Missing Docstrings',
            category: 'Python',
            handler: () => {},
          },
        ],
      },
    };

    // 22. Package.json & Dependency Inspector [New Lazy Language Pack]
    const packageDepPlugin: VSCodePlugin = {
      id: 'compillo.package-dep-inspector',
      name: 'package-dep-inspector',
      displayName: 'Package & Dependency Inspector',
      version: '1.6.0',
      publisher: 'Compillo Web Labs',
      description: 'Audits package.json dependencies, scripts, and duplicate prod/dev packages without loading heavy JS parsers upfront.',
      category: 'Tools',
      enabled: false,
      defaultEnabled: false,
      lazyChunk: true,
      estimatedKb: 18,
      languages: ['json'],
      workspaceFiles: ['package.json'],
      installed: true,
      builtIn: true,
      downloads: 6900000,
      rating: 4.8,
      activate: async (context) => {
        const mod = await import('./extensions/webReactPack');
        mod.activatePackageDepInspector(context);
      },
      contributes: {
        commands: [
          {
            id: 'deps.auditPackageJson',
            title: 'Package: Audit package.json Dependencies',
            category: 'Node',
            handler: () => {},
          },
        ],
      },
    };

    // 23. .env & Secrets Config Guard [New Lazy Language Pack]
    const envGuardPlugin: VSCodePlugin = {
      id: 'compillo.env-vault-guard',
      name: 'env-vault-guard',
      displayName: '.env & Secrets Config Guard',
      version: '1.4.2',
      publisher: 'Compillo Security',
      description: 'Generates safe masked .env.example templates from .env files and protects credentials in config workflows.',
      category: 'Tools',
      enabled: false,
      defaultEnabled: false,
      lazyChunk: true,
      estimatedKb: 15,
      workspaceFiles: ['.env', '.env.example'],
      installed: true,
      builtIn: true,
      downloads: 5200000,
      rating: 4.8,
      activate: async (context) => {
        const mod = await import('./extensions/securityConfigPack');
        mod.activateEnvVaultGuard(context);
      },
      contributes: {
        commands: [
          {
            id: 'envGuard.generateExample',
            title: '.env: Generate Masked .env.example',
            category: 'Security',
            handler: () => {},
          },
        ],
      },
    };

    // 24. SQL Formatter & Schema Explorer [New Lazy Language Pack]
    const sqlStudioPlugin: VSCodePlugin = {
      id: 'compillo.sql-schema-studio',
      name: 'sql-schema-studio',
      displayName: 'SQL Formatter & Schema Explorer',
      version: '2.0.4',
      publisher: 'Compillo Data',
      description: 'Formats SQL clauses cleanly and extracts CREATE TABLE column schemas for database projects.',
      category: 'Formatters',
      enabled: false,
      defaultEnabled: false,
      lazyChunk: true,
      estimatedKb: 26,
      languages: ['sql'],
      installed: true,
      builtIn: true,
      downloads: 7800000,
      rating: 4.8,
      activate: async (context) => {
        const mod = await import('./extensions/sqlDataPack');
        mod.activateSqlSchemaStudio(context);
      },
      contributes: {
        commands: [
          {
            id: 'sql.formatDocument',
            title: 'SQL: Format Query Clauses',
            category: 'SQL',
            handler: () => {},
          },
          {
            id: 'sql.inspectSchema',
            title: 'SQL: Extract CREATE TABLE Schema',
            category: 'SQL',
            handler: () => {},
          },
        ],
      },
    };

    // 25. Mermaid & Flowchart Generator [New Lazy Language Pack]
    const mermaidPlugin: VSCodePlugin = {
      id: 'compillo.mermaid-diagram-preview',
      name: 'mermaid-diagram-preview',
      displayName: 'Mermaid & Flowchart Generator',
      version: '1.3.0',
      publisher: 'Compillo Docs',
      description: 'Auto-generates Mermaid architecture flowcharts from code functions and Markdown documentation.',
      category: 'Preview',
      enabled: false,
      defaultEnabled: false,
      lazyChunk: true,
      estimatedKb: 21,
      languages: ['md', 'mmd', 'ts', 'py'],
      installed: true,
      builtIn: true,
      downloads: 4900000,
      rating: 4.8,
      activate: async (context) => {
        const mod = await import('./extensions/docsDiagramPack');
        mod.activateMermaidDiagram(context);
      },
      contributes: {
        commands: [
          {
            id: 'mermaid.generateFlowchart',
            title: 'Mermaid: Generate Flowchart from Functions',
            category: 'Preview',
            handler: () => {},
          },
        ],
      },
    };

    [
      prettierPlugin,
      eslintPlugin,
      codeRunnerPlugin,
      todoPlugin,
      gitLensPlugin,
      markdownPreviewPlugin,
      errorLensPlugin,
      cSpellPlugin,
      importSorterPlugin,
      jsonToolkitPlugin,
      tailwindPlugin,
      pythonBlackPlugin,
      sonarSecurityPlugin,
      restCompanionPlugin,
      regexInspectorPlugin,
      htmlTagCheckerPlugin,
      codeMetricsPlugin,
      colorPalettePlugin,
      iconPackPlugin,
      codeColorPlugin,
      pythonEnvPlugin,
      packageDepPlugin,
      envGuardPlugin,
      sqlStudioPlugin,
      mermaidPlugin,
    ].forEach((plugin) => this.registerPlugin(plugin));

    if (this.disabledPluginIds.has('pkief.material-icon-theme')) {
      customizationService.setIconExtensionEnabled(false);
    }
    if (this.disabledPluginIds.has('compillo.code-color-changer')) {
      customizationService.setSyntaxExtensionEnabled(false);
    }
  }
}

// Simple JS formatting helper
function simpleFormatJS(code: string): string {
  const lines = code.split('\n');
  let indentLevel = 0;
  const indentStr = '  ';
  const formattedLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      formattedLines.push('');
      continue;
    }

    if (line.startsWith('}') || line.startsWith(']') || line.startsWith(')')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    formattedLines.push(indentStr.repeat(indentLevel) + line);

    const openCount = (line.match(/[\{\[\(]/g) || []).length;
    const closeCount = (line.match(/[\}\]\)]/g) || []).length;
    indentLevel += openCount - closeCount;
    if (indentLevel < 0) indentLevel = 0;
  }

  return formattedLines.join('\n');
}

// Simple CSS formatting helper
function simpleFormatCSS(css: string): string {
  return css
    .replace(/\s*\{\s*/g, ' {\n  ')
    .replace(/;\s*/g, ';\n  ')
    .replace(/\s*\}\s*/g, '\n}\n\n')
    .trim();
}

export const pluginManager = new PluginSystemManager();
