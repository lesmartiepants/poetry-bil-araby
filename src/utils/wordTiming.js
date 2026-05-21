/**
 * Compute char-weighted word timings for TTS highlight synchronization.
 *
 * Each word receives a slice of totalDuration proportional to its character count.
 * Returns an array of { word, start, end } objects in the same order as the input.
 *
 * @param {string[]} words         - Array of words (Arabic or Latin)
 * @param {number}   totalDuration - Total audio duration in seconds
 * @returns {{ word: string, start: number, end: number }[]}
 */
export function computeWordTimings(words, totalDuration) {
  if (!words || words.length === 0 || !totalDuration) return [];

  const charCounts = words.map((w) => w.length);
  const totalChars = charCounts.reduce((sum, n) => sum + n, 0);

  // Fallback: if all words are empty strings, distribute evenly
  const effectiveTotal = totalChars === 0 ? words.length : totalChars;
  const getWeight = (count) => (totalChars === 0 ? 1 : count);

  const timings = [];
  let elapsed = 0;

  for (let i = 0; i < words.length; i++) {
    const weight = getWeight(charCounts[i]);
    const duration = (weight / effectiveTotal) * totalDuration;
    const start = elapsed;
    const end = i === words.length - 1 ? totalDuration : elapsed + duration;
    timings.push({ word: words[i], start, end });
    elapsed = end;
  }

  return timings;
}
