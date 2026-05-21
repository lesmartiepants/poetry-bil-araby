/**
 * Parse AI insight text into structured sections.
 *
 * The Gemini response follows the pattern:
 *   POEM: <poetic translation>
 *   THE DEPTH: <analysis>
 *   THE AUTHOR: <author bio>
 *
 * @param {string|null|undefined} interpretation - Raw insight text from the AI
 * @param {Function} [addLog] - Optional logging function (addLog(category, message, level))
 * @returns {{ poeticTranslation: string, depth: string, author: string } | null}
 */
export function parseInsight(interpretation, addLog) {
  if (!interpretation) {
    addLog?.('Translation', 'No interpretation text received', 'warning');
    return null;
  }
  const parts = interpretation
    .split(/POEM:|THE DEPTH:|THE AUTHOR:/i)
    .map(p => p.trim())
    .filter(Boolean);
  const result = {
    poeticTranslation: parts[0] || "",
    depth: parts[1] || "",
    author: parts[2] || "",
  };
  if (!result.poeticTranslation) {
    addLog?.('Translation', `Empty — no POEM marker | ${interpretation.length} chars`, 'error');
  }
  return result;
}
