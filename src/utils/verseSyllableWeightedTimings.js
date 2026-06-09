/**
 * Distribute word timings within verses, weighted by mora (length) count.
 *
 * Like verseLetterWeightedTimings, this keeps each verse's start/end from the
 * transcript and spreads that span across the verse's words — but the weight is
 * a *mora* count (length units) derived from the tashkeel, not raw letters.
 * A plain syllable (nucleus) count tracks letter count too closely to be useful;
 * morae capture vowel length and gemination, which is what letters miss.
 *
 * @param {{word:string,start:number,end:number}[]} timings
 * @param {number[]} wordOffsets  first word index of each verse
 * @returns {{word:string,start:number,end:number}[]}
 */
export function verseSyllableWeightedTimings(timings, wordOffsets) {
  if (!timings || timings.length === 0) return [];
  if (!wordOffsets || wordOffsets.length === 0) {
    return distributeByWeight(timings.map((t) => ({ ...t })), 0, timings.length, undefined, undefined, wordMoras);
  }

  const output = timings.map((t) => ({ ...t }));
  const N = timings.length;

  for (let v = 0; v < wordOffsets.length; v++) {
    const a = wordOffsets[v];
    const b = v + 1 < wordOffsets.length ? wordOffsets[v + 1] : N;
    if (a >= b || a >= N) continue;

    const segStart = timings[a].start;
    const segEnd = timings[Math.min(b - 1, N - 1)].end;
    if (segEnd < segStart) continue;

    distributeByWeight(output, a, b, segStart, segEnd, wordMoras);
  }

  return output;
}

/**
 * Spread [start, end) words across [segStart, segEnd] proportionally to weightFn.
 * Pluggable weight keeps this file DRY without touching the letter-weighted util.
 */
function distributeByWeight(arr, start, end, segStart, segEnd, weightFn) {
  const verseLength = end - start;
  if (verseLength <= 0) return arr;

  let totalWeight = 0;
  for (let i = start; i < end; i++) {
    totalWeight += Math.max(1, weightFn(arr[i].word));
  }

  const spanStart = segStart ?? arr[start].start;
  const spanEnd = segEnd ?? arr[end - 1].end;
  const spanDuration = spanEnd - spanStart;
  let cumulativeTime = spanStart;

  for (let i = start; i < end; i++) {
    const weight = Math.max(1, weightFn(arr[i].word));
    const wordDuration = spanDuration * (weight / totalWeight);

    arr[i].start = cumulativeTime;
    arr[i].end = cumulativeTime + wordDuration;
    cumulativeTime = arr[i].end;
  }

  // Force last word to end exactly at segEnd (kills float drift across the verse)
  if (end > start && segEnd !== undefined) {
    arr[end - 1].end = segEnd;
  }

  return arr;
}

// ── Arabic mora counting (tashkeel-aware) ── (explicit codepoints: combining
// marks as source literals attach to neighbouring glyphs and are unreviewable)
const SHORT_HARAKA = /[َُِ]/; // fatha, damma, kasra
const TANWIN = /[ًٌٍ]/; // fathatan, dammatan, kasratan (vowel + n → one nucleus)
const DAGGER_ALEF = 'ٰ'; // superscript alef: long /aː/ nucleus (هٰذا, اللّٰه)
const SHADDA = 'ّ'; // gemination: lengthens the consonant
const SUKOON = 'ْ'; // no vowel (closes a syllable)
const ALEF_MADDAH = 'آ'; // آ  alef + madd: long nucleus
const LONG_LETTERS = /[اوي]/; // alef, waw, yaa
// Arabic letters proper (NOT diacritics, which are handled before this test)
const ARABIC_LETTER = /[ء-يٱ-ۓ]/;

/**
 * Mora (length-unit) count for one Arabic word, using its tashkeel.
 * Nucleus comes from the haraka; long vowels (madd) and shadda add length.
 *
 *   short haraka / tanwin → +1 (syllable nucleus)
 *   dagger alef ٰ, آ      → +2 (long nucleus)
 *   madd ا/و/ي after a haraka, no own mark → +1 (length on the prior nucleus)
 *   shadda ّ              → +1 (geminated consonant)
 *   sukoon ْ              →  0
 *   bare consonant        →  0 (its vowel is counted via its haraka)
 *
 * A bare ا/و/ي that is itself a consonant (وَ, يَد) is NOT counted as madd —
 * it's followed by its own haraka or sits at a word boundary, so only the real
 * long-vowel cases add length. Falls back to ceil(letters/2) for an
 * unvocalized word, and floors at 1 so every word gets nonzero dwell.
 *
 * @param {string} word
 * @returns {number} mora count, ≥ 1
 */
export function wordMoras(word) {
  if (!word) return 1;
  const t = word.normalize('NFC');
  let moras = 0;
  let arabicLetters = 0;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (SHORT_HARAKA.test(c)) { moras += 1; continue; } // nucleus
    if (TANWIN.test(c)) { moras += 1; continue; } // nucleus (vowel + n)
    if (c === DAGGER_ALEF) { moras += 2; continue; } // long nucleus
    if (c === SHADDA) { moras += 1; continue; } // gemination length
    if (c === SUKOON) continue; // no vowel
    if (c === ALEF_MADDAH) { moras += 2; arabicLetters += 1; continue; } // long nucleus
    if (LONG_LETTERS.test(c)) {
      arabicLetters += 1;
      const prev = t[i - 1];
      const next = t[i + 1];
      // Madd: long vowel sitting on a preceding short haraka, carrying no mark of
      // its own. A consonantal و/ي (followed by its own haraka/sukoon/shadda) or a
      // word-initial long letter (no preceding haraka) does not qualify.
      const isMadd =
        prev && SHORT_HARAKA.test(prev) &&
        !(next && (SHORT_HARAKA.test(next) || TANWIN.test(next) || next === SUKOON || next === SHADDA));
      if (isMadd) moras += 1; // length only; the nucleus was the preceding haraka
      continue;
    }
    if (ARABIC_LETTER.test(c)) { arabicLetters += 1; continue; } // consonant
  }

  if (moras === 0) {
    // Unvocalized word or punctuation-only token
    moras = Math.ceil(Math.max(1, arabicLetters) / 2);
  }
  return Math.max(1, moras);
}
