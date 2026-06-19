/**
 * chunkStanzas — split an array of verse pairs into fixed-size stanza groups.
 *
 * @param {Array<{ar: string, en: string}>} versePairs — flat list of line pairs
 * @param {number} size — lines per stanza (default 4)
 * @returns {Array<Array<{ar: string, en: string}>>}   — array of stanza groups
 *
 * Edge cases:
 * - Empty array           → []
 * - Fewer than `size`     → one group containing all pairs
 * - Exact multiple        → even groups with no remainder
 * - Last group < `size`   → last group contains the remaining pairs
 */
export function chunkStanzas(versePairs, size = 4) {
  if (!Array.isArray(versePairs) || versePairs.length === 0) return [];
  const safeSize = Math.max(1, Math.floor(size));
  const result = [];
  for (let i = 0; i < versePairs.length; i += safeSize) {
    result.push(versePairs.slice(i, i + safeSize));
  }
  return result;
}
