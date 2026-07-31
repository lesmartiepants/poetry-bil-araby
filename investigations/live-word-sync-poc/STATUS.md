# Live Word-Sync Lab Status

## Scope and non-negotiables

This is an internal POC, not a second reader implementation. Gemini Live must play its first PCM
chunk immediately; the Web Audio scheduled playhead determines what is audible. Any alignment
signal may affect only a future visual state. The fixed comparison reference is poem **#87443**.
Because each Live generation can differ, cross-run scores screen candidates but do not establish a
causal winner unless the same PCM is replayed.

## Shipped baseline

Production source is `src/`, not this folder. At this document's update, production defaults to
`branch-transcript-moras` (**64.9% exact-word** in its held-out screen) and the `Charon` voice.
The lab defaults to that profile and imports the current production voice and prompt. Use
`transcript-moras-weighted-fallback` only as an explicit historical control; it is no longer the
production-equivalent default.

## Current evidence

- The transcript/mora family is the leading zero-extra-latency approach. The retained Runs data is
  a useful screen, not proof that any one method wins every voice or poem.
- The Runs viewer retains 21 audited runs: the strongest meaningful results, a production control,
  and one result from every strategy family. `npm run poc:prune` previews that policy; add
  `-- --apply` only after reviewing its table.
- Phrase/line certainty overlays are a UX alternative, not evidence of exact word timing. VAD,
  agreement, acoustic-nucleus, external-STT, and fixed-clock results remain comparison evidence,
  not candidates to ship without a paired replay.

## CTC decision: POC-only and rejected for production now

Offline CTC covered 39/39 tokens and reached 83 ms median / 122 ms P90 error across 211 matched
starts. The live path did not meet its causal gates: sidecar staleness was 972–1,135 ms P90 against
a <=750 ms target, and precision pre-roll yielded only 11/37 (13.5%) accurate-and-causal cues at a
4.2 s pre-roll. Keep the worker, sidecar, and precision mode in the POC only. Do not expose them in
the reader unless identical-PCM replay meets the gates in [CTC_FEASIBILITY.md](./CTC_FEASIBILITY.md).

## Resume a hypothesis

1. Start the API with its normal `GEMINI_API_KEY`, run `npm run poc:doctor`, then run `npm run poc:serve`.
2. Add one named profile and radio option; record its mechanism in `POC_SOLUTION_DESIGN`.
3. Capture it beside `branch-transcript-moras` with `npm run poc:compare`.
4. Audit the report with `npm run poc:analyze -- <report.json>`, then inspect **Runs**.
5. Run CTC protocol tests and deterministic replay before spending on new Live CTC captures.

See [RUNBOOK.md](./RUNBOOK.md) for copyable commands, [RESULTS.md](./RESULTS.md) for detailed
findings, [HYPOTHESES.md](./HYPOTHESES.md) for untested ideas, and
[ARCHIVED_REST_TIMING_HARNESS.md](./ARCHIVED_REST_TIMING_HARNESS.md) for the superseded local
REST-only harness.

## Artifact and branch hygiene

Generated recordings, credentials, model weights, and ADC data stay local and ignored. The retained
autoresearch corpus is a regression check, not general CTC evidence. The former timing-rollout,
timing-profile-leader, Leda, and exact-word timing worktrees are superseded by `main` or this POC;
do not revive their old branch histories wholesale.
