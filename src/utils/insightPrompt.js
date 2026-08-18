/**
 * Build the user-turn prompt for a poem insight request.
 *
 * Shared by the in-app request (stores/actions/analyzePoem.js) and the batch
 * backfill (scripts/batch-translate.mjs) so a translation generated offline is
 * byte-identical to one generated live. When these drifted, the corpus slowly
 * accumulated two different translation styles with no way to tell them apart.
 *
 * `arabic` is the newline-separated form the reader displays. The database
 * stores hemistichs separated by '*'; services/database.js converts on read,
 * and callers working straight from SQL should convert first.
 *
 * @param {Object} poem
 * @param {string} poem.arabic - Newline-separated Arabic text
 * @param {string} [poem.poet] - Poet name, omitted from the prompt when absent
 * @returns {string}
 */
export function buildInsightPrompt({ arabic, poet } = {}) {
  const poetInfo = poet ? ` by ${poet}` : '';
  const arabicLineCount = (arabic || '').split('\n').filter((l) => l.trim()).length;
  return `Deep Analysis of${poetInfo}:\n\n${arabic}\n\n[CRITICAL: This poem has exactly ${arabicLineCount} Arabic lines. You MUST produce exactly ${arabicLineCount} English lines in the POEM section. One line per Arabic line, no exceptions.]`;
}
