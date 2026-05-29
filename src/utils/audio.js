// 50 ms of silence at 24 kHz mono 16-bit PCM, encoded as a WAV base64 data URI.
// Built once at module load — no magic string to maintain or miscalculate.
// iOS registers this as a real media-playback event, which is what promotes the
// AVAudioSession from "ambient" (muted by the silent switch) to "playback".
const SILENT_WAV_BASE64 = (() => {
  const sampleRate = 24000;
  const numSamples = Math.floor(sampleRate * 0.05); // 50 ms = 1200 samples
  const dataLen = numSamples * 2; // 16-bit PCM = 2 bytes per sample
  const buf = new ArrayBuffer(44 + dataLen);
  const v = new DataView(buf);
  const str = (off, text) => {
    for (let i = 0; i < text.length; i++) v.setUint8(off + i, text.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + dataLen, true); // file size - 8
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true); // fmt chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); // byte rate
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  str(36, 'data');
  v.setUint32(40, dataLen, true);
  // Data section is zero-initialised (silence) — ArrayBuffer default
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
})();

/**
 * Bypass the iOS hardware silent switch for Web Audio API (Tone.js) playback.
 *
 * iOS assigns the "ambient" AVAudioSession category to web audio by default,
 * which the hardware silent switch mutes. Playing an HTMLAudioElement *directly
 * to the device speaker* during a user gesture promotes the session to "playback"
 * category, which ignores the silent switch. Because AVAudioSession is
 * process-scoped in WKWebView, this promotion covers all subsequent audio output
 * from the same page — including the AudioContext used by Tone.js.
 *
 * Important: do NOT route the element through the AudioContext via
 * createMediaElementSource() here. At call time the AudioContext is still
 * suspended; routing audio through a suspended context prevents actual speaker
 * output and therefore prevents session promotion.
 *
 * Must be called and awaited during a user gesture, before toneStart(), so
 * the session is promoted before the AudioContext begins outputting audio.
 */
export async function unlockAudioForIOS() {
  if (typeof document === 'undefined') return;
  try {
    const audio = document.createElement('audio');
    audio.setAttribute('playsinline', '');
    audio.src = `data:audio/wav;base64,${SILENT_WAV_BASE64}`;
    // Race against 1500 ms: audio.play() can hang indefinitely on some iOS
    // versions — the timeout ensures the caller is never permanently blocked.
    await Promise.race([audio.play(), new Promise((resolve) => setTimeout(resolve, 1500))]);
  } catch (_) {
    // Absorb: restricted environment, missing user gesture, or already promoted.
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
