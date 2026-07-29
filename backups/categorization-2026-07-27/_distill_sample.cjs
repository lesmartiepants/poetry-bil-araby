// SAMPLE distillation — runs the v3 distilled classifier over a stratified
// ~300-poem sample via the app's Gemini proxy, mirroring the real pipeline's
// parsing + confidence floor. NO DB WRITES. Output -> _staging_distilled.json.
//
// Faithfulness to /tmp/distill (docs/categorization-audit):
//   - system prompt: verbatim from config.build_classification_prompt() (_distill_prompt.txt)
//   - user format:   matches arabic_utils.format_for_scoring()
//   - parsing:       mirrors classify_poems.parse_categories (_clean_list caps 2/2/2,
//                    mood_primary fallback, _clean_confidences)
//   - floor:         mirrors import_categories -> config.apply_confidence_floor(65, keep mood_primary)
//   - model/params:  gemini-3.6-flash, temperature 0.2, thinking disabled
const fs = require('fs');
const path = require('path');
require('dotenv').config({ quiet: true });
const { Pool } = require('pg');

const DIR = __dirname;
const PROXY = 'http://localhost:3001/api/ai/gemini-3.6-flash/generateContent';
const SYSTEM_PROMPT = fs.readFileSync(path.join(DIR, '_distill_prompt.txt'), 'utf8');
const BATCH_SIZE = 4;
const CONCURRENCY = 6;
const TARGET = 300;
const QUOTAS = { low: 60, mid: 90, high: 70, vhigh: 80 }; // by label-count bucket
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// --- taxonomy constants (mirror config.py VALID_KEYS / caps / floor) ---
const VALID = {
  mood: new Set(['melancholy','nostalgia','joy','amorous','passion','contemplation','serenity','defiance','pride','grief','hope','despair','satire','reverence','bittersweet','yearning']),
  topic: new Set(['love','loss-death','exile-longing','homeland','nature','war-conflict','faith-spirit','wine-pleasure','friendship','time-mortality','wisdom-ethics','justice-oppression','freedom','beauty','honor-pride','women-feminine']),
  motif: new Set(['night','desert-ruins','moon-stars','sea-water','garden-flowers','wine-cup','sword-battle','birds','fire-light','tears','journey','dawn']),
};
const MAX = { mood: 2, topic: 2, motif: 2 };
const FLOOR = 65;

// --- mirror format_for_scoring ---
function formatForScoring(id, title, content, poet) {
  const lines = (content.includes('*') ? content.split('*') : content.split('\n'))
    .map(l => l.trim()).filter(Boolean);
  const fmt = lines.map((l, i) => `  ${i + 1}. ${l}`).join('\n');
  const parts = [`[قصيدة: ${id}]`];
  if (title) parts.push(`العنوان: ${title}`);
  if (poet) parts.push(`الشاعر: ${poet}`);
  parts.push(`الأبيات:\n${fmt}`);
  return parts.join('\n');
}

