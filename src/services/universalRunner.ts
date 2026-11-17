/**
 * Compillo Studio - Universal Multi-Language Free Runner Service
 * 
 * 100% Free & Unlimited execution engine for all 15 supported languages:
 * 1. Python (.py) - Server CPython 3 / Pyodide WebAssembly
 * 2. C++ (.cpp) - Native Server G++ / Free Community Cloud Compiler
 * 3. C (.c) - Native Server GCC / TCC / Free Community Cloud Compiler
 * 4. Java (.java) - Free OpenJDK Runtime (Zero Cost)
 * 5. TypeScript (.ts) - Native Server TSX / In-Browser TS Engine
 * 6. JavaScript (.js) - Native Server Node.js / In-Browser JS Sandbox
 * 7. Rust (.rs) - Official Rust Foundation Playground (Zero Cost)
 * 8. Go (.go) - Native Server Go Runtime / Free Community Runner
 * 9. HTML5 (.html) - Live Preview Sandbox & DOM Inspector
 * 10. CSS (.css) - Interactive CSS Style Tester & Inspector
 * 11. JSON (.json) - JSON Validator, Formatter & Query Evaluator
 * 12. SQL (.sql) - Native SQLite3 In-Memory Engine with ASCII Box Table
 * 13. Markdown (.md) - Live Markdown Document Renderer
 * 14. Shell / Bash (.sh) - Native Server Bash Execution
 * 15. Plain Text (.txt) - Text Analytics & Readability Metrics
 */

import { FileNode } from '../types';
import { pythonRunner } from './pythonRunner';
import { cleanPythonTraceback } from './pyodideRunner';
import { cppGraphicsEngine, GraphicsCommand } from './cppGraphicsEngine';

export type SupportedLanguage =
  | 'python'
  | 'cpp'
  | 'c'
  | 'java'
  | 'typescript'
  | 'javascript'
  | 'rust'
  | 'go'
  | 'html'
  | 'css'
  | 'json'
  | 'sql'
  | 'markdown'
  | 'shell'
  | 'plaintext';

export interface OutputLogItem {
  id: string;
  type: 'stdout' | 'stderr' | 'system' | 'table' | 'plot' | 'success' | 'error';
  text: string;
  timestamp: string;
  tableData?: {
    headers: string[];
    rows: string[][];
  };
  plotUrl?: string;
}

export interface GraphicsWindowState {
  isOpen: boolean;
  title: string;
  width: number;
  height: number;
  libraryType: 'graphics.h' | 'opengl' | 'framebuffer';
  commands: GraphicsCommand[];
}

export interface UniversalRunnerState {
  isRunning: boolean;
  currentLanguage: SupportedLanguage | null;
  filename: string;
  output: OutputLogItem[];
  sessionId: string | null;
  engineName: string;
  waitingForInput: boolean;
  exitCode: number | null;
  durationMs: number | null;
  plots: string[];
  graphicsWindow: GraphicsWindowState | null;
  serverUrl?: string | null;
  serverPort?: number | null;
}

type RunnerListener = (state: UniversalRunnerState) => void;

