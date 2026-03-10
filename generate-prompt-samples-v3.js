/**
 * Generate TTS prompt comparison samples — Round 3
 *
 * Fundamentally different prompt ARCHITECTURES, not just tweaks.
 * Based on finding: REST A (current English) is still best after 2 rounds.
 *
 * Prompts:
 *   J — Role-play orator (English scene-setting, no rules)
 *   K — Role-play orator (Arabic scene-setting, no rules)
 *   L — Bare minimum English
 *   M — Bare minimum Arabic
 *   N — V0 historical prompt ("master orator" — the original before current)
 *   O — Director's cue (recording session framing)
 *
 * Both APIs: REST + Live. Voice: Fenrir. Same poem.
 *
 * Usage: node generate-prompt-samples-v3.js
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env ──
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
  } catch { /* not found */ }
}
loadEnvFile(resolve(__dirname, '.env'));
loadEnvFile(resolve(__dirname, '..', 'poetry-bil-araby', '.env'));

const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
  console.error('ERROR: No GEMINI_API_KEY or VITE_GEMINI_API_KEY found');
  process.exit(1);
}

// ── Constants ──
const VOICE = 'Fenrir';
const OUTPUT_DIR = resolve(__dirname, 'prompt-samples');
const REST_MODEL = 'gemini-2.5-flash-preview-tts';
const REST_API_VERSION = 'v1beta';
const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const LIVE_API_VERSION = 'v1alpha';

// ── Poem (Mu'allaqa of Imru' al-Qais) ──
const POEM_ARABIC = `قِفا نَبكِ مِن ذِكرى حَبيبٍ وَمَنزِلِ
بِسِقطِ اللِوى بَينَ الدَخولِ فَحَومَلِ
فَتوضِحَ فَالمِقراةِ لَم يَعفُ رَسمُها
لِما نَسَجَتها مِن جَنوبٍ وَشَمأَلِ`;

// ── Prompt Definitions (Round 3 — different architectures) ──
const PROMPTS = {
  J: {
    label: 'Role-play orator (English)',
    description: 'Scene-setting — no rules, let the model inhabit the character',
    text:
      `You are Imru' al-Qais himself, the wandering king-poet of pre-Islamic Arabia. ` +
      `You stand before your tribe at a gathering in the Najd desert. The night fire crackles, the audience is rapt. ` +
      `You rise to recite your legendary mu'allaqa — the poem that made you immortal. ` +
      `This is YOUR poem, YOUR pain, YOUR memory. Deliver it with the authority of a king and the passion of a poet who lived every word. ` +
      `Begin:\n${POEM_ARABIC}`,
  },

  K: {
    label: 'Role-play orator (Arabic)',
    description: 'Same scene-setting concept entirely in Arabic',
    text:
      `أنت امرؤ القيس بن حُجر، الملك الضليل وشاعر العرب الأول. ` +
      `تقف أمام قبيلتك في مجلس شعر بصحراء نجد. النار تتقد، والحضور مُصغون. ` +
      `قُم وألقِ معلقتك — القصيدة التي خلّدت اسمك عبر الأجيال. ` +
      `هذه قصيدتك أنت، ألمك أنت، ذكرياتك أنت. ألقِها بسلطان الملوك وعاطفة الشعراء. ` +
      `ابدأ:\n${POEM_ARABIC}`,
  },

  L: {
    label: 'Bare minimum English',
    description: 'Absolute minimum — test if less = better',
    text:
      `Recite this Arabic poem with power and presence:\n${POEM_ARABIC}`,
  },

  M: {
    label: 'Bare minimum Arabic',
    description: 'Absolute minimum in Arabic',
    text:
      `ألقِ هذه القصيدة:\n${POEM_ARABIC}`,
  },

  N: {
    label: 'V0 historical (master orator)',
    description: 'The original production prompt before the current one (from git history)',
    text:
      `Act as a master orator and recite this masterpiece by Imru' al-Qais in the soulful, Nostalgic tone of the Pre-Islamic era. ` +
      `Use high intensity, passionate oratorical power, and majestic strength. ` +
      `Include natural pauses and audible breaths where appropriate. ` +
      `Poem: ${POEM_ARABIC}`,
  },

  O: {
    label: "Director's cue",
    description: 'Recording session direction framing — clinical but energetic',
    text:
      `RECORDING SESSION — Arabic Poetry Performance. ` +
      `Voice: commanding male orator. ` +
      `Style: classical Arabic poetry recitation (not singing, not chanting). ` +
      `Energy: HIGH. ` +
      `Pace: NATURAL conversational authority, NOT slow. ` +
      `The poet speaks with conviction, not sorrow. ` +
      `Poem:\n${POEM_ARABIC}`,
  },
};

