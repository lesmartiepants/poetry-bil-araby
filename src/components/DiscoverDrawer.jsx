import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Loader2, Search } from 'lucide-react';
import { motion } from 'framer-motion';

import { CATEGORIES } from '../constants/index.js';
import { useUIStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';
import { usePoemStore } from '../stores/poemStore';

/* 15-stop champagne-gold foil gradient. backgroundSize: 300% means only
   1/3 is visible at once. At position 0% the bright center (~150% in) is
   off-screen right; at 100% it is off-screen left — one R→L sweep. */
const GOLD_FOIL_GRADIENT =
  'linear-gradient(108deg, #C09028 0%, #D4A840 6%, #ECC860 13%, #F8E48A 20%, #FFFCE4 27%, #F6E080 34%, #D8B045 42%, #C29030 50%, #D6B040 58%, #EECB62 65%, #FBF0A0 72%, #FFFCE4 78%, #E8C450 85%, #C49030 92%, #D4A840 100%)';

/* ─── Animated golden fire icon with rising ember particles ─── */
const GoldenFireIcon = ({ size = 24, glow = true }) => {
  const animStyle = {
    animation: glow
      ? 'fireFlicker 6s ease-in-out infinite, fireGlow 6s ease-in-out infinite'
      : 'fireFlicker 6s ease-in-out infinite',
    transformOrigin: 'center bottom',
    willChange: 'transform, filter',
  };

  return (
    <>
      <style>{`
        @keyframes fireFlicker {
          0%, 100% { transform: scaleX(1) scaleY(1); }
          1.5% { transform: scaleX(1.07) scaleY(0.96); }
          3%   { transform: scaleX(0.96) scaleY(1.07); }
          4.5% { transform: scaleX(1.05) scaleY(0.97); }
          6%   { transform: scaleX(0.97) scaleY(1.04); }
          8%, 99.9% { transform: scaleX(1) scaleY(1); }
        }
        @keyframes fireGlow {
          0%, 100% { filter: drop-shadow(0 0 3px rgba(197,160,89,0.45)) drop-shadow(0 2px 6px rgba(197,160,89,0.25)); }
          50% { filter: drop-shadow(0 0 8px rgba(197,160,89,0.85)) drop-shadow(0 2px 12px rgba(197,160,89,0.5)); }
        }
        @keyframes ember1 {
          0%   { transform: translate(0px, 0px) scale(1);      opacity: 0.95; }
          15%  { transform: translate(-5px,-13px) scale(0.5);  opacity: 0.5; }
          25%  { transform: translate(-7px,-19px) scale(0.1);  opacity: 0; }
          26%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0; }
        }
        @keyframes ember2 {
          0%   { transform: translate(0px, 0px) scale(1);      opacity: 0.85; }
          15%  { transform: translate(5px, -14px) scale(0.5);  opacity: 0.4; }
          25%  { transform: translate(7px, -21px) scale(0.1);  opacity: 0; }
          26%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0; }
        }
        @keyframes ember3 {
          0%   { transform: translate(0px, 0px) scale(0.75);   opacity: 0.75; }
          15%  { transform: translate(2px, -11px) scale(0.4);  opacity: 0.35; }
          25%  { transform: translate(3px, -16px) scale(0);    opacity: 0; }
          26%, 100% { transform: translate(0px, 0px) scale(0.75); opacity: 0; }
        }
        @keyframes ember4 {
          0%   { transform: translate(0px, 0px) scale(0.6);    opacity: 0.6; }
          15%  { transform: translate(-3px,-10px) scale(0.3);  opacity: 0.25; }
          25%  { transform: translate(-4px,-14px) scale(0);    opacity: 0; }
          26%, 100% { transform: translate(0px, 0px) scale(0.6); opacity: 0; }
        }
        @keyframes ember5 {
          0%   { transform: translate(0px, 0px) scale(0.5);    opacity: 0.5; }
          25%  { transform: translate(1px, -12px) scale(0);    opacity: 0; }
          26%, 100% { transform: translate(0px, 0px) scale(0.5); opacity: 0; }
        }
      `}</style>
      <div
        className="relative inline-flex items-end justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          style={animStyle}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* Outer flame — deep gold */}
          <path
            d="M12 2C11.2 4.8 9 7 8 10C7.2 12.4 8 14.8 9.5 16.2C9 14.5 9.5 12.5 11 11.5C10.5 13.5 11.5 15.5 13 16.5C14.8 17.8 16 15.8 16.5 14C17.5 11 16 8.5 14.5 7C14.5 9 13.5 10.5 12.5 11.5C13 9 13.5 5.5 12 2Z"
            fill="rgba(197,160,89,0.92)"
          />
          {/* Inner flame — bright warm gold */}
          <path
            d="M12 6.5C11.5 8 10.5 9.5 10.5 11C10.5 12.5 11.2 13.8 12 14.5C12.8 13.5 13.2 12 12.8 10.5C13.5 11.5 13.8 13 13.5 14.5C14.5 13 14.5 11 13.5 9.5C13.5 10.5 13 11.5 12.5 12C13 10 13 8 12 6.5Z"
            fill="rgba(240,205,90,0.85)"
          />
          {/* Core — brightest tip */}
          <path
            d="M12 9C11.8 10 11.5 11 12 12C12.5 11 12.2 10 12 9Z"
            fill="rgba(255,235,130,0.7)"
          />
          {/* Base ember glow */}
          <ellipse cx="12" cy="18.5" rx="3.5" ry="1.5" fill="rgba(197,160,89,0.28)" />
        </svg>

        {/* Ember particles — different delays/positions */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '38%',
            left: '28%',
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: 'rgba(197,160,89,1)',
            animation: 'ember1 6s ease-out infinite 0s',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '42%',
            right: '26%',
            width: 2.5,
            height: 2.5,
            borderRadius: '50%',
            background: 'rgba(240,205,90,1)',
            animation: 'ember2 6s ease-out infinite 1.2s',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '46%',
            left: '46%',
            width: 2,
            height: 2,
            borderRadius: '50%',
            background: 'rgba(255,225,100,0.9)',
            animation: 'ember3 6s ease-out infinite 2.4s',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '35%',
            left: '38%',
            width: 2,
            height: 2,
            borderRadius: '50%',
            background: 'rgba(197,160,89,0.85)',
            animation: 'ember4 6s ease-out infinite 0.6s',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '40%',
            right: '35%',
            width: 1.5,
            height: 1.5,
            borderRadius: '50%',
            background: 'rgba(255,210,80,0.8)',
            animation: 'ember5 6s ease-out infinite 1.8s',
          }}
        />
      </div>
    </>
  );
};

