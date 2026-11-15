import React, { useState, useEffect } from 'react';
import {
  Cloud,
  X,
  Github,
  FolderOpen,
  ArrowRight,
  GitBranch,
  FileCode,
  Download,
  AlertCircle,
  ExternalLink,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { CompilloThemeDefinition } from '../../services/themes';
import { githubSyncService, GitHubSyncState, GitHubRepo } from '../../services/githubService';

interface CloudOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: CompilloThemeDefinition;
  onOpenLocalFile: () => void;
  onSelectGitHubRepo?: (repo: GitHubRepo) => void;
  onPullFromGitHub?: () => void;
  onOpenSettings?: () => void;
}

export const CloudOpenModal: React.FC<CloudOpenModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onOpenLocalFile,
  onSelectGitHubRepo,
  onPullFromGitHub,
  onOpenSettings,
}) => {
  const [githubState, setGithubState] = useState<GitHubSyncState>(() =>
    githubSyncService.getState()
  );
  const [searchRepo, setSearchRepo] = useState('');

  useEffect(() => {
    return githubSyncService.subscribe((state) => {
      setGithubState(state);
    });
  }, []);

  if (!isOpen) return null;

  const isLight = currentTheme.type === 'light';
  const isCyberpunk = currentTheme.id === 'cyberpunk';

  const modalBg = isLight
    ? 'bg-white border-gray-300 text-gray-900'
    : isCyberpunk
    ? 'bg-[#180f33] border-[#00f0ff] text-[#fcee0a]'
    : 'bg-[#1e1e1e] border-[#3c3c3c] text-[#cccccc]';

  const filteredRepos = githubState.repos.filter(
    (r) =>
      r.name.toLowerCase().includes(searchRepo.toLowerCase()) ||
      r.full_name.toLowerCase().includes(searchRepo.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${modalBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center text-sky-400">
              <Cloud size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Open File from Cloud</h2>
              <p className="text-[11px] opacity-70">
                Browse remote repositories or cloud-synced files
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Option: Switch to Open Local File */}
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FolderOpen size={16} className="text-emerald-400" />
              <div>
                <div className="text-xs font-medium text-white">Looking for a file on your computer?</div>
                <div className="text-[10.5px] opacity-70">
                  Open local code files directly from your hard drive
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenLocalFile();
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11.5px] font-medium transition-colors flex items-center gap-1 shadow-sm shrink-0"
            >
              <span>Open Local File</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* GitHub Cloud Storage Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Github size={15} />
                <span>GitHub Cloud Repositories</span>
              </div>
              {githubState.isConnected && (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                  @{githubState.user?.login} Connected
                </span>
              )}
            </div>

            {!githubState.isConnected ? (
              <div className="p-4 rounded-lg bg-black/20 border border-white/10 text-center space-y-3">
                <div className="text-xs opacity-90">
                  Authenticate with GitHub to browse and open remote repositories and programs.
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSettings?.();
                    }}
                    className="px-3.5 py-1.5 bg-[#007acc] hover:bg-[#0062a3] text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Github size={13} />
                    <span>Configure in Settings</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Search repos */}
                <input
                  type="text"
                  placeholder="Search repository..."
                  value={searchRepo}
                  onChange={(e) => setSearchRepo(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#007acc]"
                />

                {/* Repos list */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {filteredRepos.length === 0 ? (
                    <div className="text-center py-4 text-xs opacity-60">
                      No repositories found.
                    </div>
                  ) : (
                    filteredRepos.slice(0, 10).map((repo) => (
                      <div
                        key={repo.id}
                        className="p-2.5 rounded bg-black/20 hover:bg-black/30 border border-white/5 hover:border-white/15 flex items-center justify-between group transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-medium text-sky-400 truncate">
                            {repo.full_name}
                          </div>
                          <div className="text-[10px] opacity-60 truncate flex items-center gap-1.5 mt-0.5">
                            <GitBranch size={10} />
                            <span>{repo.default_branch}</span>
                            {repo.description && <span>• {repo.description}</span>}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            await githubSyncService.selectRepository(repo);
                            onSelectGitHubRepo?.(repo);
                            onClose();
                            if (onPullFromGitHub) {
                              onPullFromGitHub();
                            }
                          }}
                          className="px-2.5 py-1 bg-[#007acc] hover:bg-[#0062a3] text-white rounded text-[11px] font-medium transition-colors shrink-0 flex items-center gap-1 opacity-90 group-hover:opacity-100"
                        >
                          <Download size={11} />
                          <span>Pull & Open</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Cloud Storage Roadmap Banner */}
          <div className="p-3.5 rounded-lg bg-gradient-to-r from-sky-950/40 to-indigo-950/40 border border-sky-500/20 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
              <Sparkles size={14} className="text-sky-400" />
              <span>Future Cloud Program Storage</span>
            </div>
            <p className="text-[11px] opacity-80 leading-relaxed text-slate-300">
              In upcoming updates, Compillo will allow you to save your workspaces directly to cloud storage, access shared programs from anywhere, and version control your code without manual setup.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end px-5 py-3 border-t bg-black/20"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded text-xs opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
