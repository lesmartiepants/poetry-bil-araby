/**
 * revealWindow — pure windowing math for the sparkler teleprompter reader.
 *
 * The reader shows a fixed window of `visRows` verse lines (default 4). As lines are
 * revealed (by tapping) or scrubbed, the track scrolls so the relevant line stays on the
 * bottom row of the window. All functions here are pure so they can be unit-tested without
 * mounting GSAP/canvas; `useSparklerReveal` consumes them to drive the imperative animation.
 */

/** Max scroll-top index: how far the window can scroll before the last line sits on the bottom row. */
export function maxWindowTop(total, visRows = 4) {
  return Math.max(0, total - visRows);
}

/**
 * Window top to use when revealing up to `lastLine`. Keeps the newest line on the bottom
 * row (lastLine - (visRows-1)) but never scrolls UP (max with prevTop) — so already-read
 * lines don't jump back into view. Computing from the line index (not a pair counter) keeps
 * this correct after an arbitrary scrub, which is the off-by-one fix the prototype carries.
 */
export function computeWindowTop(lastLine, total, visRows = 4, prevTop = 0) {
  const maxTop = maxWindowTop(total, visRows);
  return Math.max(0, Math.min(maxTop, Math.max(prevTop, lastLine - (visRows - 1))));
}

/**
 * Resolve a scrub fraction (0..1 of the whole poem) into a target line and the fractional
 * progress WITHIN that line. At frac=1 the last line is fully revealed.
 */
export function scrubResolve(frac, total) {
  const f = Math.max(0, Math.min(1, frac));
  let pos = f * total;
  let line = Math.floor(pos);
  let within = pos - line;
  if (line >= total) {
    line = total - 1;
    within = 1;
  }
  if (line < 0) {
    line = 0;
    within = 0;
  }
  return { line, within };
}

/**
 * Continuous scroll top WHILE dragging — the track follows the finger smoothly (fractional),
 * old lines slide up gradually instead of swapping abruptly.
 */
export function contTop(line, within, total, visRows = 4) {
  const maxTop = maxWindowTop(total, visRows);
  return Math.min(maxTop, Math.max(0, line + within - (visRows - 1)));
}

/**
 * Row-aligned window top to SETTLE to when a scrub is released: the dropped-on line lands on
 * the bottom row, matching what advance() will expect for the taps that follow.
 */
export function commitTop(line, total, visRows = 4) {
  const maxTop = maxWindowTop(total, visRows);
  return Math.max(0, Math.min(maxTop, line - (visRows - 1)));
}

/**
 * Window top for TTS follow-along. Keeps the spoken line one row down from the top (line - 1) so
 * there's a line of read context above and lookahead below (room to sparkle-reveal the next line
 * on a visible row). NOT clamped to a previous top: playback restarting at line 0 must be able to
 * scroll the window back to the top, then track the spoken line down one line at a time.
 */
export function ttsWindowTop(line, total, visRows = 4) {
  const maxTop = maxWindowTop(total, visRows);
  return Math.max(0, Math.min(maxTop, line - 1));
}

/**
 * Clip percentage for a unit's Arabic line given the current scrub position:
 * fully revealed (0%) before the target line, partially clipped on the target line,
 * fully hidden (100%) after it. Matches the clip-path inset(0 0 0 X%) reveal (R→L).
 */
export function clipPercentForLine(idx, line, within) {
  if (idx < line) return 0;
  if (idx === line) return (1 - within) * 100;
  return 100;
}
