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
 * Per-model 429 memory — tracks which TTS models are known-exhausted this session.
 * Key: model name string. Value: timestamp (ms) when the 429 was first seen.
 * Once a model is marked here, fetchTTSWithFallback skips it immediately rather
 * than spending ~300ms on a request that will fail.
 * Resets on page reload (session scope only — daily quota resets at midnight PT).
 */
const _ttsModelExhausted = {};

/**
 * TTS RPD (requests per day) limits by model — from Google AI Studio Rate Limit page.
 * Tier 1 limits as of March 2026. These are hard daily caps that reset at midnight PT.
 */
export const TTS_RPD_LIMITS = {
  'gemini-2.5-flash-preview-tts': 100,
  'gemini-2.5-pro-preview-tts': 50,
};

const RPD_STORAGE_KEY = 'tts-rpd-tracker';

/**
 * Get today's date string in Pacific Time (quota resets at midnight PT).
 */
const getPacificDateStr = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
};

/**
 * Load RPD counts from localStorage. Returns { date, models: { [model]: count } }.
 */
const loadRpdCounts = () => {
  try {
    const stored = localStorage.getItem(RPD_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.date === getPacificDateStr()) return data;
    }
  } catch {}
  return { date: getPacificDateStr(), models: {} };
};

/**
 * Increment RPD count for a model. Persists to localStorage.
 */
export const recordTtsRequest = (model) => {
  const data = loadRpdCounts();
  data.models[model] = (data.models[model] || 0) + 1;
  data.date = getPacificDateStr();
  try { localStorage.setItem(RPD_STORAGE_KEY, JSON.stringify(data)); } catch {}
  return data.models[model];
};

/**
 * Check if a model has remaining RPD quota for today.
 * Returns { allowed, used, limit, remaining }.
 */
export const checkTtsQuota = (model) => {
  const data = loadRpdCounts();
  const used = data.models[model] || 0;
  const limit = TTS_RPD_LIMITS[model] || 100;
  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
};

/**
 * Check if prefetching should be allowed based on remaining quota.
 * More conservative than direct play — reserves 20% of daily quota for user-initiated plays.
 */
export const canPrefetchTts = (model) => {
  const { used, limit } = checkTtsQuota(model);
  const prefetchCap = Math.floor(limit * 0.8); // Reserve 20% for manual plays
  return used < prefetchCap;
};

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
 * Fetch TTS with model fallback on 429 (rate limit) responses.
 * Tries the primary TTS model first; on 429 (daily quota exhausted),
 * switches to the fallback model instead of retrying the same one.
 * Quotas are per-model-per-day, so the fallback has its own quota.
 *
 * Uses module-level _ttsModelExhausted to skip known-exhausted models
 * immediately (avoids wasting ~300ms per request on a model whose 50 RPD
 * quota is already gone for the day).
 */
export const fetchTTSWithFallback = async (url, options, { addLog, label = 'TTS' } = {}) => {
  const primaryModel = API_MODELS.tts;
  const fallbackModel = API_MODELS.ttsFallback;

  // If primary is known-exhausted this session, skip straight to fallback
  if (_ttsModelExhausted[primaryModel] && fallbackModel) {
    if (addLog)
      addLog(
        label,
        `${primaryModel}: skipped (quota exhausted this session) → using ${fallbackModel}`,
        'warning'
      );
    const fallbackUrl = url.replace(primaryModel, fallbackModel);
    const t = performance.now();
    recordTtsRequest(fallbackModel);
    const res = await fetch(fallbackUrl, options);
    if (addLog)
      addLog(label, `${fallbackModel}: ${res.status} (${((performance.now() - t) / 1000).toFixed(1)}s)`, res.ok ? 'success' : 'warning');
    return { res, model: fallbackModel };
  }

  const t0 = performance.now();
  recordTtsRequest(primaryModel);
  const res = await fetch(url, options);
  const primaryMs = performance.now() - t0;

  if (res.status !== 429) return { res, model: primaryModel };

  // Primary model rate-limited — mark exhausted for remainder of session
  _ttsModelExhausted[primaryModel] = Date.now();

  // Try fallback model (separate daily quota)
  if (fallbackModel) {
    const fallbackUrl = url.replace(primaryModel, fallbackModel);
    if (addLog)
      addLog(
        label,
        `${primaryModel}: 429 (${(primaryMs / 1000).toFixed(1)}s) → falling back to ${fallbackModel}`,
        'warning'
      );
    const t1 = performance.now();
    recordTtsRequest(fallbackModel);
    const fallbackRes = await fetch(fallbackUrl, options);
    const fallbackMs = performance.now() - t1;
    if (addLog)
      addLog(
        label,
        `${primaryModel}: 429 (${(primaryMs / 1000).toFixed(1)}s) → ${fallbackModel}: ${fallbackRes.status} (${(fallbackMs / 1000).toFixed(1)}s)`,
        fallbackRes.ok ? 'success' : 'warning'
      );
    // If fallback is also exhausted, mark it too
    if (fallbackRes.status === 429) _ttsModelExhausted[fallbackModel] = Date.now();
    return { res: fallbackRes, model: fallbackModel };
  }

  return { res, model: primaryModel };
};
