/**
 * Compillo Studio Engagement & Arcade Reward Policy Service
 * Tracks genuine user coding/IDE engagement time and governs game unlock sessions.
 */

export interface MasterPanelConfig {
  requiredEngagementMinutes: number; // default: 60 minutes
  gamePlaytimeMinutes: number; // default: 5 minutes
  devUnlockOverride: boolean; // default: false (instant unlock for testing/admin)
  idleTimeoutSeconds: number; // default: 90 seconds of inactivity to pause tracking
  dailyTargetMinutes: number; // default: 120 minutes coding goal
}

export interface EngagementState {
  engagementSeconds: number; // total active engagement seconds in current cycle
  totalEngagementSecondsAllTime: number; // cumulative all-time active seconds
  lastInteractionTimestamp: number;
  isUserActive: boolean;
  gameSessionSecondsLeft: number; // countdown during active game session
  isGameSessionActive: boolean;
  isGameUnlocked: boolean;
  timesUnlockedCount: number;
  highScore: number;
  highestLevelReached: number;
  config: MasterPanelConfig;
}

const STORAGE_KEY_ENGAGEMENT = 'compillo_engagement_data_v2';
const STORAGE_KEY_CONFIG = 'compillo_master_panel_config_v2';

const DEFAULT_CONFIG: MasterPanelConfig = {
  requiredEngagementMinutes: 60, // 60 minutes required
  gamePlaytimeMinutes: 5, // 5 minutes playable
  devUnlockOverride: false,
  idleTimeoutSeconds: 90,
  dailyTargetMinutes: 120,
};

class EngagementService {
  private state: EngagementState;
  private listeners: Set<(state: EngagementState) => void> = new Set();
  private tickerInterval: number | null = null;
  private lastActiveTimestamp: number = Date.now();
  private notifyScheduled = false;

  constructor() {
    this.state = this.loadState();
    this.setupUserActivityListeners();
    this.startTicker();
  }

  private loadConfig(): MasterPanelConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('[EngagementService] Error loading config:', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  private loadState(): EngagementState {
    const config = this.loadConfig();
    let savedData: Partial<EngagementState> = {};
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ENGAGEMENT);
      if (saved) {
        savedData = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[EngagementService] Error loading state:', e);
    }

    const engagementSeconds = savedData.engagementSeconds ?? 0;
    const requiredSeconds = config.requiredEngagementMinutes * 60;
    const isUnlocked = config.devUnlockOverride || engagementSeconds >= requiredSeconds;

    return {
      engagementSeconds,
      totalEngagementSecondsAllTime: savedData.totalEngagementSecondsAllTime ?? engagementSeconds,
      lastInteractionTimestamp: Date.now(),
      isUserActive: true,
      gameSessionSecondsLeft: savedData.gameSessionSecondsLeft ?? config.gamePlaytimeMinutes * 60,
      isGameSessionActive: false,
      isGameUnlocked: isUnlocked,
      timesUnlockedCount: savedData.timesUnlockedCount ?? 0,
      highScore: savedData.highScore ?? 0,
      highestLevelReached: savedData.highestLevelReached ?? 1,
      config,
    };
  }

