import { describe, it, expect } from 'vitest';
import { buildLiveWordTimings } from '../utils/liveWordTiming.js';

describe('buildLiveWordTimings', () => {
  it('recovers words from a pre-audio first fragment (no zero-duration collapse)', () => {
    // The first transcription arrives before any audio byte, so it AND the next
    // fragment both stamp at byte 0. They must share the first real span, not vanish.
    const SR = 24000, BPS = 2; // 48000 bytes = 1.0s
    const fragments = [
      { text: 'قف نبك', audioBytesBefore: 0 },
      { text: 'من', audioBytesBefore: 2 }, // 2 bytes = pre-audio burst, must still merge
      { text: 'ذكرى', audioBytesBefore: 48000 },
    ];
    const out = buildLiveWordTimings(fragments, 96000); // 2.0s total
    const words = out.map((w) => w.word);
    expect(words).toEqual(['قف', 'نبك', 'من', 'ذكرى']);
    // none collapsed to zero duration
    for (const w of out) expect(w.end).toBeGreaterThan(w.start);
    expect(out[0].start).toBe(0);
    // the three pre-audio words share [0, 1.0s]; ذكرى takes [1.0, 2.0s]
    expect(out[2].end).toBeCloseTo(1.0, 5);
    expect(out[3].start).toBeCloseTo(1.0, 5);
    expect(out[3].end).toBeCloseTo(2.0, 5);
    // monotonic
    for (let i = 1; i < out.length; i++) expect(out[i].start).toBeGreaterThanOrEqual(out[i - 1].start);
  });

  it('empty fragments array returns empty timings', () => {
    const result = buildLiveWordTimings([], 48000);
    expect(result).toEqual([]);
  });

  it('totalAudioBytes 0 returns empty timings', () => {
    const result = buildLiveWordTimings([{ text: 'hello', audioBytesBefore: 0 }], 0);
    expect(result).toEqual([]);
  });

  it('single fragment with Arabic text spanning 1.0s distributes time proportionally', () => {
    // 24000 Hz * 2 bytes/sample = 48000 bytes per second
    // Fragment: "بسم الله" starts at byte 0, next is at 48000 (1.0s)
    const result = buildLiveWordTimings(
      [{ text: 'بسم الله', audioBytesBefore: 0 }],
      48000
    );

    expect(result).toHaveLength(2);
    expect(result[0].word).toBe('بسم');
    expect(result[1].word).toBe('الله');

    // "بسم" is 3 chars, "الله" is 4 chars, total 7 chars
    // "بسم" gets 3/7 = 0.428... of the 1.0s span
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBeCloseTo(3 / 7, 5);
    expect(result[1].start).toBeCloseTo(3 / 7, 5);
    expect(result[1].end).toBeCloseTo(1.0, 5);
  });

  it('multiple fragments preserve ordering and maintain monotonic boundaries', () => {
    const result = buildLiveWordTimings(
      [
        { text: 'hello world', audioBytesBefore: 0 },
        { text: 'foo bar', audioBytesBefore: 24000 }, // 0.5s
      ],
      48000 // 1.0s total
    );

    expect(result).toHaveLength(4);
    expect(result.map((t) => t.word)).toEqual(['hello', 'world', 'foo', 'bar']);

    // First fragment spans [0, 0.5s), second spans [0.5s, 1.0s)
    // Both have 2 words of equal length (5 chars each for "hello"/"world", "foo" 3 + "bar" 3)
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBeCloseTo(0.25, 5); // first word in first fragment
    expect(result[1].start).toBeCloseTo(0.25, 5);
    expect(result[1].end).toBeCloseTo(0.5, 5); // end of first fragment

    expect(result[2].start).toBeCloseTo(0.5, 5);
    expect(result[3].end).toBeCloseTo(1.0, 5);
  });

  it('filters empty fragments and whitespace-only text', () => {
    const result = buildLiveWordTimings(
      [
        { text: 'hello', audioBytesBefore: 0 },
        { text: '   ', audioBytesBefore: 24000 }, // whitespace only
        { text: 'world', audioBytesBefore: 36000 },
      ],
      48000
    );

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.word)).toEqual(['hello', 'world']);
  });

  it('clamped fragmentEnd is at least fragmentStart (zero-duration fragment)', () => {
    const result = buildLiveWordTimings(
      [
        { text: 'first', audioBytesBefore: 0 },
        { text: 'second', audioBytesBefore: 24000 },
        { text: 'third', audioBytesBefore: 24000 }, // same byte offset = zero duration
      ],
      48000
    );

    // "third" should have zero duration and be skipped (filtered out)
    expect(result.length).toBeLessThan(4);
  });

  it('enforces monotonic non-decreasing start times', () => {
    const result = buildLiveWordTimings(
      [{ text: 'a bb cccc dddddd', audioBytesBefore: 0 }],
      48000
    );

    for (let i = 1; i < result.length; i++) {
      expect(result[i].start).toBeGreaterThanOrEqual(result[i - 1].start);
      expect(result[i].start).toBeLessThanOrEqual(result[i].end);
    }
  });

  it('end >= start after monotonic clamp (overlapping fragments)', () => {
    // Fragment 2 starts at byte 0 (same as fragment 1) → its words get clamped.
    // After clamping start forward, end must also be clamped so end >= start.
    const result = buildLiveWordTimings(
      [
        { text: 'alpha beta', audioBytesBefore: 0 },
        { text: 'gamma', audioBytesBefore: 0 }, // same start → overlaps with fragment 1
      ],
      48000
    );

    for (let i = 0; i < result.length; i++) {
      expect(result[i].end).toBeGreaterThanOrEqual(result[i].start);
    }
  });

  it('handles custom sampleRate and bytesPerSample', () => {
    // 16000 Hz * 2 bytes/sample = 32000 bytes per second
    const result = buildLiveWordTimings(
      [{ text: 'hello world', audioBytesBefore: 0 }],
      32000, // 1.0s at 16000 Hz
      { sampleRate: 16000, bytesPerSample: 2 }
    );

    expect(result).toHaveLength(2);
    expect(result[0].start).toBe(0);
    expect(result[1].end).toBeCloseTo(1.0, 5);
  });

  it('returns empty when fragments have no valid words', () => {
    const result = buildLiveWordTimings(
      [
        { text: '', audioBytesBefore: 0 },
        { text: '   ', audioBytesBefore: 24000 },
      ],
      48000
    );

    expect(result).toEqual([]);
  });

  it('word boundaries are consecutive (no gaps)', () => {
    const result = buildLiveWordTimings(
      [
        { text: 'one two three', audioBytesBefore: 0 },
        { text: 'four five', audioBytesBefore: 32000 },
      ],
      48000
    );

    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i + 1].start).toBeCloseTo(result[i].end, 10);
    }
  });
});
