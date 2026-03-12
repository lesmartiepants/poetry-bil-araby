export const ARABIC_TRANSLIT_MAP = {
  // Base letters
  ا: 'a',
  أ: 'a',
  إ: 'i',
  آ: 'aa',
  ٱ: 'a',
  ب: 'b',
  ت: 't',
  ث: 'th',
  ج: 'j',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'dh',
  ر: 'r',
  ز: 'z',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'd',
  ط: 't',
  ظ: 'z',
  ع: "'",
  غ: 'gh',
  ف: 'f',
  ق: 'q',
  ك: 'k',
  ل: 'l',
  م: 'm',
  ن: 'n',
  ه: 'h',
  و: 'w',
  ي: 'y',
  ى: 'a',
  ة: 'h',
  ء: "'",
  ؤ: "'",
  ئ: "'",
  // Diacritics
  '\u064E': 'a', // fatha
  '\u064F': 'u', // damma
  '\u0650': 'i', // kasra
  '\u0651': '', // shadda (handled by doubling previous consonant)
  '\u0652': '', // sukun (no vowel)
  '\u064B': 'an', // tanween fatha
  '\u064C': 'un', // tanween damma
  '\u064D': 'in', // tanween kasra
  '\u0670': 'a', // alef superscript
  // Common punctuation
  '،': ',',
  '؛': ';',
  '؟': '?',
  '»': '"',
  '«': '"',
  '\u200C': '',
  '\u200D': '',
  '\u200F': '',
  '\u200E': '', // zero-width chars
};

export function transliterate(text) {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    // Handle shadda: double the previous consonant
    if (ch === '\u0651') {
      const lastChar = result[result.length - 1];
      if (lastChar && lastChar !== ' ') result += lastChar;
      continue;
    }
    if (ch in ARABIC_TRANSLIT_MAP) {
      result += ARABIC_TRANSLIT_MAP[ch];
    } else if (/[\s\n]/.test(ch)) {
      result += ch;
    } else if (/[a-zA-Z0-9.,!?;:'"()\-–—…]/.test(ch)) {
      result += ch; // pass through Latin chars and common punctuation
    }
    // Skip unrecognized Arabic diacritics/formatting chars
  }
  return result;
}
