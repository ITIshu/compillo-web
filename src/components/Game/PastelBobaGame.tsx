import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Sparkles,
  Heart,
  Trophy,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Clock,
  Zap,
  Sliders,
  CheckCircle2,
  Star,
  ChevronRight,
  ArrowRight,
  Gift,
} from 'lucide-react';
import { CompilloThemeDefinition } from '../../services/themes';
import { engagementService } from '../../services/engagementService';
import { gameSound } from '../../services/gameSoundService';

interface PastelBobaGameProps {
  currentTheme: CompilloThemeDefinition;
  onOpenMasterPanel?: () => void;
  onClose?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type?: 'heart' | 'star' | 'circle' | 'sparkle';
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  scale: number;
}

interface FallingItem {
  id: number;
  x: number;
  y: number;
  vy: number;
  vx: number;
  radius: number;
  emoji: string;
  label: string;
  type: 'candy' | 'boba' | 'strawberry' | 'heart' | 'star' | 'rainbow' | 'hazard';
  points: number;
  color: string;
  glowColor: string;
  rotation: number;
  rotSpeed: number;
  collected?: boolean;
}

const PASTEL_LEVELS = [
  {
    level: 1,
    name: 'Level 1: Cotton Candy Meadow',
    theme: 'Pastel Cloud Pink',
    targetScore: 500,
    itemSpeed: 2.2,
    spawnRate: 45,
    bgGradient: ['#fff0f5', '#ffd1dc', '#ffe4e1'],
    accentColor: '#ff80bf',
    basketColor: '#ff66b2',
    cloudColor: 'rgba(255, 255, 255, 0.85)',
  },
  {
    level: 2,
    name: 'Level 2: Strawberry Boba Cafe',
    theme: 'Peach & Boba Tea',
    targetScore: 1200,
    itemSpeed: 2.8,
    spawnRate: 40,
    bgGradient: ['#fff5eb', '#ffe0cc', '#ffd6ba'],
    accentColor: '#ff9966',
    basketColor: '#ff7733',
    cloudColor: 'rgba(255, 250, 240, 0.85)',
  },
  {
    level: 3,
    name: 'Level 3: Mint Melody Lagoon',
    theme: 'Pastel Mint & Ocean',
    targetScore: 2100,
    itemSpeed: 3.4,
    spawnRate: 35,
    bgGradient: ['#f0fff4', '#c6f6d5', '#b2f5ea'],
    accentColor: '#38b2ac',
    basketColor: '#319795',
    cloudColor: 'rgba(240, 255, 250, 0.85)',
  },
  {
    level: 4,
    name: 'Level 4: Lavender Starlight Sky',
    theme: 'Lilac & Star Dust',
    targetScore: 3200,
    itemSpeed: 4.0,
    spawnRate: 30,
    bgGradient: ['#faf5ff', '#e9d8fd', '#d6bcfa'],
    accentColor: '#9f7aea',
    basketColor: '#805ad5',
    cloudColor: 'rgba(250, 245, 255, 0.85)',
  },
  {
    level: 5,
    name: 'Level 5: Rainbow Sweet Castle',
    theme: 'Pastel Rainbow Dream',
    targetScore: 4600,
    itemSpeed: 4.6,
    spawnRate: 26,
    bgGradient: ['#ffe6f0', '#e6f7ff', '#fffde6'],
    accentColor: '#ec4899',
    basketColor: '#db2777',
    cloudColor: 'rgba(255, 255, 255, 0.95)',
  },
];

