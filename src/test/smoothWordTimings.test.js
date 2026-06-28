import { describe, it, expect } from 'vitest';
import { smoothWordTimings } from '../utils/smoothWordTimings.js';

describe('smoothWordTimings', () => {
  it('handles empty timings', () => {
    const result = smoothWordTimings([]);
    expect(result).toEqual([]);
  });

  it('handles single word', () => {
    const timings = [{ word: 'hello', start: 0, end: 1 }];
    const result = smoothWordTimings(timings);
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe('hello');
    expect(result[0].start).toBe(0);
    expect(result[0].end).toBe(1);
  });

  it('removes flash (zero-duration word)', () => {
    const timings = [
      { word: 'one', start: 0, end: 0.5 },
      { word: 'two', start: 0.5, end: 0.5 }, // flash: 0 duration
      { word: 'three', start: 0.5, end: 1.0 },
    ];
    const result = smoothWordTimings(timings, { minDwell: 0.18 });

    expect(result).toHaveLength(3);
    expect(result[0].word).toBe('one');
    expect(result[1].word).toBe('two');
    expect(result[2].word).toBe('three');

    // Check total span is preserved
    expect(result[0].start).toBe(0);
    expect(result[2].end).toBeCloseTo(1.0, 5);

    // Check each word >= minDwell
    for (let i = 0; i < 3; i++) {
      const dur = result[i].end - result[i].start;
      expect(dur).toBeGreaterThanOrEqual(0.18 - 1e-6); // account for float precision
    }

    // Check monotonic non-decreasing
    for (let i = 1; i < 3; i++) {
      expect(result[i].start).toBeGreaterThanOrEqual(result[i - 1].start);
    }

    // Check end >= start for each
    for (let i = 0; i < 3; i++) {
      expect(result[i].end).toBeGreaterThanOrEqual(result[i].start);
    }

    // No NaN
    for (let i = 0; i < 3; i++) {
      expect(Number.isNaN(result[i].start)).toBe(false);
      expect(Number.isNaN(result[i].end)).toBe(false);
    }
  });

  it('handles stick word (runaway long)', () => {
    const timings = [
      { word: 'short1', start: 0, end: 0.1 },
      { word: 'short2', start: 0.1, end: 0.2 },
      { word: 'long', start: 0.2, end: 2.0 },
    ];
    const result = smoothWordTimings(timings, { minDwell: 0.18 });

    expect(result).toHaveLength(3);

    // Check total span is preserved
    expect(result[0].start).toBeCloseTo(0, 5);
    expect(result[2].end).toBeCloseTo(2.0, 5);

    // Check each word >= minDwell
    const dur0 = result[0].end - result[0].start;
    const dur1 = result[1].end - result[1].start;
    const dur2 = result[2].end - result[2].start;
    expect(dur0).toBeGreaterThanOrEqual(0.18 - 1e-6);
    expect(dur1).toBeGreaterThanOrEqual(0.18 - 1e-6);
    expect(dur2).toBeGreaterThanOrEqual(0.18 - 1e-6);

    // Check long word is still longest but < original 1.8
    expect(dur2).toBeLessThan(1.8);
    expect(dur2).toBeGreaterThan(dur0);
    expect(dur2).toBeGreaterThan(dur1);

    // Check monotonic and valid
    for (let i = 1; i < 3; i++) {
      expect(result[i].start).toBeGreaterThanOrEqual(result[i - 1].start);
      expect(result[i].end).toBeGreaterThanOrEqual(result[i].start);
    }

    // No NaN
    for (let i = 0; i < 3; i++) {
      expect(Number.isNaN(result[i].start)).toBe(false);
      expect(Number.isNaN(result[i].end)).toBe(false);
    }
  });

  it('handles not-enough-room case (even split)', () => {
    const timings = [
      { word: 'a', start: 0, end: 0.05 },
      { word: 'b', start: 0.05, end: 0.1 },
      { word: 'c', start: 0.1, end: 0.15 },
      { word: 'd', start: 0.15, end: 0.2 },
      { word: 'e', start: 0.2, end: 0.25 },
    ];
    // span: [0, 0.25], total = 0.25. N = 5, minDwell = 0.18. N * minDwell = 0.9 > 0.25
    const result = smoothWordTimings(timings, { minDwell: 0.18 });

    expect(result).toHaveLength(5);

    // Check total span
    expect(result[0].start).toBeCloseTo(0, 5);
    expect(result[4].end).toBeCloseTo(0.25, 5);

    // Each word should get 0.25 / 5 = 0.05
    const expectedDur = 0.25 / 5;
    for (let i = 0; i < 5; i++) {
      const dur = result[i].end - result[i].start;
      expect(dur).toBeCloseTo(expectedDur, 5);
    }

    // Check monotonic and valid
    for (let i = 1; i < 5; i++) {
      expect(result[i].start).toBeGreaterThanOrEqual(result[i - 1].start);
      expect(result[i].end).toBeGreaterThanOrEqual(result[i].start);
    }

    // No NaN
    for (let i = 0; i < 5; i++) {
      expect(Number.isNaN(result[i].start)).toBe(false);
      expect(Number.isNaN(result[i].end)).toBe(false);
    }
  });

  it('preserves length and basic properties', () => {
    const timings = [
      { word: 'alpha', start: 0, end: 0.3 },
      { word: 'beta', start: 0.3, end: 0.6 },
      { word: 'gamma', start: 0.6, end: 1.2 },
      { word: 'delta', start: 1.2, end: 1.5 },
    ];
    const result = smoothWordTimings(timings, { minDwell: 0.15 });

    // Same length
    expect(result).toHaveLength(timings.length);

    // Words preserved in order
    for (let i = 0; i < result.length; i++) {
      expect(result[i].word).toBe(timings[i].word);
    }

    // Span preserved
    expect(result[0].start).toBeCloseTo(0, 5);
    expect(result[result.length - 1].end).toBeCloseTo(1.5, 5);

    // Monotonic
    for (let i = 1; i < result.length; i++) {
      expect(result[i].start).toBeGreaterThanOrEqual(result[i - 1].start);
    }

    // Each word >= minDwell
    for (let i = 0; i < result.length; i++) {
      const dur = result[i].end - result[i].start;
      expect(dur).toBeGreaterThanOrEqual(0.15 - 1e-6);
    }

    // No NaN
    for (let i = 0; i < result.length; i++) {
      expect(Number.isNaN(result[i].start)).toBe(false);
      expect(Number.isNaN(result[i].end)).toBe(false);
    }
  });
});
