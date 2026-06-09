import { describe, it, expect } from 'vitest';
import { verseSyllableWeightedTimings, wordMoras } from '../utils/verseSyllableWeightedTimings.js';
import { verseLetterWeightedTimings } from '../utils/verseLetterWeightedTimings.js';

describe('wordMoras (tashkeel-aware mora count)', () => {
  // Exact-count assertions — the crux. Without these, a wordMoras that secretly
  // returned word.length would still pass every distribution test below.
  it('counts short-vowel nuclei', () => {
    expect(wordMoras('كَتَبَ')).toBe(3); // ka-ta-ba, three short syllables
  });

  it('counts a long vowel (madd) as added length, not a new nucleus', () => {
    expect(wordMoras('كِتَاب')).toBe(3); // ki-taab: kasra + fatha + madd-alef
    expect(wordMoras('بَاب')).toBe(2); // baab: fatha + madd-alef
  });

  it('counts dagger / superscript alef (U+0670) as a long nucleus', () => {
    expect(wordMoras('هٰذَا')).toBe(4); // haa(dagger)-dhaa, missed if U+0670 ignored
  });

  it('counts alef maddah آ (U+0622) as a long nucleus', () => {
    expect(wordMoras('آمَنُوا')).toBe(5); // aa-ma-nuu + silent wiqaya alef
  });

  it('counts tanwin as a single nucleus', () => {
    expect(wordMoras('كِتَابًا')).toBe(4); // ki-taa-ban: kasra + fatha + madd + tanwin
  });

  it('counts shadda gemination as added length', () => {
    expect(wordMoras('شَدَّة')).toBe(3); // shad-da: fatha + shadda + fatha
  });

  it('handles the definite article + sukoon', () => {
    expect(wordMoras('الشَّمْس')).toBe(2); // ash-shams
  });

  it('does NOT count a consonantal waw/yaa as madd', () => {
    expect(wordMoras('يَد')).toBe(1); // ya-d: initial yaa is a consonant
    expect(wordMoras('وَلَدِي')).toBe(4); // initial waw consonant, final yaa madd
  });

  it('falls back to ceil(letters/2) for an unvocalized word', () => {
    expect(wordMoras('كتب')).toBe(2); // no diacritics → ceil(3/2)
  });

  it('floors at 1 for punctuation-only tokens', () => {
    expect(wordMoras('،')).toBe(1);
    expect(wordMoras('')).toBe(1);
  });

  it('is invariant under NFC/NFD normalization', () => {
    const w = 'آمَنُوا';
    expect(wordMoras(w.normalize('NFD'))).toBe(wordMoras(w.normalize('NFC')));
    const hamza = 'أَكَلَ';
    expect(wordMoras(hamza.normalize('NFD'))).toBe(wordMoras(hamza.normalize('NFC')));
  });
});

