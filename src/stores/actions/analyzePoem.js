import Sentry from '../../sentry.js';
import { FEATURES } from '../../constants/features';
import { usePoemStore } from '../poemStore';
import { useUIStore } from '../uiStore';
import { useModalStore } from '../modalStore';
import { INSIGHTS_SYSTEM_PROMPT, RATCHET_SYSTEM_PROMPT } from '../../prompts';
import { parseInsight } from '../../utils/insightParser';
import { geminiTextFetch } from '../../services/gemini.js';
import { cacheOperations, CACHE_CONFIG } from '../../services/cache.js';
import { saveTranslation } from '../../services/database.js';

/** Monotonically increasing token — incremented by cancelAnalysis() on each swipe. */
let _analysisGeneration = 0;

/**
 * Cancel any in-flight poem analysis (streaming stops on next chunk boundary).
 * Call this when the user swipes to a new carousel poem.
 */
export function cancelAnalysis() {
  _analysisGeneration++;
}

/**
 * Analyze a poem — check cache, stream insights from Gemini, cache results.
 *
 * @param {Object} options
 * @param {Object} options.current - Current poem object
 * @param {Function} options.addLog - Logging function
 * @param {Function} options.track - Analytics tracking
 * @param {Function} [options.retryFn] - Function to call for retries (defaults to self)
 */
