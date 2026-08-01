import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { FULL_SCREEN_ROUTES, isFullScreenPath } from '../constants/routes.js';
import { useIsFullScreenRoute } from '../hooks/useIsFullScreenRoute.js';

/**
 * Full-screen route gate.
 *
 * The guided walkthrough paints a scrim at z-index 9999 — above every route
 * surface in the app. Mounting it while a routed full-screen view is active
 * (e.g. /explore) buries that view: the user lands on the route and sees the
 * tour instead. These tests pin both halves of the fix — the predicate, and the
 * gate actually being wired into the TourLauncher mount.
 */

const appSource = readFileSync(path.join(process.cwd(), 'src/app.jsx'), 'utf8');

const renderAt = (path) =>
  renderHook(() => useIsFullScreenRoute(), {
    wrapper: ({ children }) => <Router hook={memoryLocation({ path }).hook}>{children}</Router>,
  });

describe('isFullScreenPath', () => {
  it.each(FULL_SCREEN_ROUTES)('matches the declared route %s', (route) => {
    expect(isFullScreenPath(route)).toBe(true);
  });

  it.each(FULL_SCREEN_ROUTES)('matches paths nested under %s', (route) => {
    expect(isFullScreenPath(`${route}/some-detail-view`)).toBe(true);
  });

  it('does not match the reader routes the tour belongs on', () => {
    expect(isFullScreenPath('/')).toBe(false);
    expect(isFullScreenPath('/poem/12345')).toBe(false);
  });

  it('does not match a route that merely shares a prefix', () => {
    // `/explorer` is a different route from `/explore` — no accidental capture.
    expect(isFullScreenPath('/explorez')).toBe(false);
    expect(isFullScreenPath('/exploration')).toBe(false);
  });

  it('is safe on missing / non-string input', () => {
    expect(isFullScreenPath(undefined)).toBe(false);
    expect(isFullScreenPath('')).toBe(false);
    expect(isFullScreenPath(null)).toBe(false);
  });
});

describe('useIsFullScreenRoute', () => {
  it('is true on a full-screen route', () => {
    expect(renderAt('/explore').result.current).toBe(true);
  });

  it('is false on the reader', () => {
    expect(renderAt('/').result.current).toBe(false);
    expect(renderAt('/poem/12345').result.current).toBe(false);
  });
});

describe('TourLauncher mount gate', () => {
  it('gates the walkthrough on !isFullScreenRoute', () => {
    // Regression guard for the overlay-covers-the-route bug. A hardcoded
    // `!isExploreRoute` here would pass a route-specific test but regress the
    // next time a full-screen route is added, so assert on the derived boolean.
    expect(appSource).toMatch(/\{FEATURES\.tour &&[^}]*!isFullScreenRoute[^}]*&& \(/);
  });

  it('derives that boolean from the shared hook', () => {
    expect(appSource).toContain('const isFullScreenRoute = useIsFullScreenRoute();');
  });
});
