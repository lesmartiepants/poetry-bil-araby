/**
 * Build per-word timings from interleaved Live transcription fragments.
 * Distributes each fragment's time span across its words proportionally to char length.
 *
 * @param {{text: string, audioBytesBefore: number}[]} fragments
 *   Array of transcription fragments, each with the text received and the cumulative
 *   byte count of audio that preceded it.
 * @param {number} totalAudioBytes
 *   Total PCM audio bytes (both fragments and any trailing audio chunks).
 * @param {object} [opts] - Configuration
 * @param {number} [opts.sampleRate=24000] - Sample rate in Hz
 * @param {number} [opts.bytesPerSample=2] - Bytes per sample (16-bit mono = 2)
 * @returns {{word: string, start: number, end: number}[]}
 *   Array of words with start/end times in SECONDS, guaranteed monotonic non-decreasing.
 */
export function buildLiveWordTimings(fragments, totalAudioBytes, opts = {}) {
  const { sampleRate = 24000, bytesPerSample = 2 } = opts;

  // Helper: convert byte offset to seconds
  const bytesToSeconds = (bytes) => bytes / (sampleRate * bytesPerSample);

  // Defensive: empty input → empty output
  if (!fragments || fragments.length === 0) return [];
  if (totalAudioBytes === 0) return [];

  const timings = [];

  for (let i = 0; i < fragments.length; i++) {
    const frag = fragments[i];
    if (!frag.text || typeof frag.text !== 'string') continue;

    // Time span for this fragment: from its audioBytesBefore to the next fragment's start
    // (or to totalAudioBytes for the last fragment).
    const fragmentStart = bytesToSeconds(frag.audioBytesBefore);
    const nextBytesBefore = fragments[i + 1]?.audioBytesBefore ?? totalAudioBytes;
    let fragmentEnd = bytesToSeconds(nextBytesBefore);

    // Defensive: ensure fragmentEnd >= fragmentStart
    if (fragmentEnd < fragmentStart) fragmentEnd = fragmentStart;

    // Skip zero-duration fragments
    if (fragmentEnd === fragmentStart) continue;

    // Split text into words, filtering empty
    const words = frag.text.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) continue;

    // Distribute the time span [fragmentStart, fragmentEnd) across words
    // proportional to each word's character length
    const totalChars = words.reduce((sum, w) => sum + w.length, 0);
    if (totalChars === 0) continue;

    let currentStart = fragmentStart;
    for (let j = 0; j < words.length; j++) {
      const word = words[j];
      const charRatio = word.length / totalChars;
      const wordDuration = (fragmentEnd - fragmentStart) * charRatio;
      const wordEnd = currentStart + wordDuration;

      timings.push({
        word,
        start: currentStart,
        end: wordEnd,
      });

      currentStart = wordEnd;
    }
  }

  // Enforce monotonic non-decreasing and start <= end.
  // Must clamp end AFTER adjusting start — otherwise end can go below start.
  for (let i = 1; i < timings.length; i++) {
    if (timings[i].start < timings[i - 1].end) {
      timings[i].start = timings[i - 1].end;
    }
    if (timings[i].end < timings[i].start) {
      timings[i].end = timings[i].start;
    }
  }

  return timings;
}
