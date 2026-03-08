# Arabic Poetry Curation Pipeline Plan

## Context

The app currently serves 84,329 poems from a PostgreSQL database with no quality filtering -- users get random poems of wildly varying quality. We want to combine our existing corpus with the NoorBayan/Diwan dataset (~400K poems), then curate down to the **5,000 best Arabic poems** using Claude AI as a poetry judge. The result is a "greatest hits" collection spanning classical and modern eras, weighted 60-70% modern.

Quality means **poetic beauty** -- how a poem sounds, its imagery, emotional impact, linguistic craft, and cultural significance -- not just technical metadata like completeness or length.

## Design Principles

- **Repeatable pipeline:** Every step reads from Parquet/DB and writes to Parquet/DB. The entire pipeline can be re-run from any step with `--resume`. Config values (thresholds, batch sizes, model names, target counts) live in `config.py` so the pipeline can be re-executed with different parameters without code changes.
- **Idempotent:** Running any step twice produces the same result. Imports use ON CONFLICT, scores use upsert logic, dedup uses content hashes.
- **Diacritization is a separate concern:** A parallel team is building a diacritization workflow. This pipeline does NOT diacritize poems. New poems imported in Step 7 will have `diacritized_content = NULL`. The diacritization pipeline should be run after import to populate that column for new poems. The existing `scripts/batch-diacritize.py` pattern (or its successor) handles this.
- **Re-runnable for future datasets:** The pipeline is designed so new datasets (beyond Diwan) can be added later by writing a new `01_download_<source>.py` preprocessor that outputs the same Parquet schema, then re-running Steps 3-7.

---

## Budget & Scale

| Phase | Model | Poems | Est. Cost |
|-------|-------|-------|-----------|
| Haiku scoring | claude-haiku-4 | ~300K | ~$38 |
| Opus calibration | claude-opus-4-5 | ~3-5K | ~$50-60 |
| **Total** | | | **~$90-100** |

Target: **5,000 poems** in the final curated collection.

---

## Pipeline Steps

### Step 1: Schema Migration
**File:** `supabase/migrations/20260307000000_add_curation_columns.sql`

Add to `poems` table:
- `quality_score SMALLINT` (0-100)
- `quality_subscores JSONB` (`{sound, imagery, emotion, language, cultural}`)
- `source_dataset VARCHAR(20)` (default `'original'`)
- `poem_form SMALLINT` (1=classical, 2=modern)
- `scoring_model VARCHAR(30)` (`'haiku'` or `'opus-4.5'`)
- `scored_at TIMESTAMPTZ`

Add indexes: `quality_score DESC`, `source_dataset`, composite `(quality_score, poet_id)`.

Backfill `source_dataset = 'original'` for existing 84K poems.

### Step 2: Download & Preprocess Diwan
**File:** `scripts/curation/01_download_diwan.py`

1. Download Diwan TSV (UTF-16) from NoorBayan GitHub/Zenodo
2. Parse and map numeric codes to Arabic (meter, theme, poem_form)
3. Pre-filter before expensive scoring:
   - Remove non-Arabic text
   - Remove fragments < 4 lines
   - Remove >60 line poems (unwieldy)
   - Remove >30% repeated lines (corrupt)
   - Deduplicate vs existing DB by text hash (SHA-256 of normalized, diacritic-stripped text)
   - Deduplicate within Diwan itself
4. Save to `scripts/curation/data/diwan_processed.parquet`
5. Expected: ~200-300K poems survive pre-filtering

### Step 3: Score Poems (single configurable script)
**File:** `scripts/curation/02_score_poems.py`

A single scoring script that can be run at any time with configurable model, cost cap, and scope. Uses **LiteLLM** for model routing (supports Claude via `anthropic/` prefix, plus any other provider).

