import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Database,
  RefreshCw,
  Github,
  Key,
  ExternalLink,
  Copy,
  Check,
  Settings,
  AlertCircle,
} from 'lucide-react';
import { CompilloThemeDefinition } from '../../services/themes';
import { authService, UserProfile } from '../../services/authService';
import { googleSignIn } from '../../services/googleAuth';
import { gameSound } from '../../services/gameSoundService';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: CompilloThemeDefinition;
  onSuccess?: (user: UserProfile) => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'google' | 'github' | 'email'>('google');

  // Google inputs
  const [googleEmail, setGoogleEmail] = useState('k@lavania.in');
  const [googleName, setGoogleName] = useState('K. Lavania');
  const [googleUniv, setGoogleUniv] = useState('Rajasthan Technical University (RTU)');
  const [googleOauthConfigured, setGoogleOauthConfigured] = useState(false);
  const [showGoogleConfig, setShowGoogleConfig] = useState(false);
  const [googleClientIdInput, setGoogleClientIdInput] = useState('');
  const [googleClientSecretInput, setGoogleClientSecretInput] = useState('');

  // GitHub inputs
  const [ghUsername, setGhUsername] = useState('klavania');
  const [ghToken, setGhToken] = useState('');
  const [githubMode, setGithubMode] = useState<'username' | 'token' | 'oauth'>('username');
  const [githubOauthConfigured, setGithubOauthConfigured] = useState(false);
  const [showGithubConfig, setShowGithubConfig] = useState(false);
  const [ghClientIdInput, setGhClientIdInput] = useState('');
  const [ghClientSecretInput, setGhClientSecretInput] = useState('');

  // Email inputs
  const [emailAddr, setEmailAddr] = useState('');
  const [fullName, setFullName] = useState('');

  // Status & loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCallback, setCopiedCallback] = useState<string | null>(null);

  // Check OAuth status on open
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/auth/google/status')
      .then((r) => r.json())
      .then((data) => {
        setGoogleOauthConfigured(Boolean(data.configured));
      })
      .catch(() => setGoogleOauthConfigured(false));

    fetch('/api/github/status')
      .then((r) => r.json())
      .then((data) => {
        setGithubOauthConfigured(Boolean(data.configured));
      })
      .catch(() => setGithubOauthConfigured(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCallback(label);
    setTimeout(() => setCopiedCallback(null), 2000);
  };

  // Google Sign-In Handlers
  const handleGoogleOAuthPopup = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      gameSound.playLevelClear();
      onSuccess?.(result.userProfile);
      onClose();
    } catch (err: any) {
      console.warn('Google OAuth popup error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Google Sign-In popup was closed before completing.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMessage('Popup was blocked by your browser. Please allow popups for Compillo Studio.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // user clicked again
      } else {
        // Try fallback to server OAuth popup if Firebase SDK encountered specific origin issue
        try {
          const user = await authService.signInWithGoogleOAuthPopup();
          gameSound.playLevelClear();
          onSuccess?.(user);
          onClose();
          return;
        } catch (fallbackErr: any) {
          setErrorMessage(err.message || fallbackErr.message || 'Google OAuth failed');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleDirectSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const email = googleEmail.trim() || 'k@lavania.in';
      const name = googleName.trim() || 'K. Lavania';
      const user = await authService.signInWithGoogle({
        email,
        name,
        university: googleUniv.trim() || 'Rajasthan Technical University (RTU)',
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
      });
      gameSound.playLevelClear();
      onSuccess?.(user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveGoogleConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleClientIdInput.trim()) return;
    try {
      const res = await fetch('/api/auth/google/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: googleClientIdInput.trim(),
          clientSecret: googleClientSecretInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGoogleOauthConfigured(true);
        setShowGoogleConfig(false);
        setErrorMessage(null);
      }
    } catch (err: any) {
      setErrorMessage('Failed to save Google credentials');
    }
  };

  // GitHub Sign-In Handlers
  const handleGithubOAuthPopup = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const user = await authService.signInWithGithubOAuthPopup();
      gameSound.playLevelClear();
      onSuccess?.(user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'GitHub OAuth failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGithubUsernameSignIn = async () => {
    if (!ghUsername.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const user = await authService.signInWithGithubUsername(ghUsername.trim());
      gameSound.playLevelClear();
      onSuccess?.(user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'GitHub lookup failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGithubTokenSignIn = async () => {
    if (!ghToken.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const user = await authService.signInWithGithubToken(ghToken.trim());
      gameSound.playLevelClear();
      onSuccess?.(user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'GitHub token verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveGithubConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghClientIdInput.trim() || !ghClientSecretInput.trim()) return;
    try {
      const res = await fetch('/api/github/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: ghClientIdInput.trim(),
          clientSecret: ghClientSecretInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGithubOauthConfigured(true);
        setShowGithubConfig(false);
        setErrorMessage(null);
      }
    } catch (err: any) {
      setErrorMessage('Failed to save GitHub credentials');
    }
  };

  // Email Sign-In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAddr.trim()) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const user = await authService.signInWithEmail(
        emailAddr.trim(),
        fullName.trim() || emailAddr.split('@')[0]
      );
      gameSound.playLevelClear();
      onSuccess?.(user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Email sign-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const registeredUsers = authService.getRegisteredUsers();
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const googleCallbackUrl = `${currentOrigin}/api/auth/google/callback`;
  const githubCallbackUrl = `${currentOrigin}/api/auth/github/callback`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]"
        style={{
          backgroundColor: currentTheme.ui.sideBarBg,
          borderColor: currentTheme.ui.sideBarBorder,
          color: currentTheme.ui.sideBarFg,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0 select-none"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Sign In to Compillo Studio</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
                  Cloud Profile
                </span>
              </h2>
              <p className="text-xs opacity-70">
                Log in to sync workspace, code with AI, and track lab badges
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

        {/* Tab selection: Google / GitHub / Email */}
        <div
          className="flex items-center border-b px-5 pt-3 gap-2 bg-black/5 dark:bg-white/5"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <button
            onClick={() => {
              setActiveTab('google');
              setErrorMessage(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'google'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            <span>Google</span>
            {googleOauthConfigured && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Google OAuth Active" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('github');
              setErrorMessage(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'github'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Github size={15} />
            <span>GitHub</span>
            {githubOauthConfigured && (
              <span className="w-2 h-2 rounded-full bg-purple-400" title="GitHub OAuth Active" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('email');
              setErrorMessage(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'email'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Mail size={15} />
            <span>Email</span>
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span className="flex-1">{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 hover:text-white"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: GOOGLE */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              {/* Official Google Sign-In & Join with Google Button */}
              <div className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 space-y-3" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Google OAuth 2.0 Enabled</span>
                  </span>
                  <button
                    onClick={() => setShowGoogleConfig(!showGoogleConfig)}
                    className="text-[11px] opacity-75 hover:opacity-100 flex items-center gap-1"
                  >
                    <Settings size={12} />
                    <span>OAuth Info</span>
                  </button>
                </div>

                {/* Official Material Design Button */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleGoogleOAuthPopup}
                  className="gsi-material-button shadow-md hover:shadow-lg active:scale-98 transition-all disabled:opacity-50"
                >
                  <div className="gsi-material-button-state"></div>
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">
                      {isSubmitting ? 'Connecting with Google...' : 'Sign in / Join with Google'}
                    </span>
                  </div>
                </button>

                <p className="text-[11px] opacity-60 text-center">
                  Use your Google Account to log in, create your Compillo Studio profile, and sync workspace.
                </p>
              </div>

              {/* Quick continue / 1-click alternative */}
              <div
                className="p-3.5 rounded-xl border bg-black/5 dark:bg-white/5 space-y-2.5"
                style={{ borderColor: currentTheme.ui.sideBarBorder }}
              >
                <div className="flex items-center gap-3">
                  <img
                    src="https://api.dicebear.com/7.x/bottts/svg?seed=k-lavania"
                    alt="K. Lavania avatar"
                    className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 p-1 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>K. Lavania</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 font-semibold">
                        Instant Continue
                      </span>
                    </h3>
                    <p className="text-[11px] opacity-75 truncate">k@lavania.in • RTU Scholar</p>
                  </div>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleGoogleDirectSignIn}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-sky-400 border border-sky-500/30 hover:border-sky-500/50 transition-all shrink-0"
                  >
                    Quick Log In
                  </button>
                </div>
              </div>

              {/* Custom Google account inputs */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 text-[11px] uppercase font-bold tracking-wider opacity-60">
                  <div className="flex-1 h-px bg-current opacity-20" />
                  <span>Or enter custom Google account</span>
                  <div className="flex-1 h-px bg-current opacity-20" />
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold opacity-75 block mb-1">
                      Google Email Address
                    </label>
                    <input
                      type="email"
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      placeholder="user@gmail.com"
                      className="w-full px-3 py-2 rounded-xl border bg-black/10 dark:bg-white/10 outline-none text-xs"
                      style={{ borderColor: currentTheme.ui.sideBarBorder }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold opacity-75 block mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={googleName}
                        onChange={(e) => setGoogleName(e.target.value)}
                        placeholder="Your Name"
                        className="w-full px-3 py-2 rounded-xl border bg-black/10 dark:bg-white/10 outline-none text-xs"
                        style={{ borderColor: currentTheme.ui.sideBarBorder }}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold opacity-75 block mb-1">
                        University
                      </label>
                      <input
                        type="text"
                        value={googleUniv}
                        onChange={(e) => setGoogleUniv(e.target.value)}
                        placeholder="RTU, AKTU, VTU..."
                        className="w-full px-3 py-2 rounded-xl border bg-black/10 dark:bg-white/10 outline-none text-xs"
                        style={{ borderColor: currentTheme.ui.sideBarBorder }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting || !googleEmail.trim()}
                    onClick={handleGoogleDirectSignIn}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                  >
                    <span>Sign In with this Google Account</span>
                  </button>
                </div>
              </div>

              {/* Accordion for Google OAuth credentials */}
              <div className="pt-2 border-t" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
                <button
                  type="button"
                  onClick={() => setShowGoogleConfig(!showGoogleConfig)}
                  className="w-full flex items-center justify-between text-[11px] font-semibold opacity-75 hover:opacity-100 py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Key size={12} className="text-amber-400" />
                    <span>Google Cloud OAuth App Settings</span>
                  </span>
                  <span className="text-[10px] text-sky-400 underline">
                    {showGoogleConfig ? 'Hide' : 'Configure'}
                  </span>
                </button>

                {showGoogleConfig && (
                  <form onSubmit={handleSaveGoogleConfig} className="mt-2.5 p-3 rounded-xl bg-black/10 dark:bg-white/5 border border-white/10 space-y-2.5 text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-semibold opacity-75">
                          Authorized Redirect URI:
                        </label>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(googleCallbackUrl, 'google-cb')}
                          className="text-[10px] text-sky-400 hover:underline flex items-center gap-1"
                        >
                          {copiedCallback === 'google-cb' ? <Check size={10} /> : <Copy size={10} />}
                          <span>{copiedCallback === 'google-cb' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="font-mono text-[10px] p-1.5 rounded bg-black/20 break-all select-all">
                        {googleCallbackUrl}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold opacity-75 block mb-1">
                        Google Client ID
                      </label>
                      <input
                        type="text"
                        value={googleClientIdInput}
                        onChange={(e) => setGoogleClientIdInput(e.target.value)}
                        placeholder="...apps.googleusercontent.com"
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-black/20 font-mono text-[11px] outline-none"
                        style={{ borderColor: currentTheme.ui.sideBarBorder }}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold opacity-75 block mb-1">
                        Google Client Secret
                      </label>
                      <input
                        type="password"
                        value={googleClientSecretInput}
                        onChange={(e) => setGoogleClientSecretInput(e.target.value)}
                        placeholder="Client Secret"
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-black/20 font-mono text-[11px] outline-none"
                        style={{ borderColor: currentTheme.ui.sideBarBorder }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!googleClientIdInput.trim()}
                      className="w-full py-1.5 rounded-lg font-bold text-[11px] bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50"
                    >
                      Save Google Credentials
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GITHUB */}
          {activeTab === 'github' && (
            <div className="space-y-4">
              {/* GitHub sub-tabs: Username / Token / OAuth */}
              <div
                className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/10 dark:bg-white/5 border text-[11px] font-semibold"
                style={{ borderColor: currentTheme.ui.sideBarBorder }}
              >
                <button
                  type="button"
                  onClick={() => setGithubMode('username')}
                  className={`py-1.5 rounded-lg transition-all ${
                    githubMode === 'username'
                      ? 'bg-purple-600 text-white shadow'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  GitHub Username
                </button>
                <button
                  type="button"
                  onClick={() => setGithubMode('token')}
                  className={`py-1.5 rounded-lg transition-all ${
                    githubMode === 'token'
                      ? 'bg-purple-600 text-white shadow'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  Access Token (PAT)
                </button>
                <button
                  type="button"
                  onClick={() => setGithubMode('oauth')}
                  className={`py-1.5 rounded-lg transition-all ${
                    githubMode === 'oauth'
                      ? 'bg-purple-600 text-white shadow'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  OAuth Popup
                </button>
              </div>

              {/* Mode 1: Instant Username Verification */}
              {githubMode === 'username' && (
                <div
                  className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 space-y-3"
                  style={{ borderColor: currentTheme.ui.sideBarBorder }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                      <Github size={22} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">Live GitHub Account Sync</h3>
                      <p className="text-[11px] opacity-75">
                        Fetches live profile, avatar, repos, and bio from GitHub
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold opacity-75 block mb-1">
                      GitHub Username or Handle
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="font-mono opacity-50 text-xs">@</span>
                      <input
                        type="text"
                        value={ghUsername}
                        onChange={(e) => setGhUsername(e.target.value)}
                        placeholder="e.g. klavania, torvalds, octocat"
                        className="flex-1 px-3 py-2 rounded-xl border bg-black/10 dark:bg-white/10 outline-none text-xs font-mono"
                        style={{ borderColor: currentTheme.ui.sideBarBorder }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting || !ghUsername.trim()}
                    onClick={handleGithubUsernameSignIn}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RefreshCw size={15} className="animate-spin text-white" />
                    ) : (
                      <Github size={16} />
                    )}
                    <span>Verify & Sign In as @{ghUsername || 'user'}</span>
                  </button>
                </div>
              )}

              {/* Mode 2: Personal Access Token */}
              {githubMode === 'token' && (
                <div
                  className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 space-y-3"
                  style={{ borderColor: currentTheme.ui.sideBarBorder }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                      <Key size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">Personal Access Token (PAT)</h3>
                      <p className="text-[11px] opacity-75">
                        Enables seamless commit, push, branch, and PR sync
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold opacity-75 block mb-1">
                      GitHub Personal Access Token (classic or fine-grained)
                    </label>
                    <input
                      type="password"
                      value={ghToken}
                      onChange={(e) => setGhToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2 rounded-xl border bg-black/10 dark:bg-white/10 outline-none text-xs font-mono"
                      style={{ borderColor: currentTheme.ui.sideBarBorder }}
                    />
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-sky-400 hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      <span>Generate token on GitHub (repo, user:email scope)</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting || !ghToken.trim()}
                    onClick={handleGithubTokenSignIn}
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RefreshCw size={15} className="animate-spin text-white" />
                    ) : (
                      <Check size={15} />
                    )}
                    <span>Verify Token & Sign In</span>
                  </button>
                </div>
              )}

              {/* Mode 3: OAuth Popup */}
              {githubMode === 'oauth' && (
                <div
                  className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 space-y-3"
                  style={{ borderColor: currentTheme.ui.sideBarBorder }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Github size={16} />
                      <span>Official GitHub OAuth App</span>
                    </span>
                    {githubOauthConfigured && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                        Ready
                      </span>
                    )}
                  </div>

                  {githubOauthConfigured ? (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleGithubOAuthPopup}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-[#24292e] hover:bg-[#2f363d] text-white flex items-center justify-center gap-2.5 shadow-md border border-white/10 transition-all hover:scale-[1.01] disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <RefreshCw size={15} className="animate-spin text-white" />
                      ) : (
                        <Github size={16} />
                      )}
                      <span>Authorize with GitHub (Popup Flow)</span>
                      <ArrowRight size={14} className="opacity-60 ml-auto" />
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs space-y-2">
                      <p className="leading-relaxed">
                        GitHub OAuth App credentials are not yet configured on this instance.
                        Use <strong>GitHub Username</strong> or <strong>Access Token</strong> above for instant sign-in, or configure your OAuth App below.
                      </p>
                    </div>
                  )}

                  {/* Accordion for GitHub OAuth Credentials */}
                  <div className="pt-2 border-t" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
                    <button
                      type="button"
                      onClick={() => setShowGithubConfig(!showGithubConfig)}
                      className="w-full flex items-center justify-between text-[11px] font-semibold opacity-75 hover:opacity-100 py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <Key size={12} className="text-purple-400" />
                        <span>Configure GitHub OAuth App</span>
                      </span>
                      <span className="text-[10px] text-purple-400 underline">
                        {showGithubConfig ? 'Hide' : 'Configure'}
                      </span>
                    </button>

                    {showGithubConfig && (
                      <form onSubmit={handleSaveGithubConfig} className="mt-2.5 p-3 rounded-xl bg-black/10 dark:bg-white/5 border border-white/10 space-y-2.5 text-xs">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-semibold opacity-75">
                              Authorization Callback URL:
                            </label>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(githubCallbackUrl, 'gh-cb')}
                              className="text-[10px] text-purple-400 hover:underline flex items-center gap-1"
                            >
                              {copiedCallback === 'gh-cb' ? <Check size={10} /> : <Copy size={10} />}
                              <span>{copiedCallback === 'gh-cb' ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <div className="font-mono text-[10px] p-1.5 rounded bg-black/20 break-all select-all">
                            {githubCallbackUrl}
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold opacity-75 block mb-1">
                            GitHub Client ID
                          </label>
                          <input
                            type="text"
                            value={ghClientIdInput}
                            onChange={(e) => setGhClientIdInput(e.target.value)}
                            placeholder="Iv1..."
                            className="w-full px-2.5 py-1.5 rounded-lg border bg-black/20 font-mono text-[11px] outline-none"
                            style={{ borderColor: currentTheme.ui.sideBarBorder }}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold opacity-75 block mb-1">
                            GitHub Client Secret
                          </label>
                          <input
                            type="password"
                            value={ghClientSecretInput}
                            onChange={(e) => setGhClientSecretInput(e.target.value)}
                            placeholder="Secret"
                            className="w-full px-2.5 py-1.5 rounded-lg border bg-black/20 font-mono text-[11px] outline-none"
                            style={{ borderColor: currentTheme.ui.sideBarBorder }}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={!ghClientIdInput.trim() || !ghClientSecretInput.trim()}
                          className="w-full py-1.5 rounded-lg font-bold text-[11px] bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                        >
                          Save GitHub Credentials
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EMAIL */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailSignIn} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold opacity-75 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={emailAddr}
                  onChange={(e) => setEmailAddr(e.target.value)}
                  placeholder="developer@example.com"
                  className="w-full px-3 py-2 rounded-xl border bg-black/10 dark:bg-white/10 outline-none text-xs"
                  style={{ borderColor: currentTheme.ui.sideBarBorder }}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold opacity-75 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full px-3 py-2 rounded-xl border bg-black/10 dark:bg-white/10 outline-none text-xs"
                  style={{ borderColor: currentTheme.ui.sideBarBorder }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !emailAddr.trim()}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                <Mail size={15} />
                <span>Continue with Email</span>
              </button>
            </form>
          )}

          {/* We Save Your Details Securely Banner */}
          <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/25 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <Database size={14} />
              <span>We Save Your Details Securely With Us</span>
            </div>
            <p className="text-[11px] opacity-80 leading-relaxed">
              When you sign in to Compillo Studio, your profile information, academic XP,
              university programming experiments, achievement badges, and workspace configuration are
              saved persistently with us so you can always log back in without losing state.
            </p>
          </div>

          {/* Previously Saved Profiles */}
          {registeredUsers.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                Previously Signed In Accounts
              </div>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {registeredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={async () => {
                      if (u.provider === 'github') {
                        await authService.signInWithGithub({
                          username: u.githubUsername,
                          email: u.email,
                          name: u.name,
                          avatarUrl: u.avatarUrl,
                        });
                      } else {
                        await authService.signInWithGoogle({
                          email: u.email,
                          name: u.name,
                          university: u.university,
                          avatarUrl: u.avatarUrl,
                        });
                      }
                      gameSound.playLevelClear();
                      onSuccess?.(u);
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-xs flex items-center justify-between transition-colors border border-transparent hover:border-white/10"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <img
                        src={u.avatarUrl}
                        alt=""
                        className="w-6 h-6 rounded-full bg-sky-500/20 object-cover border border-white/20"
                      />
                      <span className="font-semibold truncate">{u.name}</span>
                      <span className="opacity-60 text-[10px] truncate">({u.email})</span>
                    </div>
                    <span className="text-[10px] text-sky-400 font-bold ml-2 shrink-0">
                      Sign In &gt;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t shrink-0 select-none bg-black/5 dark:bg-white/5"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <div className="text-[11px] opacity-60 flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Encrypted Local & Cloud Sync</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
