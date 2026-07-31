# Gemini Live Word-Sync POC Results

The proof of concept keeps Gemini Live for immediate audio and drives highlighting from the Web
Audio scheduled playhead. It does not use the product's current highlighter.

## Pre-fixed-reference historical recordings

These recordings predate the fixed #87443 comparison protocol. They demonstrate one-stream capture
mechanics only and are not ranked in the current Runs evidence.

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

The lab now has paired **observe** and **future-only correct** modes beside historical
`transcript-moras-weighted-fallback` controls. Production now defaults to
`branch-transcript-moras`; use that profile for new production-control comparisons. The correction
planner is unit-tested to preserve past boundaries and monotonic word order. It accepts only safely
past anchors with a future horizon and otherwise remains on the same fallback plan.

The first real-stream checks did not validate an anchor provider: Gemini output-audio transcript
timings emitted no usable word anchors, while the parallel Chirp streaming relay timed out before
returning anchors. Those are useful negative results. The recordings, provider error, and zero-anchor
counts remain in the Runs ledger; no cursor correction was silently applied or interpreted as an
improvement.

## Persistent CTC Sidecar Dogfood

The lab now also has a local warm Arabic CTC worker with an explicit browser-to-worker PCM
contract. Each already-scheduled chunk carries a sequence number, content sample range, sample
count, per-chunk CRC32, and rolling CRC32 acknowledgement. The worker force-aligns a deliberately
bounded opening phrase, emits only immutable anchors whose audio is 750 ms behind its received
stream, and the browser holds any cue generated from still-queued audio until it is safely past the
Web Audio playhead. The resulting visual highlight trace records every actual word transition, so
the post-run Chirp audit no longer relies on a 50 ms snapshot approximation.

In batch `20260729T000918493Z-2711e4ea`, observe and correct each received/accepted six anchors
with a safe future horizon. This proves the end-to-end transport and safety behavior. It does not
validate correction: P90 anchor staleness was 972 ms observe and 1,135 ms correct (target <=750
ms). The event-level Chirp word-start audit recorded fallback 10/36 (27.8%), observe 15/35 (42.9%),
and correct 7/36 (19.4%) exact highlighted-word matches. Because every Live method generated its
own audio delivery, the observe number is descriptive only; the correction number is a negative
signal. A transient early short-window alignment failure also occurred, and the current worker only
handles an externally supplied first-six-word range.

This is intentionally **not wired into the production reader**. The next test is a deterministic
identical-PCM replay across fallback, shadow, and correction before range rotation, calibrated
confidence, or a debug-panel shadow mode is considered.

## Precision-Recitation Pre-roll Prototype

A separate POC-only `ctc-precision-phrase` mode now holds opening PCM while a warm CTC worker
builds stable, absolute-sample word cues. Unlike the immediate sidecar's 120 ms future correction,
it can directly use a completed cue schedule only before the phrase begins. Its worker protocol
supports bounded phrase windows and range rotation; every cue needs two compatible alignment passes
within 80 ms and can never change a played word.

This validates the transport and a narrow alignment result, not a product mode. In the direct
opening-phrase dogfood, 4/5 Chirp-comparable CTC cues were within ±80 ms, but they required roughly
2.8 seconds of pre-roll. In the rotating live run, only 11/37 words (13.5%) were accurate and
causally available under a 4.2-second pre-roll, far below the 80% target; rendered exact-start
agreement was 6/37. The full [precision POC report](./PRECISION_RECITATION.md) explains why its
100% oracle replay is an upper bound rather than a live claim.

## Recommendation

Ship this as a line/phrase-first Live experience only if manual Arabic review accepts its drift.
Use soft phrase highlighting when confidence is low. For exact word boundaries, keep Live audio
immediate and add a delayed streaming forced-alignment/STT refinement, or offer a separate marked
TTS mode. Do not gate first audio on alignment.

Sources: [Gemini Live API reference](https://ai.google.dev/api/live) and [Live API capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities).