export async function analyzePoem({ current, addLog, track, retryFn }) {
  const myGeneration = ++_analysisGeneration;
  const { interpretation, isInterpreting, setInterpretation, setInterpreting } =
    usePoemStore.getState();
  const ratchetMode = useUIStore.getState().ratchetMode;

  addLog(
    'UI Event',
    `🔍 Dive In button clicked | Poem: ${current?.poet} - ${current?.title} | ID: ${current?.id}`,
    'user'
  );

  if (interpretation || isInterpreting) return;
  track('insight_requested', { poet: current?.poet });

  setInterpreting(true);

  // Check if request already in flight — poll until it completes
  if (usePoemStore.getState().hasActiveInsight(current?.id)) {
    addLog('Insights', 'Insights generation already in progress - waiting for completion', 'info');

    const pollInterval = setInterval(async () => {
      if (!usePoemStore.getState().hasActiveInsight(current?.id)) {
        clearInterval(pollInterval);
        usePoemStore.getState().removePollingInterval(pollInterval);

        const cached = await cacheOperations.get(CACHE_CONFIG.stores.insights, current.id, addLog);
        if (cached?.interpretation) {
          addLog(
            'Insights',
            '✓ Background insights generation completed - displaying results',
            'success'
          );
          setInterpretation(cached.interpretation);
          useModalStore.getState().showToast('insight');
          setTimeout(() => useModalStore.getState().hideToast('insight'), 1500);
        } else {
          addLog('Insights', 'Background insights generation failed - retrying', 'info');
          const retry = retryFn || (() => analyzePoem({ current, addLog, track, retryFn }));
          setTimeout(retry, 100);
          return;
        }
        setInterpreting(false);
      }
    }, 500);

    usePoemStore.getState().addPollingInterval(pollInterval);

    setTimeout(() => {
      clearInterval(pollInterval);
      usePoemStore.getState().removePollingInterval(pollInterval);
      if (usePoemStore.getState().hasActiveInsight(current?.id)) {
        addLog(
          'Insights',
          'Insights generation taking longer than expected - checking one more time...',
          'info'
        );
        setTimeout(async () => {
          const finalCheck = await cacheOperations.get(
            CACHE_CONFIG.stores.insights,
            current.id,
            addLog
          );
          if (finalCheck?.interpretation) {
            addLog(
              'Insights',
              '✓ Insights completed after extended wait - displaying now',
              'success'
            );
            setInterpretation(finalCheck.interpretation);
          } else {
            addLog('Insights', 'Insights generation timeout - please try again', 'error');
          }
          usePoemStore.getState().removeActiveInsight(current?.id);
          setInterpreting(false);
        }, 10000);
      }
    }, 60000);

    return;
  }

  // Mark in-flight
  usePoemStore.getState().addActiveInsight(current?.id);

  // CHECK CACHE (skip for ratchet mode — different prompt style)
  if (FEATURES.caching && current?.id && !ratchetMode) {
    const cacheStart = performance.now();
    const cached = await cacheOperations.get(CACHE_CONFIG.stores.insights, current.id, addLog);
    const cacheTime = performance.now() - cacheStart;

    if (cached?.interpretation) {
      const charCount = cached.interpretation.length;
      const estTokens = Math.ceil(charCount / 4);
      addLog(
        'Insights Cache',
        `✓ Cache HIT (${cacheTime.toFixed(0)}ms) | ${charCount} chars (≈${estTokens} tokens) | Instant load`,
        'success'
      );
      useUIStore.getState().incrementCacheStat('insightsHits');
      setInterpretation(cached.interpretation);
      setInterpreting(false);
      useModalStore.getState().showToast('insight');
      setTimeout(() => useModalStore.getState().hideToast('insight'), 1500);
      usePoemStore.getState().removeActiveInsight(current?.id);
      return;
    } else {
      addLog(
        'Insights Cache',
        `✗ Cache MISS (${cacheTime.toFixed(0)}ms) | Generating from API...`,
        'info'
      );
      useUIStore.getState().incrementCacheStat('insightsMisses');
    }
  }

  let insightText = '';
  let apiStartTime = null;
  const activeSystemPrompt = ratchetMode ? RATCHET_SYSTEM_PROMPT : INSIGHTS_SYSTEM_PROMPT;

  try {
    if (FEATURES.streaming) {
      const poetInfo = current?.poet ? ` by ${current.poet}` : '';
      const arabicLineCount = (current?.arabic || '').split('\n').filter((l) => l.trim()).length;
      const promptText = `Deep Analysis of${poetInfo}:\n\n${current?.arabic}\n\n[CRITICAL: This poem has exactly ${arabicLineCount} Arabic lines. You MUST produce exactly ${arabicLineCount} English lines in the POEM section. One line per Arabic line, no exceptions.]`;
      const requestSize = new Blob([
        JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
      ]).size;
      const estimatedInputTokens = Math.ceil((promptText.length + activeSystemPrompt.length) / 4);
      const promptChars = promptText.length;
      const arabicTextChars = current?.arabic?.length || 0;
      const systemPromptChars = activeSystemPrompt.length;

      addLog(
        'Insights API',
        `→ Starting streaming${ratchetMode ? ' [Ratchet Mode]' : ''} | Request: ${(requestSize / 1024).toFixed(1)}KB | ${promptChars} chars (${arabicTextChars} Arabic + ${systemPromptChars} system) | Est. ${estimatedInputTokens} tokens`,
        'request'
      );

      setInterpretation('');
      apiStartTime = performance.now();
      const apiStart = apiStartTime;
      let firstChunkTime = null;
      let chunkCount = 0;

      const insightsStreamBody = JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        systemInstruction: { parts: [{ text: activeSystemPrompt }] },
        generationConfig: { maxOutputTokens: 8192 },
      });
      const res = await geminiTextFetch(
        'streamGenerateContent',
        insightsStreamBody,
        'Insights failed',
        addLog
      );

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            try {
              const data = JSON.parse(jsonStr);
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (text) {
                if (!firstChunkTime) {
                  firstChunkTime = performance.now() - apiStart;
                  addLog(
                    'Insights API',
                    `← First chunk received (${firstChunkTime.toFixed(0)}ms) | Streaming...`,
                    'info'
                  );
                }
                // Bail if the user swiped to a new poem while we were streaming
                if (_analysisGeneration !== myGeneration) {
                  reader.cancel();
                  setInterpreting(false);
                  return;
                }
                chunkCount++;
                accumulatedText += text;
                setInterpretation(accumulatedText);
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      }

      insightText = accumulatedText;
      const totalTime = performance.now() - apiStart;
      const charCount = insightText.length;
      const estimatedTokens = Math.ceil(charCount / 4);
      const tokensPerSecond = (estimatedTokens / (totalTime / 1000)).toFixed(1);
      const avgChunkSize = charCount / chunkCount;

      addLog(
        'Insights API',
        `✓ Streaming complete | Total: ${(totalTime / 1000).toFixed(2)}s | TTFT: ${(firstChunkTime / 1000).toFixed(2)}s | ${chunkCount} chunks`,
        'success'
      );
      addLog(
        'Insights Metrics',
        `${charCount} chars (≈${estimatedTokens} tokens) | ${tokensPerSecond} tok/s | Avg chunk: ${avgChunkSize.toFixed(0)} chars`,
        'success'
      );
    } else {
      addLog('Insights', `Analyzing poem...${ratchetMode ? ' [Ratchet Mode]' : ''}`, 'request');
      const poetInfoFallback = current?.poet ? ` by ${current.poet}` : '';
      const arabicLineCount = (current?.arabic || '').split('\n').filter((l) => l.trim()).length;
      const promptText = `Deep Analysis of${poetInfoFallback}:\n\n${current?.arabic}\n\n[CRITICAL: This poem has exactly ${arabicLineCount} Arabic lines. You MUST produce exactly ${arabicLineCount} English lines in the POEM section. One line per Arabic line, no exceptions.]`;
      const insightsFallbackBody = JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        systemInstruction: { parts: [{ text: activeSystemPrompt }] },
        generationConfig: { maxOutputTokens: 8192 },
      });
      const res = await geminiTextFetch(
        'generateContent',
        insightsFallbackBody,
        'Insights failed',
        addLog
      );
      const data = await res.json();
      insightText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      setInterpretation(insightText);
      addLog('Insights', 'Analysis complete', 'success');
    }

    // CACHE (skip for ratchet mode — different prompt style)
    if (FEATURES.caching && current?.id && insightText && !ratchetMode) {
      const cacheStart = performance.now();
      await cacheOperations.set(
        CACHE_CONFIG.stores.insights,
        current.id,
        {
          interpretation: insightText,
          metadata: {
            poet: current.poet,
            title: current.title,
            charCount: insightText.length,
            tokens: Math.ceil(insightText.length / 4),
          },
        },
        addLog
      );
      const cacheTime = performance.now() - cacheStart;
      const elapsedTime = apiStartTime
        ? ((performance.now() - apiStartTime) / 1000).toFixed(1)
        : '2-8';
      addLog(
        'Insights Cache',
        `Insights cached for future use (${cacheTime.toFixed(0)}ms) | Saves ${elapsedTime}s on reload`,
        'success'
      );
    }

    // Save translation to DB
    if (current?.isFromDatabase && current?.id && insightText) {
      const parts = parseInsight(insightText, addLog);
      if (parts?.poeticTranslation) {
        const arabicLines = (current?.arabic || '').split('\n').filter((l) => l.trim());
        const englishLines = parts.poeticTranslation.split('\n').filter((l) => l.trim());
        const translation = parts.poeticTranslation;
        if (englishLines.length < arabicLines.length) {
          addLog(
            'Translation',
            `⚠ Line count mismatch: ${arabicLines.length} Arabic vs ${englishLines.length} English — skipping DB cache to avoid persisting incomplete translation`,
            'warning'
          );
        } else {
          saveTranslation(current.id, {
            translation: translation.replace(/\n/g, '*'),
            explanation: parts.depth || null,
            authorBio: parts.author || null,
          });
        }
      }
    }

    track('insight_completed', {
      poet: current?.poet,
      cached: !!(FEATURES.caching && current?.id && insightText),
    });

    if (insightText) {
      useModalStore.getState().showToast('insight');
      setTimeout(() => useModalStore.getState().hideToast('insight'), 1500);
    }
  } catch (e) {
    Sentry.captureException(e);
    addLog('Analysis Error', `${e.message} | Poem ID: ${current?.id}`, 'error');
    track('insight_error', { error: (e.message || '').slice(0, 100) });
    if (FEATURES.streaming && insightText) {
      addLog('Insights', 'Showing partial results', 'warning');
    }
  } finally {
    setInterpreting(false);
    usePoemStore.getState().removeActiveInsight(current?.id);
  }
}
