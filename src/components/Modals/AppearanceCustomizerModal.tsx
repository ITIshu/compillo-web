import React from 'react';
import { X, Palette, FolderKanban, RotateCcw, Check } from 'lucide-react';
import { VSCodeThemeDefinition } from '../../services/themes';
import {
  FOLDER_COLOR_PRESETS,
  ICON_PACKS,
  SYNTAX_PALETTES,
  SyntaxTokenColors,
  customizationService,
  useCustomization,
} from '../../services/customizationService';
import { FileIcon, FolderIcon } from '../Common/FileIcon';

interface AppearanceCustomizerModalProps {
  isOpen: boolean;
  initialTab: 'icons' | 'colors';
  onTabChange: (tab: 'icons' | 'colors') => void;
  onClose: () => void;
  currentTheme: VSCodeThemeDefinition;
}

const SAMPLE_FILENAMES = ['App.tsx', 'server.ts', 'main.py', 'styles.css', 'package.json', 'README.md'];

const TOKEN_FIELDS: Array<{ key: keyof SyntaxTokenColors; label: string }> = [
  { key: 'keyword', label: 'Keywords' },
  { key: 'string', label: 'Strings' },
  { key: 'function', label: 'Functions' },
  { key: 'type', label: 'Types & Classes' },
  { key: 'comment', label: 'Comments' },
  { key: 'number', label: 'Numbers & Constants' },
  { key: 'variable', label: 'Variables' },
  { key: 'delimiter', label: 'Operators & Braces' },
];

