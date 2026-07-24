# Poem Categorization Layer

A reusable, Claude-powered layer that tags every poem with **reader-facing
facets** — mood, topic, and motif (multi-label), plus scalar fields
(emotional intensity, accessibility, century) — so the app can **filter,
browse, and recommend** by "vibe" instead of only by poet.

It mirrors the existing quality-scoring pipeline (`../retriever_and_quality_curator`)
in every way: LiteLLM + Claude, async batching, Parquet checkpoints, `--resume`,
cost caps, `--dry-run`.

---

## Why this exists (the gap it fills)

The 84k-poem DB already has some categorization, but it's thin and single-label:

| Facet           | Where it lives            | Problem for filtering / reccos                                                                     |
| --------------- | ------------------------- | -------------------------------------------------------------------------------------------------- |
| `theme` (غرض)   | `poems.theme_id` → themes | **One** label per poem, largely `غير مصنف`; table is even polluted with length labels like `قصيرة` |
| `era`           | `poets.era_id` → eras     | Poet-level, not poem-level; 8 broad historical periods                                             |
| `meter` (بحر)   | `poems.meter_id`          | Prosody, not mood/subject                                                                          |
| `quality_score` | `poems.quality_score`     | How _good_, not what it's _about_                                                                  |

A poem can't be "melancholic **and** nostalgic **and** about exile" today.
Real examples pulled live from prod (see `data/poc_sample_classifications.json`):

- al-Khansa's famous war **elegy** → tagged `غير مصنف` (uncategorized)
- An al-Rafi'i **love** poem → tagged `خمر` (wine — just wrong)
- An Abu Nuwas **ghazal** → tagged `قصيرة` (that's "short", not a theme)

This layer is **additive**: it leaves `theme`/`era`/`meter` untouched and adds a
multi-label taxonomy on top.

---

## Architecture

```
config.py            ← single source of truth: taxonomy (mood/topic/motif),
                        scalar fields, and the Claude prompt (built from the taxonomy)
classify_poems.py    ← reads poems from DB → Claude via LiteLLM → Parquet checkpoints
import_categories.py ← Parquet → DB (normalized poem_categories + scalar cols + JSONB)
```

Schema (migration `supabase/migrations/20260722000000_add_poem_categorization.sql`):

- `category_dimensions` / `category_values` — controlled vocab (bilingual, seeded from `config.py`)
- `poem_categories` — many-to-many join (poem ↔ value, with confidence)
- New `poems` columns — `mood_primary`, `emotional_intensity`, `accessibility_level`,
  `century`, `categories` (JSONB provenance), `categorized_at`, `categorization_model`

The vocab seed in the migration is generated from `config.py`:

```bash
python -m poetry_quality_and_curation.categorization.config --print-seed
```

---

## Runbook

```bash
# 0. Prereqs
pip install -r requirements.txt
# env: DATABASE_URL, plus ANTHROPIC_AUTH_TOKEN (+ ANTHROPIC_BASE_URL) or a LiteLLM proxy
#      (same creds the scoring pipeline already uses)

# 1. Apply the migration
supabase db push        # or psql -f supabase/migrations/20260722000000_add_poem_categorization.sql

# 2. Dry run (no API calls) to sanity-check scope + counts
python -m poetry_quality_and_curation.categorization.classify_poems \
    --model openai/bedrock-haiku-45 --scope unclassified --dry-run

# 3. Bulk classify (cheap on Haiku, ~$0.45/1k poems; resumable)
python -m poetry_quality_and_curation.categorization.classify_poems \
    --model openai/bedrock-haiku-45 --scope all --concurrency 15 --max-cost 40 --resume

# 4. Import results into the DB (idempotent per poem)
python -m poetry_quality_and_curation.categorization.import_categories \
    --input data/categories_openai_bedrock-haiku-45.parquet
```

Recommended two-pass strategy (same as scoring): bulk with **Haiku**, then
re-run `--scope top` on the highest-quality poems with **Sonnet** for sharper
labels where it matters most.

---

## Consuming it (already wired into the API)

`server.js` gained two **backward-compatible** endpoints (they return empty
until the migration runs, gated by a startup `hasCategorization` check):

- `GET /api/categories` — the full facet list (dimensions + values + poem counts), for filter UIs
- `GET /api/poems/by-category?mood=melancholy&topic=exile-longing&minIntensity=70&maxAccessibility=3&limit=10`
  — AND across dimensions, OR within a dimension; randomized selection

Example recommendation query the endpoint builds:

```sql
SELECT p.*, po.name AS poet
FROM poems p
JOIN poets po ON p.poet_id = po.id
WHERE EXISTS (SELECT 1 FROM poem_categories pc
              JOIN category_values cv ON pc.value_id = cv.id
              JOIN category_dimensions cd ON cv.dimension_id = cd.id
              WHERE pc.poem_id = p.id AND cd.key = 'mood' AND cv.key = ANY('{melancholy,nostalgia}'))
  AND p.emotional_intensity >= 70
ORDER BY RANDOM() LIMIT 10;
```

---

## Extending the taxonomy

Edit the vocab lists in `config.py`, then:

1. Regenerate the seed: `python -m ...categorization.config --print-seed` and paste
   into a **new** migration (the `ON CONFLICT DO NOTHING` inserts are additive).
2. Re-run the classifier with `--scope unclassified` (or `all` to re-tag).

The prompt is built from the taxonomy, so it updates automatically — prompt and
validation never drift.
