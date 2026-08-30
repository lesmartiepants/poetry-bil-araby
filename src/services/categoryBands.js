/**
 * Era and difficulty bands, DERIVED FROM LIVE DATA.
 *
 * Two of the five onboarding steps ask about things that are not in the
 * taxonomy: when a poem is from (`poems.century`) and how hard it is
 * (`poems.accessibility_score`). Neither has a seeded list of options the way
 * mood / motif / family do, so the buckets have to be cut somewhere — and the
 * honest place to cut them is wherever the corpus actually sits.
 *
 * Nominal ranges lie about this corpus:
 *   - accessibility is nominally 0-10 but really spans 0-8.3, clustered low.
 *     A hardcoded 0-3 / 3-7 / 7-10 split puts ~85% of the library in "easy" and
 *     leaves "hard" nearly empty.
 *   - century is nominally 6-14 but the 9th alone is ~40% of everything, so one
 *     option per century gives six near-empty buttons and one huge one.
 *
 * So: the server publishes raw histograms on `GET /api/categories`
 * (`distributions.eras`, `distributions.accessibility`) and the pure functions
 * here cut them into roughly equal-weight bands. When the server is older than
 * this module and omits `distributions`, `fetchCategoryBands` samples
 * `by-category` and builds the same histogram shape, then runs the SAME pure
 * functions — so the cuts are data-derived either way and there is only one
 * banding implementation to reason about or test.
 *
 * ## A note on `accessibility_score` polarity
 *
 * HIGHER IS HARDER. The categorization prompt defines the scale as "1 = easy for
 * an Arabic learner, 5 = requires deep classical knowledge"
 * (categorization/config.py), rescaled to 0-10. The column name reads the
 * opposite way, which is a very easy mistake to make — a poem scoring 1.7 is
 * plain-spoken, one scoring 4.8 is dense. Do not invert this.
 *
 * ## A note on NULL century
 *
 * `poems.century` is a REPRESENTATIVE century derived 1:1 from the poet's era
 * (ERA_CENTURY in categorization/config.py), not a per-poem fact. The late and
 * modern eras map to NULL deliberately: they span too many centuries to pin to
 * one. That is ~25% of the corpus. Those poems are therefore not "undated data
 * we should hide" — they are a real, nameable period, and they get their own
 * band (المتأخر والحديث) rather than being dropped.
 */

import { fetchCategories, fetchPoemsByCategory } from './database.js';

/** Bands to cut each continuous axis into. Three reads as easy/medium/hard. */
const DIFFICULTY_BAND_COUNT = 3;

/**
 * Difficulty band identity + copy. The CUTS come from the data; only the names
 * and the ordering live here, because "easy / involved / demanding" is an
 * editorial judgement, not something the histogram can tell us.
 */
const DIFFICULTY_BAND_META = [
  {
    key: 'gentle',
    label_ar: 'سَهْلٌ مُيَسَّر',
    label_en: 'Gentle',
    hint_ar: 'لغة قريبة وصور مباشرة',
    hint_en: 'Plain language, direct imagery',
  },
  {
    key: 'measured',
    label_ar: 'مُتَوَسِّط',
    label_en: 'Measured',
    hint_ar: 'بلاغة أغنى وبعض الإشارات',
    hint_en: 'Richer rhetoric, some allusion',
  },
  {
    key: 'demanding',
    label_ar: 'عَميقٌ مُحْكَم',
    label_en: 'Demanding',
    hint_ar: 'معجم كلاسيكي وإشارات كثيفة',
    hint_en: 'Classical lexicon, dense allusion',
  },
];

/** 1 -> "1st", 2 -> "2nd", 13 -> "13th" */
export const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

/* -------------------------------------------------------------------------- */
/* Difficulty                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Cut an accessibility histogram into equal-weight difficulty bands.
 *
 * Equal-weight (quantile) rather than equal-width: the score is clustered low,
 * so equal-width buckets would be lopsided. Quantiles guarantee each band is a
 * real, populated third of the library, which is what makes the choice
 * meaningful to the reader.
 *
 * @param {Array<{min:number,max:number,poem_count:number}>} histogram
 * @param {number} [bandCount]
 * @returns {Array<{key,label_ar,label_en,hint_ar,hint_en,min,max,poem_count}>}
 *          `[]` when there is no data (pre-migration) — callers render an
 *          empty state rather than inventing ranges.
 */
