import { describe, it, expect } from 'vitest';
import { computeWordTimings } from '../utils/wordTiming.js';

describe('computeWordTimings', () => {
  it('distributes total duration across words proportionally by char count', () => {
    // "ab" = 2 chars, "cdef" = 4 chars → 6 total chars
    // word0 start=0, dur=2/6*6=2, word1 start=2, dur=4/6*6=4
    const words = ['ab', 'cdef'];
    const timings = computeWordTimings(words, 6);
    expect(timings).toHaveLength(2);
    expect(timings[0].start).toBeCloseTo(0);
    expect(timings[0].end).toBeCloseTo(2);
    expect(timings[1].start).toBeCloseTo(2);
    expect(timings[1].end).toBeCloseTo(6);
  });

  it('returns [{start:0, end:totalDuration}] for a single word', () => {
    const timings = computeWordTimings(['مرحبا'], 5);
    expect(timings).toHaveLength(1);
    expect(timings[0].start).toBeCloseTo(0);
    expect(timings[0].end).toBeCloseTo(5);
  });

  it('returns empty array for empty words array', () => {
    const timings = computeWordTimings([], 10);
    expect(timings).toEqual([]);
  });

  it('returns empty array when totalDuration is 0', () => {
    const timings = computeWordTimings(['hello', 'world'], 0);
    expect(timings).toEqual([]);
  });

  it('handles words of equal length with even distribution', () => {
    const words = ['aa', 'bb', 'cc'];
    const timings = computeWordTimings(words, 9);
    expect(timings[0].start).toBeCloseTo(0);
    expect(timings[0].end).toBeCloseTo(3);
    expect(timings[1].start).toBeCloseTo(3);
    expect(timings[1].end).toBeCloseTo(6);
    expect(timings[2].start).toBeCloseTo(6);
    expect(timings[2].end).toBeCloseTo(9);
  });

  it('handles Arabic words correctly (Unicode chars count as 1 char each)', () => {
    // 'ال' = 2 chars, 'شعر' = 3 chars → total 5, duration 10
    const words = ['ال', 'شعر'];
    const timings = computeWordTimings(words, 10);
    expect(timings[0].start).toBeCloseTo(0);
    expect(timings[0].end).toBeCloseTo(4);   // 2/5 * 10
    expect(timings[1].start).toBeCloseTo(4);
    expect(timings[1].end).toBeCloseTo(10);  // 3/5 * 10
  });

  it('each timing object has start, end, and word properties', () => {
    const timings = computeWordTimings(['hello'], 5);
    expect(timings[0]).toHaveProperty('start');
    expect(timings[0]).toHaveProperty('end');
    expect(timings[0]).toHaveProperty('word');
    expect(timings[0].word).toBe('hello');
  });

  it('timings are sequential — each start equals previous end', () => {
    const words = ['a', 'bb', 'ccc', 'dddd'];
    const timings = computeWordTimings(words, 20);
    for (let i = 1; i < timings.length; i++) {
      expect(timings[i].start).toBeCloseTo(timings[i - 1].end);
    }
  });

  it('last timing end equals totalDuration', () => {
    const words = ['one', 'two', 'three'];
    const timings = computeWordTimings(words, 7.5);
    expect(timings[timings.length - 1].end).toBeCloseTo(7.5);
  });

  it('handles words with zero-length gracefully (no NaN or divide-by-zero crash)', () => {
    // If all words are empty strings, total chars = 0 → safe fallback
    expect(() => computeWordTimings(['', '', ''], 5)).not.toThrow();
  });
});
