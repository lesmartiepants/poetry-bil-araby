/**
 * Generate audio samples for quality comparison:
 *   1. Live API WebSocket (gemini-2.5-flash-native-audio-preview-12-2025)
 *   2. REST API (gemini-2.5-flash-preview-tts)
 *
 * Both use Fenrir voice with the production TTS prompt.
 * Saves WAV files for side-by-side listening.
 *
 * Usage: node generate-sample.js
 */

import { readFileSync, writeFileSync } from 'fs';
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
  console.error('ERROR: No GEMINI_API_KEY found');
  process.exit(1);
}

// ── Production TTS prompt (from src/prompts.js) ──
function getTTSInstruction(poem, poet, mood, era) {
  return `You are a legendary Arabic sha'ir (poet-orator) performing a live inshad recitation of a poem by ${poet} from the ${era} era. ` +
    `This is a PERFORMANCE, not a reading — deliver it with the full emotional power and artistic craft of classical Arabic oral tradition. ` +
    `This poem's mood is ${mood}. ` +
    `DELIVERY RULES: ` +
    `1. PROJECT your voice with authority and presence from the very first word. ` +
    `2. EMPHASIZE key words and emotionally charged lines — let them land with weight and resonance. ` +
    `3. USE dramatic pauses before and after powerful lines to let them breathe and sink in. ` +
    `4. VARY your tempo dynamically: slow to a commanding halt for profound or painful lines, surge forward with energy for triumphant or passionate ones. ` +
    `5. STRESS the end-rhyme (qafiya) of each verse with a clear, ringing cadence. ` +
    `6. Let your voice SWELL and RECEDE with the emotional arc — build intensity toward the poem's peak, then resolve with gravity. ` +
    `7. Avoid flat, monotone delivery at all costs — every line must feel alive and intentional. ` +
    `Poem:\n${poem.arabic}`;
}

// ── Poem data (fetched from production API) ──
const POEM = {
  id: 89232,
  poet: 'نازك الملايكة',
  poetEnglish: 'Nazik al-Malaika',
  arabic: 'ذَهَبْتُ وَلَمْ يَشْحَبْ لَهَا خَدٌّ وَلَمْ تَرْجُفْ شِفَاهُ*لَمْ تَسْمَعِ الأَبْوَابُ قِصَّةَ مَوْتِهَا تُرْوَى وَتُرْوَى*لَمْ تَرْتَفِعْ أَسْتَارُ نَافِذَةٍ تَسِيلُ أَسًى وَشَجْوَا*لِتَتَابُعِ التَّابُوتِ بِالتَّحْدِيقِ حَتَّى لا تَرَاهُ*إِلاَّ بَقِيَّةَ هَيْكَلٍ فِي الدَّرْبِ تَرْعِشُهُ الذِّكَرُ*نَبَأٌ تَعَثَّرَ فِي الدُّرُوبِ فَلَمْ يَجِدْ مَأْوَى صَدَاهُ*فَأَوَى إِلَى النِّسْيَانِ فِي بَعْضِ الْحَفَرْ*يُرْثِي كَآبَتْهُ القَمَرُ*وَاللَّيْلُ أَسْلَمَ نَفْسَهُ دُونَ اهْتِمَامٍ لِلصَّبَاحِ*وَأَتَى الضِّيَاءُ بِصَوْت بَائِعَة الْحَلِيبِ وَبِالصِّيَامِ*بِمَوَاءٍ قَطُّ جَائِعٍ لَمْ تَبْقِ مِنْهُ سِوَى عِظَامِ*بِمَشَاجَرَاتِ البَائِعِينَ وَبِالْمَرَارَةِ وَالكِفَاحِ*بِتَرَاشُقِ الصِّبْيَانِ بِالأَحْجَارِ فِي عَرْضِ الطَّرِيقِ*بِمَسَارِبِ المَاءِ الْمُلَوَّثِ فِي الأَزِقَّةِ بِالرِّيَاحِ*تَلْهُو بِأَبْوَابِ السُّطُوحِ بِلاَ رَفِيْقْ*فِي شِبْهِ نِسْيَانٍ عَمِيقْ',
  tags: ['Modern', 'Somber', 'Free Verse'],
};

