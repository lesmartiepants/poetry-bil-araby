import { describe, it, expect } from 'vitest';

import {
  WEIGHTS,
  MAX_SCORE,
  MULTI_BASE,
  FAMILY_OVERLAP_DISCOUNT,
  UNDATED_ERA_CREDIT,
  ADJACENT_ERA_CREDIT,
  T_INITIAL,
  T_SETTLED,
  DECAY_OVER_POEMS,
  ATTRIBUTION_RATIO,
  OPEN_LIMIT,
  ANCHORED_LIMIT,
  temperatureFor,
  hasPreferences,
  facetsOf,
  scorePoem,
  softmaxWeights,
  sampleByScore,
  candidateQueries,
  drawFrom,
  drawManyFrom,
  DETERMINISTIC_OPENING,
  attributionFor,
} from '../services/preferenceWeighting.js';

const PREFS = {
  family: 'love-desire',
  moods: ['amorous', 'yearning'],
  motifs: ['night'],
  era: 'c6-8',
  difficulty: 'gentle',
};

const BANDS = {
  families: [
    {
      key: 'love-desire',
      label_ar: 'الحب والهوى',
      label_en: 'Love & Desire',
      values: [
        { dim: 'mood', key: 'amorous' },
        { dim: 'mood', key: 'passion' },
        { dim: 'mood', key: 'yearning' },
        { dim: 'topic', key: 'love' },
      ],
    },
  ],
  dimensions: [
    {
      key: 'mood',
      values: [
        { key: 'amorous', label_ar: 'غزل', label_en: 'Amorous' },
        { key: 'yearning', label_ar: 'شوق', label_en: 'Yearning' },
      ],
    },
    { key: 'motif', values: [{ key: 'night', label_ar: 'ليل', label_en: 'Night' }] },
  ],
  eraBands: [
    { key: 'c6-8', label_ar: 'الجاهلي', label_en: 'Pre-Islamic', century_from: 6, century_to: 8 },
    {
      key: 'undated',
      label_ar: 'المتأخر',
      label_en: 'Late',
      century_from: null,
      century_to: null,
      undated: true,
    },
  ],
  difficultyBands: [
    { key: 'gentle', min: 0, max: 2 },
    { key: 'demanding', min: 3.5, max: 8.5 },
  ],
};

/** A poem carrying exactly the facets named. */
const poem = ({ moods = [], motifs = [], topics = [], century, accessibility } = {}) => ({
  categories: { moods, motifs, topics },
  ...(century !== undefined ? { century } : {}),
  ...(accessibility !== undefined ? { accessibilityScore: accessibility } : {}),
});

/**
 * Everything the reader asked for, INCLUDING a non-overlapping route into the
 * family (`topic:love`), which is what lets it reach a clean 5.0 — see the
 * "a full match through overlapping values cannot reach 5" case below.
 */
const PERFECT = poem({
  moods: ['amorous', 'yearning'],
  motifs: ['night'],
  topics: ['love'],
  century: 7,
  accessibility: 1.2,
});
/** Nothing the reader asked for. */
const NOTHING = poem({ moods: ['satire'], motifs: ['wine-cup'], century: 14, accessibility: 7.5 });

const fixed = (v) => () => v;

/* -------------------------------------------------------------------------- */

describe('WEIGHTS', () => {
  it('sums to 5 so a full match reads as five out of five', () => {
    expect(MAX_SCORE).toBeCloseTo(5, 10);
  });

  it('rates family below the dimensions it is built out of', () => {
    // A family is a SET of mood/motif/topic values, so it is not an independent
    // observation. Weighting it at or above a dimension lets the two most
    // correlated answers outvote the three uncorrelated ones.
    expect(WEIGHTS.family).toBeLessThan(WEIGHTS.mood);
    expect(WEIGHTS.family).toBeLessThan(WEIGHTS.motif);
  });

  it('gives era and difficulty full weight — they are genuinely orthogonal', () => {
    // These come from poems.century / poems.accessibility_score, not from
    // poem_categories. Nothing about them is implied by the taxonomy answers.
    expect(WEIGHTS.era).toBe(1);
    expect(WEIGHTS.difficulty).toBe(1);
  });
});

