import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hasSavedPreferences,
  onboardingEntryLabel,
  onboardingEntryDescription,
} from '../utils/onboardingEntry.js';
import { PREFS_STORAGE_KEY, PREFS_VERSION } from '../services/preferences.js';

/**
 * The account-menu entry to /onboarding. What it says has to match what tapping
 * it does: for a returning reader the flow REPLACES saved answers, so the label
 * must read as a change, not a repeat.
 */
describe('onboarding entry label', () => {
  // This environment doesn't always provide a real localStorage (see the guarded
  // clear in src/test/setup.js), so drive the helpers against an in-memory stub.
  let store;
  beforeEach(() => {
    store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    });
  });

  const save = (prefs) =>
    localStorage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({ version: PREFS_VERSION, moods: [], motifs: [], ...prefs })
    );

  it('invites a reader with no saved answers to set the feed up', () => {
    expect(hasSavedPreferences()).toBe(false);
    expect(onboardingEntryLabel()).toBe('Set up your feed');
    expect(onboardingEntryDescription()).toMatch(/pick the poetry you want to see/);
  });

  it('signals a change once any answer is saved', () => {
    save({ family: 'ghazal', completedAt: '2026-08-01T00:00:00.000Z' });
    expect(hasSavedPreferences()).toBe(true);
    expect(onboardingEntryLabel()).toBe('Change your feed');
    expect(onboardingEntryDescription()).toMatch(/replace them/);
  });

  it('counts a partial answer — one mood is enough to be worth changing', () => {
    save({ moods: ['longing'] });
    expect(onboardingEntryLabel()).toBe('Change your feed');
  });

  it('treats a payload this build cannot read as unanswered, never as changeable', () => {
    // sanitizePrefs drops foreign versions; offering "Change your feed" over
    // answers we can't display would be a lie about what the flow will show.
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ version: 99, family: 'ghazal' }));
    expect(onboardingEntryLabel()).toBe('Set up your feed');
  });

  it('falls back to the first-timer label when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('private mode');
      },
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    });
    expect(onboardingEntryLabel()).toBe('Set up your feed');
  });
});
