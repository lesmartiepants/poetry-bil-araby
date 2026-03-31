/**
 * Concatenate multiple base64-encoded PCM16 segments into one.
 * Used to stitch together parallel TTS chunk responses before WAV conversion.
 * @param {string[]} b64Array - Array of base64-encoded PCM16 segments
 * @returns {string} Combined base64-encoded PCM16 data
 */
export const concatenatePCM16Base64 = (b64Array) => {
  const buffers = b64Array.map((b64) => {
    const bin = atob(b64.replace(/\s/g, ''));
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf;
  });
  const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    combined.set(buf, offset);
    offset += buf.length;
  }
  let binary = '';
  for (let i = 0; i < combined.length; i++) binary += String.fromCharCode(combined[i]);
  return btoa(binary);
};

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
