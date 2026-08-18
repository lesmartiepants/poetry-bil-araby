import { describe, it, expect } from 'vitest';
import { scoreAlignment } from '../utils/alignmentScore';

// Synthetic "embeddings": each concept is a distinct unit vector, so a line
// pair that should match has cosine 1 and an unrelated pair has cosine 0.
const v = (i, dim = 8) => Array.from({ length: dim }, (_, k) => (k === i ? 1 : 0));

describe('scoreAlignment', () => {
  it('reports no shift when every line matches its counterpart', () => {
    const ar = [v(0), v(1), v(2), v(3), v(4), v(5)];
    const en = [v(0), v(1), v(2), v(3), v(4), v(5)];
    const s = scoreAlignment(ar, en);
    expect(s.shift).toBe(0);
    expect(s.diagonal).toBeCloseTo(1, 5);
  });

  it('detects a translation shifted one line early', () => {
    // English line i actually renders Arabic line i+1 — the 87900 failure,
    // where the opening bayt was merged and everything after slid up one.
    const ar = [v(0), v(1), v(2), v(3), v(4), v(5)];
    const en = [v(1), v(2), v(3), v(4), v(5), v(6)];
    const s = scoreAlignment(ar, en);
    expect(s.shift).toBe(-1);
    expect(s.margin).toBeGreaterThan(0.02);
  });

  it('detects a shift in the other direction', () => {
    const ar = [v(1), v(2), v(3), v(4), v(5), v(6)];
    const en = [v(0), v(1), v(2), v(3), v(4), v(5)];
    const s = scoreAlignment(ar, en);
    expect(s.shift).toBe(1);
  });

  it('does not flag a merely weak translation as shifted', () => {
    // Low similarity everywhere, but no offset does better than the diagonal.
    const ar = [v(0), v(1), v(2), v(3), v(4), v(5)];
    const en = [v(6), v(6), v(6), v(6), v(6), v(6)];
    const s = scoreAlignment(ar, en);
    expect(s.margin).toBeLessThanOrEqual(0.02);
  });

  it('refuses to score when too few pairs overlap', () => {
    expect(scoreAlignment([v(0), v(1)], [v(0), v(1)]).diagonal).not.toBeNull();
    expect(scoreAlignment([], []).diagonal).toBeNull();
  });

  it('tolerates unequal line counts by scoring the overlap', () => {
    const ar = [v(0), v(1), v(2), v(3), v(4)];
    const en = [v(0), v(1), v(2), v(3), v(4), v(5), v(6)];
    expect(scoreAlignment(ar, en).shift).toBe(0);
  });
});
