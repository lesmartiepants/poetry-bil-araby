import { describe, it, expect } from 'vitest';
import { serializeForStore, deserializeFromStore, audioCacheKey } from '../services/cache.js';

/**
 * Regression coverage for the iOS Safari IndexedDB Blob bug (issue #554).
 * WebKit throws "Error preparing Blob/File data to be stored in object store"
 * when a Blob is put() into IndexedDB. We store an ArrayBuffer instead and
 * rebuild the Blob on read; these tests lock that round-trip in place.
 */
describe('cache Blob serialization (iOS IndexedDB bug #554)', () => {
  it('serializeForStore converts a Blob field to an ArrayBuffer (no Blob stored)', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/wav' });
    const out = await serializeForStore({ blob, metadata: { title: 'x' } });

    expect(out.blob).toBeUndefined();
    expect(out._blobBuffer).toBeInstanceOf(ArrayBuffer);
    expect(out._blobBuffer.byteLength).toBe(4);
    expect(out._blobType).toBe('audio/wav');
    expect(out.metadata).toEqual({ title: 'x' });
  });

  it('deserializeFromStore rebuilds a Blob from the stored ArrayBuffer', async () => {
    const blob = new Blob([new Uint8Array([9, 8, 7])], { type: 'audio/wav' });
    const stored = await serializeForStore({ blob });
    const back = deserializeFromStore(stored);

    expect(back.blob).toBeInstanceOf(Blob);
    expect(back.blob.type).toBe('audio/wav');
    const bytes = new Uint8Array(await back.blob.arrayBuffer());
    expect(Array.from(bytes)).toEqual([9, 8, 7]);
  });

  it('passes non-Blob data through untouched (insights records)', async () => {
    const data = { interpretation: 'hello', metadata: { tokens: 3 } };
    expect(await serializeForStore(data)).toEqual(data);
    expect(deserializeFromStore(data)).toEqual(data);
  });

  it('deserializeFromStore leaves legacy Blob records (no _blobBuffer) alone', () => {
    const legacy = { blob: new Blob(['old']), timestamp: 1 };
    expect(deserializeFromStore(legacy)).toBe(legacy);
  });

  it('audioCacheKey stays voice- and mode-aware', () => {
    expect(audioCacheKey(42, 'live', 'Orus')).toBe('42::live::Orus');
    expect(audioCacheKey(42)).toBe('42::rest::default');
  });
});