export const PastelBobaGame: React.FC<PastelBobaGameProps> = ({
  currentTheme,
  onOpenMasterPanel,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // High score & settings
  const [personalBest, setPersonalBest] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('compillo_pastel_high_score') || '0', 10);
    } catch {
      return 0;
    }
  });

  const [score, setScore] = useState(0);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [lives, setLives] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [combo, setCombo] = useState(0);
  const [isSugarRush, setIsSugarRush] = useState(false);
  const [sugarRushSeconds, setSugarRushSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(() => gameSound.isMuted());
  const [sessionCompletedModal, setSessionCompletedModal] = useState(false);
  const [levelClearModal, setLevelClearModal] = useState(false);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Real-time animation physics reference
  const stateRef = useRef({
    basketX: 300,
    basketTargetX: 300,
    basketY: 410,
    basketWidth: 84,
    basketHeight: 46,
    bunnyBlink: 0,
    bunnyEarWiggle: 0,
    items: [] as FallingItem[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    clouds: [] as Array<{ x: number; y: number; size: number; speed: number }>,
    stars: [] as Array<{ x: number; y: number; radius: number; alpha: number; twinkle: number }>,
    nextItemId: 1,
    spawnCounter: 0,
    sugarRushTicks: 0,
    comboStreak: 0,
    runningScore: 0,
    lives: 3,
    levelIdx: 0,
    animationFrameId: 0,
    keys: { left: false, right: false },
  });

  // Keep engagement session subscription clean and stable
  useEffect(() => {
    return engagementService.subscribe((st) => {
      setPersonalBest((prev) => Math.max(prev, st.highScore));
      if (st.gameSessionSecondsLeft <= 0 && isPlayingRef.current && !st.config.devUnlockOverride) {
        setIsPlaying(false);
        setSessionCompletedModal(true);
        engagementService.pauseGameSession();
      }
    });
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Start new game session
  const handleStartGame = useCallback(() => {
    const s = stateRef.current;
    s.items = [];
    s.particles = [];
    s.floatingTexts = [];
    s.runningScore = 0;
    s.lives = 3;
    s.comboStreak = 0;
    s.sugarRushTicks = 0;
    s.levelIdx = 0;
    s.basketX = 300;
    s.basketTargetX = 300;

    // Initialize decorative clouds and background twinkling stars
    s.clouds = Array.from({ length: 6 }).map((_, i) => ({
      x: i * 120 + Math.random() * 40,
      y: 30 + Math.random() * 80,
      size: 35 + Math.random() * 25,
      speed: 0.3 + Math.random() * 0.4,
    }));

    s.stars = Array.from({ length: 25 }).map(() => ({
      x: Math.random() * 600,
      y: Math.random() * 480,
      radius: 1 + Math.random() * 2.5,
      alpha: 0.3 + Math.random() * 0.7,
      twinkle: Math.random() * Math.PI * 2,
    }));

    setScore(0);
    setLives(3);
    setCurrentLevelIdx(0);
    setCombo(0);
    setIsSugarRush(false);
    setSugarRushSeconds(0);
    setGameOver(false);
    setGameWon(false);
    setLevelClearModal(false);
    setIsPaused(false);
    setIsPlaying(true);

    engagementService.startGameSession();
    gameSound.playSugarRush();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        stateRef.current.keys.left = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        stateRef.current.keys.right = true;
      }
      if (e.key === 'p' || e.key === 'P') {
        setIsPaused((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        stateRef.current.keys.left = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        stateRef.current.keys.right = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse / Touch Dragging on Canvas
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    stateRef.current.basketTargetX = Math.max(45, Math.min(canvas.width - 45, mouseX));
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !e.touches[0]) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const touchX = (e.touches[0].clientX - rect.left) * scaleX;
    stateRef.current.basketTargetX = Math.max(45, Math.min(canvas.width - 45, touchX));
  };

  // Main Game Physics & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const spawnItem = (levelIdx: number) => {
      const s = stateRef.current;
      const level = PASTEL_LEVELS[levelIdx] || PASTEL_LEVELS[0];
      const roll = Math.random();

      let type: FallingItem['type'] = 'candy';
      let emoji = '🍬';
      let label = 'Candy Gem';
      let points = 50;
      let color = '#ff66b2';
      let glowColor = 'rgba(255, 102, 178, 0.4)';

      if (roll < 0.28) {
        type = 'boba';
        emoji = '🧋';
        label = 'Boba Milk Tea';
        points = 80;
        color = '#d97706';
        glowColor = 'rgba(217, 119, 6, 0.4)';
      } else if (roll < 0.52) {
        type = 'strawberry';
        emoji = '🍓';
        label = 'Sweet Strawberry';
        points = 100;
        color = '#ef4444';
        glowColor = 'rgba(239, 68, 68, 0.4)';
      } else if (roll < 0.68) {
        type = 'star';
        emoji = '⭐';
        label = 'Starlight Star';
        points = 150;
        color = '#f59e0b';
        glowColor = 'rgba(245, 158, 11, 0.5)';
      } else if (roll < 0.8) {
        type = 'rainbow';
        emoji = '🌈';
        label = 'Rainbow Macaron';
        points = 250;
        color = '#8b5cf6';
        glowColor = 'rgba(139, 92, 246, 0.5)';
      } else if (roll < 0.88) {
        // Heart recovery
        type = 'heart';
        emoji = '💖';
        label = 'Sweet Heart';
        points = 120;
        color = '#ec4899';
        glowColor = 'rgba(236, 72, 153, 0.6)';
      } else {
        // Hazard: Grumpy Raincloud / Gloom drop
        type = 'hazard';
        emoji = '☁️';
        label = 'Gloom Cloud';
        points = -50;
        color = '#64748b';
        glowColor = 'rgba(100, 116, 139, 0.4)';
      }

      const itemX = 30 + Math.random() * (canvas.width - 60);
      const vy = level.itemSpeed * (0.8 + Math.random() * 0.4);
      const vx = (Math.random() - 0.5) * 0.8;

      s.items.push({
        id: s.nextItemId++,
        x: itemX,
        y: -25,
        vx,
        vy,
        radius: 18,
        emoji,
        label,
        type,
        points,
        color,
        glowColor,
        rotation: 0,
        rotSpeed: (Math.random() - 0.5) * 0.04,
      });
    };

    const addSparks = (x: number, y: number, color: string, count = 12, type: Particle['type'] = 'sparkle') => {
      const s = stateRef.current;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3.5;
        s.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2.5 + Math.random() * 3.5,
          color,
          alpha: 1,
          life: 0,
          maxLife: 20 + Math.random() * 20,
          type,
        });
      }
    };

    const addFloatingText = (x: number, y: number, text: string, color: string) => {
      stateRef.current.floatingTexts.push({
        x,
        y,
        text,
        color,
        alpha: 1,
        vy: -1.6,
        scale: 1.2,
      });
    };

    const loop = () => {
      const s = stateRef.current;
      const currentLevel = PASTEL_LEVELS[s.levelIdx] || PASTEL_LEVELS[0];

      if (isPlayingRef.current && !isPaused) {
        // Keyboard motion
        const moveSpeed = 7.5;
        if (s.keys.left) {
          s.basketTargetX -= moveSpeed;
        }
        if (s.keys.right) {
          s.basketTargetX += moveSpeed;
        }

        // Clamp basket position
        s.basketTargetX = Math.max(50, Math.min(canvas.width - 50, s.basketTargetX));
        // Smooth easing glide
        s.basketX += (s.basketTargetX - s.basketX) * 0.25;

        // Sugar rush timer countdown
        if (s.sugarRushTicks > 0) {
          s.sugarRushTicks -= 1;
          setSugarRushSeconds(Math.ceil(s.sugarRushTicks / 60));
          if (s.sugarRushTicks <= 0) {
            setIsSugarRush(false);
          }
        }

        // Spawn items
        s.spawnCounter += 1;
        const targetRate = isSugarRush ? Math.floor(currentLevel.spawnRate * 0.6) : currentLevel.spawnRate;
        if (s.spawnCounter >= targetRate) {
          s.spawnCounter = 0;
          spawnItem(s.levelIdx);
        }

        // Update clouds
        s.clouds.forEach((cloud) => {
          cloud.x += cloud.speed;
          if (cloud.x > canvas.width + 60) {
            cloud.x = -60;
            cloud.y = 20 + Math.random() * 90;
          }
        });

        // Update items & catch collision
        const basketY = s.basketY;
        const basketLeft = s.basketX - s.basketWidth / 2;
        const basketRight = s.basketX + s.basketWidth / 2;

        for (let i = s.items.length - 1; i >= 0; i--) {
          const item = s.items[i];
          item.x += item.vx;
          item.y += isSugarRush ? item.vy * 1.3 : item.vy;
          item.rotation += item.rotSpeed;

          // Sugar rush magnet effect: treats curve toward basket!
          if (isSugarRush && item.type !== 'hazard') {
            const dx = s.basketX - item.x;
            item.x += dx * 0.05;
          }

          // Check catch collision with basket top
          const isCaught =
            item.y + item.radius >= basketY &&
            item.y - item.radius <= basketY + 25 &&
            item.x >= basketLeft - 10 &&
            item.x <= basketRight + 10;

          if (isCaught) {
            if (item.type === 'hazard') {
              // Hit hazard
              s.lives -= 1;
              s.comboStreak = 0;
              setCombo(0);
              setLives(s.lives);
              gameSound.playHit();
              addSparks(item.x, item.y, '#94a3b8', 15);
              addFloatingText(item.x, item.y - 20, '-1 Heart!', '#f43f5e');

              if (s.lives <= 0) {
                setGameOver(true);
                setIsPlaying(false);
                gameSound.playGameOver();
                engagementService.recordScore(s.runningScore, s.levelIdx + 1);
              }
            } else {
              // Caught sweet treat!
              s.comboStreak += 1;
              const comboBonus = Math.min(5, s.comboStreak);
              const multiplier = isSugarRush ? comboBonus * 2 : comboBonus;
              const earned = item.points * multiplier;

              s.runningScore += earned;
              setScore(s.runningScore);
              setCombo(comboBonus);

              // Sound effects
              if (item.type === 'heart') {
                s.lives = Math.min(3, s.lives + 1);
                setLives(s.lives);
                gameSound.playHeartCollect();
                addSparks(item.x, item.y, '#ec4899', 18, 'heart');
                addFloatingText(item.x, item.y - 20, '+1 Heart 💖', '#ec4899');
              } else if (item.type === 'rainbow') {
                s.sugarRushTicks = 60 * 6; // 6 seconds of Sugar Rush
                setIsSugarRush(true);
                gameSound.playSugarRush();
                addSparks(item.x, item.y, '#8b5cf6', 25, 'star');
                addFloatingText(item.x, item.y - 20, '✨ SUGAR RUSH! ✨', '#a855f7');
              } else {
                gameSound.playBubblePop();
                gameSound.playSweetCombo(comboBonus);
                addSparks(item.x, item.y, item.color, 12, 'circle');
                const label = comboBonus > 1 ? `+${earned} (${comboBonus}x)` : `+${earned}`;
                addFloatingText(item.x, item.y - 20, label, item.color);
              }

              // Check level progression
              if (s.runningScore >= currentLevel.targetScore) {
                if (s.levelIdx < PASTEL_LEVELS.length - 1) {
                  s.levelIdx += 1;
                  setCurrentLevelIdx(s.levelIdx);
                  setLevelClearModal(true);
                  setIsPlaying(false);
                  gameSound.playLevelClear();
                  engagementService.recordScore(s.runningScore, s.levelIdx + 1);
                } else {
                  // Game won!
                  setGameWon(true);
                  setIsPlaying(false);
                  gameSound.playLevelClear();
                  engagementService.recordScore(s.runningScore, 5);
                }
              }

              // Update personal best
              if (s.runningScore > personalBest) {
                setPersonalBest(s.runningScore);
                try {
                  localStorage.setItem('compillo_pastel_high_score', String(s.runningScore));
                } catch {}
              }
            }

            s.items.splice(i, 1);
            continue;
          }

          // Off bottom of screen
          if (item.y > canvas.height + 30) {
            // Missing a heart or candy resets combo
            if (item.type !== 'hazard') {
              if (s.comboStreak > 1) {
                s.comboStreak = 0;
                setCombo(0);
              }
            }
            s.items.splice(i, 1);
          }
        }

        // Update particles
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05; // slight gravity
          p.life += 1;
          p.alpha = 1 - p.life / p.maxLife;
          if (p.life >= p.maxLife) {
            s.particles.splice(i, 1);
          }
        }

        // Update floating text
        for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
          const ft = s.floatingTexts[i];
          ft.y += ft.vy;
          ft.alpha -= 0.025;
          if (ft.alpha <= 0) {
            s.floatingTexts.splice(i, 1);
          }
        }
      }

      // ----------------- RENDER CANVAS -----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background pastel gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, currentLevel.bgGradient[0]);
      bgGrad.addColorStop(0.5, currentLevel.bgGradient[1]);
      bgGrad.addColorStop(1, currentLevel.bgGradient[2]);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw gentle pastel twinkling stars
      s.stars.forEach((st) => {
        st.twinkle += 0.04;
        const currentAlpha = 0.2 + Math.sin(st.twinkle) * 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw floating fluffy clouds
      s.clouds.forEach((c) => {
        ctx.fillStyle = currentLevel.cloudColor;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 0.7, c.y - c.size * 0.3, c.size * 0.8, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 1.3, c.y, c.size * 0.7, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 0.6, c.y + c.size * 0.2, c.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ground grass / candy ribbon at bottom
      const groundGrad = ctx.createLinearGradient(0, canvas.height - 25, 0, canvas.height);
      groundGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      groundGrad.addColorStop(1, 'rgba(255, 255, 255, 0.75)');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, canvas.height - 25, canvas.width, 25);

      // Draw falling items with cute glow and emojis
      s.items.forEach((item) => {
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rotation);

        // Soft pastel glow aura
        ctx.fillStyle = item.glowColor;
        ctx.beginPath();
        ctx.arc(0, 0, item.radius + 6, 0, Math.PI * 2);
        ctx.fill();

        // Bubble capsule
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.beginPath();
        ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Draw emoji inside bubble
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.emoji, 0, 1);

        // Bubble highlight reflection
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(-item.radius * 0.35, -item.radius * 0.35, item.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // ----------------- DRAW CUTE BUNNY MASCOT & BASKET -----------------
      const bx = s.basketX;
      const by = s.basketY;

      // Sugar rush rainbow halo
      if (isSugarRush) {
        ctx.save();
        const rainbowGrad = ctx.createRadialGradient(bx, by, 10, bx, by, 75);
        rainbowGrad.addColorStop(0, 'rgba(255, 182, 193, 0.6)');
        rainbowGrad.addColorStop(0.5, 'rgba(186, 225, 255, 0.4)');
        rainbowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = rainbowGrad;
        ctx.beginPath();
        ctx.arc(bx, by, 75, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 1. Cute Bunny Head & Ears
      ctx.save();
      // Bunny Ears
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffd1dc';
      ctx.lineWidth = 3;

      // Left Ear
      ctx.beginPath();
      ctx.ellipse(bx - 14, by - 26, 7, 18, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Left Ear Inner Pink
      ctx.fillStyle = '#ffb6c1';
      ctx.beginPath();
      ctx.ellipse(bx - 14, by - 26, 4, 12, -0.15, 0, Math.PI * 2);
      ctx.fill();

      // Right Ear
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(bx + 14, by - 26, 7, 18, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Right Ear Inner Pink
      ctx.fillStyle = '#ffb6c1';
      ctx.beginPath();
      ctx.ellipse(bx + 14, by - 26, 4, 12, 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Bunny Head
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#fecdd3';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(bx, by - 8, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bunny Eyes
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.arc(bx - 7, by - 10, 2.5, 0, Math.PI * 2);
      ctx.arc(bx + 7, by - 10, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Eye Sparkle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx - 8, by - 11, 1, 0, Math.PI * 2);
      ctx.arc(bx + 6, by - 11, 1, 0, Math.PI * 2);
      ctx.fill();

      // Rosy Cheeks
      ctx.fillStyle = 'rgba(251, 113, 133, 0.45)';
      ctx.beginPath();
      ctx.arc(bx - 12, by - 5, 4.5, 0, Math.PI * 2);
      ctx.arc(bx + 12, by - 5, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Cute Nose & Mouth (✿◠‿◠)
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(bx, by - 6, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Little cute bow on head
      ctx.fillStyle = currentLevel.accentColor;
      ctx.beginPath();
      ctx.arc(bx - 12, by - 22, 5, 0, Math.PI * 2);
      ctx.arc(bx - 2, by - 22, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx - 7, by - 22, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 2. Pastel Ribbon Catch Basket
      const bw = s.basketWidth;
      const bh = s.basketHeight;

      // Basket glow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.roundRect(bx - bw / 2, by + 4, bw, bh * 0.6, 14);
      ctx.fill();

      // Basket rim
      ctx.fillStyle = currentLevel.basketColor;
      ctx.beginPath();
      ctx.roundRect(bx - bw / 2 - 4, by + 2, bw + 8, 8, 4);
      ctx.fill();

      // Basket weave pattern
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.35)';
      ctx.lineWidth = 1.8;
      for (let xOffset = -bw / 2 + 10; xOffset < bw / 2; xOffset += 12) {
        ctx.beginPath();
        ctx.moveTo(bx + xOffset, by + 10);
        ctx.lineTo(bx + xOffset, by + 28);
        ctx.stroke();
      }

      // Cute Ribbon Bow in Center of Basket
      ctx.fillStyle = currentLevel.accentColor;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎀', bx, by + 22);

      ctx.restore();

      // ----------------- DRAW SPARKLE PARTICLES -----------------
      s.particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;

        if (p.type === 'heart') {
          ctx.font = `${p.size * 3}px sans-serif`;
          ctx.fillText('💖', p.x, p.y);
        } else if (p.type === 'star') {
          ctx.font = `${p.size * 3}px sans-serif`;
          ctx.fillText('⭐', p.x, p.y);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // ----------------- DRAW FLOATING TEXT -----------------
      s.floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 15px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 6;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isPaused, personalBest, isSugarRush]);

  const levelInfo = PASTEL_LEVELS[currentLevelIdx] || PASTEL_LEVELS[0];

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-pink-50 via-purple-50 to-pink-100 text-gray-800 select-none overflow-y-auto">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/80 backdrop-blur-md border-b border-pink-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-400 to-rose-300 text-white flex items-center justify-center shadow-md shadow-pink-200">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-pink-700 flex items-center gap-2">
              <span>Pastel Star Bloom</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 text-pink-600 font-semibold border border-pink-300">
                Kawaii Arcade
              </span>
            </h1>
            <p className="text-[11px] text-pink-500/80">
              Catch sweet boba, strawberry mochi & glowing star gems!
            </p>
          </div>
        </div>

        {/* Right Header Stats & Controls */}
        <div className="flex items-center gap-2.5">
          {/* Sound Toggle */}
          <button
            onClick={() => {
              const muted = gameSound.toggleMute();
              setIsMuted(muted);
            }}
            className="p-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-600 transition-colors"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Master Panel */}
          {onOpenMasterPanel && (
            <button
              onClick={onOpenMasterPanel}
              className="px-2.5 py-1.5 rounded-xl bg-purple-100/70 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Open IDE Master Panel"
            >
              <Sliders size={13} />
              <span className="hidden sm:inline">Master Panel</span>
            </button>
          )}

          {/* Personal Best */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-bold">
            <Trophy size={14} className="text-amber-500" />
            <span>Best: {personalBest}</span>
          </div>
        </div>
      </div>

      {/* Main Game Screen */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 max-w-4xl mx-auto w-full">
        {/* Game Canvas Box */}
        <div className="relative w-full max-w-[620px] aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/90 bg-white">
          <canvas
            ref={canvasRef}
            width={600}
            height={460}
            onMouseMove={handleCanvasMouseMove}
            onTouchMove={handleCanvasTouchMove}
            className="w-full h-full cursor-grab active:cursor-grabbing block"
          />

          {/* In-Game Top HUD Overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            {/* Lives & Score */}
            <div className="flex items-center gap-2">
              {/* Lives */}
              <div className="flex items-center gap-1 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full shadow border border-pink-200 text-pink-500 text-xs font-bold">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart
                    key={i}
                    size={14}
                    className={i < lives ? 'fill-pink-500 text-pink-500' : 'text-gray-300'}
                  />
                ))}
              </div>

              {/* Score */}
              <div className="px-3.5 py-1 bg-white/90 backdrop-blur-sm rounded-full shadow border border-pink-200 text-pink-700 text-xs font-extrabold font-mono">
                {score} pts
              </div>
            </div>

            {/* Level & Combo Badge */}
            <div className="flex items-center gap-2">
              {isSugarRush && (
                <div className="px-3 py-1 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 text-white rounded-full shadow-lg text-[11px] font-extrabold animate-pulse">
                  ⚡ SUGAR RUSH ({sugarRushSeconds}s)
                </div>
              )}

              {combo > 1 && (
                <div className="px-2.5 py-1 bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-full shadow text-[11px] font-extrabold animate-bounce">
                  {combo}x Sweet Combo!
                </div>
              )}

              <div className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full shadow border border-pink-200 text-purple-700 text-xs font-bold">
                {levelInfo.name}
              </div>
            </div>
          </div>

          {/* Level Progress Indicator */}
          <div className="absolute bottom-2.5 left-4 right-4 pointer-events-none">
            <div className="flex justify-between text-[10px] text-pink-800/80 font-bold mb-1">
              <span>Goal: {levelInfo.targetScore} pts</span>
              <span>{Math.min(100, Math.round((score / levelInfo.targetScore) * 100))}%</span>
            </div>
            <div className="w-full h-2 bg-pink-100/90 rounded-full overflow-hidden border border-pink-300">
              <div
                className="h-full bg-gradient-to-r from-pink-400 via-purple-400 to-rose-400 transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.round((score / levelInfo.targetScore) * 100))}%`,
                }}
              />
            </div>
          </div>

          {/* Start Screen Overlay */}
          {!isPlaying && !gameOver && !gameWon && !levelClearModal && (
            <div className="absolute inset-0 bg-pink-900/20 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="bg-white/95 rounded-3xl p-6 shadow-2xl border-2 border-pink-300 max-w-sm w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-pink-100 mx-auto flex items-center justify-center text-3xl shadow-inner border border-pink-300">
                  🐰
                </div>

                <div>
                  <h2 className="text-xl font-black text-pink-700">Pastel Star Bloom</h2>
                  <p className="text-xs text-pink-500 mt-1">
                    Slide your cute bunny to catch sweet treats & avoid rainclouds!
                  </p>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600 bg-pink-50/70 p-3 rounded-2xl border border-pink-100">
                  <div className="flex items-center gap-1.5">
                    <span>🧋 Boba Tea</span>
                    <span className="font-bold text-pink-600">+80</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>🍓 Mochi</span>
                    <span className="font-bold text-pink-600">+100</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>💖 Heart</span>
                    <span className="font-bold text-pink-600">+Life</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>🌈 Macaron</span>
                    <span className="font-bold text-purple-600">Rush!</span>
                  </div>
                </div>

                <div className="text-[11px] text-gray-500">
                  Controls: <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded text-[10px]">Mouse Glide</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded text-[10px]">←</kbd> <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded text-[10px]">→</kbd>
                </div>

                <button
                  onClick={handleStartGame}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-extrabold rounded-2xl shadow-lg shadow-pink-300 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Play size={18} />
                  <span>Start Kawaii Break</span>
                </button>
              </div>
            </div>
          )}

          {/* Game Over Screen */}
          {gameOver && (
            <div className="absolute inset-0 bg-pink-950/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="bg-white/95 rounded-3xl p-6 shadow-2xl border-2 border-rose-300 max-w-sm w-full space-y-4">
                <div className="text-4xl">🥺</div>
                <div>
                  <h3 className="text-lg font-black text-rose-600">Session Ended!</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    You caught so many sweet treats! Ready to try again?
                  </p>
                </div>

                <div className="bg-rose-50 rounded-2xl p-3 border border-rose-200">
                  <div className="text-2xl font-black text-rose-600 font-mono">{score} pts</div>
                  <div className="text-[11px] text-rose-400 font-medium">Final Score</div>
                </div>

                <button
                  onClick={handleStartGame}
                  className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold rounded-2xl shadow-md flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} />
                  <span>Play Again</span>
                </button>
              </div>
            </div>
          )}

          {/* Level Clear Modal */}
          {levelClearModal && (
            <div className="absolute inset-0 bg-purple-950/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="bg-white/95 rounded-3xl p-6 shadow-2xl border-2 border-purple-300 max-w-sm w-full space-y-4 animate-in zoom-in-95">
                <div className="text-4xl animate-bounce">🎉✨</div>
                <div>
                  <h3 className="text-lg font-black text-purple-700">Level Cleared!</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Splendid job! Up next: {PASTEL_LEVELS[currentLevelIdx]?.name}
                  </p>
                </div>

                <div className="bg-purple-50 rounded-2xl p-3 border border-purple-200">
                  <div className="text-2xl font-black text-purple-700 font-mono">{score} pts</div>
                  <div className="text-[11px] text-purple-500">Current Score</div>
                </div>

                <button
                  onClick={() => {
                    setLevelClearModal(false);
                    setIsPlaying(true);
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-2xl shadow-md flex items-center justify-center gap-2"
                >
                  <ArrowRight size={16} />
                  <span>Next Level</span>
                </button>
              </div>
            </div>
          )}

          {/* Game Won Finale */}
          {gameWon && (
            <div className="absolute inset-0 bg-pink-950/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="bg-white/95 rounded-3xl p-6 shadow-2xl border-2 border-yellow-300 max-w-sm w-full space-y-4">
                <div className="text-4xl">👑 💖 🌸</div>
                <div>
                  <h3 className="text-lg font-black text-pink-700">Sweet Castle Champion!</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    You conquered all 5 pastel dream levels with flying colors!
                  </p>
                </div>

                <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200">
                  <div className="text-3xl font-black text-amber-600 font-mono">{score} pts</div>
                  <div className="text-[11px] text-amber-600 font-bold">Arcade High Score!</div>
                </div>

                <button
                  onClick={handleStartGame}
                  className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-amber-500 text-white font-bold rounded-2xl shadow-md flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} />
                  <span>Play Victory Lap</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Quick Controls & Tips */}
        <div className="mt-3 w-full max-w-[620px] flex items-center justify-between px-2 text-xs text-pink-700 font-medium">
          <div className="flex items-center gap-2">
            <span>Guide bunny with mouse or keyboard</span>
            <span>•</span>
            <span className="text-pink-600 font-bold">Press P to pause</span>
          </div>

          {isPlaying && (
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="px-2.5 py-1 bg-white border border-pink-200 rounded-lg text-pink-600 hover:bg-pink-50 text-xs font-semibold flex items-center gap-1 shadow-sm"
            >
              {isPaused ? <Play size={12} /> : <Pause size={12} />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
