# Gemini Live Word-Sync POC Results

The proof of concept keeps Gemini Live for immediate audio and drives highlighting from the Web
Audio scheduled playhead. It does not use the product's current highlighter.

## Clock-Synchronized Audit Recording

| Production poem                                            | First playable audio | PCM chunks | Captured audio | Timing-audit artifacts                                                                                                                                                                       |
| ---------------------------------------------------------- | -------------------: | ---------: | -------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #85386, Ibn Khātima al-Andalusī, _A Rose Toss and Shyness_ |               845 ms |         36 |         9.51 s | [single-stream WebM](./artifacts/poem-85386-clock-synchronized.webm), [QuickTime MP4](./artifacts/poem-85386-clock-synchronized.mp4), [annotations](./artifacts/poem-85386-annotations.json) |

The WebM was made by one browser `MediaRecorder` session: a canvas driven by the same Web Audio
playhead as the DOM highlight, plus the exact PCM output routed through `MediaStreamDestination`.
Audio begins at 0.033 s and ends at 9.573 s; video ends at 9.727 s because the recorder includes a
154 ms finalization tail. The MP4 is a direct transcode of that one-stream WebM, not a merge of
separately recorded audio and video.

## Earlier Latency Runs

| Production poem                                                            | First playable audio | PCM chunks | Captured audio | Measurement artifacts                                                                          |
| -------------------------------------------------------------------------- | -------------------: | ---------: | -------------: | ---------------------------------------------------------------------------------------------- |
| #87249, al-ʿAbbās ibn al-Aḥnaf, _Affliction in Love_                       |               900 ms |         39 |        10.72 s | [WAV](./artifacts/poem-87249-live.wav), [annotations](./artifacts/poem-87249-annotations.json) |
| #85856, al-ʿAbbās ibn al-Aḥnaf, _Calling the Beloved, Solace of the Heart_ |               928 ms |        147 |        46.89 s | [WAV](./artifacts/poem-85856-live.wav), [annotations](./artifacts/poem-85856-annotations.json) |

The `*-live-sync-with-audio.mp4` files are convenience previews only and must not be used for timing
audit; their audio was attached after the screen recording. The clock-synchronized recording above
replaces them for that purpose.

## UX Finding

All three runs began playing in under one second, before the full poem had been generated. PCM is
scheduled back-to-back in `AudioContext`; the cursor reads that scheduled clock, not the arrival
time of SSE chunks. Therefore network jitter cannot make the cursor lead the audible audio.

The deliberate trade-off is visible in the UI: word-boundary confidence is labelled **estimated**.
Gemini Live sends raw PCM chunks but no word or phoneme offsets, and its output-transcription
events are not ordered relative to audio. The prototype uses weighted Arabic letter lengths and
punctuation to divide time across known words. This proves fast-start playback-clock synchronization,
not accurate karaoke-level word boundaries.

## CTC Offline Feasibility Pilot

An isolated Arabic Wav2Vec2 CTC/Viterbi adapter was evaluated only after capture, using six
independent fixed-poem Gemini recordings and their existing Chirp word audits. It achieved 39/39
source-token coverage on every comparable capture; across 211 conservatively matched word starts,
the pooled median absolute error was **83 ms** and P90 was **122 ms**. This retains CTC as a
promising alignment lead, but does not make it a live feature.

The adapter was cold and whole-recording: model loading plus alignment took about 5.2–5.7 seconds
per capture. It has not met the 1.5–2 second warm-window requirement, supplied calibrated
confidence, or proven causal future-only correction. The [CTC feasibility gate](./CTC_FEASIBILITY.md)
defines the next worker/window and live-safety tests; first audio remains independent of it.

## Live Anchor-Contract Prototype

The lab now has paired **observe** and **future-only correct** modes beside the production-equivalent
`transcript-moras-weighted-fallback` control. The correction planner is unit-tested to preserve past
boundaries and monotonic word order. It accepts only safely past anchors with a future horizon and
otherwise remains on the same fallback plan.

The first real-stream checks did not validate an anchor provider: Gemini output-audio transcript
timings emitted no usable word anchors, while the parallel Chirp streaming relay timed out before
returning anchors. Those are useful negative results. The recordings, provider error, and zero-anchor
counts remain in the Runs ledger; no cursor correction was silently applied or interpreted as an
improvement.

## Recommendation

Ship this as a line/phrase-first Live experience only if manual Arabic review accepts its drift.
Use soft phrase highlighting when confidence is low. For exact word boundaries, keep Live audio
immediate and add a delayed streaming forced-alignment/STT refinement, or offer a separate marked
TTS mode. Do not gate first audio on alignment.

Sources: [Gemini Live API reference](https://ai.google.dev/api/live) and [Live API capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities).
