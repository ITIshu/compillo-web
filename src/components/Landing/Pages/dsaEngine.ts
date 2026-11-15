export type SortAlgoId =
  | 'bubble'
  | 'selection'
  | 'insertion'
  | 'merge'
  | 'quick'
  | 'heap'
  | 'shell'
  | 'counting'
  | 'radix';

export type SearchAlgoId = 'linear' | 'binary' | 'jump' | 'exponential';
export type GraphAlgoId = 'bfs' | 'dfs' | 'dijkstra' | 'astar' | 'greedy' | 'bidir';
export type NetworkAlgoId = 'kruskal' | 'prim' | 'topo' | 'bellman';
export type TreeAlgoId = 'inorder' | 'preorder' | 'postorder' | 'levelorder';
export type SlidingAlgoId = 'sliding_window' | 'two_pointers' | 'kmp';
export type DpBacktrackAlgoId = 'knapsack' | 'lcs' | 'edit_distance' | 'nqueens';

export interface ArrayStep {
  array: number[];
  active: number[];
  swap: number[];
  sorted: number[];
  pivot?: number;
  low?: number;
  mid?: number;
  high?: number;
  found?: number;
  comparisons: number;
  swaps: number;
  line?: number;
  message: string;
}

export interface GraphStep {
  visited: string[];
  frontier: string[];
  path: string[];
  current: string | null;
  distance?: number;
  line?: number;
  message: string;
}

export interface NetworkNode {
  id: number;
  label: string;
  x: number;
  y: number;
}

export interface NetworkEdge {
  id: string;
  u: number;
  v: number;
  weight: number;
}

export interface NetworkStep {
  activeNode: number | null;
  visitedNodes: number[];
  selectedEdges: string[];
  candidateEdge: string | null;
  rejectedEdges: string[];
  distances?: Record<number, number | string>;
  queueOrOrder?: number[];
  line?: number;
  message: string;
}

export interface BstNode {
  id: string;
  val: number;
  left: BstNode | null;
  right: BstNode | null;
}

export interface TreeStep {
  activeId: string | null;
  visitedIds: string[];
  output: number[];
  line?: number;
  message: string;
}

export interface KnapsackStep {
  table: number[][];
  activeCell: [number, number] | null;
  compareCells: Array<[number, number]>;
  chosenItems: number[];
  line?: number;
  message: string;
}

export interface MatrixDpStep {
  table: number[][];
  activeCell: [number, number] | null;
  compareCells: Array<[number, number]>;
  pathCells: Array<[number, number]>;
  resultText: string;
  line?: number;
  message: string;
}

export interface QueensStep {
  board: number[];
  tryRow: number;
  tryCol: number;
  conflict: boolean;
  solved: boolean;
  line?: number;
  message: string;
}

export interface SlidingStep {
  array?: number[];
  text?: string;
  pattern?: string;
  lps?: number[];
  left: number;
  right: number;
  highlightIndices: number[];
  bestRange?: [number, number];
  foundIndices?: number[];
  metricLabel: string;
  line?: number;
  message: string;
}

export const ALGO_META: Record<
  string,
  { name: string; time: string; space: string; summary: string; pseudocode: string[] }
