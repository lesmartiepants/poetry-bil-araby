import { Buffer } from 'node:buffer';
import process from 'node:process';
import { cardRequest, renderCardPng } from './share-card.js';
import {
  byFit,
  chooseDoors,
  doorPools,
  ERA_NAMES,
  guideScore,
  parseSteer,
  uniqueHooks,
  wordDoors,
} from '../web/core/logic/guide.js';

// ReDesign2 API (web/ at /new). Kept apart from the endpoints today's app uses,
// under /api/v2, so the old app keeps working until cut-over.
//
// Shapes match web/core/types.ts. Lines are the poem's '*'-separated hemistichs;
// English lines come from cached_translation split the same way.

const SEP = /\s*\*\s*|\n+/;
const splitLines = (s) =>
  s
    ? s
        .split(SEP)
        .map((x) => x.trim())
        .filter(Boolean)
    : [];
const BAND_META = {
  gentle: {
    en: 'Gentle',
    ar: 'سهل',
    line: 'Plain words and direct images: a good place to start, in any era.',
  },
  measured: { en: 'Measured', ar: 'متوسّط', line: 'Richer rhetoric and some allusion.' },
  demanding: { en: 'Demanding', ar: 'عميق', line: 'Classical vocabulary and dense allusion.' },
};
const ERA_EN = ERA_NAMES;

/** Equal-weight difficulty bands from an accessibility histogram (same rule as web/core/logic/bands.ts). */
export function deriveBands(histogram) {
  const b = histogram.filter((x) => x.poemCount > 0).sort((a, c) => a.min - c.min);
  const total = b.reduce((n, x) => n + x.poemCount, 0);
  if (!total) return [];
  const keys = ['gentle', 'measured', 'demanding'];
  const out = [];
  let cursor = 0;
  let lower = b[0].min;
  let running = 0;
  for (let i = 0; i < 3; i += 1) {
    const last = i === 2;
    const target = (total * (i + 1)) / 3;
    let n = 0;
    while (cursor < b.length && (last || running + n < target)) {
      n += b[cursor].poemCount;
      cursor += 1;
      if (!last && running + n >= target) break;
    }
    if (n === 0 && !last) continue;
    const upper = last ? b[b.length - 1].max : b[cursor - 1].max;
    out.push({ min: lower, max: upper, poemCount: n });
    running += n;
    lower = upper;
    if (cursor >= b.length) break;
  }
  return out.map((x, i) => ({ key: keys[i], ...BAND_META[keys[i]], ...x }));
}

// ── Developer panel: recent server requests and errors ─────────────────────
const recentEvents = [];
/** Mount early (before routes) so every /api request lands in the timeline. */
export function devEventsMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    recentEvents.unshift({
      at: start,
      kind: res.statusCode >= 400 ? 'error' : 'request',
      source: 'server',
      text: `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`,
    });
    if (recentEvents.length > 200) recentEvents.pop();
  });
  next();
}

// ── Gemini, server-side only (no key ever reaches the client) ──────────────
const PROMPTS = {
  explanation: ({ arabic, poet }) =>
    `You are a guide to Arabic poetry for English readers. Poem by ${poet}:\n${arabic.join('\n')}\n\nReturn JSON {"meaning": string (one paragraph, plain English, what the poem says and how), "poet": string (two sentences on the poet)}.`,
  gloss: ({ arabic, line, word }) =>
    `Arabic verse line: ${arabic[line]}\nWord number ${word + 1} (counting from the right): ${(arabic[line] ?? '').split(/\s+/)[word]}\nReturn JSON {"word": the word with vowel marks, "translit": simple transliteration, "root": the three root letters separated by spaces, "partOfSpeech": short, e.g. "noun · object of kiss", "meaning": its meaning in this line, one sentence, "otherSenses": one sentence}.`,
};
export async function geminiText(kind, input) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPTS[kind](input) }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(12_000),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'null');
}

// ── Recitation: Gemini TTS, server-side only ───────────────────────────────
// The six shortlisted voices the player offers (web/core/voices.ts, #769); anything else is a 400.
// Keep in step with that list: the others stay commented out there until they are re-auditioned.
export const TTS_VOICES = ['Zephyr', 'Autonoe', 'Sulafat', 'Orus', 'Enceladus', 'Iapetus'];
const TTS_MODELS = ['gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts']; // second is the 429 fallback
const TTS_DELIVERY =
  'اقرأ هذه القصيدة العربية الكلاسيكية بصوت شاعر عربي قديم — بنبرة ملكية رزينة، وإيقاع المقاطع الشعرية، وعاطفة صادقة. أسلوب الإلقاء: تمهّل عند الوقفات، وارفع الصوت عند المشاعر القوية. النص للتلاوة:';
