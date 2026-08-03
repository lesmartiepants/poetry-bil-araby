import { describe, it, expect } from 'vitest';

import {
  POOL,
  INITIAL_MIX,
  SETTLED_MIX,
  DECAY_OVER_POEMS,
  mixFor,
  hasPreferences,
  pickPool,
  filtersForPool,
  nextDraw,
} from '../services/preferenceWeighting.js';

const PREFS = {
  family: 'love-desire',
  moods: ['pride', 'yearning'],
  motifs: ['night'],
  era: 'c6-8',
  difficulty: 'gentle',
};

const BANDS = {
  eraBands: [
    { key: 'c6-8', century_from: 6, century_to: 8, undated: false },
    { key: 'undated', century_from: null, century_to: null, undated: true },
  ],
  difficultyBands: [
    { key: 'gentle', min: 0, max: 2 },
    { key: 'demanding', min: 3.5, max: 8.5 },
  ],
};

/** Deterministic rng returning a fixed value. */
const fixed = (v) => () => v;

describe('mixFor', () => {
  it('starts at the initial mix and settles at the floor', () => {
    expect(mixFor(0)).toEqual(INITIAL_MIX);
    expect(mixFor(DECAY_OVER_POEMS)).toEqual(SETTLED_MIX);
    expect(mixFor(9999)).toEqual(SETTLED_MIX);
  });

  it('always sums to 1', () => {
    for (const seen of [0, 1, 7, 15, 30, 100]) {
      const m = mixFor(seen);
      expect(m.core + m.adjacent + m.wild).toBeCloseTo(1, 10);
    }
  });

  it('loosens monotonically: core falls, wild rises', () => {
    let prev = mixFor(0);
    for (const seen of [5, 10, 20, 30]) {
      const m = mixFor(seen);
      expect(m.core).toBeLessThanOrEqual(prev.core);
      expect(m.wild).toBeGreaterThanOrEqual(prev.wild);
      prev = m;
    }
  });

  it('never lets the biased pools take the whole feed — no lock-in', () => {
    // This is the guarantee the owner asked for: a reader must never be pinned
    // to a slice of the corpus. Wild is unfiltered, so its share is the floor on
    // how much of the library stays reachable on any given draw.
    for (const seen of [0, 1, 5, 30, 500]) {
      expect(mixFor(seen).wild).toBeGreaterThan(0.1);
    }
    expect(mixFor(DECAY_OVER_POEMS).wild).toBeGreaterThanOrEqual(0.4);
  });

  it('handles junk input', () => {
    expect(mixFor(undefined)).toEqual(INITIAL_MIX);
    expect(mixFor(-5)).toEqual(INITIAL_MIX);
    expect(mixFor(NaN)).toEqual(INITIAL_MIX);
  });
});

describe('hasPreferences', () => {
  it('is false for empty / skipped onboarding', () => {
    expect(hasPreferences(null)).toBe(false);
    expect(hasPreferences({})).toBe(false);
    expect(hasPreferences({ family: null, moods: [], motifs: [] })).toBe(false);
  });

  it('is true when any single answer was given', () => {
    expect(hasPreferences({ moods: ['joy'] })).toBe(true);
    expect(hasPreferences({ family: 'love-desire' })).toBe(true);
    expect(hasPreferences({ difficulty: 'gentle' })).toBe(true);
  });
});

describe('pickPool', () => {
  it('is always wild when the reader gave no answers', () => {
    expect(pickPool({}, 0, fixed(0))).toBe(POOL.WILD);
    expect(pickPool({}, 0, fixed(0.99))).toBe(POOL.WILD);
  });

  it('splits the unit interval by the mix', () => {
    const m = mixFor(0);
    expect(pickPool(PREFS, 0, fixed(0))).toBe(POOL.CORE);
    expect(pickPool(PREFS, 0, fixed(m.core - 0.001))).toBe(POOL.CORE);
    expect(pickPool(PREFS, 0, fixed(m.core + 0.001))).toBe(POOL.ADJACENT);
    expect(pickPool(PREFS, 0, fixed(m.core + m.adjacent + 0.001))).toBe(POOL.WILD);
    expect(pickPool(PREFS, 0, fixed(0.999))).toBe(POOL.WILD);
  });

  it('shifts toward wild as the reader gets through poems', () => {
    // A draw that lands in core early lands outside it once the mix has settled.
    const r = 0.5;
    expect(pickPool(PREFS, 0, fixed(r))).toBe(POOL.CORE);
    expect(pickPool(PREFS, DECAY_OVER_POEMS, fixed(r))).not.toBe(POOL.CORE);
  });
});

describe('filtersForPool', () => {
  it('wild applies nothing at all', () => {
    expect(filtersForPool(PREFS, POOL.WILD, BANDS)).toEqual({});
  });

  it('core applies every answer', () => {
    const f = filtersForPool(PREFS, POOL.CORE, BANDS);
    expect(f.family).toBe('love-desire');
    expect(f.mood).toBe('pride,yearning');
    expect(f.motif).toBe('night');
    expect(f.centuryFrom).toBe(6);
    expect(f.centuryTo).toBe(8);
    expect(f.minAccessibility).toBe(0);
    expect(f.maxAccessibility).toBe(2);
  });

  it('keeps undated poems eligible inside a dated era band', () => {
    // ~25% of the corpus has no century by construction (late/modern eras have
    // no single representative century). Excluding them from every dated band
    // would silently hide a quarter of the library.
    expect(filtersForPool(PREFS, POOL.CORE, BANDS).includeUndated).toBe(1);
  });

  it('expresses the late/modern band as the undated rows', () => {
    const f = filtersForPool({ ...PREFS, era: 'undated' }, POOL.CORE, BANDS);
    expect(f.undated).toBe(1);
    expect(f.centuryFrom).toBeUndefined();
    expect(f.centuryTo).toBeUndefined();
  });

  it('adjacent keeps only the broadest signal', () => {
    expect(filtersForPool(PREFS, POOL.ADJACENT, BANDS)).toEqual({ family: 'love-desire' });
  });

  it('adjacent falls back to moods when the family step was skipped', () => {
    const f = filtersForPool({ ...PREFS, family: null }, POOL.ADJACENT, BANDS);
    expect(f).toEqual({ mood: 'pride,yearning' });
  });

  it('drops era and difficulty rather than guessing when bands are unavailable', () => {
    const f = filtersForPool(PREFS, POOL.CORE, {});
    expect(f.centuryFrom).toBeUndefined();
    expect(f.minAccessibility).toBeUndefined();
    // The answers we can honour still apply.
    expect(f.family).toBe('love-desire');
    expect(f.mood).toBe('pride,yearning');
  });

  it('produces no filters when there are no answers', () => {
    expect(filtersForPool({}, POOL.CORE, BANDS)).toEqual({});
  });
});

describe('nextDraw', () => {
  it('returns the pool alongside its filters', () => {
    const { pool, filters } = nextDraw(PREFS, 0, BANDS, fixed(0));
    expect(pool).toBe(POOL.CORE);
    expect(filters.family).toBe('love-desire');
  });

  it('over many draws, a meaningful share is unbiased', () => {
    // Statistical statement of the no-lock-in guarantee.
    let wild = 0;
    const n = 4000;
    for (let i = 0; i < n; i += 1) {
      if (nextDraw(PREFS, 0, BANDS, fixed(i / n)).pool === POOL.WILD) wild += 1;
    }
    expect(wild / n).toBeCloseTo(INITIAL_MIX.wild, 2);
  });
});
