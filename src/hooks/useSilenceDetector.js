import { useEffect, useRef } from 'react';

/**
 * Hook: Detects silence gaps in PCM audio and reports pause times.
 * Allows the highlight to pause during breath/punctuation gaps.
 */
export function useSilenceDetector() {
  const workerRef = useRef(null);
  const silenceGapsRef = useRef([]);
  const callbackRef = useRef(null);

  useEffect(() => {
    // Lazy-load the worker on first use
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const initWorker = () => {
    if (workerRef.current) return;
    try {
      workerRef.current = new Worker(new URL('../workers/audioAnalyzer.js', import.meta.url), {
        type: 'module',
      });
      workerRef.current.onmessage = (e) => {
        const { type, data } = e.data;
        if (type === 'silenceAnalysis' && data.gaps) {
          silenceGapsRef.current = data.gaps;
          callbackRef.current?.(data.gaps);
        }
      };
    } catch (err) {
      console.warn('[SilenceDetector] failed to init worker', err);
    }
  };

  const addAudio = (pcmData) => {
    initWorker();
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'addAudio', data: pcmData });
    }
  };

  const reset = () => {
    silenceGapsRef.current = [];
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'reset' });
    }
  };

  const onSilenceDetected = (callback) => {
    callbackRef.current = callback;
  };

  const getSilenceAt = (timeMs) => {
    // Check if the given time falls within a detected silence gap
    for (const gap of silenceGapsRef.current) {
      if (timeMs >= gap.start && timeMs <= gap.end) {
        return gap;
      }
    }
    return null;
  };

  return { addAudio, reset, onSilenceDetected, getSilenceAt, silenceGaps: silenceGapsRef.current };
}
