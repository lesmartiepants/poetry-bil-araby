import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

import { useUIStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';
import { fetchCategories, fetchPoemsByCategory } from '../services/database.js';
import FamilyPicker from './category/FamilyPicker.jsx';
import PoemResultsGrid from './category/PoemResultsGrid.jsx';

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
export default function CategoryExplorer() {
  const isOpen = useModalStore((s) => s.categoryExplorer);
  const onClose = () => useModalStore.getState().setCategoryExplorer(false);
  const darkMode = useUIStore((s) => s.darkMode);

  const [activeTab, setActiveTab] = useState('taxonomy'); // 'taxonomy' | 'playground'

  // ── Taxonomy data ──
  const [data, setData] = useState({ dimensions: [], families: [] });
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expandedFamily, setExpandedFamily] = useState(null);

  // ── Playground filters ──
  const [activeFamily, setActiveFamily] = useState(null);
  const [selectedValues, setSelectedValues] = useState({}); // { dimKey: [valueKey,...] }
  const [minIntensity, setMinIntensity] = useState(0);
  const [maxAccessibility, setMaxAccessibility] = useState(10);
  const [poet, setPoet] = useState('');
  const [era, setEra] = useState('');
  const limit = 12; // results page size (API supports 1-50)

  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState(null);
  const [lastQuery, setLastQuery] = useState('');

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

  // Build the filter object + query string from current playground state.
  const filters = useMemo(() => {
    const f = { limit };
    if (activeFamily) f.family = activeFamily;
    Object.entries(selectedValues).forEach(([dim, vals]) => {
      if (vals && vals.length > 0) f[dim] = vals.join(',');
    });
    if (minIntensity > 0) f.minIntensity = minIntensity;
    if (maxAccessibility < 10) f.maxAccessibility = maxAccessibility;
    if (poet.trim()) f.poet = poet.trim();
    if (era.trim()) f.era = era.trim();
    return f;
  }, [activeFamily, selectedValues, minIntensity, maxAccessibility, poet, era, limit]);

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

  const toggleValue = (dimKey, valueKey) => {
    setSelectedValues((prev) => {
      const cur = prev[dimKey] || [];
      const next = cur.includes(valueKey)
        ? cur.filter((k) => k !== valueKey)
        : [...cur, valueKey];
      return { ...prev, [dimKey]: next };
    });
  };

  const clearFilters = () => {
    setActiveFamily(null);
    setSelectedValues({});
    setMinIntensity(0);
    setMaxAccessibility(5);
    setPoet('');
    setEra('');
  };

  // ── Theme tokens (mirror DiscoverDrawer palette) ──
  const textColor = darkMode ? 'rgba(214,211,205,0.9)' : 'rgba(40,35,30,0.9)';
  const subTextColor = darkMode ? 'rgba(214,211,205,0.6)' : 'rgba(40,35,30,0.6)';
  const subtleBorder = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const cardBg = darkMode ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)';
  const inputBg = 'rgba(197,160,89,0.06)';

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
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.18}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 140 || info.velocity.y > 600) onClose();
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        style={{
          height: '90dvh',
          background: darkMode
            ? 'linear-gradient(180deg, rgba(18,16,12,0.99) 0%, rgba(12,12,14,1) 100%)'
            : 'linear-gradient(180deg, rgba(253,252,248,0.99) 0%, rgba(245,243,238,1) 100%)',
          borderTop: '1px solid rgba(197,160,89,0.22)',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gold/25" />
        </div>

        {/* Header */}
        <div className="relative px-5 pb-2 pt-1 flex-shrink-0">
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
          <button
            onClick={onClose}
            className="absolute top-0 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
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
          ) : (
            <div className="flex flex-col gap-4 pt-1">
              <FamilyPicker
                families={data.families}
                dimensions={data.dimensions}
                activeFamily={activeFamily}
                onSelectFamily={setActiveFamily}
                selectedValues={selectedValues}
                onToggleValue={toggleValue}
                darkMode={darkMode}
              />

              {/* Sliders + poet/era */}
              <div className="flex flex-col gap-3 rounded-2xl p-3 border" style={{ borderColor: subtleBorder, background: cardBg }}>
                <SliderRow
                  label="Min intensity"
                  labelAr="أدنى حِدّة"
                  value={minIntensity}
                  min={0}
                  max={100}
                  step={5}
                  onChange={setMinIntensity}
                  subTextColor={subTextColor}
                />
                <SliderRow
                  label="Max difficulty"
                  labelAr="أقصى صعوبة"
                  value={maxAccessibility}
                  min={0}
                  max={10}
                  step={0.5}
                  onChange={setMaxAccessibility}
                  subTextColor={subTextColor}
                />
                <div className="flex gap-2">
                  <input
                    value={poet}
                    onChange={(e) => setPoet(e.target.value)}
                    placeholder="Poet (optional)"
                    aria-label="Filter by poet"
                    className="flex-1 rounded-xl px-3 py-1.5 text-[0.8125rem] font-tajawal focus:outline-none"
                    style={{ background: inputBg, border: '1px solid rgba(197,160,89,0.18)', color: textColor }}
                  />
                  <input
                    value={era}
                    onChange={(e) => setEra(e.target.value)}
                    placeholder="Era id (optional)"
                    aria-label="Filter by era"
                    className="w-32 rounded-xl px-3 py-1.5 text-[0.8125rem] font-tajawal focus:outline-none"
                    style={{ background: inputBg, border: '1px solid rgba(197,160,89,0.18)', color: textColor }}
                  />
                </div>
                <button
                  onClick={clearFilters}
                  className="self-start flex items-center gap-1.5 text-[0.625rem] font-brand-en transition-opacity"
                  style={{ color: 'var(--gold)', opacity: 0.5 }}
                >
                  <X size={10} /> Clear filters
                </button>
              </div>

              {/* Exact query being run */}
              <div
                className="rounded-xl px-3 py-2 font-mono text-[0.625rem] break-all"
                style={{ background: inputBg, border: '1px solid rgba(197,160,89,0.14)', color: subTextColor }}
              >
                {resultsLoading ? '…' : lastQuery || queryString}
              </div>

              <PoemResultsGrid
                poems={results}
                dimensions={data.dimensions}
                loading={resultsLoading}
                error={resultsError}
                darkMode={darkMode}
              />
            </div>
          )}
        </div>
      </motion.div>
    </>
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
        <p className="font-brand-en text-[0.5625rem] uppercase tracking-[0.15em] px-0.5" style={{ color: 'var(--gold)', opacity: 0.55 }}>
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
                    <span className="font-brand-en text-[0.625rem]" style={{ color: 'var(--gold)', opacity: 0.5 }}>
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
        <p className="font-brand-en text-[0.5625rem] uppercase tracking-[0.15em] px-0.5" style={{ color: 'var(--gold)', opacity: 0.55 }}>
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
              <span className="font-brand-en text-[0.5625rem]" style={{ color: 'var(--gold)', opacity: 0.5 }}>
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
                    <span style={{ color: 'var(--gold)', opacity: 0.4 }}>{Number(v.poem_count).toLocaleString()}</span>
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

/* ── Labeled range slider ── */
function SliderRow({ label, labelAr, value, min, max, step, onChange, subTextColor }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-brand-en text-[0.625rem]" style={{ color: subTextColor }}>
          {label} · <span dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif" }}>{labelAr}</span>
        </span>
        <span className="font-brand-en text-[0.6875rem] font-bold" style={{ color: 'var(--gold)' }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-gold"
        aria-label={label}
      />
    </div>
  );
}
