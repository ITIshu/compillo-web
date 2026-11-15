/**
 * Pyodide WebAssembly Python Engine
 * Provides 100% in-browser Python execution with full NumPy, Matplotlib,
 * and scientific package support. Guarantees that the Python IDE works
 * in published Cloud Run instances, shared builds, and offline-capable environments
 * where a system Python binary is not installed in the container image.
 */

declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<any>;
    __compillo_pyodide?: any;
    __compillo_pyodide_loading?: Promise<any>;
  }
}

export interface PyodideRunOptions {
  code: string;
  filename?: string;
  workspaceFiles?: Array<{ name: string; content: string }>;
  onStdout: (text: string) => void;
  onStderr: (text: string) => void;
  onSystem: (text: string) => void;
  onPlot: (dataUrl: string) => void;
  onProgress?: (message: string) => void;
}

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

/**
 * Loads the Pyodide WebAssembly runtime script dynamically and initializes the engine.
 */
export async function getPyodideEngine(
  onProgress?: (msg: string) => void
): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('Pyodide is only supported in browser environments');
  }

  if (window.__compillo_pyodide) {
    return window.__compillo_pyodide;
  }

  if (window.__compillo_pyodide_loading) {
    return window.__compillo_pyodide_loading;
  }

  window.__compillo_pyodide_loading = (async () => {
    // 1. Inject script if not already present
    if (!window.loadPyodide) {
      onProgress?.('Downloading WebAssembly Python (Pyodide 0.26)...');
      await new Promise<void>((resolve, reject) => {
        const existingScript = document.querySelector('script[src*="pyodide.js"]');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', () => reject(new Error('Failed to load Pyodide script')));
          return;
        }

        const script = document.createElement('script');
        script.src = `${PYODIDE_CDN}pyodide.js`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Pyodide from CDN'));
        document.head.appendChild(script);
      });
    }

    // 2. Initialize runtime
    onProgress?.('Initializing Python 3.11 WebAssembly runtime...');
    if (!window.loadPyodide) {
      throw new Error('window.loadPyodide not found after script load');
    }

    const pyodide = await window.loadPyodide({
      indexURL: PYODIDE_CDN,
    });

    window.__compillo_pyodide = pyodide;
    return pyodide;
  })();

  try {
    return await window.__compillo_pyodide_loading;
  } finally {
    window.__compillo_pyodide_loading = undefined;
  }
}

/**
 * Executes a Python script inside the Pyodide WebAssembly sandbox.
 */
