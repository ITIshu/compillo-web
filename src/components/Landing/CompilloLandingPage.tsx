import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Award,
  BarChart3,
  Bookmark,
  Bug,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Code2,
  Compass,
  Copy,
  Cpu,
  ExternalLink,
  Flame,
  GitBranch,
  Globe,
  GraduationCap,
  Layers,
  Lock,
  LogOut,
  MessageSquare,
  Minus,
  Monitor,
  Palette,
  Play,
  PlayCircle,
  RefreshCw,
  Rocket,
  Share2,
  Shield,
  Smartphone,
  Sparkles,
  Tablet,
  Terminal as TerminalIcon,
  Trophy,
  Upload,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ActivePanelView, ActiveSideBarView } from '../../types';
import { CompilloThemeDefinition, THEMES } from '../../services/themes';
import { StudioLoader } from '../Common/StudioLoader';
import { auth as firebaseAuth, googleSignIn, googleSignOut } from '../../services/googleAuth';
import {
  CompilloWebsitePage,
  getWebsiteThemeTokens,
  WEBSITE_PAGE_TABS,
} from './Pages/WebsitePageTheme';
import { HostedSitesPage } from './Pages/HostedSitesPage';
import { CommunityGalleryPage } from './Pages/CommunityGalleryPage';
import { ChallengeLeaderboardPage } from './Pages/ChallengeLeaderboardPage';
import { CertificateGeneratorPage } from './Pages/CertificateGeneratorPage';
import { PairCodingBetaPage } from './Pages/PairCodingBetaPage';
import { SqlScratchpadBetaPage } from './Pages/SqlScratchpadBetaPage';
import { ApiSecurityBetaPage } from './Pages/ApiSecurityBetaPage';
import { BenchmarkDiffBetaPage } from './Pages/BenchmarkDiffBetaPage';
import { CsSimulatorsBetaPage } from './Pages/CsSimulatorsBetaPage';
import { DsaCategoryId, DsaVisualizerBetaPage } from './Pages/DsaVisualizerBetaPage';
import { LeetCodeArenaPage } from './Pages/LeetCodeArenaPage';
import { RegexAstBetaPage } from './Pages/RegexAstBetaPage';
import { SystemDesignBetaPage } from './Pages/SystemDesignBetaPage';
import { EnvManagerBetaPage } from './Pages/EnvManagerBetaPage';
import { RestClientBetaPage } from './Pages/RestClientBetaPage';
import { PackageAuditBetaPage } from './Pages/PackageAuditBetaPage';
import { CssAnimatorBetaPage } from './Pages/CssAnimatorBetaPage';
import { SvgIconForgeBetaPage } from './Pages/SvgIconForgeBetaPage';
import workbenchImg from '../../assets/images/compillo_workbench_showcase_1794669816418.jpg';
import runnerImg from '../../assets/images/compillo_runner_graphics_1794669817349.jpg';
import portProxyImg from '../../assets/images/compillo_port_proxy_1794669817194.jpg';
import pycalcImg from '../../assets/images/compillo_pycalc_template_1794669816945.jpg';
import terminalHeroImg from '../../assets/images/compillo_terminal_shell_hero_1794671366142.jpg';
import cloudSyncImg from '../../assets/images/compillo_cloud_sync_grid_1794671364787.jpg';
import universityLabImg from '../../assets/images/compillo_university_lab_1794671365189.jpg';
import cloudInfrastructureImg from '../../assets/images/compillo_cloud_infrastructure_grid_1794673493525.jpg';
import aiCodeAssistantImg from '../../assets/images/compillo_ai_code_assistant_1794673493126.jpg';
import studentCampusLabImg from '../../assets/images/compillo_student_campus_lab_1794673492642.jpg';

export interface CompilloLaunchOptions {
  startPyCalcDemo?: boolean;
  panelTab?: ActivePanelView;
  sideBarView?: ActiveSideBarView;
  openEduLabs?: boolean;
  openSignIn?: boolean;
  starterTemplate?: {
    filename: string;
    content: string;
  };
}

interface CompilloLandingPageProps {
  currentTheme: CompilloThemeDefinition;
  onSelectTheme: (themeId: string) => void;
  onOpenEditor: (options?: CompilloLaunchOptions) => void;
}

type GalleryChapterId = 'workbench' | 'runner' | 'ports' | 'pycalc' | 'cloud' | 'labs';
type HeroTourMode = 'gallery' | 'interactive';
type LaunchMode = 'animated' | 'instant';
type BillingCycle = 'monthly' | 'annual';
type CanvasViewportMode = 'desktop' | 'tablet' | 'mobile';

interface ProductTourChapter {
  id: GalleryChapterId;
  index: string;
  navLabel: string;
  title: string;
  caption: string;
  imageSrc: string;
  imageAlt: string;
  launchLabel: string;
  launchOptions: CompilloLaunchOptions;
}

const PRODUCT_TOUR_CHAPTERS: Record<GalleryChapterId, ProductTourChapter> = {
  workbench: {
    id: 'workbench',
    index: '01',
    navLabel: 'AI Code Workbench',
    title: 'Multi-pane AI code completion, live diff review, and timeline checkpoints',
    caption: 'Explore files, review staged AI patches, format with Prettier, and export complete ZIP archives.',
    imageSrc: aiCodeAssistantImg,
    imageAlt: 'Compillo Studio AI code assistant workbench with dual monitors and real-time diffs',
    launchLabel: 'Open Multi-File Workbench',
    launchOptions: { sideBarView: 'explorer' as ActiveSideBarView, panelTab: 'output' as ActivePanelView },
  },
  runner: {
    id: 'runner',
    index: '02',
    navLabel: '15-Lang Runner',
    title: 'Universal compiler output and native C/C++ BGI graphics framebuffer',
    caption: 'Run Python, C, C++, Java, Rust, Go, and SQLite with stdin input and visual canvases.',
    imageSrc: runnerImg,
    imageAlt: 'Multi-language compiler console displaying Mandelbrot fractal canvas and metrics',
    launchLabel: 'Open Universal Runner',
    launchOptions: { openEduLabs: true },
  },
  ports: {
    id: 'ports',
    index: '03',
    navLabel: 'Shell & Proxy',
    title: 'Persistent container bash terminal with automatic localhost proxying',
    caption: 'Run background servers, probe open TCP ports, and route localhost URLs straight to Live Canvas.',
    imageSrc: portProxyImg,
    imageAlt: 'Container localhost server routing to desktop and mobile browser previews',
    launchLabel: 'Open Terminal & Ports',
    launchOptions: { panelTab: 'ports' as ActivePanelView },
  },
  pycalc: {
    id: 'pycalc',
    index: '04',
    navLabel: 'PyCalc & Canvas',
    title: 'Pre-configured PyCalc AST server paired with responsive live previews',
    caption: 'Switch desktop, 768px tablet, and 375px mobile device frames beside your server code.',
    imageSrc: pycalcImg,
    imageAlt: 'PyCalc scientific calculator web app paired with Python AST syntax glass layers',
    launchLabel: 'Launch PyCalc (:5050)',
    launchOptions: { startPyCalcDemo: true },
  },
  cloud: {
    id: 'cloud',
    index: '05',
    navLabel: 'Cloud Infrastructure',
    title: 'Enterprise cloud operations dashboard and serverless infrastructure telemetry',
    caption: 'Monitor container health metrics, serverless execution nodes, and secure gateway routing.',
    imageSrc: cloudInfrastructureImg,
    imageAlt: 'Futuristic enterprise cloud operations dashboard with container metrics',
    launchLabel: 'Sign In & Sync',
    launchOptions: { openSignIn: true },
  },
  labs: {
    id: 'labs',
    index: '06',
    navLabel: 'Student Campus Labs',
    title: 'Modern computer science laboratories for university coursework & collaboration',
    caption: 'Equipped with dual-monitor workstations, guided engineering experiments, and instant runtimes.',
    imageSrc: studentCampusLabImg,
    imageAlt: 'University computer science lab with students collaborating on dual-monitor workstations',
    launchLabel: 'Browse Lab Catalog',
    launchOptions: { openEduLabs: true },
  },
};

const PRODUCT_CHAPTER_DETAILS = [
  {
    id: 'chapter-authoring',
    number: '01',
    category: 'Code Authoring & Version Safety',
    headline: 'A multi-file editor built for real projects, not single-snippet sandboxes.',
    body: 'Organize nested project trees in the Explorer, open parallel split buffers, format files with Prettier, and verify every edit against local revision checkpoints using inline working-tree diffs before downloading or pushing.',
    highlights: [
      'Side-by-side split Monaco editor panes with independent tab state',
      'Inline working-tree diff inspector and one-click revision restore',
      'Drag-and-drop project import plus complete workspace ZIP export',
    ],
    ctaLabel: 'Explore Editor Workspace',
    launchOptions: { sideBarView: 'explorer' as ActiveSideBarView, panelTab: 'output' as ActivePanelView },
    imageSrc: workbenchImg,
    imageAlt: 'Compillo Studio multi-pane IDE workbench',
    imageCaption: 'Split Monaco panes synchronized with Explorer tree and Output dock',
    mediaLeft: false,
  },
  {
    id: 'chapter-execution',
    number: '02',
    category: 'Compilation, Runtime & Graphics',
    headline: 'Execute 15 languages and C/C++ graphics windows with zero setup.',
    body: 'Switch seamlessly between Python 3, C, C++, Java 17, Rust, Go, TypeScript, and SQLite. Feed interactive stdin queues directly from the bottom runner, inspect Matplotlib plots, or render BGI graphics.h and OpenGL windows inside the browser.',
    highlights: [
      'Interactive stdin stream and millisecond execution timing per run',
      'Native C/C++ graphics.h & OpenGL visual framebuffer canvas',
      'Pre-loaded RTU, AKTU, and VTU university engineering lab modules',
    ],
    ctaLabel: 'Open Labs & Runner',
    launchOptions: { openEduLabs: true },
    imageSrc: runnerImg,
    imageAlt: 'Universal multi-language compiler and graphics output console',
    imageCaption: 'Compiled C/C++ Mandelbrot canvas beside live execution diagnostics',
    mediaLeft: true,
  },
  {
    id: 'chapter-container',
    number: '03',
    category: 'Container Terminal & Port Forwarding',
    headline: 'Run live backend servers in bash and inspect every port securely.',
    body: 'Compillo gives you a real container bash shell whose working directory and background processes persist even when toggling between bottom and side docks. Scan listening sockets, test APIs with the built-in REST Client, and share proxied URLs.',
    highlights: [
      'Multi-tab persistent bash shell with Ctrl+` quick dock toggle',
      'Automatic port discovery bridging 127.0.0.1 ports to proxy routes',
      'Integrated REST API client sidebar for testing local backend endpoints',
    ],
    ctaLabel: 'Open Shell & Ports',
    launchOptions: { panelTab: 'ports' as ActivePanelView },
    imageSrc: portProxyImg,
    imageAlt: 'Container port proxy routing localhost server to responsive device frames',
    imageCaption: 'Localhost port :5050 automatically exposed to Live Canvas frames',
    mediaLeft: false,
  },
  {
    id: 'chapter-cloud',
    number: '04',
    category: 'Enterprise Cloud Sync & Dashboard',
    headline: 'Monitor builds and sync repositories across developer teams.',
    body: 'Track build success metrics, pull multi-branch commits, and synchronize your personal workspace settings securely with cloud profile persistence and team GitHub connectors.',
    highlights: [
      'Real-time build telemetry and repository pipeline monitoring',
      'Cloud profile synchronization across sessions and devices',
      'GitHub repository push & multi-branch pull sync',
    ],
    ctaLabel: 'Sign In & Sync',
    launchOptions: { openSignIn: true },
    imageSrc: cloudSyncImg,
    imageAlt: 'Cloud architecture dashboard and repository synchronization grid',
    imageCaption: 'Enterprise cloud pipeline monitoring and multi-branch repo dashboard',
    mediaLeft: true,
  },
  {
    id: 'chapter-labs',
    number: '05',
    category: 'Academic Labs & Interactive Workstations',
    headline: 'Engineered for university computer science and engineering coursework.',
    body: 'Equip student labs with structured assignments, runnable algorithms, and professional multi-monitor developer environments tailored for technical learning.',
    highlights: [
      'RTU, AKTU, and VTU academic lab experiment catalog',
      'Guided problem statements, sample inputs, and runnable code buffers',
      'Instant lab submission export and verifiable execution logs',
    ],
    ctaLabel: 'Browse Lab Catalog',
    launchOptions: { openEduLabs: true },
    imageSrc: universityLabImg,
    imageAlt: 'Clean modern programming laboratory with workstation monitors',
    imageCaption: 'University programming laboratory equipped with multi-monitor developer stations',
    mediaLeft: false,
  },
];

const COMPANY_STATS = [
  { label: 'Monthly Code Compilations', value: '450M+' },
  { label: 'Active Container Shells', value: '1.2M+' },
  { label: 'Container Uptime SLA', value: '99.99%' },
  { label: 'University CS Departments', value: '120+' },
];

const CUSTOMER_TESTIMONIALS = [
  {
    quote: 'Compillo Studio has completely transformed how our engineering team onboard developers. Zero local environment setup and instant port proxies save hours every week.',
    author: 'Dr. Alok Varma',
    role: 'VP of Engineering',
    company: 'Nexus Cloud Technologies',
  },
  {
    quote: 'For our university B.Tech programming labs, having C/C++ graphics.h and Python executing seamlessly in students browsers without local GCC installations is a game-changer.',
    author: 'Prof. S. R. Ranganathan',
    role: 'Head of Computer Science',
    company: 'Institute of Technology & Science',
  },
];

const SUITE_PILLARS = [
  {
    title: 'Monaco Editor Core',
    spec: 'Split Panes · Prettier · Diffs',
    summary: 'Full multi-tab coding ergonomics with line-by-line revision comparison and keyboard shortcuts.',
    icon: Layers,
  },
  {
    title: '15 Language Runners',
    spec: 'Python · C/C++ · Java · Rust · Go',
    summary: 'Compile and execute scripts or systems programs immediately with queued interactive stdin.',
    icon: Cpu,
  },
  {
    title: 'Container Shell & Ports',
    spec: 'Bash · TCP Scanner · Proxy URL',
    summary: 'Persistent terminal sessions paired with one-click localhost reverse proxying.',
    icon: TerminalIcon,
  },
  {
    title: 'Responsive Live Canvas',
    spec: '100% · 768px · 375px Frames',
    summary: 'Preview proxied servers or HTML/CSS/JS bundles across desktop, tablet, and mobile viewports.',
    icon: Globe,
  },
  {
    title: 'University Edu Labs',
    spec: 'RTU · AKTU · VTU Syllabi',
    summary: 'Guided B.Tech programming experiments complete with algorithms, sample I/O, and runnable buffers.',
    icon: GraduationCap,
  },
  {
    title: 'Themes & Portability',
    spec: '15+ Palettes · ZIP · GitHub',
    summary: 'Switch workspace themes live, export single-file web apps, or push synced snapshots to GitHub.',
    icon: Palette,
  },
];

