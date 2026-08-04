/**
 * Turn the five onboarding answers into a SCORE per poem, and sample the feed by
 * that score. The answers are a bias, never a filter.
 *
 * ## Why not filters
 *
 * Passing the answers straight through to `/api/poems/by-category` ANDs five
 * predicates against a corpus that only has ~4,767 servable poems. The funnel
 * collapses:
 *
 *     served                       4,767
 *     x family      love-desire   ~2,400
 *     x mood        amorous       ~  740
 *     x motif       night         ~  110
 *     x era         c9            ~   43
 *     x difficulty  gentle        ~   14
 *
 * Fourteen poems is not a feed, and that is the GENEROUS path — a rarer mood
 * bottoms out at zero. A reader who answers honestly gets punished for it.
 *
 * ## Why not three pools
 *
 * The previous design drew from `core` (all five answers as filters), `adjacent`
 * (family only) and `wild` (nothing), mixed 0.60/0.25/0.15 and decayed toward
 * 0.50/0.25/0.25 over 30 poems. It replaced the funnel problem with a cliff:
 * a poem either matched 5 of 5, or 1 of 5, or 0 of 5, with nothing in between.
 * The 4-of-5 poem — the reader's family, mood, motif and era but the wrong
 * difficulty — was worth exactly as much as a poem sharing nothing but family.
 *
 * Scoring fills the gap in. Every poem gets graded on how much of the answer set
 * it actually satisfies, and the draw is sampled from that grade. The old mix
 * constants map onto the temperature below; see TEMPERATURE.
 *
 * ## The two guarantees this file has to keep
 *
 * 1. NOTHING IS UNREACHABLE. Every poem in the corpus keeps a non-zero
 *    probability on every draw. Two independent things enforce it: the softmax
 *    weight `exp(scaled / T)` is strictly positive at every finite score, and
 *    the candidate set is built with an UNANCHORED page alongside the anchored
 *    one (see `candidateQueries`) so a poem matching nothing can still be drawn
 *    as a candidate in the first place. Either alone is insufficient — a
 *    positive weight on a candidate list that can never contain the poem is not
 *    reachability.
 *
 * 2. SEED, THEN BROADEN. The first feed leans hard on the answers; a reader
 *    30 poems in gets a visibly looser feed. Decay is over POEMS SEEN, not
 *    wall-clock, so coming back tomorrow does not re-seed the reader into the
 *    same narrow opening.
 */

/* -------------------------------------------------------------------------- */
/* Weights                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Per-step weight. Sums to 5.0 so a fully-answered, fully-matched poem scores a
 * round 5 and the number reads as "out of five".
 *
 * These are NOT equal, on purpose:
 *
 * - `family` is worth LESS than a dimension answer because it is not an
 *   independent signal. A family is defined as a set of member values across
 *   dimensions — `love-desire` literally contains `mood:amorous`,
 *   `mood:passion`, `mood:yearning`. A poem that matches the reader's family
 *   *because* it carries a mood the reader also picked is one observation, and
 *   scoring it twice would let the two most correlated answers outvote the three
 *   independent ones. Hence 0.8, and hence FAMILY_OVERLAP_DISCOUNT below, which
 *   handles the case where the double-count is actually happening.
 *
 * - `mood` is worth MORE than motif because it is the question the whole flow is
 *   really asking ("how are you feeling?"), it is the densest dimension in the
 *   corpus, and taxonomy v3 makes motif optional (min_labels 0) — a poem may
 *   legitimately carry no motif at all, so scoring motif as high as mood would
 *   penalise poems for a label the pipeline never promised to assign.
 *
 * - `era` and `difficulty` are genuinely orthogonal to the taxonomy: they come
 *   from `poems.century` and `poems.accessibility_score`, not from
 *   `poem_categories`. Nothing about them is implied by family/mood/motif, so
 *   they carry full weight.
 */
export const WEIGHTS = Object.freeze({
  family: 0.8,
  mood: 1.2,
  motif: 1.0,
  era: 1.0,
  difficulty: 1.0,
});

/** Sum of WEIGHTS — the score a poem gets for matching every answered step. */
export const MAX_SCORE = Object.values(WEIGHTS).reduce((n, w) => n + w, 0);

