/**
 * Minimal 46-byte WAV: mono, 16-bit PCM, 24 kHz, 1 silent sample.
 * Used to promote the iOS audio session from "ambient" to "playback" mode.
 */
const SILENT_WAV_BASE64 = 'UklGRiYAAABXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAAZGF0YQIAAAAAAA==';

/**
 * Transition the iOS audio session from "ambient" (silenced by the hardware
 * mute/silent switch) to "playback" (ignores the silent switch) by playing a
 * silent <audio> element during a user gesture.
 *
 * On iOS, the Web Audio API (and Tone.js) defaults to the "ambient" session
 * category, which is muted by the iPhone silent switch. Playing any sound
 * through an HTMLAudioElement during a user gesture promotes the session to
 * "playback", after which Web Audio API output is also heard regardless of
 * the switch position.
 *
 * Safe to call in non-browser environments (SSR / unit tests) — no-ops silently.
 */
export function unlockAudioForIOS() {
  if (typeof document === 'undefined') return;
  try {
    const audio = document.createElement('audio');
    audio.src = `data:audio/wav;base64,${SILENT_WAV_BASE64}`;
    // Use near-zero (not zero) volume: iOS requires a non-muted, non-zero-volume element
    // to promote the audio session from "ambient" to "playback".
    audio.volume = 0.001;
    audio.play().catch(() => {});
  } catch (_) {
    // Ignore errors from restricted environments or missing user gesture
  }
}

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
