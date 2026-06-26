import { useState, useCallback } from 'react';

/**
 * useRevealWindow — thin React mirror of the sparkler reveal's line count.
 *
 * The imperative controller (useSparklerReveal) is the source of truth; it pushes the
 * revealed-line count here via `setRevealed` so React can render progress, the tap prompt,
 * and the end-state. Resets synchronously in the render phase on poemId change (no effect,
 * no extra render) — same trick as the retired useStanzaReveal.
 *
 * @param {number} lineCount
 * @param {string|number} poemId
 * @returns {{ revealedCount:number, isAllRevealed:boolean, setRevealed:(n:number)=>void, reset:()=>void }}
 */
export function useRevealWindow(lineCount, poemId) {
  const [state, setState] = useState({ poemId, revealed: 0 });

  const revealedCount = state.poemId === poemId ? state.revealed : 0;
  const isAllRevealed = lineCount > 0 && revealedCount >= lineCount;

  const setRevealed = useCallback((n) => setState({ poemId, revealed: n }), [poemId]);
  const reset = useCallback(() => setState({ poemId, revealed: 0 }), [poemId]);

  return { revealedCount, isAllRevealed, setRevealed, reset };
}
