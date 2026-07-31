# Live Word-Sync POC

This standalone browser harness tests the recommended low-latency path: Gemini Live PCM begins
playing on its first streamed chunk, while a visual cursor reads the Web Audio playhead. It does
not import or depend on the product's existing word-highlighting code.

Run the Express API with `GEMINI_API_KEY` and database configuration, then start the included
same-origin development proxy:

```bash
node serve-poc.mjs
```

Open `http://localhost:5180`, load the fixed reference poem, and download the WAV
capture. The page intentionally labels its weighted Arabic word schedule as **estimated**: Gemini
Live supplies PCM but no word timestamps, so the demo validates low-latency playback-clock sync,
not word-boundary accuracy.

Every harness run uses production poem **#87443, “شهادة السريرة” by جبران خليل جبران** (7 lines).
It sends the raw production poem text with the production `LIVE_SYSTEM_INSTRUCTION`, default `Orus`
voice, and temperature `0`; these settings are imported from `src/`, rather than copied into the POC.

## Repeatable comparison harness

For the canonical add → capture → audit → view workflow, use [RUNBOOK.md](./RUNBOOK.md).

Keep the API and POC proxy running, then use one poem across all enabled strategies:

```bash
POC_URL=http://localhost:5181 npm run poc:compare
```

The runner saves the one-stream browser capture as a provenance WebM, converts it to a
QuickTime-friendly H.264/AAC MP4 for the Runs viewer, and writes a screenshot and one JSON report
per batch under `artifacts/comparisons/`. Limit a run with `POC_METHODS=weighted,vad`, or set
`POC_HEADED=1` to observe the browser while it records.

To migrate historical captures without deleting their original WebMs:

```bash
node convert-recordings-to-mp4.mjs
```

After a comparison, add a post-run word audit (this does not affect Live latency):

```bash
GOOGLE_CLOUD_PROJECT=your-project npm run poc:analyze -- artifacts/comparisons/poem-<id>-comparison.json
```

The analyzer extracts the recorded PCM and uses synchronous Google Chirp 3 word timestamps to
compare each recognized word with the visual-highlight timeline stored by the browser.

## Strategies in the Lab

- **Uniform word clock** is the intentionally naive baseline.
- **Arabic-weighted word clock** weighs letters and punctuation; it is the best zero-dependency
  word-level estimate.
- **Phrase-level clock** limits the visual promise to a whole verse, reducing conspicuous drift.
- **VAD phrase re-anchoring** detects quiet runs in the actual PCM and uses them to realign upcoming
  verse starts. It stays fast, but only finds pauses the voice actually makes.
- **Manual nudge** shifts only the visual clock in 250 ms increments, making heuristic error easy to
  audit while retaining the original audio schedule.

For genuinely time-aligned words, the next comparison is a parallel streaming STT tap (Google Cloud
STT or Deepgram) or rolling forced alignment. Those services can return word offsets, but require
their own credentials and introduce delayed corrections; do not block Gemini Live first audio on
them. The [CTC feasibility gate](./CTC_FEASIBILITY.md) is the explicitly staged path for testing a
local forced aligner against the same recorded captures before a causal sidecar is considered.
The [production integration plan](./CTC_PRODUCTION_PLAN.md) records the unproven architecture
assumptions, sample-clock contract, observe-only rollout, and falsification gates.
