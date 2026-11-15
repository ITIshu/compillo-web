import React from 'react';
import {
  FileCode,
  FileText,
  FileJson,
  FileSpreadsheet,
  FileType,
  File,
  Folder,
  FolderOpen,
  Terminal,
  Database,
  Lock,
  Settings,
  Image as ImageIcon,
} from 'lucide-react';
import {
  IconPackId,
  customizationService,
  useCustomization,
} from '../../services/customizationService';

interface FileIconProps {
  filename: string;
  className?: string;
  size?: number;
  packOverride?: IconPackId;
}

interface BadgeSpec {
  label: string;
  color: string;
  bg: string;
  border: string;
}

function getPackBadge(filename: string, pack: IconPackId): BadgeSpec | null {
  const lower = filename.toLowerCase();
  const ext = lower.split('.').pop() || '';

  const key =
    lower === 'package.json'
      ? 'npm'
      : lower === 'tsconfig.json'
      ? 'tsconfig'
      : lower === 'dockerfile' || lower.startsWith('dockerfile.')
      ? 'docker'
      : lower === '.gitignore' || lower === '.env' || lower.startsWith('.env.')
      ? lower.includes('gitignore')
        ? 'git'
        : 'env'
      : ext;

  if (pack === 'material-vivid') {
    const map: Record<string, BadgeSpec> = {
      ts: { label: 'TS', color: '#ffffff', bg: '#3178c6', border: '#3178c6' },
      tsx: { label: 'TX', color: '#0f172a', bg: '#38bdf8', border: '#38bdf8' },
      js: { label: 'JS', color: '#0f172a', bg: '#f7df1e', border: '#f7df1e' },
      mjs: { label: 'JS', color: '#0f172a', bg: '#f7df1e', border: '#f7df1e' },
      jsx: { label: 'JX', color: '#0f172a', bg: '#61dafb', border: '#61dafb' },
      py: { label: 'PY', color: '#fef08a', bg: '#2563eb', border: '#3b82f6' },
      json: { label: '{}', color: '#0f172a', bg: '#facc15', border: '#eab308' },
      npm: { label: 'npm', color: '#ffffff', bg: '#cb3837', border: '#cb3837' },
      tsconfig: { label: 'TS', color: '#93c5fd', bg: '#1e3a8a', border: '#3b82f6' },
      css: { label: '#', color: '#ffffff', bg: '#0284c7', border: '#0ea5e9' },
      scss: { label: 'S', color: '#ffffff', bg: '#db2777', border: '#ec4899' },
      html: { label: '<>', color: '#ffffff', bg: '#ea580c', border: '#f97316' },
      md: { label: 'M↓', color: '#0f172a', bg: '#e2e8f0', border: '#cbd5e1' },
      sql: { label: 'DB', color: '#ffffff', bg: '#db2777', border: '#ec4899' },
      sh: { label: '>_', color: '#0f172a', bg: '#22c55e', border: '#16a34a' },
      yml: { label: 'Y', color: '#ffffff', bg: '#7c3aed', border: '#8b5cf6' },
      yaml: { label: 'Y', color: '#ffffff', bg: '#7c3aed', border: '#8b5cf6' },
      docker: { label: 'DK', color: '#ffffff', bg: '#0284c7', border: '#38bdf8' },
      git: { label: 'GT', color: '#ffffff', bg: '#f05032', border: '#f05032' },
      env: { label: '🔑', color: '#fef08a', bg: '#3f3f46', border: '#eab308' },
    };
    return map[key] || null;
  }

  if (pack === 'catppuccin') {
    const map: Record<string, BadgeSpec> = {
      ts: { label: 'TS', color: '#1e1e2e', bg: '#89b4fa', border: '#74c7ec' },
      tsx: { label: '⚛', color: '#1e1e2e', bg: '#94e2d5', border: '#89dceb' },
      js: { label: 'JS', color: '#1e1e2e', bg: '#f9e2af', border: '#fab387' },
      mjs: { label: 'JS', color: '#1e1e2e', bg: '#f9e2af', border: '#fab387' },
      jsx: { label: '⚛', color: '#1e1e2e', bg: '#89dceb', border: '#74c7ec' },
      py: { label: 'PY', color: '#1e1e2e', bg: '#a6e3a1', border: '#94e2d5' },
      json: { label: '{}', color: '#1e1e2e', bg: '#fab387', border: '#f9e2af' },
      npm: { label: 'np', color: '#1e1e2e', bg: '#f38ba8', border: '#eba0ac' },
      tsconfig: { label: '⚙', color: '#1e1e2e', bg: '#b4befe', border: '#89b4fa' },
      css: { label: '#', color: '#1e1e2e', bg: '#74c7ec', border: '#89b4fa' },
      scss: { label: 'S', color: '#1e1e2e', bg: '#f5c2e7', border: '#cba6f7' },
      html: { label: '<>', color: '#1e1e2e', bg: '#eba0ac', border: '#f38ba8' },
      md: { label: 'M', color: '#1e1e2e', bg: '#cba6f7', border: '#b4befe' },
      sql: { label: 'DB', color: '#1e1e2e', bg: '#f5c2e7', border: '#f38ba8' },
      sh: { label: '>_', color: '#1e1e2e', bg: '#a6e3a1', border: '#a6e3a1' },
      yml: { label: 'Y', color: '#1e1e2e', bg: '#cba6f7', border: '#cba6f7' },
      yaml: { label: 'Y', color: '#1e1e2e', bg: '#cba6f7', border: '#cba6f7' },
      env: { label: '✦', color: '#1e1e2e', bg: '#f9e2af', border: '#fab387' },
    };
    return map[key] || null;
  }

  if (pack === 'neon-cyber') {
    const map: Record<string, BadgeSpec> = {
      ts: { label: 'TS', color: '#00f0ff', bg: '#0b162c', border: '#00f0ff' },
      tsx: { label: '⚛', color: '#ff007f', bg: '#1e0b24', border: '#ff007f' },
      js: { label: 'JS', color: '#fcee0a', bg: '#1b1a07', border: '#fcee0a' },
      mjs: { label: 'JS', color: '#fcee0a', bg: '#1b1a07', border: '#fcee0a' },
      jsx: { label: '⚛', color: '#00ff9f', bg: '#081f17', border: '#00ff9f' },
      py: { label: 'PY', color: '#00ff9f', bg: '#091f17', border: '#00ff9f' },
      json: { label: '{}', color: '#ffe600', bg: '#1f1b05', border: '#ffe600' },
      npm: { label: 'np', color: '#ff3b5c', bg: '#260810', border: '#ff3b5c' },
      css: { label: '#', color: '#00f0ff', bg: '#061a24', border: '#00f0ff' },
      scss: { label: 'S', color: '#ff2a85', bg: '#220917', border: '#ff2a85' },
      html: { label: '<>', color: '#ff8b39', bg: '#241206', border: '#ff8b39' },
      md: { label: 'M↓', color: '#c084fc', bg: '#180c29', border: '#c084fc' },
      sql: { label: 'DB', color: '#ff007f', bg: '#210817', border: '#ff007f' },
      sh: { label: '>_', color: '#00ff9f', bg: '#051c14', border: '#00ff9f' },
    };
    return map[key] || null;
  }

  if (pack === 'minimal-mono') {
    const map: Record<string, BadgeSpec> = {
      ts: { label: 'ts', color: '#cbd5e1', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)' },
      tsx: { label: 'tx', color: '#e2e8f0', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)' },
      js: { label: 'js', color: '#cbd5e1', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)' },
      mjs: { label: 'js', color: '#cbd5e1', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)' },
      jsx: { label: 'jx', color: '#e2e8f0', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)' },
      py: { label: 'py', color: '#cbd5e1', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)' },
      json: { label: '{}', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.3)' },
      css: { label: '#', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.3)' },
      html: { label: '<>', color: '#cbd5e1', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.3)' },
      md: { label: 'md', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.3)' },
    };
    return map[key] || null;
  }

  return null;
}

