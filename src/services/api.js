/**
 * API client for Gemini text/TTS endpoints.
 * getApiUrl() is a function (not a const) to prevent module-evaluation-order
 * footguns in test environments where import.meta.env may not be available.
 */

export function getApiUrl() {
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
}

/**
 * API Model Endpoints
 * Text model list is built dynamically by discoverTextModels(); textDefaults is the fallback
 * used when the ListModels API is unavailable. Starts with the cheapest Gemini 2.5 model.
 */
export const API_MODELS = {
  tts: 'gemini-2.5-flash-preview-tts',
  textDefaults: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'],
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
    const res = await fetch(`${getApiUrl()}/api/ai/models`, { method: 'GET' });
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
  const models = await discoverTextModels(addLog);
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    if (i > 0) addLog('Model Fallback', `Trying fallback: ${model}`, 'warning');
    const res = await fetch(`${getApiUrl()}/api/ai/${model}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (res.ok) {
      if (i > 0) addLog('Model Fallback', `✓ Using fallback model: ${model}`, 'success');
      return res;
    }
    const errData = await res.json().catch(() => ({}));
    const errMsg = errData.error?.message || `HTTP ${res.status}`;
    // Only retry on model-unavailable HTTP codes: 404 Not Found, 410 Gone (deprecated)
    if ((res.status !== 404 && res.status !== 410) || i === models.length - 1) {
      throw new Error(`${label}: ${errMsg}`);
    }
    addLog('Model Fallback', `${model} not available, trying next...`, 'warning');
  }
};

/**
 * TTS Voice Configuration
 */
export const TTS_CONFIG = {
  voiceName: 'Fenrir',
  responseModalities: ['AUDIO'],
  retryMaxAttempts: 3,
  retryBaseDelayMs: 1500, // 1.5s, 3s, 6s exponential backoff
};

/**
 * Fetch with exponential backoff retry on 429 (rate limit) responses.
 * Returns the successful Response, or throws on final failure.
 */
export const fetchWithRetry = async (
  url,
  options,
  {
    maxAttempts = TTS_CONFIG.retryMaxAttempts,
    baseDelay = TTS_CONFIG.retryBaseDelayMs,
    addLog,
    label = 'TTS',
  } = {}
) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url, options);
    if (res.status !== 429) return res;
    const delay = baseDelay * Math.pow(2, attempt);
    if (addLog)
      addLog(
        label,
        `Rate limited (429) — retrying in ${(delay / 1000).toFixed(1)}s (attempt ${attempt + 1}/${maxAttempts})`,
        'warning'
      );
    await new Promise((r) => setTimeout(r, delay));
  }
  // Final attempt — return whatever we get
  return fetch(url, options);
};
