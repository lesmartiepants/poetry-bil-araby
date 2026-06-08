/**
 * Apply silence-aware pacing: if silence detected during a word's span,
 * pause the highlight (keep it on that word) until audio resumes.
 * @param {{word:string,start:number,end:number}[]} timings
 * @param {Array<{start:number,end:number,duration:number}>} silenceGaps
 * @returns {{word:string,start:number,end:number}[]}
 */
export function applySilenceAwarePacing(timings, silenceGaps) {
  if (!timings || !silenceGaps || silenceGaps.length === 0) return timings;

  const output = timings.map(t => ({ ...t }));
  let timeShift = 0; // cumulative shift from pauses

  for (let i = 0; i < output.length; i++) {
    const word = output[i];
    const wordStart = word.start + timeShift;
    const wordEnd = word.end + timeShift;

    // Check if any silence gap overlaps this word
    for (const gap of silenceGaps) {
      if (gap.start >= wordStart && gap.start < wordEnd) {
        // Silence starts during this word: extend the word's end to after the silence
        const pauseDuration = gap.duration * 0.5; // apply 50% of silence as highlight pause
        timeShift += pauseDuration;
      }
    }

    word.start = wordStart;
    word.end = wordEnd + timeShift;
  }

  return output;
}
