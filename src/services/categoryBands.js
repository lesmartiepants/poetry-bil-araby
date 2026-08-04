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

/**
 * Real Arabic literary period names, keyed by the representative century the
 * pipeline assigns to each era. Only periods that actually correspond to a
 * century present in the data are named; anything unrecognised falls back to a
 * plain "Nth century" label rather than an invented period name.
 *
 * `null` is the late/modern bucket — see the NULL-century note above.
 */
const PERIOD_BY_CENTURY = {
  6: { label_ar: 'الجاهلي', label_en: 'Pre-Islamic' },
  7: { label_ar: 'صدر الإسلام', label_en: 'Early Islamic' },
  8: { label_ar: 'الأموي', label_en: 'Umayyad' },
  9: { label_ar: 'العباسي', label_en: 'Abbasid' },
  11: { label_ar: 'الأندلسي', label_en: 'Andalusian' },
  13: { label_ar: 'الأيوبي', label_en: 'Ayyubid' },
  14: { label_ar: 'المملوكي', label_en: 'Mamluk' },
};

const UNDATED_PERIOD = { label_ar: 'المتأخر والحديث', label_en: 'Late & Modern' };

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

const periodFor = (century) =>
  century == null
    ? UNDATED_PERIOD
    : PERIOD_BY_CENTURY[century] || {
        label_ar: `القرن ${century}`,
        label_en: `${ordinal(century)} c.`,
      };

/**
 * Group the era histogram into contiguous century bands of roughly comparable
 * size, then label each band with the real literary period(s) it covers.
 *
 * Why bands and not raw centuries: the 9th century alone is ~40% of the corpus
 * and the 7th is under 1%, so one option per century is unusable. Grouping
 * adjacent periods until each band carries a fair share gives the reader
 * choices that all actually lead somewhere.
 *
 * The undated (late/modern) poems are NOT folded into a neighbouring band —
 * they are their own band at the end, because they are a genuine period rather
 * than a gap in the data.
 *
 * @param {Array<{century:number|null, poem_count:number}>} histogram
 * @param {number} [targetBands] desired number of DATED bands (undated is extra)
 * @returns {Array<{key,label_ar,label_en,centuries,century_from,century_to,undated,poem_count}>}
 */
export const deriveEraBands = (histogram, targetBands = 3) => {
  const rows = (histogram || []).filter((r) => r && r.poem_count > 0);
  if (!rows.length) return [];

  // Collapse (era, century) rows to one row per century.
  const byCentury = new Map();
  let undatedCount = 0;
  for (const r of rows) {
    if (r.century == null) {
      undatedCount += r.poem_count;
      continue;
    }
    byCentury.set(r.century, (byCentury.get(r.century) || 0) + r.poem_count);
  }

  const centuries = [...byCentury.entries()]
    .map(([century, poem_count]) => ({ century, poem_count }))
    .sort((a, b) => a.century - b.century);

  const datedTotal = centuries.reduce((n, c) => n + c.poem_count, 0);
  const bands = [];

  if (datedTotal) {
    // Equal-frequency grouping over discrete atoms. Walking the centuries in
    // order, we cut wherever the running total lands CLOSEST to this band's
    // share — comparing "cut before this century" against "include it". Cutting
    // only once the share is exceeded would swallow a huge century into whatever
    // came before it (the 9th, at ~40% of the corpus, would drag the 6th-8th in
    // with it and produce one band holding most of the library).
    //
    // A century bigger than a whole share ends up alone in its own band, which
    // is the honest outcome: the Abbasid century really is that much of the
    // corpus, and no grouping can make it smaller. The picker shows counts so
    // that is visible rather than hidden.
    let current = [];
    let currentCount = 0;
    let cumulative = 0;
    for (const entry of centuries) {
      const remainingBands = targetBands - bands.length;
      const target = (datedTotal * (bands.length + 1)) / targetBands;
      const cutBefore = Math.abs(cumulative - target);
      const cutAfter = Math.abs(cumulative + entry.poem_count - target);
      if (current.length && remainingBands > 1 && cutBefore <= cutAfter) {
        bands.push({ centuries: current, poem_count: currentCount });
        current = [];
        currentCount = 0;
      }
      current.push(entry);
      currentCount += entry.poem_count;
      cumulative += entry.poem_count;
    }
    if (current.length) bands.push({ centuries: current, poem_count: currentCount });
  }

  const dated = bands.map((b) => {
    const list = b.centuries.map((c) => c.century);
    const from = list[0];
    const to = list.at(-1);
    // Name the band by the periods at its ends. A band covering one period keeps
    // that period's name; a band spanning several reads "الجاهلي والأموي".
    const names = list.map((c) => periodFor(c));
    const first = names[0];
    const last = names.at(-1);
    const label_ar =
      first.label_ar === last.label_ar
        ? first.label_ar
        : `من ${first.label_ar} إلى ${last.label_ar}`;
    const label_en =
      first.label_en === last.label_en ? first.label_en : `${first.label_en} to ${last.label_en}`;
    return {
      key: `c${from}-${to}`,
      label_ar,
      label_en,
      centuries: list,
      century_from: from,
      century_to: to,
      undated: false,
      poem_count: b.poem_count,
      // Arabic marks "two" separately from "three or more": القرنان is dual, so a
      // band spanning 3+ centuries needs the plural القرون.
      hint_ar:
        from === to
          ? `القرن ${from} م`
          : to - from === 1
            ? `القرنان ${from}–${to} م`
            : `القرون ${from}–${to} م`,
      hint_en:
        from === to ? `${ordinal(from)} century CE` : `${ordinal(from)}–${ordinal(to)} c. CE`,
    };
  });

  if (undatedCount > 0) {
    dated.push({
      key: 'undated',
      ...UNDATED_PERIOD,
      centuries: [],
      century_from: null,
      century_to: null,
      undated: true,
      poem_count: undatedCount,
      hint_ar: 'ما بعد المماليك وحتى اليوم',
      hint_en: 'Post-Mamluk through today',
    });
  }

  return dated;
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