const PCM_RATE = 24000;

/** 16-bit mono PCM to a WAV file. */
export function pcmToWav(pcm, rate = PCM_RATE) {
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + pcm.length, 4);
  head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([head, pcm]);
}

/** Where each line starts, in seconds: the total length shared out by letters per line (REST TTS returns no timings). */
export function lineStartsFor(lines, seconds) {
  const weight = lines.map((l) => Math.max(1, l.replace(/[\sً-ٰٟـ]/g, '').length));
  const total = weight.reduce((a, b) => a + b, 0);
  let at = 0;
  return weight.map((w) => {
    const start = Math.round(at * 100) / 100;
    at += (w / total) * seconds;
    return start;
  });
}

/** Raw PCM for the lines in one voice. TTS_FAKE=1 returns a quiet tone instead (CI and local runs without a key). */
export async function geminiTts({ lines, voice }) {
  if (process.env.TTS_FAKE === '1') {
    const seconds = Math.max(2, lines.length * 2);
    const pcm = Buffer.alloc(Math.round(seconds * PCM_RATE) * 2);
    for (let i = 0; i < pcm.length / 2; i++)
      pcm.writeInt16LE(Math.round(Math.sin((i / PCM_RATE) * 2 * Math.PI * 220) * 600), i * 2);
    return { pcm, model: 'fake' };
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  let lastStatus = 0;
  for (const model of TTS_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${TTS_DELIVERY}\n${lines.join('\n')}` }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
          },
        }),
        signal: AbortSignal.timeout(90_000),
      }
    );
    lastStatus = res.status;
    if (res.status === 429) continue; // this model's daily quota is gone: try the other one
    if (!res.ok) throw new Error(`Gemini TTS ${res.status}`);
    const data = await res.json();
    const b64 = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
    if (!b64) throw new Error('Gemini TTS returned no audio');
    return { pcm: Buffer.from(b64, 'base64'), model };
  }
  throw new Error(`Gemini TTS ${lastStatus}`);
}

/** Where finished recitations live. Memory: lost on restart, for CI and local runs with no Storage. */
const memory = new Map();
export function memoryRecitations() {
  return {
    async get(id, voice) {
      const r = memory.get(`${id}:${voice}`);
      return r ? { url: null, lineStarts: r.lineStarts, duration: r.duration } : null;
    },
    async put(id, voice, row) {
      memory.set(`${id}:${voice}`, row);
    },
    async read(id, voice) {
      return memory.get(`${id}:${voice}`)?.audio ?? null;
    },
  };
}
/** The WAV goes to the public Supabase Storage bucket `recitations` (immutable path poem/voice.wav); poem_audio keeps the small facts. */
export function supabaseRecitations(pool, { url, key }) {
  const root = url.replace(/\/$/, '');
  const pathOf = (id, voice) => `${id}/${voice}.wav`;
  return {
    async get(id, voice) {
      const { rows } = await pool.query(
        'SELECT path, line_starts, duration FROM poem_audio WHERE poem_id = $1 AND voice = $2',
        [id, voice]
      );
      if (!rows.length) return null;
      return {
        url: `${root}/storage/v1/object/public/recitations/${rows[0].path}`,
        lineStarts: rows[0].line_starts,
        duration: Number(rows[0].duration),
      };
    },
    async put(id, voice, row) {
      const path = pathOf(id, voice);
      const up = await fetch(`${root}/storage/v1/object/recitations/${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          'Content-Type': 'audio/wav',
          'Cache-Control': 'max-age=31536000',
          'x-upsert': 'true',
        },
        body: row.audio,
        signal: AbortSignal.timeout(30_000),
      });
      if (!up.ok) throw new Error(`Storage ${up.status}`);
      await pool.query(
        `INSERT INTO poem_audio (poem_id, voice, path, line_starts, duration, model) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (poem_id, voice) DO NOTHING`,
        [id, voice, path, JSON.stringify(row.lineStarts), row.duration, row.model]
      );
    },
    async read() {
      return null; // served from Storage directly
    },
  };
}