// ── WAV header writer ──
function createWavBuffer(pcmData, sampleRate = 24000, bitsPerSample = 16, channels = 1) {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, headerSize);

  return buffer;
}

// ── WebSocket helper ──
async function getWebSocket() {
  if (typeof globalThis.WebSocket !== 'undefined') {
    return globalThis.WebSocket;
  }
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    return require('ws');
  } catch {
    console.error('ERROR: No WebSocket available. Node.js 22+ or ws package required.');
    process.exit(1);
  }
}

// ── Generate via REST API ──
async function generateREST(promptKey, promptText) {
  const label = `[REST-${promptKey}]`;
  console.log(`\n${label} Sending request (${promptText.length} chars)...`);

  const startTime = performance.now();
  const url = `https://generativelanguage.googleapis.com/${REST_API_VERSION}/models/${REST_MODEL}:generateContent?key=${API_KEY}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: VOICE },
            },
          },
        },
      }),
    });

    clearTimeout(timeout);
    const ttfb = performance.now() - startTime;
    console.log(`${label} Response: HTTP ${res.status} (${ttfb.toFixed(0)}ms)`);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`${label} ERROR: ${errText.substring(0, 300)}`);
      return null;
    }

    const data = await res.json();
    const totalMs = performance.now() - startTime;

    const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64) {
      console.error(`${label} ERROR: No audio data in response`);
      return null;
    }

    const pcmData = Buffer.from(b64, 'base64');
    const wavBuffer = createWavBuffer(pcmData);
    const durationSec = (pcmData.length / (24000 * 2)).toFixed(1);
    const filename = `sample-rest-${promptKey}.wav`;
    const outPath = resolve(OUTPUT_DIR, filename);
    writeFileSync(outPath, wavBuffer);

    console.log(`${label} DONE | WAV: ${(wavBuffer.length / 1024).toFixed(1)}KB | ~${durationSec}s audio | ${totalMs.toFixed(0)}ms total`);

    return {
      api: 'REST',
      prompt: promptKey,
      filename,
      sizeKB: +(wavBuffer.length / 1024).toFixed(1),
      durationSec: +durationSec,
      ttfbMs: +ttfb.toFixed(0),
      totalMs: +totalMs.toFixed(0),
    };
  } catch (err) {
    clearTimeout(timeout);
    console.error(`${label} ERROR: ${err.message}`);
    return null;
  }
}

// ── Generate via Live API WebSocket ──
async function generateLive(promptKey, promptText) {
  const label = `[Live-${promptKey}]`;
  console.log(`\n${label} Connecting WebSocket (${promptText.length} chars)...`);

  const WS = await getWebSocket();
  const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.${LIVE_API_VERSION}.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

  return new Promise((resolveGen) => {
    const pcmChunks = [];
    const startTime = performance.now();
    let firstChunkTime = null;

    const timeout = setTimeout(() => {
      console.log(`${label} TIMEOUT after 120s — saving partial audio...`);
      finalize(true);
    }, 120000);

    function finalize(partial = false) {
      clearTimeout(timeout);
      const pcmData = Buffer.concat(pcmChunks);
      if (pcmData.length === 0) {
        try { ws.close(); } catch {}
        resolveGen(null);
        return;
      }

      const wavBuffer = createWavBuffer(pcmData);
      const durationSec = (pcmData.length / (24000 * 2)).toFixed(1);
      const filename = `sample-live-${promptKey}.wav`;
      const outPath = resolve(OUTPUT_DIR, filename);
      writeFileSync(outPath, wavBuffer);

      const totalMs = performance.now() - startTime;
      const ttfbMs = firstChunkTime ? (firstChunkTime - startTime) : null;

      console.log(`${label} ${partial ? 'PARTIAL' : 'DONE'} | ${pcmChunks.length} chunks | WAV: ${(wavBuffer.length / 1024).toFixed(1)}KB | ~${durationSec}s audio | ${totalMs.toFixed(0)}ms total`);

      try { ws.close(); } catch {}
      resolveGen({
        api: 'Live',
        prompt: promptKey,
        filename,
        sizeKB: +(wavBuffer.length / 1024).toFixed(1),
        durationSec: +durationSec,
        ttfbMs: ttfbMs !== null ? +ttfbMs.toFixed(0) : null,
        totalMs: +totalMs.toFixed(0),
        partial,
      });
    }

    const ws = new WS(wsUrl);

    ws.onopen = () => {
      const connectMs = (performance.now() - startTime).toFixed(0);
      console.log(`${label} WebSocket connected (${connectMs}ms)`);

      ws.send(JSON.stringify({
        setup: {
          model: `models/${LIVE_MODEL}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: VOICE },
              },
            },
          },
        },
      }));
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
          text = await event.data.text();
        } else if (event.data instanceof ArrayBuffer) {
          text = new TextDecoder().decode(event.data);
        } else {
          text = String(event.data);
        }
        data = JSON.parse(text);
      } catch {
        return;
      }

      if (data.setupComplete) {
        const setupMs = (performance.now() - startTime).toFixed(0);
        console.log(`${label} Setup complete (${setupMs}ms)`);

        ws.send(JSON.stringify({
          clientContent: {
            turns: [{ role: 'user', parts: [{ text: promptText }] }],
            turnComplete: true,
          },
        }));
        console.log(`${label} Sent TTS instruction, waiting for audio...`);
        return;
      }

      if (data.serverContent) {
        const parts = data.serverContent?.modelTurn?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            const chunkBuf = Buffer.from(part.inlineData.data, 'base64');
            pcmChunks.push(chunkBuf);

            if (!firstChunkTime) {
              firstChunkTime = performance.now();
              const ttfb = (firstChunkTime - startTime).toFixed(0);
              console.log(`${label} First audio chunk! TTFB=${ttfb}ms, ${chunkBuf.length} bytes`);
            }

            if (pcmChunks.length % 100 === 0) {
              const totalBytes = pcmChunks.reduce((s, c) => s + c.length, 0);
              const elapsed = (performance.now() - startTime).toFixed(0);
              console.log(`${label} Progress: ${pcmChunks.length} chunks | ${(totalBytes / 1024).toFixed(1)}KB | ${elapsed}ms`);
            }
          }
        }

        if (data.serverContent.turnComplete) {
          finalize(false);
        }
      }

      if (data.error) {
        console.error(`${label} Server error:`, JSON.stringify(data.error));
        clearTimeout(timeout);
        try { ws.close(); } catch {}
        resolveGen(null);
      }
    };

    ws.onerror = (err) => {
      console.error(`${label} WebSocket error:`, err.message || err);
      clearTimeout(timeout);
      resolveGen(null);
    };

    ws.onclose = () => {
      clearTimeout(timeout);
    };
  });
}

