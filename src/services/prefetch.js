/**
 * Prefetch Manager — aggressive background prefetching for audio and insights.
 *
 * Strategy:
 * - Priority 1: Current poem audio + insights (immediately on poem change)
 * - Priority 2: Adjacent poems audio (3s delay)
 * - Priority 3: Discover poems (5s delay)
 */

import { FEATURES } from '../constants/index.js';
import { INSIGHTS_SYSTEM_PROMPT, getTTSContent } from '../prompts';
import { API_MODELS, TTS_CONFIG, geminiTextFetch, fetchTTSWithFallback, canPrefetchTts } from './gemini.js';
import { CACHE_CONFIG, cacheOperations } from './cache.js';
import { pcm16ToWav } from '../utils/audio.js';

import { usePoemStore } from '../stores/poemStore';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

    // Check daily RPD quota — reserve 20% for user-initiated plays
    if (!canPrefetchTts(API_MODELS.tts)) {
      if (addLog)
        addLog(
          'Prefetch Audio',
          `Daily TTS quota near limit — skipping prefetch to reserve for manual plays`,
          'warning'
        );
      return;
    }

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
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.audio, poemId, addLog);
      if (cached?.blob) {
        if (addLog)
          addLog('Prefetch Audio', `Audio already cached for poem ${poemId} - skipping`, 'info');
        return;
      }

      // Mark as in-flight
      usePoemStore.getState().addActiveAudio(poemId);

      // Generate audio using same logic as togglePlay
      const ttsContent = getTTSContent(poem);

      const requestBody = JSON.stringify({
        contents: [{ parts: [{ text: ttsContent }] }],
        generationConfig: {
          responseModalities: TTS_CONFIG.responseModalities,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: TTS_CONFIG.voiceName },
            },
          },
        },
      });
      const requestSize = new Blob([requestBody]).size;
      const estimatedTokens = Math.ceil(ttsContent.length / 4);

      if (addLog) {
        addLog(
          'Prefetch Audio',
          `→ Background audio generation (poem ${poemId}) | Model: ${API_MODELS.tts} | ${(requestSize / 1024).toFixed(1)}KB | ${estimatedTokens} tokens`,
          'request'
        );
      }

      const apiStart = performance.now();
      const url = `${apiUrl}/api/ai/${API_MODELS.tts}/generateContent`;
      const fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      };

      // Retry once on network-level failure (TypeError: Failed to fetch) to handle
      // Render cold starts — backend may take up to ~15s to wake from idle.
      let fetchResult;
      try {
        fetchResult = await fetchTTSWithFallback(url, fetchOptions, {
          addLog,
          label: 'Prefetch Audio',
        });
      } catch (networkErr) {
        if (networkErr instanceof TypeError) {
          if (addLog)
            addLog(
              'Prefetch Audio',
              `Network error (backend cold start?) — retrying in 3s: ${networkErr.message}`,
              'info'
            );
          await new Promise((r) => setTimeout(r, 3000));
          fetchResult = await fetchTTSWithFallback(url, fetchOptions, {
            addLog,
            label: 'Prefetch Audio',
          });
        } else {
          throw networkErr;
        }
      }
      const { res, model: ttsModel } = fetchResult;

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
      const apiTime = performance.now() - apiStart;
      if (!data.candidates || data.candidates.length === 0) {
        if (addLog)
          addLog(
            'Prefetch Audio',
            `❌ [${ttsModel}] Audio generation failed for poem ${poemId}. Response: ${JSON.stringify(data).substring(0, 200)}`,
            'error'
          );
        return;
      }

      const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
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
          }, addLog);

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
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.insights, poemId, addLog);
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
          'request'
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
        }, addLog);

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
