// Stub — will be replaced by the timing-hook agent implementation.
// Exports needed by PlayControlsStrip and useTTSHighlight.test.jsx.

export let pauseOffset = 0;

export function startPlayer(player, offset = 0) {
  if (!player) return;
  pauseOffset = 0;
  player.start('+0', offset);
}

export function recordPause(elapsed) {
  pauseOffset = elapsed;
}

/**
 * useTTSHighlight — no-op stub.
 * Real implementation: rAF loop + DOM classList mutation.
 */
export function useTTSHighlight(_options) {
  // stub
}