const STARTER_TEMPLATES = [
  {
    id: 'tpl-pycalc',
    title: 'PyCalc Full-Stack Calculator',
    meta: 'Python 3 AST · Tailwind UI · Port 5050',
    description:
      'Pre-wired Python AST HTTP server paired with a responsive scientific calculator UI ready to run immediately.',
    actionLabel: 'Launch PyCalc (:5050)',
    launchOptions: { startPyCalcDemo: true },
  },
  {
    id: 'tpl-fastapi',
    title: 'FastAPI Python Microservice',
    meta: 'Python 3.11 · Pydantic · REST Swagger',
    description:
      'High-performance async API server with automatic OpenAPI Swagger UI docs, route validation, and background worker threads.',
    actionLabel: 'Open FastAPI Stack',
    launchOptions: {
      panelTab: 'python' as ActivePanelView,
      starterTemplate: {
        filename: 'main.py',
        content:
          '# FastAPI High-Performance Microservice\nfrom typing import Dict\n\ndef app_status() -> Dict[str, str]:\n    return {\n        "status": "online",\n        "engine": "Compillo Studio v3.0",\n        "uptime": "99.99%",\n        "latency_ms": "12ms"\n    }\n\nif __name__ == "__main__":\n    print("Starting FastAPI ASGI worker on http://127.0.0.1:8000...")\n    print(f"Health check: {app_status()}")\n',
      },
    },
  },
  {
    id: 'tpl-cpp-cp',
    title: 'C++20 Competitive Programming',
    meta: 'C++20 · Fast I/O · STL Algorithms',
    description:
      'Optimized Codeforces & LeetCode template with fast I/O macros, vector helpers, and debug printers.',
    actionLabel: 'Open C++20 CP Stack',
    launchOptions: {
      panelTab: 'output' as ActivePanelView,
      starterTemplate: {
        filename: 'competitive_solution.cpp',
        content:
          '#include <iostream>\n#include <vector>\n#include <algorithm>\n#include <numeric>\nusing namespace std;\n\n// Fast I/O for Competitive Programming\nvoid fast_io() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n}\n\nvoid solve() {\n    vector<int> a = {5, 2, 8, 1, 9};\n    sort(a.begin(), a.end());\n    cout << "Sorted array: ";\n    for (int x : a) cout << x << " ";\n    cout << "\\nPrefix sum: " << accumulate(a.begin(), a.end(), 0) << "\\n";\n}\n\nint main() {\n    fast_io();\n    solve();\n    return 0;\n}\n',
      },
    },
  },
  {
    id: 'tpl-sql',
    title: 'SQLite In-Memory Query Lab',
    meta: 'SQL · Relational Joins · Window Functions',
    description:
      'Write relational queries with instant formatted table rendering, window functions, and execution timing.',
    actionLabel: 'Open SQL Template',
    launchOptions: {
      panelTab: 'python' as ActivePanelView,
      starterTemplate: {
        filename: 'analytics_query.sql',
        content:
          'CREATE TABLE builds (id INTEGER, language TEXT, ms INTEGER);\nINSERT INTO builds VALUES (1, "Python", 18), (2, "C++", 14), (3, "Rust", 29), (4, "Go", 12);\nSELECT language, ms, RANK() OVER (ORDER BY ms ASC) as speed_rank FROM builds;\n',
      },
    },
  },
  {
    id: 'tpl-edulabs',
    title: 'University Programming Labs',
    meta: 'RTU · AKTU · VTU · C, C++, Python',
    description:
      'Browse structured engineering lab assignments with problem statements, step-by-step algorithms, and runnable templates.',
    actionLabel: 'Browse Lab Catalog',
    launchOptions: { openEduLabs: true },
  },
  {
    id: 'tpl-rest',
    title: 'REST Client & Live Canvas',
    meta: 'HTTP Inspector · Multi-Viewport Preview',
    description:
      'Send GET/POST requests to running container servers while previewing responsive UI changes side-by-side.',
    actionLabel: 'Open REST Workspace',
    launchOptions: { sideBarView: 'rest-client' as ActiveSideBarView },
  },
];

interface EditionTier {
  id: string;
  name: string;
  audience: string;
  monthlyPrice: string;
  annualPrice: string;
  unitLabel: string;
  highlight?: boolean;
  ctaLabel: string;
  launchOptions: CompilloLaunchOptions;
  features: string[];
}

