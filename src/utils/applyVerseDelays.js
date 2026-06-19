/**
 * Add a delay at the start of each verse to prevent the highlight from
 * rushing off the first word too quickly. Shifts all words in the verse
 * forward by the specified delay.
 * @param {{word:string,start:number,end:number}[]} timings
 * @param {number[]} wordOffsets  first word index of each verse
 * @param {number} delaySeconds  delay to add at verse start
 * @returns {{word:string,start:number,end:number}[]}
 */
export function applyVerseDelays(timings, wordOffsets, delaySeconds = 0) {
  if (!timings || timings.length === 0 || delaySeconds <= 0) return timings;
  if (!wordOffsets || wordOffsets.length === 0) return timings;

  const output = timings.map(t => ({ ...t }));
  let cumulativeDelay = 0;

  for (let v = 0; v < wordOffsets.length; v++) {
    const verseStart = wordOffsets[v];
    const verseEnd = v + 1 < wordOffsets.length ? wordOffsets[v + 1] : timings.length;

    if (verseStart >= verseEnd || verseStart >= timings.length) continue;

    // Shift this verse's words forward by delaySeconds + any cumulative delay from prior verses
    const totalDelay = cumulativeDelay + delaySeconds;
    for (let i = verseStart; i < verseEnd; i++) {
      output[i].start += totalDelay;
      output[i].end += totalDelay;
    }

    cumulativeDelay += delaySeconds;
  }

  return output;
}
