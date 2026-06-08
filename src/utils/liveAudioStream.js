/**
 * Live TTS streaming helpers.
 *
 * The backend `/api/ai/live-tts?stream=1` endpoint forwards each PCM chunk from
 * Google's Live API as an SSE event the moment it arrives. These helpers consume
 * that stream and play the audio incrementally, so the first sound reaches the
 * listener in ~1s instead of waiting for the whole recitation to synthesize.
 *
 * Audio format from the Live API: 16-bit signed little-endian PCM, mono, 24kHz.
 */

const DEFAULT_SAMPLE_RATE = 24000;

/**
 * Decode a base64 PCM16 chunk into an Int16Array of samples.
 * Browsers are little-endian, matching the Live API's PCM byte order.
 */
export function pcmBase64ToInt16(b64) {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  // Trailing odd byte (shouldn't happen with PCM16) is dropped by the floor.
  return new Int16Array(bytes.buffer, 0, Math.floor(len / 2));
}

/**
 * Concatenate base64 PCM chunks into a single base64 string (for caching as one WAV).
 * Decodes each chunk to bytes, concatenates, re-encodes — a plain string join is
 * wrong because base64 padding ('=') can appear mid-stream.
 */
export function concatPcmBase64(chunks) {
  const byteArrays = chunks.map((b64) => {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  });
  const total = byteArrays.reduce((n, a) => n + a.length, 0);
  const all = new Uint8Array(total);
  let offset = 0;
  for (const a of byteArrays) {
    all.set(a, offset);
    offset += a.length;
  }
  // Chunked btoa — avoids "Maximum call stack" on large buffers from String.fromCharCode(...spread).
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < all.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, all.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Parse a Server-Sent Events stream from a ReadableStream reader, dispatching
 * each `data:` JSON payload to the matching callback.
 *
 * Event shapes (from server.js live-tts streaming path):
 *   { meta: { sampleRate, mimeType } }   — once, before the first chunk
 *   { chunk: "<base64 pcm>" }            — per audio chunk
 *   { done: true, chunks, reason }       — terminal success
 *   { error: "<message>" }               — terminal failure
 *
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
 * @param {{onMeta?, onChunk?, onTiming?, onDone?, onError?}} handlers
 */
export async function consumeSSE(reader, { onMeta, onChunk, onTiming, onDone, onError } = {}) {
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE events are separated by a blank line.
    let sep;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of rawEvent.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        let evt;
        try {
          evt = JSON.parse(payload);
        } catch {
          continue;
        }
        if (evt.meta) onMeta?.(evt.meta);
        else if (evt.chunk) onChunk?.(evt.chunk);
        else if (evt.partialTimings) onTiming?.(evt.partialTimings);
        else if (evt.done) onDone?.(evt);
        else if (evt.error) onError?.(evt.error);
      }
    }
  }
}

/**
 * A Web Audio player that accepts PCM chunks incrementally and schedules them
 * back-to-back. Mimics the minimal player interface togglePlay expects
 * (start / stop / onstop) so it drops into the existing playback + highlight flow.
 *
 * Pass an already-unlocked AudioContext (Tone's raw context, unlocked by the
 * user gesture earlier in the click handler) so playback isn't blocked by
 * browser autoplay policy.
 *
 * @param {AudioContext} ctx
 * @param {{sampleRate?: number}} opts
 */
export function createStreamingPlayer(ctx, { sampleRate = DEFAULT_SAMPLE_RATE } = {}) {
  let nextTime = 0; // ctx-time at which the next chunk should start
  let pending = 0; // scheduled sources not yet finished
  let inputDone = false;
  let stopped = false;
  let firstChunkAt = null; // ctx.currentTime of first scheduled chunk
  let insertedGapSeconds = 0; // cumulative underrun gaps inserted into the schedule
  const sources = new Set();
  // All chunks fan through one gain node so the volume-detection analyser can
  // tap a single output (matches the Tone.Player.connect() interface).
  const output = ctx.createGain();
  output.connect(ctx.destination);

  const maybeEnd = () => {
    if (inputDone && pending <= 0 && !stopped) {
      stopped = true;
      player.onstop?.();
    }
  };

  const player = {
    onstop: null,
    /** Schedule one PCM16 chunk for playback. */
    pushChunk(int16) {
      if (stopped || int16.length === 0) return;
      const buf = ctx.createBuffer(1, int16.length, sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < int16.length; i++) ch[i] = int16[i] / 32768;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(output);
      const now = ctx.currentTime;
      const prevNextTime = nextTime;
      // Small lead on the first chunk; resync if generation fell behind playback
      // (an underrun leaves a gap rather than overlapping audio).
      if (nextTime < now + 0.05) nextTime = now + 0.05;
      if (firstChunkAt !== null && nextTime > prevNextTime) {
        insertedGapSeconds += nextTime - prevNextTime;
      }
      if (firstChunkAt === null) firstChunkAt = nextTime;
      src.start(nextTime);
      nextTime += buf.duration;
      pending++;
      sources.add(src);
      src.onended = () => {
        sources.delete(src);
        pending--;
        maybeEnd();
      };
    },
    /** Signal that no more chunks will arrive; player ends after the queue drains. */
    markInputDone() {
      inputDone = true;
      maybeEnd();
    },
    /** Part of the Player interface. Playback already runs as chunks are pushed. */
    start() {
      if (ctx.state === 'suspended') ctx.resume?.();
    },
    /**
     * Route output into a Tone node / AudioNode (volume-detection analyser).
     * Tone wrappers expose the native node at `.input`; raw AudioNodes connect directly.
     */
    connect(dest) {
      try {
        output.connect(dest?.input ?? dest);
      } catch {
        /* analyser unavailable — audio still reaches the speakers via destination */
      }
      return this;
    },
    /** Stop and fire onstop (pause / navigation). A short gain fade avoids the
     *  click/pop you get from cutting PCM sources off abruptly mid-sample. */
    stop() {
      stopped = true;
      const t = ctx.currentTime;
      const FADE = 0.02; // 20ms — inaudible as a fade, long enough to kill the click
      try {
        output.gain.cancelScheduledValues(t);
        output.gain.setValueAtTime(output.gain.value, t);
        output.gain.linearRampToValueAtTime(0, t + FADE);
      } catch {
        /* gain automation unsupported — fall through to a hard stop */
      }
      for (const s of sources) {
        try {
          s.stop(t + FADE + 0.005); // stop just after the fade completes
        } catch {
          try {
            s.stop();
          } catch {
            /* already stopped */
          }
        }
      }
      sources.clear();
      this.onstop?.();
    },
    /** True once at least one chunk has been scheduled. */
    get hasStarted() {
      return firstChunkAt !== null;
    },
    /**
     * Playback progress in CONTENT seconds (not wall-clock): excludes scheduling
     * gaps inserted on stream underruns so highlight timing doesn't run ahead.
     */
    getCurrentTime() {
      if (firstChunkAt === null) return 0;
      const playedOnCtxClock = Math.max(0, ctx.currentTime - firstChunkAt);
      const contentPlayed = Math.max(0, playedOnCtxClock - insertedGapSeconds);
      const contentScheduled = Math.max(0, nextTime - firstChunkAt - insertedGapSeconds);
      return Math.min(contentPlayed, contentScheduled);
    },
  };
  return player;
}