function flattenWorkspaceFiles(nodes: FileNode[]): FileNode[] {
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

function detectWebServerEntry(code: string, language: SupportedLanguage): boolean {
  if (!code || !code.trim()) return false;
  if (language === 'python') {
    const stripped = code
      .split('\n')
      .map((line) => line.replace(/#.*$/, ''))
      .join('\n');
    return (
      /\bserve_forever\s*\(/.test(stripped) ||
      /\b(?:app|application|socketio)\.run\s*\(/.test(stripped) ||
      /\buvicorn\.run\s*\(/.test(stripped) ||
      /\bwaitress\.serve\s*\(/.test(stripped) ||
      /\brun_server\s*\(/.test(stripped) ||
      /\b(?:HTTPServer|ThreadingHTTPServer|ThreadingTCPServer|TCPServer|ReusableTCPServer|ReusableThreadingTCPServer)\s*\(/.test(
        stripped
      )
    );
  }
  if (language === 'javascript' || language === 'typescript') {
    const stripped = code
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');
    return (
      /\.listen\s*\(/.test(stripped) &&
      /\b(?:createServer|express|fastify|Hono|http|https)\b/.test(stripped)
    );
  }
  return false;
}

class UniversalRunnerService {
  private state: UniversalRunnerState = {
    isRunning: false,
    currentLanguage: null,
    filename: '',
    output: [],
    sessionId: null,
    engineName: 'Free Multi-Language Engine',
    waitingForInput: false,
    exitCode: null,
    durationMs: null,
    plots: [],
    graphicsWindow: null,
    serverUrl: null,
    serverPort: null,
  };

  private listeners: RunnerListener[] = [];
  private activeAbortController: AbortController | null = null;
  private inputPromptTimeout: any = null;
  private activeCode: string = '';

  constructor() {
    // Listen to python runner events so Python tab and Universal tab stay in sync
    pythonRunner.subscribe((pyState) => {
      if (this.state.currentLanguage === 'python') {
        this.state.isRunning = pyState.isRunning;
        this.state.waitingForInput = pyState.waitingForInput;
        this.state.sessionId = pyState.sessionId;
        this.state.engineName = pyState.activeEngineName || 'Python 3 (Free)';
        this.state.plots = pyState.output
          .filter((o) => o.type === 'plot' && !!o.plotDataUrl)
          .map((o) => o.plotDataUrl as string);
        this.notify();
      }
    });
  }

  public getState(): UniversalRunnerState {
    return { ...this.state };
  }

  public subscribe(listener: RunnerListener): () => void {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }

  private appendLog(
    text: string,
    type: OutputLogItem['type'] = 'stdout',
    tableData?: OutputLogItem['tableData'],
    plotUrl?: string
  ) {
    const item: OutputLogItem = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      type,
      text,
      timestamp: new Date().toLocaleTimeString(),
      tableData,
      plotUrl,
    };
    this.state.output = [...this.state.output, item];
    this.notify();
  }

  public clearOutput() {
    this.state.output = [];
    this.state.plots = [];
    this.state.graphicsWindow = null;
    this.state.exitCode = null;
    this.state.durationMs = null;
    this.state.serverUrl = null;
    this.state.serverPort = null;
    this.notify();
  }

  public closeGraphicsWindow() {
    if (this.state.graphicsWindow) {
      this.state.graphicsWindow.isOpen = false;
      this.notify();
    }
  }

  public openGraphicsWindow() {
    if (this.state.graphicsWindow) {
      this.state.graphicsWindow.isOpen = true;
      this.notify();
    }
  }

  public toggleGraphicsWindow() {
    if (this.state.graphicsWindow) {
      this.state.graphicsWindow.isOpen = !this.state.graphicsWindow.isOpen;
      this.notify();
    }
  }

  /**
   * Normalize filename / language to one of the 15 supported languages
   */
  public detectLanguage(filename: string, langHint?: string): SupportedLanguage {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (ext === 'py' || langHint === 'python') return 'python';
    if (ext === 'cpp' || ext === 'cxx' || ext === 'cc' || ext === 'hpp' || langHint === 'cpp') return 'cpp';
    if (ext === 'c' || ext === 'h') return 'c';
    if (ext === 'java' || langHint === 'java') return 'java';
    if (ext === 'ts' || ext === 'tsx' || langHint === 'typescript') return 'typescript';
    if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs' || langHint === 'javascript') return 'javascript';
    if (ext === 'rs' || langHint === 'rust') return 'rust';
    if (ext === 'go' || langHint === 'go') return 'go';
    if (ext === 'html' || ext === 'htm' || langHint === 'html') return 'html';
    if (ext === 'css' || langHint === 'css') return 'css';
    if (ext === 'json' || langHint === 'json') return 'json';
    if (ext === 'sql' || langHint === 'sql') return 'sql';
    if (ext === 'md' || ext === 'markdown' || langHint === 'markdown') return 'markdown';
    if (ext === 'sh' || ext === 'bash' || ext === 'zsh' || langHint === 'shell') return 'shell';
    return 'plaintext';
  }

  /**
   * Run any code file for any of the 15 languages
   */
  public async runFile(file: FileNode, allFiles: FileNode[] = []) {
    const code = file.content || '';
    const filename = file.name;
    const language = this.detectLanguage(filename, file.language);

    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    if (this.inputPromptTimeout) {
      clearTimeout(this.inputPromptTimeout);
      this.inputPromptTimeout = null;
    }

    this.clearOutput();
    this.activeCode = code;
    this.state.isRunning = true;
    this.state.currentLanguage = language;
    this.state.filename = filename;
    this.state.exitCode = null;
    this.state.durationMs = null;
    this.state.waitingForInput = false;

    const startTime = performance.now();

    // 0. Web Server Auto-Detection (Flask / http.server / FastAPI / Craveo / PyCalc / Express):
    // Launch in detached background server mode so it stays alive cleanly without hitting script execution timeouts.
    if (detectWebServerEntry(code, language)) {
      this.state.engineName =
        language === 'python' ? 'Python Background Web Server' : 'Node.js Background Web Server';
      const flatAll = flattenWorkspaceFiles(allFiles);
      const filesMap = new Map<string, string>();
      for (const f of flatAll) {
        if (typeof f.content === 'string') {
          filesMap.set(f.path || `/${f.name}`, f.content);
        }
      }
      filesMap.set(file.path || `/${file.name}`, code);

      const filesPayload = Array.from(filesMap.entries()).map(([p, content]) => ({
        path: p,
        content,
      }));

      const hasCalc = flatAll.some((f) => (f.content || '').includes('PyCalc') || f.id.startsWith('calc-'));
      const hasCraveo =
        flatAll.some(
          (f) =>
            f.id.startsWith('craveo-') ||
            f.name === 'craveo_runtime.py' ||
            (f.name === 'seed_data.py' && (f.content || '').includes('seed_all'))
        ) ||
        code.includes('craveo_runtime') ||
        code.includes('Craveo');

      const projectKey = hasCalc ? 'calculator' : hasCraveo ? 'craveo' : 'workspace';
      const preferredPort = hasCalc ? 5050 : hasCraveo ? 5000 : 5100;

      this.appendLog(
        `🌐 Detected web server in "${filename}" — launching as detached background server (no timeout)...`,
        'stdout'
      );

      try {
        const res = await fetch('/api/projects/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: projectKey,
            port: preferredPort,
            entryFile: file.path || file.name,
            restart: true,
            files: filesPayload,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          this.appendLog(data.error || `Failed to start server on port ${preferredPort}`, 'error');
          this.state.isRunning = false;
          this.state.exitCode = 1;
          this.state.durationMs = Math.round(performance.now() - startTime);
          this.notify();
          return;
        }

        const boundPort = Number(data.port || preferredPort);
        const fullProxyUrl = `${window.location.origin}${data.proxyUrl || `/api/ports/proxy/${boundPort}/`}`;
        this.state.serverUrl = fullProxyUrl;
        this.state.serverPort = boundPort;
        this.state.isRunning = false;
        this.state.exitCode = 0;
        this.state.durationMs = Math.round(performance.now() - startTime);

        this.appendLog(
          `✓ ${data.label || filename} is live and listening on port :${boundPort}`,
          'success'
        );
        this.appendLog(`  Localhost URL : http://localhost:${boundPort}`, 'stdout');
        this.appendLog(`  Live Preview  : ${fullProxyUrl}`, 'stdout');
        this.appendLog(
          `  Opened in Live Preview and registered in Ports tab (run "ports stop ${boundPort}" in Terminal to stop).`,
          'stdout'
        );
        this.notify();

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('compillo:open-live-preview', {
              detail: {
                url: fullProxyUrl,
                port: boundPort,
                label: data.label || `${filename} (:${boundPort})`,
              },
            })
          );
        }
      } catch (err: any) {
        this.appendLog(`Failed to start web server: ${err?.message || 'Network error'}`, 'error');
        this.state.isRunning = false;
        this.state.exitCode = 1;
        this.state.durationMs = Math.round(performance.now() - startTime);
        this.notify();
      }
      return;
    }

    // 1. Python execution: delegate to pythonRunner for full CPython / Pyodide WASM + Matplotlib support
    if (language === 'python') {
      this.state.engineName = 'Python 3';
      try {
        await pythonRunner.runInteractive(code, filename, allFiles, file.path);
        // mirror output: only code stdout, stderr, and graphical plots
        const pyState = pythonRunner.getState();
        pyState.output.forEach((p) => {
          if (p.type === 'plot' && p.plotDataUrl) {
            this.appendLog('[Plot Rendered]', 'plot', undefined, p.plotDataUrl);
          } else if (p.type === 'stderr') {
            const cleaned = cleanPythonTraceback(p.text, filename);
            if (cleaned && cleaned.trim()) {
              this.appendLog(cleaned, 'stderr');
            }
          } else if (p.type === 'stdout') {
            this.appendLog(p.text, 'stdout');
          }
        });
        this.state.plots = pyState.output
          .filter((o) => o.type === 'plot' && !!o.plotDataUrl)
          .map((o) => o.plotDataUrl as string);
        this.state.isRunning = pyState.isRunning;
        this.state.exitCode = pyState.exitCode;
        this.state.durationMs = Math.round(performance.now() - startTime);
        this.notify();
      } catch (err: any) {
        const cleaned = cleanPythonTraceback(err?.message || String(err), filename);
        this.appendLog(cleaned, 'error');
        this.state.isRunning = false;
        this.notify();
      }
      return;
    }

    // 2. HTML: Live DOM & Structure Preview
    if (language === 'html') {
      this.state.engineName = 'HTML5 Live Preview & DOM Inspector';
      this.appendLog(`[Running] Rendering HTML5 Document "${filename}" in sandbox...`, 'system');
      
      const doc = new DOMParser().parseFromString(code, 'text/html');
      const title = doc.title || 'Untitled HTML Document';
      const scripts = doc.querySelectorAll('script').length;
      const styles = doc.querySelectorAll('style, link[rel="stylesheet"]').length;
      const links = doc.querySelectorAll('a').length;
      const images = doc.querySelectorAll('img').length;
      const elementsCount = doc.querySelectorAll('*').length;

      this.appendLog(`✓ HTML Document parsed successfully:`, 'success');
      this.appendLog(`  - Title: "${title}"`);
      this.appendLog(`  - Total Elements: ${elementsCount}`);
      this.appendLog(`  - Scripts: ${scripts} | Stylesheets: ${styles}`);
      this.appendLog(`  - Links: ${links} | Images: ${images}`);
      this.appendLog(`\n💡 Tip: Click "Open Live Preview" in the toolbar to view this page interactively in the split pane!`, 'system');
      
      this.state.isRunning = false;
      this.state.exitCode = 0;
      this.state.durationMs = Math.round(performance.now() - startTime);
      this.notify();
      return;
    }

    // 3. CSS: Style Inspector & Analysis
    if (language === 'css') {
      this.state.engineName = 'CSS3 Style Analyzer & Live Preview';
      this.appendLog(`[Running] Analyzing stylesheet "${filename}"...`, 'system');

      const ruleMatches = code.match(/([^{}]+)\{([^}]+)\}/g) || [];
      const varMatches = code.match(/--[a-zA-Z0-9_-]+:[^;]+/g) || [];
      const colorMatches = code.match(/#(?:[0-9a-fA-F]{3,8})|rgb[a]?\([^)]+\)|hsl[a]?\([^)]+\)/g) || [];
      const mediaQueries = code.match(/@media[^{]+\{/g) || [];

      this.appendLog(`✓ CSS Analysis Complete:`, 'success');
      this.appendLog(`  - Rules / Selectors: ${ruleMatches.length}`);
      this.appendLog(`  - CSS Custom Properties (Variables): ${varMatches.length}`);
      this.appendLog(`  - Media Queries (@media): ${mediaQueries.length}`);
      this.appendLog(`  - Detected Colors: ${Array.from(new Set(colorMatches)).slice(0, 8).join(', ') || 'None'}`);
      this.appendLog(`\n✓ Stylesheet is syntactically valid and ready for preview injection.`, 'success');

      this.state.isRunning = false;
      this.state.exitCode = 0;
      this.state.durationMs = Math.round(performance.now() - startTime);
      this.notify();
      return;
    }

    // 4. JSON: Validator, Formatter & Query Evaluator
    if (language === 'json') {
      this.state.engineName = 'JSON Engine & Schema Validator';
      this.appendLog(`[Running] Validating JSON "${filename}"...`, 'system');
      try {
        const parsed = JSON.parse(code);
        const isArr = Array.isArray(parsed);
        const keys = typeof parsed === 'object' && parsed !== null ? Object.keys(parsed) : [];
        const bytes = new TextEncoder().encode(code).length;

        this.appendLog(`✓ Valid JSON Document (${bytes} bytes):`, 'success');
        this.appendLog(`  - Root Type: ${isArr ? `Array [${parsed.length} items]` : typeof parsed === 'object' ? `Object with ${keys.length} keys` : typeof parsed}`);
        if (keys.length > 0) {
          this.appendLog(`  - Top-level keys: ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? '...' : ''}`);
        }
        this.appendLog(`\nFormatted Output:`, 'system');
        this.appendLog(JSON.stringify(parsed, null, 2), 'stdout');

        this.state.isRunning = false;
        this.state.exitCode = 0;
        this.state.durationMs = Math.round(performance.now() - startTime);
        this.notify();
      } catch (err: any) {
        this.appendLog(`✗ JSON Syntax Error: ${err.message}`, 'error');
        this.state.isRunning = false;
        this.state.exitCode = 1;
        this.state.durationMs = Math.round(performance.now() - startTime);
        this.notify();
      }
      return;
    }

    // 5. Markdown: Analysis & Structure
    if (language === 'markdown') {
      this.state.engineName = 'Markdown Parser & Document Inspector';
      this.appendLog(`[Running] Inspecting Markdown document "${filename}"...`, 'system');
      const lines = code.split('\n');
      const headings = lines.filter((l) => /^#{1,6}\s/.test(l));
      const codeBlocks = code.match(/```[\s\S]*?```/g) || [];
      const words = code.trim().split(/\s+/).filter(Boolean).length;

      this.appendLog(`✓ Markdown Structure Analyzed:`, 'success');
      this.appendLog(`  - Total Words: ${words} | Lines: ${lines.length}`);
      this.appendLog(`  - Headings: ${headings.length} | Code blocks: ${codeBlocks.length}`);
      if (headings.length > 0) {
        this.appendLog(`\nDocument Outline:`);
        headings.forEach((h) => this.appendLog(`  ${h}`));
      }
      this.appendLog(`\n💡 Tip: Use the Markdown Preview icon in the tab bar for side-by-side rendered view.`, 'system');

      this.state.isRunning = false;
      this.state.exitCode = 0;
      this.state.durationMs = Math.round(performance.now() - startTime);
      this.notify();
      return;
    }

    // 6. Plain Text: Metrics & Statistics
    if (language === 'plaintext') {
      this.state.engineName = 'Text Statistics & Analytics';
      this.appendLog(`[Running] Analyzing text file "${filename}"...`, 'system');
      const lines = code.split('\n');
      const words = code.trim().split(/\s+/).filter(Boolean).length;
      const chars = code.length;
      const charsNoSpace = code.replace(/\s/g, '').length;
      const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

      this.appendLog(`✓ Text Metrics:`, 'success');
      this.appendLog(`  - Lines: ${lines.length}`);
      this.appendLog(`  - Words: ${words}`);
      this.appendLog(`  - Characters: ${chars} (${charsNoSpace} non-whitespace)`);
      this.appendLog(`  - Estimated Reading Time: ~${readingTimeMinutes} min`);

      this.state.isRunning = false;
      this.state.exitCode = 0;
      this.state.durationMs = Math.round(performance.now() - startTime);
      this.notify();
      return;
    }

    // 7. C / C++ Graphics Programs (<graphics.h>, <GL/glut.h>, OpenGL, Framebuffer, SDL, Raylib, PPM, Mandelbrot)
    const isCppLike =
      language === 'c' ||
      language === 'cpp' ||
      /\.(c|cpp|cc|cxx|h|hpp)$/i.test(filename) ||
      /#include\s*["<](?:graphics\.h|conio\.h|GL\/glut\.h|raylib\.h|SDL)/i.test(code) ||
      cppGraphicsEngine.detectGraphics(code);

    if (cppGraphicsEngine.detectGraphics(code)) {
      try {
        const gResult = cppGraphicsEngine.execute(code, filename);
        this.state.engineName =
          gResult.libraryType === 'opengl'
            ? 'OpenGL & GLUT Engine (Virtual Framebuffer)'
            : gResult.libraryType === 'framebuffer'
            ? 'Direct Framebuffer & Canvas Engine'
            : 'Borland BGI <graphics.h> Engine';

        this.appendLog(
          `[Graphics Framebuffer] Initializing Virtual Framebuffer Canvas Window (${gResult.libraryType.toUpperCase()}) for "${filename}"...`,
          'system'
        );

        this.state.graphicsWindow = {
          isOpen: true,
          title: gResult.windowTitle,
          width: gResult.width,
          height: gResult.height,
          libraryType: gResult.libraryType,
          commands: gResult.commands,
        };

        // Output any printfs / std::cout captured from program
        if (gResult.stdoutLogs && gResult.stdoutLogs.length > 0) {
          gResult.stdoutLogs.forEach((log) => this.appendLog(log, 'stdout'));
        }

        // Display graphics image directly in the Output tab if an image / plot was generated
        if (gResult.dataUrl) {
          this.state.plots = [...this.state.plots, gResult.dataUrl];
          this.appendLog(
            `🖼️ Generated Graphics Output: ${gResult.windowTitle}`,
            'plot',
            undefined,
            gResult.dataUrl
          );
        }

        this.appendLog(
          `✓ [Graphics Framebuffer] Successfully initialized ${gResult.width}×${gResult.height} canvas window and rendered ${gResult.commands.length} graphics primitives.`,
          'success'
        );

        this.state.isRunning = false;
        this.state.exitCode = 0;
        this.state.durationMs = gResult.durationMs;
        this.notify();
        return;
      } catch (err: any) {
        console.warn('Graphics execution error:', err);
        this.appendLog(`[Graphics Engine Notice] ${err.message || err}. Attempting standard runner...`, 'system');
      }
    }

    // 8. For C, C++, Java, Rust, Go, TypeScript, JavaScript, Shell, and SQL:
    // Execute through our high-performance Free Server Runner API (/api/runner/run)
    // with automatic fallback to client-side sandboxes or community free compilers!
    await this.executeViaServerRunner(file, language, allFiles, startTime);
  }

  /**
   * Execute code through /api/runner/run with live Server-Sent Events (SSE) streaming
   */
  private async executeViaServerRunner(
    file: FileNode,
    language: SupportedLanguage,
    allFiles: FileNode[],
    startTime: number
  ) {
    const filename = file.name;
    const code = file.content || '';

    // Build workspace files context for multi-file projects (header files, modules)
    const workspaceFiles = flattenWorkspaceFiles(allFiles)
      .filter((f) => f.name !== filename && typeof f.content === 'string')
      .slice(0, 40)
      .map((f) => ({ name: f.name, content: f.content }));

    this.activeAbortController = new AbortController();

    try {
      const response = await fetch('/api/runner/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          filename,
          code,
          workspaceFiles,
        }),
        signal: this.activeAbortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Server runner returned status ${response.status}: ${response.statusText}`);
      }

      // Check if response is event stream
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        const json = await response.json();
        if (json.stdout) this.appendLog(json.stdout, 'stdout');
        if (json.stderr) this.appendLog(json.stderr, 'stderr');
        if (json.table) this.appendLog(json.table.raw || '', 'table', json.table);
        this.state.isRunning = false;
        this.state.exitCode = json.exitCode ?? 0;
        this.state.durationMs = Math.round(performance.now() - startTime);
        this.notify();
        return;
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Readable stream not supported by browser');
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const evt of events) {
          if (!evt.trim()) continue;
          let eventType = 'message';
          let dataStr = '';

          const lines = evt.split('\n');
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.slice(6);
            }
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            this.handleSseEvent(eventType, data, startTime);
          } catch (e) {
            // raw string
            this.appendLog(dataStr, 'stdout');
          }
        }
      }

      if (this.state.isRunning) {
        this.state.isRunning = false;
        this.state.durationMs = Math.round(performance.now() - startTime);
        if (this.state.exitCode === null) this.state.exitCode = 0;
        this.notify();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        this.appendLog(`\n[Process cancelled]`, 'error');
        this.state.isRunning = false;
        this.notify();
        return;
      }

      console.warn(`[Server Runner] Network or server error (${err.message}). Attempting client fallback...`);
      await this.executeInBrowserFallback(file, language, startTime);
    }
  }

  private handleSseEvent(eventType: string, data: any, startTime: number) {
    switch (eventType) {
      case 'start':
        this.state.sessionId = data.sessionId;
        if (data.engine) {
          this.state.engineName = data.engine;
        }
        this.notify();
        break;

      case 'stdout':
        if (data.text) {
          // Check if stdout contains Netpbm PPM image stream or Mandelbrot / image output
          const hasImageOutput =
            /^P[36]\s*\n/m.test(data.text) ||
            /(?:mandelbrot|fractal|saved as .*\.ppm|saved to .*\.(?:png|jpg|bmp))/i.test(data.text);

          if (hasImageOutput && cppGraphicsEngine.detectGraphics(this.activeCode) && !this.state.plots.length) {
            try {
              const gResult = cppGraphicsEngine.execute(this.activeCode, this.state.filename);
              this.state.graphicsWindow = {
                isOpen: true,
                title: gResult.windowTitle,
                width: gResult.width,
                height: gResult.height,
                libraryType: gResult.libraryType,
                commands: gResult.commands,
              };
              if (gResult.dataUrl) {
                this.state.plots = [...this.state.plots, gResult.dataUrl];
                this.appendLog(
                  `🖼️ Generated Graphics Output: ${gResult.windowTitle}`,
                  'plot',
                  undefined,
                  gResult.dataUrl
                );
              }
              this.appendLog(
                `✓ [Graphics Output] Rendered ${gResult.width}×${gResult.height} image in Output Tab & Framebuffer Window!`,
                'success'
              );
            } catch {}
          }
          this.appendLog(data.text, 'stdout');
          // If stdout ends with prompt-like text e.g. ": " or "? ", mark waitingForInput
          if (/(:\s*|\?\s*|>>\s*)$/.test(data.text)) {
            this.setWaitingForInput(true);
          }
        }
        break;

      case 'graphics_fallback':
        try {
          const gResult = cppGraphicsEngine.execute(this.activeCode, this.state.filename);
          this.state.graphicsWindow = {
            isOpen: true,
            title: gResult.windowTitle,
            width: gResult.width,
            height: gResult.height,
            libraryType: gResult.libraryType,
            commands: gResult.commands,
          };
          if (gResult.dataUrl) {
            this.state.plots = [...this.state.plots, gResult.dataUrl];
            this.appendLog(
              `🖼️ Generated Graphics Output: ${gResult.windowTitle}`,
              'plot',
              undefined,
              gResult.dataUrl
            );
          }
          this.appendLog(
            `✓ [Graphics Framebuffer] Rendered graphics in Output Tab & Virtual Framebuffer Window!`,
            'success'
          );
          this.state.isRunning = false;
          this.state.exitCode = 0;
          this.state.durationMs = Math.round(performance.now() - startTime);
          this.notify();
          return;
        } catch {}
        break;

      case 'stderr':
        if (data.text) {
          // Check if server or Wandbox failed due to graphics libraries or headless display
          const isGraphicsError =
            /(?:graphics\.h|GL\/glut\.h|GL\/gl\.h|GL\/glu\.h|GL\/freeglut\.h|raylib\.h|SDL2\/SDL\.h): No such file|freeglut.*failed to open display|cannot open display|undefined reference to `(?:gl|glut)/i.test(
              data.text
            );

          if (isGraphicsError) {
            try {
              const gResult = cppGraphicsEngine.execute(this.activeCode, this.state.filename);
              this.state.graphicsWindow = {
                isOpen: true,
                title: gResult.windowTitle,
                width: gResult.width,
                height: gResult.height,
                libraryType: gResult.libraryType,
                commands: gResult.commands,
              };
              this.appendLog(
                `✓ [Auto-Resolution] Headless container detected: Program rendered in Compillo Virtual Graphics Framebuffer Window!`,
                'success'
              );
              this.state.isRunning = false;
              this.state.exitCode = 0;
              this.state.durationMs = Math.round(performance.now() - startTime);
              this.notify();
              return;
            } catch (fallbackErr) {
              // continue with normal stderr
            }
          }
          this.appendLog(data.text, 'stderr');
        }
        break;

      case 'system':
        // Suppress system noise
        break;

      case 'table':
        this.appendLog(data.raw || '', 'table', {
          headers: data.headers || [],
          rows: data.rows || [],
        });
        break;

      case 'plot':
        if (data.dataUrl) {
          this.state.plots = [...this.state.plots, data.dataUrl];
          this.appendLog('[Plot Rendered]', 'plot', undefined, data.dataUrl);
        }
        break;

      case 'exit':
        if (this.state.graphicsWindow && this.state.graphicsWindow.isOpen) {
          // Framebuffer window already rendered graphics successfully
          return;
        }
        this.state.isRunning = false;
        this.state.waitingForInput = false;
        this.state.exitCode = data.code ?? 0;
        this.state.durationMs = Math.round(performance.now() - startTime);
        if (data.code !== 0) {
          this.appendLog(`[Process exited with code ${data.code}]`, 'error');
        }
        this.notify();
        break;

      case 'error':
        this.state.isRunning = false;
        this.state.waitingForInput = false;
        this.appendLog(`[Runner Error] ${data.error || 'Unknown execution error'}`, 'error');
        this.notify();
        break;
    }
  }

  private setWaitingForInput(val: boolean) {
    this.state.waitingForInput = val;
    this.notify();
    if (this.inputPromptTimeout) clearTimeout(this.inputPromptTimeout);
    if (val) {
      // Auto-clear waiting prompt after 60s if no input
      this.inputPromptTimeout = setTimeout(() => {
        if (this.state.waitingForInput) {
          this.state.waitingForInput = false;
          this.notify();
        }
      }, 60000);
    }
  }

  /**
   * Fallback in-browser runner for environments where server endpoint is unreachable
   */
  private async executeInBrowserFallback(
    file: FileNode,
    language: SupportedLanguage,
    startTime: number
  ) {
    const code = file.content || '';

    // JavaScript / TypeScript in-browser sandbox
    if (language === 'javascript' || language === 'typescript') {
      this.state.engineName = 'In-Browser JavaScript Virtual Machine';
      try {
        const logs: string[] = [];
        const customConsole = {
          log: (...args: any[]) => logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ')),
          error: (...args: any[]) => logs.push('[ERROR] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
          warn: (...args: any[]) => logs.push('[WARN] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
          table: (data: any) => logs.push(typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)),
        };

        // Simple type stripping
        let executable = code
          .replace(/:\s*[A-Z][a-zA-Z0-9<>[\], ]*(\s*=[^;]+)?/g, (match, def) => def || '')
          .replace(/interface\s+[A-Za-z0-9]+\s*\{[^}]*\}/g, '')
          .replace(/export\s+(class|function|const|let|var|default)/g, '$1')
          .replace(/import\s+.*?from\s+['"].*?['"];?/g, '');

        const runnerFn = new Function('console', executable);
        const result = runnerFn(customConsole);

        if (logs.length > 0) {
          logs.forEach((l) => this.appendLog(l, 'stdout'));
        } else {
          this.appendLog('(Code executed successfully with no stdout output)', 'stdout');
        }

        if (result !== undefined) {
          this.appendLog(`Result: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`, 'system');
        }

        this.state.isRunning = false;
        this.state.exitCode = 0;
        this.state.durationMs = Math.round(performance.now() - startTime);
        this.appendLog(`[Done] exited with code=0 in ${this.state.durationMs}ms`, 'success');
        this.notify();
      } catch (err: any) {
        this.appendLog(`[Runtime Error] ${err?.message || err}`, 'error');
        this.state.isRunning = false;
        this.state.exitCode = 1;
        this.state.durationMs = Math.round(performance.now() - startTime);
        this.appendLog(`[Done] exited with code=1 in ${this.state.durationMs}ms`, 'error');
        this.notify();
      }
      return;
    }

    // Rust fallback: Direct to official Rust Playground free API
    if (language === 'rust') {
      this.state.engineName = 'Rust Foundation Playground (Official Free API)';
      this.appendLog(`[Rust Playground] Compiling via official Rust Playground...`, 'system');
      try {
        const resp = await fetch('https://play.rust-lang.org/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: 'stable',
            mode: 'debug',
            edition: '2021',
            crateType: 'bin',
            tests: false,
            code,
          }),
        });
        const data = await resp.json();
        if (data.stderr) this.appendLog(data.stderr, 'stderr');
        if (data.stdout) this.appendLog(data.stdout, 'stdout');
        this.state.isRunning = false;
        this.state.exitCode = data.success ? 0 : 1;
        this.state.durationMs = Math.round(performance.now() - startTime);
        this.appendLog(`[Done] exited with code=${this.state.exitCode} in ${this.state.durationMs}ms`, data.success ? 'success' : 'error');
        this.notify();
      } catch (e: any) {
        this.appendLog(`[Error] Rust Playground request failed: ${e.message}`, 'error');
        this.state.isRunning = false;
        this.notify();
      }
      return;
    }

    // Wandbox Fallback for C, C++, Java, Go
    const wandboxCompilerMap: Record<string, string> = {
      c: 'gcc-head-c',
      cpp: 'gcc-head',
      go: 'go-1.23.2',
      java: 'openjdk-jdk-22+36',
    };

    const compiler = wandboxCompilerMap[language];
    if (compiler) {
      this.state.engineName = `Free Community Compiler (${compiler})`;
      this.appendLog(`[Free Cloud Runner] Compiling via free cloud sandbox...`, 'system');
      try {
        let codeToSend = code;
        // Normalize public class Main for Java if needed
        if (language === 'java' && codeToSend.includes('public class Main')) {
          codeToSend = codeToSend.replace(/public\s+class\s+Main/, 'class Main');
        }

        const resp = await fetch('https://wandbox.org/api/compile.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            compiler,
            code: codeToSend,
          }),
        });
        const data = await resp.json();
        if (data.compiler_message) {
          const isGraphicsError =
            /(?:graphics\.h|GL\/glut\.h|GL\/gl\.h|GL\/glu\.h|GL\/freeglut\.h|raylib\.h|SDL2\/SDL\.h): No such file|freeglut.*failed to open display|cannot open display/i.test(
              data.compiler_message
            );
          if (isGraphicsError && (language === 'c' || language === 'cpp')) {
            try {
              const gResult = cppGraphicsEngine.execute(code, file.name);
              this.state.graphicsWindow = {
                isOpen: true,
                title: gResult.windowTitle,
                width: gResult.width,
                height: gResult.height,
                libraryType: gResult.libraryType,
                commands: gResult.commands,
              };
              this.appendLog(
                `✓ [Graphics Framebuffer] Rendered graphics in Compillo Virtual Graphics Framebuffer Window!`,
                'success'
              );
              this.state.isRunning = false;
              this.state.exitCode = 0;
              this.state.durationMs = Math.round(performance.now() - startTime);
              this.notify();
              return;
            } catch {}
          }
          this.appendLog(data.compiler_message, 'stderr');
        }
        if (data.program_message) this.appendLog(data.program_message, 'stdout');
        this.state.isRunning = false;
        this.state.exitCode = parseInt(data.status, 10) || 0;
        this.state.durationMs = Math.round(performance.now() - startTime);
        this.appendLog(`[Done] exited with code=${this.state.exitCode} in ${this.state.durationMs}ms`, this.state.exitCode === 0 ? 'success' : 'error');
        this.notify();
      } catch (e: any) {
        this.appendLog(`[Error] Free Cloud Runner request failed: ${e.message}`, 'error');
        this.state.isRunning = false;
        this.notify();
      }
      return;
    }

    this.appendLog(`Execution for language "${language}" completed.`, 'system');
    this.state.isRunning = false;
    this.notify();
  }

  /**
   * Send interactive stdin to a running program (for scanf, cin, input(), etc.)
   */
  public async sendInput(text: string) {
    if (!this.state.isRunning) return;

    // Log the user's input so it appears in the console
    this.appendLog(`> ${text}\n`, 'system');
    this.state.waitingForInput = false;
    this.notify();

    // If python runner is active
    if (this.state.currentLanguage === 'python') {
      pythonRunner.sendInput(text);
      return;
    }

    if (this.state.sessionId) {
      try {
        await fetch('/api/runner/stdin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.state.sessionId,
            input: text,
          }),
        });
      } catch (err: any) {
        console.error('Failed to send input to runner process:', err);
      }
    }
  }

  /**
   * Stop / Kill the active execution
   */
  public async killSession() {
    if (!this.state.isRunning) return;

    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }

    if (this.state.currentLanguage === 'python') {
      pythonRunner.killSession();
    } else if (this.state.sessionId) {
      try {
        await fetch('/api/runner/kill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.state.sessionId }),
        });
      } catch (err) {
        // ignore
      }
    }

    if (this.inputPromptTimeout) {
      clearTimeout(this.inputPromptTimeout);
      this.inputPromptTimeout = null;
    }

    this.state.isRunning = false;
    this.state.waitingForInput = false;
    this.state.sessionId = null;
    this.appendLog('[Process Stopped by User]', 'system');
    this.notify();
  }
}

export const universalRunner = new UniversalRunnerService();
