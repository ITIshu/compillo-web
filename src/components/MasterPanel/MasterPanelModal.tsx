import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { CompilloThemeDefinition } from '../../services/themes';
import { MasterPanelView } from './MasterPanelView';

interface MasterPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: CompilloThemeDefinition;
  onOpenGame?: () => void;
}

export const MasterPanelModal: React.FC<MasterPanelModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onOpenGame,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl h-[90vh] max-h-[780px] rounded-2xl border border-purple-500/30 bg-[#0d1117] shadow-2xl overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button top right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors border border-white/10"
        >
          <X size={16} />
        </button>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <MasterPanelView
            currentTheme={currentTheme}
            onClose={onClose}
            onOpenGame={() => {
              onClose();
              onOpenGame?.();
            }}
          />
        </div>
      </div>
    </div>
  );
};
