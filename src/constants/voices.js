/**
 * Voice catalog for the voice-cycle pill next to Listen.
 *
 * The full set of Gemini prebuilt voices, grouped female-first then male (same
 * order as the DebugPanel picker). The pill cycles through every voice in this
 * order, one per tap. Each entry carries a `gender` so the pill can tint its
 * icon (female vs male) as a quick visual cue.
 */
// Active voices (quality-checked)
const ACTIVE_VOICES = [
  // Female
  // { name: 'Zephyr', descriptor: 'Bright', gender: 'f' }, // TODO: quality check needed
  { name: 'Kore', descriptor: 'Firm', gender: 'f' },
  { name: 'Leda', descriptor: 'Youthful', gender: 'f' },
  { name: 'Aoede', descriptor: 'Breezy', gender: 'f' },
  { name: 'Callirrhoe', descriptor: 'Easy-going', gender: 'f' },
  { name: 'Autonoe', descriptor: 'Bright', gender: 'f' },
  { name: 'Despina', descriptor: 'Smooth', gender: 'f' },
  // { name: 'Erinome', descriptor: 'Clear', gender: 'f' }, // TODO: quality check needed
  { name: 'Laomedeia', descriptor: 'Upbeat', gender: 'f' },
  // { name: 'Achernar', descriptor: 'Soft', gender: 'f' }, // TODO: quality check needed
  // { name: 'Pulcherrima', descriptor: 'Forward', gender: 'f' }, // TODO: quality check needed
  // { name: 'Achird', descriptor: 'Friendly', gender: 'f' }, // TODO: quality check needed
  { name: 'Schedar', descriptor: 'Even', gender: 'f' },
  // { name: 'Vindemiatrix', descriptor: 'Gentle', gender: 'f' }, // TODO: quality check needed
  { name: 'Sulafat', descriptor: 'Warm', gender: 'f' },
  // Male
  // { name: 'Orus', descriptor: 'Firm', gender: 'm' }, // TODO: quality check needed
  { name: 'Puck', descriptor: 'Upbeat', gender: 'm' },
  { name: 'Charon', descriptor: 'Informative', gender: 'm' },
  // { name: 'Fenrir', descriptor: 'Excitable', gender: 'm' }, // TODO: quality check needed
  { name: 'Enceladus', descriptor: 'Breathy', gender: 'm' },
  { name: 'Iapetus', descriptor: 'Clear', gender: 'm' },
  { name: 'Umbriel', descriptor: 'Easy-going', gender: 'm' },
  { name: 'Algieba', descriptor: 'Smooth', gender: 'm' },
  { name: 'Algenib', descriptor: 'Gravelly', gender: 'm' },
  { name: 'Rasalgethi', descriptor: 'Informative', gender: 'm' },
  // { name: 'Alnilam', descriptor: 'Firm', gender: 'm' }, // TODO: quality check needed
  // { name: 'Gacrux', descriptor: 'Mature', gender: 'm' }, // TODO: quality check needed
  { name: 'Zubenelgenubi', descriptor: 'Casual', gender: 'm' },
  { name: 'Sadachbia', descriptor: 'Lively', gender: 'm' },
  { name: 'Sadaltager', descriptor: 'Knowledgeable', gender: 'm' },
];

export const VOICE_CATALOG = ACTIVE_VOICES;

/** The voice used until the listener picks another. */
export const DEFAULT_VOICE = 'Charon';

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
 * Next voice in the cycle, alternating between male and female voices.
 * Cycles through all voices of the opposite gender in order.
 *
 * @param {string} current - the currently selected voice name
 * @returns {string} the next voice name (opposite gender)
 */
export function nextVoice(current) {
  const currentVoice = _byName.get(current);
  if (!currentVoice) {
    // Unknown voice, cycle to first voice
    return VOICE_CATALOG[0].name;
  }

  // Get all voices of opposite gender
  const oppositeGender = currentVoice.gender === 'f' ? 'm' : 'f';
  const oppositeVoices = VOICE_CATALOG.filter((v) => v.gender === oppositeGender);

  if (oppositeVoices.length === 0) {
    // No voices of opposite gender, cycle to first voice
    return VOICE_CATALOG[0].name;
  }

  // Find which opposite-gender voice we last came from (if any)
  // by checking sessionStorage or defaulting to cycle through in order
  const cycleKey = `voiceCycle_${currentVoice.gender}`;
  const lastIndex = parseInt(sessionStorage.getItem(cycleKey) || '-1', 10);
  const nextIndex = (lastIndex + 1) % oppositeVoices.length;

  // Store where we are in the opposite-gender cycle
  sessionStorage.setItem(`voiceCycle_${oppositeGender}`, nextIndex.toString());

  return oppositeVoices[nextIndex].name;
}
