import React, { useState, useMemo } from 'react';
import {
  FilePlus,
  FolderPlus,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit2,
  Download,
  Upload,
  X,
  Code,
  Braces,
  Tag,
  Box,
  History,
  FileText,
  Search,
  FolderX,
  FolderCheck,
  Sparkles,
  Plus,
  RotateCcw,
  GitCompare,
} from 'lucide-react';
import { FileNode, TabItem } from '../../types';
import { FileIcon, FolderIcon } from '../Common/FileIcon';
import { CompilloThemeDefinition } from '../../services/themes';
import { RecentFileItem, formatRelativeTime } from '../../services/recentFilesService';
import {
  getRevisions,
  formatRevisionTime,
  FileRevision,
} from '../../services/revisionService';

interface ExplorerViewProps {
  currentTheme: CompilloThemeDefinition;
  files: FileNode[];
  activeFileId: string | null;
  activeFile?: FileNode | null;
  tabs: TabItem[];
  isWorkspaceOpen?: boolean;
  onCloseWorkspace?: () => void;
  onOpenWorkspace?: () => void;
  onRequestNewFile?: (folderId?: string | null) => void;
  onLoadSampleProject?: (projectType: 'calculator' | 'craveo') => void;
  recentFiles?: RecentFileItem[];
  onRemoveRecentFile?: (id: string) => void;
  onClearRecentFiles?: () => void;
  onOpenFile: (fileId: string) => void;
  onJumpToLine?: (fileId: string, line: number, col?: number) => void;
  onCloseTab: (fileId: string) => void;
  onCreateFile: (folderId: string | null, name: string) => void;
  onCreateFolder: (folderId: string | null, name: string) => void;
  onRenameNode: (id: string, newName: string) => void;
  onDeleteNode: (id: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onImportProject?: () => void;
  revisionVersion?: number;
  onCreateCheckpoint?: (file: FileNode) => void;
  onCompareRevision?: (file: FileNode, oldContent: string, newContent: string, title?: string) => void;
  onRestoreRevision?: (fileId: string, content: string, label?: string) => void;
}

export const ExplorerView: React.FC<ExplorerViewProps> = ({
  currentTheme,
  files,
  activeFileId,
  activeFile,
  tabs,
  isWorkspaceOpen = true,
  onCloseWorkspace,
  onOpenWorkspace,
  onRequestNewFile,
  onLoadSampleProject,
  recentFiles,
  onRemoveRecentFile,
  onClearRecentFiles,
  onOpenFile,
  onJumpToLine,
  onCloseTab,
  onCreateFile,
  onCreateFolder,
  onRenameNode,
  onDeleteNode,
  onRefresh,
  onExport,
  onImport,
  onImportProject,
  revisionVersion = 0,
  onCreateCheckpoint,
  onCompareRevision,
  onRestoreRevision,
}) => {
  const [isOpenEditorsCollapsed, setIsOpenEditorsCollapsed] = useState(false);
  const [isRecentCollapsed, setIsRecentCollapsed] = useState(false);
  const [isWorkspaceCollapsed, setIsWorkspaceCollapsed] = useState(false);
  const [isOutlineCollapsed, setIsOutlineCollapsed] = useState(false);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(true);
  const [outlineFilter, setOutlineFilter] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'folder-src': true,
    'folder-plugins': true,
  });

  // Creation State
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null);
  const [creatingInFolder, setCreatingInFolder] = useState<string | null>(null);
  const [newEntryName, setNewEntryName] = useState('');

  // Renaming State
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState('');

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleStartCreate = (type: 'file' | 'folder', folderId: string | null = null) => {
    setCreatingType(type);
    setCreatingInFolder(folderId);
    setNewEntryName(type === 'file' ? 'untitled.ts' : 'new_folder');
    if (folderId) {
      setExpandedFolders((prev) => ({ ...prev, [folderId]: true }));
    }
  };

  const handleFinishCreate = () => {
    if (!newEntryName.trim()) {
      setCreatingType(null);
      return;
    }
    if (creatingType === 'file') {
      onCreateFile(creatingInFolder, newEntryName.trim());
    } else if (creatingType === 'folder') {
      onCreateFolder(creatingInFolder, newEntryName.trim());
    }
    setCreatingType(null);
    setNewEntryName('');
  };

  const handleFinishRename = (id: string) => {
    if (renamingName.trim()) {
      onRenameNode(id, renamingName.trim());
    }
    setRenamingId(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };

  // Recursive Tree Node Renderer
  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => {
      const isFolder = node.type === 'folder';
      const isExpanded = expandedFolders[node.id] ?? false;
      const isActive = activeFileId === node.id;
      const isBeingRenamed = renamingId === node.id;

      return (
        <div key={node.id} className="w-full">
          <div
            className={`group flex items-center justify-between py-1 px-2 text-[12px] cursor-pointer transition-colors ${
              isActive
                ? currentTheme.type === 'light'
                  ? 'bg-[#005fb8]/15 text-[#004e9a] font-semibold'
                  : currentTheme.id === 'cyberpunk'
                  ? 'bg-[#fcee0a]/20 text-[#fcee0a] font-semibold'
                  : 'bg-[#007acc]/20 text-white font-medium'
                : currentTheme.type === 'light'
                ? 'text-[#1e293b] hover:text-black hover:bg-black/5'
                : currentTheme.id === 'cyberpunk'
                ? 'text-[#e5dcff] hover:text-[#fcee0a] hover:bg-white/5'
                : 'text-[#cccccc] hover:text-white hover:bg-white/5'
            }`}
            style={{ paddingLeft: `${depth * 14 + 10}px` }}
            onClick={() => {
              if (isFolder) {
                toggleFolder(node.id);
              } else {
                onOpenFile(node.id);
              }
            }}
          >
            <div className="flex items-center gap-1.5 truncate flex-1 mr-2">
              {isFolder ? (
                <>
                  <span className={`shrink-0 ${currentTheme.type === 'light' ? 'text-gray-500' : 'text-[#858585]'}`}>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                  <FolderIcon isOpen={isExpanded} size={15} />
                </>
              ) : (
                <>
                  <span className="w-3.5 shrink-0" />
                  <FileIcon filename={node.name} size={15} />
                </>
              )}

              {isBeingRenamed ? (
                <input
                  type="text"
                  value={renamingName}
                  autoFocus
                  onChange={(e) => setRenamingName(e.target.value)}
                  onBlur={() => handleFinishRename(node.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishRename(node.id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  className={`px-1 py-0.5 rounded text-[11px] outline-none border w-full ${
                    currentTheme.type === 'light'
                      ? 'bg-white text-gray-900 border-[#005fb8] shadow-sm'
                      : currentTheme.id === 'cyberpunk'
                      ? 'bg-[#1e1438] text-[#fcee0a] border-[#00f0ff]'
                      : 'bg-[#3c3c3c] text-white border-[#007acc]'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate">{node.name}</span>
              )}

              {node.isDirty && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ml-1 shrink-0 ${
                    currentTheme.type === 'light' ? 'bg-gray-800' : 'bg-white'
                  }`}
                />
              )}
            </div>

            {/* Hover Actions (New child, rename, delete) */}
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0">
              {isFolder && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onRequestNewFile) {
                        onRequestNewFile(node.id);
                      } else {
                        handleStartCreate('file', node.id);
                      }
                    }}
                    title="New File Inside"
                    className={`p-0.5 rounded transition-colors ${
                      currentTheme.type === 'light'
                        ? 'hover:bg-black/10 text-gray-700 hover:text-black'
                        : 'hover:bg-white/20 text-[#cccccc] hover:text-white'
                    }`}
                  >
                    <FilePlus size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartCreate('folder', node.id);
                    }}
                    title="New Folder Inside"
                    className={`p-0.5 rounded transition-colors ${
                      currentTheme.type === 'light'
                        ? 'hover:bg-black/10 text-gray-700 hover:text-black'
                        : 'hover:bg-white/20 text-[#cccccc] hover:text-white'
                    }`}
                  >
                    <FolderPlus size={12} />
                  </button>
                </>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRenamingId(node.id);
                  setRenamingName(node.name);
                }}
                title="Rename"
                className={`p-0.5 rounded transition-colors ${
                  currentTheme.type === 'light'
                    ? 'hover:bg-black/10 text-gray-700 hover:text-black'
                    : 'hover:bg-white/20 text-[#cccccc] hover:text-white'
                }`}
              >
                <Edit2 size={11} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete ${node.name}?`)) {
                    onDeleteNode(node.id);
                  }
                }}
                title="Delete"
                className="p-0.5 hover:bg-red-500/30 text-red-400 rounded"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>

          {/* Creation input if inside this folder */}
          {creatingType && creatingInFolder === node.id && (
            <div
              className="flex items-center py-1 px-2 text-[12px] bg-black/5"
              style={{ paddingLeft: `${(depth + 1) * 14 + 10}px` }}
            >
              {creatingType === 'file' ? <FilePlus size={13} className="mr-1.5 text-sky-400" /> : <FolderPlus size={13} className="mr-1.5 text-amber-400" />}
              <input
                type="text"
                value={newEntryName}
                autoFocus
                onChange={(e) => setNewEntryName(e.target.value)}
                onBlur={handleFinishCreate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishCreate();
                  if (e.key === 'Escape') setCreatingType(null);
                }}
                className={`px-1.5 py-0.5 rounded text-[11px] outline-none border w-full ${
                  currentTheme.type === 'light'
                    ? 'bg-white text-gray-900 border-[#005fb8] shadow-sm'
                    : currentTheme.id === 'cyberpunk'
                    ? 'bg-[#1e1438] text-[#fcee0a] border-[#00f0ff]'
                    : 'bg-[#3c3c3c] text-white border-[#007acc]'
                }`}
              />
            </div>
          )}

          {/* Folder Children */}
          {isFolder && isExpanded && node.children && renderTree(node.children, depth + 1)}
        </div>
      );
    });
  };

  // Outline symbols extracted from active file
  const outlineSymbols = useMemo(() => {
    if (!activeFile || !activeFile.content) return [];
    const lines = activeFile.content.split('\n');
    const symbols: Array<{
      id: string;
      name: string;
      kind: 'function' | 'class' | 'variable' | 'interface' | 'element';
      line: number;
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('//') || line.startsWith('/*')) continue;

      const fnMatch = line.match(/(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/);
      if (fnMatch) {
        symbols.push({ id: `sym-${i}`, name: `${fnMatch[1]}()`, kind: 'function', line: i + 1 });
        continue;
      }

      const arrowMatch = line.match(
        /(?:export\s+)?(?:const|let)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_$]+)?\s*=>/
      );
      if (arrowMatch) {
        symbols.push({ id: `sym-${i}`, name: `${arrowMatch[1]}()`, kind: 'function', line: i + 1 });
        continue;
      }

      const classMatch = line.match(/(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/);
      if (classMatch) {
        symbols.push({ id: `sym-${i}`, name: classMatch[1], kind: 'class', line: i + 1 });
        continue;
      }

      const typeMatch = line.match(/(?:export\s+)?(?:interface|type)\s+([a-zA-Z0-9_$]+)/);
      if (typeMatch) {
        symbols.push({ id: `sym-${i}`, name: typeMatch[1], kind: 'interface', line: i + 1 });
        continue;
      }

      const compMatch = line.match(/<([A-Z][a-zA-Z0-9]*)/);
      if (compMatch && !symbols.some((s) => s.name === `<${compMatch[1]}>`)) {
        symbols.push({ id: `sym-${i}`, name: `<${compMatch[1]}>`, kind: 'element', line: i + 1 });
        continue;
      }
    }

    if (outlineFilter.trim()) {
      const q = outlineFilter.trim().toLowerCase();
      return symbols.filter((s) => s.name.toLowerCase().includes(q));
    }

    return symbols.slice(0, 40);
  }, [activeFile, outlineFilter]);

  const fileRevisions: FileRevision[] = useMemo(() => {
    if (!activeFile) return [];
    return getRevisions(activeFile.id, activeFile.path);
  }, [activeFile, revisionVersion]);

  if (!isWorkspaceOpen) {
    return (
      <div id="compillo-explorer-view" className="flex flex-col h-full select-none overflow-y-auto p-4 space-y-4">
        <div
          className="flex items-center justify-between pb-2 border-b"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">
            Explorer: Workspace Closed
          </span>
          <button
            onClick={onOpenWorkspace}
            title="Open Workspace"
            className="p-1 rounded hover:bg-white/10 text-emerald-400 transition-colors"
          >
            <FolderCheck size={14} />
          </button>
        </div>

        <div
          className={`p-4 rounded-xl border flex flex-col items-center text-center space-y-3 ${
            currentTheme.type === 'light'
              ? 'bg-black/[0.02] border-gray-200'
              : 'bg-white/[0.02] border-white/10'
          }`}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${currentTheme.ui.accent}15` }}
          >
            <FolderX size={24} style={{ color: currentTheme.ui.accent }} />
          </div>

          <div>
            <div className="font-semibold text-[13px]">Workspace is Closed</div>
            <p className="text-[11px] opacity-70 mt-1 leading-relaxed">
              You have closed the current workspace. Open a workspace or create a new file to start coding.
            </p>
          </div>

          <div className="flex flex-col w-full gap-2 pt-1">
            <button
              onClick={onOpenWorkspace}
              className="w-full py-2 px-3 rounded-lg text-white text-[12px] font-medium shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: currentTheme.ui.accent }}
            >
              <FolderCheck size={14} />
              Open Workspace
            </button>
            <button
              onClick={() => onRequestNewFile?.(null)}
              className={`w-full py-1.5 px-3 rounded-lg border text-[12px] font-medium transition-all flex items-center justify-center gap-2 ${
                currentTheme.type === 'light'
                  ? 'border-gray-300 hover:bg-black/5 text-gray-800'
                  : 'border-white/15 hover:bg-white/5 text-gray-200'
              }`}
            >
              <FilePlus size={14} />
              New File (Python, Java...)
            </button>
          </div>
        </div>

        {/* Workspace Project */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-medium tracking-wide uppercase opacity-75 flex items-center gap-1.5">
            <Sparkles size={12} style={{ color: currentTheme.ui.accent }} />
            Open Project
          </div>
          <div className="space-y-1.5">
            <button
              onClick={() => onLoadSampleProject?.('calculator')}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                currentTheme.type === 'light'
                  ? 'border-cyan-500/40 hover:border-cyan-500 hover:bg-cyan-50/50 bg-cyan-50/20'
                  : 'border-cyan-500/40 hover:border-cyan-500/60 hover:bg-cyan-950/20 bg-cyan-950/10'
              }`}
            >
              <div>
                <div className="font-semibold text-[12px] flex items-center gap-1.5 text-white">
                  PyCalc Python Calculator
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    PYTHON + TAILWIND
                  </span>
                </div>
                <div className="text-[10px] text-cyan-300/80">index.html, app.js, server.py</div>
              </div>
              <ChevronRight size={14} className="text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Quick Reopen Recent Files when Workspace Closed */}
        {recentFiles && recentFiles.length > 0 && (
          <div className="space-y-2 pt-2 border-t" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
            <div className="text-[11px] font-medium tracking-wide uppercase opacity-75 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <History size={12} className="text-amber-400" />
                <span>Recent Files</span>
              </div>
              {onClearRecentFiles && (
                <button
                  onClick={onClearRecentFiles}
                  title="Clear Recent Files"
                  className="opacity-50 hover:opacity-100 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
            <div className="space-y-1">
              {recentFiles.slice(0, 5).map((rf) => (
                <button
                  key={rf.id}
                  onClick={() => onOpenFile(rf.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                    currentTheme.type === 'light'
                      ? 'border-gray-200 hover:border-gray-300 hover:bg-black/5'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2 min-w-0">
                    <FileIcon filename={rf.name} size={14} className="shrink-0" />
                    <div className="truncate min-w-0">
                      <div className="font-medium text-[12px] truncate">{rf.name}</div>
                      <div className="text-[10px] opacity-60 truncate font-mono">{rf.path}</div>
                    </div>
                  </div>
                  <span className="text-[10px] opacity-50 font-mono shrink-0">
                    {formatRelativeTime(rf.lastOpenedAt)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="compillo-explorer-view" className="flex flex-col h-full select-none overflow-y-auto">
      {/* SECTION: OPEN EDITORS */}
      <div className="border-b" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
        <div
          onClick={() => setIsOpenEditorsCollapsed(!isOpenEditorsCollapsed)}
          className={`flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
            currentTheme.type === 'light'
              ? 'text-gray-600 hover:text-gray-950 hover:bg-black/5'
              : 'text-[#888888] hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-1">
            {isOpenEditorsCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            <span>Open Editors ({tabs.length})</span>
          </div>
        </div>
        {!isOpenEditorsCollapsed && (
          <div className="py-0.5">
            {tabs.map((tab) => (
              <div
                key={tab.fileId}
                onClick={() => onOpenFile(tab.fileId)}
                className={`group flex items-center justify-between px-4 py-1 text-[12px] cursor-pointer transition-colors ${
                  activeFileId === tab.fileId
                    ? currentTheme.type === 'light'
                      ? 'bg-[#005fb8]/15 text-[#004e9a] font-semibold'
                      : currentTheme.id === 'cyberpunk'
                      ? 'bg-[#fcee0a]/20 text-[#fcee0a] font-semibold'
                      : 'bg-[#007acc]/20 text-white font-medium'
                    : currentTheme.type === 'light'
                    ? 'text-gray-700 hover:text-black hover:bg-black/5'
                    : 'text-[#cccccc] hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <FileIcon filename={tab.title} size={13} />
                  <span className="truncate">{tab.title}</span>
                  {tab.isDirty && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ml-1 shrink-0 ${
                        currentTheme.type === 'light' ? 'bg-gray-800' : 'bg-white'
                      }`}
                    />
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.fileId);
                  }}
                  className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-colors ${
                    currentTheme.type === 'light'
                      ? 'hover:bg-black/10 text-gray-700 hover:text-black'
                      : 'hover:bg-white/20 text-[#cccccc] hover:text-white'
                  }`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION: RECENT FILES */}
      <div className="border-b" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
        <div
          onClick={() => setIsRecentCollapsed(!isRecentCollapsed)}
          className={`flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors group ${
            currentTheme.type === 'light'
              ? 'text-gray-600 hover:text-gray-950 hover:bg-black/5'
              : 'text-[#888888] hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {isRecentCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            <History size={12} className="text-amber-400" />
            <span>Recent Files</span>
            {recentFiles && recentFiles.length > 0 && (
              <span className="text-[10px] font-mono opacity-65">({recentFiles.length})</span>
            )}
          </div>
          {recentFiles && recentFiles.length > 0 && onClearRecentFiles && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearRecentFiles();
              }}
              title="Clear Recent Files"
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-red-400 transition-all"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        {!isRecentCollapsed && (
          <div className="py-0.5">
            {(!recentFiles || recentFiles.length === 0) ? (
              <div className="px-4 py-2 text-[11px] opacity-60 italic">
                No recent files yet
              </div>
            ) : (
              recentFiles.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onOpenFile(item.id)}
                  className={`group flex items-center justify-between px-4 py-1 text-[12px] cursor-pointer transition-colors ${
                    activeFileId === item.id
                      ? currentTheme.type === 'light'
                        ? 'bg-[#005fb8]/15 text-[#004e9a] font-semibold'
                        : currentTheme.id === 'cyberpunk'
                        ? 'bg-[#fcee0a]/20 text-[#fcee0a] font-semibold'
                        : 'bg-[#007acc]/20 text-white font-medium'
                      : currentTheme.type === 'light'
                      ? 'text-gray-700 hover:text-black hover:bg-black/5'
                      : 'text-[#cccccc] hover:text-white hover:bg-white/5'
                  }`}
                  title={`${item.name} (${item.path})`}
                >
                  <div className="flex items-center gap-1.5 truncate flex-1 min-w-0 pr-1">
                    <FileIcon filename={item.name} size={13} className="shrink-0" />
                    <span className="truncate text-[11.5px]">{item.name}</span>
                    <span className="text-[10px] opacity-40 truncate font-mono hidden group-hover:inline">
                      {item.path}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] opacity-50 font-mono group-hover:hidden">
                      {formatRelativeTime(item.lastOpenedAt)}
                    </span>
                    {onRemoveRecentFile && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveRecentFile(item.id);
                        }}
                        title="Remove from recent files"
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-red-400 transition-all"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* SECTION: WORKSPACE FILES */}
      <div className="flex-1 flex flex-col min-h-0">
        <div
          className={`flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border-b ${
            currentTheme.type === 'light'
              ? 'text-gray-600 bg-black/[0.03]'
              : 'text-[#888888] bg-black/10'
          }`}
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <div
            onClick={() => setIsWorkspaceCollapsed(!isWorkspaceCollapsed)}
            className={`flex items-center gap-1 cursor-pointer transition-colors ${
              currentTheme.type === 'light' ? 'hover:text-black' : 'hover:text-white'
            }`}
          >
            {isWorkspaceCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            <span>Workspace</span>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => (onRequestNewFile ? onRequestNewFile(null) : handleStartCreate('file', null))}
              title="New File (Python, Java, etc.)"
              className={`p-1 rounded transition-colors ${
                currentTheme.type === 'light'
                  ? 'hover:bg-black/8 text-gray-700 hover:text-black'
                  : 'hover:bg-white/15 text-[#cccccc] hover:text-white'
              }`}
            >
              <FilePlus size={13} />
            </button>
            <button
              onClick={() => handleStartCreate('folder', null)}
              title="New Folder in Root"
              className={`p-1 rounded transition-colors ${
                currentTheme.type === 'light'
                  ? 'hover:bg-black/8 text-gray-700 hover:text-black'
                  : 'hover:bg-white/15 text-[#cccccc] hover:text-white'
              }`}
            >
              <FolderPlus size={13} />
            </button>
            <button
              onClick={onRefresh}
              title="Refresh Explorer"
              className={`p-1 rounded transition-colors ${
                currentTheme.type === 'light'
                  ? 'hover:bg-black/8 text-gray-700 hover:text-black'
                  : 'hover:bg-white/15 text-[#cccccc] hover:text-white'
              }`}
            >
              <RefreshCw size={13} />
            </button>
            {onImportProject ? (
              <button
                type="button"
                onClick={onImportProject}
                title="Import Project (Folder / ZIP / Files)"
                className={`p-1 rounded transition-colors ${
                  currentTheme.type === 'light'
                    ? 'hover:bg-black/8 text-gray-700 hover:text-black'
                    : 'hover:bg-white/15 text-[#cccccc] hover:text-white'
                }`}
              >
                <Upload size={13} />
              </button>
            ) : (
              <label
                title="Import File"
                className={`p-1 rounded transition-colors cursor-pointer ${
                  currentTheme.type === 'light'
                    ? 'hover:bg-black/8 text-gray-700 hover:text-black'
                    : 'hover:bg-white/15 text-[#cccccc] hover:text-white'
                }`}
              >
                <Upload size={13} />
                <input type="file" className="hidden" onChange={handleFileInputChange} />
              </label>
            )}
            <button
              onClick={onExport}
              title="Export Project"
              className={`p-1 rounded transition-colors ${
                currentTheme.type === 'light'
                  ? 'hover:bg-black/8 text-gray-700 hover:text-black'
                  : 'hover:bg-white/15 text-[#cccccc] hover:text-white'
              }`}
            >
              <Download size={13} />
            </button>
            {onCloseWorkspace && (
              <button
                onClick={onCloseWorkspace}
                title="Close Workspace"
                className={`p-1 rounded transition-colors ${
                  currentTheme.type === 'light'
                    ? 'hover:bg-black/8 text-gray-700 hover:text-black'
                    : 'hover:bg-white/15 text-[#cccccc] hover:text-white'
                }`}
              >
                <FolderX size={13} />
              </button>
            )}
          </div>
        </div>

        {!isWorkspaceCollapsed && (
          <div className="flex-1 overflow-y-auto py-1">
            {/* Quick Project Trigger */}
            <div className="px-2.5 py-1 mb-1 space-y-1">
              <button
                onClick={() => onLoadSampleProject?.('calculator')}
                className="w-full flex items-center justify-between px-2 py-1 rounded bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-500/40 text-cyan-300 hover:text-white transition-all text-[10.5px] group cursor-pointer"
                title="Load PyCalc Python Calculator (HTML/Tailwind/JS + Python AST server)"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-semibold truncate">PyCalc Python Calculator</span>
                </div>
                <ChevronRight size={12} className="opacity-60 group-hover:opacity-100 shrink-0 text-cyan-400" />
              </button>
              <button
                onClick={() => onLoadSampleProject?.('craveo')}
                className="w-full flex items-center justify-between px-2 py-1 rounded bg-orange-950/30 hover:bg-orange-900/40 border border-orange-500/40 text-orange-300 hover:text-white transition-all text-[10.5px] group cursor-pointer"
                title="Load Craveo Food Delivery (Python + SQLite Full-Stack)"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-semibold truncate">Craveo Food Delivery</span>
                </div>
                <ChevronRight size={12} className="opacity-60 group-hover:opacity-100 shrink-0 text-orange-400" />
              </button>
            </div>

            {/* Root Creation Input */}
            {creatingType && creatingInFolder === null && (
              <div className="flex items-center py-1 px-4 text-[12px] bg-black/5">
                {creatingType === 'file' ? <FilePlus size={13} className="mr-1.5 text-sky-400" /> : <FolderPlus size={13} className="mr-1.5 text-amber-400" />}
                <input
                  type="text"
                  value={newEntryName}
                  autoFocus
                  onChange={(e) => setNewEntryName(e.target.value)}
                  onBlur={handleFinishCreate}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishCreate();
                    if (e.key === 'Escape') setCreatingType(null);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[11px] outline-none border w-full ${
                    currentTheme.type === 'light'
                      ? 'bg-white text-gray-900 border-[#005fb8] shadow-sm'
                      : currentTheme.id === 'cyberpunk'
                      ? 'bg-[#1e1438] text-[#fcee0a] border-[#00f0ff]'
                      : 'bg-[#3c3c3c] text-white border-[#007acc]'
                  }`}
                />
              </div>
            )}

            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: `${currentTheme.ui.accent}15`,
                    color: currentTheme.ui.accent,
                  }}
                >
                  <FilePlus size={18} />
                </div>
                <div>
                  <p className="text-[12px] font-semibold">No files in workspace</p>
                  <p className="text-[10px] opacity-70 mt-1 max-w-[190px] mx-auto leading-relaxed">
                    Open PyCalc Python Calculator or create new files to start coding
                  </p>
                </div>
                <div className="flex flex-col w-full gap-2">
                  {onImportProject && (
                    <button
                      type="button"
                      onClick={onImportProject}
                      className="w-full px-3.5 py-2 text-[11.5px] font-medium rounded-md text-white transition-all shadow-sm flex items-center justify-center gap-1.5 bg-[#007acc] hover:bg-[#0069b3] active:scale-95"
                    >
                      <Upload size={12} />
                      <span>Import Folder / ZIP</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onLoadSampleProject?.('calculator')}
                    className="w-full px-3.5 py-2 text-[11.5px] font-medium rounded-md text-white transition-all shadow-sm flex items-center justify-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95"
                  >
                    <span>Load PyCalc Calculator</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onLoadSampleProject?.('craveo')}
                    className="w-full px-3.5 py-2 text-[11.5px] font-medium rounded-md text-white transition-all shadow-sm flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-500 active:scale-95"
                  >
                    <span>Load Craveo Food Delivery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onRequestNewFile ? onRequestNewFile(null) : handleStartCreate('file', null)
                    }
                    className="w-full px-3.5 py-1.5 text-[11px] font-medium rounded-md text-slate-300 hover:text-white border border-slate-700 hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <FilePlus size={12} />
                    <span>New File...</span>
                  </button>
                </div>
              </div>
            ) : (
              renderTree(files)
            )}
          </div>
        )}
      </div>

      {/* SECTION: OUTLINE */}
      <div className="border-b" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
        <div
          onClick={() => setIsOutlineCollapsed(!isOutlineCollapsed)}
          className={`flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
            currentTheme.type === 'light'
              ? 'text-gray-600 hover:text-gray-950 hover:bg-black/5'
              : 'text-[#888888] hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center space-x-1">
            {isOutlineCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            <span>Outline</span>
          </div>
          {activeFile && (
            <span className="text-[10px] opacity-60 font-mono">
              ({outlineSymbols.length})
            </span>
          )}
        </div>

        {!isOutlineCollapsed && (
          <div className="py-1 px-2 space-y-0.5">
            {activeFile ? (
              <>
                {outlineSymbols.length > 5 && (
                  <div className="relative mb-1 px-1">
                    <Search size={11} className="absolute left-2.5 top-1.5 opacity-40 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Filter symbols..."
                      value={outlineFilter}
                      onChange={(e) => setOutlineFilter(e.target.value)}
                      className={`w-full pl-6 pr-2 py-0.5 text-[11px] rounded outline-none border ${
                        currentTheme.type === 'light'
                          ? 'bg-white border-gray-300 text-gray-900'
                          : 'bg-black/20 border-white/10 text-white'
                      }`}
                    />
                  </div>
                )}
                {outlineSymbols.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-gray-400 italic">
                    No symbols found in current document.
                  </div>
                ) : (
                  outlineSymbols.map((sym) => (
                    <div
                      key={sym.id}
                      onClick={() =>
                        onJumpToLine
                          ? onJumpToLine(activeFile.id, sym.line, 1)
                          : onOpenFile(activeFile.id)
                      }
                      title={`Jump to ${sym.name} (Line ${sym.line})`}
                      className={`flex items-center justify-between px-2 py-1 rounded text-[11.5px] cursor-pointer transition-colors ${
                        currentTheme.type === 'light'
                          ? 'hover:bg-black/5 text-gray-800'
                          : 'hover:bg-white/5 text-[#cccccc]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {sym.kind === 'function' ? (
                          <Braces size={12} className="text-purple-400 shrink-0" />
                        ) : sym.kind === 'class' ? (
                          <Box size={12} className="text-amber-400 shrink-0" />
                        ) : sym.kind === 'interface' ? (
                          <Tag size={12} className="text-sky-400 shrink-0" />
                        ) : (
                          <Code size={12} className="text-emerald-400 shrink-0" />
                        )}
                        <span className="truncate font-mono text-[11px]">{sym.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono tabular-nums shrink-0 ml-1">
                        :{sym.line}
                      </span>
                    </div>
                  ))
                )}
              </>
            ) : (
              <div className="px-3 py-2 text-[11px] text-gray-400 italic">
                No active document selected.
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION: TIMELINE (Real File Checkpoints & Diffs) */}
      <div className="border-b" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
        <div
          onClick={() => setIsTimelineCollapsed(!isTimelineCollapsed)}
          className={`flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
            currentTheme.type === 'light'
              ? 'text-gray-600 hover:text-gray-950 hover:bg-black/5'
              : 'text-[#888888] hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center space-x-1">
            {isTimelineCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            <span>Timeline</span>
          </div>
          <div className="flex items-center gap-1.5">
            {activeFile && onCreateCheckpoint && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTimelineCollapsed(false);
                  onCreateCheckpoint(activeFile);
                }}
                title="Save Manual File Checkpoint"
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium normal-case transition-colors ${
                  currentTheme.type === 'light'
                    ? 'bg-black/5 hover:bg-black/10 text-gray-800'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Plus size={10} />
                <span>Checkpoint</span>
              </button>
            )}
            <History size={12} className="opacity-60" />
          </div>
        </div>

        {!isTimelineCollapsed && (
          <div className="py-1.5 px-2.5 space-y-1.5 text-[11px] max-h-56 overflow-y-auto">
            {activeFile ? (
              fileRevisions.length === 0 ? (
                <div className="py-2 px-1 space-y-2 text-[11px] opacity-75">
                  <p className="italic">
                    No snapshots recorded yet for <span className="font-mono">{activeFile.name}</span>.
                  </p>
                  <p className="text-[10px] opacity-80">
                    Checkpoints are captured automatically on Save (Ctrl+S), Format, Global Replace, or manually above.
                  </p>
                </div>
              ) : (
                fileRevisions.map((rev) => {
                  const isIdentical = rev.content === (activeFile.content || '');
                  return (
                    <div
                      key={rev.id}
                      className={`p-2 rounded border transition-colors ${
                        currentTheme.type === 'light'
                          ? 'bg-black/[0.02] border-gray-200 hover:bg-black/[0.04]'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate flex items-center gap-1.5">
                            <FileText size={11} className="shrink-0 opacity-75" />
                            <span className="truncate">{rev.label}</span>
                          </div>
                          <div className="text-[10px] opacity-65 font-mono mt-0.5 tabular-nums">
                            {formatRevisionTime(rev.timestamp)} • {rev.source}
                            {isIdentical ? ' (matches current)' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {onCompareRevision && (
                          <button
                            type="button"
                            onClick={() =>
                              onCompareRevision(
                                activeFile,
                                rev.content,
                                activeFile.content || '',
                                `Compare Snapshot (${formatRevisionTime(rev.timestamp)}) vs Current`
                              )
                            }
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                              currentTheme.type === 'light'
                                ? 'border-gray-300 hover:bg-black/5 text-gray-700'
                                : 'border-white/15 hover:bg-white/10 text-gray-200'
                            }`}
                          >
                            <GitCompare size={10} />
                            <span>Diff</span>
                          </button>
                        )}
                        {onRestoreRevision && !isIdentical && (
                          <button
                            type="button"
                            onClick={() =>
                              onRestoreRevision(activeFile.id, rev.content, rev.label)
                            }
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white transition-opacity hover:opacity-90"
                            style={{ backgroundColor: currentTheme.ui.accent }}
                          >
                            <RotateCcw size={10} />
                            <span>Restore</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              <div className="py-2 text-gray-400 italic">
                Select a file to inspect its revision history and timeline.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