const VOICE = 'Fenrir';
const MOOD = POEM.tags[1] || 'Poetic';
const ERA = POEM.tags[0] || 'Modern';
const POET = POEM.poetEnglish || 'Nazik al-Malaika';

const ttsInstruction = getTTSInstruction(POEM, POET, MOOD, ERA);

// ── WAV header writer ──
function createWavBuffer(pcmData, sampleRate = 24000, bitsPerSample = 16, channels = 1) {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);           // chunk size
  buffer.writeUInt16LE(1, 20);            // PCM format
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
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

// ── Generate via Live API WebSocket ──
async function generateLiveAPI() {
  console.log('\n--- Live API (gemini-2.5-flash-native-audio-preview-12-2025 + Fenrir) ---');
  console.log(`Instruction: ${ttsInstruction.length} chars`);

  const WS = await getWebSocket();
  const apiVersion = 'v1alpha';
  const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.${apiVersion}.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

  return new Promise((resolveGen) => {
    const pcmChunks = [];
    const startTime = performance.now();
    let firstChunkTime = null;

    const timeout = setTimeout(() => {
      console.log('  TIMEOUT after 120s — saving partial audio...');
      const pcmData = Buffer.concat(pcmChunks);
      if (pcmData.length > 0) {
        const wavBuffer = createWavBuffer(pcmData);
        const outPath = resolve(__dirname, 'sample-audio.wav');
        writeFileSync(outPath, wavBuffer);
        console.log(`  Partial save: ${pcmChunks.length} chunks | WAV: ${(wavBuffer.length / 1024).toFixed(1)}KB`);
        console.log(`  Saved: ${outPath}`);
        try { ws.close(); } catch {}
        resolveGen({
          path: outPath,
          size: wavBuffer.length,
          ttfb: firstChunkTime ? (firstChunkTime - startTime) : null,
          total: performance.now() - startTime,
          chunks: pcmChunks.length,
          partial: true,
        });
      } else {
        try { ws.close(); } catch {}
        resolveGen(null);
      }
    }, 120000);

    const ws = new WS(wsUrl);

    ws.onopen = () => {
      const connectMs = (performance.now() - startTime).toFixed(0);
      console.log(`  WebSocket connected (${connectMs}ms)`);

      ws.send(JSON.stringify({
        setup: {
          model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
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
        console.log(`  Setup complete (${setupMs}ms)`);

        ws.send(JSON.stringify({
          clientContent: {
            turns: [{ role: 'user', parts: [{ text: ttsInstruction }] }],
            turnComplete: true,
          },
        }));
        console.log('  Sent TTS instruction, waiting for audio...');
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
              console.log(`  First audio chunk! TTFB=${ttfb}ms, ${chunkBuf.length} bytes`);
            }

            // Progress every 50 chunks
            if (pcmChunks.length % 50 === 0) {
              const totalBytes = pcmChunks.reduce((s, c) => s + c.length, 0);
              const elapsed = (performance.now() - startTime).toFixed(0);
              console.log(`  Progress: ${pcmChunks.length} chunks | ${(totalBytes / 1024).toFixed(1)}KB | ${elapsed}ms`);
            }
          }
          if (part.text) {
            console.log(`  [model thinking]: "${part.text.substring(0, 80)}..."`);
          }
        }

        if (data.serverContent.turnComplete) {
          const totalMs = (performance.now() - startTime).toFixed(0);
          const pcmData = Buffer.concat(pcmChunks);
          const wavBuffer = createWavBuffer(pcmData);
          const outPath = resolve(__dirname, 'sample-audio.wav');
          writeFileSync(outPath, wavBuffer);

          console.log(`  DONE | ${pcmChunks.length} chunks | PCM: ${(pcmData.length / 1024).toFixed(1)}KB | WAV: ${(wavBuffer.length / 1024).toFixed(1)}KB | ${totalMs}ms`);
          console.log(`  Saved: ${outPath}`);

          clearTimeout(timeout);
          ws.close();
          resolveGen({
            path: outPath,
            size: wavBuffer.length,
            ttfb: firstChunkTime ? (firstChunkTime - startTime) : null,
            total: performance.now() - startTime,
            chunks: pcmChunks.length,
          });
        }
      }

      if (data.error) {
        console.error('  Server error:', JSON.stringify(data.error));
        clearTimeout(timeout);
        ws.close();
        resolveGen(null);
      }
    };

    ws.onerror = (err) => {
      console.error('  WebSocket error:', err.message || err);
      clearTimeout(timeout);
      resolveGen(null);
    };

    ws.onclose = () => {
      clearTimeout(timeout);
    };
  });
}

