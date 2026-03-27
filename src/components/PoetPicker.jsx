import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Loader2, ScrollText } from 'lucide-react';
import { usePoemStore } from '../stores/poemStore';
import { useModalStore } from '../stores/modalStore';
import { useUIStore } from '../stores/uiStore';
import { GOLD, LAPIS, CATEGORIES } from '../constants/index.js';
import { fetchPoets } from '../services/database.js';

/**
 * Poet picker dropdown — trigger button + animated popup list.
 *
 * All picker state (open, search, keyboard offset) is managed internally.
 * The parent only needs to provide `handleFetch` so re-selecting the same
 * poet immediately loads a fresh poem.
 *
 * @param {object}   props
 * @param {Function} props.handleFetch - Fetch a new poem (used when re-selecting active poet)
 */
export default function PoetPicker({ handleFetch }) {
  const poetPickerRef = useRef(null);
  const poetSearchRef = useRef(null);

  const [pickerKeyboardOffset, setPickerKeyboardOffset] = useState(0);
  const [pickerListMaxHeight, setPickerListMaxHeight] = useState(280);

  // ── Store selectors ──
  const poetPickerOpen = useModalStore((s) => s.poetPicker);
  const setPoetPickerOpen = useModalStore((s) => s.setPoetPicker);
  const poetPickerClosing = useModalStore((s) => s.poetPickerClosing);
  const setPoetPickerClosing = useModalStore((s) => s.setPoetPickerClosing);

  const poetSearch = usePoemStore((s) => s.poetSearch);
  const setPoetSearch = usePoemStore((s) => s.setPoetSearch);
  const dynamicPoets = usePoemStore((s) => s.dynamicPoets);
  const setDynamicPoets = usePoemStore((s) => s.setDynamicPoets);
  const poetsFetched = usePoemStore((s) => s.poetsFetched);
  const setPoetsFetched = usePoemStore((s) => s.setPoetsFetched);
  const selectedCategory = usePoemStore((s) => s.selectedCategory);
  const setSelectedCategory = usePoemStore((s) => s.setCategory);

  const addLog = useUIStore.getState().addLog;

  const closePoetPicker = () => {
    setPoetPickerClosing(true);
    setTimeout(() => {
      setPoetPickerOpen(false);
      setPoetPickerClosing(false);
    }, 250);
  };

  // Close on outside click
  useEffect(() => {
    if (!poetPickerOpen) return;
    const handleOutsideClick = (e) => {
      if (poetPickerRef.current && !poetPickerRef.current.contains(e.target)) {
        closePoetPicker();
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [poetPickerOpen]);

  // Fetch dynamic poet list from API when picker first opens
  useEffect(() => {
    if (!poetPickerOpen || poetsFetched) return;
    const loadPoets = async () => {
      try {
        const poets = await fetchPoets();
        setDynamicPoets(poets);
        addLog('Poets', `Loaded ${poets.length} poets from API`, 'info');
      } catch {
        addLog('Poets', 'Failed to fetch poets from API', 'warn');
      } finally {
        setPoetsFetched(true);
      }
    };
    loadPoets();
  }, [poetPickerOpen, poetsFetched, addLog]);

  // Focus search input when picker opens; clear search when it closes
  useEffect(() => {
    let timerId;
    if (poetPickerOpen && poetSearchRef.current) {
      timerId = setTimeout(() => poetSearchRef.current?.focus(), 100);
    }
    if (!poetPickerOpen) setPoetSearch('');
    return () => clearTimeout(timerId);
  }, [poetPickerOpen]);

  // Adjust popup position when mobile keyboard appears (iOS visual viewport fix)
  useEffect(() => {
    if (!poetPickerOpen) {
      setPickerKeyboardOffset(0);
      setPickerListMaxHeight(280);
      return;
    }
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateForViewport = () => {
      const keyboardHeight = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setPickerKeyboardOffset(keyboardHeight);
      if (keyboardHeight > 0) {
        setPickerListMaxHeight(Math.max(100, Math.min(280, viewport.height - 150)));
      } else {
        setPickerListMaxHeight(280);
      }
    };
    updateForViewport();
    viewport.addEventListener('resize', updateForViewport);
    viewport.addEventListener('scroll', updateForViewport);
    return () => {
      viewport.removeEventListener('resize', updateForViewport);
      viewport.removeEventListener('scroll', updateForViewport);
    };
  }, [poetPickerOpen]);

  // Build combined poet list: featured (from CATEGORIES) + dynamic (from API)
  const filteredPoetList = useMemo(() => {
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

    const search = normalizeAr(poetSearch.trim().toLowerCase());
    const featuredNormIds = new Set(
      CATEGORIES.filter((c) => c.id !== 'All').map((c) => normalizeAr(c.id))
    );

    const apiPoets = dynamicPoets
      .filter((p) => !featuredNormIds.has(normalizeAr(p.name)))
      .map((p) => ({
        id: p.name,
        label: p.name_en || p.name,
        labelAr: p.name,
        poemCount: parseInt(p.poem_count, 10) || 0,
      }));

    const featured = CATEGORIES.filter((c) => c.id !== 'All').map((cat) => {
      const catNorm = normalizeAr(cat.id);
      const apiMatch = dynamicPoets.find((p) => normalizeAr(p.name) === catNorm);
      return { ...cat, poemCount: apiMatch ? parseInt(apiMatch.poem_count, 10) : null };
    });

    if (!search) return { featured, all: apiPoets };

    const matchesSearch = (p) =>
      normalizeAr(p.labelAr).includes(search) || p.label.toLowerCase().includes(search);
    return { featured: featured.filter(matchesSearch), all: apiPoets.filter(matchesSearch) };
  }, [poetSearch, dynamicPoets]);

  return (
    <div
      ref={poetPickerRef}
      className="relative flex flex-col items-center gap-0.5 min-w-[52px]"
    >
      <button
        onClick={() => {
          if (poetPickerOpen) {
            closePoetPicker();
          } else {
            setPoetPickerOpen(true);
          }
        }}
        aria-label="Filter by poet"
        className={`relative min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-200 flex items-center justify-center rounded-full ${LAPIS.lapisHoverBg} hover:scale-105 ${poetPickerOpen ? 'bg-lapis-light/10' : ''}`}
      >
        <ScrollText className={LAPIS.lapisText} size={21} />
        {selectedCategory !== 'All' && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gold shadow-[0_0_6px_rgba(197,160,89,0.5)]" />
        )}
      </button>
      <span
        className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase whitespace-nowrap ${LAPIS.lapisText}`}
        style={{ opacity: 0.6 }}
      >
        Poets
      </span>

      {(poetPickerOpen || poetPickerClosing) && (
        <div
          className="absolute mb-2 left-1/2 w-auto min-w-[14rem] max-w-[18rem] rounded-2xl border border-lapis-light/25 bg-black/95 backdrop-blur-2xl shadow-2xl py-2.5 z-[200]"
          style={{
            bottom: `calc(100% + ${pickerKeyboardOffset}px)`,
            transition: 'bottom 0.2s ease-out',
            animation: poetPickerClosing
              ? 'poetPickerOut 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards'
              : 'poetPickerIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}
        >
          {/* Search input */}
          <div className="px-3 pb-2 mb-1 border-b border-lapis-light/15">
            <div className="relative flex items-center">
              <Search className="absolute left-2 text-lapis-light/40" size={13} />
              <input
                ref={poetSearchRef}
                type="text"
                value={poetSearch}
                onChange={(e) => setPoetSearch(e.target.value)}
                placeholder="Search poets..."
                aria-label="Search poets"
                className="w-full bg-white/5 border border-lapis-light/15 rounded-lg pl-7 pr-3 py-1.5 text-[16px] text-stone-200 placeholder-stone-600 focus:outline-none focus:border-lapis-light/40 font-tajawal transition-colors"
              />
              {poetSearch && (
                <button
                  onClick={() => setPoetSearch('')}
                  className="absolute right-2 text-stone-500 hover:text-stone-300"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable poet list */}
          <div
            className="overflow-y-auto overflow-x-hidden"
            style={{
              maxHeight: `${pickerListMaxHeight}px`,
              transition: 'max-height 0.2s ease-out',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(197,160,89,0.2) transparent',
            }}
          >
            {/* "All Poets" option */}
            {!poetSearch && (
              <button
                data-testid="poet-picker-button"
                onClick={() => {
                  setSelectedCategory('All');
                  closePoetPicker();
                }}
                className={`w-full text-right px-5 py-2.5 transition-all duration-150 ${selectedCategory === 'All' ? 'bg-gold/15 border-r-2 border-gold' : 'hover:bg-lapis-light/8 border-r-2 border-transparent'}`}
              >
                <span
                  className={`block text-[17px] ${selectedCategory === 'All' ? 'text-gold' : 'text-stone-300'}`}
                  dir="rtl"
                  style={{ fontFamily: "'Reem Kufi', sans-serif", fontWeight: 500 }}
                >
                  كل الشعراء
                </span>
                <span
                  className={`block text-[10px] font-brand-en mt-0.5 ${selectedCategory === 'All' ? 'text-gold/70' : 'opacity-40'}`}
                >
                  All Poets
                </span>
              </button>
            )}

            {/* Featured poets */}
            {filteredPoetList.featured.length > 0 && (
              <>
                {!poetSearch && (
                  <div className="px-4 pt-2 pb-1">
                    <span className="text-[9px] font-brand-en uppercase tracking-widest text-lapis-light/35 font-bold">
                      Featured
                    </span>
                  </div>
                )}
                {filteredPoetList.featured.map((cat) => (
                  <button
                    key={cat.id}
                    data-testid="poet-picker-button"
                    onClick={() => {
                      if (cat.id === selectedCategory && cat.id !== 'All') {
                        handleFetch();
                      } else {
                        setSelectedCategory(cat.id);
                      }
                      closePoetPicker();
                    }}
                    className={`w-full text-right px-5 py-2 transition-all duration-150 ${selectedCategory === cat.id ? 'bg-gold/15 border-r-2 border-gold' : 'hover:bg-lapis-light/8 border-r-2 border-transparent'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span
                          className={`block text-[16px] truncate ${selectedCategory === cat.id ? 'text-gold' : 'text-stone-300'}`}
                          dir="rtl"
                          style={{ fontFamily: "'Reem Kufi', sans-serif", fontWeight: 500 }}
                        >
                          {cat.labelAr}
                        </span>
                        <span
                          className={`block text-[10px] font-brand-en mt-0.5 ${selectedCategory === cat.id ? 'text-gold/70' : 'opacity-40'}`}
                        >
                          {cat.label}
                        </span>
                      </div>
                      {cat.poemCount !== null && cat.poemCount !== undefined && (
                        <span className="text-[9px] font-brand-en text-lapis-light/40 bg-lapis-light/8 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                          {cat.poemCount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Dynamic poets from API */}
            {filteredPoetList.all.length > 0 && (
              <>
                <div className="px-4 pt-2 pb-1">
                  <span className="text-[9px] font-brand-en uppercase tracking-widest text-lapis-light/35 font-bold">
                    {poetSearch ? 'Results' : 'More Poets'}
                  </span>
                </div>
                {filteredPoetList.all.map((p) => (
                  <button
                    key={p.id}
                    data-testid="poet-picker-button"
                    onClick={() => {
                      if (p.id === selectedCategory && p.id !== 'All') {
                        handleFetch();
                      } else {
                        setSelectedCategory(p.id);
                      }
                      closePoetPicker();
                    }}
                    className={`w-full text-right px-5 py-2 transition-all duration-150 ${selectedCategory === p.id ? 'bg-gold/15 border-r-2 border-gold' : 'hover:bg-lapis-light/8 border-r-2 border-transparent'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span
                          className={`block text-[16px] truncate ${selectedCategory === p.id ? 'text-gold' : 'text-stone-300'}`}
                          dir="rtl"
                          style={{ fontFamily: "'Reem Kufi', sans-serif", fontWeight: 500 }}
                        >
                          {p.labelAr}
                        </span>
                        <span
                          className={`block text-[10px] font-brand-en mt-0.5 ${selectedCategory === p.id ? 'text-gold/70' : 'opacity-40'}`}
                        >
                          {p.label}
                        </span>
                      </div>
                      {p.poemCount > 0 && (
                        <span className="text-[9px] font-brand-en text-lapis-light/40 bg-lapis-light/8 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                          {p.poemCount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Loading state */}
            {!poetsFetched && dynamicPoets.length === 0 && (
              <div className="px-5 py-3 text-center">
                <Loader2 className="inline-block text-lapis-light/40 animate-spin" size={16} />
                <span className="block text-[10px] font-brand-en text-stone-600 mt-1">
                  Loading poets...
                </span>
              </div>
            )}

            {/* No results */}
            {poetSearch &&
              filteredPoetList.featured.length === 0 &&
              filteredPoetList.all.length === 0 && (
                <div className="px-5 py-3 text-center">
                  <span className="block text-[12px] text-stone-500 font-tajawal" dir="rtl">
                    لا نتائج
                  </span>
                  <span className="block text-[10px] font-brand-en text-stone-600 mt-0.5">
                    No matching poets
                  </span>
                </div>
              )}
          </div>

          {/* Active filter indicator */}
          {selectedCategory !== 'All' && !poetSearch && (
            <div className="mt-1 pt-1.5 border-t border-gold/10 px-4 pb-0.5">
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  closePoetPicker();
                }}
                className="flex items-center gap-1.5 text-[10px] font-brand-en text-lapis-light/50 hover:text-lapis-light/80 transition-colors"
              >
                <X size={10} />
                Clear filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
