import { describe, it, expect } from 'vitest';
import { chunkStanzas } from '../utils/chunkStanzas.js';

describe('chunkStanzas', () => {
  const makePairs = (n) =>
    Array.from({ length: n }, (_, i) => ({ ar: `بيت ${i + 1}`, en: `line ${i + 1}` }));

  it('returns [] for an empty array', () => {
    expect(chunkStanzas([])).toEqual([]);
  });

  it('returns [] for null/undefined', () => {
    expect(chunkStanzas(null)).toEqual([]);
    expect(chunkStanzas(undefined)).toEqual([]);
  });

  it('returns one group when pairs < size', () => {
    const pairs = makePairs(3);
    const result = chunkStanzas(pairs, 4);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(3);
  });

  it('returns one group when pairs === size', () => {
    const pairs = makePairs(4);
    const result = chunkStanzas(pairs, 4);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(4);
  });

  it('returns two even groups for an exact multiple', () => {
    const pairs = makePairs(8);
    const result = chunkStanzas(pairs, 4);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(4);
    expect(result[1]).toHaveLength(4);
  });

  it('puts the remainder in the last group', () => {
    const pairs = makePairs(6);
    const result = chunkStanzas(pairs, 4);
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(4);
    expect(result[1]).toHaveLength(2);
  });

  it('defaults to size 4 when no size argument is given', () => {
    const pairs = makePairs(9);
    const result = chunkStanzas(pairs);
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveLength(4);
    expect(result[1]).toHaveLength(4);
    expect(result[2]).toHaveLength(1);
  });

  it('uses size 1 as the minimum (clamps fractional sizes)', () => {
    const pairs = makePairs(3);
    const result = chunkStanzas(pairs, 0);
    // size clamped to 1 → 3 groups of 1
    expect(result).toHaveLength(3);
    result.forEach((g) => expect(g).toHaveLength(1));
  });

  it('preserves the original pair objects by reference', () => {
    const pairs = makePairs(4);
    const result = chunkStanzas(pairs, 4);
    expect(result[0][0]).toBe(pairs[0]);
    expect(result[0][3]).toBe(pairs[3]);
  });

  it('handles a single pair', () => {
    const pairs = makePairs(1);
    const result = chunkStanzas(pairs);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(1);
  });
});
