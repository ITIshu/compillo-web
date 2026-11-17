import { FileNode } from '../types';
import { runPythonWithPyodide, cleanPythonTraceback, extractPythonDiagnostic } from './pyodideRunner';
import { eduLabProgress } from './eduLabService';
import { pluginManager } from './pluginSystem';

export interface PythonRunEvent {
  type: 'start' | 'stdout' | 'stderr' | 'exit' | 'error';
  data: any;
}

export interface PythonOutputItem {
  id: string;
  text: string;
  type: 'stdout' | 'stderr' | 'system' | 'input' | 'plot';
  plotDataUrl?: string;
}

export type PythonEngineChoice = 'auto' | 'wasm' | 'server';

export interface PythonSessionState {
  sessionId: string | null;
  isRunning: boolean;
  filename: string;
  output: PythonOutputItem[];
  waitingForInput: boolean;
  inputPrompt: string;
  exitCode: number | null;
  startedAt: number | null;
  engine: PythonEngineChoice;
  activeEngineName?: string;
  serverPythonAvailable?: boolean | null;
}

type StateListener = (state: PythonSessionState) => void;

/**
 * Auto-heals and cleans unexpected Python indentation errors before execution.
 * Fixes unexpected indents on line 1, copied blocks with uniform indentation,
 * and top-level statements that have accidental indentation.
 */
