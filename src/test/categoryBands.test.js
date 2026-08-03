import { describe, it, expect } from 'vitest';

import { deriveEraBands, deriveDifficultyBands, ordinal } from '../services/categoryBands.js';

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

  it('gives the undated (late/modern) poems their own band instead of dropping them', () => {
    const bands = deriveEraBands(REAL_ERA_HISTOGRAM);
    const undated = bands.filter((b) => b.undated);
    expect(undated).toHaveLength(1);
    expect(undated[0].poem_count).toBe(409);
    expect(undated[0].century_from).toBeNull();
    expect(undated[0].label_ar).toMatch(/[؀-ۿ]/);
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

  it('breaks up the 9th-century pile-up instead of leaving one giant option', () => {
    const bands = deriveEraBands(REAL_ERA_HISTOGRAM);
    const total = REAL_ERA_HISTOGRAM.reduce((n, r) => n + r.poem_count, 0);
    // Raw centuries would give the 9th ~40% of the corpus in a single button.
    // No band should dominate that badly after grouping.
    for (const b of bands) expect(b.poem_count / total).toBeLessThan(0.45);
    // And no band should be a dead end.
    for (const b of bands) expect(b.poem_count / total).toBeGreaterThan(0.03);
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

  it('falls back to a plain century label for an unrecognised century', () => {
    const bands = deriveEraBands(
      [
        { century: 21, poem_count: 50 },
        { century: 22, poem_count: 50 },
      ],
      2
    );
    expect(bands.map((b) => b.label_en)).toEqual(['21st c.', '22nd c.']);
  });

  it('handles a corpus that is entirely undated', () => {
    const bands = deriveEraBands([{ century: null, poem_count: 100 }]);
    expect(bands).toHaveLength(1);
    expect(bands[0].undated).toBe(true);
  });
});
