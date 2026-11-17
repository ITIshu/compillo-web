import { Request, Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

const LEETCODE_GRAPHQL = 'https://leetcode.com/graphql';

interface ProblemListItem {
  frontendQuestionId: string;
  title: string;
  titleSlug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  acRate: number;
  paidOnly: boolean;
  topicTags: Array<{ name: string; slug: string }>;
}

const FALLBACK_PROBLEMS: ProblemListItem[] = [
  {
    frontendQuestionId: '1',
    title: 'Two Sum',
    titleSlug: 'two-sum',
    difficulty: 'Easy',
    acRate: 54.2,
    paidOnly: false,
    topicTags: [
      { name: 'Array', slug: 'array' },
      { name: 'Hash Table', slug: 'hash-table' },
    ],
  },
  {
    frontendQuestionId: '20',
    title: 'Valid Parentheses',
    titleSlug: 'valid-parentheses',
    difficulty: 'Easy',
    acRate: 41.4,
    paidOnly: false,
    topicTags: [
      { name: 'String', slug: 'string' },
      { name: 'Stack', slug: 'stack' },
    ],
  },
  {
    frontendQuestionId: '53',
    title: 'Maximum Subarray',
    titleSlug: 'maximum-subarray',
    difficulty: 'Medium',
    acRate: 51.3,
    paidOnly: false,
    topicTags: [
      { name: 'Array', slug: 'array' },
      { name: 'Dynamic Programming', slug: 'dynamic-programming' },
    ],
  },
  {
    frontendQuestionId: '121',
    title: 'Best Time to Buy and Sell Stock',
    titleSlug: 'best-time-to-buy-and-sell-stock',
    difficulty: 'Easy',
    acRate: 54.4,
    paidOnly: false,
    topicTags: [
      { name: 'Array', slug: 'array' },
      { name: 'Dynamic Programming', slug: 'dynamic-programming' },
    ],
  },
  {
    frontendQuestionId: '200',
    title: 'Number of Islands',
    titleSlug: 'number-of-islands',
    difficulty: 'Medium',
    acRate: 60.8,
    paidOnly: false,
    topicTags: [
      { name: 'Depth-First Search', slug: 'depth-first-search' },
      { name: 'Breadth-First Search', slug: 'breadth-first-search' },
    ],
  },
  {
    frontendQuestionId: '322',
    title: 'Coin Change',
    titleSlug: 'coin-change',
    difficulty: 'Medium',
    acRate: 45.1,
    paidOnly: false,
    topicTags: [
      { name: 'Array', slug: 'array' },
      { name: 'Dynamic Programming', slug: 'dynamic-programming' },
    ],
  },
  {
    frontendQuestionId: '704',
    title: 'Binary Search',
    titleSlug: 'binary-search',
    difficulty: 'Easy',
    acRate: 58.6,
    paidOnly: false,
    topicTags: [{ name: 'Binary Search', slug: 'binary-search' }],
  },
];

const listCache = new Map<string, { ts: number; data: any }>();
const questionCache = new Map<string, { ts: number; data: any }>();
const CACHE_TTL_MS = 3 * 60 * 1000;

async function queryLeetCode(query: string, variables: Record<string, any> = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8500);
  try {
    const resp = await fetch(LEETCODE_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: 'https://leetcode.com',
        'User-Agent': 'Compillo-BetaLabs/1.0',
      },
      body: JSON.stringify({ query, variables }),
      signal: ctrl.signal,
    });
    if (!resp.ok) {
      throw new Error(`LeetCode API HTTP ${resp.status}`);
    }
    const json: any = await resp.json();
    if (json.errors && json.errors.length > 0 && !json.data) {
      throw new Error(json.errors[0]?.message || 'LeetCode GraphQL error');
    }
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}

