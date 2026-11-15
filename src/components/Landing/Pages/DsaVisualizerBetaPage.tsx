import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
} from 'lucide-react';
import { WebsiteThemeTokens } from './WebsitePageTheme';
import {
  ALGO_META,
  ArrayStep,
  BstNode,
  buildSampleBst,
  DEFAULT_NETWORK_EDGES,
  DpBacktrackAlgoId,
  generateEditDistanceSteps,
  generateGraphSteps,
  generateKnapsackSteps,
  generateLcsSteps,
  generateNetworkSteps,
  generateNQueensSteps,
  generateSearchSteps,
  generateSlidingSteps,
  generateSortSteps,
  generateTreeSteps,
  GraphAlgoId,
  GraphStep,
  insertBst,
  KnapsackStep,
  MatrixDpStep,
  NETWORK_NODES,
  NetworkAlgoId,
  NetworkEdge,
  NetworkStep,
  QueensStep,
  SearchAlgoId,
  SlidingAlgoId,
  SlidingStep,
  SortAlgoId,
  TreeAlgoId,
  TreeStep,
} from './dsaEngine';

export type DsaCategoryId =
  | 'sorting'
  | 'searching'
  | 'graph'
  | 'network'
  | 'trees'
  | 'sliding'
  | 'dp';

interface DsaVisualizerBetaPageProps {
  tokens: WebsiteThemeTokens;
  initialPreset?: { category: DsaCategoryId; algo?: string; nonce: number } | null;
}

const GRID_ROWS = 10;
const GRID_COLS = 18;
const DEFAULT_START: [number, number] = [4, 2];
const DEFAULT_END: [number, number] = [4, 15];

function makeInitialWalls(): Set<string> {
  return new Set([
    '1,7',
    '2,7',
    '3,7',
    '4,7',
    '5,7',
    '6,7',
    '3,11',
    '4,11',
    '5,11',
    '6,11',
    '7,11',
    '8,11',
  ]);
}

function makeInitialWeights(): Set<string> {
  return new Set(['0,7', '7,7', '8,7', '1,11', '2,11', '5,9', '6,9']);
}

function generateRandomArray(len: number): number[] {
  return Array.from({ length: len }, () => Math.floor(10 + Math.random() * 88));
}

function layoutTree(
  node: BstNode | null,
  x: number,
  y: number,
  dx: number,
  positions: Array<{ node: BstNode; x: number; y: number; px?: number; py?: number }>,
  px?: number,
  py?: number
) {
  if (!node) return;
  positions.push({ node, x, y, px, py });
  layoutTree(node.left, x - dx, y + 66, Math.max(26, dx * 0.54), positions, x, y);
  layoutTree(node.right, x + dx, y + 66, Math.max(26, dx * 0.54), positions, x, y);
}

const KNAPSACK_ITEMS = [
  { name: 'Laptop', weight: 2, value: 6 },
  { name: 'Camera', weight: 2, value: 10 },
  { name: 'Synth', weight: 3, value: 12 },
  { name: 'Drone', weight: 4, value: 15 },
];

