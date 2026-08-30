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
  // Empty is the normal pre-response state, not a failure. This runs from a
  // render memo, so every poem passes through it before the model answers and
  // again after each `Translation cleared`. Logging here painted a red FAIL on
  // ordinary waiting. The genuine "request finished with nothing" case is
  // logged by analyzePoem, which knows the request actually completed.
  if (!interpretation) return null;
  const parts = interpretation
    .split(/POEM:|THE DEPTH:|THE AUTHOR:/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const result = {
    poeticTranslation: parts[0] || '',
    depth: parts[1] || '',
    author: parts[2] || '',
  };
  if (!result.poeticTranslation) {
    addLog?.('Translation', `Empty — no POEM marker | ${interpretation.length} chars`, 'error');
  }
  return result;
}