export async function handleLeetCodeDaily(_req: Request, res: Response) {
  try {
    const query = `
      query questionOfToday {
        activeDailyCodingChallengeQuestion {
          date
          link
          question {
            questionFrontendId
            title
            titleSlug
            difficulty
            acRate
            paidOnly: isPaidOnly
            topicTags { name slug }
          }
        }
      }
    `;
    const data = await queryLeetCode(query);
    const daily = data?.activeDailyCodingChallengeQuestion;
    if (!daily?.question) {
      throw new Error('Daily challenge unavailable');
    }
    res.json({ ok: true, source: 'leetcode-live', daily });
  } catch (err: any) {
    res.status(200).json({
      ok: true,
      source: 'offline-cache',
      warning: err?.message || 'Could not reach LeetCode live API',
      daily: {
        date: new Date().toISOString().slice(0, 10),
        link: '/problems/two-sum/',
        question: FALLBACK_PROBLEMS[0],
      },
    });
  }
}

export async function handleLeetCodeList(req: Request, res: Response) {
  const search = String(req.query.search || '').trim().slice(0, 80);
  const difficulty = String(req.query.difficulty || '').trim().toUpperCase();
  const tag = String(req.query.tag || '').trim().toLowerCase().slice(0, 48);
  const limit = Math.min(40, Math.max(5, Number(req.query.limit) || 24));
  const skip = Math.max(0, Number(req.query.skip) || 0);

  const cacheKey = `${search}|${difficulty}|${tag}|${limit}|${skip}`;
  const cached = listCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    res.json(cached.data);
    return;
  }

  const filters: Record<string, any> = {};
  if (search) filters.searchKeywords = search;
  if (difficulty === 'EASY' || difficulty === 'MEDIUM' || difficulty === 'HARD') {
    filters.difficulty = difficulty;
  }
  if (tag && tag !== 'all') {
    filters.tags = [tag];
  }

  const query = `
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        total: totalNum
        questions: data {
          acRate
          difficulty
          frontendQuestionId: questionFrontendId
          paidOnly: isPaidOnly
          title
          titleSlug
          topicTags {
            name
            slug
          }
        }
      }
    }
  `;

  try {
    const data = await queryLeetCode(query, {
      categorySlug: '',
      limit,
      skip,
      filters,
    });
    const list = data?.problemsetQuestionList;
    if (!list?.questions) {
      throw new Error('Malformed LeetCode list response');
    }
    const questions = (list.questions as ProblemListItem[]).filter((q) => !q.paidOnly);
    const payload = {
      ok: true,
      source: 'leetcode-live',
      total: Number(list.total) || questions.length,
      questions,
    };
    listCache.set(cacheKey, { ts: Date.now(), data: payload });
    res.json(payload);
  } catch (err: any) {
    const filtered = FALLBACK_PROBLEMS.filter((q) => {
      if (difficulty && q.difficulty.toUpperCase() !== difficulty) return false;
      if (tag && tag !== 'all' && !q.topicTags.some((t) => t.slug === tag)) return false;
      if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    res.json({
      ok: true,
      source: 'offline-cache',
      warning: err?.message || 'Using cached starter problems',
      total: filtered.length,
      questions: filtered,
    });
  }
}

export async function handleLeetCodeRandom(_req: Request, res: Response) {
  try {
    const randomSkip = Math.floor(Math.random() * 300);
    const query = `
      query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int) {
        problemsetQuestionList: questionList(
          categorySlug: $categorySlug
          limit: $limit
          skip: $skip
        ) {
          questions: data {
            titleSlug
            paidOnly: isPaidOnly
          }
        }
      }
    `;
    const data = await queryLeetCode(query, { categorySlug: '', limit: 25, skip: randomSkip });
    const list = data?.problemsetQuestionList?.questions || [];
    const free = list.filter((q: any) => !q.paidOnly && q.titleSlug);
    if (free.length > 0) {
      const pick = free[Math.floor(Math.random() * free.length)];
      res.json({ ok: true, titleSlug: pick.titleSlug });
      return;
    }
  } catch {
    // fallback
  }
  const fallback = FALLBACK_PROBLEMS[Math.floor(Math.random() * FALLBACK_PROBLEMS.length)];
  res.json({ ok: true, titleSlug: fallback.titleSlug });
}

export async function handleLeetCodeQuestion(req: Request, res: Response) {
  const slug = String(req.params.slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');

  if (!slug) {
    res.status(400).json({ ok: false, error: 'Missing problem slug.' });
    return;
  }

  const cached = questionCache.get(slug);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    res.json(cached.data);
    return;
  }

  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        questionFrontendId
        title
        titleSlug
        content
        difficulty
        likes
        dislikes
        stats
        isPaidOnly
        topicTags {
          name
          slug
        }
        codeSnippets {
          lang
          langSlug
          code
        }
        exampleTestcases
        sampleTestCase
        hints
        metaData
      }
    }
  `;

  try {
    const data = await queryLeetCode(query, { titleSlug: slug });
    const q = data?.question;
    if (!q) {
      res.status(404).json({ ok: false, error: `Question "${slug}" not found on LeetCode.` });
      return;
    }
    const payload = {
      ok: true,
      source: 'leetcode-live',
      question: q,
    };
    questionCache.set(slug, { ts: Date.now(), data: payload });
    res.json(payload);
  } catch (err: any) {
    res.status(502).json({
      ok: false,
      error: err?.message || 'Failed to fetch problem details from LeetCode.',
    });
  }
}

function splitTestcasesIntoGroups(raw: string, arity: number): string[][] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (arity <= 0) return lines.length > 0 ? [lines] : [[]];
  const groups: string[][] = [];
  for (let i = 0; i < lines.length; i += arity) {
    const slice = lines.slice(i, i + arity);
    if (slice.length === arity) groups.push(slice);
  }
  return groups;
}

function runCommandWithTimeout(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs = 8000
): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const cap = 200 * 1024;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      if (stdout.length < cap) stdout += chunk.toString('utf-8');
    });
    child.stderr.on('data', (chunk) => {
      if (stderr.length < cap) stderr += chunk.toString('utf-8');
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: err.message, exitCode: 1, timedOut });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode: typeof code === 'number' ? code : 1,
        timedOut,
      });
    });
  });
}

export async function handleLeetCodeRun(req: Request, res: Response) {
  const { code, language, metaDataJson, testcases } = req.body || {};
  if (typeof code !== 'string' || !code.trim()) {
    res.status(400).json({ ok: false, error: 'Solution code is required.' });
    return;
  }
  if (code.length > 100_000) {
    res.status(400).json({ ok: false, error: 'Code exceeds 100KB limit.' });
    return;
  }
  let lang = String(language || 'python3').toLowerCase().trim();
  if (lang === 'python' || lang === 'py') lang = 'python3';
  if (lang === 'js' || lang === 'ts' || lang === 'typescript' || lang === 'node') lang = 'javascript';
  if (lang === 'c++' || lang === 'c') lang = 'cpp';
  if (!['python3', 'javascript', 'cpp'].includes(lang)) {
    res.status(400).json({ ok: false, error: 'Supported languages: python3, javascript, cpp.' });
    return;
  }

  let meta: any = {};
  try {
    meta = typeof metaDataJson === 'string' && metaDataJson ? JSON.parse(metaDataJson) : metaDataJson || {};
  } catch {
    meta = {};
  }

  const isDesignClass = Boolean(meta?.classname);
  const methodName: string = meta?.name || '';
  const params: Array<{ name: string; type: string }> = Array.isArray(meta?.params) ? meta.params : [];
  const returnType: string = meta?.return?.type || '';
  const arity = isDesignClass ? 2 : Math.max(1, params.length);
  const groups = splitTestcasesIntoGroups(String(testcases || ''), arity);

  if (groups.length === 0) {
    res.status(400).json({ ok: false, error: 'Provide at least one complete testcase matching the parameter count.' });
    return;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compillo-lc-'));

  try {
    if (lang === 'python3') {
      const driver = `
