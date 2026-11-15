import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Lock,
  Clock,
  Sparkles,
  Trophy,
  Zap,
  CheckCircle2,
  Sliders,
  Flame,
  ArrowRight,
  Activity,
  Heart,
  Plus,
} from 'lucide-react';
import { CompilloThemeDefinition } from '../../services/themes';
import { engagementService, EngagementState } from '../../services/engagementService';
import { ByteRunnerGame } from './ByteRunnerGame';
import { PastelBobaGame } from './PastelBobaGame';
import { FruitNinjaGame } from './FruitNinjaGame';

interface GameStationViewProps {
  currentTheme: CompilloThemeDefinition;
  onOpenMasterPanel: () => void;
  onClose?: () => void;
}

export const GameStationView: React.FC<GameStationViewProps> = ({
  currentTheme,
  onOpenMasterPanel,
  onClose,
}) => {
  const [selectedGame, setSelectedGame] = useState<'byte-runner' | 'pastel-boba' | 'fruit-ninja'>('pastel-boba');
  const [engagement, setEngagement] = useState<EngagementState>(() =>
    engagementService.getState()
  );

  useEffect(() => {
    return engagementService.subscribe((st) => {
      setEngagement(st);
    });
  }, []);

  const requiredSeconds = engagement.config.requiredEngagementMinutes * 60;
  const currentSeconds = engagement.engagementSeconds;
  const progressPercent = Math.min(100, Math.round((currentSeconds / requiredSeconds) * 100));

  const formatMinutes = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    return `${mins}m`;
  };

  const formatDetailed = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  };

  const remainingSeconds = Math.max(0, requiredSeconds - currentSeconds);

  // If unlocked, render the playable Game with switcher tab!
  if (engagement.isGameUnlocked) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Game Switcher Tab Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#0e1320] border-b border-white/10 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedGame('pastel-boba')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedGame === 'pastel-boba'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-md shadow-pink-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🌸 Pastel Star Bloom</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">NEW</span>
            </button>
            <button
              onClick={() => setSelectedGame('byte-runner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedGame === 'byte-runner'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>👾 Byte Runner</span>
            </button>
            <button
              onClick={() => setSelectedGame('fruit-ninja')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                selectedGame === 'fruit-ninja'
                  ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🍉 Fruit Ninja</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {Math.ceil(engagement.gameSessionSecondsLeft / 60)}m break session
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {selectedGame === 'pastel-boba' ? (
            <PastelBobaGame
              currentTheme={currentTheme}
              onOpenMasterPanel={onOpenMasterPanel}
              onClose={onClose}
            />
          ) : selectedGame === 'fruit-ninja' ? (
            <FruitNinjaGame />
          ) : (
            <ByteRunnerGame
              currentTheme={currentTheme}
              onOpenMasterPanel={onOpenMasterPanel}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    );
  }

  // If locked, render the Arcade Reward Station with live countdown and progress
  return (
    <div className="h-full flex flex-col bg-[#0b0f19] text-white overflow-y-auto select-none p-4 md:p-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Gamepad2 size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Compillo Arcade Station</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
                Locked
              </span>
            </h2>
            <p className="text-[11px] text-gray-400">
              5-minute game reward unlocks after {engagement.config.requiredEngagementMinutes} minutes of coding
            </p>
          </div>
        </div>

        <button
          onClick={onOpenMasterPanel}
          className="px-2.5 py-1.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg text-xs text-sky-300 flex items-center gap-1.5 transition-colors"
          title="Open Master Panel to customize 60m engagement or 5m game timers"
        >
          <Sliders size={13} />
          <span className="font-medium">Master Panel</span>
        </button>
      </div>

      {/* Hero Engagement Progress Card */}
      <div className="mt-5 p-6 rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 flex flex-col items-center text-center space-y-4 shadow-xl">
        <div className="relative">
          {/* Circular Lock Glow */}
          <div className="w-24 h-24 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex flex-col items-center justify-center shadow-lg shadow-amber-500/10">
            <Lock size={32} className="text-amber-400" />
            <span className="text-[11px] font-mono font-bold text-amber-300 mt-1">
              {progressPercent}%
            </span>
          </div>
        </div>

        <div className="space-y-1 max-w-sm">
          <h3 className="text-base font-bold text-white">Focus & Earn Your Arcade Break</h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            Active coding on Compillo Studio builds your reward meter. Code for{' '}
            <span className="text-sky-400 font-semibold font-mono">
              {formatDetailed(remainingSeconds)}
            </span>{' '}
            more to unlock your 5-minute session!
          </p>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full max-w-md space-y-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-gray-400">Engagement Completed:</span>
            <span className="text-white font-bold">
              {formatDetailed(currentSeconds)} / {engagement.config.requiredEngagementMinutes}m
            </span>
          </div>
          <div className="w-full h-3 bg-black/40 rounded-full border border-white/10 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-sky-500 to-emerald-400 transition-all duration-300 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Live IDE Tracker Status */}
        <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
          <span
            className={`w-2 h-2 rounded-full ${
              engagement.isUserActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
            }`}
          />
          <span>
            {engagement.isUserActive
              ? 'IDE Focus Active • Counting your engagement time'
              : 'Idle • Timer paused while inactive'}
          </span>
        </div>

        {/* Quick Testing Actions (Master Override) */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => engagementService.addEngagementMinutes(15)}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-xs text-gray-200 flex items-center gap-1 transition-colors"
            title="Fast forward engagement time by 15 minutes"
          >
            <Plus size={12} className="text-emerald-400" />
            <span>+15m Coding Time</span>
          </button>

          <button
            onClick={() => engagementService.addEngagementMinutes(engagement.config.requiredEngagementMinutes)}
            className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 rounded-lg text-xs text-emerald-200 flex items-center gap-1 font-medium transition-colors"
            title="Complete remaining time and unlock game instantly"
          >
            <Zap size={12} className="text-emerald-400" />
            <span>Unlock Game Now</span>
          </button>
        </div>
      </div>

      {/* Game Showcase & Level Previews */}
      <div className="mt-5 space-y-3">
        <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Flame size={14} className="text-amber-400" />
            <span>2 Playable Games Waiting For You</span>
          </span>
          <span className="text-[10px] text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full font-bold">
            🌸 Pastel Bloom & 👾 Byte Runner
          </span>
        </h4>

        {/* Featured Games Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-pink-500/10 to-purple-500/5 border border-pink-500/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
                <span>🌸 Pastel Star Bloom</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold">
                NEW
              </span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Kawaii candy & boba catcher! Glide your adorable bunny mascot to catch sweet boba milk tea, strawberry mochi, glowing starlight gems, and trigger 6s Sugar Rush!
            </p>
            <div className="flex items-center gap-2 pt-1 text-[10px] text-pink-300/80">
              <span>🍓 5 Pastel Levels</span>
              <span>•</span>
              <span>💖 Sweet Combos</span>
              <span>•</span>
              <span>✨ Chime Sounds</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-gradient-to-br from-sky-500/10 to-indigo-500/5 border border-sky-500/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <span>👾 Byte Runner</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold">
                CLASSIC
              </span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Cyberpunk 2D action runner. Double-jump over syntax errors, firewall glitches, and memory segfaults across 5 cyber worlds.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[10px] text-sky-300/80">
              <span>⚡ 5 Tech Worlds</span>
              <span>•</span>
              <span>🏃 Double Jump</span>
              <span>•</span>
              <span>🛡️ Cyber Shields</span>
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Statistics */}
      <div className="mt-5 p-4 rounded-xl bg-black/30 border border-white/10 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">All-Time IDE Engagement:</span>
          <span className="text-white font-mono font-bold">
            {formatMinutes(engagement.totalEngagementSecondsAllTime)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Arcade High Score:</span>
          <span className="text-amber-400 font-mono font-bold">{engagement.highScore}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Times Unlocked:</span>
          <span className="text-emerald-400 font-mono font-bold">
            {engagement.timesUnlockedCount} session(s)
          </span>
        </div>
      </div>
    </div>
  );
};
