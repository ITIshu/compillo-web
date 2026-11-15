import React, { useState, useEffect } from 'react';
import {
  GitCommit,
  Check,
  RotateCcw,
  GitBranch,
  Split,
  Github,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  ExternalLink,
  Plus,
  Key,
  LogOut,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Lock,
  Globe,
  ChevronDown,
} from 'lucide-react';
import { FileNode } from '../../types';
import { FileIcon } from '../Common/FileIcon';
import {
  githubSyncService,
  GitHubSyncState,
  GitHubRepo,
} from '../../services/githubService';
import { getAllFiles } from '../../services/fileSystem';

interface SourceControlViewProps {
  modifiedFiles: FileNode[];
  files: FileNode[];
  onCommit: (message: string) => void;
  onRevertFile: (fileId: string) => void;
  onOpenDiff: (fileId: string) => void;
  onOpenFile: (fileId: string) => void;
  onImportPulledFiles?: (
    files: Array<{ path: string; name: string; content: string; language: string }>
  ) => void;
  onOpenSettings?: () => void;
  onOpenQuickPushToGitHub?: () => void;
}

export const SourceControlView: React.FC<SourceControlViewProps> = ({
  modifiedFiles,
  files,
  onCommit,
  onRevertFile,
  onOpenDiff,
  onOpenFile,
  onImportPulledFiles,
  onOpenSettings,
  onOpenQuickPushToGitHub,
}) => {
  const [commitMessage, setCommitMessage] = useState('');
  const [githubState, setGithubState] = useState<GitHubSyncState>(() =>
    githubSyncService.getState()
  );

  // UI state
  const [activeTab, setActiveTab] = useState<'changes' | 'github'>('changes');
  const [patInput, setPatInput] = useState('');
  const [showPatInput, setShowPatInput] = useState(false);
  const [showOAuthHelp, setShowOAuthHelp] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [showNewBranchModal, setShowNewBranchModal] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [successBanner, setSuccessBanner] = useState<{ message: string; link?: string } | null>(
    null
  );

  useEffect(() => {
    return githubSyncService.subscribe((state) => {
      setGithubState(state);
    });
  }, []);

  const handleCommitLocal = () => {
    if (!commitMessage.trim()) return;
    onCommit(commitMessage.trim());
    setCommitMessage('');
  };

  const handleConnectOAuth = async () => {
    setSuccessBanner(null);
    await githubSyncService.initiateOAuthPopup();
  };

  const handleConnectPat = async () => {
    if (!patInput.trim()) return;
    setSuccessBanner(null);
    const success = await githubSyncService.loginWithToken(patInput.trim());
    if (success) {
      setPatInput('');
      setShowPatInput(false);
    }
  };

  const handlePullFromGitHub = async () => {
    if (!githubState.selectedRepo) return;
    const confirmPull = confirm(
      `Pull files from "${githubState.selectedRepo.name}" (branch: ${githubState.selectedBranch})? This will sync files into your local workspace.`
    );
    if (!confirmPull) return;

    setSuccessBanner(null);
    const res = await githubSyncService.pullRepositoryFiles();
    if (res.success && res.files) {
      if (onImportPulledFiles) {
        onImportPulledFiles(res.files);
      }
      setSuccessBanner({
        message: `Successfully pulled ${res.files.length} files from branch "${githubState.selectedBranch}"!`,
      });
    }
  };

  const handlePushToGitHub = async () => {
    if (!githubState.selectedRepo) return;

    const message =
      commitMessage.trim() ||
      `Update workspace files via Compillo (${new Date().toLocaleTimeString()})`;

    // Get files to commit: modified files if any, or all workspace files
    const all = getAllFiles(files).filter((f) => f.type === 'file' && f.content !== undefined);
    const filesToCommit = (modifiedFiles.length > 0 ? modifiedFiles : all).map((f) => ({
      path: f.path,
      name: f.name,
      content: f.content || '',
    }));

    if (filesToCommit.length === 0) {
      alert('No files available in workspace to push.');
      return;
    }

    setSuccessBanner(null);
    const res = await githubSyncService.pushWorkspaceChanges(filesToCommit, message);
    if (res.success) {
      setCommitMessage('');
      setSuccessBanner({
        message: `Pushed ${filesToCommit.length} file(s) to branch "${githubState.selectedBranch}"!`,
        link: res.htmlUrl,
      });
      // Also commit locally to clear dirty flags
      onCommit(message);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    const ok = await githubSyncService.createNewBranch(newBranchName.trim());
    if (ok) {
      setNewBranchName('');
      setShowNewBranchModal(false);
    }
  };

  const filteredRepos = (githubState.repos || []).filter(
    (r) =>
      r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
      r.full_name.toLowerCase().includes(repoSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full select-none text-[12px]">
      {/* Top Tabs: Changes vs Sync with GitHub */}
      <div className="flex border-b border-[#2b2b2b] bg-black/20 text-[11px] font-medium">
        <button
          onClick={() => setActiveTab('changes')}
          className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'changes'
              ? 'border-[#007acc] text-white bg-white/5 font-semibold'
              : 'border-transparent text-[#888888] hover:text-[#cccccc]'
          }`}
        >
          <GitCommit size={13} />
          <span>Changes</span>
          {modifiedFiles.length > 0 && (
            <span className="bg-[#007acc] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {modifiedFiles.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('github')}
          className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeTab === 'github'
              ? 'border-emerald-500 text-white bg-white/5 font-semibold'
              : 'border-transparent text-[#888888] hover:text-[#cccccc]'
          }`}
        >
          <Github size={13} />
          <span>Sync with GitHub</span>
          {githubState.isConnected && (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          )}
        </button>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="m-2 p-2.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11.5px] flex flex-col gap-1">
          <div className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
            <span>{successBanner.message}</span>
          </div>
          {successBanner.link && (
            <a
              href={successBanner.link}
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:underline flex items-center gap-1 text-[11px] ml-4"
            >
              <span>View commit on GitHub</span>
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      )}

      {/* Error Banner */}
      {githubState.lastError && (
        <div className="m-2 p-2.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11.5px] flex items-start gap-1.5">
          <AlertCircle size={14} className="shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1 break-words leading-tight">{githubState.lastError}</div>
        </div>
      )}

      {/* TAB 1: CHANGES & COMMIT */}
      {activeTab === 'changes' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header branch info */}
          <div className="p-3 border-b border-[#2b2b2b] space-y-2.5">
            <div className="flex items-center justify-between text-[#888888]">
              <div className="flex items-center gap-1.5 font-medium">
                <GitBranch size={13} className="text-emerald-400" />
                <span className="text-white font-semibold">
                  {githubState.selectedBranch || 'main'}
                </span>
                {githubState.selectedRepo && (
                  <span className="text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                    {githubState.selectedRepo.name}
                  </span>
                )}
              </div>
              <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded-full">
                {modifiedFiles.length} changed
              </span>
            </div>

            {/* Quick Push to GitHub Banner Button */}
            {onOpenQuickPushToGitHub && (
              <button
                type="button"
                onClick={onOpenQuickPushToGitHub}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11.5px] shadow-sm transition-all mb-2 cursor-pointer"
                title="Push all workspace files into your GitHub repository"
              >
                <Github size={14} />
                <span>Quick Push to GitHub Repository</span>
              </button>
            )}

            {/* Commit Message Box */}
            <div className="space-y-1.5">
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Message (Ctrl+Enter to commit)"
                rows={2}
                className="w-full bg-[#222222] border border-[#3c3c3c] rounded p-2 text-white text-[12px] outline-none focus:border-[#007acc] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    if (githubState.isConnected && githubState.selectedRepo) {
                      handlePushToGitHub();
                    } else {
                      handleCommitLocal();
                    }
                  }
                }}
              />

              <div className="flex gap-1.5">
                <button
                  onClick={handleCommitLocal}
                  disabled={!commitMessage.trim() || modifiedFiles.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-40 text-white rounded text-[11.5px] font-medium transition-colors"
                >
                  <Check size={13} />
                  <span>Commit</span>
                </button>

                {githubState.isConnected && githubState.selectedRepo && (
                  <button
                    onClick={handlePushToGitHub}
                    disabled={githubState.isSyncing}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded text-[11.5px] font-medium transition-colors shadow-sm"
                    title={`Push changes to GitHub branch ${githubState.selectedBranch}`}
                  >
                    {githubState.isSyncing && githubState.syncOperation === 'push' ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <ArrowUpFromLine size={13} />
                    )}
                    <span>Commit & Push</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Pull / Push Buttons if GitHub Connected */}
            {githubState.isConnected && githubState.selectedRepo && (
              <div className="pt-1 flex items-center gap-2 text-[11px]">
                <button
                  onClick={handlePullFromGitHub}
                  disabled={githubState.isSyncing}
                  className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 transition-colors border border-white/5"
                  title="Pull latest files from GitHub into workspace"
                >
                  {githubState.isSyncing && githubState.syncOperation === 'pull' ? (
                    <RefreshCw size={11} className="animate-spin" />
                  ) : (
                    <ArrowDownToLine size={11} className="text-sky-400" />
                  )}
                  <span>Pull {githubState.selectedBranch}</span>
                </button>

                <button
                  onClick={handlePushToGitHub}
                  disabled={githubState.isSyncing}
                  className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 transition-colors border border-white/5"
                  title="Push local workspace changes to GitHub"
                >
                  {githubState.isSyncing && githubState.syncOperation === 'push' ? (
                    <RefreshCw size={11} className="animate-spin" />
                  ) : (
                    <ArrowUpFromLine size={11} className="text-emerald-400" />
                  )}
                  <span>Push {githubState.selectedBranch}</span>
                </button>
              </div>
            )}
          </div>

          {/* Changed Files List */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[#888888] bg-black/10 flex items-center justify-between">
              <span>Changes ({modifiedFiles.length})</span>
            </div>

            {modifiedFiles.length === 0 ? (
              <div className="p-6 text-center text-[#888888] space-y-2">
                <GitCommit size={28} className="mx-auto opacity-40" />
                <p className="text-[12px]">No pending local changes.</p>
                <p className="text-[11px] opacity-70">
                  Edit any workspace file to stage changes here, or switch to the Sync with GitHub tab to pull a repository.
                </p>
              </div>
            ) : (
              <div className="py-1">
                {modifiedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="group flex items-center justify-between px-3 py-1.5 hover:bg-white/5 cursor-pointer text-[12px]"
                    onClick={() => onOpenFile(file.id)}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileIcon filename={file.name} size={14} />
                      <span className="truncate text-[#cccccc] group-hover:text-white">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-[#888888] truncate">{file.path}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDiff(file.id);
                        }}
                        title="Open Changes Diff"
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/20 rounded text-[#cccccc]"
                      >
                        <Split size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Discard changes to ${file.name}?`)) {
                            onRevertFile(file.id);
                          }
                        }}
                        title="Discard Changes"
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/20 rounded text-[#cccccc]"
                      >
                        <RotateCcw size={12} />
                      </button>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded ml-1">
                        M
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SYNC WITH GITHUB */}
      {activeTab === 'github' && (
        <div className="flex-1 flex flex-col overflow-y-auto p-3 space-y-4">
          {!githubState.isConnected ? (
            /* DISCONNECTED STATE */
            <div className="space-y-4">
              <div className="text-center p-4 rounded-xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 space-y-3">
                <div className="w-12 h-12 rounded-full bg-white/10 mx-auto flex items-center justify-center text-white shadow-inner">
                  <Github size={28} />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-[13px]">Sync with GitHub</h3>
                  <p className="text-[11.5px] text-gray-400 mt-1 leading-normal">
                    Authenticate via OAuth or token to pull repositories and push your workspace changes to any branch.
                  </p>
                </div>

                {/* Quick Push Dialog Trigger */}
                {onOpenQuickPushToGitHub && (
                  <button
                    type="button"
                    onClick={onOpenQuickPushToGitHub}
                    className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[12px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                  >
                    <ArrowUpFromLine size={15} />
                    <span>Quick Push All Code Files to GitHub</span>
                  </button>
                )}

                {/* Connect via OAuth Button */}
                <button
                  onClick={handleConnectOAuth}
                  disabled={githubState.isSyncing}
                  className="w-full py-2 px-3 rounded-lg bg-[#24292f] hover:bg-[#1a1f24] text-white border border-white/20 font-medium text-[12px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                >
                  <Github size={15} />
                  <span>Authenticate with GitHub (OAuth)</span>
                </button>

                {/* Configure OAuth credentials button if not configured or to edit */}
                <button
                  onClick={onOpenSettings}
                  className="w-full py-1.5 px-3 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/25 font-medium text-[11px] flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>⚙️ {githubState.oauthConfigured ? 'Manage OAuth in Settings' : 'Configure Client ID & Secret in Settings'}</span>
                </button>

                {/* Toggle Token login */}
                <div className="pt-1">
                  <button
                    onClick={() => setShowPatInput(!showPatInput)}
                    className="text-[11px] text-[#007acc] hover:underline flex items-center justify-center gap-1 mx-auto"
                  >
                    <Key size={11} />
                    <span>{showPatInput ? 'Hide Token Login' : 'Or connect using Personal Access Token (PAT)'}</span>
                  </button>
                </div>
              </div>

              {/* Personal Access Token Option */}
              {showPatInput && (
                <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-300">
                    <span className="font-semibold flex items-center gap-1">
                      <Key size={12} className="text-amber-400" />
                      <span>GitHub Personal Access Token</span>
                    </span>
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo,read:user,user:email&description=Compillo%20IDE"
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 hover:underline flex items-center gap-0.5 text-[10px]"
                    >
                      <span>Generate</span>
                      <ExternalLink size={9} />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={patInput}
                    onChange={(e) => setPatInput(e.target.value)}
                    placeholder="ghp_... or github_pat_..."
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded px-2.5 py-1.5 text-white text-[11.5px] outline-none focus:border-[#007acc]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConnectPat();
                    }}
                  />
                  <button
                    onClick={handleConnectPat}
                    disabled={!patInput.trim() || githubState.isSyncing}
                    className="w-full py-1.5 bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-40 text-white rounded text-[11.5px] font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <Check size={12} />
                    <span>Verify & Connect Token</span>
                  </button>
                </div>
              )}

              {/* OAuth Setup Instructions Toggle */}
              <div className="rounded-lg bg-white/5 border border-white/10 overflow-hidden text-[11.5px]">
                <button
                  onClick={() => setShowOAuthHelp(!showOAuthHelp)}
                  className="w-full p-2.5 flex items-center justify-between text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <HelpCircle size={13} className="text-sky-400" />
                    <span>OAuth App Setup Instructions</span>
                  </span>
                  <ChevronDown
                    size={13}
                    className={`transform transition-transform ${showOAuthHelp ? 'rotate-180' : ''}`}
                  />
                </button>

                {showOAuthHelp && (
                  <div className="p-3 border-t border-white/10 space-y-2 text-gray-400 leading-relaxed font-sans text-[11px]">
                    <p>To enable 1-click GitHub OAuth popups:</p>
                    <ol className="list-decimal pl-4 space-y-1.5 text-gray-300">
                      <li>
                        Open{' '}
                        <a
                          href="https://github.com/settings/developers"
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:underline"
                        >
                          GitHub Developer Settings
                        </a>{' '}
                        and click <strong>New OAuth App</strong>.
                      </li>
                      <li>
                        Set <strong>Authorization callback URL</strong> to:
                        <code className="block mt-1 p-1.5 rounded bg-black/60 text-emerald-400 font-mono text-[10px] break-all select-all">
                          {githubState.callbackUrl ||
                            'https://ais-dev-hb5wqb4xvgyuyjvh3abiey-315691611523.asia-east1.run.app/api/auth/github/callback'}
                        </code>
                      </li>
                      <li>
                        Add environment variables in AI Studio:
                        <div className="mt-1 font-mono text-[10px] bg-black/60 p-1.5 rounded space-y-0.5 text-gray-300">
                          <div>GITHUB_CLIENT_ID=&lt;your_client_id&gt;</div>
                          <div>GITHUB_CLIENT_SECRET=&lt;your_client_secret&gt;</div>
                        </div>
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* CONNECTED STATE */
            <div className="space-y-3.5">
              {/* User Profile Card */}
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5 truncate">
                  {githubState.user?.avatar_url ? (
                    <img
                      src={githubState.user.avatar_url}
                      alt={githubState.user.login}
                      className="w-8 h-8 rounded-full border border-white/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      {githubState.user?.login?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="truncate">
                    <div className="font-semibold text-white truncate text-[12px]">
                      {githubState.user?.name || githubState.user?.login}
                    </div>
                    <div className="text-[10.5px] text-gray-400 truncate">
                      @{githubState.user?.login}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => githubSyncService.disconnect()}
                  title="Disconnect GitHub account"
                  className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-rose-400 transition-colors"
                >
                  <LogOut size={14} />
                </button>
              </div>

              {/* Repository Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span className="font-medium text-gray-300">Selected Repository</span>
                  <button
                    onClick={() => githubSyncService.refreshRepositories()}
                    title="Refresh repositories"
                    className="hover:text-white flex items-center gap-1 text-[10.5px]"
                  >
                    <RefreshCw size={10} />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* Dropdown trigger */}
                <div className="relative">
                  <button
                    onClick={() => setShowRepoDropdown(!showRepoDropdown)}
                    className="w-full flex items-center justify-between p-2 rounded bg-black/40 border border-white/10 text-left text-white hover:border-[#007acc] transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {githubState.selectedRepo?.private ? (
                        <Lock size={12} className="text-amber-400 shrink-0" />
                      ) : (
                        <Globe size={12} className="text-sky-400 shrink-0" />
                      )}
                      <span className="font-medium truncate">
                        {githubState.selectedRepo?.full_name || 'Select a repository...'}
                      </span>
                    </div>
                    <ChevronDown size={13} className="text-gray-400 shrink-0" />
                  </button>

                  {/* Dropdown list */}
                  {showRepoDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-[#1e1e1e] border border-white/15 rounded-lg shadow-2xl max-h-56 overflow-y-auto flex flex-col">
                      <div className="p-2 border-b border-white/10 sticky top-0 bg-[#1e1e1e]">
                        <input
                          type="text"
                          value={repoSearch}
                          onChange={(e) => setRepoSearch(e.target.value)}
                          placeholder="Search repositories..."
                          className="w-full bg-[#111111] border border-white/10 rounded px-2 py-1 text-white text-[11px] outline-none focus:border-[#007acc]"
                          autoFocus
                        />
                      </div>

                      {filteredRepos.length === 0 ? (
                        <div className="p-3 text-center text-gray-400 text-[11px]">
                          No repositories found.
                        </div>
                      ) : (
                        filteredRepos.map((repo) => (
                          <button
                            key={repo.id}
                            onClick={() => {
                              githubSyncService.selectRepository(repo);
                              setShowRepoDropdown(false);
                            }}
                            className={`p-2 text-left hover:bg-white/10 flex items-center justify-between text-[11.5px] border-b border-white/5 last:border-0 ${
                              githubState.selectedRepo?.id === repo.id
                                ? 'bg-[#007acc]/20 text-white font-medium'
                                : 'text-gray-300'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <div className="font-medium truncate">{repo.full_name}</div>
                              {repo.description && (
                                <div className="text-[10px] text-gray-400 truncate">
                                  {repo.description}
                                </div>
                              )}
                            </div>
                            {repo.private ? (
                              <Lock size={11} className="text-amber-400 shrink-0" />
                            ) : (
                              <Globe size={11} className="text-sky-400 shrink-0" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Branch Selector & New Branch */}
              {githubState.selectedRepo && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span className="font-medium text-gray-300">Selected Branch</span>
                    <button
                      onClick={() => setShowNewBranchModal(!showNewBranchModal)}
                      className="text-emerald-400 hover:underline flex items-center gap-1 text-[10.5px]"
                    >
                      <Plus size={11} />
                      <span>New Branch</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <select
                        value={githubState.selectedBranch}
                        onChange={(e) => githubSyncService.selectBranch(e.target.value)}
                        className="w-full appearance-none bg-black/40 border border-white/10 rounded p-2 text-white text-[11.5px] font-mono outline-none focus:border-[#007acc] pr-7"
                      >
                        {githubState.branches.map((b) => (
                          <option key={b} value={b} className="bg-[#1e1e1e] text-white">
                            {b}
                          </option>
                        ))}
                      </select>
                      <GitBranch
                        size={12}
                        className="absolute right-2.5 top-3 text-gray-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Inline New Branch Creator */}
                  {showNewBranchModal && (
                    <div className="p-2.5 rounded bg-black/60 border border-emerald-500/30 space-y-2">
                      <div className="text-[11px] font-medium text-emerald-400">
                        Create branch from '{githubState.selectedBranch}'
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newBranchName}
                          onChange={(e) => setNewBranchName(e.target.value)}
                          placeholder="e.g. feature/my-update"
                          className="flex-1 bg-[#1e1e1e] border border-white/10 rounded px-2 py-1 text-white text-[11px] outline-none focus:border-emerald-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateBranch();
                          }}
                        />
                        <button
                          onClick={handleCreateBranch}
                          disabled={!newBranchName.trim() || githubState.isSyncing}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium disabled:opacity-40"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Primary Sync Actions */}
              {githubState.selectedRepo && (
                <div className="pt-2 space-y-2">
                  {/* Pull Button */}
                  <button
                    onClick={handlePullFromGitHub}
                    disabled={githubState.isSyncing}
                    className="w-full py-2 px-3 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 font-medium text-[12px] flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98"
                  >
                    {githubState.isSyncing && githubState.syncOperation === 'pull' ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <ArrowDownToLine size={14} />
                    )}
                    <span>
                      Pull from <strong>{githubState.selectedBranch}</strong>
                    </span>
                  </button>

                  {/* Push Button */}
                  <button
                    onClick={handlePushToGitHub}
                    disabled={githubState.isSyncing}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[12px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
                  >
                    {githubState.isSyncing && githubState.syncOperation === 'push' ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <ArrowUpFromLine size={14} />
                    )}
                    <span>
                      Push changes to <strong>{githubState.selectedBranch}</strong>
                    </span>
                  </button>

                  {githubState.lastSyncAt && (
                    <div className="text-[10px] text-gray-500 text-center pt-1 font-mono">
                      Last sync: {new Date(githubState.lastSyncAt).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
