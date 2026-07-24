import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';

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
  loading = false,
  error = null,
  darkMode,
}) {
  const textColor = darkMode ? 'rgba(214,211,205,0.92)' : 'rgba(40,35,30,0.92)';
  const subTextColor = darkMode ? 'rgba(214,211,205,0.6)' : 'rgba(40,35,30,0.6)';
  const subtleBorder = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
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
          No poems match these filters
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {poems.map((poem) => {
        const tags = tagsFor(poem);
        const conf = Number.isFinite(Number(poem.confidence)) ? Number(poem.confidence) : null;
        return (
          <div
            key={poem.id}
            className="rounded-2xl p-3.5 flex flex-col gap-2 border"
            style={{ borderColor: subtleBorder, background: cardBg }}
          >
            {/* Title + poet */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div
                  className="font-bold text-[0.9375rem] truncate"
                  dir="rtl"
                  style={{ fontFamily: "'Reem Kufi', sans-serif", color: 'var(--gold)' }}
                >
                  {poem.titleArabic || poem.title || 'قصيدة'}
                </div>
                <div
                  className="text-[0.75rem] truncate mt-0.5"
                  dir="rtl"
                  style={{ fontFamily: "'Tajawal', sans-serif", color: textColor }}
                >
                  {poem.poetArabic || poem.poet || ''}
                </div>
              </div>
              {conf != null && (
                <span
                  className="flex-shrink-0 font-brand-en text-[0.5625rem] rounded-full px-1.5 py-0.5"
                  title="Categorization confidence"
                  style={{
                    color: 'var(--gold)',
                    background: 'rgba(197,160,89,0.1)',
                    border: '1px solid rgba(197,160,89,0.2)',
                  }}
                >
                  {conf}%
                </span>
              )}
            </div>

            {/* Snippet */}
            {firstLine(poem) && (
              <p
                className="font-amiri text-[0.8125rem] leading-[1.9] line-clamp-2"
                dir="rtl"
                style={{ color: textColor, opacity: 0.85 }}
              >
                {firstLine(poem)}
              </p>
            )}

            {/* Metrics */}
            {(poem.emotionalIntensity != null || poem.accessibilityLevel != null) && (
              <div className="flex flex-wrap gap-2 text-[0.5625rem] font-brand-en" style={{ color: subTextColor }}>
                {poem.emotionalIntensity != null && (
                  <span>intensity {poem.emotionalIntensity}</span>
                )}
                {poem.accessibilityLevel != null && (
                  <span>· accessibility {poem.accessibilityLevel}/5</span>
                )}
              </div>
            )}

            {/* Category tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((t) => (
                  <span
                    key={`${t.dim}-${t.key}`}
                    className="font-brand-en text-[0.5625rem] rounded-full px-1.5 py-0.5"
                    style={{
                      color: subTextColor,
                      border: `1px solid ${subtleBorder}`,
                    }}
                  >
                    {t.en}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
