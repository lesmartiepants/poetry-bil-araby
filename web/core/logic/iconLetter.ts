// A list's icon letter: the name's first letter as the nearest Arabic letter.
const LATIN_TO_ARABIC: Record<string, string> = {
  a: 'ا', b: 'ب', c: 'ك', d: 'د', e: 'ا', f: 'ف', g: 'ج', h: 'ه', i: 'ا', j: 'ج', k: 'ك', l: 'ل', m: 'م',
  n: 'ن', o: 'ا', p: 'ب', q: 'ق', r: 'ر', s: 'س', t: 'ت', u: 'ا', v: 'ف', w: 'و', x: 'ك', y: 'ي', z: 'ز',
};
export const ARABIC_LETTERS = [
  'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك',
  'ل', 'م', 'ن', 'ه', 'و', 'ي',
];
const ARABIC_RE = /[ء-ي]/;

function letterFor(word: string): string {
  const ch = [...word.trim()].find((c) => /\p{L}/u.test(c));
  if (!ch) return '';
  if (ARABIC_RE.test(ch)) return ch === 'أ' || ch === 'إ' || ch === 'آ' ? 'ا' : ch;
  return LATIN_TO_ARABIC[ch.toLowerCase()] ?? '';
}

/** The automatic icon letter for a list name. */
export function autoIconLetter(name: string): string {
  return letterFor(name) || 'ق';
}

/** Letters offered in the row: the first word's, then the other words', no repeats. */
export function iconLetterChoices(name: string): string[] {
  const seen = new Set<string>();
  for (const w of name.split(/\s+/)) {
    const l = letterFor(w);
    if (l) seen.add(l);
  }
  return [...seen];
}

/** What the icon shows: a chosen letter wins; empty means automatic. */
export function iconLetterOf(list: { name: string; iconLetter: string }): string {
  return list.iconLetter || autoIconLetter(list.name);
}
