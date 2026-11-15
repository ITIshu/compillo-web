import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Gamepad2,
  Trophy,
  Heart,
  Sparkles,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Clock,
  Shield,
  Zap,
  ArrowRight,
  ChevronRight,
  Sliders,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { CompilloThemeDefinition } from '../../services/themes';
import { engagementService, EngagementState } from '../../services/engagementService';
import { gameSound } from '../../services/gameSoundService';

interface ByteRunnerGameProps {
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
}

interface Collectible {
  x: number;
  y: number;
  label: string;
  type: 'token' | 'star' | 'shield' | 'boost';
  points: number;
  color: string;
  collected: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  type: 'ground' | 'air';
}

const LEVEL_DATA = [
  {
    level: 1,
    name: 'Level 1: Syntax Garden',
    tech: 'HTML & CSS',
    targetScore: 400,
    speed: 3.2,
    bgColor: '#0d131f',
    gridColor: '#1e293b',
    accentColor: '#38bdf8',
    collectibles: ['<div>', '</>', '{ }', '#css', '.cls'],
    obstacles: ['BUG', '404', '; missing'],
  },
  {
    level: 2,
    name: 'Level 2: Logic Circuit',
    tech: 'JavaScript & TS',
    targetScore: 900,
    speed: 3.8,
    bgColor: '#161022',
    gridColor: '#2b1c47',
    accentColor: '#fbbf24',
    collectibles: ['async', 'await', '() =>', 'const', 'TS:type'],
    obstacles: ['NaN', 'NullPtr', 'Uncaught', 'Error'],
  },
  {
    level: 3,
    name: 'Level 3: Algorithm Warp',
    tech: 'Python & AI',
    targetScore: 1600,
    speed: 4.4,
    bgColor: '#081d19',
    gridColor: '#13352f',
    accentColor: '#34d399',
    collectibles: ['def', 'import', 'lambda', 'torch', 'model.fit'],
    obstacles: ['IndentationError', 'OOM', 'ZeroDiv'],
  },
  {
    level: 4,
    name: 'Level 4: Memory Matrix',
    tech: 'Rust & C++',
    targetScore: 2400,
    speed: 5.0,
    bgColor: '#1c0f16',
    gridColor: '#3b182b',
    accentColor: '#f43f5e',
    collectibles: ['*ptr', '&mut', 'cargo', 'impl', 'safe'],
    obstacles: ['SegFault', 'Panic!', 'Leak', 'Dangling'],
  },
  {
    level: 5,
    name: 'Level 5: Quantum Cloud',
    tech: 'Hyper Cloud Orbit',
    targetScore: 3500,
    speed: 5.6,
    bgColor: '#0c0a20',
    gridColor: '#231d54',
    accentColor: '#a855f7',
    collectibles: ['🐳 Pod', 'K8s', '⚡ Edge', 'Cloud', 'GraphQL'],
    obstacles: ['502 Bad Gateway', 'DDOS', 'Outage'],
  },
];

