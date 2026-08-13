import { describe, it, expect, vi, beforeEach } from 'vitest';
import { forwardRef } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TOUR_STEPS, anchoredSteps } from '../constants/tourSteps.js';
import { useModalStore } from '../stores/modalStore';
import { tourEntryLabel, hasTourProgress } from '../utils/tourProgress.js';

// framer-motion → plain elements so the portal/animation machinery doesn't
// interfere with assertions. We only render the lightweight motion.div.
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }) => <>{children}</>,
  // Render the real underlying tag (motion.button -> <button>) so role queries work.
  motion: new Proxy(
    {},
    {
      get: (_t, tag) =>
        forwardRef(({ children, ...rest }, ref) => {
          const Tag = typeof tag === 'string' ? tag : 'div';
          return (
            <Tag ref={ref} {...stripMotionProps(rest)}>
              {children}
            </Tag>
          );
        }),
    }
  ),
}));
function stripMotionProps(p) {
  const { initial, animate, exit, transition, layout, whileHover, whileTap, ...rest } = p;
  return rest;
}

vi.mock('../stores/uiStore', () => {
  const state = { darkMode: true, tourActive: false };
  const useUIStore = (selector) => selector(state);
  useUIStore.getState = () => ({ ...state, setTourActive: vi.fn() });
  return { useUIStore };
});

import SpotlightTour from '../components/tour/SpotlightTour.jsx';
import TourLauncher from '../components/tour/TourLauncher.jsx';

