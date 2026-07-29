// FULL distilled re-classification of every poem with content (~9,073), via the
// app's gemini-3.6-flash proxy. Resumable: appends one JSONL line per poem to
// _full_checkpoint.jsonl; on restart, poems already in the checkpoint are skipped.
// NO DB writes — output feeds _merge.cjs. Mirrors the real classify parsing.
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ quiet: true });
const { Pool } = require('pg');

const DIR = __dirname;
const PROXY = 'http://localhost:3001/api/ai/gemini-3.6-flash/generateContent';
const SYSTEM_PROMPT = fs.readFileSync(path.join(DIR, '_distill_prompt.txt'), 'utf8');
const CKPT = path.join(DIR, '_full_checkpoint.jsonl');
const FAILLOG = path.join(DIR, '_full_failures.log');
const BATCH_SIZE = 4;
const CONCURRENCY = parseInt(process.env.DISTILL_CONCURRENCY || '6', 10);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const VALID = {
  mood: new Set(['melancholy','nostalgia','joy','amorous','passion','contemplation','serenity','defiance','pride','grief','hope','despair','satire','reverence','bittersweet','yearning']),
  topic: new Set(['love','loss-death','exile-longing','homeland','nature','war-conflict','faith-spirit','wine-pleasure','friendship','time-mortality','wisdom-ethics','justice-oppression','freedom','beauty','honor-pride','women-feminine']),
  motif: new Set(['night','desert-ruins','moon-stars','sea-water','garden-flowers','wine-cup','sword-battle','birds','fire-light','tears','journey','dawn']),
};
const MAX = { mood: 2, topic: 2, motif: 2 };

