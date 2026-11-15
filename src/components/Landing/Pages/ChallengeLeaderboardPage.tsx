import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Flame, LogIn, Play, RefreshCw, Trophy, XCircle } from 'lucide-react';
import { User } from 'firebase/auth';
import { WebsiteThemeTokens } from './WebsitePageTheme';
import {
  LeaderboardEntryDoc,
  submitChallengeSolve,
  subscribeLeaderboard,
} from '../../../services/firestorePlatformService';
import { googleSignIn } from '../../../services/googleAuth';
import { runPythonSnippet } from './ssePythonHelper';

interface ChallengeLeaderboardPageProps {
  tokens: WebsiteThemeTokens;
  firebaseUser: User | null;
  onClaimCertificate: (score: number, courseTitle: string) => void;
}

interface DailyChallengeSpec {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium';
  prompt: string;
  sampleInput: string;
  sampleOutput: string;
  starterCode: string;
  harnessSuffix: string;
}

const DAILY_CHALLENGES: DailyChallengeSpec[] = [
  {
    id: 'two-sum-daily',
    title: '01. Two Sum Index Pair',
    difficulty: 'Easy',
    prompt:
      'Implement solve(nums, target) returning a list of two distinct 0-based indices [i, j] such that nums[i] + nums[j] == target.',
    sampleInput: 'nums = [2, 7, 11, 15], target = 9',
    sampleOutput: '[0, 1]',
    starterCode: `def solve(nums, target):\n    seen = {}\n    for i, val in enumerate(nums):\n        need = target - val\n        if need in seen:\n            return [seen[need], i]\n        seen[val] = i\n    return []\n`,
    harnessSuffix: `\nimport json, time\n_t0 = time.perf_counter()\n_cases = [\n    (([2, 7, 11, 15], 9), [0, 1]),\n    (([3, 2, 4], 6), [1, 2]),\n    (([3, 3], 6), [0, 1]),\n    ((list(range(1, 5001)), 9999), [4998, 4999]),\n]\n_results = []\n_all_ok = True\nfor idx, (inp, exp) in enumerate(_cases, 1):\n    got = solve(*inp)\n    ok = sorted(got) == sorted(exp) and len(got) == 2 and got[0] != got[1]\n    if not ok:\n        _all_ok = False\n    _results.append({"case": idx, "ok": ok, "got": str(got), "expected": str(exp)})\n_ms = round((time.perf_counter() - _t0) * 1000, 2)\nprint("__COMPILLO_GRADE__" + json.dumps({"allOk": _all_ok, "ms": _ms, "cases": _results}))\n`,
  },
  {
    id: 'valid-brackets',
    title: '02. Balanced Brackets Validator',
    difficulty: 'Easy',
    prompt:
      'Implement solve(s) returning True if brackets (), {}, and [] in string s are balanced and properly nested, otherwise False.',
    sampleInput: 's = "{[()]}"',
    sampleOutput: 'True',
    starterCode: `def solve(s):\n    pairs = {')': '(', ']': '[', '}': '{'}\n    stack = []\n    for ch in s:\n        if ch in '([{':\n            stack.append(ch)\n        elif ch in pairs:\n            if not stack or stack.pop() != pairs[ch]:\n                return False\n    return len(stack) == 0\n`,
    harnessSuffix: `\nimport json, time\n_t0 = time.perf_counter()\n_cases = [\n    (("{[()]}",), True),\n    (("()[]{}",), True),\n    (("(]",), False),\n    (("([)]",), False),\n]\n_results = []\n_all_ok = True\nfor idx, (inp, exp) in enumerate(_cases, 1):\n    got = solve(*inp)\n    ok = bool(got) is exp\n    if not ok:\n        _all_ok = False\n    _results.append({"case": idx, "ok": ok, "got": str(got), "expected": str(exp)})\n_ms = round((time.perf_counter() - _t0) * 1000, 2)\nprint("__COMPILLO_GRADE__" + json.dumps({"allOk": _all_ok, "ms": _ms, "cases": _results}))\n`,
  },
  {
    id: 'top-k-freq',
    title: '03. Top-K Frequent Elements',
    difficulty: 'Medium',
    prompt:
      'Implement solve(nums, k) returning a list of the k most frequent integers in nums (any order).',
    sampleInput: 'nums = [1, 1, 1, 2, 2, 3], k = 2',
    sampleOutput: '[1, 2]',
    starterCode: `from collections import Counter\n\ndef solve(nums, k):\n    return [item for item, _ in Counter(nums).most_common(k)]\n`,
    harnessSuffix: `\nimport json, time\n_t0 = time.perf_counter()\n_cases = [\n    (([1, 1, 1, 2, 2, 3], 2), [1, 2]),\n    (([4, 4, 4, 4], 1), [4]),\n    (([9, 8, 9, 7, 8, 9], 2), [8, 9]),\n]\n_results = []\n_all_ok = True\nfor idx, (inp, exp) in enumerate(_cases, 1):\n    got = solve(*inp)\n    ok = set(got) == set(exp) and len(got) == len(exp)\n    if not ok:\n        _all_ok = False\n    _results.append({"case": idx, "ok": ok, "got": str(got), "expected": str(exp)})\n_ms = round((time.perf_counter() - _t0) * 1000, 2)\nprint("__COMPILLO_GRADE__" + json.dumps({"allOk": _all_ok, "ms": _ms, "cases": _results}))\n`,
  },
];

