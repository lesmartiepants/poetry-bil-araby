import { useState, useCallback } from 'react';

/**
 * useStanzaReveal — state machine for advancing through poem stanzas one tap at a time.
 *
 * @param {Array<Array<{ar: string, en: string}>>} stanzas  — chunked stanzas from chunkStanzas()
 * @param {string|number} poemId — resets state when the poem changes
 *
 * @returns {{
 *   stanzaIndex: number,     — index of the last revealed stanza (0-based)
 *   revealedCount: number,   — number of stanzas revealed so far (1-based)
 *   isAllRevealed: boolean,  — true once every stanza is visible
 *   advance: () => void,     — reveal the next stanza (no-op when all revealed)
 *   reset: () => void,       — snap back to stanza 0 only
 *   revealAll: () => void,   — instantly reveal all stanzas (called by TTS play)
 * }}
 */
export function useStanzaReveal(stanzas, poemId) {
  // Store poemId alongside count so a poemId change resets synchronously in the render
  // phase rather than inside a useEffect (which would trigger an extra render cycle and
  // cause a react-hooks/set-state-in-effect warning). Reading `state.poemId !== poemId`
  // during render gives us the reset on the very next paint with zero extra renders.
  const [state, setState] = useState({ poemId, revealedCount: 1 });

  const revealedCount = state.poemId === poemId ? state.revealedCount : 1;

  const total = stanzas?.length ?? 0;
  const isAllRevealed = revealedCount >= total;
  const stanzaIndex = Math.max(0, revealedCount - 1);

  const advance = useCallback(() => {
    setState((prev) => {
      const cur = prev.poemId === poemId ? prev.revealedCount : 1;
      return cur < total ? { poemId, revealedCount: cur + 1 } : { poemId, revealedCount: cur };
    });
  }, [poemId, total]);

  const reset = useCallback(() => {
    setState({ poemId, revealedCount: 1 });
  }, [poemId]);

  const revealAll = useCallback(() => {
    setState({ poemId, revealedCount: total });
  }, [poemId, total]);

  return { stanzaIndex, revealedCount, isAllRevealed, advance, reset, revealAll };
}