**Usage examples:**
```bash
# Initial pass: score all candidates with Haiku (~$38)
python scripts/curation/02_score_poems.py \
  --model anthropic/claude-haiku-4-20250414 \
  --scope all \
  --batch-size 5 \
  --concurrency 20 \
  --max-cost 40 \
  --resume

# Calibration pass: re-score top 5K with Opus (~$50-60)
python scripts/curation/02_score_poems.py \
  --model anthropic/claude-opus-4-5-20250414 \
  --scope top \
  --top-k 5000 \
  --batch-size 3 \
  --concurrency 5 \
  --max-cost 60 \
  --prompt-mode detailed \
  --resume

# Re-run with a different model later
python scripts/curation/02_score_poems.py \
  --model anthropic/claude-sonnet-4-20250514 \
  --scope unscored \
  --max-cost 20
```

**CLI flags:**
- `--model` (required): LiteLLM model string (e.g., `anthropic/claude-haiku-4-20250414`)
- `--scope`: `all` (every candidate), `top` (top N by existing score), `unscored` (poems without scores)
- `--top-k`: How many top poems to score when `--scope top` (default 5000)
- `--batch-size`: Poems per API call (default 5)
- `--concurrency`: Parallel API requests (default 20)
- `--max-cost`: Dollar cap -- script stops when estimated spend reaches this (default 100)
- `--prompt-mode`: `compact` (JSON-only response, cheaper) or `detailed` (scores + notes per dimension)
- `--resume`: Skip already-scored poems for this model
- `--source`: Filter to `original`, `diwan`, or `all` (default `all`)
- `--dry-run`: Print what would be scored without calling API

**Scoring rubric** (entirely in Arabic, both prompt modes):

*Compact mode* (for Haiku -- JSON-only response):
- Persona: Arabic literature critic, academic + modern reader
- 5 dimensions, each 0-100: sound, imagery, emotion, language, cultural
- Returns: `{"sound": N, "imagery": N, "emotion": N, "language": N, "cultural": N}`

*Detailed mode* (for Opus -- scores + justification):
- Persona: "الدكتور أحمد" -- 40-year Arabic lit professor at Cairo University who also genuinely loves poetry
- Same 5 dimensions with conversational Arabic rubric questions:
  - "هل يطرب الأذن؟" (Does it delight the ear?)
  - "هل تبقى معك بعد القراءة؟" (Does it stay with you after reading?)
- Returns: scores + one-sentence note per dimension + overall verdict

**Architecture:**
- `asyncio` + `litellm.acompletion` (async, I/O-bound)
- Checkpoints to Parquet every 1,000 poems (resume-safe)
- Running cost tracked per call via `litellm.completion_cost()`; stops at `--max-cost`
- Triple-layer JSON parsing (direct → regex extract → lenient repair)
- Each scored poem stored with: `poem_id, source, model_used, scores{}, scored_at`
- Scores saved to `scripts/curation/data/scores_{model_slug}.parquet`

### Step 4: Recalibrate & Validate
**File:** `scripts/curation/03_recalibrate.py`

When two scoring runs exist (e.g., Haiku on all + Opus on top 5K), learn calibration from their overlap:

```bash
python scripts/curation/03_recalibrate.py \
  --base-scores data/scores_haiku.parquet \
  --calibration-scores data/scores_opus.parquet \
  --output data/scores_calibrated.parquet
```

1. **Per-dimension bias:** `mean(base[dim] - calibration[dim])` -- correct systematic drift
2. **Per-dimension scaling:** `std(calibration) / std(base)` -- correct range compression
3. **Fame discount:** Detect poet-name inflation in base model
4. **Era adjustment:** Detect classical/modern bias in base model

Apply calibration to ALL base scores. For poems with calibration scores, use calibration score directly.

**Validation:** Print Pearson correlation (target >0.75), biggest disagreements, bias magnitudes.

### Step 5: Select Final 5K
**File:** `scripts/curation/04_select_final.py`

