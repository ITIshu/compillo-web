import React, { useState, useEffect, useRef } from 'react';
import { Download, X, FileCode, CheckCircle } from 'lucide-react';
import { FileNode } from '../../types';
import { CompilloThemeDefinition } from '../../services/themes';

interface DownloadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFile: FileNode | null;
  currentTheme: CompilloThemeDefinition;
  onDownload: (fileName: string) => void;
  onDownloadSingleHtml?: (fileName: string) => void;
  onDownloadStandaloneReplica?: () => void;
}

export const DownloadFileModal: React.FC<DownloadFileModalProps> = ({
  isOpen,
  onClose,
  activeFile,
  currentTheme,
  onDownload,
  onDownloadSingleHtml,
  onDownloadStandaloneReplica,
}) => {
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && activeFile) {
      setFileName(activeFile.name);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Select file name without extension
          const dotIndex = activeFile.name.lastIndexOf('.');
          if (dotIndex > 0) {
            inputRef.current.setSelectionRange(0, dotIndex);
          } else {
            inputRef.current.select();
          }
        }
      }, 50);
    }
  }, [isOpen, activeFile]);

  if (!isOpen || !activeFile) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = fileName.trim() || activeFile.name;
    onDownload(finalName);
    onClose();
  };

  const lineCount = (activeFile.content || '').split('\n').length;
  const byteCount = new Blob([activeFile.content || '']).size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: currentTheme.ui.sideBarBg,
          borderColor: currentTheme.ui.sideBarBorder,
          color: currentTheme.ui.sideBarFg,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <div className="flex items-center gap-2 font-medium text-[13px]">
            <Download size={16} className="text-emerald-400" />
            <span>Download Active File</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-[12px]">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5 opacity-70">
              File Name to Download
            </label>
            <input
              ref={inputRef}
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g. main.py"
              className={`w-full px-3 py-2 rounded-lg border text-[13px] outline-none transition-all ${
                currentTheme.type === 'light'
                  ? 'bg-white text-gray-900 border-gray-300 focus:border-[#007acc] focus:ring-2 focus:ring-[#007acc]/20'
                  : 'bg-black/30 text-white border-white/20 focus:border-[#007acc] focus:ring-2 focus:ring-[#007acc]/30'
              }`}
            />
            <p className="text-[11px] opacity-60 mt-1">
              The file will be saved directly onto your local machine with this name.
            </p>
          </div>

          {/* File Metadata Card */}
          <div
            className={`p-3 rounded-lg border flex items-center justify-between ${
              currentTheme.type === 'light'
                ? 'bg-gray-50 border-gray-200'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileCode size={20} className="text-[#007acc]" />
              <div>
                <div className="font-medium text-[12px]">{activeFile.name}</div>
                <div className="text-[11px] opacity-60">
                  {lineCount} lines &bull; {byteCount} bytes
                </div>
              </div>
            </div>
            <span
              className="text-[10px] uppercase font-bold px-2 py-0.5 rounded"
              style={{
                backgroundColor: `${currentTheme.ui.accent}20`,
                color: currentTheme.ui.accent,
              }}
            >
              {activeFile.language || 'text'}
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {onDownloadSingleHtml && (
                <button
                  type="button"
                  onClick={() => {
                    const finalName = fileName.trim() || activeFile.name;
                    onDownloadSingleHtml(finalName);
                    onClose();
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 font-medium text-[11px] flex items-center gap-1.5 transition-all"
                  title="Bundle workspace CSS and JS files into one single standalone HTML file"
                >
                  <FileCode size={13} />
                  <span>Bundle HTML</span>
                </button>
              )}
              {onDownloadStandaloneReplica && (
                <button
                  type="button"
                  onClick={() => {
                    onDownloadStandaloneReplica();
                    onClose();
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 font-medium text-[11px] flex items-center gap-1.5 transition-all"
                  title="Download standalone single-page replica of Compillo IDE (with themes, editor, & runner)"
                >
                  <Download size={13} className="text-emerald-400" />
                  <span>Standalone Replica</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-lg transition-colors text-[12px] ${
                  currentTheme.type === 'light'
                    ? 'hover:bg-gray-200 text-gray-700'
                    : 'hover:bg-white/10 text-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-white font-medium text-[12px] flex items-center gap-2 shadow-md active:scale-98 transition-all"
                style={{ backgroundColor: currentTheme.ui.accent }}
              >
                <Download size={14} />
                <span>Download File</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
