/**
 * Gemini Live API PoC — One-way TTS via WebSocket
 *
 * Tests whether we can use the Gemini Live API (BidiGenerateContent)
 * for streaming text-to-speech of Arabic poetry, as an alternative
 * to the current REST-based generateContent TTS approach.
 *
 * Usage:
 *   node test-live-api.js
 *
 * Requires:
 *   - GEMINI_API_KEY or VITE_GEMINI_API_KEY in .env (or environment)
 *   - Node.js 18+ (native WebSocket) or ws package
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env manually (no dotenv dependency) ──
function loadEnvFile(envPath) {
  try {
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx);
      const val = trimmed.slice(eqIdx + 1);
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env not found at this path
  }
}
// Try local .env first, then main repo .env (worktrees share the main repo's .env)
loadEnvFile(resolve(__dirname, '.env'));
loadEnvFile(resolve(__dirname, '..', 'poetry-bil-araby', '.env'));

const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
  console.error('ERROR: No GEMINI_API_KEY or VITE_GEMINI_API_KEY found');
  process.exit(1);
}

// ── Configuration ──
// Build WS URL per api version
function buildWsUrl(apiVersion) {
  return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.${apiVersion}.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
}

// Models to test with their required API versions
const TEST_CONFIGS = [
  // The Python SDK samples use v1alpha for native audio — this one connected!
  { model: 'gemini-2.5-flash-native-audio-preview-12-2025', apiVersion: 'v1alpha', label: 'Native Audio (v1alpha)' },
  // Same with v1beta
  { model: 'gemini-2.5-flash-native-audio-preview-12-2025', apiVersion: 'v1beta', label: 'Native Audio (v1beta)' },
];

// REST baseline
const REST_MODEL = 'gemini-2.5-flash-preview-tts';
const REST_API_VERSION = 'v1beta';

// Voices to test (Fenrir is the current production voice)
const VOICES = ['Fenrir', 'Zephyr', 'Puck', 'Charon', 'Kore'];

// Test Arabic poem (short excerpt for testing)
const TEST_POEM = `قِفا نَبكِ مِن ذِكرى حَبيبٍ وَمَنزِلِ
بِسِقطِ اللِوى بَينَ الدَخولِ فَحَومَلِ`;

const TEST_INSTRUCTION = `Perform an Arabic inshad recitation of this Classical poem by Imru' al-Qais (Pre-Islamic). ` +
  `Deliver with emotional power, clear qafiya cadence, and dramatic presence. ` +
  `Poem:\n${TEST_POEM}`;

// ── WebSocket helpers ──
async function getWebSocket() {
  // Node.js 22+ has native WebSocket
  if (typeof globalThis.WebSocket !== 'undefined') {
    return globalThis.WebSocket;
  }
  // Try to import ws (available as transitive dep via supabase/jsdom)
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    return require('ws');
  } catch {
    console.error('ERROR: No WebSocket available. Node.js 22+ or `npm install ws` required.');
    process.exit(1);
  }
}

// ── Test runner ──
async function testLiveAPI({ model, voice, instruction, apiVersion = 'v1alpha', testLabel = '' }) {
  const label = testLabel || `[${model}/${voice}]`;
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${label} Starting test...`);
  console.log(`${'='.repeat(70)}`);

  const WS = await getWebSocket();

  return new Promise((resolveTest) => {
    const metrics = {
      model,
      voice,
      connectStart: performance.now(),
      connectEnd: null,
      setupComplete: null,
      firstAudioChunk: null,
      lastAudioChunk: null,
      totalAudioBytes: 0,
      audioChunks: 0,
      turnComplete: false,
      error: null,
    };

    const timeout = setTimeout(() => {
      console.log(`${label} TIMEOUT after 30s`);
      metrics.error = 'Timeout (30s)';
      try { ws.close(); } catch {}
      resolveTest(metrics);
    }, 30000);

    let ws;
    try {
      ws = new WS(buildWsUrl(apiVersion));
    } catch (err) {
      console.error(`${label} WebSocket creation failed:`, err.message);
      metrics.error = `WebSocket creation failed: ${err.message}`;
      clearTimeout(timeout);
      resolveTest(metrics);
      return;
    }

    ws.onopen = () => {
      metrics.connectEnd = performance.now();
      const connectMs = (metrics.connectEnd - metrics.connectStart).toFixed(0);
      console.log(`${label} WebSocket connected (${connectMs}ms)`);

      // Send setup message with model and config
      const setupMessage = {
        setup: {
          model: `models/${model}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
              },
            },
          },
        },
      };

      console.log(`${label} Sending setup...`);
      ws.send(JSON.stringify(setupMessage));
    };

    ws.onmessage = async (event) => {
      let data;
      try {
        let text;
        if (typeof event.data === 'string') {
          text = event.data;
        } else if (event.data instanceof Buffer) {
          text = event.data.toString('utf-8');
        } else if (typeof event.data?.text === 'function') {
          // Blob (browser) or Blob-like
          text = await event.data.text();
        } else if (event.data instanceof ArrayBuffer) {
          text = new TextDecoder().decode(event.data);
        } else {
          text = String(event.data);
        }
        data = JSON.parse(text);
      } catch (err) {
        const preview = typeof event.data === 'string'
          ? event.data.substring(0, 100)
          : `[${typeof event.data}] length=${event.data?.length || event.data?.size || '?'}`;
        console.log(`${label} Non-JSON message: type=${typeof event.data}, preview=${preview}`);
        return;
      }

      // Handle setupComplete
      if (data.setupComplete) {
        metrics.setupComplete = performance.now();
        const setupMs = (metrics.setupComplete - metrics.connectStart).toFixed(0);
        console.log(`${label} Setup complete (${setupMs}ms from start)`);

        // Now send the TTS instruction as client content
        const contentMessage = {
          clientContent: {
            turns: [
              {
                role: 'user',
                parts: [{ text: instruction }],
              },
            ],
            turnComplete: true,
          },
        };

        console.log(`${label} Sending TTS instruction (${instruction.length} chars)...`);
        ws.send(JSON.stringify(contentMessage));
        return;
      }

      // Handle server content (audio chunks)
      if (data.serverContent) {
        const parts = data.serverContent?.modelTurn?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            metrics.audioChunks++;
            // Base64 data — each char ~0.75 bytes
            const chunkBytes = Math.ceil(part.inlineData.data.length * 0.75);
            metrics.totalAudioBytes += chunkBytes;

            if (metrics.audioChunks === 1) {
              metrics.firstAudioChunk = performance.now();
              const ttfb = (metrics.firstAudioChunk - metrics.connectStart).toFixed(0);
              console.log(`${label} FIRST AUDIO CHUNK! TTFB=${ttfb}ms | ${chunkBytes} bytes | mime=${part.inlineData.mimeType || 'unknown'}`);
            }

            metrics.lastAudioChunk = performance.now();

            if (metrics.audioChunks % 10 === 0) {
              const elapsed = (performance.now() - metrics.connectStart).toFixed(0);
              console.log(`${label} Chunk #${metrics.audioChunks} | Total: ${(metrics.totalAudioBytes / 1024).toFixed(1)}KB | ${elapsed}ms`);
            }
          }

          if (part.text) {
            console.log(`${label} Text response: "${part.text.substring(0, 100)}..."`);
          }
        }

        // Check for turn complete
        if (data.serverContent.turnComplete) {
          metrics.turnComplete = true;
          const totalMs = (performance.now() - metrics.connectStart).toFixed(0);
          console.log(`${label} TURN COMPLETE | ${metrics.audioChunks} chunks | ${(metrics.totalAudioBytes / 1024).toFixed(1)}KB | ${totalMs}ms total`);
          clearTimeout(timeout);
          ws.close();
          resolveTest(metrics);
        }
      }

      // Handle errors from server
      if (data.error) {
        console.error(`${label} Server error:`, JSON.stringify(data.error));
        metrics.error = `Server: ${data.error.message || JSON.stringify(data.error)}`;
        clearTimeout(timeout);
        ws.close();
        resolveTest(metrics);
      }
    };

    ws.onerror = (err) => {
      console.error(`${label} WebSocket error:`, err.message || err);
      metrics.error = `WebSocket: ${err.message || 'unknown error'}`;
      clearTimeout(timeout);
      resolveTest(metrics);
    };

    ws.onclose = (event) => {
      const elapsed = (performance.now() - metrics.connectStart).toFixed(0);
      console.log(`${label} WebSocket closed (code=${event.code}, reason="${event.reason || 'none'}") after ${elapsed}ms`);
      clearTimeout(timeout);
      if (!metrics.turnComplete && !metrics.error) {
        metrics.error = `Connection closed prematurely (code=${event.code})`;
      }
      resolveTest(metrics);
    };
  });
}

// ── Also test the REST TTS endpoint for comparison ──
async function testRestTTS({ model, voice, instruction, apiVersion = 'v1beta' }) {
  const label = `[REST/${model}/${voice}]`;
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${label} Starting REST TTS test...`);
  console.log(`${'='.repeat(70)}`);

  const metrics = {
    model,
    voice,
    method: 'REST',
    requestStart: performance.now(),
    responseReceived: null,
    totalAudioBytes: 0,
    error: null,
  };

  try {
    const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${API_KEY}`;
    const body = {
      contents: [{ parts: [{ text: instruction }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    };

    console.log(`${label} Sending request (${instruction.length} chars)...`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    metrics.responseReceived = performance.now();
    const ttfb = (metrics.responseReceived - metrics.requestStart).toFixed(0);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`${label} HTTP ${res.status}: ${errText.substring(0, 200)}`);
      metrics.error = `HTTP ${res.status}`;
      return metrics;
    }

    const data = await res.json();
    const totalMs = (performance.now() - metrics.requestStart).toFixed(0);

    const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (b64) {
      metrics.totalAudioBytes = Math.ceil(b64.length * 0.75);
      console.log(`${label} SUCCESS | TTFB=${ttfb}ms | Total=${totalMs}ms | Audio: ${(metrics.totalAudioBytes / 1024).toFixed(1)}KB`);
    } else {
      console.log(`${label} No audio in response | TTFB=${ttfb}ms`);
      metrics.error = 'No audio data in response';
    }
  } catch (err) {
    console.error(`${label} Error:`, err.message);
    metrics.error = err.message;
  }

  return metrics;
}

// ── Main ──
async function main() {
  console.log('Gemini Live API PoC — One-way TTS via WebSocket');
  console.log('================================================');
  console.log(`Test poem: ${TEST_POEM.substring(0, 60)}...`);
  console.log(`Instruction length: ${TEST_INSTRUCTION.length} chars`);
  console.log();

  const results = [];

  // Run REST baseline first
  console.log('\n--- REST BASELINE: gemini-2.5-flash-preview-tts + Fenrir ---');
  results.push(await testRestTTS({
    model: REST_MODEL,
    voice: 'Fenrir',
    instruction: TEST_INSTRUCTION,
    apiVersion: REST_API_VERSION,
  }));

  // Run each Live API config
  for (let i = 0; i < TEST_CONFIGS.length; i++) {
    const cfg = TEST_CONFIGS[i];
    console.log(`\n--- LIVE TEST ${i + 1}: ${cfg.label} + Fenrir ---`);
    results.push(await testLiveAPI({
      model: cfg.model,
      voice: 'Fenrir',
      instruction: TEST_INSTRUCTION,
      apiVersion: cfg.apiVersion,
      testLabel: `[${cfg.label}]`,
    }));
  }

  // ── Summary ──
  console.log('\n\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log();

  for (const r of results) {
    const method = r.method || 'Live WS';
    const status = r.error ? `FAIL: ${r.error.substring(0, 40)}` : 'SUCCESS';

    let ttfb = 'N/A';
    if (r.firstAudioChunk && r.connectStart) {
      ttfb = `${(r.firstAudioChunk - r.connectStart).toFixed(0)}ms`;
    } else if (r.responseReceived && r.requestStart) {
      ttfb = `${(r.responseReceived - r.requestStart).toFixed(0)}ms`;
    }

    let total = 'N/A';
    if (r.lastAudioChunk && r.connectStart) {
      total = `${(r.lastAudioChunk - r.connectStart).toFixed(0)}ms`;
    } else if (r.responseReceived && r.requestStart) {
      total = `${(performance.now() - r.requestStart).toFixed(0)}ms`;
    }

    const audioKB = r.totalAudioBytes ? `${(r.totalAudioBytes / 1024).toFixed(1)}KB` : 'N/A';
    const chunks = r.audioChunks !== undefined ? r.audioChunks : 'N/A';

    console.log(`${method.padEnd(10)} | ${r.model.substring(0, 42).padEnd(42)} | ${r.voice.padEnd(8)} | ${status.padEnd(44)} | TTFB: ${ttfb.padEnd(8)} | Total: ${total.padEnd(8)} | Audio: ${audioKB} (${chunks} chunks)`);
  }

  console.log();
  console.log('Key findings:');
  console.log('- Live API TTFB = time from WebSocket open to first audio chunk (streaming)');
  console.log('- REST TTS TTFB = time from request to full response (no streaming)');
  console.log('- Lower TTFB = faster time to first audio playback for the user');
  console.log('- Audio format: PCM 24kHz 16-bit mono (same for both Live and REST)');
}

main().catch(console.error);
