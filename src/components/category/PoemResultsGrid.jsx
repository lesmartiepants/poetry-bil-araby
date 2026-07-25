import { useMemo, useState } from 'react';
import { Loader2, Heart, Maximize2 } from 'lucide-react';
import { fetchPoemById } from '../../services/database.js';

/**
 * PoemResultsGrid — reusable results grid for category / mood queries.
 *
 * Renders a responsive grid of compact poem cards, each showing the poem's
 * Arabic title + poet, a first-line snippet, its category tags (mood / topic /
 * motif), and a confidence badge. Purpose-built for the explorer and for the
 * future "How do you want to feel?" surface — hand it the raw by-category poem
 * array plus the dimensions payload and it labels every tag bilingually.
 *
 * NOTE: the repo's existing PoemCard is the full-page reader display (ornamental
 * frame, pre-computed versePairs, centered max-w-4xl); it is not a grid tile, so
 * this component renders its own compact card rather than reusing it.
 *
 * @param {object}   props
 * @param {Array}    props.poems       - by-category poems (normalised); each may carry
 *                                       moodPrimary, emotionalIntensity, accessibilityLevel,
 *                                       confidence, categories:{moods,topics,motifs,confidences}
 * @param {Array}    [props.dimensions] - dimensions payload, used to label value keys bilingually
 * @param {boolean}  props.loading
 * @param {string|null} props.error
 * @param {boolean}  props.darkMode
 */