describe('TOUR_STEPS (shared source of truth)', () => {
  it('has unique keys', () => {
    const keys = TOUR_STEPS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('welcome is centered; finish highlights the restart control; feature steps wait for the real interaction', () => {
    const welcome = TOUR_STEPS[0];
    expect(welcome.target).toBeNull();
    expect(welcome.advanceOn).toBeUndefined();

    // The final step highlights the restart button but needs no interaction.
    const finish = TOUR_STEPS[TOUR_STEPS.length - 1];
    expect(finish.key).toBe('finish');
    expect(finish.target).toMatch(/^\[data-tour=/);
    expect(finish.advanceOn).toBeUndefined();

    // Interactive feature steps anchor to a real control, wait for the real interaction, and hint.
    const interactive = TOUR_STEPS.filter((s) => s.advanceOn);
    expect(interactive.length).toBeGreaterThanOrEqual(3);
    for (const s of interactive) {
      expect(s.target).toMatch(/^\[data-tour=/);
      expect(s.hint).toBeTruthy();
    }
  });

  it('every anchored selector matches an existing data-tour key set', () => {
    const targets = anchoredSteps().map((s) => s.target.match(/"(.+?)"/)[1]);
    expect(targets).toEqual(expect.arrayContaining(['listen', 'discover', 'explain']));
  });

  it('the Save step carries auth-aware copy: signed-in body + a sign-up dismiss hint', () => {
    const fav = TOUR_STEPS.find((s) => s.key === 'favourite');
    expect(fav).toBeTruthy();
    expect(fav.body).toBeTruthy();
    expect(fav.bodyAuthed).toBeTruthy();
    expect(fav.bodyAuthed).not.toBe(fav.body);
    // The signed-out base body must NOT tell a would-be signed-in reader to sign in.
    expect(fav.body.toLowerCase()).not.toContain('sign in');
    // The dismiss hint encourages sign-up while making dismissal clear.
    expect(fav.dismissHint).toMatch(/sign in/i);
  });
});

describe('SpotlightTour engine', () => {
  it('renders the welcome step and advances on Next', async () => {
    render(<SpotlightTour steps={TOUR_STEPS} onDismiss={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText('Welcome to Poetry بالعربي')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Listen to the poem')).toBeInTheDocument();
  });

  it('starts at initialStep (resume) and reports step changes', async () => {
    const onStepChange = vi.fn();
    render(
      <SpotlightTour
        steps={TOUR_STEPS}
        initialStep={1}
        onStepChange={onStepChange}
        onDismiss={vi.fn()}
        onComplete={vi.fn()}
      />
    );
    expect(screen.getByText('Listen to the poem')).toBeInTheDocument(); // step 1, not welcome
    await waitFor(() => expect(onStepChange).toHaveBeenCalledWith(1));
  });

  it('Save step shows sign-out body when signed out and library body when signed in', () => {
    const favIndex = TOUR_STEPS.findIndex((s) => s.key === 'favourite');
    const fav = TOUR_STEPS[favIndex];

    const { unmount } = render(
      <SpotlightTour
        steps={TOUR_STEPS}
        initialStep={favIndex}
        onDismiss={vi.fn()}
        onComplete={vi.fn()}
      />
    );
    expect(screen.getByText('Save your favourites')).toBeInTheDocument();
    expect(screen.getByText(fav.body)).toBeInTheDocument();
    expect(screen.queryByText(fav.bodyAuthed)).not.toBeInTheDocument();
    unmount();

    render(
      <SpotlightTour
        steps={TOUR_STEPS}
        initialStep={favIndex}
        isSignedIn
        onDismiss={vi.fn()}
        onComplete={vi.fn()}
      />
    );
    expect(screen.getByText(fav.bodyAuthed)).toBeInTheDocument();
    expect(screen.queryByText(fav.body)).not.toBeInTheDocument();
  });

  it('feature steps auto-advance on the real interaction (no Next button)', async () => {
    const target = document.createElement('button');
    target.setAttribute('data-tour', 'listen');
    document.body.appendChild(target);
    render(<SpotlightTour steps={TOUR_STEPS} onDismiss={vi.fn()} onComplete={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Next' })); // welcome -> listen
    expect(screen.getByText('Listen to the poem')).toBeInTheDocument();

    // Feature steps have no Next button — the real interaction advances them.
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();

    // Performing the real interaction auto-advances after the dwell delay (no Next tap needed).
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await waitFor(() => expect(screen.getByText('Pause anytime')).toBeInTheDocument(), {
      timeout: 2500,
    });
    target.remove();
  });

  it('dismisses via the × button (not a completion)', async () => {
    const onDismiss = vi.fn();
    const onComplete = vi.fn();
    render(<SpotlightTour steps={TOUR_STEPS} onDismiss={onDismiss} onComplete={onComplete} />);
    await userEvent.click(screen.getByRole('button', { name: 'Close walkthrough' }));
    expect(onDismiss).toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('TourLauncher', () => {
  beforeEach(() => {
    // In-memory storage stub — this environment doesn't reliably provide one.
    const store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    });
    useModalStore.getState().closeTour();
  });

  it('never opens itself on landing, and floats no chip over the reader', async () => {
    render(<TourLauncher />);
    // Give the lazy SpotlightTour chunk a chance to appear — it must not.
    await waitFor(() => expect(useModalStore.getState().tour).toBe(false));
    expect(screen.queryByText('Welcome to Poetry بالعربي')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tour/i })).not.toBeInTheDocument();
  });

  it('opens when the account menu asks for it, and closes back to nothing', async () => {
    render(<TourLauncher />);
    act(() => useModalStore.getState().openTour());
    expect(await screen.findByText('Welcome to Poetry بالعربي')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Close walkthrough' }));
    expect(screen.queryByText('Welcome to Poetry بالعربي')).not.toBeInTheDocument();
    // No chip takes its place.
    expect(screen.queryByRole('button', { name: /resume|take the tour/i })).not.toBeInTheDocument();
  });

  it('resumes at the persisted step when reopened', async () => {
    localStorage.setItem('tourStep', '1');
    render(<TourLauncher />);
    act(() => useModalStore.getState().openTour());
    expect(await screen.findByText('Listen to the poem')).toBeInTheDocument();
  });
});

describe('tour entry label', () => {
  // This environment doesn't always provide a real localStorage (see the guarded
  // clear in src/test/setup.js), so drive the helper against an in-memory stub.
  let store;
  beforeEach(() => {
    store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    });
  });

  it('reads "Take the tour" for a first-timer', () => {
    expect(tourEntryLabel()).toBe('Take the tour');
    expect(hasTourProgress()).toBe(false);
  });

  it('reads "Resume tour" once a step past the first is saved', () => {
    localStorage.setItem('tourStep', '2');
    expect(tourEntryLabel()).toBe('Resume tour');
    expect(hasTourProgress()).toBe(true);
  });

  it('goes back to "Take the tour" once completed — a finished tour restarts', () => {
    localStorage.setItem('tourStep', '4');
    localStorage.setItem('tourCompleted', 'true');
    expect(tourEntryLabel()).toBe('Take the tour');
  });
});
