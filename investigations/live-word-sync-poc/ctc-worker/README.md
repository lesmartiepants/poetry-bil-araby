# Persistent Arabic CTC worker (POC)

This local service is the experimental anchor producer for the live word-sync
lab. It keeps `jonatasgrosman/wav2vec2-large-xlsr-53-arabic` warm in one Python
process, accepts scheduled 24 kHz PCM, and returns immutable word anchors for
audio that is at least 750 ms in the past.

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
{"transcript":"...Arabic poem...","sampleRateHertz":24000}
```

It returns a `sessionId`. Send every raw Gemini PCM chunk in order:

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

`seq` and `startSample24k` must be contiguous. `sampleCount24k`, when sent,
must exactly match decoded PCM. Each acknowledgement reports cumulative samples
and a rolling CRC32 of received PCM so the proxy can prove that the worker saw
the same byte stream. `sourceStartIndex` and
`sourceEndIndex` are required before an alignment job is queued. They must be a
conservative, externally predicted word range for the received audio. This is a
deliberate safety requirement: CTC cannot truthfully infer which subset of a
long poem a short rolling audio window contains without a text-range prior.

Poll new anchors without duplicates:

```text
GET /cues?session=<sessionId>&after=-1
```

A cue has `{word, sourceIndex, start, end, confidence, windowMs, queueMs,
emittedAt, final}`. `start`/`end` are seconds from the **first supplied PCM
sample**, not browser wall clock. `confidence` is currently `null`; the CTC
path posterior has not been calibrated, so consumers must treat all cues as
experimental. Stop and clean up with `POST /stop` then `POST /dispose`.

## What this prototype proves—and does not

- Persistent model loading and a sequenced PCM/sample-time transport.
- A single serialized alignment queue and observable metrics at `/status`.
- Monotonic source indices: once emitted, a source word is never revised.
- Only anchors ending at least 750 ms before the newest supplied audio can emit.

It does **not** yet implement true bounded sliding-window alignment. It aligns
the accumulated audio with the caller-supplied source range, so callers should
start with a small known phrase/range and rotate sessions/ranges. Its linear
24→16 kHz resampler is also feasibility DSP, not production-quality streaming
resampling. Most importantly, no cue can be called causal until the browser
records its arrival against the final Web Audio schedule.

## Validate the protocol

This requires no model download and makes no CTC quality claim:

```bash
/tmp/pba-arabic-ctc/bin/python3 ctc-worker/test_protocol.py
```

For a real-worker smoke test, start the service without `--mock`, call
`/status`, and replay a captured raw PCM stream with an intentionally bounded
source range. Audit resulting cues with Chirp/the existing Runs workflow before
enabling correction.