export function autoHealPythonIndentation(source: string): { code: string; wasFixed: boolean; reason?: string } {
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

function flattenFiles(nodes: FileNode[]): FileNode[] {
  const result: FileNode[] = [];
  const walk = (list: FileNode[]) => {
    for (const node of list) {
      if (node.type === 'file') {
        result.push(node);
      } else if (Array.isArray(node.children) && node.children.length > 0) {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return result;
}

class PythonRunnerService {
  private activeSessionId: string | null = null;
  private abortController: AbortController | null = null;
  private listeners: Set<StateListener> = new Set();
  private enginePreference: PythonEngineChoice = 'auto';
  private serverPythonAvailable: boolean | null = null;

  private currentState: PythonSessionState = {
    sessionId: null,
    isRunning: false,
    filename: '',
    output: [],
    waitingForInput: false,
    inputPrompt: '',
    exitCode: null,
    startedAt: null,
    engine: 'auto',
    serverPythonAvailable: null,
  };

  constructor() {
    // Proactively check server Python on startup
    this.checkServerPython().catch(() => {});
  }

  public getState(): PythonSessionState {
    return { ...this.currentState };
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public setEngine(engine: PythonEngineChoice) {
    this.enginePreference = engine;
    this.updateState({ engine });
  }

  public async checkServerPython(): Promise<boolean> {
    if (this.serverPythonAvailable !== null) {
      return this.serverPythonAvailable;
    }
    try {
      const res = await fetch('/api/python/info');
      if (res.ok) {
        const data = await res.json();
        this.serverPythonAvailable = data.available === true;
      } else {
        this.serverPythonAvailable = false;
      }
    } catch {
      this.serverPythonAvailable = false;
    }
    this.updateState({ serverPythonAvailable: this.serverPythonAvailable });
    return this.serverPythonAvailable;
  }

  private updateState(partial: Partial<PythonSessionState>) {
    this.currentState = { ...this.currentState, ...partial };
    this.listeners.forEach((fn) => {
      try {
        fn(this.getState());
      } catch (e) {
        console.error('Error in python runner listener:', e);
      }
    });
  }

  private appendOutput(
    text: string,
    type: 'stdout' | 'stderr' | 'system' | 'input' = 'stdout'
  ) {
    const id = 'out-' + Math.random().toString(36).substring(2, 9);
    const newOutput = [...this.currentState.output, { id, text, type }];
    this.updateState({ output: newOutput });
  }

  private appendPlot(plotDataUrl: string) {
    const id = 'plot-' + Math.random().toString(36).substring(2, 9);
    const newOutput = [
      ...this.currentState.output,
      { id, text: '', type: 'plot' as const, plotDataUrl },
    ];
    this.updateState({ output: newOutput });
  }

  public clearOutput() {
    this.updateState({
      output: [],
      waitingForInput: false,
      inputPrompt: '',
    });
  }

  /**
   * Run a Python program interactively with streaming input/output
   */
  public async runInteractive(
    code: string,
    filename: string = 'main.py',
    allFiles: FileNode[] = [],
    filePath?: string
  ): Promise<void> {
    // If a session is already running, terminate it first
    if (this.currentState.isRunning && this.activeSessionId) {
      await this.killSession();
    }

    this.abortController = new AbortController();
    const startTime = Date.now();

    // Auto-heal indentation before running to prevent unexpected IndentationError
    const { code: cleanCode, wasFixed, reason } = autoHealPythonIndentation(code);

    const initialOutputs: PythonOutputItem[] = [];

    // Prepare workspace files (including files nested inside folders) for relative imports / open() calls
    const flatWorkspace = flattenFiles(allFiles);
    const workspaceFiles = flatWorkspace
      .filter((f) => f.content !== undefined)
      .slice(0, 300)
      .map((f) => ({
        name: f.name,
        path: f.path || `/${f.name}`,
        content: f.name.endsWith('.py') ? autoHealPythonIndentation(f.content || '').code : f.content || '',
      }));

    // Check engine preference
    let useWasm = this.enginePreference === 'wasm';
    if (this.enginePreference === 'auto') {
      const serverAvailable = await this.checkServerPython();
      if (!serverAvailable) {
        useWasm = true;
      }
    }

    // If using WebAssembly directly (e.g. published environment where server has no Python)
    if (useWasm) {
      this.updateState({
        sessionId: null,
        isRunning: true,
        filename,
        output: initialOutputs,
        waitingForInput: false,
        inputPrompt: '',
        exitCode: null,
        startedAt: startTime,
        activeEngineName: 'WebAssembly (Pyodide 3.11)',
      });

      return await this.executePyodide(cleanCode, filename, workspaceFiles, startTime);
    }

    // Otherwise attempt Server CPython execution
    this.updateState({
      sessionId: null,
      isRunning: true,
      filename,
      output: initialOutputs,
      waitingForInput: false,
      inputPrompt: '',
      exitCode: null,
      startedAt: startTime,
      activeEngineName: 'Server CPython',
    });

    let fallbackToWasm = false;

    try {
      const response = await fetch('/api/python/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, filename, filePath, workspaceFiles }),
        signal: this.abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Failed to connect to Python server (Status: ${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          if (!block.trim()) continue;

          let eventType = 'message';
          let eventData = '';

          const blockLines = block.split('\n');
          for (const line of blockLines) {
            if (line.startsWith('event: ')) {
              eventType = line.replace('event: ', '').trim();
            } else if (line.startsWith('data: ')) {
              eventData = line.replace('data: ', '').trim();
            }
          }

          if (eventData) {
            try {
              const parsed = JSON.parse(eventData);
              const shouldFallback = this.handleServerEvent(eventType, parsed);
              if (shouldFallback) {
                fallbackToWasm = true;
                break;
              }
            } catch (e) {
              console.warn('Failed to parse SSE JSON:', eventData);
            }
          }
        }

        if (fallbackToWasm) break;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        this.appendOutput('\n[Process cancelled by user]\n', 'system');
        this.finishSession(startTime);
        return;
      } else {
        // Network / server connection error: fallback to WebAssembly silently
        fallbackToWasm = true;
      }
    }

    if (fallbackToWasm) {
      this.serverPythonAvailable = false;
      this.updateState({ serverPythonAvailable: false });
      return await this.executePyodide(cleanCode, filename, workspaceFiles, startTime);
    }

    this.finishSession(startTime);
  }

  private finishSession(startTime: number) {
    this.updateState({
      isRunning: false,
      waitingForInput: false,
    });
    if (this.currentState.exitCode === 0 && this.currentState.filename) {
      eduLabProgress.recordRunByFilename(this.currentState.filename);
      pluginManager.clearFileDiagnostics(this.currentState.filename);
    } else if (this.currentState.exitCode !== 0 && this.currentState.filename) {
      const errItems = this.currentState.output.filter((o) => o.type === 'stderr');
      const lastErr = errItems.length > 0 ? errItems[errItems.length - 1].text : '';
      const diag = extractPythonDiagnostic(lastErr);
      if (diag) {
        pluginManager.setFileDiagnostics(this.currentState.filename, [
          {
            id: `diag-py-${Date.now()}`,
            fileId: this.currentState.filename,
            filePath: this.currentState.filename,
            fileName: this.currentState.filename,
            line: diag.line,
            column: diag.column,
            severity: diag.severity,
            message: diag.message,
            source: 'Python',
          },
        ]);
      }
    }
  }

  private async executePyodide(
    code: string,
    filename: string,
    workspaceFiles: Array<{ name: string; content: string }>,
    startTime: number
  ): Promise<void> {
    this.updateState({
      activeEngineName: 'WebAssembly (Pyodide 3.12)',
      isRunning: true,
    });

    try {
      const res = await runPythonWithPyodide({
        code,
        filename,
        workspaceFiles,
        onStdout: (text) => this.appendOutput(text, 'stdout'),
        onStderr: (text) => {
          const cleaned = cleanPythonTraceback(text, filename);
          if (cleaned && cleaned.trim()) {
            this.appendOutput(cleaned, 'stderr');
          }
        },
        onSystem: (text) => this.appendOutput(text, 'system'),
        onPlot: (dataUrl) => this.appendPlot(dataUrl),
      });
      this.updateState({ exitCode: res.exitCode });
    } catch (e: any) {
      const cleaned = cleanPythonTraceback(e?.message || String(e), filename);
      this.appendOutput(`\n${cleaned}\n`, 'stderr');
      this.updateState({ exitCode: 1 });
    } finally {
      this.finishSession(startTime);
    }
  }

  private handleServerEvent(eventType: string, data: any): boolean {
    switch (eventType) {
      case 'start':
        this.activeSessionId = data.sessionId;
        this.updateState({ sessionId: data.sessionId });
        return false;

      case 'stdout': {
        const text = data.text || '';

        // Check if output contains plot image marker
        const plotMarker = '[COMPILLO_PLOT_IMAGE:';
        if (text.includes(plotMarker)) {
          const parts = text.split(plotMarker);
          for (let i = 0; i < parts.length; i++) {
            if (i === 0) {
              if (parts[i]) this.appendOutput(parts[i], 'stdout');
            } else {
              const closeIdx = parts[i].indexOf(']');
              if (closeIdx !== -1) {
                const dataUrl = parts[i].substring(0, closeIdx);
                const rest = parts[i].substring(closeIdx + 1);
                this.appendPlot(dataUrl);
                if (rest) this.appendOutput(rest, 'stdout');
              } else {
                this.appendOutput(plotMarker + parts[i], 'stdout');
              }
            }
          }
        } else {
          this.appendOutput(text, 'stdout');
        }

        const lastLine = text.split('\n').pop() || '';
        if (
          !text.endsWith('\n') ||
          lastLine.trim().endsWith(':') ||
          lastLine.trim().endsWith('?') ||
          lastLine.trim().endsWith('>')
        ) {
          this.updateState({
            waitingForInput: true,
            inputPrompt: lastLine.trim(),
          });
        }
        return false;
      }

      case 'stderr': {
        const cleaned = cleanPythonTraceback(data.text || '', this.currentState.filename || 'main.py');
        if (cleaned && cleaned.trim()) {
          this.appendOutput(cleaned, 'stderr');
        }
        return false;
      }

      case 'exit':
        this.updateState({
          isRunning: false,
          waitingForInput: false,
          exitCode: data.code,
        });
        return false;

      case 'error':
        // Check if error is missing binary
        if (data.binaryNotFound || (data.error && data.error.includes('Could not find Python binary'))) {
          // Instruct runner to fallback to WebAssembly
          return true;
        }

        this.appendOutput(`[Python Error]: ${data.error}\n`, 'stderr');
        this.updateState({
          isRunning: false,
          waitingForInput: false,
        });
        return false;
    }
    return false;
  }

  /**
   * Send input to the active interactive Python process
   */
  public async sendInput(text: string): Promise<boolean> {
    if (!this.currentState.isRunning) {
      return false;
    }

    // Echo input into output stream for natural terminal feel
    this.appendOutput(text + '\n', 'input');
    this.updateState({ waitingForInput: false, inputPrompt: '' });

    if (!this.activeSessionId) {
      return true;
    }

    try {
      const res = await fetch('/api/python/stdin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.activeSessionId,
          input: text + '\n',
        }),
      });
      return res.ok;
    } catch (e) {
      console.error('Failed to send input to Python:', e);
      return false;
    }
  }

  /**
   * Kill / terminate the active Python process
   */
  public async killSession(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
    }

    const sId = this.activeSessionId;
    if (sId) {
      try {
        await fetch('/api/python/kill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sId }),
        });
      } catch (e) {
        // ignore
      }
    }

    this.activeSessionId = null;
    this.updateState({
      isRunning: false,
      waitingForInput: false,
      sessionId: null,
    });
  }
}

export const pythonRunner = new PythonRunnerService();
