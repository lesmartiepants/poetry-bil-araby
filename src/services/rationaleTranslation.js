/**
 * The classifier's rationale, in English.
 *
 * `categories.rationale` is one Arabic sentence in which the classifier says
 * why it assigned the labels it did. Every row tagged before prompt version
 * distill-2 has only that sentence, which left the rationale as the one
 * Arabic-only element in a panel where everything else carries `label_ar` +
 * `label_en`.
 *
 * distill-2 asks the classifier for `rationale_en` in the same call, so new
 * rows arrive bilingual. This module covers everything already in the table:
 * it asks the API to translate the sentence once and PERSIST it, into that
 * same `categories.rationale_en` field.
 *
 * Persisting server-side is the whole point. Caching in IndexedDB would make
 * every reader pay for the same sentence; the poem row is shared, so the first
 * reader pays and no one else does. The in-flight map below is not that cache
 * — it only stops one session from firing twice for the same poem while a
 * request is open.
 *
 * FIRES ONLY WHEN ASKED FOR. The rationale is collapsed by default, so this
 * runs on expand, not on every poem the feed touches. There are ~9k rows to
 * back-fill and no reason to pay for the ones nobody opens.
 *
 * FAILS SILENTLY, ALWAYS. No key, offline, a 502 from upstream — every one of
 * those resolves to `null` and the panel keeps showing the Arabic. The Arabic
 * is the source of truth; the English is a convenience, and a convenience that
 * announces its own failure is worse than one that just isn't there.
 */

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/** poemId -> Promise<string|null>. Per-session de-duplication, not a cache. */
const inflight = new Map();

/**
 * @param {number|string} poemId
 * @returns {Promise<string|null>} the English rationale, or null if unavailable
 */
export function fetchRationaleEn(poemId) {
  if (!poemId) return Promise.resolve(null);
  const key = String(poemId);
  if (inflight.has(key)) return inflight.get(key);

  const p = fetch(`${apiUrl}/api/poems/${encodeURIComponent(key)}/rationale-translation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => d?.rationaleEn || null)
    .catch(() => null)
    .then((result) => {
      // A null result is not worth remembering: the next attempt may be online,
      // or may run against a server that has a key. Keeping only successes
      // means a retry is one more expand away.
      if (result === null) inflight.delete(key);
      return result;
    });

  inflight.set(key, p);
  return p;
}

/** Test seam — drops the in-flight/success map. */
export function __resetRationaleCache() {
  inflight.clear();
}
