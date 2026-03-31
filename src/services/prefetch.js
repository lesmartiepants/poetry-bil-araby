/**
 * Prefetch Manager — aggressive background prefetching for audio and insights.
 *
 * Strategy:
 * - Priority 1: Current poem audio + insights (immediately on poem change)
 * - Priority 2: Adjacent poems audio (3s delay)
 * - Priority 3: Discover poems (5s delay)
 */

import { FEATURES } from '../constants/index.js';
import { INSIGHTS_SYSTEM_PROMPT, getTTSContent, getTTSContentForText } from '../prompts';
import { API_MODELS, TTS_CONFIG, geminiTextFetch, fetchTTSWithFallback } from './gemini.js';
import { CACHE_CONFIG, cacheOperations } from './cache.js';
import { pcm16ToWav, concatenatePCM16Base64 } from '../utils/audio.js';

import { usePoemStore } from '../stores/poemStore';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const CHUNK_THRESHOLD = 150;
const MAX_CHUNK_CHARS = 140;

function splitPoemIntoChunks(arabicText) {
  if (!arabicText || arabicText.length <= CHUNK_THRESHOLD) return null;
  const lines = arabicText.split('\n').filter((l) => l.trim());
  const chunks = [];
  let current = '';
  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (current && candidate.length > MAX_CHUNK_CHARS) {
      chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 1 ? chunks : null;
}

async function generateChunkAudio(chunkText, model) {
  const ttsContent = getTTSContentForText(chunkText);
  const body = JSON.stringify({
    contents: [{ parts: [{ text: ttsContent }] }],
    generationConfig: {
      responseModalities: TTS_CONFIG.responseModalities,
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_CONFIG.voiceName } } },
    },
  });
  const res = await fetch(`${apiUrl}/api/ai/${model}/generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error?.message || `HTTP ${res.status}`), {
      status: res.status,
    });
  }
  const data = await res.json();
  const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) throw new Error('No audio data in chunk response');
  return b64;
}

// Track poem IDs that hit quota errors — never retry these in this session
const _quotaExhaustedIds = new Set();

export const prefetchManager = {
  /**
   * Prefetch audio for a poem (generate and cache in background).
   */
  prefetchAudio: async (poemId, poem, addLog) => {
    if (!FEATURES.prefetching || !FEATURES.caching) return;
    if (!poemId || !poem?.arabic) return;

    // Skip if quota was exhausted for this poem earlier in the session
    if (_quotaExhaustedIds.has(poemId)) return;

    try {
      // Check if already generating - silently skip
      if (usePoemStore.getState().hasActiveAudio(poemId)) {
        if (addLog)
          addLog(
            'Prefetch Audio',
            `Already generating audio for poem ${poemId} - skipping`,
            'info'
          );
        return;
      }

      // Check cache first - don't prefetch if already cached
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.audio, poemId);
      if (cached?.blob) {
        if (addLog)
          addLog('Prefetch Audio', `Audio already cached for poem ${poemId} - skipping`, 'info');
        return;
      }

      // Mark as in-flight
      usePoemStore.getState().addActiveAudio(poemId);

      const arabicChunks = splitPoemIntoChunks(poem.arabic);
      const estimatedTokens = Math.ceil(poem.arabic.length / 4);
      const apiStart = performance.now();
      let b64;
      let ttsModel = API_MODELS.tts;

      if (arabicChunks) {
        // Parallel chunk generation for long poems
        if (addLog)
          addLog(
            'Prefetch Audio',
            `→ Background audio (poem ${poemId}) | ${arabicChunks.length} chunks | Model: ${API_MODELS.tts} | ${poem.arabic.length} chars Arabic`,
            'info'
          );
        const b64Array = await Promise.all(
          arabicChunks.map((chunk) => generateChunkAudio(chunk, API_MODELS.tts))
        );
        b64 = concatenatePCM16Base64(b64Array);
      } else {
        // Single request for short poems
        const ttsContent = getTTSContent(poem);
        const requestBody = JSON.stringify({
          contents: [{ parts: [{ text: ttsContent }] }],
          generationConfig: {
            responseModalities: TTS_CONFIG.responseModalities,
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_CONFIG.voiceName } },
            },
          },
        });
        const requestSize = new Blob([requestBody]).size;

        if (addLog)
          addLog(
            'Prefetch Audio',
            `→ Background audio generation (poem ${poemId}) | Model: ${API_MODELS.tts} | ${(requestSize / 1024).toFixed(1)}KB | ${estimatedTokens} tokens`,
            'info'
          );

        const url = `${apiUrl}/api/ai/${API_MODELS.tts}/generateContent`;
        const fetchOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        };
        const { res, model: resolvedModel } = await fetchTTSWithFallback(url, fetchOptions, {
          addLog,
          label: 'Prefetch Audio',
        });
        ttsModel = resolvedModel;

        if (!res.ok) {
          const errorText = await res.text();
          if (res.status === 429 || res.status === 403) {
            _quotaExhaustedIds.add(poemId);
            if (addLog)
              addLog(
                'Prefetch Audio',
                `❌ [${ttsModel}] HTTP ${res.status} — quota exhausted, skipping future prefetch for poem ${poemId}`,
                'error'
              );
            return;
          }
          if (addLog)
            addLog(
              'Prefetch Audio',
              `❌ [${ttsModel}] Audio generation HTTP ${res.status}: ${errorText.substring(0, 150)}`,
              'error'
            );
          return;
        }

        const data = await res.json();
        if (!data.candidates || data.candidates.length === 0) {
          if (addLog)
            addLog(
              'Prefetch Audio',
              `❌ [${ttsModel}] Audio generation failed for poem ${poemId}. Response: ${JSON.stringify(data).substring(0, 200)}`,
              'error'
            );
          return;
        }
        b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      }

      const apiTime = performance.now() - apiStart;
      if (b64) {
        const blob = pcm16ToWav(b64);
        if (blob) {
          // Calculate metrics
          const pcmBytes = atob(b64.replace(/\s/g, '')).length;
          const samples = pcmBytes / 2;
          const audioDuration = samples / 24000;
          const tokensPerSecond = (estimatedTokens / (apiTime / 1000)).toFixed(1);

          // Cache the blob
          await cacheOperations.set(CACHE_CONFIG.stores.audio, poemId, {
            blob,
            metadata: {
              poet: poem.poet,
              title: poem.title,
              size: blob.size,
              duration: audioDuration,
              model: ttsModel,
            },
          });

          if (addLog)
            addLog(
              'Prefetch Audio',
              `✓ [${ttsModel}] Audio cached (poem ${poemId}) | ${(apiTime / 1000).toFixed(1)}s | ${(blob.size / 1024).toFixed(1)}KB | ${audioDuration.toFixed(1)}s audio | ${tokensPerSecond} tok/s`,
              'success'
            );
        }
      }
    } catch (error) {
      // Silently handle errors - don't disrupt user experience
      if (addLog)
        addLog(
          'Prefetch Audio',
          `❌ Audio generation error for poem ${poemId}: ${error.message}`,
          'error'
        );
    } finally {
      usePoemStore.getState().removeActiveAudio(poemId);
    }
  },

  /**
   * Prefetch insights for a poem (generate and cache in background).
   */
  prefetchInsights: async (poemId, poem, addLog) => {
    if (!FEATURES.prefetching || !FEATURES.caching) return;
    if (!poemId || !poem?.arabic) return;

    try {
      // Check if already generating - silently skip
      if (usePoemStore.getState().hasActiveInsight(poemId)) {
        if (addLog)
          addLog(
            'Prefetch Insights',
            `Already generating insights for poem ${poemId} - skipping`,
            'info'
          );
        return;
      }

      // Check cache first - don't prefetch if already cached
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.insights, poemId);
      if (cached?.interpretation) {
        if (addLog)
          addLog(
            'Prefetch Insights',
            `Insights already cached for poem ${poemId} - skipping`,
            'info'
          );
        return;
      }

      // Mark as in-flight
      usePoemStore.getState().addActiveInsight(poemId);

      const poetInfo = poem?.poet ? ` by ${poem.poet}` : '';
      const promptText = `Deep Analysis of${poetInfo}:\n\n${poem.arabic}`;
      const requestSize = new Blob([
        JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
      ]).size;
      const estimatedInputTokens = Math.ceil(
        (promptText.length + INSIGHTS_SYSTEM_PROMPT.length) / 4
      );

      if (addLog) {
        addLog(
          'Prefetch Insights',
          `→ Background insights generation (poem ${poemId}) | ${(requestSize / 1024).toFixed(1)}KB | ${estimatedInputTokens} tokens`,
          'info'
        );
      }

      const apiStart = performance.now();
      const prefetchBody = JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        systemInstruction: { parts: [{ text: INSIGHTS_SYSTEM_PROMPT }] },
      });
      const res = await geminiTextFetch(
        'generateContent',
        prefetchBody,
        'Prefetch Insights',
        addLog
      );

      const data = await res.json();
      const apiTime = performance.now() - apiStart;
      const interpretation = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (interpretation) {
        // Calculate metrics
        const charCount = interpretation.length;
        const estimatedTokens = Math.ceil(charCount / 4);
        const tokensPerSecond = (estimatedTokens / (apiTime / 1000)).toFixed(1);

        // Cache the insights
        await cacheOperations.set(CACHE_CONFIG.stores.insights, poemId, {
          interpretation,
          metadata: { poet: poem.poet, title: poem.title, charCount, tokens: estimatedTokens },
        });

        if (addLog)
          addLog(
            'Prefetch Insights',
            `✓ Insights cached (poem ${poemId}) | ${(apiTime / 1000).toFixed(1)}s | ${charCount} chars (≈${estimatedTokens} tokens) | ${tokensPerSecond} tok/s`,
            'success'
          );
      }
    } catch (error) {
      // Silently handle errors - don't disrupt user experience
      if (addLog)
        addLog(
          'Prefetch Insights',
          `❌ Insights generation error for poem ${poemId}: ${error.message}`,
          'error'
        );
    } finally {
      // Clean up in-flight tracking
      usePoemStore.getState().removeActiveInsight(poemId);
    }
  },

  /**
   * Prefetch poems from discover (pre-fetch poems from category).
   */
  prefetchDiscover: async (category, count = 2, addLog) => {
    if (!FEATURES.prefetching || !FEATURES.caching) return;
    if (!category || category === 'All') return;

    try {
      if (addLog) addLog('Prefetch', `Pre-fetching ${count} poems from ${category}...`, 'info');
      // Placeholder - would fetch poems from discover API and cache
    } catch (error) {
      if (addLog) addLog('Prefetch', `Discover prefetch error: ${error.message}`, 'error');
    }
  },
};