export default function PoemResultsGrid({
  poems = [],
  dimensions = [],
  families = [],
  activeFamily = '',
  loading = false,
  error = null,
  darkMode,
  onSelectPoem,
  onToggleSave,
  isPoemSaved = () => false,
  onOpenPoem,
  onLoadMore,
  loadingMore = false,
  canLoadMore = false,
  emptyLabel = 'No poems match these filters',
}) {
  // Higher-contrast palette — near-opaque body text, readable secondary text.
  const textColor = darkMode ? 'rgba(232,229,223,0.98)' : 'rgba(24,20,16,0.98)';
  const subTextColor = darkMode ? 'rgba(220,216,209,0.82)' : 'rgba(34,29,24,0.82)';
  const subtleBorder = darkMode ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.1)';

  // Tap a card to EXPAND the full poem in place (no navigation, stay in the explorer).
  const [expandedId, setExpandedId] = useState(null);
  const [fullById, setFullById] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const linesOf = (s) => (s || '').split(/[*\n]+/).map((l) => l.trim()).filter(Boolean);
  const toggle = (poem) => {
    if (expandedId === poem.id) { setExpandedId(null); return; }
    setExpandedId(poem.id);
    if (!fullById[poem.id]) {
      setLoadingId(poem.id);
      fetchPoemById(poem.id)
        .then((f) => setFullById((prev) => ({ ...prev, [poem.id]: f })))
        .catch(() => {})
        .finally(() => setLoadingId((id) => (id === poem.id ? null : id)));
    }
  };
  const cardBg = darkMode ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)';

  // Build { dimKey: { valueKey: {ar,en} } } lookup so raw category keys render bilingually.
  const labelMap = useMemo(() => {
    const map = {};
    for (const dim of dimensions) {
      map[dim.key] = {};
      for (const v of dim.values || []) {
        map[dim.key][v.key] = { ar: v.label_ar, en: v.label_en };
      }
    }
    return map;
  }, [dimensions]);

  const labelFor = (dimKey, valueKey) => {
    const hit = labelMap[dimKey]?.[valueKey];
    return hit || { ar: valueKey, en: valueKey };
  };

  // "dim:key" -> family, and key -> family. Poems are multi-tagged and can span
  // several families, so a single poem has no one "true" family.
  const { familyIndex, familyByKey } = useMemo(() => {
    const idx = {};
    const byKey = {};
    for (const fam of families) {
      byKey[fam.key] = fam;
      for (const v of fam.values || []) idx[`${v.dim}:${v.key}`] = fam;
    }
    return { familyIndex: idx, familyByKey: byKey };
  }, [families]);

  // The family to show on a card. When a family filter is active and the poem
  // matches it, show THAT family (every result matched it — showing a different
  // family reads as a bug). Otherwise show the poem's dominant family: the one
  // with the most matching tags, tie-broken by the primary mood's family.
  const familyFor = (poem) => {
    const cats = poem.categories || {};
    const keys = [];
    (cats.moods || []).forEach((k) => keys.push(`mood:${k}`));
    (cats.topics || []).forEach((k) => keys.push(`topic:${k}`));
    (cats.motifs || []).forEach((k) => keys.push(`motif:${k}`));
    if (keys.length === 0 && poem.moodPrimary) keys.push(`mood:${poem.moodPrimary}`);

    if (activeFamily && familyByKey[activeFamily] && keys.some((k) => familyIndex[k]?.key === activeFamily)) {
      return familyByKey[activeFamily];
    }

    const counts = {};
    for (const k of keys) {
      const f = familyIndex[k];
      if (f) counts[f.key] = (counts[f.key] || 0) + 1;
    }
    const primFam = poem.moodPrimary ? familyIndex[`mood:${poem.moodPrimary}`] : null;
    let best = null;
    let bestN = 0;
    for (const [fk, n] of Object.entries(counts)) {
      if (n > bestN || (n === bestN && primFam && fk === primFam.key)) {
        best = fk;
        bestN = n;
      }
    }
    return best ? familyByKey[best] : primFam || null;
  };

  // Flatten a poem's category tags into a small display list [{dim, key, ar, en}].
  const tagsFor = (poem) => {
    const cats = poem.categories || {};
    const out = [];
    const push = (dimKey, keys) => {
      (Array.isArray(keys) ? keys : []).forEach((k) => {
        const lbl = labelFor(dimKey, k);
        out.push({ dim: dimKey, key: k, ...lbl });
      });
    };
    push('mood', cats.moods);
    push('topic', cats.topics);
    push('motif', cats.motifs);
    // Fall back to top-level moodPrimary if the JSONB is absent.
    if (out.length === 0 && poem.moodPrimary) {
      const lbl = labelFor('mood', poem.moodPrimary);
      out.push({ dim: 'mood', key: poem.moodPrimary, ...lbl });
    }
    return out.slice(0, 6);
  };

  const firstLine = (poem) => {
    const src = poem.arabic || '';
    return src.split('\n').map((l) => l.trim()).filter(Boolean)[0] || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin" size={20} style={{ color: 'var(--gold)', opacity: 0.5 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-10 text-center space-y-1">
        <span className="block text-[0.8125rem] font-tajawal" dir="rtl" style={{ opacity: 0.5 }}>
          تعذّر جلب النتائج
        </span>
        <span
          className="block text-[0.6875rem] font-brand-en"
          style={{ opacity: 0.5, color: subTextColor }}
        >
          {error}
        </span>
      </div>
    );
  }

  if (poems.length === 0) {
    return (
      <div className="px-4 py-10 text-center space-y-1">
        <span className="block text-[0.8125rem] font-tajawal" dir="rtl" style={{ opacity: 0.4 }}>
          لا نتائج
        </span>
        <span
          className="block text-[0.6875rem] font-brand-en"
          style={{ opacity: 0.4, color: subTextColor }}
        >
          {emptyLabel}
        </span>
      </div>
    );
  }

  return (
    <>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {poems.map((poem) => {
        const tags = tagsFor(poem);
        const fam = familyFor(poem);
        const saved = isPoemSaved(poem);
        const metrics = [];
        if (poem.accessibilityScore != null) metrics.push(`difficulty ${poem.accessibilityScore}/10`);
        if (poem.emotionalIntensity != null) metrics.push(`intensity ${poem.emotionalIntensity}`);
        return (
          <div
            key={poem.id}
            role="button"
            tabIndex={0}
            aria-expanded={expandedId === poem.id}
            onClick={() => toggle(poem)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(poem); } }}
            className={`rounded-2xl p-3.5 flex flex-col gap-2 border transition-colors cursor-pointer hover:border-gold/40 ${expandedId === poem.id ? 'border-gold/50' : ''}`}
            style={{ borderColor: subtleBorder, background: cardBg }}
          >
            {/* Title + poet — English (left, bold) beside Arabic (right) */}
            <div className="flex items-start justify-between gap-3">
              {/* English column, left-aligned */}
              <div dir="ltr" className="min-w-0 flex-1 text-left">
                <div
                  className="font-brand-en font-bold text-[0.8125rem] leading-tight line-clamp-2"
                  style={{ color: textColor }}
                >
                  {poem.title || poem.titleArabic || 'Poem'}
                </div>
                {(poem.poet || poem.poetArabic) && (
                  <div
                    className="font-brand-en font-semibold text-[0.6875rem] truncate mt-0.5"
                    style={{ color: subTextColor }}
                  >
                    {poem.poet || poem.poetArabic}
                  </div>
                )}
              </div>
              {/* Arabic column, right-aligned */}
              <div dir="rtl" className="min-w-0 flex-1 text-right">
                <div
                  className="font-bold text-[0.9375rem] leading-tight line-clamp-2"
                  style={{ fontFamily: "'Reem Kufi', sans-serif", color: 'var(--gold)' }}
                >
                  {poem.titleArabic || poem.title || 'قصيدة'}
                </div>
                {(poem.poetArabic || poem.poet) && (
                  <div
                    className="text-[0.75rem] truncate mt-0.5"
                    style={{ fontFamily: "'Tajawal', sans-serif", color: textColor }}
                  >
                    {poem.poetArabic || poem.poet}
                  </div>
                )}
              </div>
            </div>

            {/* Snippet */}
            {expandedId !== poem.id && firstLine(poem) && (
              <p
                className="font-amiri text-[0.8125rem] leading-[1.9] line-clamp-2"
                dir="rtl"
                style={{ color: textColor, opacity: 0.85 }}
              >
                {firstLine(poem)}
              </p>
            )}

            {/* Metrics — difficulty, intensity, family */}
            {(metrics.length > 0 || fam) && (
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[0.5625rem] font-brand-en font-semibold" style={{ color: subTextColor }}>
                {metrics.length > 0 && <span>{metrics.join(' · ')}</span>}
                {fam && (
                  <span style={{ color: 'var(--gold)' }}>
                    {metrics.length > 0 ? '· ' : ''}
                    {fam.label_en}
                  </span>
                )}
              </div>
            )}

            {/* Category tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((t) => (
                  <span
                    key={`${t.dim}-${t.key}`}
                    className="font-brand-en font-semibold text-[0.5625rem] rounded-full px-1.5 py-0.5"
                    style={{
                      color: textColor,
                      background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${subtleBorder}`,
                    }}
                  >
                    {t.en}
                  </span>
                ))}
              </div>
            )}

            {/* Expanded full poem — in place, no navigation */}
            {expandedId === poem.id && (
              <div
                className="mt-1 pt-2.5 border-t"
                style={{ borderColor: subtleBorder }}
                onClick={(e) => e.stopPropagation()}
              >
                {loadingId === poem.id && !fullById[poem.id] ? (
                  <div className="flex items-center gap-2 text-[0.6875rem]" style={{ color: subTextColor }}>
                    <Loader2 className="w-3 h-3 animate-spin" /> loading full poem…
                  </div>
                ) : (
                  <>
                    <div dir="rtl" className="font-amiri text-[0.9375rem] leading-[2.1]" style={{ color: textColor }}>
                      {linesOf(fullById[poem.id]?.arabic || poem.arabic).map((l, i) => (
                        <div key={i}>{l}</div>
                      ))}
                    </div>
                    {fullById[poem.id]?.english && (
                      <div
                        dir="ltr"
                        className="mt-2.5 pt-2 border-t text-[0.75rem] leading-[1.7]"
                        style={{ borderColor: subtleBorder, color: subTextColor }}
                      >
                        {linesOf(fullById[poem.id].english).map((l, i) => (
                          <div key={i}>{l}</div>
                        ))}
                      </div>
                    )}
                    {poem.accessibilityFactors && (
                      <div
                        className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-[0.5625rem] font-brand-en"
                        style={{ color: subTextColor, opacity: 0.75 }}
                      >
                        {Object.entries(poem.accessibilityFactors).map(([k, v]) => (
                          <span key={k}>{k.replace('imagery_abstraction', 'imagery')} {v}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 text-[0.5625rem] font-brand-en" style={{ color: subTextColor, opacity: 0.55 }}>
                      tap to collapse
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Card actions — save + open in reader (bottom-right) */}
            {(onToggleSave || onOpenPoem) && (
              <div className="flex justify-end gap-1.5 mt-0.5">
                {onToggleSave && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSave(poem);
                    }}
                    aria-label={saved ? 'Remove from saved' : 'Save poem'}
                    className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:border-gold/40"
                    style={{
                      background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      border: `1px solid ${subtleBorder}`,
                    }}
                  >
                    <Heart
                      size={13}
                      style={{ color: saved ? 'var(--gold)' : subTextColor }}
                      fill={saved ? 'var(--gold)' : 'none'}
                    />
                  </button>
                )}
                {onOpenPoem && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPoem(poem.id);
                    }}
                    aria-label="Open this poem in the reader"
                    className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:border-gold/40"
                    style={{
                      background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      border: `1px solid ${subtleBorder}`,
                    }}
                  >
                    <Maximize2 size={12} style={{ color: subTextColor }} />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>

    {/* Load more */}
    {canLoadMore && onLoadMore && (
      <div className="flex justify-center pt-4 pb-2">
        <button
          onClick={onLoadMore}
          disabled={loadingMore}
          className="flex items-center gap-2 px-5 py-2 rounded-full font-brand-en font-semibold text-[0.75rem] transition-colors disabled:opacity-60"
          style={{
            color: 'var(--gold)',
            background: 'rgba(197,160,89,0.1)',
            border: '1px solid rgba(197,160,89,0.35)',
          }}
        >
          {loadingMore ? <Loader2 size={13} className="animate-spin" /> : null}
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      </div>
    )}
    </>
  );
}
