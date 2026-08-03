/**
 * Turn onboarding answers into a BIAS on the feed, never a filter.
 *
 * ## Why not filter
 *
 * The obvious implementation is to pass the answers straight to
 * `GET /api/poems/by-category` and be done. That endpoint filters, so a reader
 * who picks `love-desire` would see 4,554 poems and never the other 79,775. The
 * seven families are roughly balanced, so filtering hands each reader about a
 * seventh of the library and locks the door. Every subsequent answer (mood,
 * motif, era, difficulty) narrows it further — stack all five and a reader can
 * end up pinned to a few hundred poems, seeing repeats within a session.
 *
 * That is the opposite of what onboarding is for. The answers should say "start
 * me here", not "never show me anything else".
 *
 * ## How this works
 *
 * Every fetch draws from one of three pools, chosen by a weighted coin:
 *
 *   core      — all the reader's answers applied as filters. This is the
 *               seeded feed: it looks exactly like what they asked for.
 *   adjacent  — the answers RELAXED: the strongest signal (family, or moods if
 *               no family) is kept and everything else is dropped. Poems that
 *               are recognisably in the neighbourhood without being on the nose.
 *   wild      — no filters at all. Anything in the corpus.
 *
 * So the reader's answers change the ODDS of what they see, not the set. Nothing
 * is ever unreachable: with wild in the mix, every poem in the library has a
 * non-zero chance on every single draw.
 *
 * ## Why the mix moves
 *
 * "Seeds the first feed, then becomes a weight" is a statement about time. The
 * first handful of poems should feel like a direct answer to what they said, or
 * the questions were pointless. After that the bias should loosen, or the app
 * becomes a mirror.
 *
 * So `core` starts high and decays toward a floor as the reader gets through
 * poems, with `wild` rising to meet it. The decay is over poems seen, not
 * wall-clock, so a reader who comes back tomorrow doesn't get re-seeded.
 *
 * ## Does this need a server change?
 *
 * No. The weighting composes calls the API already supports — each draw is one
 * ordinary `by-category` request with more or fewer params. The one thing that
 * DID need server work is the era step: bands are century RANGES, and
 * by-category only accepted an exact `century`. `centuryFrom` / `centuryTo` /
 * `includeUndated` / `undated` were added for that.
 *
 * A server-side weighted sample (score each poem by matches, ORDER BY score *
 * random()) would be more elegant and would let a single query blend the pools.
 * It is deliberately NOT what this does, for two reasons: the scoring weights
 * would be buried in SQL where they can't be unit-tested or tuned without a
 * deploy, and pool selection here is observable — you can log which pool every
 * poem came from and actually verify the mix in production.
 */

/** Pool identifiers. Exported so callers can log/track which pool served a poem. */
export const POOL = {
  CORE: 'core',
  ADJACENT: 'adjacent',
  WILD: 'wild',
};

/**
 * Mix at the start of a reader's life, before any decay.
 */
export const INITIAL_MIX = { core: 0.6, adjacent: 0.25, wild: 0.15 };

