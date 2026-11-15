import React, { useState, useRef, useEffect } from 'react';
import {
  Files,
  Search,
  GitBranch,
  Play,
  Puzzle,
  Settings,
  User,
  Sliders,
  Palette,
  Terminal,
  Sparkles,
  Globe,
  Activity,
  Check,
  Cloud,
  LogOut,
  ShieldCheck,
  Gamepad2,
  GraduationCap,
  LayoutDashboard,
  LogIn,
} from 'lucide-react';
import { ActiveSideBarView } from '../../types';
import { VSCodeThemeDefinition } from '../../services/themes';
import { engagementService } from '../../services/engagementService';
import { UserProfile } from '../../services/authService';

interface ActivityBarProps {
  currentTheme: VSCodeThemeDefinition;
  activeView: ActiveSideBarView | null;
  onSelectView: (view: ActiveSideBarView) => void;
  modifiedCount: number;
  pluginsCount: number;
  onOpenSettings: () => void;
  onOpenThemePicker: () => void;
  onToggleTerminal: () => void;
  onOpenEduLabs?: () => void;
  currentUser?: UserProfile | null;
  onOpenDashboard?: () => void;
  onOpenSignIn?: () => void;
  onSignOut?: () => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  currentTheme,
  activeView,
  onSelectView,
  modifiedCount,
  pluginsCount,
  onOpenSettings,
  onOpenThemePicker,
  onToggleTerminal,
  onOpenEduLabs,
  currentUser,
  onOpenDashboard,
  onOpenSignIn,
  onSignOut,
}) => {
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [engagement, setEngagement] = useState(() => engagementService.getState());
  const bottomBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return engagementService.subscribe((st) => setEngagement(st));
  }, []);

  const requiredSeconds = engagement.config.requiredEngagementMinutes * 60;
  const remainingMinutes = Math.max(
    0,
    Math.ceil((requiredSeconds - engagement.engagementSeconds) / 60)
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bottomBarRef.current && !bottomBarRef.current.contains(e.target as Node)) {
        setIsSettingsMenuOpen(false);
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const items: Array<{ id: ActiveSideBarView; label: string; icon: React.ReactNode; badge?: number | string }> = [
    {
      id: 'explorer',
      label: 'Explorer (Ctrl+Shift+E)',
      icon: <Files size={21} strokeWidth={1.6} />,
    },
    {
      id: 'edu',
      label: 'University Programming Labs (RTU, AKTU, VTU Labs)',
      icon: (
        <GraduationCap
          size={21}
          strokeWidth={1.6}
          className="text-amber-400 group-hover:scale-110 transition-transform"
        />
      ),
      badge: 'EDU',
    },
    {
      id: 'game',
      label: engagement.isGameUnlocked
        ? `Arcade Break (UNLOCKED • ${Math.ceil(engagement.gameSessionSecondsLeft / 60)}m session)`
        : `Arcade Break (Requires ${engagement.config.requiredEngagementMinutes}m IDE focus • ${remainingMinutes}m left)`,
      icon: (
        <Gamepad2
          size={21}
          strokeWidth={1.6}
          className={
            engagement.isGameUnlocked
              ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]'
              : 'text-amber-400'
          }
        />
      ),
      badge: engagement.isGameUnlocked ? 'PLAY' : `${remainingMinutes}m`,
    },
    {
      id: 'master-panel',
      label: 'Master Control Panel (Admin & Timer Policies)',
      icon: <ShieldCheck size={21} strokeWidth={1.6} className="text-purple-400" />,
      badge: 'ADMIN',
    },
    {
      id: 'ai-assistant',
      label: 'Compillo AI (ChatGPT, Gemini, Claude & Agent Studio) (Ctrl+Shift+A)',
      icon: <Sparkles size={21} strokeWidth={1.6} className="text-sky-400" />,
      badge: 'AI',
    },
    {
      id: 'rest-client',
      label: 'REST API Client (Integrated Testing)',
      icon: <Globe size={21} strokeWidth={1.6} className="text-emerald-400" />,
    },
    {
      id: 'code-radar',
      label: 'Code Radar (Quality & Health Metrics)',
      icon: <Activity size={21} strokeWidth={1.6} className="text-purple-400" />,
    },
    {
      id: 'search',
      label: 'Search (Ctrl+Shift+F)',
      icon: <Search size={21} strokeWidth={1.6} />,
    },
    {
      id: 'git',
      label: 'Source Control (Ctrl+Shift+G)',
      icon: <GitBranch size={21} strokeWidth={1.6} />,
      badge: modifiedCount > 0 ? modifiedCount : undefined,
    },
    {
      id: 'extensions',
      label: 'Extensions & Plugins (Ctrl+Shift+X)',
      icon: <Puzzle size={21} strokeWidth={1.6} />,
      badge: pluginsCount,
    },
    {
      id: 'settings',
      label: 'Settings & Workspace Preferences',
      icon: <Sliders size={21} strokeWidth={1.6} />,
    },
  ];

  return (
    <div
      id="compillo-activity-bar"
      className="hidden md:flex w-12 h-full flex-col justify-between items-center py-2 select-none shrink-0 border-r z-30"
      style={{
        backgroundColor: currentTheme.ui.activityBarBg,
        borderColor: currentTheme.ui.sideBarBorder,
      }}
    >
      {/* Top Icons */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col items-center w-full space-y-1.5 py-0.5">
        {items.map((item) => {
          const isActive = activeView === item.id;
          return (
            <div key={item.id} className="relative w-full flex justify-center group">
              {/* Active Left Indicator */}
              {isActive && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-[2px]"
                  style={{ backgroundColor: currentTheme.ui.activityBarActiveBorder }}
                />
              )}
              <button
                id={`activity-${item.id}-btn`}
                onClick={() => {
                  if (item.id === 'edu' && onOpenEduLabs) {
                    onOpenEduLabs();
                  }
                  onSelectView(item.id);
                }}
                title={item.label}
                className={`p-2.5 rounded-sm transition-colors relative flex items-center justify-center ${
                  isActive
                    ? currentTheme.type === 'light'
                      ? 'text-[#005fb8] opacity-100 font-semibold'
                      : currentTheme.id === 'cyberpunk'
                      ? 'text-[#fcee0a] opacity-100 drop-shadow-[0_0_8px_rgba(252,238,10,0.5)]'
                      : 'text-white opacity-100'
                    : currentTheme.type === 'light'
                    ? 'text-gray-600 hover:text-gray-950 opacity-90 hover:opacity-100 hover:bg-black/5'
                    : currentTheme.id === 'cyberpunk'
                    ? 'text-[#fcee0a]/60 hover:text-[#fcee0a] opacity-80 hover:opacity-100 hover:bg-white/5'
                    : 'text-[#858585] hover:text-[#d4d4d4] opacity-85 hover:opacity-100 hover:bg-white/5'
                }`}
              >
                {item.icon}
                {item.badge !== undefined && item.badge !== 0 && (
                  <span className={`absolute bottom-0.5 right-0.5 text-white text-[9px] font-bold rounded-full h-3.5 min-w-3.5 px-1 flex items-center justify-center border border-[#1e1e1e] ${
                    item.badge === 'AI' ? 'bg-gradient-to-r from-sky-500 to-indigo-600' : 'bg-[#007acc]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom Icons */}
      <div className="flex flex-col items-center w-full space-y-1 shrink-0 pt-1" ref={bottomBarRef}>
        <div className="relative w-full flex justify-center">
          <button
            id="activity-account-btn"
            title={currentUser ? `Account (${currentUser.name} - ${currentUser.email})` : 'Sign In to Compillo'}
            onClick={() => {
              setIsAccountMenuOpen(!isAccountMenuOpen);
              setIsSettingsMenuOpen(false);
            }}
            className={`p-2.5 rounded-sm transition-colors relative ${
              isAccountMenuOpen
                ? currentTheme.type === 'light'
                  ? 'text-[#005fb8] bg-black/5'
                  : 'text-white bg-white/10'
                : currentTheme.type === 'light'
                ? 'text-gray-600 hover:text-black hover:bg-black/5'
                : currentTheme.id === 'cyberpunk'
                ? 'text-[#fcee0a]/70 hover:text-[#fcee0a] hover:bg-white/5'
                : 'text-[#858585] hover:text-[#d4d4d4] hover:bg-white/5'
            }`}
          >
            {currentUser ? (
              <div className="relative">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-5 h-5 rounded-full object-cover border border-sky-400"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-black" />
              </div>
            ) : (
              <User size={20} strokeWidth={1.5} />
            )}
          </button>

          {/* Accounts Popup Menu */}
          {isAccountMenuOpen && (
            <div
              className="absolute left-12 bottom-0 mb-1 w-64 rounded-xl shadow-2xl py-1 z-50 text-[12px] border backdrop-blur-md"
              style={{
                backgroundColor: currentTheme.ui.sideBarBg,
                borderColor: currentTheme.ui.sideBarBorder,
                color: currentTheme.ui.sideBarFg,
              }}
            >
              {currentUser ? (
                <>
                  <div className="px-3 py-2.5 border-b" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
                    <div className="flex items-center gap-2.5">
                      <img
                        src={currentUser.avatarUrl}
                        alt=""
                        className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400 object-cover"
                      />
                      <div className="truncate">
                        <p className="font-bold truncate text-[12px] text-white">{currentUser.name}</p>
                        <p className="text-[10px] opacity-70 truncate font-mono">{currentUser.email}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-400 font-bold">
                            {currentUser.role}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                            {currentUser.provider.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        onOpenDashboard?.();
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-sky-500 hover:text-white flex items-center justify-between font-bold text-sky-400 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <LayoutDashboard size={14} /> User Dashboard (Profile & XP)
                      </span>
                      <span className="text-[10px] opacity-75">View &gt;</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        onOpenEduLabs?.();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <GraduationCap size={13} className="text-amber-400" /> University Labs & Badges
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Cloud size={13} className="text-sky-400" /> Settings Sync is On
                      </span>
                      <Check size={13} className="text-emerald-400" />
                    </button>

                    <button
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck size={13} /> Manage Trusted Accounts
                      </span>
                    </button>
                  </div>

                  <div className="my-1 border-t opacity-20" />

                  <button
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onSignOut?.();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-rose-500 hover:text-white text-rose-400 flex items-center gap-2 font-semibold transition-colors"
                  >
                    <LogOut size={13} /> Sign Out ({currentUser.name})
                  </button>
                </>
              ) : (
                <div className="p-3 space-y-2">
                  <div className="text-center py-2 space-y-1">
                    <div className="w-10 h-10 rounded-full mx-auto bg-sky-500/10 text-sky-400 flex items-center justify-center">
                      <User size={20} />
                    </div>
                    <h4 className="font-bold text-white text-xs">Not Signed In</h4>
                    <p className="text-[11px] opacity-70">
                      Sign in with Google or GitHub to save user details and sync progress.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onOpenSignIn?.();
                    }}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
                  >
                    <LogIn size={14} />
                    <span>Sign In to Compillo</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative w-full flex justify-center">
          <button
            id="activity-settings-btn"
            title="Manage"
            onClick={() => {
              setIsSettingsMenuOpen(!isSettingsMenuOpen);
              setIsAccountMenuOpen(false);
            }}
            className={`p-2.5 transition-colors rounded-sm ${
              isSettingsMenuOpen
                ? currentTheme.type === 'light'
                  ? 'text-[#005fb8] bg-black/5'
                  : currentTheme.id === 'cyberpunk'
                  ? 'text-[#fcee0a] bg-white/10'
                  : 'text-white bg-white/10'
                : currentTheme.type === 'light'
                ? 'text-gray-600 hover:text-black hover:bg-black/5'
                : currentTheme.id === 'cyberpunk'
                ? 'text-[#fcee0a]/70 hover:text-[#fcee0a] hover:bg-white/5'
                : 'text-[#858585] hover:text-[#d4d4d4] hover:bg-white/5'
            }`}
          >
            <Settings size={20} strokeWidth={1.5} />
          </button>

          {/* Manage Popup Menu */}
          {isSettingsMenuOpen && (
            <div
              className="absolute left-12 bottom-0 mb-1 w-52 rounded-md shadow-2xl py-1 z-50 text-[12px] border backdrop-blur-sm"
              style={{
                backgroundColor: currentTheme.ui.sideBarBg,
                borderColor: currentTheme.ui.sideBarBorder,
                color: currentTheme.ui.sideBarFg,
              }}
            >
              <button
                onClick={() => {
                  onOpenSettings();
                  setIsSettingsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Sliders size={13} /> Settings
                </span>
                <span className="text-[10px] opacity-60">Ctrl+,</span>
              </button>
              <button
                onClick={() => {
                  onOpenThemePicker();
                  setIsSettingsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Palette size={13} /> Color Theme
                </span>
                <span className="text-[10px] opacity-60">Ctrl+K Ctrl+T</span>
              </button>
              <button
                onClick={() => {
                  onToggleTerminal();
                  setIsSettingsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Terminal size={13} /> Toggle Terminal
                </span>
                <span className="text-[10px] opacity-60">Ctrl+`</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
