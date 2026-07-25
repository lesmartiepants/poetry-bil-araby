import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, ChevronDown, Check, Heart } from 'lucide-react';
import { useLocation } from 'wouter';

import { useUIStore } from '../stores/uiStore';
import { fetchCategories, fetchPoemsByCategory, fetchPoets } from '../services/database.js';
import PoemResultsGrid from './category/PoemResultsGrid.jsx';

// Historical eras (poets.era_id), chronological. Mirrors ERA_CENTURY in
// categorization/config.py — a stable 8-row set, so kept client-side.
const ERAS = [
  { id: 5, en: 'Pre-Islamic', ar: 'جاهلي' },
  { id: 1, en: 'Early Islam', ar: 'صدر الإسلام' },
  { id: 4, en: 'Umayyad', ar: 'أموي' },
  { id: 2, en: 'Abbasid', ar: 'عباسي' },
  { id: 7, en: 'Andalusian', ar: 'أندلسي' },
  { id: 6, en: 'Ayyubid', ar: 'أيوبي' },
  { id: 8, en: 'Mamluk', ar: 'مملوكي' },
  { id: 3, en: 'Late / Modern', ar: 'متأخر' },
];
// Distinct centuries (CE) derived from era, ascending.
const CENTURIES = [6, 7, 8, 9, 11, 13, 14];
const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * CategoryExplorer — dev/admin tool to browse the emotional taxonomy
 * (families + dimensions + live counts) and a filter playground that runs the
 * by-category query and renders results. Built for reuse as the future
 * user-facing "How do you want to feel?" surface (the two composable pieces,
 * FamilyPicker + PoemResultsGrid, are standalone).
 *
 * Data-driven throughout: it renders whatever /api/categories returns. When the
 * DB has not been migrated the payload is {dimensions:[],families:[]} and the
 * UI shows a graceful "not available yet" state instead of crashing.
 */
