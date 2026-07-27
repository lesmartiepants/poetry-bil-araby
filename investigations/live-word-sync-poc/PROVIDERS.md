# Timestamp Provider Paths

All external adapters use the same POC contract: start a server-owned session before Gemini Live,
copy each 24 kHz mono PCM chunk to it, poll final word cues, and map cues onto the browser's
scheduled `AudioContext` clock. The adapter must never delay or replace the initial Live playback.

## Google Cloud Speech-to-Text V2 — implemented first

The POC includes `google-stt-adapter.mjs` and the **Google STT timestamp mapping** strategy. It
uses Chirp 3 with Arabic `ar-SA`, LINEAR16/24 kHz, and final word offsets. Configure server-side
Application Default Credentials plus:

```bash
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_LOCATION=us
export GOOGLE_STT_LANGUAGE=ar-SA
```

The browser receives only matched cues; credentials stay server-side. It uses conservative Arabic
normalization and a bounded, monotonic token search, so uncertain words stay on the weighted/VAD
fallback rather than moving backward or highlighting a repeated word incorrectly.

## Deepgram — next live comparison

Use Nova-3 with `language=ar`, `encoding=linear16`, `sample_rate=24000`, one channel, and interim
results. Final response words include start, end, and confidence. The adapter shape is identical to
Google's; configure `DEEPGRAM_API_KEY` server-side. Deepgram's timestamps refine playback but are
not latency measurements, so retain the immediate fallback highlight.

## Rolling forced alignment — delayed refinement

WhisperX, stable-ts, or ElevenLabs Forced Alignment can align Gemini-generated PCM against known
poem text after enough audio has arrived. Use them in overlapping verse/windows and update only
future words. They are useful audit/reference modes, not a replacement for Live's first audio.

## Native timing marks — alternate audio engine

Google Cloud TTS synchronous SSML marks and ElevenLabs streaming character alignment can provide
native cues, but the former is batch and the latter changes the audio provider. Treat these as
separate latency-versus-accuracy experiments.

Sources: [Google STT V2](https://cloud.google.com/speech-to-text/v2/docs/reference/rpc/google.cloud.speech.v2), [Deepgram live streaming](https://developers.deepgram.com/reference/speech-to-text/listen-streaming), [WhisperX](https://github.com/m-bain/whisperX), [Google SSML marks](https://cloud.google.com/text-to-speech/docs/ssml), and [ElevenLabs streaming alignment](https://elevenlabs.io/docs/api-reference/text-to-speech/v-1-text-to-speech-voice-id-stream-input).