> = {
  bubble: {
    name: 'Bubble Sort',
    time: 'O(n²)',
    space: 'O(1)',
    summary: 'Repeatedly compares adjacent pairs and swaps out-of-order elements.',
    pseudocode: [
      'for i in range(n - 1):',
      '  swapped = False',
      '  for j in range(n - i - 1):',
      '    if arr[j] > arr[j + 1]: swap(arr[j], arr[j + 1])',
      '  if not swapped: break',
    ],
  },
  selection: {
    name: 'Selection Sort',
    time: 'O(n²)',
    space: 'O(1)',
    summary: 'Finds the minimum unsorted element each pass and places it at the front.',
    pseudocode: [
      'for i in range(n - 1):',
      '  minIdx = i',
      '  for j in range(i + 1, n):',
      '    if arr[j] < arr[minIdx]: minIdx = j',
      '  swap(arr[i], arr[minIdx])',
    ],
  },
  insertion: {
    name: 'Insertion Sort',
    time: 'O(n²)',
    space: 'O(1)',
    summary: 'Builds the sorted prefix one element at a time by shifting larger values right.',
    pseudocode: [
      'for i in range(1, n):',
      '  key = arr[i]; j = i - 1',
      '  while j >= 0 and arr[j] > key:',
      '    arr[j + 1] = arr[j]; j -= 1',
      '  arr[j + 1] = key',
    ],
  },
  merge: {
    name: 'Merge Sort',
    time: 'O(n log n)',
    space: 'O(n)',
    summary: 'Divide-and-conquer algorithm splitting into halves and merging in sorted order.',
    pseudocode: [
      'def mergeSort(l, r):',
      '  if l >= r: return',
      '  m = (l + r) // 2',
      '  mergeSort(l, m); mergeSort(m + 1, r)',
      '  merge(arr, l, m, r)',
    ],
  },
  quick: {
    name: 'Quick Sort',
    time: 'O(n log n) avg',
    space: 'O(log n)',
    summary: 'Partitions array around a pivot so smaller values move left and larger right.',
    pseudocode: [
      'def quickSort(low, high):',
      '  pivot = arr[high]; i = low',
      '  for j in range(low, high):',
      '    if arr[j] < pivot: swap(arr[i], arr[j]); i += 1',
      '  swap(arr[i], arr[high]); recurse(low, i-1), recurse(i+1, high)',
    ],
  },
  heap: {
    name: 'Heap Sort',
    time: 'O(n log n)',
    space: 'O(1)',
    summary: 'Builds a binary max-heap and extracts the maximum element to the end.',
    pseudocode: [
      'for i in range(n // 2 - 1, -1, -1): heapify(n, i)',
      'for end in range(n - 1, 0, -1):',
      '  swap(arr[0], arr[end])',
      '  heapify(end, 0)',
    ],
  },
  shell: {
    name: 'Shell Sort',
    time: 'O(n log² n)',
    space: 'O(1)',
    summary: 'Generalizes insertion sort by comparing gapped elements across shrinking intervals.',
    pseudocode: [
      'gap = n // 2',
      'while gap > 0:',
      '  for i in range(gap, n):',
      '    shift arr[j - gap] while arr[j - gap] > temp',
      '  gap //= 2',
    ],
  },
  counting: {
    name: 'Counting Sort',
    time: 'O(n + k)',
    space: 'O(n + k)',
    summary: 'Non-comparison integer sort counting value frequencies and writing positions in linear time.',
    pseudocode: [
      'count = [0] * (maxVal + 1)',
      'for x in arr: count[x] += 1',
      'for v in range(len(count)): prefix += count[v]',
      'write elements in stable order back to arr',
    ],
  },
  radix: {
    name: 'Radix Sort (LSD Base-10)',
    time: 'O(d · (n + 10))',
    space: 'O(n + 10)',
    summary: 'Sorts numbers digit by digit from least significant digit to most significant using stable buckets.',
    pseudocode: [
      'exp = 1',
      'while maxVal // exp > 0:',
      '  bucket elements by (x // exp) % 10',
      '  concatenate buckets into arr; exp *= 10',
    ],
  },
  linear: {
    name: 'Linear Search',
    time: 'O(n)',
    space: 'O(1)',
    summary: 'Scans sequentially from index 0 until the target matches or array ends.',
    pseudocode: [
      'for i in range(n):',
      '  if arr[i] == target: return i',
      'return -1',
    ],
  },
  binary: {
    name: 'Binary Search',
    time: 'O(log n)',
    space: 'O(1)',
    summary: 'Halves a sorted search interval every step by comparing mid against target.',
    pseudocode: [
      'low, high = 0, n - 1',
      'while low <= high:',
      '  mid = (low + high) // 2',
      '  if arr[mid] == target: return mid',
      '  elif arr[mid] < target: low = mid + 1 else: high = mid - 1',
    ],
  },
  jump: {
    name: 'Jump Search',
    time: 'O(√n)',
    space: 'O(1)',
    summary: 'Jumps ahead by fixed √n blocks, then performs a linear scan inside the matching block.',
    pseudocode: [
      'step = floor(sqrt(n)); prev = 0',
      'while prev < n and arr[min(step, n) - 1] < target: jump block',
      'for i in range(prev, min(step, n)):',
      '  if arr[i] == target: return i',
    ],
  },
  exponential: {
    name: 'Exponential Search',
    time: 'O(log i)',
    space: 'O(1)',
    summary: 'Doubles the bound [1, 2, 4, 8...] until exceeding target, then binary-searches the tight range.',
    pseudocode: [
      'if arr[0] == target: return 0',
      'bound = 1',
      'while bound < n and arr[bound] <= target: bound *= 2',
      'return binarySearch(arr, bound // 2, min(bound, n - 1))',
    ],
  },
  bfs: {
    name: 'Breadth-First Search (BFS)',
    time: 'O(V + E)',
    space: 'O(V)',
    summary: 'Explores unweighted graph levels layer by layer using a FIFO queue.',
    pseudocode: [
      'queue = deque([start]); seen = {start}',
      'while queue:',
      '  curr = queue.popleft()',
      '  if curr == target: return reconstruct(curr)',
      '  push unvisited neighbors to queue',
    ],
  },
  dfs: {
    name: 'Depth-First Search (DFS)',
    time: 'O(V + E)',
    space: 'O(V)',
    summary: 'Explores as deep as possible along each branch before backtracking.',
    pseudocode: [
      'stack = [start]; seen = {start}',
      'while stack:',
      '  curr = stack.pop()',
      '  if curr == target: return reconstruct(curr)',
      '  push unvisited neighbors to stack',
    ],
  },
  dijkstra: {
    name: "Dijkstra's Shortest Path",
    time: 'O((V + E) log V)',
    space: 'O(V)',
    summary: 'Greedily expands the lowest-cost frontier node, respecting weighted terrain.',
    pseudocode: [
      'dist[start] = 0; pq = [(0, start)]',
      'while pq:',
      '  d, u = heappop(pq)',
      '  for v, w in neighbors(u): relax(u, v, w)',
    ],
  },
  astar: {
    name: 'A* Pathfinding',
    time: 'O(E)',
    space: 'O(V)',
    summary: 'Combines exact path cost g(n) + Manhattan heuristic h(n) to steer directly toward the target.',
    pseudocode: [
      'f[start] = h(start, target)',
      'while openSet:',
      '  curr = min(openSet, key=f)',
      '  relax neighbors with f(v) = g(v) + h(v, target)',
    ],
  },
  greedy: {
    name: 'Greedy Best-First Search',
    time: 'O(V log V)',
    space: 'O(V)',
    summary: 'Expands nodes solely by lowest heuristic h(n) distance toward target (fast, non-optimal on weights).',
    pseudocode: [
      'pq = [(h(start, target), start)]',
      'while pq:',
      '  curr = heappop(pq)',
      '  for v in neighbors(curr): push (h(v, target), v)',
    ],
  },
  bidir: {
    name: 'Bidirectional BFS',
    time: 'O(b^(d/2))',
    space: 'O(b^(d/2))',
    summary: 'Expands two BFS frontiers simultaneously from Start and Target until they collide.',
    pseudocode: [
      'qStart = deque([start]); qEnd = deque([target])',
      'while qStart and qEnd:',
      '  expand layer from qStart; if hit seenEnd: merge paths',
      '  expand layer from qEnd; if hit seenStart: merge paths',
    ],
  },
  kruskal: {
    name: "Kruskal's Minimum Spanning Tree",
    time: 'O(E log E)',
    space: 'O(V)',
    summary: 'Sorts edges ascending by weight and adds edges connecting disjoint Union-Find components.',
    pseudocode: [
      'sort edges ascending by weight',
      'for (u, v, w) in edges:',
      '  if find(u) != find(v):',
      '    union(u, v); mst.append((u, v))',
    ],
  },
  prim: {
    name: "Prim's Minimum Spanning Tree",
    time: 'O(E log V)',
    space: 'O(V)',
    summary: 'Grows a single tree from Node A by always picking the minimum edge crossing the visited cut.',
    pseudocode: [
      'visited = {start}; push incident edges to minHeap',
      'while minHeap and len(visited) < V:',
      '  w, u, v = heappop(minHeap)',
      '  if v not in visited: add v, edge(u, v) to MST',
    ],
  },
  topo: {
    name: "Topological Sort (Kahn's BFS)",
    time: 'O(V + E)',
    space: 'O(V)',
    summary: 'Repeatedly dequeues zero-in-degree vertices in a DAG and decrements outgoing neighbor in-degrees.',
    pseudocode: [
      'compute indegree[v] for all nodes',
      'queue = deque([v for v if indegree[v] == 0])',
      'while queue:',
      '  u = queue.popleft(); order.append(u)',
      '  for v in adj[u]: indegree[v] -= 1; if 0: queue.append(v)',
    ],
  },
  bellman: {
    name: 'Bellman-Ford Shortest Paths',
    time: 'O(V · E)',
    space: 'O(V)',
    summary: 'Relaxes every directed/undirected edge V - 1 times to guarantee shortest distances from source A.',
    pseudocode: [
      'dist = {v: INF}; dist[A] = 0',
      'for pass in range(V - 1):',
      '  for (u, v, w) in edges:',
      '    if dist[u] + w < dist[v]: dist[v] = dist[u] + w',
    ],
  },
  inorder: {
    name: 'Inorder Traversal (L → Root → R)',
    time: 'O(n)',
    space: 'O(h)',
    summary: 'Visits Binary Search Tree nodes in ascending sorted order.',
    pseudocode: [
      'def inorder(node):',
      '  if not node: return',
      '  inorder(node.left)',
      '  visit(node)',
      '  inorder(node.right)',
    ],
  },
  preorder: {
    name: 'Preorder Traversal (Root → L → R)',
    time: 'O(n)',
    space: 'O(h)',
    summary: 'Processes parent node before descending left and right subtrees.',
    pseudocode: [
      'def preorder(node):',
      '  if not node: return',
      '  visit(node)',
      '  preorder(node.left)',
      '  preorder(node.right)',
    ],
  },
  postorder: {
    name: 'Postorder Traversal (L → R → Root)',
    time: 'O(n)',
    space: 'O(h)',
    summary: 'Processes both children before visiting the parent (used for tree deletion/eval).',
    pseudocode: [
      'def postorder(node):',
      '  if not node: return',
      '  postorder(node.left)',
      '  postorder(node.right)',
      '  visit(node)',
    ],
  },
  levelorder: {
    name: 'Level-Order Traversal (BFS)',
    time: 'O(n)',
    space: 'O(w)',
    summary: 'Traverses the tree depth by depth from top to bottom using a queue.',
    pseudocode: [
      'q = deque([root])',
      'while q:',
      '  node = q.popleft(); visit(node)',
      '  if node.left: q.append(node.left)',
      '  if node.right: q.append(node.right)',
    ],
  },
  sliding_window: {
    name: 'Sliding Window (Max Subarray Sum of Size K)',
    time: 'O(n)',
    space: 'O(1)',
    summary: 'Maintains a running sum of window width K by adding the entering element and subtracting the leaving one.',
    pseudocode: [
      'winSum = sum(arr[:k]); best = winSum',
      'for r in range(k, n):',
      '  winSum += arr[r] - arr[r - k]',
      '  if winSum > best: best = winSum',
    ],
  },
  two_pointers: {
    name: 'Two Pointers (Sorted Two-Sum)',
    time: 'O(n)',
    space: 'O(1)',
    summary: 'Converges left and right indices inward on a sorted array to locate a target pair sum.',
    pseudocode: [
      'L, R = 0, n - 1',
      'while L < R:',
      '  s = arr[L] + arr[R]',
      '  if s == target: return [L, R]',
      '  elif s < target: L += 1 else: R -= 1',
    ],
  },
  kmp: {
    name: 'KMP Pattern Matching',
    time: 'O(n + m)',
    space: 'O(m)',
    summary: 'Uses Longest Prefix Suffix (LPS) fallback links to avoid re-scanning matched characters.',
    pseudocode: [
      'build lps[0..m-1] prefix table for pattern',
      'i = j = 0',
      'while i < len(text):',
      '  if text[i] == pat[j]: i += 1; j += 1',
      '  elif j > 0: j = lps[j - 1] else: i += 1',
    ],
  },
  knapsack: {
    name: '0/1 Knapsack Dynamic Programming',
    time: 'O(n · W)',
    space: 'O(n · W)',
    summary: 'Fills optimal value subproblems bottom-up deciding whether to include each item.',
    pseudocode: [
      'for i in range(1, n + 1):',
      '  for w in range(1, W + 1):',
      '    if wt[i] <= w:',
      '      dp[i][w] = max(dp[i-1][w], val[i] + dp[i-1][w - wt[i]])',
      '    else: dp[i][w] = dp[i-1][w]',
    ],
  },
  lcs: {
    name: 'Longest Common Subsequence (LCS)',
    time: 'O(m · n)',
    space: 'O(m · n)',
    summary: 'Builds a 2D DP matrix finding the longest shared subsequence across two strings.',
    pseudocode: [
      'for i in range(1, m + 1):',
      '  for j in range(1, n + 1):',
      '    if s1[i-1] == s2[j-1]: dp[i][j] = 1 + dp[i-1][j-1]',
      '    else: dp[i][j] = max(dp[i-1][j], dp[i][j-1])',
    ],
  },
  edit_distance: {
    name: 'Edit Distance (Levenshtein)',
    time: 'O(m · n)',
    space: 'O(m · n)',
    summary: 'Computes minimum Insert, Delete, or Replace edits transforming Word A into Word B.',
    pseudocode: [
      'init base cases dp[i][0] = i, dp[0][j] = j',
      'for i in 1..m, j in 1..n:',
      '  if a[i-1] == b[j-1]: dp[i][j] = dp[i-1][j-1]',
      '  else: dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])',
    ],
  },
  nqueens: {
    name: 'N-Queens Backtracking',
    time: 'O(N!)',
    space: 'O(N)',
    summary: 'Places queens row by row, backtracking whenever column or diagonal conflicts arise.',
    pseudocode: [
      'def solve(row):',
      '  if row == N: return True',
      '  for col in range(N):',
      '    if isSafe(row, col): place & recurse(row + 1)',
      '    backtrack()',
    ],
  },
};

