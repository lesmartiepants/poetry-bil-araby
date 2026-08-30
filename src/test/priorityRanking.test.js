import { describe, it, expect, beforeEach } from 'vitest';
import { priorityAddress, PRIORITY_ORDER, drawManyFrom } from '../services/preferenceWeighting.js';

const BANDS = {
  eraBands: [
    { key: 'c9-10', century_from: 9, century_to: 10, undated: false },
    { key: 'c11-14', century_from: 11, century_to: 14, undated: false },
  ],
  difficultyBands: [{ key: 'gentle', min: 1, max: 2.4 }],
};

/** The reader from the worked example: night, amorous, gentle, 9th-10th. */
const PREFS = {
  version: 2,
  moods: ['amorous'],
  motifs: ['night'],
  era: ['c9-10'],
  difficulty: ['gentle'],
};

const poem = (id, { motifs = [], moods = [], century = 20, acc = 5 } = {}) => ({
  id,
  century,
  accessibilityScore: acc,
  categories: { motifs, moods },
});

const terms = (...keys) => keys.map((k) => ({ key: k, earned: 1, weight: 1 }));

describe('priorityAddress', () => {
  it('places the dimensions in the owner-chosen order', () => {
    expect(PRIORITY_ORDER).toEqual(['motif', 'mood', 'family', 'difficulty', 'era']);
  });

  it('orders strictly WITHIN the address, so it can break ties cleanly', () => {
    // Place value, so the address alone ranks a higher-priority match above any
    // combination of lower ones. Note this is a property of the address, not of
    // the feed: byRank sorts on match COUNT first, so a poem carrying only
    // imagery does NOT beat one carrying the other four. See the ranking tests.
    const imageryOnly = priorityAddress(terms('motif'));
    const everythingElse = priorityAddress(terms('mood', 'family', 'difficulty', 'era'));
    expect(imageryOnly).toBe(16);
    expect(everythingElse).toBe(15);
    expect(imageryOnly).toBeGreaterThan(everythingElse);
  });

  it('counts a dimension on ANY credit, not full credit', () => {
    // Full credit is unreachable on a multi-select axis — a poem carries one
    // primary mood, so asking for three caps that term below its weight. If
    // this required earned >= weight the top rung would be empty for every
    // reader who multi-selected.
    const partial = [{ key: 'motif', earned: 0.1, weight: 1 }];
    expect(priorityAddress(partial)).toBe(16);
  });

  it('ignores steps the reader skipped rather than penalising them', () => {
    expect(priorityAddress(terms('motif', 'mood'))).toBe(24);
    expect(priorityAddress([])).toBe(0);
  });
});

describe('the ladder, on poems', () => {
  it('ranks more matches above fewer, whatever the priority order says', () => {
    // Y matches era + difficulty (2). X matches imagery only (1). Imagery
    // outranks both of those in PRIORITY_ORDER, and Y still wins: count is the
    // primary key. Ranking address-first surfaced one-dimension poems ahead of
    // four-dimension ones, which is why this is the way round it is.
    const X = poem('X', { motifs: ['night'], moods: [], century: 20, acc: 5 });
    const Y = poem('Y', { motifs: [], moods: [], century: 9, acc: 2 });

    const { picks } = drawManyFrom([X, Y], PREFS, 0, BANDS, {
      count: 2,
      deterministic: 2,
    });

    expect(picks[0].poem.id).toBe('Y');
    expect(picks[1].poem.id).toBe('X');
  });

  it('uses the priority order to break ties between equal match counts', () => {
    // Both match exactly two dimensions. HIGH holds imagery + mood, LOW holds
    // difficulty + era. Same count, so the priority order decides.
    const HIGH = poem('HIGH', { motifs: ['night'], moods: ['amorous'], century: 20, acc: 5 });
    const LOW = poem('LOW', { motifs: [], moods: [], century: 9, acc: 2 });

    const { picks } = drawManyFrom([LOW, HIGH], PREFS, 0, BANDS, {
      count: 2,
      deterministic: 2,
    });

    expect(picks[0].poem.id).toBe('HIGH');
  });

  it('falls back to the weighted score inside a rung', () => {
    // Both match imagery only, so the ladder ties them. The continuous credit
    // is the only thing left to separate a near miss from a wild one — this is
    // where the difficulty falloff survives a binary ladder.
    const near = poem('near', { motifs: ['night'], century: 11, acc: 2.6 });
    const far = poem('far', { motifs: ['night'], century: 20, acc: 5 });

    const { picks } = drawManyFrom([far, near], PREFS, 0, BANDS, {
      count: 2,
      deterministic: 2,
    });

    expect(picks[0].poem.id).toBe('near');
  });

  it('is deterministic — same pool, same answers, same opening', () => {
    const pool = [
      poem('a', { motifs: ['night'], moods: ['amorous'] }),
      poem('b', { motifs: ['night'] }),
      poem('c', {}),
    ];
    const once = drawManyFrom(pool, PREFS, 0, BANDS, { count: 3, deterministic: 3 });
    const twice = drawManyFrom([...pool].reverse(), PREFS, 0, BANDS, {
      count: 3,
      deterministic: 3,
    });
    expect(once.picks.map((p) => p.poem.id)).toEqual(twice.picks.map((p) => p.poem.id));
  });
});

describe('exhaustion', () => {
  it('skips poems already shown, so a rung empties instead of repeating', () => {
    const top1 = poem('top1', { motifs: ['night'], moods: ['amorous'] });
    const top2 = poem('top2', { motifs: ['night'], moods: ['amorous'] });
    const lower = poem('lower', {});

    const first = drawManyFrom([top1, top2, lower], PREFS, 0, BANDS, {
      count: 1,
      deterministic: 1,
    });
    const shown = first.picks[0].poem.id;

    const second = drawManyFrom([top1, top2, lower], PREFS, 1, BANDS, {
      count: 1,
      deterministic: 1,
      seen: new Set([shown]),
    });

    expect(second.picks[0].poem.id).not.toBe(shown);
  });

  it('returns the pool rather than nothing when everything has been seen', () => {
    // A dead end the reader cannot escape without clearing storage would be
    // worse than a repeat.
    const p = poem('only', { motifs: ['night'] });
    const { picks } = drawManyFrom([p], PREFS, 99, BANDS, {
      count: 1,
      deterministic: 1,
      seen: new Set(['only']),
    });
    expect(picks[0].poem.id).toBe('only');
  });
});
