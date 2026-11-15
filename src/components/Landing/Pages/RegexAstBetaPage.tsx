import React, { useMemo, useState } from 'react';
import { Braces, Play, Regex } from 'lucide-react';
import { WebsiteThemeTokens } from './WebsitePageTheme';

interface RegexAstBetaPageProps {
  tokens: WebsiteThemeTokens;
}

interface AstNodeSummary {
  kind: string;
  line: number;
  column: number;
  text: string;
  children: AstNodeSummary[];
}

interface TokenSummary {
  kind: string;
  text: string;
  line: number;
  column: number;
}

const REGEX_PRESETS = [
  {
    name: 'Email Addresses',
    pattern: '(?<user>[a-zA-Z0-9._%+-]+)@(?<domain>[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
    flags: 'gm',
    replacement: '$<user> [at] $<domain>',
    sample: 'Contact ishant.dev@compillo.io or labs_support@university.edu before Friday.\nInvalid: user@.com',
  },
  {
    name: 'ISO-8601 Timestamps',
    pattern: '(?<date>\\d{4}-\\d{2}-\\d{2})T(?<time>\\d{2}:\\d{2}:\\d{2})Z?',
    flags: 'g',
    replacement: '$1 ($2 UTC)',
    sample: '2026-11-15T04:12:30Z DEPLOY ok\n2026-11-15T05:00:00Z HEALTH 200',
  },
  {
    name: 'Semantic Versions',
    pattern: 'v?(?<major>\\d+)\\.(?<minor>\\d+)\\.(?<patch>\\d+)(?:-(?<pre>[a-z0-9.]+))?',
    flags: 'g',
    replacement: '[$<major>.$<minor>.$<patch>]',
    sample: 'Releases: v2.4.1, 10.0.3-beta.2, v1.0.0',
  },
  {
    name: 'IPv4 Endpoints',
    pattern: '((?:\\d{1,3}\\.){3}\\d{1,3}):(\\d{2,5})',
    flags: 'g',
    replacement: 'host=$1 port=$2',
    sample: 'Listening on 127.0.0.1:3000 and upstream 10.24.8.12:8080',
  },
];

const AstTreeItem: React.FC<{
  node: AstNodeSummary;
  depth: number;
  tokens: WebsiteThemeTokens;
}> = ({ node, depth, tokens }) => {
  const [expanded, setExpanded] = useState(depth < 3);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div style={{ paddingLeft: depth > 0 ? 14 : 0 }}>
      <div className="flex items-center gap-2 py-0.5 font-mono text-xs">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="w-4 h-4 rounded border flex items-center justify-center text-[10px] cursor-pointer shrink-0"
            style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg }}
          >
            {expanded ? '-' : '+'}
          </button>
        ) : (
          <span className="w-4 inline-block shrink-0" />
        )}
        <span className="font-bold" style={{ color: tokens.accent }}>
          {node.kind}
        </span>
        <span className="tabular-nums text-[11px]" style={{ color: tokens.fgMuted }}>
          L{node.line}:{node.column}
        </span>
        {node.text && (
          <span className="truncate max-w-xs text-[11px]" style={{ color: tokens.fgPrimary }}>
            &quot;{node.text}&quot;
          </span>
        )}
      </div>
      {expanded &&
        hasChildren &&
        node.children.map((ch, idx) => (
          <AstTreeItem key={`${ch.kind}-${idx}`} node={ch} depth={depth + 1} tokens={tokens} />
        ))}
    </div>
  );
};

