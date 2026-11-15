import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  FileCode,
  Play,
  Search,
  ExternalLink,
  ChevronRight,
  School,
  CheckCircle2,
  FolderOpen,
  Trophy,
  Star,
  Award,
} from 'lucide-react';
import { CompilloThemeDefinition } from '../../services/themes';
import {
  UNIVERSITIES_DATA,
  University,
  ProgrammingLab,
  LabExperiment,
  LAB_BADGES,
  eduLabProgress,
  EduLabProgressState,
} from '../../services/eduLabService';
import { gameSound } from '../../services/gameSoundService';

interface EduLabViewProps {
  currentTheme: CompilloThemeDefinition;
  onOpenEduModal: () => void;
  onLoadExperiment: (
    folderId: string | null,
    filename: string,
    content: string,
    autoRun?: boolean
  ) => void;
}

export const EduLabView: React.FC<EduLabViewProps> = ({
  currentTheme,
  onOpenEduModal,
  onLoadExperiment,
}) => {
  const [selectedUnivId, setSelectedUnivId] = useState<string>('rtu');
  const [selectedLabId, setSelectedLabId] = useState<string>('rtu-python');
  const [searchFilter, setSearchFilter] = useState('');

  // Subscribe to progress
  const [progress, setProgress] = useState<EduLabProgressState>(() =>
    eduLabProgress.getState()
  );

  useEffect(() => {
    return eduLabProgress.subscribe((st) => setProgress(st));
  }, []);

  const currentUniv: University =
    UNIVERSITIES_DATA.find((u) => u.id === selectedUnivId) || UNIVERSITIES_DATA[0];

  const currentLab: ProgrammingLab =
    currentUniv.labs.find((l) => l.id === selectedLabId) || currentUniv.labs[0];

  const filteredExperiments = currentLab.experiments.filter(
    (exp) =>
      exp.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      exp.aim.toLowerCase().includes(searchFilter.toLowerCase()) ||
      exp.filename.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col text-xs select-none overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-2.5 border-b shrink-0 flex items-center justify-between"
        style={{ borderColor: currentTheme.ui.sideBarBorder }}
      >
        <div className="flex items-center gap-2">
          <GraduationCap size={16} className="text-amber-400" />
          <span className="font-bold uppercase tracking-wider text-[11px]">
            University Labs
          </span>
        </div>

        <button
          onClick={onOpenEduModal}
          className="px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/30 font-semibold text-[10px] flex items-center gap-1 transition-colors"
          title="Open Lab Browser & Achievement Badges Modal"
        >
          <Trophy size={11} className="text-amber-400" />
          <span>Badges</span>
        </button>
      </div>

      {/* Mini Achievement Badges Ribbon */}
      <div
        className="px-3 py-2 border-b shrink-0 bg-black/5 dark:bg-white/5 flex items-center justify-between gap-2"
        style={{ borderColor: currentTheme.ui.sideBarBorder }}
      >
        <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-400">
          <Trophy size={13} />
          <span>{progress.unlockedBadgeIds.length}/{LAB_BADGES.length} Badges</span>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/25">
          <Star size={11} />
          <span>{progress.totalXp} XP</span>
        </div>

        <button
          onClick={onOpenEduModal}
          className="text-[10px] text-sky-400 hover:underline font-semibold"
        >
          View All &gt;
        </button>
      </div>

      {/* Main Controls & Selectors */}
      <div
        className="p-3 border-b space-y-2.5 shrink-0 bg-black/5 dark:bg-white/5"
        style={{ borderColor: currentTheme.ui.sideBarBorder }}
      >
        {/* University Selector */}
        <div>
          <label className="text-[10px] uppercase font-bold opacity-60 block mb-1">
            University:
          </label>
          <select
            value={selectedUnivId}
            onChange={(e) => {
              const uId = e.target.value;
              setSelectedUnivId(uId);
              const univ = UNIVERSITIES_DATA.find((u) => u.id === uId);
              if (univ && univ.labs.length > 0) {
                setSelectedLabId(univ.labs[0].id);
              }
            }}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-black/10 dark:bg-white/10 outline-none font-medium"
            style={{ borderColor: currentTheme.ui.sideBarBorder }}
          >
            {UNIVERSITIES_DATA.map((u) => (
              <option key={u.id} value={u.id}>
                {u.shortName} - {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* Lab Selector */}
        <div>
          <label className="text-[10px] uppercase font-bold opacity-60 block mb-1">
            Programming Lab:
          </label>
          <select
            value={selectedLabId}
            onChange={(e) => setSelectedLabId(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-black/10 dark:bg-white/10 outline-none font-medium"
            style={{ borderColor: currentTheme.ui.sideBarBorder }}
          >
            {currentUniv.labs.map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.name} ({lab.code})
              </option>
            ))}
          </select>
        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search experiments..."
            className="w-full pl-8 pr-2.5 py-1 text-[11px] rounded-md border bg-black/10 dark:bg-white/10 outline-none"
            style={{ borderColor: currentTheme.ui.sideBarBorder }}
          />
        </div>
      </div>

      {/* Lab Header Summary */}
      <div
        className="px-4 py-2 bg-sky-500/10 border-b flex items-center justify-between text-[11px] text-sky-400 font-semibold"
        style={{ borderColor: currentTheme.ui.sideBarBorder }}
      >
        <span>
          {currentLab.name} ({currentLab.code})
        </span>
        <span>{filteredExperiments.length} experiments</span>
      </div>

      {/* Experiment List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredExperiments.map((exp) => {
          const isDone = eduLabProgress.isExperimentCompleted(exp.id);
          return (
            <div
              key={exp.id}
              className={`p-3 rounded-xl border space-y-2 transition-all hover:border-sky-500/50 bg-black/5 dark:bg-white/5 ${
                isDone ? 'border-emerald-500/30' : ''
              }`}
              style={{
                borderColor: isDone ? undefined : currentTheme.ui.sideBarBorder,
              }}
            >
              <div className="flex items-start justify-between gap-1.5">
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-sky-500/20 text-sky-400'
                    }`}
                  >
                    {exp.experimentNumber}
                  </span>
                  <span className="leading-snug">{exp.title}</span>
                </div>

                {isDone && (
                  <span
                    className="flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold shrink-0 border border-emerald-500/30"
                    title="Experiment successfully completed!"
                  >
                    <CheckCircle2 size={10} />
                    <span>Done</span>
                  </span>
                )}
              </div>

              <p className="text-[11px] opacity-75 line-clamp-2 leading-relaxed">
                {exp.aim}
              </p>

              <div
                className="flex items-center justify-between pt-1 border-t opacity-80"
                style={{ borderColor: currentTheme.ui.sideBarBorder }}
              >
                <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                  <FileCode size={11} />
                  <span>{exp.filename}</span>
                </span>

                <button
                  onClick={() => {
                    const res = eduLabProgress.recordExperimentCompletion(
                      exp.id,
                      exp.filename,
                      selectedUnivId,
                      selectedLabId
                    );
                    if (res.newlyUnlockedBadges.length > 0) {
                      gameSound.playLevelClear();
                    } else {
                      gameSound.playBubblePop();
                    }
                    onLoadExperiment(null, exp.filename, exp.code, true);
                  }}
                  className={`px-2.5 py-1 rounded-md text-white font-bold text-[10px] flex items-center gap-1 shadow-sm transition-all ${
                    isDone
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                      : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700'
                  }`}
                  title="Load into Editor & Open Python Runner"
                >
                  <Play size={10} />
                  <span>{isDone ? 'Re-run' : 'Load & Run'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Popup CTA Button */}
      <div
        className="p-3 border-t shrink-0 bg-black/10 dark:bg-white/10"
        style={{ borderColor: currentTheme.ui.sideBarBorder }}
      >
        <button
          onClick={onOpenEduModal}
          className="w-full py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
        >
          <Trophy size={15} className="text-amber-300" />
          <span>View Badges & University Curriculum</span>
        </button>
      </div>
    </div>
  );
};