const PRODUCT_EDITIONS: EditionTier[] = [
  {
    id: 'community',
    name: 'Community',
    audience: 'Individual builders & quick prototyping',
    monthlyPrice: '$0',
    annualPrice: '$0',
    unitLabel: 'forever in browser',
    ctaLabel: 'Open Free Editor',
    launchOptions: { sideBarView: 'explorer' },
    features: [
      'Full Monaco multi-tab & split editor',
      '15 language runners with interactive stdin',
      'Persistent container bash & localhost port proxy',
      'Live Canvas responsive device preview & ZIP export',
    ],
  },
  {
    id: 'campus',
    name: 'Student & Lab',
    audience: 'University coursework & B.Tech engineering labs',
    monthlyPrice: '$0',
    annualPrice: '$0',
    unitLabel: 'academic lab suite',
    highlight: true,
    ctaLabel: 'Open Campus Labs',
    launchOptions: { openEduLabs: true },
    features: [
      'Everything in Community plus RTU, AKTU & VTU labs',
      'C/C++ graphics.h & OpenGL visual framebuffer',
      'Timeline file checkpoints & diff comparison viewer',
      'Guided algorithm notes & instant lab submission export',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Studio',
    audience: 'Teams needing cloud account sync & snapshots',
    monthlyPrice: '$12',
    annualPrice: '$9',
    unitLabel: 'per seat / month',
    ctaLabel: 'Sign In & Sync',
    launchOptions: { openSignIn: true },
    features: [
      'Everything in Student & Lab with cloud profile sync',
      'GitHub repository push & multi-branch pull sync',
      'Persistent workspace theme & extension preferences',
      'Priority multi-port container tunnels & hosting guides',
    ],
  },
];

const COMPARISON_MATRIX = [
  {
    capability: 'Execution Languages',
    community: '15 languages',
    campus: '15 languages + BGI',
    pro: '15 languages + BGI',
  },
  {
    capability: 'Concurrent Localhost Ports',
    community: 'Up to 3 active ports',
    campus: 'Up to 5 active ports',
    pro: 'Unlimited active ports',
  },
  {
    capability: 'Monaco Split Panes & Diffs',
    community: 'Included',
    campus: 'Included',
    pro: 'Included',
  },
  {
    capability: 'University Lab Experiments',
    community: 'Sample preview',
    campus: 'Full syllabus access',
    pro: 'Full syllabus access',
  },
  {
    capability: 'GitHub Push & Cloud Sync',
    community: 'Local export / ZIP',
    campus: 'Local export / ZIP',
    pro: 'Synced account & push',
  },
];

const PRODUCT_FAQS = [
  {
    q: 'Do I need to install compilers or Node/Python locally to use Compillo Studio?',
    a: 'No. Compillo executes 15+ languages, runs persistent container bash sessions, and compiles C/C++ graphics.h programs directly through its integrated workspace runtime.',
  },
  {
    q: 'How do running localhost servers like PyCalc (:5050) preview in the browser?',
    a: 'When you start a server inside the container terminal—such as python3 server.py on port 5050—Compillo detects the listening port and bridges it to a secure proxy URL inside Live Canvas.',
  },
  {
    q: 'Does toggling the terminal between bottom and right docks restart my running server?',
    a: 'No. Compillo maintains a single persistent terminal instance across layout swaps, keeping your active working directory and background processes intact.',
  },
  {
    q: 'Can I download or deploy projects I build inside Compillo Studio?',
    a: 'Yes. You can export full multi-file projects as ZIP archives, bundle web projects into standalone HTML files, or push synced commits directly to GitHub.',
  },
];

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(56, 189, 248, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const CompilloLandingPage: React.FC<CompilloLandingPageProps> = ({
  currentTheme,
  onSelectTheme,
  onOpenEditor,
}) => {
  const isLight = currentTheme.type === 'light';
  const accent = currentTheme.ui.accent;

  const [activePage, setActivePage] = useState<CompilloWebsitePage>(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('page');
      if (p === 'beta-labs') return 'hosting';
      const valid: CompilloWebsitePage[] = [
        'overview',
        'hosting',
        'gallery',
        'challenges',
        'certificates',
        'pair-coding',
        'sql-scratchpad',
        'api-audit',
        'benchmark-diff',
        'cs-simulators',
        'dsa-visualizer',
        'leetcode-arena',
        'regex-ast',
        'system-design',
      ];
      if (p && valid.includes(p as CompilloWebsitePage)) {
        return p as CompilloWebsitePage;
      }
    } catch {
      // ignore
    }
    return 'overview';
  });
  const [dsaPreset, setDsaPreset] = useState<{ category: DsaCategoryId; algo?: string; nonce: number } | null>(null);
  const [pairRoomId, setPairRoomId] = useState<string | undefined>(() => {
    try {
      return new URLSearchParams(window.location.search).get('room') || undefined;
    } catch {
      return undefined;
    }
  });
  const [certPrefill, setCertPrefill] = useState<{ score: number; courseTitle: string } | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => firebaseAuth.currentUser);
  const [authBusy, setAuthBusy] = useState(false);

  const navigatePage = (nextPage: CompilloWebsitePage, opts?: { roomId?: string }) => {
    setActivePage(nextPage);
    if (opts?.roomId !== undefined) {
      setPairRoomId(opts.roomId);
    }
    try {
      const url = new URL(window.location.href);
      if (nextPage === 'overview') {
        url.searchParams.delete('page');
        url.searchParams.delete('room');
      } else {
        url.searchParams.set('page', nextPage);
        if (nextPage === 'pair-coding' && (opts?.roomId || pairRoomId)) {
          url.searchParams.set('room', opts?.roomId || pairRoomId || '');
        } else {
          url.searchParams.delete('room');
        }
      }
      window.history.replaceState({}, '', url.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (u) => {
      setFirebaseUser(u);
    });
    return () => unsub();
  }, []);

  const handleWebsiteGoogleSignIn = async () => {
    setAuthBusy(true);
    try {
      await googleSignIn();
    } catch {
      // cancelled or blocked
    } finally {
      setAuthBusy(false);
    }
  };

  const [tourChapter, setTourChapter] = useState<GalleryChapterId>('workbench');
  const [heroTourMode, setHeroTourMode] = useState<HeroTourMode>('gallery');
  const [launchMode, setLaunchMode] = useState<LaunchMode>('animated');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [canvasViewport, setCanvasViewport] = useState<CanvasViewportMode>('desktop');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Live PyCalc AST evaluator inside Hero Interactive Tour & Showcase
  const [previewCalcExpr, setPreviewCalcExpr] = useState('(18 + 6) * 4');
  const [previewCalcOut, setPreviewCalcOut] = useState('96');

  // Interactive Code Playground State
  const [playgroundLang, setPlaygroundLang] = useState<'python' | 'cpp' | 'js' | 'sql'>('python');
  const [playgroundCode, setPlaygroundCode] = useState(
    'print("Hello from Compillo Software Group!")\nfor n in range(1, 4):\n    print(f"Cube of {n} = {n**3}")'
  );
  const [playgroundOutput, setPlaygroundOutput] = useState(
    'Executing Python 3 script...\nHello from Compillo Software Group!\nCube of 1 = 1\nCube of 2 = 8\nCube of 3 = 27\nProcess exited with code 0 (14ms)'
  );
  const [isPlaygroundRunning, setIsPlaygroundRunning] = useState(false);

  const handleRunPlayground = () => {
    setIsPlaygroundRunning(true);
    window.setTimeout(() => {
      setIsPlaygroundRunning(false);
      if (playgroundLang === 'python') {
        setPlaygroundOutput(
          `Executing Python buffer...\nOutput:\n${playgroundCode}\n-> Simulated execution successful (Exit 0, 16ms)`
        );
      } else if (playgroundLang === 'cpp') {
        setPlaygroundOutput(
          `$ gcc main.c -o main && ./main\nCompiling C source...\n${playgroundCode}\n-> Process exited with code 0 (21ms)`
        );
      } else if (playgroundLang === 'js') {
        setPlaygroundOutput(
          `$ node index.js\n${playgroundCode}\n-> Evaluated in Node.js v18 (9ms)`
        );
      } else {
        setPlaygroundOutput(
          `$ sqlite3 :memory: "\n${playgroundCode}\n"\n-> Query executed successfully. 3 rows returned.`
        );
      }
    }, 320);
  };

  // Daily LeetCode/Codeforces DSA Challenge State
  const [dsaInput, setDsaInput] = useState('[1, 2, 3, 4]');
  const [dsaOutput, setDsaOutput] = useState('[24, 12, 8, 6]');
  const [isDsaRunning, setIsDsaRunning] = useState(false);
  const [dsaTestPassed, setDsaTestPassed] = useState(true);

  const handleRunDsaTest = () => {
    setIsDsaRunning(true);
    window.setTimeout(() => {
      setIsDsaRunning(false);
      try {
        const parsed = JSON.parse(dsaInput);
        if (Array.isArray(parsed) && parsed.every((n) => typeof n === 'number')) {
          const n = parsed.length;
          const res = new Array(n).fill(1);
          let prefix = 1;
          for (let i = 0; i < n; i++) {
            res[i] = prefix;
            prefix *= parsed[i];
          }
          let suffix = 1;
          for (let i = n - 1; i >= 0; i--) {
            res[i] *= suffix;
            suffix *= parsed[i];
          }
          setDsaOutput(JSON.stringify(res));
          setDsaTestPassed(true);
        } else {
          setDsaOutput('[Error: Provide a valid array of integers, e.g. [1, 2, 3, 4]]');
          setDsaTestPassed(false);
        }
      } catch {
        setDsaOutput('[Syntax Error: Invalid JSON array]');
        setDsaTestPassed(false);
      }
    }, 350);
  };

  // Real-time Multiplayer Collaboration State
  const [copiedRoomLink, setCopiedRoomLink] = useState(false);

  const handleCopyRoomLink = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText('https://compillo.dev/live-room/cs301-lab-session');
    }
    setCopiedRoomLink(true);
    window.setTimeout(() => setCopiedRoomLink(false), 2400);
  };

  // Cursor-Style AI Bug Diagnoser & Auto-Fixer State
  const [activeBugId, setActiveBugId] = useState<'segfault' | 'recursion' | 'sql'>('segfault');
  const [isFixingBug, setIsFixingBug] = useState(false);
  const [isBugFixed, setIsBugFixed] = useState(false);

  const handleTriggerAiFix = () => {
    setIsFixingBug(true);
    window.setTimeout(() => {
      setIsFixingBug(false);
      setIsBugFixed(true);
    }, 450);
  };

  // Vercel/Railway-Style 1-Click Cloud Deployment State
  const [deployMode, setDeployMode] = useState<'pycalc' | 'custom'>('pycalc');
  const [deploySubdomain, setDeploySubdomain] = useState('ishant-calculator');
  const [customFiles, setCustomFiles] = useState<Array<{ path: string; content: string }>>([]);
  const [customHtmlDraft, setCustomHtmlDraft] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);
  const [deployedSuccess, setDeployedSuccess] = useState(false);
  const [deployedLiveUrl, setDeployedLiveUrl] = useState('');
  const [deployError, setDeployError] = useState<string | null>(null);

  const handleDeployFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setDeployError(null);
    const loaded: Array<{ path: string; content: string }> = [];
    for (const file of Array.from(fileList).slice(0, 50)) {
      if (file.size > 256 * 1024) {
        setDeployError(`"${file.name}" exceeds the 256 KB per-file limit.`);
        continue;
      }
      const text = await file.text();
      loaded.push({ path: file.name, content: text });
    }

    if (loaded.length > 0) {
      setCustomFiles(loaded);
      if (deploySubdomain === 'ishant-calculator') {
        const base = loaded[0].path.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
        if (base && base !== 'index') {
          setDeploySubdomain(base.slice(0, 32));
        } else {
          setDeploySubdomain('my-site');
        }
      }
    }
    e.target.value = '';
  };

  const handleSimulateDeploy = async () => {
    const slug = (deploySubdomain || (deployMode === 'custom' ? 'my-site' : 'ishant-calculator'))
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-+|-+$/g, '') || 'my-site';

    let filesPayload: Array<{ path: string; content: string }> | undefined;
    if (deployMode === 'custom') {
      if (customFiles.length > 0) {
        filesPayload = customFiles;
      } else if (customHtmlDraft.trim()) {
        filesPayload = [{ path: 'index.html', content: customHtmlDraft }];
      } else {
        setDeployError('Upload at least one HTML/CSS/JS/Python file or paste HTML code below.');
        return;
      }
    }

    setDeploySubdomain(slug);
    setIsDeploying(true);
    setDeployStep(1);
    setDeployedSuccess(false);
    setDeployError(null);

    const step2Timer = window.setTimeout(() => setDeployStep((s) => Math.max(s, 2)), 300);
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filesPayload ? { slug, files: filesPayload } : { slug }),
      });
      const data = await res.json();
      window.clearTimeout(step2Timer);

      if (!res.ok || !data?.ok) {
        setDeployStep(0);
        setDeployError(data?.error || 'Deployment failed');
        setIsDeploying(false);
        return;
      }

      setDeployStep(3);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setDeployedLiveUrl(`${origin}${data.livePath || `/hosted/${slug}/`}`);
      setIsDeploying(false);
      setDeployedSuccess(true);
    } catch (err: any) {
      window.clearTimeout(step2Timer);
      setDeployStep(0);
      setDeployError(err?.message || 'Unable to reach deployment server');
      setIsDeploying(false);
    }
  };

  // HackerRank-Style Verified University Lab Certificate Claim State
  const [claimedCert, setClaimedCert] = useState(false);

  const handleClaimLabCert = () => {
    setClaimedCert(true);
    window.setTimeout(() => setClaimedCert(false), 3500);
  };

  // Studio Opening Animation Overlay before entering Compillo Studio IDE
  const [isBootingEditor, setIsBootingEditor] = useState(false);
  const [pendingLaunchOptions, setPendingLaunchOptions] = useState<CompilloLaunchOptions | undefined>(
    undefined
  );

  const activeChapter = PRODUCT_TOUR_CHAPTERS[tourChapter];
  const themeSwatches = Object.values(THEMES).slice(0, 6);

  const handlePreviewCalcTest = (e: React.FormEvent) => {
    e.preventDefault();
    const expr = previewCalcExpr.trim();
    if (!expr) {
      setPreviewCalcOut('Enter arithmetic expression');
      return;
    }
    if (expr.length > 120 || /[^0-9+\-*/().%\s]/.test(expr)) {
      setPreviewCalcOut('Only arithmetic operators (+ - * / % ( )) allowed');
      return;
    }

    // Pure recursive-descent arithmetic evaluator (zero eval / Function)
    let idx = 0;
    const skipWs = () => {
      while (idx < expr.length && /\s/.test(expr[idx])) idx++;
    };
    const parseExpr = (depth = 0): number => {
      if (depth > 32) throw new Error('Nesting limit');
      let val = parseTerm(depth + 1);
      while (true) {
        skipWs();
        const op = expr[idx];
        if (op === '+' || op === '-') {
          idx++;
          const rhs = parseTerm(depth + 1);
          val = op === '+' ? val + rhs : val - rhs;
        } else {
          break;
        }
      }
      return val;
    };
    const parseTerm = (depth: number): number => {
      let val = parseFactor(depth + 1);
      while (true) {
        skipWs();
        const op = expr[idx];
        if (op === '*' || op === '/' || op === '%') {
          idx++;
          const rhs = parseFactor(depth + 1);
          if ((op === '/' || op === '%') && rhs === 0) throw new Error('DivZero');
          val = op === '*' ? val * rhs : op === '/' ? val / rhs : val % rhs;
        } else {
          break;
        }
      }
      return val;
    };
    const parseFactor = (depth: number): number => {
      if (depth > 32) throw new Error('Nesting limit');
      skipWs();
      if (expr[idx] === '+' || expr[idx] === '-') {
        const sign = expr[idx++] === '-' ? -1 : 1;
        return sign * parseFactor(depth + 1);
      }
      if (expr[idx] === '(') {
        idx++;
        const inner = parseExpr(depth + 1);
        skipWs();
        if (expr[idx] !== ')') throw new Error('Paren');
        idx++;
        return inner;
      }
      const start = idx;
      let seenDot = false;
      while (idx < expr.length && (/[0-9]/.test(expr[idx]) || (!seenDot && expr[idx] === '.'))) {
        if (expr[idx] === '.') seenDot = true;
        idx++;
      }
      if (idx === start) throw new Error('Syntax');
      const num = Number(expr.slice(start, idx));
      if (!Number.isFinite(num)) throw new Error('Overflow');
      return num;
    };

    try {
      const result = parseExpr();
      skipWs();
      if (idx !== expr.length || !Number.isFinite(result)) {
        setPreviewCalcOut('Syntax error');
        return;
      }
      setPreviewCalcOut(String(result));
    } catch {
      setPreviewCalcOut('Syntax error');
    }
  };

  const triggerLaunch = (options?: CompilloLaunchOptions) => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (launchMode === 'instant' || prefersReduced) {
      onOpenEditor(options);
      return;
    }

    setPendingLaunchOptions(options);
    setIsBootingEditor(true);
  };

  const handleStudioLoaderComplete = () => {
    setIsBootingEditor(false);
    onOpenEditor(pendingLaunchOptions);
  };

  const borderColor = currentTheme.ui.sideBarBorder;
  const surfaceBg = currentTheme.ui.panelBg;
  const pageBg = currentTheme.ui.editorBg;
  const fgPrimary = currentTheme.ui.editorFg;
  const fgMuted = isLight ? '#52525b' : '#a1a1aa';

  const accentText = (() => {
    const clean = accent.replace('#', '');
    if (clean.length === 6) {
      const r = parseInt(clean.slice(0, 2), 16) / 255;
      const g = parseInt(clean.slice(2, 4), 16) / 255;
      const b = parseInt(clean.slice(4, 6), 16) / 255;
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return luminance > 0.55 ? '#050505' : '#ffffff';
    }
    return isLight ? '#ffffff' : '#050505';
  })();

  const ambientGlow = hexToRgba(accent, isLight ? 0.09 : 0.14);
  const websiteTokens = getWebsiteThemeTokens(currentTheme);

  const renderArtworkVisual = (
    keyId: string,
    src: string,
    alt: string,
    caption: string,
    aspectClass = 'aspect-[16/10]'
  ) => {
    if (failedImages[keyId]) {
      return (
        <div
          className={`${aspectClass} w-full rounded-xl border flex flex-col items-center justify-center p-6 text-center gap-3`}
          style={{ borderColor, backgroundColor: surfaceBg }}
        >
          <Cpu size={28} style={{ color: accent }} />
          <div className="text-sm font-semibold">{alt}</div>
          <div className="text-xs" style={{ color: fgMuted }}>
            {caption}
          </div>
        </div>
      );
    }

    return (
      <div
        className={`${aspectClass} w-full rounded-xl border overflow-hidden relative shadow-lg`}
        style={{ borderColor, backgroundColor: surfaceBg }}
      >
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setFailedImages((prev) => ({ ...prev, [keyId]: true }))}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-4 pt-10 pb-3.5">
          <p className="text-xs font-medium text-white">{caption}</p>
        </div>
      </div>
    );
  };

  return (
    <div
      id="compillo-landing-root"
      className="font-compillo-display min-h-screen w-full overflow-x-hidden overflow-y-auto transition-colors duration-200 relative"
      style={{ backgroundColor: pageBg, color: fgPrimary }}
    >
      {/* Background Terminal Image Watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 inset-x-0 h-[640px] opacity-20 overflow-hidden z-0"
      >
        <img
          src={terminalHeroImg}
          alt=""
          className="w-full h-full object-cover blur-[2px]"
          referrerPolicy="no-referrer"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, ${pageBg}aa 10%, ${pageBg}ff 95%)`,
          }}
        />
      </div>

      {/* Enterprise Corporate Meta-Header & Main Nav */}
      <div
        className="border-b px-4 py-2 text-[11px] font-medium flex items-center justify-between gap-4 z-40 relative"
        style={{ backgroundColor: surfaceBg, borderColor, color: fgMuted }}
      >
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: fgPrimary }}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Compillo Software Group</span>
            </span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span className="hidden sm:inline">Enterprise Cloud Workspaces v3.0</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#editions"
              onClick={() => activePage !== 'overview' && navigatePage('overview')}
              className="hover:underline"
            >
              SOC 2 Compliance
            </a>
            <a
              href="#editions"
              onClick={() => activePage !== 'overview' && navigatePage('overview')}
              className="hover:underline hidden sm:inline"
            >
              Documentation
            </a>
            <button
              type="button"
              onClick={() => navigatePage(activePage === 'overview' ? 'hosting' : 'overview')}
              className="hover:underline cursor-pointer font-semibold inline-flex items-center gap-1"
              style={{ color: activePage !== 'overview' ? accent : fgPrimary }}
            >
              <Sparkles size={11} style={{ color: accent }} />
              <span>{activePage === 'overview' ? 'Beta Labs' : 'Back to Overview'}</span>
            </button>
            <button
              type="button"
              onClick={() => triggerLaunch({ openSignIn: true })}
              className="hover:underline cursor-pointer"
            >
              Enterprise Sign In
            </button>
          </div>
        </div>
      </div>

      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{
          backgroundColor: isLight ? `${pageBg}ee` : `${pageBg}ea`,
          borderColor,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <a
              href="#top"
              onClick={(e) => {
                if (activePage !== 'overview') {
                  e.preventDefault();
                  navigatePage('overview');
                }
              }}
              className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 rounded"
              style={{ outlineColor: accent }}
            >
              <img
                src="/compillo-logo.png"
                alt="Compillo Software"
                referrerPolicy="no-referrer"
                className="h-6 w-auto object-contain shrink-0"
              />
              <span className="text-base font-bold tracking-tight">Compillo Studio</span>
            </a>

            <nav className="hidden xl:flex items-center gap-4 text-xs font-medium">
              <a
                href="#dsa-arena"
                onClick={() => activePage !== 'overview' && navigatePage('overview')}
                className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                style={{ color: fgMuted }}
                onMouseEnter={(e) => (e.currentTarget.style.color = fgPrimary)}
                onMouseLeave={(e) => (e.currentTarget.style.color = fgMuted)}
              >
                <Code2 size={13} style={{ color: accent }} />
                <span>DSA Arena</span>
              </a>
              <a
                href="#ai-debugger"
                onClick={() => activePage !== 'overview' && navigatePage('overview')}
                className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                style={{ color: fgMuted }}
                onMouseEnter={(e) => (e.currentTarget.style.color = fgPrimary)}
                onMouseLeave={(e) => (e.currentTarget.style.color = fgMuted)}
              >
                <Bug size={13} style={{ color: '#ef4444' }} />
                <span>AI Debugger</span>
              </a>
              <a
                href="#cloud-deploy"
                onClick={() => activePage !== 'overview' && navigatePage('overview')}
                className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                style={{ color: fgMuted }}
                onMouseEnter={(e) => (e.currentTarget.style.color = fgPrimary)}
                onMouseLeave={(e) => (e.currentTarget.style.color = fgMuted)}
              >
                <Rocket size={13} style={{ color: '#38bdf8' }} />
                <span>Deploy</span>
              </a>
              <a
                href="#multiplayer"
                onClick={() => activePage !== 'overview' && navigatePage('overview')}
                className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                style={{ color: fgMuted }}
                onMouseEnter={(e) => (e.currentTarget.style.color = fgPrimary)}
                onMouseLeave={(e) => (e.currentTarget.style.color = fgMuted)}
              >
                <Users size={13} style={{ color: '#ec4899' }} />
                <span>Multiplayer</span>
              </a>
              <a
                href="#kaggle-hub"
                onClick={() => activePage !== 'overview' && navigatePage('overview')}
                className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                style={{ color: fgMuted }}
                onMouseEnter={(e) => (e.currentTarget.style.color = fgPrimary)}
                onMouseLeave={(e) => (e.currentTarget.style.color = fgMuted)}
              >
                <Trophy size={13} style={{ color: '#eab308' }} />
                <span>Competitions</span>
              </a>
              <a
                href="#certification"
                onClick={() => activePage !== 'overview' && navigatePage('overview')}
                className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                style={{ color: fgMuted }}
                onMouseEnter={(e) => (e.currentTarget.style.color = fgPrimary)}
                onMouseLeave={(e) => (e.currentTarget.style.color = fgMuted)}
              >
                <Award size={13} style={{ color: '#a855f7' }} />
                <span>Certificates</span>
              </a>
              <a
                href="#templates"
                onClick={() => activePage !== 'overview' && navigatePage('overview')}
                className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
                style={{ color: fgMuted }}
                onMouseEnter={(e) => (e.currentTarget.style.color = fgPrimary)}
                onMouseLeave={(e) => (e.currentTarget.style.color = fgMuted)}
              >
                Stacks
              </a>
              <a
                href="#editions"
                onClick={() => activePage !== 'overview' && navigatePage('overview')}
                className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
                style={{ color: fgMuted }}
                onMouseEnter={(e) => (e.currentTarget.style.color = fgPrimary)}
                onMouseLeave={(e) => (e.currentTarget.style.color = fgMuted)}
              >
                Pricing
              </a>
              <button
                type="button"
                onClick={() => navigatePage('hosting')}
                className="hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer font-semibold"
                style={{ color: activePage !== 'overview' ? accent : fgPrimary }}
              >
                <Sparkles size={13} style={{ color: accent }} />
                <span>Beta Labs</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigatePage(activePage === 'overview' ? 'hosting' : 'overview')}
              className="xl:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              style={{ borderColor, backgroundColor: surfaceBg, color: fgPrimary }}
            >
              <Sparkles size={13} style={{ color: accent }} />
              <span>{activePage === 'overview' ? 'Beta Labs' : 'Overview'}</span>
            </button>
            <button
              id="landing-header-open-editor"
              type="button"
              onClick={() => triggerLaunch()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-transform active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: accent, color: accentText }}
            >
              <span>Launch Studio</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {activePage !== 'overview' ? (
        <main id="top" className="relative z-10 min-h-[70vh]">
          {/* Dedicated Beta Labs Portal Sub-Header & Feature Switcher */}
          <div className="border-b" style={{ borderColor, backgroundColor: surfaceBg }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigatePage('overview')}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
                    style={{ borderColor, backgroundColor: pageBg, color: fgPrimary }}
                  >
                    &larr; Back to Compillo Overview
                  </button>
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} style={{ color: accent }} />
                    <h1 className="text-base sm:text-lg font-bold tracking-tight">
                      Compillo Beta Labs
                    </h1>
                    <span
                      className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold border"
                      style={{ borderColor, backgroundColor: pageBg, color: accent }}
                    >
                      Testing Phase
                    </span>
                  </div>
                </div>

                {firebaseUser ? (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-semibold truncate max-w-[180px]" style={{ color: fgPrimary }}>
                      {firebaseUser.displayName || firebaseUser.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => googleSignOut()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border hover:opacity-85 cursor-pointer"
                      style={{ borderColor, backgroundColor: pageBg, color: fgMuted }}
                    >
                      <LogOut size={12} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={handleWebsiteGoogleSignIn}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                    style={{ backgroundColor: accent, color: accentText }}
                  >
                    {authBusy ? 'Signing In...' : 'Sign In with Google for Cloud Save'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {WEBSITE_PAGE_TABS.filter((t) => t.id !== 'overview').map((tab) => {
                  const isActive = activePage === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => navigatePage(tab.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors cursor-pointer"
                      style={
                        isActive
                          ? { backgroundColor: accent, color: accentText, borderColor: accent }
                          : { backgroundColor: pageBg, color: fgMuted, borderColor }
                      }
                    >
                      <span>{tab.label}</span>
                      {tab.isBeta && (
                        <span
                          className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold"
                          style={
                            isActive
                              ? { backgroundColor: 'rgba(0,0,0,0.2)', color: accentText }
                              : { backgroundColor: surfaceBg, color: accent }
                          }
                        >
                          Beta
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {activePage === 'hosting' && (
            <HostedSitesPage
              tokens={websiteTokens}
              firebaseUser={firebaseUser}
              onOpenGallery={() => navigatePage('gallery')}
            />
          )}
          {activePage === 'gallery' && (
            <CommunityGalleryPage
              tokens={websiteTokens}
              firebaseUser={firebaseUser}
              onOpenHosting={() => navigatePage('hosting')}
            />
          )}
          {activePage === 'challenges' && (
            <ChallengeLeaderboardPage
              tokens={websiteTokens}
              firebaseUser={firebaseUser}
              onClaimCertificate={(score, courseTitle) => {
                setCertPrefill({ score, courseTitle });
                navigatePage('certificates');
              }}
            />
          )}
          {activePage === 'certificates' && (
            <CertificateGeneratorPage
              tokens={websiteTokens}
              firebaseUser={firebaseUser}
              prefillTrack={certPrefill}
            />
          )}
          {activePage === 'pair-coding' && (
            <PairCodingBetaPage
              tokens={websiteTokens}
              firebaseUser={firebaseUser}
              initialRoomId={pairRoomId}
            />
          )}
          {activePage === 'sql-scratchpad' && (
            <SqlScratchpadBetaPage tokens={websiteTokens} />
          )}
          {activePage === 'api-audit' && (
            <ApiSecurityBetaPage tokens={websiteTokens} />
          )}
          {activePage === 'benchmark-diff' && (
            <BenchmarkDiffBetaPage tokens={websiteTokens} />
          )}
          {activePage === 'cs-simulators' && (
            <CsSimulatorsBetaPage tokens={websiteTokens} />
          )}
          {activePage === 'dsa-visualizer' && (
            <DsaVisualizerBetaPage tokens={websiteTokens} initialPreset={dsaPreset} />
          )}
          {activePage === 'leetcode-arena' && (
            <LeetCodeArenaPage
              tokens={websiteTokens}
              firebaseUser={firebaseUser}
              onVisualizePattern={(category, algo) => {
                setDsaPreset({ category, algo, nonce: Date.now() });
                navigatePage('dsa-visualizer');
              }}
            />
          )}
          {activePage === 'regex-ast' && (
            <RegexAstBetaPage tokens={websiteTokens} />
          )}
          {activePage === 'system-design' && (
            <SystemDesignBetaPage tokens={websiteTokens} />
          )}
          {activePage === 'env-manager' && (
            <EnvManagerBetaPage tokens={websiteTokens} />
          )}
          {activePage === 'rest-client' && (
            <RestClientBetaPage tokens={websiteTokens} />
          )}
          {activePage === 'package-audit' && (
            <PackageAuditBetaPage tokens={websiteTokens} />
          )}
          {activePage === 'css-animator' && (
            <CssAnimatorBetaPage tokens={websiteTokens} />
          )}
          {activePage === 'svg-icon-forge' && (
            <SvgIconForgeBetaPage tokens={websiteTokens} />
          )}
        </main>
      ) : (
      <main id="top" className="relative z-10">
        {/* 1. Editorial Enterprise Hero & Panoramic Compillo Tour Stage */}
        <section className="relative overflow-hidden pt-12 pb-16 lg:pt-16 lg:pb-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1040px] h-[460px]"
            style={{
              background: `radial-gradient(ellipse at center top, ${ambientGlow} 0%, transparent 70%)`,
            }}
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center space-y-5">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold"
                style={{ borderColor, backgroundColor: surfaceBg, color: fgPrimary }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
                <span>Compillo Software Group Product Suite</span>
              </div>

              <h1
                className="font-bold tracking-[-0.035em] leading-[1.05] mx-auto"
                style={{
                  fontSize: 'clamp(2.5rem, 5vw, 4.2rem)',
                  textWrap: 'balance',
                }}
              >
                The cloud-powered software development workspace.
              </h1>

              <p
                className="text-[15px] sm:text-lg leading-relaxed max-w-2xl mx-auto"
                style={{ color: fgMuted }}
              >
                Compillo Studio delivers enterprise-grade code editing, 15 language compilers, persistent container shell sessions, and secure localhost port proxying in one lightning-fast browser environment.
              </p>

              {/* Action Row */}
              <div className="pt-2 flex flex-col items-center gap-3.5">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    id="landing-hero-open-editor"
                    type="button"
                    onClick={() => triggerLaunch()}
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-lg text-sm font-semibold whitespace-nowrap shrink-0 transition-transform active:scale-[0.98] cursor-pointer"
                    style={{ backgroundColor: accent, color: accentText }}
                  >
                    <span>Open Compillo Editor</span>
                    <ArrowRight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerLaunch({ startPyCalcDemo: true })}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                    style={{
                      borderColor,
                      backgroundColor: surfaceBg,
                      color: fgPrimary,
                    }}
                  >
                    <Play size={14} />
                    <span>Launch PyCalc Demo (:5050)</span>
                  </button>
                </div>

                {/* Running Animation Option */}
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <span className="text-xs font-medium" style={{ color: fgMuted }}>
                    Editor startup:
                  </span>
                  <div
                    className="inline-flex items-center p-1 rounded-lg border"
                    style={{ borderColor, backgroundColor: surfaceBg }}
                    role="group"
                    aria-label="Editor launch transition mode"
                  >
                    <button
                      id="launch-mode-animated-btn"
                      type="button"
                      onClick={() => setLaunchMode('animated')}
                      className="px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                      style={
                        launchMode === 'animated'
                          ? { backgroundColor: accent, color: accentText }
                          : { color: fgMuted }
                      }
                    >
                      Animated Editor Boot
                    </button>
                    <button
                      id="launch-mode-instant-btn"
                      type="button"
                      onClick={() => setLaunchMode('instant')}
                      className="px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                      style={
                        launchMode === 'instant'
                          ? { backgroundColor: accent, color: accentText }
                          : { color: fgMuted }
                      }
                    >
                      Instant Open
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Enterprise Company Metrics Counter Bar */}
            <div className="mt-12 max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
              {COMPANY_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="p-5 rounded-xl border text-center space-y-1"
                  style={{ borderColor, backgroundColor: surfaceBg }}
                >
                  <div className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums" style={{ color: accent }}>
                    {stat.value}
                  </div>
                  <div className="text-xs font-medium" style={{ color: fgMuted }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Panoramic Full-Product Gallery Stage */}
            <div className="mt-12 max-w-6xl mx-auto">
              <div
                className="rounded-2xl border overflow-hidden shadow-2xl"
                style={{ borderColor, backgroundColor: surfaceBg }}
              >
                {/* Clean Product Frame Header */}
                <div
                  className="px-4 sm:px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3"
                  style={{ borderColor, backgroundColor: currentTheme.ui.titleBarBg }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src="/compillo-logo.png"
                      alt="Compillo Studio"
                      referrerPolicy="no-referrer"
                      className="h-4 w-auto object-contain shrink-0"
                    />
                    <span className="text-xs font-semibold truncate">
                      {activeChapter.index}. {activeChapter.title}
                    </span>
                  </div>

                  {/* Gallery vs Live Try-It Toggle */}
                  <div
                    className="inline-flex items-center p-0.5 rounded-lg border shrink-0"
                    style={{ borderColor, backgroundColor: pageBg }}
                    role="tablist"
                    aria-label="Product preview mode"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={heroTourMode === 'gallery'}
                      onClick={() => setHeroTourMode('gallery')}
                      className="px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer"
                      style={
                        heroTourMode === 'gallery'
                          ? { backgroundColor: accent, color: accentText }
                          : { color: fgMuted }
                      }
                    >
                      Product Gallery
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={heroTourMode === 'interactive'}
                      onClick={() => setHeroTourMode('interactive')}
                      className="px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer"
                      style={
                        heroTourMode === 'interactive'
                          ? { backgroundColor: accent, color: accentText }
                          : { color: fgMuted }
                      }
                    >
                      Interactive Try-It
                    </button>
                  </div>
                </div>

                {/* Stage Visual or Interactive Canvas */}
                {heroTourMode === 'gallery' ? (
                  <div className="p-4 sm:p-6" style={{ backgroundColor: pageBg }}>
                    {renderArtworkVisual(
                      `tour-${activeChapter.id}`,
                      activeChapter.imageSrc,
                      activeChapter.imageAlt,
                      activeChapter.caption,
                      'aspect-[16/9]'
                    )}
                  </div>
                ) : (
                  <div
                    className="p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
                    style={{ backgroundColor: pageBg }}
                  >
                    {/* Live PyCalc AST Tester */}
                    <div
                      className="lg:col-span-6 p-5 rounded-xl border flex flex-col justify-between gap-4"
                      style={{ borderColor, backgroundColor: surfaceBg }}
                    >
                      <div className="space-y-2">
                        <div className="text-xs font-semibold" style={{ color: accent }}>
                          Live PyCalc Backend Test (:5050)
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: fgMuted }}>
                          Evaluate expressions matching Compillo’s included Python AST server endpoint before entering the workspace.
                        </p>
                      </div>

                      <form onSubmit={handlePreviewCalcTest} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={previewCalcExpr}
                            onChange={(e) => setPreviewCalcExpr(e.target.value)}
                            aria-label="Test PyCalc expression"
                            className="flex-1 min-w-0 px-3 py-2 rounded-lg border text-xs font-compillo-mono outline-none"
                            style={{
                              borderColor,
                              backgroundColor: pageBg,
                              color: fgPrimary,
                            }}
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                            style={{ backgroundColor: accent, color: accentText }}
                          >
                            Evaluate
                          </button>
                        </div>
                        <div
                          className="p-3 rounded-lg border font-compillo-mono text-sm font-semibold tabular-nums"
                          style={{ borderColor, backgroundColor: pageBg, color: accent }}
                        >
                          {'->'} {previewCalcOut}
                        </div>
                      </form>
                    </div>

                    {/* Responsive Canvas Width Tester */}
                    <div
                      className="lg:col-span-6 p-5 rounded-xl border flex flex-col justify-between gap-4"
                      style={{ borderColor, backgroundColor: surfaceBg }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold" style={{ color: accent }}>
                            Live Canvas Viewport Preview
                          </div>
                          <p className="text-xs mt-1" style={{ color: fgMuted }}>
                            Switch responsive device frames side-by-side with code.
                          </p>
                        </div>

                        <div
                          className="inline-flex items-center p-1 rounded-lg border shrink-0"
                          style={{ borderColor, backgroundColor: pageBg }}
                        >
                          {(
                            [
                              { id: 'desktop', icon: Monitor, label: '100%' },
                              { id: 'tablet', icon: Tablet, label: '768px' },
                              { id: 'mobile', icon: Smartphone, label: '375px' },
                            ] as const
                          ).map((vp) => {
                            const Icon = vp.icon;
                            const active = canvasViewport === vp.id;
                            return (
                              <button
                                key={vp.id}
                                type="button"
                                onClick={() => setCanvasViewport(vp.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer"
                                style={
                                  active
                                    ? { backgroundColor: accent, color: accentText }
                                    : { color: fgMuted }
                                }
                              >
                                <Icon size={11} />
                                <span>{vp.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div
                        className="p-4 rounded-lg border flex justify-center"
                        style={{ borderColor, backgroundColor: pageBg }}
                      >
                        <div
                          className="rounded-md border px-3.5 py-3 font-compillo-mono text-xs flex items-center justify-between transition-all duration-200"
                          style={{
                            borderColor,
                            backgroundColor: surfaceBg,
                            width:
                              canvasViewport === 'desktop'
                                ? '100%'
                                : canvasViewport === 'tablet'
                                ? '72%'
                                : '46%',
                            minWidth: '185px',
                          }}
                        >
                          <span className="truncate">PyCalc Live App</span>
                          <span className="tabular-nums shrink-0" style={{ color: accent }}>
                            {canvasViewport === 'desktop'
                              ? '1440px'
                              : canvasViewport === 'tablet'
                              ? '768px'
                              : '375px'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Product Tour Chapter Dock */}
                <div
                  className="border-t grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px"
                  style={{ borderColor, backgroundColor: borderColor }}
                  role="tablist"
                  aria-label="Product walkthrough chapters"
                >
                  {(Object.keys(PRODUCT_TOUR_CHAPTERS) as GalleryChapterId[]).map((id) => {
                    const item = PRODUCT_TOUR_CHAPTERS[id];
                    const selected = tourChapter === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => {
                          setTourChapter(id);
                          setHeroTourMode('gallery');
                        }}
                        className="px-4 py-3 text-left transition-colors cursor-pointer flex items-center justify-between gap-1"
                        style={{
                          backgroundColor: selected ? surfaceBg : pageBg,
                          boxShadow: selected ? `inset 0 2px 0 ${accent}` : 'none',
                        }}
                      >
                        <div className="min-w-0">
                          <div
                            className="font-compillo-mono text-[10px] font-semibold tabular-nums"
                            style={{ color: selected ? accent : fgMuted }}
                          >
                            {item.index}
                          </div>
                          <div className="text-xs font-semibold truncate">
                            {item.navLabel}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Product Narrative Chapters (Stripe / Framer Enterprise Editorial Flow) */}
        <section
          id="product"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t space-y-20"
          style={{ borderColor }}
        >
          <div className="max-w-2xl space-y-2">
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Every phase of building software, connected cleanly.
            </h2>
            <p className="text-sm sm:text-[15px]" style={{ color: fgMuted }}>
              Move from multi-file editing to compiled execution, container networking, and responsive previews without leaving Compillo Studio.
            </p>
          </div>

          {PRODUCT_CHAPTER_DETAILS.map((chapter) => (
            <div
              key={chapter.id}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
            >
              <div
                className={`lg:col-span-5 space-y-5 ${
                  chapter.mediaLeft ? 'lg:order-2' : 'lg:order-1'
                }`}
              >
                <div className="text-xs font-semibold tabular-nums" style={{ color: accent }}>
                  {chapter.number}. {chapter.category}
                </div>
                <h3
                  className="text-2xl sm:text-[28px] font-bold tracking-tight leading-snug"
                  style={{ textWrap: 'balance' }}
                >
                  {chapter.headline}
                </h3>
                <p className="text-sm sm:text-[15px] leading-relaxed" style={{ color: fgMuted }}>
                  {chapter.body}
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm pt-1">
                  {chapter.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2.5">
                      <Check size={15} className="mt-0.5 shrink-0" style={{ color: accent }} />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => triggerLaunch(chapter.launchOptions)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                    style={{
                      borderColor,
                      backgroundColor: surfaceBg,
                      color: fgPrimary,
                    }}
                  >
                    <span>{chapter.ctaLabel}</span>
                    <ArrowRight size={14} style={{ color: accent }} />
                  </button>
                </div>
              </div>

              <div
                className={`lg:col-span-7 ${
                  chapter.mediaLeft ? 'lg:order-1' : 'lg:order-2'
                }`}
              >
                {renderArtworkVisual(
                  chapter.id,
                  chapter.imageSrc,
                  chapter.imageAlt,
                  chapter.imageCaption,
                  'aspect-[16/10]'
                )}
              </div>
            </div>
          ))}
        </section>

        {/* 3. Interactive Code Playground & Runner Section */}
        <section
          id="playground"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t"
          style={{ borderColor }}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="max-w-2xl space-y-2">
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Test-drive execution right on the page.
              </h2>
              <p className="text-sm sm:text-[15px]" style={{ color: fgMuted }}>
                Select a language, tweak code, and click Run Execution to see simulated compiler output instantly.
              </p>
            </div>

            <div
              className="inline-flex items-center p-1 rounded-lg border shrink-0"
              style={{ borderColor, backgroundColor: surfaceBg }}
              role="group"
              aria-label="Playground language selector"
            >
              {[
                { id: 'python', label: 'Python 3' },
                { id: 'cpp', label: 'C / GCC' },
                { id: 'js', label: 'JavaScript' },
                { id: 'sql', label: 'SQLite Query' },
              ].map((lang) => {
                const active = playgroundLang === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => {
                      setPlaygroundLang(lang.id as any);
                      if (lang.id === 'python') {
                        setPlaygroundCode('print("Hello from Compillo Studio!")\nfor n in range(1, 4):\n    print(f"Cube of {n} = {n**3}")');
                      } else if (lang.id === 'cpp') {
                        setPlaygroundCode('#include <stdio.h>\nint main() {\n    printf("Compillo C99 Execution\\n");\n    return 0;\n}');
                      } else if (lang.id === 'js') {
                        setPlaygroundCode('const stack = ["Monaco", "Bash", "Proxy"];\nconsole.log("Stack:", stack.join(" · "));');
                      } else {
                        setPlaygroundCode('SELECT "Compillo Studio" AS product, 200 AS status, "Ready" AS health;');
                      }
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                    style={
                      active
                        ? { backgroundColor: accent, color: accentText }
                        : { color: fgMuted }
                    }
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="rounded-2xl border overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-xl"
            style={{ borderColor, backgroundColor: surfaceBg }}
          >
            <div className="lg:col-span-7 p-4 sm:p-6 border-b lg:border-b-0 lg:border-r flex flex-col justify-between gap-4" style={{ borderColor, backgroundColor: pageBg }}>
              <div className="flex items-center justify-between text-xs font-compillo-mono" style={{ color: fgMuted }}>
                <span>main{playgroundLang === 'python' ? '.py' : playgroundLang === 'cpp' ? '.c' : playgroundLang === 'js' ? '.js' : '.sql'}</span>
                <span>UTF-8 · LF</span>
              </div>
              <textarea
                value={playgroundCode}
                onChange={(e) => setPlaygroundCode(e.target.value)}
                aria-label="Playground code editor"
                rows={7}
                className="w-full p-3 rounded-lg border font-compillo-mono text-xs sm:text-sm leading-relaxed outline-none resize-none"
                style={{
                  borderColor,
                  backgroundColor: surfaceBg,
                  color: fgPrimary,
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: fgMuted }}>
                  Edit code above &amp; run execution
                </span>
                <button
                  type="button"
                  onClick={handleRunPlayground}
                  disabled={isPlaygroundRunning}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-transform active:scale-[0.98]"
                  style={{ backgroundColor: accent, color: accentText }}
                >
                  <Play size={14} />
                  <span>{isPlaygroundRunning ? 'Compiling...' : 'Run Execution'}</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 p-4 sm:p-6 flex flex-col justify-between font-compillo-mono text-xs" style={{ backgroundColor: surfaceBg }}>
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor, color: fgMuted }}>
                  <span className="inline-flex items-center gap-1.5 font-compillo-display text-xs font-semibold">
                    <TerminalIcon size={13} />
                    <span>Runner Output</span>
                  </span>
                  <span className="text-[11px]" style={{ color: accent }}>
                    {isPlaygroundRunning ? 'Building...' : 'Exit 0'}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap leading-relaxed overflow-x-auto text-[11.5px]" style={{ color: fgPrimary }}>
                  {playgroundOutput}
                </pre>
              </div>

              <div className="pt-4 border-t mt-4 flex items-center justify-between gap-2" style={{ borderColor }}>
                <span className="text-[11px]" style={{ color: fgMuted }}>
                  Want 15+ compilers?
                </span>
                <button
                  type="button"
                  onClick={() => triggerLaunch()}
                  className="font-compillo-display text-xs font-semibold hover:underline underline-offset-4 cursor-pointer"
                  style={{ color: accent }}
                >
                  Open Full IDE
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* College Student Edition: Why Stop Using VS Code */}
        <section
          id="campus-edition"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t"
          style={{ borderColor }}
        >
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold"
              style={{ borderColor, backgroundColor: surfaceBg, color: fgPrimary }}
            >
              <GraduationCap size={14} style={{ color: accent }} />
              <span>Compillo Campus Edition — Stop VS Code Extension Hell</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
              Why college engineering students are ditching VS Code for Compillo.
            </h2>
            <p className="text-sm sm:text-base leading-relaxed" style={{ color: fgMuted }}>
              Say goodbye to missing compiler toolchains, 45 extension updates, environment crashes during lab finals, and tedious local setup. Code instantly in your browser.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* VS Code Frustrations */}
            <div
              className="p-6 sm:p-8 rounded-2xl border flex flex-col justify-between gap-6"
              style={{ borderColor, backgroundColor: surfaceBg }}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold tracking-tight" style={{ color: '#ef4444' }}>
                    Traditional IDEs (like VS Code)
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded border border-red-500/30 bg-red-950/20 text-red-300">
                    High Friction
                  </span>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm" style={{ color: fgMuted }}>
                  <li className="flex items-start gap-2.5">
                    <span className="text-red-400 font-bold mt-0.5">✕</span>
                    <span>Hours spent installing Mingw, Python paths, and CMake extensions.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-red-400 font-bold mt-0.5">✕</span>
                    <span>C/C++ graphics.h (BGI) fails to compile on modern macOS or Windows.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-red-400 font-bold mt-0.5">✕</span>
                    <span>Consumes 2GB+ RAM, slowing down laptop batteries during lectures.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-red-400 font-bold mt-0.5">✕</span>
                    <span>No built-in university lab manuals or RTU/AKTU/VTU experiment templates.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Compillo Campus Advantage */}
            <div
              className="p-6 sm:p-8 rounded-2xl border flex flex-col justify-between gap-6 shadow-xl"
              style={{ borderColor: accent, backgroundColor: surfaceBg }}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold tracking-tight" style={{ color: accent }}>
                    Compillo Campus Studio
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded border font-semibold" style={{ borderColor: accent, backgroundColor: hexToRgba(accent, 0.15), color: accent }}>
                    Zero Setup
                  </span>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm" style={{ color: fgPrimary }}>
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="mt-0.5 shrink-0" style={{ color: accent }} />
                    <span>Instant browser launch. Python, C++, Java, and SQL run immediately.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="mt-0.5 shrink-0" style={{ color: accent }} />
                    <span>Built-in C/C++ graphics.h &amp; OpenGL framebuffer canvas for lab assignments.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="mt-0.5 shrink-0" style={{ color: accent }} />
                    <span>Lightweight, lightning-fast Monaco editor with zero local bloat.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check size={15} className="mt-0.5 shrink-0" style={{ color: accent }} />
                    <span>Pre-loaded university programming lab experiments and one-click ZIP export.</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => triggerLaunch({ openEduLabs: true })}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-transform active:scale-[0.98] cursor-pointer"
                style={{ backgroundColor: accent, color: accentText }}
              >
                <span>Open Campus Labs &amp; Editor</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </section>

        {/* Kaggle-Inspired Data Science & Competitions Hub */}
        <section
          id="kaggle-hub"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t"
          style={{ borderColor }}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="max-w-2xl space-y-3">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold"
                style={{ borderColor, backgroundColor: surfaceBg, color: fgPrimary }}
              >
                <Globe size={13} style={{ color: accent }} />
                <span>Compillo Competitions &amp; Data Science Hub</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
                Active hackathons, public notebooks, and community datasets.
              </h2>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: fgMuted }}>
                Join global machine learning challenges, launch interactive Python notebooks directly in your browser, and climb the Compillo Grandmaster leaderboard.
              </p>
            </div>

            <button
              type="button"
              onClick={() => triggerLaunch({ openEduLabs: true })}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 border transition-transform active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: surfaceBg, borderColor, color: fgPrimary }}
            >
              <span>Explore All Competitions &amp; Datasets</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Active Competitions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              {
                title: 'PyCalc AST Data Science Grand Prix',
                category: 'Machine Learning • $15,000 Prize',
                teams: '1,420 Teams',
                deadline: '4 Days Left',
                desc: 'Optimize AST calculation trees using advanced Python neural network estimators.',
              },
              {
                title: 'C++ Graphics Mandelbrot Optimization',
                category: 'Systems & Algorithms • $8,500 Prize',
                teams: '890 Teams',
                deadline: '8 Days Left',
                desc: 'Push C++ BGI graphics framebuffers to achieve sub-millisecond fractal render times.',
              },
              {
                title: 'SQLite SQL Analytics Speedrun',
                category: 'Database Analytics • $10,000 Prize',
                teams: '2,300 Teams',
                deadline: '2 Days Left',
                desc: 'Query massive relational datasets with optimal indexing and window functions.',
              },
            ].map((comp) => (
              <div
                key={comp.title}
                className="p-6 rounded-xl border flex flex-col justify-between gap-6 transition-transform hover:-translate-y-1 duration-200"
                style={{ backgroundColor: surfaceBg, borderColor }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold" style={{ color: accent }}>
                    <span>{comp.category}</span>
                    <span className="px-2 py-0.5 rounded border" style={{ borderColor, backgroundColor: pageBg }}>
                      {comp.deadline}
                    </span>
                  </div>
                  <h3 className="text-base font-bold tracking-tight">{comp.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: fgMuted }}>
                    {comp.desc}
                  </p>
                </div>

                <div className="pt-4 border-t flex items-center justify-between gap-4 text-xs" style={{ borderColor }}>
                  <span style={{ color: fgMuted }}>{comp.teams} competing</span>
                  <button
                    type="button"
                    onClick={() => triggerLaunch()}
                    className="font-semibold hover:underline cursor-pointer"
                    style={{ color: accent }}
                  >
                    Join Kernel &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Trending Public Notebooks Feed */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold tracking-tight">Trending Public Kernels &amp; Datasets</h3>
              <span className="text-xs font-medium" style={{ color: fgMuted }}>Updated 5 mins ago</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: 'pandas_numpy_eda_toolkit.py',
                  author: 'Dr. Alex Mercer (Grandmaster)',
                  votes: '1,420 Upvotes',
                  lang: 'Python 3',
                  desc: 'Comprehensive Exploratory Data Analysis template with seaborn visualizations.',
                },
                {
                  title: 'neural_net_mnist_from_scratch.py',
                  author: 'Elena Rostova (Master)',
                  votes: '2,100 Upvotes',
                  lang: 'Python / NumPy',
                  desc: 'Zero-dependency neural network classifier achieving 98.4% test accuracy.',
                },
                {
                  title: 'sqlite_window_functions_guide.sql',
                  author: 'DevTeam (Expert)',
                  votes: '980 Upvotes',
                  lang: 'SQLite',
                  desc: 'Advanced SQL queries for cohort retention and rolling revenue aggregates.',
                },
              ].map((nb) => (
                <div
                  key={nb.title}
                  className="p-5 rounded-xl border flex flex-col justify-between gap-4"
                  style={{ backgroundColor: surfaceBg, borderColor }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]" style={{ color: fgMuted }}>
                      <span className="font-mono">{nb.lang}</span>
                      <span className="font-semibold tabular-nums" style={{ color: accent }}>{nb.votes}</span>
                    </div>
                    <div className="text-sm font-bold font-mono tracking-tight">{nb.title}</div>
                    <div className="text-xs" style={{ color: fgMuted }}>By {nb.author}</div>
                    <p className="text-xs leading-relaxed pt-1" style={{ color: fgPrimary }}>
                      {nb.desc}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => triggerLaunch()}
                    className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer"
                    style={{ borderColor, backgroundColor: pageBg, color: fgPrimary }}
                  >
                    <span>Open in Editor</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 1. LeetCode / Codeforces-Style Daily DSA Challenge Arena */}
        <section
          id="dsa-arena"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t"
          style={{ borderColor }}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="max-w-2xl space-y-3">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold"
                style={{ borderColor, backgroundColor: surfaceBg, color: fgPrimary }}
              >
                <Code2 size={14} style={{ color: '#eab308' }} />
                <span>LeetCode &amp; Codeforces Arena • Problem of the Day</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
                Master Data Structures &amp; Algorithms in a zero-setup browser IDE.
              </h2>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: fgMuted }}>
                No more setting up GCC, CMake, or local debugger environments just to solve interview questions. Test your algorithms against rigorous edge cases with millisecond profiling.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                triggerLaunch({
                  starterTemplate: {
                    filename: 'solution.py',
                    content:
                      '# Problem 238: Product of Array Except Self\n# Time Complexity: O(n), Space Complexity: O(1)\n\ndef productExceptSelf(nums: list[int]) -> list[int]:\n    n = len(nums)\n    res = [1] * n\n    prefix = 1\n    for i in range(n):\n        res[i] = prefix\n        prefix *= nums[i]\n    suffix = 1\n    for i in range(n - 1, -1, -1):\n        res[i] *= suffix\n        suffix *= nums[i]\n    return res\n\nif __name__ == "__main__":\n    sample = [1, 2, 3, 4]\n    print(f"Input: {sample}")\n    print(f"Output: {productExceptSelf(sample)}")\n',
                  },
                })
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-transform active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: accent, color: accentText }}
            >
              <Play size={14} />
              <span>Solve Problem in Compillo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Problem Card & Test Runner */}
            <div
              className="lg:col-span-7 p-6 rounded-2xl border flex flex-col justify-between gap-6"
              style={{ backgroundColor: surfaceBg, borderColor }}
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b" style={{ borderColor }}>
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-base">238. Product of Array Except Self</span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      Medium
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: fgMuted }}>
                    <span>Acceptance: <strong style={{ color: fgPrimary }}>68.4%</strong></span>
                    <span>Submissions: <strong style={{ color: fgPrimary }}>2.4M</strong></span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {['Array', 'Prefix Sum', 'Two Pointers', 'O(n) Optimal'].map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 rounded border font-mono"
                      style={{ borderColor, backgroundColor: pageBg, color: fgMuted }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: fgPrimary }}>
                  Given an integer array <code className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: pageBg }}>nums</code>, return an array <code className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: pageBg }}>answer</code> such that <code className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: pageBg }}>answer[i]</code> is equal to the product of all the elements of <code className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: pageBg }}>nums</code> except <code className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: pageBg }}>nums[i]</code>.
                </p>

                {/* Interactive Test Runner Form */}
                <div className="pt-2 space-y-3">
                  <div className="text-xs font-semibold" style={{ color: fgPrimary }}>
                    Interactive Test Case Sandbox:
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={dsaInput}
                      onChange={(e) => setDsaInput(e.target.value)}
                      placeholder="e.g. [1, 2, 3, 4]"
                      aria-label="Input array"
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg border text-xs font-mono outline-none"
                      style={{
                        backgroundColor: pageBg,
                        borderColor,
                        color: fgPrimary,
                      }}
                    />
                    <button
                      type="button"
                      disabled={isDsaRunning}
                      onClick={handleRunDsaTest}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-transform active:scale-95"
                      style={{ backgroundColor: accent, color: accentText }}
                    >
                      <Play size={12} />
                      <span>{isDsaRunning ? 'Profiling...' : 'Run Test'}</span>
                    </button>
                  </div>

                  {/* Output Display */}
                  <div
                    className="p-3 rounded-lg border font-mono text-xs space-y-1"
                    style={{
                      backgroundColor: pageBg,
                      borderColor: dsaTestPassed ? borderColor : '#ef4444',
                    }}
                  >
                    <div className="flex items-center justify-between text-[11px]" style={{ color: fgMuted }}>
                      <span>Result:</span>
                      {dsaTestPassed && (
                        <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                          <Check size={11} /> 100% Test Cases Passed (24ms)
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-sm" style={{ color: dsaTestPassed ? accent : '#ef4444' }}>
                      {dsaOutput}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs" style={{ borderColor }}>
                <span style={{ color: fgMuted }}>Supports Python, C++20, and Java 17</span>
                <button
                  type="button"
                  onClick={() =>
                    triggerLaunch({
                      starterTemplate: {
                        filename: 'solution.cpp',
                        content:
                          '#include <iostream>\n#include <vector>\nusing namespace std;\n\nvector<int> productExceptSelf(vector<int>& nums) {\n    int n = nums.size();\n    vector<int> res(n, 1);\n    int prefix = 1;\n    for (int i = 0; i < n; i++) {\n        res[i] = prefix;\n        prefix *= nums[i];\n    }\n    int suffix = 1;\n    for (int i = n - 1; i >= 0; i--) {\n        res[i] *= suffix;\n        suffix *= nums[i];\n    }\n    return res;\n}\n\nint main() {\n    vector<int> nums = {1, 2, 3, 4};\n    vector<int> ans = productExceptSelf(nums);\n    for (int x : ans) cout << x << " ";\n    cout << endl;\n    return 0;\n}\n',
                      },
                    })
                  }
                  className="font-semibold hover:underline cursor-pointer"
                  style={{ color: accent }}
                >
                  Open in C++20 Mode &rarr;
                </button>
              </div>
            </div>

            {/* Right: DSA Roadmap Mastery Tracks */}
            <div
              className="lg:col-span-5 p-6 rounded-2xl border flex flex-col justify-between gap-6"
              style={{ backgroundColor: surfaceBg, borderColor }}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor }}>
                  <div className="flex items-center gap-2">
                    <Trophy size={16} style={{ color: '#eab308' }} />
                    <span className="font-bold text-sm">Compillo DSA Mastery Tracks</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold" style={{ backgroundColor: hexToRgba(accent, 0.12), color: accent }}>
                    Level 7
                  </span>
                </div>

                <div className="space-y-3.5">
                  {[
                    { topic: 'Arrays & Hashing', count: '32 / 32 Solved', pct: 100, color: '#10b981' },
                    { topic: 'Two Pointers & Sliding Window', count: '28 / 32 Solved', pct: 88, color: '#38bdf8' },
                    { topic: 'Binary Search & Stacks', count: '21 / 25 Solved', pct: 84, color: '#818cf8' },
                    { topic: 'Trees & Graph Traversal', count: '18 / 30 Solved', pct: 60, color: '#f59e0b' },
                    { topic: 'Dynamic Programming & Bitmask', count: '12 / 24 Solved', pct: 50, color: '#ec4899' },
                  ].map((track) => (
                    <div key={track.topic} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{track.topic}</span>
                        <span className="font-mono text-[11px]" style={{ color: fgMuted }}>{track.count}</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: pageBg }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${track.pct}%`, backgroundColor: track.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs" style={{ borderColor, backgroundColor: pageBg }}>
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-orange-500 shrink-0" />
                  <span className="font-medium">48-Day LeetCode Streak Synchronized</span>
                </div>
                <button
                  type="button"
                  onClick={() => triggerLaunch({ openEduLabs: true })}
                  className="font-semibold hover:underline shrink-0"
                  style={{ color: accent }}
                >
                  View Roadmaps
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Replit-Style Live Real-Time Multiplayer Collaboration Showcase */}
        <section
          id="multiplayer"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t"
          style={{ borderColor }}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="max-w-2xl space-y-3">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold"
                style={{ borderColor, backgroundColor: surfaceBg, color: fgPrimary }}
              >
                <Users size={14} style={{ color: '#ec4899' }} />
                <span>Peer-to-Peer Collaborative Coding</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
                Code together live with teammates and lab partners.
              </h2>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: fgMuted }}>
                Compillo features Google Docs-style multi-cursor synchronization, integrated audio rooms, and permission controls—perfect for remote hackathons, pair programming, and professor office hours.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCopyRoomLink}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                style={{ borderColor, backgroundColor: surfaceBg, color: fgPrimary }}
              >
                {copiedRoomLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedRoomLink ? 'Room Link Copied!' : 'Copy Room Link'}</span>
              </button>
              <button
                type="button"
                onClick={() => triggerLaunch({ sideBarView: 'explorer' })}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-transform active:scale-[0.98] cursor-pointer"
                style={{ backgroundColor: accent, color: accentText }}
              >
                <span>Start Multiplayer Room</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Interactive Live Multiplayer Code Canvas */}
          <div
            className="rounded-2xl border overflow-hidden shadow-2xl"
            style={{ backgroundColor: surfaceBg, borderColor }}
          >
            {/* Editor Top Bar with Peer Avatars */}
            <div
              className="px-5 py-3 border-b flex flex-wrap items-center justify-between gap-4"
              style={{ borderColor, backgroundColor: currentTheme.ui.titleBarBg }}
            >
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono font-semibold">workspace/distributed_consensus.py</span>
                <span className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-950/20 text-emerald-300">
                  Live Syncing • 24ms WebRTC
                </span>
              </div>

              {/* Connected Peer Avatars */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center -space-x-2">
                  <div
                    className="w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-[10px] shadow"
                    style={{ borderColor: surfaceBg, backgroundColor: '#8b5cf6', color: '#fff' }}
                    title="Priya S. (Frontend Lead)"
                  >
                    PS
                  </div>
                  <div
                    className="w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-[10px] shadow"
                    style={{ borderColor: surfaceBg, backgroundColor: '#06b6d4', color: '#fff' }}
                    title="Marcus V. (Backend Lead)"
                  >
                    MV
                  </div>
                  <div
                    className="w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-[10px] shadow"
                    style={{ borderColor: surfaceBg, backgroundColor: '#f59e0b', color: '#fff' }}
                    title="Elena R. (Professor / TA)"
                  >
                    ER
                  </div>
                </div>
                <span className="text-xs font-medium" style={{ color: fgMuted }}>3 collaborators typing</span>
              </div>
            </div>

            {/* Code Body with Multiplayer Cursors */}
            <div className="p-6 font-mono text-xs sm:text-[13px] leading-relaxed relative overflow-x-auto" style={{ backgroundColor: pageBg }}>
              <div className="space-y-2">
                <div className="text-emerald-500/80"># Compillo Real-Time Distributed Consensus Node</div>
                <div><span className="text-purple-400">class</span> <span className="text-yellow-300 font-bold">RaftLeaderNode</span>:</div>
                <div className="pl-4">
                  <span className="text-purple-400">def</span> <span className="text-blue-300">__init__</span>(self, node_id: <span className="text-emerald-300">str</span>, peers: <span className="text-emerald-300">list</span>):
                </div>
                <div className="pl-8">
                  self.node_id = node_id
                </div>
                <div className="pl-8 relative inline-block">
                  self.current_term = <span className="text-amber-300 font-bold">42</span>
                  {/* Cursor 1: Priya S. */}
                  <span className="absolute -top-5 left-24 px-1.5 py-0.5 rounded text-[10px] text-white font-sans font-semibold bg-purple-500 shadow-md flex items-center gap-1">
                    Priya S.
                  </span>
                  <span className="inline-block w-0.5 h-4 bg-purple-500 animate-pulse ml-1 align-middle" />
                </div>
                <div className="pl-8">
                  self.voted_for = <span className="text-purple-400">None</span>
                </div>
                <div className="pl-8 pt-1">
                  <span className="text-purple-400">async def</span> <span className="text-blue-300">broadcast_heartbeat</span>(self):
                </div>
                <div className="pl-12 relative inline-block">
                  <span className="text-purple-400">for</span> peer <span className="text-purple-400">in</span> self.peers:
                  {/* Cursor 2: Marcus V. */}
                  <span className="absolute -top-5 left-28 px-1.5 py-0.5 rounded text-[10px] text-white font-sans font-semibold bg-cyan-500 shadow-md flex items-center gap-1">
                    Marcus V.
                  </span>
                  <span className="inline-block w-0.5 h-4 bg-cyan-500 animate-pulse ml-1 align-middle" />
                </div>
                <div className="pl-16">
                  <span className="text-purple-400">await</span> peer.send_append_entries(term=self.current_term)
                </div>
              </div>

              {/* Floating Inline Code Review Comment Box */}
              <div
                className="mt-6 p-3.5 rounded-xl border max-w-md shadow-lg"
                style={{ backgroundColor: surfaceBg, borderColor: '#f59e0b' }}
              >
                <div className="flex items-center justify-between text-xs pb-1.5 border-b" style={{ borderColor }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="font-bold">Elena R. (Professor / TA)</span>
                  </div>
                  <span className="text-[10px]" style={{ color: fgMuted }}>Just now</span>
                </div>
                <p className="text-xs pt-1.5" style={{ color: fgPrimary }}>
                  &ldquo;Excellent heartbeat implementation! Verified that split-brain network partitions are handled safely in sub-50ms.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. GitHub-Style 365-Day Activity Heatmap & Achievements */}
        <section
          id="activity-grid"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t"
          style={{ borderColor }}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="max-w-2xl space-y-3">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold"
                style={{ borderColor, backgroundColor: surfaceBg, color: fgPrimary }}
              >
                <Flame size={14} style={{ color: '#f97316' }} />
                <span>Developer Habits &amp; 365-Day Streak Grid</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
                Your progress, verified by real code commits and lab runs.
              </h2>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: fgMuted }}>
                Track daily programming streaks, university lab milestone submissions, and peer code reviews. Connect your GitHub account to sync commits effortlessly.
              </p>
            </div>

            <button
              type="button"
              onClick={() => triggerLaunch({ openSignIn: true })}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 border transition-transform active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: surfaceBg, borderColor, color: fgPrimary }}
            >
              <GitBranch size={14} />
              <span>Connect GitHub Profile</span>
            </button>
          </div>

          {/* Activity Grid Card */}
          <div
            className="p-6 sm:p-8 rounded-2xl border space-y-6"
            style={{ backgroundColor: surfaceBg, borderColor }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-2xl font-bold tabular-nums" style={{ color: accent }}>1,248</div>
                  <div className="text-xs" style={{ color: fgMuted }}>Contributions in 2026</div>
                </div>
                <div className="h-8 w-px" style={{ backgroundColor: borderColor }} />
                <div>
                  <div className="text-2xl font-bold tabular-nums text-orange-500">48 Days 🔥</div>
                  <div className="text-xs" style={{ color: fgMuted }}>Current Daily Streak</div>
                </div>
                <div className="h-8 w-px hidden sm:block" style={{ backgroundColor: borderColor }} />
                <div className="hidden sm:block">
                  <div className="text-2xl font-bold tabular-nums text-emerald-400">Top 3%</div>
                  <div className="text-xs" style={{ color: fgMuted }}>Campus Engineering Rank</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: fgMuted }}>
                <span>Less</span>
                <span className="w-3 h-3 rounded-sm bg-emerald-950/40 border border-emerald-900/40" />
                <span className="w-3 h-3 rounded-sm bg-emerald-800/60" />
                <span className="w-3 h-3 rounded-sm bg-emerald-600" />
                <span className="w-3 h-3 rounded-sm bg-emerald-400" />
                <span>More</span>
              </div>
            </div>

            {/* Visual Heatmap Grid (52 weeks x 7 days) */}
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[700px] flex gap-1">
                {Array.from({ length: 48 }).map((_, colIdx) => (
                  <div key={colIdx} className="flex flex-col gap-1">
                    {Array.from({ length: 7 }).map((_, rowIdx) => {
                      const seed = (colIdx * 7 + rowIdx) % 17;
                      const intensity =
                        seed === 0 ? 'bg-emerald-950/30' :
                        seed < 4 ? 'bg-emerald-800/70' :
                        seed < 9 ? 'bg-emerald-600' :
                        seed < 14 ? 'bg-emerald-400' : 'bg-emerald-300';
                      return (
                        <div
                          key={rowIdx}
                          title={`Day ${colIdx * 7 + rowIdx}: ${seed * 2} commits`}
                          className={`w-3 h-3 rounded-xs ${intensity} hover:scale-125 transition-transform duration-100 cursor-pointer`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Achievement Badges Row */}
            <div className="pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ borderColor }}>
              {[
                { title: 'Algorithms Grandmaster', subtitle: 'Ranked in top 5% of DSA Arena', icon: Trophy, color: '#eab308' },
                { title: 'Graphics BGI Pioneer', subtitle: 'Rendered C++ Mandelbrot framebuffer', icon: Sparkles, color: '#06b6d4' },
                { title: 'AST Compiler Architect', subtitle: 'Executed PyCalc HTTP on port 5050', icon: Cpu, color: '#8b5cf6' },
                { title: 'Zero-Leak Sandboxing', subtitle: 'Verified 15 isolated language runtimes', icon: Shield, color: '#10b981' },
              ].map((badge) => {
                const Icon = badge.icon;
                return (
                  <div
                    key={badge.title}
                    className="p-3.5 rounded-xl border flex items-start gap-3"
                    style={{ borderColor, backgroundColor: pageBg }}
                  >
                    <Icon size={18} style={{ color: badge.color }} className="shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold leading-tight">{badge.title}</div>
                      <div className="text-[11px] leading-tight pt-1" style={{ color: fgMuted }}>{badge.subtitle}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 1. Cursor-Style AI Bug Diagnoser & Auto-Fixer */}
        <section
          id="ai-debugger"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t"
          style={{ borderColor }}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="max-w-2xl space-y-3">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold"
                style={{ borderColor, backgroundColor: surfaceBg, color: fgPrimary }}
              >
                <Bug size={14} style={{ color: '#ef4444' }} />
                <span>Cursor-Grade AI Diagnostic Engine</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
                Never get stuck on compiler crashes or segfaults again.
              </h2>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: fgMuted }}>
                Compillo’s integrated AI debugger analyzes compiler output, traces core dumps, and stages line-by-line diff patches directly into your editor with one click.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {[
                { id: 'segfault', label: 'C++ Segfault' },
                { id: 'recursion', label: 'Python Recursion' },
                { id: 'sql', label: 'SQL Ambiguous Join' },
              ].map((bug) => (
                <button
                  key={bug.id}
                  type="button"
                  onClick={() => {
                    setActiveBugId(bug.id as any);
                    setIsBugFixed(false);
                  }}
                  className="px-3.5 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  style={
                    activeBugId === bug.id
                      ? { backgroundColor: accent, color: accentText, borderColor: accent }
                      : { backgroundColor: surfaceBg, borderColor, color: fgMuted }
                  }
                >
                  {bug.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive AI Code Fix Sandbox */}
          <div
            className="rounded-2xl border overflow-hidden shadow-2xl"
            style={{ backgroundColor: surfaceBg, borderColor }}
          >
            <div
              className="px-5 py-3 border-b flex flex-wrap items-center justify-between gap-4"
              style={{ borderColor, backgroundColor: currentTheme.ui.titleBarBg }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-semibold">
                  {activeBugId === 'segfault'
                    ? 'src/tree_node.cpp'
                    : activeBugId === 'recursion'
                    ? 'algorithms/factorial.py'
                    : 'database/orders_query.sql'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded border border-red-500/30 bg-red-950/20 text-red-300">
                  {activeBugId === 'segfault'
                    ? 'SIGSEGV: Nullptr Exception'
                    : activeBugId === 'recursion'
                    ? 'RecursionError: Maximum depth exceeded'
                    : 'Query Error: Ambiguous column id'}
                </span>
              </div>

              <button
                type="button"
                disabled={isFixingBug}
                onClick={handleTriggerAiFix}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-transform active:scale-95"
                style={{ backgroundColor: accent, color: accentText }}
              >
                <Sparkles size={13} />
                <span>{isFixingBug ? 'Diagnosing AST...' : isBugFixed ? 'Re-Analyze Code' : 'Diagnose & Auto-Fix with AI'}</span>
              </button>
            </div>

            {/* Side-by-Side Before vs After Diff Preview */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs" style={{ backgroundColor: pageBg }}>
              {/* Buggy Code Left */}
              <div className="space-y-2 p-4 rounded-xl border border-red-500/30 bg-red-950/10">
                <div className="text-[11px] font-sans font-bold text-red-400 flex items-center justify-between pb-2 border-b border-red-500/20">
                  <span>Detected Defect in Code</span>
                  <span>Exit Code 139</span>
                </div>
                {activeBugId === 'segfault' ? (
                  <pre className="text-red-300 whitespace-pre leading-relaxed overflow-x-auto">
{`// Unsafe pointer access
void printVal(Node* root) {
    // BUG: Missing nullptr guard!
    cout << root->val << endl;
    printVal(root->left);
}`}
                  </pre>
                ) : activeBugId === 'recursion' ? (
                  <pre className="text-red-300 whitespace-pre leading-relaxed overflow-x-auto">
{`# Unbounded recursion
def compute_factorial(n: int) -> int:
    # BUG: Missing base case for n <= 1
    return n * compute_factorial(n - 1)`}
                  </pre>
                ) : (
                  <pre className="text-red-300 whitespace-pre leading-relaxed overflow-x-auto">
{`-- Ambiguous field selection
SELECT id, customer_name, total
FROM orders
JOIN customers ON orders.id = customers.id;
-- BUG: 'id' exists on both tables!`}
                  </pre>
                )}
              </div>

              {/* AI Auto-Fixed Code Right */}
              <div className="space-y-2 p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10">
                <div className="text-[11px] font-sans font-bold text-emerald-400 flex items-center justify-between pb-2 border-b border-emerald-500/20">
                  <span>AI Recommended Patch</span>
                  <span>{isBugFixed ? '100% Fixed & Verified' : 'Click "Diagnose" above'}</span>
                </div>
                {isBugFixed ? (
                  activeBugId === 'segfault' ? (
                    <pre className="text-emerald-300 whitespace-pre leading-relaxed overflow-x-auto">
{`// Fixed with null safety guard
void printVal(Node* root) {
    if (root == nullptr) return; // Guard added!
    cout << root->val << endl;
    if (root->left) printVal(root->left);
}`}
                    </pre>
                  ) : activeBugId === 'recursion' ? (
                    <pre className="text-emerald-300 whitespace-pre leading-relaxed overflow-x-auto">
{`# Fixed with strict termination
def compute_factorial(n: int) -> int:
    if n <= 1:
        return 1  # Base case added!
    return n * compute_factorial(n - 1)`}
                    </pre>
                  ) : (
                    <pre className="text-emerald-300 whitespace-pre leading-relaxed overflow-x-auto">
{`-- Fixed with table prefix disambiguation
SELECT orders.id AS order_id, customers.name, orders.total
FROM orders
JOIN customers ON orders.customer_id = customers.id;`}
                    </pre>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-2" style={{ color: fgMuted }}>
                    <RefreshCw size={20} className="animate-spin text-emerald-400/50" />
                    <span>Click &ldquo;Diagnose &amp; Auto-Fix with AI&rdquo; to simulate instant agentic repair.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="px-6 py-3.5 border-t flex flex-wrap items-center justify-between gap-3 text-xs" style={{ borderColor }}>
              <span style={{ color: fgMuted }}>
                {isBugFixed
                  ? 'Explanation: Guard condition added to prevent dereferencing null pointers.'
                  : 'Compillo AI inspects language ASTs and static compiler diagnostics.'}
              </span>
              <button
                type="button"
                onClick={() => triggerLaunch()}
                className="font-semibold hover:underline cursor-pointer"
                style={{ color: accent }}
              >
                Apply Patch in Compillo Editor &rarr;
              </button>
            </div>
          </div>
        </section>

        {/* 2. Vercel / Railway-Style 1-Click Cloud Deployment Simulator */}
        <section
          id="cloud-deploy"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t"
          style={{ borderColor }}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="max-w-2xl space-y-3">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold"
                style={{ borderColor, backgroundColor: surfaceBg, color: fgPrimary }}
              >
                <Rocket size={14} style={{ color: '#38bdf8' }} />
                <span>Vercel-Grade Cloud Deployment</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
                Ship your full-stack app to the world in seconds.
              </h2>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: fgMuted }}>
                Deploy Python HTTP backends, React apps, and REST APIs to a live hosted Compillo URL with automatic SSL encryption and instant container proxying.
              </p>
            </div>

            <button
              type="button"
              onClick={() => triggerLaunch({ startPyCalcDemo: true })}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-transform active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: accent, color: accentText }}
            >
              <span>Deploy Workspace App Now</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Deployment Interactive Card */}
          <div
            className="p-6 sm:p-8 rounded-2xl border space-y-6"
            style={{ backgroundColor: surfaceBg, borderColor }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left Config Box */}
              <div className="lg:col-span-5 space-y-4">
                <div className="grid grid-cols-2 gap-2 p-1 rounded-lg border" style={{ borderColor, backgroundColor: pageBg }}>
                  <button
                    type="button"
                    onClick={() => {
                      setDeployMode('pycalc');
                      setDeployError(null);
                      if (deploySubdomain === 'my-site') setDeploySubdomain('ishant-calculator');
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                    style={
                      deployMode === 'pycalc'
                        ? { backgroundColor: accent, color: accentText }
                        : { color: fgMuted }
                    }
                  >
                    PyCalc Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeployMode('custom');
                      setDeployError(null);
                      if (deploySubdomain === 'ishant-calculator') setDeploySubdomain('my-site');
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                    style={
                      deployMode === 'custom'
                        ? { backgroundColor: accent, color: accentText }
                        : { color: fgMuted }
                    }
                  >
                    Host Your Files
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: fgPrimary }} htmlFor="subdomain-input">
                    Choose Your App Route Slug:
                  </label>
                  <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor, backgroundColor: pageBg }}>
                    <span className="px-3 py-2 text-xs font-mono border-r shrink-0" style={{ borderColor, color: fgMuted }}>
                      /hosted/
                    </span>
                    <input
                      id="subdomain-input"
                      type="text"
                      value={deploySubdomain}
                      onChange={(e) => setDeploySubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="flex-1 min-w-0 px-3 py-2 text-xs font-mono outline-none"
                      style={{ backgroundColor: pageBg, color: fgPrimary }}
                    />
                  </div>
                </div>

                {deployMode === 'custom' && (
                  <div className="space-y-2.5 p-3 rounded-lg border" style={{ borderColor, backgroundColor: pageBg }}>
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="custom-host-file-input"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer hover:opacity-90"
                        style={{ borderColor, backgroundColor: surfaceBg, color: fgPrimary }}
                      >
                        <Upload size={13} />
                        <span>Upload HTML / CSS / JS / PY</span>
                      </label>
                      <input
                        id="custom-host-file-input"
                        type="file"
                        multiple
                        accept=".html,.htm,.css,.js,.mjs,.json,.svg,.txt,.md,.xml,.csv,.py"
                        onChange={handleDeployFileUpload}
                        className="hidden"
                      />
                      {customFiles.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setCustomFiles([])}
                          className="text-[11px] inline-flex items-center gap-1 opacity-75 hover:opacity-100 cursor-pointer"
                          style={{ color: fgMuted }}
                        >
                          <X size={12} />
                          <span>Clear ({customFiles.length})</span>
                        </button>
                      )}
                    </div>

                    {customFiles.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {customFiles.map((f) => (
                          <span
                            key={f.path}
                            className="text-[11px] font-mono px-2 py-0.5 rounded border"
                            style={{ borderColor, color: fgPrimary }}
                          >
                            {f.path}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px]" style={{ color: fgMuted }}>Or paste HTML code directly:</span>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomHtmlDraft(
                                `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"><title>My Hosted Page</title></head>\n<body style="font-family:system-ui;background:#0f172a;color:#f8fafc;padding:40px">\n  <h1>Hello from Compillo Cloud!</h1>\n  <p>This custom HTML page is hosted live on Compillo.</p>\n</body>\n</html>`
                              )
                            }
                            className="text-[11px] font-semibold underline cursor-pointer"
                            style={{ color: accent }}
                          >
                            Load Sample HTML
                          </button>
                        </div>
                        <textarea
                          rows={3}
                          value={customHtmlDraft}
                          onChange={(e) => setCustomHtmlDraft(e.target.value)}
                          placeholder="<!DOCTYPE html><html><body><h1>My Page</h1></body></html>"
                          className="w-full p-2 rounded border text-[11px] font-mono outline-none resize-y"
                          style={{ borderColor, backgroundColor: surfaceBg, color: fgPrimary }}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: fgMuted }}>
                  <span className="flex items-center gap-1"><Check size={12} className="text-emerald-400" /> Free SSL</span>
                  <span className="flex items-center gap-1"><Check size={12} className="text-emerald-400" /> {deployMode === 'custom' ? 'Static & Python Supported' : 'Port 5050 Forwarding'}</span>
                  <span className="flex items-center gap-1"><Check size={12} className="text-emerald-400" /> Instant Live URL</span>
                </div>

                <button
                  type="button"
                  disabled={isDeploying}
                  onClick={handleSimulateDeploy}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-transform active:scale-95 cursor-pointer"
                  style={{ backgroundColor: accent, color: accentText }}
                >
                  <Rocket size={14} />
                  <span>
                    {isDeploying
                      ? 'Provisioning Live Site...'
                      : deployMode === 'custom'
                        ? 'Host My Files Live'
                        : 'Trigger Instant Cloud Deploy'}
                  </span>
                </button>
              </div>

              {/* Right Build Logs & Status Box */}
              <div className="lg:col-span-7 p-4 sm:p-5 rounded-xl border font-mono text-xs space-y-3" style={{ backgroundColor: pageBg, borderColor }}>
                <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor }}>
                  <span className="text-[11px] font-sans font-semibold" style={{ color: fgMuted }}>Deployment Pipeline Stream</span>
                  <span className="text-[10px] px-2 py-0.5 rounded border" style={{ borderColor, color: deployedSuccess ? '#10b981' : deployError ? '#f87171' : accent }}>
                    {deployedSuccess ? 'Status: Live (HTTP 200)' : deployError ? 'Status: Failed' : isDeploying ? 'Status: Building...' : 'Status: Ready'}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] leading-relaxed">
                  <div className="text-emerald-400 flex items-center gap-2">
                    <Check size={12} />
                    <span>
                      {deployMode === 'custom'
                        ? `[Step 1] Validating ${customFiles.length || 1} uploaded web file(s)...`
                        : '[Step 1] Packaging Python AST server & frontend assets...'}
                    </span>
                  </div>
                  {(deployStep >= 2 || deployedSuccess) && (
                    <div className="text-emerald-400 flex items-center gap-2">
                      <Check size={12} />
                      <span>
                        {deployMode === 'custom'
                          ? '[Step 2] Publishing files to Compillo static & Python edge host...'
                          : '[Step 2] Provisioning container runtime on port 5050...'}
                      </span>
                    </div>
                  )}
                  {(deployStep >= 3 || deployedSuccess) && (
                    <div className="text-emerald-400 flex items-center gap-2">
                      <Check size={12} />
                      <span>[Step 3] Route live at /hosted/{deploySubdomain || 'ishant-calculator'}/</span>
                    </div>
                  )}
                  {deployError && (
                    <div className="pt-2 text-xs text-rose-400 font-sans">
                      {deployError}
                    </div>
                  )}
                  {deployedSuccess && (
                    <div className="pt-2 border-t mt-2 flex items-center justify-between gap-3 font-sans flex-wrap">
                      <a
                        href={deployedLiveUrl || `/hosted/${deploySubdomain || 'ishant-calculator'}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1.5 break-all"
                      >
                        <ExternalLink size={13} className="shrink-0" />
                        <span>{deployedLiveUrl || `/hosted/${deploySubdomain || 'ishant-calculator'}/`}</span>
                      </a>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold shrink-0">
                        Live Reverse Proxy Active
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. HackerRank-Style Automated Lab Grading & Skill Certification */}
        <section
          id="certification"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t"
          style={{ borderColor }}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="max-w-2xl space-y-3">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold"
                style={{ borderColor, backgroundColor: surfaceBg, color: fgPrimary }}
              >
                <Award size={14} style={{ color: '#a855f7' }} />
                <span>HackerRank-Grade Automated Lab Grading</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
                Instant university test suite evaluation and verified skill certs.
              </h2>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: fgMuted }}>
                Compillo evaluates student submissions against public and hidden test cases, profiling CPU execution time, memory bounds, and algorithmic correctness automatically.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClaimLabCert}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 border transition-transform active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: surfaceBg, borderColor, color: fgPrimary }}
            >
              <Award size={14} style={{ color: '#a855f7' }} />
              <span>{claimedCert ? 'Certificate Verified & Saved!' : 'Claim University Lab Certificate'}</span>
            </button>
          </div>

          {/* Test Suite Grading Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 p-6 rounded-2xl border space-y-4" style={{ backgroundColor: surfaceBg, borderColor }}>
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor }}>
                <span className="text-sm font-bold">University Lab Test Suite: RTU_CS302_BinarySearchTree</span>
                <span className="text-xs font-mono font-bold text-emerald-400">Score: 100 / 100</span>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                {[
                  { test: 'Test Case 1: Standard Binary Search Insert', time: '4ms', mem: '12.4 MB', status: 'Passed' },
                  { test: 'Test Case 2: In-Order Traversal Tree Balancing', time: '7ms', mem: '13.1 MB', status: 'Passed' },
                  { test: 'Test Case 3: Edge Case (Empty Tree & Single Node)', time: '2ms', mem: '11.8 MB', status: 'Passed' },
                  { test: 'Test Case 4 [Hidden]: 100,000 Random Keys Stress Test', time: '19ms', mem: '14.2 MB', status: 'Passed' },
                ].map((tc) => (
                  <div
                    key={tc.test}
                    className="p-3 rounded-lg border flex items-center justify-between gap-4"
                    style={{ backgroundColor: pageBg, borderColor }}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      <span className="truncate" style={{ color: fgPrimary }}>{tc.test}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-[11px]" style={{ color: fgMuted }}>
                      <span>{tc.time}</span>
                      <span>{tc.mem}</span>
                      <span className="px-2 py-0.5 rounded font-bold text-emerald-400 bg-emerald-950/30">
                        {tc.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Certificate Card */}
            <div className="lg:col-span-4 p-6 rounded-2xl border flex flex-col justify-between gap-6" style={{ backgroundColor: surfaceBg, borderColor }}>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: '#a855f7' }}>
                  <Award size={16} />
                  <span>Verified Credential</span>
                </div>
                <h3 className="text-base font-bold">Compillo Systems &amp; Data Structures Specialist</h3>
                <p className="text-xs leading-relaxed" style={{ color: fgMuted }}>
                  Accredited evaluation covering C++ memory management, BGI framebuffers, and Python AST computation trees.
                </p>
                <div className="p-3 rounded-lg border font-mono text-[11px] space-y-1" style={{ backgroundColor: pageBg, borderColor }}>
                  <div style={{ color: fgMuted }}>Credential ID:</div>
                  <div className="text-purple-300 font-bold truncate">COMP-2026-BTECH-8942-VERIFIED</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => triggerLaunch({ openEduLabs: true })}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-transform active:scale-95 cursor-pointer"
                style={{ backgroundColor: accent, color: accentText }}
              >
                <span>Browse All 40+ University Lab Modules</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </section>

        {/* 4. Complete Product Suite Architectural Grid */}
        <section
          id="suite"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t"
          style={{ borderColor }}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="max-w-2xl space-y-2">
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Everything included in the Compillo product suite.
              </h2>
              <p className="text-sm sm:text-[15px]" style={{ color: fgMuted }}>
                Six integrated subsystems working together across desktop and mobile viewports.
              </p>
            </div>

            {/* Live Studio Palette Picker */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-xs font-medium mr-1" style={{ color: fgMuted }}>
                Theme:
              </span>
              {themeSwatches.map((t) => {
                const selected = t.id === currentTheme.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    title={t.label}
                    onClick={() => onSelectTheme(t.id)}
                    className="w-7 h-7 rounded-lg border flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
                    style={{
                      backgroundColor: t.ui.editorBg,
                      borderColor: selected ? t.ui.accent : borderColor,
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: t.ui.accent }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="rounded-2xl border overflow-hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px"
            style={{ borderColor, backgroundColor: borderColor }}
          >
            {SUITE_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="p-6 flex flex-col justify-between gap-4"
                  style={{ backgroundColor: surfaceBg }}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Icon size={18} style={{ color: accent }} />
                      <span className="font-compillo-mono text-[11px]" style={{ color: fgMuted }}>
                        {pillar.spec}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold tracking-tight">{pillar.title}</h3>
                    <p className="text-xs sm:text-[13px] leading-relaxed" style={{ color: fgMuted }}>
                      {pillar.summary}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. Enterprise Customer Testimonials */}
        <section
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t"
          style={{ borderColor }}
        >
          <div className="max-w-2xl space-y-2 mb-10">
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Trusted by engineering leaders and educators.
            </h2>
            <p className="text-sm sm:text-[15px]" style={{ color: fgMuted }}>
              See how companies and universities rely on Compillo Studio daily.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CUSTOMER_TESTIMONIALS.map((test) => (
              <div
                key={test.author}
                className="p-6 rounded-2xl border flex flex-col justify-between gap-6"
                style={{ backgroundColor: surfaceBg, borderColor }}
              >
                <p className="text-sm sm:text-base leading-relaxed italic" style={{ color: fgPrimary }}>
                  &ldquo;{test.quote}&rdquo;
                </p>
                <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor }}>
                  <div>
                    <div className="text-sm font-bold">{test.author}</div>
                    <div className="text-xs" style={{ color: fgMuted }}>
                      {test.role} · {test.company}
                    </div>
                  </div>
                  <Shield size={20} style={{ color: accent }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Starter Templates Gallery */}
        <section
          id="templates"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t"
          style={{ borderColor }}
        >
          <div className="max-w-2xl space-y-2 mb-8">
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Launch ready-to-run projects in one click.
            </h2>
            <p className="text-sm sm:text-[15px]" style={{ color: fgMuted }}>
              Choose a pre-configured workspace template to enter Compillo Studio with files and panels already wired.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {STARTER_TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                className="p-5 rounded-xl border flex flex-col justify-between gap-6"
                style={{ backgroundColor: surfaceBg, borderColor }}
              >
                <div className="space-y-2">
                  <div className="text-xs" style={{ color: fgMuted }}>
                    {tpl.meta}
                  </div>
                  <h3 className="text-base font-semibold tracking-tight">{tpl.title}</h3>
                  <p className="text-xs sm:text-[13px] leading-relaxed" style={{ color: fgMuted }}>
                    {tpl.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => triggerLaunch(tpl.launchOptions)}
                  className="w-full inline-flex items-center justify-between px-3.5 py-2 rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  style={{
                    borderColor,
                    backgroundColor: pageBg,
                    color: fgPrimary,
                  }}
                >
                  <span>{tpl.actionLabel}</span>
                  <ArrowRight size={13} style={{ color: accent }} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 7. Editions, Capability Matrix & Product FAQ */}
        <section
          id="editions"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t space-y-14"
          style={{ borderColor }}
        >
          <div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
              <div className="max-w-2xl space-y-2">
                <h2
                  className="text-2xl sm:text-3xl font-bold tracking-tight"
                  style={{ textWrap: 'balance' }}
                >
                  Simple editions for solo builders, labs, and teams.
                </h2>
                <p className="text-sm sm:text-[15px]" style={{ color: fgMuted }}>
                  Core compilation, terminal shell, and Live Canvas preview are completely free to run in your browser.
                </p>
              </div>

              <div
                className="inline-flex items-center p-1 rounded-lg border shrink-0"
                style={{ borderColor, backgroundColor: surfaceBg }}
                role="group"
                aria-label="Billing cycle"
              >
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  style={
                    billingCycle === 'monthly'
                      ? { backgroundColor: accent, color: accentText }
                      : { color: fgMuted }
                  }
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  style={
                    billingCycle === 'annual'
                      ? { backgroundColor: accent, color: accentText }
                      : { color: fgMuted }
                  }
                >
                  Annual (Save 25%)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
              {PRODUCT_EDITIONS.map((tier) => {
                const displayPrice =
                  billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;
                return (
                  <div
                    key={tier.id}
                    className="p-6 rounded-xl border flex flex-col justify-between gap-6"
                    style={{
                      backgroundColor: surfaceBg,
                      borderColor: tier.highlight ? accent : borderColor,
                    }}
                  >
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-lg font-bold tracking-tight">{tier.name}</h3>
                          {tier.highlight && (
                            <span className="text-xs font-semibold" style={{ color: accent }}>
                              Popular for Labs
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: fgMuted }}>
                          {tier.audience}
                        </p>
                      </div>

                      <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-3xl font-bold tabular-nums tracking-tight">
                          {displayPrice}
                        </span>
                        <span className="text-xs" style={{ color: fgMuted }}>
                          {tier.unitLabel}
                        </span>
                      </div>

                      <ul className="space-y-2.5 pt-3 border-t text-xs sm:text-[13px]" style={{ borderColor }}>
                        {tier.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2.5">
                            <Check size={14} className="mt-0.5 shrink-0" style={{ color: accent }} />
                            <span style={{ color: fgPrimary }}>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => triggerLaunch(tier.launchOptions)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 border transition-transform active:scale-[0.98] cursor-pointer"
                      style={
                        tier.highlight
                          ? {
                              backgroundColor: accent,
                              color: accentText,
                              borderColor: accent,
                            }
                          : {
                              backgroundColor: pageBg,
                              color: fgPrimary,
                              borderColor,
                            }
                      }
                    >
                      <span>{tier.ctaLabel}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div
              className="rounded-xl border overflow-x-auto"
              style={{ borderColor, backgroundColor: surfaceBg }}
            >
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor, color: fgMuted }}>
                    <th className="py-3.5 px-4 font-semibold">Workspace Capability</th>
                    <th className="py-3.5 px-4 font-semibold">Community ($0)</th>
                    <th className="py-3.5 px-4 font-semibold">Student &amp; Lab ($0)</th>
                    <th className="py-3.5 px-4 font-semibold">
                      Pro Studio ({billingCycle === 'annual' ? '$9/mo' : '$12/mo'})
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor }}>
                  {COMPARISON_MATRIX.map((row) => (
                    <tr key={row.capability} style={{ borderColor }}>
                      <td className="py-3.5 px-4 font-medium">{row.capability}</td>
                      <td className="py-3.5 px-4 tabular-nums" style={{ color: fgMuted }}>
                        {row.community}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums" style={{ color: fgPrimary }}>
                        {row.campus}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums font-medium" style={{ color: accent }}>
                        {row.pro}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderColor }}>
                    <td className="py-3.5 px-4 font-medium">Enterprise On-Premises SLA</td>
                    <td className="py-3.5 px-4" style={{ color: fgMuted }}>
                      <Minus size={14} aria-label="Not included" />
                    </td>
                    <td className="py-3.5 px-4" style={{ color: fgMuted }}>
                      <Minus size={14} aria-label="Not included" />
                    </td>
                    <td className="py-3.5 px-4" style={{ color: fgMuted }}>
                      Optional add-on
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Product Questions Accordion */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
            <div className="lg:col-span-4 space-y-2">
              <h3 className="text-xl font-bold tracking-tight">Frequently asked questions</h3>
              <p className="text-sm leading-relaxed" style={{ color: fgMuted }}>
                Technical answers on Compillo Studio’s container shell, supported languages, and browser workflow.
              </p>
            </div>
            <div className="lg:col-span-8 divide-y rounded-xl border overflow-hidden" style={{ borderColor, backgroundColor: surfaceBg }}>
              {PRODUCT_FAQS.map((item, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div key={item.q} style={{ borderColor }}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <span className="text-sm font-semibold">{item.q}</span>
                      <ChevronDown
                        size={16}
                        style={{
                          color: accent,
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 180ms ease',
                        }}
                        className="shrink-0"
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-xs sm:text-sm leading-relaxed" style={{ color: fgMuted }}>
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 8. Final Product CTA & Theme Switcher */}
        <section
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t"
          style={{ borderColor }}
        >
          <div
            className="p-6 sm:p-10 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            style={{ backgroundColor: surfaceBg, borderColor }}
          >
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2.5">
                <img
                  src="/compillo-logo.png"
                  alt="Compillo Software Group"
                  referrerPolicy="no-referrer"
                  className="h-6 w-auto object-contain shrink-0"
                />
                <span className="text-sm font-semibold">Compillo Software Group</span>
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Start building inside Compillo Studio today.
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: fgMuted }}>
                Select your studio color palette and launch the live IDE with animated boot or instant startup.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
              <label className="sr-only" htmlFor="landing-theme-select">
                Select Studio Theme
              </label>
              <select
                id="landing-theme-select"
                value={currentTheme.id}
                onChange={(e) => onSelectTheme(e.target.value)}
                className="px-3 py-2.5 rounded-lg border text-xs sm:text-sm font-medium outline-none cursor-pointer"
                style={{
                  backgroundColor: pageBg,
                  borderColor,
                  color: fgPrimary,
                }}
              >
                {Object.values(THEMES).map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    Theme: {theme.label}
                  </option>
                ))}
              </select>

              <button
                id="landing-footer-open-editor"
                type="button"
                onClick={() => triggerLaunch()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-transform active:scale-[0.98]"
                style={{ backgroundColor: accent, color: accentText }}
              >
                <span>
                  {launchMode === 'animated' ? 'Open with Running Animation' : 'Open Editor Now'}
                </span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </section>
      </main>
      )}

      {/* Structured Enterprise Company Footer */}
      <footer className="border-t py-12" style={{ borderColor }}>
        <div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 text-xs"
          style={{ color: fgMuted }}
        >
          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <img
                src="/compillo-logo.png"
                alt="Compillo"
                referrerPolicy="no-referrer"
                className="h-5 w-auto object-contain shrink-0"
              />
              <span className="text-sm font-bold" style={{ color: fgPrimary }}>
                Compillo Software Group
              </span>
            </div>
            <p className="leading-relaxed max-w-sm">
              Empowering global engineering teams and academic institutions with zero-setup browser IDEs, multi-language compilers, container shells, and secure port proxies.
            </p>
            <div className="text-[11px]" style={{ color: fgMuted }}>
              &copy; 2026 Compillo Software Group. All rights reserved.
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="font-semibold text-xs uppercase tracking-wider" style={{ color: fgPrimary }}>
              Platform
            </div>
            <div className="flex flex-col gap-2">
              <a href="#dsa-arena" onClick={() => activePage !== 'overview' && navigatePage('overview')} className="hover:underline underline-offset-4">
                LeetCode DSA Arena
              </a>
              <a href="#multiplayer" onClick={() => activePage !== 'overview' && navigatePage('overview')} className="hover:underline underline-offset-4">
                Live Multiplayer Coding
              </a>
              <a href="#activity-grid" onClick={() => activePage !== 'overview' && navigatePage('overview')} className="hover:underline underline-offset-4">
                365-Day Streak Grid
              </a>
              <a href="#kaggle-hub" onClick={() => activePage !== 'overview' && navigatePage('overview')} className="hover:underline underline-offset-4">
                Competitions &amp; Datasets
              </a>
              <a href="#templates" onClick={() => activePage !== 'overview' && navigatePage('overview')} className="hover:underline underline-offset-4">
                1-Click Stack Launchers
              </a>
              <button type="button" onClick={() => navigatePage('hosting')} className="text-left hover:underline underline-offset-4 cursor-pointer font-medium" style={{ color: accent }}>
                Beta Labs (Testing Phase)
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="font-semibold text-xs uppercase tracking-wider" style={{ color: fgPrimary }}>
              Solutions
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => triggerLaunch({ openEduLabs: true })}
                className="text-left hover:underline underline-offset-4 cursor-pointer"
              >
                University CS Labs
              </button>
              <button
                type="button"
                onClick={() => triggerLaunch({ startPyCalcDemo: true })}
                className="text-left hover:underline underline-offset-4 cursor-pointer"
              >
                PyCalc HTTP Server (:5050)
              </button>
              <button
                type="button"
                onClick={() => triggerLaunch({ panelTab: 'ports' })}
                className="text-left hover:underline underline-offset-4 cursor-pointer"
              >
                Port Proxy &amp; Tunnels
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="font-semibold text-xs uppercase tracking-wider" style={{ color: fgPrimary }}>
              Company
            </div>
            <div className="flex flex-col gap-2">
              <a href="#editions" className="hover:underline underline-offset-4">
                Pricing &amp; Tiers
              </a>
              <button
                type="button"
                onClick={() => triggerLaunch()}
                className="text-left font-semibold hover:underline underline-offset-4 cursor-pointer"
                style={{ color: accent }}
              >
                Launch Studio &rarr;
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Opening Animation Overlay for Compillo Studio */}
      {isBootingEditor && (
        <StudioLoader
          theme={currentTheme}
          finalSubtitle={
            pendingLaunchOptions?.startPyCalcDemo
              ? 'Launching PyCalc inside Compillo Studio'
              : 'Opening Compillo Studio'
          }
          onComplete={handleStudioLoaderComplete}
        />
      )}
    </div>
  );
};
