# Precision Recitation POC

This is an intentionally slower alternative to the instant Mora-50 experience. It is **not** wired
into the production reader.

## What is implemented

`ctc-precision-phrase` receives Gemini PCM, keeps it out of Web Audio until an opening bounded
phrase is ready, and tees the exact bytes to a persistent local Arabic CTC worker first. The worker
requires contiguous sequence/sample/CRC32 input and returns stable word cues in absolute 24 kHz
sample coordinates. The browser maps those cues onto its own scheduled PCM trace and directly
highlights only words that are still at least 150 ms in the future. Already-played or too-near
words remain on the immutable Mora-50 fallback.

The first phrase starts only after six stable cues arrive or the configured deadline expires. The
worker can rotate into a next six-word source range using the prior phrase's final sample and a
bounded eight-second PCM window. Each bounded window must be observed twice within 80 ms before a
cue is considered stable.

Run the worker, then the lab:

```bash
/tmp/pba-arabic-ctc/bin/python3 ctc-worker/worker.py --port 8791
POC_PORT=5304 POC_API_ORIGIN=http://127.0.0.1:3001 \
  POC_POEM_API_ORIGIN=http://127.0.0.1:3001 CTC_WORKER_URL=http://127.0.0.1:8791 \
  node serve-poc.mjs
```

Audit a captured comparison with:

```bash
GOOGLE_CLOUD_PROJECT=... npm run poc:analyze -- artifacts/comparisons/<report>.json
npm run poc:precision:eval -- artifacts/comparisons/<report>.json \
  --method ctc-precision-phrase --prebuffer-ms 4200
```

The evaluator uses actual highlight transition events and a same-recording Chirp oracle replay. Its
100% row is a mathematical upper bound, never evidence that live CTC achieved 100%.

## Dogfood result and decision

The worker/protocol path works: a bounded opening window emitted six stable sample-domain cues;
the rotating experiment emitted cues for additional ranges without byte-stream or model failures.
On the direct-opening run (`20260729T004538083Z-59641b31`), five opening cues were comparable to
Chirp; four were within ±80 ms (median absolute start error 10 ms, P90 80.2 ms). That is promising
**local phrase alignment**.

It is not a viable precision recitation yet. In the rotating live dogfood
(`20260729T004937011Z-8c333bc8`), only 11/37 audit-comparable words (13.5%) were both accurate and
available early enough under a 4.2-second pre-roll. The event-level rendered score was 6/37 (16.2%)
with P90 onset error 4.5 s. Separately generated Live deliveries vary, so neither this number nor
the standalone Mora scores are a causal product comparison; the causal-coverage gate is the key
failure.

The current ceiling is therefore **coverage and phrase-final latency**, not basic sample mapping.
Do not increase the delay further as a product fix. The next credible path is identical-PCM replay
with a genuine fixed-size sliding aligner, phrase boundaries from VAD plus source lines, calibrated
confidence, and a concurrent per-phrase worker queue. Do not ship or expose this mode outside the
lab until it reaches at least 80% causal cue coverage and wins the identical-PCM event-level audit.
