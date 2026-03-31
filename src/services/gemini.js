/**
 * Gemini API service — model discovery, text generation, and TTS.
 */

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * API Model Endpoints
 * Text model list is built dynamically by discoverTextModels(); textDefaults is the fallback
 * used when the ListModels API is unavailable. Starts with the cheapest Gemini 2.5 model.
 */
export const API_MODELS = {
  tts: 'gemini-2.5-pro-preview-tts',
  ttsFallback: 'gemini-2.5-flash-preview-tts',
  textDefaults: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'],
};

/**
 * TTS Voice Configuration
 */
export const TTS_CONFIG = {
  voiceName: 'Fenrir',
  responseModalities: ['AUDIO'],
};

/**
 * Module-level cache for the ranked list of available Gemini text models.
 * Populated on first call to discoverTextModels(); shared across all handlers.
 */
let _discoveredTextModels = null;

/**
 * Fetch and rank available Gemini text models via the ListModels API.
 * Prefers newer versions and cheaper (flash) models over pro.
 * Falls back to API_MODELS.textDefaults if the API is unreachable or returns no usable models.
 * Result is cached for the lifetime of the page.
 */
export const discoverTextModels = async (addLog) => {
  if (_discoveredTextModels) return _discoveredTextModels;
  try {
    const res = await fetch(`${apiUrl}/api/ai/models`, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { models = [] } = await res.json();
    const ranked = models
      .filter(
        (m) =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent') &&
          typeof m.name === 'string' &&
          m.name.includes('gemini') &&
          !m.name.includes('embedding') &&
          !m.name.includes('tts')
      )
      .map((m) => {
        const id = m.name.replace('models/', '');
        const vm = id.match(/gemini-(\d+)\.(\d+)/);
        const major = vm ? parseInt(vm[1]) : 0;
        const minor = vm ? parseInt(vm[2]) : 0;
        const isFlash = id.includes('flash');
        // '8b' identifies Google's 8-billion-parameter lite variants (e.g. gemini-1.5-flash-8b)
        const isLite = id.includes('lite') || id.includes('8b');
        // Scoring: major version (×1000) > minor version (×100) > flash bonus (+10) > lite penalty (−5)
        // Higher score = try first; prefers newest model, then flash (cheaper) over pro, avoids lite.
        const score = major * 1000 + minor * 100 + (isFlash ? 10 : 0) - (isLite ? 5 : 0);
        return { id, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((m) => m.id);
    if (ranked.length > 0) {
      _discoveredTextModels = ranked;
      if (addLog)
        addLog(
          'Model Discovery',
          `${ranked.length} models ranked: ${ranked.slice(0, 3).join(', ')}`,
          'info'
        );
      return _discoveredTextModels;
    }
  } catch (err) {
    if (addLog)
      addLog(
        'Model Discovery',
        `ListModels unavailable: ${err.message} — using defaults`,
        'warning'
      );
  }
  _discoveredTextModels = [...API_MODELS.textDefaults];
  return _discoveredTextModels;
};

/**
 * Fetch from a Gemini text endpoint with automatic model fallback.
 * Uses the dynamically discovered model list (ranked newest/cheapest first).
 * Retries on HTTP 404/410 (model unavailable/deprecated); throws immediately on other errors.
 *
 * @param {string}   endpoint - Gemini method segment, e.g. 'generateContent' or 'streamGenerateContent'
 * @param {string}   body     - Pre-serialised JSON request body
 * @param {string}   label    - Human-readable prefix for the thrown error message
 * @param {Function} addLog   - Component logging helper
 * @returns {Promise<Response>} Resolved Response with ok === true
 */
export const geminiTextFetch = async (endpoint, body, label, addLog) => {
  const log = typeof addLog === 'function' ? addLog : () => {};
  const models = await discoverTextModels(log);
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    if (i > 0) log('Model Fallback', `Trying fallback: ${model}`, 'warning');
    const res = await fetch(`${apiUrl}/api/ai/${model}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (res.ok) {
      if (i > 0) log('Model Fallback', `✓ Using fallback model: ${model}`, 'success');
      return res;
    }
    const errData = await res.json().catch(() => ({}));
    const errMsg = errData.error?.message || `HTTP ${res.status}`;
    // Only retry on model-unavailable HTTP codes: 404 Not Found, 410 Gone (deprecated)
    if ((res.status !== 404 && res.status !== 410) || i === models.length - 1) {
      throw new Error(`${label}: ${errMsg}`);
    }
    log('Model Fallback', `${model} not available, trying next...`, 'warning');
  }
};

/**
 * Stream TTS audio via `streamGenerateContent` with model fallback on 429.
 *
 * Reads the SSE response and collects all base64-encoded PCM16 chunks from
 * the stream. The caller can then pass the chunks to `pcm16ChunksToWav` to
 * produce a WAV Blob.  Falls back to the secondary TTS model on 429, matching
 * the behaviour of `fetchTTSWithFallback`.
 *
 * @param {string}   requestBody - Pre-serialised JSON TTS request body
 * @param {Object}   [opts]
 * @param {Function} [opts.addLog]  - Logging helper
 * @param {string}   [opts.label]   - Log label prefix
 * @returns {Promise<{
 *   ok: boolean,
 *   pcmChunks: string[]|null,
 *   model: string,
 *   apiTime: number,
 *   firstChunkTime: number|null,
 *   errorStatus: number|null,
 *   errorText: string|null
 * }>}
 */
export const streamTTSWithFallback = async (requestBody, { addLog, label = 'TTS' } = {}) => {
  const log = typeof addLog === 'function' ? addLog : () => {};

  const tryStream = async (model) => {
    const streamUrl = `${apiUrl}/api/ai/${model}/streamGenerateContent`;
    const t0 = performance.now();
    const res = await fetch(streamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      return { ok: false, errorStatus: res.status, errorText, t0, model };
    }

    if (!res.body) {
      return { ok: false, errorStatus: 500, errorText: 'Empty response body', t0, model };
    }

    // Parse SSE stream and collect base64 PCM chunks
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const pcmChunks = [];
    let firstChunkTime = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const data = JSON.parse(jsonStr);
          const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (b64) {
            if (firstChunkTime === null) {
              firstChunkTime = performance.now() - t0;
              log(
                label,
                `← First audio chunk (${firstChunkTime.toFixed(0)}ms) | Streaming...`,
                'info'
              );
            }
            pcmChunks.push(b64.replace(/\s/g, ''));
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }

    return { ok: true, pcmChunks, firstChunkTime, apiTime: performance.now() - t0, model };
  };

  const primaryModel = API_MODELS.tts;
  const result = await tryStream(primaryModel);

  if (!result.ok && result.errorStatus === 429 && API_MODELS.ttsFallback) {
    const fallbackModel = API_MODELS.ttsFallback;
    log(
      label,
      `${primaryModel}: 429 (${((performance.now() - result.t0) / 1000).toFixed(1)}s) → falling back to ${fallbackModel}`,
      'warning'
    );
    const fallbackResult = await tryStream(fallbackModel);
    log(
      label,
      `${fallbackModel}: ${fallbackResult.ok ? '✓ streaming' : `✗ ${fallbackResult.errorStatus}`}`,
      fallbackResult.ok ? 'success' : 'warning'
    );
    return {
      ok: fallbackResult.ok,
      pcmChunks: fallbackResult.pcmChunks ?? null,
      model: fallbackModel,
      apiTime: fallbackResult.apiTime ?? 0,
      firstChunkTime: fallbackResult.firstChunkTime ?? null,
      errorStatus: fallbackResult.errorStatus ?? null,
      errorText: fallbackResult.errorText ?? null,
    };
  }

  return {
    ok: result.ok,
    pcmChunks: result.pcmChunks ?? null,
    model: primaryModel,
    apiTime: result.apiTime ?? 0,
    firstChunkTime: result.firstChunkTime ?? null,
    errorStatus: result.errorStatus ?? null,
    errorText: result.errorText ?? null,
  };
};

/**
 * Fetch TTS with model fallback on 429 (rate limit) responses.
 * Tries the primary TTS model first; on 429 (daily quota exhausted),
 * switches to the fallback model instead of retrying the same one.
 * Quotas are per-model-per-day, so the fallback has its own quota.
 */
export const fetchTTSWithFallback = async (url, options, { addLog, label = 'TTS' } = {}) => {
  const primaryModel = API_MODELS.tts;
  const t0 = performance.now();
  const res = await fetch(url, options);
  const primaryMs = performance.now() - t0;

  if (res.status !== 429) return { res, model: primaryModel };

  // Primary model rate-limited — try fallback model (separate daily quota)
  if (API_MODELS.ttsFallback) {
    const fallbackModel = API_MODELS.ttsFallback;
    const fallbackUrl = url.replace(primaryModel, fallbackModel);
    if (addLog)
      addLog(
        label,
        `${primaryModel}: 429 (${(primaryMs / 1000).toFixed(1)}s) → falling back to ${fallbackModel}`,
        'warning'
      );
    const t1 = performance.now();
    const fallbackRes = await fetch(fallbackUrl, options);
    const fallbackMs = performance.now() - t1;
    if (addLog)
      addLog(
        label,
        `${primaryModel}: 429 (${(primaryMs / 1000).toFixed(1)}s) → ${fallbackModel}: ${fallbackRes.status} (${(fallbackMs / 1000).toFixed(1)}s)`,
        fallbackRes.ok ? 'success' : 'warning'
      );
    return { res: fallbackRes, model: fallbackModel };
  }

  return { res, model: primaryModel };
};
