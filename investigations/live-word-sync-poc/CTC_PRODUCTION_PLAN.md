# CTC Production Integration: Assumptions and Validation Plan

## Decision

Do **not** replace the shipped Live timing profile with CTC. Keep the transcript/mora plan as the
immediate cursor and treat CTC as a confidence-gated source of corrections to a strictly future
visual plan. The first production deployment is **observe only**: it collects anchors and timing
traces, but cannot alter the user-visible highlight.

This matters because the existing app already streams Gemini PCM quickly and has a browser playback
clock. The server receives the raw PCM, but it does not know the browser's exact scheduled audio
time or client-side underrun gaps. The browser must remain the timing authority.

## Confirmed baseline

The deployed baseline is `origin/main` commit `9927917` (the local root `main` may be stale). In
that baseline:

- `server.js` receives Gemini's PCM, then relays the same base64 chunks over SSE.
- `src/utils/liveAudioStream.js` schedules 24 kHz PCM with Web Audio; its content playhead is the
  source of audible timing.
- `src/stores/actions/togglePlay.js` consumes the stream and stores existing partial transcript
  timings.
- `src/components/DebugPanel.jsx` already has a persisted Live timing-profile picker; it is the
  right place for internal observe/shadow/correct modes.
- Vercel serves the static app while the Express Live backend runs on Render. A heavyweight model
  must not be assumed warm or persistent on that relay.

The existing Gemini output-audio transcription and transcript/mora profile are the real production
controls. CTC must beat them in paired replay/live measurements; it is not enough to beat an older
weighted-only clock.

## Proposed topology

```text
Gemini Live PCM (24 kHz)
       │
       ├── Render SSE relay ──> browser Web Audio ──> fallback visual plan
       │                                  │
       │                                  └── browser playback/sample trace
       │
       └── async PCM tee ──> persistent CTC worker ──> CTC anchor SSE event
                                                        │
                                                        └── browser observes first;
                                                            later revises future plan only
```

The worker should be a separately deployed, persistent service—not a Vercel function or a model
loaded per Render request. Model load/cold-start must be measured separately from warm-window
performance. If the worker disconnects, slows, or rejects a stream, the relay and fallback cursor
continue unchanged.

## Event contract to prove before correction

All PCM, timing, and anchors need one stream ID and sample-domain identity. Wall-clock timestamps
alone are not valid audio timestamps.

```ts
type PcmChunk = {
  streamId: string;
  seq: number;
  contentStartSample24k: number;
  sampleCount: number;
  pcm16leBase64: string;
};

type BrowserScheduleTrace = {
  streamId: string;
  seq: number;
  contentStartSample24k: number;
  contentStartSeconds: number;
  audioContextScheduledAt: number;
  insertedGapSeconds: number;
};

type CtcAnchor = {
  streamId: string;
  tokenIndex: number;
  contentStartSample24k: number;
  contentEndSample24k: number;
  modelVersion: string;
  confidence: number | null;
  workerReceivedAt: number;
  workerEmittedAt: number;
  windowMs: number;
  queueMs: number;
};
```

The CTC worker works in content-sample time. The browser maps an accepted anchor to its own content
playhead and records whether it arrived before there is enough future visual horizon to help.
An anchor is useful only when it arrives before the target correction can be displayed—not merely
when it is close to the past word it aligned.

## Assumptions to falsify

| Assumption | Required test / rejection signal |
| --- | --- |
| Server PCM and browser PCM are the same stream | Six live traces with ordered sequence, sample count, and checksum equality; no loss, duplicate, or overlap. |
| Sample-domain anchors map to browser playback despite 50 ms lead and gaps | Inject delivery gaps; prove CTC anchors never use wall time and 24→16 kHz mapping is within 10 ms P99. |
| Whole-file alignment survives causal 1.5–2s windows | Replay original PCM cadence across 1.5/2/3s overlaps; assess only committed non-edge cues. |
| The fallback can locate the bounded text region | Inject ±1, ±3, and ±5 word seed error, plus skipped/repeated words; reject a model that works only with an oracle word index. |
| Forced alignment implies acoustic evidence | Measure unconstrained decode/evidence and report every expected, missing, inserted, and ambiguous token. 39/39 forced-path coverage alone is insufficient. |
| Confidence predicts timing quality | Train a threshold only on development captures; on held-out captures, high-confidence anchors need P90 <=200 ms and false anchors above 250 ms <=2%. |
| Chirp is enough as a reference | Compare all denominators and signed error, then create dual-annotated manual gold starts for at least three captures before treating close results as wins. |
| A warm remote worker is timely enough | Measure browser receipt time, not inference alone: P95 compute <=300 ms, P99 queue age below one hop, and >=80% of anchors arrive with two words or 150 ms of safe future horizon. |
| Correction is perceptually better | Deterministic, blinded replay must improve median displayed offset >=40 ms and >=15%, without P90 regression, reversal, late cue, or reported wobble. |
| Failure leaves the experience safe | Timeout, worker restart, queue growth, abort, and bad-anchor tests leave first audio and the fallback plan unchanged. |

