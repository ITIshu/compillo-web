import React, { useState } from 'react';
import {
  X,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Download,
  Server,
  Cloud,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Rocket,
  Zap,
} from 'lucide-react';
import { CompilloThemeDefinition } from '../../services/themes';
import { FileNode } from '../../types';
import { getAllFiles } from '../../services/fileSystem';

interface FreeHostingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: CompilloThemeDefinition;
  onExportZip?: () => void;
  files?: FileNode[];
}

export const FreeHostingModal: React.FC<FreeHostingModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onExportZip,
  files = [],
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'render' | 'koyeb' | 'vercel' | 'cloudrun'>('current');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [customSlug, setCustomSlug] = useState('my-compillo-site');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  if (!isOpen) return null;

  const publicAppUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-pre-bvepbilzqpydiocdb5jw5n-505905471542.asia-southeast1.run.app';

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePublishWorkspace = async () => {
    const cleanSlug =
      customSlug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/^-+|-+$/g, '') || 'my-compillo-site';
    setCustomSlug(cleanSlug);
    setPublishError(null);

    const workspaceFiles = getAllFiles(files).map((f) => ({
      path: f.path.replace(/^\/+/, ''),
      content: f.content || '',
    }));

    if (workspaceFiles.length === 0) {
      setPublishError('No files found in the current workspace.');
      return;
    }

    setIsPublishing(true);
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: cleanSlug, files: workspaceFiles }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setPublishError(data?.error || 'Failed to publish workspace files.');
        setIsPublishing(false);
        return;
      }
      setPublishedUrl(`${publicAppUrl}${data.livePath || `/hosted/${cleanSlug}/`}`);
    } catch (err: any) {
      setPublishError(err?.message || 'Unable to reach deployment server.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden"
        style={{
          backgroundColor: currentTheme.ui.sideBarBg,
          borderColor: currentTheme.ui.sideBarBorder,
          color: currentTheme.ui.sideBarFg,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-sky-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Globe size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Free Cloud Hosting Solutions ($0 / Month)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                  100% Free
                </span>
              </h2>
              <p className="text-xs opacity-75">
                Host Compillo Studio online permanently without paying any money or credit card
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

        {/* Tab Selection */}
        <div
          className="flex items-center overflow-x-auto border-b px-4 gap-1 bg-black/5 dark:bg-white/5 scrollbar-none"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <button
            onClick={() => setActiveTab('current')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'current'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Zap size={14} className="text-emerald-400" />
            <span>Active Live URL (Free Now)</span>
          </button>

          <button
            onClick={() => setActiveTab('render')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'render'
                ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Server size={14} />
            <span>Render.com (Free)</span>
          </button>

          <button
            onClick={() => setActiveTab('koyeb')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'koyeb'
                ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Cloud size={14} />
            <span>Koyeb (Free Nano)</span>
          </button>

          <button
            onClick={() => setActiveTab('vercel')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'vercel'
                ? 'border-teal-500 text-teal-400 bg-teal-500/10'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Sparkles size={14} />
            <span>Vercel / Netlify</span>
          </button>

          <button
            onClick={() => setActiveTab('cloudrun')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'cloudrun'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Terminal size={14} />
            <span>Google Cloud Run</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: CURRENT LIVE HOSTING */}
          {activeTab === 'current' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Already Hosted & Live (Free Forever)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Cost: $0.00
                  </span>
                </div>

                <p className="text-xs opacity-85 leading-relaxed">
                  Good news! Your app is <strong>already hosted online right now</strong> on Google Cloud infrastructure. You do not need to spend any money or configure servers.
                </p>

                {/* Link Box */}
                <div className="p-3 rounded-lg bg-black/30 border border-white/10 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-emerald-300 truncate select-all">
                    {publicAppUrl}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => copyText(publicAppUrl, 'main-url')}
                      className="px-2.5 py-1.5 rounded-md text-xs font-bold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 transition-colors"
                      title="Copy Public Link"
                    >
                      {copiedKey === 'main-url' ? (
                        <>
                          <Check size={13} className="text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <a
                      href={publicAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-md text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink size={13} />
                      <span>Open Link</span>
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="flex items-center gap-1.5 opacity-80">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>Free SSL / HTTPS included</span>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-80">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>24/7 Uptime guaranteed</span>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-80">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>No credit card needed</span>
                  </div>
                </div>
              </div>

              {/* Publish User's Current Workspace Files Live */}
              <div
                className="p-4 rounded-xl border bg-sky-500/5 border-sky-500/30 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold flex items-center gap-1.5 text-sky-400">
                    <Rocket size={14} />
                    <span>Host Your Own Editor Files Live (1-Click)</span>
                  </h3>
                  <span className="text-[10px] font-mono opacity-75">
                    {getAllFiles(files).length} workspace file(s)
                  </span>
                </div>
                <p className="text-xs opacity-80 leading-relaxed">
                  Publish your open HTML, CSS, JS, or Python files to a live shareable URL instantly.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div
                    className="flex-1 flex items-center rounded-lg border overflow-hidden bg-black/20"
                    style={{ borderColor: currentTheme.ui.sideBarBorder }}
                  >
                    <span className="px-2.5 py-2 text-[11px] font-mono opacity-70 border-r" style={{ borderColor: currentTheme.ui.sideBarBorder }}>
                      /hosted/
                    </span>
                    <input
                      type="text"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="flex-1 min-w-0 px-2.5 py-2 text-xs font-mono bg-transparent outline-none"
                      placeholder="my-compillo-site"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isPublishing}
                    onClick={handlePublishWorkspace}
                    className="px-3.5 py-2 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <Rocket size={13} />
                    <span>{isPublishing ? 'Publishing...' : 'Host My Files'}</span>
                  </button>
                </div>
                {publishError && (
                  <p className="text-xs text-rose-400">{publishError}</p>
                )}
                {publishedUrl && (
                  <div className="p-2.5 rounded-lg bg-black/30 border border-emerald-500/30 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-emerald-300 truncate select-all">
                      {publishedUrl}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyText(publishedUrl, 'custom-hosted-url')}
                        className="px-2 py-1 rounded text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1"
                      >
                        {copiedKey === 'custom-hosted-url' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>{copiedKey === 'custom-hosted-url' ? 'Copied' : 'Copy'}</span>
                      </button>
                      <a
                        href={publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded text-[11px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
                        <span>Open</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* What if you want to host on your own domain or GitHub? */}
              <div
                className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 space-y-3"
                style={{ borderColor: currentTheme.ui.sideBarBorder }}
              >
                <h3 className="text-xs font-bold flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-sky-400" />
                  <span>Want to host on your own GitHub or custom domain for $0?</span>
                </h3>
                <p className="text-xs opacity-75 leading-relaxed">
                  We have pre-configured <strong>Dockerfile</strong>, <strong>render.yaml</strong>, and <strong>vercel.json</strong> in your project. You can download the entire source code with one click and deploy to any free hosting provider in 2 minutes.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {onExportZip && (
                    <button
                      onClick={onExportZip}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white flex items-center gap-2 shadow-sm transition-all"
                    >
                      <Download size={14} />
                      <span>Download Ready-to-Deploy Project ZIP</span>
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('render')}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white flex items-center gap-2 transition-colors"
                  >
                    <span>View Render.com 1-Click Guide</span>
                    <ExternalLink size={13} className="opacity-70" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RENDER.COM */}
          {activeTab === 'render' && (
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3.5 rounded-xl border bg-sky-500/10 border-sky-500/30 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sky-400 text-sm">Render.com Free Tier</h3>
                  <p className="text-[11px] opacity-75">750 free hours/month (enough to run 1 web service 24/7 forever for $0)</p>
                </div>
                <span className="font-mono text-emerald-400 font-bold bg-emerald-500/20 px-2 py-1 rounded text-xs">$0 / month</span>
              </div>

              <div className="space-y-2 opacity-90">
                <p className="font-bold text-white">How to deploy in 3 steps:</p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>
                    Create a free account at{' '}
                    <a href="https://render.com" target="_blank" rel="noreferrer" className="text-sky-400 underline">
                      render.com
                    </a>.
                  </li>
                  <li>Upload this project to your GitHub repository (or use our download zip).</li>
                  <li>
                    Click <strong>New Web Service</strong> &gt; Connect your GitHub repository.
                  </li>
                  <li>
                    Set the build and start commands:
                    <div className="mt-1.5 p-2.5 rounded-lg bg-black/40 font-mono text-[11px] space-y-1 border border-white/10">
                      <div><span className="text-gray-400">Build Command:</span> <span className="text-emerald-300">npm ci && npm run build</span></div>
                      <div><span className="text-gray-400">Start Command:</span> <span className="text-emerald-300">npm start</span></div>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="p-3 rounded-xl bg-black/10 dark:bg-white/5 border border-white/10">
                <span className="font-semibold text-sky-400 block mb-1">Bonus: render.yaml Included</span>
                <p className="opacity-75 text-[11px]">
                  A <code>render.yaml</code> file is already placed in your root directory. Render will auto-detect it and deploy automatically!
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: KOYEB */}
          {activeTab === 'koyeb' && (
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3.5 rounded-xl border bg-purple-500/10 border-purple-500/30 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-purple-400 text-sm">Koyeb Free Eco Tier</h3>
                  <p className="text-[11px] opacity-75">1 Nano Web Service (512MB RAM, 24/7 continuous run, zero cost forever)</p>
                </div>
                <span className="font-mono text-emerald-400 font-bold bg-emerald-500/20 px-2 py-1 rounded text-xs">$0 / month</span>
              </div>

              <div className="space-y-2 opacity-90">
                <p className="font-bold text-white">How to deploy on Koyeb:</p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>
                    Sign up for free at{' '}
                    <a href="https://koyeb.com" target="_blank" rel="noreferrer" className="text-purple-400 underline">
                      koyeb.com
                    </a>.
                  </li>
                  <li>Click <strong>Create App</strong> &gt; Select <strong>GitHub</strong>.</li>
                  <li>Select your repository and choose <strong>Dockerfile</strong> build (the production Dockerfile is already prepared in this repo).</li>
                  <li>Click <strong>Deploy</strong>. Koyeb provisions a free global HTTPS domain immediately.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 4: VERCEL / NETLIFY */}
          {activeTab === 'vercel' && (
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3.5 rounded-xl border bg-teal-500/10 border-teal-500/30 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-teal-400 text-sm">Vercel & Netlify (Hobby / Free Plan)</h3>
                  <p className="text-[11px] opacity-75">Unlimited deployments, instant global CDN, 100GB bandwidth free every month</p>
                </div>
                <span className="font-mono text-emerald-400 font-bold bg-emerald-500/20 px-2 py-1 rounded text-xs">$0 / month</span>
              </div>

              <div className="space-y-2 opacity-90">
                <p className="font-bold text-white">Steps for Vercel:</p>
                <ol className="list-decimal pl-5 space-y-1.5">
                  <li>Go to <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-teal-400 underline">vercel.com</a> and sign in with GitHub.</li>
                  <li>Click <strong>Add New Project</strong> &gt; Import your Compillo repository.</li>
                  <li>Framework is automatically detected as <strong>Vite</strong>.</li>
                  <li>Click <strong>Deploy</strong>. You will get a free <code>.vercel.app</code> domain with SSL!</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 5: GOOGLE CLOUD RUN */}
          {activeTab === 'cloudrun' && (
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/30 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-amber-400 text-sm">Google Cloud Run Free Tier</h3>
                  <p className="text-[11px] opacity-75">2,000,000 free requests per month + 360,000 GB-seconds memory free</p>
                </div>
                <span className="font-mono text-emerald-400 font-bold bg-emerald-500/20 px-2 py-1 rounded text-xs">$0 / month</span>
              </div>

              <div className="space-y-2 opacity-90">
                <p className="font-bold text-white">1-Command Deployment via Google Cloud CLI:</p>
                <div className="p-3 rounded-lg bg-black/40 font-mono text-[11px] space-y-1 border border-white/10 relative">
                  <div className="text-emerald-300">gcloud run deploy compillo --source . --allow-unauthenticated</div>
                  <button
                    onClick={() => copyText('gcloud run deploy compillo --source . --allow-unauthenticated', 'gcloud')}
                    className="absolute right-2 top-2 p-1 bg-white/10 hover:bg-white/20 rounded text-xs"
                    title="Copy command"
                  >
                    {copiedKey === 'gcloud' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
                <p className="text-[11px] opacity-75">
                  Google Cloud Run will build using the included Dockerfile and provide an auto-scaling HTTPS service within the free tier.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t shrink-0 bg-black/5 dark:bg-white/5"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <div className="flex items-center gap-2 text-xs opacity-75">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>All options above require $0.00 to keep your app live.</span>
          </div>

          <div className="flex items-center gap-2">
            {onExportZip && (
              <button
                onClick={onExportZip}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-colors"
              >
                <Download size={13} />
                <span>Export Project</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
