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

describe('SplashScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.removeItem('hasSeenOnboarding');
    useUIStore.getState().reset();
    useModalStore.getState().reset();
    act(() => useModalStore.setState({ splash: true }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('focuses the enter button when the splash dialog opens', () => {
    render(<SplashScreen />);

    act(() => {
      vi.advanceTimersByTime(1400);
    });

    expect(screen.getByRole('button', { name: 'Enter the app' })).toHaveFocus();
  });
});
