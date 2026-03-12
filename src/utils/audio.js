/**
 * Convert raw PCM-16 base64 audio data to a WAV Blob.
 * Shared by both the main audio handler and the prefetch manager.
 *
 * @param {string}   base64  - Base64-encoded PCM-16 audio data
 * @param {number}   rate    - Sample rate (default 24000)
 * @param {Function} onError - Optional error callback: (errorMessage) => void
 * @returns {Blob|null} WAV Blob or null on error
 */
export function pcm16ToWav(base64, rate = 24000, onError) {
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
    if (onError) onError(e.message);
    return null;
  }
}
