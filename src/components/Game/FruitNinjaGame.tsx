import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, Trophy } from 'lucide-react';
import { gameSound } from '../../services/gameSoundService';

type FruitKind = 'watermelon' | 'orange' | 'lemon' | 'apple' | 'strawberry' | 'kiwi';

interface FruitEntity {
  id: number;
  kind: FruitKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isBomb: boolean;
  sliced: boolean;
  rotation: number;
  vRot: number;
}

interface SlicedHalf {
  kind: FruitKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  vRot: number;
  side: -1 | 1;
}

interface JuiceParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
}

interface SplatMark {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

interface BladePoint {
  x: number;
  y: number;
  age: number;
}

const FRUIT_SPECS: Record<
  FruitKind,
  { rind: string; pith: string; flesh: string; juice: string; radius: number }
> = {
  watermelon: { rind: '#15803d', pith: '#dcfce7', flesh: '#ef4444', juice: '#f87171', radius: 34 },
  orange: { rind: '#ea580c', pith: '#ffedd5', flesh: '#fb923c', juice: '#fdba74', radius: 27 },
  lemon: { rind: '#ca8a04', pith: '#fef9c3', flesh: '#facc15', juice: '#fef08a', radius: 25 },
  apple: { rind: '#dc2626', pith: '#fef2f2', flesh: '#fef9c3', juice: '#bef264', radius: 27 },
  strawberry: { rind: '#be123c', pith: '#ffe4e6', flesh: '#fb7185', juice: '#fda4af', radius: 24 },
  kiwi: { rind: '#78350f', pith: '#ecfccb', flesh: '#84cc16', juice: '#d9f99d', radius: 25 },
};

function playSliceSound(isCombo = false) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isCombo ? 520 : 380, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.11);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // ignore audio context restrictions
  }
}

const FRUIT_KINDS: FruitKind[] = [
  'watermelon',
  'orange',
  'lemon',
  'apple',
  'strawberry',
  'kiwi',
];

