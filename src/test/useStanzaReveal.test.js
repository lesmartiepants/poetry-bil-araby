import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStanzaReveal } from '../hooks/useStanzaReveal.js';

const makeStanzas = (n) =>
  Array.from({ length: n }, (_, i) => [{ ar: `بيت ${i + 1}`, en: `line ${i + 1}` }]);

describe('useStanzaReveal', () => {
  it('starts with the first stanza revealed (revealedCount = 1)', () => {
    const stanzas = makeStanzas(3);
    const { result } = renderHook(() => useStanzaReveal(stanzas, 1));
    expect(result.current.revealedCount).toBe(1);
    expect(result.current.stanzaIndex).toBe(0);
    expect(result.current.isAllRevealed).toBe(false);
  });

  it('advance() increments revealedCount', () => {
    const stanzas = makeStanzas(3);
    const { result } = renderHook(() => useStanzaReveal(stanzas, 1));
    act(() => result.current.advance());
    expect(result.current.revealedCount).toBe(2);
  });

  it('advance() does not exceed total stanza count', () => {
    const stanzas = makeStanzas(2);
    const { result } = renderHook(() => useStanzaReveal(stanzas, 1));
    act(() => result.current.advance());
    act(() => result.current.advance()); // already at max
    expect(result.current.revealedCount).toBe(2);
    expect(result.current.isAllRevealed).toBe(true);
  });

  it('isAllRevealed is true when all stanzas are revealed', () => {
    const stanzas = makeStanzas(1);
    const { result } = renderHook(() => useStanzaReveal(stanzas, 1));
    expect(result.current.isAllRevealed).toBe(true);
  });

  it('revealAll() immediately reveals all stanzas', () => {
    const stanzas = makeStanzas(4);
    const { result } = renderHook(() => useStanzaReveal(stanzas, 1));
    act(() => result.current.revealAll());
    expect(result.current.revealedCount).toBe(4);
    expect(result.current.isAllRevealed).toBe(true);
  });

  it('reset() restores revealedCount to 1', () => {
    const stanzas = makeStanzas(3);
    const { result } = renderHook(() => useStanzaReveal(stanzas, 1));
    act(() => result.current.advance());
    act(() => result.current.advance());
    act(() => result.current.reset());
    expect(result.current.revealedCount).toBe(1);
  });

  it('resets to 1 when poemId changes', () => {
    const stanzas = makeStanzas(3);
    let poemId = 1;
    const { result, rerender } = renderHook(() => useStanzaReveal(stanzas, poemId));
    act(() => result.current.advance());
    expect(result.current.revealedCount).toBe(2);

    poemId = 2;
    rerender();
    expect(result.current.revealedCount).toBe(1);
  });

  it('handles empty stanzas gracefully', () => {
    const { result } = renderHook(() => useStanzaReveal([], 1));
    expect(result.current.revealedCount).toBe(1);
    expect(result.current.isAllRevealed).toBe(true); // 1 >= 0
    // advance/reset/revealAll should not throw
    act(() => result.current.advance());
    act(() => result.current.reset());
    act(() => result.current.revealAll());
  });
});
