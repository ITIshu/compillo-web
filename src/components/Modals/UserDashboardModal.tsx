import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  GraduationCap,
  Trophy,
  Star,
  Clock,
  Code2,
  Github,
  MapPin,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Edit3,
  Save,
  LogOut,
  FolderGit2,
  Award,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { CompilloThemeDefinition } from '../../services/themes';
import { authService, UserProfile } from '../../services/authService';
import { eduLabProgress, EduLabProgressState, LAB_BADGES } from '../../services/eduLabService';
import { engagementService } from '../../services/engagementService';
import { FileNode } from '../../types';
import { gameSound } from '../../services/gameSoundService';
import { googleSignIn } from '../../services/googleAuth';
import { githubSyncService, GitHubSyncState } from '../../services/githubService';

interface UserDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: CompilloThemeDefinition;
  files: FileNode[];
  onOpenEduLabs?: () => void;
  onOpenSignIn?: () => void;
  onSignOut?: () => void;
}

export const UserDashboardModal: React.FC<UserDashboardModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  files,
  onOpenEduLabs,
  onOpenSignIn,
  onSignOut,
}) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() =>
    authService.getCurrentUser()
  );

  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'connected' | 'security'>('overview');

  // Edit profile form
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserProfile['role']>('Student');
  const [editUniv, setEditUniv] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editGh, setEditGh] = useState('');

  // Lab progress state
  const [labState, setLabState] = useState<EduLabProgressState>(() => eduLabProgress.getState());
  const [gitHubState, setGitHubState] = useState<GitHubSyncState>(() => githubSyncService.getState());
  const [isEditingGitHub, setIsEditingGitHub] = useState(false);
  const [dashGhId, setDashGhId] = useState(() => localStorage.getItem('compillo_github_id') || '');
  const [dashGhToken, setDashGhToken] = useState(() => localStorage.getItem('compillo_github_token') || '');
  const [dashGhMsg, setDashGhMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    return githubSyncService.subscribe((st) => setGitHubState(st));
  }, []);

  useEffect(() => {
    const unsubAuth = authService.subscribe((u) => {
      setCurrentUser(u);
      if (u) {
        setEditName(u.name);
        setEditRole(u.role);
        setEditUniv(u.university);
        setEditBio(u.bio);
        setEditLocation(u.location);
        setEditGh(u.githubUsername || '');
      }
    });

    const unsubLab = eduLabProgress.subscribe((s) => setLabState(s));

    return () => {
      unsubAuth();
      unsubLab();
    };
  }, []);

  if (!isOpen) return null;

  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
        <div
          className="w-full max-w-md rounded-2xl p-6 shadow-2xl border text-center space-y-4"
          style={{
            backgroundColor: currentTheme.ui.sideBarBg,
            borderColor: currentTheme.ui.sideBarBorder,
            color: currentTheme.ui.sideBarFg,
          }}
        >
          <div className="w-16 h-16 rounded-2xl mx-auto bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <User size={30} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Not Signed In</h3>
            <p className="text-xs opacity-75 mt-1 leading-relaxed">
              Sign in with Google or GitHub to view your User Dashboard, track academic XP, and sync workspace data.
            </p>
          </div>
          <div className="flex items-center gap-2 justify-center pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-black/10 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenSignIn?.();
              }}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow-md transition-all hover:scale-[1.02]"
            >
              Sign In Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveProfile = () => {
    authService.updateProfile({
      name: editName.trim() || currentUser.name,
      role: editRole,
      university: editUniv.trim() || currentUser.university,
      bio: editBio.trim() || currentUser.bio,
      location: editLocation.trim() || currentUser.location,
      githubUsername: editGh.trim() || undefined,
    });
    gameSound.playLevelClear();
    setIsEditing(false);
  };

  const handleSignOutClick = () => {
    authService.signOut();
    gameSound.playBubblePop();
    onSignOut?.();
    onClose();
  };

  // Stats calculation
  const totalFiles = (() => {
    let count = 0;
    const countNodes = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') count++;
        if (node.children) countNodes(node.children);
      }
    };
    countNodes(files);
    return count;
  })();

  const engagementMinutes = Math.max(
    1,
    Math.round(engagementService.getState().totalEngagementSecondsAllTime / 60)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-3xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]"
        style={{
          backgroundColor: currentTheme.ui.sideBarBg,
          borderColor: currentTheme.ui.sideBarBorder,
          color: currentTheme.ui.sideBarFg,
        }}
      >
        {/* Header Ribbon with User Quick Banner */}
        <div
          className="p-5 border-b shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/10 dark:bg-white/5"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-14 h-14 rounded-2xl bg-sky-500/20 border-2 border-sky-400 p-0.5 object-cover shadow-lg"
              />
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black flex items-center justify-center text-[8px] font-bold ${
                  currentUser.provider === 'google'
                    ? 'bg-blue-500 text-white'
                    : currentUser.provider === 'github'
                    ? 'bg-purple-600 text-white'
                    : 'bg-emerald-500 text-white'
                }`}
                title={`Signed in with ${currentUser.provider.toUpperCase()}`}
              >
                {currentUser.provider === 'google'
                  ? 'G'
                  : currentUser.provider === 'github'
                  ? 'GH'
                  : '@'}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{currentUser.name}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30">
                  {currentUser.role}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Active
                </span>
              </div>
              <p className="text-xs opacity-75 font-mono mt-0.5">{currentUser.email}</p>
              <p className="text-[11px] opacity-60 flex items-center gap-1.5 mt-0.5">
                <GraduationCap size={12} />
                <span>{currentUser.university}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Edit3 size={13} />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
            </button>

            <button
              onClick={handleSignOutClick}
              className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Sign Out of Compillo Cloud Services"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className="flex items-center border-b px-5 gap-2 bg-black/5 dark:bg-white/5 text-xs font-bold shrink-0"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'overview'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Layers size={14} />
            <span>Activity & Stats</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'profile'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <User size={14} />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => setActiveTab('connected')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'connected'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <FolderGit2 size={14} />
            <span>Connected Services</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'security'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Security & Sessions</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: OVERVIEW & STATS */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* 4 Quick Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                  className="p-3.5 rounded-xl border bg-black/5 dark:bg-white/5 space-y-1"
                  style={{ borderColor: currentTheme.ui.sideBarBorder }}
                >
                  <div className="flex items-center justify-between opacity-70 text-[11px] font-bold">
                    <span>Academic XP</span>
                    <Star size={13} className="text-amber-400" />
                  </div>
                  <div className="text-xl font-black text-amber-400">{labState.totalXp} XP</div>
                  <div className="text-[10px] opacity-60">From completed labs</div>
                </div>

                <div
                  className="p-3.5 rounded-xl border bg-black/5 dark:bg-white/5 space-y-1"
                  style={{ borderColor: currentTheme.ui.sideBarBorder }}
                >
                  <div className="flex items-center justify-between opacity-70 text-[11px] font-bold">
                    <span>Lab Badges</span>
                    <Trophy size={13} className="text-sky-400" />
                  </div>
                  <div className="text-xl font-black text-sky-400">
                    {labState.unlockedBadgeIds.length} / {LAB_BADGES.length}
                  </div>
                  <div className="text-[10px] opacity-60">Honors unlocked</div>
                </div>

                <div
                  className="p-3.5 rounded-xl border bg-black/5 dark:bg-white/5 space-y-1"
                  style={{ borderColor: currentTheme.ui.sideBarBorder }}
                >
                  <div className="flex items-center justify-between opacity-70 text-[11px] font-bold">
                    <span>Engagement</span>
                    <Clock size={13} className="text-emerald-400" />
                  </div>
                  <div className="text-xl font-black text-emerald-400">{engagementMinutes}m</div>
                  <div className="text-[10px] opacity-60">Active coding time</div>
                </div>

                <div
                  className="p-3.5 rounded-xl border bg-black/5 dark:bg-white/5 space-y-1"
                  style={{ borderColor: currentTheme.ui.sideBarBorder }}
                >
                  <div className="flex items-center justify-between opacity-70 text-[11px] font-bold">
                    <span>Workspace</span>
                    <Code2 size={13} className="text-purple-400" />
                  </div>
                  <div className="text-xl font-black text-purple-400">{totalFiles} Files</div>
                  <div className="text-[10px] opacity-60 truncate">Active project</div>
                </div>
              </div>

              {/* Lab Experiments Progress Card */}
              <div
                className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 space-y-3"
                style={{ borderColor: currentTheme.ui.sideBarBorder }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <GraduationCap size={16} className="text-amber-400" />
                    <span>University Programming Labs Progress</span>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onOpenEduLabs?.();
                    }}
                    className="text-xs text-sky-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <span>Open Labs Browser</span>
                    <ExternalLink size={12} />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="opacity-70">Completed Experiments:</span>
                    <span className="font-bold text-emerald-400">
                      {labState.completedExperiments.length} finished
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {LAB_BADGES.map((b) => {
                      const unlocked = labState.unlockedBadgeIds.includes(b.id);
                      return (
                        <div
                          key={b.id}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                            unlocked
                              ? 'bg-amber-400/15 border-amber-400 text-amber-300 shadow-sm'
                              : 'bg-black/10 dark:bg-white/5 border-white/10 opacity-40 grayscale'
                          }`}
                          title={b.description}
                        >
                          <span>{b.icon}</span>
                          <span>{b.title}</span>
                          {unlocked && <CheckCircle2 size={11} className="text-emerald-400 ml-1" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bio & Details Snapshot */}
              <div
                className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 space-y-2 text-xs"
                style={{ borderColor: currentTheme.ui.sideBarBorder }}
              >
                <span className="font-bold text-sky-400 uppercase tracking-wider text-[10px]">
                  About Me
                </span>
                <p className="opacity-85 leading-relaxed">{currentUser.bio}</p>
                <div className="flex flex-wrap gap-4 pt-1 opacity-70 text-[11px]">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    <span>{currentUser.location}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>Member since {new Date(currentUser.createdAt).toLocaleDateString()}</span>
                  </span>
                  {currentUser.githubUsername && (
                    <span className="flex items-center gap-1">
                      <Github size={12} />
                      <span>github.com/{currentUser.githubUsername}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE DETAILS (EDITABLE) */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Edit Profile Details</h3>
                  <p className="text-xs opacity-70">
                    Update your account display information and academic affiliations.
                  </p>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    <Edit3 size={13} />
                    <span>Edit Info</span>
                  </button>
                )}
              </div>

              <div
                className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 space-y-3 text-xs"
                style={{ borderColor: currentTheme.ui.sideBarBorder }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold opacity-75 block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-black/10 dark:bg-white/10 outline-none disabled:opacity-60"
                      style={{ borderColor: currentTheme.ui.sideBarBorder }}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold opacity-75 block mb-1">
                      Primary Role
                    </label>
                    <select
                      disabled={!isEditing}
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border bg-black/10 dark:bg-white/10 outline-none disabled:opacity-60"
                      style={{ borderColor: currentTheme.ui.sideBarBorder }}
                    >
                      <option value="Student">Student</option>
                      <option value="Software Engineer">Software Engineer</option>
                      <option value="Researcher">Researcher</option>
                      <option value="Instructor">Instructor</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold opacity-75 block mb-1">
                      University Affiliation
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={editUniv}
                      onChange={(e) => setEditUniv(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-black/10 dark:bg-white/10 outline-none disabled:opacity-60"
                      style={{ borderColor: currentTheme.ui.sideBarBorder }}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold opacity-75 block mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-black/10 dark:bg-white/10 outline-none disabled:opacity-60"
                      style={{ borderColor: currentTheme.ui.sideBarBorder }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold opacity-75 block mb-1">
                    Bio / Summary
                  </label>
                  <textarea
                    rows={3}
                    disabled={!isEditing}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-black/10 dark:bg-white/10 outline-none disabled:opacity-60 leading-relaxed"
                    style={{ borderColor: currentTheme.ui.sideBarBorder }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold opacity-75 block mb-1">
                    GitHub Handle
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={editGh}
                    onChange={(e) => setEditGh(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-black/10 dark:bg-white/10 outline-none disabled:opacity-60 font-mono"
                    style={{ borderColor: currentTheme.ui.sideBarBorder }}
                  />
                </div>

                {isEditing && (
                  <div className="flex items-center gap-2 justify-end pt-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-md"
                    >
                      <Save size={14} />
                      <span>Save Changes</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CONNECTED SERVICES */}
          {activeTab === 'connected' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Connected Cloud Accounts</h3>
                <p className="text-xs opacity-70">
                  Manage OAuth credentials and linked developer identities.
                </p>
              </div>

              {/* Google Integration */}
              <div
                className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 flex items-center justify-between gap-3 text-xs"
                style={{ borderColor: currentTheme.ui.sideBarBorder }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-white flex items-center gap-1.5">
                      <span>Google Account</span>
                      {currentUser.provider === 'google' && (
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                          Primary Auth
                        </span>
                      )}
                    </h4>
                    <p className="opacity-75">{currentUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Connected
                  </span>
                  <button
                    onClick={async () => {
                      try {
                        await googleSignIn();
                      } catch {
                        // ignore popup close
                      }
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 font-semibold flex items-center gap-1 transition-colors"
                    title="Switch Google Account"
                  >
                    <RefreshCw size={11} /> Switch
                  </button>
                </div>
              </div>

              {/* GitHub Integration */}
              <div
                className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 space-y-3 text-xs"
                style={{ borderColor: currentTheme.ui.sideBarBorder }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <Github size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white flex items-center gap-1.5">
                        <span>GitHub Integration</span>
                        {gitHubState.isConnected && (
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                            Connected
                          </span>
                        )}
                      </h4>
                      <p className="opacity-75">
                        {gitHubState.isConnected && gitHubState.user?.login
                          ? `@${gitHubState.user.login}`
                          : currentUser?.githubUsername
                          ? `@${currentUser.githubUsername}`
                          : 'No GitHub username linked'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 ${gitHubState.isConnected ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-purple-500/15 text-purple-400 border-purple-500/30'}`}>
                      <CheckCircle2 size={12} /> {gitHubState.isConnected ? 'Sync Active' : 'Sync Ready'}
                    </span>
                    <button
                      onClick={() => setIsEditingGitHub(!isEditingGitHub)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 font-semibold flex items-center gap-1 transition-colors"
                      title="Change or Link GitHub Account"
                    >
                      <RefreshCw size={11} /> {isEditingGitHub ? 'Close' : 'Change'}
                    </button>
                  </div>
                </div>

                {isEditingGitHub && (
                  <div className="pt-3 border-t space-y-3" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
                    <div>
                      <label className="block text-[11px] font-semibold opacity-80 mb-1">GitHub Username / ID</label>
                      <input
                        type="text"
                        value={dashGhId}
                        onChange={(e) => setDashGhId(e.target.value)}
                        placeholder="e.g. username"
                        className="w-full px-3 py-1.5 rounded-lg border bg-black/10 dark:bg-white/5 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                        style={{ borderColor: currentTheme.ui.sideBarBorder }}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-semibold opacity-80">Personal Access Token (PAT)</label>
                        <a
                          href="https://github.com/settings/tokens/new?scopes=repo,user"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5"
                        >
                          Generate Token <ExternalLink size={10} />
                        </a>
                      </div>
                      <input
                        type="password"
                        value={dashGhToken}
                        onChange={(e) => setDashGhToken(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxx"
                        className="w-full px-3 py-1.5 rounded-lg border bg-black/10 dark:bg-white/5 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono text-[11px]"
                        style={{ borderColor: currentTheme.ui.sideBarBorder }}
                      />
                    </div>

                    {dashGhMsg && (
                      <div className={`p-2 rounded text-[11px] ${dashGhMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {dashGhMsg.text}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={async () => {
                          if (!dashGhToken.trim()) {
                            setDashGhMsg({ type: 'error', text: 'Please enter a Personal Access Token.' });
                            return;
                          }
                          if (dashGhId.trim()) {
                            localStorage.setItem('compillo_github_id', dashGhId.trim());
                          }
                          const success = await githubSyncService.loginWithToken(dashGhToken.trim());
                          if (success) {
                            setDashGhMsg({ type: 'success', text: 'Successfully linked GitHub account!' });
                            setTimeout(() => setIsEditingGitHub(false), 1200);
                          } else {
                            setDashGhMsg({ type: 'error', text: 'Token verification failed.' });
                          }
                        }}
                        className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <CheckCircle2 size={13} /> Save & Verify Token
                      </button>
                      {gitHubState.isConnected && (
                        <button
                          onClick={() => {
                            githubSyncService.disconnect();
                            setDashGhMsg({ type: 'success', text: 'Disconnected GitHub account.' });
                          }}
                          className="py-2 px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-semibold transition-colors"
                        >
                          Disconnect
                        </button>
                      )}
                    </div>

                    <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                      <span className="text-[11px] font-medium opacity-75">Or authenticate securely via OAuth:</span>
                      <button
                        onClick={async () => {
                          setDashGhMsg(null);
                          await githubSyncService.initiateOAuthPopup();
                        }}
                        className="w-full py-2 rounded-lg bg-[#24292f] hover:bg-[#1a1f24] text-white border border-white/20 font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm text-xs"
                      >
                        <Github size={14} /> Sign in with GitHub (OAuth)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & SESSIONS */}
          {activeTab === 'security' && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-sm font-bold text-white">Security & Active Sessions</h3>
                <p className="opacity-70">
                  Manage active browser tokens, encryption keys, and account sign out.
                </p>
              </div>

              <div
                className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 space-y-3"
                style={{ borderColor: currentTheme.ui.sideBarBorder }}
              >
                <div className="flex justify-between items-center">
                  <span className="opacity-75 font-semibold">User ID:</span>
                  <span className="font-mono text-gray-300">{currentUser.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-75 font-semibold">Authentication Provider:</span>
                  <span className="uppercase font-bold text-sky-400">{currentUser.provider}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-75 font-semibold">Last Login:</span>
                  <span className="text-gray-300">
                    {new Date(currentUser.lastLoginAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-75 font-semibold">Encrypted Storage:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck size={13} /> Active & Secured
                  </span>
                </div>
              </div>

              {/* Dangerous actions */}
              <div
                className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3"
              >
                <div className="font-bold text-rose-400">Account Session Actions</div>
                <p className="opacity-80 leading-relaxed text-[11px]">
                  Sign out of this browser session or switch to another developer profile. Your local
                  files and earned badges will remain saved on this device.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSignIn?.();
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 font-bold"
                  >
                    Switch Account
                  </button>

                  <button
                    onClick={handleSignOutClick}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 shadow-md"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t shrink-0 select-none bg-black/5 dark:bg-white/5 text-xs"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <div className="opacity-60 flex items-center gap-1 text-[11px]">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Compillo Developer Cloud • All user details securely saved</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-1.5 text-xs font-bold rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 transition-colors"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
