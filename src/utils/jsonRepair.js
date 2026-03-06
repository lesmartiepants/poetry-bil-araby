/**
 * Attempt to repair truncated or lightly malformed JSON strings.
 *
 * Handles common issues from AI-generated JSON:
 * - Markdown code fences (```json ... ```)
 * - Odd number of double-quote characters
 * - Unclosed braces / brackets
 *
 * @param {string} raw - The raw text that should contain JSON
 * @returns {object} The parsed JavaScript object
 * @throws {Error} When the JSON cannot be repaired
 */
export function repairAndParseJSON(raw) {
  const cleanJson = (raw || "").replace(/```json|```/g, "").trim();

  // Fast path — valid JSON
  try {
    return JSON.parse(cleanJson);
  } catch {
    // Fall through to repair
  }

  let repaired = cleanJson;

  // Close an odd trailing quote
  const quotes = (repaired.match(/"/g) || []).length;
  if (quotes % 2 !== 0) repaired += '"';

  // Close unclosed brackets
  const openBrackets =
    (repaired.match(/\[/g) || []).length -
    (repaired.match(/\]/g) || []).length;
  for (let i = 0; i < openBrackets; i++) repaired += ']';

  // Close unclosed braces
  const openBraces =
    (repaired.match(/\{/g) || []).length -
    (repaired.match(/\}/g) || []).length;
  for (let i = 0; i < openBraces; i++) repaired += '}';

  // Second attempt after repair
  try {
    return JSON.parse(repaired);
  } catch {
    throw new Error(
      "AI returned invalid JSON (poem may have been too long). Try again."
    );
  }
}
