import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRevealWindow } from '../hooks/useRevealWindow.js';

describe('useRevealWindow', () => {
  it('starts with nothing revealed', () => {
    const { result } = renderHook(() => useRevealWindow(10, 1));
    expect(result.current.revealedCount).toBe(0);
    expect(result.current.isAllRevealed).toBe(false);
  });

  it('setRevealed reflects the controller-pushed count', () => {
    const { result } = renderHook(() => useRevealWindow(10, 1));
    act(() => result.current.setRevealed(4));
    expect(result.current.revealedCount).toBe(4);
    expect(result.current.isAllRevealed).toBe(false);
  });

  it('isAllRevealed flips true at the line count', () => {
    const { result } = renderHook(() => useRevealWindow(3, 1));
    act(() => result.current.setRevealed(3));
    expect(result.current.isAllRevealed).toBe(true);
  });

  it('reset returns to zero', () => {
    const { result } = renderHook(() => useRevealWindow(10, 1));
    act(() => result.current.setRevealed(6));
    act(() => result.current.reset());
    expect(result.current.revealedCount).toBe(0);
  });

  it('resets synchronously when poemId changes (render-phase, no extra render)', () => {
    const { result, rerender } = renderHook(({ id }) => useRevealWindow(10, id), {
      initialProps: { id: 1 },
    });
    act(() => result.current.setRevealed(5));
    expect(result.current.revealedCount).toBe(5);
    rerender({ id: 2 });
    expect(result.current.revealedCount).toBe(0); // new poem → reset
  });

  it('is all-revealed-safe for an empty poem', () => {
    const { result } = renderHook(() => useRevealWindow(0, 1));
    expect(result.current.isAllRevealed).toBe(false);
  });
});
