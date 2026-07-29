import { describe, it, expect } from 'vitest';
import { evenDistributeTimings } from '../utils/evenDistributeTimings.js';

describe('evenDistributeTimings', () => {
  it('returns empty array for empty timings', () => {
    const result = evenDistributeTimings([], [0]);
    expect(result).toEqual([]);
  });

  it('returns empty array for null timings', () => {
    const result = evenDistributeTimings(null, [0]);
    expect(result).toEqual([]);
  });

  it('handles single verse with jittery input durations', () => {
    const timings = [
      { word: 'word1', start: 0, end: 0.05 },
      { word: 'word2', start: 0.05, end: 0.95 },
      { word: 'word3', start: 0.95, end: 1 },
      { word: 'word4', start: 1, end: 1.5 }
    ];

    const result = evenDistributeTimings(timings, [0]);

    // Should have 4 words
    expect(result).toHaveLength(4);

    // Should preserve words
    expect(result.map(r => r.word)).toEqual([
      'word1',
      'word2',
      'word3',
      'word4'
    ]);

    // Each word should get equal width of 0.375 (1.5 / 4)
    const expectedWidth = 1.5 / 4;
    for (let i = 0; i < 4; i++) {
      const width = result[i].end - result[i].start;
      expect(width).toBeCloseTo(expectedWidth, 5);
    }

    // First word should start at 0
    expect(result[0].start).toEqual(0);

    // Last word should end at 1.5
    expect(result[3].end).toEqual(1.5);

    // Starts should be monotonic
    for (let i = 1; i < result.length; i++) {
      expect(result[i].start).toBeGreaterThanOrEqual(result[i - 1].start);
    }

    // Each word's end should be >= start
    for (let i = 0; i < result.length; i++) {
      expect(result[i].end).toBeGreaterThanOrEqual(result[i].start);
    }
  });

  it('handles two verses with separate timing anchors', () => {
    const timings = [
      { word: 'verse1_word1', start: 0, end: 0.1 },
      { word: 'verse1_word2', start: 0.1, end: 0.5 },
      { word: 'verse1_word3', start: 0.5, end: 0.8 },
      { word: 'verse2_word1', start: 1, end: 1.2 },
      { word: 'verse2_word2', start: 1.2, end: 1.5 }
    ];

    const wordOffsets = [0, 3]; // Verse 1: indices 0-2, Verse 2: indices 3-4

    const result = evenDistributeTimings(timings, wordOffsets);

    expect(result).toHaveLength(5);

    // Verse 1: words 0-2 should span [0, 0.8]
    const verse1Duration = 0.8 - 0;
    const verse1WordWidth = verse1Duration / 3; // 0.2667
    for (let i = 0; i < 3; i++) {
      const width = result[i].end - result[i].start;
      expect(width).toBeCloseTo(verse1WordWidth, 5);
    }

    // Verse 1 should start at 0
    expect(result[0].start).toEqual(0);
    // Verse 1 should end at 0.8
    expect(result[2].end).toEqual(0.8);

    // Verse 2: words 3-4 should span [1, 1.5]
    const verse2Duration = 1.5 - 1;
    const verse2WordWidth = verse2Duration / 2; // 0.25
    for (let i = 3; i < 5; i++) {
      const width = result[i].end - result[i].start;
      expect(width).toBeCloseTo(verse2WordWidth, 5);
    }

    // Verse 2 should start at 1
    expect(result[3].start).toEqual(1);
    // Verse 2 should end at 1.5
    expect(result[4].end).toEqual(1.5);

    // Boundaries should be monotonic across verses
    expect(result[3].start).toBeGreaterThanOrEqual(result[2].end);

    // All starts should be monotonic
    for (let i = 1; i < result.length; i++) {
      expect(result[i].start).toBeGreaterThanOrEqual(result[i - 1].start);
    }
  });

  it('applies charWeighted distribution correctly', () => {
    const timings = [
      { word: 'a', start: 0, end: 0.1 }, // length 1
      { word: 'longer', start: 0.1, end: 0.5 }, // length 6
      { word: 'b', start: 0.5, end: 0.7 } // length 1
    ];

    const result = evenDistributeTimings(timings, [0], { charWeighted: true });

    expect(result).toHaveLength(3);

    // Total duration: 0.7
    // Total character count: 1 + 6 + 1 = 8
    // Expected widths: 0.7 * (1/8), 0.7 * (6/8), 0.7 * (1/8)
    const expectedWidths = [0.7 / 8, (0.7 * 6) / 8, 0.7 / 8];

    for (let i = 0; i < 3; i++) {
      const width = result[i].end - result[i].start;
      expect(width).toBeCloseTo(expectedWidths[i], 5);
    }

    // First should start at 0, last should end at 0.7
    expect(result[0].start).toEqual(0);
    expect(result[2].end).toEqual(0.7);
  });

  it('ensures monotonic starts across all words', () => {
    const timings = [
      { word: 'w1', start: 0, end: 0.1 },
      { word: 'w2', start: 0.1, end: 0.3 },
      { word: 'w3', start: 0.3, end: 0.5 },
      { word: 'w4', start: 0.5, end: 0.7 },
      { word: 'w5', start: 0.7, end: 1 }
    ];

    const result = evenDistributeTimings(timings, [0, 2, 4]);

    // Check strict monotonicity
    for (let i = 1; i < result.length; i++) {
      expect(result[i].start).toBeGreaterThanOrEqual(result[i - 1].start);
    }
  });

  it('guarantees start <= end for all words', () => {
    const timings = [
      { word: 'w1', start: 0, end: 0.3 },
      { word: 'w2', start: 0.3, end: 0.7 },
      { word: 'w3', start: 0.7, end: 1.2 }
    ];

    const result = evenDistributeTimings(timings, [0]);

    for (let i = 0; i < result.length; i++) {
      expect(result[i].start).toBeLessThanOrEqual(result[i].end);
    }
  });

  it('preserves word count from input', () => {
    const timings = Array.from({ length: 10 }, (_, i) => ({
      word: `word${i}`,
      start: i * 0.1,
      end: (i + 1) * 0.1
    }));

    const result = evenDistributeTimings(timings, [0, 3, 7]);

    expect(result).toHaveLength(timings.length);
  });

  it('preserves word strings from input', () => {
    const timings = [
      { word: 'hello', start: 0, end: 0.2 },
      { word: 'world', start: 0.2, end: 0.5 },
      { word: 'foo', start: 0.5, end: 0.8 }
    ];

    const result = evenDistributeTimings(timings, [0]);

    expect(result.map(r => r.word)).toEqual(['hello', 'world', 'foo']);
  });

  it('handles undefined wordOffsets by treating as single verse', () => {
    const timings = [
      { word: 'w1', start: 0, end: 0.2 },
      { word: 'w2', start: 0.2, end: 0.5 }
    ];

    const result = evenDistributeTimings(timings, undefined);

    expect(result).toHaveLength(2);
    expect(result[0].start).toEqual(0);
    expect(result[1].end).toEqual(0.5);
  });

  it('handles empty wordOffsets by treating as single verse', () => {
    const timings = [
      { word: 'w1', start: 0, end: 0.2 },
      { word: 'w2', start: 0.2, end: 0.5 }
    ];

    const result = evenDistributeTimings(timings, []);

    expect(result).toHaveLength(2);
    expect(result[0].start).toEqual(0);
    expect(result[1].end).toEqual(0.5);
  });

  it('no NaN values in output', () => {
    const timings = [
      { word: 'w1', start: 0, end: 0.5 },
      { word: 'w2', start: 0.5, end: 1 }
    ];

    const result = evenDistributeTimings(timings, [0]);

    for (let i = 0; i < result.length; i++) {
      expect(isNaN(result[i].start)).toBe(false);
      expect(isNaN(result[i].end)).toBe(false);
    }
  });

  it('handles segEnd < segStart by clamping', () => {
    const timings = [
      { word: 'w1', start: 0.5, end: 0.2 }, // end < start
      { word: 'w2', start: 0.2, end: 0.8 }
    ];

    const result = evenDistributeTimings(timings, [0, 1]);

    expect(result).toHaveLength(2);
    // Verse 0 has only word 0, with segStart=0.5, but end=0.2 < start, so clamped to 0.5
    expect(result[0].start).toEqual(0.5);
    expect(result[0].end).toEqual(0.5);
    // Verse 1 has word 1; its segStart=0.2, but monotonicity clamps it to prevSegEnd=0.5
    expect(result[1].start).toEqual(0.5);
    expect(result[1].end).toEqual(0.8);
  });

  it('handles three verses', () => {
    const timings = [
      { word: 'v1w1', start: 0, end: 0.1 },
      { word: 'v1w2', start: 0.1, end: 0.3 },
      { word: 'v2w1', start: 0.5, end: 0.6 },
      { word: 'v2w2', start: 0.6, end: 0.8 },
      { word: 'v3w1', start: 1, end: 1.5 }
    ];

    const wordOffsets = [0, 2, 4, 5]; // v1: 0-1, v2: 2-3, v3: 4-4

    const result = evenDistributeTimings(timings, wordOffsets);

    expect(result).toHaveLength(5);

    // Verse 0: words 0-1, span [0, 0.3]
    expect(result[0].start).toEqual(0);
    expect(result[1].end).toEqual(0.3);

    // Verse 1: words 2-3, span [0.5, 0.8]
    expect(result[2].start).toEqual(0.5);
    expect(result[3].end).toEqual(0.8);

    // Verse 2: word 4, span [1, 1.5]
    expect(result[4].start).toEqual(1);
    expect(result[4].end).toEqual(1.5);

    // Monotonic across boundaries
    expect(result[2].start).toBeGreaterThanOrEqual(result[1].end);
    expect(result[4].start).toBeGreaterThanOrEqual(result[3].end);
  });

  it('charWeighted with zero-length words (clamped to 1)', () => {
    const timings = [
      { word: '', start: 0, end: 0.2 }, // length 0, clamped to 1
      { word: 'ab', start: 0.2, end: 0.5 }, // length 2
      { word: '', start: 0.5, end: 0.8 } // length 0, clamped to 1
    ];

    const result = evenDistributeTimings(timings, [0], { charWeighted: true });

    // Total: 1 + 2 + 1 = 4, span [0, 0.8]
    const expectedWidths = [0.8 / 4, (0.8 * 2) / 4, 0.8 / 4];

    for (let i = 0; i < 3; i++) {
      const width = result[i].end - result[i].start;
      expect(width).toBeCloseTo(expectedWidths[i], 5);
    }
  });
});
