import { describe, it, expect, vi, beforeEach } from 'vitest';

import { deriveEraBands, deriveDifficultyBands, ordinal } from '../services/categoryBands.js';
import { fetchCategories, _resetCategoriesMemo } from '../services/database.js';

/**
 * A real histogram, measured from the production corpus (1,645 sampled poems via
 * `GET /api/poems/by-category`). Kept as a fixture so the banding is asserted
 * against the actual shape of the library rather than a tidy synthetic curve —
 * the whole point of deriving bands is that the real distribution is lopsided.
 */
const REAL_ERA_HISTOGRAM = [
  { century: 6, poem_count: 86 },
  { century: 7, poem_count: 6 },
  { century: 8, poem_count: 122 },
  { century: 9, poem_count: 649 },
  { century: 11, poem_count: 162 },
  { century: 13, poem_count: 65 },
  { century: 14, poem_count: 146 },
  { century: null, poem_count: 409 },
];

const REAL_ACCESSIBILITY_HISTOGRAM = [
  { min: 0.0, max: 0.5, poem_count: 12 },
  { min: 0.5, max: 1.0, poem_count: 64 },
  { min: 1.0, max: 1.5, poem_count: 197 },
  { min: 1.5, max: 2.0, poem_count: 289 },
  { min: 2.0, max: 2.5, poem_count: 275 },
  { min: 2.5, max: 3.0, poem_count: 221 },
  { min: 3.0, max: 3.5, poem_count: 165 },
  { min: 3.5, max: 4.0, poem_count: 128 },
  { min: 4.0, max: 4.5, poem_count: 105 },
  { min: 4.5, max: 5.0, poem_count: 78 },
  { min: 5.0, max: 5.5, poem_count: 52 },
  { min: 5.5, max: 6.0, poem_count: 33 },
  { min: 6.0, max: 6.5, poem_count: 16 },
  { min: 6.5, max: 7.0, poem_count: 7 },
  { min: 7.0, max: 7.5, poem_count: 2 },
  { min: 8.0, max: 8.5, poem_count: 1 },
];

describe('ordinal', () => {
  it('formats centuries', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(9)).toBe('9th');
    expect(ordinal(13)).toBe('13th');
  });
});

describe('deriveDifficultyBands', () => {
  it('returns nothing when there is no data (pre-migration)', () => {
    expect(deriveDifficultyBands([])).toEqual([]);
    expect(deriveDifficultyBands(undefined)).toEqual([]);
    expect(deriveDifficultyBands([{ min: 0, max: 0.5, poem_count: 0 }])).toEqual([]);
  });

  it('cuts the real distribution into three populated bands', () => {
    const bands = deriveDifficultyBands(REAL_ACCESSIBILITY_HISTOGRAM);
    expect(bands).toHaveLength(3);
    for (const b of bands) expect(b.poem_count).toBeGreaterThan(0);
  });

  it('keeps bands roughly equal-weight rather than equal-width', () => {
    const bands = deriveDifficultyBands(REAL_ACCESSIBILITY_HISTOGRAM);
    const total = REAL_ACCESSIBILITY_HISTOGRAM.reduce((n, b) => n + b.poem_count, 0);
    for (const b of bands) {
      const share = b.poem_count / total;
      // A nominal 0-3/3-7/7-10 split would put ~85% in one band; quantile cuts
      // keep every band within a sane distance of a third.
      expect(share).toBeGreaterThan(0.15);
      expect(share).toBeLessThan(0.55);
    }
  });

  it('orders bands easy -> hard, and never exceeds the observed range', () => {
    const bands = deriveDifficultyBands(REAL_ACCESSIBILITY_HISTOGRAM);
    expect(bands.map((b) => b.key)).toEqual(['gentle', 'measured', 'demanding']);
    // Higher accessibility_score = HARDER, so bounds must ascend.
    for (let i = 1; i < bands.length; i += 1) {
      expect(bands[i].min).toBeGreaterThanOrEqual(bands[i - 1].min);
    }
    expect(bands[0].min).toBe(0);
    // Real data tops out at 8.3 — the last band must not claim the nominal 10.
    expect(bands.at(-1).max).toBeLessThanOrEqual(8.5);
  });

  it('labels every band bilingually', () => {
    for (const b of deriveDifficultyBands(REAL_ACCESSIBILITY_HISTOGRAM)) {
      expect(b.label_ar).toBeTruthy();
      expect(b.label_en).toBeTruthy();
      expect(b.label_ar).toMatch(/[؀-ۿ]/);
    }
  });
});