## Correction policy after shadow passes

The planner is a pure browser-side function, not a replacement array of timestamps.

1. Start with the existing transcript/mora fallback plan immediately.
2. Accept an anchor only if token mapping is monotonic, confidence is calibrated, it is safely past,
   it arrives before a future horizon, and it agrees with overlapping-window evidence.
3. Freeze the active and completed words. Reject any anchor that would regress their index or
   time.
4. Clamp an accepted total correction initially to ±120 ms and spread it across 4–6 upcoming words
   (about one second). Coalesce newer compatible anchors rather than applying each jump.
5. Enforce increasing word boundaries and a minimum dwell time. A low-confidence, late, missing,
   or contradictory anchor is a no-op.

The invariant is simple: a user may see a gradual future adjustment, but never a backwards cursor,
changed past word, audible-word-after-the-fact update, or stalled first audio.

## Implementation order

1. **Measurement validity, no UI change.** Add stream IDs, sequence/sample metadata, checksums,
   resampler calibration, and browser schedule traces to the lab.
2. **Causal offline replay.** Freeze model/normalizer versions and benchmark original PCM—not MP4
   decode—over the window/context grid, across held-out surviving voices and poets.
3. **Confidence and commit calibration.** Require overlapping-window agreement and measure both
   coverage and false-anchor rate on held-out data.
4. **Pure planner + replay.** Unit-test future-only monotonicity, correction caps, failures, and
   injected browser gaps; render fallback, shadow, correction, and phrase-certainty controls from
   the identical recording.
5. **Persistent worker, observe only.** Tee PCM asynchronously through the real relay and publish
   `ctcAnchor` telemetry without changing the production cursor.
6. **Debug-panel shadow mode.** Show fallback-vs-proposed divergence, anchor age, rejection reason,
   queue time, and model version for internal evaluation.
7. **Internal guarded correction.** Feature flag by voice, poem, and model; retain a circuit
   breaker and phrase-certainty fallback. Do not make it default until six paired live batches and
   blinded replay pass.

## Observability

For every proposed anchor, retain stream/poem/voice, source token index, sample time, browser
receipt time, window and queue duration, model/normalizer version, confidence, accepted/rejected
reason, fallback/proposed/applied boundary, correction horizon, and any monotonicity violation.
The Runs viewer should show anchors—including rejected ones—on the recorded timeline. Without this,
delivery variance can masquerade as algorithmic improvement.

## Anchor-contract prototype status

The POC now contains a functional browser-side `future-anchor` planner with **observe** and
**correct** modes. It begins with the production-equivalent transcript/mora weighted fallback,
records every proposed anchor, and permits a correction only for a safely past word with at least
150 ms of future horizon. A correction is capped at 120 ms, distributed across six future words,
and the unit checks prove that past boundaries remain unchanged and the plan stays monotonic.

Two live source checks are deliberately part of the prototype:

- Gemini output-audio transcript timings produced zero usable word anchors in the tested production
  relay stream, so both transcript-anchor modes remained a no-op. This is a result, not a missing
  fallback: the current event cannot be treated as a word-time source without separate evidence.
- A parallel Google Chirp streaming sidecar was wired to receive the same PCM and exercised in
  observe/correct modes. It exposed a relay failure (`ABORTED: Stream timed out after receiving no
  more client requests`) and emitted no anchors. The harness now records provider errors and bounds
  outstanding PCM-copy drain time so a stuck sidecar cannot block playback or test completion.

Therefore neither source is a CTC substitute or a candidate for correction. The next worker must
prove the stream protocol with sequence/sample accounting and produce anchors before the browser's
future horizon; otherwise the planner safely remains a no-op.

## Research constraints

CTC forced alignment produces constrained timestamps from frame emissions and a supplied token
sequence; it is not itself evidence of causal or online behavior. See PyTorch's
[forced-alignment tutorial](https://docs.pytorch.org/audio/2.4.0/tutorials/ctc_forced_alignment_api_tutorial.html).
The initial Arabic model is a lead, not an approved dependency; its model card reports a different
domain from Gemini poetry and must be validated on our held-out captures:
[Arabic Wav2Vec2 model card](https://huggingface.co/jonatasgrosman/wav2vec2-large-xlsr-53-arabic).
Google Chirp offsets are an audit reference, not a complete ground truth; Google documents offsets
as recognized-word timings and notes first-alternative behavior in its
[time-offset guidance](https://cloud.google.com/speech-to-text/docs/async-time-offsets).