describe('verseSyllableWeightedTimings', () => {
  it('returns empty array for empty or null timings', () => {
    expect(verseSyllableWeightedTimings([], [0])).toEqual([]);
    expect(verseSyllableWeightedTimings(null, [0])).toEqual([]);
  });

  it('preserves the verse span and word order', () => {
    const timings = [
      { word: 'بَاب', start: 0, end: 0.1 },
      { word: 'نُور', start: 0.1, end: 0.9 },
      { word: 'ذَهَب', start: 0.9, end: 2.0 },
    ];
    const result = verseSyllableWeightedTimings(timings, [0]);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.word)).toEqual(['بَاب', 'نُور', 'ذَهَب']);
    // Verse keeps its transcript start/end
    expect(result[0].start).toBeCloseTo(0, 6);
    expect(result[2].end).toBeCloseTo(2.0, 6);
  });

  it('word durations sum to the verse span; last word ends exactly at segEnd', () => {
    const timings = [
      { word: 'قَالَ', start: 0, end: 0.3 },
      { word: 'كِتَاب', start: 0.3, end: 0.5 },
      { word: 'هٰذَا', start: 0.5, end: 1.6 },
    ];
    const result = verseSyllableWeightedTimings(timings, [0]);
    const span = result[result.length - 1].end - result[0].start;
    const summed = result.reduce((s, r) => s + (r.end - r.start), 0);
    expect(summed).toBeCloseTo(span, 6);
    expect(result[2].end).toBeCloseTo(1.6, 6);
  });

  it('diverges from letter-weighting (the point of the mode)', () => {
    // نُور (4 codepoints, 2 morae) vs ذَهَب (5 codepoints, 2 morae):
    // equal morae but unequal letters → equal width under syllables,
    // unequal width under letters.
    const timings = [
      { word: 'نُور', start: 0, end: 1 },
      { word: 'ذَهَب', start: 1, end: 2 },
    ];
    const syl = verseSyllableWeightedTimings(timings, [0]);
    const let_ = verseLetterWeightedTimings(timings.map((t) => ({ ...t })), [0]);

    const sylW0 = syl[0].end - syl[0].start;
    const sylW1 = syl[1].end - syl[1].start;
    const letW0 = let_[0].end - let_[0].start;
    const letW1 = let_[1].end - let_[1].start;

    // Equal morae → equal widths under syllable weighting
    expect(sylW0).toBeCloseTo(sylW1, 6);
    // Unequal letters → unequal widths under letter weighting
    expect(Math.abs(letW0 - letW1)).toBeGreaterThan(0.05);
    // And the two modes produce different distributions
    expect(Math.abs(sylW0 - letW0)).toBeGreaterThan(0.01);
  });

  it('distributes by mora weight within a verse', () => {
    // بَاب (2 morae) then كَتَبَ (3 morae) across a 1.0s span → 2:3 split
    const timings = [
      { word: 'بَاب', start: 0, end: 0.05 },
      { word: 'كَتَبَ', start: 0.05, end: 1.0 },
    ];
    const result = verseSyllableWeightedTimings(timings, [0]);
    expect(result[0].end - result[0].start).toBeCloseTo(0.4, 5); // 2/5
    expect(result[1].end - result[1].start).toBeCloseTo(0.6, 5); // 3/5
  });

  it('handles multiple verses, anchoring each to its own span', () => {
    const timings = [
      { word: 'بَاب', start: 0, end: 0.2 },
      { word: 'نُور', start: 0.2, end: 1.0 },
      { word: 'قَالَ', start: 1.0, end: 1.4 },
      { word: 'ذَهَب', start: 1.4, end: 2.5 },
    ];
    const wordOffsets = [0, 2];
    const result = verseSyllableWeightedTimings(timings, wordOffsets);
    // verse 1 span [0, 1.0], verse 2 span [1.0, 2.5] preserved
    expect(result[0].start).toBeCloseTo(0, 6);
    expect(result[1].end).toBeCloseTo(1.0, 6);
    expect(result[2].start).toBeCloseTo(1.0, 6);
    expect(result[3].end).toBeCloseTo(2.5, 6);
  });

  it('handles single verse with no wordOffsets', () => {
    const timings = [
      { word: 'بَاب', start: 0, end: 0.5 },
      { word: 'نُور', start: 0.5, end: 1.5 },
    ];
    const result = verseSyllableWeightedTimings(timings, []);
    expect(result).toHaveLength(2);
    expect(result[1].end).toBeCloseTo(1.5, 6);
  });

  it('does not divide by zero when a verse is punctuation-only', () => {
    const timings = [
      { word: '،', start: 0, end: 0.5 },
      { word: '.', start: 0.5, end: 1.0 },
    ];
    const result = verseSyllableWeightedTimings(timings, [0]);
    expect(result).toHaveLength(2);
    result.forEach((r) => expect(Number.isFinite(r.start) && Number.isFinite(r.end)).toBe(true));
    expect(result[1].end).toBeCloseTo(1.0, 6);
  });
});