describe('deriveEraBands', () => {
  it('returns nothing when there is no data (pre-migration)', () => {
    expect(deriveEraBands([])).toEqual([]);
    expect(deriveEraBands(undefined)).toEqual([]);
  });

  // Undated poems used to be their own button, labelled "Late & Modern" — a
  // gap in the metadata presented to the reader as a literary period. They now
  // ride with the 15th-to-today band, which is both where an undated poem most
  // likely belongs and one fewer thing to explain.
  it('folds the undated poems into the last band rather than giving them a button', () => {
    const bands = deriveEraBands(REAL_ERA_HISTOGRAM);
    expect(bands.some((b) => b.undated)).toBe(false);
    const last = bands.at(-1);
    expect(last.key).toBe('c15-today');
    expect(last.includesUndated).toBe(true);
    expect(last.poem_count).toBeGreaterThanOrEqual(409);
    expect(last.label_ar).toMatch(/[؀-ۿ]/);
  });

  // The four cuts are the owner's, not the histogram's.
  it('always cuts at 6-8 / 9-10 / 11-14 / 15-today', () => {
    const bands = deriveEraBands(REAL_ERA_HISTOGRAM);
    expect(bands.map((b) => b.key)).toEqual(['c6-8', 'c9-10', 'c11-14', 'c15-today']);
    expect(bands.map((b) => [b.century_from, b.century_to])).toEqual([
      [6, 8],
      [9, 10],
      [11, 14],
      [15, 21],
    ]);
  });

  it('accounts for every poem exactly once', () => {
    const bands = deriveEraBands(REAL_ERA_HISTOGRAM);
    const total = REAL_ERA_HISTOGRAM.reduce((n, r) => n + r.poem_count, 0);
    expect(bands.reduce((n, b) => n + b.poem_count, 0)).toBe(total);
  });

  it('produces contiguous, non-overlapping century ranges in ascending order', () => {
    const dated = deriveEraBands(REAL_ERA_HISTOGRAM).filter((b) => !b.undated);
    expect(dated.length).toBeGreaterThan(1);
    for (const b of dated) expect(b.century_from).toBeLessThanOrEqual(b.century_to);
    for (let i = 1; i < dated.length; i += 1) {
      expect(dated[i].century_from).toBeGreaterThan(dated[i - 1].century_to);
    }
  });

  // The bands were once cut by equal frequency so no button could dominate or
  // dead-end. Fixed cuts give that up on purpose: the 9th century really is
  // ~40% of the corpus, and a band holding it will be the biggest by far. What
  // still has to hold is that no band is EMPTY — an option that leads nowhere
  // is worse than an unbalanced one.
  it('leaves no band empty', () => {
    const bands = deriveEraBands(REAL_ERA_HISTOGRAM);
    for (const b of bands) expect(b.poem_count).toBeGreaterThan(0);
  });

  it('uses real Arabic period names where a century maps to one', () => {
    const bands = deriveEraBands(REAL_ERA_HISTOGRAM);
    const joined = bands.map((b) => b.label_ar).join(' ');
    // 6th c. is الجاهلي, 9th is العباسي — both must survive into a label.
    expect(joined).toMatch(/الجاهلي/);
    expect(joined).toMatch(/العباسي/);
    for (const b of bands) {
      expect(b.label_ar).toMatch(/[؀-ۿ]/);
      expect(b.label_en).toBeTruthy();
    }
  });

  // Centuries outside 6-21 are not in any band and simply do not appear. That
  // is deliberate: the bands are a fixed reading of Arabic literary history,
  // not a partition of whatever the data happens to contain.
  it('drops centuries that fall outside the fixed bands', () => {
    const bands = deriveEraBands([
      { century: 21, poem_count: 50 },
      { century: 40, poem_count: 50 },
    ]);
    expect(bands.map((b) => b.key)).toEqual(['c15-today']);
    expect(bands[0].poem_count).toBe(50);
  });

  it('handles a corpus that is entirely undated', () => {
    const bands = deriveEraBands([{ century: null, poem_count: 100 }]);
    expect(bands).toHaveLength(1);
    expect(bands[0].key).toBe('c15-today');
    expect(bands[0].poem_count).toBe(100);
  });
});

/**
 * The unscoped taxonomy is the request the onboarding flow blocks on, and four
 * unrelated consumers ask for it. These lock in that they share ONE request —
 * which is what makes the boot-time prefetch in prefetch.js worth doing — and
 * that a scoped call is never served a memoised answer.
 */
describe('fetchCategories memo', () => {
  const payload = {
    dimensions: [{ key: 'mood', label_ar: 'المزاج', label_en: 'Mood', values: [] }],
    families: [],
    distributions: { eras: [], accessibility: [] },
  };

  beforeEach(() => {
    _resetCategoriesMemo();
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => payload }));
  });

  it('sends one request no matter how many callers want the unscoped taxonomy', async () => {
    const [a, b, c] = await Promise.all([fetchCategories(), fetchCategories(), fetchCategories()]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(a.dimensions).toEqual(payload.dimensions);
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it('joins an in-flight request rather than starting a second', async () => {
    let release;
    globalThis.fetch = vi.fn(
      () => new Promise((r) => (release = () => r({ ok: true, json: async () => payload })))
    );
    const first = fetchCategories();
    const second = fetchCategories();
    release();
    await Promise.all([first, second]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('never memoises a scoped call — cascading counts must stay live', async () => {
    await fetchCategories();
    await fetchCategories({ family: 'grief-loss' });
    await fetchCategories({ family: 'grief-loss' });
    // 1 unscoped + 2 scoped: the scoped pair is deliberately not deduped.
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('treats an empty scope object as the unscoped payload', async () => {
    await fetchCategories();
    await fetchCategories({});
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
