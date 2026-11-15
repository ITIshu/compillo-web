import React, { useState } from 'react';
import {
  X,
  FilePlus,
  FolderPlus,
  FolderOpen,
  Cloud,
  Save,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Undo2,
  Redo2,
  Terminal,
  Columns,
  Code2,
  Files,
  Search,
  GitBranch,
  Puzzle,
  Sliders,
  Palette,
  Check,
  History,
  Trash2,
  Layers,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Gamepad2,
  ShieldCheck,
  LayoutDashboard,
  LogIn,
  LogOut,
  Globe,
} from 'lucide-react';
import { CompilloThemeDefinition, THEMES } from '../../services/themes';
import { ActiveSideBarView } from '../../types';
import { RecentFileItem, formatRelativeTime } from '../../services/recentFilesService';
import { FileIcon } from '../Common/FileIcon';
import { UserProfile } from '../../services/authService';

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: CompilloThemeDefinition;
  onSelectTheme: (themeId: string) => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onOpenFile: () => void;
  onOpenLocalFile?: () => void;
  onOpenCloudFile?: () => void;
  onSaveFile: () => void;
  onFormatDocument: () => void;
  onDownloadProject: () => void;
  onDownloadActiveFile?: () => void;
  onImport: () => void;
  onResetWorkspace: () => void;
  onSelectSideBarView: (view: ActiveSideBarView) => void;
  onTogglePanel: () => void;
  onToggleLivePreview: () => void;
  onOpenAiAssistant: () => void;
  recentFiles?: RecentFileItem[];
  onOpenRecentFile?: (fileId: string) => void;
  onClearRecentFiles?: () => void;
  userEmail?: string;
  currentUser?: UserProfile | null;
  onOpenDashboard?: () => void;
  onOpenSignIn?: () => void;
  onSignOut?: () => void;
  activeFileName?: string;
}

