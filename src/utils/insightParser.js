/**
 * Parse AI insight text into structured sections.
 *
 * The Gemini response follows the pattern:
 *   POEM: <poetic translation>
 *   THE DEPTH: <analysis>
 *   THE AUTHOR: <author bio>
 *
 * @param {string|null|undefined} interpretation - Raw insight text from the AI
 * @returns {{ poeticTranslation: string, depth: string, author: string } | null}
 */
export function parseInsight(interpretation) {
  if (!interpretation) return null;
  const parts = interpretation
    .split(/POEM:|THE DEPTH:|THE AUTHOR:/i)
    .map(p => p.trim())
    .filter(Boolean);
  return {
    poeticTranslation: parts[0] || "",
    depth: parts[1] || "",
    author: parts[2] || "",
  };
}
