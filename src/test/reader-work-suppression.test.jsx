import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import DiwanApp from '../app.jsx';
import { usePoemStore } from '../stores/poemStore';
import { useAudioStore } from '../stores/audioStore';
import { useUIStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';
import { FULL_SCREEN_ROUTES, isFullScreenPath } from '../constants/routes.js';

// Vaul renders through a real portal; keep it inline so jsdom can see it.
vi.mock('vaul', () => ({
  Drawer: {
    Root: ({ children, open }) => (open ? <div>{children}</div> : null),
    Portal: ({ children }) => <div>{children}</div>,
    Overlay: (props) => <div {...props} />,
    Content: ({ children }) => <div>{children}</div>,
    Handle: (props) => <div {...props} />,
    Close: ({ children }) => children,
    Title: ({ children }) => <h2>{children}</h2>,
  },
}));

/**
 * URLs the reader itself is responsible for. The Category Explorer legitimately
 * calls /api/categories and /api/poets while it's on screen — those are its own
 * requests, not the hidden reader's, so they don't count here.
 */
const READER_ENDPOINTS = [
  '/api/poems/random',
  '/api/poems/by-poet',
  '/api/ai/',
  'generativelanguage.googleapis.com',
];

function readerRequests() {
  return global.fetch.mock.calls
    .map(([input]) => (typeof input === 'string' ? input : (input?.url ?? '')))
    .filter((url) => READER_ENDPOINTS.some((endpoint) => url.includes(endpoint)));
}

function goto(path) {
  window.history.replaceState({}, '', path);
}

describe('full-screen route gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePoemStore.getState().reset();
    useAudioStore.getState().reset();
    useUIStore.getState().reset();
    useModalStore.getState().reset();
    goto('/');
  });

  describe('isFullScreenPath', () => {
    it('matches every declared full-screen route and its children', () => {
      expect(FULL_SCREEN_ROUTES.length).toBeGreaterThan(0);
      for (const route of FULL_SCREEN_ROUTES) {
        expect(isFullScreenPath(route)).toBe(true);
        expect(isFullScreenPath(route + '/nested')).toBe(true);
      }
    });

    it('does not match the reader routes', () => {
      expect(isFullScreenPath('/')).toBe(false);
      expect(isFullScreenPath('/poem/123')).toBe(false);
      // Guards against a bare startsWith() that would swallow unrelated siblings.
      expect(isFullScreenPath('/explorer-settings')).toBe(false);
      expect(isFullScreenPath(undefined)).toBe(false);
    });
  });

  describe('the reader does no work while a full-screen route is active', () => {
    it('fires reader requests on the reader route (control)', async () => {
      goto('/');
      render(<DiwanApp />);
      await waitFor(() => expect(readerRequests().length).toBeGreaterThan(0));
    });

    it('fires no poem fetch, no Gemini call, and no prefetch on /explore', async () => {
      goto('/explore');
      render(<DiwanApp />);

      // Let every mount effect and the 500ms/5s prefetch timers have their chance.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(readerRequests()).toEqual([]);
    });

    it('keeps the poem so the reader is restored, not blanked', async () => {
      goto('/explore');
      render(<DiwanApp />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // The store still holds a renderable poem — returning to the reader shows
      // the poem, not a blank feed or a stuck spinner.
      const { poems, currentIndex } = usePoemStore.getState();
      expect(poems[currentIndex]?.arabic?.length).toBeGreaterThan(0);
    });

    it('resumes fetching once the full-screen route is left', async () => {
      goto('/explore');
      render(<DiwanApp />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      expect(readerRequests()).toEqual([]);

      // Leave the full-screen route the way the browser does (back button / link).
      await act(async () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      await waitFor(() => expect(readerRequests().length).toBeGreaterThan(0));
    });

    it('still loads a /poem/:id deep link', async () => {
      goto('/poem/4242');
      render(<DiwanApp />);
      await waitFor(() =>
        expect(
          global.fetch.mock.calls.some(([url]) => String(url).includes('/api/poems/4242'))
        ).toBe(true)
      );
    });
  });
});
