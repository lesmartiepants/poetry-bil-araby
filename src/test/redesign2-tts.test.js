// ReDesign2 V7: recitation from GET /api/v2/poems/:id/recitation(.wav), driven through the real
// route handlers with an in-memory pool and a stubbed generator. No Gemini key is ever used.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  geminiTts,
  lineStartsFor,
  pcmToWav,
  registerRedesign2,
  supabaseRecitations,
} from '../../server/redesign2.js';

function harness({ tts, poems = { 7: 'سطر أول * سطر ثان * سطر ثالث' } } = {}) {
  const routes = {};
  const app = { get: (path, fn) => (routes[path] = fn) };
  const pool = {
    query: async (sql, args = []) => {
      if (sql.includes('width_bucket')) return { rows: [] };
      if (sql.includes('WHERE p.id = $1'))
        return { rows: poems[args[0]] ? [{ arabic: poems[args[0]] }] : [] };
      throw new Error(`unexpected query: ${sql.slice(0, 80)}`);
    },
  };
  const mem = new Map();
  const recitations = {
    get: async (id, voice) =>
      mem.get(`${id}:${voice}`) && { url: null, ...mem.get(`${id}:${voice}`) },
    put: async (id, voice, row) => mem.set(`${id}:${voice}`, row),
    read: async (id, voice) => mem.get(`${id}:${voice}`)?.audio ?? null,
  };
  registerRedesign2(app, {
    recitations,
    pool,
    log: { error: () => {} },
    contentExpr: () => 'p.content',
    servingFilters: () => '',
    tts,
  });
  const call = async (route, id, query = {}, ip = '1.1.1.1') => {
    const out = { status: 200, headers: {} };
    const res = {
      status: (s) => ((out.status = s), res),
      json: (b) => (out.body = b),
      set: (h) => Object.assign(out.headers, h),
      send: (b) => (out.sent = b),
    };
    await routes[route]({ params: { id: String(id) }, query, ip }, res);
    return out;
  };
  return {
    audio: mem,
    recitation: (id, q, ip) => call('/api/v2/poems/:id/recitation', id, q, ip),
    wav: (id, q) => call('/api/v2/poems/:id/recitation.wav', id, q),
  };
}

const stub = () => vi.fn(async () => ({ pcm: Buffer.alloc(24000 * 2 * 6), model: 'stub' })); // six seconds

describe('recitation', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('generates once per poem and voice, then serves the stored audio', async () => {
    const tts = stub();
    const h = harness({ tts });
    const first = await h.recitation(7, { voice: 'Orus' });
    expect(first.body).toMatchObject({
      url: '/api/v2/poems/7/recitation.wav?voice=Orus',
      duration: 6,
    });
    expect(first.body.lineStarts).toHaveLength(3);
    expect(first.body.lineStarts[0]).toBe(0);
    const again = await h.recitation(7, { voice: 'Orus' });
    expect(again.body.cached).toBe(true);
    expect(tts).toHaveBeenCalledTimes(1);
    await h.recitation(7, { voice: 'Iapetus' });
    expect(tts).toHaveBeenCalledTimes(2); // another voice is another recitation
    const wav = await h.wav(7, { voice: 'Orus' });
    expect(wav.headers['Content-Type']).toBe('audio/wav');
    expect(wav.sent.subarray(0, 4).toString()).toBe('RIFF');
  });

  it('generates once when two listeners ask at the same moment', async () => {
    const tts = stub();
    const h = harness({ tts });
    await Promise.all([
      h.recitation(7, { voice: 'Zephyr' }, 'a'),
      h.recitation(7, { voice: 'Zephyr' }, 'b'),
    ]);
    expect(tts).toHaveBeenCalledTimes(1);
  });

  it('refuses a voice it does not know, a bad id, and a poem that does not exist', async () => {
    const tts = stub();
    const h = harness({ tts });
    expect((await h.recitation(7, { voice: 'Nobody' })).status).toBe(400);
    expect((await h.recitation(7, { voice: 'Leda' })).status).toBe(400); // shortlisted out (#769)
    expect((await h.recitation('x', { voice: 'Orus' })).status).toBe(400);
    expect((await h.recitation(99, { voice: 'Orus' })).status).toBe(404);
    expect((await h.wav(7, { voice: 'Orus' })).status).toBe(404);
    expect(tts).not.toHaveBeenCalled();
  });

  it('limits how many recitations one visitor can start in an hour, but still serves stored ones', async () => {
    const tts = stub();
    const poems = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((i) => [i, 'سطر']));
    const h = harness({ tts, poems });
    const statuses = [];
    for (let i = 1; i <= 8; i++)
      statuses.push((await h.recitation(i, { voice: 'Orus' }, '9.9.9.9')).status);
    expect(statuses.filter((s) => s === 429)).toHaveLength(2);
    expect((await h.recitation(1, { voice: 'Orus' }, '9.9.9.9')).status).toBe(200);
  });

  it('says so when no key is set and nothing is stored', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('TTS_FAKE', '');
    const h = harness({ tts: geminiTts });
    const r = await h.recitation(7, { voice: 'Orus' });
    expect(r.status).toBe(503);
    expect(h.audio.size).toBe(0);
  });

  it('TTS_FAKE gives a short tone, never reaching Gemini', async () => {
    vi.stubEnv('TTS_FAKE', '1');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const h = harness({ tts: geminiTts });
    const r = await h.recitation(7, { voice: 'Orus' });
    expect(r.body.duration).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('keeps the audio in Storage and only the small facts in the database', async () => {
    const calls = [];
    const stored = [];
    vi.stubGlobal(
      'fetch',
      async (url, init) => (calls.push({ url, init }), { ok: true, status: 200 })
    );
    const pool = {
      query: async (sql, args) => {
        if (sql.includes('INSERT INTO poem_audio')) stored.push(args);
        if (sql.includes('SELECT path'))
          return {
            rows: stored.map((a) => ({
              path: a[2],
              line_starts: JSON.parse(a[3]),
              duration: a[4],
            })),
          };
        return { rows: [] };
      },
    };
    const store = supabaseRecitations(pool, { url: 'https://x.supabase.co/', key: 'k' });
    await store.put(7, 'Orus', {
      audio: Buffer.from('RIFF'),
      lineStarts: [0, 1],
      duration: 2,
      model: 'm',
    });
    expect(calls[0].url).toBe('https://x.supabase.co/storage/v1/object/recitations/7/Orus.wav');
    expect(stored[0][2]).toBe('7/Orus.wav');
    expect(stored[0]).not.toContain(calls[0].init.body);
    expect(await store.get(7, 'Orus')).toMatchObject({
      url: 'https://x.supabase.co/storage/v1/object/public/recitations/7/Orus.wav',
      lineStarts: [0, 1],
    });
  });

  it('shares the length out by letters, and wraps PCM as a WAV', () => {
    expect(lineStartsFor(['اااا', 'ا'], 5)).toEqual([0, 4]);
    const wav = pcmToWav(Buffer.alloc(100));
    expect(wav.length).toBe(144);
    expect(wav.readUInt32LE(24)).toBe(24000);
  });
});
