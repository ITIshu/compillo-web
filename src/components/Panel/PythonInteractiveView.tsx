import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Trash2,
  Terminal as TerminalIcon,
  Send,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  CornerDownLeft,
  Sparkles,
  HelpCircle,
  Download,
  ZoomIn,
  X,
  BarChart3,
  Wand2,
  Cpu,
} from 'lucide-react';
import { VSCodeThemeDefinition } from '../../services/themes';
import { pythonRunner, PythonSessionState, autoHealPythonIndentation, PythonEngineChoice } from '../../services/pythonRunner';
import { FileNode } from '../../types';

interface PythonInteractiveViewProps {
  currentTheme: VSCodeThemeDefinition;
  activeFile: FileNode | null;
  files: FileNode[];
  onRunActiveFile: () => void;
  onUpdateFileContent?: (path: string, newContent: string) => void;
}

export const PythonInteractiveView: React.FC<PythonInteractiveViewProps> = ({
  currentTheme,
  activeFile,
  files,
  onRunActiveFile,
  onUpdateFileContent,
}) => {
  const [sessionState, setSessionState] = useState<PythonSessionState>(pythonRunner.getState());
  const [inputValue, setInputValue] = useState('');
  const [replInput, setReplInput] = useState('');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [formatNotice, setFormatNotice] = useState<string | null>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = pythonRunner.subscribe((newState) => {
      setSessionState(newState);
    });
    return unsubscribe;
  }, []);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessionState.output]);

  // Auto-focus input when Python enters waiting for input state
  useEffect(() => {
    if (sessionState.waitingForInput) {
      inputRef.current?.focus();
    }
  }, [sessionState.waitingForInput]);

  const handleSendInput = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sessionState.isRunning) return;

    pythonRunner.sendInput(inputValue);
    setInputValue('');
  };

  const handleQuickSend = (text: string) => {
    if (!sessionState.isRunning) return;
    pythonRunner.sendInput(text);
    setInputValue('');
  };

  const handleStopProcess = () => {
    pythonRunner.killSession();
  };

  const handleClearOutput = () => {
    pythonRunner.clearOutput();
  };

  // Run quick one-line REPL code when not running a full script
  const handleReplSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = replInput.trim();
    if (!cmd) return;

    pythonRunner.runInteractive(cmd, 'repl.py', files);
    setReplInput('');
  };

  const handleDownloadPlot = (dataUrl: string, idx: number) => {
    try {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `matplotlib_figure_${idx + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Failed to download plot:', e);
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
  const isCyberpunk = currentTheme.id === 'cyberpunk';

  return (
    <div className="flex flex-col h-full font-mono text-[12px] select-text relative">
      {/* Top Toolbar */}
      <div
        className={`flex items-center justify-between px-3 py-1.5 border-b shrink-0 select-none text-[11px] ${
          isLight ? 'bg-black/[0.02] border-black/10' : 'bg-black/20 border-white/10'
        }`}
      >
        {/* Left: Status & Engine info */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#3776ab]/15 text-[#3776ab] dark:text-[#5dade2] font-semibold">
            <span
              className={`w-2 h-2 rounded-full ${
                sessionState.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'
              }`}
            />
            <span>{sessionState.activeEngineName || 'Python + Matplotlib'}</span>
          </div>

          <div className="flex items-center gap-1">
            <select
              value={sessionState.engine}
              onChange={(e) => pythonRunner.setEngine(e.target.value as PythonEngineChoice)}
              className={`px-1.5 py-0.5 rounded text-[10.5px] border outline-none cursor-pointer transition-colors ${
                isLight
                  ? 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
              }`}
              title="Select Python execution engine: Auto (detects Cloud Run vs Local), WebAssembly (Pyodide in-browser), or Server CPython"
            >
              <option value="auto">Auto (WASM / Server)</option>
              <option value="wasm">⚡ WebAssembly (Pyodide)</option>
              <option value="server">🐍 Server CPython</option>
            </select>
          </div>

          {sessionState.filename && (
            <span
              className={`px-2 py-0.5 rounded text-[11px] ${
                isLight ? 'bg-gray-200 text-gray-700' : 'bg-white/10 text-gray-300'
              }`}
            >
              📄 {sessionState.filename}
            </span>
          )}

          {sessionState.waitingForInput && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 font-semibold text-[10px] animate-bounce">
              <CornerDownLeft size={10} /> Waiting for input()...
            </span>
          )}

          {formatNotice && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10.5px]">
              <Sparkles size={11} /> {formatNotice}
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {activeFile && (activeFile.name.endsWith('.py') || activeFile.language === 'python') && (
            <button
              onClick={handleAutoFixIndentation}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-[10.5px] border ${
                isLight
                  ? 'border-gray-300 bg-white hover:bg-gray-100 text-gray-700'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
              title="Fix unexpected indentation or leading whitespace in active file"
            >
              <Wand2 size={11} className="text-amber-400" />
              <span>Fix Indent</span>
            </button>
          )}

          {sessionState.isRunning ? (
            <button
              onClick={handleStopProcess}
              className="flex items-center gap-1 px-2 py-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 transition-colors font-sans text-[11px]"
              title="Stop Python execution (Ctrl+C)"
            >
              <Square size={11} className="fill-red-400" />
              <span>Stop (Ctrl+C)</span>
            </button>
          ) : (
            <button
              onClick={onRunActiveFile}
              className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 transition-colors font-sans text-[11px]"
              title="Run Active Python File (Ctrl+Alt+N)"
            >
              <Play size={11} className="fill-emerald-400" />
              <span>Run File</span>
            </button>
          )}

          <button
            onClick={handleClearOutput}
            className={`p-1 rounded transition-colors ${
              isLight ? 'hover:bg-black/10 text-gray-600' : 'hover:bg-white/10 text-gray-400'
            }`}
            title="Clear Console Output"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Output Console Display */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 leading-relaxed">
        {sessionState.output.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center text-[#888888] font-sans">
            <div className="w-12 h-12 rounded-full bg-[#3776ab]/10 flex items-center justify-center text-[#3776ab] mb-3">
              <TerminalIcon size={24} />
            </div>
            <h4 className="text-[13px] font-semibold mb-1 text-gray-300">
              Interactive Python Environment Ready
            </h4>
            <p className="text-[11.5px] max-w-md text-gray-500 mb-4">
              Write any Python program in the editor and click <span className="text-emerald-400 font-semibold">Run File</span> (or press <kbd className="px-1 py-0.5 rounded bg-white/10 text-[10px]">Ctrl+Alt+N</kbd>). Interactive calls like <code className="text-[#3776ab] font-bold">input()</code> and <code className="text-[#38bdf8] font-bold">matplotlib.pyplot.show()</code> are fully supported with live chart graphics.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onRunActiveFile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#007acc] text-white hover:bg-[#0062a3] transition-colors text-xs font-medium"
              >
                <Play size={12} className="fill-white" />
                <span>Run {activeFile?.name || 'Python File'}</span>
              </button>
            </div>
          </div>
        ) : (
          sessionState.output
            .filter((item) => item.type !== 'system')
            .map((item, idx) => {
            if (item.type === 'plot' && item.plotDataUrl) {
              return (
                <div
                  key={item.id}
                  className={`my-3 p-3 rounded-lg border flex flex-col gap-2 max-w-2xl ${
                    isLight
                      ? 'bg-white border-gray-200 shadow-sm'
                      : 'bg-black/40 border-white/10 shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] pb-1 border-b border-black/5 dark:border-white/5">
                    <span className="flex items-center gap-1.5 font-sans font-semibold text-sky-400">
                      <BarChart3 size={14} />
                      <span>Matplotlib Graphical Output #{idx + 1}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setZoomedImage(item.plotDataUrl || null)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10.5px] transition-colors"
                        title="Click to view full size"
                      >
                        <ZoomIn size={11} />
                        <span>Enlarge</span>
                      </button>
                      <button
                        onClick={() => handleDownloadPlot(item.plotDataUrl!, idx)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 text-[10.5px] transition-colors font-medium"
                        title="Download figure as PNG"
                      >
                        <Download size={11} />
                        <span>Save PNG</span>
                      </button>
                    </div>
                  </div>
                  <div
                    className="relative cursor-pointer overflow-hidden rounded bg-white flex items-center justify-center p-2"
                    onClick={() => setZoomedImage(item.plotDataUrl || null)}
                  >
                    <img
                      src={item.plotDataUrl}
                      alt="Matplotlib Graphical Figure"
                      className="max-h-[380px] w-auto object-contain rounded"
                    />
                  </div>
                  <div className="text-[10px] text-gray-500 flex items-center justify-between font-sans">
                    <span>Generated via Matplotlib Agg Headless Engine</span>
                    <span>Click image to zoom</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                className={`whitespace-pre-wrap font-mono text-[12px] ${
                  item.type === 'input'
                    ? 'text-emerald-400 font-semibold'
                    : item.type === 'stderr'
                    ? 'text-red-400'
                    : item.type === 'system'
                    ? 'text-sky-400/90 font-medium'
                    : isLight
                    ? 'text-gray-800'
                    : isCyberpunk
                    ? 'text-[#e5dcff]'
                    : 'text-[#dddddd]'
                }`}
              >
                {item.type === 'input' && <span className="text-emerald-500 mr-1.5">›</span>}
                {item.text}
              </div>
            );
          })
        )}
        <div ref={outputEndRef} />
      </div>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg p-3 shadow-2xl flex flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <span className="font-sans font-semibold text-gray-800 text-sm flex items-center gap-1.5">
                <BarChart3 size={16} className="text-sky-600" />
                Matplotlib Plot (Full Resolution)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPlot(zoomedImage, 0)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600 text-white hover:bg-sky-700 text-xs font-medium"
                >
                  <Download size={12} />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setZoomedImage(null)}
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="overflow-auto max-h-[80vh] flex items-center justify-center bg-white p-2">
              <img src={zoomedImage} alt="Full resolution plot" className="max-w-full max-h-[75vh] object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Interactive Input Bar - Active during execution or REPL */}
      <div
        className={`p-2.5 border-t shrink-0 select-none ${
          isLight ? 'bg-black/[0.03] border-black/10' : 'bg-black/30 border-white/10'
        }`}
      >
        {sessionState.isRunning ? (
          <div className="space-y-2">
            {sessionState.waitingForInput && (
              <div className="flex items-center justify-between text-[11px] text-amber-400">
                <span className="flex items-center gap-1 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                  Program is waiting for input:
                  {sessionState.inputPrompt && (
                    <span className="text-gray-300 font-mono ml-1 bg-black/40 px-1.5 py-0.5 rounded">
                      "{sessionState.inputPrompt}"
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-gray-500">Press Enter to submit</span>
              </div>
            )}

            <form onSubmit={handleSendInput} className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold text-sm select-none">››</span>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  sessionState.waitingForInput
                    ? 'Type your answer here and press Enter...'
                    : 'Send standard input to running Python program...'
                }
                className={`flex-1 px-3 py-1.5 rounded outline-none border font-mono text-[12px] transition-colors ${
                  sessionState.waitingForInput
                    ? 'border-amber-500/70 bg-amber-500/10 focus:border-amber-400 text-white'
                    : isLight
                    ? 'bg-white border-gray-300 text-gray-900 focus:border-[#007acc]'
                    : 'bg-black/50 border-white/20 text-white focus:border-[#007acc]'
                }`}
              />
              <button
                type="submit"
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#007acc] hover:bg-[#0062a3] text-white transition-colors text-xs font-semibold"
              >
                <Send size={12} />
                <span>Send</span>
              </button>
            </form>

            {/* Quick response buttons */}
            <div className="flex items-center gap-1.5 text-[10.5px]">
              <span className="text-gray-500">Quick send:</span>
              {['1', '2', 'yes', 'no', 'q'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleQuickSend(preset)}
                  className={`px-1.5 py-0.5 rounded border transition-colors ${
                    isLight
                      ? 'border-gray-300 hover:bg-gray-200 text-gray-700'
                      : 'border-white/10 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  "{preset}"
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleQuickSend('')}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  isLight
                    ? 'border-gray-300 hover:bg-gray-200 text-gray-700'
                    : 'border-white/10 hover:bg-white/10 text-gray-300'
                }`}
              >
                [Empty / Enter]
              </button>
            </div>
          </div>
        ) : (
          /* Quick Python statement / REPL runner when idle */
          <form onSubmit={handleReplSubmit} className="flex items-center gap-2">
            <span className="text-[#3776ab] font-bold text-xs select-none">python ›</span>
            <input
              type="text"
              value={replInput}
              onChange={(e) => setReplInput(e.target.value)}
              placeholder="Run one-line Python code e.g. print(2**32) or run an active file..."
              className={`flex-1 px-3 py-1.5 rounded outline-none border font-mono text-[12px] ${
                isLight
                  ? 'bg-white border-gray-300 text-gray-900 focus:border-[#007acc]'
                  : 'bg-black/50 border-white/20 text-white focus:border-[#007acc]'
              }`}
            />
            <button
              type="submit"
              disabled={!replInput.trim()}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#3776ab] hover:bg-[#2e628f] disabled:opacity-40 text-white transition-colors text-xs font-semibold"
            >
              <CornerDownLeft size={12} />
              <span>Eval</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