/**
 * THE MIX THE FEED SETTLES ON. This is the number to tune.
 *
 * `wild` is the only pool that ignores the reader's answers entirely, so its
 * share is the whole tradeoff: it is simultaneously the guarantee against
 * lock-in and the risk that the five questions feel ignored. Everything else
 * follows from it — `core` absorbs the change, `adjacent` stays put.
 *
 * What a given `wild` share actually feels like:
 *
 *   wild   on-preference   avg gap between      odds a wild appears
 *                          wild draws           in any 3 poems
 *   ----   -------------   ------------------   -------------------
 *   0.50        50%        every 2.0 poems             88%
 *   0.40        60%        every 2.5 poems             78%
 *   0.30        70%        every 3.3 poems             66%
 *   0.25        75%        every 4.0 poems             58%   <- current floor
 *   0.20        80%        every 5.0 poems             49%
 *   0.15        85%        every 6.7 poems             39%   <- current start
 *   0.10        90%        every 10 poems              27%
 *
 * (gap = 1/wild; odds in any 3 = 1 - (1-wild)^3.)
 *
 * Where the current numbers came from. An earlier draft floored wild at 0.40,
 * which meant a 78% chance that any three consecutive poems contained one
 * ignoring the reader's answers, and only an 8% chance of five on-preference
 * poems in a row (0.6^5). For a flow that asks five questions, that reads as
 * "my answers didn't matter".
 *
 * A flat 0.15 was considered and rejected: 0.15 is also the INITIAL value, so
 * the decay would be a no-op and the mix would never change from poem 1 to poem
 * 1,000 — which throws away the seed-then-broaden mechanism entirely. The floor
 * therefore sits at 0.25: the feed still visibly opens up as a reader settles
 * in (a wild poem every ~4 draws instead of every ~6.7), but nowhere near the
 * every-2.5 churn of the 0.40 draft.
 *
 * Whatever you pick, keep `wild` strictly above zero — it is what makes every
 * poem in the corpus reachable on every draw, which is the property the whole
 * weighted-not-filtered design exists to preserve. A test enforces `wild > 0`
 * and that the three values sum to 1, but deliberately does NOT pin the values
 * themselves, so retuning this line needs no test edit.
 */
export const SETTLED_MIX = { core: 0.5, adjacent: 0.25, wild: 0.25 };

/** Poems seen before the mix has fully relaxed to SETTLED_MIX. */
export const DECAY_OVER_POEMS = 30;

/**
 * The pool mix for a reader who has seen `poemsSeen` poems.
 *
 * Linear interpolation between the initial and settled mixes. Linear rather than
 * exponential on purpose: the whole point is that the reader can feel the feed
 * widen, and an exponential curve does nearly all its work in the first three
 * poems, which reads as the seeding not having happened at all.
 *
 * @param {number} poemsSeen
 * @returns {{core:number, adjacent:number, wild:number}}
 */
export const mixFor = (poemsSeen = 0) => {
  const t = Math.min(1, Math.max(0, (Number(poemsSeen) || 0) / DECAY_OVER_POEMS));
  const lerp = (a, b) => a + (b - a) * t;
  return {
    core: lerp(INITIAL_MIX.core, SETTLED_MIX.core),
    adjacent: lerp(INITIAL_MIX.adjacent, SETTLED_MIX.adjacent),
    wild: lerp(INITIAL_MIX.wild, SETTLED_MIX.wild),
  };
};

/** True when the reader has given us nothing to bias on. */
export const hasPreferences = (prefs) =>
  Boolean(
    prefs &&
    (prefs.family || prefs.era || prefs.difficulty || prefs.moods?.length || prefs.motifs?.length)
  );

/**
 * Choose a pool for one draw.
 *
 * @param {Object} prefs saved onboarding answers
 * @param {number} poemsSeen
 * @param {Function} [rng] injectable for tests
 * @returns {'core'|'adjacent'|'wild'}
 */
export const pickPool = (prefs, poemsSeen = 0, rng = Math.random) => {
  // No answers (skipped onboarding, or pre-migration where every step was
  // empty) means no bias to apply — everything is wild, which is exactly the
  // behaviour the app had before onboarding existed.
  if (!hasPreferences(prefs)) return POOL.WILD;
  const mix = mixFor(poemsSeen);
  const r = rng();
  if (r < mix.core) return POOL.CORE;
  if (r < mix.core + mix.adjacent) return POOL.ADJACENT;
  return POOL.WILD;
};

/**
 * Translate answers into `by-category` query params for a given pool.
 *
 * `eraBands` and `difficultyBands` are needed to turn a band KEY (what we store)
 * back into the numeric range the API wants. They come from
 * `fetchCategoryBands()`; when they're unavailable the era/difficulty
 * constraints are simply dropped rather than guessed.
 *
 * @param {Object} prefs
 * @param {'core'|'adjacent'|'wild'} pool
 * @param {{eraBands?: Array, difficultyBands?: Array}} [bands]
 * @returns {Object} query params — `{}` means "no constraints, anything goes"
 */