/**
 * What the family term is worth when the family match is EXPLAINED by a value
 * the reader also selected on the mood or motif step.
 *
 * Concretely: reader picks family `love-desire` and mood `amorous`. A poem
 * carrying `amorous` matches both, but there is only one fact here — the poem is
 * amorous. The mood term already scored it. The family term is then mostly
 * restating, so it keeps a quarter of its weight rather than none: a poem
 * matching the family through the reader's own mood is still a slightly better
 * fit than one matching that mood while sitting outside the family entirely
 * (possible — a value can be shared, and the family match is a cross-dimension
 * OR over all member values, not just the mood ones).
 */
export const FAMILY_OVERLAP_DISCOUNT = 0.25;

/**
 * Multi-select credit floor. Matching ANY of the reader's chosen moods earns
 * this share of the mood weight; matching ALL of them earns the full weight.
 *
 *     credit = MULTI_BASE + (1 - MULTI_BASE) * (matched / chosen)
 *
 * Straight `matched / chosen` was the obvious alternative and is wrong: it
 * punishes readers for being expressive. Picking three moods and matching one
 * would score 0.33 where picking one mood and matching it scores 1.00, so the
 * flow would quietly reward answering as narrowly as possible. With a 0.7 floor,
 * two-of-three (0.90) still beats one-of-three (0.80) — which is what the
 * gradation is for — without making the third pick a liability.
 */
export const MULTI_BASE = 0.7;

/**
 * Era partial credit for an UNDATED poem sitting under a DATED band.
 *
 * ~25% of the corpus has `century = NULL`. That is not missing data: the late
 * and modern eras span too many centuries to pin to one, so the pipeline leaves
 * them null deliberately, and they get their own band in the picker. They are
 * therefore eligible under a dated band (`includeUndated=1`) but should not
 * outrank a poem actually FROM the century the reader asked for — which is the
 * same intent the old `preferDated()` tie-break encoded, carried forward as a
 * score term instead of a filter step.
 */
export const UNDATED_ERA_CREDIT = 0.35;

/**
 * Era partial credit for a poem within ADJACENT_CENTURIES of the chosen band.
 *
 * Era is ordinal, so "one century off" is a near miss rather than a miss. This
 * is a large part of what smooths the old cliff: under the pool system a 9th
 * century poem was worth nothing at all to a reader who picked the 6th-8th band.
 */
export const ADJACENT_ERA_CREDIT = 0.5;
export const ADJACENT_CENTURIES = 2;

/**
 * Difficulty falls off linearly outside the chosen band, reaching zero
 * DIFFICULTY_FALLOFF accessibility points past the edge, and capped at
 * DIFFICULTY_NEAR_CREDIT so an out-of-band poem never ties an in-band one.
 *
 * Accessibility is a continuous 0-10 score (HIGHER IS HARDER — the column name
 * reads the other way and this is an easy mistake), so unlike the categorical
 * dimensions it has a real distance metric and a hard band edge would be an
 * artefact of where the quantile cut happened to land.
 */
export const DIFFICULTY_NEAR_CREDIT = 0.5;
export const DIFFICULTY_FALLOFF = 1.5;

/* -------------------------------------------------------------------------- */
/* Temperature                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Softmax temperature, decaying over poems seen.
 *
 * `T` low  -> sharp: high-scoring poems take almost all the probability mass.
 * `T` high -> flat:  the draw approaches uniform over the candidates.
 *
 * ## Mapping from the old mix constants
 *
 * The pool system expressed seed-then-broaden as `wild 0.15 -> 0.25 over 30
 * poems`. `wild` was the unfiltered pool: the share of draws taken from the
 * whole corpus with the answers ignored.
 *
 * Scoring keeps that pool — it is the OPEN page in `candidateQueries`, the one
 * with no filters — but instead of choosing the pool up front and then drawing
 * uniformly inside it, both pages are scored together and drawn from once. So
 * the surviving quantity is the share of the draw's probability mass sitting on
 * the open page, and T_INITIAL / T_SETTLED are calibrated to move that share
 * 0.15 -> 0.25, exactly the owner's numbers, on a representative candidate mix:
 *
 *     T = 2.0   open-page mass 15.2%     (was INITIAL_MIX.wild = 0.15)
 *     T = 3.6   open-page mass ~24.9%    (was SETTLED_MIX.wild = 0.25)
 *
 * Two differences from the pools are worth being explicit about, because they
 * are the point of the change rather than side effects:
 *
 *   - the mass is no longer spread UNIFORMLY inside the open page. A poem there
 *     that happens to match a mood outscores one matching nothing, so "wild"
 *     stopped meaning "random" and started meaning "unanchored".
 *   - the anchored page's 75-85% is no longer split 60/25 between all-five and
 *     family-only. It is graded continuously, which is the cliff this replaces.
 *
 * The calibration is asserted rather than merely described: the "old mix
 * constants, carried forward" block in src/test/preferenceWeighting.test.js
 * rebuilds the same mix and fails if either endpoint drifts.
 *
 * DECAY_OVER_POEMS is kept at 30 from the pool system — the horizon over which
 * the feed loosens was tuned separately from the mix and did not change.
 */
