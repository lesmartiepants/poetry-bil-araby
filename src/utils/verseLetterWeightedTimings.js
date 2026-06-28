/**
 * Distribute word timings within verses, weighted by letter count.
 * Keeps per-verse start/end from the transcript, but spreads each verse's
 * time across its words proportionally to their letter lengths.
 * @param {{word:string,start:number,end:number}[]} timings
 * @param {number[]} wordOffsets  first word index of each verse
 * @returns {{word:string,start:number,end:number}[]}
 */
export function verseLetterWeightedTimings(timings, wordOffsets) {
  if (!timings || timings.length === 0) return [];
  if (!wordOffsets || wordOffsets.length === 0) {
    // Single verse: distribute by letter weight across entire span
    return distributeVerse(timings, 0, timings.length);
  }

  const output = timings.map(t => ({ ...t }));
  const N = timings.length;

  for (let v = 0; v < wordOffsets.length; v++) {
    const a = wordOffsets[v];
    const b = v + 1 < wordOffsets.length ? wordOffsets[v + 1] : N;
    if (a >= b || a >= N) continue;

    const segStart = timings[a].start;
    const segEnd = timings[Math.min(b - 1, N - 1)].end;
    if (segEnd < segStart) continue;

    distributeVerse(output, a, b, segStart, segEnd);
  }

  return output;
}

function distributeVerse(arr, start, end, segStart, segEnd) {
  const verseLength = end - start;
  if (verseLength <= 0) return arr;

  // Compute total letter count for weighting
  let totalLetters = 0;
  for (let i = start; i < end; i++) {
    totalLetters += Math.max(1, arr[i].word.length);
  }

  const spanDuration = (segEnd ?? arr[end - 1].end) - (segStart ?? arr[start].start);
  let cumulativeTime = segStart ?? arr[start].start;

  for (let i = start; i < end; i++) {
    const letters = Math.max(1, arr[i].word.length);
    const weight = letters / totalLetters;
    const wordDuration = spanDuration * weight;

    arr[i].start = cumulativeTime;
    arr[i].end = cumulativeTime + wordDuration;
    cumulativeTime = arr[i].end;
  }

  // Force last word to end exactly at segEnd
  if (end > start && segEnd !== undefined) {
    arr[end - 1].end = segEnd;
  }

  return arr;
}
