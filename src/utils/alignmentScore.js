/**
 * Score whether a translation's lines line up with the original's.
 *
 * The line-count guard in the translation backfill only checks that a
 * translation has at least as many lines as the poem. A translation that
 * merges the opening bayt and then slides every later line up by one has a
 * matching count and is wrong from line 2 onward (issue #733). Counting cannot
 * see that, so this compares meaning instead: given an embedding per line on
 * each side, a correct translation scores highest on the diagonal, and a
 * shifted one scores highest on an off-diagonal band.
 *
 * Pure and dependency-free so it can be unit tested without calling an
 * embedding API; scripts/check-translation-alignment.mjs supplies real vectors.
 */

/** Cosine similarity of two equal-length vectors. */
export function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom ? dot / denom : 0;
}

/**
 * @param {number[][]} arVecs - One embedding per source line
 * @param {number[][]} enVecs - One embedding per translated line
 * @param {number} [maxShift=3] - Widest offset to test in each direction
 * @returns {{diagonal: number|null, best: number|null, shift: number, margin: number}}
 *   `shift` is the offset that beats the diagonal, 0 when none does.
 *   `margin` is how much it beats it by — the confidence in the finding.
 */
export function scoreAlignment(arVecs = [], enVecs = [], maxShift = 3) {
  const n = Math.min(arVecs.length, enVecs.length);
  if (n === 0) return { diagonal: null, best: null, shift: 0, margin: 0 };

  // Require a real overlap before trusting an offset: near the edges only a
  // couple of pairs survive, and two lucky pairs are not evidence of a shift.
  const minPairs = Math.max(3, Math.floor(n / 2));

  const meanAt = (offset) => {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
      const j = i + offset;
      if (j < 0 || j >= n) continue;
      sum += cosine(arVecs[i], enVecs[j]);
      count++;
    }
    return count >= (offset === 0 ? 1 : minPairs) ? sum / count : null;
  };

  const diagonal = meanAt(0);
  let best = diagonal;
  let shift = 0;
  for (let offset = -maxShift; offset <= maxShift; offset++) {
    if (offset === 0) continue;
    const m = meanAt(offset);
    if (m !== null && best !== null && m > best) {
      best = m;
      shift = offset;
    }
  }
  return {
    diagonal,
    best,
    shift,
    margin: best !== null && diagonal !== null ? best - diagonal : 0,
  };
}
