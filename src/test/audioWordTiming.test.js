import { describe, it, expect } from 'vitest';
import { computeWordTimingsFromAudio } from '../utils/audioWordTiming.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal mock ToneAudioBuffer that uses a pre-populated Float32Array.
 */
function makeMockBuffer(channelData, sampleRate = 24000) {
  const duration = channelData.length / sampleRate;
  return {
    loaded: true,
    sampleRate,
    duration,
    getChannelData: () => channelData,
  };
}

/**
 * Create a Float32Array with synthetic "speech" (value=0.5) and silence (value=0)
 * regions, separated by silence gaps.
 *
 * @param {number}   sampleRate
 * @param {{type:'speech'|'silence', durationMs:number}[]} segments
 */
function buildAudioData(sampleRate, segments) {
  const totalSamples = segments.reduce(
    (acc, s) => acc + Math.round((s.durationMs / 1000) * sampleRate),
    0
  );
  const data = new Float32Array(totalSamples);
  let offset = 0;
  for (const seg of segments) {
    const len = Math.round((seg.durationMs / 1000) * sampleRate);
    const value = seg.type === 'speech' ? 0.5 : 0.0;
    data.fill(value, offset, offset + len);
    offset += len;
  }
  return data;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('computeWordTimingsFromAudio', () => {
  it('returns null for null / empty inputs', () => {
    expect(computeWordTimingsFromAudio(null, [['كلمة']])).toBeNull();
    expect(computeWordTimingsFromAudio(makeMockBuffer(new Float32Array(0)), [['كلمة']])).toBeNull();
    expect(computeWordTimingsFromAudio(makeMockBuffer(new Float32Array(2400)), [])).toBeNull();
  });

  it('returns null for a completely silent buffer (no voice activity detected)', () => {
    // All zeros → peakRms=0 → no silence regions detected → VAD falls back
    const silence = new Float32Array(24000); // 1 s of silence
    const result = computeWordTimingsFromAudio(makeMockBuffer(silence), [['في'], ['العزم']]);
    expect(result).toBeNull();
  });

  it('detects a single-verse poem (no boundary needed)', () => {
    // One verse of 300 ms speech — no silence boundary required
    const data = buildAudioData(24000, [{ type: 'speech', durationMs: 300 }]);
    const verseWords = [['على', 'قدر', 'أهل']];
    const timings = computeWordTimingsFromAudio(makeMockBuffer(data), verseWords);
    expect(timings).not.toBeNull();
    expect(timings).toHaveLength(3);
    expect(timings[0].start).toBeCloseTo(0, 2);
    expect(timings[2].end).toBeCloseTo(0.3, 1);
  });

  it('aligns two verses via silence detection', () => {
    // 300ms speech | 150ms silence | 300ms speech
    const data = buildAudioData(24000, [
      { type: 'speech', durationMs: 300 },
      { type: 'silence', durationMs: 150 },
      { type: 'speech', durationMs: 300 },
    ]);
    const verseWords = [
      ['على', 'قدر'],
      ['تأتي', 'العزائم'],
    ];
    const timings = computeWordTimingsFromAudio(makeMockBuffer(data), verseWords);

    expect(timings).not.toBeNull();
    expect(timings).toHaveLength(4);

    // Verse 1 words should start before the silence gap
    expect(timings[0].start).toBeCloseTo(0, 1);
    expect(timings[1].end).toBeLessThan(0.4); // ends before/during silence

    // Verse 2 words should start after the silence gap (boundary ~0.375s)
    expect(timings[2].start).toBeGreaterThan(0.3);
    expect(timings[3].end).toBeCloseTo(0.75, 1);
  });

  it('returns correct word count matching verseWords.flat()', () => {
    const data = buildAudioData(24000, [
      { type: 'speech', durationMs: 400 },
      { type: 'silence', durationMs: 120 },
      { type: 'speech', durationMs: 400 },
      { type: 'silence', durationMs: 120 },
      { type: 'speech', durationMs: 400 },
    ]);
    const verseWords = [
      ['على', 'قدر', 'أهل', 'العزم'],
      ['تأتي', 'العزائم'],
      ['وتأتي', 'على', 'قدر', 'الكرام'],
    ];
    const timings = computeWordTimingsFromAudio(makeMockBuffer(data), verseWords);
    expect(timings).not.toBeNull();
    expect(timings).toHaveLength(10);
  });

  it('timings are sequential — each start equals previous end', () => {
    const data = buildAudioData(24000, [
      { type: 'speech', durationMs: 400 },
      { type: 'silence', durationMs: 120 },
      { type: 'speech', durationMs: 400 },
    ]);
    const verseWords = [
      ['على', 'قدر', 'أهل'],
      ['تأتي', 'العزائم', 'المكارم'],
    ];
    const timings = computeWordTimingsFromAudio(makeMockBuffer(data), verseWords);
    expect(timings).not.toBeNull();
    for (let i = 1; i < timings.length; i++) {
      expect(timings[i].start).toBeCloseTo(timings[i - 1].end, 5);
    }
  });

  it('last timing end equals the total audio duration', () => {
    const data = buildAudioData(24000, [
      { type: 'speech', durationMs: 300 },
      { type: 'silence', durationMs: 100 },
      { type: 'speech', durationMs: 300 },
    ]);
    const verseWords = [
      ['كلمة', 'أخرى'],
      ['وكلمة', 'ثالثة'],
    ];
    const timings = computeWordTimingsFromAudio(makeMockBuffer(data), verseWords);
    expect(timings).not.toBeNull();
    const expectedDuration = data.length / 24000;
    expect(timings[timings.length - 1].end).toBeCloseTo(expectedDuration, 3);
  });

  it('falls back to null when insufficient silences found for multi-verse poem', () => {
    // Single block of speech — no silence between two expected verses
    const data = buildAudioData(24000, [{ type: 'speech', durationMs: 600 }]);
    const verseWords = [
      ['أهل', 'العزم'],
      ['تأتي', 'العزائم'],
    ];
    // Only 0 silence regions found, but 1 boundary needed → should return null
    const timings = computeWordTimingsFromAudio(makeMockBuffer(data), verseWords);
    expect(timings).toBeNull();
  });

  it('all timing objects have word, start, end properties with valid numbers', () => {
    const data = buildAudioData(24000, [
      { type: 'speech', durationMs: 300 },
      { type: 'silence', durationMs: 100 },
      { type: 'speech', durationMs: 300 },
    ]);
    const verseWords = [
      ['على', 'قدر'],
      ['تأتي', 'العزائم'],
    ];
    const timings = computeWordTimingsFromAudio(makeMockBuffer(data), verseWords);
    expect(timings).not.toBeNull();
    for (const t of timings) {
      expect(t).toHaveProperty('word');
      expect(t).toHaveProperty('start');
      expect(t).toHaveProperty('end');
      expect(Number.isFinite(t.start)).toBe(true);
      expect(Number.isFinite(t.end)).toBe(true);
      expect(t.end).toBeGreaterThan(t.start);
    }
  });

  it('every word receives at least the minimum duration (100 ms)', () => {
    const data = buildAudioData(24000, [
      { type: 'speech', durationMs: 500 },
      { type: 'silence', durationMs: 120 },
      { type: 'speech', durationMs: 500 },
    ]);
    const verseWords = [
      ['في', 'من', 'ال', 'إلى', 'على'], // many short function words
      ['تأتي', 'العزائم'],
    ];
    const timings = computeWordTimingsFromAudio(makeMockBuffer(data), verseWords);
    expect(timings).not.toBeNull();
    for (const t of timings) {
      expect(t.end - t.start).toBeGreaterThanOrEqual(0.095); // 100ms floor with float tolerance
    }
  });

  it('handles Arabic words with diacritics (Unicode)', () => {
    const data = buildAudioData(24000, [
      { type: 'speech', durationMs: 400 },
      { type: 'silence', durationMs: 120 },
      { type: 'speech', durationMs: 400 },
    ]);
    const verseWords = [
      ['عَلَى', 'قَدْرِ', 'أَهْلِ', 'الْعَزْمِ'],
      ['تَأْتِي', 'الْعَزَائِمُ'],
    ];
    const timings = computeWordTimingsFromAudio(makeMockBuffer(data), verseWords);
    expect(timings).not.toBeNull();
    expect(timings).toHaveLength(6);
    expect(timings[0].word).toBe('عَلَى');
  });

  it('accepts a native AudioBuffer-shaped object (no ToneAudioBuffer wrapper)', () => {
    // Some callers may pass a plain AudioBuffer-like object
    const data = buildAudioData(24000, [{ type: 'speech', durationMs: 300 }]);
    const plainBuffer = {
      loaded: true,
      sampleRate: 24000,
      duration: data.length / 24000,
      getChannelData: () => data,
    };
    const timings = computeWordTimingsFromAudio(plainBuffer, [['كلمة', 'شعر']]);
    expect(timings).not.toBeNull();
    expect(timings).toHaveLength(2);
  });
});