import sys, json, time, io, contextlib, math, heapq, bisect, itertools, functools, collections
from collections import deque, defaultdict, Counter, OrderedDict
from typing import List, Optional, Dict, Set, Tuple

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def _to_list_node(arr):
    if not isinstance(arr, list):
        return arr
    dummy = ListNode(0)
    cur = dummy
    for x in arr:
        cur.next = ListNode(x)
        cur = cur.next
    return dummy.next

def _from_list_node(node):
    out = []
    seen = set()
    while node and id(node) not in seen and len(out) < 5000:
        seen.add(id(node))
        out.append(node.val)
        node = node.next
    return out

def _to_tree_node(arr):
    if not isinstance(arr, list) or not arr or arr[0] is None:
        return None
    root = TreeNode(arr[0])
    q = deque([root])
    i = 1
    while q and i < len(arr):
        node = q.popleft()
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            q.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            q.append(node.right)
        i += 1
    return root

def _from_tree_node(root):
    if not root:
        return []
    out = []
    q = deque([root])
    while q and len(out) < 2000:
        node = q.popleft()
        if node is None:
            out.append(None)
        else:
            out.append(node.val)
            q.append(node.left)
            q.append(node.right)
    while out and out[-1] is None:
        out.pop()
    return out

def _convert_arg(val, typ):
    if typ == 'ListNode':
        return _to_list_node(val)
    if typ == 'ListNode[]' and isinstance(val, list):
        return [_to_list_node(x) for x in val]
    if typ == 'TreeNode':
        return _to_tree_node(val)
    return val

