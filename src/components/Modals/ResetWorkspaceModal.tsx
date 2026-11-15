import React from 'react';
import { RotateCcw, X, Sparkles, Trash2, AlertTriangle } from 'lucide-react';
import { CompilloThemeDefinition } from '../../services/themes';

interface ResetWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: CompilloThemeDefinition;
  onResetToStarter: () => void;
  onResetToEmpty: () => void;
}

export const ResetWorkspaceModal: React.FC<ResetWorkspaceModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onResetToStarter,
  onResetToEmpty,
}) => {
  if (!isOpen) return null;

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
          <div className="flex items-center gap-2 font-medium text-[13px] text-amber-400">
            <RotateCcw size={16} />
            <span>Reset Workspace</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-[12px]">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-400" />
            <p className="text-[11px] leading-relaxed">
              Resetting will replace or clear your current workspace files and close all open tabs.
              Choose how you would like to reset:
            </p>
          </div>

          <div className="space-y-2.5">
            {/* Option 1: Load Starter Project */}
            <button
              onClick={() => {
                onResetToStarter();
                onClose();
              }}
              className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 group ${
                currentTheme.type === 'light'
                  ? 'bg-blue-50/50 hover:bg-blue-50 border-blue-200 hover:border-blue-400 text-gray-900'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-[#007acc] text-white'
              }`}
            >
              <div className="p-2 rounded-lg bg-[#007acc]/20 text-[#007acc] shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <Sparkles size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[13px] flex items-center justify-between">
                  <span>Load Starter Project</span>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] opacity-70 mt-1 leading-normal">
                  Resets to a full working developer project with TypeScript, Python analyzer, sample
                  plugins, styles, and README.
                </p>
              </div>
            </button>

            {/* Option 2: Empty Clean Slate */}
            <button
              onClick={() => {
                onResetToEmpty();
                onClose();
              }}
              className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 group ${
                currentTheme.type === 'light'
                  ? 'bg-red-50/50 hover:bg-red-50 border-red-200 hover:border-red-400 text-gray-900'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-red-500/50 text-white'
              }`}
            >
              <div className="p-2 rounded-lg bg-red-500/20 text-red-400 shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <Trash2 size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[13px] text-red-400">
                  Clear to Empty Workspace
                </div>
                <p className="text-[11px] opacity-70 mt-1 leading-normal">
                  Removes all files and folders, leaving a pristine clean empty workspace ready for
                  new files or importing.
                </p>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end pt-2">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg transition-colors text-[12px] ${
                currentTheme.type === 'light'
                  ? 'hover:bg-gray-200 text-gray-700'
                  : 'hover:bg-white/10 text-gray-300'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