export const T_INITIAL = 2.0;
export const T_SETTLED = 3.6;
export const DECAY_OVER_POEMS = 30;

/**
 * Temperature for a reader `poemsSeen` poems in. Linear ramp, clamped.
 *
 * @param {number} poemsSeen
 * @returns {number}
 */
export const temperatureFor = (poemsSeen) => {
  const seen = Number.isFinite(poemsSeen) && poemsSeen > 0 ? poemsSeen : 0;
  const t = Math.min(1, seen / DECAY_OVER_POEMS);
  return T_INITIAL + (T_SETTLED - T_INITIAL) * t;
};

/* -------------------------------------------------------------------------- */
/* Answers                                                                     */
/* -------------------------------------------------------------------------- */

/** True when the reader answered at least one step. */
export const hasPreferences = (prefs) =>
  !!(
    prefs &&
    (prefs.family || prefs.era || prefs.difficulty || prefs.moods?.length || prefs.motifs?.length)
  );

const asArray = (v) => (Array.isArray(v) ? v.filter(Boolean) : v ? [v] : []);

/** Resolve a stored era band KEY against the live bands. */
const eraBandFor = (prefs, bands) =>
  prefs?.era ? (bands?.eraBands || []).find((b) => b.key === prefs.era) || null : null;

/** Resolve a stored difficulty band KEY against the live bands. */
const difficultyBandFor = (prefs, bands) =>
  prefs?.difficulty
    ? (bands?.difficultyBands || []).find((b) => b.key === prefs.difficulty) || null
    : null;

/**
 * The member value keys of the reader's chosen family, as `dim:key` pairs.
 * Needed to detect the family/mood double-count — see FAMILY_OVERLAP_DISCOUNT.
 */
const familyValuesFor = (prefs, bands) => {
  if (!prefs?.family) return [];
  const fam = (bands?.families || []).find((f) => f.key === prefs.family);
  return fam?.values || [];
};

/**
 * The reader's answers as `/api/categories` (and `by-category`) filter params.
 *
 * Used ONLY for counting — "how many poems match what you have chosen" — never
 * to fetch the feed. That distinction is the whole design: this is the exact
 * five-way AND that collapses to fourteen poems, which is precisely why the feed
 * scores instead. The number is worth showing; drawing from it is not.
 *
 * `answeredUpTo` limits the scope to the steps BEFORE the one being rendered, so
 * a step's own answer never scopes its own counts.
 *
 * @param {Object} prefs
 * @param {Object} bands
 * @param {string[]} [only] restrict to these answer keys, in flow order
 * @returns {Object} query params, `{}` when nothing is answered
 */
export const scopeFiltersFor = (prefs, bands = {}, only = null) => {
  const want = (k) => !only || only.includes(k);
  const filters = {};
  if (want('family') && prefs?.family) filters.family = prefs.family;
  if (want('moods') && asArray(prefs?.moods).length) filters.mood = asArray(prefs.moods).join(',');
  if (want('motifs') && asArray(prefs?.motifs).length)
    filters.motif = asArray(prefs.motifs).join(',');

  if (want('era')) {
    const band = eraBandFor(prefs, bands);
    if (band) {
      if (band.undated) {
        filters.undated = 1;
      } else if (Number.isFinite(band.century_from)) {
        filters.centuryFrom = band.century_from;
        filters.centuryTo = band.century_to;
        // Undated poems are ~25% of the corpus and stay ELIGIBLE under a dated
        // band, so the count has to include them or it contradicts the feed.
        filters.includeUndated = 1;
      }
    }
  }

  if (want('difficulty')) {
    const band = difficultyBandFor(prefs, bands);
    if (band) {
      filters.minAccessibility = band.min;
      filters.maxAccessibility = band.max;
    }
  }
  return filters;
};

/** The answer keys, in the order the flow asks for them. */
export const STEP_KEYS = ['family', 'moods', 'motifs', 'era', 'difficulty'];

