/**
 * The most recent scored draw, kept for the debug surface.
 *
 * Deliberately a tiny module-level box rather than a Zustand store: nothing
 * re-renders off it, the DiscoveryDrawInspector polls it while it is mounted,
 * and putting it in a store would make every poem fetch publish a state update
 * that only a flag-gated panel ever looks at.
 *
 * WHY THIS EXISTS AT ALL. Under scoring, a poem matching almost nothing the
 * reader asked for is CORRECT — that is the anti-lock-in guarantee doing its
 * job. But from outside, "the feed served me something unrelated" and "the
 * weighting is broken" look identical. The only thing that separates them is the
 * score, the candidate set it was drawn from, and the temperature it was drawn
 * at. Without those three on screen, the feature cannot be verified by looking
 * at it, only by trusting it.
 *
 * The per-poem attribution the READER may see is not stored here — it rides on
 * the poem object (`poem.discoveryDraw`) so it survives scrolling back through
 * the carousel, which this single-slot box would not.
 */

let last = null;

/**
 * @param {{
 *   scored: Array, temperature: number, picked: Object|null,
 *   prefs: Object, queries: Array, poemsSeen: number
 * }} draw
 */
export const setLastDraw = (draw) => {
  last = { ...draw, at: Date.now() };
};

export const getLastDraw = () => last;

/** Test seam. */
export const clearLastDraw = () => {
  last = null;
};
