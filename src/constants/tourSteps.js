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
 *   advanceOn  optional DOM event name on the target. In the SpotlightTour this
 *              is the "dynamic" hook: performing the real interaction UNLOCKS the
 *              Next button (the user drives the app, then continues).
 *   side       where the coachmark sits relative to the target:
 *              'top' | 'bottom' | 'left' | 'right'. Chosen per-step so the card
 *              never covers the thing it's pointing at and guides the eye to it.
 *   align      'start' | 'center' | 'end' — nudges the card toward the target
 *              along the side axis (driver.js + SpotlightTour both honor it).
 */

export const TOUR_STEPS = [
  {
    key: 'welcome',
    target: null,
    arabic: 'أهلاً وسهلاً',
    title: 'Welcome to Poetry بالعربي',
    body: 'A living diwan of 84,000+ Arabic poems. Take ten seconds — I’ll show you the core features, and you’ll try each one yourself.',
    hint: null,
    side: 'center',
    align: 'center',
  },
  {
    key: 'listen',
    target: '[data-tour="listen"]',
    arabic: 'استمع',
    title: 'Listen to the poem',
    body: 'Every poem can be recited aloud with synced word-by-word highlighting. This is the heart of the experience.',
    hint: 'Tap the button to play',
    advanceOn: 'click',
    side: 'top',
    align: 'start',
  },
  {
    key: 'pause',
    target: '[data-tour="listen"]',
    arabic: 'توقّف',
    title: 'Pause anytime',
    body: 'Tap the same control to pause — playback freezes right where you are, and tapping again resumes from that spot.',
    hint: 'Tap to pause',
    advanceOn: 'click',
    side: 'top',
    align: 'start',
  },
  {
    key: 'discover',
    target: '[data-tour="discover"]',
    arabic: 'اكتشف',
    title: 'Discover poets',
    body: 'Open the browser to wander through poets and eras, or summon a random poem. Long-press it later for a surprise.',
    hint: 'Tap to open Discover',
    advanceOn: 'click',
    side: 'top',
    align: 'center',
    // Opening Discover slides up a tray; the engine then centers the card in
    // front of it and closes the tray on Next.
    tray: 'discover',
  },
  {
    key: 'explain',
    target: '[data-tour="explain"]',
    arabic: 'اشرح',
    title: 'Understand the meaning',
    body: 'Explain helps you understand by explaining the imagery and poetic nuance of the poem.',
    hint: 'Tap for an explanation',
    advanceOn: 'click',
    side: 'top',
    align: 'end',
  },
  {
    key: 'finish',
    target: null,
    arabic: 'في أمان الله',
    title: 'That’s the core loop',
    body: 'Listen, Discover, Explain — everything else builds on those. Save poems with the heart, and find sharing and settings along the right edge whenever you’re ready.',
    hint: null,
    side: 'center',
    align: 'center',
  },
];

/** Steps that anchor to a real element (vs. centered intro/outro cards). */
export const anchoredSteps = () => TOUR_STEPS.filter((s) => s.target);