export const DsaVisualizerBetaPage: React.FC<DsaVisualizerBetaPageProps> = ({
  tokens,
  initialPreset,
}) => {
  const [category, setCategory] = useState<DsaCategoryId>('sorting');
  const [sortAlgo, setSortAlgo] = useState<SortAlgoId>('quick');
  const [searchAlgo, setSearchAlgo] = useState<SearchAlgoId>('binary');
  const [graphAlgo, setGraphAlgo] = useState<GraphAlgoId>('astar');
  const [networkAlgo, setNetworkAlgo] = useState<NetworkAlgoId>('kruskal');
  const [treeAlgo, setTreeAlgo] = useState<TreeAlgoId>('inorder');
  const [slidingAlgo, setSlidingAlgo] = useState<SlidingAlgoId>('sliding_window');
  const [dpAlgo, setDpAlgo] = useState<DpBacktrackAlgoId>('knapsack');

  const [isPlaying, setIsPlaying] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [speedMs, setSpeedMs] = useState(140);

  const [arraySize, setArraySize] = useState(18);
  const [baseArray, setBaseArray] = useState<number[]>(() => generateRandomArray(18));
  const [searchTarget, setSearchTarget] = useState<number>(42);

  const [walls, setWalls] = useState<Set<string>>(() => makeInitialWalls());
  const [weights, setWeights] = useState<Set<string>>(() => makeInitialWeights());
  const [paintMode, setPaintMode] = useState<'wall' | 'weight'>('wall');

  const [networkEdges, setNetworkEdges] = useState<NetworkEdge[]>(() => DEFAULT_NETWORK_EDGES);

  const [bstRoot, setBstRoot] = useState<BstNode>(() => buildSampleBst());
  const [insertInput, setInsertInput] = useState('');

  const [windowK, setWindowK] = useState(4);
  const [twoPtrTarget, setTwoPtrTarget] = useState(95);
  const [kmpText, setKmpText] = useState('ABABDABACDABABCABAB');
  const [kmpPat, setKmpPat] = useState('ABABCABAB');

  const [knapsackCap, setKnapsackCap] = useState(7);
  const [dpStrA, setDpStrA] = useState('COMPILLO');
  const [dpStrB, setDpStrB] = useState('COMPILER');
  const [queensN, setQueensN] = useState(5);

  useEffect(() => {
    if (!initialPreset) return;
    setCategory(initialPreset.category);
    if (initialPreset.algo) {
      const a = initialPreset.algo;
      if (initialPreset.category === 'sorting') setSortAlgo(a as SortAlgoId);
      else if (initialPreset.category === 'searching') setSearchAlgo(a as SearchAlgoId);
      else if (initialPreset.category === 'graph') setGraphAlgo(a as GraphAlgoId);
      else if (initialPreset.category === 'network') setNetworkAlgo(a as NetworkAlgoId);
      else if (initialPreset.category === 'trees') setTreeAlgo(a as TreeAlgoId);
      else if (initialPreset.category === 'sliding') setSlidingAlgo(a as SlidingAlgoId);
      else if (initialPreset.category === 'dp') setDpAlgo(a as DpBacktrackAlgoId);
    }
    setIsPlaying(false);
    setStepIdx(0);
  }, [initialPreset]);

  const activeAlgoId =
    category === 'sorting'
      ? sortAlgo
      : category === 'searching'
      ? searchAlgo
      : category === 'graph'
      ? graphAlgo
      : category === 'network'
      ? networkAlgo
      : category === 'trees'
      ? treeAlgo
      : category === 'sliding'
      ? slidingAlgo
      : dpAlgo;

  const meta = ALGO_META[activeAlgoId] || ALGO_META.quick;

  const sortSteps = useMemo<ArrayStep[]>(
    () => (category === 'sorting' ? generateSortSteps(sortAlgo, baseArray) : []),
    [category, sortAlgo, baseArray]
  );

  const searchSteps = useMemo<ArrayStep[]>(
    () => (category === 'searching' ? generateSearchSteps(searchAlgo, baseArray, searchTarget) : []),
    [category, searchAlgo, baseArray, searchTarget]
  );

  const graphSteps = useMemo<GraphStep[]>(
    () =>
      category === 'graph'
        ? generateGraphSteps(
            graphAlgo,
            GRID_ROWS,
            GRID_COLS,
            DEFAULT_START,
            DEFAULT_END,
            walls,
            weights
          )
        : [],
    [category, graphAlgo, walls, weights]
  );

  const networkSteps = useMemo<NetworkStep[]>(
    () =>
      category === 'network'
        ? generateNetworkSteps(networkAlgo, NETWORK_NODES, networkEdges)
        : [],
    [category, networkAlgo, networkEdges]
  );

  const treeSteps = useMemo<TreeStep[]>(
    () => (category === 'trees' ? generateTreeSteps(treeAlgo, bstRoot) : []),
    [category, treeAlgo, bstRoot]
  );

  const slidingSteps = useMemo<SlidingStep[]>(
    () =>
      category === 'sliding'
        ? generateSlidingSteps(slidingAlgo, baseArray, windowK, twoPtrTarget, kmpText, kmpPat)
        : [],
    [category, slidingAlgo, baseArray, windowK, twoPtrTarget, kmpText, kmpPat]
  );

  const knapsackSteps = useMemo<KnapsackStep[]>(
    () =>
      category === 'dp' && dpAlgo === 'knapsack'
        ? generateKnapsackSteps(KNAPSACK_ITEMS, knapsackCap)
        : [],
    [category, dpAlgo, knapsackCap]
  );

  const matrixDpSteps = useMemo<MatrixDpStep[]>(() => {
    if (category !== 'dp') return [];
    if (dpAlgo === 'lcs') return generateLcsSteps(dpStrA, dpStrB);
    if (dpAlgo === 'edit_distance') return generateEditDistanceSteps(dpStrA, dpStrB);
    return [];
  }, [category, dpAlgo, dpStrA, dpStrB]);

  const queensSteps = useMemo<QueensStep[]>(
    () => (category === 'dp' && dpAlgo === 'nqueens' ? generateNQueensSteps(queensN) : []),
    [category, dpAlgo, queensN]
  );

  const totalSteps =
    category === 'sorting'
      ? sortSteps.length
      : category === 'searching'
      ? searchSteps.length
      : category === 'graph'
      ? graphSteps.length
      : category === 'network'
      ? networkSteps.length
      : category === 'trees'
      ? treeSteps.length
      : category === 'sliding'
      ? slidingSteps.length
      : dpAlgo === 'knapsack'
      ? knapsackSteps.length
      : dpAlgo === 'nqueens'
      ? queensSteps.length
      : matrixDpSteps.length;

  const safeStepIdx = Math.min(stepIdx, Math.max(0, totalSteps - 1));

  useEffect(() => {
    if (!isPlaying) return;
    if (safeStepIdx >= totalSteps - 1) {
      setIsPlaying(false);
      return;
    }
    const id = window.setTimeout(() => {
      setStepIdx((prev) => Math.min(totalSteps - 1, prev + 1));
    }, speedMs);
    return () => window.clearTimeout(id);
  }, [isPlaying, safeStepIdx, totalSteps, speedMs]);

  const resetPlayback = () => {
    setIsPlaying(false);
    setStepIdx(0);
  };

  const randomizeArray = (len = arraySize) => {
    const next = generateRandomArray(len);
    setBaseArray(next);
    setSearchTarget(next[Math.floor(Math.random() * next.length)]);
    if (next.length >= 2) {
      const sorted = [...next].slice(0, 14).sort((a, b) => a - b);
      const a = sorted[Math.floor(Math.random() * Math.floor(sorted.length / 2))];
      const b = sorted[Math.floor(sorted.length / 2) + Math.floor(Math.random() * Math.ceil(sorted.length / 2))];
      setTwoPtrTarget((a || 20) + (b || 50));
    }
    resetPlayback();
  };

  const handleTogglePlay = () => {
    if (safeStepIdx >= totalSteps - 1) {
      setStepIdx(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((p) => !p);
    }
  };

  const toggleGridCell = (r: number, c: number) => {
    const k = `${r},${c}`;
    if (
      (r === DEFAULT_START[0] && c === DEFAULT_START[1]) ||
      (r === DEFAULT_END[0] && c === DEFAULT_END[1])
    ) {
      return;
    }
    resetPlayback();
    if (paintMode === 'wall') {
      setWeights((prev) => {
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
      setWalls((prev) => {
        const next = new Set(prev);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        return next;
      });
    } else {
      setWalls((prev) => {
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
      setWeights((prev) => {
        const next = new Set(prev);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        return next;
      });
    }
  };

  const handleInsertBstNode = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(insertInput.trim());
    if (!Number.isInteger(num) || num < 1 || num > 99) return;
    setBstRoot((prev) => insertBst(prev, num));
    setInsertInput('');
    resetPlayback();
  };

  const treePositions = useMemo(() => {
    const list: Array<{ node: BstNode; x: number; y: number; px?: number; py?: number }> = [];
    layoutTree(bstRoot, 340, 36, 155, list);
    return list;
  }, [bstRoot]);

  const currentArrStep =
    category === 'sorting'
      ? sortSteps[safeStepIdx]
      : category === 'searching'
      ? searchSteps[safeStepIdx]
      : null;

  const currentGraphStep = category === 'graph' ? graphSteps[safeStepIdx] : null;
  const currentNetworkStep = category === 'network' ? networkSteps[safeStepIdx] : null;
  const currentTreeStep = category === 'trees' ? treeSteps[safeStepIdx] : null;
  const currentSlidingStep = category === 'sliding' ? slidingSteps[safeStepIdx] : null;
  const currentKnapStep = category === 'dp' && dpAlgo === 'knapsack' ? knapsackSteps[safeStepIdx] : null;
  const currentMatrixDpStep =
    category === 'dp' && (dpAlgo === 'lcs' || dpAlgo === 'edit_distance')
      ? matrixDpSteps[safeStepIdx]
      : null;
  const currentQueenStep = category === 'dp' && dpAlgo === 'nqueens' ? queensSteps[safeStepIdx] : null;

  const activeStepObj: any =
    currentArrStep ||
    currentGraphStep ||
    currentNetworkStep ||
    currentTreeStep ||
    currentSlidingStep ||
    currentKnapStep ||
    currentMatrixDpStep ||
    currentQueenStep;

  const currentMessage = activeStepObj?.message || 'Ready';
  const activeLine: number | undefined = activeStepObj?.line;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header & Category Tabs */}
      <div
        className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b pb-6"
        style={{ borderColor: tokens.borderColor }}
      >
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-medium" style={{ color: tokens.fgMuted }}>
            Beta Labs · 31 Algorithms Across 7 Domains
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
            Interactive DSA Algorithm Visualizer
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: tokens.fgMuted }}>
            Step through Sorting, Searching, Grid Pathfinding, MST &amp; DAG Graphs, BSTs, Strings &amp; Sliding Window, Dynamic Programming, and Backtracking with live pseudocode tracing.
          </p>
        </div>

        <div
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-lg border shrink-0"
          style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
        >
          {(
            [
              ['sorting', 'Sorting'],
              ['searching', 'Searching'],
              ['graph', 'Grid Path'],
              ['network', 'Network & DAG'],
              ['trees', 'Trees / BST'],
              ['sliding', 'Strings & 2-Ptr'],
              ['dp', 'DP & Backtrack'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setCategory(id);
                resetPlayback();
              }}
              className="px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              style={
                category === id
                  ? { backgroundColor: tokens.accent, color: tokens.accentText }
                  : { color: tokens.fgMuted }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Algorithm Selector & Playback Bar */}
      <div
        className="p-4 rounded-xl border space-y-4"
        style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Sub-algorithm buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {category === 'sorting' &&
              (
                [
                  ['bubble', 'Bubble'],
                  ['selection', 'Selection'],
                  ['insertion', 'Insertion'],
                  ['merge', 'Merge'],
                  ['quick', 'Quick'],
                  ['heap', 'Heap'],
                  ['shell', 'Shell'],
                  ['counting', 'Counting'],
                  ['radix', 'Radix'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSortAlgo(id);
                    resetPlayback();
                  }}
                  className="px-2.5 py-1.5 rounded-md border text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                  style={
                    sortAlgo === id
                      ? { backgroundColor: tokens.accent, color: tokens.accentText, borderColor: tokens.accent }
                      : { backgroundColor: tokens.pageBg, color: tokens.fgPrimary, borderColor: tokens.borderColor }
                  }
                >
                  {label}
                </button>
              ))}

            {category === 'searching' &&
              (
                [
                  ['linear', 'Linear'],
                  ['binary', 'Binary'],
                  ['jump', 'Jump'],
                  ['exponential', 'Exponential'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSearchAlgo(id);
                    resetPlayback();
                  }}
                  className="px-3 py-1.5 rounded-md border text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                  style={
                    searchAlgo === id
                      ? { backgroundColor: tokens.accent, color: tokens.accentText, borderColor: tokens.accent }
                      : { backgroundColor: tokens.pageBg, color: tokens.fgPrimary, borderColor: tokens.borderColor }
                  }
                >
                  {label}
                </button>
              ))}

            {category === 'graph' &&
              (
                [
                  ['bfs', 'BFS'],
                  ['dfs', 'DFS'],
                  ['dijkstra', 'Dijkstra'],
                  ['astar', 'A* Search'],
                  ['greedy', 'Greedy Best-First'],
                  ['bidir', 'Bidirectional BFS'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setGraphAlgo(id);
                    resetPlayback();
                  }}
                  className="px-3 py-1.5 rounded-md border text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                  style={
                    graphAlgo === id
                      ? { backgroundColor: tokens.accent, color: tokens.accentText, borderColor: tokens.accent }
                      : { backgroundColor: tokens.pageBg, color: tokens.fgPrimary, borderColor: tokens.borderColor }
                  }
                >
                  {label}
                </button>
              ))}

            {category === 'network' &&
              (
                [
                  ['kruskal', "Kruskal's MST"],
                  ['prim', "Prim's MST"],
                  ['topo', "Kahn's Topo Sort"],
                  ['bellman', 'Bellman-Ford'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setNetworkAlgo(id);
                    resetPlayback();
                  }}
                  className="px-3 py-1.5 rounded-md border text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                  style={
                    networkAlgo === id
                      ? { backgroundColor: tokens.accent, color: tokens.accentText, borderColor: tokens.accent }
                      : { backgroundColor: tokens.pageBg, color: tokens.fgPrimary, borderColor: tokens.borderColor }
                  }
                >
                  {label}
                </button>
              ))}

            {category === 'trees' &&
              (
                [
                  ['inorder', 'Inorder'],
                  ['preorder', 'Preorder'],
                  ['postorder', 'Postorder'],
                  ['levelorder', 'Level-Order'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTreeAlgo(id);
                    resetPlayback();
                  }}
                  className="px-3 py-1.5 rounded-md border text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                  style={
                    treeAlgo === id
                      ? { backgroundColor: tokens.accent, color: tokens.accentText, borderColor: tokens.accent }
                      : { backgroundColor: tokens.pageBg, color: tokens.fgPrimary, borderColor: tokens.borderColor }
                  }
                >
                  {label}
                </button>
              ))}

            {category === 'sliding' &&
              (
                [
                  ['sliding_window', 'Sliding Window'],
                  ['two_pointers', 'Two Pointers'],
                  ['kmp', 'KMP Pattern'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSlidingAlgo(id);
                    resetPlayback();
                  }}
                  className="px-3 py-1.5 rounded-md border text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                  style={
                    slidingAlgo === id
                      ? { backgroundColor: tokens.accent, color: tokens.accentText, borderColor: tokens.accent }
                      : { backgroundColor: tokens.pageBg, color: tokens.fgPrimary, borderColor: tokens.borderColor }
                  }
                >
                  {label}
                </button>
              ))}

            {category === 'dp' &&
              (
                [
                  ['knapsack', '0/1 Knapsack'],
                  ['lcs', 'LCS Matrix'],
                  ['edit_distance', 'Edit Distance'],
                  ['nqueens', 'N-Queens'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setDpAlgo(id);
                    resetPlayback();
                  }}
                  className="px-3 py-1.5 rounded-md border text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                  style={
                    dpAlgo === id
                      ? { backgroundColor: tokens.accent, color: tokens.accentText, borderColor: tokens.accent }
                      : { backgroundColor: tokens.pageBg, color: tokens.fgPrimary, borderColor: tokens.borderColor }
                  }
                >
                  {label}
                </button>
              ))}
          </div>

          {/* Playback Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
              style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? 'Pause' : safeStepIdx >= totalSteps - 1 ? 'Replay' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setStepIdx((p) => Math.max(0, p - 1));
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
              style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
              title="Step Back"
            >
              <ChevronLeft size={14} />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setStepIdx((p) => Math.min(Math.max(0, totalSteps - 1), p + 1));
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
              style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
              title="Step Forward"
            >
              <ChevronRight size={14} />
            </button>

            <button
              type="button"
              onClick={resetPlayback}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
              style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>

            <select
              value={speedMs}
              onChange={(e) => setSpeedMs(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg border text-xs font-mono"
              style={{
                borderColor: tokens.borderColor,
                backgroundColor: tokens.pageBg,
                color: tokens.fgPrimary,
              }}
            >
              <option value={320}>0.5x Speed</option>
              <option value={140}>1x Speed</option>
              <option value={60}>2x Speed</option>
              <option value={22}>4x Speed</option>
            </select>
          </div>
        </div>

        {/* Category-specific Parameter Controls */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t text-xs"
          style={{ borderColor: tokens.borderColor }}
        >
          <div className="flex flex-wrap items-center gap-4">
            {(category === 'sorting' || category === 'searching') && (
              <>
                <label className="flex items-center gap-2">
                  <span style={{ color: tokens.fgMuted }}>Size ({arraySize}):</span>
                  <input
                    type="range"
                    min={8}
                    max={30}
                    value={arraySize}
                    onChange={(e) => {
                      const len = Number(e.target.value);
                      setArraySize(len);
                      randomizeArray(len);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => randomizeArray(arraySize)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border font-semibold cursor-pointer"
                  style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                >
                  <Shuffle size={12} />
                  <span>Randomize Array</span>
                </button>
              </>
            )}

            {category === 'searching' && (
              <label className="flex items-center gap-2">
                <span style={{ color: tokens.fgMuted }}>Target Value:</span>
                <select
                  value={searchTarget}
                  onChange={(e) => {
                    setSearchTarget(Number(e.target.value));
                    resetPlayback();
                  }}
                  className="px-2.5 py-1 rounded-md border font-mono"
                  style={{
                    borderColor: tokens.borderColor,
                    backgroundColor: tokens.pageBg,
                    color: tokens.fgPrimary,
                  }}
                >
                  {[...baseArray].sort((a, b) => a - b).map((v, i) => (
                    <option key={`${v}-${i}`} value={v}>
                      {v}
                    </option>
                  ))}
                  <option value={999}>999 (Missing)</option>
                </select>
              </label>
            )}

            {category === 'graph' && (
              <>
                <div className="flex items-center gap-1.5">
                  <span style={{ color: tokens.fgMuted }}>Paint Cell:</span>
                  <button
                    type="button"
                    onClick={() => setPaintMode('wall')}
                    className="px-2.5 py-1 rounded border font-semibold cursor-pointer"
                    style={
                      paintMode === 'wall'
                        ? { backgroundColor: tokens.accent, color: tokens.accentText, borderColor: tokens.accent }
                        : { borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }
                    }
                  >
                    Wall
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaintMode('weight')}
                    className="px-2.5 py-1 rounded border font-semibold cursor-pointer"
                    style={
                      paintMode === 'weight'
                        ? { backgroundColor: tokens.accent, color: tokens.accentText, borderColor: tokens.accent }
                        : { borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }
                    }
                  >
                    Weight (5x)
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWalls(new Set());
                    setWeights(new Set());
                    resetPlayback();
                  }}
                  className="px-2.5 py-1 rounded border cursor-pointer"
                  style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                >
                  Clear Grid
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWalls(makeInitialWalls());
                    setWeights(makeInitialWeights());
                    resetPlayback();
                  }}
                  className="px-2.5 py-1 rounded border cursor-pointer"
                  style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                >
                  Restore Maze
                </button>
              </>
            )}

            {category === 'network' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setNetworkEdges(
                      DEFAULT_NETWORK_EDGES.map((e) => ({
                        ...e,
                        weight: Math.floor(1 + Math.random() * 9),
                      }))
                    );
                    resetPlayback();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border font-semibold cursor-pointer"
                  style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                >
                  <Shuffle size={12} />
                  <span>Randomize Edge Weights</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNetworkEdges(DEFAULT_NETWORK_EDGES);
                    resetPlayback();
                  }}
                  className="px-3 py-1 rounded-md border cursor-pointer"
                  style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                >
                  Default Graph
                </button>
              </>
            )}

            {category === 'trees' && (
              <form onSubmit={handleInsertBstNode} className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={insertInput}
                  onChange={(e) => setInsertInput(e.target.value)}
                  placeholder="1..99"
                  className="w-24 px-2.5 py-1 rounded-md border font-mono"
                  style={{
                    borderColor: tokens.borderColor,
                    backgroundColor: tokens.pageBg,
                    color: tokens.fgPrimary,
                  }}
                />
                <button
                  type="submit"
                  className="px-3 py-1 rounded-md border font-semibold cursor-pointer"
                  style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                >
                  Insert BST Node
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBstRoot(buildSampleBst());
                    resetPlayback();
                  }}
                  className="px-3 py-1 rounded-md border cursor-pointer"
                  style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                >
                  Reset Tree
                </button>
              </form>
            )}

            {category === 'sliding' && slidingAlgo === 'sliding_window' && (
              <label className="flex items-center gap-2">
                <span style={{ color: tokens.fgMuted }}>Window Width K ({windowK}):</span>
                <input
                  type="range"
                  min={2}
                  max={6}
                  value={windowK}
                  onChange={(e) => {
                    setWindowK(Number(e.target.value));
                    resetPlayback();
                  }}
                />
              </label>
            )}

            {category === 'sliding' && slidingAlgo === 'two_pointers' && (
              <label className="flex items-center gap-2">
                <span style={{ color: tokens.fgMuted }}>Target Pair Sum:</span>
                <input
                  type="number"
                  value={twoPtrTarget}
                  onChange={(e) => {
                    setTwoPtrTarget(Number(e.target.value));
                    resetPlayback();
                  }}
                  className="w-24 px-2.5 py-1 rounded-md border font-mono"
                  style={{
                    borderColor: tokens.borderColor,
                    backgroundColor: tokens.pageBg,
                    color: tokens.fgPrimary,
                  }}
                />
              </label>
            )}

            {category === 'sliding' && slidingAlgo === 'kmp' && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5">
                  <span style={{ color: tokens.fgMuted }}>Text:</span>
                  <input
                    type="text"
                    value={kmpText}
                    maxLength={24}
                    onChange={(e) => {
                      setKmpText(e.target.value.toUpperCase());
                      resetPlayback();
                    }}
                    className="w-44 px-2.5 py-1 rounded-md border font-mono uppercase"
                    style={{
                      borderColor: tokens.borderColor,
                      backgroundColor: tokens.pageBg,
                      color: tokens.fgPrimary,
                    }}
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  <span style={{ color: tokens.fgMuted }}>Pattern:</span>
                  <input
                    type="text"
                    value={kmpPat}
                    maxLength={12}
                    onChange={(e) => {
                      setKmpPat(e.target.value.toUpperCase());
                      resetPlayback();
                    }}
                    className="w-32 px-2.5 py-1 rounded-md border font-mono uppercase"
                    style={{
                      borderColor: tokens.borderColor,
                      backgroundColor: tokens.pageBg,
                      color: tokens.fgPrimary,
                    }}
                  />
                </label>
              </div>
            )}

            {category === 'dp' && dpAlgo === 'knapsack' && (
              <label className="flex items-center gap-2">
                <span style={{ color: tokens.fgMuted }}>Knapsack Capacity ({knapsackCap}):</span>
                <input
                  type="range"
                  min={4}
                  max={9}
                  value={knapsackCap}
                  onChange={(e) => {
                    setKnapsackCap(Number(e.target.value));
                    resetPlayback();
                  }}
                />
              </label>
            )}

            {category === 'dp' && (dpAlgo === 'lcs' || dpAlgo === 'edit_distance') && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5">
                  <span style={{ color: tokens.fgMuted }}>String A:</span>
                  <input
                    type="text"
                    value={dpStrA}
                    maxLength={8}
                    onChange={(e) => {
                      setDpStrA(e.target.value.toUpperCase());
                      resetPlayback();
                    }}
                    className="w-28 px-2.5 py-1 rounded-md border font-mono uppercase"
                    style={{
                      borderColor: tokens.borderColor,
                      backgroundColor: tokens.pageBg,
                      color: tokens.fgPrimary,
                    }}
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  <span style={{ color: tokens.fgMuted }}>String B:</span>
                  <input
                    type="text"
                    value={dpStrB}
                    maxLength={8}
                    onChange={(e) => {
                      setDpStrB(e.target.value.toUpperCase());
                      resetPlayback();
                    }}
                    className="w-28 px-2.5 py-1 rounded-md border font-mono uppercase"
                    style={{
                      borderColor: tokens.borderColor,
                      backgroundColor: tokens.pageBg,
                      color: tokens.fgPrimary,
                    }}
                  />
                </label>
              </div>
            )}

            {category === 'dp' && dpAlgo === 'nqueens' && (
              <label className="flex items-center gap-2">
                <span style={{ color: tokens.fgMuted }}>Board Size (N):</span>
                <select
                  value={queensN}
                  onChange={(e) => {
                    setQueensN(Number(e.target.value));
                    resetPlayback();
                  }}
                  className="px-2.5 py-1 rounded-md border font-mono"
                  style={{
                    borderColor: tokens.borderColor,
                    backgroundColor: tokens.pageBg,
                    color: tokens.fgPrimary,
                  }}
                >
                  <option value={4}>4 x 4</option>
                  <option value={5}>5 x 5</option>
                  <option value={6}>6 x 6</option>
                </select>
              </label>
            )}
          </div>

          <div className="font-mono tabular-nums" style={{ color: tokens.fgMuted }}>
            Step {safeStepIdx + 1} / {Math.max(1, totalSteps)} · Time:{' '}
            <strong style={{ color: tokens.fgPrimary }}>{meta.time}</strong> · Space:{' '}
            <strong style={{ color: tokens.fgPrimary }}>{meta.space}</strong>
          </div>
        </div>
      </div>

      {/* Main Two-Zone Stage + Live Pseudocode Deck */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div
          className="xl:col-span-8 p-6 rounded-xl border space-y-5"
          style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
        >
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b pb-3"
            style={{ borderColor: tokens.borderColor }}
          >
            <div>
              <div className="text-sm font-bold">{meta.name}</div>
              <div className="text-xs" style={{ color: tokens.fgMuted }}>
                {meta.summary}
              </div>
            </div>
            {currentArrStep && (
              <div className="text-xs font-mono tabular-nums" style={{ color: tokens.fgMuted }}>
                Comparisons: <strong style={{ color: tokens.fgPrimary }}>{currentArrStep.comparisons}</strong> ·
                Writes/Swaps: <strong style={{ color: tokens.fgPrimary }}>{currentArrStep.swaps}</strong>
              </div>
            )}
            {currentSlidingStep && (
              <div className="text-xs font-mono tabular-nums font-semibold" style={{ color: tokens.fgPrimary }}>
                {currentSlidingStep.metricLabel}
              </div>
            )}
          </div>

          {/* Live Step Message Banner */}
          <div
            className="px-4 py-2.5 rounded-lg border font-mono text-xs"
            style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor, color: tokens.accent }}
          >
            {currentMessage}
          </div>

          {/* Stage 1 & 2: Sorting & Searching Bars */}
          {(category === 'sorting' || category === 'searching') && currentArrStep && (
            <div className="space-y-3">
              <div
                className="h-72 p-4 rounded-lg border flex items-end gap-1.5"
                style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor }}
              >
                {currentArrStep.array.map((val, idx) => {
                  const isFound = currentArrStep.found === idx;
                  const isSwap = currentArrStep.swap.includes(idx);
                  const isActive = currentArrStep.active.includes(idx);
                  const isSorted = currentArrStep.sorted.includes(idx);
                  const isPivot = currentArrStep.pivot === idx || currentArrStep.mid === idx;

                  const outOfSearchRange =
                    category === 'searching' &&
                    typeof currentArrStep.low === 'number' &&
                    typeof currentArrStep.high === 'number' &&
                    (idx < currentArrStep.low || idx > currentArrStep.high);

                  let barColor = tokens.accent;
                  if (isFound) barColor = '#10b981';
                  else if (isSwap) barColor = '#f43f5e';
                  else if (isPivot) barColor = '#f59e0b';
                  else if (isActive) barColor = '#38bdf8';
                  else if (isSorted) barColor = '#10b981';
                  else if (outOfSearchRange) barColor = tokens.borderColor;

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end h-full min-w-0"
                      title={`[${idx}] = ${val}`}
                    >
                      <div
                        className="w-full rounded-t transition-all duration-150 flex items-start justify-center pt-1 text-[10px] font-mono font-bold overflow-hidden"
                        style={{
                          height: `${Math.max(12, Math.min(100, val))}%`,
                          backgroundColor: barColor,
                          color: '#050505',
                        }}
                      >
                        {currentArrStep.array.length <= 22 ? val : ''}
                      </div>
                      <div className="text-[10px] font-mono pt-1 tabular-nums" style={{ color: tokens.fgMuted }}>
                        {currentArrStep.array.length <= 20 ? idx : ''}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-5 text-xs" style={{ color: tokens.fgMuted }}>
                <span>Active / Comparing (Blue)</span>
                <span>Swap / Write (Rose)</span>
                <span>Pivot / Mid (Amber)</span>
                <span>Sorted / Found (Emerald)</span>
              </div>
            </div>
          )}

          {/* Stage 3: Grid Pathfinding */}
          {category === 'graph' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <div
                  className="grid gap-1 mx-auto"
                  style={{
                    gridTemplateColumns: `repeat(${GRID_COLS}, minmax(24px, 32px))`,
                    width: 'fit-content',
                  }}
                >
                  {Array.from({ length: GRID_ROWS }).map((_, r) =>
                    Array.from({ length: GRID_COLS }).map((__, c) => {
                      const k = `${r},${c}`;
                      const isStart = r === DEFAULT_START[0] && c === DEFAULT_START[1];
                      const isEnd = r === DEFAULT_END[0] && c === DEFAULT_END[1];
                      const isWall = walls.has(k);
                      const isWeight = weights.has(k);
                      const isPath = currentGraphStep?.path.includes(k);
                      const isCurrent = currentGraphStep?.current === k;
                      const isVisited = currentGraphStep?.visited.includes(k);
                      const isFrontier = currentGraphStep?.frontier.includes(k);

                      let bg = tokens.pageBg;
                      let label = '';
                      if (isStart) {
                        bg = '#10b981';
                        label = 'S';
                      } else if (isEnd) {
                        bg = '#ef4444';
                        label = 'T';
                      } else if (isWall) {
                        bg = '#3f3f46';
                      } else if (isPath) {
                        bg = '#f59e0b';
                      } else if (isCurrent) {
                        bg = '#ec4899';
                      } else if (isFrontier) {
                        bg = '#a855f7';
                      } else if (isVisited) {
                        bg = '#0284c7';
                      } else if (isWeight) {
                        bg = 'rgba(245, 158, 11, 0.25)';
                        label = '5';
                      }

                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => toggleGridCell(r, c)}
                          className="h-7 sm:h-8 rounded border text-[10px] font-mono font-bold transition-colors duration-150 cursor-pointer"
                          style={{
                            backgroundColor: bg,
                            borderColor: tokens.borderColor,
                            color: isStart || isEnd ? '#fff' : tokens.fgPrimary,
                          }}
                        >
                          {label}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-xs" style={{ color: tokens.fgMuted }}>
                <span>S = Start</span>
                <span>T = Target</span>
                <span>Blue = Visited</span>
                <span>Purple = Frontier</span>
                <span>Amber = Path</span>
                <span>5 = Cost 5</span>
              </div>
            </div>
          )}

          {/* Stage 4: Weighted Network / MST / DAG */}
          {category === 'network' && (
            <div className="space-y-4">
              <div
                className="rounded-lg border p-3 overflow-x-auto"
                style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor }}
              >
                <svg viewBox="0 0 620 290" className="w-full max-w-2xl mx-auto h-64">
                  {networkEdges.map((e) => {
                    const nu = NETWORK_NODES.find((n) => n.id === e.u)!;
                    const nv = NETWORK_NODES.find((n) => n.id === e.v)!;
                    const isSel = currentNetworkStep?.selectedEdges.includes(e.id);
                    const isCand = currentNetworkStep?.candidateEdge === e.id;
                    const isRej = currentNetworkStep?.rejectedEdges.includes(e.id);
                    const stroke = isCand
                      ? '#f59e0b'
                      : isSel
                      ? '#10b981'
                      : isRej
                      ? '#ef4444'
                      : tokens.borderColor;
                    const mx = (nu.x + nv.x) / 2;
                    const my = (nu.y + nv.y) / 2;
                    return (
                      <g key={e.id}>
                        <line
                          x1={nu.x}
                          y1={nu.y}
                          x2={nv.x}
                          y2={nv.y}
                          stroke={stroke}
                          strokeWidth={isSel || isCand ? 3.5 : 1.75}
                          strokeDasharray={isRej ? '4 4' : undefined}
                        />
                        <rect
                          x={mx - 10}
                          y={my - 9}
                          width={20}
                          height={18}
                          rx={4}
                          fill={tokens.surfaceBg}
                          stroke={stroke}
                        />
                        <text
                          x={mx}
                          y={my + 4}
                          textAnchor="middle"
                          fontSize={10}
                          fontFamily="monospace"
                          fontWeight="bold"
                          fill={tokens.fgPrimary}
                        >
                          {e.weight}
                        </text>
                      </g>
                    );
                  })}
                  {NETWORK_NODES.map((n) => {
                    const isAct = currentNetworkStep?.activeNode === n.id;
                    const isVis = currentNetworkStep?.visitedNodes.includes(n.id);
                    const fill = isAct ? '#f59e0b' : isVis ? '#10b981' : tokens.surfaceBg;
                    const txt = isAct || isVis ? '#050505' : tokens.fgPrimary;
                    return (
                      <g key={n.id}>
                        <circle
                          cx={n.x}
                          cy={n.y}
                          r={20}
                          fill={fill}
                          stroke={tokens.accent}
                          strokeWidth={2}
                        />
                        <text
                          x={n.x}
                          y={n.y + 4}
                          textAnchor="middle"
                          fontSize={12}
                          fontFamily="monospace"
                          fontWeight="bold"
                          fill={txt}
                        >
                          {n.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {currentNetworkStep?.distances && (
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center font-mono text-xs tabular-nums">
                  {NETWORK_NODES.map((n) => (
                    <div
                      key={n.id}
                      className="p-2 rounded border"
                      style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                    >
                      <div style={{ color: tokens.fgMuted }}>{n.label}</div>
                      <div className="font-bold">{currentNetworkStep.distances?.[n.id]}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stage 5: BST Traversal SVG */}
          {category === 'trees' && (
            <div className="space-y-4">
              <div
                className="rounded-lg border p-3 overflow-x-auto"
                style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor }}
              >
                <svg viewBox="0 0 680 300" className="w-full max-w-3xl mx-auto h-64">
                  {treePositions.map((pos) =>
                    pos.px !== undefined && pos.py !== undefined ? (
                      <line
                        key={`e-${pos.node.id}`}
                        x1={pos.px}
                        y1={pos.py}
                        x2={pos.x}
                        y2={pos.y}
                        stroke={tokens.borderColor}
                        strokeWidth={2}
                      />
                    ) : null
                  )}
                  {treePositions.map((pos) => {
                    const isActive = currentTreeStep?.activeId === pos.node.id;
                    const isVisited = currentTreeStep?.visitedIds.includes(pos.node.id);
                    const fill = isActive ? '#f59e0b' : isVisited ? '#10b981' : tokens.surfaceBg;
                    const textFill = isActive || isVisited ? '#050505' : tokens.fgPrimary;
                    return (
                      <g key={pos.node.id}>
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={19}
                          fill={fill}
                          stroke={isActive ? '#f59e0b' : tokens.accent}
                          strokeWidth={2}
                        />
                        <text
                          x={pos.x}
                          y={pos.y + 4}
                          textAnchor="middle"
                          fontSize={12}
                          fontFamily="monospace"
                          fontWeight="bold"
                          fill={textFill}
                        >
                          {pos.node.val}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div
                className="p-3.5 rounded-lg border font-mono text-xs"
                style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor }}
              >
                <span style={{ color: tokens.fgMuted }}>Traversal Output: </span>
                <strong>[{(currentTreeStep?.output || []).join(', ')}]</strong>
              </div>
            </div>
          )}

          {/* Stage 6: Sliding Window / Two Pointers / KMP */}
          {category === 'sliding' && currentSlidingStep && (
            <div className="space-y-4">
              {currentSlidingStep.array && (
                <div className="flex flex-wrap gap-2 justify-center py-6 px-3 rounded-lg border" style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor }}>
                  {currentSlidingStep.array.map((val, idx) => {
                    const inWin =
                      slidingAlgo === 'sliding_window' &&
                      idx >= currentSlidingStep.left &&
                      idx <= currentSlidingStep.right;
                    const isPtr =
                      idx === currentSlidingStep.left || idx === currentSlidingStep.right;
                    const isBest =
                      currentSlidingStep.bestRange &&
                      idx >= currentSlidingStep.bestRange[0] &&
                      idx <= currentSlidingStep.bestRange[1];

                    let bg = tokens.surfaceBg;
                    if (isPtr) bg = '#f59e0b';
                    else if (inWin) bg = tokens.accent;
                    else if (isBest) bg = 'rgba(16,185,129,0.25)';

                    const txt = isPtr || inWin ? '#050505' : tokens.fgPrimary;
                    return (
                      <div key={idx} className="flex flex-col items-center gap-1">
                        <div
                          className="w-11 h-12 rounded-lg border flex items-center justify-center font-mono text-sm font-bold tabular-nums"
                          style={{ backgroundColor: bg, borderColor: tokens.borderColor, color: txt }}
                        >
                          {val}
                        </div>
                        <div className="text-[10px] font-mono tabular-nums" style={{ color: tokens.fgMuted }}>
                          {idx === currentSlidingStep.left && idx === currentSlidingStep.right
                            ? 'L,R'
                            : idx === currentSlidingStep.left
                            ? 'L'
                            : idx === currentSlidingStep.right
                            ? 'R'
                            : idx}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {currentSlidingStep.text && (
                <div className="space-y-3">
                  <div
                    className="p-4 rounded-lg border overflow-x-auto space-y-2"
                    style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor }}
                  >
                    <div className="text-[11px] font-mono" style={{ color: tokens.fgMuted }}>
                      Text Tape:
                    </div>
                    <div className="flex gap-1">
                      {currentSlidingStep.text.split('').map((ch, idx) => {
                        const isHi = currentSlidingStep.highlightIndices.includes(idx);
                        const isMatch = currentSlidingStep.foundIndices?.some(
                          (st) => idx >= st && idx < st + (currentSlidingStep.pattern?.length || 0)
                        );
                        return (
                          <div
                            key={idx}
                            className="w-7 h-8 rounded border flex items-center justify-center font-mono text-xs font-bold shrink-0"
                            style={{
                              borderColor: tokens.borderColor,
                              backgroundColor: isHi ? '#f59e0b' : isMatch ? '#10b981' : tokens.surfaceBg,
                              color: isHi || isMatch ? '#050505' : tokens.fgPrimary,
                            }}
                          >
                            {ch}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {currentSlidingStep.lps && (
                    <div className="text-xs font-mono" style={{ color: tokens.fgMuted }}>
                      Pattern: <strong style={{ color: tokens.fgPrimary }}>{currentSlidingStep.pattern}</strong> · LPS Table:{' '}
                      <strong style={{ color: tokens.accent }}>[{currentSlidingStep.lps.join(', ')}]</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stage 7A: 0/1 Knapsack */}
          {category === 'dp' && dpAlgo === 'knapsack' && currentKnapStep && (
            <div className="space-y-4 overflow-x-auto">
              <table className="w-full text-center border-collapse font-mono text-xs tabular-nums">
                <thead>
                  <tr className="border-b" style={{ borderColor: tokens.borderColor, color: tokens.fgMuted }}>
                    <th className="py-2 px-3 text-left">Item \ Capacity</th>
                    {Array.from({ length: knapsackCap + 1 }).map((_, w) => (
                      <th key={w} className="py-2 px-2">
                        w={w}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentKnapStep.table.map((row, i) => {
                    const isChosen = i > 0 && currentKnapStep.chosenItems.includes(i - 1);
                    const itemLabel =
                      i === 0
                        ? '0 items'
                        : `${KNAPSACK_ITEMS[i - 1].name} (wt=${KNAPSACK_ITEMS[i - 1].weight}, v=${KNAPSACK_ITEMS[i - 1].value})`;
                    return (
                      <tr key={i} className="border-b" style={{ borderColor: tokens.borderColor }}>
                        <td
                          className="py-2 px-3 text-left font-sans font-semibold"
                          style={{ color: isChosen ? '#10b981' : tokens.fgPrimary }}
                        >
                          {itemLabel}
                        </td>
                        {row.map((val, w) => {
                          const isAct =
                            currentKnapStep.activeCell?.[0] === i && currentKnapStep.activeCell?.[1] === w;
                          const isCmp = currentKnapStep.compareCells.some(([r, c]) => r === i && c === w);
                          return (
                            <td
                              key={w}
                              className="py-2 px-2 border"
                              style={{
                                borderColor: tokens.borderColor,
                                backgroundColor: isAct
                                  ? tokens.accent
                                  : isCmp
                                  ? 'rgba(245, 158, 11, 0.25)'
                                  : tokens.pageBg,
                                color: isAct ? tokens.accentText : tokens.fgPrimary,
                                fontWeight: isAct ? 700 : 400,
                              }}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Stage 7B: LCS & Edit Distance Matrix */}
          {category === 'dp' && (dpAlgo === 'lcs' || dpAlgo === 'edit_distance') && currentMatrixDpStep && (
            <div className="space-y-3 overflow-x-auto">
              <table className="w-full text-center border-collapse font-mono text-xs tabular-nums">
                <thead>
                  <tr className="border-b" style={{ borderColor: tokens.borderColor, color: tokens.fgMuted }}>
                    <th className="py-2 px-2"></th>
                    <th className="py-2 px-2">ε</th>
                    {dpStrB
                      .slice(0, dpAlgo === 'lcs' ? 8 : 7)
                      .split('')
                      .map((ch, j) => (
                        <th key={j} className="py-2 px-2">
                          {ch}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {currentMatrixDpStep.table.map((row, i) => (
                    <tr key={i} className="border-b" style={{ borderColor: tokens.borderColor }}>
                      <td className="py-2 px-2 font-bold" style={{ color: tokens.fgMuted }}>
                        {i === 0 ? 'ε' : dpStrA[i - 1]}
                      </td>
                      {row.map((val, j) => {
                        const isAct =
                          currentMatrixDpStep.activeCell?.[0] === i && currentMatrixDpStep.activeCell?.[1] === j;
                        const isCmp = currentMatrixDpStep.compareCells.some(([r, c]) => r === i && c === j);
                        const isPath = currentMatrixDpStep.pathCells.some(([r, c]) => r === i && c === j);
                        return (
                          <td
                            key={j}
                            className="py-2 px-2 border"
                            style={{
                              borderColor: tokens.borderColor,
                              backgroundColor: isPath
                                ? '#10b981'
                                : isAct
                                ? tokens.accent
                                : isCmp
                                ? 'rgba(245, 158, 11, 0.25)'
                                : tokens.pageBg,
                              color: isPath ? '#050505' : isAct ? tokens.accentText : tokens.fgPrimary,
                              fontWeight: isAct || isPath ? 700 : 400,
                            }}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Stage 7C: N-Queens */}
          {category === 'dp' && dpAlgo === 'nqueens' && currentQueenStep && (
            <div className="flex justify-center">
              <div
                className="grid border rounded-lg overflow-hidden"
                style={{
                  gridTemplateColumns: `repeat(${queensN}, 54px)`,
                  borderColor: tokens.borderColor,
                }}
              >
                {Array.from({ length: queensN }).map((_, r) =>
                  Array.from({ length: queensN }).map((__, c) => {
                    const hasQueen = currentQueenStep.board[r] === c;
                    const isTrying = currentQueenStep.tryRow === r && currentQueenStep.tryCol === c;
                    const darkCell = (r + c) % 2 === 1;

                    let bg = darkCell ? tokens.pageBg : tokens.surfaceBg;
                    if (isTrying) bg = currentQueenStep.conflict ? '#ef4444' : '#f59e0b';
                    else if (hasQueen) bg = '#10b981';

                    return (
                      <div
                        key={`${r}-${c}`}
                        className="h-[54px] flex items-center justify-center font-mono text-lg font-bold border"
                        style={{
                          backgroundColor: bg,
                          borderColor: tokens.borderColor,
                          color: hasQueen || isTrying ? '#050505' : tokens.fgMuted,
                        }}
                      >
                        {hasQueen || (isTrying && !currentQueenStep.conflict) ? 'Q' : isTrying ? 'X' : ''}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Zone: Live Pseudocode Execution Trace */}
        <div
          className="xl:col-span-4 p-5 rounded-xl border space-y-4"
          style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
        >
          <div>
            <div className="text-xs font-semibold" style={{ color: tokens.fgMuted }}>
              Algorithm Pseudocode Trace
            </div>
            <div className="text-sm font-bold mt-0.5">{meta.name}</div>
          </div>

          <div
            className="rounded-lg border p-3 font-mono text-xs space-y-1 overflow-x-auto"
            style={{ backgroundColor: tokens.pageBg, borderColor: tokens.borderColor }}
          >
            {meta.pseudocode.map((lineText, idx) => {
              const isHighlighted = activeLine === idx;
              return (
                <div
                  key={idx}
                  className="px-2 py-1 rounded flex items-start gap-2 transition-colors"
                  style={{
                    backgroundColor: isHighlighted ? tokens.accent : 'transparent',
                    color: isHighlighted ? tokens.accentText : tokens.fgPrimary,
                  }}
                >
                  <span className="opacity-60 select-none tabular-nums">{idx + 1}</span>
                  <span className="whitespace-pre">{lineText}</span>
                </div>
              );
            })}
          </div>

          <div className="space-y-2 text-xs" style={{ color: tokens.fgMuted }}>
            <div>
              <strong style={{ color: tokens.fgPrimary }}>Time Complexity:</strong>{' '}
              <span className="font-mono">{meta.time}</span>
            </div>
            <div>
              <strong style={{ color: tokens.fgPrimary }}>Space Complexity:</strong>{' '}
              <span className="font-mono">{meta.space}</span>
            </div>
            <p className="leading-relaxed pt-1 border-t" style={{ borderColor: tokens.borderColor }}>
              {meta.summary}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