// ── Delay helper ──
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ──
async function main() {
  console.log('='.repeat(72));
  console.log('  Arabic Poetry TTS — Round 3: New Prompt Architectures');
  console.log('  Both APIs (REST + Live) | Voice: Fenrir | Prompts J-O');
  console.log('='.repeat(72));

  mkdirSync(OUTPUT_DIR, { recursive: true });

  // ── Print full prompts ──
  console.log('\n' + '='.repeat(72));
  console.log('  FULL PROMPTS');
  console.log('='.repeat(72));

  for (const [key, p] of Object.entries(PROMPTS)) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Prompt ${key}: ${p.label}`);
    console.log(`(${p.description})`);
    console.log(`${p.text.length} chars`);
    console.log('─'.repeat(60));
    console.log(p.text);
  }

  // ── Git history context ──
  console.log('\n' + '='.repeat(72));
  console.log('  GIT HISTORY: Previous TTS Prompts Found');
  console.log('='.repeat(72));
  console.log(`
  V0 (original inline, pre-extraction):
    "Act as a master orator. Recite this masterpiece by {poet} in the
     soulful, {mood} tone of the {era} era. Use high intensity,
     passionate oratorical power, and majestic strength. Include natural
     pauses and audible breaths. Text: {poem}"
    — This is Prompt N above.

  V1 (first prompts.js version):
    Same as V0, extracted to getTTSInstruction() function.

  V2 (current production = Prompt A):
    "You are a legendary Arabic sha'ir (poet-orator)..." (7 rules)
    — The prompt that all rounds are benchmarked against.

  V3 (short/fast variant, getTTSInstructionShort):
    "Recite this {mood} Arabic poem by {poet} ({era}) with expressive
     inshad style. Project emotion, vary pace, stress the qafiya."
    — ~200 chars, used when FEATURES.ttsFastPrompt is true.
`);

  const results = [];
  const promptKeys = Object.keys(PROMPTS);

  // ── Phase 1: REST API ──
  console.log('='.repeat(72));
  console.log('  PHASE 1: REST API (gemini-2.5-flash-preview-tts)');
  console.log('='.repeat(72));

  for (const key of promptKeys) {
    const result = await generateREST(key, PROMPTS[key].text);
    results.push(result);
    if (key !== promptKeys[promptKeys.length - 1]) {
      console.log('  (waiting 3s...)');
      await delay(3000);
    }
  }

  // ── Phase 2: Live API ──
  console.log('\n' + '='.repeat(72));
  console.log('  PHASE 2: Live API (gemini-2.5-flash-native-audio-preview)');
  console.log('='.repeat(72));

  for (const key of promptKeys) {
    const result = await generateLive(key, PROMPTS[key].text);
    results.push(result);
    if (key !== promptKeys[promptKeys.length - 1]) {
      console.log('  (waiting 3s...)');
      await delay(3000);
    }
  }

  // ── Summary Table ──
  console.log('\n\n' + '='.repeat(110));
  console.log('  RESULTS SUMMARY — Round 3');
  console.log('='.repeat(110));
  console.log();

  const hdr = [
    'Filename'.padEnd(22),
    'API'.padEnd(6),
    'Prompt'.padEnd(8),
    'Label'.padEnd(30),
    'Size(KB)'.padEnd(10),
    'Duration'.padEnd(10),
    'TTFB(ms)'.padEnd(10),
    'Total(ms)'.padEnd(10),
  ].join(' | ');
  console.log(hdr);
  console.log('-'.repeat(hdr.length));

  for (const r of results) {
    if (!r) {
      console.log('FAILED'.padEnd(hdr.length));
      continue;
    }
    const promptInfo = PROMPTS[r.prompt];
    const row = [
      r.filename.padEnd(22),
      r.api.padEnd(6),
      r.prompt.padEnd(8),
      (promptInfo?.label || '').padEnd(30),
      String(r.sizeKB).padEnd(10),
      (r.durationSec + 's').padEnd(10),
      (r.ttfbMs !== null ? String(r.ttfbMs) : 'N/A').padEnd(10),
      String(r.totalMs).padEnd(10),
    ].join(' | ');
    console.log(row);
  }

  // Averages by API
  const restResults = results.filter((r) => r && r.api === 'REST');
  const liveResults = results.filter((r) => r && r.api === 'Live');

  console.log();
  console.log('-'.repeat(70));
  console.log('BASELINE: REST-A = 812KB / ~16.9s audio / 44,166ms total');
  console.log();

  if (restResults.length > 0) {
    const avgSize = (restResults.reduce((s, r) => s + r.sizeKB, 0) / restResults.length).toFixed(1);
    const avgDur = (restResults.reduce((s, r) => s + r.durationSec, 0) / restResults.length).toFixed(1);
    const avgTotal = (restResults.reduce((s, r) => s + r.totalMs, 0) / restResults.length).toFixed(0);
    console.log(`REST averages (${restResults.length} samples): Size=${avgSize}KB | Duration=${avgDur}s | Total=${avgTotal}ms`);
  }

  if (liveResults.length > 0) {
    const avgSize = (liveResults.reduce((s, r) => s + r.sizeKB, 0) / liveResults.length).toFixed(1);
    const avgDur = (liveResults.reduce((s, r) => s + r.durationSec, 0) / liveResults.length).toFixed(1);
    const ttfbSamples = liveResults.filter((r) => r.ttfbMs !== null);
    const avgTTFB = ttfbSamples.length > 0
      ? (ttfbSamples.reduce((s, r) => s + r.ttfbMs, 0) / ttfbSamples.length).toFixed(0)
      : 'N/A';
    const avgTotal = (liveResults.reduce((s, r) => s + r.totalMs, 0) / liveResults.length).toFixed(0);
    console.log(`Live averages (${liveResults.length} samples): Size=${avgSize}KB | Duration=${avgDur}s | TTFB=${avgTTFB}ms | Total=${avgTotal}ms`);
  }

  console.log(`\nAll samples saved to: ${OUTPUT_DIR}/`);
}

main().catch(console.error);
