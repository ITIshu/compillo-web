import React, { useState, useEffect } from 'react';
import {
  X,
  Github,
  Key,
  Lock,
  Globe,
  GitBranch,
  ArrowUpFromLine,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  FolderGit2,
  FileCode,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';
import { VSCodeThemeDefinition } from '../../services/themes';
import { FileNode } from '../../types';
import { getAllFiles } from '../../services/fileSystem';
import {
  githubSyncService,
  GitHubSyncState,
  GitHubUser,
} from '../../services/githubService';

interface QuickGitHubPushModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: VSCodeThemeDefinition;
  files: FileNode[];
  modifiedFiles?: FileNode[];
  onCommitLocal?: (message: string) => void;
}

export const QuickGitHubPushModal: React.FC<QuickGitHubPushModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  files,
  modifiedFiles = [],
  onCommitLocal,
}) => {
  const [authMode, setAuthMode] = useState<'pat' | 'oauth'>('pat');
  const [githubState, setGithubState] = useState<GitHubSyncState>(() =>
    githubSyncService.getState()
  );

  // Form fields
  const [githubId, setGithubId] = useState('');
  const [patToken, setPatToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [repoName, setRepoName] = useState('');
  const [branch, setBranch] = useState('main');
  const [isPrivate, setIsPrivate] = useState(false);
  const [autoCreate, setAutoCreate] = useState(true);
  const [commitMessage, setCommitMessage] = useState('Push project files via Compillo Studio');

  // Push progress & results
  const [isPushing, setIsPushing] = useState(false);
  const [pushStep, setPushStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pushResult, setPushResult] = useState<{
    commitSha?: string;
    repoUrl?: string;
    htmlUrl?: string;
    filesCount?: number;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Token testing state
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<GitHubUser | null>(null);

  useEffect(() => {
    const unsub = githubSyncService.subscribe((state) => {
      setGithubState(state);
      if (state.user) {
        setVerifiedUser(state.user);
        if (!githubId) setGithubId(state.user.login);
      }
    });
    return unsub;
  }, [isOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      const savedId = localStorage.getItem('compillo_github_id') || '';
      const savedToken = localStorage.getItem('compillo_github_token') || '';
      const savedRepo = localStorage.getItem('compillo_github_repo') || '';

      if (savedId) setGithubId(savedId);
      if (savedToken) setPatToken(savedToken);
      if (savedRepo) {
        // Strip owner if saved as owner/repo
        setRepoName(savedRepo.replace(/^.*\//, ''));
      } else {
        setRepoName('compillo-project');
      }

      setErrorMessage(null);
      setPushResult(null);
      setIsPushing(false);
      setPushStep('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Compute file list to push: all workspace files or modified files
  const allWorkspaceFiles = getAllFiles(files).filter(
    (f) => f.type === 'file' && typeof f.content === 'string'
  );
  const filesToPush = allWorkspaceFiles.map((f) => ({
    path: f.path.startsWith('/') ? f.path.slice(1) : f.path,
    name: f.name,
    content: f.content || '',
  }));

  const handleTestToken = async () => {
    if (!patToken.trim()) {
      setErrorMessage('Please enter a GitHub Personal Access Token');
      return;
    }
    setIsValidatingToken(true);
    setErrorMessage(null);
    const res = await githubSyncService.verifyPersonalAccessToken(patToken.trim(), githubId.trim());
    setIsValidatingToken(false);

    if (res.success && res.user) {
      setVerifiedUser(res.user);
      setGithubId(res.user.login);
      localStorage.setItem('compillo_github_token', patToken.trim());
      localStorage.setItem('compillo_github_id', res.user.login);
    } else {
      setErrorMessage(res.error || 'Token verification failed');
    }
  };

  const handleConnectOAuth = async () => {
    setErrorMessage(null);
    await githubSyncService.initiateOAuthPopup();
  };

  const handleExecutePush = async () => {
    setErrorMessage(null);
    setPushResult(null);

    const tokenToUse = (patToken.trim() || githubState.token || '').trim();
    if (!tokenToUse) {
      setErrorMessage('Please enter your GitHub Personal Access Token or authenticate via OAuth.');
      return;
    }

    if (!repoName.trim()) {
      setErrorMessage('Please provide a destination repository name.');
      return;
    }

    if (filesToPush.length === 0) {
      setErrorMessage('No workspace code files found to push.');
      return;
    }

    setIsPushing(true);
    setPushStep('1/4 Verifying GitHub credentials...');

    try {
      setTimeout(() => {
        if (isPushing) setPushStep(`2/4 Checking & preparing repository "${repoName}"...`);
      }, 700);

      setTimeout(() => {
        if (isPushing) setPushStep(`3/4 Uploading ${filesToPush.length} code files as Git blobs...`);
      }, 1500);

      const res = await githubSyncService.quickPushWorkspaceFiles({
        githubId: githubId.trim() || undefined,
        token: tokenToUse,
        repoName: repoName.trim(),
        branch: branch.trim() || 'main',
        isPrivate,
        autoCreate,
        commitMessage: commitMessage.trim() || 'Push project files via Compillo Studio',
        files: filesToPush,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to push files to repository.');
      }

      setPushStep('4/4 Updated branch ref successfully!');
      setPushResult({
        commitSha: res.commitSha,
        repoUrl: res.repoUrl,
        htmlUrl: res.htmlUrl,
        filesCount: res.filesCount || filesToPush.length,
      });

      if (onCommitLocal) {
        onCommitLocal(commitMessage);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Push failed. Please check repository permissions.');
    } finally {
      setIsPushing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl rounded-xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        style={{
          backgroundColor: currentTheme.ui.editorBg || '#0f172a',
          borderColor: currentTheme.ui.sideBarBorder || '#334155',
          color: currentTheme.ui.sideBarFg || '#f1f5f9',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: currentTheme.ui.sideBarBorder || '#334155' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Github size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Push Workspace to GitHub
                </h2>
                <span className="text-[11px] text-emerald-400 font-mono">Instant Export</span>
              </div>
              <p className="text-xs text-slate-400">
                Push all code files directly into your GitHub account with auto-repo creation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-rose-400 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Success Screen if completed */}
          {pushResult ? (
            <div className="py-6 px-4 text-center space-y-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
                <CheckCircle2 size={28} />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Repository Pushed Successfully!</h3>
                <p className="text-xs text-slate-300">
                  Uploaded {pushResult.filesCount || filesToPush.length} code files to GitHub branch <strong>{branch}</strong>.
                </p>
              </div>

              {pushResult.repoUrl && (
                <div className="p-3 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between text-xs font-mono text-slate-300 max-w-md mx-auto">
                  <span className="truncate pr-2">{pushResult.repoUrl}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => copyToClipboard(pushResult.repoUrl!)}
                      className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
                      title="Copy URL"
                    >
                      {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                    <a
                      href={pushResult.htmlUrl || pushResult.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] flex items-center gap-1"
                    >
                      <span>Open ↗</span>
                    </a>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Dual-Mode Auth Switcher */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200">
                    1. Authentication Method
                  </label>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/40 border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setAuthMode('pat')}
                      className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        authMode === 'pat'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Personal Access Token (Instant)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('oauth')}
                      className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        authMode === 'oauth'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      OAuth Sign-In
                    </button>
                  </div>
                </div>

                {authMode === 'pat' ? (
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* GitHub Username / ID */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-slate-300">GitHub ID / Username</span>
                        <input
                          type="text"
                          value={githubId}
                          onChange={(e) => setGithubId(e.target.value)}
                          placeholder="e.g. ishantsaraogi or klavania"
                          className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-slate-700 focus:border-sky-500 focus:outline-none text-slate-200 font-mono"
                        />
                      </div>

                      {/* Personal Access Token */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-slate-300">Personal Access Token (PAT)</span>
                          <a
                            href="https://github.com/settings/tokens/new?scopes=repo,read:user,user:email&description=Compillo%20IDE%20Sync"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5"
                          >
                            <span>Generate Token</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                        <div className="relative">
                          <input
                            type={showToken ? 'text' : 'password'}
                            value={patToken}
                            onChange={(e) => setPatToken(e.target.value)}
                            placeholder="ghp_... or github_pat_..."
                            className="w-full px-3 py-1.5 pr-8 text-xs rounded-lg bg-black/40 border border-slate-700 focus:border-sky-500 focus:outline-none text-slate-200 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowToken(!showToken)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <div className="text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                        <span>Requires standard <code>repo</code> scope to write files.</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleTestToken}
                        disabled={isValidatingToken || !patToken.trim()}
                        className="px-2.5 py-1 text-[11px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-colors flex items-center gap-1"
                      >
                        {isValidatingToken && <RefreshCw size={11} className="animate-spin" />}
                        <span>Verify Token</span>
                      </button>
                    </div>

                    {verifiedUser && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                        <CheckCircle2 size={13} />
                        <span>Verified: @{verifiedUser.login} ({verifiedUser.name || 'GitHub User'})</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 text-center space-y-3">
                    {githubState.isConnected && githubState.user ? (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5">
                        <div className="flex items-center gap-2 text-xs text-white">
                          <img
                            src={githubState.user.avatar_url}
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                          <span>Connected as @{githubState.user.login}</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono">OAuth Active</span>
                      </div>
                    ) : (
                      <div className="space-y-2 py-2">
                        <p className="text-xs text-slate-400">
                          Sign in securely with GitHub to authorize Compillo to push to your repositories.
                        </p>
                        <button
                          type="button"
                          onClick={handleConnectOAuth}
                          className="px-4 py-2 rounded-lg bg-[#24292f] hover:bg-[#1a1f24] text-white border border-white/20 font-medium text-xs inline-flex items-center gap-2 shadow-sm"
                        >
                          <Github size={14} />
                          <span>Sign in with GitHub (OAuth)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Repository Details */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-200">
                  2. Destination Repository
                </label>

                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Repository Name */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-slate-300">Repository Name</span>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 border border-slate-700 text-xs font-mono text-slate-200">
                        <FolderGit2 size={13} className="text-sky-400 shrink-0" />
                        <input
                          type="text"
                          value={repoName}
                          onChange={(e) => setRepoName(e.target.value)}
                          placeholder="e.g. my-compillo-project"
                          className="w-full bg-transparent outline-none text-slate-200"
                        />
                      </div>
                    </div>

                    {/* Target Branch */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-slate-300">Branch</span>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 border border-slate-700 text-xs font-mono text-slate-200">
                        <GitBranch size={13} className="text-emerald-400 shrink-0" />
                        <input
                          type="text"
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          placeholder="main"
                          className="w-full bg-transparent outline-none text-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Auto-create & Privacy Toggles */}
                  <div className="pt-1 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-800/80">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={autoCreate}
                        onChange={(e) => setAutoCreate(e.target.checked)}
                        className="rounded border-slate-700 text-sky-600 focus:ring-0"
                      />
                      <span>Auto-create repository on GitHub if not found</span>
                    </label>

                    {autoCreate && (
                      <div className="flex items-center gap-1 p-0.5 rounded bg-black/40 border border-slate-800 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setIsPrivate(false)}
                          className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                            !isPrivate ? 'bg-sky-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          <Globe size={11} />
                          <span>Public</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsPrivate(true)}
                          className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                            isPrivate ? 'bg-amber-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          <Lock size={11} />
                          <span>Private</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Commit message */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-medium text-slate-300">Commit Message</span>
                    <input
                      type="text"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Commit message"
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-slate-700 focus:border-sky-500 focus:outline-none text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Files Payload Summary */}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode size={14} className="text-sky-400" />
                  <span>
                    Ready to commit <strong>{filesToPush.length} workspace files</strong>
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  All Project Code · UTF-8
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!pushResult && (
          <div
            className="flex items-center justify-between px-6 py-4 border-t bg-slate-950/40 shrink-0"
            style={{ borderColor: currentTheme.ui.sideBarBorder || '#334155' }}
          >
            <div className="text-xs text-slate-400">
              {isPushing ? (
                <span className="text-emerald-400 flex items-center gap-2 font-mono">
                  <RefreshCw size={13} className="animate-spin" />
                  <span>{pushStep || 'Pushing changes...'}</span>
                </span>
              ) : (
                <span>Destination: github.com/{githubId || '<user>'}/{repoName}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPushing}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePush}
                disabled={isPushing || (!patToken.trim() && !githubState.token)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-md active:scale-98"
              >
                {isPushing ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <ArrowUpFromLine size={13} />
                )}
                <span>Push All Files to GitHub</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
