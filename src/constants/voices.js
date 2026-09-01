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
  { name: 'Zephyr', descriptor: 'Bright', gender: 'f', arabicName: 'نور', displayName: 'Noor' },
  // { name: 'Kore', descriptor: 'Firm', gender: 'f' }, // archived: poet-curation exclusion
  // Reinstated by product decision. Its default screen was 48.5, while the
  // one-run 25% mora rescue scored 88.5; keep validating that rescue profile.
  { name: 'Leda', descriptor: 'Youthful', gender: 'f', arabicName: 'صبا', displayName: 'Saba' },
  { name: 'Aoede', descriptor: 'Breezy', gender: 'f', arabicName: 'نسمة', displayName: 'Nasmah' },
  // { name: 'Callirrhoe', descriptor: 'Easy-going', gender: 'f' }, // archived: 39.0 with the production timing profile; 50/50 fallback is a future rescue candidate
  {
    name: 'Autonoe',
    descriptor: 'Bright',
    gender: 'f',
    arabicName: 'إشراق',
    displayName: 'Ishraq',
  },
  // { name: 'Despina', descriptor: 'Smooth', gender: 'f' }, // archived: 35.1 with the production timing profile; transcript letters/final mora need repeat validation
  // { name: 'Erinome', descriptor: 'Clear', gender: 'f' }, // archived: poet-curation exclusion
  {
    name: 'Laomedeia',
    descriptor: 'Upbeat',
    gender: 'f',
    arabicName: 'بهجة',
    displayName: 'Bahjah',
  },
  // { name: 'Achernar', descriptor: 'Soft', gender: 'f' }, // archived: 49.7 with the production timing profile; 50/50 fallback is a future rescue candidate
  {
    name: 'Pulcherrima',
    descriptor: 'Forward',
    gender: 'f',
    arabicName: 'رائدة',
    displayName: 'Raidah',
  },
  // { name: 'Achird', descriptor: 'Friendly', gender: 'f' }, // archived: poet-curation exclusion
  // { name: 'Schedar', descriptor: 'Even', gender: 'f' }, // archived: poet-curation exclusion
  {
    name: 'Vindemiatrix',
    descriptor: 'Gentle',
    gender: 'f',
    arabicName: 'حنان',
    displayName: 'Hanan',
  },
  { name: 'Sulafat', descriptor: 'Warm', gender: 'f', arabicName: 'وداد', displayName: 'Widad' },
  // Male
  { name: 'Orus', descriptor: 'Firm', gender: 'm', arabicName: 'عزّام', displayName: 'Azzam' },
  // { name: 'Puck', descriptor: 'Upbeat', gender: 'm' }, // archived: 46.7 with the production timing profile; 75% mora is a future rescue candidate
  {
    name: 'Charon',
    descriptor: 'Informative',
    gender: 'm',
    arabicName: 'عارف',
    displayName: 'Aref',
  },
  // { name: 'Fenrir', descriptor: 'Excitable', gender: 'm' }, // archived: poet-curation exclusion
  {
    name: 'Enceladus',
    descriptor: 'Breathy',
    gender: 'm',
    arabicName: 'نسيم',
    displayName: 'Naseem',
  },
  { name: 'Iapetus', descriptor: 'Clear', gender: 'm', arabicName: 'صافي', displayName: 'Safi' },
  // { name: 'Umbriel', descriptor: 'Easy-going', gender: 'm' }, // archived: poet-curation exclusion
  { name: 'Algieba', descriptor: 'Smooth', gender: 'm', arabicName: 'سليم', displayName: 'Saleem' },
  { name: 'Algenib', descriptor: 'Gravelly', gender: 'm', arabicName: 'صخر', displayName: 'Sakhr' },
  // { name: 'Rasalgethi', descriptor: 'Informative', gender: 'm' }, // archived: 34.4 with the production timing profile; full/25% mora needs repeat validation
  { name: 'Alnilam', descriptor: 'Firm', gender: 'm', arabicName: 'ثابت', displayName: 'Thabit' },
  // { name: 'Gacrux', descriptor: 'Mature', gender: 'm' }, // archived: poet-curation exclusion
  {
    name: 'Zubenelgenubi',
    descriptor: 'Casual',
    gender: 'm',
    arabicName: 'أنس',
    displayName: 'Anas',
  },
  // { name: 'Sadachbia', descriptor: 'Lively', gender: 'm' }, // archived: poet-curation exclusion
  // { name: 'Sadaltager', descriptor: 'Knowledgeable', gender: 'm' }, // archived: poet-curation exclusion
];

export const VOICE_CATALOG = ACTIVE_VOICES;

/** The voice used until the listener picks another. */
export const DEFAULT_VOICE = 'Leda';

const _byName = new Map(VOICE_CATALOG.map((v) => [v.name, v]));

/** Full catalog entry for a voice name, or null if not in the catalog. */
export function voiceInfo(name) {
  return _byName.get(name) || null;
}

/** English display name for the matched Arabic persona, or the raw voice id if unknown. */
export function voiceDisplayName(name) {
  return _byName.get(name)?.displayName ?? name;
}

/** 'f' | 'm' for a voice name, or null if unknown. */
export function voiceGender(name) {
  return _byName.get(name)?.gender ?? null;
}

/**
 * Next voice in the cycle, strictly alternating between male and female voices.
 * Male → Female → Male → Female, etc., cycling through different voices each tap.
 *
 * @param {string} current - the currently selected voice name
 * @returns {string} the next voice name (opposite gender, next in sequence)
 */
export function nextVoice(current) {
  const currentVoice = _byName.get(current);
  const maleVoices = VOICE_CATALOG.filter((v) => v.gender === 'm');
  const femaleVoices = VOICE_CATALOG.filter((v) => v.gender === 'f');

  if (!currentVoice) {
    // Unknown voice, default to first male
    return maleVoices[0]?.name || VOICE_CATALOG[0].name;
  }

  // Get the opposite gender list
  const oppositeVoices = currentVoice.gender === 'm' ? femaleVoices : maleVoices;
  if (oppositeVoices.length === 0) {
    return VOICE_CATALOG[0].name;
  }

  // Track position in each gender's cycle independently
  const maleKeyIndex = 'voiceCycleIndexMale';
  const femaleKeyIndex = 'voiceCycleIndexFemale';

  if (currentVoice.gender === 'm') {
    // Currently male, move to next female
    const femaleIndex = parseInt(sessionStorage.getItem(femaleKeyIndex) || '0', 10);
    const nextFemaleIndex = (femaleIndex + 1) % femaleVoices.length;
    sessionStorage.setItem(femaleKeyIndex, nextFemaleIndex.toString());
    return femaleVoices[nextFemaleIndex].name;
  } else {
    // Currently female, move to next male
    const maleIndex = parseInt(sessionStorage.getItem(maleKeyIndex) || '0', 10);
    const nextMaleIndex = (maleIndex + 1) % maleVoices.length;
    sessionStorage.setItem(maleKeyIndex, nextMaleIndex.toString());
    return maleVoices[nextMaleIndex].name;
  }
}