def _format_ret(val, typ):
    if isinstance(val, ListNode) or typ == 'ListNode':
        return _from_list_node(val) if val is not None else []
    if isinstance(val, TreeNode) or typ == 'TreeNode':
        return _from_tree_node(val)
    return val

# --- USER CODE ---
${code}
# --- END USER CODE ---

_META = json.loads(${JSON.stringify(JSON.stringify(meta))})
_GROUPS = json.loads(${JSON.stringify(JSON.stringify(groups))})

_results = []
for _idx, _raw_args in enumerate(_GROUPS, 1):
    _buf = io.StringIO()
    _t0 = time.perf_counter()
    try:
        _parsed = [json.loads(x) for x in _raw_args]
        with contextlib.redirect_stdout(_buf):
            if _META.get('classname'):
                _cls = globals()[_META['classname']]
                _cmds, _vals = _parsed[0], _parsed[1]
                _inst = _cls(*_vals[0])
                _out_seq = [None]
                for _c, _v in zip(_cmds[1:], _vals[1:]):
                    _out_seq.append(getattr(_inst, _c)(*_v))
                _res_val = _out_seq
            else:
                _params = _META.get('params', [])
                _conv = [_convert_arg(_parsed[i], _params[i]['type'] if i < len(_params) else '') for i in range(len(_parsed))]
                _sol = Solution()
                _fn = getattr(_sol, _META.get('name', ''))
                _ret = _fn(*_conv)
                _ret_type = (_META.get('return') or {}).get('type', '')
                if _ret is None and _ret_type == 'void' and len(_conv) > 0:
                    _res_val = _format_ret(_conv[0], _params[0]['type'] if _params else '')
                else:
                    _res_val = _format_ret(_ret, _ret_type)
        _ms = round((time.perf_counter() - _t0) * 1000, 2)
        _results.append({
            "caseIndex": _idx,
            "ok": True,
            "inputs": _raw_args,
            "output": json.dumps(_res_val),
            "stdout": _buf.getvalue()[:2000],
            "runtimeMs": _ms,
        })
    except Exception as _exc:
        _ms = round((time.perf_counter() - _t0) * 1000, 2)
        _results.append({
            "caseIndex": _idx,
            "ok": False,
            "inputs": _raw_args,
            "error": f"{type(_exc).__name__}: {_exc}",
            "stdout": _buf.getvalue()[:2000],
            "runtimeMs": _ms,
        })