// --- mirror parse helpers ---
function cleanList(raw, dim) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const x of raw) { const k = String(x).trim(); if (VALID[dim].has(k) && !out.includes(k)) out.push(k); }
  return out.slice(0, MAX[dim]);
}
function clampConf(v) { if (v == null) return null; const n = Math.round(Number(v)); return Number.isNaN(n) ? null : Math.max(0, Math.min(100, n)); }
function cleanConfidences(raw, keptKeys) {
  if (!raw || typeof raw !== 'object') return {};
  const kept = new Set(keptKeys), out = {};
  for (const [k, v] of Object.entries(raw)) { const key = String(k).trim(); if (!kept.has(key)) continue; const c = clampConf(v); if (c != null) out[key] = c; }
  return out;
}
function extractJsonObjects(text) { // bracket-counting fallback
  const results = []; let i = 0;
  while (i < text.length) {
    if (text[i] === '{') {
      let depth = 0, start = i, inStr = false, esc = false;
      while (i < text.length) {
        const ch = text[i];
        if (esc) esc = false; else if (ch === '\\' && inStr) esc = true;
        else if (ch === '"') inStr = !inStr;
        else if (!inStr) { if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) { try { results.push(JSON.parse(text.slice(start, i + 1))); } catch {} break; } } }
        i++;
      }
    }
    i++;
  }
  return results;
}
function parseCategories(text, batch) {
  text = text.replace(/```(?:json)?\s*/g, '').trim();
  let parsed = null;
  try { parsed = JSON.parse(text); if (!Array.isArray(parsed)) parsed = [parsed]; }
  catch { parsed = extractJsonObjects(text); }
  if (!parsed || !parsed.length) return [];
  const byId = Object.fromEntries(batch.map(p => [String(p.id), p]));
  const rows = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (!item || typeof item !== 'object') continue;
    // Prefer id-match (model echoes "id"); fall back to positional like the real pipeline.
    const poem = (item.id != null && byId[String(item.id).trim()]) || batch[i];
    if (!poem) continue;
    const moods = cleanList(item.moods, 'mood');
    const topics = cleanList(item.topics, 'topic');
    const motifs = cleanList(item.motifs, 'motif');
    let moodPrimary = String(item.mood_primary || '').trim();
    if (!VALID.mood.has(moodPrimary)) moodPrimary = moods[0] || null;
    const confidences = cleanConfidences(item.confidences, [...moods, ...topics, ...motifs]);
    rows.push({ poem_id: String(poem.id), moods, topics, motifs, mood_primary: moodPrimary,
      emotional_intensity: cleanInt(item.emotional_intensity, 0, 100),
      accessibility_level: cleanInt(item.accessibility_level, 1, 5),
      confidences, rationale: (String(item.rationale || '').trim() || null) });
  }
  return rows;
}
function cleanInt(raw, lo, hi) { if (typeof raw === 'number') return Math.max(lo, Math.min(hi, Math.trunc(raw))); return null; }

// --- mirror config.apply_confidence_floor ---
function applyFloor(dimLists, confidences, moodPrimary) {
  const kept = {};
  for (const [dim, keys] of Object.entries(dimLists)) {
    const out = [];
    for (const k of keys) { const c = confidences[k]; if (c == null || c >= FLOOR || (dim === 'mood' && k === moodPrimary)) out.push(k); }
    kept[dim] = out;
  }
  if (moodPrimary && !(kept.mood || []).includes(moodPrimary)) (kept.mood = kept.mood || []).unshift(moodPrimary);
  return kept;
}

async function callProxy(userContent, attempt = 0) {
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: userContent }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 8192 },
  };
  try {
    const r = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const t = await r.text(); throw new Error(`HTTP ${r.status}: ${t.slice(0, 200)}`); }
    const data = await r.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    return parts.map(p => p.text || '').join('');
  } catch (e) {
    if (attempt < 3) { await new Promise(res => setTimeout(res, 1500 * (attempt + 1))); return callProxy(userContent, attempt + 1); }
    throw e;
  }
}

function bucketOf(n) { return n <= 5 ? 'low' : n <= 8 ? 'mid' : n <= 10 ? 'high' : 'vhigh'; }

async function selectSample(q) {
  const frame = await q(`
    with lc as (select poem_id, count(*) n from poem_categories group by poem_id)
    select p.id, coalesce(p.century, -1) century, lc.n
    from poems p join lc on lc.poem_id = p.id
    where p.categorized_at is not null and p.content is not null and p.content <> ''`);
  // group by bucket -> century -> ids (sorted for determinism)
  const byBucket = {};
  for (const r of frame) {
    const b = bucketOf(Number(r.n));
    (byBucket[b] = byBucket[b] || {});
    (byBucket[b][r.century] = byBucket[b][r.century] || []).push(Number(r.id));
  }
  const picked = [];
  for (const [b, quota] of Object.entries(QUOTAS)) {
    const centuries = Object.keys(byBucket[b] || {});
    centuries.forEach(c => byBucket[b][c].sort((a, z) => a - z));
    const cursor = Object.fromEntries(centuries.map(c => [c, 0]));
    let added = 0, guard = 0;
    while (added < quota && guard < quota * 50) {
      guard++;
      for (const c of centuries) {
        if (added >= quota) break;
        const arr = byBucket[b][c];
        if (cursor[c] < arr.length) { picked.push(arr[cursor[c]++]); added++; }
      }
      if (centuries.every(c => cursor[c] >= byBucket[b][c].length)) break;
    }
  }
  return picked;
}

(async () => {
  const q = async (s, a) => (await pool.query(s, a)).rows;
  const ids = await selectSample(q);
  console.error(`Selected ${ids.length} poems.`);

  // Fetch content + before-labels for the sample.
  const poems = await q(`
    select p.id, p.title, p.content, po.name poet_name, coalesce(p.century,-1) century,
           p.mood_primary, p.emotional_intensity, p.accessibility_level, p.accessibility_score
    from poems p left join poets po on po.id = p.poet_id
    where p.id = any($1::int[])`, [ids]);
  const before = await q(`
    select pc.poem_id, d.key dim, cv.key val, pc.confidence
    from poem_categories pc join category_values cv on cv.id = pc.value_id
    join category_dimensions d on d.id = cv.dimension_id
    where pc.poem_id = any($1::int[])`, [ids]);
  const beforeMap = {};
  for (const r of before) {
    (beforeMap[r.poem_id] = beforeMap[r.poem_id] || { mood: [], topic: [], motif: [] });
    beforeMap[r.poem_id][r.dim].push(r.val);
  }
  const poemById = Object.fromEntries(poems.map(p => [p.id, p]));

  // Batch + classify with bounded concurrency.
  const batches = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) batches.push(ids.slice(i, i + BATCH_SIZE).map(id => poemById[id]).filter(Boolean));
  const results = [];
  let done = 0, failed = 0;
  for (let s = 0; s < batches.length; s += CONCURRENCY) {
    const chunk = batches.slice(s, s + CONCURRENCY);
    await Promise.all(chunk.map(async (batch) => {
      const user = batch.map(p => formatForScoring(p.id, p.title || '', p.content, p.poet_name || '')).join('\n\n---\n\n');
      try {
        const text = await callProxy(user);
        const rows = parseCategories(text, batch);
        const gotIds = new Set(rows.map(r => r.poem_id));
        for (const p of batch) if (!gotIds.has(String(p.id))) failed++;
        for (const r of rows) {
          const floored = applyFloor({ mood: r.moods, topic: r.topics, motif: r.motifs }, r.confidences, r.mood_primary);
          const p = poemById[Number(r.poem_id)];
          results.push({
            poem_id: Number(r.poem_id), title: p.title, poet_name: p.poet_name, century: p.century,
            before: beforeMap[Number(r.poem_id)] || { mood: [], topic: [], motif: [] },
            after: floored,
            after_raw: { mood: r.moods, topic: r.topics, motif: r.motifs },
            mood_primary_before: p.mood_primary, mood_primary_after: r.mood_primary,
            confidences: r.confidences, rationale: r.rationale,
            emotional_intensity_after: r.emotional_intensity, accessibility_level_after: r.accessibility_level,
          });
        }
        done += batch.length;
      } catch (e) { failed += batch.length; console.error(`batch [${batch.map(b=>b.id).join(',')}] FAILED: ${e.message}`); }
    }));
    console.error(`  progress: ${done}/${ids.length} classified, ${failed} missing`);
  }

  const out = { created_at: new Date().toISOString(), sample_size: ids.length, classified: results.length,
    missing: ids.length - results.length, floor: FLOOR, caps: MAX, results };
  fs.writeFileSync(path.join(DIR, '_staging_distilled.json'), JSON.stringify(out, null, 0));
  console.error(`\nWROTE _staging_distilled.json: ${results.length}/${ids.length} classified, ${out.missing} missing.`);
  await pool.end();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
