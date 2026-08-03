/**
 * Persistence for the five onboarding answers.
 *
 * Deliberately separate from `components/onboarding/OnboardingFlow.jsx`: the
 * feed needs to READ these answers on every draw
 * (`stores/actions/fetchPoem.js`), and importing them from a component would
 * drag the whole picker UI — framer-motion, gsap, the canvas effects — into the
 * data layer's module graph for the sake of two localStorage calls.
 *
 * Shape (v2):
 *   family      string|null   a category_families key      (single)
 *   moods       string[]      category_values keys, mood   (multi)
 *   motifs      string[]      category_values keys, motif  (multi, optional)
 *   era         string|null   a derived era BAND key       (single)
 *   difficulty  string|null   a derived difficulty BAND key (single)
 *
 * `era` and `difficulty` store BAND KEYS, not raw values, because the bands are
 * cut from the live distribution and can move as the corpus grows. Resolving a
 * key against the current bands at read time means a saved answer keeps meaning
 * "the early centuries" rather than freezing a numeric range that may no longer
 * line up with anything.
 */

export const PREFS_STORAGE_KEY = 'onboardingPrefs';
export const PREFS_VERSION = 2;

export const EMPTY_PREFS = {
  version: PREFS_VERSION,
  family: null,
  moods: [],
  motifs: [],
  era: null,
  difficulty: null,
  completedAt: null,
};

export const readPrefs = () => {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(PREFS_STORAGE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY_PREFS };
    return {
      ...EMPTY_PREFS,
      ...parsed,
      moods: Array.isArray(parsed.moods) ? parsed.moods : [],
      motifs: Array.isArray(parsed.motifs) ? parsed.motifs : [],
    };
  } catch {
    // Unavailable storage (private mode) or corrupt JSON. An unanswered reader
    // gets an unbiased feed, which is the correct degradation.
    return { ...EMPTY_PREFS };
  }
};

export const writePrefs = (prefs) => {
  try {
    globalThis.localStorage?.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode — selections just aren't persisted */
  }
};

export const clearPrefs = () => {
  try {
    globalThis.localStorage?.removeItem(PREFS_STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
};
