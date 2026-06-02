/**
 * Behavioral tests for FEATURES flags.
 *
 * These tests serve two purposes:
 * 1. Document the expected default for each flag so regressions are caught.
 * 2. Satisfy the CI gate (scripts/check-features-coverage.js) which requires
 *    each flag to appear in at least one non-toHaveProperty assertion.
 *
 * When you change a flag's default, update the test and document why.
 */
import { describe, it, expect } from 'vitest';
import { FEATURES } from '../constants/features.js';

describe('FEATURES flag defaults', () => {
  it('FEATURES.grounding is off by default (experimental search grounding)', () => {
    expect(FEATURES.grounding).toBe(false);
  });

  it('FEATURES.logging is on by default (structured console logs for Vercel)', () => {
    expect(FEATURES.logging).toBe(true);
  });

  it('FEATURES.caching is on by default (IndexedDB audio/insights cache)', () => {
    expect(FEATURES.caching).toBe(true);
  });

  it('FEATURES.streaming is on by default (progressive insight rendering)', () => {
    expect(FEATURES.streaming).toBe(true);
  });

  it('FEATURES.prefetching is on by default (smart rate-limited prefetch)', () => {
    expect(FEATURES.prefetching).toBe(true);
  });

  it('FEATURES.forceOnboarding is off by default (bypass check only for dev)', () => {
    expect(FEATURES.forceOnboarding).toBe(false);
  });

  it('FEATURES.designReview is off by default (accessible via URL but icon hidden)', () => {
    expect(FEATURES.designReview).toBe(false);
  });

  it('every FEATURES value is a boolean', () => {
    for (const [key, val] of Object.entries(FEATURES)) {
      expect(typeof val, `FEATURES.${key} should be boolean`).toBe('boolean');
    }
  });
});
