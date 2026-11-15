import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActivePanelView,
  ActiveSideBarView,
  DiagnosticItem,
  EditorSettings,
  FileNode,
  OutputMessage,
  TabItem,
} from './types';
import { VSCodePlugin, StatusBarItemRef } from './types/plugin';
import {
  addNodeToTree,
  deleteNodeFromTree,
  detectLanguage,
  findFileById,
  getAllFiles,
  loadFileSystem,
  markFileSaved,
  renameNodeInTree,
  resetFileSystem,
  saveFileSystem,
  updateFileContent,
  convertFlatFilesToTree,
} from './services/fileSystem';
import { getCalculatorProject } from './services/calculatorProject';
import { THEMES, VSCodeThemeDefinition } from './services/themes';
import { pluginManager } from './services/pluginSystem';
import { editorService } from './services/editorService';
import { pythonRunner } from './services/pythonRunner';
import { universalRunner } from './services/universalRunner';
import { exportWorkspaceAsZip, importZipArchive } from './services/zipService';
import {
  bundleWorkspaceToSingleHtml,
  downloadSingleHtmlFile,
  generateSelfContainedStudioHtml,
} from './services/htmlBundler';
import {
  RecentFileItem,
  getRecentFiles,
  recordRecentFile,
  removeRecentFile,
  clearRecentFiles,
  subscribeRecentFiles,
} from './services/recentFilesService';
import { TitleBar } from './components/TitleBar/TitleBar';
import { ActivityBar } from './components/ActivityBar/ActivityBar';
import { SideBar } from './components/SideBar/SideBar';
import { TabBar } from './components/Editor/TabBar';
import { BreadcrumbBar } from './components/Editor/BreadcrumbBar';
import { CodeEditor } from './components/Editor/CodeEditor';
import { MarkdownPreview } from './components/Editor/MarkdownPreview';
import { DiffViewer } from './components/Editor/DiffViewer';
import { LivePreviewPane } from './components/Editor/LivePreviewPane';
import { BottomPanel } from './components/Panel/BottomPanel';
import { StatusBar } from './components/StatusBar/StatusBar';
import { CommandPalette } from './components/Modals/CommandPalette';
import { NewPluginModal } from './components/Modals/NewPluginModal';
import { NewFileModal } from './components/Modals/NewFileModal';
import { DownloadFileModal } from './components/Modals/DownloadFileModal';
import { ResetWorkspaceModal } from './components/Modals/ResetWorkspaceModal';
import { ImportModal } from './components/Modals/ImportModal';
import { CloudOpenModal } from './components/Modals/CloudOpenModal';
import { MasterPanelModal } from './components/MasterPanel/MasterPanelModal';
import { EduLabModal } from './components/Modals/EduLabModal';
import { eduLabProgress } from './services/eduLabService';
import { gameSound } from './services/gameSoundService';
import { authService, UserProfile } from './services/authService';
import { initAuth, googleSignOut } from './services/googleAuth';
import { SignInModal } from './components/Modals/SignInModal';
import { UserDashboardModal } from './components/Modals/UserDashboardModal';
import { FreeHostingModal } from './components/Modals/FreeHostingModal';
import { QuickGitHubPushModal } from './components/Modals/QuickGitHubPushModal';
import { AboutCompilloModal } from './components/Modals/AboutCompilloModal';
import { MobileCodingBar } from './components/Editor/MobileCodingBar';
import { MobileNavBar } from './components/Common/MobileNavBar';
import { MobileMenuDrawer } from './components/Modals/MobileMenuDrawer';
import { SnippetsModal } from './components/Modals/SnippetsModal';
import { AppearanceCustomizerModal } from './components/Modals/AppearanceCustomizerModal';
import { engagementService } from './services/engagementService';
import { recordRevision } from './services/revisionService';
import type { SearchReplaceOptions } from './components/SideBar/SearchView';
import { CompilloLandingPage } from './components/Landing/CompilloLandingPage';
import { ArrowLeftRight, X as CloseIcon } from 'lucide-react';

const DEFAULT_SETTINGS: EditorSettings = {
  theme: 'nova-studio',
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  minimap: true,
  lineNumbers: 'on',
  autoSave: true,
  formatOnSave: false,
  bracketPairColorization: true,
};

const getInitialWorkspaceFiles = (): FileNode[] => {
  const saved = loadFileSystem();
  if (saved && saved.length > 0) {
    const all = getAllFiles(saved);
    const isDeletedSample =
      all.length > 0 &&
      all.every((f) => f.id.startsWith('jb-') || f.id.startsWith('ecom-'));
    if (!isDeletedSample) {
      return saved;
    }
  }
  return getCalculatorProject();
};

