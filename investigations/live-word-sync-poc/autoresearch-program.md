# Word-sync autoresearch contract

This is a deliberately narrow adaptation of Karpathy's `autoresearch` pattern. It searches a
fixed evidence corpus for an acceptable **CTC cue policy**. It is not allowed to fabricate
timestamps, change production code, change a captured recording, or call a cloud API.

## Fixed inputs — never modify

- `autoresearch-corpus.json`: the retained immutable CTC capture for poem #87443. It is a
  regression check only; one capture is not evidence of a generally valid CTC policy.
- `precision-replay-eval.mjs`: the evidence evaluator. Chirp data in its source reports remains
  post-run audit data only.
- Raw reports and recordings in `artifacts/comparisons/`.
- The Gemini prompt, voice, PCM, source text, and CTC cues inside every capture.

## Sole mutable surface

Edit only `autoresearch-candidate.json`. A candidate can change:

- `prebufferMs` — how long visual/audio pre-roll the policy permits;
- `safetyMs` — an explicit late-cue safety margin;
- policy acceptance gates.

Do not alter the corpus or evaluator to improve a result. Do not add timestamps from Chirp to a
candidate. Such a result is an oracle and must be rejected.

## Run and decision rule

Run `npm run poc:autoresearch` from the worktree root. It writes an ignored, immutable timestamped
report, TSV ledger, Markdown summary, and SVG progress chart under
`investigations/live-word-sync-poc/artifacts/autoresearch/`.

A policy is retained for a fresh Live validation only when all of these hold across the fixed
corpus:

1. Mean causal CTC coverage is at least 80%.
2. No individual capture is below 60% causal CTC coverage.
3. Cue P90 error is at most ±80 ms.
4. Pre-roll is at most 2 seconds.

The runner records every candidate, including discards. A discard means the policy is not ready;
it does not erase the evidence. Fresh Gemini Live captures may validate a retained policy, but must
never be used as its sole optimization signal because delivery is stochastic and billable.