/* -------------------------------------------------------------------------- */
/* Poem facets                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Pull the scoreable facets off an API poem into one flat shape.
 *
 * `/api/poems/by-category` returns the taxonomy assignments as a `categories`
 * JSONB blob (`{ moods, motifs, topics, ... }`), century only when non-null, and
 * accessibility as a top-level number. Normalising once here keeps `scorePoem`
 * free of response-shape trivia and makes it trivially unit-testable against
 * plain objects.
 *
 * @param {Object} poem
 * @returns {{moods:string[], motifs:string[], topics:string[], century:number|null, accessibility:number|null}}
 */
export const facetsOf = (poem) => ({
  moods: asArray(poem?.categories?.moods),
  motifs: asArray(poem?.categories?.motifs),
  topics: asArray(poem?.categories?.topics),
  century: Number.isFinite(poem?.century) ? poem.century : null,
  accessibility: Number.isFinite(poem?.accessibilityScore) ? poem.accessibilityScore : null,
});

/* -------------------------------------------------------------------------- */
/* The score                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Score one poem against the reader's answers.
 *
 * PURE. No network, no randomness, no clock. Everything it needs about the
 * corpus (era bands, difficulty bands, family membership) is passed in via
 * `bands`, so the whole thing is exercisable from a unit test with literals —
 * which is the reason this is not an `ORDER BY score * random()` in SQL, where
 * tuning a weight would mean a deploy and verifying one would mean a database.
 *
 * Only ANSWERED steps count toward `max`, so a reader who skipped the motif step
 * is not permanently capped below one who answered it. `ratio` is the honest
 * comparable number and everything downstream (sampling, the product surface)
 * uses it rather than the raw points.
 *
 * @param {Object} poem   an API poem (or a plain object with the same facets)
 * @param {Object} prefs  saved onboarding answers
 * @param {Object} bands  { families, eraBands, difficultyBands } from fetchCategoryBands
 * @returns {{score:number, max:number, ratio:number, scaled:number, matched:Object}}
 */
