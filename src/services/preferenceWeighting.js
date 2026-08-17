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
    // era and difficulty are arrays since they became multi-select, and an
    // EMPTY array is truthy — testing them bare would report "has preferences"
    // for a reader who skipped every step, which turns the whole feed scored.
    (prefs.family ||
      asArray(prefs.era).length ||
      asArray(prefs.difficulty).length ||
      prefs.moods?.length ||
      prefs.motifs?.length)
  );

const asArray = (v) => (Array.isArray(v) ? v.filter(Boolean) : v ? [v] : []);

/**
 * Resolve stored era band KEYS against the live bands.
 *
 * Era and difficulty became multi-select, so both are stored as arrays. A v2
 * payload written before that holds a bare string, and `asArray` reads it as a
 * one-element list — old answers keep scoring exactly as they did.
 */
const eraBandsFor = (prefs, bands) =>
  asArray(prefs?.era)
    .map((k) => (bands?.eraBands || []).find((b) => b.key === k))
    .filter(Boolean);

/** Resolve stored difficulty band KEYS against the live bands. */
const difficultyBandsFor = (prefs, bands) =>
  asArray(prefs?.difficulty)
    .map((k) => (bands?.difficultyBands || []).find((b) => b.key === k))
    .filter(Boolean);

/** First chosen band. For display surfaces that name a single band. */
const eraBandFor = (prefs, bands) => eraBandsFor(prefs, bands)[0] || null;
const difficultyBandFor = (prefs, bands) => difficultyBandsFor(prefs, bands)[0] || null;

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
    // Multi-select: the scope is the UNION of the chosen bands. It is a
    // superset when the picks are not adjacent (6-8 plus 15-today also spans
    // 9-14), which is acceptable here and only here — this builds a counting
    // and anchoring query, and the scorer below judges each band separately.
    const chosenEra = eraBandsFor(prefs, bands);
    const dated = chosenEra.filter((b) => Number.isFinite(b.century_from));
    if (chosenEra.length && !dated.length) {
      filters.undated = 1;
    } else if (dated.length) {
      const band = {
        century_from: Math.min(...dated.map((b) => b.century_from)),
        century_to: Math.max(...dated.map((b) => b.century_to)),
      };
      {
        filters.centuryFrom = band.century_from;
        filters.centuryTo = band.century_to;
        // Undated poems are ~25% of the corpus and stay ELIGIBLE under a dated
        // band, so the count has to include them or it contradicts the feed.
        filters.includeUndated = 1;
      }
    }
  }

  if (want('difficulty')) {
    const chosenDiff = difficultyBandsFor(prefs, bands).filter(
      (b) => Number.isFinite(b.min) && Number.isFinite(b.max)
    );
    if (chosenDiff.length) {
      filters.minAccessibility = Math.min(...chosenDiff.map((b) => b.min));
      filters.maxAccessibility = Math.max(...chosenDiff.map((b) => b.max));
    }
  }
  return filters;
};

/** The answer keys, in the order the flow asks for them. */
export const STEP_KEYS = ['family', 'moods', 'motifs', 'era', 'difficulty'];

/**
 * The same order, keyed the way a SCORE TERM is keyed. The two lists differ
 * only in that the multi-select steps are plural as answers (`moods`) and
 * singular as dimensions (`mood`), which is also how the taxonomy names them.
 */
export const TERM_ORDER = ['family', 'mood', 'motif', 'era', 'difficulty'];

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
/**
 * Has this poem been through the classifier at all?
 *
 * Only the TAXONOMY counts. Century comes from the poet's era and accessibility
 * from a separate scorer, so a poem can carry both while never having been
 * classified — treating those as evidence would report an unclassified poem as
 * classified with everything missing.
 */