describe('scorePoem', () => {
  it('scores a full match at the maximum', () => {
    const s = scorePoem(PERFECT, PREFS, BANDS);
    expect(s.ratio).toBeCloseTo(1, 6);
    expect(s.scaled).toBeCloseTo(MAX_SCORE, 4);
  });

  it('scores a poem sharing nothing at zero', () => {
    expect(scorePoem(NOTHING, PREFS, BANDS).score).toBe(0);
  });

  it('grades the middle — which is the whole point of replacing the pools', () => {
    // Under the pool system these were all worth the same: either you were in
    // `core` (5 of 5) or in `adjacent` (family only) with nothing between.
    const four = poem({
      moods: ['amorous', 'yearning'],
      motifs: ['night'],
      century: 7,
      accessibility: 6,
    });
    const three = poem({
      moods: ['amorous', 'yearning'],
      motifs: ['night'],
      century: 14,
      accessibility: 6,
    });
    const one = poem({ moods: ['passion'], century: 14, accessibility: 6 });
    const a = scorePoem(four, PREFS, BANDS).scaled;
    const b = scorePoem(three, PREFS, BANDS).scaled;
    const c = scorePoem(one, PREFS, BANDS).scaled;
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
    expect(c).toBeGreaterThan(0);
  });

  it('only counts steps the reader answered', () => {
    // A reader who skipped motif is not permanently capped below one who
    // answered it — `max` shrinks with the question set.
    const partial = { moods: ['amorous'] };
    const s = scorePoem(poem({ moods: ['amorous'] }), partial, BANDS);
    expect(s.max).toBeCloseTo(WEIGHTS.mood, 6);
    expect(s.ratio).toBeCloseTo(1, 6);
  });

  it('returns a zero ratio rather than dividing by zero on no answers', () => {
    const s = scorePoem(PERFECT, {}, BANDS);
    expect(s.max).toBe(0);
    expect(s.ratio).toBe(0);
    expect(s.scaled).toBe(0);
  });

  describe('multi-select partial credit', () => {
    it('rates two of three above one of three', () => {
      const prefs = { moods: ['amorous', 'yearning', 'joy'] };
      const two = scorePoem(poem({ moods: ['amorous', 'yearning'] }), prefs, BANDS).score;
      const one = scorePoem(poem({ moods: ['amorous'] }), prefs, BANDS).score;
      expect(two).toBeGreaterThan(one);
    });

    it('does not punish a reader for picking more moods', () => {
      // Straight matched/chosen would score one-of-three at 0.33 against
      // one-of-one at 1.00, quietly rewarding the narrowest possible answer.
      const oneOfThree = scorePoem(
        poem({ moods: ['amorous'] }),
        { moods: ['amorous', 'yearning', 'joy'] },
        BANDS
      ).ratio;
      expect(oneOfThree).toBeGreaterThanOrEqual(MULTI_BASE);
    });

    it('pays the full weight for matching every chosen mood', () => {
      const s = scorePoem(poem({ moods: ['amorous', 'yearning'] }), { moods: PREFS.moods }, BANDS);
      expect(s.score).toBeCloseTo(WEIGHTS.mood, 6);
    });
  });

  describe('family / mood overlap', () => {
    // The call the whole weighting turns on. `love-desire` CONTAINS
    // `mood:amorous`, so a poem matching both is one fact scored twice.
    it('discounts the family term when the same value already scored as a mood', () => {
      const both = scorePoem(
        poem({ moods: ['amorous'] }),
        { family: 'love-desire', moods: ['amorous'] },
        BANDS
      );
      expect(both.matched.family.overlapping).toBe(true);
      // mood at full weight + family at the discount, not two full signals.
      expect(both.score).toBeCloseTo(WEIGHTS.mood + WEIGHTS.family * FAMILY_OVERLAP_DISCOUNT, 6);
    });

    it('pays the family term in full when it is carried by a value the reader did not name', () => {
      // Poem is in the family via `topic:love`, which was never a mood answer,
      // so the family match is genuinely new information.
      const s = scorePoem(
        poem({ topics: ['love'] }),
        { family: 'love-desire', moods: ['amorous'] },
        BANDS
      );
      expect(s.matched.family.overlapping).toBe(false);
      expect(s.score).toBeCloseTo(WEIGHTS.family, 6);
    });

    it('a full match through overlapping values alone cannot reach 5', () => {
      // Worth stating plainly because it looks like a bug the first time you see
      // it. This poem satisfies every answer, but its ONLY route into
      // `love-desire` is via moods the reader also named, so the family term is
      // discounted and it tops out below the maximum. PERFECT clears 5.0 because
      // it also carries `topic:love`, a family member the reader never named.
      const viaMoodsOnly = poem({
        moods: ['amorous', 'yearning'],
        motifs: ['night'],
        century: 7,
        accessibility: 1.2,
      });
      const s = scorePoem(viaMoodsOnly, PREFS, BANDS);
      expect(s.ratio).toBeLessThan(1);
      expect(s.scaled).toBeCloseTo(MAX_SCORE - WEIGHTS.family * (1 - FAMILY_OVERLAP_DISCOUNT), 4);
      // and 5.0 is still attainable, so the top of the scale is not dead.
      expect(scorePoem(PERFECT, PREFS, BANDS).scaled).toBeCloseTo(MAX_SCORE, 4);
    });

    it('still rates the overlapping poem above one outside the family', () => {
      const inFamily = scorePoem(
        poem({ moods: ['amorous'] }),
        { family: 'love-desire', moods: ['amorous'] },
        BANDS
      ).score;
      const outside = scorePoem(
        poem({ moods: ['amorous'] }),
        { family: 'valor-defiance', moods: ['amorous'] },
        BANDS
      ).score;
      expect(inFamily).toBeGreaterThan(outside);
    });

    it('scores no family credit when the taxonomy was unavailable', () => {
      // Same posture as era/difficulty: drop the term rather than guess.
      const s = scorePoem(poem({ moods: ['amorous'] }), { family: 'love-desire' }, {});
      expect(s.score).toBe(0);
      expect(s.max).toBeCloseTo(WEIGHTS.family, 6);
    });
  });

  describe('era', () => {
    it('pays in full inside the band', () => {
      expect(scorePoem(poem({ century: 7 }), { era: 'c6-8' }, BANDS).matched.era).toBe('in-band');
    });

    it('pays partial credit one or two centuries out', () => {
      // Era is ordinal: under the pools a 9th-century poem was worth nothing at
      // all to a reader who picked 6th-8th.
      const near = scorePoem(poem({ century: 9 }), { era: 'c6-8' }, BANDS);
      expect(near.matched.era).toBe('adjacent');
      expect(near.score).toBeCloseTo(WEIGHTS.era * ADJACENT_ERA_CREDIT, 6);
    });

    it('pays nothing far outside the band', () => {
      expect(scorePoem(poem({ century: 14 }), { era: 'c6-8' }, BANDS).score).toBe(0);
    });

    it('keeps undated poems eligible under a dated band, but below dated ones', () => {
      // ~25% of the corpus is deliberately NULL-century (late/modern eras span
      // too many centuries to pin to one). Excluding them hides a quarter of the
      // library; ranking them level with a real match makes the era answer inert.
      // This is the old preferDated() tie-break, carried forward as a score term.
      const undated = scorePoem(poem({ century: null }), { era: 'c6-8' }, BANDS);
      const dated = scorePoem(poem({ century: 7 }), { era: 'c6-8' }, BANDS);
      expect(undated.score).toBeCloseTo(WEIGHTS.era * UNDATED_ERA_CREDIT, 6);
      expect(undated.score).toBeGreaterThan(0);
      expect(dated.score).toBeGreaterThan(undated.score);
    });

    it('treats a missing century field as undated', () => {
      expect(facetsOf(poem({})).century).toBe(null);
      expect(scorePoem(poem({}), { era: 'c6-8' }, BANDS).matched.era).toBe('undated-under-dated');
    });

    it('makes the undated band mean the undated rows', () => {
      expect(scorePoem(poem({ century: null }), { era: 'undated' }, BANDS).matched.era).toBe(
        'undated'
      );
      expect(scorePoem(poem({ century: 7 }), { era: 'undated' }, BANDS).score).toBe(0);
    });

    it('drops the term rather than guessing when bands are unavailable', () => {
      const s = scorePoem(poem({ century: 7 }), { era: 'c6-8' }, {});
      expect(s.max).toBe(0);
    });
  });

  describe('difficulty', () => {
    it('pays in full inside the band', () => {
      expect(
        scorePoem(poem({ accessibility: 1.2 }), { difficulty: 'gentle' }, BANDS).score
      ).toBeCloseTo(WEIGHTS.difficulty, 6);
    });

    it('falls off with distance rather than cutting at the band edge', () => {
      // The cut is a quantile of a continuous score, so a hard edge would be an
      // artefact of where the histogram happened to split.
      const just = scorePoem(poem({ accessibility: 2.3 }), { difficulty: 'gentle' }, BANDS).score;
      const mid = scorePoem(poem({ accessibility: 3.2 }), { difficulty: 'gentle' }, BANDS).score;
      // Past DIFFICULTY_FALLOFF points beyond the edge the term is spent.
      const far = scorePoem(poem({ accessibility: 3.6 }), { difficulty: 'gentle' }, BANDS).score;
      expect(just).toBeGreaterThan(mid);
      expect(mid).toBeGreaterThan(far);
      expect(far).toBe(0);
      expect(just).toBeLessThan(WEIGHTS.difficulty);
    });

    it('scores nothing when the poem has no accessibility score', () => {
      expect(scorePoem(poem({}), { difficulty: 'gentle' }, BANDS).score).toBe(0);
    });
  });

  it('survives junk input', () => {
    expect(() => scorePoem(null, null, null)).not.toThrow();
    expect(() => scorePoem(undefined, PREFS, BANDS)).not.toThrow();
    // A null poem carries no taxonomy and no century, so it scores exactly what
    // any undated poem scores under a dated band — the era allowance and nothing
    // else. Asserting 0 here would be asserting that undated poems are excluded.
    expect(scorePoem(null, PREFS, BANDS).score).toBeCloseTo(WEIGHTS.era * UNDATED_ERA_CREDIT, 6);
    expect(scorePoem({ categories: null }, { moods: ['amorous'] }, BANDS).score).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */

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

describe('temperatureFor', () => {
  it('starts sharp and settles soft', () => {
    expect(temperatureFor(0)).toBeCloseTo(T_INITIAL, 10);
    expect(temperatureFor(DECAY_OVER_POEMS)).toBeCloseTo(T_SETTLED, 10);
    expect(temperatureFor(9999)).toBeCloseTo(T_SETTLED, 10);
  });

  it('loosens monotonically', () => {
    let prev = temperatureFor(0);
    for (const seen of [5, 10, 20, 30]) {
      const t = temperatureFor(seen);
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });

  it('handles junk input', () => {
    expect(temperatureFor(undefined)).toBeCloseTo(T_INITIAL, 10);
    expect(temperatureFor(-5)).toBeCloseTo(T_INITIAL, 10);
    expect(temperatureFor(NaN)).toBeCloseTo(T_INITIAL, 10);
  });

  it('decays over poems seen, not wall-clock', () => {
    // A reader coming back tomorrow with 40 poems behind them must not be
    // re-seeded into the narrow opening feed.
    expect(temperatureFor(40)).toBeCloseTo(temperatureFor(400), 10);
    expect(temperatureFor(40)).toBeGreaterThan(temperatureFor(0));
  });
});

/* -------------------------------------------------------------------------- */

describe('sampling: nothing is unreachable', () => {
  it('gives a zero-scoring candidate a strictly positive weight at every temperature', () => {
    // Half of the anti-lock-in guarantee. exp() of a finite number is never 0,
    // so no candidate can be silently excluded however sharp the draw gets.
    const scored = [{ scaled: 5 }, { scaled: 0 }];
    for (const seen of [0, 1, 5, 30, 500]) {
      const w = softmaxWeights(scored, temperatureFor(seen));
      expect(w[1]).toBeGreaterThan(0);
    }
  });

  it('actually draws the zero-scoring candidate given enough draws', () => {
    const scored = [{ scaled: 5 }, { scaled: 0 }];
    let low = 0;
    const n = 20000;
    for (let i = 0; i < n; i += 1) {
      if (sampleByScore(scored, temperatureFor(0), fixed((i + 0.5) / n)) === 1) low += 1;
    }
    expect(low).toBeGreaterThan(0);
  });

  it('keeps an UNANCHORED candidate page, so unmatched poems can be candidates at all', () => {
    // The other half of the guarantee, and the part a positive softmax weight
    // cannot supply: a weight on a list the poem can never join is not
    // reachability. Deleting the open page would turn this back into a filter
    // however flat the temperature got.
    const qs = candidateQueries(PREFS);
    const open = qs.find((q) => q.role === 'open');
    expect(open).toBeTruthy();
    expect(open.query).toEqual({ limit: OPEN_LIMIT });
  });

  it('anchors on ONE answer, never five — the funnel is what broke the pools', () => {
    const anchored = candidateQueries(PREFS).find((q) => q.role === 'anchored');
    expect(anchored.query).toEqual({ family: 'love-desire', limit: ANCHORED_LIMIT });
    expect(anchored.query.mood).toBeUndefined();
    expect(anchored.query.centuryFrom).toBeUndefined();
  });

  it('falls back to moods as the anchor when the family step was skipped', () => {
    const qs = candidateQueries({ moods: ['amorous', 'yearning'] });
    expect(qs.find((q) => q.role === 'anchored').query.mood).toBe('amorous,yearning');
  });

  it('asks only for the open page when the reader answered nothing anchorable', () => {
    expect(candidateQueries({ difficulty: 'gentle' })).toEqual([
      { role: 'open', query: { limit: OPEN_LIMIT } },
    ]);
  });
});

describe('sampling: seed, then broaden', () => {
  /**
   * The representative candidate mix the temperature endpoints are calibrated
   * against — 18 anchored poems (all share the family, spread over how many
   * further answers land) plus 12 unanchored, mostly matching nothing.
   */
  const anchoredScaled = [
    5.0, 4.4, 4.2, 3.8, 3.4, 3.4, 3.0, 2.8, 2.6, 2.4, 2.2, 2.0, 1.8, 1.6, 1.4, 1.2, 1.0, 0.8,
  ];
  const openScaled = [0, 0, 0, 0, 0, 0, 0, 0.7, 1.0, 1.4, 0.35, 0];
  const MIX = [...anchoredScaled, ...openScaled].map((scaled) => ({ scaled }));

  const openMass = (temperature) => {
    const w = softmaxWeights(MIX, temperature);
    const total = w.reduce((a, b) => a + b, 0);
    return w.slice(anchoredScaled.length).reduce((a, b) => a + b, 0) / total;
  };

  it('carries the old mix constants forward: wild 0.15 -> 0.25', () => {
    // The pool system's `wild` was the unfiltered pool. Scoring keeps that pool
    // as the OPEN candidate page, so the surviving quantity is the share of the
    // draw's probability mass sitting on it. These are the owner's numbers,
    // preserved through the mechanism change. If someone retunes T_INITIAL or
    // T_SETTLED without meaning to move the openness of the feed, this fails.
    expect(openMass(temperatureFor(0))).toBeCloseTo(0.15, 2);
    expect(openMass(temperatureFor(DECAY_OVER_POEMS))).toBeCloseTo(0.25, 2);
  });

  it('opens up monotonically as the reader gets through poems', () => {
    let prev = openMass(temperatureFor(0));
    for (const seen of [5, 10, 20, 30]) {
      const m = openMass(temperatureFor(seen));
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });

  it('still favours high scores hard at the settled temperature', () => {
    // "Broaden" must not mean "give up". A perfect match has to stay clearly
    // more likely than a poem matching nothing, forever.
    const w = softmaxWeights([{ scaled: 5 }, { scaled: 0 }], temperatureFor(9999));
    expect(w[0] / w[1]).toBeGreaterThan(3);
  });

  it('does not overflow at a sharp temperature', () => {
    // Without the max-subtraction in softmaxWeights this is Infinity and the
    // draw silently degenerates to "first candidate always wins".
    const w = softmaxWeights([{ scaled: 5 }, { scaled: 0 }], 0.01);
    expect(w.every((x) => Number.isFinite(x))).toBe(true);
  });
});

describe('sampleByScore', () => {
  it('returns -1 on an empty candidate list', () => {
    expect(sampleByScore([], 1)).toBe(-1);
    expect(sampleByScore(null, 1)).toBe(-1);
  });

  it('picks the strong candidate far more often than the weak one', () => {
    const scored = [{ scaled: 0 }, { scaled: 5 }];
    let strong = 0;
    const n = 5000;
    for (let i = 0; i < n; i += 1) {
      if (sampleByScore(scored, temperatureFor(0), fixed((i + 0.5) / n)) === 1) strong += 1;
    }
    expect(strong / n).toBeGreaterThan(0.6);
  });

  it('is uniform when every candidate ties', () => {
    const scored = [{ scaled: 2 }, { scaled: 2 }, { scaled: 2 }, { scaled: 2 }];
    const hits = [0, 0, 0, 0];
    const n = 4000;
    for (let i = 0; i < n; i += 1) hits[sampleByScore(scored, 1, fixed((i + 0.5) / n))] += 1;
    for (const h of hits) expect(h / n).toBeCloseTo(0.25, 1);
  });
});

describe('drawFrom', () => {
  it('returns the poem, its scores and the effective temperature', () => {
    const d = drawFrom([PERFECT, NOTHING], PREFS, 0, BANDS, fixed(0));
    expect(d.poem).toBe(PERFECT);
    expect(d.temperature).toBeCloseTo(T_INITIAL, 6);
    expect(d.scored).toHaveLength(2);
    expect(d.scored[0].scaled).toBeCloseTo(MAX_SCORE, 4);
  });

  it('returns a null poem rather than throwing on an empty candidate set', () => {
    const d = drawFrom([], PREFS, 0, BANDS);
    expect(d.poem).toBe(null);
    expect(d.index).toBe(-1);
  });
});

/* -------------------------------------------------------------------------- */

describe('drawManyFrom', () => {
  // A pool with an unambiguous ranking: PERFECT > MID > NOTHING, plus filler so
  // a five-slide draw has somewhere to go after the top two are taken.
  const MID = poem({ moods: ['amorous'], motifs: [], century: 7, accessibility: 1.0 });
  const withId = (p, id) => ({ ...p, id });
  const POOL = [
    withId(NOTHING, 'n1'),
    withId(MID, 'm1'),
    withId(PERFECT, 'p1'),
    withId(NOTHING, 'n2'),
    withId(MID, 'm2'),
  ];

  const OPENING = { deterministic: DETERMINISTIC_OPENING };

  it('takes the opening slides by RANK, not by sampling', () => {
    // rng pinned to 0 would make sampleByScore return the FIRST candidate every
    // time — i.e. NOTHING, which sits at index 0. The ranked slots must ignore
    // it entirely, which is the whole guarantee.
    const { picks } = drawManyFrom(POOL, PREFS, 0, BANDS, { count: 2, ...OPENING, rng: fixed(0) });
    expect(picks.map((p) => p.poem.id)).toEqual(['p1', 'm1']);
    expect(picks.every((p) => p.deterministic)).toBe(true);
    expect(picks[0].scaled).toBeCloseTo(MAX_SCORE, 4);
  });

  it('samples once past the deterministic opening', () => {
    const { picks } = drawManyFrom(POOL, PREFS, 0, BANDS, { count: 5, ...OPENING, rng: fixed(0) });
    expect(picks.slice(0, DETERMINISTIC_OPENING).every((p) => p.deterministic)).toBe(true);
    expect(picks.slice(DETERMINISTIC_OPENING).every((p) => p.deterministic)).toBe(false);
  });

  it('SAMPLES BY DEFAULT — ranking is opt-in, not a property of starting at 0', () => {
    // The regression this pins: `deterministic` used to default to
    // DETERMINISTIC_OPENING, so the ordinary carousel refill (which starts at
    // slot 1) re-ran the ranked opening mid-feed and overwrote the real one
    // moments after a redraw produced it. Only the post-onboarding redraw asks.
    const { picks } = drawManyFrom(POOL, PREFS, 0, BANDS, { count: 3 });
    expect(picks.every((p) => p.deterministic)).toBe(false);
  });

  it('a batch starting at slot 1 does not rank, even below DETERMINISTIC_OPENING', () => {
    const { picks } = drawManyFrom(POOL, PREFS, 0, BANDS, { count: 4, startSlot: 1 });
    expect(picks.map((p) => p.slot)).toEqual([1, 2, 3, 4]);
    expect(picks.every((p) => p.deterministic)).toBe(false);
  });

  it('never serves the same poem twice in one batch', () => {
    const { picks } = drawManyFrom(POOL, PREFS, 0, BANDS, { count: 5, rng: fixed(0.5) });
    const ids = picks.map((p) => p.poem.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('stops at the pool size rather than looping or padding', () => {
    const { picks } = drawManyFrom(POOL.slice(0, 2), PREFS, 0, BANDS, { count: 9 });
    expect(picks).toHaveLength(2);
  });

  it('breaks score ties deterministically, so the opening is not the API row order', () => {
    // Two identical PERFECT poems: without the id tie-break the "top" pick would
    // be whichever the API happened to return first, which is sampling wearing a
    // different hat in the two slots that exist to not be sampled.
    const tied = [withId(PERFECT, 'zzz'), withId(PERFECT, 'aaa')];
    const a = drawManyFrom(tied, PREFS, 0, BANDS, { count: 1, ...OPENING });
    const b = drawManyFrom([...tied].reverse(), PREFS, 0, BANDS, { count: 1, ...OPENING });
    expect(a.picks[0].poem.id).toBe('aaa');
    expect(b.picks[0].poem.id).toBe('aaa');
  });

  it('reports each pick its rank in the WHOLE pool, not among the leftovers', () => {
    const { picks } = drawManyFrom(POOL, PREFS, 0, BANDS, { count: 2, ...OPENING });
    expect(picks[0].rank).toBe(1);
    expect(picks[1].rank).toBe(2);
  });

  it('load-more does not re-rank, even when it asks for the opening', () => {
    // Infinite scroll would otherwise serve the two top-ranked candidates again
    // on every batch, converging the feed instead of broadening it.
    const { picks } = drawManyFrom(POOL, PREFS, 0, BANDS, {
      count: 3,
      startSlot: 5,
      ...OPENING,
      rng: fixed(0),
    });
    expect(picks.every((p) => p.deterministic)).toBe(false);
    expect(picks.map((p) => p.slot)).toEqual([5, 6, 7]);
  });

  it('keeps a zero-scoring poem reachable in the sampled tail', () => {
    // Guarantee (1) survives batching: the ranked opening takes the top two, and
    // everything after is a softmax draw where exp(finite) > 0 for every score.
    const drawn = new Set();
    for (let i = 0; i < 400; i += 1) {
      drawManyFrom(POOL, PREFS, 0, BANDS, { count: 3 }).picks.forEach((p) => drawn.add(p.poem.id));
    }
    expect(drawn.has('n1')).toBe(true);
  });

  it('returns an empty pick list rather than throwing on an empty pool', () => {
    expect(drawManyFrom([], PREFS, 0, BANDS, { count: 5 }).picks).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */

describe('attributionFor', () => {
  it('says nothing at all about a low-scoring draw', () => {
    // Deliberate. Low-scoring poems appearing is correct behaviour, and a
    // surprise that announces itself has stopped being a surprise.
    expect(attributionFor(scorePoem(NOTHING, PREFS, BANDS), BANDS, PREFS)).toBe(null);
  });

  it('credits the family on a strong match', () => {
    const a = attributionFor(scorePoem(PERFECT, PREFS, BANDS), BANDS, PREFS);
    expect(a).toMatchObject({ dim: 'family', key: 'love-desire', label_ar: 'الحب والهوى' });
  });

  it('credits a mood when there was no family answer', () => {
    const prefs = { moods: ['amorous'] };
    const a = attributionFor(scorePoem(poem({ moods: ['amorous'] }), prefs, BANDS), BANDS, prefs);
    expect(a).toMatchObject({ dim: 'mood', key: 'amorous', label_ar: 'غزل' });
  });

  it('names exactly one reason, never a list', () => {
    const a = attributionFor(scorePoem(PERFECT, PREFS, BANDS), BANDS, PREFS);
    expect(typeof a.label_ar).toBe('string');
    expect(a.label_en).toBeTruthy();
  });

  it('holds its tongue just below the threshold', () => {
    expect(
      attributionFor(
        { ratio: ATTRIBUTION_RATIO - 0.01, matched: { family: { via: ['amorous'] } } },
        BANDS
      )
    ).toBe(null);
  });

  it('survives a missing taxonomy', () => {
    expect(attributionFor(scorePoem(PERFECT, PREFS, BANDS), {}, PREFS)).toBe(null);
    expect(attributionFor(null, BANDS, PREFS)).toBe(null);
  });
});