export function registerRedesign2(
  app,
  { pool, log, contentExpr, servingFilters, gemini, tts, recitations }
) {
  const servable = (alias = 'p') =>
    `${alias}.id IN (SELECT p.id FROM poems p WHERE p.full_poem_id IS NULL ${servingFilters()})`;
  let bandsCache = null;

  async function bands() {
    if (bandsCache && Date.now() - bandsCache.at < 10 * 60_000) return bandsCache.bands;
    const { rows } = await pool.query(`
      SELECT width_bucket(p.accessibility_score, 0, 10, 40) AS bucket, COUNT(*)::int AS n
      FROM poems p WHERE p.accessibility_score IS NOT NULL AND ${servable()} GROUP BY 1 ORDER BY 1`);
    const hist = rows.map((r) => ({
      min: (r.bucket - 1) * 0.25,
      max: r.bucket * 0.25,
      poemCount: r.n,
    }));
    const b = deriveBands(hist);
    bandsCache = { at: Date.now(), bands: b };
    return b;
  }
  const bandOf = (score, b) =>
    score == null || !b.length
      ? 'measured'
      : (b.find((x) => score <= x.max) ?? b[b.length - 1]).key;

  const MOTIF_TAGS = `
    SELECT v.key, pc.confidence FROM poem_categories pc
     JOIN category_values v ON v.id = pc.value_id
     JOIN category_dimensions d ON d.id = v.dimension_id
     WHERE pc.poem_id = p.id AND d.key = 'motif' AND pc.confidence >= 75`;
  const POEM_SELECT = (guide = false) => `
    SELECT p.id, p.title, p.title_en, p.full_poem_id, ${contentExpr()} AS arabic, p.cached_translation, p.accessibility_score,
           p.mood_primary, p.poet_id, po.era_id,
           po.slug AS poet_slug, po.name AS poet_ar, COALESCE(po.name_en, po.name) AS poet_en, e.slug AS era_key,
           COALESCE((SELECT array_agg(v.key ORDER BY pc.confidence DESC) FROM poem_categories pc
                     JOIN category_values v ON v.id = pc.value_id JOIN category_dimensions d ON d.id = v.dimension_id
                     WHERE pc.poem_id = p.id AND d.key = 'mood'), '{}') AS feeling_keys${
                       guide
                         ? `,
           (SELECT lower(v.label_en) FROM category_values v JOIN category_dimensions d ON d.id = v.dimension_id
             WHERE d.key = 'mood' AND v.key = p.mood_primary) AS mood_label,
           ARRAY(SELECT tags.key FROM (${MOTIF_TAGS}) tags ORDER BY tags.confidence DESC, tags.key) AS motif_keys`
                         : ''
                     }
    FROM poems p JOIN poets po ON po.id = p.poet_id LEFT JOIN eras e ON e.id = po.era_id`;

  const summary = (r) => {
    const lines = splitLines(r.arabic);
    return {
      id: String(r.id),
      slug: String(r.id),
      titleAr: r.title,
      titleEn: r.title_en || r.title,
      firstLineAr: lines[0] ?? '',
      poetSlug: r.poet_slug,
      poetAr: r.poet_ar,
      poetEn: r.poet_en,
      eraKey: r.era_key ?? 'unknown',
    };
  };
  const full = (r, b) => {
    const ar = splitLines(r.arabic);
    const en = splitLines(r.cached_translation);
    return {
      ...summary(r),
      lines: ar.map((x, i) => ({ ar: x, en: en[i] ?? '' })),
      feelingKeys: r.feeling_keys ?? [],
      band: bandOf(r.accessibility_score, b),
      readingMinutes: Math.max(1, Math.ceil(ar.length / 8)),
      ...(r.full_poem_id == null ? {} : { fullPoemId: String(r.full_poem_id) }),
    };
  };
  const fail = (res, label, err) => {
    log.error('V2', `${label}: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  };

  // ── Poems ────────────────────────────────────────────────────────────────
  // Next poem: a random draw, the best fit for the guide's settings among a handful.
  app.get('/api/v2/poems/next', async (req, res) => {
    try {
      const exclude = String(req.query.exclude ?? '')
        .split(',')
        .map(Number)
        .filter(Boolean);
      const [{ rows }, b] = await Promise.all([
        pool.query(
          `${POEM_SELECT()} WHERE ${servable()} AND NOT (p.id = ANY($1::int[])) ORDER BY random() LIMIT 24`,
          [exclude]
        ),
        bands(),
      ]);
      if (!rows.length) return res.status(404).json({ error: 'No poem' });
      const steer = parseSteer(req.query);
      const best = rows.reduce((top, r) =>
        guideScore(r, steer, (s) => bandOf(s, b)) > guideScore(top, steer, (s) => bandOf(s, b))
          ? r
          : top
      );
      res.json(summary(best));
    } catch (e) {
      fail(res, 'next', e);
    }
  });

  app.get('/api/v2/poems/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: 'Poem not found' });
    try {
      const [{ rows }, b] = await Promise.all([
        pool.query(`${POEM_SELECT()} WHERE p.id = $1`, [id]),
        bands(),
      ]);
      if (!rows.length) return res.status(404).json({ error: 'Poem not found' });
      res.json(full(rows[0], b));
    } catch (e) {
      fail(res, 'poem', e);
    }
  });

  // 7.11–7.14 A share card as a 1080 × 1350 PNG. Cacheable: the query is the card.
  app.get('/api/v2/poems/:id/card.png', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: 'Poem not found' });
    try {
      const [{ rows }, b] = await Promise.all([
        pool.query(`${POEM_SELECT()} WHERE p.id = $1`, [id]),
        bands(),
      ]);
      if (!rows.length) return res.status(404).json({ error: 'Poem not found' });
      const { spec, error } = cardRequest(full(rows[0], b), req.query);
      if (error) return res.status(400).json({ error });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      res.send(renderCardPng(spec));
    } catch (e) {
      fail(res, 'card', e);
    }
  });

  app.get('/api/v2/poems', async (req, res) => {
    try {
      const { feeling, era, band, poet } = req.query;
      // A poet page lists the catalogue for a chosen author. Discovery shelves
      // still use the serving rules, including when narrowed to that author.
      const authorOnly = Boolean(poet && !feeling && !era && !band);
      const where = authorOnly ? ['p.full_poem_id IS NULL'] : [servable()];
      const args = [];
      if (feeling) {
        args.push(feeling);
        where.push(
          `EXISTS (SELECT 1 FROM poem_categories pc JOIN category_values v ON v.id = pc.value_id WHERE pc.poem_id = p.id AND v.key = $${args.length})`
        );
      }
      if (era) {
        args.push(era);
        where.push(`e.slug = $${args.length}`);
      }
      if (poet) {
        args.push(poet);
        where.push(`po.slug = $${args.length}`);
      }
      if (band) {
        const b = (await bands()).find((x) => x.key === band);
        if (!b) return res.json([]);
        // The lowest band starts at the bottom of the scale; the others start just above the band below.
        args.push(b.max);
        let clause = `p.accessibility_score <= $${args.length}::real`;
        if (b.key !== 'gentle') {
          args.push(b.min);
          clause += ` AND p.accessibility_score > $${args.length}::real`;
        }
        where.push(clause);
      }
      const { rows } = await pool.query(
        `${POEM_SELECT()} WHERE ${where.join(' AND ')} ORDER BY p.id${authorOnly ? '' : ' LIMIT 200'}`,
        args
      );
      res.json(rows.map(summary));
    } catch (e) {
      fail(res, 'list', e);
    }
  });

  // ── AI text: read, or generate and store ─────────────────────────────────
  app.get('/api/v2/poems/:id/ai', async (req, res) => {
    const id = Number(req.params.id);
    const kind = String(req.query.kind ?? 'explanation');
    if (!Number.isInteger(id) || !['explanation', 'gloss', 'doors'].includes(kind))
      return res.status(400).json({ error: 'Bad request' });
    const key =
      kind === 'gloss' ? `${Number(req.query.line) || 0}:${Number(req.query.word) || 0}` : '';
    try {
      // Older clients can still request recommendations through this route.
      if (kind === 'doors') return res.json(await doors(id, parseSteer(req.query)));
      const hit = await pool.query(
        'SELECT payload FROM poem_ai_text WHERE poem_id = $1 AND kind = $2 AND key = $3',
        [id, kind, key]
      );
      if (hit.rows.length) return res.json({ ...hit.rows[0].payload, cached: true });
      const { rows } = await pool.query(
        `SELECT p.id, ${contentExpr()} AS arabic, p.cached_explanation, p.cached_author_bio, po.bio AS poet_bio, COALESCE(po.name_en, po.name) AS poet_en FROM poems p JOIN poets po ON po.id = p.poet_id WHERE p.id = $1`,
        [id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Poem not found' });
      const r = rows[0];
      let payload = null;
      if (kind === 'explanation' && r.cached_explanation) {
        payload = { meaning: r.cached_explanation, poet: r.poet_bio || r.cached_author_bio || '' };
      } else if (gemini) {
        payload = await gemini(kind, {
          arabic: splitLines(r.arabic),
          poet: r.poet_en,
          line: Number(req.query.line) || 0,
          word: Number(req.query.word) || 0,
        });
        if (kind === 'explanation' && payload && !payload.poet)
          payload.poet = r.poet_bio || r.cached_author_bio || '';
      }
      if (!payload) return res.status(503).json({ error: 'AI text unavailable' });
      await pool.query(
        'INSERT INTO poem_ai_text (poem_id, kind, key, payload, model) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
        [id, kind, key, payload, gemini ? 'gemini' : 'cached']
      );
      res.json(payload);
    } catch (e) {
      fail(res, 'ai', e);
    }
  });

  // ── Recitation: one audio file per poem and voice, generated once ───────────
  // GET /api/v2/poems/:id/recitation?voice=      -> { url, lineStarts, duration } (generates on a miss)
  // GET /api/v2/poems/:id/recitation.wav?voice=  -> the audio itself (immutable, so browsers keep it)
  const ttsIp = new Map(); // ip -> recent generation times (only cache misses count)
  const ttsDay = { day: '', n: 0 };
  const TTS_PER_IP = Number(process.env.TTS_PER_IP_HOUR) || 6;
  const TTS_PER_DAY = Number(process.env.TTS_DAILY_CAP) || 200;
  const ttsAllowed = (ip) => {
    const today = new Date().toISOString().slice(0, 10);
    if (ttsDay.day !== today) Object.assign(ttsDay, { day: today, n: 0 });
    if (ttsDay.n >= TTS_PER_DAY) return false;
    const recent = (ttsIp.get(ip) ?? []).filter((t) => Date.now() - t < 3_600_000);
    if (recent.length >= TTS_PER_IP) return false;
    ttsIp.set(ip, [...recent, Date.now()]);
    ttsDay.n++;
    return true;
  };
  const pickStore = () => {
    if (recitations) return recitations;
    const url = process.env.SUPABASE_PROJECT_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    return url && key && process.env.TTS_FAKE !== '1'
      ? supabaseRecitations(pool, { url, key })
      : memoryRecitations();
  };
  const ttsInflight = new Map(); // "poem:voice" -> promise, so a double tap generates once
  const ttsParse = (req) => {
    const id = Number(req.params.id);
    const voice = String(req.query.voice ?? 'Zephyr');
    return Number.isInteger(id) && TTS_VOICES.includes(voice) ? { id, voice } : null;
  };
  app.get('/api/v2/poems/:id/recitation', async (req, res) => {
    const q = ttsParse(req);
    if (!q) return res.status(400).json({ error: 'Bad request' });
    const { id, voice } = q;
    const url = `/api/v2/poems/${id}/recitation.wav?voice=${voice}`;
    try {
      const store = pickStore();
      const hit = await store.get(id, voice);
      if (hit)
        return res.json({
          url: hit.url ?? url,
          lineStarts: hit.lineStarts,
          duration: hit.duration,
          cached: true,
        });
      if (!tts) return res.status(503).json({ error: 'Recitation unavailable' });
      const { rows } = await pool.query(
        `SELECT ${contentExpr()} AS arabic FROM poems p WHERE p.id = $1 AND ${servable('p')}`,
        [id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Poem not found' });
      const lines = splitLines(rows[0].arabic);
      const k = `${id}:${voice}`;
      if (!ttsInflight.has(k)) {
        if (!ttsAllowed(req.ip))
          return res.status(429).json({ error: 'Too many recitations. Try again later.' });
        ttsInflight.set(
          k,
          (async () => {
            const out = await tts({ lines, voice });
            if (!out) return null;
            const duration = Math.round((out.pcm.length / 2 / PCM_RATE) * 100) / 100;
            const row = {
              audio: pcmToWav(out.pcm),
              lineStarts: lineStartsFor(lines, duration),
              duration,
              model: out.model,
            };
            await store.put(id, voice, row);
            return row;
          })().finally(() => ttsInflight.delete(k))
        );
      }
      const made = await ttsInflight.get(k);
      if (!made) return res.status(503).json({ error: 'Recitation unavailable' });
      res.json({ url: made.url ?? url, lineStarts: made.lineStarts, duration: made.duration });
    } catch (e) {
      fail(res, 'recitation', e);
    }
  });
  app.get('/api/v2/poems/:id/recitation.wav', async (req, res) => {
    const q = ttsParse(req);
    if (!q) return res.status(400).json({ error: 'Bad request' });
    try {
      const audio = await pickStore().read(q.id, q.voice);
      if (!audio) return res.status(404).json({ error: 'Not generated yet' });
      res.set({
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      res.send(audio);
    } catch (e) {
      fail(res, 'recitation.wav', e);
    }
  });

  // ── Poets ────────────────────────────────────────────────────────────────
  const POET_SELECT = `
    SELECT po.slug, po.name AS name_ar, COALESCE(po.name_en, po.name) AS name_en, e.slug AS era_key, po.region, po.bio,
           po.birth_year, po.death_year, po.active_year,
           (SELECT COUNT(*)::int FROM poems p WHERE p.poet_id = po.id AND p.full_poem_id IS NULL) AS poem_count
    FROM poets po LEFT JOIN eras e ON e.id = po.era_id`;
  const poet = (r) => ({
    slug: r.slug,
    nameAr: r.name_ar,
    nameEn: r.name_en,
    eraKey: r.era_key ?? 'unknown',
    region: r.region ?? '',
    years:
      r.birth_year && r.death_year
        ? `${r.birth_year}–${r.death_year}`
        : r.death_year
          ? `d. ${r.death_year}`
          : r.active_year
            ? `fl. ${r.active_year}`
            : '',
    bio: r.bio ?? '',
    poemCount: r.poem_count,
    initial: [...(r.name_ar ?? 'ش').replace(/^(ال|أبو |ابن )/, '')][0] ?? 'ش',
  });

  app.get('/api/v2/poets', async (_req, res) => {
    try {
      const { rows } = await pool.query(`${POET_SELECT} ORDER BY name_en`);
      res.json(rows.map(poet));
    } catch (e) {
      fail(res, 'poets', e);
    }
  });
  app.get('/api/v2/poets/:slug', async (req, res) => {
    try {
      const { rows } = await pool.query(`${POET_SELECT} WHERE po.slug = $1`, [req.params.slug]);
      if (!rows.length) return res.status(404).json({ error: 'Poet not found' });
      res.json(poet(rows[0]));
    } catch (e) {
      fail(res, 'poet', e);
    }
  });
  app.get('/api/v2/featured/poet', async (_req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT fp.note, po.slug FROM featured_poets fp JOIN poets po ON po.id = fp.poet_id
        WHERE fp.week_start <= CURRENT_DATE ORDER BY fp.week_start DESC LIMIT 1`);
      const slug =
        rows[0]?.slug ??
        (
          await pool.query(
            `SELECT po.slug FROM poets po ORDER BY (SELECT COUNT(*) FROM poems p WHERE p.poet_id = po.id AND p.full_poem_id IS NULL) DESC LIMIT 1`
          )
        ).rows[0]?.slug;
      const p = await pool.query(`${POET_SELECT} WHERE po.slug = $1`, [slug]);
      if (!p.rows.length) return res.status(404).json({ error: 'No poet' });
      res.json({ poet: poet(p.rows[0]), note: rows[0]?.note ?? '' });
    } catch (e) {
      fail(res, 'featured', e);
    }
  });

  // ── Explore facets ───────────────────────────────────────────────────────
  app.get('/api/v2/explore/feelings', async (_req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT v.key, v.label_en AS en, v.label_ar AS ar, COALESCE(v.explore_line, '') AS line,
               COUNT(DISTINCT p.id)::int AS poem_count, COUNT(DISTINCT p.poet_id)::int AS poet_count
        FROM category_values v JOIN category_dimensions d ON d.id = v.dimension_id
        LEFT JOIN poem_categories pc ON pc.value_id = v.id LEFT JOIN poems p ON p.id = pc.poem_id AND p.full_poem_id IS NULL
        WHERE d.key = 'mood' AND v.show_in_explore GROUP BY v.id ORDER BY v.sort_order`);
      res.json(
        rows.map((r) => ({
          key: r.key,
          en: r.en,
          ar: r.ar,
          line: r.line,
          poemCount: r.poem_count,
          poetCount: r.poet_count,
        }))
      );
    } catch (e) {
      fail(res, 'feelings', e);
    }
  });
  app.get('/api/v2/explore/eras', async (_req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT e.slug, e.name AS name_ar, e.name_en, e.years, e.place, e.line, e.colour,
               (SELECT COUNT(*)::int FROM poems p JOIN poets po ON po.id = p.poet_id WHERE po.era_id = e.id AND p.full_poem_id IS NULL) AS poem_count
        FROM eras e ORDER BY e.id`);
      res.json(
        rows.map((r) => ({
          slug: r.slug,
          nameAr: r.name_ar,
          nameEn: r.name_en || ERA_EN[r.slug] || r.slug,
          years: r.years ?? '',
          place: r.place ?? '',
          line: r.line ?? '',
          colour: r.colour ?? '#22406E',
          poemCount: r.poem_count,
        }))
      );
    } catch (e) {
      fail(res, 'eras', e);
    }
  });
  app.get('/api/v2/explore/bands', async (_req, res) => {
    try {
      res.json(await bands());
    } catch (e) {
      fail(res, 'bands', e);
    }
  });

  // ── V3: collections, journeys, Tonight, search, doors ───────────────────
  const collection = (r) => ({
    slug: r.slug,
    kind: r.kind,
    titleEn: r.title_en,
    titleAr: r.title_ar,
    intro: r.intro,
    stepEn: r.step_label_en,
    stepAr: r.step_label_ar,
    colour: r.colour,
    pattern: r.pattern_key ?? undefined,
    poemIds: (r.poem_ids ?? []).map(String),
    themes: r.themes ?? [],
    subtitle: r.subtitle_en ?? undefined,
    subtitleAr: r.subtitle_ar ?? undefined,
  });
  const COLL_SELECT = `SELECT c.*,
    COALESCE((SELECT array_agg(cp.poem_id ORDER BY cp.position) FROM collection_poems cp WHERE cp.collection_id = c.id), '{}') AS poem_ids,
    COALESCE((SELECT array_agg(cp.theme ORDER BY cp.position) FROM collection_poems cp WHERE cp.collection_id = c.id), '{}') AS themes
    FROM collections c WHERE c.published`;

  app.get('/api/v2/collections', async (req, res) => {
    try {
      const kind = req.query.kind;
      const { rows } = await pool.query(
        `${COLL_SELECT} ${kind ? 'AND c.kind = $1' : ''} ORDER BY c.id`,
        kind ? [kind] : []
      );
      res.json(rows.map(collection));
    } catch (e) {
      fail(res, 'collections', e);
    }
  });
  app.get('/api/v2/collections/:slug', async (req, res) => {
    try {
      const { rows } = await pool.query(`${COLL_SELECT} AND c.slug = $1`, [req.params.slug]);
      if (!rows.length) return res.status(404).json({ error: 'Collection not found' });
      res.json(collection(rows[0]));
    } catch (e) {
      fail(res, 'collection', e);
    }
  });
  app.get('/api/v2/poets/:slug/appears-in', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `${COLL_SELECT} AND EXISTS (SELECT 1 FROM collection_poems cp JOIN poems p ON p.id = cp.poem_id JOIN poets po ON po.id = p.poet_id WHERE cp.collection_id = c.id AND po.slug = $1) ORDER BY c.id`,
        [req.params.slug]
      );
      res.json(rows.map(collection));
    } catch (e) {
      fail(res, 'appears-in', e);
    }
  });

  // Tonight: one pick per day, the same for everyone. If none is set, pick one and keep it.
  app.get('/api/v2/tonight', async (_req, res) => {
    try {
      let { rows } = await pool.query(
        'SELECT poem_id, reason FROM featured_poems WHERE date = CURRENT_DATE'
      );
      if (!rows.length) {
        const pick = await pool.query(
          `SELECT p.id FROM poems p WHERE ${servable()} ORDER BY md5(p.id::text || CURRENT_DATE::text) LIMIT 1`
        );
        if (!pick.rows.length) return res.status(404).json({ error: 'No poem' });
        await pool.query(
          'INSERT INTO featured_poems (date, poem_id, reason) VALUES (CURRENT_DATE, $1, $2) ON CONFLICT (date) DO NOTHING',
          [pick.rows[0].id, 'Chosen for tonight from the poems readers keep coming back to.']
        );
        ({ rows } = await pool.query(
          'SELECT poem_id, reason FROM featured_poems WHERE date = CURRENT_DATE'
        ));
      }
      const poem = (await pool.query(`${POEM_SELECT()} WHERE p.id = $1`, [rows[0].poem_id]))
        .rows[0];
      const step = (
        await pool.query(
          `SELECT c.slug, c.title_en, c.step_label_en, cp.position, (SELECT COUNT(*)::int FROM collection_poems x WHERE x.collection_id = c.id) AS of
        FROM collection_poems cp JOIN collections c ON c.id = cp.collection_id WHERE c.published AND c.kind = 'journey' AND cp.poem_id = $1 ORDER BY c.id LIMIT 1`,
          [rows[0].poem_id]
        )
      ).rows[0];
      res.json({
        poem: summary(poem),
        reason: rows[0].reason,
        journeyStep: step
          ? {
              slug: step.slug,
              stepEn: step.step_label_en,
              index: step.position,
              of: step.of,
              titleEn: step.title_en,
            }
          : undefined,
      });
    } catch (e) {
      fail(res, 'tonight', e);
    }
  });

  // Search: poets, poems, lines and collections; diacritic-insensitive on Arabic.
  const NORM_SQL = (col) =>
    `translate(regexp_replace(${col}, '[\\u064B-\\u065F\\u0670\\u0640]', '', 'g'), 'أإآٱىة', 'اااايه')`;
  const normalize = (s) =>
    s
      .replace(/[ً-ٰٟـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .trim();
  app.get('/api/v2/search', async (req, res) => {
    const q = String(req.query.q ?? '')
      .trim()
      .slice(0, 80);
    if (q.length < 2) return res.json({ poets: [], poems: [], lines: [], collections: [] });
    try {
      const like = `%${normalize(q).replace(/[%_]/g, '')}%`;
      const [poets, poems, lines, colls] = await Promise.all([
        pool.query(
          `${POET_SELECT} WHERE ${NORM_SQL('po.name')} ILIKE $1 OR po.name_en ILIKE $1 ORDER BY name_en LIMIT 8`,
          [like]
        ),
        pool.query(
          `${POEM_SELECT()} WHERE ${servable()} AND (${NORM_SQL('p.title')} ILIKE $1 OR p.title_en ILIKE $1) ORDER BY p.id LIMIT 12`,
          [like]
        ),
        pool.query(
          `${POEM_SELECT()} WHERE ${servable()} AND ${NORM_SQL(contentExpr())} ILIKE $1 ORDER BY p.id LIMIT 12`,
          [like]
        ),
        pool.query(
          `${COLL_SELECT} AND (c.title_en ILIKE $1 OR ${NORM_SQL('c.title_ar')} ILIKE $1) LIMIT 6`,
          [like]
        ),
      ]);
      const needle = normalize(q);
      const lineHits = lines.rows.flatMap((r) =>
        splitLines(r.arabic)
          .map((l, i) => ({ l, i, r }))
          .filter(({ l }) => normalize(l).includes(needle))
          .slice(0, 2)
          .map(({ l, i, r }) => ({ poem: summary(r), line: l, lineIndex: i }))
      );
      const out = {
        poets: poets.rows.map(poet),
        poems: poems.rows.map(summary),
        lines: lineHits,
        collections: colls.rows.map(collection),
      };
      if (!out.poets.length && !out.poems.length && !out.lines.length && !out.collections.length) {
        const [np, nf] = await Promise.all([
          pool.query(`${POET_SELECT} ORDER BY poem_count DESC LIMIT 3`),
          pool.query(
            `SELECT v.key, v.label_en AS en, v.label_ar AS ar, COALESCE(v.explore_line, '') AS line FROM category_values v JOIN category_dimensions d ON d.id = v.dimension_id WHERE d.key = 'mood' AND v.show_in_explore ORDER BY v.sort_order LIMIT 3`
          ),
        ]);
        out.nearest = {
          poets: np.rows.map(poet),
          feelings: nf.rows.map((r) => ({ ...r, poemCount: 0, poetCount: 0 })),
        };
      }
      res.json(out);
    } catch (e) {
      fail(res, 'search', e);
    }
  });

  // The guide's doors: three poems of different kinds, with a catalog-backed connection.
  async function doors(id, steer = parseSteer()) {
    const [meQ, b] = await Promise.all([
      pool.query(`${POEM_SELECT(true)} WHERE p.id = $1`, [id]),
      bands(),
    ]);
    const me = meQ.rows[0];
    if (!me) return [];
    const mood = me.mood_label ?? me.mood_primary;
    // Related poems and a few from anywhere, each in a daily order.
    const daily = `md5(p.id::text || CURRENT_DATE::text)`;
    const [near, anywhere, full, images] = await Promise.all([
      pool.query(
        `${POEM_SELECT()} WHERE ${servable()} AND p.id <> $1
           AND (p.mood_primary = $2 OR p.poet_id = $3) ORDER BY ${daily} LIMIT 200`,
        [id, me.mood_primary, me.poet_id]
      ),
      pool.query(
        `${POEM_SELECT()} WHERE ${servable()} AND p.id <> $1 AND p.poet_id <> $2 ORDER BY ${daily} LIMIT 24`,
        [id, me.poet_id]
      ),
      me.full_poem_id ? pool.query(`${POEM_SELECT()} WHERE p.id = $1`, [me.full_poem_id]) : null,
      me.mood_primary && me.motif_keys.length
        ? pool.query(
            `${POEM_SELECT(true)} WHERE ${servable()} AND p.id <> $1 AND p.poet_id <> $2
               AND p.mood_primary <> $3
               AND EXISTS (SELECT 1 FROM (${MOTIF_TAGS}) tags WHERE tags.key = ANY($4::text[]))
               ORDER BY ${daily} LIMIT 200`,
            [id, me.poet_id, me.mood_primary, me.motif_keys]
          )
        : null,
    ]);
    // Best fit for the reader's settings first; ties keep the daily order.
    const fit = (rows) => byFit(rows, steer, (x) => bandOf(x, b));
    const chosen = chooseDoors(
      me,
      doorPools(me, fit(near.rows), fit(anywhere.rows), full?.rows[0], fit(images?.rows ?? []))
    );
    const recommendations = wordDoors(chosen, me, mood).map(({ row, ...copy }) => ({
      poem: summary(row),
      ...copy,
    }));
    return uniqueHooks(recommendations);
  }
  app.get('/api/v2/poems/:id/doors', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Bad request' });
    try {
      res.json(await doors(id, parseSteer(req.query)));
    } catch (e) {
      fail(res, 'doors', e);
    }
  });

  app.get('/api/dev/events', (_req, res) => {
    if (process.env.ENABLE_DEV_LAB !== 'true' && process.env.NODE_ENV === 'production')
      return res.status(404).json({ error: 'Not found' });
    res.json(recentEvents.slice(0, 100));
  });
}
