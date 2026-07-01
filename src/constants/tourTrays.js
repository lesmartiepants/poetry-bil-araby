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
  insight: { stateKey: 'insightsDrawer', setter: 'setInsightsDrawer', above: null },
  auth: { stateKey: 'authModal', setter: 'setAuthModal', above: '[data-tour-anchor="auth"]' },
  saved: { stateKey: 'savedPoems', setter: 'setSavedPoemsOpen', above: null },
};
