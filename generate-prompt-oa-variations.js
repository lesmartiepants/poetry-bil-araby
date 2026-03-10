/**
 * Generalization test: Prompt O (Director's cue) and Prompt A (current production)
 * with 4 diverse poems from the database, both REST and Live APIs.
 *
 * Direct comparison to determine which prompt is most reliable for production.
 *
 * Same 4 poems used in the Prompt K generalization test:
 *   41936 — ابن زيدون (Andalusian, love)
 *   46151 — أبو نواس (Abbasid, defiance)
 *   27161 — المتنبي (Abbasid, pride)
 *   76756 — النابغة الذبياني (Pre-Islamic, worry)
 *
 * Usage: node generate-prompt-oa-variations.js
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

// ── Poems ──
const POEMS = [
  {
    id: 41936,
    poet: 'Ibn Zaydun',
    poetAr: 'ابن زيدون',
    era: 'Andalusian',
    mood: 'Romantic',
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
    poet: 'Abu Nuwas',
    poetAr: 'أبو نواس',
    era: 'Abbasid',
    mood: 'Defiant',
    text: `دَعْ عَنكَ لَوْمَي فإِنّ اللَّوْمِ إغْرَاءَ
وَدَاوِنِي بالَّتِي كانت هِي الدَّاءِ
صَفْرَاءَ لَا تَنَزُّلِ الْأحْزَانِ سَاحَتَهَا
لَو مَسَّهَا حَجَرُ مَسَّتِهِ سَرَّاءَ
مِن كَفِّ ذَات حُرٍّ فِي زِي ذِي ذِكْرِ
لَهَا مُحِبَّانِ لَوْطِي وَزِنَاءُ`,
  },
  {
    id: 27161,
    poet: 'Al-Mutanabbi',
    poetAr: 'المتنبي',
    era: 'Abbasid',
    mood: 'Proud',
    text: `ضَيْفٌ ألَم بِرَأْسِي غَيْرِ مُحْتَشِمِ
وَالسَّيْفَ أَحْسَنُ فَعُلَا مِنهُ بِاللِّمَمِ
إِبْعد بَعُدَتْ بَيَاضَا لَا بَيَاضٍ لَه
لِأَنَتْ أُسودٌ فِي عَيْنِي مِن الظُّلْمِ
بِحُبِّ قَاتِلَتِي وَالشَّيْبِ تَغْذِيَتَي
هَوَاَي طِفْلًا وَشَيْبَي بَالِغُ الْحُلْمِ`,
  },
  {
    id: 76756,
    poet: 'Al-Nabigha al-Dhubyani',
    poetAr: 'النابغة الذبياني',
    era: 'Pre-Islamic',
    mood: 'Melancholic',
    text: `كُلِينِي لهُم يَا أَمِيمَةَ نَاصِبَ
ولَيْلَ أَقَاسِيِهِ بَطِيءَ الْكَوَاكِبِ
تَطَاوُلٌ حَتَّى قُلْتُ لَيْس بِمُنْقِضِ
ولَيْس الَّذِي يَرْعَى النُّجُومُ بآِئب
وَصَدْرٌ أَرَاحَ اللَّيْلُ عَازِبُ هَمِّهِ
تُضَاعِفُ فِيهِ الْحُزْنَ مِن كُلّ جَانِبُ`,
  },
];

// ── Prompt Builders ──
function buildPromptA(poem) {
  return (
    `You are a legendary Arabic sha'ir (poet-orator) performing a live inshad recitation of a poem by ${poem.poet} from the ${poem.era} era. ` +
    `This is a PERFORMANCE, not a reading — deliver it with the full emotional power and artistic craft of classical Arabic oral tradition. ` +
    `This poem's mood is ${poem.mood}. ` +
    `DELIVERY RULES: ` +
    `1. PROJECT your voice with authority and presence from the very first word. ` +
    `2. EMPHASIZE key words and emotionally charged lines — let them land with weight and resonance. ` +
    `3. USE dramatic pauses before and after powerful lines to let them breathe and sink in. ` +
    `4. VARY your tempo dynamically: slow to a commanding halt for profound or painful lines, surge forward with energy for triumphant or passionate ones. ` +
    `5. STRESS the end-rhyme (qafiya) of each verse with a clear, ringing cadence. ` +
    `6. Let your voice SWELL and RECEDE with the emotional arc — build intensity toward the poem's peak, then resolve with gravity. ` +
    `7. Avoid flat, monotone delivery at all costs — every line must feel alive and intentional. ` +
    `Poem:\n${poem.text}`
  );
}

function buildPromptO(poem) {
  return (
    `RECORDING SESSION — Arabic Poetry Performance. ` +
    `Voice: commanding male orator. ` +
    `Style: classical Arabic poetry recitation (not singing, not chanting). ` +
    `Energy: HIGH. ` +
    `Pace: NATURAL conversational authority, NOT slow. ` +
    `The poet speaks with conviction, not sorrow. ` +
    `Poem:\n${poem.text}`
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
  if (typeof globalThis.WebSocket !== 'undefined') return globalThis.WebSocket;
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    return require('ws');
  } catch {
    console.error('ERROR: No WebSocket available.');
    process.exit(1);
  }
}

// ── Generate via REST API ──
async function generateREST(promptLabel, poemId, promptText) {
  const label = `[REST-${promptLabel}-${poemId}]`;
  console.log(`\n${label} Sending (${promptText.length} chars)...`);

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
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
        },
      }),
    });
    clearTimeout(timeout);
    const ttfb = performance.now() - startTime;
    console.log(`${label} HTTP ${res.status} (${ttfb.toFixed(0)}ms)`);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`${label} ERROR: ${errText.substring(0, 200)}`);
      return { api: 'REST', prompt: promptLabel, poemId, filename: 'FAILED', sizeKB: 0, durationSec: 0, ttfbMs: +ttfb.toFixed(0), totalMs: 0, failed: true, error: errText.substring(0, 100) };
    }

    const data = await res.json();
    const totalMs = performance.now() - startTime;
    const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64) {
      console.error(`${label} ERROR: No audio data`);
      return { api: 'REST', prompt: promptLabel, poemId, filename: 'NO_AUDIO', sizeKB: 0, durationSec: 0, ttfbMs: +ttfb.toFixed(0), totalMs: +totalMs.toFixed(0), failed: true };
    }

    const pcmData = Buffer.from(b64, 'base64');
    const wavBuffer = createWavBuffer(pcmData);
    const durationSec = (pcmData.length / (24000 * 2)).toFixed(1);
    const filename = `sample-rest-${promptLabel}-${poemId}.wav`;
    const outPath = resolve(OUTPUT_DIR, filename);
    writeFileSync(outPath, wavBuffer);

    console.log(`${label} DONE | ${(wavBuffer.length / 1024).toFixed(1)}KB | ~${durationSec}s | ${totalMs.toFixed(0)}ms`);
    return { api: 'REST', prompt: promptLabel, poemId, filename, sizeKB: +(wavBuffer.length / 1024).toFixed(1), durationSec: +durationSec, ttfbMs: +ttfb.toFixed(0), totalMs: +totalMs.toFixed(0) };
  } catch (err) {
    clearTimeout(timeout);
    console.error(`${label} ERROR: ${err.message}`);
    return { api: 'REST', prompt: promptLabel, poemId, filename: 'ERROR', sizeKB: 0, durationSec: 0, ttfbMs: 0, totalMs: 0, failed: true, error: err.message };
  }
}

// ── Generate via Live API WebSocket ──
async function generateLive(promptLabel, poemId, promptText) {
  const label = `[Live-${promptLabel}-${poemId}]`;
  console.log(`\n${label} Connecting (${promptText.length} chars)...`);

  const WS = await getWebSocket();
  const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.${LIVE_API_VERSION}.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

  return new Promise((resolveGen) => {
    const pcmChunks = [];
    const startTime = performance.now();
    let firstChunkTime = null;

    const timeout = setTimeout(() => {
      console.log(`${label} TIMEOUT 120s — saving partial...`);
      finalize(true);
    }, 120000);

    function finalize(partial = false) {
      clearTimeout(timeout);
      const pcmData = Buffer.concat(pcmChunks);
      if (pcmData.length === 0) {
        try { ws.close(); } catch {}
        resolveGen({ api: 'Live', prompt: promptLabel, poemId, filename: 'EMPTY', sizeKB: 0, durationSec: 0, ttfbMs: null, totalMs: +(performance.now() - startTime).toFixed(0), failed: true });
        return;
      }
      const wavBuffer = createWavBuffer(pcmData);
      const durationSec = (pcmData.length / (24000 * 2)).toFixed(1);
      const filename = `sample-live-${promptLabel}-${poemId}.wav`;
      const outPath = resolve(OUTPUT_DIR, filename);
      writeFileSync(outPath, wavBuffer);
      const totalMs = performance.now() - startTime;
      const ttfbMs = firstChunkTime ? (firstChunkTime - startTime) : null;
      console.log(`${label} ${partial ? 'PARTIAL' : 'DONE'} | ${pcmChunks.length} chunks | ${(wavBuffer.length / 1024).toFixed(1)}KB | ~${durationSec}s | ${totalMs.toFixed(0)}ms`);
      try { ws.close(); } catch {}
      resolveGen({ api: 'Live', prompt: promptLabel, poemId, filename, sizeKB: +(wavBuffer.length / 1024).toFixed(1), durationSec: +durationSec, ttfbMs: ttfbMs !== null ? +ttfbMs.toFixed(0) : null, totalMs: +totalMs.toFixed(0), partial });
    }

    const ws = new WS(wsUrl);
    ws.onopen = () => {
      console.log(`${label} Connected (${(performance.now() - startTime).toFixed(0)}ms)`);
      ws.send(JSON.stringify({
        setup: {
          model: `models/${LIVE_MODEL}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
          },
        },
      }));
    };

    ws.onmessage = async (event) => {
      let data;
      try {
        let text;
        if (typeof event.data === 'string') text = event.data;
        else if (event.data instanceof Buffer) text = event.data.toString('utf-8');
        else if (typeof event.data?.text === 'function') text = await event.data.text();
        else if (event.data instanceof ArrayBuffer) text = new TextDecoder().decode(event.data);
        else text = String(event.data);
        data = JSON.parse(text);
      } catch { return; }

      if (data.setupComplete) {
        console.log(`${label} Setup OK (${(performance.now() - startTime).toFixed(0)}ms)`);
        ws.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: promptText }] }], turnComplete: true } }));
        return;
      }
      if (data.serverContent) {
        const parts = data.serverContent?.modelTurn?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            pcmChunks.push(Buffer.from(part.inlineData.data, 'base64'));
            if (!firstChunkTime) {
              firstChunkTime = performance.now();
              console.log(`${label} First chunk TTFB=${(firstChunkTime - startTime).toFixed(0)}ms`);
            }
            if (pcmChunks.length % 100 === 0) {
              const bytes = pcmChunks.reduce((s, c) => s + c.length, 0);
              console.log(`${label} ${pcmChunks.length} chunks | ${(bytes / 1024).toFixed(1)}KB | ${(performance.now() - startTime).toFixed(0)}ms`);
            }
          }
        }
        if (data.serverContent.turnComplete) finalize(false);
      }
      if (data.error) {
        console.error(`${label} Error:`, JSON.stringify(data.error));
        clearTimeout(timeout);
        try { ws.close(); } catch {}
        resolveGen({ api: 'Live', prompt: promptLabel, poemId, filename: 'ERROR', sizeKB: 0, durationSec: 0, ttfbMs: null, totalMs: 0, failed: true });
      }
    };

    ws.onerror = (err) => {
      console.error(`${label} WS error:`, err.message || err);
      clearTimeout(timeout);
      resolveGen({ api: 'Live', prompt: promptLabel, poemId, filename: 'WS_ERROR', sizeKB: 0, durationSec: 0, ttfbMs: null, totalMs: 0, failed: true });
    };
    ws.onclose = () => clearTimeout(timeout);
  });
}

function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  console.log('='.repeat(72));
  console.log('  Prompt O + A Generalization Test — 4 Poems x 2 Prompts x 2 APIs');
  console.log('  16 total samples | Voice: Fenrir');
  console.log('='.repeat(72));

  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Print prompts for first poem as example
  console.log('\n' + '='.repeat(72));
  console.log('  PROMPT TEMPLATES (shown for poem 41936)');
  console.log('='.repeat(72));

  const examplePoem = POEMS[0];
  const exA = buildPromptA(examplePoem);
  const exO = buildPromptO(examplePoem);

  console.log(`\n--- Prompt A (${exA.length} chars) ---`);
  console.log(exA);
  console.log(`\n--- Prompt O (${exO.length} chars) ---`);
  console.log(exO);

  console.log('\n' + '='.repeat(72));
  console.log('  POEMS');
  console.log('='.repeat(72));
  for (const p of POEMS) {
    console.log(`\n  ${p.id}: ${p.poetAr} (${p.poet}) — ${p.era}, ${p.mood}`);
    const firstLine = p.text.split('\n')[0];
    console.log(`  "${firstLine.substring(0, 70)}..."`);
  }

  const results = [];

  // ── Phase 1: REST API — Prompt O then Prompt A ──
  console.log('\n' + '='.repeat(72));
  console.log('  PHASE 1: REST API — Prompt O (Director\'s cue)');
  console.log('='.repeat(72));

  for (let i = 0; i < POEMS.length; i++) {
    const p = POEMS[i];
    results.push(await generateREST('O', p.id, buildPromptO(p)));
    if (i < POEMS.length - 1) { console.log('  (3s...)'); await delay(3000); }
  }

  console.log('\n' + '='.repeat(72));
  console.log('  PHASE 2: REST API — Prompt A (Current production)');
  console.log('='.repeat(72));

  for (let i = 0; i < POEMS.length; i++) {
    const p = POEMS[i];
    results.push(await generateREST('A', p.id, buildPromptA(p)));
    if (i < POEMS.length - 1) { console.log('  (3s...)'); await delay(3000); }
  }

  // ── Phase 3: Live API — Prompt O then Prompt A ──
  console.log('\n' + '='.repeat(72));
  console.log('  PHASE 3: Live API — Prompt O (Director\'s cue)');
  console.log('='.repeat(72));

  for (let i = 0; i < POEMS.length; i++) {
    const p = POEMS[i];
    results.push(await generateLive('O', p.id, buildPromptO(p)));
    if (i < POEMS.length - 1) { console.log('  (3s...)'); await delay(3000); }
  }

  console.log('\n' + '='.repeat(72));
  console.log('  PHASE 4: Live API — Prompt A (Current production)');
  console.log('='.repeat(72));

  for (let i = 0; i < POEMS.length; i++) {
    const p = POEMS[i];
    results.push(await generateLive('A', p.id, buildPromptA(p)));
    if (i < POEMS.length - 1) { console.log('  (3s...)'); await delay(3000); }
  }

  // ── Summary ──
  console.log('\n\n' + '='.repeat(130));
  console.log('  RESULTS — Prompt O vs Prompt A Generalization');
  console.log('='.repeat(130));

  // Group results for clean display
  for (const promptLabel of ['O', 'A']) {
    for (const apiName of ['REST', 'Live']) {
      const subset = results.filter(r => r.prompt === promptLabel && r.api === apiName);
      console.log(`\n  ${apiName} — Prompt ${promptLabel} (${promptLabel === 'O' ? "Director's cue" : 'Current production'}):`);
      console.log('  ' + '-'.repeat(100));
      console.log('  ' + ['Poem ID'.padEnd(10), 'Poet'.padEnd(24), 'Duration'.padEnd(10), 'Size(KB)'.padEnd(10), 'TTFB(ms)'.padEnd(10), 'Total(ms)'.padEnd(10), 'Status'.padEnd(10)].join(' | '));
      console.log('  ' + '-'.repeat(100));

      for (const r of subset) {
        const poem = POEMS.find(p => p.id === r.poemId);
        const status = r.failed ? 'FAILED' : r.partial ? 'PARTIAL' : 'OK';
        console.log('  ' + [
          String(r.poemId).padEnd(10),
          (poem?.poetAr || '?').padEnd(24),
          (r.durationSec + 's').padEnd(10),
          String(r.sizeKB).padEnd(10),
          (r.ttfbMs !== null ? String(r.ttfbMs) : 'N/A').padEnd(10),
          String(r.totalMs).padEnd(10),
          status.padEnd(10),
        ].join(' | '));
      }

      const ok = subset.filter(r => !r.failed);
      if (ok.length > 0) {
        const avgDur = (ok.reduce((s, r) => s + r.durationSec, 0) / ok.length).toFixed(1);
        const avgSize = (ok.reduce((s, r) => s + r.sizeKB, 0) / ok.length).toFixed(1);
        const avgTotal = (ok.reduce((s, r) => s + r.totalMs, 0) / ok.length).toFixed(0);
        const ttfbs = ok.filter(r => r.ttfbMs !== null);
        const avgTTFB = ttfbs.length > 0 ? (ttfbs.reduce((s, r) => s + r.ttfbMs, 0) / ttfbs.length).toFixed(0) : 'N/A';
        console.log(`  Avg: ${ok.length}/${subset.length} OK | Duration=${avgDur}s | Size=${avgSize}KB | TTFB=${avgTTFB}ms | Total=${avgTotal}ms`);
      }
    }
  }

  // Side-by-side comparison
  console.log('\n' + '='.repeat(80));
  console.log('  SIDE-BY-SIDE: O vs A (REST durations)');
  console.log('='.repeat(80));
  console.log('  ' + ['Poem'.padEnd(10), 'Poet'.padEnd(20), 'O duration'.padEnd(14), 'A duration'.padEnd(14), 'Diff'.padEnd(10)].join(' | '));
  console.log('  ' + '-'.repeat(75));

  for (const poem of POEMS) {
    const restO = results.find(r => r.prompt === 'O' && r.api === 'REST' && r.poemId === poem.id);
    const restA = results.find(r => r.prompt === 'A' && r.api === 'REST' && r.poemId === poem.id);
    const durO = restO && !restO.failed ? restO.durationSec + 's' : 'FAIL';
    const durA = restA && !restA.failed ? restA.durationSec + 's' : 'FAIL';
    const diff = (restO && !restO.failed && restA && !restA.failed)
      ? ((restO.durationSec - restA.durationSec).toFixed(1) + 's')
      : 'N/A';
    console.log('  ' + [
      String(poem.id).padEnd(10),
      poem.poetAr.padEnd(20),
      durO.padEnd(14),
      durA.padEnd(14),
      diff.padEnd(10),
    ].join(' | '));
  }

  console.log('\n' + '='.repeat(80));
  console.log('  SIDE-BY-SIDE: O vs A (Live durations + TTFB)');
  console.log('='.repeat(80));
  console.log('  ' + ['Poem'.padEnd(10), 'Poet'.padEnd(20), 'O dur'.padEnd(10), 'O TTFB'.padEnd(10), 'A dur'.padEnd(10), 'A TTFB'.padEnd(10)].join(' | '));
  console.log('  ' + '-'.repeat(80));

  for (const poem of POEMS) {
    const liveO = results.find(r => r.prompt === 'O' && r.api === 'Live' && r.poemId === poem.id);
    const liveA = results.find(r => r.prompt === 'A' && r.api === 'Live' && r.poemId === poem.id);
    console.log('  ' + [
      String(poem.id).padEnd(10),
      poem.poetAr.padEnd(20),
      (liveO && !liveO.failed ? liveO.durationSec + 's' : 'FAIL').padEnd(10),
      (liveO?.ttfbMs != null ? liveO.ttfbMs + 'ms' : 'N/A').padEnd(10),
      (liveA && !liveA.failed ? liveA.durationSec + 's' : 'FAIL').padEnd(10),
      (liveA?.ttfbMs != null ? liveA.ttfbMs + 'ms' : 'N/A').padEnd(10),
    ].join(' | '));
  }

  const failCount = results.filter(r => r.failed).length;
  console.log(`\n${results.length} total samples | ${results.length - failCount} succeeded | ${failCount} failed`);
  console.log(`All saved to: ${OUTPUT_DIR}/`);
}

main().catch(console.error);
