/**
 * Voice catalog for the voice-cycle pill next to Listen.
 *
 * The full set of Gemini prebuilt voices, grouped female-first then male (same
 * order as the DebugPanel picker). The pill cycles through every voice in this
 * order, one per tap. Each entry carries a `gender` so the pill can tint its
 * icon (female vs male) as a quick visual cue.
 */
export const VOICE_CATALOG = [
  // Female
  { name: 'Zephyr', descriptor: 'Bright', gender: 'f' },
  { name: 'Kore', descriptor: 'Firm', gender: 'f' },
  { name: 'Leda', descriptor: 'Youthful', gender: 'f' },
  { name: 'Aoede', descriptor: 'Breezy', gender: 'f' },
  { name: 'Callirrhoe', descriptor: 'Easy-going', gender: 'f' },
  { name: 'Autonoe', descriptor: 'Bright', gender: 'f' },
  { name: 'Despina', descriptor: 'Smooth', gender: 'f' },
  { name: 'Erinome', descriptor: 'Clear', gender: 'f' },
  { name: 'Laomedeia', descriptor: 'Upbeat', gender: 'f' },
  { name: 'Achernar', descriptor: 'Soft', gender: 'f' },
  { name: 'Pulcherrima', descriptor: 'Forward', gender: 'f' },
  { name: 'Achird', descriptor: 'Friendly', gender: 'f' },
  { name: 'Schedar', descriptor: 'Even', gender: 'f' },
  { name: 'Vindemiatrix', descriptor: 'Gentle', gender: 'f' },
  { name: 'Sulafat', descriptor: 'Warm', gender: 'f' },
  // Male
  { name: 'Orus', descriptor: 'Firm', gender: 'm' },
  { name: 'Puck', descriptor: 'Upbeat', gender: 'm' },
  { name: 'Charon', descriptor: 'Informative', gender: 'm' },
  { name: 'Fenrir', descriptor: 'Excitable', gender: 'm' },
  { name: 'Enceladus', descriptor: 'Breathy', gender: 'm' },
  { name: 'Iapetus', descriptor: 'Clear', gender: 'm' },
  { name: 'Umbriel', descriptor: 'Easy-going', gender: 'm' },
  { name: 'Algieba', descriptor: 'Smooth', gender: 'm' },
  { name: 'Algenib', descriptor: 'Gravelly', gender: 'm' },
  { name: 'Rasalgethi', descriptor: 'Informative', gender: 'm' },
  { name: 'Alnilam', descriptor: 'Firm', gender: 'm' },
  { name: 'Gacrux', descriptor: 'Mature', gender: 'm' },
  { name: 'Zubenelgenubi', descriptor: 'Casual', gender: 'm' },
  { name: 'Sadachbia', descriptor: 'Lively', gender: 'm' },
  { name: 'Sadaltager', descriptor: 'Knowledgeable', gender: 'm' },
];

/** The voice used until the listener picks another. */
export const DEFAULT_VOICE = 'Orus';

const _byName = new Map(VOICE_CATALOG.map((v) => [v.name, v]));

/** Full catalog entry for a voice name, or null if not in the catalog. */
export function voiceInfo(name) {
  return _byName.get(name) || null;
}

/** 'f' | 'm' for a voice name, or null if unknown. */
export function voiceGender(name) {
  return _byName.get(name)?.gender ?? null;
}

/**
 * Next voice in the cycle. A voice not in the catalog restarts the cycle at the
 * first entry, so the pill never gets stuck.
 *
 * @param {string} current - the currently selected voice name
 * @returns {string} the next voice name
 */
export function nextVoice(current) {
  const i = VOICE_CATALOG.findIndex((v) => v.name === current);
  return VOICE_CATALOG[(i + 1) % VOICE_CATALOG.length].name;
}