export function generateSortSteps(algo: SortAlgoId, input: number[]): ArrayStep[] {
  const arr = [...input];
  const n = arr.length;
  const steps: ArrayStep[] = [];
  let comparisons = 0;
  let swaps = 0;
  const sortedSet = new Set<number>();

  const push = (
    message: string,
    opts: { active?: number[]; swap?: number[]; pivot?: number; line?: number } = {}
  ) => {
    steps.push({
      array: [...arr],
      active: opts.active ?? [],
      swap: opts.swap ?? [],
      sorted: Array.from(sortedSet),
      pivot: opts.pivot,
      comparisons,
      swaps,
      line: opts.line,
      message,
    });
  };

  push(`Starting ${ALGO_META[algo].name} on ${n} elements.`, { line: 0 });

  if (algo === 'bubble') {
    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      for (let j = 0; j < n - i - 1; j++) {
        comparisons++;
        push(`Compare index ${j} (${arr[j]}) and ${j + 1} (${arr[j + 1]})`, {
          active: [j, j + 1],
          line: 2,
        });
        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
          swaps++;
          swapped = true;
          push(`Swap ${arr[j + 1]} and ${arr[j]}`, { swap: [j, j + 1], line: 3 });
        }
      }
      sortedSet.add(n - 1 - i);
      if (!swapped) {
        for (let k = 0; k < n; k++) sortedSet.add(k);
        push('No swaps this pass — array is already sorted!', { line: 4 });
        break;
      }
    }
    for (let k = 0; k < n; k++) sortedSet.add(k);
    push('Bubble Sort complete.');
  } else if (algo === 'selection') {
    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      for (let j = i + 1; j < n; j++) {
        comparisons++;
        push(`Scanning minimum: compare ${arr[j]} vs current min ${arr[minIdx]}`, {
          active: [minIdx, j],
          pivot: i,
          line: 3,
        });
        if (arr[j] < arr[minIdx]) minIdx = j;
      }
      if (minIdx !== i) {
        [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
        swaps++;
        push(`Place minimum ${arr[i]} into index ${i}`, { swap: [i, minIdx], line: 4 });
      }
      sortedSet.add(i);
    }
    sortedSet.add(n - 1);
    push('Selection Sort complete.');
  } else if (algo === 'insertion') {
    sortedSet.add(0);
    for (let i = 1; i < n; i++) {
      const key = arr[i];
      let j = i - 1;
      push(`Pick key ${key} at index ${i} to insert left`, { pivot: i, line: 1 });
      while (j >= 0) {
        comparisons++;
        push(`Compare key ${key} with ${arr[j]} at index ${j}`, {
          active: [j, j + 1],
          pivot: i,
          line: 2,
        });
        if (arr[j] > key) {
          arr[j + 1] = arr[j];
          swaps++;
          push(`Shift ${arr[j]} right to index ${j + 1}`, { swap: [j, j + 1], line: 3 });
          j--;
        } else {
          break;
        }
      }
      arr[j + 1] = key;
      for (let k = 0; k <= i; k++) sortedSet.add(k);
      push(`Inserted ${key} at index ${j + 1}`, { swap: [j + 1], line: 4 });
    }
    push('Insertion Sort complete.');
  } else if (algo === 'merge') {
    const mergeSort = (l: number, r: number) => {
      if (l >= r) return;
      const m = Math.floor((l + r) / 2);
      mergeSort(l, m);
      mergeSort(m + 1, r);

      const left = arr.slice(l, m + 1);
      const right = arr.slice(m + 1, r + 1);
      let i = 0;
      let j = 0;
      let k = l;

      while (i < left.length && j < right.length) {
        comparisons++;
        push(`Merge [${l}..${r}]: compare ${left[i]} vs ${right[j]}`, {
          active: [l + i, m + 1 + j],
          line: 4,
        });
        if (left[i] <= right[j]) {
          arr[k] = left[i++];
        } else {
          arr[k] = right[j++];
        }
        swaps++;
        push(`Write ${arr[k]} at index ${k}`, { swap: [k], line: 4 });
        k++;
      }
      while (i < left.length) {
        arr[k] = left[i++];
        swaps++;
        push(`Copy remaining ${arr[k]} to index ${k}`, { swap: [k], line: 4 });
        k++;
      }
      while (j < right.length) {
        arr[k] = right[j++];
        swaps++;
        push(`Copy remaining ${arr[k]} to index ${k}`, { swap: [k], line: 4 });
        k++;
      }
      if (l === 0 && r === n - 1) {
        for (let idx = 0; idx < n; idx++) sortedSet.add(idx);
      }
    };
    mergeSort(0, n - 1);
    for (let k = 0; k < n; k++) sortedSet.add(k);
    push('Merge Sort complete.');
  } else if (algo === 'quick') {
    const quickSort = (low: number, high: number) => {
      if (low > high) return;
      if (low === high) {
        sortedSet.add(low);
        return;
      }
      const pivotVal = arr[high];
      let i = low;
      push(`Partition [${low}..${high}] with pivot ${pivotVal}`, { pivot: high, line: 1 });
      for (let j = low; j < high; j++) {
        comparisons++;
        push(`Compare ${arr[j]} with pivot ${pivotVal}`, { active: [j, high], pivot: high, line: 2 });
        if (arr[j] < pivotVal) {
          if (i !== j) {
            [arr[i], arr[j]] = [arr[j], arr[i]];
            swaps++;
            push(`Swap ${arr[i]} and ${arr[j]}`, { swap: [i, j], pivot: high, line: 3 });
          }
          i++;
        }
      }
      [arr[i], arr[high]] = [arr[high], arr[i]];
      swaps++;
      sortedSet.add(i);
      push(`Pivot ${pivotVal} settled at index ${i}`, { swap: [i, high], line: 4 });
      quickSort(low, i - 1);
      quickSort(i + 1, high);
    };
    quickSort(0, n - 1);
    for (let k = 0; k < n; k++) sortedSet.add(k);
    push('Quick Sort complete.');
  } else if (algo === 'heap') {
    const heapify = (size: number, root: number) => {
      let largest = root;
      const left = 2 * root + 1;
      const right = 2 * root + 2;
      if (left < size) {
        comparisons++;
        push(`Heapify: compare left child ${arr[left]} vs ${arr[largest]}`, {
          active: [left, largest],
          line: 3,
        });
        if (arr[left] > arr[largest]) largest = left;
      }
      if (right < size) {
        comparisons++;
        push(`Heapify: compare right child ${arr[right]} vs ${arr[largest]}`, {
          active: [right, largest],
          line: 3,
        });
        if (arr[right] > arr[largest]) largest = right;
      }
      if (largest !== root) {
        [arr[root], arr[largest]] = [arr[largest], arr[root]];
        swaps++;
        push(`Sift down: swap ${arr[root]} and ${arr[largest]}`, { swap: [root, largest], line: 3 });
        heapify(size, largest);
      }
    };
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      heapify(n, i);
    }
    for (let end = n - 1; end > 0; end--) {
      [arr[0], arr[end]] = [arr[end], arr[0]];
      swaps++;
      sortedSet.add(end);
      push(`Extract max ${arr[end]} to sorted tail index ${end}`, { swap: [0, end], line: 2 });
      heapify(end, 0);
    }
    sortedSet.add(0);
    push('Heap Sort complete.');
  } else if (algo === 'shell') {
    for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
      push(`Shell pass with gap = ${gap}`, { line: 1 });
      for (let i = gap; i < n; i++) {
        const temp = arr[i];
        let j = i;
        while (j >= gap) {
          comparisons++;
          push(`Compare gapped pair index ${j - gap} (${arr[j - gap]}) vs ${temp}`, {
            active: [j - gap, j],
            pivot: i,
            line: 3,
          });
          if (arr[j - gap] > temp) {
            arr[j] = arr[j - gap];
            swaps++;
            push(`Shift ${arr[j]} across gap to index ${j}`, { swap: [j - gap, j], line: 3 });
            j -= gap;
          } else {
            break;
          }
        }
        arr[j] = temp;
      }
    }
    for (let k = 0; k < n; k++) sortedSet.add(k);
    push('Shell Sort complete.');
  } else if (algo === 'counting') {
    const maxVal = Math.max(...arr, 0);
    const counts = new Array(maxVal + 1).fill(0);
    for (let i = 0; i < n; i++) {
      counts[arr[i]]++;
      push(`Tally value ${arr[i]} (count=${counts[arr[i]]})`, { active: [i], line: 1 });
    }
    let writeIdx = 0;
    for (let val = 0; val <= maxVal; val++) {
      while (counts[val] > 0) {
        arr[writeIdx] = val;
        swaps++;
        sortedSet.add(writeIdx);
        push(`Write frequency bucket value ${val} to index ${writeIdx}`, {
          swap: [writeIdx],
          line: 3,
        });
        writeIdx++;
        counts[val]--;
      }
    }
    push('Counting Sort complete (0 element comparisons needed!).');
  } else {
    // Radix Sort LSD base 10
    const maxVal = Math.max(...arr, 1);
    for (let exp = 1; Math.floor(maxVal / exp) > 0; exp *= 10) {
      const buckets: number[][] = Array.from({ length: 10 }, () => []);
      push(`Radix pass at digit place exp=${exp}`, { line: 1 });
      for (let i = 0; i < n; i++) {
        const digit = Math.floor(arr[i] / exp) % 10;
        buckets[digit].push(arr[i]);
        push(`Place ${arr[i]} into bucket [${digit}]`, { active: [i], line: 2 });
      }
      let idx = 0;
      for (let d = 0; d < 10; d++) {
        for (const val of buckets[d]) {
          arr[idx] = val;
          swaps++;
          push(`Collect bucket [${d}] → write ${val} at index ${idx}`, { swap: [idx], line: 3 });
          idx++;
        }
      }
    }
    for (let k = 0; k < n; k++) sortedSet.add(k);
    push('Radix Sort (LSD) complete.');
  }

  return steps;
}

