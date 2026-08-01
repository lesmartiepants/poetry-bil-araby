import { useLocation } from 'wouter';
import { isFullScreenPath } from '../constants/routes.js';

/**
 * True while a full-screen route (see `FULL_SCREEN_ROUTES`) is active.
 *
 * Use it to suppress reader-scoped floating chrome — the guided walkthrough and
 * anything else that paints over the whole viewport — so a routed full-screen
 * view isn't buried under it.
 *
 * @returns {boolean}
 */
export function useIsFullScreenRoute() {
  const [location] = useLocation();
  return isFullScreenPath(location);
}
