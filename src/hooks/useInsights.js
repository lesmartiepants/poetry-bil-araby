import { useState, useRef, useMemo } from 'react';
import { track } from '@vercel/analytics';
import Sentry from '../sentry.js';
import { useLogger } from '../LogContext.jsx';
import { FEATURES } from '../constants/features';
import { INSIGHTS_SYSTEM_PROMPT } from '../prompts';
import { parseInsight } from '../utils/insightParser';
import { getApiUrl, geminiTextFetch } from '../services/api';
import { CACHE_CONFIG, cacheOperations } from '../services/cache';

/**
 * useInsights
 *
 * Manages poem analysis/interpretation state including streaming responses,
 * caching, polling for in-flight requests, and translation persistence.
 *
 * @param {Object} params
 * @param {Object} params.current - Current poem object
 * @returns {Object} Insights state and handlers
 */
export function useInsights({ current }) {
  const { addLog } = useLogger();

  const [interpretation, setInterpretation] = useState(null);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [cacheStats, setCacheStats] = useState({
    insightsHits: 0,
    insightsMisses: 0,
  });

  const activeInsightRequests = useRef(new Set());
  const pollingIntervals = useRef([]);

  const handleAnalyze = async () => {
    addLog(
      'UI Event',
      `🔍 Dive In button clicked | Poem: ${current?.poet} - ${current?.title} | ID: ${current?.id}`,
      'info'
    );

    if (interpretation || isInterpreting) return;
    track('insight_requested', { poet: current?.poet });

    // Set loading state FIRST (before duplicate check) for better UX
    setIsInterpreting(true);

    // Check if request already in flight - poll until it completes
    if (activeInsightRequests.current.has(current?.id)) {
      addLog(
        'Insights',
        `Insights generation already in progress - waiting for completion`,
        'info'
      );

      // Poll every 500ms to check if the request completed
      const pollInterval = setInterval(async () => {
        if (!activeInsightRequests.current.has(current?.id)) {
          clearInterval(pollInterval);
          pollingIntervals.current = pollingIntervals.current.filter((id) => id !== pollInterval);

          // Request completed - check cache and display
          const cached = await cacheOperations.get(CACHE_CONFIG.stores.insights, current.id);
          if (cached?.interpretation) {
            addLog(
              'Insights',
              `✓ Background insights generation completed - displaying results`,
              'success'
            );
            setInterpretation(cached.interpretation);
          } else {
            addLog('Insights', `Background insights generation failed - retrying`, 'info');
            // Retry the request
            setTimeout(() => handleAnalyze(), 100);
            return;
          }
          setIsInterpreting(false);
        }
      }, 500);

      pollingIntervals.current.push(pollInterval);

      // Safety timeout - clear after 60 seconds (some insights take time)
      setTimeout(() => {
        clearInterval(pollInterval);
        pollingIntervals.current = pollingIntervals.current.filter((id) => id !== pollInterval);
        if (activeInsightRequests.current.has(current?.id)) {
          addLog(
            'Insights',
            `Insights generation taking longer than expected - checking one more time...`,
            'info'
          );

          // Final check before giving up
          setTimeout(async () => {
            const finalCheck = await cacheOperations.get(CACHE_CONFIG.stores.insights, current.id);
            if (finalCheck?.interpretation) {
              addLog(
                'Insights',
                `✓ Insights completed after extended wait - displaying now`,
                'success'
              );
              setInterpretation(finalCheck.interpretation);
            } else {
              addLog('Insights', `Insights generation timeout - please try again`, 'error');
            }
            activeInsightRequests.current.delete(current?.id);
            setIsInterpreting(false);
          }, 10000); // Wait 10 more seconds for slow API
        }
      }, 60000);

      return;
    }

    // Mark request as in-flight
    activeInsightRequests.current.add(current?.id);

    // CHECK CACHE FIRST
    if (FEATURES.caching && current?.id) {
      const cacheStart = performance.now();
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.insights, current.id);
      const cacheTime = performance.now() - cacheStart;

      if (cached?.interpretation) {
        const charCount = cached.interpretation.length;
        const estTokens = Math.ceil(charCount / 4);
        addLog(
          'Insights Cache',
          `✓ Cache HIT (${cacheTime.toFixed(0)}ms) | ${charCount} chars (≈${estTokens} tokens) | Instant load`,
          'success'
        );
        setCacheStats((prev) => ({ ...prev, insightsHits: prev.insightsHits + 1 }));
        setInterpretation(cached.interpretation);
        setIsInterpreting(false); // Clear loading state
        activeInsightRequests.current.delete(current?.id); // Clean up tracking
        return;
      } else {
        addLog(
          'Insights Cache',
          `✗ Cache MISS (${cacheTime.toFixed(0)}ms) | Generating from API...`,
          'info'
        );
        setCacheStats((prev) => ({ ...prev, insightsMisses: prev.insightsMisses + 1 }));
      }
    }

    let insightText = '';
    let apiStartTime = null;

    try {
      // Use streaming if feature flag is enabled
      if (FEATURES.streaming) {
        const poetInfo = current?.poet ? ` by ${current.poet}` : '';
        const promptText = `Deep Analysis of${poetInfo}:\n\n${current?.arabic}`;
        const requestSize = new Blob([
          JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
        ]).size;
        const estimatedInputTokens = Math.ceil(
          (promptText.length + INSIGHTS_SYSTEM_PROMPT.length) / 4
        );
        const promptChars = promptText.length;
        const arabicTextChars = current?.arabic?.length || 0;
        const systemPromptChars = INSIGHTS_SYSTEM_PROMPT.length;

        addLog(
          'Insights API',
          `→ Starting streaming | Request: ${(requestSize / 1024).toFixed(1)}KB | ${promptChars} chars (${arabicTextChars} Arabic + ${systemPromptChars} system) | Est. ${estimatedInputTokens} tokens`,
          'info'
        );

        setInterpretation(''); // Clear previous interpretation
        apiStartTime = performance.now();
        const apiStart = apiStartTime;
        let firstChunkTime = null;
        let chunkCount = 0;
        let totalTime = 0;

        const insightsStreamBody = JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          systemInstruction: { parts: [{ text: INSIGHTS_SYSTEM_PROMPT }] },
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

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

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
                  chunkCount++;
                  accumulatedText += text;
                  setInterpretation(accumulatedText); // Real-time UI update
                }
              } catch (parseError) {
                // Skip malformed JSON chunks
                console.debug('Skipping malformed chunk:', jsonStr);
              }
            }
          }
        }

        insightText = accumulatedText;
        totalTime = performance.now() - apiStart;
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
        // Non-streaming fallback (original implementation)
        addLog('Insights', 'Analyzing poem...', 'info');
        const poetInfoFallback = current?.poet ? ` by ${current.poet}` : '';
        const insightsFallbackBody = JSON.stringify({
          contents: [
            { parts: [{ text: `Deep Analysis of${poetInfoFallback}:\n\n${current?.arabic}` }] },
          ],
          systemInstruction: { parts: [{ text: INSIGHTS_SYSTEM_PROMPT }] },
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

      // CACHE THE INSIGHTS
      if (FEATURES.caching && current?.id && insightText) {
        const cacheStart = performance.now();
        await cacheOperations.set(CACHE_CONFIG.stores.insights, current.id, {
          interpretation: insightText,
          metadata: {
            poet: current.poet,
            title: current.title,
            charCount: insightText.length,
            tokens: Math.ceil(insightText.length / 4),
          },
        });
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

      // Save translation back to database for future visitors (fire-and-forget)
      if (current?.isFromDatabase && current?.id && insightText && getApiUrl()) {
        const parts = parseInsight(insightText);
        if (parts?.poeticTranslation) {
          fetch(`${getApiUrl()}/api/poems/${current.id}/translation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              translation: parts.poeticTranslation.replace(/\n/g, '*'),
              explanation: parts.depth || null,
              authorBio: parts.author || null,
            }),
          }).catch(() => {});
        }
      }

      track('insight_completed', {
        poet: current?.poet,
        cached: !!(FEATURES.caching && current?.id && insightText),
      });
    } catch (e) {
      Sentry.captureException(e);
      addLog('Analysis Error', `${e.message} | Poem ID: ${current?.id}`, 'error');
      track('insight_error', { error: (e.message || '').slice(0, 100) });
      // Show partial results if streaming was interrupted
      if (FEATURES.streaming && insightText) {
        addLog('Insights', 'Showing partial results', 'warning');
      }
    } finally {
      setIsInterpreting(false);
      activeInsightRequests.current.delete(current?.id); // Clean up in-flight tracking
    }
  };

  /**
   * Reset insights state (called on poem change from DiwanApp)
   */
  const resetInsights = () => {
    setInterpretation(null);
    setIsInterpreting(false);
    // Clear all polling intervals
    pollingIntervals.current.forEach((interval) => clearInterval(interval));
    pollingIntervals.current = [];
  };

  // Parse insight parts from interpretation or cached translations
  const cachedTranslation = current?.cachedTranslation;
  const cachedExplanation = current?.cachedExplanation;
  const cachedAuthorBio = current?.cachedAuthorBio;

  const insightParts = useMemo(() => {
    if (cachedTranslation) {
      return {
        poeticTranslation: cachedTranslation,
        depth: cachedExplanation || '',
        author: cachedAuthorBio || '',
      };
    }
    return parseInsight(interpretation);
  }, [interpretation, cachedTranslation, cachedExplanation, cachedAuthorBio]);

  const versePairs = useMemo(() => {
    const arLines = (current?.arabic || '').split('\n').filter((l) => l.trim());
    const enSource = insightParts?.poeticTranslation || current?.english || '';
    const enLines = enSource.split('\n').filter((l) => l.trim());
    const pairs = [];
    const max = Math.max(arLines.length, enLines.length);
    for (let i = 0; i < max; i++) {
      pairs.push({ ar: arLines[i] || '', en: enLines[i] || '' });
    }
    return pairs;
  }, [current, insightParts]);

  return {
    interpretation,
    isInterpreting,
    insightParts,
    versePairs,
    cacheStats,
    activeInsightRequests,
    handleAnalyze,
    resetInsights,
  };
}