export function generateSearchSteps(
  algo: SearchAlgoId,
  input: number[],
  target: number
): ArrayStep[] {
  const arr = algo === 'linear' ? [...input] : [...input].sort((a, b) => a - b);
  const n = arr.length;
  const steps: ArrayStep[] = [];
  let comparisons = 0;

  const runBinaryRange = (initLow: number, initHigh: number) => {
    let low = initLow;
    let high = initHigh;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      comparisons++;
      steps.push({
        array: arr,
        active: [mid],
        swap: [],
        sorted: [],
        low,
        mid,
        high,
        comparisons,
        swaps: 0,
        line: 2,
        message: `Range [${low}..${high}] → mid=${mid} (${arr[mid]}) vs target ${target}`,
      });
      if (arr[mid] === target) {
        steps.push({
          array: arr,
          active: [],
          swap: [],
          sorted: [],
          low,
          mid,
          high,
          found: mid,
          comparisons,
          swaps: 0,
          line: 3,
          message: `Found ${target} at index ${mid} in ${comparisons} comparisons!`,
        });
        return true;
      }
      if (arr[mid] < target) low = mid + 1;
      else high = mid - 1;
    }
    return false;
  };

  if (algo === 'linear') {
    for (let i = 0; i < n; i++) {
      comparisons++;
      steps.push({
        array: arr,
        active: [i],
        swap: [],
        sorted: [],
        comparisons,
        swaps: 0,
        line: 1,
        message: `Checking index ${i}: ${arr[i]} === ${target}?`,
      });
      if (arr[i] === target) {
        steps.push({
          array: arr,
          active: [],
          swap: [],
          sorted: [],
          found: i,
          comparisons,
          swaps: 0,
          line: 1,
          message: `Found target ${target} at index ${i} in ${comparisons} comparisons!`,
        });
        return steps;
      }
    }
  } else if (algo === 'binary') {
    if (runBinaryRange(0, n - 1)) return steps;
  } else if (algo === 'jump') {
    const step = Math.max(1, Math.floor(Math.sqrt(n)));
    let prev = 0;
    let curr = Math.min(step, n) - 1;
    while (prev < n && arr[curr] < target) {
      comparisons++;
      steps.push({
        array: arr,
        active: [curr],
        swap: [],
        sorted: [],
        low: prev,
        high: curr,
        comparisons,
        swaps: 0,
        line: 1,
        message: `Block jump check index ${curr} (${arr[curr]}) < ${target}`,
      });
      prev = curr + 1;
      if (prev >= n) break;
      curr = Math.min(prev + step - 1, n - 1);
    }
    for (let i = prev; i <= Math.min(curr, n - 1); i++) {
      comparisons++;
      steps.push({
        array: arr,
        active: [i],
        swap: [],
        sorted: [],
        low: prev,
        high: curr,
        comparisons,
        swaps: 0,
        line: 3,
        message: `Linear scan within block: check index ${i} (${arr[i]})`,
      });
      if (arr[i] === target) {
        steps.push({
          array: arr,
          active: [],
          swap: [],
          sorted: [],
          found: i,
          comparisons,
          swaps: 0,
          line: 3,
          message: `Found ${target} at index ${i} in ${comparisons} comparisons!`,
        });
        return steps;
      }
    }
  } else {
    // Exponential Search
    comparisons++;
    if (arr[0] === target) {
      steps.push({
        array: arr,
        active: [],
        swap: [],
        sorted: [],
        found: 0,
        comparisons,
        swaps: 0,
        line: 0,
        message: `Found ${target} immediately at index 0!`,
      });
      return steps;
    }
    let bound = 1;
    while (bound < n && arr[bound] <= target) {
      comparisons++;
      steps.push({
        array: arr,
        active: [bound],
        swap: [],
        sorted: [],
        low: Math.floor(bound / 2),
        high: bound,
        comparisons,
        swaps: 0,
        line: 2,
        message: `Double range bound to index ${bound} (${arr[bound]}) <= ${target}`,
      });
      bound *= 2;
    }
    const lo = Math.floor(bound / 2);
    const hi = Math.min(bound, n - 1);
    steps.push({
      array: arr,
      active: [],
      swap: [],
      sorted: [],
      low: lo,
      high: hi,
      comparisons,
      swaps: 0,
      line: 3,
      message: `Binary searching bounded window [${lo}..${hi}]`,
    });
    if (runBinaryRange(lo, hi)) return steps;
  }

  steps.push({
    array: arr,
    active: [],
    swap: [],
    sorted: [],
    comparisons,
    swaps: 0,
    message: `Target ${target} not found after ${comparisons} comparisons.`,
  });
  return steps;
}