  private saveState(): void {
    try {
      const toSave = {
        engagementSeconds: this.state.engagementSeconds,
        totalEngagementSecondsAllTime: this.state.totalEngagementSecondsAllTime,
        gameSessionSecondsLeft: this.state.gameSessionSecondsLeft,
        timesUnlockedCount: this.state.timesUnlockedCount,
        highScore: this.state.highScore,
        highestLevelReached: this.state.highestLevelReached,
      };
      localStorage.setItem(STORAGE_KEY_ENGAGEMENT, JSON.stringify(toSave));
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(this.state.config));
    } catch (e) {
      // ignore
    }
  }

  private setupUserActivityListeners(): void {
    if (typeof window === 'undefined') return;

    const onActivity = () => {
      this.lastActiveTimestamp = Date.now();
      if (!this.state.isUserActive) {
        this.state.isUserActive = true;
        this.notify();
      }
    };

    window.addEventListener('keydown', onActivity, { passive: true });
    window.addEventListener('mousemove', onActivity, { passive: true });
    window.addEventListener('mousedown', onActivity, { passive: true });
    window.addEventListener('touchstart', onActivity, { passive: true });
    window.addEventListener('scroll', onActivity, { passive: true });
  }

  private startTicker(): void {
    if (this.tickerInterval) return;

    this.tickerInterval = window.setInterval(() => {
      const now = Date.now();
      const idleSeconds = (now - this.lastActiveTimestamp) / 1000;
      const isStillActive = idleSeconds <= this.state.config.idleTimeoutSeconds;

      this.state.isUserActive = isStillActive;

      // 1. If user is actively engaging with IDE, advance engagement timer
      if (isStillActive) {
        this.state.engagementSeconds += 1;
        this.state.totalEngagementSecondsAllTime += 1;
      }

      // Check unlock status
      const requiredSeconds = this.state.config.requiredEngagementMinutes * 60;
      const wasUnlocked = this.state.isGameUnlocked;
      const nowUnlocked =
        this.state.config.devUnlockOverride || this.state.engagementSeconds >= requiredSeconds;

      if (!wasUnlocked && nowUnlocked) {
        this.state.isGameUnlocked = true;
        this.state.timesUnlockedCount += 1;
        // Refill session seconds when freshly unlocked
        if (this.state.gameSessionSecondsLeft <= 0) {
          this.state.gameSessionSecondsLeft = this.state.config.gamePlaytimeMinutes * 60;
        }
      } else {
        this.state.isGameUnlocked = nowUnlocked;
      }

      // 2. If an active game session is running, tick down the game session timer
      if (this.state.isGameSessionActive && this.state.gameSessionSecondsLeft > 0) {
        this.state.gameSessionSecondsLeft -= 1;
        if (this.state.gameSessionSecondsLeft <= 0) {
          this.state.gameSessionSecondsLeft = 0;
          this.state.isGameSessionActive = false;
          // When 5 min runs out, reset the engagement cycle unless dev override is active
          if (!this.state.config.devUnlockOverride) {
            this.state.engagementSeconds = 0;
            this.state.isGameUnlocked = false;
          }
        }
      }

      this.saveState();
      this.notify();
    }, 1000);
  }

  public getState(): EngagementState {
    return { ...this.state };
  }

  public subscribe(listener: (state: EngagementState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;

    const dispatch = () => {
      this.notifyScheduled = false;
      const snapshot = this.getState();
      this.listeners.forEach((listener) => {
        try {
          listener(snapshot);
        } catch (err) {
          console.error('[EngagementService] Listener error:', err);
        }
      });
    };

    if (typeof queueMicrotask === 'function') {
      queueMicrotask(dispatch);
    } else {
      Promise.resolve().then(dispatch);
    }
  }

  // --- Actions ---

  public recordExplicitInteraction(): void {
    this.lastActiveTimestamp = Date.now();
    this.state.isUserActive = true;
    this.notify();
  }

  /**
   * Start or resume game session countdown
   */
  public startGameSession(): void {
    if (this.state.gameSessionSecondsLeft <= 0) {
      this.state.gameSessionSecondsLeft = this.state.config.gamePlaytimeMinutes * 60;
    }
    this.state.isGameSessionActive = true;
    this.notify();
  }

  /**
   * Pause game session timer (e.g., if user switches tabs or pauses)
   */
  public pauseGameSession(): void {
    this.state.isGameSessionActive = false;
    this.notify();
  }

  /**
   * Save a game score
   */
  public recordScore(score: number, level: number): void {
    if (score > this.state.highScore) {
      this.state.highScore = score;
    }
    if (level > this.state.highestLevelReached) {
      this.state.highestLevelReached = level;
    }
    this.saveState();
    this.notify();
  }

  // --- Master Panel Admin Controls ---

  /**
   * Update Master Panel configuration
   */
  public updateConfig(newConfig: Partial<MasterPanelConfig>): void {
    this.state.config = { ...this.state.config, ...newConfig };

    // If game playtime changed and session not active, update session seconds
    if (newConfig.gamePlaytimeMinutes !== undefined && !this.state.isGameSessionActive) {
      this.state.gameSessionSecondsLeft = Math.min(
        this.state.gameSessionSecondsLeft,
        newConfig.gamePlaytimeMinutes * 60
      );
    }

    const requiredSeconds = this.state.config.requiredEngagementMinutes * 60;
    this.state.isGameUnlocked =
      this.state.config.devUnlockOverride || this.state.engagementSeconds >= requiredSeconds;

    this.saveState();
    this.notify();
  }

  /**
   * Fast forward engagement time (convenient for testing & demo)
   */
  public addEngagementMinutes(minutes: number): void {
    this.state.engagementSeconds += minutes * 60;
    this.state.totalEngagementSecondsAllTime += minutes * 60;
    const requiredSeconds = this.state.config.requiredEngagementMinutes * 60;
    if (this.state.engagementSeconds >= requiredSeconds) {
      this.state.isGameUnlocked = true;
      if (this.state.gameSessionSecondsLeft <= 0) {
        this.state.gameSessionSecondsLeft = this.state.config.gamePlaytimeMinutes * 60;
      }
    }
    this.saveState();
    this.notify();
  }

  /**
   * Reset engagement cycle to zero
   */
  public resetEngagement(): void {
    this.state.engagementSeconds = 0;
    if (!this.state.config.devUnlockOverride) {
      this.state.isGameUnlocked = false;
    }
    this.saveState();
    this.notify();
  }

  /**
   * Refill game session timer to max playtime
   */
  public refillGameTimer(): void {
    this.state.gameSessionSecondsLeft = this.state.config.gamePlaytimeMinutes * 60;
    this.saveState();
    this.notify();
  }

  /**
   * Reset all engagement statistics to factory defaults
   */
  public resetAllToFactoryDefaults(): void {
    this.state.config = { ...DEFAULT_CONFIG };
    this.state.engagementSeconds = 0;
    this.state.gameSessionSecondsLeft = DEFAULT_CONFIG.gamePlaytimeMinutes * 60;
    this.state.isGameUnlocked = false;
    this.state.isGameSessionActive = false;
    this.saveState();
    this.notify();
  }
}

export const engagementService = new EngagementService();