print("__COMPILLO_LC_RESULT__" + json.dumps(_results))
`;
      const scriptPath = path.join(tempDir, 'run_lc.py');
      fs.writeFileSync(scriptPath, driver, 'utf-8');
      const pyBin = fs.existsSync('/usr/bin/python3') ? '/usr/bin/python3' : 'python3';
      const execRes = await runCommandWithTimeout(pyBin, [scriptPath], tempDir, 8000);

      if (execRes.timedOut) {
        res.status(200).json({ ok: false, error: 'Time Limit Exceeded (8s). Check for infinite loops.' });
        return;
      }

      const marker = execRes.stdout
        .split('\n')
        .find((l) => l.startsWith('__COMPILLO_LC_RESULT__'));

      if (!marker) {
        res.status(200).json({
          ok: false,
          error: execRes.stderr.trim() || 'Execution failed before producing testcase output.',
          stdout: execRes.stdout,
        });
        return;
      }

      const cases = JSON.parse(marker.replace('__COMPILLO_LC_RESULT__', ''));
      res.json({ ok: true, language: 'python3', cases, stderr: execRes.stderr.trim() });
      return;
    }

    if (lang === 'javascript') {
      const driver = `
class ListNode {
  constructor(val = 0, next = null) { this.val = val; this.next = next; }
}
class TreeNode {
  constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; }
}
function _toListNode(arr) {
  if (!Array.isArray(arr)) return arr;
  const dummy = new ListNode(0);
  let cur = dummy;
  for (const x of arr) { cur.next = new ListNode(x); cur = cur.next; }
  return dummy.next;
}
function _fromListNode(node) {
  const out = [];
  const seen = new Set();
  while (node && !seen.has(node) && out.length < 5000) { seen.add(node); out.push(node.val); node = node.next; }
  return out;
}
function _toTreeNode(arr) {
  if (!Array.isArray(arr) || !arr.length || arr[0] === null) return null;
  const root = new TreeNode(arr[0]);
  const q = [root];
  let i = 1;
  while (q.length && i < arr.length) {
    const n = q.shift();
    if (i < arr.length && arr[i] !== null) { n.left = new TreeNode(arr[i]); q.push(n.left); }
    i++;
    if (i < arr.length && arr[i] !== null) { n.right = new TreeNode(arr[i]); q.push(n.right); }
    i++;
  }
  return root;
}
function _fromTreeNode(root) {
  if (!root) return [];
  const out = [];
  const q = [root];
  while (q.length && out.length < 2000) {
    const n = q.shift();
    if (!n) out.push(null);
    else { out.push(n.val); q.push(n.left); q.push(n.right); }
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}
function _convertArg(val, typ) {
  if (typ === 'ListNode') return _toListNode(val);
  if (typ === 'ListNode[]' && Array.isArray(val)) return val.map(_toListNode);
  if (typ === 'TreeNode') return _toTreeNode(val);
  return val;
}
function _formatRet(val, typ) {
  if (val instanceof ListNode || typ === 'ListNode') return val ? _fromListNode(val) : [];
  if (val instanceof TreeNode || typ === 'TreeNode') return _fromTreeNode(val);
  return val;
}

${code}

const _META = ${JSON.stringify(meta)};
const _GROUPS = ${JSON.stringify(groups)};
const _targetName = _META.classname || _META.name;
const _results = [];

for (let i = 0; i < _GROUPS.length; i++) {
  const rawArgs = _GROUPS[i];
  const logs = [];
  const origLog = console.log;
  console.log = (...items) => logs.push(items.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(' '));
  const t0 = performance.now();
  try {
    const parsed = rawArgs.map((x) => JSON.parse(x));
    let resVal;
    if (_META.classname) {
      const Cls = eval(_META.classname);
      const [cmds, vals] = parsed;
      const inst = new Cls(...vals[0]);
      const seq = [null];
      for (let k = 1; k < cmds.length; k++) {
        const ret = inst[cmds[k]](...vals[k]);
        seq.push(ret === undefined ? null : ret);
      }
      resVal = seq;
    } else {
      const paramsMeta = _META.params || [];
      const conv = parsed.map((v, idx) => _convertArg(v, paramsMeta[idx]?.type || ''));
      const fn = eval(_targetName);
      const ret = fn(...conv);
      const retType = (_META.return && _META.return.type) || '';
      if (ret === undefined && retType === 'void' && conv.length > 0) {
        resVal = _formatRet(conv[0], paramsMeta[0]?.type || '');
      } else {
        resVal = _formatRet(ret, retType);
      }
    }
    const ms = Math.round((performance.now() - t0) * 100) / 100;
    console.log = origLog;
    _results.push({
      caseIndex: i + 1,
      ok: true,
      inputs: rawArgs,
      output: JSON.stringify(resVal),
      stdout: logs.join('\\n').slice(0, 2000),
      runtimeMs: ms,
    });
  } catch (err) {
    const ms = Math.round((performance.now() - t0) * 100) / 100;
    console.log = origLog;
    _results.push({
      caseIndex: i + 1,
      ok: false,
      inputs: rawArgs,
      error: err && err.message ? err.message : String(err),
      stdout: logs.join('\\n').slice(0, 2000),
      runtimeMs: ms,
    });
  }
}
process.stdout.write("__COMPILLO_LC_RESULT__" + JSON.stringify(_results) + "\\n");
`;
      const scriptPath = path.join(tempDir, 'run_lc.cjs');
      fs.writeFileSync(scriptPath, driver, 'utf-8');
      const nodeBin = process.execPath;
      const execRes = await runCommandWithTimeout(nodeBin, [scriptPath], tempDir, 8000);

      if (execRes.timedOut) {
        res.status(200).json({ ok: false, error: 'Time Limit Exceeded (8s).' });
        return;
      }
      const marker = execRes.stdout
        .split('\n')
        .find((l) => l.startsWith('__COMPILLO_LC_RESULT__'));

      if (!marker) {
        res.status(200).json({
          ok: false,
          error: execRes.stderr.trim() || 'JavaScript execution failed.',
          stdout: execRes.stdout,
        });
        return;
      }
      const cases = JSON.parse(marker.replace('__COMPILLO_LC_RESULT__', ''));
      res.json({ ok: true, language: 'javascript', cases, stderr: execRes.stderr.trim() });
      return;
    }

    // C++ execution: build a lightweight JSON parser + Solution caller for common scalar/vector types
    const gppBin = fs.existsSync('/usr/bin/g++') ? '/usr/bin/g++' : 'g++';
    const hasMain = /\bint\s+main\s*\(/.test(code);
    let cppSource = '';

    if (hasMain) {
      cppSource = code;
    } else {
      const supportedCppType = (t: string) =>
        ['integer', 'long', 'double', 'boolean', 'string', 'integer[]', 'string[]', 'integer[][]', 'void'].includes(t);

      const canAutoWrap =
        !isDesignClass &&
        methodName &&
        params.every((p) => supportedCppType(p.type)) &&
        supportedCppType(returnType || 'void');

      if (!canAutoWrap) {
        res.status(200).json({
          ok: false,
          error:
            'Automatic C++ LeetCode test harness supports int, long, double, bool, string, and 1D/2D vectors (or provide your own int main()). Switch to Python 3 or JavaScript for TreeNode/ListNode/Design classes.',
        });
        return;
      }

      const mapCppType = (t: string) => {
        switch (t) {
          case 'integer':
            return 'int';
          case 'long':
            return 'long long';
          case 'double':
            return 'double';
          case 'boolean':
            return 'bool';
          case 'string':
            return 'string';
          case 'integer[]':
            return 'vector<int>';
          case 'string[]':
            return 'vector<string>';
          case 'integer[][]':
            return 'vector<vector<int>>';
          default:
            return 'void';
        }
      };

      const callBlocks = groups
        .map((grp, idx) => {
          const parsedVals = grp.map((g) => {
            try {
              return JSON.parse(g);
            } catch {
              return g;
            }
          });
          const decls = params
            .map((p, pi) => {
              const v = parsedVals[pi];
              const ctype = mapCppType(p.type);
              if (p.type === 'string') return `${ctype} arg${pi} = ${JSON.stringify(String(v ?? ''))};`;
              if (p.type === 'boolean') return `${ctype} arg${pi} = ${v ? 'true' : 'false'};`;
              if (p.type === 'integer[]') {
                const arr = Array.isArray(v) ? v.map(Number) : [];
                return `${ctype} arg${pi} = {${arr.join(', ')}};`;
              }
              if (p.type === 'string[]') {
                const arr = Array.isArray(v) ? v.map((s) => JSON.stringify(String(s))) : [];
                return `${ctype} arg${pi} = {${arr.join(', ')}};`;
              }
              if (p.type === 'integer[][]') {
                const mat = Array.isArray(v)
                  ? v.map((row: any[]) => `{${(Array.isArray(row) ? row : []).map(Number).join(', ')}}`)
                  : [];
                return `${ctype} arg${pi} = {${mat.join(', ')}};`;
              }
              return `${ctype} arg${pi} = ${Number(v ?? 0)};`;
            })
            .join('\n      ');
          const argList = params.map((_, pi) => `arg${pi}`).join(', ');
          const invoke =
            returnType === 'void'
              ? `sol.${methodName}(${argList}); cout << "__CASE_${idx}__=" << _to_json(arg0) << "\\n";`
              : `auto res = sol.${methodName}(${argList}); cout << "__CASE_${idx}__=" << _to_json(res) << "\\n";`;

          return `    {
      auto t0 = chrono::high_resolution_clock::now();
      Solution sol;
      ${decls}
      ${invoke}
      auto t1 = chrono::high_resolution_clock::now();
      double ms = chrono::duration<double, milli>(t1 - t0).count();
      cout << "__MS_${idx}__=" << ms << "\\n";
    }`;
        })
        .join('\n');

      cppSource = `#include <bits/stdc++.h>
using namespace std;

string _to_json(int x) { return to_string(x); }
string _to_json(long long x) { return to_string(x); }
string _to_json(double x) { ostringstream os; os << x; return os.str(); }
string _to_json(bool x) { return x ? "true" : "false"; }
string _to_json(const string& s) {
  string out = "\\"";
  for (char c : s) {
    if (c == '"' || c == '\\\\') out += '\\\\';
    out += c;
  }
  return out + "\\"";
}
template <typename T>
string _to_json(const vector<T>& v) {
  string out = "[";
  for (size_t i = 0; i < v.size(); ++i) {
    if (i > 0) out += ",";
    out += _to_json(v[i]);
  }
  return out + "]";
}

${code}

int main() {
${callBlocks}
  return 0;
}
`;
    }

    const srcPath = path.join(tempDir, 'main.cpp');
    const binPath = path.join(tempDir, 'main');
    fs.writeFileSync(srcPath, cppSource, 'utf-8');
    const compileRes = await runCommandWithTimeout(gppBin, ['-std=c++17', '-O2', srcPath, '-o', binPath], tempDir, 10000);
    if (compileRes.exitCode !== 0) {
      res.status(200).json({ ok: false, error: compileRes.stderr.trim() || 'C++ compilation failed.' });
      return;
    }

    const execRes = await runCommandWithTimeout(binPath, [], tempDir, 8000);
    if (execRes.timedOut) {
      res.status(200).json({ ok: false, error: 'Time Limit Exceeded (8s).' });
      return;
    }

    if (hasMain) {
      res.json({
        ok: true,
        language: 'cpp',
        cases: [
          {
            caseIndex: 1,
            ok: execRes.exitCode === 0,
            inputs: ['custom main()'],
            output: execRes.stdout.trim() || '(no stdout)',
            stdout: execRes.stdout,
            error: execRes.stderr.trim() || undefined,
            runtimeMs: 0,
          },
        ],
      });
      return;
    }

    const lines = execRes.stdout.split('\n');
    const cases = groups.map((rawArgs, idx) => {
      const valLine = lines.find((l) => l.startsWith(`__CASE_${idx}__=`));
      const msLine = lines.find((l) => l.startsWith(`__MS_${idx}__=`));
      const ms = msLine ? Math.round(Number(msLine.split('=')[1]) * 100) / 100 : 0;
      return {
        caseIndex: idx + 1,
        ok: Boolean(valLine) && execRes.exitCode === 0,
        inputs: rawArgs,
        output: valLine ? valLine.slice(`__CASE_${idx}__=`.length) : '',
        stdout: '',
        error: !valLine ? execRes.stderr.trim() || 'Runtime failure' : undefined,
        runtimeMs: ms,
      };
    });
    res.json({ ok: true, language: 'cpp', cases, stderr: execRes.stderr.trim() });
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup failures
    }
  }
}