export function generateGraphSteps(
  algo: GraphAlgoId,
  rows: number,
  cols: number,
  start: [number, number],
  end: [number, number],
  walls: Set<string>,
  weights: Set<string>
): GraphStep[] {
  const key = (r: number, c: number) => `${r},${c}`;
  const startKey = key(start[0], start[1]);
  const endKey = key(end[0], end[1]);
  const steps: GraphStep[] = [];
  const visited: string[] = [];
  const visitedSet = new Set<string>();
  const parent = new Map<string, string>();
  const dirs = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1],
  ];

  const buildPath = () => {
    const p: string[] = [];
    let cur: string | undefined = endKey;
    if (!parent.has(endKey) && endKey !== startKey) return p;
    while (cur) {
      p.unshift(cur);
      if (cur === startKey) break;
      cur = parent.get(cur);
    }
    return p;
  };

  if (algo === 'bfs' || algo === 'dfs') {
    const bag: string[] = [startKey];
    const seen = new Set<string>([startKey]);
    while (bag.length > 0) {
      const curr = algo === 'bfs' ? bag.shift()! : bag.pop()!;
      if (!visitedSet.has(curr)) {
        visitedSet.add(curr);
        visited.push(curr);
      }
      steps.push({
        visited: [...visited],
        frontier: [...bag],
        path: [],
        current: curr,
        line: 2,
        message: `${algo.toUpperCase()}: visiting (${curr}) · visited ${visited.length} cells`,
      });
      if (curr === endKey) {
        const path = buildPath();
        steps.push({
          visited: [...visited],
          frontier: [],
          path,
          current: endKey,
          distance: path.length - 1,
          line: 3,
          message: `Path found! Length = ${path.length - 1} steps, visited ${visited.length} cells.`,
        });
        return steps;
      }
      const [r, c] = curr.split(',').map(Number);
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        const nk = key(nr, nc);
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !walls.has(nk) && !seen.has(nk)) {
          seen.add(nk);
          parent.set(nk, curr);
          bag.push(nk);
        }
      }
    }
  } else if (algo === 'bidir') {
    const qA: string[] = [startKey];
    const qB: string[] = [endKey];
    const parA = new Map<string, string>();
    const parB = new Map<string, string>();
    const seenA = new Set<string>([startKey]);
    const seenB = new Set<string>([endKey]);

    const stitchPath = (meet: string) => {
      const left: string[] = [];
      let c: string | undefined = meet;
      while (c) {
        left.unshift(c);
        c = parA.get(c);
      }
      const right: string[] = [];
      let d: string | undefined = parB.get(meet);
      while (d) {
        right.push(d);
        d = parB.get(d);
      }
      return [...left, ...right];
    };

    while (qA.length > 0 && qB.length > 0) {
      const currA = qA.shift()!;
      if (!visitedSet.has(currA)) {
        visitedSet.add(currA);
        visited.push(currA);
      }
      steps.push({
        visited: [...visited],
        frontier: [...qA, ...qB],
        path: [],
        current: currA,
        line: 2,
        message: `Bidirectional Start frontier visiting (${currA})`,
      });
      if (seenB.has(currA)) {
        const path = stitchPath(currA);
        steps.push({
          visited: [...visited],
          frontier: [],
          path,
          current: currA,
          distance: path.length - 1,
          line: 2,
          message: `Frontiers collided at (${currA})! Total path length = ${path.length - 1}`,
        });
        return steps;
      }
      const [ar, ac] = currA.split(',').map(Number);
      for (const [dr, dc] of dirs) {
        const nr = ar + dr;
        const nc = ac + dc;
        const nk = key(nr, nc);
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !walls.has(nk) && !seenA.has(nk)) {
          seenA.add(nk);
          parA.set(nk, currA);
          qA.push(nk);
        }
      }

      const currB = qB.shift()!;
      if (!visitedSet.has(currB)) {
        visitedSet.add(currB);
        visited.push(currB);
      }
      steps.push({
        visited: [...visited],
        frontier: [...qA, ...qB],
        path: [],
        current: currB,
        line: 3,
        message: `Bidirectional Target frontier visiting (${currB})`,
      });
      if (seenA.has(currB)) {
        const path = stitchPath(currB);
        steps.push({
          visited: [...visited],
          frontier: [],
          path,
          current: currB,
          distance: path.length - 1,
          line: 3,
          message: `Frontiers collided at (${currB})! Total path length = ${path.length - 1}`,
        });
        return steps;
      }
      const [br, bc] = currB.split(',').map(Number);
      for (const [dr, dc] of dirs) {
        const nr = br + dr;
        const nc = bc + dc;
        const nk = key(nr, nc);
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !walls.has(nk) && !seenB.has(nk)) {
          seenB.add(nk);
          parB.set(nk, currB);
          qB.push(nk);
        }
      }
    }
  } else {
    // Dijkstra, A*, or Greedy Best-First
    const gScore = new Map<string, number>([[startKey, 0]]);
    const manhattan = (r: number, c: number) => Math.abs(r - end[0]) + Math.abs(c - end[1]);
    const fScore = new Map<string, number>([
      [startKey, algo === 'dijkstra' ? 0 : manhattan(start[0], start[1])],
    ]);
    const open = new Set<string>([startKey]);

    while (open.size > 0) {
      let curr = '';
      let bestF = Infinity;
      for (const node of open) {
        const val = fScore.get(node) ?? Infinity;
        if (val < bestF) {
          bestF = val;
          curr = node;
        }
      }
      if (!curr) break;
      open.delete(curr);
      visitedSet.add(curr);
      visited.push(curr);

      steps.push({
        visited: [...visited],
        frontier: Array.from(open),
        path: [],
        current: curr,
        line: 2,
        message: `${algo === 'astar' ? 'A*' : algo === 'greedy' ? 'Greedy Best-First' : 'Dijkstra'}: pop (${curr}) score=${fScore.get(curr)}`,
      });

      if (curr === endKey) {
        const path = buildPath();
        const cost = gScore.get(endKey) ?? path.length - 1;
        steps.push({
          visited: [...visited],
          frontier: [],
          path,
          current: endKey,
          distance: cost,
          line: 3,
          message: `Path found! Path Cost = ${cost} (${path.length - 1} steps, ${visited.length} explored).`,
        });
        return steps;
      }

      const [r, c] = curr.split(',').map(Number);
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        const nk = key(nr, nc);
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || walls.has(nk) || visitedSet.has(nk)) {
          continue;
        }
        const stepCost = weights.has(nk) ? 5 : 1;
        const tentativeG = (gScore.get(curr) ?? Infinity) + stepCost;
        if (tentativeG < (gScore.get(nk) ?? Infinity)) {
          parent.set(nk, curr);
          gScore.set(nk, tentativeG);
          const h = manhattan(nr, nc);
          const score = algo === 'astar' ? tentativeG + h : algo === 'greedy' ? h : tentativeG;
          fScore.set(nk, score);
          open.add(nk);
        }
      }
    }
  }

  steps.push({
    visited,
    frontier: [],
    path: [],
    current: null,
    message: 'Target unreachable with current wall configuration.',
  });
  return steps;
}

export const NETWORK_NODES: NetworkNode[] = [
  { id: 0, label: 'A', x: 90, y: 145 },
  { id: 1, label: 'B', x: 225, y: 60 },
  { id: 2, label: 'C', x: 225, y: 230 },
  { id: 3, label: 'D', x: 375, y: 60 },
  { id: 4, label: 'E', x: 375, y: 150 },
  { id: 5, label: 'F', x: 375, y: 240 },
  { id: 6, label: 'G', x: 525, y: 100 },
  { id: 7, label: 'H', x: 525, y: 210 },
];

export const DEFAULT_NETWORK_EDGES: NetworkEdge[] = [
  { id: '0-1', u: 0, v: 1, weight: 4 },
  { id: '0-2', u: 0, v: 2, weight: 2 },
  { id: '1-3', u: 1, v: 3, weight: 5 },
  { id: '1-4', u: 1, v: 4, weight: 1 },
  { id: '2-4', u: 2, v: 4, weight: 6 },
  { id: '2-5', u: 2, v: 5, weight: 3 },
  { id: '3-6', u: 3, v: 6, weight: 4 },
  { id: '4-3', u: 4, v: 3, weight: 2 },
  { id: '4-6', u: 4, v: 6, weight: 7 },
  { id: '4-7', u: 4, v: 7, weight: 5 },
  { id: '5-7', u: 5, v: 7, weight: 2 },
  { id: '6-7', u: 6, v: 7, weight: 3 },
];

