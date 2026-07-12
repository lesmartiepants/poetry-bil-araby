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
  { name: 'Zephyr', descriptor: 'Bright', gender: 'f', arabicName: 'نور' },
  { name: 'Kore', descriptor: 'Firm', gender: 'f', arabicName: 'عزيزة' },
  { name: 'Leda', descriptor: 'Youthful', gender: 'f', arabicName: 'صبا' },
  { name: 'Aoede', descriptor: 'Breezy', gender: 'f', arabicName: 'نسمة' },
  { name: 'Callirrhoe', descriptor: 'Easy-going', gender: 'f', arabicName: 'هناء' },
  { name: 'Autonoe', descriptor: 'Bright', gender: 'f', arabicName: 'إشراق' },
  { name: 'Despina', descriptor: 'Smooth', gender: 'f', arabicName: 'سلمى' },
  { name: 'Erinome', descriptor: 'Clear', gender: 'f', arabicName: 'صفاء' },
  { name: 'Laomedeia', descriptor: 'Upbeat', gender: 'f', arabicName: 'بهجة' },
  { name: 'Achernar', descriptor: 'Soft', gender: 'f', arabicName: 'لطيفة' },
  { name: 'Pulcherrima', descriptor: 'Forward', gender: 'f', arabicName: 'رائدة' },
  { name: 'Achird', descriptor: 'Friendly', gender: 'f', arabicName: 'أنيسة' },
  { name: 'Schedar', descriptor: 'Even', gender: 'f', arabicName: 'سكينة' },
  { name: 'Vindemiatrix', descriptor: 'Gentle', gender: 'f', arabicName: 'حنان' },
  { name: 'Sulafat', descriptor: 'Warm', gender: 'f', arabicName: 'وداد' },
  // Male
  { name: 'Orus', descriptor: 'Firm', gender: 'm', arabicName: 'عزّام' },
  { name: 'Puck', descriptor: 'Upbeat', gender: 'm', arabicName: 'بشير' },
  { name: 'Charon', descriptor: 'Informative', gender: 'm', arabicName: 'عارف' },
  { name: 'Fenrir', descriptor: 'Excitable', gender: 'm', arabicName: 'وجدي' },
  { name: 'Enceladus', descriptor: 'Breathy', gender: 'm', arabicName: 'نسيم' },
  { name: 'Iapetus', descriptor: 'Clear', gender: 'm', arabicName: 'صافي' },
  { name: 'Umbriel', descriptor: 'Easy-going', gender: 'm', arabicName: 'هاني' },
  { name: 'Algieba', descriptor: 'Smooth', gender: 'm', arabicName: 'سليم' },
  { name: 'Algenib', descriptor: 'Gravelly', gender: 'm', arabicName: 'صخر' },
  { name: 'Rasalgethi', descriptor: 'Informative', gender: 'm', arabicName: 'راشد' },
  { name: 'Alnilam', descriptor: 'Firm', gender: 'm', arabicName: 'ثابت' },
  { name: 'Gacrux', descriptor: 'Mature', gender: 'm', arabicName: 'حليم' },
  { name: 'Zubenelgenubi', descriptor: 'Casual', gender: 'm', arabicName: 'أنس' },
  { name: 'Sadachbia', descriptor: 'Lively', gender: 'm', arabicName: 'حيّان' },
  { name: 'Sadaltager', descriptor: 'Knowledgeable', gender: 'm', arabicName: 'فهيم' },
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