function formatForScoring(id, title, content, poet) {
  const lines = (content.includes('*') ? content.split('*') : content.split('\n')).map(l => l.trim()).filter(Boolean);
  const fmt = lines.map((l, i) => `  ${i + 1}. ${l}`).join('\n');
  const parts = [`[قصيدة: ${id}]`];
  if (title) parts.push(`العنوان: ${title}`);
  if (poet) parts.push(`الشاعر: ${poet}`);
  parts.push(`الأبيات:\n${fmt}`);
  return parts.join('\n');
}
function cleanList(raw, dim) { if (!Array.isArray(raw)) return []; const out = []; for (const x of raw) { const k = String(x).trim(); if (VALID[dim].has(k) && !out.includes(k)) out.push(k); } return out.slice(0, MAX[dim]); }
function clampConf(v) { if (v == null) return null; const n = Math.round(Number(v)); return Number.isNaN(n) ? null : Math.max(0, Math.min(100, n)); }
function cleanConfidences(raw, keptKeys) { if (!raw || typeof raw !== 'object') return {}; const kept = new Set(keptKeys), out = {}; for (const [k, v] of Object.entries(raw)) { const key = String(k).trim(); if (!kept.has(key)) continue; const c = clampConf(v); if (c != null) out[key] = c; } return out; }
function cleanInt(raw, lo, hi) { if (typeof raw === 'number') return Math.max(lo, Math.min(hi, Math.trunc(raw))); return null; }
function extractJsonObjects(text) { const results = []; let i = 0; while (i < text.length) { if (text[i] === '{') { let depth = 0, start = i, inStr = false, esc = false; while (i < text.length) { const ch = text[i]; if (esc) esc = false; else if (ch === '\\' && inStr) esc = true; else if (ch === '"') inStr = !inStr; else if (!inStr) { if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) { try { results.push(JSON.parse(text.slice(start, i + 1))); } catch {} break; } } } i++; } } i++; } return results; }
function parseCategories(text, batch) {
  text = text.replace(/```(?:json)?\s*/g, '').trim();
  let parsed = null;
  try { parsed = JSON.parse(text); if (!Array.isArray(parsed)) parsed = [parsed]; } catch { parsed = extractJsonObjects(text); }
  if (!parsed || !parsed.length) return [];
  const byId = Object.fromEntries(batch.map(p => [String(p.id), p]));
  const rows = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (!item || typeof item !== 'object') continue;
    const poem = (item.id != null && byId[String(item.id).trim()]) || batch[i];
    if (!poem) continue;
    const moods = cleanList(item.moods, 'mood'), topics = cleanList(item.topics, 'topic'), motifs = cleanList(item.motifs, 'motif');
    let moodPrimary = String(item.mood_primary || '').trim();
    if (!VALID.mood.has(moodPrimary)) moodPrimary = moods[0] || null;
    const confidences = cleanConfidences(item.confidences, [...moods, ...topics, ...motifs]);
    rows.push({ poem_id: Number(poem.id), moods, topics, motifs, mood_primary: moodPrimary,
      emotional_intensity: cleanInt(item.emotional_intensity, 0, 100), accessibility_level: cleanInt(item.accessibility_level, 1, 5),
      confidences, rationale: (String(item.rationale || '').trim() || null) });
  }
  return rows;
}
class SpendCapError extends Error {}
async function callProxy(userContent, attempt = 0) {
  const body = { systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }, contents: [{ role: 'user', parts: [{ text: userContent }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json', maxOutputTokens: 8192 } };
  try {
    const r = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) {
      const txt = (await r.text()).slice(0, 200);
      // Spend-cap 429 won't clear by retrying — abort the whole run fast.
      if (r.status === 429 && /spending cap|spend cap/i.test(txt)) throw new SpendCapError('SPEND_CAP');
      throw new Error(`HTTP ${r.status}: ${txt}`);
    }
    const data = await r.json();
    return (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  } catch (e) {
    if (e instanceof SpendCapError) throw e;              // never retry a spend-cap block
    if (attempt < 5) {                                     // exponential backoff + jitter on rate-limit / transient
      const delay = Math.min(30000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 500);
      await new Promise(res => setTimeout(res, delay));
      return callProxy(userContent, attempt + 1);
    }
    throw e;
  }
}
async function loadDone() {
  const done = new Set();
  if (!fs.existsSync(CKPT)) return done;
  const rl = readline.createInterface({ input: fs.createReadStream(CKPT), crlfDelay: Infinity });
  for await (const line of rl) { const t = line.trim(); if (!t) continue; try { done.add(JSON.parse(t).poem_id); } catch {} }
  return done;
}

(async () => {
  const q = async (s) => (await pool.query(s)).rows;
  const done = await loadDone();
  console.error(`Checkpoint has ${done.size} poems already done.`);
  let poems = await q(`SELECT p.id, p.title, p.content, po.name poet_name
    FROM poems p LEFT JOIN poets po ON po.id = p.poet_id
    WHERE p.content IS NOT NULL AND p.content <> '' ORDER BY p.id`);
  poems = poems.filter(p => !done.has(Number(p.id)));
  console.error(`${poems.length} poems to classify (of ${poems.length + done.size} total with content).`);
  if (!poems.length) { console.error('Nothing to do — checkpoint complete.'); await pool.end(); return; }

  const out = fs.createWriteStream(CKPT, { flags: 'a' });
  const batches = [];
  for (let i = 0; i < poems.length; i += BATCH_SIZE) batches.push(poems.slice(i, i + BATCH_SIZE));
  let done2 = 0, wrote = 0, failed = 0, aborted = false;
  for (let s = 0; s < batches.length && !aborted; s += CONCURRENCY) {
    const chunk = batches.slice(s, s + CONCURRENCY);
    await Promise.all(chunk.map(async (batch) => {
      if (aborted) return;
      const user = batch.map(p => formatForScoring(p.id, p.title || '', p.content, p.poet_name || '')).join('\n\n---\n\n');
      try {
        const rows = parseCategories(await callProxy(user), batch);
        const got = new Set(rows.map(r => r.poem_id));
        for (const r of rows) { out.write(JSON.stringify(r) + '\n'); wrote++; }
        for (const p of batch) if (!got.has(Number(p.id))) { failed++; fs.appendFileSync(FAILLOG, `MISSING ${p.id}\n`); }
      } catch (e) {
        if (e instanceof SpendCapError) { aborted = true; fs.appendFileSync(FAILLOG, `SPEND_CAP abort at batch [${batch.map(b=>b.id).join(',')}]\n`); return; }
        failed += batch.length; fs.appendFileSync(FAILLOG, `BATCH_FAIL [${batch.map(b=>b.id).join(',')}] ${e.message}\n`);
      }
      done2 += batch.length;
    }));
    if (s % (CONCURRENCY * 5) === 0 || s + CONCURRENCY >= batches.length || aborted)
      console.error(`  progress: ${done2}/${poems.length} attempted, ${wrote} written, ${failed} failed${aborted ? ' [SPEND_CAP ABORT]' : ''}`);
  }
  out.end();
  if (aborted) { console.error(`\nSPEND_CAP ABORT: ${wrote} written this pass, ${done.size + wrote} total in checkpoint. Re-run to resume once cap clears.`); await pool.end(); process.exit(2); }
  console.error(`\nDONE pass: ${wrote} written, ${failed} failed. Checkpoint total now ${done.size + wrote}.`);
  await pool.end();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
