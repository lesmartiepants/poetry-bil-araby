/**
 * Shared walkthrough step definitions — the single source of truth for BOTH
 * tour engines (the bespoke SpotlightTour and the driver.js DriverTour).
 *
 * To expand the walkthrough to more features later, you only edit THIS file:
 *  1. Add a `data-tour="<key>"` attribute to the target element in the JSX.
 *  2. Add a step object below with the matching `target` key.
 * Both engines pick it up automatically — no engine code changes needed.
 *
 * Step shape:
 *   key        unique id (also used for the data-tour attribute lookup)
 *   target     CSS selector for the element to spotlight. null => centered card
 *              (used for the welcome / finish "intro" cards).
 *   title      English heading shown in the coachmark
 *   arabic     optional Arabic flourish shown above the title (on-brand accent)
 *   body       one or two short sentences explaining the feature
 *   hint       optional micro-instruction shown as a pill ("Tap to play")
 *   advanceOn  optional DOM event name on the target that auto-advances the
 *              tour when the user REALLY performs it (this is what makes the
 *              walkthrough "dynamic" — they drive the app, not a Next button).
 *   placement  preferred coachmark side: 'top' | 'bottom' | 'auto'
 */

export const TOUR_STEPS = [
  {
    key: 'welcome',
    target: null,
    arabic: 'أهلاً وسهلاً',
    title: 'Welcome to Poetry بالعربي',
    body: 'A living diwan of 84,000+ Arabic poems. Take ten seconds — I’ll show you the three things that matter, and you’ll try each one yourself.',
    hint: null,
    placement: 'auto',
  },
  {
    key: 'listen',
    target: '[data-tour="listen"]',
    arabic: 'استمع',
    title: 'Listen to the poem',
    body: 'Every poem can be recited aloud with synced word-by-word highlighting. This is the heart of the experience.',
    hint: 'Tap the button to play',
    advanceOn: 'click',
    placement: 'top',
  },
  {
    key: 'discover',
    target: '[data-tour="discover"]',
    arabic: 'اكتشف',
    title: 'Discover poets',
    body: 'Open the browser to wander through poets and eras, or summon a random poem. Long-press it later for a surprise.',
    hint: 'Tap to open Discover',
    advanceOn: 'click',
    placement: 'top',
  },
  {
    key: 'explain',
    target: '[data-tour="explain"]',
    arabic: 'اشرح',
    title: 'Understand the meaning',
    body: 'Not sure what a verse means? Explain gives you an AI reading of the imagery, themes, and historical context.',
    hint: 'Tap for an explanation',
    advanceOn: 'click',
    placement: 'top',
  },
  {
    key: 'finish',
    target: null,
    arabic: 'في أمان الله',
    title: 'That’s the core loop',
    body: 'Listen, Discover, Explain — everything else builds on those. Save poems with the heart, and find sharing and settings along the right edge whenever you’re ready.',
    hint: null,
    placement: 'auto',
  },
];

/** Steps that anchor to a real element (vs. centered intro/outro cards). */
export const anchoredSteps = () => TOUR_STEPS.filter((s) => s.target);