export const deriveDifficultyBands = (histogram, bandCount = DIFFICULTY_BAND_COUNT) => {
  const buckets = (histogram || [])
    .filter((b) => Number.isFinite(b?.min) && Number.isFinite(b?.max) && b.poem_count > 0)
    .sort((a, b) => a.min - b.min);
  const total = buckets.reduce((n, b) => n + b.poem_count, 0);
  if (!total) return [];

  const bands = [];
  let cursor = 0;
  let lower = buckets[0].min;
  let running = 0;

  for (let i = 0; i < bandCount; i += 1) {
    const isLast = i === bandCount - 1;
    // Target cumulative count at the end of this band.
    const target = (total * (i + 1)) / bandCount;
    let count = 0;
    while (cursor < buckets.length && (isLast || running + count < target)) {
      count += buckets[cursor].poem_count;
      cursor += 1;
      if (!isLast && running + count >= target) break;
    }
    if (count === 0 && !isLast) continue;
    const upper = isLast ? buckets[buckets.length - 1].max : buckets[cursor - 1].max;
    const meta = DIFFICULTY_BAND_META[bands.length] || DIFFICULTY_BAND_META.at(-1);
    bands.push({ ...meta, min: lower, max: upper, poem_count: count });
    running += count;
    lower = upper;
    if (cursor >= buckets.length) break;
  }

  // Re-apply meta by final position so labels stay in easy -> hard order even if
  // a band collapsed above.
  return bands.map((b, i) => ({ ...b, ...(DIFFICULTY_BAND_META[i] || {}) }));
};

/* -------------------------------------------------------------------------- */
/* Era                                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The four era bands, fixed by the owner rather than derived.
 *
 * These used to be cut from the live histogram by equal frequency, so that no
 * button was a dead end and none swallowed the library. That produced 6-8 /
 * 9 / 11-14 / undated, and it had two problems the owner named: the 9th sat
 * alone because it really is ~40% of the corpus, which reads as an arbitrary
 * one-century button, and "undated" was surfaced to the reader as a period
 * ("Late & Modern") when it is really a gap in the metadata.
 *
 * Fixed cuts trade balance for legibility, knowingly. Undated poems ride with
 * the last band rather than getting a button of their own.
 *
 * That trade turned out cheaper than expected. Those notes were written when
 * `poems.century` was derived from `era_id`, so the 9th "really is ~40% of the
 * corpus" and 1173 poems were undated. Both were artefacts: every Abbasid poem
 * carried century 9 whether the poet died in 814 or 1057, and three whole eras
 * carried no century at all (#721).
 *
 * Measured against real centuries, the fixed cuts are close to even —
 * 6-8 ~20%, 9-10 ~27%, 11-14 ~34%, 15-21 ~14%, undated ~5%. So the bounds are
 * left exactly as the owner chose them; there is nothing to rebalance.
 *
 * The absorb rule also stopped being load-bearing: it now carries a few hundred
 * poems rather than a quarter of the library. Worth remembering if anyone is
 * tempted to build on it — it is a remainder now, not a category.
 */
const FIXED_ERA_BANDS = [
  {
    key: 'c6-8',
    from: 6,
    to: 8,
    label_ar: 'من الجاهلي إلى الأموي',
    label_en: 'Pre-Islamic to Umayyad',
    hint_ar: 'القرون 6–8 م',
    hint_en: '6th–8th c. CE',
  },
  {
    key: 'c9-10',
    from: 9,
    to: 10,
    label_ar: 'العباسي',
    label_en: 'Abbasid',
    hint_ar: 'القرنان 9–10 م',
    hint_en: '9th–10th c. CE',
  },
  {
    key: 'c11-14',
    from: 11,
    to: 14,
    label_ar: 'من الأندلسي إلى المملوكي',
    label_en: 'Andalusian to Mamluk',
    hint_ar: 'القرون 11–14 م',
    hint_en: '11th–14th c. CE',
  },
  {
    key: 'c15-today',
    from: 15,
    to: 21,
    includesUndated: true,
    label_ar: 'المتأخر والحديث',
    label_en: 'Late & Modern',
    hint_ar: 'القرون 15–21 م',
    hint_en: '15th–21st c. CE',
  },
];

export const deriveEraBands = (histogram) => {
  const rows = (histogram || []).filter((r) => r && r.poem_count > 0);
  if (!rows.length) return [];

  const byCentury = new Map();
  let undatedCount = 0;
  for (const r of rows) {
    if (r.century == null) {
      undatedCount += r.poem_count;
      continue;
    }
    byCentury.set(r.century, (byCentury.get(r.century) || 0) + r.poem_count);
  }

  const countIn = (from, to) => {
    let n = 0;
    for (const [century, poem_count] of byCentury) {
      if (century >= from && century <= to) n += poem_count;
    }
    return n;
  };
  const centuriesIn = (from, to) =>
    [...byCentury.keys()].filter((c) => c >= from && c <= to).sort((a, b) => a - b);

  return FIXED_ERA_BANDS.map((spec) => {
    const poem_count = countIn(spec.from, spec.to) + (spec.includesUndated ? undatedCount : 0);
    return {
      key: spec.key,
      label_ar: spec.label_ar,
      label_en: spec.label_en,
      centuries: centuriesIn(spec.from, spec.to),
      century_from: spec.from,
      century_to: spec.to,
      // No band IS the undated rows any more — the last one INCLUDES them.
      undated: false,
      includesUndated: !!spec.includesUndated,
      poem_count,
      hint_ar: spec.hint_ar,
      hint_en: spec.hint_en,
    };
  }).filter((b) => b.poem_count > 0);
};

