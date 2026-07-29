# CTC Forced-Alignment Feasibility Gate

This is a **gated, offline experiment**, not a live highlighting strategy. Gemini Live sends PCM
chunks without word timestamps. The browser must schedule and play its first chunk immediately;
the Web Audio playhead remains the source of truth for what is audible. A CTC aligner is only
allowed to refine words that are still in the future.

## Candidate design

```text
scheduled 24 kHz PCM
├─ Web Audio + current fallback/mora cursor
└─ optional CTC sidecar
     → 16 kHz resample + sample-time map
     → overlapping CTC emissions and constrained trellis
     → high-confidence committed lexical anchor
     → bounded correction of future words only
```

The proposed production sidecar will tee PCM **after** it has been scheduled. It must never delay
first audio, move the cursor backward, or publish a word after that word is audible. The current
workflow tests the underlying alignment accuracy and runtime offline before any live integration is
considered.

## Offline workflow

Use an existing, Chirp-audited capture. The command extracts its audio to 16 kHz WAV, writes the
fixed poem transcript, and records a reproducible input manifest. It does not call a model unless
an adapter executable is supplied.

```bash
npm run poc:ctc -- artifacts/comparisons/poem-87443-<batch>-comparison.json --prepare-only
```

To test an adapter, provide an executable implementing this contract:

```bash
CTC_ALIGNER=/absolute/path/to/ctc-adapter \
  npm run poc:ctc -- artifacts/comparisons/poem-87443-<batch>-comparison.json
```

The lab invokes it without a shell as:

```text
ctc-adapter --audio INPUT.wav --transcript INPUT.txt --language ar --output OUTPUT.json
```

Its output must be JSON with an adapter/model identity and monotonic word cues:

```json
{
  "adapter": "name-and-version",
  "model": "model-id",
  "words": [
    { "word": "مثالي", "start": 0.02, "end": 0.40, "confidence": 0.91 }
  ]
}
```

`sourceIndex` is optional but preferred. Without it, the lab uses the same conservative,
forward-only Arabic normalization and matching used by the Chirp audit. Each invocation writes a
separate `*.ctc-feasibility.json` result beside the recording. An adapter result is compared only
to the report's existing post-run Chirp timestamps; Chirp is never on the live playback path.

## What must pass before a live spike

1. The selected Arabic CTC model covers 100% of normalized tokens in the fixed poem.
2. Across at least six independent Gemini captures, its median word-start error is at most 120 ms
   and P90 is at most 250 ms against Chirp.
3. A 1.5–2 second overlapping window has P95 alignment time at most 300 ms with no growing queue.
4. A committed lexical anchor is available within 750 ms of its audio time.
5. In paired live batches, first audible audio regresses by no more than 50 ms P95.
6. Six paired batches improve median displayed offset by at least 40 ms and 15%, without P90
   regression, a highlight reversal, or a late-published word.

A single report can only falsify a candidate or provide a preliminary result; it can never pass the
six-capture/live gates. Keep all captures, adapter versions, model IDs, and timing output in the
generated feasibility result so later comparisons remain reproducible.

## Initial local pilot: retained for the next gate

The isolated Wav2Vec2 candidate was run offline on six independent fixed-poem Gemini captures that
already had Chirp audits. It mapped all 39 source tokens on each comparable capture. Across 211
conservatively matched Chirp word starts, the pooled median absolute start error was **83 ms** and
P90 was **122 ms**. That is promising enough to retain the candidate for a warm-window test; it is
not evidence of live correctness.

The probe was a whole-recording process that loaded the model on every invocation, taking roughly
5.2–5.7 seconds end-to-end. It therefore fails to demonstrate the required 1.5–2 second,
overlapping, warm-sidecar window latency. It also has no confidence calibration, causal commit
logic, or live highlight correction. The next irreversible-work-minimizing step is a persistent
local worker that measures only the warm, bounded window before any browser or production code is
changed.

The detailed production assumptions and the experiment sequence that tests them are in
[CTC_PRODUCTION_PLAN.md](./CTC_PRODUCTION_PLAN.md). In particular, short-window accuracy, anchor
timeliness at the browser, confidence calibration, browser sample-clock mapping, and perceptual
benefit all remain unproven.

## Persistent sidecar dogfood: transport works; correction gate fails

The next step was implemented only inside this POC: a local persistent worker plus browser proxy,
with `ctc-anchor-observe` and `ctc-anchor-correct` runs beside the unchanged
`transcript-moras-weighted-fallback` control. The browser schedules each PCM chunk before teeing
it, serializes the tee, and verifies the worker's contiguous sequence, cumulative sample count,
per-chunk CRC32, and rolling CRC32 acknowledgement. The audit now uses event-level rendered
single-word highlight transitions rather than the older 50 ms sampled timeline.

In live batch `20260729T000918493Z-2711e4ea`, the worker emitted and the browser accepted all six
anchors for the opening bounded phrase; every accepted anchor had at least 150 ms of future
horizon. That proves the local transport, sample-time mapping, cue holdback, and future-only
planner can operate end to end without waiting for full TTS.

It does **not** pass the quality gate. Accepted-anchor staleness was median/P90 **618/972 ms** in
observe mode and **805/1,135 ms** in correction mode, exceeding the 750 ms requirement. The
post-run Chirp word-start audit found 10/36 (27.8%) exact rendered-word matches for the separately
generated fallback control, 15/35 (42.9%) for observe, and 7/36 (19.4%) for correction. Observe is
not a causal improvement because Gemini generated a different delivery; correction is a direct
negative signal for this run. The worker also logged an early short-window alignment failure, and
it currently covers only the first six words rather than rotating a bounded text range.

Keep this worker in shadow/POC only. The next warranted experiment is deterministic replay of the
same raw PCM into fallback/observe/correct, followed by sliding-window range rotation and
overlapping-window agreement. Do not expose CTC correction in the production reader until those
experiments meet the gates above.

## Research lead, not an approved dependency

The first candidate should be an Arabic-capable Wav2Vec2 CTC model, tested in an isolated local
environment. `jonatasgrosman/wav2vec2-large-xlsr-53-arabic` is one lead because WhisperX maps
Arabic to it for alignment; that mapping is not evidence that it meets the gates above. PyTorch's
[CTC forced-alignment tutorial](https://docs.pytorch.org/audio/2.1/tutorials/ctc_forced_alignment_api_tutorial.html)
documents the trellis mechanism, and the [WhisperX Arabic alignment mapping](https://github.com/m-bain/whisperX/blob/main/whisperx/alignment.py)
documents the model lead. No model weights, credentials, or Python environment belong in this
repository.