export async function runPythonWithPyodide(options: PyodideRunOptions): Promise<{ exitCode: number }> {
  const {
    code,
    filename = 'main.py',
    workspaceFiles = [],
    onStdout,
    onStderr,
    onSystem,
    onPlot,
    onProgress,
  } = options;

  let pyodide: any;
  try {
    pyodide = await getPyodideEngine((msg) => {
      onProgress?.(msg);
    });
  } catch (err: any) {
    onStderr(`[Pyodide Load Error]: ${err?.message || err}\n`);
    return { exitCode: 1 };
  }

  // 1. Sync workspace files to Pyodide virtual filesystem
  if (Array.isArray(workspaceFiles) && workspaceFiles.length > 0) {
    for (const file of workspaceFiles) {
      try {
        if (file && file.name) {
          const safeName = file.name.startsWith('/') ? file.name.slice(1) : file.name;
          pyodide.FS.writeFile(safeName, file.content || '');
        }
      } catch (e) {
        // ignore non-critical virtual file write errors
      }
    }
  }

  // Write the main file
  try {
    pyodide.FS.writeFile(filename, code);
  } catch {
    // ignore
  }

  // 2. Automatically load packages from imports (e.g. numpy, matplotlib, pandas, etc.)
  try {
    const hasMatplotlib = /import\s+matplotlib|from\s+matplotlib/m.test(code);
    const hasNumpy = /import\s+numpy|from\s+numpy/m.test(code);
    const hasPandas = /import\s+pandas|from\s+pandas/m.test(code);
    const hasScipy = /import\s+scipy|from\s+scipy/m.test(code);

    const packagesToLoad: string[] = [];
    if (hasNumpy) packagesToLoad.push('numpy');
    if (hasMatplotlib) packagesToLoad.push('matplotlib');
    if (hasPandas) packagesToLoad.push('pandas');
    if (hasScipy) packagesToLoad.push('scipy');

    if (packagesToLoad.length > 0) {
      await pyodide.loadPackage(packagesToLoad);
    } else {
      // General import loader
      await pyodide.loadPackagesFromImports(code);
    }
  } catch (pkgErr: any) {
    // Suppress background package load notes from console output
    console.debug('Pyodide package load note:', pkgErr);
  }

  // 3. Configure Headless Matplotlib Interceptor for Graphical Plot Streaming
  try {
    const plotHookCode = `
import sys, io, base64

try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt

    def _compillo_wasm_show(*args, **kwargs):
        try:
            fig = plt.gcf()
            if fig is not None and len(fig.axes) > 0:
                buf = io.BytesIO()
                fig.savefig(buf, format='png', bbox_inches='tight', dpi=100)
                b64 = base64.b64encode(buf.getvalue()).decode('ascii')
                sys.stdout.write(f"\\n[COMPILLO_PLOT_IMAGE:data:image/png;base64,{b64}]\\n")
                sys.stdout.flush()
                plt.close(fig)
        except Exception as err:
            sys.stderr.write(f"Plot export note: {err}\\n")

    plt.show = _compillo_wasm_show
except Exception:
    pass
`;
    await pyodide.runPythonAsync(plotHookCode);
  } catch {
    // ignore
  }

  // 4. Setup output routing
  const handleRawText = (text: string) => {
    const plotMarker = '[COMPILLO_PLOT_IMAGE:';
    if (text.includes(plotMarker)) {
      const parts = text.split(plotMarker);
      for (let i = 0; i < parts.length; i++) {
        if (i === 0) {
          if (parts[i]) onStdout(parts[i]);
        } else {
          const closeIdx = parts[i].indexOf(']');
          if (closeIdx !== -1) {
            const dataUrl = parts[i].substring(0, closeIdx);
            const rest = parts[i].substring(closeIdx + 1);
            onPlot(dataUrl);
            if (rest) onStdout(rest);
          } else {
            onStdout(plotMarker + parts[i]);
          }
        }
      }
    } else {
      onStdout(text);
    }
  };

  pyodide.setStdout({
    batched: (text: string) => handleRawText(text + '\n'),
  });

  pyodide.setStderr({
    batched: (text: string) => {
      const cleaned = cleanPythonTraceback(text, filename);
      if (cleaned && cleaned.trim()) {
        onStderr(cleaned + '\n');
      }
    },
  });

  // Setup prompt stdin if code uses input()
  pyodide.setStdin({
    stdin: () => {
      const val = window.prompt('Python input():');
      return val !== null ? val : '';
    },
  });

  // 5. Execute user code
  try {
    try {
      await pyodide.runPythonAsync(code, { filename });
    } catch (runErr) {
      if (typeof runErr === 'object' && runErr && ('message' in (runErr as any) || 'stack' in (runErr as any))) {
        throw runErr;
      }
      await pyodide.runPythonAsync(code);
    }

    // After script ends, check if any unshown plots exist and render them
    try {
      const checkUnshownPlotsCode = `
try:
    import matplotlib.pyplot as plt
    if plt.get_fignums():
        plt.show()
except Exception:
    pass
`;
      await pyodide.runPythonAsync(checkUnshownPlotsCode);
    } catch {
      // ignore
    }

    return { exitCode: 0 };
  } catch (execErr: any) {
    const rawMsg = execErr?.message || String(execErr);
    const cleaned = cleanPythonTraceback(rawMsg, filename);
    onStderr(`${cleaned}\n`);
    return { exitCode: 1 };
  }
}

/**
 * Strips internal Pyodide runtime frames (_pyodide, _base.py, eval_code_async, CodeRunner, etc.)
 * from Python tracebacks so ONLY errors inside the user's program are shown.
 *
 * For SyntaxError/IndentationError/TabError:
 * Displays cleanly:
 *   File "main.py", line 22
 *     print("
 *           ^
 *   SyntaxError: unterminated string literal (detected at line 22)
 *
 * For runtime exceptions:
 * Displays standard clean Python traceback starting from user frames,
 * converting <exec> or <string> to the actual filename.
 */
