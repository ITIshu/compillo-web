import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Play,
  Check,
  Copy,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Cpu,
  FileCode,
  FileCheck,
  Split,
  Trash2,
  CheckCheck,
  RefreshCw,
  GitBranch,
  Layers,
  FlaskConical,
  MessageSquare,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  FileNode,
  AgentWorkflowType,
  AgentWorkspaceStep,
  FilePatchProposal,
  AgentRunResult,
} from '../../types';
import { VSCodeThemeDefinition } from '../../services/themes';
import { keyVaultService } from '../../services/keyVaultService';

interface AgentWorkspaceViewProps {
  currentTheme: VSCodeThemeDefinition;
  files: FileNode[];
  activeFile: FileNode | null;
  onApplyCode: (newCode: string) => void;
  onApplyFilePatch?: (path: string, newContent: string) => void;
  onApplyAllPatches?: (patches: Array<{ path: string; newContent: string }>) => void;
  onOpenDiffWithCustomContent?: (file: FileNode, oldContent: string, newContent: string) => void;
  onCreateTestFile?: (name: string, content: string) => void;
  onLoadSampleProject?: (projectType: 'calculator') => void;
  initialPrompt?: string;
  initialWorkflow?: AgentWorkflowType;
  autoRunTrigger?: number;
}

const WORKFLOW_MODES: Array<{
  id: AgentWorkflowType;
  label: string;
  desc: string;
  icon: React.ReactNode;
  badgeColor: string;
}> = [
  {
    id: 'feature',
    label: 'Feature Build',
    desc: 'Plan and build new architectural capabilities across files',
    icon: <Zap size={13} className="text-emerald-400" />,
    badgeColor: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
  },
  {
    id: 'bugfix',
    label: 'Bug Resolution',
    desc: 'Analyze stack trace, catch edge cases, and repair regressions',
    icon: <Cpu size={13} className="text-amber-400" />,
    badgeColor: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
  },
  {
    id: 'refactor',
    label: 'Refactor & Clean',
    desc: 'Modernize types, extract modules, and optimize algorithms',
    icon: <RefreshCw size={13} className="text-sky-400" />,
    badgeColor: 'border-sky-500/40 text-sky-300 bg-sky-500/10',
  },
  {
    id: 'security',
    label: 'Security Audit',
    desc: 'Harden boundaries, sanitize inputs, and plug vulnerabilities',
    icon: <ShieldCheck size={13} className="text-purple-400" />,
    badgeColor: 'border-purple-500/40 text-purple-300 bg-purple-500/10',
  },
];

const QUICK_PROMPTS: Record<AgentWorkflowType, string[]> = {
  feature: [
    "Add VIP coupon 'VIP25' for 25% discount and free shipping threshold over $100 in cartStore.ts",
    'Add responsive error boundary with toast notifications',
    'Add input validation and typed result interfaces',
  ],
  bugfix: [
    'Fix negative quantity updates and floating-point currency rounding in cartStore.ts',
    'Fix unhandled promise rejections and null checks',
    'Guard async fetch with try/catch and abort signal',
  ],
  refactor: [
    'Convert var to const/let and eliminate loose any types in cartStore.ts',
    'Extract helper functions into pure utility module',
    'Optimize loop iteration with memoization',
  ],
  security: [
    'Sanitize shipping address inputs against XSS and validate card expiry format in checkoutService.ts',
    'Sanitize dynamic HTML and strip sensitive debug logs',
    'Enforce strict input length and regex constraints',
  ],
  custom: [
    'Review e-commerce architecture and generate comprehensive unit tests',
    'Analyze workspace dependencies and improve performance',
  ],
};

