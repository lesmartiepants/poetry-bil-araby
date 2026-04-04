/**
 * Convert raw PCM16 base64 audio data to a WAV Blob.
 * @param {string} base64 - Base64-encoded PCM16 data
 * @param {number} rate   - Sample rate (default 24000)
 * @returns {Blob|null} WAV Blob or null on error
 */
export const pcm16ToWav = (base64, rate = 24000) => {
  try {
    const cleanedBase64 = base64.replace(/\s/g, '');
    const bin = atob(cleanedBase64);
    const buf = new ArrayBuffer(bin.length);
    const view = new DataView(buf);
    for (let i = 0; i < bin.length; i++) view.setUint8(i, bin.charCodeAt(i));
    const samples = new Int16Array(buf);
    const wavBuf = new ArrayBuffer(44 + samples.length * 2);
    const wavView = new DataView(wavBuf);
    const s = (o, str) => {
      for (let i = 0; i < str.length; i++) wavView.setUint8(o + i, str.charCodeAt(i));
    };
    s(0, 'RIFF');
    wavView.setUint32(4, 36 + samples.length * 2, true);
    s(8, 'WAVE');
    s(12, 'fmt ');
    wavView.setUint32(16, 16, true);
    wavView.setUint16(20, 1, true);
    wavView.setUint16(22, 1, true);
    wavView.setUint32(24, rate, true);
    wavView.setUint32(28, rate * 2, true);
    wavView.setUint16(32, 2, true);
    wavView.setUint16(34, 16, true);
    s(36, 'data');
    wavView.setUint32(40, samples.length * 2, true);
    new Int16Array(wavBuf, 44).set(samples);
    return new Blob([wavBuf], { type: 'audio/wav' });
  } catch (e) {
    return null;
  }
};

/**
 * Derive audio duration (seconds) from a WAV Blob produced by pcm16ToWav / pcm16ChunksToWav.
 * WAV = 44-byte header + PCM data; mono 16-bit at the given sample rate.
 * @param {number} blobSize  - Blob size in bytes
 * @param {number} [rate=24000]
 * @returns {number}
 */
export const wavDurationSec = (blobSize, rate = 24000) => (blobSize - 44) / 2 / rate;

/**
 * Convert an array of base64-encoded PCM16 chunks (from a streaming TTS response)
 * into a single WAV Blob by decoding and concatenating all binary frames.
 * @param {string[]} base64Chunks - Array of base64-encoded PCM16 chunks
 * @param {number}   rate         - Sample rate (default 24000)
 * @returns {Blob|null} WAV Blob or null on error
 */
export const pcm16ChunksToWav = (base64Chunks, rate = 24000) => {
  try {
    const bins = base64Chunks.map((b64) => atob(b64.replace(/\s/g, '')));
    const totalLen = bins.reduce((sum, b) => sum + b.length, 0);

    const buf = new ArrayBuffer(totalLen);
    const view = new DataView(buf);
    let offset = 0;
    for (const bin of bins) {
      for (let i = 0; i < bin.length; i++) view.setUint8(offset++, bin.charCodeAt(i));
    }

    const samples = new Int16Array(buf);
    const wavBuf = new ArrayBuffer(44 + samples.length * 2);
    const wavView = new DataView(wavBuf);
    const s = (o, str) => {
      for (let i = 0; i < str.length; i++) wavView.setUint8(o + i, str.charCodeAt(i));
    };
    s(0, 'RIFF');
    wavView.setUint32(4, 36 + samples.length * 2, true);
    s(8, 'WAVE');
    s(12, 'fmt ');
    wavView.setUint32(16, 16, true);
    wavView.setUint16(20, 1, true);
    wavView.setUint16(22, 1, true);
    wavView.setUint32(24, rate, true);
    wavView.setUint32(28, rate * 2, true);
    wavView.setUint16(32, 2, true);
    wavView.setUint16(34, 16, true);
    s(36, 'data');
    wavView.setUint32(40, samples.length * 2, true);
    new Int16Array(wavBuf, 44).set(samples);
    return new Blob([wavBuf], { type: 'audio/wav' });
  } catch (e) {
    return null;
  }
};
