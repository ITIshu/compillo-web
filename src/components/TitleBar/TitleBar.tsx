import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Columns,
  PanelBottom,
  PanelRight,
  Sidebar as SidebarIcon,
  Search,
  BookOpen,
  Sparkles,
  ChevronDown,
  FileCode,
  FolderPlus,
  FilePlus,
  Save,
  RotateCcw,
  Download,
  Code2,
  Zap,
  FolderX,
  FolderCheck,
  Undo2,
  Redo2,
  Scissors,
  Copy,
  Clipboard,
  Terminal,
  HelpCircle,
  User,
  Shield,
  Cloud,
  ExternalLink,
  Info,
  Bug,
  RefreshCw,
  Square,
  FileText,
  Keyboard,
  Layers,
  Check,
  Sliders,
  FolderArchive,
  Eye,
  WrapText,
  Monitor,
  FolderOpen,
  Upload,
  Network,
  History,
  Trash2,
  ChevronRight,
  Menu,
  Gamepad2,
  ShieldCheck,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  Globe,
  Github,
} from 'lucide-react';
import { THEMES, CompilloThemeDefinition } from '../../services/themes';
import { editorService } from '../../services/editorService';
import { engagementService } from '../../services/engagementService';
import { FileIcon } from '../Common/FileIcon';
import { RecentFileItem, formatRelativeTime } from '../../services/recentFilesService';
import { UserProfile } from '../../services/authService';
import { githubSyncService, GitHubSyncState } from '../../services/githubService';

