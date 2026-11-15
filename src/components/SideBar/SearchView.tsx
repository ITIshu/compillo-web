import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Replace,
  CaseSensitive,
  WholeWord,
  Regex,
  ListTodo,
} from 'lucide-react';
import { FileNode } from '../../types';
import { FileIcon } from '../Common/FileIcon';
import { getAllFiles } from '../../services/fileSystem';
import { VSCodeThemeDefinition } from '../../services/themes';

export interface SearchReplaceOptions {
  matchCase: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

interface SearchViewProps {
  currentTheme?: VSCodeThemeDefinition;
  files: FileNode[];
  onOpenFile: (fileId: string) => void;
  onJumpToLine?: (fileId: string, line: number, col?: number) => void;
  onReplaceAll?: (
    query: string,
    replaceText: string,
    options: SearchReplaceOptions
  ) => void;
}

interface MatchResult {
  file: FileNode;
  matches: Array<{ line: number; text: string; col: number }>;
}

export const SearchView: React.FC<SearchViewProps> = ({
  currentTheme,
  files,
  onOpenFile,
  onJumpToLine,
  onReplaceAll,
}) => {
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});

  const isLight = currentTheme?.type === 'light';
  const allFiles = getAllFiles(files);

  const results: MatchResult[] = [];
  let regexError = '';
  if (query.trim()) {
    allFiles.forEach((file) => {
      if (!file.content) return;
      const lines = file.content.split('\n');
      const fileMatches: Array<{ line: number; text: string; col: number }> = [];

      try {
        let pattern: RegExp;
        const flags = matchCase ? '' : 'i';
        if (useRegex) {
          pattern = new RegExp(query, flags);
        } else {
          const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const finalPattern = wholeWord ? `\\b${escaped}\\b` : escaped;
          pattern = new RegExp(finalPattern, flags);
        }

        lines.forEach((lineText, idx) => {
          const match = pattern.exec(lineText);
          if (match) {
            fileMatches.push({
              line: idx + 1,
              text: lineText.trim(),
              col: match.index ?? 0,
            });
          }
        });
      } catch (e: any) {
        regexError = e?.message || 'Invalid regular expression';
      }

      if (fileMatches.length > 0) {
        results.push({ file, matches: fileMatches });
      }
    });
  }

  const totalMatches = results.reduce((acc, r) => acc + r.matches.length, 0);

  const handleScanTodos = () => {
    setQuery('\\b(TODO|FIXME|HACK|BUG|NOTE)\\b');
    setUseRegex(true);
    setMatchCase(true);
    setWholeWord(false);
    setShowReplace(false);
  };

  return (
    <div className="flex flex-col h-full select-none text-[12px]">
      <div
        className="p-3 border-b space-y-2"
        style={{ borderColor: currentTheme?.ui.sideBarBorder || '#2b2b2b' }}
      >
        {/* Search Input Box */}
        <div
          className={`relative flex items-center border rounded px-2 py-1 focus-within:border-[#007acc] ${
            isLight
              ? 'bg-white border-gray-300 text-gray-900'
              : 'bg-[#222222] border-[#3c3c3c] text-white'
          }`}
        >
          <input
            type="text"
            placeholder="Search files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent text-inherit text-[12px] outline-none w-full pr-16"
          />
          <div className="absolute right-1 flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setMatchCase(!matchCase)}
              title="Match Case (Alt+C)"
              className={`p-0.5 rounded text-[10px] ${
                matchCase
                  ? 'bg-[#007acc] text-white'
                  : isLight
                  ? 'text-gray-500 hover:text-gray-900'
                  : 'text-[#888888] hover:text-white'
              }`}
            >
              <CaseSensitive size={13} />
            </button>
            <button
              type="button"
              onClick={() => setWholeWord(!wholeWord)}
              title="Match Whole Word (Alt+W)"
              className={`p-0.5 rounded text-[10px] ${
                wholeWord
                  ? 'bg-[#007acc] text-white'
                  : isLight
                  ? 'text-gray-500 hover:text-gray-900'
                  : 'text-[#888888] hover:text-white'
              }`}
            >
              <WholeWord size={13} />
            </button>
            <button
              type="button"
              onClick={() => setUseRegex(!useRegex)}
              title="Use Regular Expression (Alt+R)"
              className={`p-0.5 rounded text-[10px] ${
                useRegex
                  ? 'bg-[#007acc] text-white'
                  : isLight
                  ? 'text-gray-500 hover:text-gray-900'
                  : 'text-[#888888] hover:text-white'
              }`}
            >
              <Regex size={13} />
            </button>
          </div>
        </div>

        {/* Quick Preset + Replace Toggle */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowReplace(!showReplace)}
            className={`flex items-center gap-1 text-[11px] ${
              isLight ? 'text-gray-600 hover:text-gray-950' : 'text-[#888888] hover:text-white'
            }`}
          >
            {showReplace ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>Replace</span>
          </button>

          <button
            type="button"
            onClick={handleScanTodos}
            title="Scan all workspace files for TODO / FIXME / BUG comments"
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] border transition-colors ${
              isLight
                ? 'border-gray-300 text-gray-700 hover:bg-black/5'
                : 'border-white/15 text-amber-300 hover:bg-white/10'
            }`}
          >
            <ListTodo size={11} />
            <span>Scan TODOs</span>
          </button>
        </div>

        {showReplace && (
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="Replace with..."
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              className={`border rounded text-[12px] outline-none px-2 py-1 flex-1 focus:border-[#007acc] ${
                isLight
                  ? 'bg-white border-gray-300 text-gray-900'
                  : 'bg-[#222222] border-[#3c3c3c] text-white'
              }`}
            />
            <button
              type="button"
              disabled={!query.trim() || totalMatches === 0 || !onReplaceAll}
              onClick={() =>
                onReplaceAll &&
                onReplaceAll(query, replaceText, { matchCase, wholeWord, useRegex })
              }
              title={`Replace All (${totalMatches} matches)`}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#007acc] text-white rounded text-[11px] hover:bg-[#007acc]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Replace size={12} />
              <span>All</span>
            </button>
          </div>
        )}

        {/* Regex error */}
        {regexError && (
          <div className="text-[11px] text-red-400 truncate">{regexError}</div>
        )}

        {/* Results summary */}
        {query.trim() && !regexError && (
          <div
            className={`text-[11px] font-mono tabular-nums ${
              isLight ? 'text-gray-600' : 'text-[#888888]'
            }`}
          >
            {totalMatches} result{totalMatches === 1 ? '' : 's'} in {results.length} file
            {results.length === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto py-1">
        {query.trim() && results.length === 0 && !regexError && (
          <div className="px-4 py-4 text-[11px] opacity-60 italic">
            No matches found in workspace files.
          </div>
        )}

        {results.map(({ file, matches }) => {
          const isCollapsed = collapsedFiles[file.id];
          return (
            <div key={file.id} className="w-full">
              <div
                onClick={() =>
                  setCollapsedFiles((prev) => ({ ...prev, [file.id]: !prev[file.id] }))
                }
                className={`flex items-center justify-between px-3 py-1 cursor-pointer text-[12px] font-medium ${
                  isLight ? 'bg-black/[0.03] hover:bg-black/[0.06]' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="opacity-60">
                    {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  </span>
                  <FileIcon filename={file.name} size={14} />
                  <span className="truncate">{file.name}</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                    isLight ? 'bg-black/10 text-gray-700' : 'bg-white/10 text-[#888888]'
                  }`}
                >
                  {matches.length}
                </span>
              </div>

              {!isCollapsed && (
                <div>
                  {matches.map((m, idx) => (
                    <div
                      key={idx}
                      onClick={() =>
                        onJumpToLine
                          ? onJumpToLine(file.id, m.line, Math.max(1, m.col + 1))
                          : onOpenFile(file.id)
                      }
                      className={`flex items-center gap-2 pl-7 pr-3 py-1 hover:bg-[#007acc]/20 cursor-pointer text-[11px] transition-colors ${
                        isLight ? 'text-gray-800' : 'text-[#cccccc]'
                      }`}
                    >
                      <span className="opacity-60 font-mono tabular-nums shrink-0">
                        L{m.line}:
                      </span>
                      <span className="truncate font-mono">{m.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
