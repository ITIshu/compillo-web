import React, { useRef, useEffect, useState } from 'react';
import {
  Download,
  RotateCw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  X,
  Palette,
  Crosshair,
  Check,
  Sparkles,
  Info,
} from 'lucide-react';
import { cppGraphicsEngine, GraphicsCommand } from '../../services/cppGraphicsEngine';
import { VSCodeThemeDefinition } from '../../services/themes';

interface GraphicsWindowProps {
  currentTheme: VSCodeThemeDefinition;
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  width?: number;
  height?: number;
  commands: GraphicsCommand[];
  libraryType?: 'graphics.h' | 'opengl' | 'framebuffer';
  onReplay?: () => void;
}

export const GraphicsWindow: React.FC<GraphicsWindowProps> = ({
  currentTheme,
  isOpen,
  onClose,
  title = 'C/C++ Graphics Framebuffer Window',
  width = 640,
  height = 480,
  commands = [],
  libraryType = 'graphics.h',
  onReplay,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [copiedSnapshot, setCopiedSnapshot] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Render graphics commands onto canvas whenever commands, width, or height change
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    cppGraphicsEngine.renderToCanvas(canvasRef.current, commands, width, height);
  }, [isOpen, commands, width, height]);

  if (!isOpen) return null;

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const pixelX = Math.round(((e.clientX - rect.left) / rect.width) * width);
    const pixelY = Math.round(((e.clientY - rect.top) / rect.height) * height);
    setMousePos({ x: Math.max(0, Math.min(width, pixelX)), y: Math.max(0, Math.min(height, pixelY)) });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  const handleDownloadSnapshot = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_output.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setCopiedSnapshot(true);
    setTimeout(() => setCopiedSnapshot(false), 2000);
  };

  const isLight = currentTheme.type === 'light';

  return (
    <div
      className={`rounded-xl border shadow-2xl overflow-hidden flex flex-col font-mono text-[11px] transition-all select-none my-2.5 ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl max-w-none max-h-none' : 'w-full'
      } ${isLight ? 'bg-white border-gray-300 text-gray-800' : 'bg-[#181818] border-white/20 text-gray-200'}`}
    >
      {/* Framebuffer Window Title Bar */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b select-none ${
          isLight ? 'bg-gray-100 border-gray-200' : 'bg-[#222222] border-white/10'
        }`}
      >
        {/* Left: Window Title & Mode Badge */}
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-bold text-xs truncate text-white">{title}</span>
          <span
            className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 border ${
              libraryType === 'opengl'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {libraryType === 'opengl' ? 'OpenGL / GLUT' : 'Borland BGI <graphics.h>'}
          </span>
          <span className="text-[10px] opacity-60 hidden sm:inline">
            [{width}×{height}]
          </span>
        </div>

        {/* Right: Controls & Coordinate Inspector */}
        <div className="flex items-center gap-1.5 shrink-0">
          {mousePos && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 text-[10px] text-emerald-300 border border-white/10">
              <Crosshair size={11} />
              <span>
                X: {mousePos.x}, Y: {mousePos.y}
              </span>
            </div>
          )}

          {onReplay && (
            <button
              onClick={onReplay}
              title="Redraw / Replay Graphics Program"
              className="p-1 rounded hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            >
              <RotateCw size={13} />
            </button>
          )}

          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
            title="Zoom Out Canvas"
            className="p-1 rounded hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
          >
            <ZoomOut size={13} />
          </button>

          <button
            onClick={() => setScale((s) => Math.min(2.0, s + 0.1))}
            title="Zoom In Canvas"
            className="p-1 rounded hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
          >
            <ZoomIn size={13} />
          </button>

          <button
            onClick={handleDownloadSnapshot}
            title="Save Canvas Snapshot as PNG"
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white font-semibold text-[10.5px] transition-colors"
          >
            {copiedSnapshot ? <Check size={12} className="text-emerald-400" /> : <Download size={12} />}
            <span>{copiedSnapshot ? 'Saved' : 'Save PNG'}</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Restore Window' : 'Maximize Window'}
            className="p-1 rounded hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              title="Close Graphics Window"
              className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Framebuffer Canvas Viewport */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/60 min-h-[300px] relative">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out',
          }}
          className="shadow-2xl border border-white/20 rounded-md overflow-hidden bg-black"
        >
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="block cursor-crosshair bg-black"
            style={{
              maxWidth: '100%',
              height: 'auto',
              imageRendering: 'crisp-edges',
            }}
          />
        </div>
      </div>

      {/* Bottom Status Ribbon */}
      <div
        className={`flex items-center justify-between px-3 py-1 text-[10px] border-t select-none ${
          isLight ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-[#1b1b1b] border-white/5 text-gray-400'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <Sparkles size={11} />
            <span>Interactive Virtual Framebuffer</span>
          </span>
          <span>•</span>
          <span>{commands.length} primitives rendered</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Scale: {Math.round(scale * 100)}%</span>
          <span>•</span>
          <span className="text-gray-300 font-medium">Compillo Studio Engine</span>
        </div>
      </div>
    </div>
  );
};
