/**
 * Re-time words to advance evenly within each verse, anchored to the transcript's
 * per-verse start/end. Keeps macro-sync (verses start/end where the transcript says)
 * but removes within-verse jitter.
 * @param {{word:string,start:number,end:number}[]} timings  aligned real timings, length N
 * @param {number[]} wordOffsets  first global word index of each verse, ascending, starts with 0
 * @param {object} [opts]
 * @param {boolean} [opts.charWeighted=false]  if true, weight by word length instead of equal
 * @returns {{word:string,start:number,end:number}[]}  same length N, smoothed within verses
 */
export function evenDistributeTimings(timings, wordOffsets, opts = {}) {
  const { charWeighted = false } = opts;

  // Edge case: empty timings
  if (!timings || timings.length === 0) {
    return [];
  }

  const N = timings.length;

  // If no wordOffsets provided or empty, treat the whole array as one verse
  let offsets = wordOffsets && wordOffsets.length > 0 ? wordOffsets : [0];

  // Build verse ranges
  const verseRanges = [];
  for (let v = 0; v < offsets.length; v++) {
    const startIdx = offsets[v];
    const endIdx = v + 1 < offsets.length ? offsets[v + 1] : N;

    // Skip empty ranges and clamp endIdx
    if (startIdx >= endIdx || startIdx >= N) {
      continue;
    }

    const clampedEndIdx = Math.min(endIdx, N);
    verseRanges.push({ startIdx, endIdx: clampedEndIdx });
  }

  // If no valid ranges, return empty
  if (verseRanges.length === 0) {
    return [];
  }

  // Initialize output array
  const output = timings.map(t => ({ ...t }));

  // Track the previous verse's end time for monotonicity across boundaries
  let prevSegEnd = null;

  // Process each verse range
  for (const { startIdx, endIdx } of verseRanges) {
    const a = startIdx;
    const b = endIdx;

    // Get the segment boundaries from the transcript
    let segStart = timings[a].start;
    let segEnd = timings[b - 1].end;

    // Safety: if segEnd < segStart, set segEnd = segStart
    if (segEnd < segStart) {
      segEnd = segStart;
    }

    // Ensure monotonicity across verse boundaries
    if (prevSegEnd !== null && segStart < prevSegEnd) {
      // This shouldn't happen with well-formed transcripts, but clamp if needed
      segStart = prevSegEnd;
    }

    prevSegEnd = segEnd;

    const verseLength = b - a;
    const totalDuration = segEnd - segStart;

    // Calculate widths for each word
    let widths;
    if (charWeighted) {
      // Weight by word length
      const lengths = [];
      let totalLength = 0;
      for (let i = a; i < b; i++) {
        const len = Math.max(1, output[i].word.length);
        lengths.push(len);
        totalLength += len;
      }

      widths = lengths.map(len => (len / totalLength) * totalDuration);
    } else {
      // Equal distribution
      const width = totalDuration / verseLength;
      widths = Array(verseLength).fill(width);
    }

    // Apply widths cumulatively
    let cumulativeTime = segStart;
    for (let i = 0; i < verseLength; i++) {
      const wordIdx = a + i;
      const width = widths[i];

      output[wordIdx].start = cumulativeTime;
      output[wordIdx].end = cumulativeTime + width;

      cumulativeTime += width;
    }

    // Force the last word of the verse to end exactly at segEnd
    output[b - 1].end = segEnd;
  }

  // Final validation: ensure no NaN values
  for (let i = 0; i < output.length; i++) {
    if (
      isNaN(output[i].start) ||
      isNaN(output[i].end) ||
      output[i].start > output[i].end
    ) {
      throw new Error(
        `Invalid timing at index ${i}: start=${output[i].start}, end=${output[i].end}`
      );
    }
  }

  return output;
}
