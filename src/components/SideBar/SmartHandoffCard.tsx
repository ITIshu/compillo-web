import React from 'react';
import { Sparkles, ArrowRight, Layers, ShieldCheck, Zap, Cpu, RefreshCw, FileCode } from 'lucide-react';
import { AgentWorkflowType } from '../../types';

interface SmartHandoffCardProps {
  mode: AgentWorkflowType;
  summary: string;
  prompt: string;
  targetFile?: string;
  onDispatch: (prompt: string, mode: AgentWorkflowType) => void;
}

export const SmartHandoffCard: React.FC<SmartHandoffCardProps> = ({
  mode,
  summary,
  prompt,
  targetFile,
  onDispatch,
}) => {
  const modeConfig: Record<
    AgentWorkflowType,
    { label: string; icon: React.ReactNode; border: string; bg: string; text: string; badge: string }
  > = {
    feature: {
      label: 'Feature Build Sprint',
      icon: <Zap size={13} className="text-emerald-400" />,
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-950/20',
      text: 'text-emerald-300',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    bugfix: {
      label: 'Bug Resolution Sprint',
      icon: <Cpu size={13} className="text-amber-400" />,
      border: 'border-amber-500/40',
      bg: 'bg-amber-950/20',
      text: 'text-amber-300',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    refactor: {
      label: 'Refactoring Sprint',
      icon: <RefreshCw size={13} className="text-sky-400" />,
      border: 'border-sky-500/40',
      bg: 'bg-sky-950/20',
      text: 'text-sky-300',
      badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
    security: {
      label: 'Security Audit Sprint',
      icon: <ShieldCheck size={13} className="text-purple-400" />,
      border: 'border-purple-500/40',
      bg: 'bg-purple-950/20',
      text: 'text-purple-300',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    custom: {
      label: 'Multi-Agent Sprint',
      icon: <Layers size={13} className="text-blue-400" />,
      border: 'border-blue-500/40',
      bg: 'bg-blue-950/20',
      text: 'text-blue-300',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
  };

  const cfg = modeConfig[mode] || modeConfig.feature;

  return (
    <div
      className={`mt-3 p-3 rounded-xl border ${cfg.border} ${cfg.bg} text-[11.5px] space-y-2.5 shadow-sm transition-all`}
    >
      {/* Header with distinction callout */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-white">
          <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center">
            {cfg.icon}
          </div>
          <span>Agent Studio Handoff Available</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono border font-medium ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      {/* Distinction explanation */}
      <p className="text-[10.5px] text-[#8b949e] leading-relaxed">
        <strong className="text-white">Multi-File Task Detected:</strong> Dispatch this task to the <strong>Agent Studio</strong> to run Planner → Coder → Reviewer and stage unified inline diffs across your project files.
      </p>

      {/* Target scope & summary preview */}
      <div className="p-2 rounded-lg bg-black/40 border border-white/5 space-y-1">
        {targetFile && (
          <div className="flex items-center gap-1.5 text-[10px] text-[#8b949e] font-mono">
            <FileCode size={11} className="text-sky-400 shrink-0" />
            <span className="truncate">Target: {targetFile}</span>
          </div>
        )}
        <div className="text-[11px] text-[#c9d1d9] leading-snug">
          {summary}
        </div>
      </div>

      {/* 1-Click Action Dispatch button */}
      <button
        onClick={() => onDispatch(prompt, mode)}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow-sm transition-all cursor-pointer group"
      >
        <span>Send to Agent Studio & Preview Diffs</span>
        <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};
