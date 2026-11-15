import { CompilloThemeDefinition } from '../../../services/themes';

export type CompilloWebsitePage =
  | 'overview'
  | 'hosting'
  | 'gallery'
  | 'challenges'
  | 'certificates'
  | 'pair-coding'
  | 'sql-scratchpad'
  | 'api-audit'
  | 'benchmark-diff'
  | 'cs-simulators'
  | 'dsa-visualizer'
  | 'leetcode-arena'
  | 'regex-ast'
  | 'system-design'
  | 'env-manager'
  | 'rest-client'
  | 'package-audit'
  | 'css-animator'
  | 'svg-icon-forge';

export interface WebsiteThemeTokens {
  pageBg: string;
  surfaceBg: string;
  borderColor: string;
  fgPrimary: string;
  fgMuted: string;
  accent: string;
  accentText: string;
  titleBarBg: string;
}

export function getWebsiteThemeTokens(theme: CompilloThemeDefinition): WebsiteThemeTokens {
  const isLight = theme.type === 'light';
  const accent = theme.ui.accent;
  const clean = accent.replace('#', '');
  let accentText = isLight ? '#ffffff' : '#050505';
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    accentText = luminance > 0.55 ? '#050505' : '#ffffff';
  }
  return {
    pageBg: theme.ui.editorBg,
    surfaceBg: theme.ui.panelBg,
    borderColor: theme.ui.sideBarBorder,
    fgPrimary: theme.ui.editorFg,
    fgMuted: isLight ? '#52525b' : '#a1a1aa',
    accent,
    accentText,
    titleBarBg: theme.ui.titleBarBg,
  };
}

export const WEBSITE_PAGE_TABS: Array<{
  id: CompilloWebsitePage;
  label: string;
  isBeta?: boolean;
}> = [
  { id: 'overview', label: 'Overview' },
  { id: 'hosting', label: 'Hosted Sites' },
  { id: 'gallery', label: 'Community Gallery' },
  { id: 'challenges', label: 'Daily Challenge' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'pair-coding', label: 'Pair Coding', isBeta: true },
  { id: 'sql-scratchpad', label: 'SQL Scratchpad', isBeta: true },
  { id: 'api-audit', label: 'API & Security Lab', isBeta: true },
  { id: 'benchmark-diff', label: 'Benchmark & Diff', isBeta: true },
  { id: 'cs-simulators', label: 'CS Simulators', isBeta: true },
  { id: 'dsa-visualizer', label: 'DSA Visualizer', isBeta: true },
  { id: 'leetcode-arena', label: 'LeetCode Arena', isBeta: true },
  { id: 'regex-ast', label: 'Regex & AST Lab', isBeta: true },
  { id: 'system-design', label: 'System Design Lab', isBeta: true },
  { id: 'env-manager', label: 'Env & Secrets Lab', isBeta: true },
  { id: 'rest-client', label: 'REST Client Lab', isBeta: true },
  { id: 'package-audit', label: 'Package Audit Lab', isBeta: true },
  { id: 'css-animator', label: 'CSS Animation Studio', isBeta: true },
  { id: 'svg-icon-forge', label: 'SVG Icon Forge', isBeta: true },
];
