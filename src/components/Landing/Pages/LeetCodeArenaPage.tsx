import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Flame,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Shuffle,
  Workflow,
  XCircle,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { WebsiteThemeTokens } from './WebsitePageTheme';
import { DsaCategoryId } from './DsaVisualizerBetaPage';
import {
  LeetCodeProgressDoc,
  saveLeetCodeProgress,
  subscribeUserLeetCodeProgress,
} from '../../../services/firestorePlatformService';

interface LeetCodeArenaPageProps {
  tokens: WebsiteThemeTokens;
  firebaseUser: User | null;
  onVisualizePattern?: (category: DsaCategoryId, algo?: string) => void;
}

interface ProblemSummary {
  frontendQuestionId: string;
  title: string;
  titleSlug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  acRate: number;
  topicTags: Array<{ name: string; slug: string }>;
}

interface QuestionDetail {
  questionId: string;
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  content: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  stats: string;
  topicTags: Array<{ name: string; slug: string }>;
  codeSnippets: Array<{ lang: string; langSlug: string; code: string }>;
  exampleTestcases: string;
  hints: string[];
  metaData: string;
}

interface RunCaseResult {
  caseIndex: number;
  ok: boolean;
  inputs: string[];
  output?: string;
  stdout?: string;
  error?: string;
  runtimeMs: number;
}

const TOPIC_OPTIONS = [
  { slug: 'all', label: 'All Topics' },
  { slug: 'array', label: 'Array' },
  { slug: 'string', label: 'String' },
  { slug: 'hash-table', label: 'Hash Table' },
  { slug: 'dynamic-programming', label: 'Dynamic Programming' },
  { slug: 'binary-search', label: 'Binary Search' },
  { slug: 'sliding-window', label: 'Sliding Window' },
  { slug: 'two-pointers', label: 'Two Pointers' },
  { slug: 'tree', label: 'Tree' },
  { slug: 'depth-first-search', label: 'DFS' },
  { slug: 'breadth-first-search', label: 'BFS' },
  { slug: 'backtracking', label: 'Backtracking' },
  { slug: 'sorting', label: 'Sorting' },
];

const LOCAL_SOLVED_KEY = 'compillo_lc_local_progress_v1';

