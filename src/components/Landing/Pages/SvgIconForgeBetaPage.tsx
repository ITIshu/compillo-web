import React, { useState } from 'react';
import { WebsiteThemeTokens } from './WebsitePageTheme';
import { Copy, Check, Search, ExternalLink, ShoppingCart, ShoppingBag, CreditCard, Tag, Search as SearchIcon, User, Settings, Bell, Star, Heart, CheckCircle, Plus, Trash2, ArrowRight, Share2, Download, Shield } from 'lucide-react';

interface SvgIconForgeBetaPageProps {
  tokens: WebsiteThemeTokens;
}

const MULTI_PLATFORM_ICONS = [
  // Lucide / E-commerce & UI
  { name: 'ShoppingCart', category: 'Lucide UI / E-Commerce', source: 'Lucide Icons', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>' },
  { name: 'ShoppingBag', category: 'Lucide UI / E-Commerce', source: 'Lucide Icons', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>' },
  { name: 'CreditCard', category: 'Lucide UI / E-Commerce', source: 'Lucide Icons', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>' },
  { name: 'Tag', category: 'Lucide UI / E-Commerce', source: 'Lucide Icons', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>' },
  { name: 'User', category: 'UI Core', source: 'Heroicons / Lucide', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
  { name: 'Settings', category: 'UI Core', source: 'Lucide Icons', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>' },
  { name: 'Bell', category: 'UI Core', source: 'Lucide Icons', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.33 21a1.94 1.94 0 0 0 3.34 0"/></svg>' },
  { name: 'Star', category: 'UI Feedback', source: 'Lucide Icons', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
  { name: 'Heart', category: 'UI Feedback', source: 'Lucide Icons', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>' },
  // Simple Icons Brands
  { name: 'GitHub', category: 'Brands', source: 'Simple Icons', svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>' },
  { name: 'React', category: 'Frameworks', source: 'Simple Icons', svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 2c-4.97 4.97-4.97 13.03 0 18m0-18c4.97 4.97 4.97 13.03 0 18m-9-9c4.97-4.97 13.03-4.97 18 0m-18 0c4.97 4.97 13.03 4.97 18 0"/></svg>' },
  { name: 'TailwindCSS', category: 'Styling', source: 'Simple Icons', svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor"><path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8 1.024.256 1.758 1.008 2.572 1.836C14.544 10.978 16.28 12.8 20.4 12.8c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2-1.8-1.024-.256-1.758-1.008-2.572-1.836C17.858 6.622 16.12 4.8 12.001 4.8z"/></svg>' },
];

export const SvgIconForgeBetaPage: React.FC<SvgIconForgeBetaPageProps> = ({ tokens }) => {
  const [search, setSearch] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(MULTI_PLATFORM_ICONS[0]);
  const [iconColor, setIconColor] = useState('#60a5fa');
  const [copiedSvg, setCopiedSvg] = useState(false);

  const filteredIcons = MULTI_PLATFORM_ICONS.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()) || i.source.toLowerCase().includes(search.toLowerCase()));

  const getCustomizedSvg = () => {
    return selectedIcon.svg.replace(/fill="currentColor"/g, `fill="${iconColor}"`).replace(/stroke="currentColor"/g, `stroke="${iconColor}"`);
  };

  const handleCopySvg = () => {
    navigator.clipboard.writeText(getCustomizedSvg());
    setCopiedSvg(true);
    setTimeout(() => setCopiedSvg(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b" style={{ borderColor: tokens.borderColor }}>
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
              Lucide & Simple Icons Registry
            </span>
            <span className="text-xs text-gray-400 font-mono">Multi-Platform SVG Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: tokens.fgPrimary }}>
            Lucide React & Multi-Platform SVG Icon Hub
          </h1>
          <p className="text-sm mt-1" style={{ color: tokens.fgMuted }}>
            Browse E-Commerce cart icons, UI symbols, and brand icons sourced from **Lucide**, **Heroicons**, and **Simple Icons**.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://lucide.dev"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-blue-300 border border-white/10 text-xs font-mono transition-colors"
          >
            <ExternalLink size={12} /> Lucide Source
          </a>
          <a
            href="https://simpleicons.org"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-blue-300 border border-white/10 text-xs font-mono transition-colors"
          >
            <ExternalLink size={12} /> Simple Icons Source
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Icon Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search cart, user, star, github, react..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-xs font-mono text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredIcons.map((icon) => (
              <button
                key={icon.name}
                onClick={() => setSelectedIcon(icon)}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2.5 transition-all text-left ${
                  selectedIcon.name === icon.name ? 'border-blue-500 bg-blue-500/10 shadow-lg' : 'hover:bg-white/5'
                }`}
                style={{ backgroundColor: selectedIcon.name === icon.name ? undefined : tokens.surfaceBg, borderColor: tokens.borderColor }}
              >
                <div
                  className="text-blue-400"
                  dangerouslySetInnerHTML={{ __html: icon.svg.replace('width="24"', 'width="36"').replace('height="24"', 'height="36"') }}
                />
                <div className="text-center">
                  <span className="block text-xs font-semibold font-mono" style={{ color: tokens.fgPrimary }}>{icon.name}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{icon.source}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right / Inspector */}
        <div className="space-y-4">
          <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
            <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: tokens.borderColor }}>
              <ShoppingCart size={16} className="text-blue-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider font-mono" style={{ color: tokens.fgPrimary }}>Icon Inspector</h2>
            </div>

            <div className="h-32 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center">
              <div
                className="scale-150 transform transition-transform"
                dangerouslySetInnerHTML={{ __html: getCustomizedSvg() }}
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Icon Tint Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={iconColor}
                  onChange={(e) => setIconColor(e.target.value)}
                  className="w-10 h-9 rounded bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={iconColor}
                  onChange={(e) => setIconColor(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-xs font-mono text-gray-200 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleCopySvg}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow transition-all"
            >
              {copiedSvg ? <Check size={14} /> : <Copy size={14} />}
              {copiedSvg ? 'Copied SVG Markup' : 'Copy SVG Markup'}
            </button>
          </div>

          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: tokens.surfaceBg, borderColor: tokens.borderColor }}>
            <div className="flex items-center justify-between px-4 py-3 border-b bg-black/20" style={{ borderColor: tokens.borderColor }}>
              <span className="text-xs font-semibold font-mono" style={{ color: tokens.fgPrimary }}>Raw SVG Code</span>
              <span className="text-[10px] font-mono text-gray-400">{selectedIcon.source}</span>
            </div>
            <div className="p-4 font-mono text-[11px] bg-black/40 text-blue-200 overflow-x-auto max-h-[160px]">
              <pre>{getCustomizedSvg()}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
