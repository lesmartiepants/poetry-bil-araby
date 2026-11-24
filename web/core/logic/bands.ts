// Difficulty bands cut from the accessibility histogram by equal weight
// (ported from src/services/categoryBands.js). Higher score = harder.
import type { Band, BandKey } from '../types';

export interface Bucket {
  min: number;
  max: number;
  poemCount: number;
}

export const BAND_META: Record<BandKey, { en: string; ar: string; line: string }> = {
  gentle: { en: 'Gentle', ar: 'سهل', line: 'Plain words and direct images: a good place to start, in any era.' },
  measured: { en: 'Measured', ar: 'متوسّط', line: 'Richer rhetoric and some allusion.' },
  demanding: { en: 'Demanding', ar: 'عميق', line: 'Classical vocabulary and dense allusion.' },
};
const ORDER: BandKey[] = ['gentle', 'measured', 'demanding'];

export function deriveBands(histogram: Bucket[], count = 3): Band[] {
  const buckets = histogram
    .filter((b) => Number.isFinite(b.min) && Number.isFinite(b.max) && b.poemCount > 0)
    .sort((a, b) => a.min - b.min);
  const total = buckets.reduce((n, b) => n + b.poemCount, 0);
  if (!total) return [];
  const out: Omit<Band, 'key' | 'en' | 'ar' | 'line'>[] = [];
  let cursor = 0;
  let lower = buckets[0].min;
  let running = 0;
  for (let i = 0; i < count; i += 1) {
    const isLast = i === count - 1;
    const target = (total * (i + 1)) / count;
    let n = 0;
    while (cursor < buckets.length && (isLast || running + n < target)) {
      n += buckets[cursor].poemCount;
      cursor += 1;
      if (!isLast && running + n >= target) break;
    }
    if (n === 0 && !isLast) continue;
    const upper = isLast ? buckets[buckets.length - 1].max : buckets[cursor - 1].max;
    out.push({ min: lower, max: upper, poemCount: n });
    running += n;
    lower = upper;
    if (cursor >= buckets.length) break;
  }
  return out.map((b, i) => {
    const key = ORDER[i] ?? 'demanding';
    return { key, ...BAND_META[key], ...b };
  });
}