export const MobileMenuDrawer: React.FC<MobileMenuDrawerProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
  onNewFile,
  onNewFolder,
  onOpenFile,
  onOpenLocalFile,
  onOpenCloudFile,
  onSaveFile,
  onFormatDocument,
  onDownloadProject,
  onDownloadActiveFile,
  onImport,
  onResetWorkspace,
  onSelectSideBarView,
  onTogglePanel,
  onToggleLivePreview,
  onOpenAiAssistant,
  recentFiles = [],
  onOpenRecentFile,
  onClearRecentFiles,
  userEmail = 'k@lavania.in',
  currentUser,
  onOpenDashboard,
  onOpenSignIn,
  onSignOut,
  activeFileName,
}) => {
  const [activeSection, setActiveSection] = useState<'file' | 'edit' | 'view' | 'themes' | 'recent' | null>('file');

  if (!isOpen) return null;

  const isLight = currentTheme.type === 'light';

  const handleAction = (callback: () => void) => {
    callback();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div
        className="relative w-full max-h-[85vh] rounded-t-2xl flex flex-col shadow-2xl overflow-hidden border-t"
        style={{
          backgroundColor: currentTheme.ui.sideBarBg,
          borderColor: currentTheme.ui.sideBarBorder,
          color: currentTheme.ui.sideBarFg,
        }}
      >
        {/* Handle bar */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b shrink-0"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs border border-sky-500/30">
              CP
            </div>
            <div>
              <div className="font-semibold text-sm">Compillo Menu</div>
              <div className="text-[11px] opacity-60 truncate max-w-[200px]">
                {activeFileName ? `File: ${activeFileName}` : 'Workspace'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors ${
              isLight ? 'hover:bg-black/10 text-gray-700' : 'hover:bg-white/10 text-gray-300'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Action Badges */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto no-scrollbar shrink-0 border-b"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <button
            onClick={() => handleAction(onSaveFile)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-400 text-xs font-medium shrink-0 active:scale-95"
          >
            <Save size={13} />
            <span>Save</span>
          </button>
          <button
            onClick={() => handleAction(onFormatDocument)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-medium shrink-0 active:scale-95"
          >
            <Sparkles size={13} />
            <span>Format</span>
          </button>
          <button
            onClick={() => handleAction(onNewFile)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-medium shrink-0 active:scale-95"
          >
            <FilePlus size={13} />
            <span>New File</span>
          </button>
          <button
            onClick={() => handleAction(onToggleLivePreview)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-400 text-xs font-medium shrink-0 active:scale-95"
          >
            <Code2 size={13} />
            <span>Live Canvas</span>
          </button>
        </div>

        {/* Accordion Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* Section: File */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
            <button
              onClick={() => setActiveSection(activeSection === 'file' ? null : 'file')}
              className={`w-full flex items-center justify-between p-3 text-xs font-semibold uppercase tracking-wider ${
                isLight ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <span className="flex items-center gap-2">
                <FolderOpen size={15} className="text-amber-400" /> File Actions
              </span>
              {activeSection === 'file' ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
            {activeSection === 'file' && (
              <div className="p-2 space-y-1 text-xs">
                <button
                  onClick={() => handleAction(onNewFile)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <FilePlus size={15} className="text-sky-400" />
                  <span>New File...</span>
                </button>
                <button
                  onClick={() => handleAction(onNewFolder)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <FolderPlus size={15} className="text-amber-400" />
                  <span>New Folder...</span>
                </button>
                <button
                  onClick={() => handleAction(onOpenLocalFile || onOpenFile)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-emerald-400 font-medium"
                >
                  <span className="flex items-center gap-2.5">
                    <FolderOpen size={15} />
                    <span>Open Local File...</span>
                  </span>
                  <span className="text-[10px] opacity-60 font-mono">Device</span>
                </button>
                <button
                  onClick={() => handleAction(onOpenCloudFile || onOpenFile)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-sky-400 font-medium"
                >
                  <span className="flex items-center gap-2.5">
                    <Cloud size={15} />
                    <span>Open File from Cloud...</span>
                  </span>
                  <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-mono">
                    Cloud
                  </span>
                </button>
                <button
                  onClick={() => handleAction(onImport)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <Upload size={15} className="text-purple-400" />
                  <span>Import Files or ZIP...</span>
                </button>
                {onDownloadActiveFile && (
                  <button
                    onClick={() => handleAction(onDownloadActiveFile)}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <Download size={15} className="text-sky-400" />
                    <span>Download Active File...</span>
                  </button>
                )}
                <button
                  onClick={() => handleAction(onDownloadProject)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <Download size={15} className="text-indigo-400" />
                  <span>Export Project as ZIP</span>
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('compillo:open-free-hosting'));
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-semibold"
                >
                  <span className="flex items-center gap-2.5">
                    <Globe size={15} />
                    <span>Host for Free ($0)...</span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 font-mono">
                    FREE
                  </span>
                </button>
                <button
                  onClick={() => handleAction(onResetWorkspace)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg text-amber-500 hover:bg-amber-500/10"
                >
                  <RotateCcw size={15} />
                  <span>Reset Workspace...</span>
                </button>
              </div>
            )}
          </div>

          {/* Section: Recent Files */}
          {recentFiles.length > 0 && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
              <button
                onClick={() => setActiveSection(activeSection === 'recent' ? null : 'recent')}
                className={`w-full flex items-center justify-between p-3 text-xs font-semibold uppercase tracking-wider ${
                  isLight ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-2">
                  <History size={15} className="text-amber-400" /> Recent Files ({recentFiles.length})
                </span>
                {activeSection === 'recent' ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
              {activeSection === 'recent' && (
                <div className="p-2 space-y-1 text-xs">
                  {recentFiles.slice(0, 6).map((rf) => (
                    <button
                      key={rf.id}
                      onClick={() => {
                        onOpenRecentFile?.(rf.id);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-left"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileIcon filename={rf.name} size={14} className="shrink-0" />
                        <span className="font-medium truncate">{rf.name}</span>
                      </div>
                      <span className="text-[10px] opacity-50 shrink-0 font-mono">
                        {formatRelativeTime(rf.lastOpenedAt)}
                      </span>
                    </button>
                  ))}
                  {onClearRecentFiles && (
                    <button
                      onClick={() => {
                        onClearRecentFiles();
                        onClose();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={13} />
                      <span>Clear Recent Files</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section: Views */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
            <button
              onClick={() => setActiveSection(activeSection === 'view' ? null : 'view')}
              className={`w-full flex items-center justify-between p-3 text-xs font-semibold uppercase tracking-wider ${
                isLight ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <span className="flex items-center gap-2">
                <Layers size={15} className="text-sky-400" /> Views & Panels
              </span>
              {activeSection === 'view' ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
            {activeSection === 'view' && (
              <div className="p-2 space-y-1 text-xs grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleAction(() => onSelectSideBarView('explorer'))}
                  className="flex items-center gap-2 p-2 rounded-lg border text-left hover:bg-white/5"
                  style={{ borderColor: currentTheme.ui.sideBarBorder }}
                >
                  <Files size={15} className="text-sky-400" />
                  <span>Explorer</span>
                </button>
                <button
                  onClick={() => handleAction(() => onSelectSideBarView('search'))}
                  className="flex items-center gap-2 p-2 rounded-lg border text-left hover:bg-white/5"
                  style={{ borderColor: currentTheme.ui.sideBarBorder }}
                >
                  <Search size={15} className="text-amber-400" />
                  <span>Search</span>
                </button>
                <button
                  onClick={() => handleAction(() => onSelectSideBarView('git'))}
                  className="flex items-center gap-2 p-2 rounded-lg border text-left hover:bg-white/5"
                  style={{ borderColor: currentTheme.ui.sideBarBorder }}
                >
                  <GitBranch size={15} className="text-emerald-400" />
                  <span>Source Control</span>
                </button>
                <button
                  onClick={() => handleAction(() => onSelectSideBarView('extensions'))}
                  className="flex items-center gap-2 p-2 rounded-lg border text-left hover:bg-white/5"
                  style={{ borderColor: currentTheme.ui.sideBarBorder }}
                >
                  <Puzzle size={15} className="text-purple-400" />
                  <span>Plugins</span>
                </button>
                <button
                  onClick={() => handleAction(() => onSelectSideBarView('game'))}
                  className="flex items-center gap-2 p-2 rounded-lg border text-left hover:bg-white/5 bg-emerald-500/10 border-emerald-500/30"
                >
                  <Gamepad2 size={15} className="text-emerald-400" />
                  <span className="text-emerald-300 font-medium">Arcade Break</span>
                </button>
                <button
                  onClick={() => handleAction(() => onSelectSideBarView('master-panel'))}
                  className="flex items-center gap-2 p-2 rounded-lg border text-left hover:bg-white/5 bg-purple-500/10 border-purple-500/30"
                >
                  <ShieldCheck size={15} className="text-purple-400" />
                  <span className="text-purple-300 font-medium">Master Panel</span>
                </button>
                <button
                  onClick={() => handleAction(onTogglePanel)}
                  className="flex items-center gap-2 p-2 rounded-lg border text-left hover:bg-white/5 col-span-2"
                  style={{ borderColor: currentTheme.ui.sideBarBorder }}
                >
                  <Terminal size={15} className="text-sky-400" />
                  <span>Toggle Terminal / Runner</span>
                </button>
              </div>
            )}
          </div>

          {/* Section: Themes */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
            <button
              onClick={() => setActiveSection(activeSection === 'themes' ? null : 'themes')}
              className={`w-full flex items-center justify-between p-3 text-xs font-semibold uppercase tracking-wider ${
                isLight ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <span className="flex items-center gap-2">
                <Palette size={15} className="text-purple-400" /> Color Theme ({currentTheme.label})
              </span>
              {activeSection === 'themes' ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
            {activeSection === 'themes' && (
              <div className="p-2 space-y-1 text-xs">
                {Object.values(THEMES).map((th) => (
                  <button
                    key={th.id}
                    onClick={() => {
                      onSelectTheme(th.id);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                      currentTheme.id === th.id
                        ? 'bg-sky-500/20 text-sky-400 font-semibold'
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                        style={{ backgroundColor: th.ui.accent }}
                      />
                      <span className="truncate">{th.label}</span>
                    </div>
                    {currentTheme.id === th.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer User Info & Dashboard */}
        <div
          className="p-3 border-t flex flex-col gap-2 text-[11px] shrink-0 bg-black/5 dark:bg-white/5"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          {currentUser ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <img
                  src={currentUser.avatarUrl}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover border border-sky-400 shrink-0"
                />
                <div className="truncate">
                  <div className="font-bold truncate text-white">{currentUser.name}</div>
                  <div className="text-[10px] opacity-65 truncate font-mono">{currentUser.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    onClose();
                    onOpenDashboard?.();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30 flex items-center gap-1"
                >
                  <LayoutDashboard size={12} />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onSignOut?.();
                  }}
                  className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="opacity-75">Not signed in</span>
              <button
                onClick={() => {
                  onClose();
                  onOpenSignIn?.();
                }}
                className="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <LogIn size={12} />
                <span>Sign In</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
