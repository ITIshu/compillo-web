import React, { useEffect, useState } from 'react';
import {
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  LogIn,
  Rocket,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { WebsiteThemeTokens } from './WebsitePageTheme';
import {
  deleteHostedAppRecord,
  HostedAppCategory,
  HostedAppDoc,
  saveHostedAppRecord,
  subscribeUserHostedApps,
  toggleHostedAppVisibility,
} from '../../../services/firestorePlatformService';
import { googleSignIn } from '../../../services/googleAuth';

interface HostedSitesPageProps {
  tokens: WebsiteThemeTokens;
  firebaseUser: User | null;
  onOpenGallery: () => void;
}

const CATEGORIES: HostedAppCategory[] = [
  'Web Apps',
  'Python Backends',
  'Calculators & Tools',
  'Student Labs',
];

export const HostedSitesPage: React.FC<HostedSitesPageProps> = ({
  tokens,
  firebaseUser,
  onOpenGallery,
}) => {
  const [slug, setSlug] = useState('my-site');
  const [title, setTitle] = useState('My Hosted Web App');
  const [description, setDescription] = useState('Deployed live on Compillo Cloud.');
  const [category, setCategory] = useState<HostedAppCategory>('Web Apps');
  const [isPublic, setIsPublic] = useState(true);
  const [files, setFiles] = useState<Array<{ path: string; content: string }>>([]);
  const [htmlDraft, setHtmlDraft] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [lastLiveUrl, setLastLiveUrl] = useState<string | null>(null);

  const [sites, setSites] = useState<HostedAppDoc[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [sitesError, setSitesError] = useState<string | null>(null);
  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!firebaseUser) {
      setSites([]);
      return;
    }
    setLoadingSites(true);
    setSitesError(null);
    const unsub = subscribeUserHostedApps(
      firebaseUser.uid,
      (list) => {
        setSites(list);
        setLoadingSites(false);
      },
      (err) => {
        setSitesError(err.message);
        setLoadingSites(false);
      }
    );
    return () => unsub();
  }, [firebaseUser]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setDeployError(null);
    const loaded: Array<{ path: string; content: string }> = [];
    for (const file of Array.from(fileList).slice(0, 50)) {
      if (file.size > 256 * 1024) {
        setDeployError(`"${file.name}" exceeds 256 KB limit.`);
        continue;
      }
      loaded.push({ path: file.name, content: await file.text() });
    }
    if (loaded.length > 0) {
      setFiles(loaded);
      const base = loaded[0].path
        .replace(/\.[^.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/^-+|-+$/g, '');
      if (base && base !== 'index' && slug === 'my-site') {
        setSlug(base.slice(0, 32));
        setTitle(loaded[0].path.replace(/\.[^.]+$/, ''));
      }
    }
    e.target.value = '';
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeployError(null);
    setDeployStatus(null);

    const cleanSlug =
      slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/^-+|-+$/g, '') || 'my-site';
    setSlug(cleanSlug);

    let payloadFiles = files;
    if (payloadFiles.length === 0 && htmlDraft.trim()) {
      payloadFiles = [{ path: 'index.html', content: htmlDraft }];
    }
    if (payloadFiles.length === 0) {
      setDeployError('Upload HTML/CSS/JS/Python files or paste HTML code before deploying.');
      return;
    }

    setIsDeploying(true);
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: cleanSlug, files: payloadFiles }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setDeployError(data?.error || 'Deployment failed.');
        setIsDeploying(false);
        return;
      }

      const mode =
        data.mode === 'custom-python'
          ? 'custom-python'
          : data.mode === 'calculator'
            ? 'calculator'
            : 'custom-static';

      if (firebaseUser) {
        await saveHostedAppRecord({
          slug: cleanSlug,
          title: title || cleanSlug,
          description,
          category,
          mode,
          entryFile: data.entryFile || 'index.html',
          files: payloadFiles,
          isPublic,
        });
        setDeployStatus('Deployed live and saved permanently in Firestore.');
      } else {
        setDeployStatus('Deployed to live server route (Sign in with Google to persist in Firestore).');
      }

      const liveUrl = `${window.location.origin}${data.livePath || `/hosted/${cleanSlug}/`}`;
      setLastLiveUrl(liveUrl);
    } catch (err: any) {
      setDeployError(err?.message || 'Unable to deploy site.');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDelete = async (targetSlug: string) => {
    setSitesError(null);
    try {
      await deleteHostedAppRecord(targetSlug);
      setConfirmDeleteSlug(null);
    } catch (err: any) {
      setSitesError(err?.message || 'Failed to delete site.');
    }
  };

  const handleToggleVisibility = async (site: HostedAppDoc) => {
    setSitesError(null);
    try {
      await toggleHostedAppVisibility(site.slug, !site.isPublic);
    } catch (err: any) {
      setSitesError(err?.message || 'Failed to update visibility.');
    }
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await googleSignIn();
    } catch {
      // ignore popup close
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-medium flex items-center gap-2" style={{ color: tokens.fgMuted }}>
            <span>Compillo Cloud Hosting</span>
            <span aria-hidden="true">·</span>
            <span>Firestore Persisted</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
            Hosted Sites Manager
          </h1>
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: tokens.fgMuted }}>
            Upload your own HTML, CSS, JavaScript, or Python server files, publish live routes under{' '}
            <span className="font-mono">/hosted/&lt;slug&gt;/</span>, toggle Community Gallery visibility, or delete old deployments.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenGallery}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg, color: tokens.fgPrimary }}
        >
          <Globe size={14} />
          <span>Browse Community Gallery</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Deploy New or Updated Site */}
        <form
          onSubmit={handleDeploy}
          className="lg:col-span-5 p-6 rounded-2xl border space-y-4"
          style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: tokens.borderColor }}>
            <h2 className="text-base font-bold">Deploy Custom Files</h2>
            <span className="text-xs font-mono" style={{ color: tokens.fgMuted }}>
              Max 50 files · 2 MB
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold" htmlFor="host-slug">Route Slug</label>
            <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}>
              <span className="px-3 py-2 text-xs font-mono border-r shrink-0" style={{ borderColor: tokens.borderColor, color: tokens.fgMuted }}>
                /hosted/
              </span>
              <input
                id="host-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="flex-1 min-w-0 px-3 py-2 text-xs font-mono outline-none bg-transparent"
                style={{ color: tokens.fgPrimary }}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" htmlFor="host-title">App Title</label>
              <input
                id="host-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.fgPrimary }}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" htmlFor="host-category">Category</label>
              <select
                id="host-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as HostedAppCategory)}
                className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
                style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.fgPrimary }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold" htmlFor="host-desc">Short Description</label>
            <input
              id="host-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
              style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg, color: tokens.fgPrimary }}
            />
          </div>

          {/* File Selector or Inline HTML */}
          <div className="p-3.5 rounded-xl border space-y-2.5" style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="hosted-manager-upload"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold cursor-pointer hover:opacity-90"
                style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg, color: tokens.fgPrimary }}
              >
                <Upload size={13} />
                <span>Select Files (.html, .css, .js, .py)</span>
              </label>
              <input
                id="hosted-manager-upload"
                type="file"
                multiple
                accept=".html,.htm,.css,.js,.mjs,.json,.svg,.txt,.md,.xml,.csv,.py"
                onChange={handleFileUpload}
                className="hidden"
              />
              {files.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="text-xs inline-flex items-center gap-1 cursor-pointer"
                  style={{ color: tokens.fgMuted }}
                >
                  <X size={12} />
                  <span>Clear ({files.length})</span>
                </button>
              )}
            </div>

            {files.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {files.map((f) => (
                  <span key={f.path} className="text-[11px] font-mono px-2 py-0.5 rounded border" style={{ borderColor: tokens.borderColor }}>
                    {f.path}
                  </span>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: tokens.fgMuted }}>Or paste HTML code:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setHtmlDraft(
                        `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"><title>${title || 'My App'}</title></head>\n<body style="font-family:system-ui;background:#0b0e17;color:#f8fafc;padding:48px">\n  <h1>${title || 'Hosted Live'}</h1>\n  <p>${description}</p>\n</body>\n</html>`
                      )
                    }
                    className="text-[11px] font-semibold underline cursor-pointer"
                    style={{ color: tokens.accent }}
                  >
                    Insert Starter HTML
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={htmlDraft}
                  onChange={(e) => setHtmlDraft(e.target.value)}
                  placeholder="<!DOCTYPE html><html>...</html>"
                  className="w-full p-2.5 rounded-lg border text-xs font-mono outline-none resize-y"
                  style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg, color: tokens.fgPrimary }}
                />
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded"
            />
            <span>Feature this site in the public Community Showcase Gallery</span>
          </label>

          {deployError && <div className="text-xs text-rose-400">{deployError}</div>}
          {deployStatus && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Check size={14} />
                <span>{deployStatus}</span>
              </div>
              {lastLiveUrl && (
                <a
                  href={lastLiveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-emerald-300 underline break-all"
                >
                  <ExternalLink size={12} />
                  <span>{lastLiveUrl}</span>
                </a>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isDeploying}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
          >
            <Rocket size={14} />
            <span>{isDeploying ? 'Deploying...' : 'Publish Site Live'}</span>
          </button>
        </form>

        {/* Right: Managed Hosted Sites List */}
        <div
          className="lg:col-span-7 p-6 rounded-2xl border space-y-5"
          style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3" style={{ borderColor: tokens.borderColor }}>
            <div>
              <h2 className="text-base font-bold">Your Persistent Hosted Sites</h2>
              <p className="text-xs" style={{ color: tokens.fgMuted }}>
                Saved to Cloud Firestore so your sites stay manageable across sessions.
              </p>
            </div>
            {firebaseUser ? (
              <span className="text-xs font-mono tabular-nums" style={{ color: tokens.fgMuted }}>
                {sites.length} site(s)
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={signingIn}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
              >
                <LogIn size={13} />
                <span>{signingIn ? 'Signing in...' : 'Sign In with Google'}</span>
              </button>
            )}
          </div>

          {sitesError && <div className="text-xs text-rose-400">{sitesError}</div>}

          {!firebaseUser ? (
            <div className="p-8 rounded-xl border text-center space-y-3" style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}>
              <Globe size={28} className="mx-auto opacity-60" />
              <div className="text-sm font-semibold">Sign in to manage your hosted sites</div>
              <p className="text-xs max-w-md mx-auto" style={{ color: tokens.fgMuted }}>
                Your deployed sites, visibility toggles, and deletion controls are secured by your Google account in Firestore. Built-in demo{' '}
                <a href="/hosted/ishant-calculator/" target="_blank" rel="noreferrer" className="underline">
                  /hosted/ishant-calculator/
                </a>{' '}
                is always live.
              </p>
            </div>
          ) : loadingSites ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-20 rounded-xl border animate-pulse" style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }} />
              ))}
            </div>
          ) : sites.length === 0 ? (
            <div className="p-8 rounded-xl border text-center space-y-2" style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}>
              <div className="text-sm font-semibold">No hosted sites saved yet</div>
              <p className="text-xs" style={{ color: tokens.fgMuted }}>
                Upload HTML/CSS/JS or Python files on the left and click Publish Site Live to see them here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sites.map((site) => (
                <div
                  key={site.slug}
                  className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  style={{ borderColor: tokens.borderColor, backgroundColor: tokens.pageBg }}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold truncate">{site.title}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono" style={{ color: tokens.fgMuted }}>
                      <span>/hosted/{site.slug}/</span>
                      <span aria-hidden="true">·</span>
                      <span>{site.mode}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{site.files?.length || 0} files</span>
                      <span aria-hidden="true">·</span>
                      <span>{site.isPublic ? 'Public' : 'Private'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(site)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap shrink-0"
                      style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg, color: tokens.fgPrimary }}
                      title={site.isPublic ? 'Make Private' : 'Publish to Community Gallery'}
                    >
                      {site.isPublic ? <Eye size={13} /> : <EyeOff size={13} />}
                      <span>{site.isPublic ? 'Public' : 'Hidden'}</span>
                    </button>

                    <a
                      href={`/hosted/${site.slug}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0"
                      style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg, color: tokens.accent }}
                    >
                      <ExternalLink size={13} />
                      <span>Open</span>
                    </a>

                    {confirmDeleteSlug === site.slug ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(site.slug)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSlug(null)}
                          className="px-2 py-1.5 rounded-lg border text-xs cursor-pointer"
                          style={{ borderColor: tokens.borderColor }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSlug(site.slug)}
                        className="p-1.5 rounded-lg border text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        style={{ borderColor: tokens.borderColor }}
                        title="Delete hosted site"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
