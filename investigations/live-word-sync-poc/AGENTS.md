# Repository Guidelines

## Purpose and Boundaries

This folder investigates low-latency Arabic word highlighting with Gemini Live. Do not import, copy,
or modify the shipped reader highlighter here. The POC records scheduled PCM with its visual cursor
so timing claims can be audited.

## Fixed Reference and Production Parity

All automated comparison runs use production poem **#87443**, _شهادة السريرة_ by جبران خليل جبران
(seven lines). Keep this invariant unless the experiment explicitly changes its reference. The ID
lives in `serve-poc.mjs`; `compare-methods.mjs` rejects a different returned poem. The server
imports `LIVE_SYSTEM_INSTRUCTION` and `DEFAULT_VOICE` from `src/`, so Live TTS uses the production
prompt, raw Arabic text, current production voice, and temperature `0`.

## Key Files

- `poc.js` plays PCM, records the canvas/audio stream, and stores a highlight timeline.
- `serve-poc.mjs` serves the POC, proxies `/api/`, provides Google STT sessions, and exposes run
  artifacts.
- `compare-methods.mjs` drives repeatable Playwright runs, preserves a WebM source capture, and
  writes an H.264/AAC MP4 for playback plus reports.
- `convert-recordings-to-mp4.mjs` performs the same safe, non-destructive migration for historical
  recordings.
- `analyze-comparison.mjs` extracts recorded audio and audits it with post-run word timestamps.

## Runs Viewer

The **Runs** tab in `index.html`/`poc.js` renders only reports for the fixed reference poem. Each
card contains the synchronized MP4, first-audio latency, durations, an audit result, and expandable
spoken-word → highlighted-word samples.
`serve-poc.mjs` exposes report JSON and safe artifact files through `/runs/artifact`; preserve the
basename validation when adding file types. Refresh the tab after a run or audit—reports are read
from disk, not browser state. Verify UI changes with a browser check that opens **Runs**, confirms
the expected cards, and plays a recording without clipping its audit header.

## Discovery Workflow

The compact **Discovery workflow** panel is a hypothesis generator, not an experiment runner. Its
Gemini route asks independent timing, Arabic-alignment, perceptual-UX, and cross-domain research
lenses for proposals, then asks a critic to produce a diverse shortlist. It also exposes a
provider-agnostic Codex research prompt. Treat model-provided research references as leads to verify
against primary sources; do not represent them as evidence. A selected idea becomes a copyable brief:
implement one named POC profile, run it beside a control, and append its captured and analyzed result
before drawing a conclusion. Never let this panel write production reader code or ledger entries.

When running a research-derived strategy, pass `POC_SOLUTION_DESIGN` with the mechanism and intended
trade-off. The comparison script stores it in the immutable report, both ledger events, and the Runs
card; use it to mark a design as retained, rejected, or UX-only rather than silently retuning it.

## Running and Auditing

Start the backend with its production-like environment, then run `npm run poc:serve`; it chooses an
available local port and prints the matching `POC_URL` command. Use an explicit `POC_PORT` only when
a fixed port is required.

Run all enabled strategies with `POC_URL=http://localhost:5181 npm run poc:compare`, or select
methods with `POC_METHODS=weighted,vad,google`. Audit a report with
`GOOGLE_CLOUD_PROJECT=... npm run poc:analyze -- artifacts/comparisons/poem-87443-comparison.json`.

The analyzer is deterministic, not an LLM judge: Google Chirp 3 returns post-run word timestamps;
the script compares each conservatively matched source word to the recorded highlight span at that
time. Treat unmatched STT words as uncertain transcription differences, not automatic UI failures.

## Safety

Never commit `.env`, ADC credentials, or API keys. Production database access for this POC is
read-only. Keep generated recordings in `artifacts/comparisons/` and verify timing captures use one
MediaRecorder stream rather than muxed audio and video.
