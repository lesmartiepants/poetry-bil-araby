import { describe, it, expect, vi } from 'vitest';
import { forwardRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TOUR_STEPS, anchoredSteps } from '../constants/tourSteps.js';

// framer-motion → plain elements so the portal/animation machinery doesn't
// interfere with assertions. We only render the lightweight motion.div.
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get: () =>
        forwardRef(({ children, ...rest }, ref) => (
          <div ref={ref} {...stripMotionProps(rest)}>
            {children}
          </div>
        )),
    }
  ),
}));
function stripMotionProps(p) {
  const { initial, animate, exit, transition, layout, whileHover, whileTap, ...rest } = p;
  return rest;
}

vi.mock('../stores/uiStore', () => ({
  useUIStore: (selector) => selector({ darkMode: true }),
}));

import SpotlightTour from '../components/tour/SpotlightTour.jsx';
import TourLauncher from '../components/tour/TourLauncher.jsx';

describe('TOUR_STEPS (shared source of truth)', () => {
  it('has unique keys', () => {
    const keys = TOUR_STEPS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('intro/outro steps are centered (no target); feature steps anchor + auto-advance', () => {
    const intro = TOUR_STEPS.filter((s) => !s.target);
    expect(intro.length).toBeGreaterThanOrEqual(2); // welcome + finish
    for (const s of anchoredSteps()) {
      expect(s.target).toMatch(/^\[data-tour=/);
      expect(s.advanceOn).toBeTruthy(); // the "dynamic" interaction hook
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
    const onClose = vi.fn();
    render(<SpotlightTour steps={TOUR_STEPS} onClose={onClose} />);
    expect(screen.getByText('Welcome to Poetry بالعربي')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Listen to the poem')).toBeInTheDocument();
  });

  it('closes via the × button', async () => {
    const onClose = vi.fn();
    render(<SpotlightTour steps={TOUR_STEPS} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Close walkthrough' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('TourLauncher', () => {
  it('shows the "Take a tour" chip and opens the engine chooser', async () => {
    render(<TourLauncher />);
    const chip = screen.getByRole('button', { name: 'Take a tour' });
    expect(chip).toBeInTheDocument();
    await userEvent.click(chip);
    expect(screen.getByText('Branded spotlight')).toBeInTheDocument();
    expect(screen.getByText('Classic guide')).toBeInTheDocument();
  });
});
