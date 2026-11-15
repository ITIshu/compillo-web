import React, { useState } from 'react';
import { WebsiteThemeTokens } from './WebsitePageTheme';
import { Play, Copy, Check, Sparkles, Sliders, Code, ExternalLink } from 'lucide-react';

interface CssAnimatorBetaPageProps {
  tokens: WebsiteThemeTokens;
}

const MULTI_PLATFORM_ANIMATIONS = [
  { id: 'bounce', name: 'Bounce', source: 'Animate.css', keyframes: `@keyframes bounce {\n  0%, 20%, 53%, 80%, 100% { animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1); transform: translate3d(0,0,0); }\n  40%, 43% { animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06); transform: translate3d(0, -30px, 0) scaleY(1.1); }\n  70% { animation-timing-function: cubic-bezier(0.755, 0.05, 0.855, 0.06); transform: translate3d(0, -15px, 0) scaleY(1.05); }\n  90% { transform: translate3d(0, -4px, 0) scaleY(1.02); }\n}` },
  { id: 'fadeInUp', name: 'Fade In Up', source: 'Animista', keyframes: `@keyframes fadeInUp {\n  from { opacity: 0; transform: translate3d(0, 40px, 0); }\n  to { opacity: 1; transform: translate3d(0, 0, 0); }\n}` },
  { id: 'pulse', name: 'Pulse', source: 'Animate.css', keyframes: `@keyframes pulse {\n  0% { transform: scale3d(1, 1, 1); }\n  50% { transform: scale3d(1.08, 1.08, 1.08); }\n  100% { transform: scale3d(1, 1, 1); }\n}` },
  { id: 'magictight', name: 'Magic Space In', source: 'Magic CSS', keyframes: `@keyframes magictight {\n  0% { opacity: 0; transform: scale(3) rotate(30deg); }\n  100% { opacity: 1; transform: scale(1) rotate(0deg); }\n}` },
  { id: 'hvrwobble', name: 'Hover Wobble', source: 'Hover.css', keyframes: `@keyframes hvrwobble {\n  16.65% { transform: translateX(8px); }\n  33.3% { transform: translateX(-6px); }\n  49.95% { transform: translateX(4px); }\n  66.6% { transform: translateX(-2px); }\n  83.25% { transform: translateX(1px); }\n  100% { transform: translateX(0); }\n}` },
  { id: 'swing', name: 'Swing', source: 'Animate.css', keyframes: `@keyframes swing {\n  20% { transform: rotate3d(0, 0, 1, 15deg); }\n  40% { transform: rotate3d(0, 0, 1, -10deg); }\n  60% { transform: rotate3d(0, 0, 1, 5deg); }\n  80% { transform: rotate3d(0, 0, 1, -5deg); }\n  100% { transform: rotate3d(0, 0, 1, 0deg); }\n}` },
];

export const CssAnimatorBetaPage: React.FC<CssAnimatorBetaPageProps> = ({ tokens }) => {
  const [selectedPreset, setSelectedPreset] = useState(MULTI_PLATFORM_ANIMATIONS[0]);
  const [duration, setDuration] = useState(1.0);
  const [iterationCount, setIterationCount] = useState('infinite');
  const [isPlaying, setIsPlaying] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  const getCssClass = () => {
    return `.element-${selectedPreset.id} {\n  animation: ${selectedPreset.id} ${duration}s ease-in-out ${iterationCount};\n}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${selectedPreset.keyframes}\n\n${getCssClass()}`);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b" style={{ borderColor: tokens.borderColor }}>
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/20">
              Multi-Platform CSS Hub
            </span>
            <span className="text-xs text-gray-400 font-mono">Animate.css, Animista & Magic CSS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: tokens.fgPrimary }}>
            Multi-Platform CSS Animation Hub
          </h1>
          <p className="text-sm mt-1" style={{ color: tokens.fgMuted }}>
            Fetch and preview professional CSS animations sourced from **Animate.css**, **Animista**, **Magic CSS**, and **Hover.css**.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://animate.style"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-300 border border-white/10 text-xs font-mono transition-colors"
          >
            <ExternalLink size={12} /> Animate.css Source
          </a>
          <a
            href="https://animista.net"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-300 border border-white/10 text-xs font-mono transition-colors"
          >
            <ExternalLink size={12} /> Animista Source
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left / Presets */}
        <div className="space-y-4">
          <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
            <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: tokens.borderColor }}>
              <Sliders size={16} className="text-pink-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider font-mono" style={{ color: tokens.fgPrimary }}>Multi-Platform Animation Sources</h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {MULTI_PLATFORM_ANIMATIONS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-mono text-left transition-all border ${
                    selectedPreset.id === preset.id ? 'bg-pink-600 text-white border-pink-500 shadow' : 'bg-black/30 text-gray-300 border-white/10 hover:bg-white/5'
                  }`}
                >
                  <div className="font-bold">{preset.name}</div>
                  <div className="text-[10px] text-gray-400 opacity-80">{preset.source}</div>
                </button>
              ))}
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
                <span>Duration ({duration}s)</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="3.0"
                step="0.1"
                value={duration}
                onChange={(e) => setDuration(parseFloat(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
            </div>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-medium shadow transition-all"
            >
              <Play size={14} fill="currentColor" />
              {isPlaying ? 'Pause Animation' : 'Play Animation'}
            </button>
          </div>

          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
            <div className="flex items-center justify-between px-4 py-3 border-b bg-black/20" style={{ borderColor: tokens.borderColor }}>
              <div className="flex items-center gap-2">
                <Code size={16} className="text-pink-400" />
                <span className="text-xs font-semibold font-mono" style={{ color: tokens.fgPrimary }}>Source CSS Stylesheet ({selectedPreset.source})</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-pink-300 border border-white/10 text-xs font-mono transition-colors"
              >
                {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                {copiedCode ? 'Copied' : 'Copy CSS'}
              </button>
            </div>
            <div className="p-4 font-mono text-xs bg-black/40 text-pink-200 overflow-x-auto max-h-[220px]">
              <pre>{`${selectedPreset.keyframes}\n\n${getCssClass()}`}</pre>
            </div>
          </div>
        </div>

        {/* Right / Live Preview */}
        <div className="rounded-xl border flex flex-col items-center justify-center p-12 relative overflow-hidden min-h-[440px]" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
          <div className="absolute top-4 left-4 text-xs font-mono text-gray-400 uppercase tracking-wider">Live Sandbox ({selectedPreset.source})</div>

          <style>{`
            ${selectedPreset.keyframes}
            .live-anim-box {
              animation: ${selectedPreset.id} ${duration}s ease-in-out ${iterationCount};
              animation-play-state: ${isPlaying ? 'running' : 'paused'};
            }
          `}</style>

          <div className="live-anim-box w-40 h-40 rounded-3xl bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 shadow-2xl flex flex-col items-center justify-center text-white font-bold p-4 text-center">
            <Sparkles size={36} className="mb-2" />
            <span className="text-xs uppercase font-mono tracking-wider">{selectedPreset.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
