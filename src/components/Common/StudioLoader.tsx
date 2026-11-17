import React, { useEffect, useRef, useState } from 'react';
import { CompilloThemeDefinition } from '../../services/themes';

interface StudioLoaderProps {
  onComplete: () => void;
  theme?: CompilloThemeDefinition;
  finalSubtitle?: string;
  reducedMotionDefault?: boolean;
}

const SPECTRUM_BARS = [
  { color: '#22d3ee', delay: '0ms' },
  { color: '#3b82f6', delay: '110ms' },
  { color: '#a855f7', delay: '220ms' },
  { color: '#ec4899', delay: '330ms' },
  { color: '#f59e0b', delay: '440ms' },
  { color: '#10b981', delay: '550ms' },
] as const;

export const StudioLoader: React.FC<StudioLoaderProps> = ({
  onComplete,
  theme,
  finalSubtitle,
  reducedMotionDefault = false,
}) => {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const isLight = theme?.type === 'light';
  const surfaceBg = isLight ? '#f8fafc' : '#07080f';
  const cardBg = isLight ? 'rgba(255, 255, 255, 0.86)' : 'rgba(12, 14, 24, 0.88)';
  const fgPrimary = isLight ? '#0f172a' : '#ffffff';
  const fgMuted = isLight ? '#475569' : '#cbd5e1';

  const phases = [
    { label: 'Starting studio engine', progress: 0.32, percent: '32%' },
    { label: 'Loading colorful themes & compilers', progress: 0.72, percent: '72%' },
    { label: finalSubtitle || 'Opening Compillo Studio', progress: 1, percent: '100%' },
  ];

  const finishLoading = React.useCallback((immediate = false) => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (immediate) {
      onCompleteRef.current();
      return;
    }
    setIsExiting(true);
    window.setTimeout(() => {
      onCompleteRef.current();
    }, 300);
  }, []);

  useEffect(() => {
    const prefersReduced =
      reducedMotionDefault ||
      (typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    if (prefersReduced) {
      setPhaseIndex(2);
      const t = window.setTimeout(() => finishLoading(true), 100);
      return () => window.clearTimeout(t);
    }

    const t1 = window.setTimeout(() => setPhaseIndex(1), 300);
    const t2 = window.setTimeout(() => setPhaseIndex(2), 660);
    const t3 = window.setTimeout(() => finishLoading(false), 1040);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        finishLoading(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [finishLoading, reducedMotionDefault]);

  const currentPhase = phases[phaseIndex] ?? phases[0];

  return (
    <div
      id="compillo-studio-loader"
      role="dialog"
      aria-modal="true"
      aria-label="Opening Compillo Studio"
      className={`fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden select-none ${
        isExiting ? 'compillo-studio-loader-exit pointer-events-none' : 'compillo-boot-aperture'
      }`}
      style={{
        backgroundColor: surfaceBg,
        color: fgPrimary,
      }}
    >
      {/* Multi-Hue Kinetic Aurora Layers */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-[520px] w-[520px] rounded-full blur-3xl compillo-prism-aurora-a"
        style={{
          background: isLight
            ? 'radial-gradient(circle, rgba(56,189,248,0.28) 0%, rgba(168,85,247,0.22) 45%, transparent 72%)'
            : 'radial-gradient(circle, rgba(34,211,238,0.26) 0%, rgba(99,102,241,0.24) 45%, transparent 72%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-24 h-[540px] w-[540px] rounded-full blur-3xl compillo-prism-aurora-b"
        style={{
          background: isLight
            ? 'radial-gradient(circle, rgba(236,72,153,0.25) 0%, rgba(245,158,11,0.22) 45%, transparent 72%)'
            : 'radial-gradient(circle, rgba(236,72,153,0.25) 0%, rgba(245,158,11,0.18) 45%, transparent 72%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background: isLight
            ? 'radial-gradient(circle, rgba(16,185,129,0.14) 0%, rgba(139,92,246,0.14) 45%, transparent 74%)'
            : 'radial-gradient(circle, rgba(16,185,129,0.16) 0%, rgba(168,85,247,0.18) 45%, transparent 74%)',
        }}
      />

      {/* Subtle Masked Studio Grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 compillo-studio-grid-in"
        style={{
          backgroundImage: isLight
            ? 'linear-gradient(to right, rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.045) 1px, transparent 1px)'
            : 'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(circle at 50% 48%, black 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 48%, black 0%, transparent 70%)',
        }}
      />

      {/* Central Prismatic Glass Stage */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Chromatic Rotating Halo + Emblem */}
        <div className="relative flex h-32 w-32 items-center justify-center">
          {/* Soft Prismatic Backlight */}
          <div
            aria-hidden="true"
            className="absolute inset-2 rounded-full blur-xl opacity-75 compillo-studio-ring-cw"
            style={{
              background:
                'conic-gradient(from 0deg, #22d3ee, #3b82f6, #a855f7, #ec4899, #f59e0b, #10b981, #22d3ee)',
            }}
          />

          {/* Outer Conic Gradient Ring */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full p-[2.5px] compillo-studio-ring-cw"
            style={{
              background:
                'conic-gradient(from 0deg, #22d3ee, #6366f1, #ec4899, #f59e0b, #10b981, #22d3ee)',
              WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
              WebkitMaskComposite: 'xor',
              mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
              maskComposite: 'exclude',
            }}
          />

          {/* Inner Counter-Rotating Multi-Color Arcs */}
          <svg
            aria-hidden="true"
            viewBox="0 0 120 120"
            className="absolute inset-2 h-28 w-28 compillo-studio-ring-ccw"
          >
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeDasharray="46 268"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#ec4899"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeDasharray="46 268"
              strokeDashoffset="-105"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeDasharray="46 268"
              strokeDashoffset="-210"
            />
          </svg>

          {/* Elevated Emblem Tile */}
          <div
            className="relative flex h-[74px] w-[74px] items-center justify-center rounded-2xl border shadow-2xl backdrop-blur-xl"
            style={{
              backgroundColor: cardBg,
              borderColor: isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.18)',
            }}
          >
            <img
              src="/compillo-logo.png"
              alt="Compillo Studio"
              referrerPolicy="no-referrer"
              className="relative z-10 h-10 w-10 object-contain"
            />
          </div>
        </div>

        {/* Chromatic Wordmark & Kinetic Spectrum Bars */}
        <div className="mt-7 space-y-2.5">
          <h2 className="font-compillo-display text-2xl font-bold tracking-tight sm:text-[30px]">
            <span style={{ color: fgPrimary }}>Compillo </span>
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(120deg, #22d3ee 0%, #6366f1 32%, #ec4899 66%, #f59e0b 100%)',
              }}
            >
              Studio
            </span>
          </h2>

          {/* Colorful Equalizer Wave + Milestone Status */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-end gap-1 h-4" aria-hidden="true">
              {SPECTRUM_BARS.map((bar) => (
                <span
                  key={bar.color}
                  className="w-[3px] h-4 rounded-full compillo-prism-bar"
                  style={{
                    backgroundColor: bar.color,
                    animationDelay: bar.delay,
                  }}
                />
              ))}
            </div>
            <p
              key={currentPhase.label}
              className="font-compillo-mono text-xs font-medium tracking-wide compillo-studio-status-in"
              style={{ color: fgMuted }}
            >
              {currentPhase.label}
            </p>
          </div>
        </div>

        {/* Vivid Spectrum Progress Bar (Compositor scaleX) */}
        <div className="mt-7 w-64 sm:w-72 space-y-2">
          <div
            className="relative h-1.5 w-full overflow-hidden rounded-full"
            style={{
              backgroundColor: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.1)',
            }}
          >
            <div
              className="relative h-full w-full origin-left overflow-hidden rounded-full transition-transform duration-300 ease-out"
              style={{
                background:
                  'linear-gradient(90deg, #22d3ee 0%, #3b82f6 25%, #a855f7 50%, #ec4899 75%, #f59e0b 100%)',
                transform: `scaleX(${currentPhase.progress})`,
              }}
            >
              <div
                className="absolute inset-y-0 left-0 w-1/2 compillo-prism-shimmer"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)',
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between font-compillo-mono text-[11px]" style={{ color: fgMuted }}>
            <span>Workspace</span>
            <span className="tabular-nums font-semibold" style={{ color: fgPrimary }}>
              {currentPhase.percent}
            </span>
          </div>
        </div>
      </div>

      {/* Skip Action */}
      <button
        type="button"
        onClick={() => finishLoading(false)}
        className="font-compillo-mono relative z-10 mt-9 cursor-pointer rounded-md border px-3.5 py-1.5 text-[11px] font-medium backdrop-blur-md transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a855f7]"
        style={{
          borderColor: isLight ? 'rgba(15,23,42,0.14)' : 'rgba(255,255,255,0.16)',
          backgroundColor: isLight ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.06)',
          color: fgPrimary,
        }}
      >
        Skip animation
      </button>
    </div>
  );
};
