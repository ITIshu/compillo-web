import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  GitBranchPlus,
  Wand2,
  ShieldAlert,
  Braces,
  Sparkles,
  Database,
  Globe,
  Regex,
  Palette,
} from 'lucide-react';
import { FileIcon } from '../Common/FileIcon';
import { VSCodeThemeDefinition } from '../../services/themes';
import { pluginManager } from '../../services/pluginSystem';

interface BreadcrumbBarProps {
  filePath?: string;
  fileName?: string;
  currentTheme: VSCodeThemeDefinition;
  onRunCommand?: (cmdId: string) => void;
  onOpenCommandPalette?: () => void;
}

interface QuickActionDef {
  id: string;
  label: string;
  tooltip: string;
  icon: React.ReactNode;
}

export const BreadcrumbBar: React.FC<BreadcrumbBarProps> = ({
  filePath,
  fileName,
  currentTheme,
  onRunCommand,
  onOpenCommandPalette,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  if (!filePath || !fileName) return null;

  const isLight = currentTheme.type === 'light';
  const parts = filePath.split('/').filter(Boolean);
  const lower = fileName.toLowerCase();
  const ext = lower.includes('.') ? lower.split('.').pop() || '' : '';

  const runCmd = (id: string) => {
    setMenuOpen(false);
    if (onRunCommand) {
      onRunCommand(id);
    } else {
      pluginManager.executeCommand(id);
    }
  };

  // Context-aware 1-click inline extension actions tailored to the active file
  const inlineActions: QuickActionDef[] = [];

  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'py', 'md', 'mmd', 'java', 'c', 'cpp'].includes(ext)) {
    inlineActions.push({
      id: 'mermaid.generateFlowchart',
      label: 'Flowchart',
      tooltip: 'Generate Mermaid Flowchart from functions (Auto-loads Mermaid)',
      icon: <GitBranchPlus size={11} className="text-sky-400" />,
    });
  }

  if (ext === 'py') {
    inlineActions.push(
      {
        id: 'python.formatPep8',
        label: 'PEP8',
        tooltip: 'Format Python with Black PEP8',
        icon: <Wand2 size={11} className="text-amber-400" />,
      },
      {
        id: 'python.addDocstrings',
        label: 'Docstrings',
        tooltip: 'Generate missing Python function docstrings',
        icon: <Sparkles size={11} className="text-emerald-400" />,
      }
    );
  } else if (ext === 'tsx' || ext === 'jsx' || ext === 'html') {
    inlineActions.push(
      {
        id: 'tailwind.sortClasses',
        label: 'Sort Tailwind',
        tooltip: 'Sort & deduplicate Tailwind utility classes',
        icon: <Sparkles size={11} className="text-sky-400" />,
      },
      {
        id: 'imports.organize',
        label: 'Imports',
        tooltip: 'Organize & sort top-level imports (Shift+Alt+O)',
        icon: <Wand2 size={11} className="text-purple-400" />,
      }
    );
  } else if (ext === 'ts' || ext === 'js' || ext === 'mjs') {
    inlineActions.push({
      id: 'imports.organize',
      label: 'Imports',
      tooltip: 'Organize & sort top-level imports (Shift+Alt+O)',
      icon: <Wand2 size={11} className="text-purple-400" />,
    });
  } else if (ext === 'sql') {
    inlineActions.push(
      {
        id: 'sql.formatDocument',
        label: 'Format SQL',
        tooltip: 'Format SQL clauses uppercase',
        icon: <Database size={11} className="text-amber-400" />,
      },
      {
        id: 'sql.inspectSchema',
        label: 'Schema',
        tooltip: 'Extract CREATE TABLE columns to Output',
        icon: <Braces size={11} className="text-emerald-400" />,
      }
    );
  } else if (lower === 'package.json') {
    inlineActions.push(
      {
        id: 'deps.auditPackageJson',
        label: 'Audit Deps',
        tooltip: 'Audit package.json dependencies & scripts',
        icon: <Braces size={11} className="text-amber-400" />,
      },
      {
        id: 'jsonTools.sortKeys',
        label: 'Sort Keys',
        tooltip: 'Deep-sort JSON object keys alphabetically',
        icon: <Wand2 size={11} className="text-sky-400" />,
      }
    );
  } else if (ext === 'json') {
    inlineActions.push({
      id: 'jsonTools.sortKeys',
      label: 'Sort Keys',
      tooltip: 'Deep-sort JSON object keys alphabetically',
      icon: <Braces size={11} className="text-amber-400" />,
    });
  } else if (ext === 'css' || ext === 'scss') {
    inlineActions.push({
      id: 'colorizer.extractPalette',
      label: 'Palette',
      tooltip: 'Extract hex/RGB/HSL tokens as CSS variables',
      icon: <Palette size={11} className="text-pink-400" />,
    });
  } else if (lower.startsWith('.env')) {
    inlineActions.push({
      id: 'envGuard.generateExample',
      label: 'Mask .env',
      tooltip: 'Generate safe masked .env.example template',
      icon: <ShieldAlert size={11} className="text-emerald-400" />,
    });
  }

  const allQuickTools = [
    {
      id: 'mermaid.generateFlowchart',
      label: 'Generate Mermaid Flowchart',
      icon: <GitBranchPlus size={12} className="text-sky-400" />,
    },
    {
      id: 'sonarlint.scanActiveFile',
      label: 'Security & Secret Audit',
      icon: <ShieldAlert size={12} className="text-rose-400" />,
    },
    {
      id: 'restClient.extractUrls',
      label: 'Extract API URLs -> Curl',
      icon: <Globe size={12} className="text-emerald-400" />,
    },
    {
      id: 'regex.inspectFile',
      label: 'Inspect Regex Patterns',
      icon: <Regex size={12} className="text-amber-400" />,
    },
    {
      id: 'python.extractRequirements',
      label: 'Python: Scan requirements.txt',
      icon: <Sparkles size={12} className="text-blue-400" />,
    },
    {
      id: 'htmlChecker.validateTags',
      label: 'HTML/JSX: Accessibility Audit',
      icon: <Wand2 size={12} className="text-purple-400" />,
    },
    {
      id: 'cspell.fixCommonTypos',
      label: 'cSpell: Auto-Fix Typos',
      icon: <Wand2 size={12} className="text-teal-400" />,
    },
    {
      id: 'codeColor.openPicker',
      label: 'Customize Code Colours...',
      icon: <Palette size={12} className="text-pink-400" />,
    },
    {
      id: 'icons.openPicker',
      label: 'Change File Icon Pack...',
      icon: <Palette size={12} className="text-amber-400" />,
    },
  ];

  return (
    <div
      id="compillo-breadcrumbs"
      className="flex items-center justify-between gap-2 h-[26px] px-3 text-[11px] border-b select-none shrink-0"
      style={{
        backgroundColor: currentTheme.ui.editorBg,
        borderColor: currentTheme.ui.tabBorder,
        color: currentTheme.ui.editorFg,
      }}
    >
      {/* Left: File Path Breadcrumb */}
      <div className="flex items-center space-x-1 truncate opacity-80 min-w-0">
        <span className="cursor-pointer opacity-70 hover:opacity-100 shrink-0">
          workspace
        </span>
        {parts.map((part, index) => {
          const isLast = index === parts.length - 1;
          return (
            <React.Fragment key={index}>
              <ChevronRight size={12} className="opacity-50 shrink-0" />
              <div className="flex items-center gap-1 cursor-pointer opacity-85 hover:opacity-100 min-w-0">
                {isLast && <FileIcon filename={fileName} size={12} />}
                <span className="truncate">{part}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Right: Zero-Friction 1-Click Context Extension Actions */}
      <div className="hidden md:flex items-center gap-1 shrink-0" ref={menuRef}>
        {inlineActions.map((act) => (
          <button
            key={act.id}
            onClick={() => runCmd(act.id)}
            title={act.tooltip}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium transition-colors ${
              isLight
                ? 'border-gray-200 bg-black/[0.03] hover:bg-black/10 text-gray-800'
                : 'border-white/10 bg-white/[0.04] hover:bg-white/12 text-gray-200'
            }`}
          >
            {act.icon}
            <span>{act.label}</span>
          </button>
        ))}

        {/* Compact Quick Extension Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            title="Run any extension tool directly (auto-loads on click)"
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium transition-colors ${
              menuOpen
                ? 'bg-[#007acc] border-[#007acc] text-white'
                : isLight
                ? 'border-gray-200 bg-black/[0.03] hover:bg-black/10 text-gray-700'
                : 'border-white/10 bg-white/[0.04] hover:bg-white/12 text-gray-300'
            }`}
          >
            <span>Tools</span>
            <ChevronDown size={10} />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border shadow-2xl py-1 text-[11px]"
              style={{
                backgroundColor: currentTheme.ui.sideBarBg,
                borderColor: currentTheme.ui.sideBarBorder,
                color: currentTheme.ui.sideBarFg,
              }}
            >
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider opacity-55">
                Instant Extension Actions
              </div>
              {allQuickTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => runCmd(tool.id)}
                  className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-[#007acc] hover:text-white transition-colors"
                >
                  {tool.icon}
                  <span className="truncate">{tool.label}</span>
                </button>
              ))}
              {onOpenCommandPalette && (
                <>
                  <div className="my-1 border-t opacity-20" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenCommandPalette();
                    }}
                    className="w-full text-left px-2.5 py-1.5 flex items-center justify-between hover:bg-[#007acc] hover:text-white transition-colors"
                  >
                    <span>All Commands...</span>
                    <kbd className="text-[9px] opacity-75 font-mono">Ctrl+Shift+P</kbd>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
