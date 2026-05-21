/**
 * VAD-based word timing from actual TTS audio data.
 *
 * Uses Voice Activity Detection (RMS energy analysis) on the decoded AudioBuffer
 * to locate silence regions between verses, then distributes word timings within
 * each verse using an improved minimum-floor + char-weighted algorithm.
 *
 * This replaces naive character-count-proportional timing with timings derived
 * from the actual audio, greatly reducing the "ahead/behind" desync in read-along.
 *
 * Falls back to the original char-weighted approach if the buffer is unavailable
 * or if silence detection produces an insufficient number of boundaries.
 */

const FRAME_DURATION_S = 0.01; // 10 ms analysis frames
const SILENCE_THRESHOLD_FACTOR = 0.05; // silence if RMS < 5% of peak
const MIN_SILENCE_DURATION_S = 0.08; // ignore gaps shorter than 80 ms
const LEAD_IGNORE_S = 0.05; // ignore the first/last 50 ms of the buffer
const MIN_WORD_DURATION_S = 0.1; // every word gets at least 100 ms

/**
 * Compute per-frame RMS energy from mono channel data.
 *
 * @param {Float32Array} channelData
 * @param {number}       sampleRate
 * @returns {number[]} RMS value per frame
 */
function computeRmsFrames(channelData, sampleRate) {
  const frameSize = Math.max(1, Math.round(sampleRate * FRAME_DURATION_S));
  const frames = [];
  for (let i = 0; i < channelData.length; i += frameSize) {
    const end = Math.min(i + frameSize, channelData.length);
    let sumSq = 0;
    for (let j = i; j < end; j++) sumSq += channelData[j] * channelData[j];
    frames.push(Math.sqrt(sumSq / (end - i)));
  }
  return frames;
}

/**
 * Find silence regions in the audio given pre-computed RMS frames.
 * Uses an adaptive threshold (percentage of peak RMS).
 *
 * @param {number[]} rmsFrames
 * @param {number}   totalDuration - audio duration in seconds
 * @returns {{ start:number, end:number, duration:number, midpoint:number }[]}
 */
function findSilenceRegions(rmsFrames, totalDuration) {
  if (!rmsFrames.length) return [];

  const peakRms = Math.max(...rmsFrames);
  // Avoid dividing by zero for completely silent buffers (e.g. mock audio in tests)
  if (peakRms === 0) return [];

  const threshold = peakRms * SILENCE_THRESHOLD_FACTOR;
  const regions = [];
  let inSilence = false;
  let silenceStart = 0;

  for (let i = 0; i < rmsFrames.length; i++) {
    const t = (i * totalDuration) / rmsFrames.length;
    if (rmsFrames[i] < threshold) {
      if (!inSilence) {
        silenceStart = t;
        inSilence = true;
      }
    } else if (inSilence) {
      const duration = t - silenceStart;
      if (duration >= MIN_SILENCE_DURATION_S) {
        regions.push({
          start: silenceStart,
          end: t,
          duration,
          midpoint: (silenceStart + t) / 2,
        });
      }
      inSilence = false;
    }
  }

  // Handle trailing silence
  if (inSilence) {
    const t = totalDuration;
    const duration = t - silenceStart;
    if (duration >= MIN_SILENCE_DURATION_S) {
      regions.push({ start: silenceStart, end: t, duration, midpoint: (silenceStart + t) / 2 });
    }
  }

  return regions;
}

/**
 * Within a time segment, distribute word timings using a minimum-floor + char-count blend.
 * Every word is guaranteed at least MIN_WORD_DURATION_S; the remaining time is distributed
 * proportionally to character count. This prevents short Arabic words (في، من، ال) from
 * receiving near-zero time and causing accumulated desync.
 *
 * @param {string[]} words
 * @param {number}   segStart  - segment start in seconds
 * @param {number}   segEnd    - segment end in seconds
 * @returns {{ word:string, start:number, end:number }[]}
 */
