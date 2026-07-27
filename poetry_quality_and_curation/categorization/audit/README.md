# Categorization audit + distillation implementation

Audit of the poem categorization layer (coverage, duplication, over-tagging) plus
the **implemented** distillation change. The audit artifacts here are read-only;
the pipeline changes live one level up in `config.py`, `classify_poems.py`, and
`import_categories.py`. Two runtime steps are **held for approval** (below):
applying the migration and running the mass re-tag. Nothing in this PR writes to
the DB or runs the classifier against prod.

Full findings + fix plan: [`ideas/categorization-audit.md`](../../../ideas/categorization-audit.md)

## What the implementation changes (already in this PR)
- `config.py` — distilled prompt (dominant-concept, one label per synonym family,
  `rationale`); caps **2/2/2** (`MAX_LABELS_PER_DIM`); `CONFIDENCE_FLOOR = 65`;
  `DIMENSION_MIN_LABELS` (required/optional contract); `SYNONYM_GROUPS`;
  `TAXONOMY_VERSION = "3"` + `PROMPT_VERSION`; default model fixed to
  `gemini-3.6-flash`.
- `import_categories.py` — applies the confidence floor at import
  (`config.apply_confidence_floor`), filtering both `poem_categories` and the
  `categories` JSONB so they stay consistent; stamps `prompt_version` + `rationale`.
- `classify_poems.py` — emits `rationale` + `prompt_version` in the parquet.
- `supabase/migrations/20260727000000_categorization_v3_distillation.sql` — adds
  `min_labels` / `max_labels` to `category_dimensions`; documents `accessibility_level`.
- `classify_new.sh` — categorizes only new/unclassified poems (coverage for inserts).
- `test_distillation.py` — unit tests for caps, the floor, and prompt/seed consistency.

## Audit artifacts (read-only)
- `prompts/current_classification_prompt_v2.md` — the production prompt the corpus
  was tagged with (caps 4/4/5), verbatim, for comparison.
- `prompts/distilled_classification_prompt.md` — the distilled prompt; now
  **implemented** in `config.build_classification_prompt()` (this file is the
  human-readable spec).
- `queries/audit.sql` — the read-only SQL that reproduces every number in the audit.
- `samples/before_after.json` — a live 3-poem before/after (13 → 6 tags).
  **Illustrative only; not persisted to the DB.**
- `check_audit.mjs` — a lightweight diagnostic asserting the key facts.

## Run the unit tests (no DB)
```bash
python poetry_quality_and_curation/categorization/test_distillation.py     # standalone
pytest poetry_quality_and_curation/categorization/test_distillation.py -q   # or via pytest
```

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

## Runbook — HELD steps (run ONLY after user approval)

These are the two runtime steps this PR intentionally does **not** perform. Run
them, in order, once approved. Both need `DATABASE_URL` and `GEMINI_API_KEY` in
the environment (never echo the values).

### 1. Apply the v3 migration (adds min/max_labels; documents accessibility_level)
```bash
# HELD — applies schema changes to the shared DB.
supabase db push
# or, to apply just this file against a connection string:
psql "$DATABASE_URL" -f supabase/migrations/20260727000000_categorization_v3_distillation.sql
```

### 2. Re-tag the corpus with the distilled prompt (~$5–15)
```bash
# --- 2a. PREVIEW first: 50 poems, no DB writes (parquet only) ---
python -m poetry_quality_and_curation.categorization.classify_poems \
  --model gemini/gemini-3.6-flash --scope top --top-k 50 --resume \
  --output poetry_quality_and_curation/categorization/data/preview_distilled.parquet
python -m poetry_quality_and_curation.categorization.import_categories \
  --input poetry_quality_and_curation/categorization/data/preview_distilled.parquet --dry-run

# --- 2b. HELD — full re-tag of all ~9k poems, then import + century backfill ---
python -m poetry_quality_and_curation.categorization.classify_poems \
  --model gemini/gemini-3.6-flash --scope all --resume --max-cost 15 \
  --output poetry_quality_and_curation/categorization/data/categories_distilled_v3.parquet
python -m poetry_quality_and_curation.categorization.import_categories \
  --input poetry_quality_and_curation/categorization/data/categories_distilled_v3.parquet
python -m poetry_quality_and_curation.categorization.import_categories --backfill-century
```
`--resume` + `--max-cost` make the run restartable and cost-capped. The import is
idempotent per poem (delete-then-insert), so re-running is safe.

### 3. New-insert coverage (ongoing) — NOT scheduled here
```bash
# categorize only poems inserted since the last run (idempotent, cheap):
./poetry_quality_and_curation/categorization/classify_new.sh
```
Schedule this nightly once approved (cron / Render / GitHub Actions). See the
header of `classify_new.sh` for an example crontab line. It is **not** wired to
any scheduler in this PR.

## Status
Implementation PR (draft) for later review. The two runtime steps above — apply
the migration and run the mass re-tag (~$5–15) — are **held for user approval**.
The code, migration file, tests, and runbook are complete and verified.
