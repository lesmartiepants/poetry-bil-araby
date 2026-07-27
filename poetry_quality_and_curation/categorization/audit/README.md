# Categorization audit — artifacts

Read-only audit of the poem categorization layer (coverage, duplication,
over-tagging) plus an opinionated distillation plan. Nothing here writes to the
DB or the pipeline.

Full findings + fix plan: [`ideas/categorization-audit.md`](../../../ideas/categorization-audit.md)

## Contents
- `prompts/current_classification_prompt_v2.md` — the production prompt the corpus
  was tagged with (caps 4/4/5), verbatim, for comparison.
- `prompts/distilled_classification_prompt.md` — the proposed prompt (caps 2/2/2,
  dominant-concept, one-per-synonym-family, confidence floor, rationale). Not yet
  wired into `config.py`.
- `queries/audit.sql` — the read-only SQL that reproduces every number in the audit.
- `samples/before_after.json` — a live 3-poem before/after (13 → 6 tags).
  **Illustrative only; not persisted to the DB.**
- `check_audit.mjs` — a lightweight diagnostic asserting the key facts.

## Run the check
```bash
# static only (distilled sample stays <= 6 tags) — no DB needed:
node poetry_quality_and_curation/categorization/audit/check_audit.mjs

# with live DB checks (coverage ~100%, avg labels > 6, a value on > 40% of poems):
DATABASE_URL="postgres://..." node poetry_quality_and_curation/categorization/audit/check_audit.mjs
```
It skips the DB checks gracefully (exit 0) when `DATABASE_URL` or `pg` is
unavailable, so it is safe to wire into CI. Exit 1 only on a real assertion failure.

## Reproduce the SQL
```bash
psql "$DATABASE_URL" -f poetry_quality_and_curation/categorization/audit/queries/audit.sql
```

## Status
Draft for later review. The substantive change — re-tagging the ~9k corpus with
the distilled prompt (rough $5–15) — is **held for user approval**.
