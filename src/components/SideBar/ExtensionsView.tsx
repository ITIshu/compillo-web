import React, { useState } from 'react';
import {
  Search,
  Plus,
  Star,
  Download,
  Settings,
  Code2,
  Trash2,
  Play,
  Palette,
  Sparkles,
  Zap,
  HardDrive,
} from 'lucide-react';
import { VSCodePlugin } from '../../types/plugin';
import { VSCodeThemeDefinition } from '../../services/themes';
import { pluginManager } from '../../services/pluginSystem';

interface ExtensionsViewProps {
  currentTheme?: VSCodeThemeDefinition;
  plugins: VSCodePlugin[];
  onTogglePlugin: (pluginId: string) => void;
  onOpenNewPluginModal: () => void;
  onDeletePlugin: (pluginId: string) => void;
  onRunPluginCommand: (cmdId: string) => void;
}

export const ExtensionsView: React.FC<ExtensionsViewProps> = ({
  currentTheme,
  plugins,
  onTogglePlugin,
  onOpenNewPluginModal,
  onDeletePlugin,
  onRunPluginCommand,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const isLight = currentTheme?.type === 'light';
  const categories = [
    'All',
    'Recommended',
    'Enabled',
    'Unloaded',
    'Themes',
    'Formatters',
    'Linters',
    'Tools',
    'Preview',
  ];

  const recommendations = pluginManager.getRecommendations();
  const detectedStacks = pluginManager.getDetectedStacks();
  const spaceStats = pluginManager.getSpaceStats();
  const recMap = new Map(recommendations.map((r) => [r.plugin.id, r]));
  const unenabledRecs = recommendations.filter((r) => !r.plugin.enabled);
  const hasOptionalLoaded = plugins.some(
    (p) => p.lazyChunk && !p.alwaysEssential && p.enabled && !recMap.has(p.id)
  );

  const filtered = plugins.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.displayName.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.publisher.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.languages || []).some((lang) => lang.toLowerCase().includes(q));

    const matchesCategory =
      selectedCategory === 'All'
        ? true
        : selectedCategory === 'Recommended'
        ? recMap.has(p.id)
        : selectedCategory === 'Enabled'
        ? p.enabled
        : selectedCategory === 'Unloaded'
        ? !p.enabled
        : p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div
      className="flex flex-col h-full select-none text-[12px]"
      style={{
        color: currentTheme?.ui.sideBarFg || '#cccccc',
      }}
    >
      {/* Search & Actions Header */}
      <div
        className="p-3 border-b space-y-2"
        style={{ borderColor: currentTheme?.ui.sideBarBorder || '#2b2b2b' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-70 truncate">
              Extensions
            </span>
            <span className="text-[10px] font-mono tabular-nums opacity-60">
              {spaceStats.activeCount}/{plugins.length}
            </span>
          </div>
          <button
            id="create-new-plugin-btn"
            onClick={onOpenNewPluginModal}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#007acc] hover:bg-[#007acc]/90 text-white text-[11px] font-medium transition-colors shrink-0"
          >
            <Plus size={12} />
            <span>Create Plugin</span>
          </button>
        </div>

        {/* Runtime Space & Lazy-Load Budget Strip */}
        <div
          className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded border text-[10px] ${
            isLight
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
          }`}
        >
          <span className="flex items-center gap-1.5 min-w-0 truncate font-mono tabular-nums">
            <HardDrive size={11} className="shrink-0" />
            <span className="truncate">
              {spaceStats.unloadedCount} unloaded ({spaceStats.savedKb} KB free)
            </span>
          </span>
          {hasOptionalLoaded && (
            <button
              onClick={() => pluginManager.unloadUnusedSpecialized()}
              title="Unload specialized extensions not needed by the current project"
              className={`px-1.5 py-0.5 rounded border text-[9px] font-medium shrink-0 transition-colors ${
                isLight
                  ? 'bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/25'
              }`}
            >
              Free Unused
            </button>
          )}
        </div>

        {/* Project Language Auto-Suggestions Card */}
        {recommendations.length > 0 && (
          <div
            className={`p-2 rounded border space-y-1.5 ${
              isLight
                ? 'bg-sky-50/80 border-sky-200 text-sky-950'
                : 'bg-sky-500/10 border-sky-500/25 text-sky-100'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold min-w-0">
                <Sparkles size={12} className="text-sky-400 shrink-0" />
                <span className="truncate">
                  Suggested ({detectedStacks.join(', ') || 'Project'})
                </span>
              </div>
              {unenabledRecs.length > 0 ? (
                <button
                  onClick={() => pluginManager.enableAllRecommended()}
                  className="px-2 py-0.5 rounded bg-[#007acc] hover:bg-[#007acc]/90 text-white text-[10px] font-medium shrink-0 transition-colors"
                >
                  Load {unenabledRecs.length}
                </button>
              ) : (
                <span className="text-[10px] font-mono text-emerald-400 shrink-0">Ready</span>
              )}
            </div>
            {unenabledRecs.length > 0 && (
              <div className="space-y-1">
                {unenabledRecs.slice(0, 3).map((rec) => (
                  <div
                    key={rec.plugin.id}
                    className="flex items-center justify-between gap-2 text-[10px]"
                  >
                    <span className="truncate opacity-85">
                      <strong className="font-medium">{rec.plugin.displayName}</strong>
                      <span className="opacity-70"> — {rec.stackLabel}</span>
                    </span>
                    <button
                      onClick={() => onTogglePlugin(rec.plugin.id)}
                      className={`px-1.5 py-0.5 rounded border text-[9px] shrink-0 transition-colors ${
                        isLight
                          ? 'bg-white border-sky-300 text-sky-700 hover:bg-sky-100'
                          : 'bg-sky-500/15 border-sky-400/30 text-sky-300 hover:bg-sky-500/25'
                      }`}
                    >
                      Enable
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search input */}
        <div
          className={`relative flex items-center border rounded px-2 py-1 focus-within:border-[#007acc] ${
            isLight ? 'bg-white border-gray-300' : 'bg-[#222222] border-[#3c3c3c]'
          }`}
        >
          <Search size={13} className="opacity-50 mr-1.5 shrink-0" />
          <input
            type="text"
            placeholder="Search extensions or languages (py, sql, ts)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`bg-transparent text-[12px] outline-none w-full ${
              isLight ? 'text-gray-900 placeholder:text-gray-400' : 'text-white placeholder:text-gray-500'
            }`}
          />
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap border transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#007acc] border-[#007acc] text-white font-medium'
                  : isLight
                  ? 'bg-black/[0.03] border-gray-300 text-gray-700 hover:bg-black/10'
                  : 'bg-white/5 border-white/10 text-[#999999] hover:text-white'
              }`}
            >
              {cat}
              {cat === 'Recommended' && recommendations.length > 0
                ? ` (${recommendations.length})`
                : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Extensions List */}
      <div
        className={`flex-1 overflow-y-auto divide-y ${
          isLight ? 'divide-gray-200' : 'divide-[#2b2b2b]'
        }`}
      >
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-[11px] opacity-60">
            No extensions matching &quot;{search}&quot; in {selectedCategory}.
          </div>
        ) : (
          filtered.map((plugin) => {
            const rec = recMap.get(plugin.id);
            return (
              <div
                key={plugin.id}
                className={`p-3 transition-colors space-y-1.5 ${
                  isLight ? 'hover:bg-black/[0.03]' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded flex items-center justify-center shrink-0 border text-[#007acc] ${
                        isLight ? 'bg-black/5 border-gray-300' : 'bg-[#2b2b2b] border-white/10'
                      }`}
                    >
                      {plugin.customCode ? (
                        <Code2 size={17} />
                      ) : plugin.category === 'Themes' ? (
                        <Palette size={17} />
                      ) : (
                        <Settings size={17} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`font-semibold text-[12px] truncate ${
                            isLight ? 'text-gray-900' : 'text-white'
                          }`}
                        >
                          {plugin.displayName}
                        </span>
                        <span className="text-[10px] font-mono tabular-nums opacity-60">
                          v{plugin.version}
                        </span>
                      </div>
                      <div className="text-[11px] opacity-65 truncate">{plugin.publisher}</div>
                    </div>
                  </div>

                  {/* Enable / Disable Button */}
                  <button
                    id={`toggle-plugin-${plugin.id}`}
                    onClick={() => onTogglePlugin(plugin.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors shrink-0 border ${
                      plugin.enabled
                        ? 'bg-emerald-600/15 text-emerald-500 border-emerald-500/30 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30'
                        : isLight
                        ? 'bg-gray-200 border-gray-300 text-gray-800 hover:bg-[#007acc] hover:text-white'
                        : 'bg-white/10 border-white/10 text-[#cccccc] hover:bg-[#007acc] hover:text-white'
                    }`}
                  >
                    {plugin.enabled ? 'Unload' : plugin.lazyChunk ? 'Load' : 'Enable'}
                  </button>
                </div>

                {rec && (
                  <div className="flex items-center gap-1 text-[10px] text-sky-400">
                    <Zap size={10} className="shrink-0" />
                    <span className="truncate">{rec.reason}</span>
                  </div>
                )}

                <p className="text-[11px] opacity-80 leading-relaxed line-clamp-2">
                  {plugin.description}
                </p>

                {/* Contributed Command Actions */}
                {plugin.enabled &&
                  plugin.contributes?.commands &&
                  plugin.contributes.commands.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      {plugin.contributes.commands.map((cmd) => (
                        <button
                          key={cmd.id}
                          onClick={() => onRunPluginCommand(cmd.id)}
                          title={`Run: ${cmd.title}${cmd.shortcut ? ` (${cmd.shortcut})` : ''}`}
                          className={`px-1.5 py-0.5 rounded border text-[10px] flex items-center gap-1 transition-colors ${
                            isLight
                              ? 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
                              : 'bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20'
                          }`}
                        >
                          <Play size={9} />
                          <span>{cmd.title}</span>
                        </button>
                      ))}
                    </div>
                  )}

                {/* Plugin Metrics */}
                <div className="flex items-center justify-between pt-1 text-[10px] opacity-70">
                  <div className="flex items-center gap-2 flex-wrap font-mono tabular-nums">
                    {plugin.downloads && (
                      <span className="flex items-center gap-1">
                        <Download size={11} /> {(plugin.downloads / 1000000).toFixed(1)}M
                      </span>
                    )}
                    {plugin.rating && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <Star size={11} fill="currentColor" /> {plugin.rating}
                      </span>
                    )}
                    <span
                      className={`px-1.5 py-0.5 rounded border font-sans text-[10px] ${
                        isLight ? 'bg-black/5 border-gray-200' : 'bg-white/5 border-white/10'
                      }`}
                    >
                      {plugin.category}
                    </span>
                    {(!plugin.lazyChunk || plugin.alwaysEssential) && plugin.builtIn ? (
                      <span
                        className={`px-1.5 py-0.5 rounded border font-sans text-[10px] ${
                          isLight
                            ? 'border-sky-200 bg-sky-50 text-sky-700'
                            : 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                        }`}
                      >
                        Daily Essential
                      </span>
                    ) : plugin.lazyChunk ? (
                      <span
                        className={`px-1.5 py-0.5 rounded border font-sans text-[10px] ${
                          plugin.enabled
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : isLight
                            ? 'border-gray-300 bg-gray-100 text-gray-600'
                            : 'border-white/10 bg-white/5 text-gray-400'
                        }`}
                      >
                        {plugin.enabled
                          ? `Active · ${plugin.estimatedKb || 15} KB`
                          : `Unloaded · ${plugin.estimatedKb || 15} KB`}
                      </span>
                    ) : null}
                  </div>

                  {!plugin.builtIn && (
                    <button
                      onClick={() => {
                        if (confirm(`Uninstall custom plugin "${plugin.displayName}"?`)) {
                          onDeletePlugin(plugin.id);
                        }
                      }}
                      title="Uninstall"
                      className="p-1 hover:bg-red-500/20 text-red-400 rounded"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