interface GradeCase {
  case: number;
  ok: boolean;
  got: string;
  expected: string;
}

export const ChallengeLeaderboardPage: React.FC<ChallengeLeaderboardPageProps> = ({
  tokens,
  firebaseUser,
  onClaimCertificate,
}) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const challenge = DAILY_CHALLENGES[selectedIdx];
  const [code, setCode] = useState(challenge.starterCode);
  const [isRunning, setIsRunning] = useState(false);
  const [gradeCases, setGradeCases] = useState<GradeCase[] | null>(null);
  const [allPassed, setAllPassed] = useState(false);
  const [runtimeMs, setRuntimeMs] = useState<number | null>(null);
  const [rawStderr, setRawStderr] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntryDoc[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [boardError, setBoardError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingBoard(true);
    const unsub = subscribeLeaderboard(
      (rows) => {
        setLeaderboard(rows);
        setLoadingBoard(false);
      },
      (err) => {
        setBoardError(err.message);
        setLoadingBoard(false);
      }
    );
    return () => unsub();
  }, []);

  const handleSelectChallenge = (idx: number) => {
    setSelectedIdx(idx);
    setCode(DAILY_CHALLENGES[idx].starterCode);
    setGradeCases(null);
    setAllPassed(false);
    setRawStderr(null);
    setSaveNote(null);
  };

  const handleRunAndSubmit = async () => {
    setIsRunning(true);
    setGradeCases(null);
    setAllPassed(false);
    setRawStderr(null);
    setSaveNote(null);

    try {
      const result = await runPythonSnippet(code + challenge.harnessSuffix, 'challenge.py');
      if (result.stderr) {
        setRawStderr(result.stderr.trim());
      }

      const markerLine = result.stdout
        .split('\n')
        .find((line) => line.startsWith('__COMPILLO_GRADE__'));

      if (!markerLine) {
        if (!result.stderr) {
          setRawStderr('Did not receive test harness output. Make sure solve(...) does not exit early.');
        }
        setIsRunning(false);
        return;
      }

      const parsed = JSON.parse(markerLine.replace('__COMPILLO_GRADE__', ''));
      setGradeCases(parsed.cases || []);
      setRuntimeMs(parsed.ms ?? result.elapsedMs);
      setAllPassed(Boolean(parsed.allOk));

      if (parsed.allOk) {
        if (firebaseUser) {
          await submitChallengeSolve(parsed.ms ?? result.elapsedMs);
          setSaveNote('All test cases passed. Solve and daily streak saved to Firestore Leaderboard.');
        } else {
          setSaveNote('All test cases passed. Sign in with Google to record your streak on the Leaderboard.');
        }
      }
    } catch (err: any) {
      setRawStderr(err?.message || 'Execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-medium flex items-center gap-2" style={{ color: tokens.fgMuted }}>
            <span>Daily Coding Arena</span>
            <span aria-hidden="true">·</span>
            <span>Real Python Runner</span>
            <span aria-hidden="true">·</span>
            <span>Firestore Streaks</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
            Daily Coding Challenge &amp; Streak Leaderboard
          </h1>
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: tokens.fgMuted }}>
            Solve verified Python algorithm tasks against live test cases, benchmark runtime performance, and climb the persistent community streak leaderboard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {DAILY_CHALLENGES.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectChallenge(idx)}
              className="px-3 py-2 rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              style={
                selectedIdx === idx
                  ? { backgroundColor: tokens.accent, color: tokens.accentText, borderColor: tokens.accent }
                  : { backgroundColor: tokens.surfaceBg, color: tokens.fgPrimary, borderColor: tokens.borderColor }
              }
            >
              Problem {idx + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Interactive Challenge Runner */}
        <div
          className="lg:col-span-7 p-6 rounded-2xl border space-y-5"
          style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3" style={{ borderColor: tokens.borderColor }}>
            <div>
              <h2 className="text-lg font-bold">{challenge.title}</h2>
              <div className="text-xs" style={{ color: tokens.fgMuted }}>
                Difficulty: {challenge.difficulty} · Language: Python 3
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCode(challenge.starterCode)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer"
              style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
            >
              <RefreshCw size={12} />
              <span>Reset Code</span>
            </button>
          </div>

          <p className="text-sm leading-relaxed" style={{ color: tokens.fgPrimary }}>
            {challenge.prompt}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg border" style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}>
              <div className="text-[11px] font-sans mb-1" style={{ color: tokens.fgMuted }}>Sample Input</div>
              <div>{challenge.sampleInput}</div>
            </div>
            <div className="p-3 rounded-lg border" style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}>
              <div className="text-[11px] font-sans mb-1" style={{ color: tokens.fgMuted }}>Expected Output</div>
              <div>{challenge.sampleOutput}</div>
            </div>
          </div>

          <textarea
            rows={10}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="w-full p-4 rounded-xl border text-xs font-mono leading-relaxed outline-none resize-y"
            style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.fgPrimary }}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleRunAndSubmit}
              disabled={isRunning}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
            >
              <Play size={14} />
              <span>{isRunning ? 'Evaluating Test Cases...' : 'Run Tests & Submit Score'}</span>
            </button>

            {allPassed && (
              <button
                type="button"
                onClick={() => onClaimCertificate(100, challenge.title)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border text-xs font-semibold cursor-pointer"
                style={{ borderColor: tokens.accent, color: tokens.accent, backgroundColor: tokens.pageBg }}
              >
                <Award size={14} />
                <span>Claim Challenge Certificate</span>
              </button>
            )}
          </div>

          {rawStderr && (
            <pre className="p-3 rounded-lg border border-rose-500/40 bg-rose-950/20 text-xs font-mono text-rose-300 overflow-x-auto">
              {rawStderr}
            </pre>
          )}

          {saveNote && (
            <div className="text-xs font-medium text-emerald-400">
              {saveNote}
            </div>
          )}

          {gradeCases && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Test Suite Results</span>
                {runtimeMs !== null && (
                  <span className="font-mono tabular-nums" style={{ color: tokens.fgMuted }}>
                    Runtime: {runtimeMs} ms
                  </span>
                )}
              </div>
              {gradeCases.map((gc) => (
                <div
                  key={gc.case}
                  className="p-3 rounded-lg border flex items-center justify-between gap-3 text-xs font-mono"
                  style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                >
                  <div className="flex items-center gap-2">
                    {gc.ok ? (
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-rose-400 shrink-0" />
                    )}
                    <span>Test Case {gc.case}</span>
                  </div>
                  <div className="truncate" style={{ color: tokens.fgMuted }}>
                    got {gc.got} · expected {gc.expected}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Persistent Firestore Streak Leaderboard */}
        <div
          className="lg:col-span-5 p-6 rounded-2xl border space-y-5"
          style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: tokens.borderColor }}>
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-amber-400" />
              <h2 className="text-base font-bold">Community Streak Leaderboard</h2>
            </div>
            {!firebaseUser && (
              <button
                type="button"
                onClick={() => void googleSignIn()}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
              >
                <LogIn size={12} />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {boardError && <div className="text-xs text-rose-400">{boardError}</div>}

          {loadingBoard ? (
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-12 rounded-xl border animate-pulse" style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }} />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-8 rounded-xl border text-center space-y-2" style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}>
              <Flame size={24} className="mx-auto text-amber-400 opacity-75" />
              <div className="text-sm font-semibold">Be first on the leaderboard</div>
              <p className="text-xs" style={{ color: tokens.fgMuted }}>
                Sign in with Google, solve any daily challenge problem on the left, and your score will appear here live.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: tokens.borderColor, color: tokens.fgMuted }}>
                    <th className="py-2 pr-2 font-semibold">#</th>
                    <th className="py-2 pr-2 font-semibold">Coder</th>
                    <th className="py-2 px-2 font-semibold text-right">Solved</th>
                    <th className="py-2 px-2 font-semibold text-right">Streak</th>
                    <th className="py-2 pl-2 font-semibold text-right">Best</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: tokens.borderColor }}>
                  {leaderboard.map((row, idx) => (
                    <tr key={row.userId} className="h-11">
                      <td className="pr-2 font-mono tabular-nums font-bold">{idx + 1}</td>
                      <td className="pr-2 font-medium truncate max-w-[140px]">{row.displayName}</td>
                      <td className="px-2 text-right font-mono tabular-nums font-semibold">{row.solvedCount}</td>
                      <td className="px-2 text-right font-mono tabular-nums text-amber-400">
                        {row.currentStreak}d
                      </td>
                      <td className="pl-2 text-right font-mono tabular-nums" style={{ color: tokens.fgMuted }}>
                        {row.bestRuntimeMs}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
