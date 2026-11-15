import React, { useState, useEffect } from 'react';
import { EditorSettings } from '../../types';
import { THEMES, VSCodeThemeDefinition } from '../../services/themes';
import {
  RotateCcw,
  Palette,
  Github,
  Key,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Cloud,
  LogOut,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { githubSyncService, GitHubSyncState } from '../../services/githubService';

interface SettingsViewProps {
  currentTheme: VSCodeThemeDefinition;
  settings: EditorSettings;
  onUpdateSettings: (newSettings: Partial<EditorSettings>) => void;
  onResetWorkspace: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentTheme,
  settings,
  onUpdateSettings,
  onResetWorkspace,
}) => {
  const isLight = currentTheme.type === 'light';
  const isCyberpunk = currentTheme.id === 'cyberpunk';

  // GitHub OAuth settings state
  const [githubClientId, setGithubClientId] = useState('');
  const [githubClientSecret, setGithubClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState('');
  const [isOAuthConfigured, setIsOAuthConfigured] = useState(false);
  const [isSavingOAuth, setIsSavingOAuth] = useState(false);
  const [oauthStatusMsg, setOauthStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [githubState, setGithubState] = useState<GitHubSyncState>(() => githubSyncService.getState());

  useEffect(() => {
    // Load initial OAuth config
    githubSyncService.getOAuthConfig().then((cfg) => {
      if (cfg.clientId) setGithubClientId(cfg.clientId);
      setIsOAuthConfigured(cfg.configured);
      setCallbackUrl(cfg.callbackUrl || `${window.location.origin}/api/auth/github/callback`);
    });

    return githubSyncService.subscribe((st) => {
      setGithubState(st);
      if (st.callbackUrl) setCallbackUrl(st.callbackUrl);
      setIsOAuthConfigured(st.oauthConfigured);
    });
  }, []);

  const handleSaveOAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubClientId.trim() || !githubClientSecret.trim()) {
      setOauthStatusMsg({
        type: 'error',
        text: 'Both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required.',
      });
      return;
    }

    setIsSavingOAuth(true);
    setOauthStatusMsg(null);
    const res = await githubSyncService.saveOAuthConfig(githubClientId, githubClientSecret);
    setIsSavingOAuth(false);

    if (res.success) {
      setIsOAuthConfigured(true);
      setGithubClientSecret('');
      setOauthStatusMsg({
        type: 'success',
        text: 'GitHub OAuth credentials saved! Users can now join using OAuth.',
      });
      setTimeout(() => setOauthStatusMsg(null), 5000);
    } else {
      setOauthStatusMsg({
        type: 'error',
        text: res.error || 'Failed to save OAuth credentials.',
      });
    }
  };

  const handleClearOAuth = async () => {
    if (confirm('Clear saved GitHub OAuth App credentials?')) {
      await githubSyncService.clearOAuthConfig();
      setGithubClientId('');
      setGithubClientSecret('');
      setIsOAuthConfigured(false);
      setOauthStatusMsg({
        type: 'success',
        text: 'OAuth configuration cleared.',
      });
      setTimeout(() => setOauthStatusMsg(null), 3000);
    }
  };

  const handleCopyCallback = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  const headingColor = isLight ? 'text-gray-950 font-bold' : isCyberpunk ? 'text-[#fcee0a] font-bold' : 'text-white font-semibold';
  const labelColor = isLight ? 'text-gray-900 font-semibold' : isCyberpunk ? 'text-[#fcee0a]' : 'text-white font-medium';
  const mutedColor = isLight ? 'text-gray-600' : 'text-[#888888]';
  const borderColor = currentTheme.ui.sideBarBorder;
  const inputBg = isLight
    ? 'bg-white border-gray-300 text-gray-900 focus:border-[#005fb8]'
    : isCyberpunk
    ? 'bg-[#180f33] border-[#00f0ff] text-[#fcee0a] focus:border-[#fcee0a]'
    : 'bg-[#222222] border-[#3c3c3c] text-white focus:border-[#007acc]';

  return (
    <div className="flex flex-col h-full select-none text-[12px] overflow-y-auto p-4 space-y-6">
      <div>
        <h2 className={`text-sm mb-1 ${headingColor}`}>Editor Settings</h2>
        <p className={`text-[11px] ${mutedColor}`}>
          Configure editor preferences, themes, and formatting.
        </p>
      </div>

      {/* Theme Selector */}
      <div className="space-y-2">
        <label className={`text-[12px] block flex items-center gap-1.5 ${labelColor}`}>
          <Palette size={14} className={isLight ? 'text-[#005fb8]' : isCyberpunk ? 'text-[#00f0ff]' : 'text-[#007acc]'} />
          <span>Color Theme</span>
        </label>
        <select
          value={settings.theme}
          onChange={(e) => onUpdateSettings({ theme: e.target.value })}
          className={`w-full border rounded p-2 text-[12px] outline-none transition-colors ${inputBg}`}
        >
          {Object.values(THEMES).map((th) => {
            const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(th.label);
            const badge = hasEmoji
              ? ''
              : th.id === 'cyberpunk'
              ? ' ⚡ (Neon)'
              : th.type === 'light'
              ? ' ☀️'
              : ' 🌙';
            return (
              <option key={th.id} value={th.id}>
                {th.label}
                {badge}
              </option>
            );
          })}
        </select>

        {/* Theme quick switcher cards */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {Object.values(THEMES).map((th) => {
            const isSelected = settings.theme === th.id;
            return (
              <button
                key={th.id}
                type="button"
                onClick={() => onUpdateSettings({ theme: th.id })}
                className={`flex items-center gap-2 p-2 rounded border text-left text-[11px] transition-all ${
                  isSelected
                    ? 'shadow-sm font-bold ring-2'
                    : isLight
                    ? 'border-gray-200 bg-black/[0.02] text-gray-700 hover:border-gray-400'
                    : 'border-white/10 bg-white/5 text-[#cccccc] hover:border-white/20'
                }`}
                style={
                  isSelected
                    ? {
                        borderColor: th.ui.accent,
                        backgroundColor: th.ui.tabActiveBg,
                        color: th.ui.sideBarFg,
                        // @ts-ignore
                        '--tw-ring-color': th.ui.accent,
                      }
                    : undefined
                }
              >
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20 shadow-sm"
                  style={{ backgroundColor: th.ui.accent }}
                />
                <span className="truncate">{th.label}</span>
              </button>
            );
          })}
        </div>
        <span className={`text-[11px] ${mutedColor}`}>
          Select from Signature Dark, Sakura Blossom, Fairy Lavender, Royal Noir Champagne Gold, and more.
        </span>
      </div>

      {/* Font Size */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className={`text-[12px] ${labelColor}`}>Editor: Font Size</label>
          <span className={`font-mono font-bold text-[12px] ${isLight ? 'text-[#005fb8]' : isCyberpunk ? 'text-[#00f0ff]' : 'text-[#007acc]'}`}>
            {settings.fontSize}px
          </span>
        </div>
        <input
          type="range"
          min="11"
          max="24"
          step="1"
          value={settings.fontSize}
          onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value, 10) })}
          className={`w-full ${isLight ? 'accent-[#005fb8]' : isCyberpunk ? 'accent-[#fcee0a]' : 'accent-[#007acc]'}`}
        />
        <span className={`text-[11px] ${mutedColor}`}>
          Controls the font size in pixels for the editor buffer.
        </span>
      </div>

      {/* Tab Size */}
      <div className="space-y-1.5">
        <label className={`text-[12px] block ${labelColor}`}>Editor: Tab Size</label>
        <div className="flex items-center gap-2">
          {[2, 4].map((size) => (
            <button
              key={size}
              onClick={() => onUpdateSettings({ tabSize: size })}
              className={`flex-1 py-1.5 rounded border text-[12px] transition-colors ${
                settings.tabSize === size
                  ? isLight
                    ? 'bg-[#005fb8] border-[#005fb8] text-white font-bold'
                    : isCyberpunk
                    ? 'bg-[#fcee0a] border-[#fcee0a] text-black font-bold'
                    : 'bg-[#007acc] border-[#007acc] text-white font-bold'
                  : isLight
                  ? 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                  : isCyberpunk
                  ? 'bg-[#1e1438] border-[#00f0ff]/40 text-[#fcee0a] hover:border-[#00f0ff]'
                  : 'bg-[#222222] border-[#3c3c3c] text-[#cccccc] hover:border-[#666666]'
              }`}
            >
              {size} Spaces
            </button>
          ))}
        </div>
      </div>

      {/* Word Wrap */}
      <div className="space-y-1.5">
        <label className={`text-[12px] block ${labelColor}`}>Editor: Word Wrap</label>
        <div className="flex items-center gap-2">
          {(['on', 'off'] as const).map((wrap) => (
            <button
              key={wrap}
              onClick={() => onUpdateSettings({ wordWrap: wrap })}
              className={`flex-1 py-1.5 rounded border text-[12px] uppercase font-bold transition-colors ${
                settings.wordWrap === wrap
                  ? isLight
                    ? 'bg-[#005fb8] border-[#005fb8] text-white'
                    : isCyberpunk
                    ? 'bg-[#fcee0a] border-[#fcee0a] text-black'
                    : 'bg-[#007acc] border-[#007acc] text-white'
                  : isLight
                  ? 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                  : isCyberpunk
                  ? 'bg-[#1e1438] border-[#00f0ff]/40 text-[#fcee0a] hover:border-[#00f0ff]'
                  : 'bg-[#222222] border-[#3c3c3c] text-[#cccccc] hover:border-[#666666]'
              }`}
            >
              {wrap}
            </button>
          ))}
        </div>
      </div>

      {/* Minimap Toggle */}
      <div className="flex items-center justify-between py-1 border-t pt-3" style={{ borderColor }}>
        <div>
          <div className={`text-[12px] ${labelColor}`}>Editor: Minimap</div>
          <div className={`text-[11px] ${mutedColor}`}>
            Controls whether the code minimap is shown on the right side.
          </div>
        </div>
        <input
          type="checkbox"
          checked={settings.minimap}
          onChange={(e) => onUpdateSettings({ minimap: e.target.checked })}
          className={`w-4 h-4 cursor-pointer ${isLight ? 'accent-[#005fb8]' : isCyberpunk ? 'accent-[#fcee0a]' : 'accent-[#007acc]'}`}
        />
      </div>

      {/* Line Numbers */}
      <div className="space-y-1.5 border-t pt-3" style={{ borderColor }}>
        <label className={`text-[12px] block ${labelColor}`}>Editor: Line Numbers</label>
        <select
          value={settings.lineNumbers}
          onChange={(e) =>
            onUpdateSettings({ lineNumbers: e.target.value as 'on' | 'off' | 'relative' })
          }
          className={`w-full border rounded p-1.5 text-[12px] outline-none ${inputBg}`}
        >
          <option value="on">On (Sequential)</option>
          <option value="relative">Relative</option>
          <option value="off">Off</option>
        </select>
      </div>

      {/* Format On Save */}
      <div className="flex items-center justify-between py-1 border-t pt-3" style={{ borderColor }}>
        <div>
          <div className={`text-[12px] ${labelColor}`}>Editor: Format On Save</div>
          <div className={`text-[11px] ${mutedColor}`}>
            Format file automatically whenever saved.
          </div>
        </div>
        <input
          type="checkbox"
          checked={settings.formatOnSave}
          onChange={(e) => onUpdateSettings({ formatOnSave: e.target.checked })}
          className={`w-4 h-4 cursor-pointer ${isLight ? 'accent-[#005fb8]' : isCyberpunk ? 'accent-[#fcee0a]' : 'accent-[#007acc]'}`}
        />
      </div>

      {/* Auto Save */}
      <div className="flex items-center justify-between py-1 border-t pt-3" style={{ borderColor }}>
        <div>
          <div className={`text-[12px] ${labelColor}`}>Files: Auto Save</div>
          <div className={`text-[11px] ${mutedColor}`}>
            Automatically saves dirty files after a brief delay.
          </div>
        </div>
        <input
          type="checkbox"
          checked={settings.autoSave}
          onChange={(e) => onUpdateSettings({ autoSave: e.target.checked })}
          className={`w-4 h-4 cursor-pointer ${isLight ? 'accent-[#005fb8]' : isCyberpunk ? 'accent-[#fcee0a]' : 'accent-[#007acc]'}`}
        />
      </div>

      {/* GitHub OAuth & Cloud Integration Section */}
      <div className="border-t pt-4 space-y-3" style={{ borderColor }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-[12.5px]">
            <Github size={15} className="text-white" />
            <span className={headingColor}>GitHub OAuth & Cloud Integration</span>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isOAuthConfigured
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
            }`}
          >
            {isOAuthConfigured ? 'OAuth Configured' : 'Needs Setup'}
          </span>
        </div>

        <p className={`text-[11px] ${mutedColor} leading-relaxed`}>
          Configure your GitHub OAuth App credentials here. When hosted, users can authenticate via 1-click GitHub OAuth, sync repositories, and save their programs on the cloud.
        </p>

        {/* Status banner */}
        {oauthStatusMsg && (
          <div
            className={`p-2.5 rounded text-[11.5px] flex items-start gap-1.5 ${
              oauthStatusMsg.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            {oauthStatusMsg.type === 'success' ? (
              <CheckCircle2 size={13} className="shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle size={13} className="shrink-0 text-rose-400 mt-0.5" />
            )}
            <span className="leading-tight">{oauthStatusMsg.text}</span>
          </div>
        )}

        {/* Connected Account Card if signed in */}
        {githubState.isConnected && githubState.user && (
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              {githubState.user.avatar_url ? (
                <img
                  src={githubState.user.avatar_url}
                  alt={githubState.user.login}
                  className="w-6 h-6 rounded-full border border-emerald-400/40"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-500/30 flex items-center justify-center text-[10px] text-emerald-300 font-bold">
                  {githubState.user.login[0]?.toUpperCase()}
                </div>
              )}
              <div className="truncate">
                <div className="text-white font-medium text-[11.5px] truncate">
                  {githubState.user.name || githubState.user.login}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono truncate">
                  @{githubState.user.login} (Details Saved)
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => githubSyncService.disconnect()}
              title="Disconnect GitHub Session"
              className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-rose-400 transition-colors"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}

        {/* OAuth Credentials Form */}
        <form onSubmit={handleSaveOAuth} className="space-y-2.5">
          {/* Client ID */}
          <div className="space-y-1">
            <label className={`text-[11.5px] block font-medium ${labelColor}`}>
              GITHUB_CLIENT_ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={githubClientId}
                onChange={(e) => setGithubClientId(e.target.value)}
                placeholder="Ov23li..."
                className={`w-full border rounded p-2 text-[11.5px] font-mono outline-none ${inputBg}`}
              />
            </div>
          </div>

          {/* Client Secret */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className={`text-[11.5px] block font-medium ${labelColor}`}>
                GITHUB_CLIENT_SECRET
              </label>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-[10.5px] text-sky-400 hover:underline flex items-center gap-1"
              >
                {showSecret ? <EyeOff size={11} /> : <Eye size={11} />}
                <span>{showSecret ? 'Hide' : 'Reveal'}</span>
              </button>
            </div>
            <input
              type={showSecret ? 'text' : 'password'}
              value={githubClientSecret}
              onChange={(e) => setGithubClientSecret(e.target.value)}
              placeholder={isOAuthConfigured ? '••••••••••••••••••••••••••••••••' : 'Enter client secret...'}
              className={`w-full border rounded p-2 text-[11.5px] font-mono outline-none ${inputBg}`}
            />
          </div>

          {/* Callback URL helper with copy */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className={labelColor}>OAuth Authorization Callback URL</span>
              <button
                type="button"
                onClick={handleCopyCallback}
                className="text-sky-400 hover:underline flex items-center gap-1"
              >
                {copiedCallback ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                <span>{copiedCallback ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-1.5 rounded bg-black/40 border border-white/10 font-mono text-[10px] text-emerald-400 break-all select-all">
              {callbackUrl || `${window.location.origin}/api/auth/github/callback`}
            </div>
            <a
              href="https://github.com/settings/developers"
              target="_blank"
              rel="noreferrer"
              className="text-[10.5px] text-sky-400 hover:underline flex items-center gap-1 pt-0.5"
            >
              <span>Create or configure GitHub OAuth App</span>
              <ExternalLink size={10} />
            </a>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isSavingOAuth}
              className="flex-1 py-1.5 px-3 bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-40 text-white rounded text-[11.5px] font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Check size={13} />
              <span>{isSavingOAuth ? 'Saving...' : 'Save OAuth Settings'}</span>
            </button>

            {isOAuthConfigured && (
              <button
                type="button"
                onClick={handleClearOAuth}
                className="py-1.5 px-2.5 bg-rose-900/20 hover:bg-rose-900/40 border border-rose-500/30 text-rose-300 rounded text-[11px] transition-colors"
                title="Clear saved OAuth App credentials"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Cloud Storage Notice */}
        <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 space-y-1 text-[11px]">
          <div className="flex items-center gap-1.5 font-semibold">
            <Cloud size={13} className="text-sky-400" />
            <span>Cloud Programs & Storage</span>
          </div>
          <p className="opacity-85 leading-normal">
            Your GitHub details and workspace state are saved. In upcoming releases, you will be able to save and open programs directly from cloud storage.
          </p>
        </div>
      </div>

      {/* IDE Master Control Panel & Engagement Timers */}
      <div className="space-y-2 border-t pt-4" style={{ borderColor }}>
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-purple-400" />
          <h3 className="font-semibold text-[13px]">Master Control Panel</h3>
        </div>
        <p className="text-[11px] opacity-75 leading-relaxed">
          Configure IDE engagement requirements (default: 60 minutes) and arcade game session playtime (default: 5 minutes), or enable instant testing overrides.
        </p>
        <button
          onClick={() => {
            // Select master-panel view if available via custom event or view switcher
            window.dispatchEvent(new CustomEvent('compillo:open-master-panel'));
          }}
          className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 rounded text-[12px] font-medium transition-colors"
        >
          <ShieldCheck size={14} />
          <span>Open Master Control Panel</span>
        </button>
      </div>

      {/* Reset Section */}
      <div className="border-t pt-4" style={{ borderColor }}>
        <button
          onClick={() => {
            if (confirm('Reset entire workspace files to starter kit?')) {
              onResetWorkspace();
            }
          }}
          className="w-full flex items-center justify-center gap-2 py-2 bg-red-900/20 border border-red-500/30 hover:bg-red-900/40 text-red-500 rounded text-[12px] font-medium transition-colors"
        >
          <RotateCcw size={14} />
          <span>Reset Workspace to Defaults</span>
        </button>
      </div>
    </div>
  );
};