export default function App() {
  // File System State: Default to PyCalc Python Calculator project
  const [files, setFiles] = useState<FileNode[]>(() => getInitialWorkspaceFiles());
  const [baselineFiles] = useState<FileNode[]>(() => []);

  // Tabs & Active File: Initialize with index.html if available
  const [tabs, setTabs] = useState<TabItem[]>(() => {
    const initialFiles = getInitialWorkspaceFiles();
    const all = getAllFiles(initialFiles);
    const htmlFile = all.find((f) => f.name === 'index.html') || all[0];
    if (htmlFile) {
      return [
        {
          fileId: htmlFile.id,
          path: htmlFile.path,
          title: htmlFile.name,
          language: htmlFile.language,
          isDirty: false,
        },
      ];
    }
    return [];
  });
  const [activeFileId, setActiveFileId] = useState<string | null>(() => {
    const initialFiles = getInitialWorkspaceFiles();
    const all = getAllFiles(initialFiles);
    const htmlFile = all.find((f) => f.name === 'index.html') || all[0];
    return htmlFile ? htmlFile.id : null;
  });

  // Workbench Layout State
  const [activeSideBarView, setActiveSideBarView] = useState<ActiveSideBarView | null>('explorer');
  const [activePanelView, setActivePanelView] = useState<ActivePanelView>('output');
  const activePanelViewRef = useRef(activePanelView);
  activePanelViewRef.current = activePanelView;
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [panelPosition, setPanelPosition] = useState<'bottom' | 'right'>('bottom');
  
  // Clear any previously stuck side position so terminal docks normally at bottom
  useEffect(() => {
    try {
      localStorage.removeItem('compillo_panel_position');
    } catch {}
  }, []);
  const [isSplit, setIsSplit] = useState(false);
  const [secondaryFileId, setSecondaryFileId] = useState<string | null>(null);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isMarkdownPreviewOpen, setIsMarkdownPreviewOpen] = useState(false);
  const [isLivePreviewOpen, setIsLivePreviewOpen] = useState(false);
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const [previewRefreshToken, setPreviewRefreshToken] = useState(0);
  const [isLaunchingApp, setIsLaunchingApp] = useState(false);
  const [diffViewFileId, setDiffViewFileId] = useState<string | null>(null);
  const [customDiff, setCustomDiff] = useState<{
    file: FileNode;
    oldContent: string;
    newContent: string;
    title?: string;
  } | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFileItem[]>(() => getRecentFiles());
  const [revisionVersion, setRevisionVersion] = useState(0);
  const [showLandingPage, setShowLandingPage] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get('editor') === '1' ||
        params.get('template') ||
        params.get('lang') ||
        params.get('code')
      ) {
        return false;
      }
    } catch {
      // ignore
    }
    return true;
  });

  const [isBootingEditor, setIsBootingEditor] = useState(false);
  const [bootText, setBootText] = useState('Initializing Compillo V8 Sandbox...');

  // Mobile responsiveness
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && panelPosition === 'right') {
        setPanelPosition('bottom');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [panelPosition]);

  useEffect(() => {
    return subscribeRecentFiles((items) => {
      setRecentFiles(items);
    });
  }, []);

  // Seed recent files from existing workspace files if empty initially
  useEffect(() => {
    if (recentFiles.length === 0 && files.length > 0) {
      const all = getAllFiles(files);
      if (all.length > 0) {
        all.slice(0, 4).forEach((file) => {
          recordRecentFile(file);
        });
      }
    }
  }, [files]);

  // Deep-link URL parameter support (?template=..., ?lang=..., ?code=...&name=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const templateParam = params.get('template');
      const langParam = params.get('lang');
      const codeParam = params.get('code');
      const nameParam = params.get('name');

      if (codeParam) {
        let decoded = codeParam;
        try {
          decoded = decodeURIComponent(escape(atob(codeParam)));
        } catch {
          try {
            decoded = decodeURIComponent(codeParam);
          } catch {
            decoded = codeParam;
          }
        }
        const fileName = nameParam || (langParam ? `main.${langParam}` : 'shared.py');
        handleCreateFile(null, fileName, decoded);
      } else if (templateParam) {
        handleLoadStarterProject(templateParam);
      } else if (langParam) {
        const extMap: Record<string, { name: string; content: string }> = {
          python: { name: 'main.py', content: 'print("Hello from Compillo Studio!")\n' },
          py: { name: 'main.py', content: 'print("Hello from Compillo Studio!")\n' },
          cpp: { name: 'main.cpp', content: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello from Compillo Studio!" << endl;\n    return 0;\n}\n' },
          c: { name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    printf("Hello from Compillo Studio!\\n");\n    return 0;\n}\n' },
          java: { name: 'Main.java', content: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Compillo Studio!");\n    }\n}\n' },
          typescript: { name: 'index.ts', content: 'const greeting: string = "Hello from Compillo Studio!";\nconsole.log(greeting);\n' },
          ts: { name: 'index.ts', content: 'const greeting: string = "Hello from Compillo Studio!";\nconsole.log(greeting);\n' },
          javascript: { name: 'index.js', content: 'console.log("Hello from Compillo Studio!");\n' },
          js: { name: 'index.js', content: 'console.log("Hello from Compillo Studio!");\n' },
          rust: { name: 'main.rs', content: 'fn main() {\n    println!("Hello from Compillo Studio!");\n}\n' },
          go: { name: 'main.go', content: 'package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from Compillo Studio!")\n}\n' },
          html: { name: 'index.html', content: '<!DOCTYPE html>\n<html>\n<body>\n  <h1>Hello from Compillo Studio!</h1>\n</body>\n</html>\n' },
          sql: { name: 'query.sql', content: 'SELECT "Hello from Compillo Studio!" AS greeting;\n' },
        };
        const spec = extMap[langParam.toLowerCase()] || { name: `main.${langParam}`, content: '' };
        handleCreateFile(null, nameParam || spec.name, spec.content);
      }
    } catch {
      // ignore malformed URL params
    }
  }, []);

  const updatePanelPosition = (pos: 'bottom' | 'right') => {
    setPanelPosition(pos);
    try {
      localStorage.setItem('compillo_panel_position', pos);
    } catch {}
  };

  const handleToggleBottomPanel = () => {
    if (!isPanelOpen) {
      updatePanelPosition('bottom');
      setIsPanelOpen(true);
    } else if (panelPosition === 'right') {
      updatePanelPosition('bottom');
    } else {
      setIsPanelOpen(false);
    }
  };

  const handleToggleSideBySidePanel = () => {
    if (!isPanelOpen) {
      updatePanelPosition('right');
      setIsPanelOpen(true);
    } else if (panelPosition === 'bottom') {
      updatePanelPosition('right');
    } else {
      setIsPanelOpen(false);
    }
  };

  // Cursor & Settings
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);
  const currentTheme: VSCodeThemeDefinition = THEMES[settings.theme] || THEMES['dark-modern'];

  // Workspace Open/Close State
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);

  // Modals & Notifications
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandPaletteMode, setCommandPaletteMode] = useState<'command' | 'file'>('file');
  const [newPluginModalOpen, setNewPluginModalOpen] = useState(false);
  const [newFileModalOpen, setNewFileModalOpen] = useState(false);
  const [newFileFolderId, setNewFileFolderId] = useState<string | null>(null);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [cloudOpenModalOpen, setCloudOpenModalOpen] = useState(false);
  const [masterPanelModalOpen, setMasterPanelModalOpen] = useState(false);
  const [eduLabModalOpen, setEduLabModalOpen] = useState(false);
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [userDashboardModalOpen, setUserDashboardModalOpen] = useState(false);
  const [freeHostingModalOpen, setFreeHostingModalOpen] = useState(false);
  const [quickGitHubPushModalOpen, setQuickGitHubPushModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [aboutModalTab, setAboutModalTab] = useState<'about' | 'graphics' | 'shortcuts' | 'labs' | 'options'>('about');
  const [snippetsModalOpen, setSnippetsModalOpen] = useState(false);
  const [customizerModalOpen, setCustomizerModalOpen] = useState(false);
  const [customizerModalTab, setCustomizerModalTab] = useState<'icons' | 'colors'>('icons');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() =>
    authService.getCurrentUser()
  );
  const openFileInputRef = useRef<HTMLInputElement>(null);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; message: string; type: 'info' | 'warning' | 'error' }>
  >([]);

  useEffect(() => {
    const handleOpenFreeHostingEvent = () => setFreeHostingModalOpen(true);
    window.addEventListener('compillo:open-free-hosting', handleOpenFreeHostingEvent);

    const unsubAuthService = authService.subscribe((u) => setCurrentUser(u));
    const unsubGoogle = initAuth((googleUser, token) => {
      if (googleUser && !authService.getCurrentUser()) {
        authService.signInWithGoogle({
          email: googleUser.email || undefined,
          name: googleUser.displayName || undefined,
          avatarUrl: googleUser.photoURL || undefined,
        });
      }
    });

    return () => {
      window.removeEventListener('compillo:open-free-hosting', handleOpenFreeHostingEvent);
      unsubAuthService();
      unsubGoogle();
    };
  }, []);

  const handleSignOut = async () => {
    await googleSignOut();
    showNotification('Signed out of Compillo Cloud Services.', 'info');
  };

  // Plugin System State
  const [plugins, setPlugins] = useState<VSCodePlugin[]>(() => pluginManager.getPlugins());
  const [statusBarItems, setStatusBarItems] = useState<StatusBarItemRef[]>(() =>
    pluginManager.getStatusBarItems()
  );
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>(() =>
    pluginManager.getAllDiagnostics()
  );
  const [outputLogs, setOutputLogs] = useState<OutputMessage[]>(() =>
    pluginManager.getOutputLogs()
  );

  const activeFile = activeFileId ? findFileById(files, activeFileId) : null;
  const secondaryFile = secondaryFileId ? findFileById(files, secondaryFileId) : null;
  const isMarkdown = activeFile?.language === 'markdown';

  // Notification helper
  const showNotification = useCallback(
    (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
      const id = 'notif-' + Math.random().toString(36).substring(2, 9);
      setNotifications((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 4500);
    },
    []
  );

  useEffect(() => {
    const handleOpenMaster = () => {
      setMasterPanelModalOpen(true);
    };
    const handleOpenEdu = () => {
      setEduLabModalOpen(true);
    };
    const handleOpenCustomizer = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab?: 'icons' | 'colors' }>;
      setCustomizerModalTab(customEvent.detail?.tab === 'colors' ? 'colors' : 'icons');
      setCustomizerModalOpen(true);
    };
    const handleOpenOutputTasks = () => {
      setIsPanelOpen(true);
      setActivePanelView('output');
    };
    window.addEventListener('compillo:open-master-panel', handleOpenMaster);
    window.addEventListener('compillo:open-edu-labs', handleOpenEdu);
    window.addEventListener('compillo:open-customizer', handleOpenCustomizer);
    window.addEventListener('compillo:open-output-tasks', handleOpenOutputTasks);
    return () => {
      window.removeEventListener('compillo:open-master-panel', handleOpenMaster);
      window.removeEventListener('compillo:open-edu-labs', handleOpenEdu);
      window.removeEventListener('compillo:open-customizer', handleOpenCustomizer);
      window.removeEventListener('compillo:open-output-tasks', handleOpenOutputTasks);
    };
  }, []);

  // Bind Editor to Plugin Manager
  useEffect(() => {
    pluginManager.bindEditor({
      getActiveFile: () => (activeFileId ? findFileById(files, activeFileId) : null),
      getActiveContent: () => {
        const f = activeFileId ? findFileById(files, activeFileId) : null;
        return f?.content || '';
      },
      setActiveContent: (newContent: string) => {
        if (!activeFileId) return;
        handleContentChange(newContent);
      },
      insertText: (text: string) => {
        if (!activeFileId) return;
        const f = findFileById(files, activeFileId);
        if (!f) return;
        handleContentChange((f.content || '') + text);
      },
      formatDocument: () => {
        handleFormatDocument();
      },
      showNotification,
    });
  }, [files, activeFileId, showNotification]);

  // Subscribe to Plugin System State changes
  useEffect(() => {
    const sub = pluginManager.subscribe(() => {
      setPlugins(pluginManager.getPlugins());
      setStatusBarItems(pluginManager.getStatusBarItems());
      setDiagnostics(pluginManager.getAllDiagnostics());
      setOutputLogs(pluginManager.getOutputLogs());
    });
    return () => sub.dispose();
  }, []);

  // Save files to localStorage on change & update per-project extension suggestions/profiles
  useEffect(() => {
    saveFileSystem(files);
    pluginManager.setWorkspaceFiles(files);
  }, [files]);

  // Sync HTML/body styling with currentTheme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', currentTheme.type === 'dark');
    document.documentElement.classList.toggle('light', currentTheme.type === 'light');
    document.body.style.backgroundColor = currentTheme.ui.editorBg;
  }, [currentTheme]);

  // Ensure that whenever an active file exists, the workspace state is open
  useEffect(() => {
    if (activeFileId && !isWorkspaceOpen) {
      setIsWorkspaceOpen(true);
    }
  }, [activeFileId, isWorkspaceOpen]);

  // Handle Tab and File Operations
  const handleOpenFile = (fileId: string, currentFiles?: FileNode[]) => {
    const nodes = currentFiles || files;
    const file = findFileById(nodes, fileId);
    if (!file || file.type !== 'file') return;

    setIsWorkspaceOpen(true);
    setActiveFileId(fileId);
    setDiffViewFileId(null);

    // Record in Recent Files
    recordRecentFile({
      id: file.id,
      name: file.name,
      path: file.path,
      language: file.language,
    });

    // If tab doesn't exist, append it
    setTabs((prev) => {
      if (prev.some((t) => t.fileId === fileId)) return prev;
      return [
        ...prev,
        {
          fileId: file.id,
          path: file.path,
          title: file.name,
          language: file.language,
          isDirty: file.isDirty || false,
        },
      ];
    });
  };

  const handleCloseTab = (fileId: string) => {
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.fileId !== fileId);
      if (activeFileId === fileId) {
        const nextActive = filtered[filtered.length - 1]?.fileId || null;
        setActiveFileId(nextActive);
      }
      return filtered;
    });
  };

  const handleCloseOtherTabs = (fileId: string) => {
    setTabs((prev) => prev.filter((t) => t.fileId === fileId));
    setActiveFileId(fileId);
  };

  const handleCloseAllTabs = () => {
    setTabs([]);
    setActiveFileId(null);
  };

  const handleCloseRightTabs = (fileId: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.fileId === fileId);
      if (idx === -1) return prev;
      return prev.slice(0, idx + 1);
    });
  };

  const handleContentChange = (newContent: string) => {
    if (!activeFileId) return;
    engagementService.recordExplicitInteraction();
    const { updatedNodes, isDirty } = updateFileContent(files, activeFileId, newContent);
    setFiles(updatedNodes);

    // Update tab dirty state
    setTabs((prev) =>
      prev.map((t) => (t.fileId === activeFileId ? { ...t, isDirty: true } : t))
    );

    const f = findFileById(updatedNodes, activeFileId);
    if (f) {
      pluginManager.triggerContentChange(newContent, f);
    }
  };

  const handleJumpToLine = useCallback(
    (fileId: string, line: number, col = 1) => {
      if (activeFileId === fileId && !diffViewFileId && !customDiff) {
        editorService.revealLine(line, col);
        return;
      }
      handleOpenFile(fileId);
      setTimeout(() => {
        editorService.revealLine(line, col);
      }, 90);
    },
    [activeFileId, diffViewFileId, customDiff, files]
  );

  const handleToggleSplit = useCallback(() => {
    setIsSplit((prev) => {
      const next = !prev;
      if (next) {
        const currentSecondValid = secondaryFileId && findFileById(files, secondaryFileId);
        if (!currentSecondValid) {
          const otherTab = tabs.find((t) => t.fileId !== activeFileId);
          const otherFile = getAllFiles(files).find((f) => f.id !== activeFileId);
          setSecondaryFileId(otherTab?.fileId || otherFile?.id || activeFileId);
        }
      }
      return next;
    });
  }, [secondaryFileId, files, tabs, activeFileId]);

  const handleOpenToSide = (fileId: string) => {
    const file = findFileById(files, fileId);
    if (!file || file.type !== 'file') return;
    setSecondaryFileId(fileId);
    setIsSplit(true);
    setDiffViewFileId(null);
    setCustomDiff(null);
  };

  const handleSecondaryContentChange = (newContent: string) => {
    if (!secondaryFileId) return;
    engagementService.recordExplicitInteraction();
    const { updatedNodes } = updateFileContent(files, secondaryFileId, newContent);
    setFiles(updatedNodes);
    setTabs((prev) =>
      prev.map((t) => (t.fileId === secondaryFileId ? { ...t, isDirty: true } : t))
    );
  };

  const handleSaveFile = () => {
    if (!activeFileId) return;
    const updated = markFileSaved(files, activeFileId);
    setFiles(updated);
    setTabs((prev) =>
      prev.map((t) => (t.fileId === activeFileId ? { ...t, isDirty: false } : t))
    );

    const f = findFileById(updated, activeFileId);
    if (f) {
      recordRevision(f, 'save', 'Saved Snapshot');
      setRevisionVersion((v) => v + 1);
      setPreviewRefreshToken((v) => v + 1);
      pluginManager.triggerSave(f);
      showNotification(
        `Saved "${f.name}" & captured timeline snapshot.`,
        'info'
      );
    }
  };

  const handleFormatDocument = () => {
    if (activeFile) {
      recordRevision(activeFile, 'format', 'Before Prettier Format');
      setRevisionVersion((v) => v + 1);
    }
    pluginManager.executeCommand('editor.formatDocument');
  };

  const handleCreateCheckpoint = (file: FileNode) => {
    const rev = recordRevision(file, 'manual', `Checkpoint (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
    if (rev) {
      setRevisionVersion((v) => v + 1);
      showNotification(`Checkpoint saved for "${file.name}".`, 'info');
    }
  };

  const handleCompareRevision = (
    file: FileNode,
    oldContent: string,
    newContent: string,
    title?: string
  ) => {
    setDiffViewFileId(null);
    setCustomDiff({
      file,
      oldContent,
      newContent,
      title: title || `Timeline Diff: ${file.name}`,
    });
  };

  const handleRestoreRevision = (fileId: string, content: string, label?: string) => {
    const current = findFileById(files, fileId);
    if (current) {
      recordRevision(current, 'restore', 'Before Restore');
    }
    const { updatedNodes } = updateFileContent(files, fileId, content);
    setFiles(updatedNodes);
    saveFileSystem(updatedNodes);
    setTabs((prev) =>
      prev.map((t) => (t.fileId === fileId ? { ...t, isDirty: true } : t))
    );
    setRevisionVersion((v) => v + 1);
    showNotification(
      `Restored "${current?.name || 'file'}" from ${label || 'snapshot'}.`,
      'info'
    );
  };

  const handleReplaceAllInWorkspace = (
    query: string,
    replaceText: string,
    options: SearchReplaceOptions
  ) => {
    if (!query.trim()) return;
    let pattern: RegExp;
    try {
      const flags = options.matchCase ? 'g' : 'gi';
      if (options.useRegex) {
        pattern = new RegExp(query, flags);
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const finalPattern = options.wholeWord ? `\\b${escaped}\\b` : escaped;
        pattern = new RegExp(finalPattern, flags);
      }
    } catch (err: any) {
      showNotification(`Invalid search pattern: ${err?.message || 'error'}`, 'error');
      return;
    }

    let updatedTree = files;
    let filesChanged = 0;
    let totalReplacements = 0;
    const touchedIds = new Set<string>();

    for (const file of getAllFiles(files)) {
      const content = file.content || '';
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        recordRevision(file, 'pre-replace', `Before Replace "${query.slice(0, 20)}"`);
        const nextContent = content.replace(pattern, replaceText);
        const res = updateFileContent(updatedTree, file.id, nextContent);
        updatedTree = res.updatedNodes;
        touchedIds.add(file.id);
        filesChanged++;
        totalReplacements += matches.length;
      }
    }

    if (filesChanged === 0) {
      showNotification(`No occurrences of "${query}" found.`, 'warning');
      return;
    }

    setFiles(updatedTree);
    saveFileSystem(updatedTree);
    setTabs((prev) =>
      prev.map((t) => (touchedIds.has(t.fileId) ? { ...t, isDirty: true } : t))
    );
    setRevisionVersion((v) => v + 1);
    showNotification(
      `Replaced ${totalReplacements} occurrence(s) across ${filesChanged} file(s). Pre-replace snapshots saved.`,
      'info'
    );
  };

  const handleSyncShellFiles = (
    syncedFiles: Array<{ path: string; name: string; content: string }>
  ) => {
    if (!syncedFiles || syncedFiles.length === 0) return;
    let nextFiles = files;
    let changed = false;

    for (const sf of syncedFiles) {
      const normalizedPath = sf.path.startsWith('/') ? sf.path : `/${sf.path}`;
      const existing = getAllFiles(nextFiles).find(
        (f) => f.path === normalizedPath || f.path.replace(/^\/+/, '') === normalizedPath.replace(/^\/+/, '')
      );
      if (existing) {
        if ((existing.content || '') !== sf.content) {
          const res = updateFileContent(nextFiles, existing.id, sf.content);
          nextFiles = res.updatedNodes;
          changed = true;
        }
      } else {
        const newNode: FileNode = {
          id: 'file-' + Math.random().toString(36).substring(2, 9),
          name: sf.name || normalizedPath.split('/').pop() || 'file.txt',
          path: normalizedPath,
          type: 'file',
          language: detectLanguage(sf.name || normalizedPath),
          content: sf.content,
          isDirty: false,
        };
        nextFiles = addNodeToTree(nextFiles, null, newNode);
        changed = true;
      }
    }

    if (changed) {
      setFiles(nextFiles);
      saveFileSystem(nextFiles);
    }
  };

  const handleInsertSnippet = (code: string, title: string) => {
    const inserted = editorService.insertAtCursor(code);
    if (!inserted && activeFile) {
      handleContentChange((activeFile.content || '') + '\n' + code);
    }
    showNotification(`Inserted snippet "${title}".`, 'info');
  };

  const handleRunPython = (fileNode?: FileNode | null) => {
    const target = fileNode || findFileById(files, activeFileId || '');
    if (target && target.content !== undefined) {
      setIsPanelOpen(true);
      setActivePanelView('python');
      universalRunner.runFile(target, files);
      showNotification(`Running ${target.name} in Free Runner...`, 'info');
    } else {
      const all = getAllFiles(files);
      const py = all.find((f) => f.language === 'python' || f.name.endsWith('.py'));
      if (py && py.content !== undefined) {
        setIsPanelOpen(true);
        setActivePanelView('python');
        universalRunner.runFile(py, files);
        showNotification(`Running ${py.name} in Free Runner...`, 'info');
      } else {
        setIsPanelOpen(true);
        setActivePanelView('python');
      }
    }
  };

  const handleRunCode = () => {
    const active = findFileById(files, activeFileId || '');
    if (active && active.content !== undefined) {
      setIsPanelOpen(true);
      setActivePanelView('python');
      universalRunner.runFile(active, files);
      showNotification(`Running ${active.name} (${active.language.toUpperCase()}) in Free Runner...`, 'info');
      return;
    }

    setIsPanelOpen(true);
    setActivePanelView('python');
    pluginManager.executeCommand('code-runner.run');
  };

  const handleLaunchWorkspaceApp = async (forceRestart = false) => {
    const all = getAllFiles(files);
    if (all.length === 0) {
      showNotification('Open or load a project first before launching.', 'warning');
      return;
    }

    const hasCalc = all.some((f) => (f.content || '').includes('PyCalc') || f.id.startsWith('calc-'));

    const projectKey = hasCalc ? 'calculator' : 'workspace';
    const targetPort = hasCalc ? 5050 : 5100;

    setIsLaunchingApp(true);
    try {
      const res = await fetch('/api/projects/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: projectKey,
          port: targetPort,
          restart: forceRestart,
          files: all.map((f) => ({ path: f.path, content: f.content || '' })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotification(data.error || `Failed to start server on :${targetPort}`, 'error');
        return;
      }

      const proxyUrl = `${window.location.origin}/api/ports/proxy/${data.port}/`;
      setLivePreviewUrl(proxyUrl);
      setIsLivePreviewOpen(true);
      setPreviewRefreshToken((v) => v + 1);
      showNotification(
        `${data.label || 'Local App'} running on port :${data.port} — opened in Live Preview.`,
        'info'
      );
    } catch (err: any) {
      showNotification(`Launch failed: ${err?.message || 'Network error'}`, 'error');
    } finally {
      setIsLaunchingApp(false);
    }
  };

  // Tree manipulation
  const handleCreateFile = (
    folderId: string | null,
    name: string,
    initialContent?: string
  ) => {
    setIsWorkspaceOpen(true);
    const id = 'file-' + Math.random().toString(36).substring(2, 9);
    const parent = folderId ? findFileById(files, folderId) : null;
    const path = parent ? `${parent.path}/${name}` : `/${name}`;
    const language = detectLanguage(name);

    const newFile: FileNode = {
      id,
      name,
      path,
      type: 'file',
      language,
      content: initialContent !== undefined ? initialContent : `// ${name}\n\n`,
      isDirty: false,
    };

    const updated = addNodeToTree(files, folderId, newFile);
    setFiles(updated);
    saveFileSystem(updated);
    handleOpenFile(id, updated);
    showNotification(`Created file ${name} (${language})`, 'info');
  };

  const handleRequestNewFile = (folderId: string | null = null) => {
    setNewFileFolderId(folderId);
    setNewFileModalOpen(true);
  };

  const handleLoadLabExperiment = (
    folderId: string | null,
    filename: string,
    content: string,
    autoRun = true
  ) => {
    setIsWorkspaceOpen(true);
    const id = 'file-' + Math.random().toString(36).substring(2, 9);
    const parent = folderId ? findFileById(files, folderId) : null;
    const path = parent ? `${parent.path}/${filename}` : `/${filename}`;
    const language = detectLanguage(filename);

    const newFile: FileNode = {
      id,
      name: filename,
      path,
      type: 'file',
      language,
      content,
      isDirty: false,
    };

    const updated = addNodeToTree(files, folderId, newFile);
    setFiles(updated);
    saveFileSystem(updated);
    handleOpenFile(id, updated);
    showNotification(`Loaded University Lab Experiment: "${filename}"`, 'info');

    // Track achievement badge progress
    const progressRes = eduLabProgress.recordRunByFilename(filename);
    if (progressRes.newlyUnlockedBadges.length > 0) {
      gameSound.playLevelClear();
      const badge = progressRes.newlyUnlockedBadges[0];
      showNotification(`🏆 Achievement Unlocked: ${badge.title}! (${badge.reward})`, 'info');
    }

    if (autoRun) {
      setTimeout(() => {
        setIsPanelOpen(true);
        setActivePanelView('python');
        universalRunner.runFile(newFile, updated);
      }, 250);
    }
  };

  // Multi-Agent Workspace Patching & Staging
  const handleApplyFilePatch = (targetPath: string, newContent: string) => {
    const cleanPath = targetPath.replace(/^\/+/, '');
    const cleanName = targetPath.split('/').pop() || targetPath;
    const all = getAllFiles(files);
    const targetFile =
      all.find((f) => f.path.replace(/^\/+/, '') === cleanPath || f.name === cleanName) ||
      activeFile;

    if (!targetFile) return;

    const { updatedNodes } = updateFileContent(files, targetFile.id, newContent);
    setFiles(updatedNodes);
    saveFileSystem(updatedNodes);

    setTabs((prev) =>
      prev.map((t) => (t.fileId === targetFile.id ? { ...t, isDirty: true } : t))
    );

    showNotification(`Merged AI Agent patch for ${targetFile.name}`, 'info');
  };

  const handleApplyAllPatches = (patches: Array<{ path: string; newContent: string }>) => {
    let currentFiles = files;
    let appliedCount = 0;

    for (const patch of patches) {
      const cleanPath = patch.path.replace(/^\/+/, '');
      const cleanName = patch.path.split('/').pop() || patch.path;
      const all = getAllFiles(currentFiles);
      const targetFile =
        all.find((f) => f.path.replace(/^\/+/, '') === cleanPath || f.name === cleanName) ||
        (appliedCount === 0 ? activeFile : null);

      if (targetFile) {
        const { updatedNodes } = updateFileContent(currentFiles, targetFile.id, patch.newContent);
        currentFiles = updatedNodes;
        appliedCount++;
      }
    }

    setFiles(currentFiles);
    saveFileSystem(currentFiles);
    showNotification(`Merged all ${appliedCount} AI agent file patches`, 'info');
  };

  const handleOpenDiffWithCustomContent = (
    file: FileNode,
    oldContent: string,
    newContent: string
  ) => {
    setDiffViewFileId(null);
    setCustomDiff({
      file,
      oldContent,
      newContent,
      title: 'AI Staged Patch Review',
    });
  };

  const handleCreateTestFile = (name: string, content: string) => {
    handleCreateFile(null, name, content);
  };

  const handleCreateFolder = (folderId: string | null, name: string) => {
    setIsWorkspaceOpen(true);
    const id = 'folder-' + Math.random().toString(36).substring(2, 9);
    const parent = folderId ? findFileById(files, folderId) : null;
    const siblings = parent ? parent.children || [] : files;

    let uniqueName = name;
    let suffix = 2;
    while (siblings.some((node) => node.name === uniqueName)) {
      uniqueName = `${name}_${suffix++}`;
    }

    const path = parent ? `${parent.path}/${uniqueName}` : `/${uniqueName}`;

    const newFolder: FileNode = {
      id,
      name: uniqueName,
      path,
      type: 'folder',
      language: '',
      isOpen: true,
      children: [],
    };

    const updated = addNodeToTree(files, folderId, newFolder);
    setFiles(updated);
    showNotification(`Created folder ${uniqueName}`, 'info');
  };

  const handleRenameNode = (id: string, newName: string) => {
    const updated = renameNodeInTree(files, id, newName);
    setFiles(updated);
    setTabs((prev) =>
      prev.map((t) => (t.fileId === id ? { ...t, title: newName } : t))
    );
    const renamed = findFileById(updated, id);
    if (renamed && renamed.type === 'file') {
      recordRecentFile(renamed);
    }
    showNotification(`Renamed to ${newName}`, 'info');
  };

  const handleDeleteNode = (id: string) => {
    handleCloseTab(id);
    const updated = deleteNodeFromTree(files, id);
    setFiles(updated);
    removeRecentFile(id);
    showNotification(`Deleted item`, 'info');
  };

  // Recent files handlers
  const handleOpenRecentFile = (fileId: string) => {
    let target = findFileById(files, fileId);
    if (!target) {
      const recent = recentFiles.find((r) => r.id === fileId);
      if (recent) {
        const all = getAllFiles(files);
        target = all.find((f) => f.path === recent.path || f.name === recent.name) || null;
      }
    }

    if (target) {
      setIsWorkspaceOpen(true);
      handleOpenFile(target.id);
    } else {
      showNotification('The selected file is not available in the current workspace.', 'warning');
    }
  };

  const handleRemoveRecentFile = (fileId: string) => {
    removeRecentFile(fileId);
    showNotification('Removed from recent files', 'info');
  };

  const handleClearRecentFiles = () => {
    clearRecentFiles();
    showNotification('Cleared recent files history', 'info');
  };

  const handleCloseWorkspace = () => {
    setIsWorkspaceOpen(false);
    setTabs([]);
    setActiveFileId(null);
    showNotification('Workspace closed. Open a workspace or file anytime from File menu or Explorer.', 'info');
  };

  const handleOpenWorkspace = () => {
    setIsWorkspaceOpen(true);
    if (files.length === 0) {
      handleLoadStarterProject();
    } else {
      const all = getAllFiles(files);
      if (all.length > 0) {
        handleOpenFile(all[0].id);
      }
      showNotification('Workspace opened.', 'info');
    }
  };

  const handleLoadStarterProject = (_templateType?: string) => {
    const starterNodes = getCalculatorProject();

    setFiles(starterNodes);
    saveFileSystem(starterNodes);
    setIsWorkspaceOpen(true);
    setTabs([]);
    const all = getAllFiles(starterNodes);
    const target =
      all.find((f) => f.name === 'index.html') ||
      all.find((f) => f.name === 'server.py') ||
      all[0];
    if (target) {
      handleOpenFile(target.id, starterNodes);
    }
    showNotification('Loaded PyCalc Python Calculator Project into Workspace!', 'info');
  };

  const handleResetToStarter = () => {
    handleLoadStarterProject('calculator');
  };

  const handleResetToEmpty = () => {
    const empty = resetFileSystem();
    setFiles(empty);
    setTabs([]);
    setActiveFileId(null);
    setIsWorkspaceOpen(true);
    showNotification('Workspace cleared to an empty workspace.', 'info');
  };

  const handleImportPulledFiles = (
    pulledFiles: Array<{ path: string; name: string; content: string; language: string }>
  ) => {
    if (!pulledFiles || pulledFiles.length === 0) return;
    const newTree = convertFlatFilesToTree(pulledFiles);
    setFiles(newTree);
    saveFileSystem(newTree);
    setIsWorkspaceOpen(true);
    setTabs([]);

    const all = getAllFiles(newTree);
    const readme = all.find((f) => f.name.toLowerCase().startsWith('readme'));
    const target = readme || all[0];
    if (target) {
      handleOpenFile(target.id, newTree);
    }

    showNotification(
      `Synchronized ${pulledFiles.length} files from GitHub into workspace!`,
      'info'
    );
  };

  const handleDownloadActiveFile = (targetFileName: string) => {
    if (!activeFile) {
      showNotification('No active file to download.', 'warning');
      return;
    }
    const blob = new Blob([activeFile.content || ''], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = targetFileName.trim() || activeFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(`Downloaded "${a.download}" to your local machine!`, 'info');
  };

  const handleExportProjectZip = async () => {
    try {
      const all = getAllFiles(files);
      if (all.length === 0) {
        showNotification('Workspace is empty. Create or add files first.', 'warning');
        return;
      }
      await exportWorkspaceAsZip(files, `compillo-workspace-${Date.now()}.zip`);
      showNotification('Project exported as ZIP archive successfully!', 'info');
    } catch (err: any) {
      showNotification(err?.message || 'Failed to export project ZIP.', 'error');
    }
  };

  const handleExportSingleHtml = (customFileName?: string) => {
    try {
      const html = bundleWorkspaceToSingleHtml(files, activeFile);
      const baseName = customFileName
        ? (customFileName.endsWith('.html') || customFileName.endsWith('.htm') ? customFileName : `${customFileName}.html`)
        : activeFile?.name
        ? `${activeFile.name.replace(/\.[^/.]+$/, '')}_single_page.html`
        : 'workspace_single_page.html';
      downloadSingleHtmlFile(html, baseName);
      showNotification(`Exported single HTML page (${baseName}) with bundled CSS & JS!`, 'info');
    } catch (err: any) {
      showNotification(err?.message || 'Failed to export single HTML page.', 'error');
    }
  };

  const handleDownloadStandaloneReplica = () => {
    try {
      const replicaHtml = generateSelfContainedStudioHtml();
      downloadSingleHtmlFile(replicaHtml, 'compillo_single_page.html');
      showNotification('Downloaded Standalone Single-Page Replica (compillo_single_page.html)!', 'info');
    } catch (err: any) {
      // Fallback to direct download endpoint
      window.location.href = '/download/standalone';
      showNotification('Downloading standalone replica...', 'info');
    }
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      handleCreateFile(null, file.name, content);
      setIsWorkspaceOpen(true);
    };
    reader.readAsText(file);
  };

  const handleImportFiles = (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;
    setIsWorkspaceOpen(true);

    let count = 0;
    arr.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = (e.target?.result as string) || '';
        handleCreateFile(null, file.name, content);
        count++;
        if (count === arr.length) {
          showNotification(`Imported ${arr.length} file(s) into workspace.`, 'info');
        }
      };
      reader.readAsText(file);
    });
  };

  const handleImportZip = async (file: File) => {
    try {
      showNotification(`Unpacking ${file.name}...`, 'info');
      const nodes = await importZipArchive(file);
      if (nodes.length === 0) {
        showNotification('No files found inside the ZIP archive.', 'warning');
        return;
      }
      setFiles((prev) => {
        const merged = [...prev, ...nodes];
        saveFileSystem(merged);
        return merged;
      });
      setIsWorkspaceOpen(true);
      const allExtracted = getAllFiles(nodes);
      if (allExtracted.length > 0) {
        handleOpenFile(allExtracted[0].id, [...files, ...nodes]);
      }
      showNotification(`Imported and extracted ${allExtracted.length} file(s) from ZIP!`, 'info');
    } catch (err: any) {
      showNotification(`Failed to import ZIP: ${err.message}`, 'error');
    }
  };

  const handleOpenFileFromDiskTrigger = () => {
    openFileInputRef.current?.click();
  };

  const handleDirectFileOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportFile(file);
      setIsWorkspaceOpen(true);
    }
    e.target.value = '';
  };

  // Git / Source Control
  const modifiedFiles = getAllFiles(files).filter((f) => f.isDirty);

  const handleCommitGit = (msg: string) => {
    let updated = files;
    modifiedFiles.forEach((f) => {
      updated = markFileSaved(updated, f.id);
    });
    setFiles(updated);
    setTabs((prev) => prev.map((t) => ({ ...t, isDirty: false })));
    showNotification(`[main] Committed "${msg}"`, 'info');
  };

  const handleRevertFile = (fileId: string) => {
    const baseline = findFileById(baselineFiles, fileId);
    if (baseline && baseline.content !== undefined) {
      const { updatedNodes } = updateFileContent(files, fileId, baseline.content);
      const saved = markFileSaved(updatedNodes, fileId);
      setFiles(saved);
      setTabs((prev) =>
        prev.map((t) => (t.fileId === fileId ? { ...t, isDirty: false } : t))
      );
      setDiffViewFileId(null);
      showNotification(`Reverted changes to ${baseline.name}`, 'info');
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes any open modal or palette
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setNewPluginModalOpen(false);
        setNewFileModalOpen(false);
      }
      // Ctrl+N / Cmd+N (New File with type selection)
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleRequestNewFile(null);
      }
      // Ctrl+S / Cmd+S
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveFile();
      }
      // Ctrl+P / Cmd+P
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setCommandPaletteMode('file');
        setCommandPaletteOpen(true);
      }
      // Ctrl+Shift+P / Cmd+Shift+P or F1
      else if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') ||
        e.key === 'F1'
      ) {
        e.preventDefault();
        setCommandPaletteMode('command');
        setCommandPaletteOpen(true);
      }
      // Ctrl+B / Cmd+B (Toggle Sidebar)
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setActiveSideBarView((prev) => (prev ? null : 'explorer'));
      }
      // Ctrl+J / Cmd+J (Toggle Panel)
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsPanelOpen((prev) => !prev);
      }
      // Ctrl+` / Cmd+` (Toggle Terminal)
      else if ((e.ctrlKey || e.metaKey) && (e.key === '`' || e.code === 'Backquote')) {
        e.preventDefault();
        if (activePanelViewRef.current === 'terminal') {
          setIsPanelOpen((prev) => !prev);
        } else {
          setActivePanelView('terminal');
          setIsPanelOpen(true);
        }
      }
      // Ctrl+\ (Toggle Split)
      else if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        handleToggleSplit();
      }
      // Shift+Alt+F (Format Document)
      else if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleFormatDocument();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [files, activeFileId]);

  // Commands for the Command Palette
  const availableCommands = [
    {
      id: 'code-runner.run',
      title: 'Run Active File',
      category: 'Run',
      shortcut: 'Ctrl+Alt+N',
      run: handleRunCode,
    },
    {
      id: 'editor.formatDocument',
      title: 'Format Document (Prettier)',
      category: 'Editor',
      shortcut: 'Shift+Alt+F',
      run: handleFormatDocument,
    },
    {
      id: 'workbench.action.toggleSidebar',
      title: 'Toggle Primary Side Bar',
      category: 'View',
      shortcut: 'Ctrl+B',
      run: () => setActiveSideBarView((prev) => (prev ? null : 'explorer')),
    },
    {
      id: 'workbench.action.togglePanel',
      title: 'Toggle Bottom Panel',
      category: 'View',
      shortcut: 'Ctrl+J',
      run: handleToggleBottomPanel,
    },
    {
      id: 'workbench.action.toggleSideBySidePanel',
      title: 'Toggle Side-by-Side Panel (Editor & Panel Side-by-Side)',
      category: 'View',
      run: handleToggleSideBySidePanel,
    },
    {
      id: 'workbench.action.movePanelRight',
      title: 'Move Panel to Side (Side-by-Side with Editor)',
      category: 'View',
      run: () => {
        updatePanelPosition('right');
        setIsPanelOpen(true);
      },
    },
    {
      id: 'workbench.action.movePanelBottom',
      title: 'Move Panel to Bottom',
      category: 'View',
      run: () => {
        updatePanelPosition('bottom');
        setIsPanelOpen(true);
      },
    },
    {
      id: 'workbench.action.splitEditor',
      title: 'Split Editor Right',
      category: 'View',
      shortcut: 'Ctrl+\\',
      run: handleToggleSplit,
    },
    {
      id: 'workbench.action.saveFile',
      title: 'Save Active File',
      category: 'File',
      shortcut: 'Ctrl+S',
      run: handleSaveFile,
    },
    {
      id: 'workbench.action.newFile',
      title: 'New File... (Python, C/C++, Java, etc.)',
      category: 'File',
      shortcut: 'Ctrl+N',
      run: () => handleRequestNewFile(null),
    },
    {
      id: 'workbench.action.newFolder',
      title: 'New Folder...',
      category: 'File',
      run: () => handleCreateFolder(null, 'new_folder'),
    },
    {
      id: 'todo.listAll',
      title: 'TODO: Highlight and List All Comments',
      category: 'TODO',
      run: () => {
        setIsPanelOpen(true);
        setActivePanelView('output');
        pluginManager.executeCommand('todo.listAll');
      },
    },
    {
      id: 'git.sync',
      title: 'Sync with GitHub (Pull & Push)',
      category: 'GitHub',
      run: () => {
        setActiveSideBarView('git');
      },
    },
    {
      id: 'git.pull',
      title: 'Pull from GitHub Branch',
      category: 'GitHub',
      run: () => {
        setActiveSideBarView('git');
      },
    },
    {
      id: 'git.push',
      title: 'Push Changes to GitHub Branch',
      category: 'GitHub',
      run: () => {
        setActiveSideBarView('git');
      },
    },
    {
      id: 'editor.smartSuggest',
      title: 'Trigger Smart Code Completion',
      category: 'Editor',
      shortcut: 'Ctrl+Space',
      run: () => {
        editorService.getEditor()?.trigger('palette', 'editor.action.triggerSuggest', {});
      },
    },
    {
      id: 'workbench.action.openLocalFile',
      title: 'File: Open Local File...',
      category: 'File',
      shortcut: 'Ctrl+O',
      run: handleOpenFileFromDiskTrigger,
    },
    {
      id: 'workbench.action.openCloudFile',
      title: 'File: Open File from Cloud (GitHub / Remote)...',
      category: 'File',
      run: () => setCloudOpenModalOpen(true),
    },
    {
      id: 'git.pushWorkspaceToGitHub',
      title: 'Git: Push All Workspace Files to GitHub Repository...',
      category: 'Git',
      run: () => setQuickGitHubPushModalOpen(true),
    },
    {
      id: 'preferences.githubOAuth',
      title: 'Preferences: Configure GitHub OAuth & Cloud Sync (Client ID & Secret)',
      category: 'Preferences',
      run: () => setActiveSideBarView('settings'),
    },
    {
      id: 'preferences.theme.sakura',
      title: 'Preferences: Color Theme: 🌸 Sakura Blossom (Rose Quartz & Cherry)',
      category: 'Preferences',
      run: () => {
        setSettings((s) => ({ ...s, theme: 'sakura-blossom' }));
        showNotification('Switched to 🌸 Sakura Blossom Theme', 'info');
      },
    },
    {
      id: 'preferences.theme.fairy',
      title: 'Preferences: Color Theme: ✨ Fairy Lavender (Lilac & Dreamy Twilight)',
      category: 'Preferences',
      run: () => {
        setSettings((s) => ({ ...s, theme: 'fairy-lavender' }));
        showNotification('Switched to ✨ Fairy Lavender Theme', 'info');
      },
    },
    {
      id: 'preferences.theme.luxury',
      title: 'Preferences: Color Theme: 👑 Royal Noir & Champagne Gold (Haute Luxury)',
      category: 'Preferences',
      run: () => {
        setSettings((s) => ({ ...s, theme: 'luxury-gold' }));
        showNotification('Switched to 👑 Royal Noir & Champagne Gold Theme', 'info');
      },
    },
    {
      id: 'workbench.action.openEduLabs',
      title: 'University Labs: Load Programming Lab Experiment (RTU, AKTU, VTU)...',
      category: 'University Labs',
      shortcut: 'Ctrl+Shift+U',
      run: () => setEduLabModalOpen(true),
    },
    {
      id: 'user.openDashboard',
      title: 'User: Open User Dashboard (Profile, Statistics & Badges)...',
      category: 'User',
      run: () => setUserDashboardModalOpen(true),
    },
    {
      id: 'user.signIn',
      title: 'User: Sign In to Compillo Cloud (Google & GitHub)...',
      category: 'User',
      run: () => setSignInModalOpen(true),
    },
    {
      id: 'user.signOut',
      title: 'User: Sign Out of Compillo Cloud Services',
      category: 'User',
      run: handleSignOut,
    },
    {
      id: 'workbench.action.showAbout',
      title: 'Help: About Compillo Studio & Other Options...',
      category: 'Help',
      run: () => {
        setAboutModalTab('about');
        setAboutModalOpen(true);
      },
    },
    {
      id: 'workbench.action.showGraphicsGuide',
      title: 'Help: C/C++ Graphics & OpenGL Framebuffer Window Guide...',
      category: 'Help',
      run: () => {
        setAboutModalTab('graphics');
        setAboutModalOpen(true);
      },
    },
    {
      id: 'workbench.action.openArcadeGame',
      title: 'Arcade: Game Break Station (Pastel Star Bloom & Byte Runner)',
      category: 'Arcade',
      run: () => setActiveSideBarView('game'),
    },
    {
      id: 'workbench.action.openMasterPanel',
      title: 'Compillo: Master Control Panel (Configure 60m Engagement & 5m Timers)',
      category: 'Admin',
      run: () => setMasterPanelModalOpen(true),
    },
    {
      id: 'workbench.action.addEngagement15',
      title: 'Compillo Admin: Fast-Forward +15m IDE Coding Engagement',
      category: 'Admin',
      run: () => {
        engagementService.addEngagementMinutes(15);
        showNotification('Fast-forwarded 15 minutes of IDE engagement.', 'info');
      },
    },
    {
      id: 'workbench.action.instantUnlockGame',
      title: 'Compillo Admin: Instant Unlock Arcade Game',
      category: 'Admin',
      run: () => {
        engagementService.updateConfig({ devUnlockOverride: true });
        setActiveSideBarView('game');
        showNotification('Arcade game instantly unlocked.', 'info');
      },
    },
    {
      id: 'workbench.action.exportProjectZip',
      title: 'Export Project (ZIP)',
      category: 'File',
      run: handleExportProjectZip,
    },
    {
      id: 'workbench.action.exportSingleHtml',
      title: 'Export as Single HTML Page (HTML + CSS + JS)...',
      category: 'File',
      run: () => handleExportSingleHtml(),
    },
    {
      id: 'workbench.action.openFreeHosting',
      title: 'Deploy: Host App Online for Free ($0 / Month - Live Link & Guides)...',
      category: 'Deploy',
      run: () => setFreeHostingModalOpen(true),
    },
    {
      id: 'workbench.action.downloadActiveFile',
      title: 'Download Active File...',
      category: 'File',
      run: () => setDownloadModalOpen(true),
    },
    {
      id: 'workbench.action.closeWorkspace',
      title: 'Close Workspace',
      category: 'File',
      run: handleCloseWorkspace,
    },
    {
      id: 'workbench.action.openWorkspace',
      title: 'Open Workspace',
      category: 'File',
      run: handleOpenWorkspace,
    },
    {
      id: 'workbench.action.openRecent',
      title: 'File: Open Recent...',
      category: 'File',
      run: () => {
        setCommandPaletteMode('file');
        setCommandPaletteOpen(true);
      },
    },
    {
      id: 'workbench.action.clearRecentFiles',
      title: 'File: Clear Recently Opened Files',
      category: 'File',
      run: handleClearRecentFiles,
    },
    {
      id: 'workbench.action.importFiles',
      title: 'Import Files or ZIP...',
      category: 'File',
      run: () => setImportModalOpen(true),
    },
    {
      id: 'workbench.action.resetWorkspace',
      title: 'Reset Workspace...',
      category: 'File',
      run: () => setResetModalOpen(true),
    },
    {
      id: 'extensions.createPlugin',
      title: 'Create Custom Extension Plugin...',
      category: 'Extensions',
      run: () => setNewPluginModalOpen(true),
    },
    {
      id: 'productivity.openSnippets',
      title: 'Snippets: Open Code Snippets & Templates Vault...',
      category: 'Productivity',
      run: () => setSnippetsModalOpen(true),
    },
    {
      id: 'productivity.saveCheckpoint',
      title: 'Timeline: Save Checkpoint for Active File',
      category: 'Productivity',
      run: () => {
        if (activeFile) {
          handleCreateCheckpoint(activeFile);
        } else {
          showNotification('Open a file first to save a checkpoint.', 'warning');
        }
      },
    },
    ...pluginManager
      .getAllCatalogCommands()
      .filter((c) => c.id !== 'todo.listAll')
      .map((cmd) => ({
        id: `ext.${cmd.id}`,
        title: cmd.title,
        category: cmd.category || 'Extension',
        shortcut: cmd.shortcut,
        run: () => {
          pluginManager.executeCommand(cmd.id);
        },
      })),
  ];

  if (isBootingEditor) {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col items-center justify-center text-white select-none animate-fadeIn">
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute w-28 h-28 rounded-full border-2 border-indigo-500/30 animate-ping" />
          <div className="absolute w-20 h-20 rounded-full border-2 border-cyan-500/50 animate-spin" />
          <img src="/compillo-logo.png" alt="Compillo" className="h-10 w-auto relative z-10 drop-shadow-[0_0_15px_rgba(99,102,241,0.6)]" />
        </div>
        <h2 className="text-xl font-bold tracking-wider bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-2">
          COMPILLO STUDIO
        </h2>
        <p className="text-xs font-mono text-zinc-400 animate-pulse">{bootText}</p>
        <div className="w-48 h-1 bg-zinc-800 rounded-full mt-6 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400" style={{ width: '85%' }} />
        </div>
      </div>
    );
  }

  if (showLandingPage) {
    return (
      <CompilloLandingPage
        currentTheme={currentTheme}
        onSelectTheme={(themeId) => setSettings((s) => ({ ...s, theme: themeId }))}
        onOpenEditor={(options) => {
          setIsBootingEditor(true);
          setBootText('Mounting Virtual File System & LSP...');
          window.setTimeout(() => {
            setBootText('Compiling WebAssembly Engine...');
          }, 320);
          window.setTimeout(() => {
            setShowLandingPage(false);
            setIsBootingEditor(false);
            if (options?.sideBarView !== undefined) {
              setActiveSideBarView(options.sideBarView);
            }
            if (options?.panelTab) {
              setIsPanelOpen(true);
              setActivePanelView(options.panelTab);
            }
            if (options?.starterTemplate) {
              const { filename, content } = options.starterTemplate;
              window.setTimeout(() => {
                handleCreateFile(null, filename, content);
              }, 60);
            }
            if (options?.openEduLabs) {
              window.setTimeout(() => setEduLabModalOpen(true), 120);
            }
            if (options?.openSignIn) {
              window.setTimeout(() => setSignInModalOpen(true), 120);
            }
            if (options?.startPyCalcDemo) {
              window.setTimeout(() => {
                handleLaunchWorkspaceApp(false);
              }, 150);
            }
          }, 700);
        }}
      />
    );
  }

  return (
    <div
      id="compillo-app-root"
      className="flex flex-col h-screen w-screen select-none overflow-hidden font-sans"
      style={{
        backgroundColor: currentTheme.ui.editorBg,
        color: currentTheme.ui.editorFg,
      }}
    >
      {/* 1. Title Bar */}
      <TitleBar
        currentTheme={currentTheme}
        onSelectTheme={(themeId) => setSettings((s) => ({ ...s, theme: themeId }))}
        activeFileName={activeFile?.name}
        isWorkspaceOpen={isWorkspaceOpen}
        onCloseWorkspace={handleCloseWorkspace}
        onOpenWorkspace={handleOpenWorkspace}
        onOpenFile={handleOpenFileFromDiskTrigger}
        onOpenLocalFile={handleOpenFileFromDiskTrigger}
        onOpenCloudFile={() => setCloudOpenModalOpen(true)}
        onImportProject={() => setImportModalOpen(true)}
        recentFiles={recentFiles}
        onOpenRecentFile={handleOpenRecentFile}
        onClearRecentFiles={handleClearRecentFiles}
        onOpenFilePalette={() => {
          setCommandPaletteMode('file');
          setCommandPaletteOpen(true);
        }}
        onOpenCommandPalette={() => {
          setCommandPaletteMode('command');
          setCommandPaletteOpen(true);
        }}
        onRunCode={handleRunCode}
        onToggleSidebar={() => setActiveSideBarView((prev) => (prev ? null : 'explorer'))}
        onTogglePanel={handleToggleBottomPanel}
        onToggleSideBySidePanel={handleToggleSideBySidePanel}
        isSidebarOpen={Boolean(activeSideBarView)}
        isPanelOpen={isPanelOpen}
        panelPosition={panelPosition}
        onToggleSplit={handleToggleSplit}
        isSplit={isSplit}
        onSaveActiveFile={handleSaveFile}
        onDownloadActiveFile={() => setDownloadModalOpen(true)}
        onFormatDocument={handleFormatDocument}
        onNewFile={() => handleRequestNewFile(null)}
        onNewFolder={() => handleCreateFolder(null, 'new_folder')}
        onResetWorkspace={() => setResetModalOpen(true)}
        onDownloadProject={handleExportProjectZip}
        onExportSingleHtml={() => handleExportSingleHtml()}
        onDownloadStandaloneReplica={handleDownloadStandaloneReplica}
        onToggleMarkdownPreview={() => setIsMarkdownPreviewOpen(!isMarkdownPreviewOpen)}
        isMarkdownActive={Boolean(isMarkdown)}
        isMarkdownPreviewOpen={isMarkdownPreviewOpen}
        onToggleLivePreview={() => setIsLivePreviewOpen(!isLivePreviewOpen)}
        isLivePreviewOpen={isLivePreviewOpen}
        onOpenAiAssistant={() => setActiveSideBarView('ai-assistant')}
        onSelectSideBarView={(view) => setActiveSideBarView(view)}
        onSelectPanelView={(view) => {
          setIsPanelOpen(true);
          setActivePanelView(view);
        }}
        onToggleWordWrap={() =>
          setSettings((s) => ({ ...s, wordWrap: s.wordWrap === 'on' ? 'off' : 'on' }))
        }
        onToggleMinimap={() => setSettings((s) => ({ ...s, minimap: !s.minimap }))}
        onNewTerminal={() => {
          setIsPanelOpen(true);
          setActivePanelView('terminal');
          window.dispatchEvent(new CustomEvent('compillo:new-terminal'));
        }}
        onClearTerminal={() => {
          universalRunner.clearOutput();
        }}
        userEmail={currentUser?.email || 'Guest'}
        currentUser={currentUser}
        onOpenDashboard={() => setUserDashboardModalOpen(true)}
        onOpenSignIn={() => setSignInModalOpen(true)}
        onSignOut={handleSignOut}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenFreeHosting={() => setFreeHostingModalOpen(true)}
        onOpenQuickPushToGitHub={() => setQuickGitHubPushModalOpen(true)}
        onLaunchApp={() => handleLaunchWorkspaceApp(false)}
        isLaunchingApp={isLaunchingApp}
        onSwitchProject={handleLoadStarterProject}
        onBackToLanding={() => setShowLandingPage(true)}
        onShowAbout={(tab) => {
          setAboutModalTab(tab || 'about');
          setAboutModalOpen(true);
        }}
        onShowKeyboardShortcuts={() => {
          setAboutModalTab('shortcuts');
          setAboutModalOpen(true);
        }}
      />

      {/* 2. Main Workbench Area: Activity Bar + Side Bar + Editor (+ Bottom Panel) */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Activity Bar (Vertical icons on left) */}
        <ActivityBar
          currentTheme={currentTheme}
          activeView={activeSideBarView}
          onSelectView={(view) =>
            setActiveSideBarView((prev) => (prev === view ? null : view))
          }
          modifiedCount={modifiedFiles.length}
          pluginsCount={plugins.filter((p) => p.enabled).length}
          onOpenSettings={() => setActiveSideBarView('settings')}
          onOpenThemePicker={() => {
            setCommandPaletteMode('command');
            setCommandPaletteOpen(true);
          }}
          onToggleTerminal={() => {
            setIsPanelOpen(true);
            setActivePanelView('terminal');
          }}
          onOpenEduLabs={() => setEduLabModalOpen(true)}
          currentUser={currentUser}
          onOpenDashboard={() => setUserDashboardModalOpen(true)}
          onOpenSignIn={() => setSignInModalOpen(true)}
          onSignOut={handleSignOut}
        />

        {/* Primary Side Bar */}
        <SideBar
          currentTheme={currentTheme}
          activeView={activeSideBarView}
          isMobile={isMobile}
          onClose={() => setActiveSideBarView(null)}
          files={files}
          activeFileId={activeFileId}
          activeFile={activeFile}
          tabs={tabs}
          plugins={plugins}
          settings={settings}
          modifiedFiles={modifiedFiles}
          isWorkspaceOpen={isWorkspaceOpen}
          onCloseWorkspace={handleCloseWorkspace}
          onOpenWorkspace={handleOpenWorkspace}
          onLoadSampleProject={handleLoadStarterProject}
          recentFiles={recentFiles}
          onRemoveRecentFile={handleRemoveRecentFile}
          onClearRecentFiles={handleClearRecentFiles}
          onOpenFile={handleOpenFile}
          onCloseTab={handleCloseTab}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
          onRenameNode={handleRenameNode}
          onDeleteNode={handleDeleteNode}
          onRefresh={() => setFiles(loadFileSystem())}
          onExport={handleExportProjectZip}
          onImport={handleImportFile}
          onCommit={handleCommitGit}
          onRevertFile={handleRevertFile}
          onOpenDiff={(fileId) => setDiffViewFileId(fileId)}
          onTogglePlugin={(pluginId) => pluginManager.togglePlugin(pluginId)}
          onOpenNewPluginModal={() => setNewPluginModalOpen(true)}
          onDeletePlugin={(pluginId) => pluginManager.unregisterPlugin(pluginId)}
          onRunPluginCommand={(cmdId) => pluginManager.executeCommand(cmdId)}
          onUpdateSettings={(newS) => setSettings((s) => ({ ...s, ...newS }))}
          onResetWorkspace={() => setResetModalOpen(true)}
          onRequestNewFile={(folderId) => handleRequestNewFile(folderId || null)}
          onApplyCode={(code) => handleContentChange(code)}
          onApplyFilePatch={handleApplyFilePatch}
          onApplyAllPatches={handleApplyAllPatches}
          onOpenDiffWithCustomContent={handleOpenDiffWithCustomContent}
          onCreateTestFile={handleCreateTestFile}
          onImportPulledFiles={handleImportPulledFiles}
          onOpenSettings={() => setActiveSideBarView('settings')}
          onSelectView={(v) => setActiveSideBarView(v)}
          onOpenEduModal={() => setEduLabModalOpen(true)}
          onLoadExperiment={handleLoadLabExperiment}
          onOpenQuickPushToGitHub={() => setQuickGitHubPushModalOpen(true)}
          onJumpToLine={handleJumpToLine}
          onReplaceAll={handleReplaceAllInWorkspace}
          revisionVersion={revisionVersion}
          onCreateCheckpoint={handleCreateCheckpoint}
          onCompareRevision={handleCompareRevision}
          onRestoreRevision={handleRestoreRevision}
        />

        {/* Editor Area (+ Bottom Panel) */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
          {/* Top Multi-Tab Bar */}
          <TabBar
            currentTheme={currentTheme}
            tabs={tabs}
            activeFileId={activeFileId}
            onSelectTab={handleOpenFile}
            onCloseTab={handleCloseTab}
            onCloseOtherTabs={handleCloseOtherTabs}
            onCloseAllTabs={handleCloseAllTabs}
            onCloseRightTabs={handleCloseRightTabs}
            onToggleSplit={handleToggleSplit}
            onOpenToSide={handleOpenToSide}
            isSplit={isSplit}
            isZenMode={isZenMode}
            onToggleZenMode={() => {
              const next = !isZenMode;
              setIsZenMode(next);
              if (next) {
                setActiveSideBarView(null);
                setIsPanelOpen(false);
              } else {
                setActiveSideBarView('explorer');
                setIsPanelOpen(true);
              }
            }}
            onRunCode={handleRunCode}
            onFormatDocument={handleFormatDocument}
            isMarkdown={Boolean(isMarkdown)}
            isMarkdownPreviewOpen={isMarkdownPreviewOpen}
            onToggleMarkdownPreview={() => setIsMarkdownPreviewOpen(!isMarkdownPreviewOpen)}
          />

          {/* Breadcrumb Navigation & Quick Extension Actions */}
          <BreadcrumbBar
            filePath={activeFile?.path}
            fileName={activeFile?.name}
            currentTheme={currentTheme}
            onRunCommand={(cmdId) => pluginManager.executeCommand(cmdId)}
            onOpenCommandPalette={() => {
              setCommandPaletteMode('command');
              setCommandPaletteOpen(true);
            }}
          />

          {/* Central Workspace Area: Editor Buffers + Persistent Panel (bottom or side-by-side) */}
          <div
            className={`flex-1 flex min-h-0 min-w-0 relative overflow-hidden ${
              panelPosition === 'right' && !isMobile ? 'flex-row' : 'flex-col'
            }`}
          >
            {/* Central Editor Buffers Area */}
            <div className="flex-1 flex min-h-0 min-w-0 relative overflow-hidden">
              {/* If Custom Diff or Working Tree Diff View is active */}
              {customDiff ? (
                <DiffViewer
                  file={customDiff.file}
                  originalContent={customDiff.oldContent}
                  currentContent={customDiff.newContent}
                  currentTheme={currentTheme}
                  title={customDiff.title || 'AI Staged Patch Review'}
                  onClose={() => setCustomDiff(null)}
                  onRevert={() => setCustomDiff(null)}
                  onApply={() => {
                    handleApplyFilePatch(customDiff.file.path || customDiff.file.name, customDiff.newContent);
                    setCustomDiff(null);
                  }}
                />
              ) : diffViewFileId ? (
                (() => {
                  const diffFile = findFileById(files, diffViewFileId);
                  const baseFile = findFileById(baselineFiles, diffViewFileId);
                  if (!diffFile) return null;
                  return (
                    <DiffViewer
                      file={diffFile}
                      originalContent={baseFile?.content || ''}
                      currentContent={diffFile.content || ''}
                      currentTheme={currentTheme}
                      onClose={() => setDiffViewFileId(null)}
                      onRevert={() => handleRevertFile(diffViewFileId)}
                    />
                  );
                })()
              ) : (
                <>
                  {/* Primary Code Editor */}
                  <div className="flex-1 h-full flex flex-col min-w-0 relative overflow-hidden">
                    <div className="flex-1 min-h-0 relative">
                      <CodeEditor
                        activeFile={activeFile}
                        currentTheme={currentTheme}
                        settings={settings}
                        diagnostics={diagnostics}
                        files={files}
                        isWorkspaceOpen={isWorkspaceOpen}
                        onOpenWorkspace={handleOpenWorkspace}
                        onImport={() => setImportModalOpen(true)}
                        onChangeContent={handleContentChange}
                        onCursorChange={(line, col) => setCursorPos({ line, col })}
                        onSave={handleSaveFile}
                        onNewFile={() => handleRequestNewFile(null)}
                        onOpenCommandPalette={() => {
                          setCommandPaletteMode('command');
                          setCommandPaletteOpen(true);
                        }}
                        onOpenFilePalette={() => {
                          setCommandPaletteMode('file');
                          setCommandPaletteOpen(true);
                        }}
                        onLoadSampleProject={handleLoadStarterProject}
                      />
                    </div>

                    {/* Mobile Virtual Coding Key Accessory Bar */}
                    {isMobile && activeFile && (
                      <MobileCodingBar
                        currentTheme={currentTheme}
                        onFormatDocument={handleFormatDocument}
                        onRunCode={handleRunCode}
                      />
                    )}
                  </div>

                  {/* Independent Split Editor (Right Pane) */}
                  {isSplit && (
                    <div
                      className="flex-1 h-full flex flex-col min-w-0 border-l relative overflow-hidden"
                      style={{ borderColor: currentTheme.ui.tabBorder }}
                    >
                      {/* Secondary Pane Header Bar */}
                      <div
                        className="h-[32px] px-2.5 flex items-center justify-between border-b shrink-0 text-[11px]"
                        style={{
                          backgroundColor: currentTheme.ui.tabBarBg,
                          borderColor: currentTheme.ui.tabBorder,
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[10px] uppercase tracking-wider font-bold opacity-60 shrink-0">
                            Split Pane
                          </span>
                          <select
                            value={secondaryFileId || ''}
                            onChange={(e) => setSecondaryFileId(e.target.value || null)}
                            className={`px-2 py-0.5 rounded border text-[11px] font-mono outline-none max-w-[220px] truncate ${
                              currentTheme.type === 'light'
                                ? 'bg-white border-gray-300 text-gray-900'
                                : 'bg-black/30 border-white/15 text-white'
                            }`}
                          >
                            {getAllFiles(files).map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.path}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              const prevActive = activeFileId;
                              setActiveFileId(secondaryFileId);
                              setSecondaryFileId(prevActive);
                            }}
                            title="Swap Left & Right Editor Panes"
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                          >
                            <ArrowLeftRight size={12} />
                          </button>
                          <button
                            onClick={() => setIsSplit(false)}
                            title="Close Split View"
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                          >
                            <CloseIcon size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 min-h-0 relative">
                        <CodeEditor
                          activeFile={secondaryFile}
                          currentTheme={currentTheme}
                          settings={settings}
                          diagnostics={diagnostics}
                          files={files}
                          isWorkspaceOpen={isWorkspaceOpen}
                          onOpenWorkspace={handleOpenWorkspace}
                          onImport={() => setImportModalOpen(true)}
                          onChangeContent={handleSecondaryContentChange}
                          onCursorChange={(line, col) => setCursorPos({ line, col })}
                          onSave={handleSaveFile}
                          onNewFile={() => handleRequestNewFile(null)}
                          onOpenCommandPalette={() => {
                            setCommandPaletteMode('command');
                            setCommandPaletteOpen(true);
                          }}
                          onOpenFilePalette={() => {
                            setCommandPaletteMode('file');
                            setCommandPaletteOpen(true);
                          }}
                          registerAsPrimary={false}
                        />
                      </div>
                    </div>
                  )}

                  {/* Markdown Preview Side-Pane (if open & active file is markdown) */}
                  {isMarkdownPreviewOpen && isMarkdown && activeFile && (
                    <MarkdownPreview
                      content={activeFile.content || ''}
                      fileName={activeFile.name}
                      currentTheme={currentTheme}
                      onClose={() => setIsMarkdownPreviewOpen(false)}
                    />
                  )}

                  {/* Interactive Live Canvas Preview Side-Pane (full overlay on mobile, split pane on desktop) */}
                  {isLivePreviewOpen && (
                    <div
                      className={
                        isMobile
                          ? 'absolute inset-0 z-30 flex flex-col bg-[#0b0f17]'
                          : 'flex-1 h-full flex min-w-0 border-l border-[#1e293b] relative'
                      }
                    >
                      <LivePreviewPane
                        activeFile={activeFile}
                        files={files}
                        currentTheme={currentTheme}
                        previewUrl={livePreviewUrl}
                        refreshToken={previewRefreshToken}
                        onRestartServer={() => handleLaunchWorkspaceApp(true)}
                        onClearPreviewUrl={() => setLivePreviewUrl(null)}
                        onClose={() => {
                          setIsLivePreviewOpen(false);
                          setLivePreviewUrl(null);
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Single Persistent Panel (toggles bottom vs side-by-side without unmounting terminal/state) */}
            <BottomPanel
              currentTheme={currentTheme}
              isOpen={isPanelOpen}
              position={panelPosition}
              onTogglePosition={() =>
                updatePanelPosition(panelPosition === 'right' ? 'bottom' : 'right')
              }
              activeTab={activePanelView}
              onSelectTab={setActivePanelView}
              onClose={() => setIsPanelOpen(false)}
              diagnostics={diagnostics}
              outputLogs={outputLogs}
              onClearOutput={(ch) => pluginManager.clearOutputLogs(ch)}
              onJumpToDiagnostic={(fId, line, col) => handleJumpToLine(fId, line, col)}
              files={files}
              onRunCode={handleRunCode}
              onSelectTheme={(th) => setSettings((s) => ({ ...s, theme: th }))}
              onCommitGit={handleCommitGit}
              modifiedCount={modifiedFiles.length}
              onOpenLivePreview={(url?: string) => {
                setLivePreviewUrl(typeof url === 'string' ? url : null);
                setIsLivePreviewOpen(true);
              }}
              activeFile={findFileById(files, activeFileId || '')}
              onRunPython={handleRunPython}
              onUpdateFileContent={(_path, newContent) => handleContentChange(newContent)}
              onSyncShellFiles={handleSyncShellFiles}
            />
          </div>
        </div>
      </div>

      {/* 3. Bottom Status Bar */}
      <StatusBar
        currentTheme={currentTheme}
        cursorLine={cursorPos.line}
        cursorCol={cursorPos.col}
        errorCount={diagnostics.filter((d) => d.severity === 'error').length}
        warningCount={diagnostics.filter((d) => d.severity === 'warning').length}
        language={activeFile?.language || 'plaintext'}
        tabSize={settings.tabSize}
        pluginItems={statusBarItems}
        onToggleProblems={() => {
          setIsPanelOpen(true);
          setActivePanelView('problems');
        }}
        onRunPluginCommand={(cmdId) => pluginManager.executeCommand(cmdId)}
        onSelectLanguage={(lang) => {
          if (!activeFileId) return;
          const updated = files.map((f) =>
            f.id === activeFileId ? { ...f, language: lang } : f
          );
          setFiles(updated);
        }}
        onOpenSnippets={() => setSnippetsModalOpen(true)}
        onSprintComplete={(mode) =>
          showNotification(
            mode === 'focus'
              ? 'Focus sprint complete! Take a short break.'
              : 'Break finished! Ready for your next focus sprint.',
            'info'
          )
        }
        onOpenNotifications={() => {
          setIsPanelOpen(true);
          setActivePanelView('output');
        }}
      />

      {/* 4. Mobile Bottom Navigation Bar (Phone & Tablet) */}
      {isMobile && (
        <MobileNavBar
          currentTheme={currentTheme}
          isSidebarOpen={Boolean(activeSideBarView)}
          activeSideBarView={activeSideBarView}
          onToggleSidebar={() =>
            setActiveSideBarView((prev) => (prev ? null : 'explorer'))
          }
          onSelectSideBarView={(view) => setActiveSideBarView(view)}
          isPanelOpen={isPanelOpen}
          onTogglePanel={() => setIsPanelOpen((prev) => !prev)}
          onRunCode={handleRunCode}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
          isMenuOpen={isMobileMenuOpen}
        />
      )}

      {/* 5. Modals & Overlays */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        initialMode={commandPaletteMode}
        onClose={() => setCommandPaletteOpen(false)}
        files={files}
        onOpenFile={handleOpenFile}
        commands={availableCommands}
        currentTheme={currentTheme}
      />

      <MobileMenuDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentTheme={currentTheme}
        onSelectTheme={(th) => setSettings((s) => ({ ...s, theme: th }))}
        onNewFile={() => {
          setNewFileFolderId(null);
          setNewFileModalOpen(true);
        }}
        onNewFolder={() => {
          const name = prompt('Enter new folder name:');
          if (name) handleCreateFolder(null, name);
        }}
        onOpenFile={handleOpenFileFromDiskTrigger}
        onOpenLocalFile={handleOpenFileFromDiskTrigger}
        onOpenCloudFile={() => setCloudOpenModalOpen(true)}
        onSaveFile={handleSaveFile}
        onFormatDocument={handleFormatDocument}
        onDownloadProject={handleExportProjectZip}
        onDownloadActiveFile={activeFile ? () => setDownloadModalOpen(true) : undefined}
        onImport={() => setImportModalOpen(true)}
        onResetWorkspace={() => setResetModalOpen(true)}
        onSelectSideBarView={(view) => {
          setActiveSideBarView(view);
        }}
        onTogglePanel={() => setIsPanelOpen(!isPanelOpen)}
        onToggleLivePreview={() => setIsLivePreviewOpen(!isLivePreviewOpen)}
        onOpenAiAssistant={() => setActiveSideBarView('ai-assistant')}
        recentFiles={recentFiles}
        onOpenRecentFile={handleOpenFile}
        onClearRecentFiles={handleClearRecentFiles}
        userEmail={currentUser?.email || 'Guest'}
        currentUser={currentUser}
        onOpenDashboard={() => setUserDashboardModalOpen(true)}
        onOpenSignIn={() => setSignInModalOpen(true)}
        onSignOut={handleSignOut}
        activeFileName={activeFile?.name}
      />

      <SignInModal
        isOpen={signInModalOpen}
        onClose={() => setSignInModalOpen(false)}
        currentTheme={currentTheme}
        onSuccess={(u) => {
          showNotification(`Welcome, ${u.name}! Signed in successfully.`, 'info');
        }}
      />

      <UserDashboardModal
        isOpen={userDashboardModalOpen}
        onClose={() => setUserDashboardModalOpen(false)}
        currentTheme={currentTheme}
        files={files}
        onOpenEduLabs={() => setEduLabModalOpen(true)}
        onOpenSignIn={() => setSignInModalOpen(true)}
        onSignOut={handleSignOut}
      />

      <NewPluginModal
        isOpen={newPluginModalOpen}
        onClose={() => setNewPluginModalOpen(false)}
        onInstallPlugin={(plugin) => {
          pluginManager.registerPlugin(plugin);
          showNotification(`Installed plugin "${plugin.displayName}"`, 'info');
        }}
        currentTheme={currentTheme}
      />

      <NewFileModal
        isOpen={newFileModalOpen}
        onClose={() => setNewFileModalOpen(false)}
        onCreateFile={handleCreateFile}
        currentTheme={currentTheme}
        files={files}
        initialFolderId={newFileFolderId}
      />

      <EduLabModal
        isOpen={eduLabModalOpen}
        onClose={() => setEduLabModalOpen(false)}
        onLoadExperiment={handleLoadLabExperiment}
        currentTheme={currentTheme}
        files={files}
      />

      <DownloadFileModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        activeFile={activeFile}
        currentTheme={currentTheme}
        onDownload={handleDownloadActiveFile}
        onDownloadSingleHtml={(name) => handleExportSingleHtml(name)}
        onDownloadStandaloneReplica={handleDownloadStandaloneReplica}
      />

      <ResetWorkspaceModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        currentTheme={currentTheme}
        onResetToStarter={handleResetToStarter}
        onResetToEmpty={handleResetToEmpty}
      />

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        currentTheme={currentTheme}
        onImportFiles={handleImportFiles}
        onImportZip={handleImportZip}
      />

      <CloudOpenModal
        isOpen={cloudOpenModalOpen}
        onClose={() => setCloudOpenModalOpen(false)}
        currentTheme={currentTheme}
        onOpenLocalFile={handleOpenFileFromDiskTrigger}
        onOpenSettings={() => {
          setActiveSideBarView('settings');
        }}
        onPullFromGitHub={() => {
          setActiveSideBarView('git');
        }}
      />

      <MasterPanelModal
        isOpen={masterPanelModalOpen}
        onClose={() => setMasterPanelModalOpen(false)}
        currentTheme={currentTheme}
        onOpenGame={() => setActiveSideBarView('game')}
      />

      <FreeHostingModal
        isOpen={freeHostingModalOpen}
        onClose={() => setFreeHostingModalOpen(false)}
        currentTheme={currentTheme}
        onExportZip={handleExportProjectZip}
        files={files}
      />

      <AboutCompilloModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
        currentTheme={currentTheme}
        initialTab={aboutModalTab}
        onOpenKeyboardShortcuts={() => {
          setAboutModalTab('shortcuts');
          setAboutModalOpen(true);
        }}
        onOpenEduLabs={() => setEduLabModalOpen(true)}
        onOpenFreeHosting={() => setFreeHostingModalOpen(true)}
        onResetWorkspace={() => setResetModalOpen(true)}
      />

      <QuickGitHubPushModal
        isOpen={quickGitHubPushModalOpen}
        onClose={() => setQuickGitHubPushModalOpen(false)}
        currentTheme={currentTheme}
        files={files}
        modifiedFiles={modifiedFiles}
        onCommitLocal={handleCommitGit}
      />

      <SnippetsModal
        isOpen={snippetsModalOpen}
        onClose={() => setSnippetsModalOpen(false)}
        currentTheme={currentTheme}
        activeLanguage={activeFile?.language}
        hasActiveFile={Boolean(activeFile)}
        onInsertSnippet={handleInsertSnippet}
      />

      <AppearanceCustomizerModal
        isOpen={customizerModalOpen}
        initialTab={customizerModalTab}
        onTabChange={setCustomizerModalTab}
        onClose={() => setCustomizerModalOpen(false)}
        currentTheme={currentTheme}
      />

      {/* Hidden file input for "Open File..." */}
      <input
        ref={openFileInputRef}
        type="file"
        className="hidden"
        onChange={handleDirectFileOpen}
      />

      {/* 5. Floating Compillo Toast Notifications */}
      <div className="fixed bottom-16 md:bottom-8 right-4 z-50 flex flex-col space-y-2 max-w-sm">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`flex items-center justify-between p-3 rounded shadow-2xl text-[12px] border backdrop-blur-sm transition-all transform animate-in slide-in-from-bottom-2 ${
              n.type === 'error'
                ? 'bg-red-950/90 text-red-200 border-red-500/40'
                : n.type === 'warning'
                ? 'bg-amber-950/90 text-amber-200 border-amber-500/40'
                : 'bg-[#252526]/95 text-[#cccccc] border-[#3c3c3c]'
            }`}
          >
            <span className="truncate mr-2">{n.message}</span>
            <button
              onClick={() => setNotifications((prev) => prev.filter((item) => item.id !== n.id))}
              className="text-[#888888] hover:text-white"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
