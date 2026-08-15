/**
 * Account-menu entry for the preference flow at `/onboarding`.
 *
 * Sibling of `tourProgress.js`, with one deliberate difference: the tour's state
 * is two loose localStorage keys, so that module owns them. Preferences already
 * have an owner — `services/preferences.js` reads/writes/sanitises them and
 * `services/preferenceWeighting.js` decides what counts as answered. So this
 * composes those two rather than adding a second reader of the same artifact.
 *
 * Why the label has to move at all: re-running this flow is not re-running a
 * tour. It rewrites `onboardingPrefs` — the saved answers that bias the feed —
 * so a returning reader is CHANGING something, not repeating it, and the entry
 * should say so before they tap it.
 */

import { readPrefs } from '../services/preferences.js';
import { hasPreferences } from '../services/preferenceWeighting.js';

/** True once the reader has answered at least one preference step. */
export function hasSavedPreferences() {
  return hasPreferences(readPrefs());
}

/** Menu label that matches what the entry will actually do. */
export function onboardingEntryLabel() {
  return hasSavedPreferences() ? 'Change your feed' : 'Set up your feed';
}

/**
 * Longer form for `aria-label`. The visible label stays short so it can't crowd
 * the menu at 393px; the screen-reader label is where "this replaces what you
 * saved" fits without costing layout.
 */
export function onboardingEntryDescription() {
  return hasSavedPreferences()
    ? 'Change your feed — revisit your saved poetry preferences and replace them'
    : 'Set up your feed — pick the poetry you want to see';
}
