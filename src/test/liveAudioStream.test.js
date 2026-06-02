import { describe, it, expect } from 'vitest';
import { pcmBase64ToInt16, concatPcmBase64, consumeSSE } from '../utils/liveAudioStream.js';

/** Encode an Int16Array (LE) to a base64 string, mirroring what the API sends. */
function int16ToBase64(int16) {
  const bytes = new Uint8Array(int16.buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/** A fake ReadableStream reader that yields the given byte slices in order. */
function fakeReader(slices) {
  const enc = new TextEncoder();
  const queue = slices.map((s) => (typeof s === 'string' ? enc.encode(s) : s));
  let i = 0;
  return {
    read() {
      if (i < queue.length) return Promise.resolve({ value: queue[i++], done: false });
      return Promise.resolve({ value: undefined, done: true });
    },
  };
}

describe('pcmBase64ToInt16', () => {
  it('round-trips PCM16 samples', () => {
    const samples = new Int16Array([0, 1, -1, 32767, -32768, 1234, -4321]);
    const b64 = int16ToBase64(samples);
    const decoded = pcmBase64ToInt16(b64);
    expect(Array.from(decoded)).toEqual(Array.from(samples));
  });

  it('returns empty for empty input', () => {
    expect(pcmBase64ToInt16(btoa(''))).toHaveLength(0);
  });
});

describe('concatPcmBase64', () => {
  it('concatenates chunks even when individual chunks have base64 padding', () => {
    const a = new Int16Array([1, 2, 3]); // 6 bytes → base64 with padding
    const b = new Int16Array([4, 5]); // 4 bytes
    const combined = concatPcmBase64([int16ToBase64(a), int16ToBase64(b)]);
    const decoded = pcmBase64ToInt16(combined);
    expect(Array.from(decoded)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('consumeSSE', () => {
  it('dispatches meta, chunk, and done events in order', async () => {
    const events = [];
    const stream = [
      'data: {"meta":{"sampleRate":24000}}\n\n',
      'data: {"chunk":"AAA="}\n\n',
      'data: {"chunk":"AQA="}\n\n',
      'data: {"done":true,"chunks":2,"reason":"complete"}\n\n',
    ];
    await consumeSSE(fakeReader(stream), {
      onMeta: (m) => events.push(['meta', m.sampleRate]),
      onChunk: (c) => events.push(['chunk', c]),
      onDone: (d) => events.push(['done', d.chunks]),
      onError: (e) => events.push(['error', e]),
    });
    expect(events).toEqual([
      ['meta', 24000],
      ['chunk', 'AAA='],
      ['chunk', 'AQA='],
      ['done', 2],
    ]);
  });

  it('reassembles events split across reads', async () => {
    const events = [];
    // The chunk event is split mid-payload across three reads.
    const stream = ['data: {"chu', 'nk":"XYZ="', '}\n\ndata: {"done":true}\n\n'];
    await consumeSSE(fakeReader(stream), {
      onChunk: (c) => events.push(['chunk', c]),
      onDone: () => events.push(['done']),
    });
    expect(events).toEqual([['chunk', 'XYZ='], ['done']]);
  });

  it('surfaces an error event', async () => {
    const events = [];
    await consumeSSE(fakeReader(['data: {"error":"no audio within 20s"}\n\n']), {
      onError: (e) => events.push(e),
    });
    expect(events).toEqual(['no audio within 20s']);
  });
});
