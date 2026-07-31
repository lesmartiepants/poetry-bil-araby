# Karaoke global-search contract

This harness searches for the strongest **observed** karaoke-highlighting candidate without
pretending that a stochastic Gemini Live capture establishes a global optimum. It borrows the
fixed-harness / retained-evidence discipline from `autoresearch`, but uses the existing POC
recordings and Chirp audit rather than a training loss.

## Search space

Every audited method in `artifacts/comparisons/*-comparison.json` is included. Candidates are
grouped into deliberately different mechanism families: transcript/prosody, fixed clocks, VAD,
acoustic nuclei, agreement, external STT, CTC, and perceptual overlays. A high score from a
one-off exploratory run is visible but cannot win the confirmed leaderboard.

## Anti-local-maximum rules

1. Split by **poem × voice cohort**, never individual result, into deterministic train and holdout
   partitions. A fresh delivery for one cohort cannot appear in both partitions.
2. Rank by held-out karaoke score: 80% exact single-word state at audited speech starts, 10% near
   word state, and 10% source coverage. First-audio P90 is a separate hard viability gate.
3. Compute the Pareto frontier over held-out karaoke score and latency. Keep a diverse portfolio,
   not five small variations of one clock.
4. Mark anything with insufficient train/holdout evidence as `needs-validation` or `exploratory`,
   never as a winner.
5. The generated Phase-2 campaign is a queue only. Before a production decision, replay the same
   captured PCM/transcript-event trace through every finalist, then use new Live deliveries only
   as confirmation samples.

## What this cannot prove

The current corpus contains separately generated Live deliveries. It can broadly eliminate weak
families and nominate a robust portfolio, but it cannot prove that a candidate beats another on
identical audio. A future exact-replay runner is therefore required for a true global maximum.

## Run

From the worktree root:

```sh
npm run poc:global-search
```

The command writes an ignored immutable bundle under `artifacts/global-search/<tag>/` containing
a JSON result, TSV leaderboard, Markdown decision note, candidate campaign, and SVG chart.
