import { describe, it, expect } from 'vitest';
import { alignTranscriptTimings, normalizeArabic } from '../utils/alignTranscriptTimings.js';

/** Assert starts are monotonic non-decreasing and start <= end, no NaN. */
function assertWellFormed(timings, allWords) {
  expect(timings).toHaveLength(allWords.length);
  for (let i = 0; i < timings.length; i++) {
    expect(timings[i].word).toBe(allWords[i]);
    expect(Number.isFinite(timings[i].start)).toBe(true);
    expect(Number.isFinite(timings[i].end)).toBe(true);
    expect(timings[i].end).toBeGreaterThanOrEqual(timings[i].start);
    if (i > 0) expect(timings[i].start).toBeGreaterThanOrEqual(timings[i - 1].start);
  }
}

describe('normalizeArabic', () => {
  it('strips diacritics and the ال article', () => {
    // الْحُبُّ → drop harakat → الحب → drop leading ال → حب
    expect(normalizeArabic('الْحُبُّ')).toBe('حب');
  });

  it('treats hamza-on-alef forms as plain alef', () => {
    expect(normalizeArabic('أحمد')).toBe(normalizeArabic('احمد'));
    expect(normalizeArabic('إنسان')).toBe(normalizeArabic('انسان'));
    expect(normalizeArabic('آمن')).toBe(normalizeArabic('امن'));
  });

  it('unifies yaa/alef-maqsura and taa-marbuta', () => {
    expect(normalizeArabic('مصطفى')).toBe(normalizeArabic('مصطفي'));
    expect(normalizeArabic('مدينة')).toBe(normalizeArabic('مدينه'));
  });

  it('returns empty string for punctuation-only tokens', () => {
    expect(normalizeArabic('،')).toBe('');
    expect(normalizeArabic('...')).toBe('');
    expect(normalizeArabic('')).toBe('');
  });

  it('does not strip ال when no real stem would remain', () => {
    // 'ال' alone (len 2) must not become ''
    expect(normalizeArabic('ال')).toBe('ال');
  });
});

describe('alignTranscriptTimings', () => {
  it('returns null for empty inputs', () => {
    expect(alignTranscriptTimings([], [{ word: 'x', start: 0, end: 1 }])).toBeNull();
    expect(alignTranscriptTimings(['x'], [])).toBeNull();
    expect(alignTranscriptTimings(null, null)).toBeNull();
  });

  it('aligns an exact 1:1 sequence with confidence 1', () => {
    const allWords = ['بسم', 'الله', 'الرحمن'];
    const transcript = [
      { word: 'بسم', start: 0, end: 0.5 },
      { word: 'الله', start: 0.5, end: 1.0 },
      { word: 'الرحمن', start: 1.0, end: 1.8 },
    ];
    const res = alignTranscriptTimings(allWords, transcript);
    expect(res).not.toBeNull();
    expect(res.confidence).toBe(1);
    assertWellFormed(res.timings, allWords);
    expect(res.timings[0]).toMatchObject({ start: 0, end: 0.5 });
    expect(res.timings[2]).toMatchObject({ start: 1.0, end: 1.8 });
  });

  it('matches despite diacritic differences between transcript and display', () => {
    const allWords = ['الْحُبُّ', 'كبيرٌ'];
    const transcript = [
      { word: 'الحب', start: 0, end: 0.6 },
      { word: 'كبير', start: 0.6, end: 1.2 },
    ];
    const res = alignTranscriptTimings(allWords, transcript);
    expect(res.confidence).toBe(1);
    assertWellFormed(res.timings, allWords);
    expect(res.timings[0]).toMatchObject({ start: 0, end: 0.6 });
  });

  it('stays monotonic when the transcript has an extra filler token', () => {
    const allWords = ['قف', 'نبك', 'لذكرى'];
    const transcript = [
      { word: 'قف', start: 0, end: 0.4 },
      { word: 'اه', start: 0.4, end: 0.6 }, // filler not in display
      { word: 'نبك', start: 0.6, end: 1.0 },
      { word: 'لذكرى', start: 1.0, end: 1.5 },
    ];
    const res = alignTranscriptTimings(allWords, transcript);
    expect(res.confidence).toBeGreaterThan(0.5);
    assertWellFormed(res.timings, allWords);
    // 'نبك' should pick up the real spoken time, not the filler's
    expect(res.timings[1]).toMatchObject({ start: 0.6, end: 1.0 });
  });

  it('interpolates a display token absent from the transcript', () => {
    const allWords = ['الديار', 'بسقط', 'اللوى'];
    const transcript = [
      { word: 'الديار', start: 0, end: 0.5 },
      // 'بسقط' missing from transcript
      { word: 'اللوى', start: 1.0, end: 1.6 },
    ];
    const res = alignTranscriptTimings(allWords, transcript);
    assertWellFormed(res.timings, allWords);
    const mid = res.timings[1];
    // interpolated strictly between the two anchors
    expect(mid.start).toBeGreaterThanOrEqual(0.5);
    expect(mid.start).toBeLessThanOrEqual(1.0);
    expect(Number.isNaN(mid.start)).toBe(false);
  });

  it('handles a leading unmatched run', () => {
    const allWords = ['يا', 'ليل', 'الصب'];
    const transcript = [
      // 'يا' missing — leading gap
      { word: 'ليل', start: 0.3, end: 0.7 },
      { word: 'الصب', start: 0.7, end: 1.2 },
    ];
    const res = alignTranscriptTimings(allWords, transcript);
    assertWellFormed(res.timings, allWords);
    expect(res.timings[0].start).toBeGreaterThanOrEqual(0);
    expect(res.timings[0].start).toBeLessThanOrEqual(0.3);
  });

  it('spreads evenly when nothing matches (confidence 0)', () => {
    const allWords = ['aaa', 'bbb'];
    const transcript = [{ word: 'zzz', start: 0, end: 2 }];
    const res = alignTranscriptTimings(allWords, transcript);
    expect(res.confidence).toBe(0);
    assertWellFormed(res.timings, allWords);
    expect(res.timings[0].start).toBe(0);
    expect(res.timings[res.timings.length - 1].end).toBeCloseTo(2, 5);
  });
});