export const RegexAstBetaPage: React.FC<RegexAstBetaPageProps> = ({ tokens }) => {
  const [mode, setMode] = useState<'regex' | 'ast'>('regex');

  // Regex Lab State
  const [pattern, setPattern] = useState(REGEX_PRESETS[0].pattern);
  const [flags, setFlags] = useState('gm');
  const [sampleText, setSampleText] = useState(REGEX_PRESETS[0].sample);
  const [replacement, setReplacement] = useState(REGEX_PRESETS[0].replacement);

  // AST Inspector State
  const [astLang, setAstLang] = useState<'typescript' | 'python'>('typescript');
  const [astSource, setAstSource] = useState(
    `function binarySearch(nums: number[], target: number): number {\n  let low = 0, high = nums.length - 1;\n  while (low <= high) {\n    const mid = Math.floor((low + high) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  return -1;\n}`
  );
  const [astLoading, setAstLoading] = useState(false);
  const [astTree, setAstTree] = useState<AstNodeSummary | null>(null);
  const [astTokens, setAstTokens] = useState<TokenSummary[]>([]);
  const [astError, setAstError] = useState<string | null>(null);

  const regexEvaluation = useMemo(() => {
    try {
      const rx = new RegExp(pattern, flags);
      const matches: Array<{
        index: number;
        end: number;
        full: string;
        groups: string[];
        named: Record<string, string>;
      }> = [];

      if (flags.includes('g')) {
        for (const m of sampleText.matchAll(rx)) {
          const idx = m.index ?? 0;
          if (m[0].length === 0 && matches.length > 200) break;
          matches.push({
            index: idx,
            end: idx + m[0].length,
            full: m[0],
            groups: Array.from(m).slice(1),
            named: m.groups ? { ...m.groups } : {},
          });
          if (matches.length >= 200) break;
        }
      } else {
        const m = rx.exec(sampleText);
        if (m) {
          matches.push({
            index: m.index,
            end: m.index + m[0].length,
            full: m[0],
            groups: Array.from(m).slice(1),
            named: m.groups ? { ...m.groups } : {},
          });
        }
      }

      const segments: Array<{ text: string; isMatch: boolean; matchNo?: number }> = [];
      let cursor = 0;
      matches.forEach((m, idx) => {
        if (m.index > cursor) {
          segments.push({ text: sampleText.slice(cursor, m.index), isMatch: false });
        }
        if (m.end >= m.index) {
          segments.push({ text: sampleText.slice(m.index, m.end), isMatch: true, matchNo: idx + 1 });
          cursor = m.end;
        }
      });
      if (cursor < sampleText.length) {
        segments.push({ text: sampleText.slice(cursor), isMatch: false });
      }

      const replaced = sampleText.replace(rx, replacement);
      return { ok: true as const, matches, segments, replaced };
    } catch (err: any) {
      return { ok: false as const, error: err?.message || 'Invalid Regular Expression' };
    }
  }, [pattern, flags, sampleText, replacement]);

  const toggleFlag = (flagChar: string) => {
    setFlags((prev) =>
      prev.includes(flagChar) ? prev.replace(flagChar, '') : prev + flagChar
    );
  };

  const handleInspectAst = async () => {
    setAstLoading(true);
    setAstError(null);
    try {
      const res = await fetch('/api/beta/ast-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: astSource, language: astLang }),
      });
      const data = await res.json();
      if (!data.ok && data.error) {
        setAstError(data.error);
      }
      setAstTree(data.ast || null);
      setAstTokens(data.tokens || []);
    } catch (err: any) {
      setAstError(err?.message || 'Failed to parse AST.');
    } finally {
      setAstLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6"
        style={{ borderColor: tokens.borderColor }}
      >
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-medium" style={{ color: tokens.fgMuted }}>
            Beta Labs · Language Tooling
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
            Regex Lab &amp; Live Compiler AST Inspector
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: tokens.fgMuted }}>
            Debug regular expressions with named capture group breakdowns and inspect real TypeScript/JavaScript or Python compiler tokens and Abstract Syntax Trees.
          </p>
        </div>

        <div
          className="inline-flex items-center gap-1 p-1 rounded-lg border shrink-0"
          style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
        >
          <button
            type="button"
            onClick={() => setMode('regex')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
            style={
              mode === 'regex'
                ? { backgroundColor: tokens.accent, color: tokens.accentText }
                : { color: tokens.fgMuted }
            }
          >
            <Regex size={14} />
            <span>Regex Debugger</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('ast')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
            style={
              mode === 'ast'
                ? { backgroundColor: tokens.accent, color: tokens.accentText }
                : { color: tokens.fgMuted }
            }
          >
            <Braces size={14} />
            <span>AST &amp; Lexer Inspector</span>
          </button>
        </div>
      </div>

      {mode === 'regex' ? (
        <div className="space-y-6">
          {/* Presets */}
          <div className="flex flex-wrap items-center gap-2">
            {REGEX_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setPattern(p.pattern);
                  setFlags(p.flags);
                  setSampleText(p.sample);
                  setReplacement(p.replacement);
                }}
                className="px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
                style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg }}
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div
              className="lg:col-span-7 p-5 rounded-xl border space-y-4"
              style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="Regular expression pattern..."
                  className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border font-mono text-xs"
                  style={{
                    borderColor: tokens.borderColor,
                    backgroundColor: tokens.pageBg,
                    color: tokens.fgPrimary,
                  }}
                />
                <div className="flex items-center gap-1">
                  {(['g', 'i', 'm', 's'] as const).map((fl) => (
                    <button
                      key={fl}
                      type="button"
                      onClick={() => toggleFlag(fl)}
                      className="w-8 h-8 rounded-lg border font-mono text-xs font-bold cursor-pointer"
                      style={
                        flags.includes(fl)
                          ? { backgroundColor: tokens.accent, color: tokens.accentText, borderColor: tokens.accent }
                          : { backgroundColor: tokens.pageBg, borderColor: tokens.borderColor, color: tokens.fgMuted }
                      }
                    >
                      {fl}
                    </button>
                  ))}
                </div>
              </div>

              {!regexEvaluation.ok && (
                <div className="p-3 rounded-lg border border-rose-500/40 text-xs font-mono text-rose-400">
                  {regexEvaluation.error}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="text-xs font-semibold" style={{ color: tokens.fgMuted }}>
                  Test Input String
                </div>
                <textarea
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  rows={5}
                  className="w-full p-3 rounded-lg border font-mono text-xs"
                  style={{
                    borderColor: tokens.borderColor,
                    backgroundColor: tokens.pageBg,
                    color: tokens.fgPrimary,
                  }}
                />
              </div>

              {regexEvaluation.ok && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold flex items-center justify-between" style={{ color: tokens.fgMuted }}>
                    <span>Highlighted Match View</span>
                    <span className="tabular-nums">{regexEvaluation.matches.length} match(es)</span>
                  </div>
                  <div
                    className="p-3.5 rounded-lg border font-mono text-xs whitespace-pre-wrap leading-relaxed"
                    style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                  >
                    {regexEvaluation.segments.map((seg, idx) =>
                      seg.isMatch ? (
                        <mark
                          key={idx}
                          className="px-1 rounded font-bold"
                          style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
                          title={`Match #${seg.matchNo}`}
                        >
                          {seg.text}
                        </mark>
                      ) : (
                        <span key={idx}>{seg.text}</span>
                      )
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="text-xs font-semibold" style={{ color: tokens.fgMuted }}>
                  Replace Template &amp; Live Preview
                </div>
                <input
                  type="text"
                  value={replacement}
                  onChange={(e) => setReplacement(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border font-mono text-xs"
                  style={{
                    borderColor: tokens.borderColor,
                    backgroundColor: tokens.pageBg,
                    color: tokens.fgPrimary,
                  }}
                />
                {regexEvaluation.ok && (
                  <pre
                    className="p-3 rounded-lg border font-mono text-xs whitespace-pre-wrap"
                    style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                  >
                    {regexEvaluation.replaced}
                  </pre>
                )}
              </div>
            </div>

            {/* Capture Group Breakdown */}
            <div
              className="lg:col-span-5 p-5 rounded-xl border space-y-3"
              style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
            >
              <div className="text-sm font-bold">Capture Group Inspector</div>
              {regexEvaluation.ok && regexEvaluation.matches.length > 0 ? (
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto">
                  {regexEvaluation.matches.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border font-mono text-xs space-y-1.5"
                      style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold" style={{ color: tokens.accent }}>
                          Match #{idx + 1}
                        </span>
                        <span className="tabular-nums" style={{ color: tokens.fgMuted }}>
                          [{m.index}..{m.end}]
                        </span>
                      </div>
                      <div>Full: &quot;{m.full}&quot;</div>
                      {m.groups.map((g, gi) => (
                        <div key={gi} style={{ color: tokens.fgMuted }}>
                          Group ${gi + 1}: <span style={{ color: tokens.fgPrimary }}>&quot;{g ?? ''}&quot;</span>
                        </div>
                      ))}
                      {Object.keys(m.named).length > 0 && (
                        <div className="pt-1 border-t" style={{ borderColor: tokens.borderColor, color: tokens.fgMuted }}>
                          Named: {JSON.stringify(m.named)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs py-6 text-center" style={{ color: tokens.fgMuted }}>
                  No capture matches for current pattern.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div
            className="lg:col-span-5 p-5 rounded-xl border space-y-4"
            style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-1 rounded-lg border" style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}>
                {(
                  [
                    ['typescript', 'TypeScript / JS'],
                    ['python', 'Python 3'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setAstLang(id);
                      if (id === 'python') {
                        setAstSource(
                          `def two_sum(nums, target):\n    seen = {}\n    for i, x in enumerate(nums):\n        if target - x in seen:\n            return [seen[target - x], i]\n        seen[x] = i\n    return []`
                        );
                      } else {
                        setAstSource(
                          `function binarySearch(nums: number[], target: number): number {\n  let low = 0, high = nums.length - 1;\n  while (low <= high) {\n    const mid = Math.floor((low + high) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) low = mid + 1;\n    else high = mid - 1;\n  }\n  return -1;\n}`
                        );
                      }
                    }}
                    className="px-2.5 py-1 rounded text-xs font-semibold cursor-pointer"
                    style={
                      astLang === id
                        ? { backgroundColor: tokens.accent, color: tokens.accentText }
                        : { color: tokens.fgMuted }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleInspectAst}
                disabled={astLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
              >
                <Play size={13} />
                <span>{astLoading ? 'Parsing...' : 'Parse AST'}</span>
              </button>
            </div>

            <textarea
              value={astSource}
              onChange={(e) => setAstSource(e.target.value)}
              rows={15}
              spellCheck={false}
              className="w-full p-3.5 rounded-lg border font-mono text-xs"
              style={{
                borderColor: tokens.borderColor,
                backgroundColor: tokens.pageBg,
                color: tokens.fgPrimary,
              }}
            />

            {astError && (
              <div className="p-3 rounded-lg border border-rose-500/40 text-xs font-mono text-rose-400">
                {astError}
              </div>
            )}
          </div>

          <div
            className="lg:col-span-7 p-5 rounded-xl border space-y-5"
            style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
          >
            <div className="space-y-2">
              <div className="text-sm font-bold">Abstract Syntax Tree</div>
              <div
                className="p-3.5 rounded-lg border max-h-72 overflow-y-auto"
                style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
              >
                {astTree ? (
                  <AstTreeItem node={astTree} depth={0} tokens={tokens} />
                ) : (
                  <div className="text-xs py-6 text-center" style={{ color: tokens.fgMuted }}>
                    Click Parse AST to inspect the compiler syntax tree.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-bold">Lexer Token Stream ({astTokens.length})</div>
              <div
                className="rounded-lg border max-h-60 overflow-y-auto"
                style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
              >
                <table className="w-full text-left font-mono text-xs tabular-nums">
                  <thead>
                    <tr className="border-b" style={{ borderColor: tokens.borderColor, color: tokens.fgMuted }}>
                      <th className="py-2 px-3">Pos</th>
                      <th className="py-2 px-3">Token Kind</th>
                      <th className="py-2 px-3">Lexeme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {astTokens.map((t, idx) => (
                      <tr key={idx} className="border-b" style={{ borderColor: tokens.borderColor }}>
                        <td className="py-1.5 px-3" style={{ color: tokens.fgMuted }}>
                          {t.line}:{t.column}
                        </td>
                        <td className="py-1.5 px-3 font-semibold" style={{ color: tokens.accent }}>
                          {t.kind}
                        </td>
                        <td className="py-1.5 px-3">{t.text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
