import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ActiveSideBarView, EditorSettings, FileNode, TabItem } from '../../types';
import { VSCodeThemeDefinition } from '../../services/themes';
import { RecentFileItem } from '../../services/recentFilesService';
import { ExplorerView } from './ExplorerView';
import { SearchView, SearchReplaceOptions } from './SearchView';
import { SourceControlView } from './SourceControlView';
import { ExtensionsView } from './ExtensionsView';
import { SettingsView } from './SettingsView';
import { AiAssistantView } from './AiAssistantView';
import { RestClientView } from './RestClientView';
import { CodeRadarView } from './CodeRadarView';
import { GameStationView } from '../Game/GameStationView';
import { MasterPanelView } from '../MasterPanel/MasterPanelView';
import { EduLabView } from './EduLabView';
import { VSCodePlugin } from '../../types/plugin';
import { X } from 'lucide-react';

interface SideBarProps {
  currentTheme: VSCodeThemeDefinition;
  activeView: ActiveSideBarView | null;
  files: FileNode[];
  activeFileId: string | null;
  activeFile: FileNode | null;
  tabs: TabItem[];
  plugins: VSCodePlugin[];
  settings: EditorSettings;
  modifiedFiles: FileNode[];
  isWorkspaceOpen?: boolean;
  onCloseWorkspace?: () => void;
  onOpenWorkspace?: () => void;
  onRequestNewFile?: (folderId?: string | null) => void;
  onLoadSampleProject?: (projectType: 'calculator') => void;
  recentFiles?: RecentFileItem[];
  onRemoveRecentFile?: (id: string) => void;
  onClearRecentFiles?: () => void;
  onOpenFile: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  onCreateFile: (folderId: string | null, name: string, initialContent?: string) => void;
  onCreateFolder: (folderId: string | null, name: string) => void;
  onRenameNode: (id: string, newName: string) => void;
  onDeleteNode: (id: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onCommit: (message: string) => void;
  onRevertFile: (fileId: string) => void;
  onOpenDiff: (fileId: string) => void;
  onTogglePlugin: (pluginId: string) => void;
  onOpenNewPluginModal: () => void;
  onDeletePlugin: (pluginId: string) => void;
  onRunPluginCommand: (cmdId: string) => void;
  onUpdateSettings: (newSettings: Partial<EditorSettings>) => void;
  onResetWorkspace: () => void;
  onApplyCode: (code: string) => void;
  onApplyFilePatch?: (path: string, newContent: string) => void;
  onApplyAllPatches?: (patches: Array<{ path: string; newContent: string }>) => void;
  onOpenDiffWithCustomContent?: (file: FileNode, oldContent: string, newContent: string) => void;
  onCreateTestFile?: (name: string, content: string) => void;
  onImportPulledFiles?: (
    files: Array<{ path: string; name: string; content: string; language: string }>
  ) => void;
  onOpenSettings?: () => void;
  onSelectView?: (view: ActiveSideBarView) => void;
  onOpenEduModal?: () => void;
  onLoadExperiment?: (
    folderId: string | null,
    filename: string,
    content: string,
    autoRun?: boolean
  ) => void;
  isMobile?: boolean;
  onClose?: () => void;
  onOpenQuickPushToGitHub?: () => void;
  onJumpToLine?: (fileId: string, line: number, col?: number) => void;
  onReplaceAll?: (query: string, replaceText: string, options: SearchReplaceOptions) => void;
  revisionVersion?: number;
  onCreateCheckpoint?: (file: FileNode) => void;
  onCompareRevision?: (file: FileNode, oldContent: string, newContent: string, title?: string) => void;
  onRestoreRevision?: (fileId: string, content: string, label?: string) => void;
}

export const SideBar: React.FC<SideBarProps> = ({
  currentTheme,
  activeView,
  files,
  activeFileId,
  activeFile,
  tabs,
  plugins,
  settings,
  modifiedFiles,
  isWorkspaceOpen = true,
  onCloseWorkspace,
  onOpenWorkspace,
  onRequestNewFile,
  onLoadSampleProject,
  recentFiles,
  onRemoveRecentFile,
  onClearRecentFiles,
  onOpenFile,
  onCloseTab,
  onCreateFile,
  onCreateFolder,
  onRenameNode,
  onDeleteNode,
  onRefresh,
  onExport,
  onImport,
  onCommit,
  onRevertFile,
  onOpenDiff,
  onTogglePlugin,
  onOpenNewPluginModal,
  onDeletePlugin,
  onRunPluginCommand,
  onUpdateSettings,
  onResetWorkspace,
  onApplyCode,
  onApplyFilePatch,
  onApplyAllPatches,
  onOpenDiffWithCustomContent,
  onCreateTestFile,
  onImportPulledFiles,
  onOpenSettings,
  onSelectView,
  onOpenEduModal,
  onLoadExperiment,
  isMobile,
  onClose,
  onOpenQuickPushToGitHub,
  onJumpToLine,
  onReplaceAll,
  revisionVersion,
  onCreateCheckpoint,
  onCompareRevision,
  onRestoreRevision,
}) => {
  const [width, setWidth] = useState(280);
  const isDraggingRef = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      // Account for 48px activity bar on left and preserve at least 260px for editor
      const maxWidth = Math.max(200, Math.min(560, window.innerWidth - 260));
      const newWidth = Math.max(180, Math.min(maxWidth, e.clientX - 48));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleOpenFileWithAutoDismiss = (fileId: string) => {
    onOpenFile(fileId);
    if (isMobile && onClose) {
      onClose();
    }
  };

  if (!activeView) return null;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-150"
          onClick={onClose}
        />
      )}

      <div
        id="compillo-sidebar"
        className={`h-full flex flex-col relative shrink-0 border-r z-20 ${
          isMobile
            ? 'fixed top-[34px] bottom-12 left-0 z-50 w-[85vw] max-w-[320px] shadow-2xl animate-in slide-in-from-left duration-200'
            : ''
        }`}
        style={{
          width: isMobile
            ? undefined
            : activeView === 'game' || activeView === 'master-panel'
            ? `${Math.max(width, 480)}px`
            : activeView === 'ai-assistant'
            ? `${Math.max(width, 340)}px`
            : `${width}px`,
          maxWidth: isMobile ? undefined : 'calc(100vw - 260px)',
          backgroundColor: currentTheme.ui.sideBarBg,
          borderColor: currentTheme.ui.sideBarBorder,
        }}
      >
        {/* Mobile Header with Active View Name and Close button */}
        {isMobile && (
          <div
            className="flex items-center justify-between px-3 py-2 border-b shrink-0 md:hidden"
            style={{ borderColor: currentTheme.ui.sideBarBorder }}
          >
            <span className="font-bold uppercase tracking-wider text-[11px] opacity-80 capitalize">
              {activeView}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-white/10 text-inherit transition-colors"
              title="Close Sidebar"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Content Area based on active view */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeView === 'explorer' && (
            <ExplorerView
              currentTheme={currentTheme}
              files={files}
              activeFileId={activeFileId}
              activeFile={activeFile}
              tabs={tabs}
              isWorkspaceOpen={isWorkspaceOpen}
              onCloseWorkspace={onCloseWorkspace}
              onOpenWorkspace={onOpenWorkspace}
              onRequestNewFile={onRequestNewFile}
              onLoadSampleProject={onLoadSampleProject}
              recentFiles={recentFiles}
              onRemoveRecentFile={onRemoveRecentFile}
              onClearRecentFiles={onClearRecentFiles}
              onOpenFile={handleOpenFileWithAutoDismiss}
              onJumpToLine={onJumpToLine}
              onCloseTab={onCloseTab}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onRenameNode={onRenameNode}
              onDeleteNode={onDeleteNode}
              onRefresh={onRefresh}
              onExport={onExport}
              onImport={onImport}
              revisionVersion={revisionVersion}
              onCreateCheckpoint={onCreateCheckpoint}
              onCompareRevision={onCompareRevision}
              onRestoreRevision={onRestoreRevision}
            />
          )}
        {activeView === 'ai-assistant' && (
          <AiAssistantView
            currentTheme={currentTheme}
            files={files}
            activeFile={activeFile}
            onApplyCode={onApplyCode}
            onApplyFilePatch={onApplyFilePatch}
            onApplyAllPatches={onApplyAllPatches}
            onOpenDiffWithCustomContent={onOpenDiffWithCustomContent}
            onCreateTestFile={onCreateTestFile}
            onLoadSampleProject={onLoadSampleProject}
          />
        )}
        {activeView === 'rest-client' && (
          <RestClientView currentTheme={currentTheme} />
        )}
        {activeView === 'code-radar' && (
          <CodeRadarView currentTheme={currentTheme} files={files} />
        )}
        {activeView === 'search' && (
          <SearchView
            currentTheme={currentTheme}
            files={files}
            onOpenFile={handleOpenFileWithAutoDismiss}
            onJumpToLine={onJumpToLine}
            onReplaceAll={onReplaceAll}
          />
        )}
        {activeView === 'git' && (
          <SourceControlView
            modifiedFiles={modifiedFiles}
            files={files}
            onCommit={onCommit}
            onRevertFile={onRevertFile}
            onOpenDiff={onOpenDiff}
            onOpenFile={onOpenFile}
            onImportPulledFiles={onImportPulledFiles}
            onOpenSettings={onOpenSettings}
            onOpenQuickPushToGitHub={onOpenQuickPushToGitHub}
          />
        )}
        {activeView === 'extensions' && (
          <ExtensionsView
            currentTheme={currentTheme}
            plugins={plugins}
            onTogglePlugin={onTogglePlugin}
            onOpenNewPluginModal={onOpenNewPluginModal}
            onDeletePlugin={onDeletePlugin}
            onRunPluginCommand={onRunPluginCommand}
          />
        )}
        {activeView === 'settings' && (
          <SettingsView
            currentTheme={currentTheme}
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onResetWorkspace={onResetWorkspace}
          />
        )}
        {activeView === 'game' && (
          <GameStationView
            currentTheme={currentTheme}
            onOpenMasterPanel={() => onSelectView?.('master-panel')}
            onClose={onClose}
          />
        )}
        {activeView === 'master-panel' && (
          <MasterPanelView
            currentTheme={currentTheme}
            onClose={onClose}
            onOpenGame={() => onSelectView?.('game')}
          />
        )}
        {activeView === 'edu' && (
          <EduLabView
            currentTheme={currentTheme}
            onOpenEduModal={onOpenEduModal || (() => {})}
            onLoadExperiment={
              onLoadExperiment ||
              ((folderId, filename, content) => onCreateFile(folderId, filename, content))
            }
          />
        )}
      </div>

      {/* Resize Handle (Desktop Only) */}
      {!isMobile && (
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 right-0 w-[4px] h-full cursor-col-resize hover:bg-[#007acc] transition-colors z-30"
        />
      )}
    </div>
    </>
  );
};