export function generateNetworkSteps(
  algo: NetworkAlgoId,
  nodes: NetworkNode[],
  edges: NetworkEdge[]
): NetworkStep[] {
  const steps: NetworkStep[] = [];
  const label = (id: number) => nodes.find((n) => n.id === id)?.label || String(id);

  if (algo === 'kruskal') {
    const parent = nodes.map((n) => n.id);
    const find = (x: number): number => {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    };
    const sorted = [...edges].sort((a, b) => a.weight - b.weight);
    const selected: string[] = [];
    const rejected: string[] = [];
    const visitedNodes = new Set<number>();
    let totalWeight = 0;

    steps.push({
      activeNode: null,
      visitedNodes: [],
      selectedEdges: [],
      candidateEdge: null,
      rejectedEdges: [],
      line: 0,
      message: `Sorted ${sorted.length} edges ascending by weight.`,
    });

    for (const e of sorted) {
      const ru = find(e.u);
      const rv = find(e.v);
      steps.push({
        activeNode: e.u,
        visitedNodes: Array.from(visitedNodes),
        selectedEdges: [...selected],
        candidateEdge: e.id,
        rejectedEdges: [...rejected],
        line: 2,
        message: `Inspect edge (${label(e.u)}–${label(e.v)}) wt=${e.weight}: root(${label(e.u)})=${label(ru)}, root(${label(e.v)})=${label(rv)}`,
      });
      if (ru !== rv) {
        parent[ru] = rv;
        selected.push(e.id);
        visitedNodes.add(e.u);
        visitedNodes.add(e.v);
        totalWeight += e.weight;
        steps.push({
          activeNode: e.v,
          visitedNodes: Array.from(visitedNodes),
          selectedEdges: [...selected],
          candidateEdge: null,
          rejectedEdges: [...rejected],
          line: 3,
          message: `Accept (${label(e.u)}–${label(e.v)}) into MST · total MST weight = ${totalWeight}`,
        });
      } else {
        rejected.push(e.id);
        steps.push({
          activeNode: null,
          visitedNodes: Array.from(visitedNodes),
          selectedEdges: [...selected],
          candidateEdge: null,
          rejectedEdges: [...rejected],
          line: 2,
          message: `Reject (${label(e.u)}–${label(e.v)}) — forms a cycle!`,
        });
      }
    }
    steps.push({
      activeNode: null,
      visitedNodes: Array.from(visitedNodes),
      selectedEdges: [...selected],
      candidateEdge: null,
      rejectedEdges: [...rejected],
      line: 3,
      message: `Kruskal MST complete with ${selected.length} edges (Total Weight = ${totalWeight}).`,
    });
  } else if (algo === 'prim') {
    const visited = new Set<number>([0]);
    const selected: string[] = [];
    let totalWeight = 0;
    steps.push({
      activeNode: 0,
      visitedNodes: [0],
      selectedEdges: [],
      candidateEdge: null,
      rejectedEdges: [],
      line: 0,
      message: `Start Prim's MST from node ${label(0)}.`,
    });

    while (visited.size < nodes.length) {
      let bestEdge: NetworkEdge | null = null;
      for (const e of edges) {
        const uIn = visited.has(e.u);
        const vIn = visited.has(e.v);
        if (uIn !== vIn) {
          if (!bestEdge || e.weight < bestEdge.weight) bestEdge = e;
        }
      }
      if (!bestEdge) break;
      const nextNode = visited.has(bestEdge.u) ? bestEdge.v : bestEdge.u;
      steps.push({
        activeNode: nextNode,
        visitedNodes: Array.from(visited),
        selectedEdges: [...selected],
        candidateEdge: bestEdge.id,
        rejectedEdges: [],
        line: 2,
        message: `Minimum crossing cut edge: (${label(bestEdge.u)}–${label(bestEdge.v)}) weight=${bestEdge.weight}`,
      });
      visited.add(nextNode);
      selected.push(bestEdge.id);
      totalWeight += bestEdge.weight;
      steps.push({
        activeNode: nextNode,
        visitedNodes: Array.from(visited),
        selectedEdges: [...selected],
        candidateEdge: null,
        rejectedEdges: [],
        line: 3,
        message: `Added ${label(nextNode)} to MST · cumulative weight = ${totalWeight}`,
      });
    }
    steps.push({
      activeNode: null,
      visitedNodes: Array.from(visited),
      selectedEdges: [...selected],
      candidateEdge: null,
      rejectedEdges: [],
      line: 3,
      message: `Prim MST complete (Total Weight = ${totalWeight}).`,
    });
  } else if (algo === 'topo') {
    // Directed acyclic interpretation (u -> v in DEFAULT_NETWORK_EDGES where u < v or DAG order)
    const adj = new Map<number, NetworkEdge[]>();
    const indeg = new Map<number, number>();
    nodes.forEach((n) => {
      adj.set(n.id, []);
      indeg.set(n.id, 0);
    });
    for (const e of edges) {
      // Ensure DAG direction from lower x -> higher x (tie break by id)
      const nu = nodes.find((n) => n.id === e.u)!;
      const nv = nodes.find((n) => n.id === e.v)!;
      const from = nu.x < nv.x || (nu.x === nv.x && nu.y < nv.y) ? e.u : e.v;
      const to = from === e.u ? e.v : e.u;
      adj.get(from)!.push({ ...e, u: from, v: to });
      indeg.set(to, (indeg.get(to) || 0) + 1);
    }

    const q: number[] = [];
    nodes.forEach((n) => {
      if ((indeg.get(n.id) || 0) === 0) q.push(n.id);
    });
    const order: number[] = [];
    const selected: string[] = [];

    const fmtIndeg = () => {
      const out: Record<number, number> = {};
      indeg.forEach((val, k) => {
        out[k] = val;
      });
      return out;
    };

    steps.push({
      activeNode: null,
      visitedNodes: [],
      selectedEdges: [],
      candidateEdge: null,
      rejectedEdges: [],
      distances: fmtIndeg(),
      queueOrOrder: [...order],
      line: 1,
      message: `Initial 0-in-degree queue: [${q.map(label).join(', ')}]`,
    });

    while (q.length > 0) {
      const u = q.shift()!;
      order.push(u);
      steps.push({
        activeNode: u,
        visitedNodes: [...order],
        selectedEdges: [...selected],
        candidateEdge: null,
        rejectedEdges: [],
        distances: fmtIndeg(),
        queueOrOrder: [...order],
        line: 3,
        message: `Pop ${label(u)} (in-degree=0) → Order: [${order.map(label).join(' → ')}]`,
      });
      for (const e of adj.get(u) || []) {
        const nextDeg = (indeg.get(e.v) || 0) - 1;
        indeg.set(e.v, nextDeg);
        selected.push(e.id);
        if (nextDeg === 0) q.push(e.v);
        steps.push({
          activeNode: e.v,
          visitedNodes: [...order],
          selectedEdges: [...selected],
          candidateEdge: e.id,
          rejectedEdges: [],
          distances: fmtIndeg(),
          queueOrOrder: [...order],
          line: 4,
          message: `Relax (${label(u)} → ${label(e.v)}): indegree[${label(e.v)}] = ${nextDeg}${nextDeg === 0 ? ' (enqueued!)' : ''}`,
        });
      }
    }
    steps.push({
      activeNode: null,
      visitedNodes: [...order],
      selectedEdges: [...selected],
      candidateEdge: null,
      rejectedEdges: [],
      distances: fmtIndeg(),
      queueOrOrder: [...order],
      line: 4,
      message: `Topological Order complete: ${order.map(label).join(' → ')}`,
    });
  } else {
    // Bellman-Ford from node 0 across undirected weighted edges
    const dist = new Map<number, number>();
    const predEdge = new Map<number, string>();
    nodes.forEach((n) => dist.set(n.id, n.id === 0 ? 0 : Infinity));

    const fmtDist = () => {
      const out: Record<number, number | string> = {};
      dist.forEach((v, k) => {
        out[k] = v === Infinity ? '∞' : v;
      });
      return out;
    };

    steps.push({
      activeNode: 0,
      visitedNodes: [0],
      selectedEdges: [],
      candidateEdge: null,
      rejectedEdges: [],
      distances: fmtDist(),
      line: 0,
      message: 'Initialize dist[A] = 0, all others = ∞.',
    });

    for (let pass = 1; pass < nodes.length; pass++) {
      let updated = false;
      for (const e of edges) {
        const pairs: Array<[number, number]> = [
          [e.u, e.v],
          [e.v, e.u],
        ];
        for (const [u, v] of pairs) {
          const du = dist.get(u) ?? Infinity;
          const dv = dist.get(v) ?? Infinity;
          if (du !== Infinity && du + e.weight < dv) {
            dist.set(v, du + e.weight);
            predEdge.set(v, e.id);
            updated = true;
            steps.push({
              activeNode: v,
              visitedNodes: Array.from(dist.entries())
                .filter(([, val]) => val < Infinity)
                .map(([k]) => k),
              selectedEdges: Array.from(predEdge.values()),
              candidateEdge: e.id,
              rejectedEdges: [],
              distances: fmtDist(),
              line: 3,
              message: `Pass ${pass}: relax (${label(u)}–${label(v)}) wt=${e.weight} → dist[${label(v)}] = ${du + e.weight}`,
            });
          }
        }
      }
      if (!updated) {
        steps.push({
          activeNode: null,
          visitedNodes: nodes.map((n) => n.id),
          selectedEdges: Array.from(predEdge.values()),
          candidateEdge: null,
          rejectedEdges: [],
          distances: fmtDist(),
          line: 1,
          message: `No distances improved in Pass ${pass} — converged early!`,
        });
        break;
      }
    }
  }

  return steps;
}

