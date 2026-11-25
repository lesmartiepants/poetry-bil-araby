// Arabic text helpers: vowel marks off, and a search-friendly normal form.
const MARKS = /[ً-ٰٟۖ-ۭ]/g;

export function stripMarks(s: string): string {
  return s.replace(MARKS, '');
}

export function normalizeArabic(s: string): string {
  return stripMarks(s)
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
    .toLowerCase()
    .trim();
}

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
