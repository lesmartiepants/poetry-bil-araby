// ReDesign2 V7: recitation from GET /api/v2/poems/:id/recitation(.wav), driven through the real
// route handlers with an in-memory pool and a stubbed generator. No Gemini key is ever used.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { geminiTts, lineStartsFor, pcmToWav, registerRedesign2 } from '../../server/redesign2.js';

function harness({ tts, poems = { 7: 'سطر أول * سطر ثان * سطر ثالث' } } = {}) {
  const routes = {};
  const audio = new Map();
  const app = { get: (path, fn) => (routes[path] = fn) };
  const pool = {
    query: async (sql, args = []) => {
      if (sql.includes('width_bucket')) return { rows: [] };
      if (sql.includes('FROM poem_audio')) {
        const r = audio.get(`${args[0]}:${args[1]}`);
        return { rows: r ? [r] : [] };
      }
      if (sql.includes('INSERT INTO poem_audio')) {
        audio.set(`${args[0]}:${args[1]}`, {
          audio: args[2],
          line_starts: JSON.parse(args[3]),
          duration: args[4],
          model: args[5],
        });
        return { rows: [] };
      }
      if (sql.includes('WHERE p.id = $1'))
        return { rows: poems[args[0]] ? [{ arabic: poems[args[0]] }] : [] };
      throw new Error(`unexpected query: ${sql.slice(0, 80)}`);
    },
  };
  registerRedesign2(app, {
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
    audio,
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
    await h.recitation(7, { voice: 'Leda' });
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

  it('shares the length out by letters, and wraps PCM as a WAV', () => {
    expect(lineStartsFor(['اااا', 'ا'], 5)).toEqual([0, 4]);
    const wav = pcmToWav(Buffer.alloc(100));
    expect(wav.length).toBe(144);
    expect(wav.readUInt32LE(24)).toBe(24000);
  });
});
