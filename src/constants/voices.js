/**
 * Voice options for the one-tap voice cycle pill next to Listen.
 *
 * This is a curated shortlist — a few good Gemini prebuilt voices users can flip
 * between without leaving the reading view. The full 30-voice list still lives in
 * the DebugPanel for power users. Keep the shortlist small: the pill cycles in
 * order, so 4 is about the most that feels like a "toggle" rather than a menu.
 */
export const VOICE_SHORTLIST = [
  { name: 'Orus', descriptor: 'Firm' },
  { name: 'Kore', descriptor: 'Firm' },
  { name: 'Charon', descriptor: 'Informative' },
  { name: 'Leda', descriptor: 'Youthful' },
];

/** The voice used until the listener picks another. First entry of the shortlist. */
export const DEFAULT_VOICE = VOICE_SHORTLIST[0].name;

/**
 * Next voice in the cycle. A voice not in the shortlist (e.g. one set from the
 * DebugPanel) restarts the cycle at the first entry, so the pill never gets stuck.
 *
 * @param {string} current - the currently selected voice name
 * @returns {string} the next voice name
 */
export function nextVoice(current) {
  const i = VOICE_SHORTLIST.findIndex((v) => v.name === current);
  return VOICE_SHORTLIST[(i + 1) % VOICE_SHORTLIST.length].name;
}