/* -------------------------------------------------------------------------- */
/* Fetching                                                                    */
/* -------------------------------------------------------------------------- */

/** How many poems to sample when the server doesn't publish distributions. */
const SAMPLE_TARGET = 300;
const SAMPLE_PAGE = 50;

/**
 * Build the two histograms by sampling `by-category`, for servers predating the
 * `distributions` payload. `by-category` returns a RANDOM page, so a few pages
 * approximate the corpus shape well enough to place band cuts — we are choosing
 * a handful of boundaries, not reporting statistics.
 */
const sampleDistributions = async () => {
  const pages = Math.ceil(SAMPLE_TARGET / SAMPLE_PAGE);
  const results = await Promise.all(
    Array.from({ length: pages }, () =>
      fetchPoemsByCategory({ limit: SAMPLE_PAGE }).catch(() => [])
    )
  );
  const seen = new Map();
  for (const page of results) {
    for (const poem of page || []) if (poem?.id != null) seen.set(poem.id, poem);
  }
  const poems = [...seen.values()];
  if (!poems.length) return { eras: [], accessibility: [] };

  const eraCounts = new Map();
  for (const p of poems) {
    const century = p.century ?? null;
    const key = String(century);
    const prev = eraCounts.get(key) || { century, poem_count: 0 };
    prev.poem_count += 1;
    eraCounts.set(key, prev);
  }

  const accCounts = new Map();
  for (const p of poems) {
    const score = p.accessibilityScore;
    if (!Number.isFinite(score)) continue;
    const bucket = Math.min(19, Math.max(0, Math.floor(score * 2)));
    const prev = accCounts.get(bucket) || { min: bucket / 2, max: (bucket + 1) / 2, poem_count: 0 };
    prev.poem_count += 1;
    accCounts.set(bucket, prev);
  }

  return {
    eras: [...eraCounts.values()],
    accessibility: [...accCounts.values()].sort((a, b) => a.min - b.min),
  };
};

/**
 * Fetch the taxonomy plus the two derived band sets.
 *
 * Never rejects: pre-migration (or on any network failure) every array comes
 * back empty and the pickers show an empty state instead of hanging.
 *
 * Cheap to call early and again later: the network half is memoised per page
 * load inside fetchCategories, so a boot-time warm-up and the flow's own mount
 * share one request. The band derivation below is pure and sub-millisecond.
 *
 * @returns {Promise<{families:Array, dimensions:Array, eraBands:Array, difficultyBands:Array, degraded:boolean}>}
 */
export const fetchCategoryBands = async () => {
  let payload;
  try {
    payload = await fetchCategories();
  } catch {
    payload = null;
  }
  const dimensions = payload?.dimensions || [];
  const families = payload?.families || [];

  // Pre-migration: no taxonomy at all. Don't burn six sampling requests to
  // discover the corpus is empty.
  if (!dimensions.length && !families.length) {
    return { dimensions, families, eraBands: [], difficultyBands: [], degraded: true };
  }

  let distributions = payload?.distributions;
  let estimated = false;
  if (!distributions?.eras?.length && !distributions?.accessibility?.length) {
    estimated = true;
    // Server predates the distributions payload — derive the same histograms
    // from a live sample so the bands still come from real data.
    distributions = await sampleDistributions().catch(() => ({ eras: [], accessibility: [] }));
  }

  // Bands cut from a SAMPLE have accurate proportions but meaningless absolute
  // counts — "37 poems" out of a 300-poem sample is really ~13% of the library. Mark
  // them so the UI shows a share instead of a count rather than quoting a number
  // that is off by two orders of magnitude.
  const markShares = (bands) => {
    const total = bands.reduce((n, b) => n + (b.poem_count || 0), 0) || 1;
    return bands.map((b) => ({
      ...b,
      share: b.poem_count / total,
      estimated,
      // Absolute counts are only trustworthy when the server measured them.
      poem_count: estimated ? undefined : b.poem_count,
    }));
  };

  return {
    dimensions,
    families,
    eraBands: markShares(deriveEraBands(distributions?.eras || [])),
    difficultyBands: markShares(deriveDifficultyBands(distributions?.accessibility || [])),
    degraded: false,
  };
};