/* ─── Normalize Arabic text for search matching ─── */
const normalizeAr = (s) =>
  s
    .normalize('NFC')
    .replace(
      /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g,
      ''
    )
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/[\u0649\u06CC]/g, '\u064A')
    .replace(/\u06A9/g, '\u0643')
    .replace(/\u0629/g, '\u0647');

/* ─── Arabic name romanization map (name-display focused, includes vowels) ─── */
const ARABIC_NAME_MAP = {
  'ا': 'a',  'أ': 'a',  'إ': 'i',  'آ': 'aa', 'ى': 'a',  'ٱ': 'a',
  'ب': 'b',  'ت': 't',  'ث': 'th', 'ج': 'j',  'ح': 'h',  'خ': 'kh',
  'د': 'd',  'ذ': 'dh', 'ر': 'r',  'ز': 'z',  'س': 's',  'ش': 'sh',
  'ص': 's',  'ض': 'd',  'ط': 't',  'ظ': 'z',
  'ع': 'aa', // guttural ʿayn → 'aa' for readability (e.g. سعدي → Saady)
  'غ': 'gh', 'ف': 'f',  'ق': 'q',  'ك': 'k',  'ل': 'l',
  'م': 'm',  'ن': 'n',  'ه': 'h',  'ة': 'a',
  'ء': '',   'ئ': 'y',  'ؤ': 'w',
  // Diacritics (rarely present in names, but handle if included)
  '\u064E': 'a', '\u064F': 'u', '\u0650': 'i', '\u0652': '',
};