export function buildSampleBst(): BstNode {
  return {
    id: '50',
    val: 50,
    left: {
      id: '30',
      val: 30,
      left: { id: '20', val: 20, left: null, right: null },
      right: { id: '40', val: 40, left: null, right: null },
    },
    right: {
      id: '70',
      val: 70,
      left: { id: '60', val: 60, left: null, right: null },
      right: { id: '85', val: 85, left: null, right: null },
    },
  };
}

export function insertBst(root: BstNode | null, val: number): BstNode {
  if (!root) {
    return { id: `${val}-${Math.random().toString(36).slice(2, 6)}`, val, left: null, right: null };
  }
  if (val < root.val) {
    return { ...root, left: insertBst(root.left, val) };
  }
  if (val > root.val) {
    return { ...root, right: insertBst(root.right, val) };
  }
  return root;
}

export function generateTreeSteps(algo: TreeAlgoId, root: BstNode | null): TreeStep[] {
  if (!root) return [];
  const steps: TreeStep[] = [];
  const visited: string[] = [];
  const output: number[] = [];

  const visit = (node: BstNode, msg: string, line: number) => {
    visited.push(node.id);
    output.push(node.val);
    steps.push({
      activeId: node.id,
      visitedIds: [...visited],
      output: [...output],
      line,
      message: msg,
    });
  };

  if (algo === 'inorder') {
    const dfs = (n: BstNode | null) => {
      if (!n) return;
      dfs(n.left);
      visit(n, `Inorder visit ${n.val}`, 3);
      dfs(n.right);
    };
    dfs(root);
  } else if (algo === 'preorder') {
    const dfs = (n: BstNode | null) => {
      if (!n) return;
      visit(n, `Preorder visit ${n.val}`, 2);
      dfs(n.left);
      dfs(n.right);
    };
    dfs(root);
  } else if (algo === 'postorder') {
    const dfs = (n: BstNode | null) => {
      if (!n) return;
      dfs(n.left);
      dfs(n.right);
      visit(n, `Postorder visit ${n.val}`, 4);
    };
    dfs(root);
  } else {
    const q: BstNode[] = [root];
    while (q.length > 0) {
      const n = q.shift()!;
      visit(n, `Level-order pop ${n.val}`, 2);
      if (n.left) q.push(n.left);
      if (n.right) q.push(n.right);
    }
  }

  return steps;
}

export function generateSlidingSteps(
  algo: SlidingAlgoId,
  arrInput: number[],
  windowK: number,
  targetSum: number,
  textStr: string,
  patStr: string
): SlidingStep[] {
  const steps: SlidingStep[] = [];

  if (algo === 'sliding_window') {
    const arr = arrInput.slice(0, 14);
    const k = Math.max(2, Math.min(arr.length - 1, windowK));
    let sum = 0;
    for (let i = 0; i < k; i++) sum += arr[i];
    let best = sum;
    let bestRange: [number, number] = [0, k - 1];
    steps.push({
      array: arr,
      left: 0,
      right: k - 1,
      highlightIndices: [],
      bestRange,
      metricLabel: `Window Sum = ${sum} · Best = ${best}`,
      line: 0,
      message: `Initialize first window [0..${k - 1}] sum = ${sum}`,
    });

    for (let r = k; r < arr.length; r++) {
      const l = r - k + 1;
      sum += arr[r] - arr[r - k];
      const improved = sum > best;
      if (improved) {
        best = sum;
        bestRange = [l, r];
      }
      steps.push({
        array: arr,
        left: l,
        right: r,
        highlightIndices: [r - k, r],
        bestRange,
        metricLabel: `Window Sum = ${sum} · Best = ${best}`,
        line: improved ? 3 : 2,
        message: `Slide to [${l}..${r}]: +${arr[r]} (enter), -${arr[r - k]} (exit) → sum=${sum}${improved ? ' (NEW BEST!)' : ''}`,
      });
    }
    return steps;
  }

  if (algo === 'two_pointers') {
    const arr = [...arrInput].slice(0, 14).sort((a, b) => a - b);
    let l = 0;
    let r = arr.length - 1;
    while (l < r) {
      const s = arr[l] + arr[r];
      steps.push({
        array: arr,
        left: l,
        right: r,
        highlightIndices: [l, r],
        metricLabel: `arr[${l}] + arr[${r}] = ${s} vs Target ${targetSum}`,
        line: 2,
        message: `Check pair (${arr[l]} + ${arr[r]} = ${s}) vs target ${targetSum}`,
      });
      if (s === targetSum) {
        steps.push({
          array: arr,
          left: l,
          right: r,
          highlightIndices: [l, r],
          bestRange: [l, r],
          metricLabel: `FOUND: ${arr[l]} + ${arr[r]} = ${targetSum}`,
          line: 3,
          message: `Match at indices [${l}, ${r}] (${arr[l]} + ${arr[r]} = ${targetSum})!`,
        });
        return steps;
      }
      if (s < targetSum) l++;
      else r--;
    }
    steps.push({
      array: arr,
      left: l,
      right: r,
      highlightIndices: [],
      metricLabel: `No pair sums to ${targetSum}`,
      line: 4,
      message: `Pointers crossed without finding ${targetSum}.`,
    });
    return steps;
  }

  // KMP Pattern Matching
  const text = (textStr || 'ABABDABACDABABCABAB').toUpperCase();
  const pat = (patStr || 'ABABCABAB').toUpperCase();
  const m = pat.length;
  const n = text.length;
  const lps = new Array(m).fill(0);
  let len = 0;
  let kIdx = 1;
  while (kIdx < m) {
    if (pat[kIdx] === pat[len]) {
      len++;
      lps[kIdx] = len;
      kIdx++;
    } else if (len !== 0) {
      len = lps[len - 1];
    } else {
      lps[kIdx] = 0;
      kIdx++;
    }
  }

  steps.push({
    text,
    pattern: pat,
    lps: [...lps],
    left: 0,
    right: 0,
    highlightIndices: [],
    foundIndices: [],
    metricLabel: `LPS Table = [${lps.join(', ')}]`,
    line: 0,
    message: `Built KMP LPS table [${lps.join(', ')}] for pattern "${pat}".`,
  });

  let i = 0;
  let j = 0;
  const found: number[] = [];
  while (i < n && steps.length < 180) {
    const match = text[i] === pat[j];
    steps.push({
      text,
      pattern: pat,
      lps: [...lps],
      left: i - j,
      right: i,
      highlightIndices: [i],
      foundIndices: [...found],
      metricLabel: `text[${i}]='${text[i]}' vs pat[${j}]='${pat[j]}'`,
      line: match ? 3 : 4,
      message: match
        ? `Match text[${i}] == pat[${j}] ('${text[i]}')`
        : `Mismatch at text[${i}]='${text[i]}' vs pat[${j}]='${pat[j]}' → ${j > 0 ? `fallback j = lps[${j - 1}] = ${lps[j - 1]}` : 'advance i'}`,
    });
    if (match) {
      i++;
      j++;
      if (j === m) {
        const startPos = i - j;
        found.push(startPos);
        steps.push({
          text,
          pattern: pat,
          lps: [...lps],
          left: startPos,
          right: i - 1,
          highlightIndices: Array.from({ length: m }, (_, offset) => startPos + offset),
          foundIndices: [...found],
          metricLabel: `MATCH FOUND at index ${startPos}!`,
          line: 3,
          message: `Full pattern "${pat}" matched at index ${startPos}! Fallback j = lps[${j - 1}] = ${lps[j - 1]}`,
        });
        j = lps[j - 1];
      }
    } else if (j !== 0) {
      j = lps[j - 1];
    } else {
      i++;
    }
  }
  return steps;
}

