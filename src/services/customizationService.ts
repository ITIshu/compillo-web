import { useEffect, useState } from 'react';

export type IconPackId =
  | 'default'
  | 'material-vivid'
  | 'catppuccin'
  | 'neon-cyber'
  | 'minimal-mono';

export type SyntaxPaletteId =
  | 'theme-default'
  | 'dracula-vibrant'
  | 'monokai-pro'
  | 'tokyo-night'
  | 'one-dark-vivid'
  | 'nord-frost'
  | 'synthwave-neon'
  | 'github-clean';

export interface SyntaxTokenColors {
  keyword: string;
  string: string;
  function: string;
  comment: string;
  number: string;
  type: string;
  variable: string;
  delimiter: string;
}

export interface IconPackDefinition {
  id: IconPackId;
  name: string;
  description: string;
  previewAccent: string;
}

export interface SyntaxPaletteDefinition {
  id: SyntaxPaletteId;
  name: string;
  description: string;
  tokens: SyntaxTokenColors;
}

export const ICON_PACKS: IconPackDefinition[] = [
  {
    id: 'default',
    name: 'Compillo Standard',
    description: 'Clean studio badges paired with classic amber folders.',
    previewAccent: '#38bdf8',
  },
  {
    id: 'material-vivid',
    name: 'Material Vivid Pack',
    description: 'High-contrast Material colored pills for JS, TS, Python, JSON & Web.',
    previewAccent: '#42a5f5',
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin Pastel',
    description: 'Warm pastel rosewater, mauve, peach, and sapphire badges.',
    previewAccent: '#cba6f7',
  },
  {
    id: 'neon-cyber',
    name: 'Cyberpunk Neon',
    description: 'Electric magenta, laser cyan & acid yellow glowing file badges.',
    previewAccent: '#ff007f',
  },
  {
    id: 'minimal-mono',
    name: 'Minimal Monochrome',
    description: 'Architectural slate & graphite glyphs for zero visual clutter.',
    previewAccent: '#94a3b8',
  },
];

export const FOLDER_COLOR_PRESETS = [
  { id: 'auto', label: 'Pack Default', hex: '' },
  { id: 'amber', label: 'Amber', hex: '#dcb67a' },
  { id: 'sky', label: 'Sky Blue', hex: '#38bdf8' },
  { id: 'emerald', label: 'Emerald', hex: '#10b981' },
  { id: 'rose', label: 'Rose Pink', hex: '#f472b6' },
  { id: 'violet', label: 'Violet', hex: '#a855f7' },
  { id: 'gold', label: 'Royal Gold', hex: '#eab308' },
];

export const SYNTAX_PALETTES: SyntaxPaletteDefinition[] = [
  {
    id: 'theme-default',
    name: 'Workbench Default',
    description: 'Use the built-in syntax highlighting from your active IDE theme.',
    tokens: {
      keyword: '#569cd6',
      string: '#ce9178',
      function: '#dcdcaa',
      comment: '#6a9955',
      number: '#b5cea8',
      type: '#4ec9b0',
      variable: '#9cdcfe',
      delimiter: '#d4d4d4',
    },
  },
  {
    id: 'dracula-vibrant',
    name: 'Dracula Vibrant',
    description: 'Pink keywords, vivid yellow strings, emerald functions & cyan types.',
    tokens: {
      keyword: '#ff79c6',
      string: '#f1fa8c',
      function: '#50fa7b',
      comment: '#6272a4',
      number: '#bd93f9',
      type: '#8be9fd',
      variable: '#f8f8f2',
      delimiter: '#ffb86c',
    },
  },
  {
    id: 'monokai-pro',
    name: 'Monokai Pro',
    description: 'Crimson keywords, warm gold strings, lime functions & aqua classes.',
    tokens: {
      keyword: '#ff6188',
      string: '#ffd866',
      function: '#a9dc76',
      comment: '#727072',
      number: '#ab9df2',
      type: '#78dce8',
      variable: '#fcfcfa',
      delimiter: '#fc9867',
    },
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    description: 'Electric violet keywords, mint strings, sky functions & orange literals.',
    tokens: {
      keyword: '#bb9af7',
      string: '#9ece6a',
      function: '#7aa2f7',
      comment: '#565f89',
      number: '#ff9e64',
      type: '#2ac3de',
      variable: '#c0caf5',
      delimiter: '#89ddff',
    },
  },
  {
    id: 'one-dark-vivid',
    name: 'One Dark Pro',
    description: 'Balanced purple keywords, sage strings, crisp blue functions & amber types.',
    tokens: {
      keyword: '#c678dd',
      string: '#98c379',
      function: '#61afef',
      comment: '#5c6370',
      number: '#d19a66',
      type: '#e5c07b',
      variable: '#e06c75',
      delimiter: '#56b6c2',
    },
  },
  {
    id: 'nord-frost',
    name: 'Nord Frost',
    description: 'Cool arctic blues, aurora greens & subtle polar mist comments.',
    tokens: {
      keyword: '#81a1c1',
      string: '#a3be8c',
      function: '#88c0d0',
      comment: '#616e88',
      number: '#b48ead',
      type: '#8fbcbb',
      variable: '#d8dee9',
      delimiter: '#ebcb8b',
    },
  },
  {
    id: 'synthwave-neon',
    name: 'Synthwave 84',
    description: 'Hot magenta keywords, laser cyan strings & bright yellow functions.',
    tokens: {
      keyword: '#ff2a85',
      string: '#36f9f6',
      function: '#fede5d',
      comment: '#848bbd',
      number: '#ff8b39',
      type: '#b388ff',
      variable: '#ffffff',
      delimiter: '#72f1b8',
    },
  },
  {
    id: 'github-clean',
    name: 'Editorial Contrast',
    description: 'High-clarity rose keywords, teal strings & violet callables.',
    tokens: {
      keyword: '#f43f5e',
      string: '#0ea5e9',
      function: '#a855f7',
      comment: '#64748b',
      number: '#f59e0b',
      type: '#14b8a6',
      variable: '#38bdf8',
      delimiter: '#94a3b8',
    },
  },
];