/* ─── Romanize Arabic name → readable Latin fallback when name_en is absent ─── */
const romanizeArabic = (str) => {
  if (!str) return '';
  return str
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      let result = '';
      const chars = [...word];
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        // Shadda (ّ) – double the previous consonant (only if it's a letter)
        if (ch === '\u0651') {
          const last = result[result.length - 1];
          if (last && /[a-zA-Z]/.test(last)) result += last;
          continue;
        }
        // و: word-initial = consonant 'w', otherwise = long vowel 'ou'
        if (ch === 'و') { result += i === 0 ? 'w' : 'ou'; continue; }
        // ي: always 'y' (covers both consonant and vowel forms)
        if (ch === 'ي') { result += 'y'; continue; }
        result += ARABIC_NAME_MAP[ch] ?? '';
      }
      return result ? result[0].toUpperCase() + result.slice(1) : '';
    })
    .filter(Boolean)
    .join(' ');
};

/* ─── Main DiscoverDrawer component ─── */
const DiscoverDrawer = ({ onSurpriseMe, onSelectPoet }) => {
  const isOpen = useModalStore((s) => s.discoverDrawer);
  const onClose = () => useModalStore.getState().setDiscoverDrawer(false);
  const darkMode = useUIStore((s) => s.darkMode);
  const selectedCategory = usePoemStore((s) => s.selectedCategory);
  const dynamicPoets = usePoemStore((s) => s.dynamicPoets);
  const poetsFetched = usePoemStore((s) => s.poetsFetched);
  const isFetching = usePoemStore((s) => s.isFetching);

  const [poetSearch, setPoetSearch] = useState('');
  const searchRef = useRef(null);

  // Reset search on close
  useEffect(() => {
    if (!isOpen) setPoetSearch('');
  }, [isOpen]);

  // Focus search when opened
  useEffect(() => {
    if (isOpen && searchRef.current) {
      const t = setTimeout(() => searchRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const filteredPoetList = useMemo(() => {
    const featuredNormIds = new Set(
      CATEGORIES.filter((c) => c.id !== 'All').map((c) => normalizeAr(c.id))
    );

    const apiPoets = dynamicPoets
      .filter((p) => !featuredNormIds.has(normalizeAr(p.name)))
      .map((p) => {
        const parsedCount = Number.parseInt(p.poem_count, 10);
        const safeCount = Number.isFinite(parsedCount) && parsedCount >= 0 ? parsedCount : 0;
        return {
          id: p.name,
          label: p.name_en || romanizeArabic(p.name),
          labelAr: p.name,
          poemCount: safeCount,
        };
      });

    const featured = CATEGORIES.filter((c) => c.id !== 'All').map((cat) => {
      const catNorm = normalizeAr(cat.id);
      const apiMatch = dynamicPoets.find((p) => normalizeAr(p.name) === catNorm);

      if (!apiMatch) {
        return { ...cat, poemCount: null };
      }

      const parsedCount = Number.parseInt(apiMatch.poem_count, 10);
      const safeCount = Number.isFinite(parsedCount) && parsedCount >= 0 ? parsedCount : null;

      return { ...cat, poemCount: safeCount };
    });

    // Sort more-poets list alphabetically by English label, selected poet floats first
    const sortedAll = [...apiPoets].sort((a, b) => {
      if (a.id === selectedCategory) return -1;
      if (b.id === selectedCategory) return 1;
      return a.label.localeCompare(b.label, 'en', { sensitivity: 'base' });
    });

    if (!poetSearch.trim()) {
      // Move selected featured poet to the front of the strip
      const sortedFeatured = [...featured].sort((a, b) => {
        if (a.id === selectedCategory) return -1;
        if (b.id === selectedCategory) return 1;
        return 0;
      });
      return { featured: sortedFeatured, all: sortedAll };
    }

    const search = normalizeAr(poetSearch.trim().toLowerCase());
    const matchesSearch = (p) =>
      normalizeAr(p.labelAr).includes(search) || p.label.toLowerCase().includes(search);
    return {
      featured: featured.filter(matchesSearch),
      all: [...apiPoets].filter(matchesSearch).sort((a, b) => {
        if (a.id === selectedCategory) return -1;
        if (b.id === selectedCategory) return 1;
        return a.label.localeCompare(b.label, 'en', { sensitivity: 'base' });
      }),
    };
  }, [poetSearch, dynamicPoets, selectedCategory]);

  // Text color for the current theme
  const textColor = darkMode ? 'rgba(214,211,205,0.9)' : 'rgba(40,35,30,0.9)';
  const subTextColor = darkMode ? 'rgba(214,211,205,0.6)' : 'rgba(40,35,30,0.6)';
  const subtleBorder = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const cardBg = darkMode ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)';
  const stickyBg = darkMode ? 'rgba(18,16,12,0.97)' : 'rgba(253,252,248,0.97)';
  // Theme-aware lapis — #4A7CC9 in dark, #2E5090 in light (WCAG AA contrast)
  const lapisColor = darkMode ? 'var(--lapis-light)' : 'var(--lapis-medium)';

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[201] bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[202] rounded-t-3xl flex flex-col overflow-hidden"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        style={{
          height: '90dvh',
          background: darkMode
            ? 'linear-gradient(180deg, rgba(18,16,12,0.99) 0%, rgba(12,12,14,1) 100%)'
            : 'linear-gradient(180deg, rgba(253,252,248,0.99) 0%, rgba(245,243,238,1) 100%)',
          borderTop: '1px solid rgba(74,103,166,0.22)',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Drag handle bar */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-lapis-light/25" />
        </div>

        {/* Header */}
        <div className="relative px-5 pb-3 pt-1 flex-shrink-0">
          <h3
            className="font-brand-en font-bold text-[15px] leading-none"
            style={{ color: lapisColor }}
          >
            Discover a Poem
          </h3>
          <p
            className="font-brand-en text-[10px] uppercase tracking-[0.15em] mt-0.5"
            style={{ color: lapisColor, opacity: 0.55 }}
          >
            Featured Poets
          </p>
          <button
            onClick={onClose}
            className="absolute top-0 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{
              background: 'rgba(74,103,166,0.08)',
              border: '1px solid rgba(74,103,166,0.18)',
            }}
            aria-label="Close discover"
          >
            <X size={14} style={{ color: lapisColor, opacity: 0.7 }} />
          </button>
        </div>

        {/* ── Single unified scroll container ── */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(74,103,166,0.2) transparent' }}
        >
          {/* ── Horizontal strip: scrollable poet tiles (scrolls away) ── */}
          {!poetSearch && (
            <div className="pb-3">
              <div
                className="flex gap-2 pl-4 overflow-x-auto"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  maskImage: 'linear-gradient(to right, black 0%, black 82%, transparent 100%)',
                  WebkitMaskImage:
                    'linear-gradient(to right, black 0%, black 82%, transparent 100%)',
                }}
              >
                {/* All Poets tile */}
                <button
                  data-testid="poet-picker-button"
                  onClick={() => {
                    onSelectPoet('All');
                    onClose();
                  }}
                  className={`flex-shrink-0 rounded-2xl px-3 flex flex-col items-end justify-center transition-all duration-200 ${
                    selectedCategory === 'All'
                      ? 'border border-gold/50 bg-gold/12'
                      : 'hover:bg-lapis-light/8 border'
                  }`}
                  style={{
                    width: 96,
                    height: 70,
                    borderColor: selectedCategory === 'All' ? undefined : subtleBorder,
                    background: selectedCategory === 'All' ? undefined : cardBg,
                  }}
                >
                  <div
                    className="font-bold text-[13px] truncate w-full text-right"
                    dir="rtl"
                    style={{
                      fontFamily: "'Reem Kufi', sans-serif",
                      color: selectedCategory === 'All' ? 'var(--gold)' : textColor,
                    }}
                  >
                    كل الشعراء
                  </div>
                  <div
                    className="font-brand-en text-[10px] mt-0.5 truncate w-full text-right"
                    style={{
                      opacity: selectedCategory === 'All' ? 0.75 : 0.6,
                      color: selectedCategory === 'All' ? 'var(--gold)' : subTextColor,
                    }}
                  >
                    All Poets
                  </div>
                </button>

                {/* Featured poet tiles */}
                {filteredPoetList.featured.map((cat) => (
                  <button
                    key={cat.id}
                    data-testid="poet-picker-button"
                    onClick={() => {
                      onSelectPoet(cat.id);
                      onClose();
                    }}
                    className={`flex-shrink-0 rounded-2xl px-3 flex flex-col items-end justify-center transition-all duration-200 ${
                      selectedCategory === cat.id
                        ? 'border border-gold/50 bg-gold/12'
                        : 'hover:bg-lapis-light/8 border'
                    }`}
                    style={{
                      width: 96,
                      height: 70,
                      borderColor: selectedCategory === cat.id ? undefined : subtleBorder,
                      background: selectedCategory === cat.id ? undefined : cardBg,
                    }}
                  >
                    <div
                      className="font-bold text-[13px] truncate w-full text-right"
                      dir="rtl"
                      style={{
                        fontFamily: "'Reem Kufi', sans-serif",
                        color: selectedCategory === cat.id ? 'var(--gold)' : textColor,
                      }}
                    >
                      {cat.labelAr}
                    </div>
                    <div
                      className="font-brand-en text-[10px] mt-0.5 truncate w-full text-right"
                      style={{
                        opacity: selectedCategory === cat.id ? 0.75 : 0.6,
                        color: selectedCategory === cat.id ? 'var(--gold)' : subTextColor,
                      }}
                    >
                      {cat.label}
                    </div>
                  </button>
                ))}
                {/* Right spacer so last tile fades before edge */}
                <div className="flex-shrink-0 w-8" />
              </div>
            </div>
          )}

          {/* ── Sticky zone: Surprise Me + Search (stay visible as featured scrolls away) ── */}
          <div
            className="sticky top-0 z-10 pb-2"
            style={{
              background: stickyBg,
            }}
          >
            {/* Gold foil Surprise Me */}
            {!poetSearch && (
              <div className="px-4 pt-1 pb-2">
                <style>{`
                @keyframes goldFoilSheen {
                  /* At 0% the bright centre (at 150% of element width inside a 300%-wide
                     gradient) is off-screen right. At 100% it is off-screen left.
                     One clean R→L sweep, then holds. */
                  0%   { background-position: 0%   center; }
                  100% { background-position: 100% center; }
                }
              `}</style>
                <button
                  onClick={() => {
                    onSurpriseMe();
                    onClose();
                  }}
                  disabled={isFetching}
                  aria-label="Discover new poem"
                  className="w-full rounded-2xl py-3 px-4 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                  style={{
                    background: GOLD_FOIL_GRADIENT,
                    backgroundSize: '300% 100%',
                    backgroundPosition: '0% center',
                    animation: 'goldFoilSheen 2.4s ease-in-out 1 forwards',
                    boxShadow:
                      '0 2px 14px rgba(200,160,40,0.4), inset 0 1px 0 rgba(255,248,180,0.4), inset 0 -1px 0 rgba(0,0,0,0.10)',
                  }}
                >
                  <span
                    className="font-brand-en font-bold text-[13px] uppercase"
                    style={{
                      color: '#2c1a04',
                      textShadow: '0 1px 2px rgba(255,248,180,0.5)',
                      letterSpacing: '0.12em',
                    }}
                  >
                    Surprise Me
                  </span>
                </button>
              </div>
            )}

            {/* ── Search ── */}
            <div className="px-4 pb-2">
              <div className="relative flex items-center">
                <Search
                  className="absolute left-3"
                  size={13}
                  style={{ color: lapisColor, opacity: 0.4 }}
                />
                <input
                  ref={searchRef}
                  type="text"
                  value={poetSearch}
                  onChange={(e) => setPoetSearch(e.target.value)}
                  placeholder="Search poets..."
                  aria-label="Search poets"
                  className="w-full rounded-xl pl-8 pr-16 py-1.5 text-[14px] font-tajawal transition-colors focus:outline-none"
                  style={{
                    background: 'rgba(74,103,166,0.06)',
                    border: '1px solid rgba(74,103,166,0.18)',
                    color: darkMode ? '#d6d3cd' : '#3c3531',
                  }}
                />
                {/* Arabic hint — right side, shown only when input is empty */}
                {!poetSearch && (
                  <span
                    className="absolute right-3 text-[13px] font-tajawal pointer-events-none"
                    dir="rtl"
                    style={{ color: lapisColor, opacity: 0.28 }}
                  >
                    ...ابحث
                  </span>
                )}
                {poetSearch && (
                  <button
                    onClick={() => setPoetSearch('')}
                    className="absolute right-3"
                    aria-label="Clear search"
                    style={{ color: lapisColor, opacity: 0.5 }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Poet list ── */}
          <div className="pb-6">
            {!poetsFetched && dynamicPoets.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2
                  className="animate-spin"
                  size={20}
                  style={{ color: lapisColor, opacity: 0.4 }}
                />
              </div>
            ) : (
              <div className="flex flex-col">
                {/* ── All poets — compact single-column list (search results also show here) ── */}
                {/* When searching, also show featured matches in this list */}
                {poetSearch && filteredPoetList.featured.length > 0 && (
                  <div className="px-4">
                    {filteredPoetList.featured.map((cat, idx) => (
                      <button
                        key={cat.id}
                        data-testid="poet-picker-button"
                        onClick={() => {
                          onSelectPoet(cat.id);
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between py-2.5 px-2 rounded-lg transition-all duration-200 ${
                          selectedCategory === cat.id ? 'bg-gold/12' : 'hover:bg-lapis-light/6'
                        }`}
                        style={{
                          borderBottom:
                            idx < filteredPoetList.featured.length - 1 ||
                            filteredPoetList.all.length > 0
                              ? `1px solid ${subtleBorder}`
                              : 'none',
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
                          <span
                            className="font-brand-en text-[12px] font-semibold truncate"
                            style={{
                              opacity: selectedCategory === cat.id ? 0.85 : 0.65,
                              color: selectedCategory === cat.id ? 'var(--gold)' : subTextColor,
                            }}
                          >
                            {cat.label}
                          </span>
                        </div>
                        <div
                          className="font-bold text-[14px] flex-shrink-0"
                          dir="rtl"
                          style={{
                            fontFamily: "'Reem Kufi', sans-serif",
                            color: selectedCategory === cat.id ? 'var(--gold)' : textColor,
                          }}
                        >
                          {cat.labelAr}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {filteredPoetList.all.length > 0 && (
                  <div className="px-4">
                    {filteredPoetList.all.map((p, idx) => (
                      <button
                        key={p.id}
                        data-testid="poet-picker-button"
                        onClick={() => {
                          onSelectPoet(p.id);
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between py-2.5 px-2 rounded-lg transition-all duration-200 ${
                          selectedCategory === p.id ? 'bg-gold/12' : 'hover:bg-lapis-light/6'
                        }`}
                        style={{
                          borderBottom:
                            idx < filteredPoetList.all.length - 1
                              ? `1px solid ${subtleBorder}`
                              : 'none',
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
                          <span
                            className="font-brand-en text-[12px] font-semibold truncate"
                            style={{
                              opacity: selectedCategory === p.id ? 0.85 : 0.65,
                              color: selectedCategory === p.id ? 'var(--gold)' : subTextColor,
                            }}
                          >
                            {p.label}
                          </span>
                          {p.poemCount > 0 && (
                            <span
                              className="font-brand-en text-[9px] flex-shrink-0"
                              style={{ color: lapisColor, opacity: 0.4 }}
                            >
                              {p.poemCount.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div
                          className="font-bold text-[14px] flex-shrink-0"
                          dir="rtl"
                          style={{
                            fontFamily: "'Reem Kufi', sans-serif",
                            color: selectedCategory === p.id ? 'var(--gold)' : textColor,
                          }}
                        >
                          {p.labelAr}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results */}
                {poetSearch &&
                  filteredPoetList.featured.length === 0 &&
                  filteredPoetList.all.length === 0 && (
                    <div className="px-4 py-6 text-center space-y-1">
                      <span
                        className="block text-[13px] font-tajawal"
                        dir="rtl"
                        style={{ opacity: 0.4 }}
                      >
                        لا نتائج
                      </span>
                      <span
                        className="block text-[11px] font-brand-en"
                        style={{ opacity: 0.4, color: subTextColor }}
                      >
                        No matching poets
                      </span>
                    </div>
                  )}
              </div>
            )}

            {/* Active filter indicator */}
            {selectedCategory !== 'All' && !poetSearch && (
              <div
                className="px-4 mt-3 pt-3 border-t"
                style={{ borderColor: 'rgba(74,103,166,0.1)' }}
              >
                <button
                  onClick={() => {
                    onSelectPoet('All');
                    onClose();
                  }}
                  className="flex items-center gap-1.5 text-[10px] font-brand-en transition-opacity"
                  style={{ color: lapisColor, opacity: 0.45 }}
                >
                  <X size={10} />
                  Clear filter
                </button>
              </div>
            )}
          </div>
          {/* ── End unified scroll container ── */}
        </div>
      </motion.div>
    </>
  );
};

export { GoldenFireIcon };
export default DiscoverDrawer;