export function cleanPythonTraceback(errorText: string, filename: string = 'main.py'): string {
  if (!errorText || typeof errorText !== 'string') return errorText;

  const rawText = errorText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  const hasTraceback = rawText.includes('Traceback (most recent call last):');
  const hasSyntaxError = /\b(SyntaxError|IndentationError|TabError):/.test(rawText);
  const hasPythonException = /[a-zA-Z_0-9.]+(?:Error|Exception|Warning|Interrupt|Exit):/.test(rawText);

  if (!hasTraceback && !hasSyntaxError && !hasPythonException) {
    return rawText;
  }

  // Handle chained exceptions: e.g. "During handling of the above exception..."
  const chainedPattern = /(\n\s*(?:During handling of the above exception, another exception occurred|The above exception was the direct cause of the following exception):\s*\n)/g;
  if (chainedPattern.test(rawText)) {
    const parts = rawText.split(chainedPattern);
    return parts
      .map((part) => {
        if (/During handling|The above exception/.test(part)) return part.trim();
        return cleanPythonTraceback(part, filename);
      })
      .join('\n\n')
      .trim();
  }

  const lines = rawText.split('\n');

  // Detect if this is a SyntaxError / IndentationError / TabError
  const isSyntax = lines.some((l) => /^\s*(SyntaxError|IndentationError|TabError):/.test(l));

  interface TraceFrame {
    filePath: string;
    headerLine: string;
    bodyLines: string[];
    isInternal: boolean;
  }

  const frames: TraceFrame[] = [];
  let currentFrame: TraceFrame | null = null;
  const tailLines: string[] = [];
  let pastFrames = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!pastFrames) {
      // Frame match: File "...", line X, in Y
      const frameMatch = line.match(/^(\s*)File\s+["']([^"']+)["'],\s+line\s+(\d+)(?:,\s+in\s+(.+))?/);
      if (frameMatch) {
        if (currentFrame) frames.push(currentFrame);
        const filePath = frameMatch[2];
        const isInternal: boolean = Boolean(
          filePath.includes('_pyodide') ||
          filePath.includes('lib/python312.zip') ||
          filePath.includes('lib/python311.zip') ||
          filePath.includes('lib/python310.zip') ||
          filePath.includes('_base.py') ||
          filePath.includes('pyodide.js') ||
          filePath.includes('pyodide.asm') ||
          filePath.includes('_compillo_') ||
          filePath.includes('CodeRunner') ||
          (filePath === '<string>' && !currentFrame)
        );

        currentFrame = {
          filePath,
          headerLine: line,
          bodyLines: [],
          isInternal,
        };
        continue;
      }

      if (currentFrame) {
        // Frame body lines (code snippet and caret / indicator lines)
        if (/^\s{2,}/.test(line)) {
          currentFrame.bodyLines.push(line);
          continue;
        } else {
          // Reached the end of frames: the exception line
          frames.push(currentFrame);
          currentFrame = null;
          pastFrames = true;
          tailLines.push(line);
          continue;
        }
      }

      if (line.startsWith('Traceback (most recent call last):')) {
        continue;
      }
    }

    tailLines.push(line);
  }

  if (currentFrame) {
    frames.push(currentFrame);
  }

  // Filter out internal Pyodide runner frames
  const userFrames = frames.filter((f) => !f.isInternal);

  if (isSyntax) {
    // For syntax errors, Python outputs:
    //   File "main.py", line 22
    //     print("
    //           ^
    // SyntaxError: unterminated string literal (detected at line 22)
    const target = userFrames.length > 0 ? userFrames[userFrames.length - 1] : frames[frames.length - 1];
    if (target) {
      let cleanHeader = target.headerLine.replace(/File\s+["'](?:<exec>|<string>|[^"']+)["']/, `File "${filename}"`);
      if (!cleanHeader.startsWith('  ')) {
        cleanHeader = '  ' + cleanHeader.trimStart();
      }
      return [cleanHeader, ...target.bodyLines, ...tailLines].join('\n').trimEnd();
    }
    return tailLines.join('\n').trim();
  }

  // For runtime exceptions:
  const framesToUse =
    userFrames.length > 0
      ? userFrames
      : frames.filter((f) => !f.filePath.includes('_pyodide') && !f.filePath.includes('_base.py'));

  if (framesToUse.length > 0) {
    const formattedFrames: string[] = [];
    for (const f of framesToUse) {
      let cleanHeader = f.headerLine.replace(/File\s+["'](?:<exec>|<string>)["']/, `File "${filename}"`);
      if (!cleanHeader.startsWith('  ')) {
        cleanHeader = '  ' + cleanHeader.trimStart();
      }
      formattedFrames.push(cleanHeader);
      formattedFrames.push(...f.bodyLines);
    }
    return [
      'Traceback (most recent call last):',
      ...formattedFrames,
      ...tailLines,
    ].join('\n').trimEnd();
  }

  return tailLines.join('\n').trim();
}

export interface PythonParsedDiagnostic {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export function extractPythonDiagnostic(cleanedError: string): PythonParsedDiagnostic | null {
  if (!cleanedError) return null;
  const lineMatch = cleanedError.match(/line\s+(\d+)/);
  const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;

  // Find column from caret position if available
  let column = 1;
  const lines = cleanedError.split('\n');
  const caretLineIdx = lines.findIndex((l) => /^\s*\^/.test(l));
  if (caretLineIdx !== -1) {
    column = Math.max(1, lines[caretLineIdx].indexOf('^') + 1);
  }

  // Find the error message line (e.g. "SyntaxError: unterminated string literal...")
  const errLine = lines.find((l) => /^[a-zA-Z_0-9.]+(?:Error|Exception):/.test(l.trim())) || lines[lines.length - 1];
  const message = errLine ? errLine.trim() : 'Python execution error';

  return {
    line,
    column,
    message,
    severity: 'error',
  };
}
