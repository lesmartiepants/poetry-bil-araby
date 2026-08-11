import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { fetchRationaleEn, __resetRationaleCache } from '../services/rationaleTranslation.js';

/**
 * The English rationale is a CONVENIENCE over an Arabic source of truth, so the
 * behaviour worth pinning is mostly about what it does when it cannot get one:
 * every failure has to look like "no English yet", never like an error, because
 * the Arabic above it already reads complete.
 */
describe('fetchRationaleEn', () => {
  beforeEach(() => {
    __resetRationaleCache();
    vi.unstubAllGlobals();
  });

  afterEach(() => vi.unstubAllGlobals());

  const ok = (body) => vi.fn().mockResolvedValue({ ok: true, json: async () => body });

  it('POSTs to the persist-side route and returns the English', async () => {
    const f = ok({ rationaleEn: 'Ascetic contemplation on death.', status: 'translated' });
    vi.stubGlobal('fetch', f);

    await expect(fetchRationaleEn(42)).resolves.toBe('Ascetic contemplation on death.');

    const [url, init] = f.mock.calls[0];
    expect(url).toContain('/api/poems/42/rationale-translation');
    // POST, not GET: the server persists as a side effect, so a second reader
    // never pays. Caching this in IndexedDB instead would make everyone pay.
    expect(init.method).toBe('POST');
  });

  it('does not fire twice for the same poem while a request is open', async () => {
    const f = ok({ rationaleEn: 'One.' });
    vi.stubGlobal('fetch', f);

    const [a, b] = await Promise.all([fetchRationaleEn(7), fetchRationaleEn(7)]);

    expect(a).toBe('One.');
    expect(b).toBe('One.');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('resolves null on a 503 (no API key) rather than throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(fetchRationaleEn(42)).resolves.toBeNull();
  });

  it('resolves null when the network is gone', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(fetchRationaleEn(42)).resolves.toBeNull();
  });

  it('resolves null for a poem the classifier never explained', async () => {
    vi.stubGlobal('fetch', ok({ rationaleEn: null, status: 'no_rationale' }));
    await expect(fetchRationaleEn(42)).resolves.toBeNull();
  });

  it('retries after a failure instead of remembering it', async () => {
    // A null is usually about the moment (offline, key not yet set), not about
    // the poem, so it must not be cached — otherwise one bad expand poisons the
    // rationale for the rest of the session.
    const f = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ rationaleEn: 'Later.' }) });
    vi.stubGlobal('fetch', f);

    await expect(fetchRationaleEn(9)).resolves.toBeNull();
    await expect(fetchRationaleEn(9)).resolves.toBe('Later.');
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('does nothing without a poem id', async () => {
    const f = ok({ rationaleEn: 'x' });
    vi.stubGlobal('fetch', f);
    await expect(fetchRationaleEn(undefined)).resolves.toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});
