import React, { useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Terminal as TerminalIcon,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Maximize2,
  Minimize2,
  FileCode,
  CheckCircle2,
  Search,
  Lock,
  Unlock,
  MoreHorizontal,
  ArrowDownToLine,
  Plus,
  Globe,
  ExternalLink,
  Copy,
  Check,
  RotateCw,
  Eye,
  Radio,
  Network,
  PanelBottom,
  PanelRight,
  Play,
  Sparkles,
  Palette,
  Square,
} from 'lucide-react';
import { ActivePanelView, DiagnosticItem, FileNode, ForwardedPort, OutputMessage } from '../../types';
import { VSCodeThemeDefinition } from '../../services/themes';
import { FileIcon } from '../Common/FileIcon';
import { getAllFiles } from '../../services/fileSystem';
import { PythonInteractiveView } from './PythonInteractiveView';
import { CodeRunnerView } from './CodeRunnerView';
import { pythonRunner } from '../../services/pythonRunner';
import { UniversalRunnerState, universalRunner } from '../../services/universalRunner';
import { GraphicsWindow } from './GraphicsWindow';

interface BottomPanelProps {
  currentTheme: VSCodeThemeDefinition;
  isOpen: boolean;
  position?: 'bottom' | 'right';
  onTogglePosition?: () => void;
  activeTab: ActivePanelView;
  onSelectTab: (tab: ActivePanelView) => void;
  onClose: () => void;
  diagnostics: DiagnosticItem[];
  outputLogs: OutputMessage[];
  onClearOutput: (channel?: string) => void;
  onJumpToDiagnostic: (fileId: string, line: number, col: number) => void;
  files: FileNode[];
  onRunCode: () => void;
  onSelectTheme: (themeId: string) => void;
  onCommitGit: (msg: string) => void;
  modifiedCount: number;
  onOpenLivePreview?: (url?: string) => void;
  activeFile?: FileNode | null;
  onRunPython?: () => void;
  onUpdateFileContent?: (path: string, newContent: string) => void;
  onSyncShellFiles?: (syncedFiles: Array<{ path: string; name: string; content: string }>) => void;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  currentTheme,
  isOpen,
  position = 'bottom',
  onTogglePosition,
  activeTab,
  onSelectTab,
  onClose,
  diagnostics,
  outputLogs,
  onClearOutput,
  onJumpToDiagnostic,
  files,
  onRunCode,
  onSelectTheme,
  onCommitGit,
  modifiedCount,
  onOpenLivePreview,
  activeFile,
  onRunPython,
  onUpdateFileContent,
  onSyncShellFiles,
}) => {
  const [height, setHeight] = useState(240);
  const [width, setWidth] = useState(520);
  const [isMaximized, setIsMaximized] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string>('Tasks');
  const [outputFilter, setOutputFilter] = useState('');
  const [isTailActive, setIsTailActive] = useState(true);
  const [isOutputLocked, setIsOutputLocked] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [isWordWrap, setIsWordWrap] = useState(true);
  const [copiedPortId, setCopiedPortId] = useState<string | null>(null);
  const [runnerState, setRunnerState] = useState<UniversalRunnerState>(() => universalRunner.getState());
  const [isPythonRunning, setIsPythonRunning] = useState(
    pythonRunner.getState().isRunning || universalRunner.getState().isRunning
  );
  const isDraggingRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub1 = pythonRunner.subscribe((st) => {
      setIsPythonRunning(st.isRunning || universalRunner.getState().isRunning);
    });
    const unsub2 = universalRunner.subscribe((st) => {
      setRunnerState(st);
      setIsPythonRunning(st.isRunning || pythonRunner.getState().isRunning);
    });
    const onOpenTasks = () => setSelectedChannel('Tasks');
    const onServerStarted = (e: Event) => {
      const detail = (e as CustomEvent<{ url?: string; port?: number; label?: string }>).detail;
      const portNum = Number(detail?.port);
      if (!Number.isInteger(portNum) || portNum <= 0) return;
      const proxyUrl = detail?.url || `/api/ports/proxy/${portNum}/`;
      setForwardedPorts((prev) => {
        const exists = prev.some((p) => p.port === portNum);
        if (exists) {
          return prev.map((p) =>
            p.port === portNum
              ? {
                  ...p,
                  status: 'listening',
                  proxyUrl,
                  runningProcess: detail?.label || p.runningProcess,
                }
              : p
          );
        }
        return [
          ...prev,
          {
            id: `port-${portNum}-${Date.now()}`,
            port: portNum,
            localAddress: `http://localhost:${portNum}`,
            proxyUrl,
            runningProcess: detail?.label || `server-${portNum}`,
            privacy: 'Public',
            origin: 'Auto',
            status: 'listening',
          },
        ];
      });
    };
    window.addEventListener('compillo:open-output-tasks', onOpenTasks);
    window.addEventListener('compillo:open-live-preview', onServerStarted);
    return () => {
      unsub1();
      unsub2();
      window.removeEventListener('compillo:open-output-tasks', onOpenTasks);
      window.removeEventListener('compillo:open-live-preview', onServerStarted);
    };
  }, []);

  const handleRunGraphicsSample = (sampleType: 'koch' | 'mandelbrot' | 'opengl' | 'pixel_grid') => {
    let sampleFile: FileNode;
    if (sampleType === 'pixel_grid') {
      sampleFile = {
        id: 'sample-pixel-grid',
        name: 'pixel_grid.c',
        path: '/pixel_grid.c',
        type: 'file',
        language: 'c',
        content: `#include <graphics.h>
#include <stdio.h>

int main() {
    initwindow(640, 400, "2. Pixel Plotting");

    // Plot individual points
    putpixel(320, 200, WHITE);
    
    // Plot a grid of points
    for(int x = 100; x <= 500; x += 20) {
        for(int y = 100; y <= 300; y += 20) {
            putpixel(x, y, YELLOW);
        }
    }

    outtextxy(200, 50, "Pixel Grid Plotted Using putpixel()");
    printf("Pixel plotting completed.\\n");
    return 0;
}
`,
      };
    } else if (sampleType === 'koch') {
      sampleFile = {
        id: 'sample-koch',
        name: 'koch_curve.cpp',
        path: '/koch_curve.cpp',
        type: 'file',
        language: 'cpp',
        content: `#include <graphics.h>
#include <conio.h>
#include <math.h>

// Recursive function to draw the Koch Curve
void drawKochCurve(int x1, int y1, int x5, int y5, int iteration) {
    if (iteration == 0) {
        // Base case: Draw a straight line
        line(x1, y1, x5, y5);
    } else {
        // Calculate intermediate points
        int x2 = x1 + (x5 - x1) / 3;
        int y2 = y1 + (y5 - y1) / 3;

        int x4 = x1 + 2 * (x5 - x1) / 3;
        int y4 = y1 + 2 * (y5 - y1) / 3;

        // Peak of the equilateral triangle (60 degrees rotation)
        double angle = 60 * M_PI / 180;
        int x3 = x2 + (x4 - x2) * cos(angle) + (y4 - y2) * sin(angle);
        int y3 = y2 - (x4 - x2) * sin(angle) + (y4 - y2) * cos(angle);

        // Recursively draw the 4 sub-segments
        drawKochCurve(x1, y1, x2, y2, iteration - 1);
        drawKochCurve(x2, y2, x3, y3, iteration - 1);
        drawKochCurve(x3, y3, x4, y4, iteration - 1);
        drawKochCurve(x4, y4, x5, y5, iteration - 1);
    }
}

int main() {
    int gd = DETECT, gm;
    initgraph(&gd, &gm, "Koch Curve Fractal");

    int x1 = 100, y1 = 350;
    int x5 = 500, y5 = 350;
    int iterations = 4; // Higher numbers increase complexity

    outtextxy(20, 20, "Koch Curve Fractal (graphics.h)");
    drawKochCurve(x1, y1, x5, y5, iterations);

    getch();
    closegraph();
    return 0;
}
`,
      };
    } else if (sampleType === 'mandelbrot') {
      sampleFile = {
        id: 'sample-mandelbrot',
        name: 'mandelbrot.c',
        path: '/mandelbrot.c',
        type: 'file',
        language: 'c',
        content: `#include <stdio.h>

#define WIDTH 800
#define HEIGHT 600
#define MAX_ITER 1000

int main() {
    FILE *fp = fopen("mandelbrot.ppm", "w");
    if (!fp) {
        printf("Error opening file.\\n");
        return 1;
    }

    // Write PPM header: P3 format, width, height, max color value
    fprintf(fp, "P3\\n%d %d\\n255\\n", WIDTH, HEIGHT);

    for (int y = 0; y < HEIGHT; y++) {
        for (int x = 0; x < WIDTH; x++) {
            // Map pixel coordinates to the complex plane
            double c_re = (x - WIDTH / 2.0) * 4.0 / WIDTH;
            double c_im = (y - HEIGHT / 2.0) * 4.0 / HEIGHT;
            
            double z_re = 0, z_im = 0;
            int iter = 0;

            // Iterate z = z^2 + c
            while (z_re * z_re + z_im * z_im <= 4.0 && iter < MAX_ITER) {
                double z_re_new = z_re * z_re - z_im * z_im + c_re;
                z_im = 2.0 * z_re * z_im + c_im;
                z_re = z_re_new;
                iter++;
            }

            // Assign color based on number of iterations
            if (iter < MAX_ITER) {
                // Interior escape coloring (smooth gradient)
                int r = (iter * 9) % 256;
                int g = (iter * 15) % 256;
                int b = (iter * 25) % 256;
                fprintf(fp, "%d %d %d ", r, g, b);
            } else {
                // Inside the Mandelbrot set (black)
                fprintf(fp, "0 0 0 ");
            }
        }
        fprintf(fp, "\\n");
    }

    fclose(fp);
    printf("Mandelbrot fractal saved as mandelbrot.ppm\\n");
    return 0;
}
`,
      };
    } else {
      sampleFile = {
        id: 'sample-opengl',
        name: 'teapot.cpp',
        path: '/teapot.cpp',
        type: 'file',
        language: 'cpp',
        content: `#include <GL/glut.h>

void display() {
    glClear(GL_COLOR_BUFFER_BIT);
    glColor3f(0.0, 0.9, 0.7);
    glutSolidTeapot(0.5);
    glFlush();
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitWindowSize(640, 480);
    glutCreateWindow("OpenGL 3D Teapot");
    glutDisplayFunc(display);
    glutMainLoop();
    return 0;
}
`,
      };
    }
    universalRunner.runFile(sampleFile, files);
    onSelectTab('output');
  };

  const getProxyUrl = (portNum: number) =>
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/ports/proxy/${portNum}/`
      : `/api/ports/proxy/${portNum}/`;

  // Forwarded Ports state (backed by real /api/ports/scan, /api/ports/probe, and /api/ports/proxy/:port)
  const [forwardedPorts, setForwardedPorts] = useState<ForwardedPort[]>(() => {
    try {
      const saved = localStorage.getItem('compillo_forwarded_ports_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'port-3000',
        port: 3000,
        localAddress: 'http://localhost:3000',
        proxyUrl: typeof window !== 'undefined' ? `${window.location.origin}/` : '/',
        runningProcess: 'compillo-dev-server',
        privacy: 'Public',
        origin: 'Auto',
        status: 'listening',
      },
    ];
  });
  const [portsFilter, setPortsFilter] = useState('');
  const [isAddingPort, setIsAddingPort] = useState(false);
  const [isScanningPorts, setIsScanningPorts] = useState(false);
  const [newPortNumber, setNewPortNumber] = useState('8000');
  const [newPortProcess, setNewPortProcess] = useState('web-server');
  const [newPortPrivacy, setNewPortPrivacy] = useState<'Public' | 'Private'>('Public');

  useEffect(() => {
    try {
      localStorage.setItem('compillo_forwarded_ports_v1', JSON.stringify(forwardedPorts));
    } catch {
      // ignore
    }
  }, [forwardedPorts]);

  // Multi-tab Terminal state
  interface TerminalTabSession {
    id: string;
    title: string;
    history: Array<{ text: string; type?: 'cmd' | 'output' | 'error' | 'success' }>;
    input: string;
    sessionId: string;
    cwd: string;
    isRunning: boolean;
    cmdHistory: string[];
    historyIndex: number;
  }

  const createNewTerminalSession = (indexNum: number): TerminalTabSession => ({
    id: `term-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: `Terminal ${indexNum}`,
    history: [
      { text: 'Compillo Studio Workspace Shell [Connected to Linux Runtime]', type: 'output' },
      { text: 'Your Explorer files sync automatically. Run "serve 8000" (or "python3 your_file.py &") to start & get a localhost port/URL, or type "help".', type: 'output' },
    ],
    input: '',
    sessionId: `sh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    cwd: '',
    isRunning: false,
    cmdHistory: [],
    historyIndex: -1,
  });

  const [terminalTabs, setTerminalTabs] = useState<TerminalTabSession[]>(() => [
    {
      id: 'term-initial',
      title: 'Terminal 1',
      history: [
        { text: 'Compillo Studio Workspace Shell [Connected to Linux Runtime]', type: 'output' },
        { text: 'Your Explorer files sync automatically. Run "serve 8000" (or "python3 your_file.py &") to start & get a localhost port/URL, or type "help".', type: 'output' },
      ],
      input: '',
      sessionId: `sh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      cwd: '',
      isRunning: false,
      cmdHistory: [],
      historyIndex: -1,
    },
  ]);
  const [activeTerminalTabId, setActiveTerminalTabId] = useState<string>('term-initial');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const activeTerm =
    terminalTabs.find((t) => t.id === activeTerminalTabId) || terminalTabs[0];

  const updateTermById = (
    tabId: string,
    updater: (prev: TerminalTabSession) => TerminalTabSession
  ) => {
    setTerminalTabs((prev) => prev.map((t) => (t.id === tabId ? updater(t) : t)));
  };

  const terminalHistory = activeTerm.history;
  const terminalInput = activeTerm.input;
  const shellSessionId = activeTerm.sessionId;
  const shellCwd = activeTerm.cwd;
  const isShellRunning = activeTerm.isRunning;
  const cmdHistory = activeTerm.cmdHistory;
  const historyIndex = activeTerm.historyIndex;

  const setTerminalHistory = (
    valOrFn:
      | Array<{ text: string; type?: 'cmd' | 'output' | 'error' | 'success' }>
      | ((
          prev: Array<{ text: string; type?: 'cmd' | 'output' | 'error' | 'success' }>
        ) => Array<{ text: string; type?: 'cmd' | 'output' | 'error' | 'success' }>),
    targetId = activeTerm.id
  ) => {
    updateTermById(targetId, (t) => ({
      ...t,
      history: typeof valOrFn === 'function' ? valOrFn(t.history) : valOrFn,
    }));
  };

  const setTerminalInput = (val: string, targetId = activeTerm.id) => {
    updateTermById(targetId, (t) => ({ ...t, input: val }));
  };

  const setShellSessionId = (val: string, targetId = activeTerm.id) => {
    updateTermById(targetId, (t) => ({ ...t, sessionId: val }));
  };

  const setShellCwd = (val: string, targetId = activeTerm.id) => {
    updateTermById(targetId, (t) => ({ ...t, cwd: val }));
  };

  const setIsShellRunning = (val: boolean, targetId = activeTerm.id) => {
    updateTermById(targetId, (t) => ({ ...t, isRunning: val }));
  };

  const setCmdHistory = (
    valOrFn: string[] | ((prev: string[]) => string[]),
    targetId = activeTerm.id
  ) => {
    updateTermById(targetId, (t) => ({
      ...t,
      cmdHistory: typeof valOrFn === 'function' ? valOrFn(t.cmdHistory) : valOrFn,
    }));
  };

  const setHistoryIndex = (val: number, targetId = activeTerm.id) => {
    updateTermById(targetId, (t) => ({ ...t, historyIndex: val }));
  };

  const handleAddTerminalTab = () => {
    const newId = `term-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setTerminalTabs((prev) => {
      const nextNum = prev.length + 1;
      const newTab = {
        ...createNewTerminalSession(nextNum),
        id: newId,
      };
      return [...prev, newTab];
    });
    setActiveTerminalTabId(newId);
    onSelectTab('terminal');
  };

  const handleCloseTerminalTab = (tabId: string) => {
    if (terminalTabs.length <= 1) return;
    setTerminalTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== tabId);
      if (activeTerminalTabId === tabId && filtered.length > 0) {
        setActiveTerminalTabId(filtered[filtered.length - 1].id);
      }
      return filtered;
    });
  };

  useEffect(() => {
    const onNewTerminal = () => {
      const newId = `term-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setTerminalTabs((prev) => {
        const nextNum = prev.length + 1;
        const newTab = {
          ...createNewTerminalSession(nextNum),
          id: newId,
        };
        return [...prev, newTab];
      });
      setActiveTerminalTabId(newId);
      onSelectTab('terminal');
    };
    window.addEventListener('compillo:new-terminal', onNewTerminal);
    return () => window.removeEventListener('compillo:new-terminal', onNewTerminal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debug Console state
  const [debugLogs, setDebugLogs] = useState<
    Array<{ expr: string; result: string; isError?: boolean }>
  >([
    { expr: 'Math.PI * 2', result: String(Math.PI * 2) },
  ]);
  const [debugInput, setDebugInput] = useState('');

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    e.preventDefault();
  };

  const handleTouchStart = () => {
    isDraggingRef.current = true;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const parent = panelRef.current?.parentElement;
      if (position === 'right') {
        const parentRight = parent ? parent.getBoundingClientRect().right : window.innerWidth;
        const parentWidth = parent ? parent.clientWidth : window.innerWidth;
        const maxWidth = Math.max(300, parentWidth - 220);
        const newWidth = Math.max(300, Math.min(maxWidth, parentRight - e.clientX));
        setWidth(newWidth);
      } else {
        const parentBottom = parent ? parent.getBoundingClientRect().bottom : window.innerHeight - 22;
        const parentHeight = parent ? parent.clientHeight : window.innerHeight - 80;
        const maxHeight = Math.max(140, parentHeight - 80);
        const newHeight = Math.max(140, Math.min(maxHeight, parentBottom - e.clientY));
        setHeight(newHeight);
      }
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || !e.touches[0]) return;
      const touch = e.touches[0];
      const parent = panelRef.current?.parentElement;
      const parentBottom = parent ? parent.getBoundingClientRect().bottom : window.innerHeight - 22;
      const parentHeight = parent ? parent.clientHeight : window.innerHeight - 80;
      const maxHeight = Math.max(120, parentHeight - 80);
      const newHeight = Math.max(120, Math.min(maxHeight, parentBottom - touch.clientY));
      setHeight(newHeight);
    };
    const handleTouchEnd = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [position]);

  // Close more menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Press Escape to restore maximized panel size
  useEffect(() => {
    if (!isMaximized) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMaximized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized]);

  // Auto-scroll on new terminal line
  useEffect(() => {
    if (activeTab === 'terminal') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalHistory, activeTab]);

  // Auto-scroll output if tail active and not locked
  useEffect(() => {
    if (activeTab === 'output' && isTailActive && !isOutputLocked) {
      outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [outputLogs, activeTab, isTailActive, isOutputLocked]);

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  const channels = [
    'Graphics Output',
    'Tasks',
    'Compillo Runtime',
    'Code Runner',
    'Prettier',
    'ESLint',
    'Git',
    'Extension Host',
    'All',
  ];

  // Channel logs mapping including real-time runnerState messages
  const channelLogs: OutputMessage[] = React.useMemo(() => {
    if (selectedChannel === 'Graphics Output') {
      const graphicsRunnerLogs: OutputMessage[] = runnerState.output.map((item) => ({
        id: item.id,
        timestamp: item.timestamp,
        channel: 'Graphics Output',
        text: item.text,
        type: (item.type === 'stderr' || item.type === 'error'
          ? 'error'
          : item.type === 'success'
          ? 'success'
          : item.type === 'system'
          ? 'info'
          : 'log') as OutputMessage['type'],
      }));
      const explicit = outputLogs.filter((log) => log.channel === 'Graphics Output');
      return [...explicit, ...graphicsRunnerLogs];
    }
    if (selectedChannel === 'Code Runner') {
      const runnerLogs: OutputMessage[] = runnerState.output.map((item) => ({
        id: item.id,
        timestamp: item.timestamp,
        channel: 'Code Runner',
        text: item.text,
        type: (item.type === 'stderr' || item.type === 'error'
          ? 'error'
          : item.type === 'success'
          ? 'success'
          : item.type === 'system'
          ? 'info'
          : 'log') as OutputMessage['type'],
      }));
      const explicit = outputLogs.filter((log) => log.channel === 'Code Runner');
      return [...explicit, ...runnerLogs];
    }
    return outputLogs.filter((log) => selectedChannel === 'All' || log.channel === selectedChannel);
  }, [outputLogs, selectedChannel, runnerState.output]);

  // Output logs filtering with positive match and negative exclusion (!text)
  const filteredLogs = channelLogs
    .filter((log) => {
      const q = outputFilter.trim().toLowerCase();
      if (!q) return true;
      if (q.startsWith('!')) {
        const exclude = q.slice(1).trim();
        if (!exclude) return true;
        return (
          !log.text.toLowerCase().includes(exclude) &&
          !log.channel.toLowerCase().includes(exclude)
        );
      }
      return (
        log.text.toLowerCase().includes(q) ||
        log.channel.toLowerCase().includes(q)
      );
    });

  // Filtered ports
  const filteredPorts = forwardedPorts.filter((p) => {
    const q = portsFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      String(p.port).includes(q) ||
      p.runningProcess.toLowerCase().includes(q) ||
      p.privacy.toLowerCase().includes(q)
    );
  });

  const scanContainerPorts = async (currentPorts?: ForwardedPort[]) => {
    const baseList = currentPorts || forwardedPorts;
    setIsScanningPorts(true);
    try {
      const portNums = baseList.map((p) => p.port).join(',');
      const res = await fetch(`/api/ports/scan?ports=${encodeURIComponent(portNums)}`);
      const data = await res.json();
      const listeningSet = new Set<number>(
        Array.isArray(data.listeningPorts) ? data.listeningPorts.map((item: any) => item.port) : []
      );
      const probedMap: Record<number, boolean> = data.probed || {};
      const newlyDiscovered: ForwardedPort[] = [];

      const updated: ForwardedPort[] = baseList.map((p) => {
        const isUp = listeningSet.has(p.port) || !!probedMap[p.port];
        return {
          ...p,
          proxyUrl: p.port === 3000 ? `${window.location.origin}/` : getProxyUrl(p.port),
          status: isUp ? 'listening' : 'inactive',
        };
      });

      for (const portNum of listeningSet) {
        if (!updated.some((p) => p.port === portNum)) {
          const discovered: ForwardedPort = {
            id: `port-${portNum}-${Date.now()}`,
            port: portNum,
            localAddress: `http://localhost:${portNum}`,
            proxyUrl: portNum === 3000 ? `${window.location.origin}/` : getProxyUrl(portNum),
            runningProcess: portNum === 3000 ? 'compillo-dev-server' : 'tcp-listener',
            privacy: 'Public',
            origin: 'Auto',
            status: 'listening',
          };
          updated.push(discovered);
          newlyDiscovered.push(discovered);
        }
      }

      setForwardedPorts(updated);
      return { ports: updated, newlyDiscovered, listeningPorts: Array.from(listeningSet) };
    } catch {
      return { ports: baseList, newlyDiscovered: [] as ForwardedPort[], listeningPorts: [] as number[] };
    } finally {
      setIsScanningPorts(false);
    }
  };

  const probePort = async (portNum: number): Promise<boolean> => {
    try {
      const res = await fetch('/api/ports/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: portNum }),
      });
      const data = await res.json();
      const reachable = !!data.reachable;
      setForwardedPorts((prev) =>
        prev.map((p) =>
          p.port === portNum
            ? {
                ...p,
                proxyUrl: portNum === 3000 ? `${window.location.origin}/` : getProxyUrl(portNum),
                status: reachable ? 'listening' : 'inactive',
              }
            : p
        )
      );
      return reachable;
    } catch {
      return false;
    }
  };

  const stopPortServer = async (portNum: number): Promise<{ stopped: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/ports/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: portNum }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { stopped: false, error: data.error || `HTTP ${res.status}` };
      }
      if (data.stopped) {
        setForwardedPorts((prev) =>
          prev.map((p) => (p.port === portNum ? { ...p, status: 'inactive' } : p))
        );
      }
      return { stopped: !!data.stopped };
    } catch (err: any) {
      return { stopped: false, error: err?.message || 'Failed to stop server' };
    }
  };

  const [launchingProjectKey, setLaunchingProjectKey] = useState<string | null>(null);

  const startProjectServer = async (
    projectKey: 'calculator' | 'craveo',
    openPreviewAfter = true
  ): Promise<{ ok: boolean; port?: number; proxyUrl?: string; error?: string }> => {
    setLaunchingProjectKey(projectKey);
    try {
      const res = await fetch('/api/projects/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || `HTTP ${res.status}` };
      }
      const portNum = Number(data.port);
      const proxyUrl = data.proxyUrl || getProxyUrl(portNum);
      setForwardedPorts((prev) => {
        const exists = prev.some((p) => p.port === portNum);
        if (exists) {
          return prev.map((p) =>
            p.port === portNum
              ? { ...p, status: 'listening', proxyUrl, runningProcess: data.label || p.runningProcess }
              : p
          );
        }
        return [
          ...prev,
          {
            id: `port-${portNum}-${Date.now()}`,
            port: portNum,
            localAddress: `http://localhost:${portNum}`,
            proxyUrl,
            runningProcess: data.label || projectKey,
            privacy: 'Public',
            origin: 'Auto',
            status: 'listening',
          },
        ];
      });
      if (openPreviewAfter) {
        onOpenLivePreview?.(proxyUrl);
      }
      return { ok: true, port: portNum, proxyUrl };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Failed to start server' };
    } finally {
      setLaunchingProjectKey(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'ports') {
      scanContainerPorts();
    }
  }, [activeTab]);

  const formatPromptPrefix = (cwd: string) => `user@compillo:~/workspace${cwd ? `/${cwd}` : ''}$`;
  const shellPromptPrefix = formatPromptPrefix(shellCwd);

  // Execute a single terminal command (client built-ins + real Linux workspace shell)
  const executeSingleCommand = async (
    rawCmd: string,
    cwdOverride?: string,
    allowCompoundPorts = true
  ): Promise<string | undefined> => {
    const cmd = rawCmd.trim();
    if (!cmd) return cwdOverride;

    if (allowCompoundPorts) {
      const compoundMatch = cmd.match(/^(.+?)\s*(&&|;|&)\s*(ports(?:\s+.*)?)$/i);
      if (compoundMatch) {
        const leftRaw = compoundMatch[1].trim();
        const sep = compoundMatch[2];
        const rightPorts = compoundMatch[3].trim();
        const leftCmd = sep === '&' && !leftRaw.endsWith('&') ? `${leftRaw} &` : leftRaw;
        const nextCwd = await executeSingleCommand(leftCmd, cwdOverride, false);
        if (sep === '&') {
          await new Promise((r) => setTimeout(r, 400));
        }
        return await executeSingleCommand(rightPorts, nextCwd, false);
      }
    }

    setCmdHistory((prev) => [cmd, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);

    const activePrefix = formatPromptPrefix(cwdOverride !== undefined ? cwdOverride : shellCwd);
    const promptEntry = { text: `${activePrefix} ${cmd}`, type: 'cmd' as const };
    const parts = cmd.split(/\s+/);
    const mainCmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').trim();

    if (mainCmd === 'clear' || mainCmd === 'cls') {
      setTerminalHistory([]);
      return;
    }

    if (mainCmd === 'help') {
      setTerminalHistory((prev) => [
        ...prev,
        promptEntry,
        {
          text: `Compillo Workspace Shell (Real Linux Bash + IDE Commands):
  serve [port]        Launch current Explorer project on :[port] (default 8000) & open URL
  run [file]          Launch file in Compillo Multi-Language Code Runner
  ls / cat / mkdir    Execute real shell & filesystem commands (synced to Explorer)
  node / python3      Execute your own servers & scripts (append "&" for background)
  ports [subcmd]      Manage & probe live ports (list, scan, add, probe, open, stop, help)
  git status|commit   Inspect or commit workspace changes locally
  theme <name>        Switch IDE theme (dark-modern, cyberpunk, light-modern, monokai)
  clear / Ctrl+L      Clear terminal screen
  ↑ / ↓               Browse command history`,
          type: 'output',
        },
      ]);
      return;
    }

    if (mainCmd === 'serve' || mainCmd === 'start') {
      const requestedPort = arg ? parseInt(arg, 10) : 8000;
      if (!Number.isInteger(requestedPort) || requestedPort < 1024 || requestedPort > 65535 || requestedPort === 3000 || requestedPort === 8080) {
        setTerminalHistory((prev) => [
          ...prev,
          promptEntry,
          { text: 'Usage: serve [1024-65535] (ports 3000 and 8080 are reserved)', type: 'error' },
        ]);
        return;
      }
      const allWs = getAllFiles(files);
      if (allWs.length === 0) {
        setTerminalHistory((prev) => [
          ...prev,
          promptEntry,
          { text: 'Workspace is empty. Import a folder/ZIP or create files in Explorer first.', type: 'error' },
        ]);
        return;
      }

      setTerminalHistory((prev) => [...prev, promptEntry]);
      setIsShellRunning(true);
      try {
        const res = await fetch('/api/projects/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: 'workspace',
            port: requestedPort,
            restart: true,
            files: allWs.map((f) => ({ path: f.path, content: f.content || '' })),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setTerminalHistory((prev) => [
            ...prev,
            { text: data.error || `Failed to start project on port ${requestedPort}`, type: 'error' },
          ]);
          return;
        }
        const boundPort = Number(data.port || requestedPort);
        const proxyUrl = data.proxyUrl || getProxyUrl(boundPort);
        setForwardedPorts((prev) => {
          const exists = prev.some((p) => p.port === boundPort);
          if (exists) {
            return prev.map((p) =>
              p.port === boundPort
                ? { ...p, status: 'listening', proxyUrl, runningProcess: data.label || 'Workspace Server' }
                : p
            );
          }
          return [
            ...prev,
            {
              id: `port-${boundPort}-${Date.now()}`,
              port: boundPort,
              localAddress: `http://localhost:${boundPort}`,
              proxyUrl,
              runningProcess: data.label || 'Workspace Server',
              privacy: 'Public',
              origin: 'Auto',
              status: 'listening',
            },
          ];
        });
        onOpenLivePreview?.(proxyUrl);
        setTerminalHistory((prev) => [
          ...prev,
          {
            text: `Server running (${data.label || 'Workspace Server'}):\n  Localhost URL : http://localhost:${boundPort}\n  Preview Proxy : ${proxyUrl}\n  (Opened in Live Preview. Run "ports stop ${boundPort}" to stop.)`,
            type: 'success',
          },
        ]);
      } catch (err: any) {
        setTerminalHistory((prev) => [
          ...prev,
          { text: `Failed to start workspace server: ${err?.message || 'Network error'}`, type: 'error' },
        ]);
      } finally {
        setIsShellRunning(false);
      }
      return;
    }

    if (mainCmd === 'ports') {
      const sub = (parts[1] || 'list').toLowerCase();
      setTerminalHistory((prev) => [...prev, promptEntry]);

      if (sub === 'help') {
        setTerminalHistory((prev) => [
          ...prev,
          {
            text: `Port Forwarding CLI Commands:
  ports                        List forwarded ports & live probe status
  ports scan                   Scan container TCP sockets & auto-forward active servers
  ports start calculator       Start built-in PyCalc server & open Live Preview
  ports start craveo           Start Craveo Food Delivery server (:5000) & open Preview
  ports add <port> [label]     Forward <port> (e.g. ports add 8000 python-http)
  ports probe <port>           Check if a server is actively listening on <port>
  ports open <port>            Open proxied <port> in Compillo Live Preview
  ports stop <port>            Stop background server process listening on <port>
  ports public|private <port>  Change port visibility
  ports rm <port>              Remove port from forwarded list`,
            type: 'output',
          },
        ]);
        return;
      }

      if (sub === 'start') {
        const target = (parts[2] || '').toLowerCase();
        if (target !== 'calculator' && target !== 'craveo') {
          setTerminalHistory((prev) => [
            ...prev,
            { text: 'Usage: ports start <calculator|craveo>', type: 'error' },
          ]);
          return;
        }
        const launched = await startProjectServer(target, true);
        setTerminalHistory((prev) => [
          ...prev,
          launched.ok
            ? {
                text: `Started ${target} on :${launched.port} -> ${launched.proxyUrl}`,
                type: 'success',
              }
            : { text: launched.error || `Failed to start ${target}`, type: 'error' },
        ]);
        return;
      }

      if (sub === 'scan') {
        const { ports: refreshed, newlyDiscovered, listeningPorts } = await scanContainerPorts();
        const lines = refreshed
          .map((p) => {
            const st = p.status === 'listening' ? 'LISTENING' : 'IDLE     ';
            const url = p.port === 3000 ? `${window.location.origin}/` : getProxyUrl(p.port);
            return `:${String(p.port).padEnd(6)} ${st}  ${p.runningProcess.padEnd(20)} [${p.privacy}]  ${url}`;
          })
          .join('\n');
        setTerminalHistory((prev) => [
          ...prev,
          {
            text: `Scanned TCP listeners (${listeningPorts.length} active, ${newlyDiscovered.length} newly forwarded):\n${lines || 'No ports found.'}`,
            type: 'success',
          },
        ]);
        return;
      }

      if (sub === 'add' || sub === 'forward' || sub === 'expose') {
        const portNum = parseInt(parts[2] || '', 10);
        if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
          setTerminalHistory((prev) => [
            ...prev,
            { text: 'Usage: ports add <1-65535> [label] [public|private]', type: 'error' },
          ]);
          return;
        }
        const maybeVis = parts[parts.length - 1]?.toLowerCase();
        const privacy: 'Public' | 'Private' = maybeVis === 'private' ? 'Private' : 'Public';
        const labelParts = parts.slice(3).filter((tok) => tok.toLowerCase() !== 'public' && tok.toLowerCase() !== 'private');
        const label = labelParts.join('-') || `service-${portNum}`;
        const proxyUrl = portNum === 3000 ? `${window.location.origin}/` : getProxyUrl(portNum);
        const isUp = await probePort(portNum);

        setForwardedPorts((prev) => {
          const existing = prev.find((p) => p.port === portNum);
          if (existing) {
            return prev.map((p) =>
              p.port === portNum
                ? { ...p, runningProcess: label, privacy, proxyUrl, status: isUp ? 'listening' : 'inactive' }
                : p
            );
          }
          return [
            ...prev,
            {
              id: `port-${portNum}-${Date.now()}`,
              port: portNum,
              localAddress: `http://localhost:${portNum}`,
              proxyUrl,
              runningProcess: label,
              privacy,
              origin: 'User',
              status: isUp ? 'listening' : 'inactive',
            },
          ];
        });

        setTerminalHistory((prev) => [
          ...prev,
          {
            text: `Forwarded :${portNum} (${label}, ${privacy}) [${isUp ? 'LISTENING' : 'NOT LISTENING YET'}]\nProxy URL: ${proxyUrl}`,
            type: 'success',
          },
        ]);
        return;
      }

      if (sub === 'stop' || sub === 'kill') {
        const portNum = parseInt(parts[2] || '', 10);
        if (!Number.isInteger(portNum)) {
          setTerminalHistory((prev) => [...prev, { text: 'Usage: ports stop <port>', type: 'error' }]);
          return;
        }
        const stopRes = await stopPortServer(portNum);
        setTerminalHistory((prev) => [
          ...prev,
          stopRes.stopped
            ? { text: `Stopped server process on port :${portNum}.`, type: 'success' }
            : { text: stopRes.error || `No active process stopped on :${portNum}.`, type: 'error' },
        ]);
        return;
      }

      if (sub === 'rm' || sub === 'remove' || sub === 'delete') {
        const portNum = parseInt(parts[2] || '', 10);
        if (!Number.isInteger(portNum)) {
          setTerminalHistory((prev) => [...prev, { text: 'Usage: ports rm <port>', type: 'error' }]);
          return;
        }
        const existed = forwardedPorts.some((p) => p.port === portNum);
        setForwardedPorts((prev) => prev.filter((p) => p.port !== portNum));
        setTerminalHistory((prev) => [
          ...prev,
          existed
            ? { text: `Removed port :${portNum} from forwarded list.`, type: 'success' }
            : { text: `Port :${portNum} is not currently forwarded.`, type: 'error' },
        ]);
        return;
      }

      if (sub === 'probe' || sub === 'check') {
        const portNum = parseInt(parts[2] || '', 10);
        if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
          setTerminalHistory((prev) => [...prev, { text: 'Usage: ports probe <port>', type: 'error' }]);
          return;
        }
        const isUp = await probePort(portNum);
        setTerminalHistory((prev) => [
          ...prev,
          {
            text: `Probe 127.0.0.1:${portNum} -> ${isUp ? 'OPEN (accepting TCP connections)' : 'CLOSED (nothing listening)'}\nProxy URL: ${getProxyUrl(portNum)}`,
            type: isUp ? 'success' : 'output',
          },
        ]);
        return;
      }

      if (sub === 'public' || sub === 'private') {
        const portNum = parseInt(parts[2] || '', 10);
        if (!Number.isInteger(portNum)) {
          setTerminalHistory((prev) => [...prev, { text: `Usage: ports ${sub} <port>`, type: 'error' }]);
          return;
        }
        const vis: 'Public' | 'Private' = sub === 'public' ? 'Public' : 'Private';
        setForwardedPorts((prev) => prev.map((p) => (p.port === portNum ? { ...p, privacy: vis } : p)));
        setTerminalHistory((prev) => [
          ...prev,
          { text: `Port :${portNum} visibility set to ${vis}.`, type: 'success' },
        ]);
        return;
      }

      if (sub === 'open' || sub === 'preview') {
        const portNum = parseInt(parts[2] || '', 10);
        if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
          setTerminalHistory((prev) => [...prev, { text: 'Usage: ports open <port>', type: 'error' }]);
          return;
        }
        const proxyUrl = portNum === 3000 ? `${window.location.origin}/` : getProxyUrl(portNum);
        let isUp = await probePort(portNum);
        if (!isUp) {
          for (let attempt = 0; attempt < 4 && !isUp; attempt++) {
            await new Promise((r) => setTimeout(r, 300));
            isUp = await probePort(portNum);
          }
        }
        setForwardedPorts((prev) => {
          if (prev.some((p) => p.port === portNum)) return prev;
          return [
            ...prev,
            {
              id: `port-${portNum}-${Date.now()}`,
              port: portNum,
              localAddress: `http://localhost:${portNum}`,
              proxyUrl,
              runningProcess: `service-${portNum}`,
              privacy: 'Public',
              origin: 'User',
              status: isUp ? 'listening' : 'inactive',
            },
          ];
        });
        onOpenLivePreview?.(proxyUrl);
        setTerminalHistory((prev) => [
          ...prev,
          { text: `Opening :${portNum} in Live Preview (${proxyUrl})`, type: 'success' },
        ]);
        return;
      }

      // Default: list & live-probe
      const { ports: refreshed } = await scanContainerPorts();
      const list = refreshed
        .map((p) => {
          const st = p.status === 'listening' ? 'LISTENING' : 'IDLE     ';
          const url = p.port === 3000 ? `${window.location.origin}/` : getProxyUrl(p.port);
          return `:${String(p.port).padEnd(6)} ${st}  ${p.runningProcess.padEnd(20)} [${p.privacy}]  ${url}`;
        })
        .join('\n');
      setTerminalHistory((prev) => [
        ...prev,
        {
          text: list ? `${list}\n\nTip: Run "ports help" for add / scan / probe / open / rm commands.` : 'No forwarded ports active.',
          type: 'output',
        },
      ]);
      return;
    }

    if (mainCmd === 'run') {
      const all = getAllFiles(files);
      let targetFile: FileNode | undefined = undefined;
      if (arg) {
        targetFile = all.find((f) => f.path === arg || f.name === arg || f.path === `/${arg}`);
      } else if (activeFile) {
        targetFile = activeFile;
      } else {
        targetFile = all.find((f) => f.type === 'file' && f.content);
      }

      if (targetFile && targetFile.content !== undefined) {
        setTerminalHistory((prev) => [
          ...prev,
          promptEntry,
          {
            text: `[Code Runner] Launching ${targetFile!.name} (${targetFile!.language.toUpperCase()}) in Code Runner tab...`,
            type: 'success',
          },
        ]);
        onSelectTab('python');
        universalRunner.runFile(targetFile, files);
      } else {
        setTerminalHistory((prev) => [
          ...prev,
          promptEntry,
          {
            text: arg
              ? `run: file '${arg}' not found in workspace.`
              : `run: no active file open. Usage: run <filename>`,
            type: 'error',
          },
        ]);
      }
      return;
    }

    if (mainCmd === 'git' && (arg === 'status' || arg.startsWith('commit'))) {
      if (arg === 'status') {
        setTerminalHistory((prev) => [
          ...prev,
          promptEntry,
          {
            text: `On branch main\nChanges to be committed: (${modifiedCount} modified files)`,
            type: 'output',
          },
        ]);
      } else {
        onCommitGit('Commit from terminal');
        setTerminalHistory((prev) => [
          ...prev,
          promptEntry,
          { text: '[main] Committed workspace changes successfully.', type: 'success' },
        ]);
      }
      return;
    }

    if (mainCmd === 'theme') {
      const t = arg.toLowerCase();
      if (
        ['dark-modern', 'dark-plus', 'light-modern', 'monokai', 'cyberpunk', 'one-dark-pro', 'nova-studio'].includes(t)
      ) {
        onSelectTheme(t);
        setTerminalHistory((prev) => [
          ...prev,
          promptEntry,
          { text: `Switched theme to "${t}".`, type: 'success' },
        ]);
      } else {
        setTerminalHistory((prev) => [
          ...prev,
          promptEntry,
          {
            text: 'Available themes: nova-studio, dark-modern, cyberpunk, light-modern, monokai, one-dark-pro',
            type: 'error',
          },
        ]);
      }
      return;
    }

    // Route all standard shell commands (ls, cat, node, python3, gcc, pwd, cd, grep, mkdir, touch, etc.) to backend bash sandbox
    setTerminalHistory((prev) => [...prev, promptEntry]);
    setIsShellRunning(true);

    try {
      const workspaceFiles = getAllFiles(files).map((f) => ({
        path: f.path,
        content: f.content || '',
      }));

      const res = await fetch('/api/runner/shell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: shellSessionId,
          command: cmd,
          files: workspaceFiles,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTerminalHistory((prev) => [
          ...prev,
          { text: data.error || `Shell error (HTTP ${res.status})`, type: 'error' },
        ]);
        return;
      }

      if (data.sessionId) setShellSessionId(data.sessionId);
      if (typeof data.cwdRelative === 'string') setShellCwd(data.cwdRelative);

      const outputs: Array<{ text: string; type?: 'cmd' | 'output' | 'error' | 'success' }> = [];
      if (data.stdout) {
        outputs.push({ text: data.stdout, type: 'output' });
      }
      if (data.stderr) {
        outputs.push({ text: data.stderr, type: 'error' });
      }

      // Auto-detect and forward newly opened TCP ports from shell commands
      if (Array.isArray(data.listeningPorts)) {
        const activePorts: number[] = data.listeningPorts;
        const existingPortNums = new Set(forwardedPorts.map((p) => p.port));
        const newPorts = activePorts.filter((p) => !existingPortNums.has(p));

        if (newPorts.length > 0 || activePorts.length > 0) {
          setForwardedPorts((prev) => {
            const activeSet = new Set(activePorts);
            const next = prev.map((p) => ({
              ...p,
              proxyUrl: p.port === 3000 ? `${window.location.origin}/` : getProxyUrl(p.port),
              status: activeSet.has(p.port) ? ('listening' as const) : p.status,
            }));
            for (const np of newPorts) {
              next.push({
                id: `port-${np}-${Date.now()}`,
                port: np,
                localAddress: `http://localhost:${np}`,
                proxyUrl: getProxyUrl(np),
                runningProcess: parts[0] || 'shell-server',
                privacy: 'Public',
                origin: 'Auto',
                status: 'listening',
              });
            }
            return next;
          });
        }

        for (const np of newPorts) {
          outputs.push({
            text: `[Port Auto-Forwarded] :${np} is listening -> ${getProxyUrl(np)} (run "ports open ${np}" to preview)`,
            type: 'success',
          });
        }
      }

      if (outputs.length > 0) {
        setTerminalHistory((prev) => [...prev, ...outputs]);
      }

      if (Array.isArray(data.syncedFiles) && onSyncShellFiles) {
        onSyncShellFiles(data.syncedFiles);
      }

      return typeof data.cwdRelative === 'string' ? data.cwdRelative : cwdOverride;
    } catch (err: any) {
      setTerminalHistory((prev) => [
        ...prev,
        { text: `Shell connection failed: ${err?.message || 'Network error'}`, type: 'error' },
      ]);
    } finally {
      setIsShellRunning(false);
    }
    return cwdOverride;
  };

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd || isShellRunning) return;
    setTerminalInput('');
    await executeSingleCommand(cmd);
  };

  const handleTerminalPaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!/[\r\n]/.test(pasted)) return;
    e.preventDefault();
    if (isShellRunning) return;

    const lines = pasted
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length === 0) return;

    const currentTyped = terminalInput.trim();
    if (currentTyped) {
      lines[0] = `${currentTyped} ${lines[0]}`;
    }
    setTerminalInput('');

    let runningCwd = shellCwd;
    for (const line of lines) {
      const nextCwd = await executeSingleCommand(line, runningCwd);
      if (typeof nextCwd === 'string') {
        runningCwd = nextCwd;
      }
      if (/&\s*$/.test(line)) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  };

  // Execute debug statement
  const handleDebugSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debugInput.trim()) return;

    try {
      const sanitized = debugInput.replace(/window\.alert|document\.write/g, '');
      // eslint-disable-next-line no-eval
      const result = window.eval(sanitized);
      let formatted = '';
      if (typeof result === 'object') {
        formatted = JSON.stringify(result, null, 2);
      } else {
        formatted = String(result);
      }
      setDebugLogs((prev) => [...prev, { expr: debugInput, result: formatted }]);
    } catch (err: any) {
      setDebugLogs((prev) => [
        ...prev,
        { expr: debugInput, result: err?.message || String(err), isError: true },
      ]);
    }
    setDebugInput('');
  };

  // Port actions
  const handleAddPort = async (e: React.FormEvent) => {
    e.preventDefault();
    const portNum = parseInt(newPortNumber, 10);
    if (isNaN(portNum) || portNum <= 0 || portNum > 65535) return;

    const proxyUrl = portNum === 3000 ? `${window.location.origin}/` : getProxyUrl(portNum);
    const label = newPortProcess.trim() || `service-${portNum}`;
    const isUp = await probePort(portNum);

    setForwardedPorts((prev) => {
      const existing = prev.find((p) => p.port === portNum);
      if (existing) {
        return prev.map((p) =>
          p.port === portNum
            ? { ...p, runningProcess: label, privacy: newPortPrivacy, proxyUrl, status: isUp ? 'listening' : 'inactive' }
            : p
        );
      }
      return [
        ...prev,
        {
          id: `port-${portNum}-${Date.now()}`,
          port: portNum,
          localAddress: `http://localhost:${portNum}`,
          proxyUrl,
          runningProcess: label,
          privacy: newPortPrivacy,
          origin: 'User',
          status: isUp ? 'listening' : 'inactive',
        },
      ];
    });
    setIsAddingPort(false);
    setNewPortNumber('');
  };

  const handleTogglePrivacy = (portId: string) => {
    setForwardedPorts((prev) =>
      prev.map((p) =>
        p.id === portId
          ? { ...p, privacy: p.privacy === 'Public' ? 'Private' : 'Public' }
          : p
      )
    );
  };

  const handleDeletePort = (portId: string) => {
    setForwardedPorts((prev) => prev.filter((p) => p.id !== portId));
  };

  const handleCopyPortAddress = (port: ForwardedPort) => {
    const urlToCopy = port.proxyUrl || (port.port === 3000 ? `${window.location.origin}/` : getProxyUrl(port.port));
    navigator.clipboard.writeText(urlToCopy);
    setCopiedPortId(port.id);
    setTimeout(() => setCopiedPortId(null), 2000);
  };

  const handleCopyAllOutput = () => {
    const text = filteredLogs.map((l) => `[${l.timestamp}] [${l.channel}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setIsMoreMenuOpen(false);
  };

  const handleExportLogs = () => {
    const text = filteredLogs.map((l) => `[${l.timestamp}] [${l.channel}] ${l.text}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compillo-${selectedChannel.toLowerCase()}-logs-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
    setIsMoreMenuOpen(false);
  };

  const isLight = currentTheme.type === 'light';
  const isCyberpunk = currentTheme.id === 'cyberpunk';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const effectivePosition = isMobile ? 'bottom' : position;

  return (
    <div
      ref={panelRef}
      id="compillo-bottom-panel"
      className={`select-none shrink-0 min-w-0 min-h-0 ${
        isOpen ? 'flex flex-col' : 'hidden'
      } ${
        isMaximized
          ? 'absolute inset-0 z-40 w-full h-full border-t shadow-2xl'
          : effectivePosition === 'right'
          ? 'relative border-l h-full z-20'
          : 'relative border-t w-full z-20'
      }`}
      style={{
        height: isMaximized
          ? '100%'
          : effectivePosition === 'right'
          ? '100%'
          : `${isMobile ? Math.min(height, window.innerHeight * 0.55) : height}px`,
        maxHeight: !isMaximized && effectivePosition === 'bottom' ? 'calc(100% - 80px)' : undefined,
        width: isMaximized
          ? '100%'
          : effectivePosition === 'right'
          ? `${width}px`
          : '100%',
        maxWidth: !isMaximized && effectivePosition === 'right' ? 'calc(100% - 220px)' : undefined,
        backgroundColor: currentTheme.ui.panelBg,
        borderColor: currentTheme.ui.panelBorder,
        color: currentTheme.ui.editorFg,
      }}
    >
      {/* Resize Drag Handle */}
      {!isMaximized && (
        effectivePosition === 'right' ? (
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="absolute -left-[3px] top-0 bottom-0 w-[6px] cursor-col-resize hover:bg-[#007acc] transition-colors z-30 touch-none"
            title="Drag to resize side panel width"
          />
        ) : (
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="absolute -top-[4px] left-0 right-0 h-[8px] cursor-row-resize hover:bg-[#007acc] transition-colors z-30 touch-none"
            title="Drag to resize bottom panel height"
          />
        )
      )}

      {/* Panel Tab Header */}
      <div
        className={`flex items-center justify-between gap-2 px-2.5 sm:px-3 h-[34px] border-b shrink-0 text-[11px] min-w-0 ${
          isLight ? 'bg-black/[0.03]' : 'bg-black/20'
        }`}
        style={{ borderColor: currentTheme.ui.panelBorder }}
      >
        {/* Left: Tab Buttons (Matching exact IDE order: PROBLEMS, OUTPUT, DEBUG CONSOLE, TERMINAL, PORTS) */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 overflow-x-auto no-scrollbar min-w-0 flex-1">
          {/* 1. PROBLEMS */}
          <button
            onClick={() => onSelectTab('problems')}
            className={`flex items-center gap-1.5 py-1.5 uppercase tracking-wider font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'problems'
                ? isLight
                  ? 'border-[#005fb8] text-[#004e9a] font-bold'
                  : isCyberpunk
                  ? 'border-[#fcee0a] text-[#fcee0a] font-bold'
                  : 'border-[#007acc] text-white'
                : isLight
                ? 'border-transparent text-gray-600 hover:text-black hover:bg-black/5'
                : isCyberpunk
                ? 'border-transparent text-[#e0d4fc]/70 hover:text-[#fcee0a]'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <span>Problems</span>
            <div className="flex items-center gap-1 text-[10px]">
              {errorCount > 0 && (
                <span className="flex items-center text-red-500 font-bold">
                  <AlertCircle size={11} className="mr-0.5" />
                  {errorCount}
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center text-amber-500 font-bold">
                  <AlertTriangle size={11} className="mr-0.5" />
                  {warningCount}
                </span>
              )}
            </div>
          </button>

          {/* 2. OUTPUT */}
          <button
            onClick={() => onSelectTab('output')}
            className={`flex items-center gap-1.5 py-1.5 uppercase tracking-wider font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'output'
                ? isLight
                  ? 'border-[#005fb8] text-[#004e9a] font-bold'
                  : isCyberpunk
                  ? 'border-[#fcee0a] text-[#fcee0a] font-bold'
                  : 'border-[#007acc] text-white'
                : isLight
                ? 'border-transparent text-gray-600 hover:text-black hover:bg-black/5'
                : isCyberpunk
                ? 'border-transparent text-[#e0d4fc]/70 hover:text-[#fcee0a]'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <span>Output</span>
            {runnerState.graphicsWindow && (
              <span className="flex items-center gap-1 text-[9.5px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 lowercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Graphics
              </span>
            )}
          </button>

          {/* 3. DEBUG CONSOLE */}
          <button
            onClick={() => onSelectTab('debug')}
            className={`flex items-center gap-1.5 py-1.5 uppercase tracking-wider font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'debug'
                ? isLight
                  ? 'border-[#005fb8] text-[#004e9a] font-bold'
                  : isCyberpunk
                  ? 'border-[#fcee0a] text-[#fcee0a] font-bold'
                  : 'border-[#007acc] text-white'
                : isLight
                ? 'border-transparent text-gray-600 hover:text-black hover:bg-black/5'
                : isCyberpunk
                ? 'border-transparent text-[#e0d4fc]/70 hover:text-[#fcee0a]'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <span>Debug Console</span>
          </button>

          {/* 4. TERMINAL */}
          <button
            onClick={() => onSelectTab('terminal')}
            className={`flex items-center gap-1.5 py-1.5 uppercase tracking-wider font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'terminal'
                ? isLight
                  ? 'border-[#005fb8] text-[#004e9a] font-bold'
                  : isCyberpunk
                  ? 'border-[#fcee0a] text-[#fcee0a] font-bold'
                  : 'border-[#007acc] text-white'
                : isLight
                ? 'border-transparent text-gray-600 hover:text-black hover:bg-black/5'
                : isCyberpunk
                ? 'border-transparent text-[#e0d4fc]/70 hover:text-[#fcee0a]'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <TerminalIcon size={12} />
            <span>Terminal</span>
          </button>

          {/* 5. PORTS */}
          <button
            onClick={() => onSelectTab('ports')}
            className={`flex items-center gap-1.5 py-1.5 uppercase tracking-wider font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'ports'
                ? isLight
                  ? 'border-[#005fb8] text-[#004e9a] font-bold'
                  : isCyberpunk
                  ? 'border-[#fcee0a] text-[#fcee0a] font-bold'
                  : 'border-[#007acc] text-white'
                : isLight
                ? 'border-transparent text-gray-600 hover:text-black hover:bg-black/5'
                : isCyberpunk
                ? 'border-transparent text-[#e0d4fc]/70 hover:text-[#fcee0a]'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <Network size={12} />
            <span>Ports</span>
            <span
              className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                isLight ? 'bg-black/10 text-gray-700' : 'bg-white/15 text-white/90'
              }`}
            >
              {forwardedPorts.length}
            </span>
          </button>

          {/* 6. FREE RUNNER (15 LANGUAGES) */}
          <button
            onClick={() => onSelectTab('python')}
            className={`flex items-center gap-1.5 py-1.5 uppercase tracking-wider font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'python'
                ? isLight
                  ? 'border-[#005fb8] text-[#004e9a] font-bold'
                  : isCyberpunk
                  ? 'border-[#fcee0a] text-[#fcee0a] font-bold'
                  : 'border-[#38bdf8] text-[#38bdf8] font-bold'
                : isLight
                ? 'border-transparent text-gray-600 hover:text-black hover:bg-black/5'
                : isCyberpunk
                ? 'border-transparent text-[#e0d4fc]/70 hover:text-[#fcee0a]'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <Play size={11} className="text-emerald-400" fill="currentColor" />
            <span>Runner (15 Langs)</span>
            <span className="px-1 py-0.2 rounded text-[9.5px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              FREE
            </span>
            {isPythonRunning && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 ml-0.5" title="Execution running" />
            )}
          </button>
        </div>

        {/* Right Controls: Toolbar items matching the screenshot */}
        <div
          className={`flex items-center space-x-1 shrink-0 ${
            isLight ? 'text-gray-700' : 'text-[#cccccc]'
          }`}
        >
          {/* When active tab is OUTPUT: Filter, Channel Dropdown, Clear, Tail, Lock, More */}
          {activeTab === 'output' && (
            <>
              {/* Graphics Window quick toggle in Output tab toolbar */}
              {runnerState.graphicsWindow && (
                <button
                  onClick={() => universalRunner.toggleGraphicsWindow()}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors text-[10.5px] font-semibold cursor-pointer whitespace-nowrap shrink-0 ${
                    runnerState.graphicsWindow.isOpen
                      ? 'border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-400'
                  }`}
                  title={runnerState.graphicsWindow.isOpen ? 'Minimize Graphics Canvas in Output tab' : 'Show Graphics Canvas in Output tab'}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      runnerState.graphicsWindow.isOpen ? 'bg-emerald-400' : 'bg-gray-400'
                    }`}
                  />
                  <span>
                    Graphics [{runnerState.graphicsWindow.width}×{runnerState.graphicsWindow.height}]
                    {!runnerState.graphicsWindow.isOpen && ' (Hidden)'}
                  </span>
                </button>
              )}

              {/* Filter input */}
              <div className="relative flex items-center shrink-0">
                <Search size={12} className="absolute left-2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter..."
                  value={outputFilter}
                  onChange={(e) => setOutputFilter(e.target.value)}
                  className={`pl-6 pr-5 py-0.5 text-[11px] rounded w-24 md:w-36 lg:w-48 outline-none border transition-colors ${
                    isLight
                      ? 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-[#005fb8]'
                      : isCyberpunk
                      ? 'bg-[#1e1438] border-[#00f0ff] text-[#fcee0a] placeholder:text-[#e0d4fc]/40 focus:border-[#fcee0a]'
                      : 'bg-[#252526] border-[#3c3c3c] text-white placeholder:text-white/40 focus:border-[#007acc]'
                  }`}
                />
                {outputFilter && (
                  <button
                    onClick={() => setOutputFilter('')}
                    title="Clear Filter"
                    className="absolute right-1.5 text-gray-400 hover:text-white"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              {/* Channel selector dropdown (Tasks shown in screenshot) */}
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                title="Select Output Channel"
                className={`text-[11px] rounded px-2 py-0.5 outline-none border cursor-pointer ${
                  isLight
                    ? 'bg-white border-gray-300 text-gray-900'
                    : isCyberpunk
                    ? 'bg-[#1e1438] border-[#00f0ff] text-[#fcee0a]'
                    : 'bg-[#252526] border-[#3c3c3c] text-white'
                }`}
              >
                {channels.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>

              {/* Clear Output */}
              <button
                onClick={() => {
                  onClearOutput(selectedChannel);
                  if (
                    selectedChannel === 'Graphics Output' ||
                    selectedChannel === 'Code Runner' ||
                    selectedChannel === 'All'
                  ) {
                    universalRunner.clearOutput();
                  }
                }}
                title={`Clear Output for "${selectedChannel}"`}
                disabled={isOutputLocked}
                className={`p-1 rounded transition-colors ${
                  isOutputLocked
                    ? 'opacity-40 cursor-not-allowed'
                    : isLight
                    ? 'hover:bg-black/10 text-gray-700'
                    : 'hover:bg-white/15 text-[#cccccc]'
                }`}
              >
                <Trash2 size={13} />
              </button>

              {/* Toggle Auto-Scroll / Tail */}
              <button
                onClick={() => setIsTailActive(!isTailActive)}
                title={isTailActive ? 'Turn Auto-Scroll Off' : 'Turn Auto-Scroll On (Tail)'}
                className={`p-1 rounded transition-colors ${
                  isTailActive
                    ? isLight
                      ? 'bg-[#005fb8]/15 text-[#005fb8]'
                      : isCyberpunk
                      ? 'bg-[#fcee0a]/20 text-[#fcee0a]'
                      : 'bg-[#007acc]/20 text-[#007acc]'
                    : isLight
                    ? 'hover:bg-black/10 text-gray-500'
                    : 'hover:bg-white/10 text-[#888888]'
                }`}
              >
                <ArrowDownToLine size={13} />
              </button>

              {/* Toggle Lock Output */}
              <button
                onClick={() => setIsOutputLocked(!isOutputLocked)}
                title={isOutputLocked ? 'Unlock Output' : 'Lock Output (Freeze Scrolling & Clear)'}
                className={`p-1 rounded transition-colors ${
                  isOutputLocked
                    ? isLight
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-amber-500/20 text-amber-400'
                    : isLight
                    ? 'hover:bg-black/10 text-gray-500'
                    : 'hover:bg-white/10 text-[#888888]'
                }`}
              >
                {isOutputLocked ? <Lock size={13} /> : <Unlock size={13} />}
              </button>

              {/* More Actions Menu */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  title="More Output Actions"
                  className={`p-1 rounded transition-colors ${
                    isLight ? 'hover:bg-black/10 text-gray-700' : 'hover:bg-white/15 text-[#cccccc]'
                  }`}
                >
                  <MoreHorizontal size={13} />
                </button>

                {isMoreMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 w-52 rounded-md shadow-2xl py-1 text-[11.5px] border z-50 backdrop-blur-md"
                    style={{
                      backgroundColor: currentTheme.ui.sideBarBg,
                      borderColor: currentTheme.ui.sideBarBorder,
                      color: currentTheme.ui.sideBarFg,
                    }}
                  >
                    <button
                      onClick={() => {
                        setIsWordWrap(!isWordWrap);
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-white/10 transition-colors"
                    >
                      <span>Toggle Word Wrap</span>
                      <span className="opacity-50 text-[10px]">{isWordWrap ? 'ON' : 'OFF'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowTimestamps(!showTimestamps);
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-white/10 transition-colors"
                    >
                      <span>Toggle Timestamps</span>
                      <span className="opacity-50 text-[10px]">
                        {showTimestamps ? 'ON' : 'OFF'}
                      </span>
                    </button>
                    <div className="h-[1px] my-1 bg-white/10" />
                    <button
                      onClick={handleCopyAllOutput}
                      className="w-full text-left px-3 py-1.5 hover:bg-white/10 transition-colors"
                    >
                      Copy All Output
                    </button>
                    <button
                      onClick={handleExportLogs}
                      className="w-full text-left px-3 py-1.5 hover:bg-white/10 transition-colors"
                    >
                      Export Logs to File (.log)
                    </button>
                    <button
                      onClick={() => {
                        onClearOutput('All');
                        setIsMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Clear All Output Channels
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* When active tab is PORTS: Scan Active Ports, Forward a Port, Filter */}
          {activeTab === 'ports' && (
            <div className="flex items-center space-x-1 shrink-0">
              <div className="relative flex items-center shrink-0">
                <Search size={11} className="absolute left-2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter..."
                  value={portsFilter}
                  onChange={(e) => setPortsFilter(e.target.value)}
                  className={`pl-5 pr-3 py-0.5 text-[11px] rounded w-20 sm:w-28 lg:w-32 outline-none border transition-colors ${
                    isLight
                      ? 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
                      : 'bg-[#252526] border-[#3c3c3c] text-white placeholder:text-white/40'
                  }`}
                />
              </div>
              <button
                onClick={() => scanContainerPorts()}
                disabled={isScanningPorts}
                title="Scan container TCP sockets & probe ports"
                className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 ${
                  isLight
                    ? 'bg-white border-gray-300 text-gray-800 hover:bg-gray-100'
                    : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                }`}
              >
                <RotateCw size={11} className={isScanningPorts ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Scan Ports</span>
              </button>
              <button
                onClick={() => setIsAddingPort(!isAddingPort)}
                title="Forward a Port"
                className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isLight
                    ? 'bg-[#005fb8] text-white hover:bg-[#004e9a]'
                    : isCyberpunk
                    ? 'bg-[#fcee0a] text-black hover:bg-[#ffe600]'
                    : 'bg-[#007acc] text-white hover:bg-[#0062a3]'
                }`}
              >
                <Plus size={12} />
                <span className="hidden sm:inline">Forward Port</span>
              </button>
            </div>
          )}

          {/* When active tab is TERMINAL: New Terminal tab & Clear terminal */}
          {activeTab === 'terminal' && (
            <div className="flex items-center space-x-1">
              <button
                onClick={handleAddTerminalTab}
                title="Open New Terminal Tab"
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isLight ? 'hover:bg-black/10 text-gray-700' : 'hover:bg-white/15 text-[#cccccc]'
                }`}
              >
                <Plus size={12} />
                <span>New</span>
              </button>
              <button
                onClick={() => setTerminalHistory([])}
                title="Clear Active Terminal"
                className={`p-1 rounded transition-colors ${
                  isLight ? 'hover:bg-black/10 text-gray-700' : 'hover:bg-white/15 text-[#cccccc]'
                }`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}

          {/* When active tab is DEBUG: Clear debug */}
          {activeTab === 'debug' && (
            <button
              onClick={() => setDebugLogs([])}
              title="Clear Console"
              className={`p-1 rounded transition-colors ${
                isLight ? 'hover:bg-black/10 text-gray-700' : 'hover:bg-white/15 text-[#cccccc]'
              }`}
            >
              <Trash2 size={13} />
            </button>
          )}

          <div
            className={`h-4 w-[1px] mx-1 ${isLight ? 'bg-gray-300' : 'bg-white/15'}`}
          />

          {/* Toggle Panel Position (Bottom / Side-by-Side) */}
          {onTogglePosition && (
            <button
              onClick={() => {
                setIsMaximized(false);
                onTogglePosition();
              }}
              title={
                position === 'right'
                  ? 'Dock Panel to Bottom'
                  : 'Move Panel to Side (Side-by-Side with Editor)'
              }
              className={`hidden md:flex p-1 rounded transition-colors shrink-0 ${
                isLight ? 'hover:bg-black/10 text-gray-700' : 'hover:bg-white/15 text-[#cccccc]'
              }`}
            >
              {position === 'right' ? <PanelBottom size={13} /> : <PanelRight size={13} />}
            </button>
          )}

          {/* Maximize / Restore */}
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? 'Restore Panel Size (Esc)' : 'Maximize Panel (Full Screen)'}
            className={`p-1 rounded transition-colors shrink-0 ${
              isMaximized
                ? 'bg-sky-500/25 text-sky-400 font-bold border border-sky-500/40'
                : isLight
                ? 'hover:bg-black/10 text-gray-700'
                : 'hover:bg-white/15 text-[#cccccc]'
            }`}
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          {/* Close Panel */}
          <button
            onClick={onClose}
            title="Close Panel"
            className={`p-1 rounded transition-colors shrink-0 ${
              isLight ? 'hover:bg-black/10 text-gray-700' : 'hover:bg-white/15 text-[#cccccc]'
            }`}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Panel Content Body */}
      <div
        className={`flex-1 min-h-0 flex flex-col font-mono text-[12px] p-2 ${
          activeTab === 'terminal' || activeTab === 'debug' || activeTab === 'python'
            ? 'overflow-hidden'
            : 'overflow-y-auto'
        }`}
      >
        {/* 1. PROBLEMS VIEW */}
        {activeTab === 'problems' && (
          <div className="space-y-1 font-sans">
            {diagnostics.length === 0 ? (
              <div className="flex items-center gap-2 p-4 text-[#888888]">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>No problems have been detected in the workspace.</span>
              </div>
            ) : (
              diagnostics.map((d) => (
                <div
                  key={d.id}
                  onClick={() => onJumpToDiagnostic(d.fileId, d.line, d.column)}
                  className="flex items-start gap-2 px-2 py-1.5 hover:bg-white/5 cursor-pointer rounded transition-colors text-[12px]"
                >
                  {d.severity === 'error' ? (
                    <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 truncate">
                    <span className={isLight ? 'text-gray-900' : 'text-[#cccccc]'}>
                      {d.message}
                    </span>
                    <span className="text-[#888888] ml-2 text-[11px]">
                      [{d.source}] ({d.fileName}:{d.line}:{d.column})
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 2. OUTPUT VIEW */}
        {activeTab === 'output' && (
          <div className="space-y-3 leading-relaxed">
            {/* C/C++ & Framebuffer Graphics Window */}
            {runnerState.graphicsWindow && (
              <div>
                {runnerState.graphicsWindow.isOpen ? (
                  <GraphicsWindow
                    currentTheme={currentTheme}
                    isOpen={runnerState.graphicsWindow.isOpen}
                    onClose={() => universalRunner.closeGraphicsWindow()}
                    title={runnerState.graphicsWindow.title}
                    width={runnerState.graphicsWindow.width}
                    height={runnerState.graphicsWindow.height}
                    commands={runnerState.graphicsWindow.commands}
                    libraryType={runnerState.graphicsWindow.libraryType}
                    onReplay={() => {
                      if (activeFile) {
                        universalRunner.runFile(activeFile, files);
                      } else {
                        handleRunGraphicsSample(
                          runnerState.graphicsWindow?.title.toLowerCase().includes('mandelbrot')
                            ? 'mandelbrot'
                            : runnerState.graphicsWindow?.libraryType === 'opengl'
                            ? 'opengl'
                            : 'koch'
                        );
                      }
                    }}
                  />
                ) : (
                  <div
                    className={`p-2.5 rounded-lg border flex items-center justify-between text-xs my-2 ${
                      isLight
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="font-semibold">{runnerState.graphicsWindow.title}</span>
                      <span className="text-[10px] opacity-75">
                        [{runnerState.graphicsWindow.width}×{runnerState.graphicsWindow.height} • {runnerState.graphicsWindow.commands.length} primitives]
                      </span>
                    </div>
                    <button
                      onClick={() => universalRunner.openGraphicsWindow()}
                      className="px-2.5 py-1 rounded font-semibold text-xs bg-emerald-500 hover:bg-emerald-400 text-black transition-colors"
                    >
                      Show Graphics Canvas
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Generated Plot / Image Outputs (e.g. Mandelbrot PPM BMP, Matplotlib) */}
            {runnerState.plots && runnerState.plots.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 border-b border-white/10 pb-1">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Sparkles size={12} />
                    <span>Generated Graphics Images ({runnerState.plots.length})</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {runnerState.plots.map((plotUrl, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex flex-col space-y-2 ${
                        isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/30 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="font-medium text-gray-300">Graphics Frame #{idx + 1}</span>
                        <a
                          href={plotUrl}
                          download={`graphics_output_${idx + 1}.png`}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors font-medium"
                        >
                          <ArrowDownToLine size={11} />
                          <span>Save Image</span>
                        </a>
                      </div>
                      <div className="flex items-center justify-center p-2 rounded-lg bg-black/60 overflow-hidden">
                        <img
                          src={plotUrl}
                          alt={`Graphics output #${idx + 1}`}
                          className="max-h-64 max-w-full rounded object-contain shadow-lg"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Graphics Output Channel Starter Banner (when no graphics output has run yet) */}
            {selectedChannel === 'Graphics Output' && !runnerState.graphicsWindow && (!runnerState.plots || runnerState.plots.length === 0) && (
              <div
                className={`p-6 rounded-xl border text-center flex flex-col items-center justify-center space-y-3.5 my-3 ${
                  isLight
                    ? 'bg-gradient-to-b from-emerald-50/50 to-white border-emerald-200 text-gray-800'
                    : 'bg-gradient-to-b from-emerald-950/20 to-black/40 border-emerald-500/20 text-gray-200'
                }`}
              >
                <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-inner">
                  <Palette size={26} />
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-sm text-emerald-400">
                    Compillo Virtual Graphics &amp; Framebuffer Engine
                  </div>
                  <p className="text-[11.5px] text-gray-400 max-w-lg leading-relaxed">
                    Execute Borland BGI (<code>&lt;graphics.h&gt;</code>), Netpbm PPM (P3/P6) image generators (like Mandelbrot fractals), OpenGL/GLUT 3D, and 2D framebuffers with real-time graphical rendering directly inside this Output tab.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  <button
                    onClick={() => handleRunGraphicsSample('pixel_grid')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-semibold text-xs transition-transform active:scale-95 shadow-md"
                  >
                    <Play size={12} fill="currentColor" />
                    <span>Run Pixel Grid (putpixel)</span>
                  </button>

                  <button
                    onClick={() => handleRunGraphicsSample('koch')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-transform active:scale-95 shadow-md"
                  >
                    <Play size={12} fill="currentColor" />
                    <span>Run Koch Curve Fractal (&lt;graphics.h&gt;)</span>
                  </button>

                  <button
                    onClick={() => handleRunGraphicsSample('mandelbrot')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs transition-transform active:scale-95 shadow-md"
                  >
                    <Play size={12} fill="currentColor" />
                    <span>Run Mandelbrot PPM Fractal (800×600)</span>
                  </button>

                  <button
                    onClick={() => handleRunGraphicsSample('opengl')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-white font-semibold text-xs transition-transform active:scale-95 shadow-md"
                  >
                    <Play size={12} fill="currentColor" />
                    <span>Run OpenGL 3D Teapot</span>
                  </button>
                </div>
              </div>
            )}

            {/* Output Logs Stream */}
            <div className="space-y-0.5 pt-1">
              {filteredLogs.length === 0 ? (
                <div className="p-4 text-[#888888] font-sans text-[12px]">
                  {outputFilter
                    ? `No logs match filter "${outputFilter}" in channel "${selectedChannel}".`
                    : `No output logs currently available for channel "${selectedChannel}".`}
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 py-0.5 font-mono text-[11.5px] ${
                      isWordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre overflow-x-auto'
                    }`}
                  >
                    {showTimestamps && (
                      <span className="text-[#666666] shrink-0 select-none">
                        [{log.timestamp}]
                      </span>
                    )}
                    <span
                      className={`shrink-0 font-medium ${
                        log.channel === 'Graphics Output'
                          ? 'text-emerald-400'
                          : isLight
                          ? 'text-[#005fb8]'
                          : isCyberpunk
                          ? 'text-[#00f0ff]'
                          : 'text-[#4fc1ff]'
                      }`}
                    >
                      [{log.channel}]
                    </span>
                    <span
                      className={`flex-1 ${
                        log.type === 'error'
                          ? 'text-red-400'
                          : log.type === 'success'
                          ? 'text-emerald-400'
                          : log.type === 'info'
                          ? isLight
                            ? 'text-sky-700'
                            : 'text-sky-300'
                          : isLight
                          ? 'text-gray-800'
                          : 'text-[#cccccc]'
                      }`}
                    >
                      {log.text}
                    </span>
                  </div>
                ))
              )}
              <div ref={outputEndRef} />
            </div>
          </div>
        )}

        {/* 3. DEBUG CONSOLE VIEW */}
        {activeTab === 'debug' && (
          <div className="flex flex-col flex-1 min-h-0 font-mono text-[12px]">
            <div className="flex-1 min-h-0 space-y-2 overflow-y-auto">
              {debugLogs.map((log, i) => (
                <div key={i} className="space-y-0.5">
                  <div
                    className={
                      isLight
                        ? 'text-sky-700 font-semibold'
                        : isCyberpunk
                        ? 'text-[#00f0ff] font-semibold'
                        : 'text-sky-400'
                    }
                  >
                    › {log.expr}
                  </div>
                  <div
                    className={`pl-3 whitespace-pre-wrap ${
                      log.isError
                        ? 'text-red-500'
                        : isLight
                        ? 'text-emerald-700'
                        : isCyberpunk
                        ? 'text-[#00ff9f]'
                        : 'text-emerald-300'
                    }`}
                  >
                    {log.result}
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleDebugSubmit}
              className={`flex items-center gap-2 pt-2 border-t ${
                isLight ? 'border-black/10' : 'border-white/10'
              }`}
            >
              <span
                className={`font-bold ${
                  isLight
                    ? 'text-[#005fb8]'
                    : isCyberpunk
                    ? 'text-[#fcee0a]'
                    : 'text-[#007acc]'
                }`}
              >
                ›
              </span>
              <input
                type="text"
                value={debugInput}
                onChange={(e) => setDebugInput(e.target.value)}
                placeholder="Evaluate JavaScript expression..."
                className={`flex-1 bg-transparent outline-none font-mono text-[12px] ${
                  isLight
                    ? 'text-gray-900 placeholder:text-gray-400'
                    : 'text-white placeholder:text-white/40'
                }`}
              />
            </form>
          </div>
        )}

        {/* 4. INTERACTIVE TERMINAL VIEW */}
        {activeTab === 'terminal' && (
          <div className="flex flex-col flex-1 min-h-0 font-mono text-[12px]">
            {/* Multi-Tab Terminal Bar */}
            <div
              className={`flex items-center gap-1 pb-1.5 mb-1.5 border-b overflow-x-auto no-scrollbar shrink-0 ${
                isLight ? 'border-black/10' : 'border-white/10'
              }`}
            >
              {terminalTabs.map((tab) => {
                const isActive = tab.id === activeTerm.id;
                return (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTerminalTabId(tab.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-sans cursor-pointer transition-colors shrink-0 ${
                      isActive
                        ? isLight
                          ? 'bg-[#005fb8] text-white font-medium'
                          : 'bg-[#007acc]/25 text-sky-300 border border-[#007acc]/50 font-medium'
                        : isLight
                        ? 'text-gray-600 hover:bg-black/5'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`}
                  >
                    <TerminalIcon size={11} />
                    <span className="whitespace-nowrap">{tab.title}</span>
                    {tab.cwd && (
                      <span className="opacity-65 font-mono text-[10px] truncate max-w-[100px]">
                        /{tab.cwd}
                      </span>
                    )}
                    {terminalTabs.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseTerminalTab(tab.id);
                        }}
                        title="Close Terminal Tab"
                        className="ml-0.5 p-0.5 rounded hover:bg-white/20"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={handleAddTerminalTab}
                title="New Terminal Tab"
                className={`p-1 rounded transition-colors shrink-0 ${
                  isLight ? 'text-gray-600 hover:bg-black/10' : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Plus size={12} />
              </button>
            </div>

            <div className="flex-1 min-h-0 space-y-1 overflow-y-auto">
              {terminalHistory.map((item, i) => (
                <div
                  key={i}
                  className={`whitespace-pre-wrap ${
                    item.type === 'cmd'
                      ? isLight
                        ? 'text-gray-900 font-bold'
                        : isCyberpunk
                        ? 'text-[#fcee0a] font-bold'
                        : 'text-white font-bold'
                      : item.type === 'error'
                      ? 'text-red-500 font-medium'
                      : item.type === 'success'
                      ? 'text-emerald-500'
                      : isLight
                      ? 'text-gray-700'
                      : isCyberpunk
                      ? 'text-[#e5dcff]'
                      : 'text-[#aaaaaa]'
                  }`}
                >
                  {item.text}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            {/* Terminal CLI prompt input */}
            <form
              onSubmit={handleTerminalSubmit}
              className={`flex items-center gap-2 pt-2 border-t ${
                isLight ? 'border-black/10' : 'border-white/10'
              }`}
            >
              <span
                className={`font-bold shrink-0 ${
                  isLight
                    ? 'text-emerald-700'
                    : isCyberpunk
                    ? 'text-[#00f0ff]'
                    : 'text-emerald-400'
                }`}
              >
                {shellPromptPrefix}
              </span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onPaste={handleTerminalPaste}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (cmdHistory.length === 0) return;
                    const nextIdx = Math.min(historyIndex + 1, cmdHistory.length - 1);
                    setHistoryIndex(nextIdx);
                    setTerminalInput(cmdHistory[nextIdx]);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (historyIndex <= 0) {
                      setHistoryIndex(-1);
                      setTerminalInput('');
                    } else {
                      const nextIdx = historyIndex - 1;
                      setHistoryIndex(nextIdx);
                      setTerminalInput(cmdHistory[nextIdx]);
                    }
                  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
                    e.preventDefault();
                    setTerminalHistory([]);
                  }
                }}
                disabled={isShellRunning}
                autoFocus
                className={`flex-1 bg-transparent outline-none font-mono text-[12px] ${
                  isLight
                    ? 'text-gray-900 placeholder:text-gray-400'
                    : 'text-white placeholder:text-white/40'
                }`}
                placeholder={
                  isShellRunning
                    ? 'Executing command...'
                    : 'type bash command (e.g. ls, node -v, python3 script.py, help)...'
                }
              />
            </form>
          </div>
        )}

        {/* 5. FORWARDED PORTS VIEW */}
        {activeTab === 'ports' && (
          <div className="flex flex-col h-full font-sans text-[12px] space-y-3">
            {/* One-Click Localhost Project Server Launchers */}
            <div
              className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded border ${
                isLight ? 'bg-black/[0.02] border-gray-200' : 'bg-white/[0.03] border-white/10'
              }`}
            >
              <span className={`text-[11px] font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                Quick Launch Localhost Project:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={launchingProjectKey !== null}
                  onClick={() => startProjectServer('calculator', true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  <Play size={11} fill="currentColor" />
                  <span>{launchingProjectKey === 'calculator' ? 'Starting PyCalc...' : 'PyCalc (:5050)'}</span>
                </button>
                <button
                  type="button"
                  disabled={launchingProjectKey !== null}
                  onClick={() => startProjectServer('craveo', true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium bg-orange-500/15 text-orange-300 hover:bg-orange-500/25 border border-orange-500/30 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  <Play size={11} fill="currentColor" />
                  <span>{launchingProjectKey === 'craveo' ? 'Starting Craveo...' : 'Craveo (:5000)'}</span>
                </button>
              </div>
            </div>

            {/* Inline Forward a Port Form */}
            {isAddingPort && (
              <form
                onSubmit={handleAddPort}
                className={`p-3 rounded border flex flex-wrap items-center gap-3 ${
                  isLight
                    ? 'bg-black/[0.02] border-gray-200'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-gray-400">Port:</span>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    value={newPortNumber}
                    onChange={(e) => setNewPortNumber(e.target.value)}
                    placeholder="e.g. 8000"
                    autoFocus
                    required
                    className={`w-24 px-2 py-1 text-[11px] rounded outline-none border font-mono ${
                      isLight
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-[#1e1e1e] border-white/20 text-white'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-gray-400">Process / Label:</span>
                  <input
                    type="text"
                    value={newPortProcess}
                    onChange={(e) => setNewPortProcess(e.target.value)}
                    placeholder="e.g. backend-api"
                    required
                    className={`w-36 px-2 py-1 text-[11px] rounded outline-none border ${
                      isLight
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-[#1e1e1e] border-white/20 text-white'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-gray-400">Visibility:</span>
                  <select
                    value={newPortPrivacy}
                    onChange={(e) => setNewPortPrivacy(e.target.value as any)}
                    className={`px-2 py-1 text-[11px] rounded outline-none border ${
                      isLight
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-[#1e1e1e] border-white/20 text-white'
                    }`}
                  >
                    <option value="Public">Public</option>
                    <option value="Private">Private</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="submit"
                    className={`px-3 py-1 text-[11px] rounded font-medium text-white transition-colors ${
                      isLight ? 'bg-[#005fb8] hover:bg-[#004e9a]' : 'bg-[#007acc] hover:bg-[#0062a3]'
                    }`}
                  >
                    Confirm Forward
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingPort(false)}
                    className="px-2.5 py-1 text-[11px] rounded hover:bg-white/10 text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Forwarded Ports Table */}
            <div className={`overflow-x-auto border rounded ${isLight ? 'border-gray-200' : 'border-white/5'}`}>
              <table className="w-full text-left border-collapse text-[11.5px]">
                <thead>
                  <tr
                    className={`border-b text-[10.5px] uppercase tracking-wider font-semibold ${
                      isLight
                        ? 'bg-black/[0.04] text-gray-600 border-gray-200'
                        : 'bg-black/30 text-gray-400 border-white/10'
                    }`}
                  >
                    <th className="py-2 px-3">Port</th>
                    <th className="py-2 px-3">Forwarded Proxy URL</th>
                    <th className="py-2 px-3">Running Process</th>
                    <th className="py-2 px-3">Visibility</th>
                    <th className="py-2 px-3">Origin</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-mono ${isLight ? 'divide-gray-200' : 'divide-white/5'}`}>
                  {filteredPorts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-500 font-sans">
                        No forwarded ports matching criteria. Run &quot;ports add 8000&quot; in Terminal or click Forward a Port.
                      </td>
                    </tr>
                  ) : (
                    filteredPorts.map((p) => {
                      const isListening = p.status === 'listening';
                      const resolvedUrl =
                        p.proxyUrl || (p.port === 3000 ? `${window.location.origin}/` : getProxyUrl(p.port));
                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors ${
                            isLight ? 'hover:bg-black/[0.02]' : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          {/* Port Number with true live listening indicator */}
                          <td className="py-2 px-3 font-bold tabular-nums">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isListening ? 'bg-emerald-400' : 'bg-gray-500'
                                }`}
                                title={isListening ? 'Port is listening' : 'Not listening yet'}
                              />
                              <span>{p.port}</span>
                              <span
                                className={`text-[9.5px] font-sans font-medium px-1.5 py-0.2 rounded ${
                                  isListening
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : isLight
                                    ? 'bg-gray-200 text-gray-600'
                                    : 'bg-white/10 text-gray-400'
                                }`}
                              >
                                {isListening ? 'Listening' : 'Idle'}
                              </span>
                            </div>
                          </td>

                          {/* Proxied Address reachable from browser */}
                          <td className="py-2 px-3 text-sky-400 hover:underline cursor-pointer">
                            <a
                              href={resolvedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 truncate max-w-[280px]"
                              title={`Open proxied service (${resolvedUrl})`}
                            >
                              <span className="truncate">
                                {p.port === 3000 ? resolvedUrl : `/api/ports/proxy/${p.port}/`}
                              </span>
                              <ExternalLink size={10} className="opacity-70 shrink-0" />
                            </a>
                          </td>

                          {/* Running Process */}
                          <td className="py-2 px-3 font-sans">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10.5px] ${
                                isLight ? 'bg-black/5 text-gray-800' : 'bg-white/10 text-white'
                              }`}
                            >
                              {p.runningProcess}
                            </span>
                          </td>

                          {/* Visibility (Public / Private) */}
                          <td className="py-2 px-3 font-sans">
                            <button
                              onClick={() => handleTogglePrivacy(p.id)}
                              title="Click to toggle Public / Private"
                              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-medium transition-colors ${
                                p.privacy === 'Public'
                                  ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                                  : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                              }`}
                            >
                              {p.privacy === 'Public' ? <Globe size={11} /> : <Lock size={11} />}
                              <span>{p.privacy}</span>
                            </button>
                          </td>

                          {/* Origin */}
                          <td className="py-2 px-3 text-gray-400 text-[11px] font-sans">
                            {p.origin}
                          </td>

                          {/* Actions */}
                          <td className="py-2 px-3 text-right font-sans">
                            <div className="flex items-center justify-end gap-1">
                              {/* Live preview in Compillo */}
                              {onOpenLivePreview && (
                                <button
                                  onClick={() => onOpenLivePreview(resolvedUrl)}
                                  title="Preview Forwarded Port inside Compillo"
                                  className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-sky-300 transition-colors"
                                >
                                  <Eye size={13} />
                                </button>
                              )}

                              {/* Re-probe Port */}
                              <button
                                onClick={() => probePort(p.port)}
                                title={`Probe 127.0.0.1:${p.port}`}
                                className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-emerald-400 transition-colors"
                              >
                                <Radio size={13} />
                              </button>

                              {/* Copy Proxy URL */}
                              <button
                                onClick={() => handleCopyPortAddress(p)}
                                title="Copy Working Proxy URL"
                                className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                              >
                                {copiedPortId === p.id ? (
                                  <Check size={13} className="text-emerald-400" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>

                              {/* Stop Server Process (User Ports only) */}
                              {isListening && p.port !== 3000 && p.port !== 8080 && (
                                <button
                                  onClick={() => stopPortServer(p.port)}
                                  title={`Stop running server on port :${p.port}`}
                                  className="p-1 rounded hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-colors"
                                >
                                  <Square size={12} fill="currentColor" />
                                </button>
                              )}

                              {/* Delete / Stop Forwarding */}
                              <button
                                onClick={() => handleDeletePort(p.id)}
                                title="Remove Port from List"
                                className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Ports Info Note */}
            <div className="text-[11px] text-gray-400 flex items-center justify-between pt-1">
              <span>
                Start any server in Terminal (e.g. <code className="text-sky-400">python3 -m http.server 8000 &amp;</code>) or run <code className="text-sky-400">ports add 8000</code>.
              </span>
              <button
                onClick={() => {
                  const defaultList: ForwardedPort[] = [
                    {
                      id: 'port-3000',
                      port: 3000,
                      localAddress: 'http://localhost:3000',
                      proxyUrl: `${window.location.origin}/`,
                      runningProcess: 'compillo-dev-server',
                      privacy: 'Public',
                      origin: 'Auto',
                      status: 'listening',
                    },
                  ];
                  setForwardedPorts(defaultList);
                  scanContainerPorts(defaultList);
                }}
                className="flex items-center gap-1 hover:text-white text-gray-400 transition-colors"
              >
                <RotateCw size={11} />
                <span>Rescan Active Ports</span>
              </button>
            </div>
          </div>
        )}

        {/* 6. UNIVERSAL CODE RUNNER VIEW (ALL 15 LANGUAGES, 100% FREE) */}
        {activeTab === 'python' && (
          <CodeRunnerView
            currentTheme={currentTheme}
            activeFile={activeFile || null}
            files={files}
            onUpdateFileContent={onUpdateFileContent}
            onOpenLivePreview={onOpenLivePreview}
            onRunActiveFile={() => {
              if (activeFile) {
                universalRunner.runFile(activeFile, files);
              } else {
                const runnable = getAllFiles(files).find((f) => f.type === 'file' && f.content);
                if (runnable) {
                  universalRunner.runFile(runnable, files);
                } else {
                  universalRunner.runFile(
                    {
                      id: 'sample-py',
                      name: 'hello.py',
                      path: '/hello.py',
                      type: 'file',
                      language: 'python',
                      content: 'print("Hello, World!")\n',
                    },
                    files
                  );
                }
              }
            }}
          />
        )}
      </div>
    </div>
  );
};
