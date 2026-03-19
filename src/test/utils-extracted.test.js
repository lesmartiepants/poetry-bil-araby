import { describe, it, expect, beforeEach } from 'vitest';
import { transliterate } from '../utils/transliterate.js';
import { filterPoemsByCategory } from '../utils/filterPoems.js';
import {
  getSeenPoems,
  markPoemSeen,
  pruneSeenPoems,
  getRecentSeenIds,
} from '../utils/seenPoems.js';

describe('transliterate', () => {
  it('returns empty string for falsy input', () => {
    expect(transliterate('')).toBe('');
    expect(transliterate(null)).toBe('');
    expect(transliterate(undefined)).toBe('');
  });

  it('transliterates basic Arabic letters', () => {
    expect(transliterate('بسم')).toBe('bsm');
  });

  it('passes through Latin characters', () => {
    expect(transliterate('hello')).toBe('hello');
  });

  it('handles Arabic punctuation', () => {
    expect(transliterate('،')).toBe(',');
    expect(transliterate('؟')).toBe('?');
  });

  it('strips zero-width characters', () => {
    expect(transliterate('\u200C')).toBe('');
    expect(transliterate('\u200D')).toBe('');
  });

  it('handles shadda by doubling previous consonant', () => {
    // shadda after ba should double it
    expect(transliterate('بّ')).toBe('bb');
  });
});

describe('filterPoemsByCategory', () => {
  const poems = [
    { poet: 'Nizar Qabbani', poetArabic: 'نزار قباني', tags: ['Modern'] },
    { poet: 'Al-Mutanabbi', poetArabic: 'المتنبي', tags: ['Classical'] },
  ];

  it('returns all poems for "All" category', () => {
    expect(filterPoemsByCategory(poems, 'All')).toEqual(poems);
  });

  it('filters by English poet name', () => {
    const result = filterPoemsByCategory(poems, 'Nizar Qabbani');
    expect(result).toHaveLength(1);
    expect(result[0].poet).toBe('Nizar Qabbani');
  });

  it('filters by Arabic poet name', () => {
    const result = filterPoemsByCategory(poems, 'المتنبي');
    expect(result).toHaveLength(1);
    expect(result[0].poetArabic).toBe('المتنبي');
  });

  it('filters by tag', () => {
    const result = filterPoemsByCategory(poems, 'modern');
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no match', () => {
    const result = filterPoemsByCategory(poems, 'nonexistent');
    expect(result).toHaveLength(0);
  });
});

describe('seenPoems', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when no seen poems', () => {
    expect(getSeenPoems()).toEqual([]);
  });

  it('marks a poem as seen and retrieves it', () => {
    markPoemSeen(42);
    const seen = getSeenPoems();
    expect(seen).toHaveLength(1);
    expect(seen[0].id).toBe(42);
    expect(seen[0]).toHaveProperty('seenAt');
  });

  it('does not duplicate entries for the same poem', () => {
    markPoemSeen(42);
    markPoemSeen(42);
    expect(getSeenPoems()).toHaveLength(1);
  });

  it('pruneSeenPoems removes old entries', () => {
    // Manually insert an old entry
    const oldEntry = { id: 1, seenAt: Date.now() - 31 * 24 * 60 * 60 * 1000 };
    const newEntry = { id: 2, seenAt: Date.now() };
    localStorage.setItem('seenPoems', JSON.stringify([oldEntry, newEntry]));

    pruneSeenPoems();
    const seen = getSeenPoems();
    expect(seen).toHaveLength(1);
    expect(seen[0].id).toBe(2);
  });

  it('getRecentSeenIds returns max 200 IDs', () => {
    const entries = Array.from({ length: 250 }, (_, i) => ({ id: i, seenAt: Date.now() }));
    localStorage.setItem('seenPoems', JSON.stringify(entries));

    const ids = getRecentSeenIds();
    expect(ids).toHaveLength(200);
    // Should be the last 200 (50-249)
    expect(ids[0]).toBe(50);
  });
});
