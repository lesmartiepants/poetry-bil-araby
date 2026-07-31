import { describe, expect, it } from 'vitest';
import {
  applyLiveTimingProfile,
  DEFAULT_LIVE_TIMING_PROFILE,
  LIVE_TIMING_PROFILE_OPTIONS,
} from '../utils/liveTimingProfiles.js';

const aligned = [
  { word: 'بَاب', start: 1, end: 1.2 },
  { word: 'كَتَبَ', start: 1.2, end: 2 },
  { word: 'نُور', start: 2, end: 2.5 },
];
const fallback = [
  { word: 'بَاب', start: 0, end: 0.4 },
  { word: 'كَتَبَ', start: 0.4, end: 0.8 },
  { word: 'نُور', start: 0.8, end: 1.2 },
];

describe('live timing profiles', () => {
  it('defaults to the held-out transcript-mora leader and exposes its audited result', () => {
    expect(DEFAULT_LIVE_TIMING_PROFILE).toBe('branch-transcript-moras');
    expect(LIVE_TIMING_PROFILE_OPTIONS[0]).toMatchObject({
      value: DEFAULT_LIVE_TIMING_PROFILE,
      label: 'transcript + moras [64.9% exact word]',
    });
    expect(LIVE_TIMING_PROFILE_OPTIONS).toHaveLength(9);
  });

  it('keeps the weighted fallback until a transcript-anchored verse has boundaries', () => {
    const result = applyLiveTimingProfile({
      profile: 'transcript-moras-weighted-fallback',
      alignedTimings: aligned,
      fallbackTimings: fallback,
      wordOffsets: [0],
      directMatches: [true, false, false],
    });
    expect(result).toEqual(fallback);
  });

  it('reallocates a bounded verse by mora mass once its boundary anchors arrive', () => {
    const result = applyLiveTimingProfile({
      profile: 'transcript-moras-weighted-fallback',
      alignedTimings: aligned,
      fallbackTimings: fallback,
      wordOffsets: [0],
      directMatches: [true, true, true],
    });
    expect(result[0].start).toBeCloseTo(1);
    expect(result[2].end).toBeCloseTo(2.5);
    expect(result[0].end - result[0].start).toBeLessThan(result[1].end - result[1].start);
  });

  it('holds full-segment blends on fallback until every word is directly matched', () => {
    const result = applyLiveTimingProfile({
      profile: 'transcript-mora-blend-75',
      alignedTimings: aligned,
      fallbackTimings: fallback,
      wordOffsets: [0],
      directMatches: [true, false, true],
    });
    expect(result).toEqual(aligned);
  });

  it('keeps the global weighted control on its fallback clock', () => {
    const result = applyLiveTimingProfile({
      profile: 'weighted',
      alignedTimings: aligned,
      fallbackTimings: fallback,
      wordOffsets: [0],
      directMatches: [true, true, true],
    });
    expect(result).toEqual(fallback);
  });
});
