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
  // Fragments whose start bytes fall within this gap are treated as one group.
  // Transcription can outrun audio (especially at the very start, where the first
  // 2-3 words are all stamped within a couple of bytes of each other before audio
  // catches up). 30ms is well below any real recited word, so distinct words are
  // never wrongly merged.
  const MIN_GAP_BYTES = sampleRate * bytesPerSample * 0.03;

  // Defensive: empty input → empty output
  if (!fragments || fragments.length === 0) return [];
  if (totalAudioBytes === 0) return [];

  const timings = [];

  // Keep only fragments with real text, preserving order.
  const valid = fragments.filter((f) => f && typeof f.text === 'string' && f.text.trim());

  // Group consecutive fragments that share the same audioBytesBefore. This happens
  // at the very start: the first transcription arrives BEFORE any audio byte, so it
  // and the next fragment both stamp at byte 0. Without grouping, the first fragment
  // collapses to zero duration (start === end) and its words never highlight — the
  // read-along would skip the first word or two. A group spans from its shared start
  // byte to the next STRICTLY-GREATER start byte (or totalAudioBytes), and all the
  // group's words share that span. In steady state every fragment has a distinct
  // start byte, so each group is a single fragment and behavior is unchanged.
  let g = 0;
  while (g < valid.length) {
    const groupStartBytes = valid[g].audioBytesBefore;
    const words = [];
    let h = g;
    while (h < valid.length && valid[h].audioBytesBefore - groupStartBytes < MIN_GAP_BYTES) {
      for (const w of valid[h].text.split(/\s+/)) if (w.length > 0) words.push(w);
      h++;
    }
    const nextStartBytes = h < valid.length ? valid[h].audioBytesBefore : totalAudioBytes;
    const fragmentStart = bytesToSeconds(groupStartBytes);
    let fragmentEnd = bytesToSeconds(nextStartBytes);
    if (fragmentEnd < fragmentStart) fragmentEnd = fragmentStart;
    g = h;

    if (words.length === 0) continue;
    const totalChars = words.reduce((sum, w) => sum + w.length, 0) || 1;

    let currentStart = fragmentStart;
    for (let j = 0; j < words.length; j++) {
      const charRatio = words[j].length / totalChars;
      // Pin the last word's end exactly to fragmentEnd to avoid float drift.
      const wordEnd =
        j === words.length - 1
          ? fragmentEnd
          : currentStart + (fragmentEnd - fragmentStart) * charRatio;
      timings.push({ word: words[j], start: currentStart, end: wordEnd });
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
