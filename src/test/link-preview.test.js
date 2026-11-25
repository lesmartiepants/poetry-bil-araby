import { afterEach, describe, expect, it, vi } from 'vitest';
import middleware from '../../middleware.js';
import renderPreview from '../../api/og/[id].js';
import { cardSvg, layoutCard } from '../../web/core/logic/shareCard.js';

const origin = 'https://poetry-preview.example.com';
const messages = 'facebookexternalhit/1.1 Facebot Twitterbot/1.0';
const request = (path, agent = messages) =>
  new Request(origin + path, { headers: { 'User-Agent': agent } });

afterEach(() => vi.unstubAllGlobals());

describe('shared links', () => {
  it.each(['/new/p/87201?journey=first-seven', '/poem/87201'])(
    'gives iMessage the poem card for %s',
    async (path) => {
      const fetchPoem = vi.fn().mockResolvedValue(
        Response.json({
          titleAr: 'أمرّ على الديار',
          titleEn: 'I pass by the dwellings',
          poetEn: 'Qays ibn al-Mulawwah',
          poetAr: 'قيس & ليلى',
          firstLineAr: 'أمرّ على الديار ديار ليلى',
        })
      );
      vi.stubGlobal('fetch', fetchPoem);

      const result = await middleware(request(path));
      expect(result.headers.get('content-type')).toContain('text/html');
      expect(result.headers.get('cache-control')).toContain('private');
      expect(result.headers.get('vary')).toBe('User-Agent');
      const html = await result.text();
      expect(html).toContain(
        'property="og:title" content="Poetry بالعربي: Read Qays ibn al-Mulawwah’s poem “I pass by the dwellings”"'
      );
      expect(html).toContain('قيس &amp; ليلى · أمرّ على الديار ديار ليلى');
      expect(html).toContain(`property="og:image" content="${origin}/api/og/87201"`);
      expect(html).toContain(`property="og:url" content="${origin + path.split('?')[0]}"`);
      expect(fetchPoem).toHaveBeenCalledOnce();
    }
  );

  it('uses the brand image for non-poem pages without querying the API', async () => {
    const fetchPoem = vi.fn();
    vi.stubGlobal('fetch', fetchPoem);
    const result = await middleware(request('/new/collection/women-who-wrote-the-canon'));
    const html = await result.text();
    expect(html).toContain('property="og:title" content="Poetry بالعربي"');
    expect(html).toContain(`property="og:image" content="${origin}/link-preview.png"`);
    expect(fetchPoem).not.toHaveBeenCalled();
  });

  it('falls back to the brand image when a poem fails to load', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Backend offline')));
    const result = await middleware(request('/new/p/87201'));
    expect(await result.text()).toContain(
      `property="og:image" content="${origin}/link-preview.png"`
    );
  });

  it('leaves ordinary browser navigation on the SPA', async () => {
    const fetchPoem = vi.fn();
    vi.stubGlobal('fetch', fetchPoem);
    expect(
      await middleware(request('/new/p/87201', 'Mozilla/5.0 (iPhone) Safari/604.1'))
    ).toBeUndefined();
    expect(fetchPoem).not.toHaveBeenCalled();
  });
});

describe('poem preview image', () => {
  const poem = {
    titleAr: 'أمرّ على الديار',
    titleEn: 'I pass by the dwellings',
    poetAr: 'قيس بن الملوح',
    poetEn: 'Qays ibn al-Mulawwah',
    lines: [
      { ar: 'أمرّ على الديار ديار ليلى', en: 'I pass by the dwellings, the dwellings of Layla' },
      { ar: 'أقبل ذا الجدار وذا الجدارا', en: 'I kiss this wall and that wall' },
    ],
  };

  it('makes both languages larger and wraps long translations at word boundaries', () => {
    const spec = { ...poem, colourway: 'obsidian', showEn: true };
    const normal = layoutCard(spec);
    const preview = layoutCard(spec, { preview: true });
    expect(preview.ar).toBeGreaterThan(normal.ar);
    expect(preview.en).toBeGreaterThan(normal.en);
    const svg = cardSvg(spec, { preview: true });
    expect(svg).toContain('أمرّ على الديار ديار ليلى');
    expect(svg).toContain('I pass by the dwellings, the');
    expect(svg).toContain('dwellings of Layla');
    expect(svg).toContain('أقبل ذا الجدار وذا الجدارا');
    expect(svg).toContain('I kiss this wall and that wall');
  });

  it('serves a PNG for a poem with only one line', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ ...poem, lines: poem.lines.slice(0, 1) }))
    );
    const res = { setHeader: vi.fn(), send: vi.fn() };
    await renderPreview({ query: { id: '87201' } }, res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    const [[png]] = res.send.mock.calls;
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1080, 1350]);
  });
});
