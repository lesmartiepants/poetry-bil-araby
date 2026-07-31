# Persistent Arabic CTC worker (POC)

This local service is the experimental anchor producer for the live word-sync
lab. It keeps `jonatasgrosman/wav2vec2-large-xlsr-53-arabic` warm in one Python
process, accepts scheduled 24 kHz PCM, and returns immutable word anchors for
audio that is at least 750 ms in the past. It also supports a **precision
phrase** flow: buffer a complete phrase before playback, stop the session, and
use its final bounded-range alignment before the phrase is ever scheduled.

It does **not** control playback, emit timestamps from Gemini, or claim that a
cue is usable by the browser. The browser must compare `emittedAt` with its own
Web Audio sample clock and only use a cue to alter still-future highlights.

## Run locally

The currently prepared isolated environment is intentionally outside the repo:

```bash
/tmp/pba-arabic-ctc/bin/python3 ctc-worker/worker.py --port 8791
```

Wait for `modelState: "ready"`, then inspect it:

```bash
curl http://127.0.0.1:8791/status
```

The model is loaded once at process startup. Do not put this process or model in
a Vercel/serverless request handler.

## HTTP contract

Start a stream with the exact source text used for TTS:

```json
POST /start
{
  "transcript":"...Arabic poem...",
  "sampleRateHertz":24000,
  "pcmBaseSample24k":48000,
  "sourceStartIndex":7,
  "sourceEndIndex":12,
  "alignmentStartSample24k":48000,
  "alignmentEndSample24k":84000
}
```

It returns a `sessionId`. `pcmBaseSample24k` is optional (defaults to `0`),
but is the absolute sample offset of the first chunk for a phrase session. The
returned cue sample fields retain that offset. The source range is optional at
start, but a worker will not queue CTC without it. Send every raw Gemini PCM
chunk in order:

```json
POST /chunk
{
  "sessionId":"...",
  "seq":0,
  "startSample24k":0,
  "sampleCount24k":24000,
  "checksum":"crc32-of-this-pcm-chunk",
  "audio":"<base64 pcm_s16le mono>",
  "sourceStartIndex":0,
  "sourceEndIndex":8
}
```

`seq` and `startSample24k` must be contiguous from `pcmBaseSample24k`.
`sampleCount24k` and the per-chunk CRC32 `checksum` must exactly match decoded
PCM. Each acknowledgement returns a _rolling_ CRC32 of received PCM so the
proxy can prove it saw the same byte stream.

Set or rotate a phrase range explicitly (rather than sneaking a range change
into a data chunk):

```json
POST /range
{
  "sessionId":"...",
  "sourceStartIndex":12,
  "sourceEndIndex":17,
  "alignmentStartSample24k":96000,
  "alignmentEndSample24k":132000
}
```

`alignmentStartSample24k` is the first PCM sample belonging to that text range.
`alignmentEndSample24k` is an optional **exclusive** phrase end. It lets a
client align exactly `[start, end)` rather than every later PCM sample in the
stream. The start must already be in received PCM; an end beyond the current
received PCM is accepted but no job is queued until contiguous PCM reaches it.
When omitted, the current received end remains the window end (the legacy live
behavior). A range that includes an already emitted source word cannot be
replaced. This is a deliberate safety requirement: CTC cannot truthfully infer
which subset of a long poem a short rolling audio window contains without a
text-range prior.

Poll new anchors without duplicates:

```text
GET /cues?session=<sessionId>&after=-1
```

A cue has `{word, sourceIndex, start, end, startSample24k, endSample24k,
alignmentStartSample24k, alignmentEndSample24k, stable, stabilityPasses, confidence, windowMs,
queueMs, emittedAt, final}`. `start`/`end` are seconds from this alignment
range's first PCM sample; `startSample24k`/`endSample24k` are the authoritative
absolute source-stream coordinates for the browser's scheduled PCM trace.

For a live/unplayed-later phrase, normal emission requires two growing-window
alignments to agree within 80 ms (`stable: true`, `stabilityPasses >= 2`) and
the word to end at least 750 ms in the audio past. A stopped phrase emits its
final bounded alignment even if it is not stable, because its caller has not
scheduled the audio yet; consumers should record `final` and not claim a live
causal result from that exception. `confidence` is currently `null`; CTC path
posteriors are not calibrated. Stop and clean up with `POST /stop` then
`POST /dispose`.

## What this prototype proves—and does not

- Persistent model loading and a sequenced PCM/sample-time transport.
- A single serialized alignment queue and observable metrics at `/status`.
- Monotonic source indices: once emitted, a source word is never revised.
- Absolute sample-domain cue coordinates, including phrase/session base offset.
- Explicit range revisions, optional bounded phrase endpoints, and a two-pass,
  80 ms overlap-stability signal.
- Live anchors only when their end is at least 750 ms before newest audio;
  stopped, unplayed phrase sessions may emit their final complete range.

It does **not** yet implement a true fixed-size sliding CTC window; it aligns
all PCM since `alignmentStartSample24k` (or the bounded `[start,end)` slice)
with the caller-supplied phrase range. For this prototype, use short phrase
sessions/ranges and rotate before memory or inference grows. Its linear 24→16 kHz resampler is feasibility DSP, not
production-quality streaming resampling. Stability is agreement between two
growing-input passes, not calibrated confidence or a proof of correctness.
Most importantly, no cue can be called causal until the browser records its
arrival against the final Web Audio schedule.

## Validate the protocol

This requires no model download and makes no CTC quality claim:

```bash
/tmp/pba-arabic-ctc/bin/python3 ctc-worker/test_protocol.py
```

For a real-worker smoke test, start the service without `--mock`, call
`/status`, and replay a captured raw PCM stream with an intentionally bounded
source range. Audit resulting cues with Chirp/the existing Runs workflow before
enabling correction.
