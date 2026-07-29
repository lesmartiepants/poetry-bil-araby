/**
 * Smooth per-word timings to remove flash (near-zero) and stick (runaway) spans.
 * Preserves the overall span [first.start, last.end], order, and monotonicity.
 * @param {{word:string,start:number,end:number}[]} timings  aligned real timings
 * @param {object} [opts]
 * @param {number} [opts.minDwell=0.18]  minimum seconds per word
 * @returns {{word:string,start:number,end:number}[]}  same length, smoothed
 */
export function smoothWordTimings(timings, opts = {}) {
  // Handle empty or single-word cases
  if (timings.length === 0) return [];
  if (timings.length === 1) {
    return [{ ...timings[0] }];
  }

  const N = timings.length;
  const minDwell = opts.minDwell ?? 0.18;

  // Extract span boundaries
  const spanStart = timings[0].start;
  const spanEnd = timings[N - 1].end;
  const total = Math.max(0, spanEnd - spanStart);

  // Compute raw durations
  const rawDur = timings.map(t => Math.max(0, t.end - t.start));

  // Determine smoothed durations
  let dur;

  if (total <= N * minDwell) {
    // Not enough room: split total evenly
    dur = Array(N).fill(total / N);
  } else {
    // Enough room: floor everyone at minDwell, distribute remainder by weight
    const floor = minDwell;
    const remaining = total - N * minDwell;
    const weights = rawDur.map(d => Math.max(0, d - minDwell));
    const weightSum = weights.reduce((a, b) => a + b, 0);

    dur = new Array(N);
    if (weightSum === 0) {
      // No variance in original: distribute remaining evenly
      for (let i = 0; i < N; i++) {
        dur[i] = floor + remaining / N;
      }
    } else {
      // Weight remaining proportionally
      for (let i = 0; i < N; i++) {
        dur[i] = floor + remaining * (weights[i] / weightSum);
      }
    }
  }

  // Rebuild timings cumulatively
  const start = new Array(N);
  const end = new Array(N);

  start[0] = spanStart;
  for (let i = 0; i < N; i++) {
    end[i] = start[i] + dur[i];
    if (i < N - 1) {
      start[i + 1] = end[i];
    }
  }

  // Force last end to exact spanEnd (fixes float drift)
  end[N - 1] = spanEnd;

  // Build result
  return timings.map((t, i) => ({
    word: t.word,
    start: start[i],
    end: end[i],
  }));
}
