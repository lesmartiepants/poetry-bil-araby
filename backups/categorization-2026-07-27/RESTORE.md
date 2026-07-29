# Categorization backup — 2026-07-27

Full snapshot of the reader-facing categorization layer, taken **before** the
distillation re-classification (v2 → v3). This is the safety net that makes the
merge fully reversible.

## What's here

| File                                                                           | Rows       | What it is                                                                                                                                                                         |
| ------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `poem_categories.json`                                                         | 68,838     | Every normalized link (`poem_id, value_id, confidence, model, created_at`). The authoritative query path.                                                                          |
| `poems_categorization.json`                                                    | 9,072      | Per-poem categorization columns: `mood_primary, emotional_intensity, accessibility_score, accessibility_level, century, categorized_at, categorization_model, categories` (JSONB). |
| `category_dimensions.json` / `category_values.json` / `category_families.json` | 3 / 44 / 7 | Taxonomy snapshot, so a restore can resolve `value_id` even if the taxonomy is re-seeded.                                                                                          |
| `meta.json`                                                                    | —          | Timestamps, file sizes, and integrity fingerprints (avg 7.588 labels/poem).                                                                                                        |

State captured: **68,838 links across 9,072 poems, avg 7.588 labels/poem.**

## Restore (full reversal)

Both scripts read `$DATABASE_URL` from the repo `.env` (never printed). Run from
the **main repo root** (`/Users/siraj/github/poetry-bil-araby`).

```bash
# 1. Dry run — prints what would be restored, makes no changes:
node backups/categorization-2026-07-27/_restore.cjs

# 2. Apply — restores in ONE transaction (rolls back on any error):
node backups/categorization-2026-07-27/_restore.cjs --apply
```

The restore, transactionally, for every poem in the backup:

1. deletes its current `poem_categories` rows and re-inserts the backed-up rows verbatim;
2. writes the backed-up scalars + `categories` JSONB back onto `poems`.

Poems absent from the backup are left untouched. After `--apply` it re-counts
the restored links and reports them against the backup's 68,838.

## Re-create this backup

```bash
node backups/categorization-2026-07-27/_backup.cjs
```

Read-only; overwrites the JSON files in this directory with current DB state.