export const ByteRunnerGame: React.FC<ByteRunnerGameProps> = ({
  currentTheme,
  onOpenMasterPanel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engagement, setEngagement] = useState<EngagementState>(() =>
    engagementService.getState()
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [levelClear, setLevelClear] = useState(false);
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [lives, setLives] = useState(3);
  const [isMuted, setIsMuted] = useState(() => gameSound.isMuted());
  const [shieldActive, setShieldActive] = useState(false);
  const [sessionCompletedModal, setSessionCompletedModal] = useState(false);

  // High score tracking
  const [personalBest, setPersonalBest] = useState(() => engagement.highScore);

  const currentLevel = LEVEL_DATA[currentLevelIdx] || LEVEL_DATA[0];

  // Game internal physics refs
  const stateRef = useRef({
    player: {
      x: 70,
      y: 190,
      width: 28,
      height: 38,
      vy: 0,
      isGrounded: true,
      isSliding: false,
      jumpCount: 0,
      maxJumps: 2,
      invulnerableTimer: 0,
    },
    cameraX: 0,
    groundY: 230,
    collectibles: [] as Collectible[],
    obstacles: [] as Obstacle[],
    particles: [] as Particle[],
    lastObstacleSpawn: 0,
    lastCollectibleSpawn: 0,
    activeKeys: {
      left: false,
      right: false,
      jump: false,
      slide: false,
    },
    runningScore: 0,
    levelProgressScore: 0,
    animationFrameId: 0,
    lives: 3,
  });

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Subscribe to engagement service updates (game timer countdown)
  useEffect(() => {
    return engagementService.subscribe((st) => {
      setEngagement(st);
      setPersonalBest((prev) => Math.max(prev, st.highScore));
      // If game session seconds reaches 0, trigger time-out end of session
      if (st.gameSessionSecondsLeft <= 0 && isPlayingRef.current && !st.config.devUnlockOverride) {
        setIsPlaying(false);
        setSessionCompletedModal(true);
        engagementService.pauseGameSession();
        gameSound.playGameOver();
      }
    });
  }, []);

  // Format seconds to mm:ss
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStartGame = (startLevelIdx: number = 0) => {
    setCurrentLevelIdx(startLevelIdx);
    setScore(0);
    setCombo(1);
    setLives(3);
    setGameOver(false);
    setLevelClear(false);
    setIsPaused(false);
    setIsPlaying(true);
    setSessionCompletedModal(false);

    // Reset physics state
    const s = stateRef.current;
    s.player.x = 70;
    s.player.y = 190;
    s.player.vy = 0;
    s.player.isGrounded = true;
    s.player.isSliding = false;
    s.player.jumpCount = 0;
    s.player.invulnerableTimer = 0;
    s.collectibles = [];
    s.obstacles = [];
    s.particles = [];
    s.lastObstacleSpawn = 0;
    s.lastCollectibleSpawn = 0;
    s.runningScore = 0;
    s.levelProgressScore = 0;
    s.lives = 3;

    engagementService.startGameSession();
    gameSound.playPowerup();
  };

  const handleLevelClearNext = () => {
    setLevelClear(false);
    if (currentLevelIdx + 1 < LEVEL_DATA.length) {
      setCurrentLevelIdx((prev) => prev + 1);
      stateRef.current.levelProgressScore = 0;
      stateRef.current.obstacles = [];
      stateRef.current.collectibles = [];
      setIsPlaying(true);
      gameSound.playPowerup();
    } else {
      // Completed all 5 levels!
      handleStartGame(0);
    }
  };

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isPaused) return;

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        triggerJump();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        triggerSlide(true);
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        stateRef.current.activeKeys.left = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        stateRef.current.activeKeys.right = true;
      } else if (e.code === 'KeyP') {
        setIsPaused((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        triggerSlide(false);
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        stateRef.current.activeKeys.left = false;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        stateRef.current.activeKeys.right = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, isPaused]);

  const triggerJump = useCallback(() => {
    const p = stateRef.current.player;
    if (p.jumpCount < p.maxJumps) {
      p.vy = -9.2;
      p.jumpCount += 1;
      p.isGrounded = false;
      p.isSliding = false;
      gameSound.playJump();

      // Jump dust particles
      for (let i = 0; i < 6; i++) {
        stateRef.current.particles.push({
          x: p.x + p.width / 2,
          y: p.y + p.height,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * -2,
          size: Math.random() * 3 + 2,
          color: '#38bdf8',
          alpha: 1,
          life: 18,
        });
      }
    }
  }, []);

  const triggerSlide = useCallback((active: boolean) => {
    const p = stateRef.current.player;
    p.isSliding = active;
    if (active) {
      p.height = 20; // duck height
      p.y = stateRef.current.groundY - 20;
    } else {
      p.height = 38; // normal height
      p.y = stateRef.current.groundY - 38;
    }
  }, []);

  // Main Canvas Render & Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const gameLoop = () => {
      if (!isPlaying || isPaused) {
        animId = requestAnimationFrame(gameLoop);
        return;
      }

      const s = stateRef.current;
      const p = s.player;
      const lvl = LEVEL_DATA[currentLevelIdx] || LEVEL_DATA[0];

      // 1. Player horizontal movement
      if (s.activeKeys.left && p.x > 20) {
        p.x -= 3.5;
      }
      if (s.activeKeys.right && p.x < canvas.width - 60) {
        p.x += 3.5;
      }

      // 2. Gravity & Jumping
      p.y += p.vy;
      p.vy += 0.48; // gravity

      if (p.y + p.height >= s.groundY) {
        p.y = s.groundY - p.height;
        p.vy = 0;
        p.isGrounded = true;
        p.jumpCount = 0;
      }

      if (p.invulnerableTimer > 0) {
        p.invulnerableTimer -= 1;
      }

      // 3. Spawning Collectibles
      s.lastCollectibleSpawn += 1;
      if (s.lastCollectibleSpawn > 45) {
        s.lastCollectibleSpawn = 0;
        const label = lvl.collectibles[Math.floor(Math.random() * lvl.collectibles.length)];
        const isAir = Math.random() > 0.4;
        s.collectibles.push({
          x: canvas.width + 20,
          y: isAir ? s.groundY - 70 - Math.random() * 40 : s.groundY - 32,
          label,
          type: Math.random() > 0.9 ? 'star' : 'token',
          points: 50,
          color: lvl.accentColor,
          collected: false,
        });
      }

      // 4. Spawning Obstacles
      s.lastObstacleSpawn += 1;
      const spawnInterval = Math.max(65, 110 - currentLevelIdx * 10);
      if (s.lastObstacleSpawn > spawnInterval) {
        s.lastObstacleSpawn = 0;
        const label = lvl.obstacles[Math.floor(Math.random() * lvl.obstacles.length)];
        const isAirObstacle = Math.random() > 0.65;
        s.obstacles.push({
          x: canvas.width + 20,
          y: isAirObstacle ? s.groundY - 68 : s.groundY - 32,
          width: isAirObstacle ? 50 : 42,
          height: isAirObstacle ? 22 : 32,
          label,
          color: '#f43f5e',
          type: isAirObstacle ? 'air' : 'ground',
        });
      }

      // 5. Update Collectibles
      for (let i = s.collectibles.length - 1; i >= 0; i--) {
        const c = s.collectibles[i];
        c.x -= lvl.speed;

        // Collision with player
        if (
          !c.collected &&
          p.x < c.x + 30 &&
          p.x + p.width > c.x &&
          p.y < c.y + 24 &&
          p.y + p.height > c.y
        ) {
          c.collected = true;
          const gained = c.points * combo;
          s.runningScore += gained;
          s.levelProgressScore += gained;
          setScore(s.runningScore);
          setCombo((prev) => Math.min(prev + 1, 8));
          gameSound.playCollect();

          // Particle burst
          for (let k = 0; k < 8; k++) {
            s.particles.push({
              x: c.x + 10,
              y: c.y + 10,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              size: Math.random() * 3 + 2,
              color: c.color,
              alpha: 1,
              life: 25,
            });
          }

          // Level clear condition
          if (s.levelProgressScore >= lvl.targetScore) {
            setLevelClear(true);
            setIsPlaying(false);
            gameSound.playLevelClear();
            engagementService.recordScore(s.runningScore, currentLevelIdx + 1);
          }
        }

        if (c.x < -60 || c.collected) {
          s.collectibles.splice(i, 1);
        }
      }

      // 6. Update Obstacles
      for (let i = s.obstacles.length - 1; i >= 0; i--) {
        const obs = s.obstacles[i];
        obs.x -= lvl.speed;

        // Collision with player
        if (
          p.invulnerableTimer === 0 &&
          p.x < obs.x + obs.width - 4 &&
          p.x + p.width > obs.x + 4 &&
          p.y < obs.y + obs.height - 4 &&
          p.y + p.height > obs.y + 4
        ) {
          if (shieldActive) {
            setShieldActive(false);
            p.invulnerableTimer = 60;
            gameSound.playPowerup();
          } else {
            p.invulnerableTimer = 75; // Invulnerable blink
            setCombo(1);
            gameSound.playHit();

            s.lives -= 1;
            setLives(s.lives);
            if (s.lives <= 0) {
              setGameOver(true);
              setIsPlaying(false);
              gameSound.playGameOver();
              engagementService.recordScore(s.runningScore, currentLevelIdx + 1);
            }
          }

          // Hit sparks
          for (let k = 0; k < 12; k++) {
            s.particles.push({
              x: p.x + p.width / 2,
              y: p.y + p.height / 2,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              size: Math.random() * 4 + 2,
              color: '#f43f5e',
              alpha: 1,
              life: 30,
            });
          }
        }

        if (obs.x < -80) {
          s.obstacles.splice(i, 1);
        }
      }

      // 7. Update particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 1 / pt.life;
        if (pt.alpha <= 0) {
          s.particles.splice(i, 1);
        }
      }

      // --- RENDERING ---
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background Gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, lvl.bgColor);
      grad.addColorStop(1, '#05070c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cyber Grid lines
      ctx.strokeStyle = lvl.gridColor;
      ctx.lineWidth = 1;
      s.cameraX += lvl.speed * 0.5;
      const offsetX = s.cameraX % 30;

      for (let x = -offsetX; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Ground Line
      ctx.strokeStyle = lvl.accentColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = lvl.accentColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, s.groundY);
      ctx.lineTo(canvas.width, s.groundY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Collectibles
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      s.collectibles.forEach((c) => {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1.5;
        const textWidth = ctx.measureText(c.label).width + 12;

        ctx.beginPath();
        ctx.roundRect(c.x - 4, c.y - 2, textWidth, 22, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(c.label, c.x + textWidth / 2 - 4, c.y + 9);
      });

      // Draw Obstacles (Bugs / Errors)
      s.obstacles.forEach((obs) => {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 6;

        ctx.beginPath();
        ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 4);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(obs.label, obs.x + obs.width / 2, obs.y + obs.height / 2);
      });

      // Draw Particles
      s.particles.forEach((pt) => {
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Draw Player Character (Bit Bot)
      const isInvulnerable = p.invulnerableTimer > 0;
      if (!isInvulnerable || Math.floor(p.invulnerableTimer / 5) % 2 === 0) {
        ctx.save();
        ctx.translate(p.x, p.y);

        // Neon Glow
        ctx.shadowColor = lvl.accentColor;
        ctx.shadowBlur = 10;

        // Bot Body
        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = lvl.accentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(0, 0, p.width, p.height, 6);
        ctx.fill();
        ctx.stroke();

        // Bot Visor / Eye
        ctx.fillStyle = p.isSliding ? '#f43f5e' : '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(p.width * 0.35, 6, p.width * 0.55, 7, 3);
        ctx.fill();

        // Runner Jet flame when jumping
        if (!p.isGrounded) {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(p.width * 0.2, p.height);
          ctx.lineTo(p.width * 0.5, p.height + 12 + Math.random() * 4);
          ctx.lineTo(p.width * 0.8, p.height);
          ctx.fill();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isPaused, currentLevelIdx, shieldActive, combo]);

  const levelProgress = Math.min(
    100,
    Math.round((stateRef.current.levelProgressScore / currentLevel.targetScore) * 100)
  );

  return (
    <div className="h-full flex flex-col bg-[#0b0f19] text-white overflow-y-auto select-none">
      {/* Top Header / Status Bar */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-black/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
            <Gamepad2 size={18} />
          </div>
          <div>
            <div className="text-xs font-bold flex items-center gap-1.5">
              <span>Byte Runner: Syntax Dash</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono">
                {currentLevel.tech}
              </span>
            </div>
            <div className="text-[11px] text-gray-400 flex items-center gap-2">
              <span>{currentLevel.name}</span>
            </div>
          </div>
        </div>

        {/* Playtime Limit & Controls */}
        <div className="flex items-center gap-2">
          {/* Active 5-min session countdown */}
          <div
            className={`px-2.5 py-1 rounded border text-xs font-mono flex items-center gap-1.5 ${
              engagement.gameSessionSecondsLeft < 60
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                : 'bg-black/40 border-white/15 text-emerald-400'
            }`}
            title="Playable game session time remaining before Compillo Studio engagement cycle resumes"
          >
            <Clock size={12} />
            <span>{formatTime(engagement.gameSessionSecondsLeft)}</span>
          </div>

          <button
            onClick={() => {
              const muted = gameSound.toggleMute();
              setIsMuted(muted);
            }}
            className="p-1.5 rounded hover:bg-white/10 text-gray-300"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {onOpenMasterPanel && (
            <button
              onClick={onOpenMasterPanel}
              className="px-2 py-1 bg-white/10 hover:bg-white/15 rounded text-[11px] text-sky-300 flex items-center gap-1 border border-white/10 transition-colors"
              title="Open IDE Master Panel to configure timers"
            >
              <Sliders size={12} />
              <span className="hidden sm:inline">Master Panel</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Game Screen Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 relative min-h-[360px]">
        {/* HUD Overlay */}
        <div className="w-full max-w-[620px] flex items-center justify-between mb-2 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-gray-400">Score:</span>
              <span className="text-amber-400 font-bold text-sm">{score}</span>
            </div>
            {combo > 1 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold animate-bounce">
                x{combo} Combo!
              </span>
            )}
            <div className="flex items-center gap-0.5 ml-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart
                  key={i}
                  size={13}
                  className={i < lives ? 'text-rose-500 fill-rose-500' : 'text-gray-600'}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[11px] text-gray-400">
              <Trophy size={12} className="text-yellow-400" />
              <span>Best: {personalBest}</span>
            </div>
            {isPlaying && (
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-1 rounded hover:bg-white/10 text-gray-300"
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
              </button>
            )}
          </div>
        </div>

        {/* Level Progress Indicator */}
        <div className="w-full max-w-[620px] mb-2">
          <div className="flex items-center justify-between text-[10.5px] text-gray-400 mb-1">
            <span>Level Goal Progress</span>
            <span>{levelProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-200"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
        </div>

        {/* HTML5 Game Canvas */}
        <div className="relative rounded-xl overflow-hidden border border-white/15 shadow-2xl bg-black">
          <canvas
            ref={canvasRef}
            width={620}
            height={260}
            className="w-full max-w-[620px] h-auto block"
          />

          {/* Start Screen Overlay */}
          {!isPlaying && !gameOver && !levelClear && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/40 animate-pulse">
                <Gamepad2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Byte Runner: Syntax Dash
                </h3>
                <p className="text-xs text-gray-300 mt-1 max-w-sm">
                  Jump and slide through 5 levels of coding environments. Collect syntax tokens and dodge bugs to clear each level!
                </p>
              </div>

              {/* Level Selector */}
              <div className="flex flex-wrap gap-1.5 justify-center max-w-md">
                {LEVEL_DATA.map((lvl, idx) => (
                  <button
                    key={lvl.level}
                    onClick={() => handleStartGame(idx)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all ${
                      idx === currentLevelIdx
                        ? 'bg-sky-500 text-white border-sky-400 shadow-md'
                        : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    Lvl {lvl.level}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleStartGame(currentLevelIdx)}
                  className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-lg font-semibold text-sm shadow-lg shadow-sky-500/25 flex items-center gap-2 transition-transform active:scale-95"
                >
                  <Play size={16} fill="white" />
                  <span>Play Level {currentLevel.level}</span>
                </button>
              </div>

              <div className="text-[11px] text-gray-400 flex items-center gap-3 pt-1">
                <span>Space / Up: Jump (Double Jump!)</span>
                <span>•</span>
                <span>Down: Slide / Duck</span>
              </div>
            </div>
          )}

          {/* Level Clear Overlay */}
          {levelClear && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/40">
                <CheckCircle2 size={26} />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-300">Level Cleared!</h3>
                <p className="text-xs text-gray-300 mt-0.5">
                  Great reflexes! Score: <span className="text-amber-400 font-bold">{score}</span>
                </p>
              </div>

              <button
                onClick={handleLevelClearNext}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs shadow-lg flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <span>
                  {currentLevelIdx + 1 < LEVEL_DATA.length
                    ? `Proceed to Level ${currentLevelIdx + 2}`
                    : 'Victory Lap (Replay All)'}
                </span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-400/40">
                <RotateCcw size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-300">Run Terminated!</h3>
                <p className="text-xs text-gray-300 mt-0.5">
                  Final Score: <span className="text-amber-400 font-bold">{score}</span>
                </p>
              </div>

              <button
                onClick={() => handleStartGame(currentLevelIdx)}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold text-xs shadow-lg flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <RotateCcw size={14} />
                <span>Retry Level {currentLevel.level}</span>
              </button>
            </div>
          )}

          {/* Paused Overlay */}
          {isPaused && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center space-y-2">
              <h3 className="text-lg font-bold text-white tracking-widest uppercase">Paused</h3>
              <button
                onClick={() => setIsPaused(false)}
                className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs text-white"
              >
                Resume Game
              </button>
            </div>
          )}
        </div>

        {/* Mobile & Touch Controls Bar */}
        <div className="w-full max-w-[620px] mt-3 flex items-center justify-between gap-2 md:hidden">
          <div className="flex gap-2">
            <button
              onTouchStart={() => (stateRef.current.activeKeys.left = true)}
              onTouchEnd={() => (stateRef.current.activeKeys.left = false)}
              onMouseDown={() => (stateRef.current.activeKeys.left = true)}
              onMouseUp={() => (stateRef.current.activeKeys.left = false)}
              className="w-14 h-12 rounded-lg bg-white/10 active:bg-white/25 border border-white/15 flex items-center justify-center text-white text-lg font-bold"
            >
              ◀
            </button>
            <button
              onTouchStart={() => (stateRef.current.activeKeys.right = true)}
              onTouchEnd={() => (stateRef.current.activeKeys.right = false)}
              onMouseDown={() => (stateRef.current.activeKeys.right = true)}
              onMouseUp={() => (stateRef.current.activeKeys.right = false)}
              className="w-14 h-12 rounded-lg bg-white/10 active:bg-white/25 border border-white/15 flex items-center justify-center text-white text-lg font-bold"
            >
              ▶
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onTouchStart={() => triggerSlide(true)}
              onTouchEnd={() => triggerSlide(false)}
              onMouseDown={() => triggerSlide(true)}
              onMouseUp={() => triggerSlide(false)}
              className="w-16 h-12 rounded-lg bg-amber-500/20 active:bg-amber-500/40 border border-amber-500/30 flex items-center justify-center text-amber-300 text-xs font-bold"
            >
              SLIDE ▼
            </button>
            <button
              onClick={triggerJump}
              className="w-20 h-12 rounded-lg bg-sky-500/30 active:bg-sky-500/60 border border-sky-500/40 flex items-center justify-center text-sky-200 text-xs font-bold shadow-md"
            >
              JUMP ▲
            </button>
          </div>
        </div>

        {/* Desktop Keyboard Hints */}
        <div className="hidden md:flex items-center justify-between w-full max-w-[620px] mt-2.5 text-[11px] text-gray-400">
          <span>🎮 Arrow Keys or W/A/S/D to move & jump</span>
          <span>⚡ Double-jump over high bug obstacles</span>
          <span>P = Pause</span>
        </div>
      </div>

      {/* 5-Minute Session Limit Reached Modal */}
      {sessionCompletedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#161c28] border border-amber-500/30 rounded-xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/40">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">5-Minute Arcade Break Finished!</h3>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                You've completed your healthy 5-minute reward break! Time to jump back into coding. Engaging with the IDE for {engagement.config.requiredEngagementMinutes} minutes will unlock your next session.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-black/40 border border-white/10 text-xs text-gray-300 font-mono flex items-center justify-between">
              <span>Session Score:</span>
              <span className="text-amber-400 font-bold">{score}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSessionCompletedModal(false)}
                className="flex-1 py-2 bg-[#007acc] hover:bg-[#0062a3] text-white rounded text-xs font-medium"
              >
                Return to Workspace
              </button>
              {onOpenMasterPanel && (
                <button
                  onClick={() => {
                    setSessionCompletedModal(false);
                    onOpenMasterPanel();
                  }}
                  className="px-3 py-2 bg-white/10 hover:bg-white/15 text-sky-300 border border-white/15 rounded text-xs"
                >
                  Adjust in Master Panel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
