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
    arabic: 'أهلا',
    title: 'Welcome to Poetry بالعربي',
    body: 'A living diwan of 84,000+ Arabic poems. Take ten seconds — I’ll show you the core features, and you’ll try each one yourself.',
    note: 'Tap the highlighted action to move on to the next screen.',
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
    body: 'Tap Poem Insights to unfold the meaning inline — the imagery, the poetic nuance, and a note about the poet — right under the verses.',
    hint: 'Tap for the meaning',
    advanceOn: 'click',
    side: 'top',
    align: 'end',
    // Insights are now INLINE (they swap the poem body for the meaning, rather
    // than opening a drawer). So there's no overlay to sit above / close — this
    // is a plain spotlight step: tapping the "Poem Insights" action unlocks Next.
  },
  {
    key: 'favourite',
    target: '[data-tour="save"]',
    arabic: 'احفظ',
    title: 'Save your favourites',
    body: 'Tap the heart to keep a poem you love. Sign in with a free account and your favourites are saved to your library.',
    hint: 'Tap the heart to save',
    advanceOn: 'click',
    side: 'top',
    align: 'center',
    // Tapping the heart while signed out opens the sign-in sheet; treat it like
    // a tray so the card sits in front of it and Next dismisses it.
    tray: 'auth',
  },
  {
    // Only shown to returning / signed-in readers who actually have a library.
    key: 'library',
    target: '[data-tour="library"]',
    arabic: 'مكتبتك',
    title: 'Your library',
    body: 'Everything you’ve saved lives here. It’ll be waiting for you the next time you come back.',
    hint: 'Tap to open your library',
    advanceOn: 'click',
    side: 'left',
    align: 'center',
    when: 'hasLibrary',
    tray: 'saved',
  },
  {
    key: 'finish',
    // Highlights the restart button that lives in the top-right once the tour is
    // done — so readers know where to come back for a refresher.
    target: '[data-tour="restart"]',
    arabic: 'في أمان الله',
    title: 'You’re all set',
    body: 'That’s the heart of it. If you ever want a refresher on the features, come back to this button any time to restart the tour.',
    hint: null,
    side: 'left',
    align: 'start',
  },
];

/** Steps that anchor to a real element (vs. centered intro/outro cards). */
export const anchoredSteps = () => TOUR_STEPS.filter((s) => s.target);
