// How chosen lines split across share cards (7.5, 7.6, frames Split7/8/10).
export const MAX_ON_ONE_CARD = 6;

export function splitForCards(lineCount: number): number[] {
  if (lineCount <= 0) return [];
  if (lineCount <= MAX_ON_ONE_CARD) return [lineCount];
  if (lineCount <= 10) {
    const first = Math.max(4, lineCount - 4);
    return [first, lineCount - first];
  }
  // A long poem pages through cards of four lines.
  const out: number[] = [];
  for (let left = lineCount; left > 0; left -= 4) out.push(Math.min(4, left));
  return out;
}
