// Arabic text helpers: vowel marks off, and a search-friendly normal form.
const MARKS = /[ً-ٰٟۖ-ۭ]/g;

export function stripMarks(s: string): string {
  return s.replace(MARKS, '');
}

export function normalizeArabic(s: string): string {
  return fold(s).trim();
}
const fold = (s: string) =>
  stripMarks(s).replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ـ/g, '').toLowerCase();

export function words(line: string): string[] {
  return line.split(/\s+/).filter(Boolean);
}

/** A name as an Arabic dictionary files it: marks off, the article "ال" set aside. */
export function arabicSortKey(name: string): string {
  return normalizeArabic(name).replace(/^ال/, '');
}

/** The letter a name is filed under, with every alif written أ. */
export function arabicInitial(name: string): string {
  const first = arabicSortKey(name)[0] ?? '';
  return first === 'ا' ? 'أ' : first;
}

/**
 * Where `query` falls in `text`, ignoring vowel marks and letter variants the way search does:
 * [start, end) in the original text, marks included, or null.
 */
export function matchRange(text: string, query: string): [number, number] | null {
  const q = normalizeArabic(query);
  if (!q) return null;
  // Normalise one character at a time, remembering where each kept character came from.
  let flat = '';
  const from: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = fold(text[i]);
    for (const ch of c) { flat += ch; from.push(i); }
  }
  const at = flat.indexOf(q);
  if (at < 0) return null;
  let end = from[at + q.length - 1] + 1;
  while (end < text.length && fold(text[end]) === '') end++; // keep trailing marks
  return [from[at], end];
}
