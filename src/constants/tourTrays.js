/**
 * Tour ↔ modal-store contract.
 *
 * A step whose `tray` is one of these keys opens an app overlay. The tour reads
 * and closes that overlay ONLY through this map — `stateKey` is the modalStore
 * boolean that signals "open", `setter` is the modalStore action that closes it,
 * and `above` (optional) is a selector for a centered modal the card should sit
 * above rather than float over.
 *
 * Centralizing it here lets a unit test (src/test/tour-contract.test.js) verify
 * every field + setter still exists on the store, so a modalStore rename fails
 * fast instead of silently breaking the tour.
 */
export const TOUR_TRAYS = {
  discover: { stateKey: 'discoverDrawer', setter: 'setDiscoverDrawer', above: null },
  // NOTE: no `insight` tray — insights are now rendered INLINE in the reader
  // (PoemReader/InlineInsights swap the poem body for the meaning) rather than in
  // a Vaul drawer, so the 'explain' step is a plain spotlight with no overlay to
  // open/close. See src/constants/tourSteps.js.
  auth: { stateKey: 'authModal', setter: 'setAuthModal', above: '[data-tour-anchor="auth"]' },
  saved: { stateKey: 'savedPoems', setter: 'setSavedPoemsOpen', above: null },
};