export const AgentWorkspaceView: React.FC<AgentWorkspaceViewProps> = ({
  currentTheme,
  files,
  activeFile,
  onApplyCode,
  onApplyFilePatch,
  onApplyAllPatches,
  onOpenDiffWithCustomContent,
  onCreateTestFile,
  onLoadSampleProject,
  initialPrompt,
  initialWorkflow,
  autoRunTrigger,
}) => {
  const [activeTab, setActiveTab] = useState<'workspace' | 'diffs' | 'tests' | 'chat'>('workspace');
  const [workflowType, setWorkflowType] = useState<AgentWorkflowType>(initialWorkflow || 'feature');
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [isRunning, setIsRunning] = useState(false);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<string | null>('step-1');
  const [lastRunResult, setLastRunResult] = useState<AgentRunResult | null>(null);
  const [appliedPatches, setAppliedPatches] = useState<Set<string>>(new Set());
  const [appliedAll, setAppliedAll] = useState(false);
  const [copiedTest, setCopiedTest] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialPrompt !== undefined) {
      setPrompt(initialPrompt);
    }
    if (initialWorkflow) {
      setWorkflowType(initialWorkflow);
    }
  }, [initialPrompt, initialWorkflow]);

  // Quick stats computed from current run proposals
  const stats = useMemo(() => {
    if (!lastRunResult || !lastRunResult.files) return { files: 0, additions: 0, deletions: 0 };
    return {
      files: lastRunResult.files.length,
      additions: lastRunResult.files.reduce((acc, f) => acc + (f.additions || 0), 0),
      deletions: lastRunResult.files.reduce((acc, f) => acc + (f.deletions || 0), 0),
    };
  }, [lastRunResult]);

  const handleRunWorkspace = async (customPrompt?: string) => {
    const query = (customPrompt || prompt).trim();
    if (!query) return;

    setIsRunning(true);
    setStatusMessage('Orchestrating agents: Planner is decomposing workspace scope...');
    setAppliedAll(false);

    try {
      const workspaceSummary = files.slice(0, 8).map((f) => ({
        path: f.path || f.name,
        name: f.name,
        content: (f.content || '').slice(0, 2000),
      }));

      const activeConfig = keyVaultService.getActiveConfig();
      const userApiKey = keyVaultService.getKey(activeConfig.provider);

      const res = await fetch('/api/ai/agent-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          workflowType,
          provider: activeConfig.provider,
          model: activeConfig.modelId,
          userApiKey,
          activeFile: activeFile
            ? {
                path: activeFile.path || activeFile.name,
                name: activeFile.name,
                content: activeFile.content || '',
                language: activeFile.language || 'plaintext',
              }
            : null,
          workspaceFiles: workspaceSummary,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.details || payload?.error || `Server returned HTTP ${res.status}`);
      }

      const data: AgentRunResult = payload;
      setLastRunResult(data);
      if (data.files && data.files.length > 0) {
        setExpandedFileId(data.files[0].id);
        setActiveTab('diffs'); // Auto-switch to staged diff deck for immediate review!
      }
      setStatusMessage('Sprint completed: Review staged patches below');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Agent workspace failed:', err);
      setStatusMessage(`Agent error: ${err?.message || 'Check Key Vault API key configuration'}`);
      setTimeout(() => setStatusMessage(null), 6000);
    } finally {
      setIsRunning(false);
    }
  };

  React.useEffect(() => {
    if (autoRunTrigger && initialPrompt) {
      handleRunWorkspace(initialPrompt);
    }
  }, [autoRunTrigger]);

  const handleApplySingle = (patch: FilePatchProposal) => {
    if (onApplyFilePatch) {
      onApplyFilePatch(patch.path, patch.newContent);
    } else {
      onApplyCode(patch.newContent);
    }

    setAppliedPatches((prev) => new Set(prev).add(patch.id));
    setStatusMessage(`Merged patch for ${patch.fileName}`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleApplyAll = () => {
    if (!lastRunResult || !lastRunResult.files) return;

    if (onApplyAllPatches) {
      onApplyAllPatches(
        lastRunResult.files.map((f) => ({ path: f.path, newContent: f.newContent }))
      );
    } else {
      // Apply active file if match
      const target = lastRunResult.files.find(
        (f) => !activeFile || f.path === activeFile.path || f.fileName === activeFile.name
      );
      if (target) {
        onApplyCode(target.newContent);
      }
    }

    const allIds = new Set(lastRunResult.files.map((f) => f.id));
    setAppliedPatches(allIds);
    setAppliedAll(true);
    setStatusMessage(`Successfully merged all ${lastRunResult.files.length} file patches`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDiscardSingle = (patchId: string) => {
    if (!lastRunResult) return;
    setLastRunResult({
      ...lastRunResult,
      files: lastRunResult.files.filter((f) => f.id !== patchId),
    });
    setAppliedPatches((prev) => {
      const next = new Set(prev);
      next.delete(patchId);
      return next;
    });
  };

  const handleInspectSideBySide = (patch: FilePatchProposal) => {
    if (onOpenDiffWithCustomContent) {
      const matchFile = files.find((f) => f.path === patch.path || f.name === patch.fileName) || activeFile;
      if (matchFile) {
        onOpenDiffWithCustomContent(matchFile, patch.oldContent, patch.newContent);
      }
    } else {
      // Fallback: apply code so working tree diff detects it
      onApplyCode(patch.newContent);
    }
  };

  const handleSaveTestSuite = () => {
    if (!lastRunResult?.testsGenerated) return;
    const testFileName = activeFile
      ? activeFile.name.replace(/\.[^/.]+$/, '.test.ts')
      : 'agent_suite.test.ts';

    if (onCreateTestFile) {
      onCreateTestFile(testFileName, lastRunResult.testsGenerated);
      setStatusMessage(`Created test suite: ${testFileName}`);
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      navigator.clipboard.writeText(lastRunResult.testsGenerated);
      setCopiedTest(true);
      setTimeout(() => setCopiedTest(false), 2000);
    }
  };

  // Helper to render colored diff lines
  const renderInlineDiffHunks = (diffText: string) => {
    const lines = diffText.split('\n');
    return (
      <div className="font-mono text-[11px] leading-relaxed bg-[#0a0d14] rounded border border-[#21262d] overflow-x-auto p-2">
        {lines.map((line, idx) => {
          let lineStyle = 'text-[#8b949e]';
          let bgStyle = '';
          let prefix = '';

          if (line.startsWith('+++') || line.startsWith('---')) {
            lineStyle = 'text-[#58a6ff] font-bold';
            bgStyle = 'bg-blue-950/20';
          } else if (line.startsWith('@@')) {
            lineStyle = 'text-[#d2a8ff] font-semibold';
            bgStyle = 'bg-purple-950/20';
          } else if (line.startsWith('+')) {
            lineStyle = 'text-[#7ee787]';
            bgStyle = 'bg-[#033a16]/30 border-l-2 border-emerald-500';
            prefix = '+';
          } else if (line.startsWith('-')) {
            lineStyle = 'text-[#ffa198]';
            bgStyle = 'bg-[#490202]/30 border-l-2 border-red-500';
            prefix = '-';
          }

          return (
            <div key={idx} className={`px-1.5 py-0.5 whitespace-pre flex items-start gap-1 ${bgStyle}`}>
              <span className={`w-3 select-none text-[10px] shrink-0 ${lineStyle}`}>{prefix}</span>
              <span className={`${lineStyle} break-all`}>
                {line.startsWith('+') || line.startsWith('-') ? line.slice(1) : line}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      id="compillo-ai-multiagent-workspace"
      className="flex flex-col h-full select-none text-[12px] overflow-hidden"
      style={{
        backgroundColor: currentTheme.ui.sideBarBg,
        color: currentTheme.ui.sideBarFg,
      }}
    >
      {/* Top Banner: Studio Engine & Status */}
      <div className="p-3 border-b border-[#21262d] bg-gradient-to-r from-emerald-950/20 via-sky-950/20 to-transparent flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-emerald-500 via-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-emerald-500/30">
            <Layers size={13} />
          </div>
          <div>
            <div className="font-semibold text-white flex items-center gap-1.5">
              Multi-Agent Studio
              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 font-mono rounded border border-emerald-500/30">
                Gemini 3.8
              </span>
            </div>
            <div className="text-[10px] text-[#8b949e] flex items-center gap-1">
              <span>{activeFile ? activeFile.name : 'Workspace Wide'}</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">4 Agents Ready</span>
            </div>
          </div>
        </div>

        {stats.files > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 border border-[#30363d]">
            <span className="text-emerald-400">+{stats.additions}</span>
            <span className="text-red-400">-{stats.deletions}</span>
          </div>
        )}
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center border-b border-[#21262d] bg-[#0d1117] px-2 shrink-0">
        <button
          onClick={() => setActiveTab('workspace')}
          className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors ${
            activeTab === 'workspace'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
          }`}
        >
          <Cpu size={12} className={activeTab === 'workspace' ? 'text-emerald-400' : ''} />
          <span>Sprint</span>
        </button>

        <button
          onClick={() => setActiveTab('diffs')}
          className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors relative ${
            activeTab === 'diffs'
              ? 'border-sky-500 text-white'
              : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
          }`}
        >
          <Split size={12} className={activeTab === 'diffs' ? 'text-sky-400' : ''} />
          <span>Inline Diffs</span>
          {stats.files > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 text-[9px] font-mono rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
              {stats.files}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors ${
            activeTab === 'tests'
              ? 'border-purple-500 text-white'
              : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]'
          }`}
        >
          <FlaskConical size={12} className={activeTab === 'tests' ? 'text-purple-400' : ''} />
          <span>Tests</span>
        </button>
      </div>

      {/* Notification / Toast Banner if active */}
      {statusMessage && (
        <div className="px-3 py-1.5 bg-emerald-950/40 border-b border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2 animate-in fade-in shrink-0">
          <Check size={12} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'workspace' && (
          <div className="space-y-3">

            {/* Workflow Mode Selector */}
            <div>
              <div className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider mb-1.5">
                Target Workflow Mode
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {WORKFLOW_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setWorkflowType(mode.id)}
                    className={`flex items-center gap-1.5 p-2 rounded-lg border text-left transition-all ${
                      workflowType === mode.id
                        ? `${mode.badgeColor} shadow-xs`
                        : 'border-[#21262d] bg-[#161b22] text-[#8b949e] hover:border-[#30363d] hover:text-white'
                    }`}
                  >
                    <div className="shrink-0">{mode.icon}</div>
                    <div className="overflow-hidden">
                      <div className="font-semibold text-[11px] leading-tight truncate">
                        {mode.label}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Prompt Chips */}
            <div>
              <div className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Recommended Sprint Tasks</span>
                <span className="text-[9px] text-[#484f58]">1-Click Run</span>
              </div>
              <div className="space-y-1">
                {(QUICK_PROMPTS[workflowType] || QUICK_PROMPTS.feature).map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPrompt(p);
                      handleRunWorkspace(p);
                    }}
                    className="w-full text-left p-1.5 rounded bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] hover:text-white border border-[#21262d] text-[11px] transition-colors flex items-center justify-between group"
                  >
                    <span className="truncate pr-2">{p}</span>
                    <ArrowRight size={11} className="text-[#8b949e] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input Form */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider">
                Sprint Directive
              </div>
              <div className="relative rounded-lg border border-[#30363d] bg-[#0d1117] focus-within:border-emerald-500 transition-colors">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleRunWorkspace();
                    }
                  }}
                  rows={3}
                  placeholder={`Describe changes for ${activeFile ? activeFile.name : 'project'}... (Ctrl+Enter to run)`}
                  className="w-full bg-transparent p-2.5 text-white text-xs outline-none resize-none leading-relaxed"
                />
                <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-[#21262d] bg-[#161b22]/50 text-[10px] text-[#8b949e]">
                  <span>Scope: {activeFile ? activeFile.name : 'All Files'}</span>
                  <button
                    onClick={() => handleRunWorkspace()}
                    disabled={isRunning || !prompt.trim()}
                    className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] disabled:opacity-40 transition-all shadow-xs"
                  >
                    {isRunning ? (
                      <>
                        <RefreshCw size={11} className="animate-spin" />
                        <span>Orchestrating...</span>
                      </>
                    ) : (
                      <>
                        <Play size={11} />
                        <span>Run Agents</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Active Multi-Agent Pipeline Timeline */}
            {lastRunResult && (
              <div className="pt-2 border-t border-[#21262d] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider">
                    Agent Orchestration Log
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {lastRunResult.durationMs ? `${lastRunResult.durationMs}ms` : 'Completed'}
                  </span>
                </div>

                <div className="p-2 rounded bg-[#161b22] border border-[#30363d] text-[11px] text-[#c9d1d9] leading-relaxed">
                  <span className="font-semibold text-white">Summary: </span>
                  {lastRunResult.summary}
                </div>

                <div className="space-y-1.5">
                  {lastRunResult.steps.map((step) => {
                    const isExpanded = expandedStepId === step.id;
                    const agentColors: Record<string, string> = {
                      planner: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
                      coder: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                      reviewer: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
                      tester: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
                    };

                    return (
                      <div
                        key={step.id}
                        className="rounded border border-[#21262d] bg-[#0d1117] overflow-hidden"
                      >
                        <button
                          onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                          className="w-full flex items-center justify-between p-2 text-left hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            <span
                              className={`px-1.5 py-0.2 rounded font-mono text-[9px] uppercase border font-semibold ${
                                agentColors[step.agent] || 'text-zinc-400'
                              }`}
                            >
                              {step.agent}
                            </span>
                            <span className="font-medium text-white truncate text-[11px]">
                              {step.title}
                            </span>
                          </div>
                          <span className="text-[9px] text-[#8b949e] shrink-0 font-mono">
                            {step.timestamp}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-2.5 pt-1 text-[11px] text-[#8b949e] border-t border-[#21262d] bg-black/20 leading-relaxed whitespace-pre-wrap">
                            {step.details}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Inline Diff Staging Deck */}
        {activeTab === 'diffs' && (
          <div className="space-y-3">
            {/* Header controls for diff deck */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#161b22] border border-[#30363d]">
              <div>
                <div className="font-semibold text-white text-[12px] flex items-center gap-1.5">
                  <span>Staged Modifications</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono">
                    {lastRunResult?.files?.length || 0} files
                  </span>
                </div>
                <div className="text-[10px] text-[#8b949e]">
                  Review diff hunks inline before applying
                </div>
              </div>

              {lastRunResult?.files && lastRunResult.files.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleApplyAll}
                    disabled={appliedAll}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[10px] transition-colors disabled:opacity-40"
                  >
                    <CheckCheck size={11} />
                    <span>{appliedAll ? 'All Applied' : 'Apply All'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* List of File Proposals */}
            {(!lastRunResult?.files || lastRunResult.files.length === 0) ? (
              <div className="p-6 text-center text-[#8b949e] rounded-lg border border-dashed border-[#30363d] space-y-2">
                <FileCode size={24} className="mx-auto text-[#484f58]" />
                <div className="text-[12px] text-white font-medium">No Pending Diffs</div>
                <div className="text-[11px]">
                  Run a directive from the Sprint tab to generate multi-agent file patches.
                </div>
                <button
                  onClick={() => setActiveTab('workspace')}
                  className="mt-2 px-3 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-white text-[11px] inline-flex items-center gap-1"
                >
                  <Zap size={11} className="text-emerald-400" />
                  <span>Start Sprint</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {lastRunResult.files.map((filePatch) => {
                  const isExpanded = expandedFileId === filePatch.id;
                  const isApplied = appliedPatches.has(filePatch.id);

                  return (
                    <div
                      key={filePatch.id}
                      className={`rounded-lg border transition-all overflow-hidden ${
                        isApplied
                          ? 'border-emerald-500/40 bg-emerald-950/10'
                          : 'border-[#30363d] bg-[#161b22]'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="p-2.5 flex items-center justify-between border-b border-[#21262d] bg-black/20">
                        <div
                          onClick={() => setExpandedFileId(isExpanded ? null : filePatch.id)}
                          className="flex items-center gap-2 cursor-pointer overflow-hidden flex-1 mr-2"
                        >
                          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          <FileCode size={14} className="text-sky-400 shrink-0" />
                          <div className="overflow-hidden">
                            <div className="font-semibold text-white text-[12px] truncate">
                              {filePatch.fileName}
                            </div>
                            <div className="text-[10px] text-[#8b949e] font-mono truncate">
                              {filePatch.path}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Diff stats badge */}
                          <div className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-[#30363d]">
                            <span className="text-emerald-400">+{filePatch.additions}</span>
                            <span className="text-red-400">-{filePatch.deletions}</span>
                          </div>

                          {/* Risk badge */}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border ${
                              filePatch.riskLevel === 'high'
                                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                : filePatch.riskLevel === 'medium'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {filePatch.riskLevel} risk
                          </span>
                        </div>
                      </div>

                      {/* Reviewer Note Pill */}
                      <div className="px-3 py-1.5 bg-[#0d1117] border-b border-[#21262d] flex items-start gap-1.5 text-[11px] text-[#8b949e]">
                        <ShieldCheck size={12} className="text-purple-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{filePatch.reviewNotes}</span>
                      </div>

                      {/* Action Bar */}
                      <div className="px-3 py-2 bg-[#161b22] flex items-center justify-between border-b border-[#21262d]">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleApplySingle(filePatch)}
                            disabled={isApplied}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium text-[11px] transition-colors ${
                              isApplied
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            <Check size={11} />
                            <span>{isApplied ? 'Applied' : 'Apply Patch'}</span>
                          </button>

                          <button
                            onClick={() => handleInspectSideBySide(filePatch)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white text-[11px] transition-colors"
                            title="Open side-by-side split diff in editor"
                          >
                            <Split size={11} />
                            <span>Split View</span>
                          </button>
                        </div>

                        <button
                          onClick={() => handleDiscardSingle(filePatch.id)}
                          className="p-1 rounded text-[#8b949e] hover:text-red-400 hover:bg-white/5 transition-colors"
                          title="Discard patch"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Expandable Inline Diff Hunks */}
                      {isExpanded && (
                        <div className="p-2.5 bg-[#0d1117] space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-[#8b949e] font-mono">
                            <span>Unified Patch View</span>
                            <span>{filePatch.fileName}</span>
                          </div>
                          {renderInlineDiffHunks(filePatch.diff)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Test Suite Synthesis */}
        {activeTab === 'tests' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-[#161b22] border border-[#30363d]">
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-white text-[12px] flex items-center gap-1.5">
                  <FlaskConical size={13} className="text-purple-400" />
                  <span>Synthesized Test Suite</span>
                </div>
                {lastRunResult?.testsGenerated && (
                  <button
                    onClick={handleSaveTestSuite}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium text-[11px] transition-colors"
                  >
                    {copiedTest ? <Check size={11} /> : <FileCheck size={11} />}
                    <span>{onCreateTestFile ? 'Save Test File' : copiedTest ? 'Copied' : 'Copy Tests'}</span>
                  </button>
                )}
              </div>
              <div className="text-[11px] text-[#8b949e]">
                Tester Agent automatically generates isolated assertions guarding against edge regressions.
              </div>
            </div>

            {lastRunResult?.testsGenerated ? (
              <div className="rounded-lg border border-[#30363d] bg-[#0d1117] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#21262d] bg-black/40 text-[10px] font-mono text-[#8b949e]">
                  <span>Vitest / Jest Suite</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(lastRunResult.testsGenerated || '');
                      setCopiedTest(true);
                      setTimeout(() => setCopiedTest(false), 2000);
                    }}
                    className="flex items-center gap-1 hover:text-white"
                  >
                    {copiedTest ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                    <span>{copiedTest ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 text-[11px] font-mono text-[#79c0ff] overflow-x-auto max-h-80 leading-relaxed whitespace-pre">
                  <code>{lastRunResult.testsGenerated}</code>
                </pre>
              </div>
            ) : (
              <div className="p-6 text-center text-[#8b949e] rounded-lg border border-dashed border-[#30363d] space-y-2">
                <FlaskConical size={24} className="mx-auto text-[#484f58]" />
                <div className="text-[12px] text-white font-medium">No Tests Synthesized Yet</div>
                <div className="text-[11px]">
                  Run a Feature or Bug Resolution sprint to generate an automated test suite.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
