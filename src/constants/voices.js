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
  { name: 'Zephyr', descriptor: 'Bright', gender: 'f', arabicName: 'نور', displayName: 'Noor' },
  { name: 'Kore', descriptor: 'Firm', gender: 'f', arabicName: 'عزيزة', displayName: 'Azizah' },
  { name: 'Leda', descriptor: 'Youthful', gender: 'f', arabicName: 'صبا', displayName: 'Saba' },
  { name: 'Aoede', descriptor: 'Breezy', gender: 'f', arabicName: 'نسمة', displayName: 'Nasmah' },
  {
    name: 'Callirrhoe',
    descriptor: 'Easy-going',
    gender: 'f',
    arabicName: 'هناء',
    displayName: 'Hanaa',
  },
  {
    name: 'Autonoe',
    descriptor: 'Bright',
    gender: 'f',
    arabicName: 'إشراق',
    displayName: 'Ishraq',
  },
  { name: 'Despina', descriptor: 'Smooth', gender: 'f', arabicName: 'سلمى', displayName: 'Salma' },
  { name: 'Erinome', descriptor: 'Clear', gender: 'f', arabicName: 'صفاء', displayName: 'Safaa' },
  {
    name: 'Laomedeia',
    descriptor: 'Upbeat',
    gender: 'f',
    arabicName: 'بهجة',
    displayName: 'Bahjah',
  },
  {
    name: 'Achernar',
    descriptor: 'Soft',
    gender: 'f',
    arabicName: 'لطيفة',
    displayName: 'Latifah',
  },
  {
    name: 'Pulcherrima',
    descriptor: 'Forward',
    gender: 'f',
    arabicName: 'رائدة',
    displayName: 'Raidah',
  },
  {
    name: 'Achird',
    descriptor: 'Friendly',
    gender: 'f',
    arabicName: 'أنيسة',
    displayName: 'Anisah',
  },
  { name: 'Schedar', descriptor: 'Even', gender: 'f', arabicName: 'سكينة', displayName: 'Sakinah' },
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
  { name: 'Puck', descriptor: 'Upbeat', gender: 'm', arabicName: 'بشير', displayName: 'Basheer' },
  {
    name: 'Charon',
    descriptor: 'Informative',
    gender: 'm',
    arabicName: 'عارف',
    displayName: 'Aref',
  },
  {
    name: 'Fenrir',
    descriptor: 'Excitable',
    gender: 'm',
    arabicName: 'وجدي',
    displayName: 'Wajdi',
  },
  {
    name: 'Enceladus',
    descriptor: 'Breathy',
    gender: 'm',
    arabicName: 'نسيم',
    displayName: 'Naseem',
  },
  { name: 'Iapetus', descriptor: 'Clear', gender: 'm', arabicName: 'صافي', displayName: 'Safi' },
  {
    name: 'Umbriel',
    descriptor: 'Easy-going',
    gender: 'm',
    arabicName: 'هاني',
    displayName: 'Hani',
  },
  { name: 'Algieba', descriptor: 'Smooth', gender: 'm', arabicName: 'سليم', displayName: 'Saleem' },
  { name: 'Algenib', descriptor: 'Gravelly', gender: 'm', arabicName: 'صخر', displayName: 'Sakhr' },
  {
    name: 'Rasalgethi',
    descriptor: 'Informative',
    gender: 'm',
    arabicName: 'راشد',
    displayName: 'Rashid',
  },
  { name: 'Alnilam', descriptor: 'Firm', gender: 'm', arabicName: 'ثابت', displayName: 'Thabit' },
  { name: 'Gacrux', descriptor: 'Mature', gender: 'm', arabicName: 'حليم', displayName: 'Haleem' },
  {
    name: 'Zubenelgenubi',
    descriptor: 'Casual',
    gender: 'm',
    arabicName: 'أنس',
    displayName: 'Anas',
  },
  {
    name: 'Sadachbia',
    descriptor: 'Lively',
    gender: 'm',
    arabicName: 'حيّان',
    displayName: 'Hayyan',
  },
  {
    name: 'Sadaltager',
    descriptor: 'Knowledgeable',
    gender: 'm',
    arabicName: 'فهيم',
    displayName: 'Faheem',
  },
];

/** The voice used until the listener picks another. */
export const DEFAULT_VOICE = 'Orus';

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
