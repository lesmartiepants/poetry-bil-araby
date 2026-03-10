/**
 * Round 4: Iterate on Prompt K's quality + Prompt O's reliability.
 *
 * User feedback: K sounds best but has runaway generation issues.
 * O is reliable but user prefers K's vocal character.
 *
 * New prompts P-T combine K's Arabic scene-setting with guard rails.
 *
 * 5 prompts × 5 poems × 2 APIs = 50 samples.
 *
 * Usage: node generate-prompt-samples-v4.js
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  } catch {}
}
loadEnvFile(resolve(__dirname, '.env'));
loadEnvFile(resolve(__dirname, '..', 'poetry-bil-araby', '.env'));

const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!API_KEY) { console.error('ERROR: No API key'); process.exit(1); }

const VOICE = 'Fenrir';
const OUTPUT_DIR = resolve(__dirname, 'prompt-samples');
const REST_MODEL = 'gemini-2.5-flash-preview-tts';
const REST_API_VERSION = 'v1beta';
const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const LIVE_API_VERSION = 'v1alpha';

// ── Poems ──
const POEMS = [
  {
    id: 'imru',
    poet: 'امرؤ القيس',
    poetEn: "Imru' al-Qais",
    era: 'Pre-Islamic',
    mood: 'Nostalgic',
    context: 'الملك الضليل وشاعر المعلقات',
    text: `قِفا نَبكِ مِن ذِكرى حَبيبٍ وَمَنزِلِ
بِسِقطِ اللِوى بَينَ الدَخولِ فَحَومَلِ
فَتوضِحَ فَالمِقراةِ لَم يَعفُ رَسمُها
لِما نَسَجَتها مِن جَنوبٍ وَشَمأَلِ`,
  },
  {
    id: 41936,
    poet: 'ابن زيدون',
    poetEn: 'Ibn Zaydun',
    era: 'Andalusian',
    mood: 'Romantic',
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
    poetEn: 'Abu Nuwas',
    era: 'Abbasid',
    mood: 'Defiant',
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
    poetEn: 'Al-Mutanabbi',
    era: 'Abbasid',
    mood: 'Proud',
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
    poetEn: 'Al-Nabigha',
    era: 'Pre-Islamic',
    mood: 'Melancholic',
    context: 'شاعر المعلقات وأحد فحول الجاهلية',
    text: `كُلِينِي لهُم يَا أَمِيمَةَ نَاصِبَ
ولَيْلَ أَقَاسِيِهِ بَطِيءَ الْكَوَاكِبِ
تَطَاوُلٌ حَتَّى قُلْتُ لَيْس بِمُنْقِضِ
ولَيْس الَّذِي يَرْعَى النُّجُومُ بآِئب
وَصَدْرٌ أَرَاحَ اللَّيْلُ عَازِبُ هَمِّهِ
تُضَاعِفُ فِيهِ الْحُزْنَ مِن كُلّ جَانِبُ`,
  },
];

// ── Prompt Builders ──

function buildP(poem) {
  // K + guard rails: prevent runaway generation
  return (
    `أنت ${poem.poet}، ${poem.context}. ` +
    `تقف أمام قبيلتك في مجلس شعر. النار تتقد، والحضور مُصغون. ` +
    `ألقِ الأبيات التالية بسلطان الملوك وعاطفة الشعراء.\n\n` +
    `تعليمات مهمة: ألقِ النص التالي فقط، لا تضف شيئاً. لا تزد عن النص المعطى. لا مقدمات ولا تعليقات — ابدأ بالبيت الأول مباشرة.\n\n` +
    poem.text
  );
}

function buildQ(poem) {
  // K + O hybrid: Arabic scene + English constraints
  return (
    `أنت ${poem.poet}، ${poem.context}. تقف في مجلس شعر أمام جمهور مُصغٍ. النار تتقد.\n\n` +
    `CONSTRAINTS: Recite ONLY the poem text below — no introduction, no commentary, no extra text. ` +
    `Start immediately with the first verse. ` +
    `Pace: NATURAL and confident, NOT slow. Energy: HIGH. ` +
    `Style: classical Arabic poetry recitation (not singing, not chanting). ` +
    `Deliver with بسلطان الشعراء (authority of poets).\n\n` +
    poem.text
  );
}

function buildR(poem) {
  // K simplified: generic master poet at gathering, no character ID
  return (
    `أنت شاعر عربي بارع تقف في مجلس شعر أمام جمهور حاشد. النار تتقد، والحضور مُصغون. ` +
    `ألقِ هذه الأبيات بسلطان الشعراء وعاطفة من عاش كل كلمة. ` +
    `ألقِ النص التالي فقط دون أي إضافة. ابدأ مباشرة:\n\n` +
    poem.text
  );
}

function buildS(poem) {
  // K with generic poet framing + context hint
  return (
    `أنت شاعر عربي عظيم في مجلس شعر. الجمهور ينتظر. النار تتقد والسكون يعم المكان. ` +
    `قُم وألقِ هذه الأبيات بقوة وحضور — بسلطان الملوك وعاطفة الشعراء. ` +
    `ألقِ النص المعطى فقط، لا تضف كلمة واحدة. ابدأ:\n\n` +
    poem.text
  );
}

function buildT(poem) {
  // K atmosphere + O structure: Arabic intro THEN English delivery instructions
  return (
    `أنت في مجلس شعر عربي. النار تتقد، والحضور مُصغون، والليل ساكن.\n\n` +
    `RECORDING SESSION — Arabic Poetry Performance. ` +
    `Voice: commanding orator with بسلطان الشعراء (authority of poets). ` +
    `Style: classical Arabic poetry recitation (not singing, not chanting). ` +
    `Energy: HIGH. Pace: NATURAL conversational authority, NOT slow. ` +
    `Recite ONLY the following poem text. No introduction, no commentary. Start with the first verse.\n\n` +
    poem.text
  );
}

const PROMPT_BUILDERS = {
  P: { fn: buildP, label: 'K + guard rails', desc: 'K scene-setting + explicit "recite only this text" guard rails' },
  Q: { fn: buildQ, label: 'K + O hybrid', desc: 'Arabic scene + English structural constraints' },
  R: { fn: buildR, label: 'K simplified', desc: 'Generic master poet at gathering, no character ID' },
  S: { fn: buildS, label: 'K generic poet', desc: 'Generic great poet + gathering scene + guard rails' },
  T: { fn: buildT, label: 'K atmosphere + O structure', desc: 'Arabic atmospheric intro then O-style English delivery instructions' },
};

// ── WAV ──
function createWavBuffer(pcmData, sampleRate = 24000, bitsPerSample = 16, channels = 1) {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22); buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28); buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34); buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40); pcmData.copy(buffer, 44);
  return buffer;
}

// ── WebSocket ──
async function getWebSocket() {
  if (typeof globalThis.WebSocket !== 'undefined') return globalThis.WebSocket;
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    return require('ws');
  } catch { console.error('No WebSocket'); process.exit(1); }
}

// ── REST ──
async function generateREST(promptLabel, poemId, promptText) {
  const tag = `[REST-${promptLabel}-${poemId}]`;
  const startTime = performance.now();
  const url = `https://generativelanguage.googleapis.com/${REST_API_VERSION}/models/${REST_MODEL}:generateContent?key=${API_KEY}`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 180000);
  try {
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
      }),
    });
    clearTimeout(to);
    const ttfb = performance.now() - startTime;
    if (!res.ok) {
      const err = await res.text();
      console.log(`${tag} FAIL HTTP ${res.status} (${ttfb.toFixed(0)}ms): ${err.substring(0, 120)}`);
      return { api: 'REST', prompt: promptLabel, poemId, failed: true, ttfbMs: +ttfb.toFixed(0), error: err.substring(0, 80) };
    }
    const data = await res.json();
    const totalMs = performance.now() - startTime;
    const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64) { console.log(`${tag} FAIL no audio`); return { api: 'REST', prompt: promptLabel, poemId, failed: true }; }
    const pcm = Buffer.from(b64, 'base64');
    const wav = createWavBuffer(pcm);
    const dur = (pcm.length / (24000 * 2)).toFixed(1);
    const fn = `sample-rest-${promptLabel}-${poemId}.wav`;
    writeFileSync(resolve(OUTPUT_DIR, fn), wav);
    console.log(`${tag} OK ${dur}s ${(wav.length/1024).toFixed(0)}KB ${totalMs.toFixed(0)}ms`);
    return { api: 'REST', prompt: promptLabel, poemId, filename: fn, sizeKB: +(wav.length/1024).toFixed(1), durationSec: +dur, ttfbMs: +ttfb.toFixed(0), totalMs: +totalMs.toFixed(0) };
  } catch (err) { clearTimeout(to); console.log(`${tag} ERROR ${err.message}`); return { api: 'REST', prompt: promptLabel, poemId, failed: true, error: err.message }; }
}

// ── Live ──
async function generateLive(promptLabel, poemId, promptText) {
  const tag = `[Live-${promptLabel}-${poemId}]`;
  const WS = await getWebSocket();
  const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.${LIVE_API_VERSION}.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
  return new Promise((res) => {
    const chunks = []; const t0 = performance.now(); let t1 = null;
    const to = setTimeout(() => { console.log(`${tag} TIMEOUT`); fin(true); }, 120000);
    function fin(partial = false) {
      clearTimeout(to);
      const pcm = Buffer.concat(chunks);
      if (!pcm.length) { try { ws.close(); } catch {} res({ api: 'Live', prompt: promptLabel, poemId, failed: true }); return; }
      const wav = createWavBuffer(pcm);
      const dur = (pcm.length / (24000*2)).toFixed(1);
      const fn = `sample-live-${promptLabel}-${poemId}.wav`;
      writeFileSync(resolve(OUTPUT_DIR, fn), wav);
      const total = performance.now() - t0;
      const ttfb = t1 ? t1 - t0 : null;
      console.log(`${tag} ${partial?'PARTIAL':'OK'} ${dur}s ${(wav.length/1024).toFixed(0)}KB ttfb=${ttfb?ttfb.toFixed(0):'?'}ms total=${total.toFixed(0)}ms`);
      try { ws.close(); } catch {}
      res({ api: 'Live', prompt: promptLabel, poemId, filename: fn, sizeKB: +(wav.length/1024).toFixed(1), durationSec: +dur, ttfbMs: ttfb !== null ? +ttfb.toFixed(0) : null, totalMs: +total.toFixed(0), partial });
    }
    const ws = new WS(wsUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ setup: { model: `models/${LIVE_MODEL}`, generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } } } }));
    };
    ws.onmessage = async (event) => {
      let data;
      try {
        let text;
        if (typeof event.data === 'string') text = event.data;
        else if (event.data instanceof Buffer) text = event.data.toString('utf-8');
        else if (typeof event.data?.text === 'function') text = await event.data.text();
        else text = String(event.data);
        data = JSON.parse(text);
      } catch { return; }
      if (data.setupComplete) {
        ws.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: promptText }] }], turnComplete: true } }));
        return;
      }
      if (data.serverContent) {
        for (const part of (data.serverContent?.modelTurn?.parts || [])) {
          if (part.inlineData?.data) {
            chunks.push(Buffer.from(part.inlineData.data, 'base64'));
            if (!t1) { t1 = performance.now(); console.log(`${tag} TTFB=${(t1-t0).toFixed(0)}ms`); }
            if (chunks.length % 200 === 0) {
              const bytes = chunks.reduce((s,c) => s+c.length, 0);
              console.log(`${tag} ${chunks.length}ch ${(bytes/1024).toFixed(0)}KB ${(performance.now()-t0).toFixed(0)}ms`);
            }
          }
        }
        if (data.serverContent.turnComplete) fin(false);
      }
      if (data.error) { console.log(`${tag} ERR`, JSON.stringify(data.error)); clearTimeout(to); try{ws.close();}catch{} res({ api:'Live', prompt:promptLabel, poemId, failed:true }); }
    };
    ws.onerror = (err) => { console.log(`${tag} WS_ERR`, err.message||err); clearTimeout(to); res({ api:'Live', prompt:promptLabel, poemId, failed:true }); };
    ws.onclose = () => clearTimeout(to);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('='.repeat(72));
  console.log('  Round 4: K-quality + O-reliability hybrids (P-T)');
  console.log('  5 prompts × 5 poems × 2 APIs = 50 samples');
  console.log('='.repeat(72));

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const promptKeys = Object.keys(PROMPT_BUILDERS);

  // Print all prompts for first poem as reference
  console.log('\n' + '='.repeat(72));
  console.log('  PROMPT TEMPLATES (shown for Imru\' al-Qais)');
  console.log('='.repeat(72));
  for (const key of promptKeys) {
    const pb = PROMPT_BUILDERS[key];
    const text = pb.fn(POEMS[0]);
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Prompt ${key}: ${pb.label}`);
    console.log(`(${pb.desc})`);
    console.log(`${text.length} chars`);
    console.log('─'.repeat(60));
    console.log(text);
  }

  console.log('\n' + '='.repeat(72));
  console.log('  POEMS');
  console.log('='.repeat(72));
  for (const p of POEMS) {
    console.log(`  ${String(p.id).padEnd(8)} ${p.poet} (${p.poetEn}) — ${p.era}, ${p.mood}`);
  }

  const results = [];

  // Phase 1: REST
  console.log('\n' + '='.repeat(72));
  console.log('  PHASE 1: REST API (25 samples)');
  console.log('='.repeat(72));

  for (const key of promptKeys) {
    for (let i = 0; i < POEMS.length; i++) {
      const poem = POEMS[i];
      const prompt = PROMPT_BUILDERS[key].fn(poem);
      results.push(await generateREST(key, poem.id, prompt));
      await delay(2000);
    }
  }

  // Phase 2: Live
  console.log('\n' + '='.repeat(72));
  console.log('  PHASE 2: Live API (25 samples)');
  console.log('='.repeat(72));

  for (const key of promptKeys) {
    for (let i = 0; i < POEMS.length; i++) {
      const poem = POEMS[i];
      const prompt = PROMPT_BUILDERS[key].fn(poem);
      results.push(await generateLive(key, poem.id, prompt));
      await delay(2000);
    }
  }

  // ── Summary ──
  console.log('\n\n' + '='.repeat(130));
  console.log('  ROUND 4 RESULTS');
  console.log('='.repeat(130));

  for (const apiName of ['REST', 'Live']) {
    console.log(`\n  ${'═'.repeat(120)}`);
    console.log(`  ${apiName} API`);
    console.log(`  ${'═'.repeat(120)}`);

    // Header
    const poemIds = POEMS.map(p => String(p.id));
    console.log('\n  ' + 'Prompt'.padEnd(8) + poemIds.map(id => id.padEnd(16)).join('') + '| Avg dur  | Failures');
    console.log('  ' + '-'.repeat(8 + poemIds.length * 16 + 25));

    for (const key of promptKeys) {
      const row = [key.padEnd(8)];
      const durs = [];
      let fails = 0;
      for (const poem of POEMS) {
        const r = results.find(x => x.prompt === key && x.api === apiName && x.poemId === poem.id);
        if (!r || r.failed) {
          row.push('FAIL'.padEnd(16));
          fails++;
        } else {
          row.push((r.durationSec + 's').padEnd(16));
          durs.push(r.durationSec);
        }
      }
      const avg = durs.length > 0 ? (durs.reduce((a,b)=>a+b,0)/durs.length).toFixed(1) + 's' : 'N/A';
      row.push('| ' + avg.padEnd(9) + '| ' + fails + '/' + POEMS.length);
      console.log('  ' + row.join(''));
    }
  }

  // Detailed table
  console.log('\n' + '='.repeat(130));
  console.log('  DETAILED RESULTS');
  console.log('='.repeat(130));

  const hdr = ['API'.padEnd(6), 'Prmt'.padEnd(6), 'Poem'.padEnd(8), 'Poet'.padEnd(18), 'Dur'.padEnd(8), 'Size(KB)'.padEnd(10), 'TTFB'.padEnd(10), 'Total(ms)'.padEnd(10), 'Status'.padEnd(8)].join(' | ');
  console.log('\n  ' + hdr);
  console.log('  ' + '-'.repeat(hdr.length));

  for (const r of results) {
    const poem = POEMS.find(p => p.id === r.poemId);
    const status = r.failed ? 'FAIL' : r.partial ? 'PARTIAL' : 'OK';
    console.log('  ' + [
      (r.api || '?').padEnd(6),
      (r.prompt || '?').padEnd(6),
      String(r.poemId).padEnd(8),
      (poem?.poet || '?').substring(0, 16).padEnd(18),
      (r.durationSec ? r.durationSec + 's' : '-').padEnd(8),
      (r.sizeKB ? String(r.sizeKB) : '-').padEnd(10),
      (r.ttfbMs != null ? String(r.ttfbMs) : '-').padEnd(10),
      (r.totalMs ? String(r.totalMs) : '-').padEnd(10),
      status.padEnd(8),
    ].join(' | '));
  }

  // Reliability + performance summary
  console.log('\n' + '='.repeat(80));
  console.log('  PROMPT COMPARISON SUMMARY');
  console.log('='.repeat(80));

  for (const key of promptKeys) {
    const pb = PROMPT_BUILDERS[key];
    const restR = results.filter(r => r.prompt === key && r.api === 'REST');
    const liveR = results.filter(r => r.prompt === key && r.api === 'Live');
    const restOK = restR.filter(r => !r.failed);
    const liveOK = liveR.filter(r => !r.failed);

    console.log(`\n  Prompt ${key} (${pb.label}):`);
    console.log(`    REST: ${restOK.length}/${restR.length} OK` +
      (restOK.length > 0 ? ` | Avg dur: ${(restOK.reduce((s,r)=>s+r.durationSec,0)/restOK.length).toFixed(1)}s | Avg total: ${(restOK.reduce((s,r)=>s+r.totalMs,0)/restOK.length).toFixed(0)}ms` : ''));
    console.log(`    Live: ${liveOK.length}/${liveR.length} OK` +
      (liveOK.length > 0 ? ` | Avg dur: ${(liveOK.reduce((s,r)=>s+r.durationSec,0)/liveOK.length).toFixed(1)}s | Avg TTFB: ${(liveOK.filter(r=>r.ttfbMs!=null).reduce((s,r)=>s+r.ttfbMs,0)/liveOK.filter(r=>r.ttfbMs!=null).length).toFixed(0)}ms` : ''));
  }

  // Baselines
  console.log('\n  Baselines for comparison:');
  console.log('    Prompt K (original): REST 14.7s | Live 25.4s (but fails to generalize)');
  console.log('    Prompt A (production): REST avg 28.9s | Live avg 35.5s, TTFB 7529ms');
  console.log('    Prompt O (director): REST avg 21.9s | Live avg 27.3s, TTFB 5529ms');

  const total = results.length;
  const ok = results.filter(r => !r.failed).length;
  const fail = total - ok;
  console.log(`\n  ${total} total | ${ok} succeeded | ${fail} failed`);
  console.log(`  All saved to: ${OUTPUT_DIR}/`);
}

main().catch(console.error);
