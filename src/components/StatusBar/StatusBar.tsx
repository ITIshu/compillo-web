import React, { useState, useEffect, useRef } from 'react';
import {
  GitBranch,
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  Code2,
  Timer,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { VSCodeThemeDefinition } from '../../services/themes';
import { StatusBarItemRef } from '../../types/plugin';

interface StatusBarProps {
  currentTheme: VSCodeThemeDefinition;
  cursorLine: number;
  cursorCol: number;
  errorCount: number;
  warningCount: number;
  language: string;
  tabSize: number;
  pluginItems: StatusBarItemRef[];
  onToggleProblems: () => void;
  onRunPluginCommand: (cmdId: string) => void;
  onSelectLanguage: (lang: string) => void;
  onOpenSnippets?: () => void;
  onSprintComplete?: (mode: 'focus' | 'break') => void;
  onOpenNotifications?: () => void;
}

const SPRINT_DURATIONS = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  deepBreak: 15 * 60,
};

export const StatusBar: React.FC<StatusBarProps> = ({
  currentTheme,
  cursorLine,
  cursorCol,
  errorCount,
  warningCount,
  language,
  tabSize,
  pluginItems,
  onToggleProblems,
  onRunPluginCommand,
  onSelectLanguage,
  onOpenSnippets,
  onSprintComplete,
  onOpenNotifications,
}) => {
  const [isLangPickerOpen, setIsLangPickerOpen] = useState(false);
  const [isSprintOpen, setIsSprintOpen] = useState(false);
  const [sprintPreset, setSprintPreset] = useState<'focus' | 'shortBreak' | 'deepBreak'>('focus');
  const [secondsLeft, setSecondsLeft] = useState(SPRINT_DURATIONS.focus);
  const [isSprintRunning, setIsSprintRunning] = useState(false);
  const [completedSprints, setCompletedSprints] = useState<number>(0);
  const sprintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sprintRef.current && !sprintRef.current.contains(e.target as Node)) {
        setIsSprintOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isSprintRunning) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsSprintRunning(false);
          if (sprintPreset === 'focus') {
            setCompletedSprints((c) => c + 1);
          }
          onSprintComplete?.(sprintPreset === 'focus' ? 'focus' : 'break');
          return SPRINT_DURATIONS[sprintPreset];
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSprintRunning, sprintPreset, onSprintComplete]);

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const selectPreset = (preset: 'focus' | 'shortBreak' | 'deepBreak') => {
    setIsSprintRunning(false);
    setSprintPreset(preset);
    setSecondsLeft(SPRINT_DURATIONS[preset]);
  };

  const leftItems = pluginItems.filter((item) => item.alignment === 'left');
  const rightItems = pluginItems.filter((item) => item.alignment !== 'left');

  const supportedLangs = [
    'typescript',
    'javascript',
    'python',
    'json',
    'css',
    'html',
    'markdown',
    'sql',
    'rust',
    'plaintext',
  ];

  const isLight = currentTheme.type === 'light';
  const isCyberpunk = currentTheme.id === 'cyberpunk';
  const hoverClass = isLight ? 'hover:bg-black/10' : 'hover:bg-white/10';

  return (
    <div
      id="compillo-status-bar"
      className="flex items-center justify-between gap-2 h-[22px] px-2 text-[11px] select-none shrink-0 min-w-0 overflow-hidden z-30 font-sans"
      style={{
        backgroundColor: currentTheme.ui.statusBarBg,
        color: currentTheme.ui.statusBarFg,
      }}
    >
      {/* Left Items */}
      <div className="flex items-center space-x-1 h-full min-w-0 whitespace-nowrap">
        {/* Remote badge */}
        <div
          title="Compillo Cloud Sandbox (Real-time Container)"
          className={`flex items-center gap-1 px-2 h-full cursor-pointer font-bold tracking-wider text-[10px] ${
            isCyberpunk
              ? 'bg-[#fcee0a] text-black font-black'
              : isLight
              ? 'bg-[#005fb8] text-white'
              : 'bg-[#007acc] text-white'
          }`}
        >
          <span>COMPILLO</span>
        </div>

        {/* Git Branch */}
        <div
          title="Git Branch: main"
          className={`flex items-center gap-1 px-1.5 h-full cursor-pointer ${hoverClass}`}
        >
          <GitBranch size={11} />
          <span>main*</span>
        </div>

        {/* Problems Item */}
        <button
          onClick={onToggleProblems}
          title="Toggle Problems Panel"
          className={`flex items-center gap-2 px-1.5 h-full cursor-pointer ${hoverClass}`}
        >
          <span className="flex items-center gap-0.5 font-mono tabular-nums">
            <AlertCircle size={11} />
            <span>{errorCount}</span>
          </span>
          <span className="flex items-center gap-0.5 font-mono tabular-nums">
            <AlertTriangle size={11} />
            <span>{warningCount}</span>
          </span>
        </button>

        {/* Plugin Left Items */}
        {leftItems.map((item) => (
          <button
            key={item.id}
            title={item.tooltip}
            onClick={() => item.command && onRunPluginCommand(item.command)}
            className={`flex items-center gap-1 px-1.5 h-full cursor-pointer ${hoverClass}`}
            style={{ color: currentTheme.ui.statusBarFg }}
          >
            <span>{item.text}</span>
          </button>
        ))}
      </div>

      {/* Right Items */}
      <div className="flex items-center space-x-1 h-full shrink-0 whitespace-nowrap">
        {/* Plugin Right Items */}
        {rightItems.map((item) => (
          <button
            key={item.id}
            title={item.tooltip}
            onClick={() => item.command && onRunPluginCommand(item.command)}
            className={`flex items-center gap-1 px-1.5 h-full cursor-pointer ${hoverClass}`}
            style={{ color: currentTheme.ui.statusBarFg }}
          >
            <span>{item.text}</span>
          </button>
        ))}

        {/* Quick Snippets Vault Trigger */}
        {onOpenSnippets && (
          <button
            onClick={onOpenSnippets}
            title="Open Code Snippets & Templates Vault"
            className={`hidden sm:flex items-center gap-1 px-1.5 h-full cursor-pointer ${hoverClass}`}
          >
            <Code2 size={11} />
            <span>Snippets</span>
          </button>
        )}

        {/* Focus Sprint Timer Widget */}
        <div ref={sprintRef} className="relative h-full flex items-center">
          <button
            onClick={() => setIsSprintOpen(!isSprintOpen)}
            title="Focus Sprint Timer (Pomodoro)"
            className={`flex items-center gap-1 px-1.5 h-full cursor-pointer font-mono tabular-nums ${hoverClass} ${
              isSprintRunning
                ? isLight
                  ? 'text-[#005fb8] font-bold'
                  : 'text-emerald-300 font-bold'
                : ''
            }`}
          >
            <Timer size={11} />
            <span>{formatTimer(secondsLeft)}</span>
          </button>

          {isSprintOpen && (
            <div
              className="absolute bottom-full right-0 mb-1 w-56 rounded-md shadow-2xl p-3 text-[11px] border z-50 backdrop-blur-sm space-y-2.5"
              style={{
                backgroundColor: currentTheme.ui.sideBarBg,
                borderColor: currentTheme.ui.sideBarBorder,
                color: currentTheme.ui.sideBarFg,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-[10px] opacity-80">
                  Focus Sprint
                </span>
                <span className="font-mono text-[10px] opacity-70 tabular-nums">
                  Done: {completedSprints}
                </span>
              </div>

              <div className="text-center py-1 font-mono text-xl font-bold tabular-nums tracking-wider">
                {formatTimer(secondsLeft)}
              </div>

              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => selectPreset('focus')}
                  className={`py-1 rounded text-[10px] border transition-colors ${
                    sprintPreset === 'focus'
                      ? 'text-white border-transparent'
                      : isLight
                      ? 'border-gray-300 hover:bg-black/5'
                      : 'border-white/15 hover:bg-white/10'
                  }`}
                  style={
                    sprintPreset === 'focus'
                      ? { backgroundColor: currentTheme.ui.accent }
                      : undefined
                  }
                >
                  25m Focus
                </button>
                <button
                  onClick={() => selectPreset('shortBreak')}
                  className={`py-1 rounded text-[10px] border transition-colors ${
                    sprintPreset === 'shortBreak'
                      ? 'text-white border-transparent'
                      : isLight
                      ? 'border-gray-300 hover:bg-black/5'
                      : 'border-white/15 hover:bg-white/10'
                  }`}
                  style={
                    sprintPreset === 'shortBreak'
                      ? { backgroundColor: currentTheme.ui.accent }
                      : undefined
                  }
                >
                  5m Break
                </button>
                <button
                  onClick={() => selectPreset('deepBreak')}
                  className={`py-1 rounded text-[10px] border transition-colors ${
                    sprintPreset === 'deepBreak'
                      ? 'text-white border-transparent'
                      : isLight
                      ? 'border-gray-300 hover:bg-black/5'
                      : 'border-white/15 hover:bg-white/10'
                  }`}
                  style={
                    sprintPreset === 'deepBreak'
                      ? { backgroundColor: currentTheme.ui.accent }
                      : undefined
                  }
                >
                  15m Rest
                </button>
              </div>

              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  onClick={() => setIsSprintRunning((r) => !r)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-white font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: currentTheme.ui.accent }}
                >
                  {isSprintRunning ? <Pause size={11} /> : <Play size={11} />}
                  <span>{isSprintRunning ? 'Pause' : 'Start'}</span>
                </button>
                <button
                  onClick={() => {
                    setIsSprintRunning(false);
                    setSecondsLeft(SPRINT_DURATIONS[sprintPreset]);
                  }}
                  title="Reset Timer"
                  className={`p-1.5 rounded border transition-colors ${
                    isLight ? 'border-gray-300 hover:bg-black/5' : 'border-white/15 hover:bg-white/10'
                  }`}
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cursor Position */}
        <div
          className={`px-1.5 h-full flex items-center cursor-pointer font-mono tabular-nums ${hoverClass}`}
        >
          Ln {cursorLine}, Col {cursorCol}
        </div>

        {/* Spaces */}
        <div className={`hidden md:flex px-1.5 h-full items-center cursor-pointer ${hoverClass}`}>
          Spaces: {tabSize}
        </div>

        {/* Encoding */}
        <div className={`hidden md:flex px-1.5 h-full items-center cursor-pointer ${hoverClass}`}>
          UTF-8
        </div>

        {/* End of Line */}
        <div className={`hidden md:flex px-1.5 h-full items-center cursor-pointer ${hoverClass}`}>
          LF
        </div>

        {/* Language Picker Dropdown */}
        <div className="relative h-full flex items-center">
          <button
            onClick={() => setIsLangPickerOpen(!isLangPickerOpen)}
            title="Select Language Mode"
            className={`px-1.5 h-full flex items-center capitalize cursor-pointer ${hoverClass}`}
          >
            {language || 'Plain Text'}
          </button>

          {isLangPickerOpen && (
            <div
              className="absolute bottom-full right-0 mb-1 w-44 rounded-md shadow-2xl py-1 text-[11px] border z-50 backdrop-blur-sm"
              style={{
                backgroundColor: currentTheme.ui.sideBarBg,
                borderColor: currentTheme.ui.sideBarBorder,
                color: currentTheme.ui.sideBarFg,
              }}
            >
              <div
                className={`px-2 py-1 text-[10px] uppercase font-bold border-b ${
                  isLight ? 'text-gray-500 border-gray-200' : 'text-[#888888] border-white/10'
                }`}
              >
                Language Mode
              </div>
              {supportedLangs.map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    onSelectLanguage(lang);
                    setIsLangPickerOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1 flex items-center justify-between capitalize transition-colors ${
                    language === lang
                      ? isLight
                        ? 'font-bold bg-[#005fb8]/10 text-[#005fb8]'
                        : isCyberpunk
                        ? 'font-bold bg-[#fcee0a]/20 text-[#fcee0a]'
                        : 'font-bold bg-[#007acc]/20 text-[#007acc]'
                      : isLight
                      ? 'hover:bg-black/5 text-gray-800'
                      : 'hover:bg-white/10 text-[#cccccc]'
                  }`}
                >
                  <span>{lang}</span>
                  {language === lang && <Check size={11} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          onClick={onOpenNotifications}
          title="Open Output & Notifications"
          className={`px-1.5 h-full flex items-center cursor-pointer shrink-0 ${hoverClass}`}
        >
          <Bell size={11} />
        </button>
      </div>
    </div>
  );
};
