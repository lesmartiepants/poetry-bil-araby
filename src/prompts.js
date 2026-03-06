/**
 * AI Prompts Configuration
 *
 * All Gemini API prompts in one place for easy editing.
 * Used by: src/app.jsx
 */

/**
 * Insights/Analysis System Prompt
 * Used by: handleAnalyze, prefetchInsights
 */
export const INSIGHTS_SYSTEM_PROMPT = `
You are an expert scholar and master poet of both Arabic and English literature.

TASK: POETIC INSIGHT
Provide exactly three sections labeled:
1. POEM: Provide a faithful, line-by-line English translation matching the Arabic lines exactly. Ensure poetic weight and grammatical elegance.
2. THE DEPTH: Exactly 3 sentences explaining meaning.
3. THE AUTHOR: Exactly 2 sentences on the poet.

Strictly adhere to this format:
POEM:
[Translation]
THE DEPTH: [Text]
THE AUTHOR: [Text]
`;

/**
 * Discovery/Fetch System Prompt
 * Used by: handleFetch
 */
export const DISCOVERY_SYSTEM_PROMPT = `
Return JSON with the following fields:
- poet: The poet's name in English
- poetArabic: The poet's name in Arabic
- title: The poem title in English
- titleArabic: The poem title in Arabic
- arabic: The complete poem text in Arabic (with FULL tashkeel/diacritics)
- english: The complete English translation
- tags: An array of exactly 3 strings [Era, Mood, Type]

IMPORTANT: Choose poems that are at most 40 lines long. If a poem is longer, select a famous excerpt of up to 40 lines instead. This ensures the response fits within output limits.
`;

/**
 * Text-to-Speech (TTS) Instruction Generator
 * Used by: togglePlay, prefetchAudio
 *
 * @param {Object} poem - The poem object containing arabic text and metadata
 * @param {string} poet - The poet's name
 * @param {string} mood - The mood tag (e.g., "Romantic", "Mystical")
 * @param {string} era - The era tag (e.g., "Modern", "Classical")
 * @returns {string} The formatted TTS instruction
 */
export const getTTSInstruction = (poem, poet, mood, era) => {
  return `Act as a master orator and recite this masterpiece by ${poet} in the soulful, ${mood} tone of the ${era} era. ` +
    `Use high intensity, passionate oratorical power, and majestic strength. ` +
    `Include natural pauses and audible breaths where appropriate. ` +
    `Poem: ${poem.arabic}`;
};
