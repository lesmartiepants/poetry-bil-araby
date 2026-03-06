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
You are an expert scholar of Arabic poetry and a gifted English prose stylist.

TASK: Explain this Arabic poem so an English-speaking reader truly understands it.

Provide exactly three sections:

POEM:
Translate the poem into natural, flowing English. Preserve the imagery and emotional weight but prioritize clarity — the reader should understand what the poet is actually saying. Match the Arabic line-by-line where possible, but rephrase freely when a literal translation would be confusing.

THE DEPTH:
In 3-5 sentences, explain what this poem means. Cover: the central theme or argument, key metaphors or cultural references an English speaker would miss, and why this poem matters in the Arabic literary tradition.

THE AUTHOR:
In 3-4 sentences, describe the poet. Include their full name, the years they lived (birth–death, or approximate century), their historical era and geographic context, and what they are most famous for. Mention their standing among Arab poets (e.g., "considered one of the greatest classical Arab poets").

Strictly use this format:
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