export const scorePoem = (poem, prefs, bands = {}) => {
  const f = facetsOf(poem);
  const moods = asArray(prefs?.moods);
  const motifs = asArray(prefs?.motifs);
  const eraBand = eraBandFor(prefs, bands);
  const diffBand = difficultyBandFor(prefs, bands);

  let score = 0;
  let max = 0;
  const matched = {};

  /* -- mood: multi-select, partial credit ---------------------------------- */
  if (moods.length) {
    max += WEIGHTS.mood;
    const hits = moods.filter((m) => f.moods.includes(m));
    if (hits.length) {
      const credit = MULTI_BASE + (1 - MULTI_BASE) * (hits.length / moods.length);
      score += WEIGHTS.mood * credit;
      matched.mood = hits;
    }
  }

  /* -- motif: multi-select, partial credit --------------------------------- */
  if (motifs.length) {
    max += WEIGHTS.motif;
    const hits = motifs.filter((m) => f.motifs.includes(m));
    if (hits.length) {
      const credit = MULTI_BASE + (1 - MULTI_BASE) * (hits.length / motifs.length);
      score += WEIGHTS.motif * credit;
      matched.motif = hits;
    }
  }

  /* -- family: cross-dimension OR, discounted when it restates a mood/motif - */
  if (prefs?.family) {
    max += WEIGHTS.family;
    const members = familyValuesFor(prefs, bands);
    // A family matches if the poem carries ANY of its member values, in any
    // dimension. Falls back to "no credit" rather than guessing when the
    // taxonomy wasn't loaded — the same posture the era/difficulty terms take.
    const carried = members.filter((v) => {
      const bucket =
        v.dim === 'mood'
          ? f.moods
          : v.dim === 'motif'
            ? f.motifs
            : v.dim === 'topic'
              ? f.topics
              : [];
      return bucket.includes(v.key);
    });
    if (carried.length) {
      // Is the family match already paid for by an answer on another step?
      //
      // EVERY, not SOME: the discount is for a family term that adds nothing.
      // A poem in `love-desire` via both `mood:amorous` (which the reader named)
      // and `topic:love` (which they did not) is telling us something the mood
      // answer did not, so it keeps the full weight. Only a poem whose sole
      // route into the family is a value the reader already named is genuinely
      // being counted twice.
      const alsoChosen = carried.every(
        (v) =>
          (v.dim === 'mood' && moods.includes(v.key)) ||
          (v.dim === 'motif' && motifs.includes(v.key))
      );
      score += WEIGHTS.family * (alsoChosen ? FAMILY_OVERLAP_DISCOUNT : 1);
      matched.family = { via: carried.map((v) => v.key), overlapping: alsoChosen };
    }
  }

  /* -- era: ordinal, with adjacency and an undated allowance --------------- */
  if (eraBand) {
    max += WEIGHTS.era;
    if (eraBand.undated) {
      // The late/modern band IS the undated rows. A dated poem is simply not it.
      if (f.century == null) {
        score += WEIGHTS.era;
        matched.era = 'undated';
      }
    } else if (f.century == null) {
      score += WEIGHTS.era * UNDATED_ERA_CREDIT;
      matched.era = 'undated-under-dated';
    } else {
      const from = eraBand.century_from;
      const to = eraBand.century_to;
      if (Number.isFinite(from) && Number.isFinite(to)) {
        if (f.century >= from && f.century <= to) {
          score += WEIGHTS.era;
          matched.era = 'in-band';
        } else {
          const gap = f.century < from ? from - f.century : f.century - to;
          if (gap <= ADJACENT_CENTURIES) {
            score += WEIGHTS.era * ADJACENT_ERA_CREDIT;
            matched.era = 'adjacent';
          }
        }
      }
    }
  }

  /* -- difficulty: continuous, linear falloff outside the band ------------- */
  if (diffBand) {
    max += WEIGHTS.difficulty;
    const a = f.accessibility;
    if (a != null && Number.isFinite(diffBand.min) && Number.isFinite(diffBand.max)) {
      if (a >= diffBand.min && a <= diffBand.max) {
        score += WEIGHTS.difficulty;
        matched.difficulty = 'in-band';
      } else {
        const gap = a < diffBand.min ? diffBand.min - a : a - diffBand.max;
        const near = Math.max(0, 1 - gap / DIFFICULTY_FALLOFF) * DIFFICULTY_NEAR_CREDIT;
        if (near > 0) {
          score += WEIGHTS.difficulty * near;
          matched.difficulty = 'near';
        }
      }
    }
  }

  const ratio = max > 0 ? score / max : 0;
  return {
    score: Number(score.toFixed(4)),
    max: Number(max.toFixed(4)),
    ratio: Number(ratio.toFixed(4)),
    // Rescaled onto the fixed 0-MAX_SCORE display axis so the temperature means
    // the same thing whether the reader answered two steps or five.
    scaled: Number((ratio * MAX_SCORE).toFixed(4)),
    matched,
  };
};

/* -------------------------------------------------------------------------- */
/* Sampling                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Softmax weights over scored candidates at a given temperature.
 *
 * Subtracts the max score before exponentiating (standard numerical-stability
 * trick, and it makes the weights scale-free) — without it a low temperature
 * overflows to Infinity and the draw silently becomes "first candidate wins".
 *
 * @param {Array<{scaled:number}>} scored
 * @param {number} temperature
 * @returns {number[]} strictly positive weights, same order
 */
export const softmaxWeights = (scored, temperature) => {
  const t = Number.isFinite(temperature) && temperature > 0 ? temperature : T_SETTLED;
  const top = scored.reduce((m, s) => Math.max(m, s?.scaled || 0), 0);
  return scored.map((s) => Math.exp(((s?.scaled || 0) - top) / t));
};

/**
 * Pick one index from `scored`, proportional to its softmax weight.
 *
 * Every weight is `exp(finite)` and therefore strictly positive, so NO candidate
 * — including one scoring a flat zero — can be excluded from the draw. That is
 * half of guarantee (1); the other half is that a zero-scoring poem can get into
 * `scored` at all, which `candidateQueries` handles.
 *
 * @param {Array<{scaled:number}>} scored
 * @param {number} temperature
 * @param {Function} [rng]
 * @returns {number} index, or -1 when there is nothing to pick
 */
export const sampleByScore = (scored, temperature, rng = Math.random) => {
  if (!scored?.length) return -1;
  const weights = softmaxWeights(scored, temperature);
  const total = weights.reduce((n, w) => n + w, 0);
  if (!(total > 0)) return Math.floor(rng() * scored.length);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
};

/* -------------------------------------------------------------------------- */
/* Candidate queries                                                           */
/* -------------------------------------------------------------------------- */

/** How many poems each candidate page asks for. */
export const ANCHORED_LIMIT = 18;
export const OPEN_LIMIT = 12;

