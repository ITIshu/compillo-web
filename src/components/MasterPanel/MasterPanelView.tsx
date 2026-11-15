import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Sliders,
  Clock,
  Gamepad2,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Activity,
  Award,
  Save,
  Cpu,
  Lock,
  Unlock,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { CompilloThemeDefinition } from '../../services/themes';
import {
  engagementService,
  EngagementState,
  MasterPanelConfig,
} from '../../services/engagementService';

interface MasterPanelViewProps {
  currentTheme: CompilloThemeDefinition;
  onClose?: () => void;
  onOpenGame?: () => void;
}

export const MasterPanelView: React.FC<MasterPanelViewProps> = ({
  currentTheme,
  onClose,
  onOpenGame,
}) => {
  const [engagement, setEngagement] = useState<EngagementState>(() =>
    engagementService.getState()
  );

  // Form state for draft adjustments
  const [requiredMinutes, setRequiredMinutes] = useState(
    engagement.config.requiredEngagementMinutes
  );
  const [playtimeMinutes, setPlaytimeMinutes] = useState(
    engagement.config.gamePlaytimeMinutes
  );
  const [devOverride, setDevOverride] = useState(
    engagement.config.devUnlockOverride
  );
  const [idleTimeout, setIdleTimeout] = useState(
    engagement.config.idleTimeoutSeconds
  );
  const [saveBanner, setSaveBanner] = useState(false);

  useEffect(() => {
    return engagementService.subscribe((st) => {
      setEngagement(st);
    });
  }, []);

  const handleApplyPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    engagementService.updateConfig({
      requiredEngagementMinutes: Math.max(1, Number(requiredMinutes)),
      gamePlaytimeMinutes: Math.max(1, Number(playtimeMinutes)),
      devUnlockOverride: devOverride,
      idleTimeoutSeconds: Number(idleTimeout),
    });

    setSaveBanner(true);
    setTimeout(() => setSaveBanner(false), 3500);
  };

  const handleResetToFactory = () => {
    if (confirm('Reset all engagement rules and timers back to factory defaults (60m engagement / 5m game)?')) {
      engagementService.resetAllToFactoryDefaults();
      setRequiredMinutes(60);
      setPlaytimeMinutes(5);
      setDevOverride(false);
      setIdleTimeout(90);
      setSaveBanner(true);
      setTimeout(() => setSaveBanner(false), 3000);
    }
  };

  const formatMinutes = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="h-full flex flex-col bg-[#0d1117] text-white overflow-y-auto select-none p-4 md:p-6">
      {/* Top Title Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Compillo Master Control Panel</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                MASTER ADMIN
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Configure IDE engagement requirements, arcade session timers, and system overrides
            </p>
          </div>
        </div>

        {onOpenGame && (
          <button
            onClick={onOpenGame}
            className="px-3 py-1.5 bg-[#007acc] hover:bg-[#0062a3] rounded-lg text-xs text-white flex items-center gap-1.5 transition-colors shadow-sm font-medium"
          >
            <Gamepad2 size={14} />
            <span>Open Arcade Station</span>
          </button>
        )}
      </div>

      {/* Save Success Alert */}
      {saveBanner && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>Master policy saved! New engagement & session limits applied in real-time.</span>
        </div>
      )}

      {/* Real-time Status Card */}
      <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 space-y-1">
          <span className="text-[11px] text-gray-400 block">Cycle Engagement:</span>
          <span className="text-sm font-bold font-mono text-sky-400">
            {formatMinutes(engagement.engagementSeconds)}
          </span>
          <span className="text-[10px] text-gray-500 block">
            Target: {engagement.config.requiredEngagementMinutes}m
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 space-y-1">
          <span className="text-[11px] text-gray-400 block">Arcade Playtime Left:</span>
          <span className="text-sm font-bold font-mono text-emerald-400">
            {formatMinutes(engagement.gameSessionSecondsLeft)}
          </span>
          <span className="text-[10px] text-gray-500 block">
            Limit: {engagement.config.gamePlaytimeMinutes}m
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 space-y-1">
          <span className="text-[11px] text-gray-400 block">Arcade Status:</span>
          <span
            className={`text-xs font-bold flex items-center gap-1 mt-0.5 ${
              engagement.isGameUnlocked ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {engagement.isGameUnlocked ? <Unlock size={12} /> : <Lock size={12} />}
            <span>{engagement.isGameUnlocked ? 'UNLOCKED' : 'LOCKED'}</span>
          </span>
          <span className="text-[10px] text-gray-500 block">
            {engagement.config.devUnlockOverride ? 'Override Enabled' : 'Engagement Governed'}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 space-y-1">
          <span className="text-[11px] text-gray-400 block">All-Time Coding:</span>
          <span className="text-sm font-bold font-mono text-purple-400">
            {formatMinutes(engagement.totalEngagementSecondsAllTime)}
          </span>
          <span className="text-[10px] text-gray-500 block">
            High Score: {engagement.highScore}
          </span>
        </div>
      </div>

      {/* Main Configuration Form */}
      <form onSubmit={handleApplyPolicy} className="mt-5 space-y-6">
        {/* Section 1: Required Engagement Duration */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock size={14} className="text-sky-400" />
                <span>Required IDE Engagement Time</span>
              </label>
              <p className="text-[11px] text-gray-400 mt-0.5">
                How many minutes of active coding are required before the arcade game unlocks.
              </p>
            </div>
            <span className="text-base font-bold font-mono text-sky-400 bg-sky-500/15 border border-sky-500/30 px-3 py-1 rounded-lg">
              {requiredMinutes} min
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={180}
              step={1}
              value={requiredMinutes}
              onChange={(e) => setRequiredMinutes(Number(e.target.value))}
              className="flex-1 accent-sky-500 cursor-pointer h-2 bg-white/10 rounded-lg"
            />
            <input
              type="number"
              min={1}
              max={300}
              value={requiredMinutes}
              onChange={(e) => setRequiredMinutes(Number(e.target.value))}
              className="w-20 px-2 py-1 bg-black/40 border border-white/15 rounded text-xs font-mono text-white text-center outline-none focus:border-sky-400"
            />
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[1, 5, 15, 30, 45, 60, 90, 120].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setRequiredMinutes(mins)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${
                  requiredMinutes === mins
                    ? 'bg-sky-500 text-white border-sky-400 font-bold'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                }`}
              >
                {mins === 1 ? '1m (Demo)' : `${mins}m`}
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Game Playtime Limit */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Gamepad2 size={14} className="text-emerald-400" />
                <span>Arcade Game Session Playtime Limit</span>
              </label>
              <p className="text-[11px] text-gray-400 mt-0.5">
                How long the user can play the arcade game once unlocked before it locks for the next cycle.
              </p>
            </div>
            <span className="text-base font-bold font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-lg">
              {playtimeMinutes} min
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={playtimeMinutes}
              onChange={(e) => setPlaytimeMinutes(Number(e.target.value))}
              className="flex-1 accent-emerald-500 cursor-pointer h-2 bg-white/10 rounded-lg"
            />
            <input
              type="number"
              min={1}
              max={60}
              value={playtimeMinutes}
              onChange={(e) => setPlaytimeMinutes(Number(e.target.value))}
              className="w-20 px-2 py-1 bg-black/40 border border-white/15 rounded text-xs font-mono text-white text-center outline-none focus:border-emerald-400"
            />
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[1, 3, 5, 8, 10, 15, 20].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setPlaytimeMinutes(mins)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${
                  playtimeMinutes === mins
                    ? 'bg-emerald-500 text-white border-emerald-400 font-bold'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                }`}
              >
                {mins === 1 ? '1m (Demo)' : `${mins}m`}
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Developer Override & Inactivity */}
        <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Zap size={14} className="text-amber-400" />
                <span>Instant Developer / Admin Unlock Override</span>
              </span>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Bypass the engagement timer completely for immediate testing, demos, or administrator access.
              </p>
            </div>
            <input
              type="checkbox"
              checked={devOverride}
              onChange={(e) => setDevOverride(e.target.checked)}
              className="w-4 h-4 accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="border-t border-white/10 pt-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Activity size={14} className="text-purple-400" />
                <span>Idle Inactivity Threshold</span>
              </span>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Pause engagement timer when user has no keyboard or mouse interaction for:
              </p>
            </div>
            <select
              value={idleTimeout}
              onChange={(e) => setIdleTimeout(Number(e.target.value))}
              className="bg-black/40 border border-white/15 rounded px-2.5 py-1 text-xs text-white outline-none"
            >
              <option value={30}>30 seconds</option>
              <option value={60}>60 seconds</option>
              <option value={90}>90 seconds (Default)</option>
              <option value={180}>3 minutes</option>
              <option value={300}>5 minutes</option>
            </select>
          </div>
        </div>

        {/* Submit & Reset Bar */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98"
          >
            <Save size={14} />
            <span>Save & Apply Master Policy</span>
          </button>

          <button
            type="button"
            onClick={handleResetToFactory}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-gray-300 rounded-lg text-xs transition-colors flex items-center gap-1.5"
            title="Reset to 60m engagement / 5m game"
          >
            <RotateCcw size={13} />
            <span>Defaults</span>
          </button>
        </div>
      </form>

      {/* Quick Testing & Simulator Utilities */}
      <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
        <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
          <Cpu size={14} className="text-sky-400" />
          <span>Live Testing & Simulation Utilities</span>
        </h3>
        <p className="text-[11px] text-gray-400">
          Trigger live state changes without waiting in real time:
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              engagementService.addEngagementMinutes(15);
              setSaveBanner(true);
              setTimeout(() => setSaveBanner(false), 2000);
            }}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-xs text-gray-200 flex items-center gap-1.5"
          >
            <Plus size={12} className="text-emerald-400" />
            <span>+15m Engagement</span>
          </button>

          <button
            type="button"
            onClick={() => {
              engagementService.addEngagementMinutes(60);
              setSaveBanner(true);
              setTimeout(() => setSaveBanner(false), 2000);
            }}
            className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 rounded-lg text-xs text-sky-300 flex items-center gap-1.5"
          >
            <Zap size={12} className="text-sky-400" />
            <span>+60m Engagement (Unlock)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              engagementService.refillGameTimer();
              setSaveBanner(true);
              setTimeout(() => setSaveBanner(false), 2000);
            }}
            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center gap-1.5"
          >
            <RefreshCw size={12} className="text-emerald-400" />
            <span>Refill Game Session ({playtimeMinutes}m)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              engagementService.resetEngagement();
              setSaveBanner(true);
              setTimeout(() => setSaveBanner(false), 2000);
            }}
            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-1.5"
          >
            <RotateCcw size={12} className="text-rose-400" />
            <span>Reset Cycle to 0</span>
          </button>
        </div>
      </div>
    </div>
  );
};