interface TitleBarProps {
  currentTheme: CompilloThemeDefinition;
  onSelectTheme: (themeId: string) => void;
  activeFileName?: string;
  isWorkspaceOpen?: boolean;
  onCloseWorkspace?: () => void;
  onOpenWorkspace?: () => void;
  onOpenFile?: () => void;
  onOpenLocalFile?: () => void;
  onOpenCloudFile?: () => void;
  onImportProject?: () => void;
  recentFiles?: RecentFileItem[];
  onOpenRecentFile?: (fileId: string) => void;
  onClearRecentFiles?: () => void;
  onOpenFilePalette: () => void;
  onOpenCommandPalette: () => void;
  onRunCode: () => void;
  onToggleSidebar: () => void;
  onTogglePanel: () => void;
  onToggleSideBySidePanel?: () => void;
  isSidebarOpen?: boolean;
  isPanelOpen?: boolean;
  panelPosition?: 'bottom' | 'right';
  onToggleSplit: () => void;
  isSplit: boolean;
  onSaveActiveFile: () => void;
  onDownloadActiveFile?: () => void;
  onFormatDocument: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onResetWorkspace: () => void;
  onDownloadProject: () => void;
  onExportSingleHtml?: () => void;
  onDownloadStandaloneReplica?: () => void;
  onToggleMarkdownPreview: () => void;
  isMarkdownActive: boolean;
  isMarkdownPreviewOpen: boolean;
  onToggleLivePreview: () => void;
  isLivePreviewOpen: boolean;
  onOpenAiAssistant: () => void;
  onSelectSideBarView?: (view: any) => void;
  onSelectPanelView?: (view: any) => void;
  onToggleWordWrap?: () => void;
  onToggleMinimap?: () => void;
  onNewTerminal?: () => void;
  onClearTerminal?: () => void;
  onShowKeyboardShortcuts?: () => void;
  onShowAbout?: (tab?: 'about' | 'graphics' | 'shortcuts' | 'labs' | 'options') => void;
  onRestartRun?: () => void;
  onStopRun?: () => void;
  userEmail?: string;
  currentUser?: UserProfile | null;
  onOpenDashboard?: () => void;
  onOpenSignIn?: () => void;
  onSignOut?: () => void;
  onOpenMobileMenu?: () => void;
  onOpenFreeHosting?: () => void;
  onOpenQuickPushToGitHub?: () => void;
  onLaunchApp?: () => void;
  isLaunchingApp?: boolean;
  onSwitchProject?: (projectType: string) => void;
  onBackToLanding?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  currentTheme,
  onSelectTheme,
  activeFileName,
  isWorkspaceOpen = true,
  onCloseWorkspace,
  onOpenWorkspace,
  onOpenFile,
  onOpenLocalFile,
  onOpenCloudFile,
  onImportProject,
  recentFiles,
  onOpenRecentFile,
  onClearRecentFiles,
  onOpenFilePalette,
  onOpenCommandPalette,
  onRunCode,
  onToggleSidebar,
  onTogglePanel,
  onToggleSideBySidePanel,
  isSidebarOpen,
  isPanelOpen,
  panelPosition = 'bottom',
  onToggleSplit,
  isSplit,
  onSaveActiveFile,
  onDownloadActiveFile,
  onFormatDocument,
  onNewFile,
  onNewFolder,
  onResetWorkspace,
  onDownloadProject,
  onExportSingleHtml,
  onDownloadStandaloneReplica,
  onToggleMarkdownPreview,
  isMarkdownActive,
  isMarkdownPreviewOpen,
  onToggleLivePreview,
  isLivePreviewOpen,
  onOpenAiAssistant,
  onSelectSideBarView,
  onSelectPanelView,
  onToggleWordWrap,
  onToggleMinimap,
  onNewTerminal,
  onClearTerminal,
  onShowKeyboardShortcuts,
  onShowAbout,
  onRestartRun,
  onStopRun,
  userEmail = 'Guest',
  currentUser,
  onOpenDashboard,
  onOpenSignIn,
  onSignOut,
  onOpenMobileMenu,
  onOpenFreeHosting,
  onOpenQuickPushToGitHub,
  onLaunchApp,
  isLaunchingApp = false,
  onSwitchProject,
  onBackToLanding,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [recentSubmenuOpen, setRecentSubmenuOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [engagement, setEngagement] = useState(() => engagementService.getState());
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return engagementService.subscribe((st) => setEngagement(st));
  }, []);

  const requiredSeconds = engagement.config.requiredEngagementMinutes * 60;
  const remainingMinutes = Math.max(
    0,
    Math.ceil((requiredSeconds - engagement.engagementSeconds) / 60)
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
        setRecentSubmenuOpen(false);
        setIsThemePickerOpen(false);
        setIsAccountMenuOpen(false);
        setIsProjectMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEditAction = (actionName: string) => {
    setActiveMenu(null);
    if (actionName === 'undo') {
      editorService.undo();
    } else if (actionName === 'redo') {
      editorService.redo();
    } else if (actionName === 'cut') {
      editorService.cut();
    } else if (actionName === 'copy') {
      editorService.copy();
    } else if (actionName === 'paste') {
      editorService.paste();
    } else if (actionName === 'selectAll') {
      editorService.selectAll();
    } else if (actionName === 'find') {
      editorService.find();
    } else if (actionName === 'replace') {
      editorService.replace();
    } else if (actionName === 'format') {
      editorService.format();
    }
  };

  return (
    <div
      id="compillo-title-bar"
      className="flex items-center justify-between gap-1.5 sm:gap-2 h-[34px] px-2 text-[12px] select-none border-b shrink-0 min-w-0 z-40 transition-colors"
      style={{
        backgroundColor: currentTheme.ui.titleBarBg,
        color: currentTheme.ui.titleBarFg,
        borderColor: currentTheme.ui.sideBarBorder,
      }}
      ref={menuRef}
    >
      {/* Left: Compillo Logo & Menu Items */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0 min-w-0">
        {/* Mobile/Tablet Hamburger Menu Toggle */}
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            title="Open Menu"
            className="lg:hidden p-1 rounded hover:bg-white/10 active:scale-95 transition-colors shrink-0"
          >
            <Menu size={16} />
          </button>
        )}

        <button
          type="button"
          onClick={onBackToLanding}
          className="flex items-center pr-1 sm:pr-2 pl-0.5 sm:pl-1 cursor-pointer select-none shrink-0 hover:opacity-85 transition-opacity"
          title={onBackToLanding ? 'Compillo Studio — Return to Product Overview' : 'Compillo - Code Editor'}
        >
          <img
            src="/compillo-logo.png"
            alt="Compillo"
            className="h-[18px] sm:h-[20px] w-auto max-w-[85px] sm:max-w-[120px] object-contain"
          />
        </button>

        {/* Menu Bar (Desktop >= 1024px) */}
        <div className="relative hidden lg:flex items-center space-x-0.5 shrink-0 whitespace-nowrap">
          {/* File Menu */}
          <div className="relative">
            <button
              id="menu-file-btn"
              onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
              className={`px-2 py-0.5 rounded text-[12px] transition-colors ${
                currentTheme.type === 'light'
                  ? activeMenu === 'file'
                    ? 'bg-black/10 text-gray-950 font-medium'
                    : 'hover:bg-black/5 text-gray-800'
                  : activeMenu === 'file'
                  ? 'bg-white/15 text-white'
                  : 'hover:bg-white/10 text-[#cccccc]'
              }`}
            >
              File
            </button>
            {activeMenu === 'file' && (
              <div
                className="absolute left-0 top-full mt-1 w-56 rounded-md shadow-2xl py-1 z-50 text-[12px] border backdrop-blur-sm"
                style={{
                  backgroundColor: currentTheme.ui.sideBarBg,
                  borderColor: currentTheme.ui.sideBarBorder,
                  color: currentTheme.ui.sideBarFg,
                }}
              >
                <button
                  onClick={() => {
                    onNewFile();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <FilePlus size={14} /> New File...
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+N</span>
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('compillo:open-edu-labs'));
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white font-medium text-amber-400"
                  title="Load University Programming Lab Experiments (RTU, AKTU, VTU)"
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap size={14} /> New from University Lab...
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Shift+U</span>
                </button>
                <button
                  onClick={() => {
                    onNewFolder();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <FolderPlus size={14} /> New Folder...
                  </span>
                </button>
                <div className="my-1 border-t opacity-20" />
                {/* Open Local File (Device Disk) */}
                <button
                  onClick={() => {
                    if (onOpenLocalFile) {
                      onOpenLocalFile();
                    } else {
                      onOpenFile?.();
                    }
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white font-medium text-emerald-400"
                  title="Open code files directly from your computer"
                >
                  <span className="flex items-center gap-2">
                    <FolderOpen size={14} /> Open Local File...
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+O</span>
                </button>

                {/* Open File from Cloud */}
                <button
                  onClick={() => {
                    if (onOpenCloudFile) {
                      onOpenCloudFile();
                    } else {
                      onOpenFile?.();
                    }
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white font-medium text-sky-400"
                  title="Open file from cloud workspace or GitHub repository"
                >
                  <span className="flex items-center gap-2">
                    <Cloud size={14} /> Open File (Cloud)...
                  </span>
                  <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded font-mono font-normal">
                    Cloud
                  </span>
                </button>

                {/* Open Recent Submenu */}
                <div
                  className="relative"
                  onMouseEnter={() => setRecentSubmenuOpen(true)}
                  onMouseLeave={() => setRecentSubmenuOpen(false)}
                >
                  <button
                    onClick={() => setRecentSubmenuOpen(!recentSubmenuOpen)}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white group"
                  >
                    <span className="flex items-center gap-2">
                      <History size={14} className="text-amber-400 group-hover:text-white" /> Open Recent
                    </span>
                    <ChevronRight size={13} className="opacity-60" />
                  </button>

                  {recentSubmenuOpen && (
                    <div
                      className="absolute left-full top-0 ml-0.5 w-64 rounded-md shadow-2xl py-1 z-50 text-[12px] border backdrop-blur-sm"
                      style={{
                        backgroundColor: currentTheme.ui.sideBarBg,
                        borderColor: currentTheme.ui.sideBarBorder,
                        color: currentTheme.ui.sideBarFg,
                      }}
                    >
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center justify-between">
                        <span>Recent Files</span>
                        {recentFiles && recentFiles.length > 0 && (
                          <span className="font-mono text-[9px]">({recentFiles.length})</span>
                        )}
                      </div>

                      {(!recentFiles || recentFiles.length === 0) ? (
                        <div className="px-3 py-2 text-[11px] opacity-60 italic">
                          No recent files
                        </div>
                      ) : (
                        <>
                          <div className="max-h-64 overflow-y-auto py-0.5">
                            {recentFiles.slice(0, 10).map((rf) => (
                              <button
                                key={rf.id}
                                onClick={() => {
                                  onOpenRecentFile?.(rf.id);
                                  setActiveMenu(null);
                                  setRecentSubmenuOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-left group"
                              >
                                <div className="flex items-center gap-2 truncate pr-2 min-w-0">
                                  <FileIcon filename={rf.name} size={14} className="shrink-0" />
                                  <div className="truncate min-w-0">
                                    <div className="truncate font-medium text-[11.5px] leading-tight">{rf.name}</div>
                                    <div className="text-[10px] opacity-60 truncate font-mono">{rf.path}</div>
                                  </div>
                                </div>
                                <span className="text-[10px] opacity-50 font-mono shrink-0 ml-1">
                                  {formatRelativeTime(rf.lastOpenedAt)}
                                </span>
                              </button>
                            ))}
                          </div>
                          {onClearRecentFiles && (
                            <>
                              <div className="my-1 border-t opacity-20" />
                              <button
                                onClick={() => {
                                  onClearRecentFiles();
                                  setActiveMenu(null);
                                  setRecentSubmenuOpen(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-red-400"
                              >
                                <Trash2 size={13} />
                                <span>Clear Recently Opened</span>
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    onImportProject?.();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white font-medium text-cyan-400"
                >
                  <span className="flex items-center gap-2">
                    <Upload size={14} /> Import (Files / ZIP)...
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+I</span>
                </button>
                <div className="my-1 border-t opacity-20" />
                {isWorkspaceOpen ? (
                  <button
                    onClick={() => {
                      onCloseWorkspace?.();
                      setActiveMenu(null);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-amber-400"
                  >
                    <span className="flex items-center gap-2">
                      <FolderX size={14} /> Close Workspace
                    </span>
                    <span className="text-[10px] opacity-60">Ctrl+K F</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onOpenWorkspace?.();
                      setActiveMenu(null);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-emerald-400 font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <FolderCheck size={14} /> Open Workspace
                    </span>
                  </button>
                )}
                <div className="my-1 border-t opacity-20" />
                <button
                  onClick={() => {
                    onSaveActiveFile();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Save size={14} /> Save File
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+S</span>
                </button>

                {/* Option to Download/Export single active file */}
                <button
                  onClick={() => {
                    onDownloadActiveFile?.();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white font-medium text-emerald-400"
                  title="Download/Export the current active file"
                >
                  <span className="flex items-center gap-2">
                    <Download size={14} /> Download Active File...
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Shift+D</span>
                </button>

                {/* Export Project ZIP */}
                <button
                  onClick={() => {
                    onDownloadProject();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <FolderArchive size={14} /> Export Project (ZIP)
                  </span>
                </button>

                {/* Export Single HTML Page */}
                <button
                  onClick={() => {
                    onExportSingleHtml?.();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                  title="Export workspace HTML, CSS, and JS bundled into a single standalone HTML page"
                >
                  <span className="flex items-center gap-2">
                    <FileCode size={14} className="text-sky-400" /> Export Single HTML Page...
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono">
                    HTML+CSS+JS
                  </span>
                </button>

                {/* Download Standalone Single-Page Replica */}
                <button
                  onClick={() => {
                    onDownloadStandaloneReplica?.();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white font-medium text-emerald-300"
                  title="Download standalone single-page replica of Compillo IDE (includes full themes menu, editor, preview, and runner)"
                >
                  <span className="flex items-center gap-2">
                    <Download size={14} className="text-emerald-400" /> Download Standalone Replica
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    REPLICA
                  </span>
                </button>

                {/* Push to GitHub */}
                {onOpenQuickPushToGitHub && (
                  <button
                    onClick={() => {
                      onOpenQuickPushToGitHub();
                      setActiveMenu(null);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white font-medium text-emerald-300"
                    title="Push all workspace code files to your GitHub repository"
                  >
                    <span className="flex items-center gap-2">
                      <Github size={14} className="text-emerald-400" /> Push to GitHub...
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                      PUSH
                    </span>
                  </button>
                )}

                {/* Free Cloud Hosting Guide */}
                <button
                  onClick={() => {
                    onOpenFreeHosting?.();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white font-medium text-emerald-400"
                  title="Free Cloud Hosting Guide ($0/Month) - Live Link & 1-Click Blueprints"
                >
                  <span className="flex items-center gap-2">
                    <Globe size={14} /> Host Online for Free ($0)...
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    FREE
                  </span>
                </button>
                <div className="my-1 border-t opacity-20" />
                <button
                  onClick={() => {
                    onResetWorkspace();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-red-400"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw size={14} /> Reset Workspace...
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Edit Menu */}
          <div className="relative">
            <button
              id="menu-edit-btn"
              onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
              className={`px-2 py-0.5 rounded text-[12px] transition-colors ${
                currentTheme.type === 'light'
                  ? activeMenu === 'edit'
                    ? 'bg-black/10 text-gray-950 font-medium'
                    : 'hover:bg-black/5 text-gray-800'
                  : activeMenu === 'edit'
                  ? 'bg-white/15 text-white'
                  : 'hover:bg-white/10 text-[#cccccc]'
              }`}
            >
              Edit
            </button>
            {activeMenu === 'edit' && (
              <div
                className="absolute left-0 top-full mt-1 w-56 rounded-md shadow-2xl py-1 z-50 text-[12px] border backdrop-blur-sm"
                style={{
                  backgroundColor: currentTheme.ui.sideBarBg,
                  borderColor: currentTheme.ui.sideBarBorder,
                  color: currentTheme.ui.sideBarFg,
                }}
              >
                <button
                  onClick={() => handleEditAction('undo')}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Undo2 size={14} /> Undo
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Z</span>
                </button>
                <button
                  onClick={() => handleEditAction('redo')}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Redo2 size={14} /> Redo
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Y</span>
                </button>
                <div className="my-1 border-t opacity-20" />
                <button
                  onClick={() => handleEditAction('cut')}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Scissors size={14} /> Cut
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+X</span>
                </button>
                <button
                  onClick={() => handleEditAction('copy')}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Copy size={14} /> Copy
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+C</span>
                </button>
                <button
                  onClick={() => handleEditAction('paste')}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Clipboard size={14} /> Paste
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+V</span>
                </button>
                <div className="my-1 border-t opacity-20" />
                <button
                  onClick={() => handleEditAction('find')}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Search size={14} /> Find in File...
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+F</span>
                </button>
                <button
                  onClick={() => handleEditAction('replace')}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <RefreshCw size={14} /> Replace in File...
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+H</span>
                </button>
                <button
                  onClick={() => handleEditAction('selectAll')}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Check size={14} /> Select All
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+A</span>
                </button>
                <div className="my-1 border-t opacity-20" />
                <button
                  onClick={() => handleEditAction('format')}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles size={14} /> Format Document
                  </span>
                  <span className="text-[10px] opacity-60">Shift+Alt+F</span>
                </button>
                <button
                  onClick={() => {
                    onOpenCommandPalette();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <FileCode size={14} /> Command Palette...
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Shift+P</span>
                </button>
              </div>
            )}
          </div>

          {/* View Menu */}
          <div className="relative">
            <button
              id="menu-view-btn"
              onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
              className={`px-2 py-0.5 rounded text-[12px] transition-colors ${
                currentTheme.type === 'light'
                  ? activeMenu === 'view'
                    ? 'bg-black/10 text-gray-950 font-medium'
                    : 'hover:bg-black/5 text-gray-800'
                  : activeMenu === 'view'
                  ? 'bg-white/15 text-white'
                  : 'hover:bg-white/10 text-[#cccccc]'
              }`}
            >
              View
            </button>
            {activeMenu === 'view' && (
              <div
                className="absolute left-0 top-full mt-1 w-60 rounded-md shadow-2xl py-1 z-50 text-[12px] border backdrop-blur-sm"
                style={{
                  backgroundColor: currentTheme.ui.sideBarBg,
                  borderColor: currentTheme.ui.sideBarBorder,
                  color: currentTheme.ui.sideBarFg,
                }}
              >
                <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider opacity-50">
                  Views & Navigation
                </div>
                <button
                  onClick={() => {
                    onSelectSideBarView?.('explorer');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <FileCode size={14} /> Explorer
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Shift+E</span>
                </button>
                <button
                  onClick={() => {
                    onSelectSideBarView?.('search');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Search size={14} /> Search in Files
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Shift+F</span>
                </button>
                <button
                  onClick={() => {
                    onSelectSideBarView?.('git');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw size={14} /> Source Control
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Shift+G</span>
                </button>
                <button
                  onClick={() => {
                    onSelectSideBarView?.('rest-client');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Zap size={14} /> REST Client
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Shift+R</span>
                </button>
                <button
                  onClick={() => {
                    onSelectSideBarView?.('code-radar');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Layers size={14} /> Code Radar
                  </span>
                </button>
                <button
                  onClick={() => {
                    onSelectSideBarView?.('extensions');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Sliders size={14} /> Extensions Marketplace
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Shift+X</span>
                </button>
                <button
                  onClick={() => {
                    onOpenAiAssistant();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-400" /> AI Assistant Copilot
                  </span>
                </button>
                <button
                  onClick={() => {
                    onSelectSideBarView?.('game');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Gamepad2
                      size={14}
                      className={engagement.isGameUnlocked ? 'text-emerald-400' : 'text-amber-400'}
                    />
                    <span>Arcade Game Break</span>
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      engagement.isGameUnlocked
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-white/10 text-gray-400'
                    }`}
                  >
                    {engagement.isGameUnlocked ? 'UNLOCKED' : `${remainingMinutes}m left`}
                  </span>
                </button>
                <button
                  onClick={() => {
                    onSelectSideBarView?.('master-panel');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-purple-400" />
                    <span>Master Control Panel...</span>
                  </span>
                  <span className="text-[10px] opacity-60">Admin</span>
                </button>
                <button
                  onClick={() => {
                    onSelectSideBarView?.('settings');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Sliders size={14} /> Settings & Preferences
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+,</span>
                </button>
                <div className="my-1 border-t opacity-20" />
                <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider opacity-50">
                  Panels & Layout
                </div>
                <button
                  onClick={() => {
                    onToggleSidebar();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <SidebarIcon size={14} /> Toggle Primary Side Bar
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+B</span>
                </button>
                <button
                  onClick={() => {
                    onTogglePanel();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <PanelBottom size={14} /> Toggle Bottom Panel
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+J</span>
                </button>
                <button
                  onClick={() => {
                    onToggleSideBySidePanel?.();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <PanelRight size={14} /> Side-by-Side Panel (Editor & Panel)
                  </span>
                  {isPanelOpen && panelPosition === 'right' && (
                    <span className="text-[10px] text-emerald-400 font-semibold">Active</span>
                  )}
                </button>
                <button
                  onClick={() => {
                    onSelectPanelView?.('output');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <FileText size={14} /> Output Channel
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Shift+U</span>
                </button>
                <button
                  onClick={() => {
                    onSelectPanelView?.('terminal');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Terminal size={14} /> Integrated Terminal
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+`</span>
                </button>
                <button
                  onClick={() => {
                    onSelectPanelView?.('problems');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Bug size={14} /> Problems & Diagnostics
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Shift+M</span>
                </button>
                <button
                  onClick={() => {
                    onSelectPanelView?.('python');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-emerald-400"
                >
                  <span className="flex items-center gap-2">
                    <Play size={14} /> Interactive Code Runner
                  </span>
                  <span className="text-[10px] opacity-60">F5</span>
                </button>
                <button
                  onClick={() => {
                    onSelectPanelView?.('ports');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Network size={14} /> Ports Forwarding
                  </span>
                </button>
                <div className="my-1 border-t opacity-20" />
                <button
                  onClick={() => {
                    onToggleSplit();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Columns size={14} /> Split Editor Right
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+\</span>
                </button>
                <button
                  onClick={() => {
                    onToggleMarkdownPreview();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen size={14} /> Markdown Preview
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Shift+V</span>
                </button>
                <button
                  onClick={() => {
                    onToggleLivePreview();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Code2 size={14} /> Web Live Canvas
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Shift+P</span>
                </button>
                <div className="my-1 border-t opacity-20" />
                <button
                  onClick={() => {
                    onToggleWordWrap?.();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <WrapText size={14} /> Toggle Word Wrap
                  </span>
                  <span className="text-[10px] opacity-60">Alt+Z</span>
                </button>
                <button
                  onClick={() => {
                    onToggleMinimap?.();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Eye size={14} /> Toggle Minimap
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Run Menu */}
          <div className="relative">
            <button
              id="menu-run-btn"
              onClick={() => setActiveMenu(activeMenu === 'run' ? null : 'run')}
              className={`px-2 py-0.5 rounded text-[12px] transition-colors ${
                currentTheme.type === 'light'
                  ? activeMenu === 'run'
                    ? 'bg-black/10 text-gray-950 font-medium'
                    : 'hover:bg-black/5 text-gray-800'
                  : activeMenu === 'run'
                  ? 'bg-white/15 text-white'
                  : 'hover:bg-white/10 text-[#cccccc]'
              }`}
            >
              Run
            </button>
            {activeMenu === 'run' && (
              <div
                className="absolute left-0 top-full mt-1 w-56 rounded-md shadow-2xl py-1 z-50 text-[12px] border backdrop-blur-sm"
                style={{
                  backgroundColor: currentTheme.ui.sideBarBg,
                  borderColor: currentTheme.ui.sideBarBorder,
                  color: currentTheme.ui.sideBarFg,
                }}
              >
                <button
                  onClick={() => {
                    onRunCode();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white font-medium text-emerald-400"
                >
                  <span className="flex items-center gap-2">
                    <Play size={14} /> Run Without Debugging
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+F5</span>
                </button>
                <button
                  onClick={() => {
                    onRunCode();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Bug size={14} className="text-amber-400" /> Start Debugging
                  </span>
                  <span className="text-[10px] opacity-60">F5</span>
                </button>
                <button
                  onClick={() => {
                    onStopRun?.();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-red-400"
                >
                  <span className="flex items-center gap-2">
                    <Square size={14} /> Stop Running
                  </span>
                  <span className="text-[10px] opacity-60">Shift+F5</span>
                </button>
                <button
                  onClick={() => {
                    onRestartRun?.();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <RefreshCw size={14} /> Restart Execution
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Shift+F5</span>
                </button>
                <div className="my-1 border-t opacity-20" />
                <button
                  onClick={() => {
                    onRunCode();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Play size={14} className="text-emerald-400" /> Run Active File
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Alt+N</span>
                </button>
                <button
                  onClick={() => {
                    onSelectPanelView?.('terminal');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Terminal size={14} /> Run in Terminal
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Terminal Menu (NEW) */}
          <div className="relative">
            <button
              id="menu-terminal-btn"
              onClick={() => setActiveMenu(activeMenu === 'terminal' ? null : 'terminal')}
              className={`px-2 py-0.5 rounded text-[12px] transition-colors ${
                currentTheme.type === 'light'
                  ? activeMenu === 'terminal'
                    ? 'bg-black/10 text-gray-950 font-medium'
                    : 'hover:bg-black/5 text-gray-800'
                  : activeMenu === 'terminal'
                  ? 'bg-white/15 text-white'
                  : 'hover:bg-white/10 text-[#cccccc]'
              }`}
            >
              Terminal
            </button>
            {activeMenu === 'terminal' && (
              <div
                className="absolute left-0 top-full mt-1 w-56 rounded-md shadow-2xl py-1 z-50 text-[12px] border backdrop-blur-sm"
                style={{
                  backgroundColor: currentTheme.ui.sideBarBg,
                  borderColor: currentTheme.ui.sideBarBorder,
                  color: currentTheme.ui.sideBarFg,
                }}
              >
                <button
                  onClick={() => {
                    onNewTerminal?.();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Terminal size={14} /> New Terminal
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Shift+`</span>
                </button>
                <button
                  onClick={() => {
                    onSelectPanelView?.('terminal');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Columns size={14} /> Split Terminal
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+Shift+5</span>
                </button>
                <div className="my-1 border-t opacity-20" />
                <button
                  onClick={() => {
                    onSelectPanelView?.('terminal');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Play size={14} /> Run Active File in Terminal
                  </span>
                </button>
                <button
                  onClick={() => {
                    onClearTerminal?.();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-amber-400"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw size={14} /> Clear Terminal
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+K</span>
                </button>
              </div>
            )}
          </div>

          {/* Help Menu (NEW) */}
          <div className="relative">
            <button
              id="menu-help-btn"
              onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
              className={`px-2 py-0.5 rounded text-[12px] transition-colors ${
                currentTheme.type === 'light'
                  ? activeMenu === 'help'
                    ? 'bg-black/10 text-gray-950 font-medium'
                    : 'hover:bg-black/5 text-gray-800'
                  : activeMenu === 'help'
                  ? 'bg-white/15 text-white'
                  : 'hover:bg-white/10 text-[#cccccc]'
              }`}
            >
              Help
            </button>
            {activeMenu === 'help' && (
              <div
                className="absolute left-0 top-full mt-1 w-60 rounded-md shadow-2xl py-1 z-50 text-[12px] border backdrop-blur-sm"
                style={{
                  backgroundColor: currentTheme.ui.sideBarBg,
                  borderColor: currentTheme.ui.sideBarBorder,
                  color: currentTheme.ui.sideBarFg,
                }}
              >
                <button
                  onClick={() => {
                    onShowAbout?.('about');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-400" /> Welcome & Getting Started
                  </span>
                </button>
                <button
                  onClick={() => {
                    onShowAbout?.('graphics');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white font-medium text-emerald-400"
                  title="C/C++ Graphics & OpenGL Framebuffer Window Guide"
                >
                  <span className="flex items-center gap-2">
                    <Code2 size={14} /> C/C++ Graphics & OpenGL Window
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    NEW
                  </span>
                </button>
                <button
                  onClick={() => {
                    onShowAbout?.('shortcuts');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Keyboard size={14} /> Keyboard Shortcuts
                  </span>
                  <span className="text-[10px] opacity-60">Ctrl+K Ctrl+S</span>
                </button>
                <button
                  onClick={() => {
                    onShowAbout?.('labs');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-amber-400"
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap size={14} /> University Lab Syllabi
                  </span>
                  <span className="text-[10px] opacity-60">RTU / VTU</span>
                </button>
                <button
                  onClick={() => {
                    onOpenAiAssistant();
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle size={14} /> Compillo Tips & Tricks
                  </span>
                </button>
                <div className="my-1 border-t opacity-20" />
                <button
                  onClick={() => {
                    onShowAbout?.('options');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white text-sky-400"
                >
                  <span className="flex items-center gap-2">
                    <Zap size={14} /> Other Options & Tools...
                  </span>
                </button>
                <button
                  onClick={() => {
                    onShowAbout?.('about');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Info size={14} /> About Compillo Studio
                  </span>
                  <span className="text-[10px] opacity-60">v2.5.0</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center: Command Palette / Search Bar */}
      <div className="flex-1 max-w-xl mx-1 sm:mx-4 min-w-0">
        <button
          id="quick-open-search-bar"
          onClick={onOpenFilePalette}
          className="w-full flex items-center justify-between px-2 sm:px-3 py-1 rounded border text-[11px] opacity-90 hover:opacity-100 transition-all cursor-pointer shadow-inner"
          style={{
            backgroundColor: currentTheme.ui.inputBg,
            borderColor: currentTheme.ui.inputBorder,
            color: currentTheme.ui.titleBarFg,
          }}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 truncate min-w-0">
            <Search
              size={13}
              className={`shrink-0 ${
                currentTheme.type === 'light'
                  ? 'text-[#005fb8]'
                  : currentTheme.id === 'cyberpunk'
                  ? 'text-[#00f0ff]'
                  : 'text-sky-400'
              }`}
            />
            <span
              className={`truncate font-normal text-[11px] ${
                currentTheme.type === 'light' ? 'text-gray-800' : 'text-[#e2e8f0]'
              }`}
            >
              {activeFileName
                ? `Compillo > ${activeFileName}`
                : !isWorkspaceOpen
                ? 'Compillo • Closed'
                : 'Compillo Workspace'}
            </span>
          </div>
          <div
            className={`hidden sm:flex items-center gap-1.5 shrink-0 text-[10px] ${
              currentTheme.type === 'light' ? 'text-gray-500' : 'opacity-60'
            }`}
          >
            <kbd
              className={`px-1.5 py-0.5 rounded font-mono ${
                currentTheme.type === 'light'
                  ? 'bg-black/5 text-gray-700 border border-gray-200'
                  : 'bg-black/20'
              }`}
            >
              Ctrl+Shift+P
            </kbd>
          </div>
        </button>
      </div>

      {/* Right Controls: Quick Actions & Theme Switcher */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">

        {/* Compillo AI Copilot Button */}
        <button
          id="compillo-ai-copilot-top-btn"
          onClick={onOpenAiAssistant}
          title="Compillo AI Copilot (Ask, Refactor, Tests)"
          className={`hidden xl:flex items-center gap-1 px-2 py-0.5 rounded border transition-colors text-[11px] font-medium whitespace-nowrap shrink-0 ${
            currentTheme.type === 'light'
              ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300'
              : currentTheme.id === 'cyberpunk'
              ? 'bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] border-[#00f0ff]/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
              : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border-sky-500/30'
          }`}
        >
          <Sparkles size={12} />
          <span>Compillo AI</span>
        </button>

        {/* Live Canvas / Interactive Preview Button */}
        <button
          id="live-canvas-toggle-btn"
          onClick={onToggleLivePreview}
          title="Interactive Live Canvas Preview"
          className={`hidden xl:flex items-center gap-1 px-2 py-0.5 rounded border transition-colors text-[11px] font-medium whitespace-nowrap shrink-0 ${
            isLivePreviewOpen
              ? currentTheme.type === 'light'
                ? 'bg-purple-100 text-purple-900 border-purple-400'
                : 'bg-purple-600/30 text-purple-300 border-purple-500/50'
              : currentTheme.type === 'light'
              ? 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200'
              : currentTheme.id === 'cyberpunk'
              ? 'bg-[#ff007f]/15 hover:bg-[#ff007f]/25 text-[#ff007f] border-[#ff007f]/40'
              : 'bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border-purple-500/30'
          }`}
        >
          <Code2 size={12} />
          <span>Live Canvas</span>
        </button>

        {/* Markdown Preview Button (shown for markdown) */}
        {isMarkdownActive && (
          <button
            id="toggle-markdown-btn"
            onClick={onToggleMarkdownPreview}
            title={isMarkdownPreviewOpen ? 'Close Markdown Preview' : 'Open Preview to the Side'}
            className={`hidden md:flex p-1 rounded transition-colors shrink-0 ${
              currentTheme.type === 'light'
                ? isMarkdownPreviewOpen
                  ? 'text-[#005fb8] bg-black/10'
                  : 'hover:bg-black/8 text-gray-700 hover:text-black'
                : isMarkdownPreviewOpen
                ? 'text-[#007acc] bg-white/10'
                : 'opacity-80 hover:opacity-100 hover:bg-white/10'
            }`}
          >
            <BookOpen size={14} />
          </button>
        )}

        {/* Free Cloud Hosting / Deployment Guide Button */}
        <button
          id="free-hosting-top-btn"
          onClick={onOpenFreeHosting}
          title="Free Cloud Hosting ($0/Month) - Active Public URL & Free Deploy Guides"
          className={`hidden lg:flex items-center gap-1 px-2 py-0.5 rounded border transition-colors text-[11px] font-semibold whitespace-nowrap shrink-0 ${
            currentTheme.type === 'light'
              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
              : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
          }`}
        >
          <Globe size={12} />
          <span>Host ($0)</span>
        </button>

        {/* Arcade Reward / Engagement Tracker Button */}
        <button
          onClick={() => onSelectSideBarView?.('game')}
          title={
            engagement.isGameUnlocked
              ? `🎮 Arcade Game Break is Ready to Play (${Math.ceil(engagement.gameSessionSecondsLeft / 60)}m session)!`
              : `🎮 Arcade Break: ${remainingMinutes}m focus remaining (Needs ${engagement.config.requiredEngagementMinutes}m)`
          }
          className={`hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border transition-all active:scale-95 whitespace-nowrap shrink-0 ${
            engagement.isGameUnlocked
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-xs'
              : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
          }`}
        >
          <Gamepad2
            size={13}
            className={engagement.isGameUnlocked ? 'text-emerald-400' : 'text-amber-400'}
          />
          <span>
            {engagement.isGameUnlocked
              ? 'Play Game'
              : `${Math.floor(engagement.engagementSeconds / 60)}m/${engagement.config.requiredEngagementMinutes}m`}
          </span>
        </button>

        {/* Workspace Project Switcher */}
        {onSwitchProject && (
          <div className="relative hidden lg:block shrink-0">
            <button
              id="project-switcher-btn"
              onClick={() => {
                setIsProjectMenuOpen((v) => !v);
                setActiveMenu(null);
                setIsThemePickerOpen(false);
                setIsAccountMenuOpen(false);
              }}
              title="Switch Active Workspace Project"
              className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors text-[11px] font-medium whitespace-nowrap shrink-0 ${
                currentTheme.type === 'light'
                  ? 'bg-black/5 hover:bg-black/10 text-gray-800 border-gray-300'
                  : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/15'
              }`}
            >
              <Layers size={12} className="text-sky-400 shrink-0" />
              <span>Projects</span>
              <ChevronDown size={11} className="opacity-60 shrink-0" />
            </button>

            {isProjectMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-64 rounded-lg shadow-2xl py-1 z-50 text-[12px] border backdrop-blur-md"
                style={{
                  backgroundColor: currentTheme.ui.sideBarBg,
                  borderColor: currentTheme.ui.sideBarBorder,
                  color: currentTheme.ui.sideBarFg,
                }}
              >
                <div
                  className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold opacity-60 border-b"
                  style={{ borderColor: currentTheme.ui.sideBarBorder }}
                >
                  Workspace Project
                </div>
                <button
                  onClick={() => {
                    onSwitchProject('calculator');
                    setIsProjectMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#007acc] hover:text-white flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="font-medium">PyCalc Python Calculator</div>
                    <div className="text-[10px] opacity-65">Python AST + Tailwind UI</div>
                  </div>
                  <span className="text-[10px] font-mono opacity-75">:5050</span>
                </button>
                <button
                  onClick={() => {
                    onSwitchProject('craveo');
                    setIsProjectMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#007acc] hover:text-white flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="font-medium">Craveo Food Delivery</div>
                    <div className="text-[10px] opacity-65">Python + SQLite Full-Stack</div>
                  </div>
                  <span className="text-[10px] font-mono opacity-75">:5000</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 1-Click Launch Localhost Server & Live Preview */}
        {onLaunchApp && (
          <button
            id="launch-app-top-btn"
            onClick={onLaunchApp}
            disabled={isLaunchingApp}
            title="Start Localhost Server & Open Live Preview"
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded border transition-colors text-[11px] font-medium whitespace-nowrap shrink-0 active:scale-95 disabled:opacity-60 ${
              currentTheme.type === 'light'
                ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300'
                : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/35'
            }`}
          >
            <ExternalLink size={11} className={isLaunchingApp ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{isLaunchingApp ? 'Launching...' : 'Launch App'}</span>
            <span className="sm:hidden">{isLaunchingApp ? '...' : 'Launch'}</span>
          </button>
        )}

        {/* Run Code Button */}
        <button
          id="run-code-top-btn"
          onClick={onRunCode}
          title="Run Active Code (Code Runner Plugin)"
          className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded border transition-colors text-[11px] font-medium whitespace-nowrap shrink-0 active:scale-95 ${
            currentTheme.type === 'light'
              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
              : currentTheme.id === 'cyberpunk'
              ? 'bg-[#00ff9f]/15 hover:bg-[#00ff9f]/25 text-[#00ff9f] border-[#00ff9f]/40'
              : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-500/30'
          }`}
        >
          <Play size={12} fill="currentColor" />
          <span className="hidden sm:inline">Run</span>
        </button>

        {/* Format Document Button */}
        <button
          id="format-doc-btn"
          onClick={onFormatDocument}
          title="Format Document (Prettier Plugin) [Shift+Alt+F]"
          className={`hidden md:flex p-1 rounded transition-colors shrink-0 ${
            currentTheme.type === 'light'
              ? 'hover:bg-black/8 text-gray-700 hover:text-black'
              : 'hover:bg-white/10 opacity-80 hover:opacity-100'
          }`}
        >
          <Sparkles size={14} />
        </button>

        {/* Split Editor Toggle */}
        <button
          id="split-editor-btn"
          onClick={onToggleSplit}
          title={isSplit ? 'Single Editor View' : 'Split Editor Right'}
          className={`hidden lg:flex p-1 rounded transition-colors shrink-0 ${
            currentTheme.type === 'light'
              ? isSplit
                ? 'text-[#005fb8] bg-black/10'
                : 'hover:bg-black/8 text-gray-700 hover:text-black'
              : isSplit
              ? 'text-[#007acc] bg-white/10'
              : 'opacity-80 hover:opacity-100 hover:bg-white/10'
          }`}
        >
          <Columns size={14} />
        </button>

        {/* Toggle Sidebar */}
        <button
          id="toggle-sidebar-btn"
          onClick={onToggleSidebar}
          title="Toggle Primary Side Bar [Ctrl+B]"
          className={`hidden sm:flex p-1 rounded transition-colors shrink-0 ${
            currentTheme.type === 'light'
              ? isSidebarOpen
                ? 'text-[#005fb8] bg-black/10'
                : 'hover:bg-black/8 text-gray-700 hover:text-black'
              : isSidebarOpen
              ? 'text-[#007acc] bg-white/10'
              : 'hover:bg-white/10 opacity-80 hover:opacity-100'
          }`}
        >
          <SidebarIcon size={14} />
        </button>

        {/* Toggle Panel (Bottom) */}
        <button
          id="toggle-panel-btn"
          onClick={onTogglePanel}
          title={
            isPanelOpen && panelPosition === 'bottom'
              ? 'Hide Bottom Panel [Ctrl+J]'
              : 'Toggle Bottom Panel [Ctrl+J]'
          }
          className={`hidden sm:flex p-1 rounded transition-colors shrink-0 ${
            currentTheme.type === 'light'
              ? isPanelOpen && panelPosition === 'bottom'
                ? 'text-[#005fb8] bg-black/10'
                : 'hover:bg-black/8 text-gray-700 hover:text-black'
              : isPanelOpen && panelPosition === 'bottom'
              ? 'text-[#007acc] bg-white/10'
              : 'hover:bg-white/10 opacity-80 hover:opacity-100'
          }`}
        >
          <PanelBottom size={14} />
        </button>

        {/* Toggle Panel Side-by-Side (Editor & Panel Side-by-Side) */}
        <button
          id="toggle-side-by-side-panel-btn"
          onClick={onToggleSideBySidePanel}
          title={
            isPanelOpen && panelPosition === 'right'
              ? 'Hide Side-by-Side Panel'
              : 'Show Panel Side-by-Side with Editor'
          }
          className={`hidden md:flex p-1 rounded transition-colors shrink-0 ${
            currentTheme.type === 'light'
              ? isPanelOpen && panelPosition === 'right'
                ? 'text-[#005fb8] bg-black/10'
                : 'hover:bg-black/8 text-gray-700 hover:text-black'
              : isPanelOpen && panelPosition === 'right'
              ? 'text-[#007acc] bg-white/10'
              : 'hover:bg-white/10 opacity-80 hover:opacity-100'
          }`}
        >
          <PanelRight size={14} />
        </button>

        {/* Account Menu Button & Dropdown */}
        <div className="relative shrink-0">
          {currentUser ? (
            <button
              id="titlebar-account-btn"
              onClick={() => {
                setIsAccountMenuOpen(!isAccountMenuOpen);
                setIsThemePickerOpen(false);
                setActiveMenu(null);
              }}
              title={`Compillo Account: ${currentUser.name} (${currentUser.email})`}
              className={`flex items-center gap-1.5 px-1.5 sm:px-2 py-0.5 rounded transition-colors text-[11px] border whitespace-nowrap shrink-0 ${
                isAccountMenuOpen
                  ? currentTheme.type === 'light'
                    ? 'bg-black/10 text-gray-900 border-gray-400 font-medium'
                    : 'bg-white/15 text-white border-white/25'
                  : currentTheme.type === 'light'
                  ? 'text-gray-800 hover:bg-black/8 border-gray-300'
                  : 'opacity-90 hover:opacity-100 hover:bg-white/10 border-transparent hover:border-white/15'
              }`}
            >
              <img
                src={currentUser.avatarUrl}
                alt=""
                className="w-4 h-4 rounded-full object-cover border border-sky-400 shrink-0"
              />
              <span className="hidden md:inline truncate max-w-[90px] font-semibold">
                {currentUser.name.split(' ')[0]}
              </span>
              <ChevronDown size={11} className="opacity-60" />
            </button>
          ) : (
            <button
              id="titlebar-account-btn"
              onClick={onOpenSignIn}
              title="Sign In / Join Compillo Studio with Google"
              className="flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[11px] bg-sky-500 hover:bg-sky-600 text-white shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              <LogIn size={11} />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          {isAccountMenuOpen && currentUser && (
            <div
              className="absolute right-0 top-full mt-1 w-64 rounded-xl shadow-2xl py-1 z-50 text-[12px] border backdrop-blur-md"
              style={{
                backgroundColor: currentTheme.ui.sideBarBg,
                borderColor: currentTheme.ui.sideBarBorder,
                color: currentTheme.ui.sideBarFg,
              }}
            >
              <div className="px-3.5 py-2.5 border-b" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
                <div className="flex items-center gap-2.5">
                  <img
                    src={currentUser.avatarUrl}
                    alt=""
                    className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400 object-cover"
                  />
                  <div className="truncate">
                    <p className="font-bold truncate text-[12px] text-white">{currentUser.name}</p>
                    <p className="text-[10px] opacity-70 truncate font-mono">{currentUser.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-400 font-bold">
                        {currentUser.role}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                        {currentUser.provider.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    onOpenDashboard?.();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-sky-500 hover:text-white flex items-center justify-between font-bold text-sky-400 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <LayoutDashboard size={14} /> User Dashboard (Profile & Stats)
                  </span>
                  <span className="text-[10px] opacity-75">View &gt;</span>
                </button>

                <button
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Cloud size={13} className="text-sky-400" /> Settings Sync is On
                  </span>
                  <Check size={13} className="text-emerald-400" />
                </button>
                <button
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <RefreshCw size={13} /> Sync Now (Force Push)
                  </span>
                </button>
                <button
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Shield size={13} /> Manage Trusted Accounts
                  </span>
                </button>
              </div>

              <div className="my-1 border-t opacity-20" />

              <button
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  onSignOut?.();
                }}
                className="w-full text-left px-3.5 py-1.5 hover:bg-rose-500 hover:text-white text-rose-400 flex items-center gap-2 font-semibold transition-colors"
              >
                <RotateCcw size={13} /> Sign Out ({currentUser.name})
              </button>
            </div>
          )}
        </div>

        {/* Theme Picker Dropdown */}
        <div className="relative shrink-0">
          <button
            id="theme-switcher-btn"
            onClick={() => setIsThemePickerOpen(!isThemePickerOpen)}
            title="Change Compillo Theme"
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded transition-colors text-[11px] border whitespace-nowrap shrink-0 ${
              currentTheme.type === 'light'
                ? 'text-gray-800 hover:bg-black/8 border-gray-300'
                : 'opacity-90 hover:opacity-100 hover:bg-white/10 border-transparent hover:border-white/15'
            }`}
          >
            <span className="hidden md:inline truncate max-w-[120px]">
              {currentTheme.label.includes('(') ? currentTheme.label.split('(')[0].trim() : currentTheme.label}
            </span>
            <span className="md:hidden">Theme</span>
            <ChevronDown size={11} className="opacity-60 shrink-0" />
          </button>
          {isThemePickerOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-64 rounded-xl shadow-2xl py-1 z-50 text-[12px] border backdrop-blur-md"
              style={{
                backgroundColor: currentTheme.ui.sideBarBg,
                borderColor: currentTheme.ui.sideBarBorder,
                color: currentTheme.ui.sideBarFg,
              }}
            >
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold opacity-50 flex items-center justify-between border-b" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
                <span>Compillo Color Themes</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 font-bold">
                  {Object.keys(THEMES).length} Themes
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto p-1 space-y-0.5">
                {Object.values(THEMES).map((th) => (
                  <button
                    key={th.id}
                    onClick={() => {
                      onSelectTheme(th.id);
                      setIsThemePickerOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between hover:bg-sky-500/20 hover:text-sky-300 transition-colors ${
                      currentTheme.id === th.id ? 'font-bold bg-sky-500/15 text-sky-400' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                        style={{ backgroundColor: th.ui.accent }}
                      />
                      <span className="truncate">{th.label}</span>
                    </div>
                    {currentTheme.id === th.id && <span className="text-xs font-bold text-sky-400">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
