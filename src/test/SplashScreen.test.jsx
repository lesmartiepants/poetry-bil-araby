import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { forwardRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import { useModalStore } from '../stores/modalStore';
import { useUIStore } from '../stores/uiStore';
import SplashScreen from '../components/SplashScreen.jsx';

vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag) =>
        forwardRef(({ children, ...rest }, ref) => {
          const Tag = typeof tag === 'string' ? tag : 'div';
          const {
            initial: _initial,
            animate: _animate,
            exit: _exit,
            transition: _transition,
            whileHover: _whileHover,
            whileTap: _whileTap,
            ...domProps
          } = rest;
          return (
            <Tag ref={ref} {...domProps}>
              {children}
            </Tag>
          );
        }),
    }
  ),
}));

// The word-by-word reveal runs on GSAP's own ticker, which vitest's fake timers do not drive, so
// the tween is captured here and completed on demand. That is the point of these tests: the CTA is
// gated on the reveal finishing, not on a clock, and the gate is what can regress.
const tweens = [];
vi.mock('gsap', () => ({
  gsap: {
    to: (target, vars) => {
      const tween = { vars, kill: vi.fn() };
      tweens.push(tween);
      return tween;
    },
  },
}));

function completeReveal() {
  tweens.forEach(({ vars }) => {
    vars.onUpdate?.();
    vars.onComplete?.();
  });
}

describe('SplashScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tweens.length = 0;
    vi.useFakeTimers();
    localStorage.removeItem('hasSeenOnboarding');
    useUIStore.getState().reset();
    useModalStore.getState().reset();
    act(() => useModalStore.setState({ splash: true }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('holds the enter button back until the note has finished revealing', () => {
    render(<SplashScreen />);

    // Still revealing: the button holds its place in the layout but is hidden, which also takes it
    // out of the accessibility tree — so it is unreachable by role, not merely invisible.
    expect(screen.getByTestId('splash-enter')).not.toBeVisible();
    expect(screen.queryByRole('button', { name: "Let's begin" })).toBeNull();

    act(() => {
      completeReveal();
    });

    expect(screen.getByRole('button', { name: "Let's begin" })).toBeVisible();
  });

  it('focuses the enter button once it arrives', () => {
    render(<SplashScreen />);

    act(() => {
      completeReveal();
    });
    act(() => {
      vi.advanceTimersByTime(420);
    });

    expect(screen.getByRole('button', { name: "Let's begin" })).toHaveFocus();
  });
});