export const AppearanceCustomizerModal: React.FC<AppearanceCustomizerModalProps> = ({
  isOpen,
  initialTab,
  onTabChange,
  onClose,
  currentTheme,
}) => {
  const customization = useCustomization();
  if (!isOpen) return null;

  const isLight = currentTheme.type === 'light';
  const resolvedTokens = customizationService.getResolvedSyntaxTokens();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div
        className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden select-none"
        style={{
          backgroundColor: currentTheme.ui.sideBarBg,
          borderColor: currentTheme.ui.sideBarBorder,
          color: currentTheme.ui.sideBarFg,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{
            backgroundColor: currentTheme.ui.sideBarHeaderBg,
            borderColor: currentTheme.ui.sideBarBorder,
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center border"
              style={{
                backgroundColor: `${currentTheme.ui.accent}18`,
                borderColor: `${currentTheme.ui.accent}44`,
                color: currentTheme.ui.accent,
              }}
            >
              {initialTab === 'icons' ? <FolderKanban size={15} /> : <Palette size={15} />}
            </div>
            <div>
              <h2 className="text-[13px] font-semibold">
                {initialTab === 'icons'
                  ? 'Icon Pack Studio — File & Folder Icons'
                  : 'Code Colour Studio — Syntax Token Styler'}
              </h2>
              <p className="text-[11px] opacity-65">
                {initialTab === 'icons'
                  ? 'Applies across Explorer, Editor Tabs, Breadcrumbs, Search & Quick Open'
                  : 'Customize live Monaco editor syntax colors independently of your workbench theme'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-md transition-colors ${
              isLight ? 'hover:bg-black/10 text-gray-600' : 'hover:bg-white/10 text-gray-300'
            }`}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div
          className="flex items-center gap-2 px-4 py-2 border-b shrink-0"
          style={{ borderColor: currentTheme.ui.sideBarBorder }}
        >
          <button
            onClick={() => onTabChange('icons')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium border transition-colors ${
              initialTab === 'icons'
                ? 'bg-[#007acc] border-[#007acc] text-white'
                : isLight
                ? 'bg-black/[0.03] border-gray-300 text-gray-700 hover:bg-black/10'
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
            }`}
          >
            <FolderKanban size={13} />
            <span>File & Folder Icons</span>
          </button>
          <button
            onClick={() => onTabChange('colors')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium border transition-colors ${
              initialTab === 'colors'
                ? 'bg-[#007acc] border-[#007acc] text-white'
                : isLight
                ? 'bg-black/[0.03] border-gray-300 text-gray-700 hover:bg-black/10'
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
            }`}
          >
            <Palette size={13} />
            <span>Code Syntax Colours</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {initialTab === 'icons' ? (
            <>
              {!customization.iconExtensionEnabled && (
                <div className="p-2.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-400 text-[11px]">
                  Icon Pack Studio extension is currently disabled. Enable it in Extensions to apply your selected pack.
                </div>
              )}

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-2.5">
                  Choose File & Folder Icon Pack
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {ICON_PACKS.map((pack) => {
                    const isSelected = customization.iconPack === pack.id;
                    return (
                      <button
                        key={pack.id}
                        onClick={() => customizationService.setIconPack(pack.id)}
                        className={`text-left p-3 rounded-lg border transition-all space-y-2.5 ${
                          isSelected
                            ? 'border-[#007acc] bg-[#007acc]/10 ring-1 ring-[#007acc]/40'
                            : isLight
                            ? 'border-gray-200 bg-white hover:border-gray-300'
                            : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: pack.previewAccent }}
                            />
                            <span className="font-semibold text-[12px]">{pack.name}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-[#007acc] shrink-0" />}
                        </div>
                        <p className="text-[11px] opacity-70 leading-snug">{pack.description}</p>

                        {/* Live sample icons row */}
                        <div
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded border ${
                            isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/30 border-white/10'
                          }`}
                        >
                          <FolderIcon isOpen={true} size={15} packOverride={pack.id} />
                          <FolderIcon isOpen={false} size={15} packOverride={pack.id} />
                          <span className="opacity-30 text-[10px]">|</span>
                          {SAMPLE_FILENAMES.map((fn) => (
                            <span key={fn} title={fn} className="inline-flex items-center">
                              <FileIcon filename={fn} size={15} packOverride={pack.id} />
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-2">
                  Custom Folder Color Accent
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {FOLDER_COLOR_PRESETS.map((preset) => {
                    const active = customization.folderColor === preset.hex;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => customizationService.setFolderColor(preset.hex)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[11px] transition-colors ${
                          active
                            ? 'border-[#007acc] bg-[#007acc]/15 font-medium'
                            : isLight
                            ? 'border-gray-200 bg-white hover:bg-gray-50'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <FolderIcon
                          isOpen={false}
                          size={14}
                          folderColorOverride={preset.hex}
                        />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {!customization.syntaxExtensionEnabled && (
                <div className="p-2.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-400 text-[11px]">
                  Code Colour Studio extension is currently disabled. Enable it in Extensions to apply custom syntax colors.
                </div>
              )}

              {/* Live Code Preview Box */}
              <div
                className="rounded-lg border p-3.5 font-mono text-[12px] leading-relaxed overflow-x-auto"
                style={{
                  backgroundColor: currentTheme.ui.editorBg,
                  borderColor: currentTheme.ui.sideBarBorder,
                }}
              >
                <div style={{ color: resolvedTokens.comment }}>
                  {'// Live Syntax Colour Preview'}
                </div>
                <div>
                  <span style={{ color: resolvedTokens.keyword }}>export async function </span>
                  <span style={{ color: resolvedTokens.function }}>fetchPortfolio</span>
                  <span style={{ color: resolvedTokens.delimiter }}>(</span>
                  <span style={{ color: resolvedTokens.variable }}>userId</span>
                  <span style={{ color: resolvedTokens.delimiter }}>: </span>
                  <span style={{ color: resolvedTokens.type }}>string</span>
                  <span style={{ color: resolvedTokens.delimiter }}>) {'{'}</span>
                </div>
                <div className="pl-4">
                  <span style={{ color: resolvedTokens.keyword }}>const </span>
                  <span style={{ color: resolvedTokens.variable }}>limit</span>
                  <span style={{ color: resolvedTokens.delimiter }}> = </span>
                  <span style={{ color: resolvedTokens.number }}>25</span>
                  <span style={{ color: resolvedTokens.delimiter }}>;</span>
                </div>
                <div className="pl-4">
                  <span style={{ color: resolvedTokens.keyword }}>const </span>
                  <span style={{ color: resolvedTokens.variable }}>endpoint</span>
                  <span style={{ color: resolvedTokens.delimiter }}> = </span>
                  <span style={{ color: resolvedTokens.string }}>&quot;/api/studio/metrics&quot;</span>
                  <span style={{ color: resolvedTokens.delimiter }}>;</span>
                </div>
                <div className="pl-4">
                  <span style={{ color: resolvedTokens.keyword }}>return </span>
                  <span style={{ color: resolvedTokens.function }}>fetch</span>
                  <span style={{ color: resolvedTokens.delimiter }}>(</span>
                  <span style={{ color: resolvedTokens.variable }}>endpoint</span>
                  <span style={{ color: resolvedTokens.delimiter }}>);</span>
                </div>
                <div style={{ color: resolvedTokens.delimiter }}>{'}'}</div>
              </div>

              {/* Palette Presets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">
                    Syntax Color Presets
                  </span>
                  <button
                    onClick={() => customizationService.resetSyntaxColors()}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] transition-colors ${
                      isLight
                        ? 'border-gray-300 bg-white hover:bg-gray-100 text-gray-700'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    <RotateCcw size={11} />
                    <span>Reset Default</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SYNTAX_PALETTES.map((pal) => {
                    const isSelected =
                      customization.syntaxPalette === pal.id &&
                      Object.keys(customization.customTokens).length === 0;
                    const dots = [
                      pal.tokens.keyword,
                      pal.tokens.string,
                      pal.tokens.function,
                      pal.tokens.type,
                      pal.tokens.number,
                    ];

                    return (
                      <button
                        key={pal.id}
                        onClick={() => customizationService.setSyntaxPalette(pal.id)}
                        className={`text-left p-2.5 rounded-lg border transition-all space-y-1.5 ${
                          customization.syntaxPalette === pal.id
                            ? 'border-[#007acc] bg-[#007acc]/10'
                            : isLight
                            ? 'border-gray-200 bg-white hover:border-gray-300'
                            : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[12px]">{pal.name}</span>
                          <div className="flex items-center gap-1">
                            {dots.map((hex, idx) => (
                              <span
                                key={idx}
                                className="w-2.5 h-2.5 rounded-full border border-black/20"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                            {isSelected && <Check size={13} className="text-[#007acc] ml-1" />}
                          </div>
                        </div>
                        <p className="text-[11px] opacity-65 leading-snug">{pal.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Per-Token Color Pickers */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider opacity-70 mb-2">
                  Fine-Tune Individual Syntax Token Colors
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TOKEN_FIELDS.map(({ key, label }) => {
                    const value = resolvedTokens[key];
                    return (
                      <label
                        key={key}
                        className={`flex items-center justify-between gap-2 p-2 rounded border cursor-pointer ${
                          isLight
                            ? 'border-gray-200 bg-white hover:border-gray-300'
                            : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium truncate">{label}</div>
                          <div className="text-[10px] font-mono opacity-65 uppercase">{value}</div>
                        </div>
                        <input
                          type="color"
                          value={value}
                          onChange={(e) =>
                            customizationService.setCustomTokenColor(key, e.target.value)
                          }
                          className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer shrink-0 p-0"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-t text-[11px] shrink-0"
          style={{
            backgroundColor: currentTheme.ui.sideBarHeaderBg,
            borderColor: currentTheme.ui.sideBarBorder,
          }}
        >
          <span className="opacity-70">
            Changes save automatically to your browser profile.
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1 rounded bg-[#007acc] hover:bg-[#007acc]/90 text-white font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