function drawFruit(
  ctx: CanvasRenderingContext2D,
  kind: FruitKind,
  radius: number,
  isBomb: boolean,
  halfSide?: -1 | 1
) {
  if (isBomb) {
    // Bomb body
    const grad = ctx.createRadialGradient(-6, -6, 4, 0, 0, radius);
    grad.addColorStop(0, '#475569');
    grad.addColorStop(0.6, '#1e293b');
    grad.addColorStop(1, '#090d16');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Red danger X
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.lineTo(8, 8);
    ctx.moveTo(8, -8);
    ctx.lineTo(-8, 8);
    ctx.stroke();

    // Fuse
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.quadraticCurveTo(8, -radius - 10, 14, -radius - 8);
    ctx.stroke();

    // Spark
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(15, -radius - 8, 4 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const spec = FRUIT_SPECS[kind];
  const startAngle = halfSide === -1 ? Math.PI * 0.5 : halfSide === 1 ? -Math.PI * 0.5 : 0;
  const endAngle = halfSide === -1 ? Math.PI * 1.5 : halfSide === 1 ? Math.PI * 0.5 : Math.PI * 2;

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.arc(4, 6, radius, startAngle, endAngle);
  if (halfSide) ctx.closePath();
  ctx.fill();

  // Outer rind
  ctx.fillStyle = spec.rind;
  ctx.beginPath();
  ctx.arc(0, 0, radius, startAngle, endAngle);
  if (halfSide) ctx.closePath();
  ctx.fill();

  // Pith ring
  ctx.fillStyle = spec.pith;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.88, startAngle, endAngle);
  if (halfSide) ctx.closePath();
  ctx.fill();

  // Inner flesh
  ctx.fillStyle = spec.flesh;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.8, startAngle, endAngle);
  if (halfSide) ctx.closePath();
  ctx.fill();

  // Specular highlight
  if (!halfSide) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.beginPath();
    ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  // Seeds / details
  ctx.fillStyle = kind === 'kiwi' ? '#1a2e05' : '#1f2937';
  const seedCount = halfSide ? 3 : 6;
  for (let i = 0; i < seedCount; i++) {
    const a = startAngle + ((endAngle - startAngle) * (i + 0.5)) / seedCount;
    const sx = Math.cos(a) * radius * 0.48;
    const sy = Math.sin(a) * radius * 0.48;
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const FruitNinjaGame: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('compillo_fruit_ninja_high') || 0);
    } catch {
      return 0;
    }
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fruitsRef = useRef<FruitEntity[]>([]);
  const halvesRef = useRef<SlicedHalf[]>([]);
  const particlesRef = useRef<JuiceParticle[]>([]);
  const splatsRef = useRef<SplatMark[]>([]);
  const textsRef = useRef<FloatingText[]>([]);
  const bladeRef = useRef<BladePoint[]>([]);
  const isPointerDownRef = useRef(false);
  const comboCountRef = useRef(0);
  const comboTimerRef = useRef<any>(null);
  const flashAlphaRef = useRef(0);
  const nextIdRef = useRef(1);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);

  const startGame = useCallback(() => {
    fruitsRef.current = [];
    halvesRef.current = [];
    particlesRef.current = [];
    splatsRef.current = [];
    textsRef.current = [];
    bladeRef.current = [];
    comboCountRef.current = 0;
    flashAlphaRef.current = 0;
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    setIsGameOver(false);
    setIsPlaying(true);
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      try {
        localStorage.setItem('compillo_fruit_ninja_high', String(score));
      } catch {}
    }
  }, [score, highScore]);

  useEffect(() => {
    if (!isPlaying || isGameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      if (!canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const spawnWave = () => {
      const w = canvas.width || 600;
      const h = canvas.height || 400;
      const count = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const isBomb = Math.random() < 0.16;
        const kind = FRUIT_KINDS[Math.floor(Math.random() * FRUIT_KINDS.length)];
        const spec = FRUIT_SPECS[kind];
        const x = 60 + Math.random() * Math.max(100, w - 120);
        const vx = (w / 2 - x) * (0.004 + Math.random() * 0.004);
        const vy = -Math.sqrt(2 * 0.26 * (h * (0.68 + Math.random() * 0.2)));
        fruitsRef.current.push({
          id: nextIdRef.current++,
          kind,
          x,
          y: h + 40 + i * 25,
          vx,
          vy,
          radius: isBomb ? 26 : spec.radius,
          isBomb,
          sliced: false,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.1,
        });
      }
    };

    spawnWave();
    const spawnInterval = setInterval(spawnWave, 1500);

    let animId: number;
    const loop = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Wooden dojo background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#29170b');
      bgGrad.addColorStop(0.5, '#3b2110');
      bgGrad.addColorStop(1, '#1f1108');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle wood planks
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 2;
      for (let py = 60; py < h; py += 60) {
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(w, py);
        ctx.stroke();
      }

      // Draw fading juice splats on board
      splatsRef.current = splatsRef.current
        .map((s) => ({ ...s, alpha: s.alpha - 0.003 }))
        .filter((s) => s.alpha > 0);
      for (const s of splatsRef.current) {
        ctx.save();
        ctx.globalAlpha = s.alpha * 0.45;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Update & draw whole fruits
      const nextFruits: FruitEntity[] = [];
      for (const f of fruitsRef.current) {
        f.x += f.vx;
        f.y += f.vy;
        f.vy += 0.26;
        f.rotation += f.vRot;

        if (f.y > h + 70) {
          if (!f.sliced && !f.isBomb) {
            livesRef.current -= 1;
            setLives(livesRef.current);
            textsRef.current.push({
              x: Math.min(w - 50, Math.max(50, f.x)),
              y: h - 30,
              text: 'MISSED!',
              color: '#f87171',
              alpha: 1,
              vy: -1.5,
            });
            if (livesRef.current <= 0) {
              setIsGameOver(true);
              setIsPlaying(false);
              gameSound.playGameOver();
              return;
            }
          }
          continue;
        }

        if (!f.sliced) {
          ctx.save();
          ctx.translate(f.x, f.y);
          ctx.rotate(f.rotation);
          drawFruit(ctx, f.kind, f.radius, f.isBomb);
          ctx.restore();
          nextFruits.push(f);
        }
      }
      fruitsRef.current = nextFruits;

      // Update & draw sliced halves
      const nextHalves: SlicedHalf[] = [];
      for (const half of halvesRef.current) {
        half.x += half.vx;
        half.y += half.vy;
        half.vy += 0.28;
        half.rotation += half.vRot;
        if (half.y < h + 80) {
          ctx.save();
          ctx.translate(half.x, half.y);
          ctx.rotate(half.rotation);
          drawFruit(ctx, half.kind, half.radius, false, half.side);
          ctx.restore();
          nextHalves.push(half);
        }
      }
      halvesRef.current = nextHalves;

      // Update & draw juice particles
      const nextParticles: JuiceParticle[] = [];
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18;
        p.alpha -= 0.025;
        if (p.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          nextParticles.push(p);
        }
      }
      particlesRef.current = nextParticles;

      // Update & draw floating combo/score texts
      const nextTexts: FloatingText[] = [];
      for (const t of textsRef.current) {
        t.y += t.vy;
        t.alpha -= 0.02;
        if (t.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = t.alpha;
          ctx.font = 'bold 16px sans-serif';
          ctx.fillStyle = t.color;
          ctx.textAlign = 'center';
          ctx.fillText(t.text, t.x, t.y);
          ctx.restore();
          nextTexts.push(t);
        }
      }
      textsRef.current = nextTexts;

      // Draw katana blade trail
      bladeRef.current = bladeRef.current
        .map((p) => ({ ...p, age: p.age + 1 }))
        .filter((p) => p.age < 10);

      if (bladeRef.current.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 1; i < bladeRef.current.length; i++) {
          const p0 = bladeRef.current[i - 1];
          const p1 = bladeRef.current[i];
          const ratio = 1 - p1.age / 10;
          ctx.strokeStyle = `rgba(56, 189, 248, ${ratio * 0.6})`;
          ctx.lineWidth = Math.max(2, ratio * 12);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();

          ctx.strokeStyle = `rgba(255, 255, 255, ${ratio})`;
          ctx.lineWidth = Math.max(1, ratio * 5);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (flashAlphaRef.current > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlphaRef.current})`;
        ctx.fillRect(0, 0, w, h);
        flashAlphaRef.current = Math.max(0, flashAlphaRef.current - 0.08);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(spawnInterval);
      window.removeEventListener('resize', resize);
    };
  }, [isPlaying, isGameOver]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPlaying || isGameOver) return;
    if (!isPointerDownRef.current && e.pointerType === 'mouse') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const prevPoint = bladeRef.current[bladeRef.current.length - 1];
    const sliceAngle = prevPoint
      ? Math.atan2(y - prevPoint.y, x - prevPoint.x)
      : 0;

    bladeRef.current.push({ x, y, age: 0 });

    for (const f of fruitsRef.current) {
      if (f.sliced) continue;
      const dist = Math.hypot(f.x - x, f.y - y);
      if (dist <= f.radius + 10) {
        f.sliced = true;
        if (f.isBomb) {
          flashAlphaRef.current = 0.9;
          setIsGameOver(true);
          setIsPlaying(false);
          gameSound.playGameOver();
          return;
        }

        playSliceSound(comboCountRef.current >= 2);
        const spec = FRUIT_SPECS[f.kind];
        const perpX = -Math.sin(sliceAngle) * 2.6;
        const perpY = Math.cos(sliceAngle) * 2.6;

        // Spawn 2 physical halves along the exact slice angle
        halvesRef.current.push(
          {
            kind: f.kind,
            x: f.x - perpX * 2,
            y: f.y - perpY * 2,
            vx: f.vx - perpX,
            vy: f.vy - perpY - 0.8,
            radius: f.radius,
            rotation: sliceAngle,
            vRot: -0.08,
            side: -1,
          },
          {
            kind: f.kind,
            x: f.x + perpX * 2,
            y: f.y + perpY * 2,
            vx: f.vx + perpX,
            vy: f.vy + perpY - 0.8,
            radius: f.radius,
            rotation: sliceAngle,
            vRot: 0.08,
            side: 1,
          }
        );

        // Spawn juice droplets
        for (let i = 0; i < 12; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.5 + Math.random() * 4.5;
          particlesRef.current.push({
            x: f.x,
            y: f.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 2 + Math.random() * 3.5,
            color: spec.juice,
            alpha: 1,
          });
        }

        // Add board splat
        splatsRef.current.push({
          x: f.x,
          y: f.y,
          radius: f.radius * 0.9,
          color: spec.juice,
          alpha: 0.85,
        });

        // Combo tracking
        comboCountRef.current += 1;
        if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
        comboTimerRef.current = setTimeout(() => {
          if (comboCountRef.current >= 3) {
            const bonus = comboCountRef.current;
            scoreRef.current += bonus;
            setScore(scoreRef.current);
            textsRef.current.push({
              x,
              y: y - 20,
              text: `${comboCountRef.current} FRUIT COMBO! +${bonus}`,
              color: '#fde047',
              alpha: 1,
              vy: -1.8,
            });
          }
          comboCountRef.current = 0;
        }, 220);

        scoreRef.current += 10;
        setScore(scoreRef.current);
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#1f1108] text-white select-none overflow-hidden">
      {/* HUD */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#140b05] border-b border-white/10 text-xs">
        <div className="flex items-center gap-4">
          <span className="font-bold text-rose-400 flex items-center gap-1.5">
            🍉 Fruit Ninja
          </span>
          <span className="font-mono tabular-nums">
            Score: <strong className="text-emerald-400">{score}</strong>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono tabular-nums text-rose-400">
            {'♥'.repeat(lives)}{'♡'.repeat(Math.max(0, 3 - lives))}
          </span>
          <span className="font-mono tabular-nums text-sky-400 flex items-center gap-1">
            <Trophy size={12} /> {highScore}
          </span>
        </div>
      </div>

      {/* Canvas Arena */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={() => {
            isPointerDownRef.current = true;
          }}
          onPointerUp={() => {
            isPointerDownRef.current = false;
          }}
          onPointerLeave={() => {
            isPointerDownRef.current = false;
          }}
          onPointerMove={handlePointerMove}
          className="w-full h-full block touch-none cursor-crosshair"
        />

        {!isPlaying && !isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/55 backdrop-blur-sm z-10 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-2xl">
              🍉
            </div>
            <div>
              <h3 className="text-lg font-bold">Fruit Ninja</h3>
              <p className="text-xs text-gray-300 max-w-xs mt-1">
                Click and drag (or swipe) to slice flying fruits into halves. Chain 3+ slices for combos, and avoid bombs!
              </p>
            </div>
            <button
              onClick={startGame}
              className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center gap-2 transition-colors"
            >
              <Play size={14} /> Start Slicing
            </button>
          </div>
        )}

        {isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/75 backdrop-blur-sm z-10 space-y-4">
            <h3 className="text-xl font-bold text-rose-400">Game Over!</h3>
            <p className="text-sm font-mono">
              Score: <strong className="text-emerald-400">{score}</strong> · Best: <strong>{highScore}</strong>
            </p>
            <button
              onClick={startGame}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-2 transition-colors"
            >
              <RotateCcw size={14} /> Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