1. Separate into classical (poem_form=1) and modern (poem_form=2)
2. Target: ~3,250 modern (65%), ~1,750 classical (35%)
3. Within each bucket, sort by calibrated quality_score DESC, take top N
4. **Poet cap:** No single poet exceeds 5% (250 poems max) -- ensures diversity
5. **Theme diversity:** At least 10 distinct themes represented
6. If a bucket is short, backfill from the other
7. Print selection report: poets, eras, themes, score stats, source distribution

Save to `scripts/curation/data/final_selection.parquet`

### Step 6: Import to Production
**File:** `scripts/curation/05_import_poems.py`

Two operations:
1. **Existing poems:** Update `quality_score`, `quality_subscores`, `scoring_model`, `scored_at` via UNNEST batch writes (following `batch-diacritize.py` pattern)
2. **New Diwan poems (in final 5K only):** Upsert poets/themes, insert poems with full metadata. New poems are inserted with `diacritized_content = NULL` -- the separate diacritization pipeline (being built by another team, see `scripts/batch-diacritize.py` for current approach) should be run after import to populate tashkeel for new poems.

Flags: `--dry-run` (print without writing), `--scores-only` (update existing scores, skip new imports)

### Step 7: API Quality Filter
**File:** `server.js` (modify existing)

1. Add `hasQualityScore` column detection (same pattern as `hasDiacritizedColumn` at lines 52-64)
2. Add `WHERE p.quality_score >= 60` to random poem and by-poet queries when column exists
3. Graceful fallback: if `quality_score` column doesn't exist yet, serve all poems as before

---

## File Structure

```
scripts/curation/
  requirements.txt          # litellm, psycopg2-binary, pyarrow, pandas, pyarabic, tqdm
  run_pipeline.py           # Single entry point: runs full pipeline or any subset
  config.py                 # Defaults for all CLI flags, prompt templates, meter/theme maps
  arabic_utils.py           # normalize_arabic, strip_diacritics, format_for_scoring, text_hash
  01_download_diwan.py      # Download + preprocess Diwan dataset
  02_score_poems.py         # Single scoring script (any model, configurable cost/scope)
  03_recalibrate.py         # Learn calibration from dual-scored poems, apply to all
  04_select_final.py        # Apply era/poet/theme constraints, select 5K
  05_import_poems.py        # Write to production DB
  data/                     # Intermediate Parquet files (gitignored)
    diwan_processed.parquet
    scores_haiku.parquet
    scores_opus.parquet
    scores_calibrated.parquet
    final_selection.parquet

supabase/migrations/
  20260307000000_add_curation_columns.sql

server.js                   # Quality filter in API queries
```

---

## Execution Order

```
Migration (Step 1)  ──┐
                      ├──→ Score with Haiku (Step 3: --scope all, ~8hrs)
Download Diwan (Step 2)┘         │
                          Score with Opus (Step 3: --scope top --top-k 5000, ~2hrs)
                                 │
                          Recalibrate (Step 4, minutes)
                                 │
                          Select final 5K (Step 5, minutes)
                                 │
                          Import to DB (Step 6, ~10min)
                                 │
                          [Run diacritization pipeline on new poems]
                                 │
                          Update API (Step 7)
```

---

## Verification

1. **After Step 2:** Check `diwan_processed.parquet` row count, sample 10 poems visually
2. **After Step 3 (Haiku):** Check score distribution (should be roughly normal, centered ~50-60)
3. **After Step 3 (Opus):** Compare Opus vs Haiku scores on the overlap set
4. **After Step 4:** Print Pearson correlation (target >0.75), verify bias corrections < 15 points
5. **After Step 5:** Verify 5K selection: era balance (65/35), poet cap (max 250), theme diversity (10+)
6. **After Step 6:** `SELECT COUNT(*) FROM poems WHERE quality_score IS NOT NULL` should match expectations
7. **After Step 7:** `GET /api/poems/random` should return only poems with quality_score >= 60; test with and without the column present
