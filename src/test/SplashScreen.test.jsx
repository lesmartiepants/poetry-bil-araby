import { describe, it, expect, beforeEach, vi } from 'vitest';
import { forwardRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import { useModalStore } from '../stores/modalStore';
import { useUIStore } from '../stores/uiStore';

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

const { default: SplashScreen } = await import('../components/SplashScreen.jsx');

describe('SplashScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem('hasSeenOnboarding');
    useUIStore.getState().reset();
    useModalStore.getState().reset();
    act(() => useModalStore.setState({ splash: true }));
  });

  it('autofocuses the enter button when the splash dialog opens', () => {
    render(<SplashScreen />);

    expect(screen.getByRole('button', { name: 'Enter the app' })).toHaveFocus();
  });
});