function distributeWordsInSegment(words, segStart, segEnd) {
  if (!words.length) return [];
  const segDuration = segEnd - segStart;

  const minTotal = MIN_WORD_DURATION_S * words.length;
  if (segDuration <= minTotal) {
    // Not enough time — distribute evenly
    const perWord = segDuration / words.length;
    return words.map((word, i) => ({
      word,
      start: segStart + i * perWord,
      end: i === words.length - 1 ? segEnd : segStart + (i + 1) * perWord,
    }));
  }

  const charCounts = words.map((w) => Math.max(w.length, 1));
  const totalChars = charCounts.reduce((a, b) => a + b, 0);
  const remaining = segDuration - minTotal;

  const timings = [];
  let elapsed = segStart;
  for (let i = 0; i < words.length; i++) {
    const charShare = (charCounts[i] / totalChars) * remaining;
    const duration = MIN_WORD_DURATION_S + charShare;
    const start = elapsed;
    const end = i === words.length - 1 ? segEnd : elapsed + duration;
    timings.push({ word: words[i], start, end });
    elapsed = end;
  }
  return timings;
}

/**
 * Compute accurate word timings from a ToneAudioBuffer using VAD alignment.
 *
 * Algorithm:
 * 1. Analyze the audio waveform to detect silence regions.
 * 2. Pick the (numVerses − 1) longest internal silences as verse boundaries.
 * 3. Within each detected verse segment, distribute words with the improved
 *    minimum-floor + char-weighted algorithm.
 * 4. If silence detection cannot produce enough boundaries (e.g. mock/silent
 *    audio), falls back to returning null so the caller can use the legacy
 *    char-weighted estimator.
 *
 * @param {import('tone').ToneAudioBuffer} toneBuffer  - audioPlayer.buffer
 * @param {string[][]}                     verseWords  - words grouped by verse
 * @returns {{ word:string, start:number, end:number }[] | null}
 *   Array of word timings (same length as verseWords.flat()), or null on failure.
 */
export function computeWordTimingsFromAudio(toneBuffer, verseWords) {
  if (!toneBuffer || !verseWords || !verseWords.length) return null;

  // Retrieve channel data — works with both ToneAudioBuffer and plain AudioBuffer
  let channelData;
  let sampleRate;
  let totalDuration;
  try {
    // ToneAudioBuffer exposes getChannelData() directly; plain AudioBuffer also has it.
    // The .get() path unwraps a ToneAudioBuffer to its inner AudioBuffer in Tone.js v14-,
    // where getChannelData was not forwarded on the wrapper object.
    channelData =
      typeof toneBuffer.getChannelData === 'function'
        ? toneBuffer.getChannelData(0)
        : toneBuffer.get?.()?.getChannelData(0);
    sampleRate = toneBuffer.sampleRate || 24000;
    totalDuration = toneBuffer.duration || channelData.length / sampleRate;
  } catch {
    return null;
  }

  if (!channelData || channelData.length === 0 || totalDuration <= 0) return null;

  const numVerses = verseWords.length;
  const rmsFrames = computeRmsFrames(channelData, sampleRate);
  const silenceRegions = findSilenceRegions(rmsFrames, totalDuration);

  // Keep only internal silences (skip lead-in / lead-out noise)
  const internalSilences = silenceRegions.filter(
    (s) => s.midpoint > LEAD_IGNORE_S && s.midpoint < totalDuration - LEAD_IGNORE_S
  );

  // Select the (numVerses − 1) longest silences as verse boundaries, sorted chronologically
  const neededBoundaries = numVerses - 1;
  let verseBoundaries = [];
  if (neededBoundaries > 0 && internalSilences.length >= neededBoundaries) {
    verseBoundaries = [...internalSilences]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, neededBoundaries)
      .map((s) => s.midpoint)
      .sort((a, b) => a - b);
  } else if (neededBoundaries > 0) {
    // Not enough silences detected — fall back to char-weighted
    return null;
  }

  // Build verse time segments from detected boundaries
  const segments = [];
  let prevEnd = 0;
  for (let v = 0; v < numVerses; v++) {
    const end = v < verseBoundaries.length ? verseBoundaries[v] : totalDuration;
    segments.push({ start: prevEnd, end });
    prevEnd = end;
  }
  if (segments.length > 0) segments[segments.length - 1].end = totalDuration;

  // Distribute words within each segment
  const timings = [];
  for (let v = 0; v < numVerses; v++) {
    const words = verseWords[v];
    const { start, end } = segments[v];
    timings.push(...distributeWordsInSegment(words, start, end));
  }

  const allWords = verseWords.flat();
  if (timings.length !== allWords.length) return null;

  return timings;
}