/**
 * The two `by-category` queries whose union forms the candidate set.
 *
 * ANCHORED — the reader's single broadest answer (family; moods if the family
 * step was skipped) applied as a filter. Without it a purely random page of the
 * corpus would almost never contain a high-scoring poem: `motif:night` is ~110
 * of 4,767 servable poems, so a random 30 would carry roughly half of one. The
 * anchor is what makes the answers actually reachable at speed. Note it is ONE
 * predicate, never five, so it cannot collapse the way the old `core` pool did.
 *
 * OPEN — no filters whatsoever. This is guarantee (1): it is the reason a poem
 * matching nothing the reader said can still be drawn. Deleting this and keeping
 * only the anchored page would turn the whole design back into a filter no
 * matter how flat the temperature got.
 *
 * @param {Object} prefs
 * @returns {Array<{role:string, query:Object}>}
 */
export const candidateQueries = (prefs) => {
  const anchor = {};
  if (prefs?.family) anchor.family = prefs.family;
  else if (asArray(prefs?.moods).length) anchor.mood = asArray(prefs.moods).join(',');

  const queries = [{ role: 'open', query: { limit: OPEN_LIMIT } }];
  if (Object.keys(anchor).length) {
    queries.unshift({ role: 'anchored', query: { ...anchor, limit: ANCHORED_LIMIT } });
  }
  return queries;
};

/**
 * Score a candidate list and draw one from it.
 *
 * @param {Array} candidates poems from the API
 * @param {Object} prefs
 * @param {number} poemsSeen
 * @param {Object} bands
 * @param {Function} [rng]
 * @returns {{poem:Object|null, scored:Array, temperature:number, index:number}}
 */
export const drawFrom = (candidates, prefs, poemsSeen, bands = {}, rng = Math.random) => {
  const list = candidates || [];
  const temperature = temperatureFor(poemsSeen);
  const scored = list.map((p) => ({ poem: p, ...scorePoem(p, prefs, bands) }));
  const index = sampleByScore(scored, temperature, rng);
  return {
    poem: index >= 0 ? list[index] : null,
    scored,
    temperature,
    index,
  };
};

/* -------------------------------------------------------------------------- */
/* Presentation                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Ratio at or above which the reader is told the poem was chosen for them.
 *
 * Deliberately high. The product line is a small reward for a strong match; a
 * low-scoring poem gets NOTHING, because the whole point of keeping the corpus
 * reachable is the occasional unexpected poem, and a surprise that announces
 * itself has stopped being one.
 */
export const ATTRIBUTION_RATIO = 0.75;

/**
 * The single answer to credit a high-scoring draw to, or null when the draw
 * doesn't clear ATTRIBUTION_RATIO.
 *
 * Credits ONE thing, not a list: "chosen for الحب والهوى" is a note, and the
 * five-part explanation of why a poem scored 4.2 is a debug panel.
 *
 * Order is by how legible the reason is to a reader, not by weight — being told
 * a poem was picked for a mood you named lands better than being told it was
 * picked for a century band. Family outranks the rest because it is the one
 * answer the reader gave as a single deliberate choice.
 *
 * @param {{ratio:number, matched:Object}} scoreResult
 * @param {Object} bands
 * @param {Object} [prefs] needed only to name the era band that was matched
 * @returns {{key:string, dim:string, label_ar:string, label_en:string}|null}
 */
export const attributionFor = (scoreResult, bands = {}, prefs = {}) => {
  if (!scoreResult || scoreResult.ratio < ATTRIBUTION_RATIO) return null;
  const m = scoreResult.matched || {};

  if (m.family) {
    const fam = (bands.families || []).find((f) =>
      m.family.via.some((k) => (f.values || []).some((v) => v.key === k))
    );
    if (fam) return { key: fam.key, dim: 'family', label_ar: fam.label_ar, label_en: fam.label_en };
  }
  for (const dim of ['mood', 'motif']) {
    const hits = m[dim];
    if (!hits?.length) continue;
    const d = (bands.dimensions || []).find((x) => x.key === dim);
    const v = (d?.values || []).find((x) => x.key === hits[0]);
    if (v) return { key: v.key, dim, label_ar: v.label_ar, label_en: v.label_en };
  }
  if (m.era === 'in-band' || m.era === 'undated') {
    const b = (bands.eraBands || []).find((x) => x.key === prefs?.era);
    if (b) return { key: b.key, dim: 'era', label_ar: b.label_ar, label_en: b.label_en };
  }
  return null;
};