export interface CustomizationState {
  iconPack: IconPackId;
  folderColor: string;
  iconExtensionEnabled: boolean;
  syntaxPalette: SyntaxPaletteId;
  customTokens: Partial<SyntaxTokenColors>;
  syntaxExtensionEnabled: boolean;
}

const STORAGE_KEY = 'compillo_appearance_customizer_v1';

const DEFAULT_STATE: CustomizationState = {
  iconPack: 'material-vivid',
  folderColor: '',
  iconExtensionEnabled: true,
  syntaxPalette: 'theme-default',
  customTokens: {},
  syntaxExtensionEnabled: true,
};

class CustomizationService {
  private state: CustomizationState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): CustomizationState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STATE };
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_STATE,
        ...parsed,
        customTokens:
          parsed.customTokens && typeof parsed.customTokens === 'object'
            ? parsed.customTokens
            : {},
      };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  private saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          iconPack: this.state.iconPack,
          folderColor: this.state.folderColor,
          syntaxPalette: this.state.syntaxPalette,
          customTokens: this.state.customTokens,
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): CustomizationState {
    return this.state;
  }

  public getEffectiveIconPack(): IconPackId {
    return this.state.iconExtensionEnabled ? this.state.iconPack : 'default';
  }

  public getEffectiveFolderColor(): string {
    return this.state.iconExtensionEnabled ? this.state.folderColor : '';
  }

  public getResolvedSyntaxTokens(): SyntaxTokenColors {
    const palette =
      SYNTAX_PALETTES.find((p) => p.id === this.state.syntaxPalette) || SYNTAX_PALETTES[0];
    return {
      ...palette.tokens,
      ...this.state.customTokens,
    };
  }

  public hasActiveCustomSyntax(): boolean {
    if (!this.state.syntaxExtensionEnabled) return false;
    return (
      this.state.syntaxPalette !== 'theme-default' ||
      Object.keys(this.state.customTokens).length > 0
    );
  }

  public setIconPack(pack: IconPackId) {
    this.state = { ...this.state, iconPack: pack };
    this.saveState();
    this.notify();
  }

  public cycleIconPack(): IconPackDefinition {
    const idx = ICON_PACKS.findIndex((p) => p.id === this.state.iconPack);
    const next = ICON_PACKS[(idx + 1) % ICON_PACKS.length];
    this.setIconPack(next.id);
    return next;
  }

  public setFolderColor(hex: string) {
    this.state = { ...this.state, folderColor: hex };
    this.saveState();
    this.notify();
  }

  public setIconExtensionEnabled(enabled: boolean) {
    if (this.state.iconExtensionEnabled === enabled) return;
    this.state = { ...this.state, iconExtensionEnabled: enabled };
    this.notify();
  }

  public setSyntaxPalette(paletteId: SyntaxPaletteId) {
    this.state = {
      ...this.state,
      syntaxPalette: paletteId,
      customTokens: {},
    };
    this.saveState();
    this.notify();
  }

  public cycleSyntaxPalette(): SyntaxPaletteDefinition {
    const idx = SYNTAX_PALETTES.findIndex((p) => p.id === this.state.syntaxPalette);
    const next = SYNTAX_PALETTES[(idx + 1) % SYNTAX_PALETTES.length];
    this.setSyntaxPalette(next.id);
    return next;
  }

  public setCustomTokenColor(token: keyof SyntaxTokenColors, hex: string) {
    this.state = {
      ...this.state,
      customTokens: {
        ...this.state.customTokens,
        [token]: hex,
      },
    };
    this.saveState();
    this.notify();
  }

  public resetSyntaxColors() {
    this.state = {
      ...this.state,
      syntaxPalette: 'theme-default',
      customTokens: {},
    };
    this.saveState();
    this.notify();
  }

  public setSyntaxExtensionEnabled(enabled: boolean) {
    if (this.state.syntaxExtensionEnabled === enabled) return;
    this.state = { ...this.state, syntaxExtensionEnabled: enabled };
    this.notify();
  }
}

export const customizationService = new CustomizationService();

export function useCustomization(): CustomizationState {
  const [state, setState] = useState<CustomizationState>(() =>
    customizationService.getState()
  );

  useEffect(() => {
    return customizationService.subscribe(() => {
      setState(customizationService.getState());
    });
  }, []);

  return state;
}