export const isCategorized = (poem) => {
  const f = facetsOf(poem);
  return f.moods.length > 0 || f.motifs.length > 0 || f.topics.length > 0;
};

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
 * `terms` is the SCORE DECOMPOSITION, one entry per answered step, in flow
 * order. It exists because the inspector was reverse-engineering the arithmetic
 * from `matched` and the weight table, which is the kind of duplicate that
 * silently stops agreeing with the scorer the first time a rule moves. The
 * scorer emits what it actually credited; the panel only renders it.
 *
 * @param {Object} poem   an API poem (or a plain object with the same facets)
 * @param {Object} prefs  saved onboarding answers
 * @param {Object} bands  { families, eraBands, difficultyBands } from fetchCategoryBands
 * @returns {{score:number, max:number, ratio:number, scaled:number, matched:Object, terms:Array}}
 */
export const scorePoem = (poem, prefs, bands = {}) => {
  const f = facetsOf(poem);
  const moods = asArray(prefs?.moods);
  const motifs = asArray(prefs?.motifs);
  const eraBands = eraBandsFor(prefs, bands);
  const diffBands = difficultyBandsFor(prefs, bands);

  let score = 0;
  let max = 0;
  const matched = {};
  const terms = [];
  /**
   * `state` is what the panel colours by, and it is deliberately four-valued:
   * `full` and `none` are the ends, `partial` covers every graded credit
   * (some-of-many moods, an adjacent century, a near-miss difficulty), and
   * `discounted` is reserved for the family overlap — a term that scored, but
   * scored less for a reason that is not "the poem is a worse match".
   */
  const term = (key, weight, earned, state, detail) =>
    terms.push({
      key,
      weight,
      earned: Number(earned.toFixed(4)),
      state,
      detail,
    });

  /* -- mood: multi-select, partial credit ---------------------------------- */
  if (moods.length) {
    max += WEIGHTS.mood;
    const hits = moods.filter((m) => f.moods.includes(m));
    if (hits.length) {
      const credit = MULTI_BASE + (1 - MULTI_BASE) * (hits.length / moods.length);
      score += WEIGHTS.mood * credit;
      matched.mood = hits;
      term(
        'mood',
        WEIGHTS.mood,
        WEIGHTS.mood * credit,
        hits.length === moods.length ? 'full' : 'partial',
        `${hits.length} of ${moods.length}`
      );
    } else {
      term('mood', WEIGHTS.mood, 0, 'none', `0 of ${moods.length}`);
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
      term(
        'motif',
        WEIGHTS.motif,
        WEIGHTS.motif * credit,
        hits.length === motifs.length ? 'full' : 'partial',
        `${hits.length} of ${motifs.length}`
      );
    } else {
      term('motif', WEIGHTS.motif, 0, 'none', `0 of ${motifs.length}`);
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
      term(
        'family',
        WEIGHTS.family,
        WEIGHTS.family * (alsoChosen ? FAMILY_OVERLAP_DISCOUNT : 1),
        alsoChosen ? 'discounted' : 'full',
        alsoChosen ? 'via an answer you already gave' : `via ${carried.map((v) => v.key).join('+')}`
      );
    } else {
      term('family', WEIGHTS.family, 0, 'none', 'no member value on this poem');
    }
  }

  /* -- era: ordinal, with adjacency and an undated allowance --------------- */
  // Multi-select: each chosen band is judged on its own and the BEST credit
  // wins. Merging the picks into one span instead would credit the gap between
  // two non-adjacent bands as if the reader had asked for it.
  if (eraBands.length) {
    max += WEIGHTS.era;
    const judge = (band) => {
      if (band.undated) {
        return f.century == null
          ? { credit: 1, kind: 'full', why: 'undated, as asked', matched: 'undated' }
          : { credit: 0, kind: 'none', why: `dated (c${f.century})` };
      }
      if (f.century == null) {
        // The 15th-to-today band absorbs the undated rows (see FIXED_ERA_BANDS),
        // so for that band an undated poem is exactly what was asked for. Under
        // any other band it is a partial credit: undated is ~25% of the corpus
        // and excluding it outright would starve every dated answer.
        return band.includesUndated
          ? { credit: 1, kind: 'full', why: 'undated, in band', matched: 'in-band' }
          : {
              credit: UNDATED_ERA_CREDIT,
              kind: 'partial',
              why: 'undated',
              matched: 'undated-under-dated',
            };
      }
      const from = band.century_from;
      const to = band.century_to;
      if (!Number.isFinite(from) || !Number.isFinite(to)) {
        return { credit: 0, kind: 'none', why: 'band has no century range' };
      }
      if (f.century >= from && f.century <= to) {
        return { credit: 1, kind: 'full', why: 'in band', matched: 'in-band' };
      }
      const gap = f.century < from ? from - f.century : f.century - to;
      return gap <= ADJACENT_CENTURIES
        ? {
            credit: ADJACENT_ERA_CREDIT,
            kind: 'partial',
            why: `${gap} c. outside`,
            matched: 'adjacent',
          }
        : { credit: 0, kind: 'none', why: `${gap} c. outside` };
    };

    const best = eraBands
      .map(judge)
      .reduce((a, b) => (b.credit > a.credit ? b : a), { credit: -1, kind: 'none', why: '' });
    score += WEIGHTS.era * best.credit;
    if (best.matched) matched.era = best.matched;
    term('era', WEIGHTS.era, WEIGHTS.era * best.credit, best.kind, best.why);
  }

  /* -- difficulty: continuous, linear falloff outside the band ------------- */
  // Same rule as era: best of the chosen bands, not their union.
  if (diffBands.length) {
    max += WEIGHTS.difficulty;
    const a = f.accessibility;
    if (a == null) {
      term('difficulty', WEIGHTS.difficulty, 0, 'none', 'poem has no score');
    } else {
      const judge = (band) => {
        if (!Number.isFinite(band.min) || !Number.isFinite(band.max)) {
          return { credit: 0, kind: 'none', why: 'band has no range' };
        }
        if (a >= band.min && a <= band.max) {
          return { credit: 1, kind: 'full', why: 'in band', matched: 'in-band' };
        }
        const gap = a < band.min ? band.min - a : a - band.max;
        const near = Math.max(0, 1 - gap / DIFFICULTY_FALLOFF) * DIFFICULTY_NEAR_CREDIT;
        return near > 0
          ? { credit: near, kind: 'partial', why: `${gap.toFixed(1)} outside`, matched: 'near' }
          : { credit: 0, kind: 'none', why: `${gap.toFixed(1)} outside` };
      };
      const best = diffBands
        .map(judge)
        .reduce((x, y) => (y.credit > x.credit ? y : x), { credit: -1, kind: 'none', why: '' });
      score += WEIGHTS.difficulty * best.credit;
      if (best.matched) matched.difficulty = best.matched;
      term('difficulty', WEIGHTS.difficulty, WEIGHTS.difficulty * best.credit, best.kind, best.why);
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
    // Flow order, not evaluation order — the panel lists the steps the way the
    // reader was asked them.
    terms: TERM_ORDER.map((k) => terms.find((t) => t.key === k)).filter(Boolean),
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

/**
 * How many slides at the head of a preference-driven feed are taken by RANK
 * rather than sampled.
 *
 * The reader has just answered five questions. If the very first poem is a
 * sampled draw, then whether the questions appear to have done anything is
 * decided by a coin flip at the exact moment the reader is deciding whether to
 * believe the flow. Two slides is the smallest number that reads as deliberate
 * (one could be luck) and the largest that does not meaningfully dent guarantee
 * (1) — every poem stays reachable, because temperature still governs slide 2
 * onward and the unanchored page is still in the pool that slides 0 and 1 are
 * ranked over.
 *
 * Note what this is NOT: it is not "the same two poems every session". The
 * candidate pages come back in a different random order on every call, so the
 * top of the ranking moves with the pool. What is fixed is that slides 0 and 1
 * are the BEST AVAILABLE match rather than a lucky one.
 */
export const DETERMINISTIC_OPENING = 2;

/**
 * The reader's dimensions in priority order, most protected first.
 *
 * When a poem cannot satisfy everything, the answers are given up from the
 * RIGHT of this list. Imagery is the last thing surrendered; era is the first.
 *
 * Era sits last on the evidence, not by accident: it is the coarsest facet the
 * flow asks about (four bands over the whole corpus), so it separates the least
 * and is the cheapest to concede. Family sits third but rarely does work — it is
 * a bundle of the other dimensions (`love-desire` is satisfied by the same poems
 * that carry `amorous`), so the tiers either side of it are often the same set.
 * See FAMILY_OVERLAP_DISCOUNT.
 */
export const PRIORITY_ORDER = Object.freeze(['motif', 'mood', 'family', 'difficulty', 'era']);

/**
 * A poem's position in the strict priority ladder, as a place-value address.
 *
 * Each dimension is one bit, weighted by its place in PRIORITY_ORDER, so a
 * higher-priority match outranks EVERY combination of lower ones — matching
 * imagery alone (16) beats mood + family + difficulty + era together (15). That
 * is the whole point of a priority list, and it is why this cannot be expressed
 * by adding WEIGHTS: additive weights let three small matches outvote one big
 * one, which is precisely the behaviour the ladder exists to prevent.
 *
 * A dimension counts as satisfied on ANY credit, not full credit. Full credit is
 * unreachable on a multi-select axis — a poem carries one primary mood, so
 * asking for three moods caps that term below its weight forever, and a
 * "fully matched" ladder would have an empty top rung for every reader who
 * multi-selected.
 *
 * Unanswered steps score no bit in either direction: they are absent from
 * `terms` entirely, so a reader who skipped a step is ranked on what they did
 * answer rather than penalised for the rest.
 */
export const priorityAddress = (terms) => {
  const t = terms || [];
  let address = 0;
  PRIORITY_ORDER.forEach((key, i) => {
    const bit = 1 << (PRIORITY_ORDER.length - 1 - i);
    const term = t.find((x) => x && x.key === key);
    if (term && term.earned > 0) address += bit;
  });
  return address;
};

/**
 * Rank comparator: priority ladder first, weighted score inside a rung, poem id
 * as a stable tie-break.
 *
 * The three keys do different jobs and the order matters:
 *
 *   1. ADDRESS enforces the reader's priority. Nothing below can outvote it.
 *   2. SCALED orders poems that are tied on all five answers — and it is the
 *      only place the continuous credits survive. The ladder is binary, so a
 *      poem 0.1 outside the chosen difficulty band and one 3.0 outside land in
 *      the same rung; the score is what still separates them.
 *   3. ID keeps it deterministic. A reader who answered only the family step
 *      produces a lot of exact ties, and without a stable third key the pick
 *      would fall through to the API's row order, which is randomised — i.e.
 *      sampling by another name, in the slots that exist to not be sampled.
 */
const byRank = (a, b) => {
  const addr = priorityAddress(b?.terms) - priorityAddress(a?.terms);
  if (addr !== 0) return addr;
  const d = (b?.scaled || 0) - (a?.scaled || 0);
  if (d !== 0) return d;
  const ai = String(a?.poem?.id ?? '');
  const bi = String(b?.poem?.id ?? '');
  return ai < bi ? -1 : ai > bi ? 1 : 0;
};

/**
 * Draw N poems from ONE scored candidate pool, without replacement.
 *
 * This is the batching that makes a per-slide-scored feed affordable. Scoring is
 * pure and cheap; the expensive part is the two `by-category` requests that
 * build the pool. Drawing five slides from one pool costs exactly what drawing
 * one slide cost before — two requests — instead of the ten a naive per-slide
 * loop would spend.
 *
 * The opening is RANKED and the tail is SAMPLED:
 *
 *   slot < deterministic   take the highest-scoring candidate left
 *   slot >= deterministic  softmax sample at the batch temperature
 *
 * `deterministic` DEFAULTS TO ZERO, and that default is the load-bearing part.
 * It used to default to DETERMINISTIC_OPENING, which meant any batch that
 * happened to start below slot 2 re-ran the ranked opening — including the
 * ordinary carousel refill, which starts at slot 1. So a mid-feed top-up was
 * quietly serving the single best-scoring candidate in the corpus page as though
 * it were the post-onboarding opening, and it would overwrite the real one. The
 * ranked opening belongs to ONE event: a feed drawn fresh from answers the
 * reader just gave. Every other caller passes nothing and samples.
 *
 * `startSlot` only labels the picks with their feed position (and shifts them
 * past `deterministic`); it is not, by itself, permission to rank.
 *
 * @param {Array} candidates poems from the API
 * @param {Object} prefs
 * @param {number} poemsSeen
 * @param {Object} bands
 * @param {Object} [opts]
 * @param {number} [opts.count] how many to draw
 * @param {number} [opts.startSlot] feed position of the first draw
 * @param {number} [opts.deterministic] slots below this are ranked, not sampled.
 *   Defaults to 0 (everything sampled) — only a fresh preference feed passes
 *   DETERMINISTIC_OPENING.
 * @param {Function} [opts.rng]
 * @returns {{picks:Array, scored:Array, temperature:number}}
 */
export const drawManyFrom = (
  candidates,
  prefs,
  poemsSeen,
  bands = {},
  { count = 1, startSlot = 0, deterministic = 0, rng = Math.random, seen = null } = {}
) => {
  const all = candidates || [];
  // Already-read poems are dropped BEFORE ranking, which is what makes a tier
  // exhaust rather than replay. Without it, strict ranking is actively worse
  // than sampling: the top rung is small (~15 poems for a narrow answer set) and
  // deterministic, so every session would open on the same poem.
  //
  // Dropped only when something is left. A reader who has exhausted the pool
  // gets it back rather than an empty feed — repeating a poem beats a blank
  // screen, and the alternative is a dead end the reader cannot escape without
  // clearing storage.
  const unseen = seen ? all.filter((p) => !seen.has?.(p?.id) && !seen.includes?.(p?.id)) : all;
  const list = unseen.length ? unseen : all;
  const temperature = temperatureFor(poemsSeen);
  const scored = list.map((p) => ({ poem: p, ...scorePoem(p, prefs, bands) }));

  // Rank once, up front: every pick reports the rank it held in the WHOLE pool,
  // not its rank among whatever was left when its turn came. "rank 1 of 30" has
  // to mean the same thing on slide 0 and slide 4 or the inspector is lying.
  const ranking = [...scored].sort(byRank);
  const rankOf = new Map(ranking.map((s, i) => [s, i + 1]));

  const remaining = [...scored];
  const picks = [];
  for (let i = 0; i < count && remaining.length; i += 1) {
    const slot = startSlot + i;
    const ranked = slot < deterministic;
    let idx;
    if (ranked) {
      // Highest-scoring survivor. `remaining` is not kept sorted (splice on a
      // sorted list is the same cost), so scan it.
      idx = remaining.reduce((best, s, j) => (byRank(s, remaining[best]) < 0 ? j : best), 0);
    } else {
      idx = sampleByScore(remaining, temperature, rng);
    }
    if (idx < 0) break;
    const [taken] = remaining.splice(idx, 1);
    picks.push({ ...taken, slot, rank: rankOf.get(taken) ?? null, deterministic: ranked });
  }

  return { picks, scored, temperature };
};

/* -------------------------------------------------------------------------- */
/* Presentation                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Why THIS poem, dimension by dimension.
 *
 * The inspector used to answer this in two truncated table columns — the poem's
 * facets in one, the matched keys in another — which meant the two fields that
 * carry the answer were the two that ellipsed first on a phone. This returns
 * the same information as one row per dimension, so it can be rendered at full
 * width and wrapped instead of clipped.
 *
 * ## The three states, and why the third one is the interesting one
 *
 *   matched  the poem carries a value the reader named
 *   present  the poem carries it, the reader never asked            (context)
 *   absent   the reader named it, the poem does NOT carry it        (the miss)
 *
 * `absent` is the state with no representation in the old columns at all: they
 * listed what the poem HAS and what HIT, so a reader who asked for
 * `motif:night` and got a poem with no night saw nothing about night anywhere.
 * That is precisely the case where someone opens this panel.
 *
 * `partial` is a fourth state rather than a fudge of `matched`, because era and
 * difficulty genuinely score in between (an adjacent century, an accessibility
 * score just outside the band) and calling that a match would misreport the
 * arithmetic sitting next to it.
 *
 * Rows are returned for EVERY dimension including ones the reader skipped, so
 * the shape of the block does not change from poem to poem — a row that moves
 * position between slides is a row you have to re-find every time.
 *
 * @param {Object} poem
 * @param {Object} prefs
 * @param {Object} bands
 * @param {{terms:Array, matched:Object}} [scoreResult] from scorePoem; supplies
 *   the credit annotation. Omit it and the rows carry states but no arithmetic.
 * @returns {Array<{key:string, label_ar:string, label_en:string, answered:boolean,
 *   term:Object|null, chips:Array<{key:string,label_ar:string,label_en:string,state:string}>}>}
 */
export const explainRows = (poem, prefs, bands = {}, scoreResult = null) => {
  const f = facetsOf(poem);
  const hasFacets = isCategorized(poem);
  const terms = scoreResult?.terms || [];
  const termFor = (k) => terms.find((t) => t.key === k) || null;
  const dimension = (k) => (bands?.dimensions || []).find((d) => d.key === k) || null;

  /** Label a taxonomy value, falling back to its key when the bands never loaded. */
  const valueLabel = (dim, key) => {
    const v = (dimension(dim)?.values || []).find((x) => x.key === key);
    return { key, label_ar: v?.label_ar || '', label_en: v?.label_en || key };
  };

  /**
   * One taxonomy dimension: what the poem carries, then what the reader asked
   * for and did not get. Chosen values sort first — the answer to "did I get
   * what I asked for" should not require reading to the end of a wrapped list.
   */
  const taxonomyRow = (dim, carried, chosen) => {
    const chips = carried.map((k) => ({
      ...valueLabel(dim, k),
      state: chosen.includes(k) ? 'matched' : 'present',
    }));
    for (const k of chosen) {
      if (!carried.includes(k)) chips.push({ ...valueLabel(dim, k), state: 'absent' });
    }
    const rank = { matched: 0, absent: 1, present: 2 };
    chips.sort((a, b) => rank[a.state] - rank[b.state]);
    const d = dimension(dim);
    return {
      key: dim,
      label_ar: d?.label_ar || '',
      label_en: d?.label_en || dim,
      answered: chosen.length > 0,
      term: termFor(dim),
      chips,
    };
  };

  const moods = asArray(prefs?.moods);
  const motifs = asArray(prefs?.motifs);

  /* -- family: the reader's pick, plus any other family the poem sits in ---- */
  //
  // A poem has no family FIELD. Family membership is derived: a family is a set
  // of mood/topic/motif values, and the poem belongs to any family sharing at
  // least one value with it — usually several at once.
  //
  // `via` carries the values that did the placing, because the bare label hides
  // the interesting part. "grief-loss via melancholy + tears" says which of the
  // poem's own facets put it there, and it makes the family overlap discount
  // legible: that discount exists precisely because those same values are
  // already being credited under mood and motif.
  const chosenFamily = prefs?.family || null;
  const bucketFor = (dim) =>
    dim === 'mood' ? f.moods : dim === 'motif' ? f.motifs : dim === 'topic' ? f.topics : [];
  const familyRoute = (fam) =>
    (fam?.values || [])
      .filter((v) => bucketFor(v.dim).includes(v.key))
      .map((v) => {
        // The family payload usually carries its own labels; fall back to the
        // dimension lookup so a route reads the same as the chip for the same
        // value rather than degrading to a raw key beside a labelled chip.
        const fromDim = valueLabel(v.dim, v.key);
        return {
          dim: v.dim,
          key: v.key,
          label_ar: v.label_ar || fromDim.label_ar,
          label_en: v.label_en || fromDim.label_en,
        };
      });
  const familyChips = [];
  for (const fam of bands?.families || []) {
    const via = familyRoute(fam);
    const inIt = via.length > 0;
    const isChosen = fam.key === chosenFamily;
    // A family the poem is not in and the reader did not ask for is not a fact
    // about this poem, so it is simply not a chip.
    if (!inIt && !isChosen) continue;
    familyChips.push({
      key: fam.key,
      label_ar: fam.label_ar || '',
      label_en: fam.label_en || fam.key,
      state: isChosen ? (inIt ? 'matched' : 'absent') : 'present',
      via,
    });
  }
  // The chosen family with no bands loaded still deserves a row rather than a
  // blank — otherwise a taxonomy fetch failure looks like "you asked for
  // nothing".
  if (chosenFamily && !familyChips.some((c) => c.key === chosenFamily)) {
    familyChips.unshift({
      key: chosenFamily,
      label_ar: '',
      label_en: chosenFamily,
      state: scoreResult?.matched?.family ? 'matched' : 'absent',
    });
  }
  const rankFam = { matched: 0, absent: 1, present: 2 };
  familyChips.sort((a, b) => rankFam[a.state] - rankFam[b.state]);

  /* -- era: one chip, because a poem has exactly one century ---------------- */
  //
  // Note what this can NEVER be: `absent`. A poem's own century is a fact about
  // the poem, so striking it through would be claiming the poem does not have
  // the century it has. When the answer went unsatisfied it is the READER'S
  // BAND that is absent, and `bandRow` appends that as its own chip.
  const eraBand = eraBandFor(prefs, bands);
  const eraState = !eraBand
    ? 'present'
    : {
        'in-band': 'matched',
        undated: 'matched',
        adjacent: 'partial',
        'undated-under-dated': 'partial',
      }[scoreResult?.matched?.era] || 'present';
  const eraChip = {
    key: f.century == null ? 'undated' : `c${f.century}`,
    label_ar: '',
    label_en: f.century == null ? 'undated' : `${ordinalCentury(f.century)} century`,
    state: eraState,
  };

  /* -- difficulty: same, on a continuous axis ------------------------------ */
  const diffBand = difficultyBandFor(prefs, bands);
  const diffState = !diffBand
    ? 'present'
    : { 'in-band': 'matched', near: 'partial' }[scoreResult?.matched?.difficulty] || 'present';
  const diffChip = {
    key: 'accessibility',
    label_ar: '',
    label_en:
      f.accessibility == null ? 'unscored' : `${f.accessibility.toFixed(1)} / 10 (higher = harder)`,
    state: diffState,
  };

  return [
    {
      key: 'family',
      label_ar: 'العائلة',
      label_en: 'family',
      answered: !!chosenFamily,
      term: termFor('family'),
      chips: familyChips,
      // A poem CAN carry facets and still sit in no family: the taxonomy has
      // values that belong to no family's set. That is a real answer, not an
      // empty state, and it reads differently from "this poem was never
      // classified" — so the two are distinguished here rather than both
      // collapsing to a blank row.
      noFamilyMatch: hasFacets && familyChips.length === 0,
    },
    taxonomyRow('mood', f.moods, moods),
    taxonomyRow('topic', f.topics, []),
    taxonomyRow('motif', f.motifs, motifs),
    bandRow('era', 'العصر', 'era', eraBand, eraChip, termFor('era')),
    bandRow('difficulty', 'السهولة', 'difficulty', diffBand, diffChip, termFor('difficulty')),
  ];
};

/**
 * Era and difficulty as a row.
 *
 * A poem has exactly ONE century and ONE accessibility score, so unlike the
 * multi-valued taxonomy dimensions there is no list to sort — but the `absent`
 * state still has to be expressible, and "the poem is 9th century" does not by
 * itself say what was asked for. So when the poem's own value did not fully
 * satisfy the answer, the BAND THE READER CHOSE is appended as its own absent
 * chip. That is the same shape the taxonomy rows use for an unmet ask, which is
 * the point: one visual grammar for "you asked for this and did not get it".
 */
const bandRow = (key, label_ar, label_en, band, chip, term) => {
  const chips = [chip];
  if (band && chip.state !== 'matched') {
    chips.push({
      key: band.key,
      label_ar: band.label_ar || '',
      label_en: band.label_en || band.key,
      state: 'absent',
      wanted: true,
    });
  }
  return { key, label_ar, label_en, answered: !!band, term, chips };
};

/** `6` -> `6th`. Local to the era chip; categoryBands has its own for band labels. */
const ordinalCentury = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

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