// ── Generate via REST API ──
async function generateREST() {
  console.log('\n--- REST API (gemini-2.5-flash-preview-tts + Fenrir) ---');
  console.log(`Instruction: ${ttsInstruction.length} chars`);

  const startTime = performance.now();
  const apiVersion = 'v1beta';
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/gemini-2.5-flash-preview-tts:generateContent?key=${API_KEY}`;

  try {
    console.log('  Sending request...');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: ttsInstruction }] }],
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
    console.log(`  Response received: HTTP ${res.status} (${ttfb.toFixed(0)}ms)`);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`  ERROR: ${errText.substring(0, 200)}`);
      return null;
    }

    const data = await res.json();
    const totalMs = performance.now() - startTime;

    const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64) {
      console.error('  ERROR: No audio data in response');
      return null;
    }

    const pcmData = Buffer.from(b64, 'base64');
    const wavBuffer = createWavBuffer(pcmData);
    const outPath = resolve(__dirname, 'sample-audio-rest.wav');
    writeFileSync(outPath, wavBuffer);

    console.log(`  DONE | PCM: ${(pcmData.length / 1024).toFixed(1)}KB | WAV: ${(wavBuffer.length / 1024).toFixed(1)}KB | ${totalMs.toFixed(0)}ms`);
    console.log(`  Saved: ${outPath}`);

    return {
      path: outPath,
      size: wavBuffer.length,
      ttfb: ttfb,
      total: totalMs,
      chunks: 1,
    };
  } catch (err) {
    console.error('  ERROR:', err.message);
    return null;
  }
}

// ── Main ──
async function main() {
  console.log('Audio Sample Generator');
  console.log('======================');
  console.log(`Poem: "${POEM.poet}" (${POET})`);
  console.log(`Voice: ${VOICE}`);
  console.log(`Mood: ${MOOD} | Era: ${ERA}`);
  console.log(`Arabic text: ${POEM.arabic.substring(0, 80)}...`);

  const liveResult = await generateLiveAPI();
  const restResult = await generateREST();

  console.log('\n\n=== COMPARISON ===');
  console.log();

  if (liveResult) {
    console.log(`Live API:`);
    console.log(`  File: ${liveResult.path}`);
    console.log(`  Size: ${(liveResult.size / 1024).toFixed(1)}KB`);
    console.log(`  TTFB: ${liveResult.ttfb?.toFixed(0) || 'N/A'}ms`);
    console.log(`  Total: ${liveResult.total.toFixed(0)}ms`);
    console.log(`  Chunks: ${liveResult.chunks}`);
  } else {
    console.log('Live API: FAILED');
  }

  console.log();

  if (restResult) {
    console.log(`REST API:`);
    console.log(`  File: ${restResult.path}`);
    console.log(`  Size: ${(restResult.size / 1024).toFixed(1)}KB`);
    console.log(`  TTFB: ${restResult.ttfb.toFixed(0)}ms`);
    console.log(`  Total: ${restResult.total.toFixed(0)}ms`);
  } else {
    console.log('REST API: FAILED');
  }

  if (liveResult && restResult) {
    console.log();
    console.log(`TTFB speedup: ${(restResult.ttfb / liveResult.ttfb).toFixed(1)}x faster (Live API)`);
    console.log(`Total speedup: ${(restResult.total / liveResult.total).toFixed(1)}x faster (Live API)`);
  }
}

main().catch(console.error);
