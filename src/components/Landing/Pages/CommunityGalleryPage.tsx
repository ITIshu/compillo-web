import React, { useEffect, useState } from 'react';
import { ExternalLink, Heart, Search, Upload } from 'lucide-react';
import { User } from 'firebase/auth';
import { WebsiteThemeTokens } from './WebsitePageTheme';
import {
  getUserLikedAppSlugs,
  HostedAppCategory,
  HostedAppDoc,
  subscribePublicGallery,
  toggleAppUpvote,
} from '../../../services/firestorePlatformService';
import { googleSignIn } from '../../../services/googleAuth';

interface CommunityGalleryPageProps {
  tokens: WebsiteThemeTokens;
  firebaseUser: User | null;
  onOpenHosting: () => void;
}

const FILTERS: Array<'All' | HostedAppCategory> = [
  'All',
  'Calculators & Tools',
  'Web Apps',
  'Python Backends',
  'Student Labs',
];

const FEATURED_STARTER_SITE: HostedAppDoc = {
  slug: 'ishant-calculator',
  ownerId: 'compillo-official',
  ownerName: 'Ishant Saraogi',
  title: 'PyCalc Studio AST Calculator',
  description: 'Full-stack scientific calculator backed by a safe Python AST evaluation server on port 5050.',
  category: 'Calculators & Tools',
  mode: 'calculator',
  files: [],
  isPublic: true,
  likesCount: 42,
};

export const CommunityGalleryPage: React.FC<CommunityGalleryPageProps> = ({
  tokens,
  firebaseUser,
  onOpenHosting,
}) => {
  const [apps, setApps] = useState<HostedAppDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | HostedAppCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [likedSlugs, setLikedSlugs] = useState<Set<string>>(new Set());
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribePublicGallery(
      (list) => {
        setApps(list);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!firebaseUser || apps.length === 0) {
      setLikedSlugs(new Set());
      return;
    }
    void getUserLikedAppSlugs(
      firebaseUser.uid,
      apps.map((a) => a.slug)
    ).then(setLikedSlugs);
  }, [firebaseUser, apps]);

  const combinedApps: HostedAppDoc[] = [
    ...(apps.some((a) => a.slug === 'ishant-calculator') ? [] : [FEATURED_STARTER_SITE]),
    ...apps,
  ];

  const visibleApps = combinedApps.filter((item) => {
    const matchesCat = filter === 'All' || item.category === filter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.slug.toLowerCase().includes(q) ||
      item.ownerName.toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const handleUpvote = async (item: HostedAppDoc) => {
    setActionMsg(null);
    if (item.ownerId === 'compillo-official') {
      setActionMsg('Starter showcase upvote recorded locally. Publish custom apps to save Firestore upvotes.');
      return;
    }
    if (!firebaseUser) {
      try {
        await googleSignIn();
      } catch {
        setActionMsg('Sign in with Google to upvote community projects.');
      }
      return;
    }

    try {
      const nowLiked = await toggleAppUpvote(item);
      setLikedSlugs((prev) => {
        const next = new Set(prev);
        if (nowLiked) next.add(item.slug);
        else next.delete(item.slug);
        return next;
      });
    } catch (err: any) {
      setActionMsg(err?.message || 'Could not update vote.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-medium flex items-center gap-2" style={{ color: tokens.fgMuted }}>
            <span>Compillo Community Showcase</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{visibleApps.length} Live Apps</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
            Community Hosted Apps Gallery
          </h1>
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: tokens.fgMuted }}>
            Explore live web apps, Python backends, and student utilities deployed on Compillo Cloud. Launch any app directly or publish your own.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenHosting}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
        >
          <Upload size={14} />
          <span>Publish Your App</span>
        </button>
      </div>

      {/* Filter Tabs + Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl border" style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg }}>
          {FILTERS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              style={
                filter === cat
                  ? { backgroundColor: tokens.accent, color: tokens.accentText }
                  : { color: tokens.fgMuted }
              }
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search apps, authors, slugs..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs outline-none"
            style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg, color: tokens.fgPrimary }}
          />
        </div>
      </div>

      {error && <div className="text-xs text-rose-400">{error}</div>}
      {actionMsg && <div className="text-xs" style={{ color: tokens.accent }}>{actionMsg}</div>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-48 rounded-2xl border animate-pulse" style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg }} />
          ))}
        </div>
      ) : visibleApps.length === 0 ? (
        <div className="p-10 rounded-2xl border text-center space-y-3" style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg }}>
          <div className="text-sm font-semibold">No matching community apps found</div>
          <p className="text-xs" style={{ color: tokens.fgMuted }}>
            Try another filter or publish your own hosted app from the Hosted Sites page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleApps.map((appItem) => {
            const isLiked = likedSlugs.has(appItem.slug);
            return (
              <div
                key={appItem.slug}
                className="p-6 rounded-2xl border flex flex-col justify-between gap-5"
                style={{ borderColor: tokens.borderColor, backgroundColor: tokens.surfaceBg }}
              >
                <div className="space-y-2.5">
                  <div className="text-xs font-medium flex flex-wrap items-center gap-1.5" style={{ color: tokens.fgMuted }}>
                    <span>{appItem.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{appItem.mode === 'custom-static' ? 'Static Web' : 'Python Backend'}</span>
                    <span aria-hidden="true">·</span>
                    <span>by {appItem.ownerName}</span>
                  </div>
                  <h2 className="text-lg font-bold tracking-tight">{appItem.title}</h2>
                  <p className="text-xs leading-relaxed line-clamp-2" style={{ color: tokens.fgMuted }}>
                    {appItem.description || 'Hosted live on Compillo Cloud infrastructure.'}
                  </p>
                  <div className="text-[11px] font-mono truncate opacity-75">/hosted/{appItem.slug}/</div>
                </div>

                <div className="pt-3 border-t flex items-center justify-between gap-3" style={{ borderColor: tokens.borderColor }}>
                  <button
                    type="button"
                    onClick={() => handleUpvote(appItem)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold tabular-nums cursor-pointer"
                    style={{
                      borderColor: isLiked ? tokens.accent : tokens.borderColor,
                      backgroundColor: tokens.pageBg,
                      color: isLiked ? tokens.accent : tokens.fgPrimary,
                    }}
                  >
                    <Heart size={13} fill={isLiked ? 'currentColor' : 'none'} />
                    <span>{appItem.likesCount || 0}</span>
                  </button>

                  <a
                    href={`/hosted/${appItem.slug}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0"
                    style={{ backgroundColor: tokens.accent, color: tokens.accentText }}
                  >
                    <span>Launch App</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
