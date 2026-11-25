import { afterEach, describe, expect, it, vi } from 'vitest';
import middleware from '../../middleware.js';

const origin = 'https://poetry-preview.example.com';
const messages = 'facebookexternalhit/1.1 Facebot Twitterbot/1.0';
const request = (path, agent = messages) =>
  new Request(origin + path, { headers: { 'User-Agent': agent } });

afterEach(() => vi.unstubAllGlobals());

describe('shared links', () => {
  it.each(['/new/p/87201?journey=first-seven', '/poem/87201'])(
    'gives iMessage the poem card for %s',
    async (path) => {
      const fetchPoem = vi
        .fn()
        .mockResolvedValue(
          Response.json({
            titleAr: 'أمرّ على الديار',
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
      expect(html).toContain('property="og:title" content="أمرّ على الديار"');
      expect(html).toContain('قيس &amp; ليلى · أمرّ على الديار ديار ليلى');
      expect(html).toMatch(
        /property="og:image" content="https?:\/\/[^"]+\/api\/v2\/poems\/87201\/card\.png"/
      );
      expect(html).toContain(`property="og:url" content="${origin + path.split('?')[0]}"`);
      expect(fetchPoem).toHaveBeenCalledOnce();
    }
  );

  it('uses the brand image for non-poem pages without querying the API', async () => {
    const fetchPoem = vi.fn();
    vi.stubGlobal('fetch', fetchPoem);
    const result = await middleware(request('/new/collection/women-who-wrote-the-canon'));
    expect(await result.text()).toContain(
      `property="og:image" content="${origin}/link-preview.png"`
    );
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
