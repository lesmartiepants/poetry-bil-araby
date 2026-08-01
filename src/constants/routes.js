/**
 * Routes that take over the whole viewport.
 *
 * These render *instead of* the reader, not on top of it, so any reader-scoped
 * chrome that floats above the page (the guided walkthrough, coachmarks, and
 * anything else that paints a full-screen scrim) must not mount while one is
 * active. The walkthrough in particular paints at z-index 9999, far above every
 * route surface, so without a gate it swallows the whole screen.
 *
 * Add a new full-screen route here the moment you add it to the router. Keeping
 * the list in one place is the point: the alternative — a hardcoded
 * `&& !isSomeRoute` at each floating-chrome mount — silently regresses every
 * time someone adds a route and forgets to update all the call sites.
 */
export const FULL_SCREEN_ROUTES = [
  '/explore', // Category Explorer (FEATURES.categoryExplorer)
  '/onboarding', // Kinetic onboarding pickers (FEATURES.onboarding)
];

/**
 * True when `pathname` is a full-screen route, or nested beneath one
 * (so a future `/explore/:slug` detail view is covered without another edit).
 *
 * @param {string} [pathname] - Location pathname, e.g. `/explore`
 * @returns {boolean}
 */
export function isFullScreenPath(pathname) {
  if (typeof pathname !== 'string' || pathname === '') return false;
  return FULL_SCREEN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
