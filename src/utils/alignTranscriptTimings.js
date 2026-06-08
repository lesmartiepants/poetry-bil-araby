/**
 * Align real TTS-transcript word timings onto the app's displayed Arabic tokens.
 *
 * The server returns word timings derived from the model's output-audio
 * transcription (what it actually said, in spoken order). Those transcript
 * tokens won't exactly equal the displayed tokens (`allWords`): diacritics,
 * the ال article, punctuation, and segmentation all differ. This module maps
 * the two sequences with a monotonic, normalization-based greedy match, then
 * interpolates timings for any display token the transcript didn't cover.
 *
 * The caller decides whether the returned `confidence` is high enough to use
 * the real timings or fall back to the VAD/char estimator.
 */

// Arabic diacritics (harakat + shadda/sukoon range), superscript alef, tatweel.
const ARABIC_DIACRITICS = /[ً-ْٰـ]/g;
// Punctuation to drop: Arabic comma/semicolon/question + common ASCII marks.
const PUNCTUATION = /[،؛؟.,!?;:"'`()[\]{}«»\-–—…]/g;

/**
 * Normalize an Arabic token into a comparison key.
 * Strips diacritics, tatweel, and punctuation; unifies alef/yaa/haa/hamza
 * variants; drops a leading ال when a real stem remains. Arabic is caseless,
 * so no case folding is needed.
 *
 * @param {string} token
 * @returns {string} normalized key ('' if nothing meaningful remains)
 */
export function normalizeArabic(token) {
  if (!token || typeof token !== 'string') return '';

  let t = token.normalize('NFC');
  t = t.replace(ARABIC_DIACRITICS, '');
  t = t.replace(PUNCTUATION, '');

  // Unify letter variants
  t = t
    .replace(/[أإآٱ]/g, 'ا') // أ إ آ ٱ → ا
    .replace(/ى/g, 'ي') // ى → ي
    .replace(/ة/g, 'ه') // ة → ه
    .replace(/ؤ/g, 'و') // ؤ → و
    .replace(/ئ/g, 'ي') // ئ → ي
    .replace(/ء/g, ''); // standalone hamza → drop

  t = t.trim();

  // Drop a leading definite article ال only if a real stem remains.
  if (t.length >= 4 && t.startsWith('ال')) {
    t = t.slice(2);
  }

  return t;
}

const FORWARD_WINDOW = 3; // how far ahead in the transcript to look for a match

/**
 * Align transcript timings onto the displayed token array.
 *
 * @param {string[]} allWords - displayed Arabic tokens, in order
 * @param {{word: string, start: number, end: number}[]} transcriptTimings - spoken order
 * @returns {{timings: {word: string, start: number, end: number}[], confidence: number} | null}
 *   `timings.length === allWords.length`, starts monotonic non-decreasing,
 *   `start <= end`, no NaN. `confidence` = matched / allWords.length in [0,1].
 *   `matchedCount` = number of display tokens matched to a transcript token
 *   (use matchedCount / transcript.length to gate partial/streaming transcripts).
 *   Returns null when either input is empty.
 */
export function alignTranscriptTimings(allWords, transcriptTimings) {
  if (!Array.isArray(allWords) || allWords.length === 0) return null;
  if (!Array.isArray(transcriptTimings) || transcriptTimings.length === 0) return null;

  const displayKeys = allWords.map(normalizeArabic);
  const transKeys = transcriptTimings.map((t) => normalizeArabic(t.word));

  // Greedy monotonic match: for each display token, look for its key within a
  // bounded forward window of the transcript pointer.
  const matched = new Array(allWords.length).fill(null); // index into transcriptTimings, or null
  let t = 0;
  let matchedCount = 0;

  for (let i = 0; i < allWords.length; i++) {
    const key = displayKeys[i];
    if (!key) continue; // punctuation-only display token — interpolate later

    const limit = Math.min(transcriptTimings.length, t + FORWARD_WINDOW + 1);
    let found = -1;
    for (let p = t; p < limit; p++) {
      if (transKeys[p] && transKeys[p] === key) {
        found = p;
        break;
      }
    }

    if (found >= 0) {
      matched[i] = found;
      t = found + 1;
      matchedCount++;
    }
  }

  // Build the output, interpolating timings for unmatched display tokens.
  const timings = new Array(allWords.length);

  // Seed matched anchors directly from the transcript.
  for (let i = 0; i < allWords.length; i++) {
    if (matched[i] !== null) {
      const src = transcriptTimings[matched[i]];
      timings[i] = { word: allWords[i], start: num(src.start), end: num(src.end) };
    }
  }

  // Fill leading unmatched run (before the first anchor).
  const firstAnchor = timings.findIndex(Boolean);
  if (firstAnchor === -1) {
    // Nothing matched — spread everything across the transcript's full span.
    const start = num(transcriptTimings[0].start);
    const end = num(transcriptTimings[transcriptTimings.length - 1].end);
    return {
      timings: spreadEvenly(allWords, start, end),
      confidence: 0,
      matchedCount: 0,
    };
  }
  if (firstAnchor > 0) {
    const anchorStart = timings[firstAnchor].start;
    fillRange(timings, allWords, 0, firstAnchor - 1, 0, anchorStart);
  }

  // Fill interior + trailing unmatched runs.
  let prevAnchor = firstAnchor;
  for (let i = firstAnchor + 1; i < allWords.length; i++) {
    if (timings[i]) {
      if (i - prevAnchor > 1) {
        // gap of unmatched tokens between prevAnchor and i
        fillRange(timings, allWords, prevAnchor + 1, i - 1, timings[prevAnchor].end, timings[i].start);
      }
      prevAnchor = i;
    }
  }
  // Trailing run after the last anchor.
  if (prevAnchor < allWords.length - 1) {
    const lastEnd = timings[prevAnchor].end;
    fillRange(timings, allWords, prevAnchor + 1, allWords.length - 1, lastEnd, lastEnd);
  }

  // Enforce monotonic non-decreasing starts and start <= end.
  for (let i = 0; i < timings.length; i++) {
    if (i > 0 && timings[i].start < timings[i - 1].start) {
      timings[i].start = timings[i - 1].start;
    }
    if (timings[i].end < timings[i].start) {
      timings[i].end = timings[i].start;
    }
  }

  return { timings, confidence: matchedCount / allWords.length, matchedCount };
}

/** Coerce to a finite number, defaulting to 0. */
function num(v) {
  return Number.isFinite(v) ? v : 0;
}

/**
 * Fill timings[from..to] (inclusive) by spreading [rangeStart, rangeEnd]
 * evenly across those display tokens.
 */
function fillRange(timings, allWords, from, to, rangeStart, rangeEnd) {
  const count = to - from + 1;
  if (count <= 0) return;
  const span = Math.max(0, rangeEnd - rangeStart);
  const step = span / count;
  for (let k = 0; k < count; k++) {
    const start = rangeStart + step * k;
    const end = k === count - 1 ? rangeEnd : rangeStart + step * (k + 1);
    timings[from + k] = { word: allWords[from + k], start, end: Math.max(start, end) };
  }
}

/** Spread all words evenly across [start, end]. */
function spreadEvenly(allWords, start, end) {
  const out = new Array(allWords.length);
  fillRange(out, allWords, 0, allWords.length - 1, start, end);
  return out;
}
