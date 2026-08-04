# Database Migrations

Applied in filename order. Everything here is idempotent — re-running a
migration is a no-op, so `supabase db push` and `npm run db:setup` are both safe
to repeat.

## Bringing up a database from scratch

```bash
npm run db:setup            # local Postgres, creates the DB and applies everything
npm run db:seed             # loads the fabricated test fixtures
LOCAL_DATABASE_URL=postgresql://localhost:5432/mydb npm run db:setup
```

For a hosted Supabase project, `supabase db push` does the same thing. Do not
seed a hosted project — `db:seed` refuses a Supabase URL, and the SQL itself
aborts on any database that already holds a non-fixture poem.

`db:setup` alone gives you the **schema only**. `db:seed` then loads
`supabase/seed/fixtures.sql`: 26 invented poems by 8 invented poets, none of it
derived from the real corpus. See "Test fixtures" below.

`db:setup` also creates minimal stand-ins for the Supabase-managed pieces that
live outside `public` (the `auth` schema, `auth.uid()`, and the
`anon`/`authenticated`/`service_role` roles), because several migrations
reference them and a bare Postgres has none of it.

## The base schema

`20260101000000_base_poetry_schema.sql` creates `poems`, `poets`, the six lookup
tables they key into (`eras`, `meters`, `patterns`, `rhymes`, `themes`, `tags`),
the `tag_type` enum, `normalize_arabic_text()` — which the `poems.search_vector`
generated column depends on — and the reporting views.

It exists because every other migration only ever _alters_ `poems` and `poets`.
Those tables originally arrived with the 84k-poem import, whose SQL is gitignored,
so before this file a fresh database died on the first `ALTER TABLE poems`.

Regenerate it from the live database with:

```bash
npm run db:dump-schema      # needs DATABASE_URL (pooler host) and pg_dump 17
```

That is a schema-only `pg_dump` filtered to objects no other migration creates,
then rewritten to be re-runnable. It never dumps rows.

## Where the poems live

The corpus import (`*_import_poetry.sql`, ~118MB) is gitignored on purpose and
is **not** the same thing as the base schema migration. Ask a maintainer for it,
or run the app in AI mode, which needs no database at all.

It stays out of the repo for licensing reasons as much as size: the rows carry
AI-generated English translations and categorization produced by this project's
own pipelines, quality scores, and third-party `poets.bio` prose. The classical
Arabic is public domain; those layers are not clearly ours to publish, and the
upstream dataset's licence has not been verified here.

The lookup tables also come up empty from migrations alone. `poems` and `poets`
have FKs into them, so loading poem data means loading the reference rows first —
both are in the import.

## Test fixtures

`supabase/seed/fixtures.sql` (`npm run db:seed`) sidesteps all of the above by
being **fabricated**. Nothing in it was copied, sampled, or derived from the
corpus:

- 8 poets named شاعر/شاعرة الاختبار ("Test Poet N"), with bios that say so
- 26 poems titled قصيدة اختبار, whose Arabic content states that it is test data
- every poem row carries `source_dataset = 'fixture'`, so one query separates
  fixtures from anything real

The lookup tables (`eras`, `meters`, `rhymes`, `themes`) _are_ seeded with real
values, because the names of the classical metres, the rhyme letters and the
conventional أغراض are factual taxonomy rather than authored work. The subset is
smaller than production's (10/44/47/35) and the ids are fixture-local.

The shape is chosen to exercise the schema, not to look like a library: poems
with and without categorization, ~23% with a NULL century, a spread of
`accessibility_score` and `emotional_intensity`, `poem_categories` rows across
all three dimensions honouring the v3 min/max-label contract, at least two poems
per `category_families` entry, one fully vocalized poem, and two poems
deliberately excluded by the serving filters (one under `minQualityScore`, one
over `maxVerseLines`) so those filters are provably load-bearing.

`src/test/server.db.test.js` runs the API against this seed, in CI, on real
Postgres — see `.github/workflows/db-reconstruct.yml`.

## Known drift between this repo and production

Reconstructing from these migrations and diffing against production leaves three
differences, all pre-dating this setup:

- **`design_review_*`** — production's copies were hand-created before
  `20260220_create_design_review_tables.sql` was written, and differ from it
  (`design_review_sessions.id` is `integer` there, `uuid` in the migration).
  A database built from this repo is self-consistent; production is not a match.
- **`poem_factor_scores` and `poems.access_score`** — created by
  `202607220001_add_access_factor_scores.sql`, which has not been pushed to
  production.
- Three CHECK constraints on `poem_tags` / `tagging_jobs` render differently
  after a dump round-trip. Same semantics, cosmetic only.

## Notable migrations

- `20260101000000_base_poetry_schema.sql` — base tables, lookups, functions, views
- `20260119000000_auth_and_user_features.sql` — `user_settings`, `saved_poems`, discussions
- `20260220_create_design_review_tables.sql` — design review system
- `20260220000001_add_design_review_history.sql` — `design_review_history` (was missing)
- `20260722000000_add_poem_categorization.sql` — reader-facing categorization layer:
  `category_dimensions`/`category_values`/`poem_categories` plus scalar facet
  columns on `poems`. Seeded from
  `poetry_quality_and_curation/categorization/config.py`.
