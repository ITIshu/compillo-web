import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  GraduationCap,
  BookOpen,
  FileCode,
  Check,
  ChevronRight,
  Play,
  Search,
  School,
  Folder,
  Code2,
  Sparkles,
  Trophy,
  Award,
  Lock,
  CheckCircle2,
  Star,
  Flame,
  RotateCcw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { CompilloThemeDefinition } from '../../services/themes';
import {
  UNIVERSITIES_DATA,
  University,
  ProgrammingLab,
  LabExperiment,
  LAB_BADGES,
  LabBadge,
  eduLabProgress,
  EduLabProgressState,
} from '../../services/eduLabService';
import { FileNode } from '../../types';
import { gameSound } from '../../services/gameSoundService';

interface EduLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadExperiment: (
    folderId: string | null,
    filename: string,
    content: string,
    autoRun?: boolean
  ) => void;
  currentTheme: CompilloThemeDefinition;
  files: FileNode[];
}

export const EduLabModal: React.FC<EduLabModalProps> = ({
  isOpen,
  onClose,
  onLoadExperiment,
  currentTheme,
  files,
}) => {
  // State for selections
  const [selectedUnivId, setSelectedUnivId] = useState<string>('rtu');
  const [selectedLabId, setSelectedLabId] = useState<string>('rtu-python');
  const [selectedExpId, setSelectedExpId] = useState<string>('rtu-py-exp1');
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRun, setAutoRun] = useState(true);
  const [activeTab, setActiveTab] = useState<'curriculum' | 'badges'>('curriculum');
  const [inspectBadge, setInspectBadge] = useState<LabBadge | null>(null);

  // Subscribe to reactive achievement badge progress
  const [progress, setProgress] = useState<EduLabProgressState>(() =>
    eduLabProgress.getState()
  );

  useEffect(() => {
    return eduLabProgress.subscribe((st) => setProgress(st));
  }, []);

  // Total experiments in all universities
  const totalCurriculumExperiments = useMemo(() => {
    let count = 0;
    UNIVERSITIES_DATA.forEach((u) => {
      u.labs.forEach((l) => {
        count += l.experiments.length;
      });
    });
    return count;
  }, []);

  // Folder options
  const folderList = useMemo(() => {
    const list: Array<{ id: string | null; path: string; name: string }> = [
      { id: null, path: '/', name: 'Workspace Root (/)' },
    ];
    const traverse = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'folder') {
          list.push({ id: node.id, path: node.path, name: node.path });
          if (node.children) traverse(node.children);
        }
      }
    };
    traverse(files);
    return list;
  }, [files]);

  // Current university
  const selectedUniv: University = useMemo(() => {
    return (
      UNIVERSITIES_DATA.find((u) => u.id === selectedUnivId) || UNIVERSITIES_DATA[0]
    );
  }, [selectedUnivId]);

  // Current lab
  const selectedLab: ProgrammingLab = useMemo(() => {
    return (
      selectedUniv.labs.find((l) => l.id === selectedLabId) || selectedUniv.labs[0]
    );
  }, [selectedUniv, selectedLabId]);

  // Current experiment
  const selectedExp: LabExperiment = useMemo(() => {
    return (
      selectedLab.experiments.find((e) => e.id === selectedExpId) ||
      selectedLab.experiments[0]
    );
  }, [selectedLab, selectedExpId]);

  // Search filter
  const filteredUniversities = useMemo(() => {
    if (!searchQuery.trim()) return UNIVERSITIES_DATA;
    const q = searchQuery.toLowerCase();
    return UNIVERSITIES_DATA.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.shortName.toLowerCase().includes(q) ||
        u.labs.some(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            l.experiments.some((e) => e.title.toLowerCase().includes(q))
        )
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleUniversityChange = (uId: string) => {
    setSelectedUnivId(uId);
    const univ = UNIVERSITIES_DATA.find((u) => u.id === uId) || UNIVERSITIES_DATA[0];
    if (univ.labs.length > 0) {
      setSelectedLabId(univ.labs[0].id);
      if (univ.labs[0].experiments.length > 0) {
        setSelectedExpId(univ.labs[0].experiments[0].id);
      }
    }
  };

  const handleLabChange = (lId: string) => {
    setSelectedLabId(lId);
    const lab = selectedUniv.labs.find((l) => l.id === lId);
    if (lab && lab.experiments.length > 0) {
      setSelectedExpId(lab.experiments[0].id);
    }
  };

  const handleConfirm = () => {
    if (!selectedExp) return;
    onLoadExperiment(targetFolderId, selectedExp.filename, selectedExp.code, autoRun);
    onClose();
  };

  const isCurrentExpCompleted = selectedExp
    ? eduLabProgress.isExperimentCompleted(selectedExp.id)
    : false;

  const handleManualMarkCompleted = () => {
    if (!selectedExp) return;
    const res = eduLabProgress.recordExperimentCompletion(
      selectedExp.id,
      selectedExp.filename,
      selectedUniv.id,
      selectedLab.id
    );
    if (res.newlyUnlockedBadges.length > 0) {
      gameSound.playLevelClear();
      setInspectBadge(res.newlyUnlockedBadges[0]);
    } else {
      gameSound.playSparkleChime();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden"
        style={{
          backgroundColor: currentTheme.ui.sideBarBg,
          borderColor: currentTheme.ui.sideBarBorder,
          color: currentTheme.ui.sideBarFg,
        }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b shrink-0 select-none"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
              <GraduationCap size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>University Programming Labs</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 font-semibold border border-sky-500/30">
                  Academic Lab Browser
                </span>
              </h2>
              <p className="text-xs opacity-70">
                Official curriculum experiments with student achievement badges & progress tracking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Visual Achievement Badges & Progress Ribbon */}
        <div
          className="px-5 py-2.5 border-b shrink-0 flex flex-wrap items-center justify-between gap-3 bg-black/5 dark:bg-white/5"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          {/* Left Stats: XP & Completion */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-bold shadow-sm">
              <Trophy size={14} className="text-amber-400" />
              <span>{progress.unlockedBadgeIds.length} / {LAB_BADGES.length} Badges</span>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-xs font-bold shadow-sm">
              <Star size={13} className="text-indigo-400" />
              <span>{progress.totalXp} XP</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold opacity-80">
              <span>Progress:</span>
              <div className="w-28 h-2 rounded-full bg-black/20 dark:bg-white/10 overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (progress.completedExperiments.length / totalCurriculumExperiments) * 100
                      )
                    )}%`,
                  }}
                />
              </div>
              <span className="text-[11px] font-mono text-emerald-400">
                {progress.completedExperiments.length}/{totalCurriculumExperiments}
              </span>
            </div>
          </div>

          {/* Quick Badges Mini Ribbon + Tab Switcher */}
          <div className="flex items-center gap-2">
            {/* 6 Mini Badges clickable preview */}
            <div className="flex items-center gap-1.5 bg-black/10 dark:bg-white/10 p-1 rounded-xl border border-white/10">
              {LAB_BADGES.map((b) => {
                const isUnlocked = progress.unlockedBadgeIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    onClick={() => setInspectBadge(b)}
                    className={`relative w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                      isUnlocked
                        ? 'bg-amber-400/20 text-white border border-amber-400 shadow-sm shadow-amber-400/20 scale-105'
                        : 'opacity-40 grayscale hover:opacity-80'
                    }`}
                    title={`${b.title} (${isUnlocked ? 'Unlocked!' : 'Locked - click to view'})`}
                  >
                    <span>{b.icon}</span>
                    {isUnlocked && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-black" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 bg-black/10 dark:bg-white/10 p-0.5 rounded-xl border border-white/10 text-xs font-bold">
              <button
                onClick={() => setActiveTab('curriculum')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'curriculum'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                Curriculum Labs
              </button>
              <button
                onClick={() => setActiveTab('badges')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                  activeTab === 'badges'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Trophy size={13} />
                <span>Badges ({progress.unlockedBadgeIds.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: CURRICULUM LABS */}
          {activeTab === 'curriculum' && (
            <>
              {/* Search Bar */}
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search universities, courses, or experiment topics (e.g. RTU, Calculator, Fibonacci, Matrix)..."
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border bg-black/5 dark:bg-white/5 outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                  style={{ borderColor: currentTheme.ui.sideBarBorder }}
                />
              </div>

              {/* 3 Steps Container */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Step 1: Select University */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 opacity-80">
                    <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] font-bold">
                      1
                    </span>
                    <span>Select University</span>
                  </label>

                  <div
                    className="space-y-1.5 max-h-56 overflow-y-auto p-1 rounded-xl border"
                    style={{ borderColor: currentTheme.ui.sideBarBorder }}
                  >
                    {filteredUniversities.map((u) => {
                      const isSelected = u.id === selectedUnivId;
                      // Count completed in this university
                      const completedInUniv = progress.completedExperiments.filter(
                        (e) => e.universityId === u.id
                      ).length;
                      return (
                        <button
                          key={u.id}
                          onClick={() => handleUniversityChange(u.id)}
                          className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-sky-500 text-white shadow-sm font-semibold'
                              : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-85'
                          }`}
                        >
                          <div className="truncate">
                            <div className="font-bold flex items-center gap-1.5">
                              <School size={14} />
                              <span>{u.shortName}</span>
                            </div>
                            <div
                              className={`text-[10px] truncate ${
                                isSelected ? 'text-white/80' : 'opacity-60'
                              }`}
                            >
                              {u.name}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {completedInUniv > 0 && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}
                              >
                                {completedInUniv} done
                              </span>
                            )}
                            {isSelected && <Check size={14} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Select Lab */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 opacity-80">
                    <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                      2
                    </span>
                    <span>Select Programming Lab</span>
                  </label>

                  <div
                    className="space-y-1.5 max-h-56 overflow-y-auto p-1 rounded-xl border"
                    style={{ borderColor: currentTheme.ui.sideBarBorder }}
                  >
                    {selectedUniv.labs.map((lab) => {
                      const isSelected = lab.id === selectedLabId;
                      const completedInLab = progress.completedExperiments.filter(
                        (e) => e.labId === lab.id
                      ).length;
                      return (
                        <button
                          key={lab.id}
                          onClick={() => handleLabChange(lab.id)}
                          className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                              : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-85'
                          }`}
                        >
                          <div className="truncate">
                            <div className="font-bold flex items-center gap-1.5">
                              <span>{lab.icon}</span>
                              <span>{lab.name}</span>
                            </div>
                            <div
                              className={`text-[10px] truncate ${
                                isSelected ? 'text-white/80' : 'opacity-60'
                              }`}
                            >
                              Code: {lab.code} • {lab.experiments.length} Experiments
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {completedInLab > 0 && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}
                              >
                                {completedInLab}/{lab.experiments.length}
                              </span>
                            )}
                            {isSelected && <Check size={14} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3: Select Experiment */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 opacity-80">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                      3
                    </span>
                    <span>Select Experiment</span>
                  </label>

                  <div
                    className="space-y-1.5 max-h-56 overflow-y-auto p-1 rounded-xl border"
                    style={{ borderColor: currentTheme.ui.sideBarBorder }}
                  >
                    {selectedLab.experiments.map((exp) => {
                      const isSelected = exp.id === selectedExpId;
                      const isDone = eduLabProgress.isExperimentCompleted(exp.id);
                      return (
                        <button
                          key={exp.id}
                          onClick={() => setSelectedExpId(exp.id)}
                          className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                              : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-85'
                          }`}
                        >
                          <div className="truncate">
                            <div className="font-bold flex items-center gap-1.5">
                              <span
                                className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-black/10 dark:bg-white/10'
                                }`}
                              >
                                {exp.experimentNumber}
                              </span>
                              <span className="truncate">{exp.title}</span>
                            </div>
                            <div
                              className={`text-[10px] truncate pl-6.5 ${
                                isSelected ? 'text-white/80' : 'opacity-60'
                              }`}
                            >
                              {exp.filename}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-1.5">
                            {isDone && (
                              <span
                                title="Experiment completed!"
                                className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                  isSelected
                                    ? 'bg-white/25 text-white'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}
                              >
                                <CheckCircle2 size={11} />
                                <span className="hidden sm:inline">Done</span>
                              </span>
                            )}
                            {isSelected && <Check size={14} className="shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Experiment Preview Card */}
              {selectedExp && (
                <div
                  className="p-4 rounded-xl border space-y-3 bg-black/5 dark:bg-white/5"
                  style={{ borderColor: currentTheme.ui.sideBarBorder }}
                >
                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3"
                    style={{ borderColor: currentTheme.ui.sideBarBorder }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 font-bold text-xs">
                          {selectedUniv.shortName} • {selectedLab.code}
                        </span>
                        <span className="text-xs font-bold text-emerald-400">
                          Experiment {selectedExp.experimentNumber}
                        </span>

                        {isCurrentExpCompleted ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-extrabold text-[11px] flex items-center gap-1 border border-emerald-500/40">
                            <CheckCircle2 size={12} className="text-emerald-400" />
                            <span>Verified & Completed (+50 XP)</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-semibold text-[10px] border border-amber-500/30">
                            Unlocks Badges on Run
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1">
                        {selectedExp.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono opacity-70 flex items-center gap-1">
                        <FileCode size={14} />
                        <span>{selectedExp.filename}</span>
                      </span>

                      {!isCurrentExpCompleted && (
                        <button
                          onClick={handleManualMarkCompleted}
                          className="px-2.5 py-1 text-[11px] rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 font-bold text-emerald-400 flex items-center gap-1 transition-colors"
                          title="Verify and record completion XP"
                        >
                          <CheckCircle2 size={13} />
                          <span>Mark Verified</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Aim */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                      Aim of Experiment:
                    </span>
                    <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
                      {selectedExp.aim}
                    </p>
                  </div>

                  {/* Code Preview snippet */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] opacity-70 mb-1">
                      <span>Source Code Preview:</span>
                      <span>Language: {selectedExp.language.toUpperCase()}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-black/40 font-mono text-[11px] text-gray-300 max-h-32 overflow-y-auto leading-relaxed border border-white/10 select-text">
                      <pre className="whitespace-pre-wrap">{selectedExp.code.slice(0, 500)}...</pre>
                    </div>
                  </div>

                  {/* Destination folder & auto run */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 text-xs">
                      <Folder size={14} className="opacity-60" />
                      <span className="opacity-70">Save to:</span>
                      <select
                        value={targetFolderId || ''}
                        onChange={(e) => setTargetFolderId(e.target.value || null)}
                        className="px-2 py-1 text-xs rounded-lg border bg-black/10 dark:bg-white/10 outline-none"
                        style={{ borderColor: currentTheme.ui.sideBarBorder }}
                      >
                        {folderList.map((f) => (
                          <option key={f.id || 'root'} value={f.id || ''}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoRun}
                        onChange={(e) => setAutoRun(e.target.checked)}
                        className="rounded text-sky-500 focus:ring-0"
                      />
                      <span>Run automatically in Python runner & track badge progress</span>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: ACHIEVEMENT BADGES SHOWCASE */}
          {activeTab === 'badges' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <Trophy size={16} />
                    <span>Academic Achievement Badges</span>
                  </h3>
                  <p className="text-xs opacity-70 mt-0.5">
                    Unlock official university badges by loading and executing laboratory experiments.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => {
                      if (confirm('Reset your lab achievement badge progress?')) {
                        eduLabProgress.clearProgress();
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-rose-500/20 hover:text-rose-400 border border-white/10 text-[11px] font-semibold flex items-center gap-1 transition-colors opacity-70 hover:opacity-100"
                  >
                    <RotateCcw size={12} />
                    <span>Reset Progress</span>
                  </button>
                </div>
              </div>

              {/* 6 Badges Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {LAB_BADGES.map((badge) => {
                  const isUnlocked = progress.unlockedBadgeIds.includes(badge.id);
                  const p = eduLabProgress.getBadgeProgress(badge.id);

                  return (
                    <div
                      key={badge.id}
                      onClick={() => setInspectBadge(badge)}
                      className={`cursor-pointer p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                        isUnlocked
                          ? 'bg-gradient-to-br from-amber-500/10 via-white/5 to-transparent shadow-lg shadow-amber-500/10 hover:scale-[1.02]'
                          : 'bg-black/5 dark:bg-white/5 opacity-75 hover:opacity-95'
                      }`}
                      style={{
                        borderColor: isUnlocked ? badge.borderColor : currentTheme.ui.sideBarBorder,
                      }}
                    >
                      {/* Top Row: Icon & Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner border"
                          style={{
                            backgroundColor: isUnlocked ? badge.glowColor : 'rgba(0,0,0,0.2)',
                            borderColor: isUnlocked ? badge.borderColor : 'rgba(255,255,255,0.1)',
                          }}
                        >
                          {badge.icon}
                        </div>

                        <div>
                          {isUnlocked ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                              <CheckCircle2 size={11} />
                              <span>UNLOCKED</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-black/20 dark:bg-white/10 text-gray-400 font-bold text-[10px] border border-white/10 flex items-center gap-1">
                              <Lock size={10} />
                              <span>LOCKED</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle: Title & Description */}
                      <div className="my-3 space-y-1">
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{badge.title}</span>
                        </h4>
                        <p className="text-[11px] opacity-75 leading-relaxed line-clamp-2">
                          {badge.description}
                        </p>
                      </div>

                      {/* Bottom: Progress Bar & Reward */}
                      <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="opacity-70">{badge.requirementText}</span>
                          <span className={isUnlocked ? 'text-emerald-400' : 'opacity-80'}>
                            {p.current} / {p.total}
                          </span>
                        </div>

                        <div className="w-full h-1.5 rounded-full bg-black/20 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${p.percent}%`,
                              backgroundColor: isUnlocked ? badge.color : '#94a3b8',
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between pt-0.5 text-[10px] font-semibold text-amber-400">
                          <span>Reward:</span>
                          <span className="font-mono">{badge.reward}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Subject Summary Tracker Box */}
              <div
                className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 space-y-2.5"
                style={{ borderColor: currentTheme.ui.sideBarBorder }}
              >
                <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen size={14} />
                  <span>University Subject Tracker Progress</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                  {UNIVERSITIES_DATA.map((u) => {
                    const totalExps = u.labs.reduce((acc, l) => acc + l.experiments.length, 0);
                    const doneExps = progress.completedExperiments.filter(
                      (e) => e.universityId === u.id
                    ).length;
                    const percent = Math.min(100, Math.round((doneExps / totalExps) * 100));

                    return (
                      <div
                        key={u.id}
                        className="p-2.5 rounded-lg bg-black/10 dark:bg-white/5 border border-white/10 space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{u.shortName}</span>
                          <span className="text-[10px] text-emerald-400">
                            {doneExps}/{totalExps}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-black/20 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-sky-400 transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="text-[10px] opacity-60 truncate">
                          {u.labs[0]?.name || 'Lab Curriculum'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t shrink-0 select-none bg-black/5 dark:bg-white/5"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <div className="text-xs opacity-70">
            Selected: <span className="font-bold">{selectedUniv.shortName}</span> &gt;{' '}
            <span className="font-bold">{selectedLab.name}</span> &gt;{' '}
            <span className="font-bold">Exp {selectedExp.experimentNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleConfirm}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white shadow-lg shadow-sky-500/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
            >
              <FileCode size={15} />
              <span>Load Experiment & Track Progress</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inspect Badge Detail / Celebration Modal */}
      {inspectBadge && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in zoom-in-95">
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border text-center space-y-4 animate-in fade-in"
            style={{
              backgroundColor: currentTheme.ui.sideBarBg,
              borderColor: inspectBadge.borderColor,
              color: currentTheme.ui.sideBarFg,
            }}
          >
            <div
              className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-xl border animate-bounce"
              style={{
                backgroundColor: inspectBadge.glowColor,
                borderColor: inspectBadge.borderColor,
              }}
            >
              {inspectBadge.icon}
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-amber-400">
                Academic Achievement Badge
              </div>
              <h3 className="text-lg font-black text-white mt-0.5">
                {inspectBadge.title}
              </h3>
              <p className="text-xs opacity-75 mt-1 leading-relaxed">
                {inspectBadge.description}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-black/20 dark:bg-white/5 border border-white/10 text-xs space-y-2">
              <div className="flex justify-between font-bold">
                <span className="opacity-70">Requirement:</span>
                <span className="text-sky-400">{inspectBadge.requirementText}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="opacity-70">Academic Reward:</span>
                <span className="text-amber-400">{inspectBadge.reward}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="opacity-70">Current Status:</span>
                <span
                  className={
                    progress.unlockedBadgeIds.includes(inspectBadge.id)
                      ? 'text-emerald-400'
                      : 'text-gray-400'
                  }
                >
                  {progress.unlockedBadgeIds.includes(inspectBadge.id)
                    ? '✓ UNLOCKED'
                    : '🔒 In Progress'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setInspectBadge(null)}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md hover:scale-[1.02] active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