export default function CategoryExplorer({
  user = null,
  savedPoems = [],
  savePoem,
  unsavePoem,
  isPoemSaved = () => false,
  onRequireAuth,
}) {
  // Full-screen routed view (/explore). Mounted only on that route, so it is
  // always "open"; closing navigates back to the reader.
  const isOpen = true;
  const [, navigate] = useLocation();
  const onClose = () => navigate('/');
  const darkMode = useUIStore((s) => s.darkMode);

  // Save + open-in-reader wiring (shared with the main app via props so the
  // Library stays in sync). Saving requires auth; otherwise prompt sign-in.
  const openPoem = (id) => id != null && navigate('/poem/' + id);
  const toggleSave = (poem) => {
    if (!user) return onRequireAuth?.();
    return isPoemSaved(poem) ? unsavePoem(poem.id, poem.arabic) : savePoem(poem);
  };
  const [showSaved, setShowSaved] = useState(false);

  const [activeTab, setActiveTab] = useState('taxonomy'); // 'taxonomy' | 'playground'

  // ── Taxonomy data ──
  const [data, setData] = useState({ dimensions: [], families: [] });
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expandedFamily, setExpandedFamily] = useState(null);

  // ── Playground filters ──
  const [activeFamily, setActiveFamily] = useState('');
  const [selectedValues, setSelectedValues] = useState({}); // { dimKey: [valueKey,...] }
  const [dimMode, setDimMode] = useState({}); // { dimKey: 'and' | 'or' }
  const [intensity, setIntensity] = useState([0, 100]); // [min, max]
  const [difficulty, setDifficulty] = useState([0, 10]); // [min, max]
  const [poet, setPoet] = useState('');
  const [era, setEra] = useState('');
  const [century, setCentury] = useState('');
  const [poets, setPoets] = useState([]);
  const limit = 12; // results page size (API supports 1-50)

  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState(null);
  const [lastQuery, setLastQuery] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  const hasTaxonomy = data.families.length > 0 || data.dimensions.length > 0;

  // Fetch the taxonomy once, when first opened.
  useEffect(() => {
    if (!isOpen || loaded) return;
    let cancelled = false;
    setLoading(true);
    fetchCategories()
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, loaded]);

  // Fetch poets once for the poet dropdown.
  useEffect(() => {
    if (!isOpen || poets.length) return;
    let cancelled = false;
    fetchPoets()
      .then((list) => { if (!cancelled) setPoets(list); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen, poets.length]);

  // Build the filter object + query string from current playground state.
  const filters = useMemo(() => {
    const f = { limit };
    if (activeFamily) f.family = activeFamily;
    Object.entries(selectedValues).forEach(([dim, vals]) => {
      if (vals && vals.length > 0) {
        f[dim] = vals.join(',');
        if (dimMode[dim] === 'and' && vals.length > 1) f[`${dim}Mode`] = 'and';
      }
    });
    if (intensity[0] > 0) f.minIntensity = intensity[0];
    if (intensity[1] < 100) f.maxIntensity = intensity[1];
    if (difficulty[0] > 0) f.minAccessibility = difficulty[0];
    if (difficulty[1] < 10) f.maxAccessibility = difficulty[1];
    if (poet.trim()) f.poet = poet.trim();
    if (era) f.era = era;
    if (century) f.century = century;
    return f;
  }, [activeFamily, selectedValues, dimMode, intensity, difficulty, poet, era, century, limit]);

  const queryString = useMemo(() => {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => qs.set(k, String(v)));
    return `/api/poems/by-category?${qs.toString()}`;
  }, [filters]);

  // Live-run the query (debounced) whenever filters change on the playground tab.
  useEffect(() => {
    if (!isOpen || activeTab !== 'playground' || !hasTaxonomy) return;
    let cancelled = false;
    setResultsLoading(true);
    setResultsError(null);
    setExhausted(false);
    const t = setTimeout(() => {
      fetchPoemsByCategory(filters)
        .then((poems) => {
          if (cancelled) return;
          setResults(poems);
          setLastQuery(queryString);
        })
        .catch((err) => {
          if (cancelled) return;
          setResults([]);
          setResultsError(err?.message || 'Request failed');
        })
        .finally(() => {
          if (!cancelled) setResultsLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isOpen, activeTab, hasTaxonomy, filters, queryString]);

  // Load more: the source is randomized (no stable offset), so fetch another
  // batch and append only poems we don't already have. If a batch adds nothing
  // new, treat the filtered set as exhausted and hide the button.
  const loadMore = () => {
    if (loadingMore || exhausted) return;
    setLoadingMore(true);
    fetchPoemsByCategory({ ...filters, limit: 24 })
      .then((poems) => {
        setResults((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const fresh = poems.filter((p) => !seen.has(p.id));
          if (fresh.length === 0) setExhausted(true);
          return fresh.length ? [...prev, ...fresh] : prev;
        });
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  // Saved poems reshaped for the results grid (they lack category tags).
  const savedAsPoems = useMemo(
    () =>
      (savedPoems || []).map((sp) => ({
        id: sp.poem_id ?? sp.id,
        title: sp.title || '',
        titleArabic: '',
        poet: sp.poet || '',
        poetArabic: '',
        arabic: sp.poem_text || '',
        english: sp.english || '',
        categories: {},
      })),
    [savedPoems]
  );

  const toggleValue = (dimKey, valueKey) => {
    setSelectedValues((prev) => {
      const cur = prev[dimKey] || [];
      const next = cur.includes(valueKey)
        ? cur.filter((k) => k !== valueKey)
        : [...cur, valueKey];
      return { ...prev, [dimKey]: next };
    });
  };

  const setMode = (dimKey, mode) => setDimMode((prev) => ({ ...prev, [dimKey]: mode }));

  const clearFilters = () => {
    setActiveFamily('');
    setSelectedValues({});
    setDimMode({});
    setIntensity([0, 100]);
    setDifficulty([0, 10]);
    setPoet('');
    setEra('');
    setCentury('');
  };

  const activeFilterCount =
    (activeFamily ? 1 : 0) +
    Object.values(selectedValues).reduce((n, v) => n + (v?.length ? 1 : 0), 0) +
    (intensity[0] > 0 || intensity[1] < 100 ? 1 : 0) +
    (difficulty[0] > 0 || difficulty[1] < 10 ? 1 : 0) +
    (poet ? 1 : 0) + (era ? 1 : 0) + (century ? 1 : 0);

  // ── Theme tokens — high contrast for readability ──
  const textColor = darkMode ? 'rgba(234,231,225,0.98)' : 'rgba(22,18,14,0.98)';
  const subTextColor = darkMode ? 'rgba(222,218,211,0.82)' : 'rgba(34,29,24,0.82)';
  const subtleBorder = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.11)';
  const cardBg = darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)';
  const panelBg = darkMode ? 'rgba(24,22,18,0.98)' : 'rgba(252,250,246,0.99)';

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{
        background: darkMode
          ? 'linear-gradient(180deg, rgba(18,16,12,1) 0%, rgba(12,12,14,1) 100%)'
          : 'linear-gradient(180deg, rgba(253,252,248,1) 0%, rgba(245,243,238,1) 100%)',
      }}
    >
      {/* Centered content column so the full-screen view stays readable on wide displays */}
      <div className="w-full max-w-5xl mx-auto flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="relative px-5 pb-2 pt-5 flex-shrink-0">
          <h3
            className="font-brand-en font-bold text-[0.9375rem] leading-none"
            style={{ color: 'var(--gold)' }}
          >
            Category Explorer
          </h3>
          <p
            className="font-tajawal text-[0.6875rem] mt-0.5"
            dir="rtl"
            style={{ color: 'var(--gold)', opacity: 0.55 }}
          >
            مستكشف التصنيفات
          </p>
          {/* Saved toggle — swaps the results grid to the user's saved poems */}
          <button
            onClick={() => setShowSaved((v) => !v)}
            className="absolute top-4 right-16 h-9 px-3 flex items-center gap-1.5 rounded-full transition-colors"
            style={{
              background: showSaved ? 'rgba(197,160,89,0.16)' : 'rgba(197,160,89,0.08)',
              border: `1px solid ${showSaved ? 'rgba(197,160,89,0.45)' : 'rgba(197,160,89,0.18)'}`,
            }}
            aria-pressed={showSaved}
            aria-label="Show saved poems"
          >
            <Heart size={14} style={{ color: 'var(--gold)' }} fill={showSaved ? 'var(--gold)' : 'none'} />
            <span className="font-brand-en font-bold text-[0.6875rem]" style={{ color: 'var(--gold)' }}>
              {savedPoems.length || 0}
            </span>
          </button>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full transition-colors"
            style={{
              background: 'rgba(197,160,89,0.08)',
              border: '1px solid rgba(197,160,89,0.18)',
            }}
            aria-label="Close category explorer"
          >
            <X size={14} style={{ color: 'var(--gold)', opacity: 0.7 }} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3 flex-shrink-0 flex gap-2">
          <TabButton
            id="taxonomy"
            ar="التصنيف"
            en="Taxonomy"
            activeTab={activeTab}
            onSelect={setActiveTab}
            textColor={textColor}
            subTextColor={subTextColor}
            subtleBorder={subtleBorder}
          />
          <TabButton
            id="playground"
            ar="التجربة"
            en="Filter Playground"
            activeTab={activeTab}
            onSelect={setActiveTab}
            textColor={textColor}
            subTextColor={subTextColor}
            subtleBorder={subtleBorder}
          />
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto px-4 pb-8"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(197,160,89,0.2) transparent' }}
        >
          {loading && !loaded ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin" size={22} style={{ color: 'var(--gold)', opacity: 0.4 }} />
            </div>
          ) : !hasTaxonomy ? (
            <EmptyState darkMode={darkMode} subTextColor={subTextColor} />
          ) : activeTab === 'taxonomy' ? (
            <TaxonomyTab
              data={data}
              expandedFamily={expandedFamily}
              setExpandedFamily={setExpandedFamily}
              textColor={textColor}
              subTextColor={subTextColor}
              subtleBorder={subtleBorder}
              cardBg={cardBg}
            />
          ) : showSaved ? (
            <div className="flex flex-col gap-3 pt-1">
              <div className="flex items-center gap-2 px-0.5">
                <Heart size={15} style={{ color: 'var(--gold)' }} fill="var(--gold)" />
                <span className="font-brand-en font-bold text-[0.875rem]" style={{ color: textColor }}>
                  Saved poems
                </span>
                <span className="font-brand-en text-[0.6875rem]" style={{ color: subTextColor }}>
                  {savedAsPoems.length}
                </span>
              </div>
              {!user ? (
                <div className="px-4 py-12 text-center text-[0.8125rem] font-brand-en" style={{ color: subTextColor }}>
                  Sign in to save poems and revisit them here.
                </div>
              ) : (
                <PoemResultsGrid
                  poems={savedAsPoems}
                  dimensions={data.dimensions}
                  families={data.families}
                  darkMode={darkMode}
                  onToggleSave={toggleSave}
                  isPoemSaved={isPoemSaved}
                  onOpenPoem={openPoem}
                  emptyLabel="No saved poems yet"
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3 pt-1">
              <FilterBar
                data={data}
                poets={poets}
                activeFamily={activeFamily}
                setActiveFamily={setActiveFamily}
                selectedValues={selectedValues}
                toggleValue={toggleValue}
                dimMode={dimMode}
                setMode={setMode}
                intensity={intensity}
                setIntensity={setIntensity}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                poet={poet}
                setPoet={setPoet}
                era={era}
                setEra={setEra}
                century={century}
                setCentury={setCentury}
                activeFilterCount={activeFilterCount}
                clearFilters={clearFilters}
                tokens={{ textColor, subTextColor, subtleBorder, cardBg, panelBg }}
              />

              <PoemResultsGrid
                poems={results}
                dimensions={data.dimensions}
                families={data.families}
                activeFamily={activeFamily}
                loading={resultsLoading}
                error={resultsError}
                darkMode={darkMode}
                onToggleSave={toggleSave}
                isPoemSaved={isPoemSaved}
                onOpenPoem={openPoem}
                onLoadMore={loadMore}
                loadingMore={loadingMore}
                canLoadMore={!exhausted && results.length > 0}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Tab toggle button ── */
function TabButton({ id, ar, en, activeTab, onSelect, textColor, subTextColor, subtleBorder }) {
  const active = activeTab === id;
  return (
    <button
      onClick={() => onSelect(id)}
      className="flex-1 py-2 rounded-xl transition-all duration-200 flex flex-col items-center"
      style={{
        background: active ? 'rgba(197,160,89,0.12)' : 'transparent',
        border: `1px solid ${active ? 'rgba(197,160,89,0.4)' : subtleBorder}`,
      }}
      aria-pressed={active}
    >
      <span
        className="font-bold text-[0.8125rem]"
        dir="rtl"
        style={{ fontFamily: "'Reem Kufi', sans-serif", color: active ? 'var(--gold)' : textColor }}
      >
        {ar}
      </span>
      <span
        className="font-brand-en text-[0.5625rem] uppercase tracking-[0.12em]"
        style={{ color: active ? 'var(--gold)' : subTextColor, opacity: 0.8 }}
      >
        {en}
      </span>
    </button>
  );
}

/* ── Empty / pre-migration state ── */
function EmptyState({ subTextColor }) {
  return (
    <div className="px-4 py-16 text-center space-y-2">
      <span className="block text-[0.9375rem] font-tajawal" dir="rtl" style={{ color: 'var(--gold)', opacity: 0.7 }}>
        التصنيف غير متوفر بعد
      </span>
      <span className="block text-[0.75rem] font-brand-en" style={{ opacity: 0.55, color: subTextColor }}>
        Categorization is not available yet — run the taxonomy migration + pipeline to populate it.
      </span>
    </div>
  );
}

/* ── Taxonomy tab: families (expandable) + raw dimensions ── */
function TaxonomyTab({ data, expandedFamily, setExpandedFamily, textColor, subTextColor, subtleBorder, cardBg }) {
  const families = useMemo(
    () => [...data.families].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [data.families]
  );

  // Group a family's member values by dimension for display.
  const groupByDim = (values = []) => {
    const g = {};
    for (const v of values) {
      (g[v.dim] ||= []).push(v);
    }
    return g;
  };

  const dimLabel = (dimKey) => {
    const d = data.dimensions.find((x) => x.key === dimKey);
    return d ? `${d.label_en} · ${d.label_ar}` : dimKey;
  };

  return (
    <div className="flex flex-col gap-5 pt-1">
      {/* Families */}
      <div className="flex flex-col gap-2">
        <p className="font-brand-en text-[0.5625rem] uppercase tracking-[0.15em] px-0.5" style={{ color: 'var(--gold)', opacity: 0.85 }}>
          Families · العائلات
        </p>
        {families.map((fam) => {
          const open = expandedFamily === fam.key;
          const grouped = groupByDim(fam.values);
          return (
            <div key={fam.key} className="rounded-2xl border overflow-hidden" style={{ borderColor: subtleBorder, background: cardBg }}>
              <button
                onClick={() => setExpandedFamily(open ? null : fam.key)}
                className="w-full flex items-center justify-between px-3.5 py-3 gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-[0.9375rem]" dir="rtl" style={{ fontFamily: "'Reem Kufi', sans-serif", color: 'var(--gold)' }}>
                    {fam.label_ar}
                  </span>
                  <span className="font-brand-en text-[0.75rem]" style={{ color: subTextColor }}>
                    {fam.label_en}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {fam.poem_count > 0 && (
                    <span className="font-brand-en text-[0.625rem] font-bold" style={{ color: 'var(--gold)', opacity: 0.75 }}>
                      {Number(fam.poem_count).toLocaleString()}
                    </span>
                  )}
                  <ChevronDown
                    size={14}
                    style={{ color: 'var(--gold)', opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                  />
                </div>
              </button>
              {open && (
                <div className="px-3.5 pb-3 flex flex-col gap-2.5">
                  {Object.entries(grouped).map(([dimKey, vals]) => (
                    <div key={dimKey}>
                      <p className="font-brand-en text-[0.5625rem] uppercase tracking-[0.12em] mb-1" style={{ color: subTextColor, opacity: 0.7 }}>
                        {dimLabel(dimKey)}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {vals.map((v) => (
                          <span
                            key={v.key}
                            className="rounded-full px-2 py-0.5 text-[0.625rem] font-brand-en flex items-center gap-1"
                            style={{ border: `1px solid ${subtleBorder}` }}
                          >
                            <span dir="rtl" style={{ fontFamily: "'Reem Kufi', sans-serif", color: textColor }}>
                              {v.label_ar}
                            </span>
                            <span style={{ color: subTextColor }}>{v.label_en}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Raw dimensions view */}
      <div className="flex flex-col gap-3">
        <p className="font-brand-en text-[0.5625rem] uppercase tracking-[0.15em] px-0.5" style={{ color: 'var(--gold)', opacity: 0.85 }}>
          Dimensions · الأبعاد
        </p>
        {data.dimensions.map((dim) => (
          <div key={dim.key} className="rounded-2xl border p-3" style={{ borderColor: subtleBorder, background: cardBg }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[0.8125rem]" dir="rtl" style={{ fontFamily: "'Reem Kufi', sans-serif", color: textColor }}>
                  {dim.label_ar}
                </span>
                <span className="font-brand-en text-[0.6875rem]" style={{ color: subTextColor }}>
                  {dim.label_en}
                </span>
              </div>
              <span className="font-brand-en text-[0.5625rem] font-bold" style={{ color: 'var(--gold)', opacity: 0.75 }}>
                {dim.cardinality ?? dim.values?.length ?? 0}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {(dim.values || []).map((v) => (
                <span
                  key={v.key}
                  className="rounded-full px-2 py-0.5 text-[0.625rem] font-brand-en flex items-center gap-1"
                  style={{ border: `1px solid ${subtleBorder}` }}
                >
                  <span dir="rtl" style={{ fontFamily: "'Reem Kufi', sans-serif", color: textColor }}>
                    {v.label_ar}
                  </span>
                  <span style={{ color: subTextColor }}>{v.label_en}</span>
                  {v.poem_count > 0 && (
                    <span style={{ color: 'var(--gold)', opacity: 0.7 }}>{Number(v.poem_count).toLocaleString()}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══ Filter bar: dropdown/popover selectors + range panels ══════════════════ */
function FilterBar({
  data, poets, activeFamily, setActiveFamily, selectedValues, toggleValue,
  dimMode, setMode, intensity, setIntensity, difficulty, setDifficulty,
  poet, setPoet, era, setEra, century, setCentury,
  activeFilterCount, clearFilters, tokens,
}) {
  const { textColor, subTextColor, subtleBorder, cardBg, panelBg } = tokens;
  const [open, setOpen] = useState(null); // which control's panel is expanded
  const toggleOpen = (id) => setOpen((cur) => (cur === id ? null : id));

  const intensityActive = intensity[0] > 0 || intensity[1] < 100;
  const difficultyActive = difficulty[0] > 0 || difficulty[1] < 10;

  const famLabel = activeFamily
    ? data.families.find((f) => f.key === activeFamily)?.label_en || activeFamily
    : null;
  const poetLabel = poet
    ? poets.find((p) => p.name === poet)?.name_en || poet
    : null;
  const eraLabel = era ? ERAS.find((e) => String(e.id) === String(era))?.en : null;

  const panelProps = { textColor, subTextColor, subtleBorder, panelBg };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Control bar */}
      <div className="flex flex-wrap gap-1.5">
        <FilterButton id="family" label="Family" value={famLabel} open={open === 'family'} onClick={() => toggleOpen('family')} tokens={tokens} />
        {data.dimensions.map((dim) => {
          const cnt = (selectedValues[dim.key] || []).length;
          return (
            <FilterButton
              key={dim.key}
              id={dim.key}
              label={dim.label_en}
              value={cnt > 0 ? `${cnt}` : null}
              open={open === dim.key}
              onClick={() => toggleOpen(dim.key)}
              tokens={tokens}
            />
          );
        })}
        <FilterButton id="poet" label="Poet" value={poetLabel} open={open === 'poet'} onClick={() => toggleOpen('poet')} tokens={tokens} />
        <FilterButton id="era" label="Era" value={eraLabel} open={open === 'era'} onClick={() => toggleOpen('era')} tokens={tokens} />
        <FilterButton id="century" label="Century" value={century ? ordinal(Number(century)) : null} open={open === 'century'} onClick={() => toggleOpen('century')} tokens={tokens} />
        <FilterButton id="intensity" label="Intensity" value={intensityActive ? `${intensity[0]}–${intensity[1]}` : null} open={open === 'intensity'} onClick={() => toggleOpen('intensity')} tokens={tokens} />
        <FilterButton id="difficulty" label="Difficulty" value={difficultyActive ? `${difficulty[0]}–${difficulty[1]}` : null} open={open === 'difficulty'} onClick={() => toggleOpen('difficulty')} tokens={tokens} />
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[0.6875rem] font-brand-en font-semibold transition-colors"
            style={{ color: 'var(--gold)', border: `1px solid ${subtleBorder}` }}
          >
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {/* Expanded panel */}
      {open === 'family' && (
        <SingleSelectPanel
          title="Family · العائلات"
          options={[...data.families]
            .sort((a, b) => (a.label_en || '').localeCompare(b.label_en || ''))
            .map((f) => ({ value: f.key, en: f.label_en, ar: f.label_ar, count: f.poem_count }))}
          selected={activeFamily}
          onSelect={(v) => setActiveFamily(v === activeFamily ? '' : v)}
          {...panelProps}
        />
      )}
      {data.dimensions.map((dim) =>
        open === dim.key ? (
          <MultiSelectPanel
            key={dim.key}
            title={`${dim.label_en} · ${dim.label_ar}`}
            options={[...(dim.values || [])].sort((a, b) => (a.label_en || '').localeCompare(b.label_en || ''))}
            selected={selectedValues[dim.key] || []}
            onToggle={(vk) => toggleValue(dim.key, vk)}
            mode={dimMode[dim.key] || 'or'}
            onMode={(m) => setMode(dim.key, m)}
            {...panelProps}
          />
        ) : null
      )}
      {open === 'poet' && (
        <SingleSelectPanel
          title="Poet · الشاعر"
          searchable
          options={[...poets]
            .sort((a, b) => (a.name_en || a.name || '').localeCompare(b.name_en || b.name || ''))
            .map((p) => ({ value: p.name, en: p.name_en || p.name, ar: p.name, count: Number(p.poem_count) }))}
          selected={poet}
          onSelect={(v) => setPoet(v === poet ? '' : v)}
          {...panelProps}
        />
      )}
      {open === 'era' && (
        <SingleSelectPanel
          title="Era · العصر"
          options={ERAS.map((e) => ({ value: String(e.id), en: e.en, ar: e.ar }))}
          selected={era}
          onSelect={(v) => setEra(v === era ? '' : v)}
          {...panelProps}
        />
      )}
      {open === 'century' && (
        <SingleSelectPanel
          title="Century · القرن"
          options={CENTURIES.map((c) => ({ value: String(c), en: `${ordinal(c)} c. CE`, ar: `القرن ${c}` }))}
          selected={century}
          onSelect={(v) => setCentury(v === century ? '' : v)}
          {...panelProps}
        />
      )}
      {open === 'intensity' && (
        <div className="rounded-2xl border p-3.5" style={{ borderColor: subtleBorder, background: panelBg }}>
          <RangeRow label="Intensity" labelAr="الحِدّة" value={intensity} min={0} max={100} step={5} onChange={setIntensity} subTextColor={subTextColor} />
        </div>
      )}
      {open === 'difficulty' && (
        <div className="rounded-2xl border p-3.5" style={{ borderColor: subtleBorder, background: panelBg }}>
          <RangeRow label="Difficulty" labelAr="الصعوبة" value={difficulty} min={0} max={10} step={0.5} onChange={setDifficulty} subTextColor={subTextColor} />
        </div>
      )}
    </div>
  );
}

/* ── A filter pill button (shows current selection) ── */
function FilterButton({ label, value, open, onClick, tokens }) {
  const { textColor, subtleBorder } = tokens;
  const on = value != null || open;
  return (
    <button
      onClick={onClick}
      aria-expanded={open}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[0.6875rem] font-brand-en font-semibold transition-colors"
      style={{
        color: on ? 'var(--gold)' : textColor,
        background: on ? 'rgba(197,160,89,0.12)' : 'transparent',
        border: `1px solid ${on ? 'rgba(197,160,89,0.42)' : subtleBorder}`,
        maxWidth: '11rem',
      }}
    >
      <span>{label}</span>
      {value != null && value !== '' && (
        <span className="truncate opacity-90" style={{ maxWidth: '6rem' }}>· {value}</span>
      )}
      <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.7 }} />
    </button>
  );
}

/* ── Multi-select panel with AND/OR toggle ── */
function MultiSelectPanel({ title, options, selected, onToggle, mode, onMode, textColor, subTextColor, subtleBorder, panelBg }) {
  return (
    <div className="rounded-2xl border p-3 flex flex-col gap-2.5" style={{ borderColor: subtleBorder, background: panelBg }}>
      <div className="flex items-center justify-between">
        <span className="font-brand-en font-bold text-[0.6875rem] uppercase tracking-[0.1em]" style={{ color: 'var(--gold)' }}>
          {title}
        </span>
        {/* AND / OR segmented toggle */}
        <div className="flex rounded-full overflow-hidden" style={{ border: `1px solid ${subtleBorder}` }}>
          {['or', 'and'].map((m) => (
            <button
              key={m}
              onClick={() => onMode(m)}
              className="px-2.5 py-0.5 text-[0.5625rem] font-brand-en font-bold uppercase tracking-wider transition-colors"
              style={{
                color: mode === m ? '#1a1712' : subTextColor,
                background: mode === m ? 'var(--gold)' : 'transparent',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {options.map((v) => {
          const on = selected.includes(v.key);
          return (
            <button
              key={v.key}
              onClick={() => onToggle(v.key)}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg transition-colors"
              style={{ background: on ? 'rgba(197,160,89,0.1)' : 'transparent' }}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                  style={{ border: `1.5px solid ${on ? 'var(--gold)' : subtleBorder}`, background: on ? 'var(--gold)' : 'transparent' }}
                >
                  {on && <Check size={11} style={{ color: '#1a1712' }} strokeWidth={3} />}
                </span>
                <span dir="ltr" className="font-brand-en font-semibold text-[0.75rem] truncate" style={{ color: textColor }}>
                  {v.label_en}
                </span>
              </span>
              <span dir="rtl" className="text-[0.75rem] flex-shrink-0" style={{ fontFamily: "'Reem Kufi', sans-serif", color: subTextColor }}>
                {v.label_ar}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Single-select panel (family / poet / era / century) ── */
function SingleSelectPanel({ title, options, selected, onSelect, searchable, textColor, subTextColor, subtleBorder, panelBg }) {
  const [q, setQ] = useState('');
  const filtered = searchable && q.trim()
    ? options.filter((o) => `${o.en} ${o.ar}`.toLowerCase().includes(q.trim().toLowerCase()))
    : options;
  return (
    <div className="rounded-2xl border p-3 flex flex-col gap-2" style={{ borderColor: subtleBorder, background: panelBg }}>
      <span className="font-brand-en font-bold text-[0.6875rem] uppercase tracking-[0.1em]" style={{ color: 'var(--gold)' }}>
        {title}
      </span>
      {searchable && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="rounded-lg px-2.5 py-1.5 font-brand-en focus:outline-none"
          // 16px min font-size prevents iOS Safari from auto-zooming on focus
          // (and never zooming back out). Keep at/above 16px.
          style={{ fontSize: '16px', background: 'rgba(197,160,89,0.07)', border: `1px solid ${subtleBorder}`, color: textColor }}
        />
      )}
      <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {filtered.map((o) => {
          const on = String(selected) === String(o.value);
          return (
            <button
              key={o.value}
              onClick={() => onSelect(o.value)}
              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg transition-colors"
              style={{ background: on ? 'rgba(197,160,89,0.14)' : 'transparent' }}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ border: `1.5px solid ${on ? 'var(--gold)' : subtleBorder}`, background: on ? 'var(--gold)' : 'transparent' }}
                >
                  {on && <Check size={9} style={{ color: '#1a1712' }} strokeWidth={3} />}
                </span>
                <span dir="ltr" className="font-brand-en font-semibold text-[0.75rem] truncate" style={{ color: on ? 'var(--gold)' : textColor }}>
                  {o.en}
                </span>
              </span>
              <span className="flex items-center gap-1.5 flex-shrink-0">
                {o.count != null && o.count > 0 && (
                  <span className="font-brand-en text-[0.5625rem]" style={{ color: subTextColor, opacity: 0.7 }}>
                    {Number(o.count).toLocaleString()}
                  </span>
                )}
                <span dir="rtl" className="text-[0.75rem]" style={{ fontFamily: "'Reem Kufi', sans-serif", color: subTextColor }}>
                  {o.ar}
                </span>
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <span className="text-[0.6875rem] font-brand-en px-2 py-2" style={{ color: subTextColor }}>No matches</span>
        )}
      </div>
    </div>
  );
}

/* ── Dual-thumb range: one track, two handles ── */
function RangeRow({ label, labelAr, value, min, max, step, onChange, subTextColor }) {
  const [lo, hi] = value;
  const pct = (v) => ((v - min) / (max - min)) * 100;
  // When both thumbs bunch at the same spot, raise the lo input so the top
  // half of the range is still grabbable (otherwise the hi input covers it).
  const loOnTop = lo > (max - min) / 2;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-brand-en font-semibold text-[0.6875rem]" style={{ color: subTextColor }}>
          {label} · <span dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif" }}>{labelAr}</span>
        </span>
        <span className="font-brand-en text-[0.6875rem] font-bold" style={{ color: 'var(--gold)' }}>
          {lo} – {hi}
        </span>
      </div>
      <div className="dual-range">
        {/* track */}
        <div className="absolute left-0 right-0 h-1 rounded-full" style={{ background: 'rgba(197,160,89,0.2)' }} />
        {/* selected fill */}
        <div
          className="absolute h-1 rounded-full"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%`, background: 'var(--gold)' }}
        />
        <input
          type="range" min={min} max={max} step={step} value={lo}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
          className="dual-range-input" style={{ zIndex: loOnTop ? 4 : 3 }}
          aria-label={`${label} minimum`}
        />
        <input
          type="range" min={min} max={max} step={step} value={hi}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
          className="dual-range-input" style={{ zIndex: loOnTop ? 3 : 4 }}
          aria-label={`${label} maximum`}
        />
      </div>
    </div>
  );
}
