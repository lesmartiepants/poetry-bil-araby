/**
 * Scored draws, kept PER POEM for the debug surface.
 *
 * Deliberately a tiny module-level box rather than a Zustand store: nothing
 * re-renders off it directly, and putting it in a store would make every poem
 * fetch publish a state update that only a flag-gated panel ever looks at. The
 * inspector re-reads it whenever the slide index changes, which is reactive
 * state it already subscribes to — so the panel tracks the poem in front of the
 * reader without this module needing to notify anyone.
 *
 * WHY THIS EXISTS AT ALL. Under scoring, a poem matching almost nothing the
 * reader asked for is CORRECT — that is the anti-lock-in guarantee doing its
 * job. But from outside, "the feed served me something unrelated" and "the
 * weighting is broken" look identical. The only thing that separates them is the
 * score, the candidate set it was drawn from, and the temperature it was drawn
 * at. Without those three on screen, the feature cannot be verified by looking
 * at it, only by trusting it.
 *
 * WHY PER POEM. It used to be a single slot, and that was defensible only
 * because there was genuinely one scored draw per feed — slot 0. With every
 * slide drawn on its own the singleton became a bug wearing the feed's clothes:
 * the panel showed slide 0's numbers no matter which slide you scrolled to, and
 * the spread rail never moved, which reads as a frozen panel rather than as
 * "there is nothing else to show".
 *
 * SHARED CONTEXT, NOT COPIES. Every pick from one batch draw shares the same
 * candidate list, temperature, answers and queries. Those are stored ONCE per
 * batch and referenced by each poem's record, so five slides cost one 30-entry
 * candidate array rather than five.
 *
 * The per-poem attribution the READER may see is not stored here — it rides on
 * the poem object (`poem.discoveryDraw`) so it survives a full store reset,
 * which this module would not.
 */

/**
 * How many poem records to keep. Infinite scroll means this map would otherwise
 * grow for the whole session; a few hundred covers far more scrollback than any
 * reader produces, and the eviction is FIFO so the recent feed is never the part
 * that gets dropped.
 */
const MAX_RECORDS = 300;

/** poemId -> { context, scoreResult, rank, slot, deterministic } */
const byPoem = new Map();

/** The feed as drawn, in slide order, for the ahead/behind queue. */
let feedOrder = [];

let last = null;

/**
 * Record one batch draw: N picks sharing one candidate pool.
 *
 * @param {Object} draw
 * @param {Array}  draw.picks   from drawManyFrom — each carries slot/rank/score
 * @param {Array}  draw.scored  every candidate, scored
 * @param {number} draw.temperature
 * @param {Object} draw.prefs
 * @param {Array}  draw.queries
 * @param {number} draw.poemsSeen
 * @param {Object} [draw.bands]
 * @param {boolean} [draw.replaceFeed] true when this batch STARTS a feed (a
 *   fresh draw), false when it appends to one (load-more).
 */
export const recordFeedDraw = ({
  picks = [],
  scored = [],
  temperature,
  prefs,
  queries,
  poemsSeen,
  bands,
  replaceFeed = true,
}) => {
  const context = { scored, temperature, prefs, queries, poemsSeen, bands, at: Date.now() };

  if (replaceFeed) feedOrder = [];

  picks.forEach((pick) => {
    const id = pick?.poem?.id;
    if (id == null) return;
    byPoem.set(id, {
      context,
      picked: pick.poem,
      scored,
      temperature,
      prefs,
      queries,
      poemsSeen,
      bands,
      at: context.at,
      rank: pick.rank,
      slot: pick.slot,
      deterministic: pick.deterministic,
      ratio: pick.ratio,
      scaled: pick.scaled,
    });
    feedOrder.push({
      id,
      title: pick.poem?.title,
      titleArabic: pick.poem?.titleArabic,
      poet: pick.poem?.poet,
      slot: pick.slot,
      rank: pick.rank,
      scaled: pick.scaled,
      ratio: pick.ratio,
      deterministic: pick.deterministic,
    });
  });

  // FIFO eviction — Map preserves insertion order, so the oldest key is first.
  while (byPoem.size > MAX_RECORDS) {
    const oldest = byPoem.keys().next().value;
    byPoem.delete(oldest);
  }

  last = picks.length ? byPoem.get(picks[picks.length - 1]?.poem?.id) || last : last;
};

/** Back-compat single-slot writer, used by the one-poem draw path. */
export const setLastDraw = (draw) => {
  recordFeedDraw({
    picks: draw?.picked
      ? [
          {
            poem: draw.picked,
            slot: draw.slot ?? 0,
            rank: draw.rank ?? null,
            deterministic: draw.deterministic ?? false,
            ratio: draw.picked?.discoveryDraw?.ratio,
            scaled: draw.picked?.discoveryDraw?.scaled,
          },
        ]
      : [],
    ...draw,
    replaceFeed: draw?.replaceFeed !== false,
  });
};

/** The draw record for one poem, or null when it was not drawn by score. */
export const getDrawFor = (poemId) => (poemId == null ? null : byPoem.get(poemId) || null);

/** The feed as drawn, slide order — what is ahead of and behind the reader. */
export const getFeedOrder = () => feedOrder;

export const getLastDraw = () => last;

/** Test seam. */
export const clearLastDraw = () => {
  last = null;
  feedOrder = [];
  byPoem.clear();
};
