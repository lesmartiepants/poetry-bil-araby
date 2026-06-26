import { describe, it, expect, vi, beforeEach } from 'vitest';
import { forwardRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TOUR_STEPS, anchoredSteps } from '../constants/tourSteps.js';

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

  it('welcome is centered; finish highlights the restart control; feature steps auto-advance', () => {
    const welcome = TOUR_STEPS[0];
    expect(welcome.target).toBeNull();
    expect(welcome.advanceOn).toBeUndefined();

    // The final step highlights the restart button but needs no interaction.
    const finish = TOUR_STEPS[TOUR_STEPS.length - 1];
    expect(finish.key).toBe('finish');
    expect(finish.target).toMatch(/^\[data-tour=/);
    expect(finish.advanceOn).toBeUndefined();

    // Interactive feature steps anchor to a real control, auto-advance, and hint.
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
    render(<SpotlightTour steps={TOUR_STEPS} initialStep={1} onStepChange={onStepChange} onDismiss={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText('Listen to the poem')).toBeInTheDocument(); // step 1, not welcome
    await waitFor(() => expect(onStepChange).toHaveBeenCalledWith(1));
  });

  it('does not advance until the user performs the action (Next flashes instead)', async () => {
    const target = document.createElement('button');
    target.setAttribute('data-tour', 'listen');
    document.body.appendChild(target);
    render(<SpotlightTour steps={TOUR_STEPS} onDismiss={vi.fn()} onComplete={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Next' })); // welcome -> listen
    expect(screen.getByText('Listen to the poem')).toBeInTheDocument();

    // Pressing Next before the action does NOT advance (it flashes the target).
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Listen to the poem')).toBeInTheDocument();

    // After performing the real interaction, Next advances.
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await waitFor(() => {
      // state flush
    });
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Pause anytime')).toBeInTheDocument();
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
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });

  it('auto-opens the tour on landing (no chip while open)', async () => {
    render(<TourLauncher />);
    expect(await screen.findByText('Welcome to Poetry بالعربي')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tour/i })).not.toBeInTheDocument();
  });

  it('shows a "Resume tour" chip after the tour is dismissed', async () => {
    render(<TourLauncher />);
    await screen.findByText('Welcome to Poetry بالعربي');
    await userEvent.click(screen.getByRole('button', { name: 'Close walkthrough' }));
    expect(await screen.findByRole('button', { name: 'Resume tour' })).toBeInTheDocument();
  });
});