export const FileIcon: React.FC<FileIconProps> = ({
  filename,
  className = 'w-4 h-4',
  size = 16,
  packOverride,
}) => {
  useCustomization();
  const pack = packOverride ?? customizationService.getEffectiveIconPack();
  const badge = pack !== 'default' ? getPackBadge(filename, pack) : null;

  if (badge) {
    const dim = Math.max(14, size);
    return (
      <span
        style={{
          width: dim,
          height: dim,
          color: badge.color,
          backgroundColor: badge.bg,
          borderColor: badge.border,
          fontSize: badge.label.length > 2 ? '7px' : '8.5px',
          lineHeight: 1,
        }}
        className={`inline-flex items-center justify-center rounded-[3px] border font-bold tracking-tighter select-none shrink-0 ${className}`}
      >
        {badge.label}
      </span>
    );
  }

  const lower = filename.toLowerCase();
  const ext = lower.split('.').pop();

  if (pack === 'minimal-mono') {
    return <FileText size={size} className={`text-slate-400 ${className}`} />;
  }

  if (lower.startsWith('.env')) {
    return <Lock size={size} className={`text-amber-400 ${className}`} />;
  }
  if (lower === 'tsconfig.json') {
    return <Settings size={size} className={`text-[#3178c6] ${className}`} />;
  }

  switch (ext) {
    case 'ts':
      return (
        <span className={`inline-flex items-center justify-center font-bold text-[10px] text-[#3178c6] select-none ${className}`}>
          TS
        </span>
      );
    case 'tsx':
      return (
        <span className={`inline-flex items-center justify-center font-bold text-[10px] text-[#00b4d8] select-none ${className}`}>
          ⚛
        </span>
      );
    case 'js':
    case 'mjs':
      return (
        <span className={`inline-flex items-center justify-center font-bold text-[10px] text-[#f7df1e] select-none ${className}`}>
          JS
        </span>
      );
    case 'jsx':
      return (
        <span className={`inline-flex items-center justify-center font-bold text-[10px] text-[#61dafb] select-none ${className}`}>
          ⚛
        </span>
      );
    case 'json':
      return <FileJson size={size} className={`text-[#cbcb41] ${className}`} />;
    case 'css':
    case 'scss':
      return <FileType size={size} className={`text-[#42a5f5] ${className}`} />;
    case 'html':
      return <FileCode size={size} className={`text-[#e44d26] ${className}`} />;
    case 'md':
      return <FileText size={size} className={`text-[#519aba] ${className}`} />;
    case 'py':
      return (
        <span className={`inline-flex items-center justify-center font-bold text-[10px] text-[#3776ab] select-none ${className}`}>
          Py
        </span>
      );
    case 'svg':
    case 'xml':
      return <FileCode size={size} className={`text-[#ff9800] ${className}`} />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
      return <ImageIcon size={size} className={`text-purple-400 ${className}`} />;
    case 'sql':
      return <Database size={size} className={`text-[#e91e63] ${className}`} />;
    case 'sh':
    case 'bash':
      return <Terminal size={size} className={`text-emerald-400 ${className}`} />;
    case 'csv':
      return <FileSpreadsheet size={size} className={`text-emerald-500 ${className}`} />;
    default:
      return <File size={size} className={`text-[#888888] ${className}`} />;
  }
};

export const FolderIcon: React.FC<{
  isOpen: boolean;
  className?: string;
  size?: number;
  packOverride?: IconPackId;
  folderColorOverride?: string;
}> = ({
  isOpen,
  className = 'w-4 h-4',
  size = 16,
  packOverride,
  folderColorOverride,
}) => {
  useCustomization();
  const pack = packOverride ?? customizationService.getEffectiveIconPack();
  const customColor =
    folderColorOverride !== undefined
      ? folderColorOverride
      : customizationService.getEffectiveFolderColor();

  const packDefaultColors: Record<IconPackId, string> = {
    default: '#dcb67a',
    'material-vivid': '#38bdf8',
    catppuccin: '#cba6f7',
    'neon-cyber': '#ff007f',
    'minimal-mono': '#94a3b8',
  };

  const color = customColor || packDefaultColors[pack] || '#dcb67a';
  const fillOpacity = pack === 'material-vivid' || pack === 'catppuccin' ? 0.25 : 0.12;

  if (isOpen) {
    return (
      <FolderOpen
        size={size}
        className={className}
        style={{ color, fill: color, fillOpacity }}
      />
    );
  }
  return (
    <Folder
      size={size}
      className={className}
      style={{ color, fill: color, fillOpacity }}
    />
  );
};
