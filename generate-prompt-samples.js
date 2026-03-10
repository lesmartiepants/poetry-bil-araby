/**
 * Generate TTS prompt comparison samples for Arabic poetry.
 *
 * Tests 5 different prompt strategies across both Gemini TTS APIs
 * (REST + Live WebSocket) to find which prompt style produces the
 * most natural Arabic poetry recitation.
 *
 * Prompts:
 *   A — Current English production prompt
 *   B — Entirely Arabic prompt (traditional inshad terminology)
 *   C — Bilingual hybrid (Arabic terms + English structure)
 *   D — Minimal Arabic (single instruction line)
 *   E — Detailed Arabic with dialect/theatrical guidance
 *
 * Output: 10 WAV files (5 prompts x 2 APIs) + summary table
 *
 * Usage: node generate-prompt-samples.js
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

const POET = "Imru' al-Qais";
const ERA = 'Pre-Islamic (Jahiliyya)';
const MOOD = 'Nostalgic/Melancholic';

// ── Prompt Definitions ──
const PROMPTS = {
  A: {
    label: 'Current English',
    description: 'Production English prompt for Arabic recitation',
    text:
      `You are a legendary Arabic sha'ir (poet-orator) performing a live inshad recitation of a poem by ${POET} from the ${ERA} era. ` +
      `This is a PERFORMANCE, not a reading — deliver it with the full emotional power and artistic craft of classical Arabic oral tradition. ` +
      `This poem's mood is ${MOOD}. ` +
      `DELIVERY RULES: ` +
      `1. PROJECT your voice with authority and presence from the very first word. ` +
      `2. EMPHASIZE key words and emotionally charged lines — let them land with weight and resonance. ` +
      `3. USE dramatic pauses before and after powerful lines to let them breathe and sink in. ` +
      `4. VARY your tempo dynamically: slow to a commanding halt for profound or painful lines, surge forward with energy for triumphant or passionate ones. ` +
      `5. STRESS the end-rhyme (qafiya) of each verse with a clear, ringing cadence. ` +
      `6. Let your voice SWELL and RECEDE with the emotional arc — build intensity toward the poem's peak, then resolve with gravity. ` +
      `7. Avoid flat, monotone delivery at all costs — every line must feel alive and intentional. ` +
      `Poem:\n${POEM_ARABIC}`,
  },

  B: {
    label: 'Full Arabic',
    description: 'Entirely Arabic prompt referencing proper إنشاد شعري tradition',
    text:
      `أنت مُنشد شعري محترف متمرس في فن الإلقاء العربي الكلاسيكي. أَنشِد هذه القصيدة الجاهلية لامرئ القيس بأسلوب الإنشاد العربي التقليدي الأصيل.\n\n` +
      `قواعد الأداء:\n` +
      `١. ابدأ بحضور صوتي قوي ومهيب من أول كلمة\n` +
      `٢. راعِ التجويد الشعري في كل بيت — أعطِ كل حرف حقه ومستحقه\n` +
      `٣. التزم بالوقف والابتداء — توقف عند نهاية كل شطر بسكتة مناسبة\n` +
      `٤. أبرز القافية (اللام المكسورة) بوضوح ورنين في آخر كل بيت\n` +
      `٥. نوّع في التنغيم بين الحزن والحنين — هذه قصيدة وقوف على الأطلال\n` +
      `٦. اجعل صوتك يعلو ويخفت مع المعنى — تصاعد عند الشوق وهدوء عند التأمل\n` +
      `٧. لا تقرأ قراءة رتيبة أبداً — كل بيت يجب أن يحمل إحساساً مختلفاً\n\n` +
      `القصيدة:\n${POEM_ARABIC}`,
  },

  C: {
    label: 'Bilingual hybrid',
    description: 'Arabic terminology with English structure',
    text:
      `Perform an Arabic إنشاد شعري (poetic recitation) of this Pre-Islamic قصيدة by Imru' al-Qais. Follow the authentic tradition of Arabic oral poetry performance:\n\n` +
      `1. Strong الحضور الصوتي (vocal presence) — commanding from the first word\n` +
      `2. Proper التجويد الشعري (poetic articulation) — give each letter its right\n` +
      `3. Observe الوقف والابتداء (pauses and beginnings) — breathe between hemistichs\n` +
      `4. Ring the قافية (end-rhyme) clearly at the end of each بيت (verse)\n` +
      `5. Vary التنغيم (intonation) between حزن (sorrow) and حنين (longing)\n` +
      `6. This is a وقوف على الأطلال (standing at the ruins) — melancholic nostalgia\n\n` +
      `Poem:\n${POEM_ARABIC}`,
  },

  D: {
    label: 'Minimal Arabic',
    description: 'Ultra-short to test if less instruction = more natural',
    text:
      `اقرأ هذه القصيدة الجاهلية بإنشاد شعري عربي تقليدي. القصيدة لامرئ القيس:\n\n${POEM_ARABIC}`,
  },

  E: {
    label: 'Detailed Arabic + Fusha',
    description: 'Arabic prompt with proper Fusha emphasis and راوية concept',
    text:
      `أنت راوية شعر عربي من الطراز الأول. ألقِ هذه الأبيات من معلقة امرئ القيس بالفصحى السليمة وبأسلوب الإنشاد الشعري العربي الرفيع.\n\n` +
      `الأسلوب المطلوب:\n` +
      `- النطق بالعربية الفصحى الواضحة مع إظهار الحركات والتشكيل\n` +
      `- التمهل في الإلقاء مع إعطاء كل بيت حقه من التأمل\n` +
      `- إبراز موسيقى البحر الطويل في إيقاع الإلقاء\n` +
      `- الوقف المناسب بين الشطرين وبين الأبيات\n` +
      `- تلوين الصوت بما يناسب معنى الوقوف على الأطلال والحنين إلى الحبيبة\n` +
      `- القافية (اللام المكسورة) تُنطق بوضوح ورنين\n\n` +
      `الأبيات:\n${POEM_ARABIC}`,
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

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    const ttfb = performance.now() - startTime;
    console.log(`${label} Response: HTTP ${res.status} (${ttfb.toFixed(0)}ms)`);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`${label} ERROR: ${errText.substring(0, 200)}`);
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
    const filename = `sample-rest-${promptKey}.wav`;
    const outPath = resolve(OUTPUT_DIR, filename);
    writeFileSync(outPath, wavBuffer);

    console.log(`${label} DONE | WAV: ${(wavBuffer.length / 1024).toFixed(1)}KB | ${totalMs.toFixed(0)}ms total`);
    console.log(`${label} Saved: ${outPath}`);

    return {
      api: 'REST',
      prompt: promptKey,
      filename,
      path: outPath,
      sizeKB: +(wavBuffer.length / 1024).toFixed(1),
      ttfbMs: +ttfb.toFixed(0),
      totalMs: +totalMs.toFixed(0),
    };
  } catch (err) {
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
      const filename = `sample-live-${promptKey}.wav`;
      const outPath = resolve(OUTPUT_DIR, filename);
      writeFileSync(outPath, wavBuffer);

      const totalMs = performance.now() - startTime;
      const ttfbMs = firstChunkTime ? (firstChunkTime - startTime) : null;

      console.log(`${label} ${partial ? 'PARTIAL' : 'DONE'} | ${pcmChunks.length} chunks | WAV: ${(wavBuffer.length / 1024).toFixed(1)}KB | ${totalMs.toFixed(0)}ms total`);
      console.log(`${label} Saved: ${outPath}`);

      try { ws.close(); } catch {}
      resolveGen({
        api: 'Live',
        prompt: promptKey,
        filename,
        path: outPath,
        sizeKB: +(wavBuffer.length / 1024).toFixed(1),
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

            if (pcmChunks.length % 50 === 0) {
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

// ── Delay helper (rate limit avoidance) ──
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ──
async function main() {
  console.log('='.repeat(72));
  console.log('  Arabic Poetry TTS Prompt Comparison');
  console.log('  Poem: Mu\'allaqa of Imru\' al-Qais (Pre-Islamic)');
  console.log(`  Voice: ${VOICE} | APIs: REST + Live`);
  console.log('='.repeat(72));

  // Create output directory
  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`\nOutput directory: ${OUTPUT_DIR}`);

  // List prompts
  console.log('\nPrompt strategies:');
  for (const [key, p] of Object.entries(PROMPTS)) {
    console.log(`  ${key}: ${p.label} (${p.text.length} chars)`);
  }

  const results = [];
  const promptKeys = Object.keys(PROMPTS);

  // Generate REST samples first (sequential to avoid rate limits)
  console.log('\n' + '='.repeat(72));
  console.log('  PHASE 1: REST API (gemini-2.5-flash-preview-tts)');
  console.log('='.repeat(72));

  for (const key of promptKeys) {
    const result = await generateREST(key, PROMPTS[key].text);
    results.push(result);
    // Brief delay between requests to avoid rate limiting
    if (key !== promptKeys[promptKeys.length - 1]) {
      console.log('  (waiting 3s before next request...)');
      await delay(3000);
    }
  }

  // Generate Live API samples (sequential, generous timeout)
  console.log('\n' + '='.repeat(72));
  console.log('  PHASE 2: Live API (gemini-2.5-flash-native-audio-preview)');
  console.log('='.repeat(72));

  for (const key of promptKeys) {
    const result = await generateLive(key, PROMPTS[key].text);
    results.push(result);
    // Brief delay between connections
    if (key !== promptKeys[promptKeys.length - 1]) {
      console.log('  (waiting 3s before next request...)');
      await delay(3000);
    }
  }

  // ── Summary Table ──
  console.log('\n\n' + '='.repeat(90));
  console.log('  RESULTS SUMMARY');
  console.log('='.repeat(90));
  console.log();

  // Header
  const hdr = [
    'Filename'.padEnd(24),
    'API'.padEnd(6),
    'Prompt'.padEnd(8),
    'Label'.padEnd(24),
    'Size(KB)'.padEnd(10),
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
      r.filename.padEnd(24),
      r.api.padEnd(6),
      r.prompt.padEnd(8),
      (promptInfo?.label || '').padEnd(24),
      String(r.sizeKB).padEnd(10),
      (r.ttfbMs !== null ? String(r.ttfbMs) : 'N/A').padEnd(10),
      String(r.totalMs).padEnd(10),
    ].join(' | ');
    console.log(row);
  }

  // Group by API for averages
  const restResults = results.filter((r) => r && r.api === 'REST');
  const liveResults = results.filter((r) => r && r.api === 'Live');

  console.log();
  console.log('-'.repeat(60));

  if (restResults.length > 0) {
    const avgSize = (restResults.reduce((s, r) => s + r.sizeKB, 0) / restResults.length).toFixed(1);
    const avgTTFB = (restResults.reduce((s, r) => s + r.ttfbMs, 0) / restResults.length).toFixed(0);
    const avgTotal = (restResults.reduce((s, r) => s + r.totalMs, 0) / restResults.length).toFixed(0);
    console.log(`REST averages:  ${restResults.length} samples | Avg size: ${avgSize}KB | Avg TTFB: ${avgTTFB}ms | Avg total: ${avgTotal}ms`);
  }

  if (liveResults.length > 0) {
    const avgSize = (liveResults.reduce((s, r) => s + r.sizeKB, 0) / liveResults.length).toFixed(1);
    const ttfbSamples = liveResults.filter((r) => r.ttfbMs !== null);
    const avgTTFB = ttfbSamples.length > 0
      ? (ttfbSamples.reduce((s, r) => s + r.ttfbMs, 0) / ttfbSamples.length).toFixed(0)
      : 'N/A';
    const avgTotal = (liveResults.reduce((s, r) => s + r.totalMs, 0) / liveResults.length).toFixed(0);
    console.log(`Live averages:  ${liveResults.length} samples | Avg size: ${avgSize}KB | Avg TTFB: ${avgTTFB}ms | Avg total: ${avgTotal}ms`);
  }

  console.log();
  console.log(`All samples saved to: ${OUTPUT_DIR}/`);
  console.log('Listen to each sample and compare recitation quality across prompt strategies.');
}

main().catch(console.error);
