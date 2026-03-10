/**
 * Test Prompt K (Arabic role-play) with diverse poems from the database.
 *
 * Prompt K was the user's favorite from round 3. This script tests it
 * with 4 different poems from different poets/eras to verify it
 * generalizes well beyond the Imru' al-Qais mu'allaqa.
 *
 * Poems:
 *   1. ابن زيدون — "بيني وبينك" (Andalusian, love)
 *   2. أبو نواس — "دع عنك لومي" (Abbasid, defiance/wine)
 *   3. المتنبي — "ضيف ألم برأسي" (Abbasid, pride/aging)
 *   4. النابغة الذبياني — "كليني لهم" (Pre-Islamic, worry/night)
 *
 * Both APIs: REST + Live. Voice: Fenrir.
 *
 * Usage: node generate-prompt-k-variations.js
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

// ── Poems from the database (diacritized content, trimmed to ~4-6 verses) ──
const POEMS = [
  {
    id: 41936,
    poet: 'ابن زيدون',
    title: 'بيني وبينك ما لو شئت لم يضع',
    era: 'الأندلسي',
    context: 'الشاعر الأندلسي العاشق',
    text: `بَيْنِي وَبَيَّنَكَ مَا لَوِّ شِئْتَ لَمَّ يَضِعْ
سِرٌّ إِذَا ذَاعَتْ الْأَسْرَارُ لَمَّ يَذِعْ
يَا بَائِعًا حَظَّهُ مِنِّي وَلَوِّ بُذِلَتْ
لِي الْحَيَاةُ بِحَظِّي مِنْهُ لَمَّ أَبِعْ
يَكْفِيكَ أَنَّكَ إِن حَمَّلْتَ قَلْبِي مَا
لَمَّ تَسْتَطِعْهُ قُلُوبُ النَّاسِ يَسْتَطِعْ
وَأَنَّنِي لَمَّ أَزَلْ فِي كُلِّ نَائِبَةٍ
أَبْكِي عَلَيْكَ بِدَمْعٍ مَالَه دُفُعْ`,
  },
  {
    id: 46151,
    poet: 'أبو نواس',
    title: 'دع عنك لومي فإن اللوم إغراء',
    era: 'العباسي',
    context: 'شاعر الخمرة والتمرد',
    text: `دَعْ عَنكَ لَوْمَي فإِنّ اللَّوْمِ إغْرَاءَ
وَدَاوِنِي بالَّتِي كانت هِي الدَّاءِ
صَفْرَاءَ لَا تَنَزُّلِ الْأحْزَانِ سَاحَتَهَا
لَو مَسَّهَا حَجَرُ مَسَّتِهِ سَرَّاءَ
مِن كَفِّ ذَات حُرٍّ فِي زِي ذِي ذِكْرِ
لَهَا مُحِبَّانِ لَوْطِي وَزِنَاءُ`,
  },
  {
    id: 27161,
    poet: 'المتنبي',
    title: 'ضيف ألم برأسي غير محتشم',
    era: 'العباسي',
    context: 'أعظم شعراء العربية وأكثرهم فخراً',
    text: `ضَيْفٌ ألَم بِرَأْسِي غَيْرِ مُحْتَشِمِ
وَالسَّيْفَ أَحْسَنُ فَعُلَا مِنهُ بِاللِّمَمِ
إِبْعد بَعُدَتْ بَيَاضَا لَا بَيَاضٍ لَه
لِأَنَتْ أُسودٌ فِي عَيْنِي مِن الظُّلْمِ
بِحُبِّ قَاتِلَتِي وَالشَّيْبِ تَغْذِيَتَي
هَوَاَي طِفْلًا وَشَيْبَي بَالِغُ الْحُلْمِ`,
  },
  {
    id: 76756,
    poet: 'النابغة الذبياني',
    title: 'كليني لهم يا أميمة ناصب',
    era: 'الجاهلي',
    context: 'شاعر المعلقات وأحد فحول الجاهلية',
    text: `كُلِينِي لهُم يَا أَمِيمَةَ نَاصِبَ
ولَيْلَ أَقَاسِيِهِ بَطِيءَ الْكَوَاكِبِ
تَطَاوُلٌ حَتَّى قُلْتُ لَيْس بِمُنْقِضِ
ولَيْس الَّذِي يَرْعَى النُّجُومُ بآِئب
وَصَدْرٌ أَرَاحَ اللَّيْلُ عَازِبُ هَمِّهِ
تُضَاعِفُ فِيهِ الْحُزْنَ مِن كُلّ جَانِبُ`,
  },
];

// ── Build Prompt K for each poem ──
function buildPromptK(poem) {
  return (
    `أنت ${poem.poet}، ${poem.context}. ` +
    `تقف أمام جمهور في مجلس شعر. قُم وألقِ قصيدتك أمام الحضور. ` +
    `هذه قصيدتك أنت، كلماتك أنت. ألقِها بسلطان الشعراء وعاطفة من عاش كل كلمة. ` +
    `ابدأ:\n${poem.text}`
  );
}

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
async function generateREST(poemId, promptText) {
  const label = `[REST-K-${poemId}]`;
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
    const filename = `sample-rest-K-${poemId}.wav`;
    const outPath = resolve(OUTPUT_DIR, filename);
    writeFileSync(outPath, wavBuffer);

    console.log(`${label} DONE | WAV: ${(wavBuffer.length / 1024).toFixed(1)}KB | ~${durationSec}s audio | ${totalMs.toFixed(0)}ms total`);

    return {
      api: 'REST',
      poemId,
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
async function generateLive(poemId, promptText) {
  const label = `[Live-K-${poemId}]`;
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
      const filename = `sample-live-K-${poemId}.wav`;
      const outPath = resolve(OUTPUT_DIR, filename);
      writeFileSync(outPath, wavBuffer);

      const totalMs = performance.now() - startTime;
      const ttfbMs = firstChunkTime ? (firstChunkTime - startTime) : null;

      console.log(`${label} ${partial ? 'PARTIAL' : 'DONE'} | ${pcmChunks.length} chunks | WAV: ${(wavBuffer.length / 1024).toFixed(1)}KB | ~${durationSec}s audio | ${totalMs.toFixed(0)}ms total`);

      try { ws.close(); } catch {}
      resolveGen({
        api: 'Live',
        poemId,
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
  console.log('  Prompt K Generalization Test — 4 Diverse Poems');
  console.log('  Both APIs (REST + Live) | Voice: Fenrir');
  console.log('='.repeat(72));

  mkdirSync(OUTPUT_DIR, { recursive: true });

  // ── Print poems and prompts ──
  console.log('\n' + '='.repeat(72));
  console.log('  POEMS & PROMPTS');
  console.log('='.repeat(72));

  const promptTexts = {};
  for (const poem of POEMS) {
    const prompt = buildPromptK(poem);
    promptTexts[poem.id] = prompt;
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Poem ${poem.id}: "${poem.title}"`);
    console.log(`Poet: ${poem.poet} | Era: ${poem.era}`);
    console.log(`Prompt (${prompt.length} chars):`);
    console.log('─'.repeat(60));
    console.log(prompt);
  }

  const results = [];

  // ── Phase 1: REST API ──
  console.log('\n' + '='.repeat(72));
  console.log('  PHASE 1: REST API');
  console.log('='.repeat(72));

  for (let i = 0; i < POEMS.length; i++) {
    const poem = POEMS[i];
    const result = await generateREST(poem.id, promptTexts[poem.id]);
    results.push(result);
    if (i < POEMS.length - 1) {
      console.log('  (waiting 3s...)');
      await delay(3000);
    }
  }

  // ── Phase 2: Live API ──
  console.log('\n' + '='.repeat(72));
  console.log('  PHASE 2: Live API');
  console.log('='.repeat(72));

  for (let i = 0; i < POEMS.length; i++) {
    const poem = POEMS[i];
    const result = await generateLive(poem.id, promptTexts[poem.id]);
    results.push(result);
    if (i < POEMS.length - 1) {
      console.log('  (waiting 3s...)');
      await delay(3000);
    }
  }

  // ── Summary Table ──
  console.log('\n\n' + '='.repeat(120));
  console.log('  RESULTS SUMMARY — Prompt K Generalization');
  console.log('='.repeat(120));
  console.log();

  const hdr = [
    'Filename'.padEnd(28),
    'API'.padEnd(6),
    'Poet'.padEnd(22),
    'Title (short)'.padEnd(28),
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
    const poem = POEMS.find((p) => p.id === r.poemId);
    const shortTitle = poem ? poem.title.substring(0, 26) : '?';
    const row = [
      r.filename.padEnd(28),
      r.api.padEnd(6),
      (poem?.poet || '?').padEnd(22),
      shortTitle.padEnd(28),
      String(r.sizeKB).padEnd(10),
      (r.durationSec + 's').padEnd(10),
      (r.ttfbMs !== null ? String(r.ttfbMs) : 'N/A').padEnd(10),
      String(r.totalMs).padEnd(10),
    ].join(' | ');
    console.log(row);
  }

  // Averages
  const restResults = results.filter((r) => r && r.api === 'REST');
  const liveResults = results.filter((r) => r && r.api === 'Live');

  console.log();
  console.log('-'.repeat(70));
  console.log('BASELINE: REST-K (Imru al-Qais) = 691KB / ~14.7s / 7,764ms');
  console.log('BASELINE: Live-K (Imru al-Qais) = 1,189KB / ~25.4s / 30,688ms');
  console.log();

  if (restResults.length > 0) {
    const avgSize = (restResults.reduce((s, r) => s + r.sizeKB, 0) / restResults.length).toFixed(1);
    const avgDur = (restResults.reduce((s, r) => s + r.durationSec, 0) / restResults.length).toFixed(1);
    const avgTotal = (restResults.reduce((s, r) => s + r.totalMs, 0) / restResults.length).toFixed(0);
    console.log(`REST averages (${restResults.length} poems): Size=${avgSize}KB | Duration=${avgDur}s | Total=${avgTotal}ms`);
  }

  if (liveResults.length > 0) {
    const avgSize = (liveResults.reduce((s, r) => s + r.sizeKB, 0) / liveResults.length).toFixed(1);
    const avgDur = (liveResults.reduce((s, r) => s + r.durationSec, 0) / liveResults.length).toFixed(1);
    const ttfbSamples = liveResults.filter((r) => r.ttfbMs !== null);
    const avgTTFB = ttfbSamples.length > 0
      ? (ttfbSamples.reduce((s, r) => s + r.ttfbMs, 0) / ttfbSamples.length).toFixed(0)
      : 'N/A';
    const avgTotal = (liveResults.reduce((s, r) => s + r.totalMs, 0) / liveResults.length).toFixed(0);
    console.log(`Live averages (${liveResults.length} poems): Size=${avgSize}KB | Duration=${avgDur}s | TTFB=${avgTTFB}ms | Total=${avgTotal}ms`);
  }

  console.log(`\nAll samples saved to: ${OUTPUT_DIR}/`);
}

main().catch(console.error);
