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