function sanitizeLeetCodeHtml(raw: string): string {
  return String(raw || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
}

function mapTagsToVisualizer(tags: Array<{ slug: string }>): { category: DsaCategoryId; algo: string } | null {
  const slugs = new Set(tags.map((t) => t.slug));
  if (slugs.has('binary-search')) return { category: 'searching', algo: 'binary' };
  if (slugs.has('sliding-window')) return { category: 'sliding', algo: 'sliding_window' };
  if (slugs.has('two-pointers')) return { category: 'sliding', algo: 'two_pointers' };
  if (slugs.has('tree') || slugs.has('binary-tree') || slugs.has('binary-search-tree')) {
    return { category: 'trees', algo: 'inorder' };
  }
  if (slugs.has('breadth-first-search')) return { category: 'graph', algo: 'bfs' };
  if (slugs.has('depth-first-search') || slugs.has('matrix')) return { category: 'graph', algo: 'dfs' };
  if (slugs.has('shortest-path') || slugs.has('graph')) return { category: 'network', algo: 'bellman' };
  if (slugs.has('topological-sort')) return { category: 'network', algo: 'topo' };
  if (slugs.has('union-find') || slugs.has('minimum-spanning-tree')) return { category: 'network', algo: 'kruskal' };
  if (slugs.has('sorting')) return { category: 'sorting', algo: 'quick' };
  if (slugs.has('backtracking')) return { category: 'dp', algo: 'nqueens' };
  if (slugs.has('dynamic-programming')) return { category: 'dp', algo: 'knapsack' };
  return null;
}

export const LeetCodeArenaPage: React.FC<LeetCodeArenaPageProps> = ({
  tokens,
  firebaseUser,
  onVisualizePattern,
}) => {
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');
  const [tagFilter, setTagFilter] = useState('all');
  const [catalog, setCatalog] = useState<ProblemSummary[]>([]);
  const [catalogSource, setCatalogSource] = useState<string>('leetcode-live');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [selectedSlug, setSelectedSlug] = useState<string>('two-sum');
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);

  const [language, setLanguage] = useState<'python3' | 'javascript' | 'cpp'>('python3');
  const [code, setCode] = useState('');
  const [testcases, setTestcases] = useState('');
  const [notes, setNotes] = useState('');

  const [isRunning, setIsRunning] = useState(false);
  const [runResults, setRunResults] = useState<RunCaseResult[] | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [cloudProgress, setCloudProgress] = useState<Record<string, LeetCodeProgressDoc>>({});
  const [localSolved, setLocalSolved] = useState<Record<string, { status: 'attempted' | 'solved'; code: string; language: 'python3' | 'javascript' | 'cpp' }>>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_SOLVED_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!firebaseUser) {
      setCloudProgress({});
      return;
    }
    const unsub = subscribeUserLeetCodeProgress(firebaseUser.uid, (items) => {
      setCloudProgress(items);
    });
    return () => unsub();
  }, [firebaseUser]);

  const fetchCatalog = async (searchText = search, diff = difficultyFilter, tag = tagFilter) => {
    setLoadingCatalog(true);
    setCatalogError(null);
    try {
      const params = new URLSearchParams();
      if (searchText.trim()) params.set('search', searchText.trim());
      if (diff !== 'ALL') params.set('difficulty', diff);
      if (tag !== 'all') params.set('tag', tag);
      params.set('limit', '24');
      const res = await fetch(`/api/beta/leetcode/problems?${params.toString()}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to load catalog');
      setCatalog(data.questions || []);
      setCatalogSource(data.source || 'leetcode-live');
    } catch (err: any) {
      setCatalogError(err?.message || 'Unable to fetch LeetCode problem list.');
    } finally {
      setLoadingCatalog(false);
    }
  };

  const fetchQuestionDetail = async (slug: string, preferredLang = language) => {
    setSelectedSlug(slug);
    setLoadingQuestion(true);
    setQuestionError(null);
    setRunResults(null);
    setRunError(null);
    setSaveMessage(null);
    setShowHints(false);

    try {
      const res = await fetch(`/api/beta/leetcode/problem/${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (!data.ok || !data.question) {
        throw new Error(data.error || 'Failed to fetch problem from LeetCode.');
      }
      const q: QuestionDetail = data.question;
      setQuestion(q);
      setTestcases(q.exampleTestcases || '');

      const saved = cloudProgress[slug] || localSolved[slug];
      if (saved && saved.code && saved.language === preferredLang) {
        setCode(saved.code);
      } else {
        const snippet = q.codeSnippets?.find((s) => s.langSlug === preferredLang);
        setCode(snippet?.code || '// Language snippet unavailable for this problem.');
      }
      if (cloudProgress[slug]?.notes) {
        setNotes(cloudProgress[slug].notes || '');
      } else {
        setNotes('');
      }
    } catch (err: any) {
      setQuestionError(err?.message || 'Unable to fetch question details.');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handleFetchDaily = async () => {
    setLoadingQuestion(true);
    setQuestionError(null);
    try {
      const res = await fetch('/api/beta/leetcode/daily');
      const data = await res.json();
      const slug = data?.daily?.question?.titleSlug;
      if (slug) {
        await fetchQuestionDetail(slug);
      }
    } catch (err: any) {
      setQuestionError(err?.message || 'Could not fetch daily problem.');
      setLoadingQuestion(false);
    }
  };

  const handleFetchRandom = async () => {
    setLoadingQuestion(true);
    setQuestionError(null);
    try {
      const res = await fetch('/api/beta/leetcode/random');
      const data = await res.json();
      if (data?.titleSlug) {
        await fetchQuestionDetail(data.titleSlug);
      } else {
        throw new Error('Could not fetch random problem');
      }
    } catch (err: any) {
      setQuestionError(err?.message || 'Could not fetch random problem.');
      setLoadingQuestion(false);
    }
  };

  useEffect(() => {
    void fetchCatalog('', 'ALL', 'all');
    void fetchQuestionDetail('two-sum', 'python3');
  }, []);

  const handleLanguageChange = (nextLang: 'python3' | 'javascript' | 'cpp') => {
    setLanguage(nextLang);
    setRunResults(null);
    setRunError(null);
    if (!question) return;
    const saved = cloudProgress[question.titleSlug] || localSolved[question.titleSlug];
    if (saved && saved.language === nextLang && saved.code) {
      setCode(saved.code);
    } else {
      const snippet = question.codeSnippets?.find((s) => s.langSlug === nextLang);
      setCode(snippet?.code || '// Language snippet unavailable for this problem.');
    }
  };

  const handleResetStarter = () => {
    if (!question) return;
    const snippet = question.codeSnippets?.find((s) => s.langSlug === language);
    setCode(snippet?.code || '');
    setTestcases(question.exampleTestcases || '');
    setRunResults(null);
    setRunError(null);
  };

  const handleRunTestcases = async () => {
    if (!question) return;
    setIsRunning(true);
    setRunResults(null);
    setRunError(null);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/beta/leetcode/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          metaDataJson: question.metaData,
          testcases,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setRunError(data.error || 'Execution failed.');
      } else {
        setRunResults(data.cases || []);
      }
    } catch (err: any) {
      setRunError(err?.message || 'Failed to execute testcases.');
    } finally {
      setIsRunning(false);
    }
  };

  const handlePersistStatus = async (status: 'attempted' | 'solved') => {
    if (!question) return;
    const avgMs =
      runResults && runResults.length > 0
        ? Math.round((runResults.reduce((acc, c) => acc + c.runtimeMs, 0) / runResults.length) * 10) / 10
        : undefined;

    const nextLocal = {
      ...localSolved,
      [question.titleSlug]: { status, code, language },
    };
    setLocalSolved(nextLocal);
    try {
      localStorage.setItem(LOCAL_SOLVED_KEY, JSON.stringify(nextLocal));
    } catch {
      // ignore quota
    }

    if (firebaseUser) {
      try {
        await saveLeetCodeProgress({
          titleSlug: question.titleSlug,
          frontendId: question.questionFrontendId,
          title: question.title,
          difficulty: question.difficulty,
          language,
          status,
          code,
          notes,
          runtimeMs: avgMs,
        });
        setSaveMessage(
          status === 'solved'
            ? 'Marked Solved and synced to your Firestore profile.'
            : 'Draft solution saved to your Firestore profile.'
        );
      } catch (err: any) {
        setSaveMessage(err?.message || 'Saved locally.');
      }
    } else {
      setSaveMessage('Saved locally in browser. Sign in with Google above to sync across devices.');
    }
  };

  const solvedCount = useMemo(() => {
    const slugs = new Set<string>();
    Object.values(cloudProgress).forEach((d) => {
      if (d.status === 'solved') slugs.add(d.titleSlug);
    });
    Object.entries(localSolved).forEach(([slug, d]) => {
      if (d.status === 'solved') slugs.add(slug);
    });
    return slugs.size;
  }, [cloudProgress, localSolved]);

  const parsedStats = useMemo(() => {
    if (!question?.stats) return null;
    try {
      return JSON.parse(question.stats) as { totalAccepted?: string; totalSubmission?: string; acRate?: string };
    } catch {
      return null;
    }
  }, [question]);

  const matchedVisualizer = useMemo(
    () => (question?.topicTags ? mapTagsToVisualizer(question.topicTags) : null),
    [question]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header & Search Controls */}
      <div
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b pb-6"
        style={{ borderColor: tokens.borderColor }}
      >
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-medium flex flex-wrap items-center gap-2" style={{ color: tokens.fgMuted }}>
            <span>Beta Labs</span>
            <span aria-hidden="true">·</span>
            <span>{catalogSource === 'leetcode-live' ? 'Live LeetCode GraphQL Sync' : 'Starter Problem Cache'}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">Solved: {solvedCount}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
            LeetCode Live Problem Arena
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: tokens.fgMuted }}>
            Fetch real LeetCode Daily Challenges and catalog problems, write solutions in Python 3, JavaScript, or C++, execute testcases on Compillo&apos;s runtime, and jump straight into matching DSA animations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleFetchDaily}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
            style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
          >
            <Flame size={14} />
            <span>Fetch Today&apos;s Daily</span>
          </button>
          <button
            type="button"
            onClick={handleFetchRandom}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
            style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg }}
          >
            <Shuffle size={13} />
            <span>Random Question</span>
          </button>
          <button
            type="button"
            onClick={() => fetchCatalog(search, difficultyFilter, tagFilter)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
            style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg }}
          >
            <RefreshCw size={13} className={loadingCatalog ? 'animate-spin' : ''} />
            <span>Refresh List</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void fetchCatalog(search, difficultyFilter, tagFilter);
        }}
        className="p-4 rounded-xl border flex flex-wrap items-center gap-3"
        style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: tokens.fgMuted }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search LeetCode problems (e.g. LRU Cache, Merge Intervals, 3Sum)..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs"
            style={{
              borderColor: tokens.borderColor,
              backgroundColor: tokens.pageBg,
              color: tokens.fgPrimary,
            }}
          />
        </div>

        <select
          value={difficultyFilter}
          onChange={(e) => {
            const val = e.target.value as 'ALL' | 'EASY' | 'MEDIUM' | 'HARD';
            setDifficultyFilter(val);
            void fetchCatalog(search, val, tagFilter);
          }}
          className="px-3 py-2 rounded-lg border text-xs font-semibold"
          style={{
            borderColor: tokens.borderColor,
            backgroundColor: tokens.pageBg,
            color: tokens.fgPrimary,
          }}
        >
          <option value="ALL">All Difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>

        <select
          value={tagFilter}
          onChange={(e) => {
            const val = e.target.value;
            setTagFilter(val);
            void fetchCatalog(search, difficultyFilter, val);
          }}
          className="px-3 py-2 rounded-lg border text-xs font-semibold"
          style={{
            borderColor: tokens.borderColor,
            backgroundColor: tokens.pageBg,
            color: tokens.fgPrimary,
          }}
        >
          {TOPIC_OPTIONS.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
          style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
        >
          Search Platform
        </button>
      </form>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Column 1: Live Problem List */}
        <div
          className="lg:col-span-3 rounded-xl border overflow-hidden"
          style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
        >
          <div
            className="px-4 py-3 border-b text-xs font-bold flex items-center justify-between"
            style={{ borderColor: tokens.borderColor }}
          >
            <span>Problems ({catalog.length})</span>
            {loadingCatalog && <span style={{ color: tokens.fgMuted }}>Loading...</span>}
          </div>

          {catalogError && (
            <div className="p-3 text-xs text-rose-400">{catalogError}</div>
          )}

          <div className="max-h-[640px] overflow-y-auto divide-y" style={{ borderColor: tokens.borderColor }}>
            {catalog.map((item) => {
              const isSelected = selectedSlug === item.titleSlug;
              const isSolved =
                cloudProgress[item.titleSlug]?.status === 'solved' ||
                localSolved[item.titleSlug]?.status === 'solved';
              const diffColor =
                item.difficulty === 'Easy'
                  ? '#10b981'
                  : item.difficulty === 'Medium'
                  ? '#f59e0b'
                  : '#ef4444';

              return (
                <button
                  key={item.titleSlug}
                  type="button"
                  onClick={() => void fetchQuestionDetail(item.titleSlug)}
                  className="w-full text-left px-3.5 py-2.5 transition-colors cursor-pointer space-y-1"
                  style={{
                    backgroundColor: isSelected ? tokens.pageBg : 'transparent',
                    borderColor: tokens.borderColor,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="text-xs font-semibold leading-snug"
                      style={{ color: isSelected ? tokens.accent : tokens.fgPrimary }}
                    >
                      {item.frontendQuestionId}. {item.title}
                    </span>
                    {isSolved && <CheckCircle2 size={14} className="shrink-0 text-emerald-500 mt-0.5" />}
                  </div>
                  <div className="text-[11px] flex items-center gap-2 tabular-nums" style={{ color: tokens.fgMuted }}>
                    <span style={{ color: diffColor }}>{item.difficulty}</span>
                    <span aria-hidden="true">·</span>
                    <span>{Math.round(item.acRate * 10) / 10}% AC</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 2: Statement & Hints Reader */}
        <div
          className="lg:col-span-4 rounded-xl border p-5 space-y-4 max-h-[700px] overflow-y-auto"
          style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
        >
          {loadingQuestion ? (
            <div className="py-12 text-center text-xs" style={{ color: tokens.fgMuted }}>
              Fetching question specification from LeetCode...
            </div>
          ) : questionError ? (
            <div className="p-4 rounded-lg border border-rose-500/40 text-xs text-rose-400">
              {questionError}
            </div>
          ) : question ? (
            <>
              <div className="space-y-2 border-b pb-3" style={{ borderColor: tokens.borderColor }}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold leading-snug">
                    {question.questionFrontendId}. {question.title}
                  </h3>
                  <a
                    href={`https://leetcode.com/problems/${question.titleSlug}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold shrink-0 hover:underline"
                    style={{ color: tokens.accent }}
                  >
                    <span>LeetCode</span>
                    <ExternalLink size={11} />
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: tokens.fgMuted }}>
                  <span
                    style={{
                      color:
                        question.difficulty === 'Easy'
                          ? '#10b981'
                          : question.difficulty === 'Medium'
                          ? '#f59e0b'
                          : '#ef4444',
                      fontWeight: 600,
                    }}
                  >
                    {question.difficulty}
                  </span>
                  {parsedStats?.acRate && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">Acceptance {parsedStats.acRate}</span>
                    </>
                  )}
                  {question.topicTags.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{question.topicTags.slice(0, 3).map((t) => t.name).join(', ')}</span>
                    </>
                  )}
                </div>

                {matchedVisualizer && onVisualizePattern && (
                  <button
                    type="button"
                    onClick={() => onVisualizePattern(matchedVisualizer.category, matchedVisualizer.algo)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold cursor-pointer mt-1"
                    style={{
                      borderColor: tokens.borderColor,
                      backgroundColor: tokens.pageBg,
                      color: tokens.accent,
                    }}
                  >
                    <Workflow size={13} />
                    <span>Visualize Pattern in DSA Visualizer</span>
                  </button>
                )}
              </div>

              <div
                className="text-xs sm:text-[13px] leading-relaxed space-y-3 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-[11px] [&_pre]:border [&_code]:font-mono [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                style={{ color: tokens.fgPrimary }}
                dangerouslySetInnerHTML={{ __html: sanitizeLeetCodeHtml(question.content) }}
              />

              {question.hints && question.hints.length > 0 && (
                <div className="border-t pt-3 space-y-2" style={{ borderColor: tokens.borderColor }}>
                  <button
                    type="button"
                    onClick={() => setShowHints((h) => !h)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                    style={{ color: tokens.accent }}
                  >
                    {showHints ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>Hints ({question.hints.length})</span>
                  </button>
                  {showHints && (
                    <div className="space-y-2">
                      {question.hints.map((h, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg border text-xs"
                          style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                          dangerouslySetInnerHTML={{ __html: sanitizeLeetCodeHtml(h) }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Column 3: Solver Editor, Testcase Runner & Results */}
        <div
          className="lg:col-span-5 rounded-xl border p-5 space-y-4"
          style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg border" style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}>
              {(
                [
                  ['python3', 'Python 3'],
                  ['javascript', 'JavaScript'],
                  ['cpp', 'C++17'],
                ] as const
              ).map(([langId, label]) => (
                <button
                  key={langId}
                  type="button"
                  onClick={() => handleLanguageChange(langId)}
                  className="px-2.5 py-1 rounded text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                  style={
                    language === langId
                      ? { backgroundColor: tokens.accent, color: tokens.accentText }
                      : { color: tokens.fgMuted }
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetStarter}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
                style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
              <button
                type="button"
                disabled={isRunning || !question}
                onClick={handleRunTestcases}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
              >
                <Play size={13} />
                <span>{isRunning ? 'Running...' : 'Run Testcases'}</span>
              </button>
            </div>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const el = e.currentTarget;
                const start = el.selectionStart;
                const end = el.selectionEnd;
                const next = code.slice(0, start) + '    ' + code.slice(end);
                setCode(next);
                requestAnimationFrame(() => {
                  el.selectionStart = el.selectionEnd = start + 4;
                });
              }
            }}
            rows={14}
            spellCheck={false}
            className="w-full p-3.5 rounded-lg border font-mono text-xs leading-relaxed resize-y"
            style={{
              borderColor: tokens.borderColor,
              backgroundColor: tokens.pageBg,
              color: tokens.fgPrimary,
            }}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold" style={{ color: tokens.fgMuted }}>
                Example / Custom Testcases (1 JSON value per line per parameter)
              </span>
            </div>
            <textarea
              value={testcases}
              onChange={(e) => setTestcases(e.target.value)}
              rows={4}
              spellCheck={false}
              className="w-full p-2.5 rounded-lg border font-mono text-xs resize-y"
              style={{
                borderColor: tokens.borderColor,
                backgroundColor: tokens.pageBg,
                color: tokens.fgPrimary,
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              disabled={!question}
              onClick={() => void handlePersistStatus('attempted')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
              style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
            >
              <Save size={12} />
              <span>Save Draft</span>
            </button>
            <button
              type="button"
              disabled={!question}
              onClick={() => void handlePersistStatus('solved')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              style={{ backgroundColor: '#10b981', color: '#050505' }}
            >
              <CheckCircle2 size={13} />
              <span>Mark Solved</span>
            </button>
          </div>

          {saveMessage && (
            <div
              className="p-2.5 rounded-lg border text-xs"
              style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.accent }}
            >
              {saveMessage}
            </div>
          )}

          {runError && (
            <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-950/20 font-mono text-xs text-rose-400 whitespace-pre-wrap">
              {runError}
            </div>
          )}

          {runResults && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold" style={{ color: tokens.fgMuted }}>
                Execution Output ({runResults.length} testcases)
              </div>
              {runResults.map((c) => (
                <div
                  key={c.caseIndex}
                  className="p-3 rounded-lg border font-mono text-xs space-y-1"
                  style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-bold">
                      {c.ok ? (
                        <CheckCircle2 size={13} className="text-emerald-500" />
                      ) : (
                        <XCircle size={13} className="text-rose-500" />
                      )}
                      Case #{c.caseIndex}
                    </span>
                    <span className="tabular-nums" style={{ color: tokens.fgMuted }}>
                      {c.runtimeMs} ms
                    </span>
                  </div>
                  <div style={{ color: tokens.fgMuted }}>Input: {c.inputs.join(' | ')}</div>
                  {c.ok ? (
                    <div className="text-emerald-400">Output: {c.output}</div>
                  ) : (
                    <div className="text-rose-400">Error: {c.error}</div>
                  )}
                  {c.stdout && (
                    <div className="pt-1 border-t" style={{ borderColor: tokens.borderColor, color: tokens.fgMuted }}>
                      Stdout: {c.stdout}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