export const filtersForPool = (prefs, pool, bands = {}) => {
  if (pool === POOL.WILD || !hasPreferences(prefs)) return {};

  const filters = {};

  // Adjacent keeps only the single strongest signal. Family first because it is
  // the broadest shelf (each is ~1/7 of the corpus, so it stays roomy); moods
  // stand in when the reader skipped the family question.
  if (pool === POOL.ADJACENT) {
    if (prefs.family) return { family: prefs.family };
    if (prefs.moods?.length) return { mood: prefs.moods.join(',') };
    return {};
  }

  if (prefs.family) filters.family = prefs.family;
  if (prefs.moods?.length) filters.mood = prefs.moods.join(',');
  if (prefs.motifs?.length) filters.motif = prefs.motifs.join(',');

  const era = (bands.eraBands || []).find((b) => b.key === prefs.era);
  if (era) {
    if (era.undated) {
      // The late/modern band IS the NULL-century rows — see categoryBands.js.
      filters.undated = 1;
    } else {
      filters.centuryFrom = era.century_from;
      filters.centuryTo = era.century_to;
      // Undated poems stay eligible inside a dated band. They are ~25% of the
      // corpus and their century is missing by construction (the pipeline has no
      // single representative century for late/modern eras), not because the
      // poems are unknown. Dropping them from every dated band would quietly
      // remove a quarter of the library from four of the five era answers.
      filters.includeUndated = 1;
    }
  }

  const difficulty = (bands.difficultyBands || []).find((b) => b.key === prefs.difficulty);
  if (difficulty) {
    filters.minAccessibility = difficulty.min;
    filters.maxAccessibility = difficulty.max;
  }

  return filters;
};

/**
 * One-call helper: pick a pool and produce its filters.
 *
 * @returns {{pool: string, filters: Object}}
 */
export const nextDraw = (prefs, poemsSeen = 0, bands = {}, rng = Math.random) => {
  const pool = pickPool(prefs, poemsSeen, rng);
  return { pool, filters: filtersForPool(prefs, pool, bands) };
};

/**
 * Rank candidates so a DATED poem wins whenever one is available.
 *
 * ## The problem this solves
 *
 * A dated era band sends `includeUndated=1`, which keeps the ~25% of the corpus
 * that has no century eligible. That is right for recall — those poems are the
 * late/modern period, not missing data, and dropping them from every dated band
 * would hide a quarter of the library behind four of the five era answers.
 *
 * But treating them as EQUALLY eligible makes the era step the weakest question
 * in the flow: for that quarter of the corpus, answering "Abbasid" and answering
 * "Andalusian" produce identical results. A reader who deliberately picked a
 * period should be able to feel it.
 *
 * ## The fix
 *
 * Eligibility and ranking are separated. Undated poems stay eligible in the
 * query, then lose the tie-break here. A dated candidate is always preferred;
 * undated ones are the fallback when the band returned nothing dated, which is
 * exactly the thin-band case where recall matters.
 *
 * This is done client-side on the returned candidates rather than as an ORDER BY
 * in `by-category`, for two reasons. Ordering `p.century IS NULL ASC` before
 * `RANDOM()` inside the query would push undated poems past the LIMIT entirely
 * whenever the dated side is fat — silently re-creating the exclusion this is
 * meant to avoid, and doing it in SQL where it can't be unit-tested. Ranking a
 * page we already fetched costs no extra request and keeps the rule in one
 * readable, testable place.
 *
 * Undated poems remain reachable regardless of this ranking, through the
 * `undated` band itself (which queries only them), the adjacent pool (which
 * drops the era constraint), and the wild pool (no filters at all).
 *
 * @param {Array<{century?: number|null}>} candidates
 * @returns {Array} the dated subset, or the original list when none are dated
 */
export const preferDated = (candidates) => {
  const list = candidates || [];
  const dated = list.filter((p) => p?.century != null);
  return dated.length ? dated : list;
};
