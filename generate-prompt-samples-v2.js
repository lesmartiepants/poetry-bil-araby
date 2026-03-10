/**
 * Generate TTS prompt comparison samples — Round 2 (F, G, H, I)
 *
 * Based on feedback: REST A (Current English) had the best pacing/energy.
 * Arabic prompts B-E were too slow and over-dramatic.
 *
 * These 4 new prompts focus on PACE and ENERGY:
 *   F — Shorter English, focused on pace/energy
 *   G — Arabic with explicit "don't slow down" + حيوية (vitality)
 *   H — Arabic tajweed-style steady musical meter
 *   I — Hybrid: English structure + Arabic pace terminology
 *
 * REST API only (the winner). Same poem, same voice (Fenrir).
 *
 * Usage: node generate-prompt-samples-v2.js
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

// ── Poem (Mu'allaqa of Imru' al-Qais) ──
const POEM_ARABIC = `قِفا نَبكِ مِن ذِكرى حَبيبٍ وَمَنزِلِ
بِسِقطِ اللِوى بَينَ الدَخولِ فَحَومَلِ
فَتوضِحَ فَالمِقراةِ لَم يَعفُ رَسمُها
لِما نَسَجَتها مِن جَنوبٍ وَشَمأَلِ`;

// ── Prompt Definitions (Round 2) ──
const PROMPTS = {
  F: {
    label: 'English — pace-focused',
    description: 'Shorter English prompt emphasizing pace, energy, and forward momentum',
    text:
      `You are an Arabic poet performing a live recitation of this Pre-Islamic poem by Imru' al-Qais. ` +
      `Deliver it with ENERGY and AUTHORITY — this is a confident performance at a poetry festival, not a slow reading. ` +
      `RULES: ` +
      `1. STRONG, commanding voice from the very first word — project with power. ` +
      `2. Keep a BRISK, confident pace throughout. Do NOT slow down into a drawl or ballad. ` +
      `3. PUNCH the end-rhyme (qafiya) at the end of each verse with a clear ring. ` +
      `4. Brief pauses between verses for breath — but keep momentum, don't linger. ` +
      `5. Vary pitch and intensity for expressiveness, but always maintain FORWARD DRIVE. ` +
      `Poem:\n${POEM_ARABIC}`,
  },

  G: {
    label: 'Arabic — fast/energetic',
    description: 'Arabic prompt explicitly avoiding slowness, emphasizing vitality and festival energy',
    text:
      `أنت شاعر عربي واثق تُلقي قصيدة في مهرجان شعري أمام جمهور حاشد. ألقِ هذه الأبيات لامرئ القيس بقوة وحيوية.\n\n` +
      `قواعد الأداء:\n` +
      `١. صوت قوي وواثق من أول كلمة — لا تبدأ بهدوء\n` +
      `٢. حافظ على إيقاع سريع ومتدفق — لا تُبطئ ولا تتمهل ولا تُطِل الوقفات\n` +
      `٣. هذا إلقاء حيّ نابض بالحياة — ليس رثاءً ولا عزاءً\n` +
      `٤. أبرز القافية (اللام المكسورة) بنبرة واضحة قوية في نهاية كل بيت\n` +
      `٥. نبرة الفخر والاعتزاز أهم من الحزن — أنت تُعلن الشعر لا تبكيه\n` +
      `٦. وقفات قصيرة فقط بين الأبيات للتنفس — ثم انطلق فوراً\n\n` +
      `القصيدة:\n${POEM_ARABIC}`,
  },

  H: {
    label: 'Arabic — steady meter',
    description: 'Arabic tajweed-style with steady musical meter, like confident Quran recitation pace',
    text:
      `أنت قارئ شعر عربي متمكن. ألقِ هذه الأبيات من معلقة امرئ القيس بإيقاع ثابت ومنتظم يُبرز موسيقى بحر الطويل.\n\n` +
      `الأسلوب المطلوب:\n` +
      `- إيقاع ثابت ومنتظم كإيقاع التلاوة المُجوَّدة — لا بطيء ولا مُتسرّع\n` +
      `- كل تفعيلة (فعولن مفاعيلن) تُنطق بوزنها الصحيح دون مط أو اختصار\n` +
      `- صوت واضح وقوي من البداية إلى النهاية\n` +
      `- القافية تُنطق بحسم ووضوح\n` +
      `- لا تُحوّل الإلقاء إلى غناء أو نشيد بطيء — هذا إلقاء شعري بإيقاع حازم\n` +
      `- وقفة قصيرة بين الشطرين ووقفة أطول قليلاً بين الأبيات — لكن لا تُطِل\n\n` +
      `الأبيات:\n${POEM_ARABIC}`,
  },

  I: {
    label: 'Hybrid — English + Arabic pace terms',
    description: 'English structure from Prompt A with Arabic-specific pace/meter terminology',
    text:
      `You are an Arabic sha'ir (poet-orator) performing a live recitation of a poem by Imru' al-Qais. ` +
      `This is a PERFORMANCE with energy and presence — deliver it like a confident reciter at a مهرجان شعري (poetry festival). ` +
      `DELIVERY RULES: ` +
      `1. PROJECT your voice with authority from the first word "قِفا" — this is a COMMAND, deliver it as one. ` +
      `2. Maintain the إيقاع (rhythm) of بحر الطويل (taweel meter) — فعولن مفاعيلن drives the pace forward. Do NOT drag. ` +
      `3. Recite at شعر performance pace — brisk and alive, NOT درس (lecture) pace or رثاء (eulogy) pace. ` +
      `4. STRESS the قافية (end-rhyme) with a clear, ringing cadence at the end of each بيت. ` +
      `5. Keep FORWARD MOMENTUM — brief breath between hemistichs, slightly longer between verses, but always driving ahead. ` +
      `6. Vary pitch for expressiveness but never sacrifice pace for drama. Energy over emotion. ` +
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
    console.log(`${label} Saved: ${outPath}`);

    return {
      api: 'REST',
      prompt: promptKey,
      filename,
      path: outPath,
      sizeKB: +(wavBuffer.length / 1024).toFixed(1),
      durationSec: +durationSec,
      ttfbMs: +ttfb.toFixed(0),
      totalMs: +totalMs.toFixed(0),
    };
  } catch (err) {
    console.error(`${label} ERROR: ${err.message}`);
    return null;
  }
}

// ── Delay helper ──
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ──
async function main() {
  console.log('='.repeat(72));
  console.log('  Arabic Poetry TTS — Round 2: Pace & Energy Focus');
  console.log('  REST API only | Voice: Fenrir | Prompts F-I');
  console.log('='.repeat(72));

  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Print full prompts so user can see exactly what's sent
  console.log('\n' + '='.repeat(72));
  console.log('  FULL PROMPTS');
  console.log('='.repeat(72));

  for (const [key, p] of Object.entries(PROMPTS)) {
    console.log(`\n--- Prompt ${key}: ${p.label} (${p.text.length} chars) ---`);
    console.log(p.text);
    console.log();
  }

  console.log('\n' + '='.repeat(72));
  console.log('  GENERATING SAMPLES');
  console.log('='.repeat(72));

  const results = [];
  const promptKeys = Object.keys(PROMPTS);

  for (const key of promptKeys) {
    const result = await generateREST(key, PROMPTS[key].text);
    results.push(result);
    if (key !== promptKeys[promptKeys.length - 1]) {
      console.log('  (waiting 3s before next request...)');
      await delay(3000);
    }
  }

  // ── Summary Table ──
  console.log('\n\n' + '='.repeat(100));
  console.log('  RESULTS SUMMARY');
  console.log('='.repeat(100));
  console.log();

  const hdr = [
    'Filename'.padEnd(22),
    'Prompt'.padEnd(8),
    'Label'.padEnd(32),
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
      r.prompt.padEnd(8),
      (promptInfo?.label || '').padEnd(32),
      String(r.sizeKB).padEnd(10),
      (r.durationSec + 's').padEnd(10),
      String(r.ttfbMs).padEnd(10),
      String(r.totalMs).padEnd(10),
    ].join(' | ');
    console.log(row);
  }

  // Compare with REST A baseline
  console.log();
  console.log('-'.repeat(60));
  console.log('Baseline: REST-A was 812.4KB (~16.9s audio) at 44,166ms total');
  console.log();

  const succeeded = results.filter(Boolean);
  if (succeeded.length > 0) {
    const avgSize = (succeeded.reduce((s, r) => s + r.sizeKB, 0) / succeeded.length).toFixed(1);
    const avgDur = (succeeded.reduce((s, r) => s + r.durationSec, 0) / succeeded.length).toFixed(1);
    const avgTotal = (succeeded.reduce((s, r) => s + r.totalMs, 0) / succeeded.length).toFixed(0);
    console.log(`Round 2 averages: ${succeeded.length} samples | Avg size: ${avgSize}KB | Avg duration: ${avgDur}s | Avg total: ${avgTotal}ms`);
  }

  console.log(`\nAll samples saved to: ${OUTPUT_DIR}/`);
}

main().catch(console.error);
