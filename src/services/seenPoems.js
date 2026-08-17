/**
 * Which poems this reader has already been shown.
 *
 * ## Why this exists
 *
 * The feed ranks by a strict priority ladder (see PRIORITY_ORDER in
 * preferenceWeighting). Strict ranking is deterministic by construction: given
 * the same pool and the same answers it returns the same poem, every time. That
 * is the point on slide 0 — the reader has just answered five questions and the
 * first poem should be the best available match rather than a lucky one.
 *
 * It is also, without this file, a trap. The top rung of the ladder is small —
 * roughly 15 poems for a narrow answer set — so a reader who closes the app and
 * comes back would open on the same poem, then the same second poem, forever.
 * Deterministic ranking without exhaustion is strictly worse than the sampling
 * it replaced.
 *
 * So: remember what has been shown, drop it from the candidate pool, and the
 * ladder descends a rung at a time as each is used up.
 *
 * ## What this is NOT
 *
 * Not reading history, and not a "read" receipt. A poem is recorded when it is
 * SHOWN, not when it is finished — the question this answers is "has the feed
 * already offered you this", which is about repetition, not about what the
 * reader engaged with. Anything wanting genuine reading history should collect
 * it separately rather than reinterpreting this.
 */

const KEY = 'seenPoems';

/**
 * Cap on remembered ids.
 *
 * The served corpus is ~4,800 poems, so 5,000 is "everything" with room to
 * spare — a reader cannot exhaust it, and one who somehow did is handled by the
 * fallback in drawSequence (an empty pool returns the full list rather than a
 * blank feed).
 *
 * The cap exists for localStorage, not for correctness: ids are ~5 bytes each,
 * so this tops out well under 50 KB, comfortably inside the ~5 MB budget while
 * leaving room for the caches that share it. Oldest entries are dropped first,
 * so the poems most likely to feel repetitive — the ones just seen — are the
 * ones retained.
 */
export const MAX_REMEMBERED = 5000;

const read = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => v != null) : [];
  } catch {
    // Private mode, a quota error, or hand-edited storage. A reader who cannot
    // persist should still get a feed — they get a fresh ladder each session,
    // which is the old behaviour, not a broken one.
    return [];
  }
};

/** Every poem id shown to this reader, oldest first. */
export const readSeen = () => read();

/** A Set for the draw path, which tests membership once per candidate. */
export const seenSet = () => new Set(read());

/**
 * Record poems as shown. Ignores ids already present rather than reordering
 * them: "when was it first shown" is the useful thing to keep when the cap
 * eventually trims, and re-dating an id on every re-render would make the cap
 * evict the wrong end.
 */
export const markSeen = (ids) => {
  const incoming = (Array.isArray(ids) ? ids : [ids]).filter((v) => v != null);
  if (!incoming.length) return readSeen();
  const current = read();
  const have = new Set(current);
  const added = incoming.filter((id) => !have.has(id));
  if (!added.length) return current;
  const next = [...current, ...added].slice(-MAX_REMEMBERED);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Out of quota. Keep the in-memory answer honest and let the next write
    // retry; losing the record degrades to repetition, never to a crash.
  }
  return next;
};

/** Forget everything. The reset behind "show me these again". */
export const clearSeen = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do — a failed clear leaves the old list, which is safe */
  }
};
