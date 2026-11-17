import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Trash2,
  Copy,
  Check,
  CornerDownLeft,
  ExternalLink,
  Wand2,
  Download,
  ZoomIn,
  X,
  Info,
  Layers,
  Sparkles,
  Terminal,
  AlertCircle,
  Palette,
  Share2,
} from 'lucide-react';
import { VSCodeThemeDefinition } from '../../services/themes';
import { FileNode } from '../../types';
import { universalRunner, UniversalRunnerState, SupportedLanguage } from '../../services/universalRunner';
import { autoHealPythonIndentation } from '../../services/pythonRunner';
import { GraphicsWindow } from './GraphicsWindow';

interface CodeRunnerViewProps {
  currentTheme: VSCodeThemeDefinition;
  activeFile: FileNode | null;
  files: FileNode[];
  onRunActiveFile: () => void;
  onUpdateFileContent?: (path: string, newContent: string) => void;
  onOpenLivePreview?: (url?: string) => void;
}

const LANGUAGE_CONFIG: Record<
  SupportedLanguage,
  { name: string; icon: string; badgeColor: string; defaultEngine: string; isInteractive: boolean }
> = {
  python: { name: 'Python 3', icon: '🐍', badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30', defaultEngine: 'CPython 3.10 / Pyodide WASM', isInteractive: true },
  cpp: { name: 'C++17', icon: '⚡', badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30', defaultEngine: 'GCC / G++ 12 (Free)', isInteractive: true },
  c: { name: 'C11', icon: '🅲', badgeColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', defaultEngine: 'GCC / TCC (Free)', isInteractive: true },
  java: { name: 'Java', icon: '☕', badgeColor: 'bg-amber-600/15 text-amber-500 border-amber-600/30', defaultEngine: 'OpenJDK 22 (Zero Cost)', isInteractive: false },
  typescript: { name: 'TypeScript', icon: '🔷', badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/30', defaultEngine: 'Node.js 20 + TSX (Free)', isInteractive: true },
  javascript: { name: 'JavaScript', icon: '🟨', badgeColor: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', defaultEngine: 'Node.js 20 (Free)', isInteractive: true },
  rust: { name: 'Rust', icon: '🦀', badgeColor: 'bg-orange-600/15 text-orange-400 border-orange-600/30', defaultEngine: 'Rust Foundation Playground (Official Free API)', isInteractive: false },
  go: { name: 'Go', icon: '🐹', badgeColor: 'bg-teal-500/15 text-teal-400 border-teal-500/30', defaultEngine: 'Go 1.19+ Runtime (Free)', isInteractive: true },
  html: { name: 'HTML5', icon: '🌐', badgeColor: 'bg-orange-500/15 text-orange-400 border-orange-500/30', defaultEngine: 'HTML5 Live DOM Inspector', isInteractive: false },
  css: { name: 'CSS3', icon: '🎨', badgeColor: 'bg-blue-400/15 text-blue-300 border-blue-400/30', defaultEngine: 'CSS3 Style Analyzer', isInteractive: false },
  json: { name: 'JSON', icon: '📦', badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30', defaultEngine: 'JSON Parser & Validator', isInteractive: false },
  sql: { name: 'SQLite', icon: '🗄️', badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30', defaultEngine: 'SQLite3 In-Memory Engine (Free)', isInteractive: true },
  markdown: { name: 'Markdown', icon: '📝', badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', defaultEngine: 'Markdown Document Inspector', isInteractive: false },
  shell: { name: 'Bash', icon: '🐚', badgeColor: 'bg-green-500/15 text-green-400 border-green-500/30', defaultEngine: 'GNU Bash Shell (Free)', isInteractive: true },
  plaintext: { name: 'Plain Text', icon: '📄', badgeColor: 'bg-gray-500/15 text-gray-400 border-gray-500/30', defaultEngine: 'Text Analytics Engine', isInteractive: false },
};

export const CodeRunnerView: React.FC<CodeRunnerViewProps> = ({
  currentTheme,
  activeFile,
  files,
  onRunActiveFile,
  onUpdateFileContent,
  onOpenLivePreview,
}) => {
  const [runnerState, setRunnerState] = useState<UniversalRunnerState>(universalRunner.getState());
  const [inputValue, setInputValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [formatNotice, setFormatNotice] = useState<string | null>(null);
  const [showLanguageMatrix, setShowLanguageMatrix] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [sharedCopied, setSharedCopied] = useState(false);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = universalRunner.subscribe((newState) => {
      setRunnerState(newState);
    });
    return unsub;
  }, []);

  // Auto-scroll when new output arrives
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [runnerState.output]);

  // Auto-focus input when program enters waiting state
  useEffect(() => {
    if (runnerState.waitingForInput) {
      inputRef.current?.focus();
    }
  }, [runnerState.waitingForInput]);

  const handleSendInput = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!runnerState.isRunning) return;
    if (inputValue.trim()) {
      setInputHistory((prev) => [inputValue, ...prev.slice(0, 49)]);
    }
    setHistoryIndex(-1);
    universalRunner.sendInput(inputValue);
    setInputValue('');
  };

  const handleStop = () => {
    universalRunner.killSession();
  };

  const handleClear = () => {
    universalRunner.clearOutput();
  };

  const handleCopy = () => {
    const allText = runnerState.output.map((o) => o.text).join('\n');
    navigator.clipboard?.writeText(allText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = () => {
    if (!activeFile) return;
    try {
      const encoded = btoa(unescape(encodeURIComponent(activeFile.content || '')));
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('name', activeFile.name);
      url.searchParams.set('code', encoded);
      navigator.clipboard?.writeText(url.toString());
      setSharedCopied(true);
      setTimeout(() => setSharedCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleAutoFixIndentation = () => {
    if (!activeFile || typeof activeFile.content !== 'string') return;
    const { code, wasFixed, reason } = autoHealPythonIndentation(activeFile.content);
    if (wasFixed && onUpdateFileContent) {
      onUpdateFileContent(activeFile.path, code);
      setFormatNotice(`Indentation fixed: ${reason}`);
      setTimeout(() => setFormatNotice(null), 4000);
    } else {
      setFormatNotice('No indentation issues found in active file.');
      setTimeout(() => setFormatNotice(null), 3000);
    }
  };

  const isLight = currentTheme.type === 'light';
  const detectedLang: SupportedLanguage = runnerState.currentLanguage || (activeFile ? universalRunner.detectLanguage(activeFile.name, activeFile.language) : 'python');
  const langConfig = LANGUAGE_CONFIG[detectedLang] || LANGUAGE_CONFIG.plaintext;

  return (
    <div className="flex flex-col flex-1 min-h-0 font-mono text-[12px] select-text relative">
      {/* Top Toolbar */}
      <div
        className={`flex items-center justify-between gap-2 px-3 py-1.5 border-b shrink-0 select-none text-[11px] min-w-0 ${
          isLight ? 'bg-black/[0.02] border-black/10' : 'bg-black/20 border-white/10'
        }`}
      >
        {/* Left: Language Info & Status */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar min-w-0 flex-1">
          {/* Language Pill */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border font-semibold whitespace-nowrap shrink-0 ${langConfig.badgeColor}`}>
            <span>{langConfig.icon}</span>
            <span>{langConfig.name}</span>
          </div>

          {/* Execution Benchmark & Exit Code */}
          {!runnerState.isRunning && runnerState.durationMs !== null && (
            <span
              className={`px-2 py-0.5 rounded border font-mono tabular-nums text-[10px] ${
                runnerState.exitCode === 0 || runnerState.exitCode === null
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
              }`}
              title="Last execution duration and exit code"
            >
              {runnerState.durationMs}ms · Exit {runnerState.exitCode ?? 0}
            </span>
          )}

          {/* Zero-Cost Pill */}
          <button
            onClick={() => setShowLanguageMatrix((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors whitespace-nowrap shrink-0 ${
              isLight
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
            }`}
            title="Click to view all 15 supported languages"
          >
            <Sparkles size={11} className="text-emerald-500" />
            <span className="font-medium text-[10.5px]">Languages</span>
          </button>

          {/* Graphics Window Active Pill */}
          {runnerState.graphicsWindow && (
            <button
              onClick={() => universalRunner.toggleGraphicsWindow()}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors cursor-pointer text-[10.5px] font-semibold whitespace-nowrap shrink-0 ${
                runnerState.graphicsWindow.isOpen
                  ? 'border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-400'
              }`}
              title={runnerState.graphicsWindow.isOpen ? 'Click to minimize Canvas Window' : 'Click to reopen Canvas Window'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  runnerState.graphicsWindow.isOpen ? 'bg-emerald-400' : 'bg-gray-400'
                }`}
              />
              <span>
                Graphics Window [{runnerState.graphicsWindow.width}×{runnerState.graphicsWindow.height}]
                {!runnerState.graphicsWindow.isOpen && ' (Minimized)'}
              </span>
            </button>
          )}

          {/* Engine name */}
          <span
            className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] truncate max-w-[200px] ${
              isLight ? 'text-gray-600 bg-gray-100' : 'text-gray-400 bg-white/5'
            }`}
            title={runnerState.engineName || langConfig.defaultEngine}
          >
            {runnerState.engineName || langConfig.defaultEngine}
          </span>

          {/* Active File indicator */}
          {(runnerState.filename || activeFile?.name) && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10.5px] truncate max-w-[150px] ${
                isLight ? 'bg-gray-200 text-gray-700' : 'bg-white/10 text-gray-300'
              }`}
            >
              📄 {runnerState.filename || activeFile?.name}
            </span>
          )}

          {/* Running / Waiting Indicator */}
          {runnerState.isRunning ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold text-[10px] whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Running...
            </span>
          ) : runnerState.exitCode !== null ? (
            <span
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold text-[10px] whitespace-nowrap shrink-0 ${
                runnerState.exitCode === 0
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-rose-500/15 text-rose-400'
              }`}
            >
              Exit {runnerState.exitCode}
              {runnerState.durationMs !== null && ` (${runnerState.durationMs}ms)`}
            </span>
          ) : null}

          {/* Waiting for input banner */}
          {runnerState.waitingForInput && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 font-semibold text-[10px] whitespace-nowrap shrink-0">
              <CornerDownLeft size={10} /> Waiting for stdin...
            </span>
          )}

          {formatNotice && (
            <span className="px-2 py-0.5 rounded bg-[#007acc]/20 text-[#007acc] text-[10px] shrink-0 animate-fade-in">
              {formatNotice}
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Web Server / HTML Preview Trigger */}
          {runnerState.serverUrl && onOpenLivePreview && (
            <button
              onClick={() => onOpenLivePreview(runnerState.serverUrl || undefined)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors text-[10.5px] font-semibold"
              title={`Open ${runnerState.serverUrl} in Live Preview`}
            >
              <ExternalLink size={11} />
              <span>Open Live Preview{runnerState.serverPort ? ` (:${runnerState.serverPort})` : ''}</span>
            </button>
          )}
          {detectedLang === 'html' && !runnerState.serverUrl && onOpenLivePreview && (
            <button
              onClick={() => onOpenLivePreview()}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors text-[10.5px]"
              title="Open Live Preview in Split Pane"
            >
              <ExternalLink size={11} />
              <span>Live Preview</span>
            </button>
          )}

          {/* Python Indentation Fix */}
          {detectedLang === 'python' && (
            <button
              onClick={handleAutoFixIndentation}
              className={`p-1 rounded transition-colors ${
                isLight ? 'hover:bg-black/10 text-gray-700' : 'hover:bg-white/10 text-gray-300'
              }`}
              title="Auto-Fix Python Indentation Errors"
            >
              <Wand2 size={13} className="text-amber-400" />
            </button>
          )}

          {/* Errors Only Filter Toggle */}
          <button
            onClick={() => setErrorsOnly((prev) => !prev)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors text-[10px] border ${
              errorsOnly
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold'
                : isLight
                ? 'text-gray-600 border-black/10 hover:bg-black/5'
                : 'text-gray-400 border-white/10 hover:bg-white/5'
            }`}
            title={errorsOnly ? 'Showing errors only. Click to show all output' : 'Filter output to only display code errors'}
          >
            <AlertCircle size={10} className={errorsOnly ? 'text-rose-400' : 'text-gray-400'} />
            <span>Errors Only</span>
          </button>

          {/* Copy Output */}
          <button
            onClick={handleCopy}
            className={`p-1 rounded transition-colors ${
              isLight ? 'hover:bg-black/10 text-gray-700' : 'hover:bg-white/10 text-gray-300'
            }`}
            title="Copy Output"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>

          {/* Share Code Link */}
          {activeFile && (
            <button
              onClick={handleShareLink}
              className={`p-1 rounded transition-colors ${
                isLight ? 'hover:bg-black/10 text-gray-700' : 'hover:bg-white/10 text-gray-300'
              }`}
              title="Copy Shareable Deep-Link for Active File"
            >
              {sharedCopied ? <Check size={13} className="text-emerald-400" /> : <Share2 size={13} />}
            </button>
          )}

          {/* Clear Output */}
          <button
            onClick={handleClear}
            className={`p-1 rounded transition-colors ${
              isLight ? 'hover:bg-black/10 text-gray-700' : 'hover:bg-white/10 text-gray-300'
            }`}
            title="Clear Console"
          >
            <Trash2 size={13} />
          </button>

          {/* Stop Button */}
          {runnerState.isRunning ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition-colors font-semibold"
              title="Stop Running Process (SIGINT)"
            >
              <Square size={11} fill="currentColor" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={onRunActiveFile}
              className={`flex items-center gap-1 px-2 py-0.5 rounded font-semibold transition-colors ${
                isLight
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-black'
              }`}
              title="Run Active File (Ctrl+Alt+N)"
            >
              <Play size={11} fill="currentColor" />
              <span>Run</span>
            </button>
          )}
        </div>
      </div>

      {/* Free Languages Matrix Drawer Modal */}
      {showLanguageMatrix && (
        <div
          className={`absolute top-8 left-3 right-3 z-30 p-3 rounded-lg border shadow-xl backdrop-blur-md ${
            isLight ? 'bg-white/95 border-gray-300 text-gray-800' : 'bg-[#1e1e1e]/95 border-white/20 text-gray-200'
          }`}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-400" />
              <span className="font-bold text-[12px]">All 15 Free Execution Languages (Zero Cost, No API Key)</span>
            </div>
            <button
              onClick={() => setShowLanguageMatrix(false)}
              className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X size={13} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] max-h-[300px] overflow-y-auto pr-1">
            {Object.entries(LANGUAGE_CONFIG).map(([langKey, cfg]) => (
              <div
                key={langKey}
                className={`p-2 rounded border flex flex-col gap-0.5 ${
                  detectedLang === langKey
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : isLight
                    ? 'border-gray-200 bg-gray-50'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1">
                    <span>{cfg.icon}</span>
                    <span>{cfg.name}</span>
                  </span>
                  <span className="text-[9.5px] px-1 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                    FREE
                  </span>
                </div>
                <span className="text-[10px] text-gray-400">{cfg.defaultEngine}</span>
              </div>
            ))}
          </div>

          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10.5px] text-gray-400">
            <span>✓ Unlimited local container compilation & community free API execution</span>
            <button
              onClick={() => setShowLanguageMatrix(false)}
              className="px-2 py-0.5 rounded bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Main Console Output Area */}
      <div
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1 select-text"
        style={{
          backgroundColor: currentTheme.ui.editorBg,
          color: currentTheme.ui.editorFg,
        }}
      >
        {/* C/C++ Graphics & OpenGL Framebuffer Window */}
        {runnerState.graphicsWindow && runnerState.graphicsWindow.isOpen && (
          <div className="mb-3">
            <GraphicsWindow
              currentTheme={currentTheme}
              isOpen={runnerState.graphicsWindow.isOpen}
              onClose={() => universalRunner.closeGraphicsWindow()}
              title={runnerState.graphicsWindow.title}
              width={runnerState.graphicsWindow.width}
              height={runnerState.graphicsWindow.height}
              commands={runnerState.graphicsWindow.commands}
              libraryType={runnerState.graphicsWindow.libraryType}
              onReplay={() => {
                onRunActiveFile();
              }}
            />
          </div>
        )}

        {(() => {
          const visibleOutput = runnerState.output
            .filter((item) => item.type !== 'system')
            .filter((item) => {
              if (!errorsOnly) return true;
              return item.type === 'stderr' || item.type === 'error';
            });

          if (visibleOutput.length === 0) {
            if (errorsOnly && runnerState.output.length > 0) {
              return (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-10">
                  <div className="text-emerald-400 font-semibold text-xs mb-1">✓ No Code Errors</div>
                  <div className="text-[11px] text-gray-400">
                    Code executed cleanly. Turn off "Errors Only" to view standard output.
                  </div>
                </div>
              );
            }
            if (runnerState.output.length === 0) {
              return (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-2 select-none py-10">
                  <div className="p-3 rounded-full bg-white/5 border border-white/10">
                    <Terminal size={24} className="text-emerald-400/80" />
                  </div>
                  <div className="font-semibold text-gray-300">Compillo Universal Runner</div>
                  <p className="text-[11px] max-w-md text-gray-400 leading-relaxed">
                    Execute Python, C++, C, Java, TypeScript, JavaScript, Rust, Go, SQL, Bash, HTML, CSS, JSON, Markdown, and Plain Text with clean standard output and instant error reporting.
                  </p>
                  <button
                    onClick={onRunActiveFile}
                    className="flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-[11px] transition-transform active:scale-95 shadow-md"
                  >
                    <Play size={12} fill="currentColor" />
                    <span>Run Current File ({activeFile ? activeFile.name : 'Select a file'})</span>
                  </button>
                </div>
              );
            }
            return (
              <div className="text-gray-500 italic text-[11px] py-4 text-center">
                Process finished with no output.
              </div>
            );
          }

          return visibleOutput.map((item) => {
            if (item.type === 'plot' && item.plotUrl) {
              return (
                <div key={item.id} className="my-2 p-2 rounded border border-white/10 bg-black/20">
                  <div className="flex items-center justify-between mb-1 text-[10px] text-gray-400">
                    <span>📊 Generated Plot (Matplotlib)</span>
                    <button
                      onClick={() => setZoomedImage(item.plotUrl || null)}
                      className="flex items-center gap-1 hover:text-white"
                    >
                      <ZoomIn size={11} /> Zoom
                    </button>
                  </div>
                  <img
                    src={item.plotUrl}
                    alt="Plot"
                    className="max-h-60 rounded cursor-pointer border border-white/10 hover:opacity-90"
                    onClick={() => setZoomedImage(item.plotUrl || null)}
                  />
                </div>
              );
            }

            if (item.type === 'table' && item.tableData && item.tableData.headers.length > 0) {
              return (
                <div key={item.id} className="my-2 overflow-x-auto rounded border border-white/10 bg-black/20">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-white/15 bg-white/5">
                        {item.tableData.headers.map((h, idx) => (
                          <th key={idx} className="p-1.5 font-bold text-gray-300">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {item.tableData.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-white/5 hover:bg-white/5">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-1.5 text-gray-200">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            const colorClass =
              item.type === 'stderr' || item.type === 'error'
                ? 'text-rose-400 font-mono'
                : item.type === 'success'
                ? 'text-emerald-400 font-semibold'
                : isLight
                ? 'text-gray-800'
                : 'text-gray-200';

            return (
              <pre
                key={item.id}
                className={`whitespace-pre-wrap break-words leading-relaxed font-mono ${colorClass}`}
              >
                {item.text}
              </pre>
            );
          });
        })()}
        <div ref={outputEndRef} />
      </div>

      {/* Interactive Stdin Bar (Works for scanf, std::cin, input(), fmt.Scan, read, etc.) */}
      <form
        onSubmit={handleSendInput}
        className={`flex items-center gap-2 px-3 py-1.5 border-t shrink-0 select-none ${
          isLight ? 'bg-black/[0.03] border-black/10' : 'bg-black/30 border-white/10'
        }`}
      >
        <span
          className={`flex items-center gap-1 font-semibold text-[11px] shrink-0 ${
            runnerState.waitingForInput
              ? 'text-amber-500 animate-pulse'
              : runnerState.isRunning
              ? 'text-emerald-400'
              : 'text-gray-500'
          }`}
        >
          <CornerDownLeft size={12} />
          <span>stdin &gt;</span>
        </span>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' && inputHistory.length > 0) {
              e.preventDefault();
              const nextIdx = Math.min(historyIndex + 1, inputHistory.length - 1);
              setHistoryIndex(nextIdx);
              setInputValue(inputHistory[nextIdx]);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (historyIndex > 0) {
                const nextIdx = historyIndex - 1;
                setHistoryIndex(nextIdx);
                setInputValue(inputHistory[nextIdx]);
              } else {
                setHistoryIndex(-1);
                setInputValue('');
              }
            }
          }}
          placeholder={
            runnerState.waitingForInput
              ? 'Program is waiting for input! Type response and press Enter...'
              : runnerState.isRunning
              ? 'Send input to running program (scanf, cin, input, fmt.Scan)...'
              : 'Program not running. Click ▶ Run to execute.'
          }
          disabled={!runnerState.isRunning}
          className={`flex-1 px-2.5 py-1 rounded text-[11.5px] font-mono outline-none border transition-colors ${
            runnerState.waitingForInput
              ? 'border-amber-500/80 bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/50'
              : isLight
              ? 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              : 'bg-black/40 border-white/10 text-white focus:border-white/30'
          }`}
        />

        <button
          type="submit"
          disabled={!runnerState.isRunning || !inputValue.trim()}
          className={`px-3 py-1 rounded font-semibold text-[11px] transition-colors shrink-0 ${
            runnerState.isRunning && inputValue.trim()
              ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
              : 'bg-white/5 text-gray-500 cursor-not-allowed'
          }`}
        >
          Send
        </button>
      </form>

      {/* Plot Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-[#1e1e1e] p-3 rounded-lg border border-white/20 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <span className="text-[12px] font-bold text-white">Matplotlib Plot Preview</span>
              <button
                onClick={() => setZoomedImage(null)}
                className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <img
              src={zoomedImage}
              alt="Zoomed Plot"
              className="max-h-[75vh] object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};
