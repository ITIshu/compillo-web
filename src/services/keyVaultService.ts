export type AiProvider = 'gemini' | 'openai' | 'claude';

export interface ProviderKeys {
  gemini?: string;
  openai?: string;
  claude?: string;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: AiProvider;
  description: string;
  contextWindow: string;
  isFreeTierAvailable?: boolean;
  recommended?: boolean;
}

export interface ActiveModelConfig {
  provider: AiProvider;
  modelId: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  // Google Gemini
  {
    id: 'gemini-4-hydrogen',
    name: 'Gemini 4 Hydrogen (Flash)',
    provider: 'gemini',
    description: 'Fastest, highly capable multimodal model for real-time coding & analysis',
    contextWindow: '1M tokens',
    isFreeTierAvailable: true,
    recommended: true,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    description: 'Ultra-low latency coding engine compatible with all standard Gemini API keys',
    contextWindow: '1M tokens',
    isFreeTierAvailable: true,
  },
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon (Pro)',
    provider: 'gemini',
    description: 'Deep reasoning model for complex architecture and algorithm generation',
    contextWindow: '1M tokens',
  },
  {
    id: 'gemini-4-carbon',
    name: 'Gemini 4 Carbon',
    provider: 'gemini',
    description: 'Maximum reasoning depth for root-cause debugging and security auditing',
    contextWindow: '1M tokens',
  },
  // OpenAI ChatGPT
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Omni)',
    provider: 'openai',
    description: 'OpenAI flagship multimodal coding model with advanced reasoning',
    contextWindow: '128K tokens',
    recommended: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Cost-effective, rapid response coding model',
    contextWindow: '128K tokens',
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'High-capability developer model with extensive coding benchmarks',
    contextWindow: '128K tokens',
  },
  // Anthropic Claude
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'claude',
    description: 'Industry-leading coding benchmark performance and precise refactoring',
    contextWindow: '200K tokens',
    recommended: true,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'claude',
    description: 'Lightning-fast Anthropic model for snappy code completion and fixes',
    contextWindow: '200K tokens',
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'claude',
    description: 'Deep contextual analysis and architectural breakdown',
    contextWindow: '200K tokens',
  },
];

const STORAGE_KEYS_KEY = 'compillo_ai_keys_v1';
const STORAGE_CONFIG_KEY = 'compillo_ai_config_v1';

// Obfuscation helper (encode/decode) for local key safety
function obfuscate(text: string): string {
  try {
    return btoa(encodeURIComponent(text));
  } catch {
    return text;
  }
}

function deobfuscate(text: string): string {
  try {
    return decodeURIComponent(atob(text));
  } catch {
    return text;
  }
}

function cleanApiKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim().replace(/^['"]+|['"]+$/g, '').trim();
  return cleaned || undefined;
}

class KeyVaultService {
  private keys: ProviderKeys = {};
  private activeConfig: ActiveModelConfig = {
    provider: 'gemini',
    modelId: 'gemini-4-hydrogen',
  };
  private listeners: Set<(keys: ProviderKeys, config: ActiveModelConfig) => void> = new Set();

  constructor() {
    this.loadState();
  }

  private loadState() {
    if (typeof window === 'undefined') return;

    try {
      const rawKeys = localStorage.getItem(STORAGE_KEYS_KEY);
      if (rawKeys) {
        const parsed = JSON.parse(rawKeys);
        this.keys = {
          gemini: cleanApiKey(parsed.gemini ? deobfuscate(parsed.gemini) : undefined),
          openai: cleanApiKey(parsed.openai ? deobfuscate(parsed.openai) : undefined),
          claude: cleanApiKey(parsed.claude ? deobfuscate(parsed.claude) : undefined),
        };
      }

      const rawConfig = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (rawConfig) {
        const parsedConfig = JSON.parse(rawConfig);
        if (parsedConfig.provider && parsedConfig.modelId) {
          const migratedModelId =
            parsedConfig.modelId === 'gemini-3.8-flash'
              ? 'gemini-4-hydrogen'
              : parsedConfig.modelId;
          this.activeConfig = {
            provider: parsedConfig.provider,
            modelId: migratedModelId,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load Compillo AI key vault from localStorage', e);
    }
  }

  private saveState() {
    if (typeof window === 'undefined') return;

    try {
      const payloadToStore = {
        gemini: this.keys.gemini ? obfuscate(this.keys.gemini) : undefined,
        openai: this.keys.openai ? obfuscate(this.keys.openai) : undefined,
        claude: this.keys.claude ? obfuscate(this.keys.claude) : undefined,
      };
      localStorage.setItem(STORAGE_KEYS_KEY, JSON.stringify(payloadToStore));
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(this.activeConfig));
    } catch (e) {
      console.warn('Failed to save Compillo AI key vault to localStorage', e);
    }

    this.notify();
  }

  private notify() {
    for (const listener of this.listeners) {
      listener({ ...this.keys }, { ...this.activeConfig });
    }
  }

  public subscribe(listener: (keys: ProviderKeys, config: ActiveModelConfig) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.keys }, { ...this.activeConfig });
    return () => this.listeners.delete(listener);
  }

  public getKeys(): ProviderKeys {
    return { ...this.keys };
  }

  public getActiveConfig(): ActiveModelConfig {
    return { ...this.activeConfig };
  }

  public setKey(provider: AiProvider, key: string | undefined) {
    const trimmed = cleanApiKey(key);
    if (trimmed) {
      this.keys[provider] = trimmed;
    } else {
      delete this.keys[provider];
    }
    this.saveState();
  }

  public setActiveConfig(config: ActiveModelConfig) {
    this.activeConfig = config;
    this.saveState();
  }

  public hasKey(provider: AiProvider): boolean {
    return !!this.keys[provider];
  }

  public getKey(provider: AiProvider): string | undefined {
    return this.keys[provider];
  }

  public getConnectedKeyCount(): number {
    let count = 0;
    if (this.keys.gemini) count++;
    if (this.keys.openai) count++;
    if (this.keys.claude) count++;
    return count;
  }

  public async testKey(
    provider: AiProvider,
    key: string
  ): Promise<{ success: boolean; message: string; resolvedModel?: string }> {
    const cleaned = cleanApiKey(key);
    if (!cleaned) {
      return { success: false, message: 'Please enter a non-empty API key.' };
    }
    try {
      const res = await fetch('/api/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key: cleaned }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return {
          success: true,
          message: data.message || 'Key connected successfully!',
          resolvedModel: data.resolvedModel,
        };
      }
      return {
        success: false,
        message: data.error || `API verification failed (HTTP ${res.status})`,
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Connection test failed' };
    }
  }
}

export const keyVaultService = new KeyVaultService();