export function generateKnapsackSteps(
  items: Array<{ name: string; weight: number; value: number }>,
  capacity: number
): KnapsackStep[] {
  const n = items.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));
  const cloneDp = () => dp.map((row) => [...row]);
  const steps: KnapsackStep[] = [
    {
      table: cloneDp(),
      activeCell: null,
      compareCells: [],
      chosenItems: [],
      line: 0,
      message: `Initialized (n+1) x (W+1) DP table for capacity ${capacity}.`,
    },
  ];

  for (let i = 1; i <= n; i++) {
    const { name, weight, value } = items[i - 1];
    for (let w = 1; w <= capacity; w++) {
      const compareCells: Array<[number, number]> = [[i - 1, w]];
      if (weight <= w) {
        compareCells.push([i - 1, w - weight]);
        const skipVal = dp[i - 1][w];
        const takeVal = value + dp[i - 1][w - weight];
        dp[i][w] = Math.max(skipVal, takeVal);
        steps.push({
          table: cloneDp(),
          activeCell: [i, w],
          compareCells,
          chosenItems: [],
          line: 3,
          message: `${name} (wt=${weight}, val=${value}) at cap ${w}: max(skip ${skipVal}, take ${takeVal}) = ${dp[i][w]}`,
        });
      } else {
        dp[i][w] = dp[i - 1][w];
        steps.push({
          table: cloneDp(),
          activeCell: [i, w],
          compareCells,
          chosenItems: [],
          line: 4,
          message: `${name} (wt=${weight}) exceeds cap ${w} → copy skip value ${dp[i][w]}`,
        });
      }
    }
  }

  const chosen: number[] = [];
  let remW = capacity;
  for (let i = n; i >= 1; i--) {
    if (dp[i][remW] !== dp[i - 1][remW]) {
      chosen.push(i - 1);
      remW -= items[i - 1].weight;
    }
  }

  steps.push({
    table: cloneDp(),
    activeCell: [n, capacity],
    compareCells: [],
    chosenItems: chosen.reverse(),
    message: `Optimal value = ${dp[n][capacity]} (selected ${chosen.map((idx) => items[idx].name).join(', ') || 'None'}).`,
  });

  return steps;
}

export function generateLcsSteps(strA: string, strB: string): MatrixDpStep[] {
  const s1 = (strA || 'COMPILLO').toUpperCase().slice(0, 8);
  const s2 = (strB || 'COMPILER').toUpperCase().slice(0, 8);
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  const clone = () => dp.map((r) => [...r]);
  const steps: MatrixDpStep[] = [
    {
      table: clone(),
      activeCell: null,
      compareCells: [],
      pathCells: [],
      resultText: '',
      line: 0,
      message: `Compare "${s1}" vs "${s2}" in (${m + 1} x ${n + 1}) LCS matrix.`,
    },
  ];

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = 1 + dp[i - 1][j - 1];
        steps.push({
          table: clone(),
          activeCell: [i, j],
          compareCells: [[i - 1, j - 1]],
          pathCells: [],
          resultText: '',
          line: 2,
          message: `Match '${s1[i - 1]}' == '${s2[j - 1]}': 1 + dp[${i - 1}][${j - 1}] = ${dp[i][j]}`,
        });
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        steps.push({
          table: clone(),
          activeCell: [i, j],
          compareCells: [
            [i - 1, j],
            [i, j - 1],
          ],
          pathCells: [],
          resultText: '',
          line: 3,
          message: `'${s1[i - 1]}' != '${s2[j - 1]}': max(top ${dp[i - 1][j]}, left ${dp[i][j - 1]}) = ${dp[i][j]}`,
        });
      }
    }
  }

  let r = m;
  let c = n;
  const pathCells: Array<[number, number]> = [];
  const chars: string[] = [];
  while (r > 0 && c > 0) {
    pathCells.push([r, c]);
    if (s1[r - 1] === s2[c - 1]) {
      chars.unshift(s1[r - 1]);
      r--;
      c--;
    } else if (dp[r - 1][c] >= dp[r][c - 1]) {
      r--;
    } else {
      c--;
    }
  }

  steps.push({
    table: clone(),
    activeCell: [m, n],
    compareCells: [],
    pathCells,
    resultText: chars.join(''),
    message: `LCS length = ${dp[m][n]} ("${chars.join('')}")`,
  });
  return steps;
}

export function generateEditDistanceSteps(strA: string, strB: string): MatrixDpStep[] {
  const a = (strA || 'KITTEN').toUpperCase().slice(0, 7);
  const b = (strB || 'SITTING').toUpperCase().slice(0, 7);
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  const clone = () => dp.map((r) => [...r]);

  const steps: MatrixDpStep[] = [
    {
      table: clone(),
      activeCell: null,
      compareCells: [],
      pathCells: [],
      resultText: '',
      line: 0,
      message: `Initialized base edit costs for "${a}" → "${b}".`,
    },
  ];

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
        steps.push({
          table: clone(),
          activeCell: [i, j],
          compareCells: [[i - 1, j - 1]],
          pathCells: [],
          resultText: '',
          line: 2,
          message: `'${a[i - 1]}' == '${b[j - 1]}': 0 edit cost → dp[${i - 1}][${j - 1}] = ${dp[i][j]}`,
        });
      } else {
        const del = dp[i - 1][j];
        const ins = dp[i][j - 1];
        const rep = dp[i - 1][j - 1];
        dp[i][j] = 1 + Math.min(del, ins, rep);
        steps.push({
          table: clone(),
          activeCell: [i, j],
          compareCells: [
            [i - 1, j],
            [i, j - 1],
            [i - 1, j - 1],
          ],
          pathCells: [],
          resultText: '',
          line: 3,
          message: `'${a[i - 1]}' → '${b[j - 1]}': 1 + min(del ${del}, ins ${ins}, rep ${rep}) = ${dp[i][j]}`,
        });
      }
    }
  }

  steps.push({
    table: clone(),
    activeCell: [m, n],
    compareCells: [],
    pathCells: [[m, n]],
    resultText: `${dp[m][n]} edits`,
    message: `Minimum Edit Distance("${a}", "${b}") = ${dp[m][n]} operations.`,
  });

  return steps;
}

export function generateNQueensSteps(n: number): QueensStep[] {
  const board = new Array(n).fill(-1);
  const steps: QueensStep[] = [];
  let solvedFound = false;

  const isSafe = (row: number, col: number) => {
    for (let r = 0; r < row; r++) {
      const c = board[r];
      if (c === col || Math.abs(r - row) === Math.abs(c - col)) return false;
    }
    return true;
  };

  const solve = (row: number): boolean => {
    if (steps.length > 260) return false;
    if (row === n) {
      solvedFound = true;
      steps.push({
        board: [...board],
        tryRow: -1,
        tryCol: -1,
        conflict: false,
        solved: true,
        line: 1,
        message: `Found valid ${n}-Queens placement!`,
      });
      return true;
    }

    for (let col = 0; col < n; col++) {
      const safe = isSafe(row, col);
      steps.push({
        board: [...board],
        tryRow: row,
        tryCol: col,
        conflict: !safe,
        solved: false,
        line: 3,
        message: safe
          ? `Place queen at row ${row}, col ${col}`
          : `Conflict at row ${row}, col ${col} — skip`,
      });
      if (safe) {
        board[row] = col;
        if (solve(row + 1)) return true;
        board[row] = -1;
        steps.push({
          board: [...board],
          tryRow: row,
          tryCol: col,
          conflict: true,
          solved: false,
          line: 4,
          message: `Backtrack from row ${row}, col ${col}`,
        });
      }
    }
    return false;
  };

  solve(0);
  if (!solvedFound && steps.length > 0) {
    steps.push({
      board: [...board],
      tryRow: -1,
      tryCol: -1,
      conflict: false,
      solved: false,
      message: 'Animation limit reached.',
    });
  }
  return steps;
}
