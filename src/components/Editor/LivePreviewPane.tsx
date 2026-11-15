import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCw,
  Smartphone,
  Tablet,
  Monitor,
  X,
  ExternalLink,
  Code2,
  CheckCircle2,
  Download,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { FileNode } from '../../types';
import { VSCodeThemeDefinition } from '../../services/themes';
import { bundleWorkspaceToSingleHtml, downloadSingleHtmlFile } from '../../services/htmlBundler';

interface LivePreviewPaneProps {
  activeFile: FileNode | null;
  files: FileNode[];
  currentTheme: VSCodeThemeDefinition;
  onClose: () => void;
  previewUrl?: string | null;
  onClearPreviewUrl?: () => void;
  refreshToken?: number;
  onRestartServer?: () => void;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export const LivePreviewPane: React.FC<LivePreviewPaneProps> = ({
  activeFile,
  files,
  currentTheme,
  onClose,
  previewUrl,
  onClearPreviewUrl,
  refreshToken = 0,
  onRestartServer,
}) => {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [key, setKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const [autoReload, setAutoReload] = useState(true);

  useEffect(() => {
    if (autoReload && refreshToken > 0) {
      setKey((prev) => prev + 1);
    }
  }, [refreshToken, autoReload]);

  // Generate sandboxed HTML content with inlined CSS & JS
  const buildPreviewHtml = (): string => {
    return bundleWorkspaceToSingleHtml(files, activeFile);
  };

  const handleExportSingleHtml = () => {
    const html = bundleWorkspaceToSingleHtml(files, activeFile);
    const baseName = activeFile?.name ? activeFile.name.replace(/\.[^/.]+$/, '') : 'app';
    downloadSingleHtmlFile(html, `${baseName}_single_page.html`);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  const handleCopySingleHtml = async () => {
    try {
      if (previewUrl) {
        await navigator.clipboard.writeText(previewUrl);
      } else {
        const html = bundleWorkspaceToSingleHtml(files, activeFile);
        await navigator.clipboard.writeText(html);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Clipboard copy failed:', e);
    }
  };

  const getContainerWidth = () => {
    if (device === 'mobile') return '375px';
    if (device === 'tablet') return '768px';
    return '100%';
  };

  const portMatch = previewUrl?.match(/\/api\/ports\/proxy\/(\d+)/);

  return (
    <div
      id="nova-live-preview-pane"
      className="flex flex-col w-full flex-1 min-w-0 h-full border-l border-[#1e293b] bg-[#0b0f17] select-none"
      style={{
        backgroundColor: currentTheme.ui.editorBg,
        borderColor: currentTheme.ui.sideBarBorder,
      }}
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-2.5 py-1.5 border-b border-[#1e293b] bg-[#0f172a] text-[11px] shrink-0 gap-1.5 min-w-0">
        <div className="flex items-center gap-2 text-white font-medium min-w-0">
          <Code2 size={13} className="text-sky-400 shrink-0" />
          <span className="truncate">
            {previewUrl ? `Preview${portMatch ? ` :${portMatch[1]}` : ''}` : 'Live Canvas'}
          </span>
          {previewUrl ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden xl:flex text-[10px] text-sky-400 font-mono items-center gap-1 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                <CheckCircle2 size={10} /> Live Proxy
              </span>
              {onClearPreviewUrl && (
                <button
                  onClick={onClearPreviewUrl}
                  className="text-[10px] text-slate-300 hover:text-white underline px-1 whitespace-nowrap shrink-0"
                  title="Switch back to Bundled Workspace HTML"
                >
                  Bundled HTML
                </button>
              )}
            </div>
          ) : (
            <span className="hidden xl:flex text-[10px] text-emerald-400 font-mono items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap shrink-0">
              <CheckCircle2 size={10} /> Bundled Single HTML
            </span>
          )}
        </div>

        {/* Device Controls */}
        <div className="flex items-center gap-1 bg-[#1e293b] p-0.5 rounded border border-[#334155] shrink-0">
          <button
            onClick={() => setDevice('desktop')}
            title="Desktop Mode"
            className={`p-1 rounded ${
              device === 'desktop' ? 'bg-sky-600 text-white' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Monitor size={12} />
          </button>
          <button
            onClick={() => setDevice('tablet')}
            title="Tablet Mode (768px)"
            className={`p-1 rounded ${
              device === 'tablet' ? 'bg-sky-600 text-white' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Tablet size={12} />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            title="Mobile Mode (375px)"
            className={`p-1 rounded ${
              device === 'mobile' ? 'bg-sky-600 text-white' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Smartphone size={12} />
          </button>
        </div>

        {/* Actions: Export Single HTML / Open Tab & Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Proxied Service in New Tab"
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 border border-sky-500/30 whitespace-nowrap shrink-0"
            >
              <ExternalLink size={11} />
              <span className="hidden sm:inline">Open Tab</span>
            </a>
          ) : (
            <button
              onClick={handleExportSingleHtml}
              title="Download complete single HTML page with HTML + inlined CSS + inlined JS"
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all whitespace-nowrap shrink-0 ${
                exported
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
              }`}
            >
              {exported ? <Check size={11} /> : <Download size={11} />}
              <span className="hidden sm:inline">{exported ? 'Downloaded!' : 'Export HTML'}</span>
            </button>
          )}

          {previewUrl && onRestartServer && (
            <button
              onClick={() => {
                onRestartServer();
                setTimeout(() => setKey((prev) => prev + 1), 600);
              }}
              title="Sync workspace edits & restart localhost server"
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 whitespace-nowrap shrink-0"
            >
              <RefreshCw size={11} />
              <span className="hidden md:inline">Sync Server</span>
            </button>
          )}

          <button
            onClick={() => setAutoReload((v) => !v)}
            title={autoReload ? 'Auto-Reload on Save: On' : 'Auto-Reload on Save: Off'}
            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors whitespace-nowrap shrink-0 ${
              autoReload
                ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            Auto: {autoReload ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={handleCopySingleHtml}
            title={previewUrl ? 'Copy Proxy URL' : 'Copy complete bundled single HTML to clipboard'}
            className={`p-1 rounded hover:bg-white/10 transition-colors shrink-0 ${
              copied ? 'text-emerald-400' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>

          <button
            onClick={() => setKey((prev) => prev + 1)}
            title="Reload Preview"
            className="p-1 rounded hover:bg-white/10 text-[#94a3b8] hover:text-white shrink-0"
          >
            <RotateCw size={13} />
          </button>
          <button
            onClick={onClose}
            title="Close Preview"
            className="p-1 rounded hover:bg-white/10 text-[#94a3b8] hover:text-white shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex-1 min-h-0 p-2 overflow-auto bg-[#070a10]">
        <div
          className="h-full mx-auto bg-white shadow-2xl transition-all duration-200 rounded overflow-hidden border border-[#1e293b]"
          style={{ width: getContainerWidth() }}
        >
          {previewUrl ? (
            <iframe
              key={`${key}-${previewUrl}`}
              src={previewUrl}
              title="Compillo Port Proxy Preview"
              className="w-full h-full border-none"
            />
          ) : (
            <iframe
              key={key}
              srcDoc={buildPreviewHtml()}
              title="Compillo Live Canvas"
              sandbox="allow-scripts allow-modals"
              className="w-full h-full border-none"
            />
          )}
        </div>
      </div>
    </div>
  );
};
