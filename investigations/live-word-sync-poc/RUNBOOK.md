# Live Word-Sync POC Runbook

Use this lab to add one timing hypothesis, capture it beside a control, audit how many spoken
words the visual cursor matched, and inspect the synchronized recording.

## One-time prerequisites

- Run from the `feature/investigation` worktree.
- The Express API must be available at `http://127.0.0.1:3001` with `GEMINI_API_KEY`.
- Auditing additionally needs Application Default Credentials and `GOOGLE_CLOUD_PROJECT` for
  Google Chirp 3. Never put credentials or API keys in command history, source, or artifact
  reports.

## Start a lab server

```bash
npm run poc:serve
```

The command prefers <http://127.0.0.1:5181>, then selects the next free local port and prints the
exact URL plus a ready-to-copy `POC_URL=... npm run poc:compare` command. Set `POC_PORT` only when
you specifically need a chosen port; it then fails safely if unavailable.

## Add an option

1. Add a named profile to `poc.js` (`PROFILES`). State its mechanism and fallback explicitly.
2. Add the matching radio option in `index.html`.
3. Keep poem #87443, the production Gemini Live prompt, `Orus`, and temperature `0` unchanged.
4. Put the hypothesis and trade-off in `POC_SOLUTION_DESIGN`; it is saved with every run.

## Example: run a new Mora-50 variation beside the production control

```bash
POC_URL=http://127.0.0.1:<printed-port> \
POC_METHODS=branch-transcript-moras,transcript-mora-blend-50 \
POC_PHASE=mora-50-example \
POC_HYPOTHESIS='A 50% mora / 50% even word allocation improves exact word matching without delaying first audio.' \
POC_SOLUTION_DESIGN='Fixed production poem and Live voice; compare the shipped transcript-mora control against a verse-local 50/50 mora/even schedule.' \
npm run poc:compare
```

The final JSON line prints the report path. Preserve it; it is the batch's immutable capture
record. The command writes a one-stream WebM, an MP4, screenshot, metrics, and report under
`artifacts/comparisons/`.

## Audit and read the result

```bash
GOOGLE_CLOUD_PROJECT=your-project \
npm run poc:analyze -- artifacts/comparisons/<report>.json
```

The audit adds these fields for each method:

| Field                                 | Meaning                                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| `coveredWordCount / matchedWordCount` | Spoken words whose Chirp timestamp fell inside the rendered highlight.                   |
| `exactWordCount` / `exactRate`        | Of the matched words, how often exactly one correct source word was active.              |
| `qualityScore`                        | Historic broad comparison score; use exact rate and matched count for karaoke decisions. |
| `examples`                            | Per-word evidence: spoken word/time, highlighted word/index, and offset.                 |

Open the URL printed by `poc:serve`, choose **Runs**, and refresh. Each retained card has the MP4,
first-audio latency, parameters/design note, score, and expandable spoken-word → highlighted-word
samples. Do not compare unaudited cards as timing evidence.

## Retention cleanup

Preview the cleanup first:

```bash
npm run poc:prune
```

Then apply it only when the displayed retained runs look right:

```bash
npm run poc:prune -- --apply
```

The policy retains the top 12 individual runs, the highest exact-word run in every strategy family,
and the production control; it deletes all other local run recordings and compacts the ledger.
