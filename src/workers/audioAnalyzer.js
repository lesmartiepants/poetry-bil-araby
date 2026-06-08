/**
 * WebWorker: Analyzes PCM audio stream for silence detection and word boundaries.
 * Runs RMS energy detection to find silence gaps (pauses between words/phrases).
 */

let buffer = new Float32Array(0);
const SAMPLE_RATE = 24000;
const ENERGY_THRESHOLD = 0.02; // RMS threshold for silence
const MIN_SILENCE_MS = 80; // minimum gap to count as silence

self.onmessage = (e) => {
  const { type, data } = e.data;
  
  if (type === 'addAudio') {
    // Append PCM audio to buffer
    const newBuffer = new Float32Array(buffer.length + data.length);
    newBuffer.set(buffer);
    newBuffer.set(data, buffer.length);
    buffer = newBuffer;
    
    // Analyze for silence and boundaries
    const analysis = analyzeBuffer();
    if (analysis) {
      self.postMessage({ type: 'silenceAnalysis', data: analysis });
    }
  } else if (type === 'reset') {
    buffer = new Float32Array(0);
  }
};

function analyzeBuffer() {
  if (buffer.length < SAMPLE_RATE * 0.02) return null; // need at least 20ms
  
  const windowSize = Math.floor(SAMPLE_RATE * 0.02); // 20ms RMS windows
  const gaps = [];
  let inSilence = false;
  let silenceStart = 0;
  
  for (let i = 0; i < buffer.length - windowSize; i += windowSize / 2) {
    const window = buffer.slice(i, i + windowSize);
    const rms = calculateRMS(window);
    const timeMs = (i / SAMPLE_RATE) * 1000;
    const isSilence = rms < ENERGY_THRESHOLD;
    
    if (isSilence && !inSilence) {
      silenceStart = timeMs;
      inSilence = true;
    } else if (!isSilence && inSilence) {
      const gapDuration = timeMs - silenceStart;
      if (gapDuration >= MIN_SILENCE_MS) {
        gaps.push({ start: silenceStart, end: timeMs, duration: gapDuration });
      }
      inSilence = false;
    }
  }
  
  return gaps.length > 0 ? { gaps, bufferTimeMs: (buffer.length / SAMPLE_RATE) * 1000 } : null;
}

function calculateRMS(window) {
  let sum = 0;
  for (let i = 0; i < window.length; i++) {
    sum += window[i] * window[i];
  }
  return Math.sqrt(sum / window.length);
}
