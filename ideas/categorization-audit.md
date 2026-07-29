# Poem Categorization Audit + Fix Plan

Read-only investigation of the shared Supabase corpus + the Python pipeline under
`poetry_quality_and_curation/categorization/`. No DB writes. One small illustrative
AI pass on 3 poems via the app's Gemini proxy (results below, not persisted).

---

## 0. Headline

- **Coverage is NOT the problem.** The `poems` table holds **9,073** poems (not 84k), all with content, and **9,072 are categorized (99.99%)**. The only uncategorized poem is the one just-inserted Mu'allaqa (id 89734).
- **Missing motif is BY DESIGN, not a bug.** mood + topic are required (≥1); motif is optional (0–N). 16.1% of poems legitimately have no motif.
- **The real problem is OVER-TAGGING.** Average **7.59 labels per poem**, up to 13; ~half of all poems carry ≥8 labels. Broad values land on 30–46% of the corpus, so filters barely discriminate, and the model stacks near-synonyms (grief+melancholy, amorous+passion+yearning) instead of naming one core.
- **The `categories` JSONB and `poem_categories` table are perfectly consistent** (0 mismatches). No cleanup needed there.

The user's instinct ("distill each poem to a few sharp categories") is exactly right. Coverage/dedup are quick fixes; distillation is the substantive work.

---

## 1. Corpus size discrepancy (flag)

`CLAUDE.md` says "84,329 poems". The live DB `poems` table has **9,073 rows** (id range 39–89734). Either the corpus was curated down to ~9k, or 84k referred to a raw source never fully imported here. **This matters for any cost/coverage estimate** — confirm which number is real before planning a "full" run. All figures below are against the real 9,073.

---

## 2. Coverage (read-only counts)

| Metric                              | Count            |
| ----------------------------------- | ---------------- |
| Total poems                         | 9,073            |
| With non-empty content              | 9,073 (100%)     |
| `categorized_at` set                | 9,072            |
| `categories` JSONB set              | 9,072            |
| Poems with ≥1 `poem_categories` row | 9,072            |
| Total `poem_categories` links       | 68,838           |
| **Uncategorized (content present)** | **1** (id 89734) |

Per-dimension coverage (of the 9,072 categorized):

| Dimension | Poems with ≥1 value | Missing           |
| --------- | ------------------- | ----------------- |
| mood      | 9,071               | 1                 |
| topic     | 9,072               | 0                 |
| motif     | 7,612               | **1,460 (16.1%)** |

### Why the gaps exist

- **The one uncategorized poem (89734)** is a brand-new insert. **There is no auto-classification on insert** — no DB trigger, no cron. Classification only happens when someone manually runs `classify_poems.py --scope unclassified` then `import_categories.py`. `load_db_poems()` filters `content IS NOT NULL AND content <> ''` and `--scope unclassified` adds `categorized_at IS NULL` (`classify_poems.py:63-88`). So new rows sit uncategorized until the next manual batch. This is the only real coverage bug, and it's a _mechanism_ gap, not a backlog.
- **Missing motif (1,460 poems) is by design.** The prompt asks for mood "1 to 4", topic "1 to 4", but motif **"0 to 5"** (`config.py:379-386`) — "if no sensory image applies, leave motifs empty". So absent motif is the intended output for abstract/gnomic poems (wisdom, elegy without imagery). The user's observation "26 of 107 saved poems had zero motif" (24%) is consistent with the 16% baseline (saved poems skew toward certain genres).

### Required vs optional — verdict

- **mood: REQUIRED (≥1). topic: REQUIRED (≥1). motif: OPTIONAL (0–N).**
- **Caveat:** this required/optional rule lives **only in the prompt text**, not the schema. `category_dimensions.cardinality` is `'multi'` for all three — it encodes single-vs-multi, _not_ min/max. Nothing in the DB enforces "mood must have ≥1" or "motif may be 0". Recommend adding explicit `min_labels`/`max_labels` columns (see §6) so the contract is machine-checkable and the app can render "motif optional" correctly.

### JSONB vs table

0 mismatches on every check: no poem has `categorized_at` without links, no links without `categorized_at`, no JSONB without links. `import_categories.py` writes both in one per-poem transaction (`import_categories.py:178-206`). **`poem_categories` is the authoritative query path** (the API joins it — `/api/poems/by-category`); the `categories` JSONB is a denormalized cache/provenance stamp. They agree today; keep them in sync on any future edit.

---

## 3. Duplication

- **Exact duplicate rows are structurally impossible.** `poem_categories` has `PRIMARY KEY (poem_id, value_id)` (migration `20260722000000`, and the importer uses `ON CONFLICT (poem_id, value_id) DO NOTHING`). `_clean_list()` also dedupes within a dimension before insert (`classify_poems.py:146-156`). No exact-dup problem exists.
- **The real "duplication" is conceptual — synonym stacking.** The taxonomy has intentional fine gradients that the model tags together instead of choosing between:
  - **Sadness family:** melancholy(حزن) / grief(أسى) / despair(يأس) / bittersweet(حلوٌ مرّ). `grief+melancholy` co-occur **1,423** times. **2,191 poems carry ≥2 of these; 398 carry ≥3.**
  - **Desire family:** amorous(غزل) / passion(وجد) / yearning(شوق). `amorous+passion` 1,259, `passion+yearning` 1,161. **2,397 poems carry ≥2; 524 carry all 3.**
  - **Valor pair:** defiance+pride co-occur 1,147.
    These aren't true synonyms (they have real critical distinctions), so **merging the values would destroy signal**. The fix is a rubric that forces "pick the sharpest one," not a taxonomy merge (§5).

---

## 4. Over-tagging (the core finding)

### Volume

|                            | avg      | min | max |
| -------------------------- | -------- | --- | --- |
| labels per poem (all dims) | **7.59** | 2   | 13  |

- **4,338 poems (48%) carry ≥8 labels; 2,309 (25%) carry ≥10.**

Per dimension:
| dim | avg | max | poems at cap |
|---|---|---|---|
| mood | 2.84 | 4 | 1,595 maxed at 4 |
| topic | 2.51 | 4 | 956 at 4 |
| motif | 2.67 | 5 | 2,252 at ≥4 |

Root cause: `MAX_LABELS_PER_DIM = {mood:4, topic:4, motif:5}` (`config.py:225`) allows up to **13 tags/poem**, and the prompt's "be selective" is weak against a model that hedges. **No confidence floor is applied at import** — every kept label is written regardless of confidence (`import_categories.py:200-206`), so 60–70 confidence noise survives.

### Filters barely discriminate

Fraction of the categorized corpus carrying each top value:

| value       | dim   | % of poems |
| ----------- | ----- | ---------- |
| love        | topic | **46.4%**  |
| melancholy  | mood  | 37.9%      |
| tears       | motif | 32.7%      |
| yearning    | mood  | 31.4%      |
| honor-pride | topic | 29.1%      |
| night       | motif | 29.0%      |

A filter value on ~46% of poems is close to useless for discovery. Ten values sit above 22%.

### Confidence headroom (a free lever)

avg confidence 81.7; distribution of the 68,838 links: `<50`: 35, `50–70`: 5,676, `70–85`: 25,837, `≥85`: 36,043, null: 1,247. A floor at 70 would drop ~11k of the weakest links (17%) with almost no loss of the strong core.

---

## 5. Distillation — the fix (opinionated)

### 5a. What "distilled" looks like, deterministically

Keeping only the **top 2 per dimension by confidence** (no re-classification, just prune):

|                 | current | cap 2/2/2         | cap 2/2/2 + floor 70 |
| --------------- | ------- | ----------------- | -------------------- |
| total links     | 68,838  | **48,417 (−30%)** | 46,214 (−33%)        |
| avg labels/poem | 7.59    | 5.34              | ~5.1                 |

Even 2/2/2 still leaves `love` on 40% — because pruning-by-confidence can't re-judge dominance. A true re-classification with a "name the ONE core" rubric prunes harder and better.

### 5b. Live before/after (3 real poems, distilled prompt via the app's Gemini 3.6-flash proxy)

Distilled prompt: **1 primary mood + at most 1 distinct secondary; 1–2 topics; 0–2 motifs; drop anything under confidence 65; pick the sharpest of each synonym family; require an Arabic `rationale` naming the poem's core concept.** All three collapsed **13 → 6 tags**:

**Poem 6299 — "أطلال الديار وصوت الحمام" (العرجي)** — a classic aṭlāl/nasīb:

- BEFORE (13): mood [nostalgia, yearning, melancholy, amorous] · topic [love, exile-longing, time-mortality, women-feminine] · motif [desert-ruins, birds, tears, night, sword-battle]
- AFTER (6): mood [nostalgia, yearning] · topic [love, exile-longing] · motif [desert-ruins, birds]
- Dropped the noise: `sword-battle(60)`, `night(70)`, `women-feminine(70)`, `time-mortality(75)`. Kept the poem's actual spine (weeping over the ruins, the dove's call).

**Poem 5288 — "شوق بغداد ودموع الفراق" (الجرجاني)**

- BEFORE (13): mood [nostalgia, yearning, bittersweet, serenity] · topic [exile-longing, homeland, nature, love] · motif [garden-flowers, tears, sea-water, moon-stars, sword-battle]
- AFTER (6): mood [nostalgia, yearning] · topic [exile-longing, nature] · motif [tears, garden-flowers]

**Poem 5027 — "فتنة الحسن وندى الشباب" (الطالوي)** — a madīḥ opening with a ghazal prelude:

- BEFORE (13): mood [amorous, pride, bittersweet, nostalgia] · topic [love, honor-pride, women-feminine, wisdom-ethics] · motif [garden-flowers, moon-stars, dawn, sea-water, birds]
- AFTER (6): mood [reverence, amorous] · topic [honor-pride, love] · motif [garden-flowers, moon-stars] — rationale correctly reads it as praise-poetry with a love prelude.

(Full JSON in `distill_before_after.json`.)

### 5c. Proposed rubric change (concrete)

1. **Tighten caps** in `config.py`: `MAX_LABELS_PER_DIM = {mood:2, topic:2, motif:2}` (from 4/4/5). Hard ceiling drops from 13 → 6.
2. **Prompt: demand a dominant read.** Replace "be selective" with: "Name the ONE dominant mood (`mood_primary`); add a second mood only if it is genuinely distinct, not a shade of the first. From the sadness family (melancholy/grief/despair/bittersweet) choose exactly one; from the desire family (amorous/passion/yearning) choose exactly one. Topic 1–2. Motif 0–2, only images strongly present. Add a one-line `rationale` naming the poem's core concept."
3. **Confidence floor at import.** In `import_categories.py`, skip any label with confidence < ~65 (keep the mood_primary even if below, so mood is never empty). Free precision gain, no model change.
4. **Do NOT merge taxonomy values.** The gradients carry real meaning; the rubric + floor handle the redundancy. (Optional: make synonym families mutually-exclusive-per-poem in the prompt, as in #2.)

### 5d. Tradeoff (state honestly)

This trades **recall for precision**. A poem that genuinely touches love _and_ honor will now surface under whichever is dominant, maybe both, but not under 4 topics. Discovery filters become sharp (values move off the 40%+ plateau); the cost is that a few multi-theme poems won't appear under their secondary themes. For a _discovery_ UX ("find me nostalgic exile poems"), precision is the right bet — a filter that returns half the corpus is the worse failure.

---

## 6. Recommended fix plan (priority order)

**A. Full coverage + auto-classify new inserts**

- **Backlog is trivial: 1 poem.** Classify it on approval (`--scope unclassified`), pennies.
- **Close the mechanism gap:** add a scheduled job (nightly cron or Render worker) that runs `classify_poems --scope unclassified` → `import_categories` → `--backfill-century`. Alternatively enqueue on insert. Cost is negligible at the real corpus rate (a handful of new poems).
- **Empty content:** none exist today; the pipeline already skips them by filter. Keep that; if any appear, leave uncategorized (don't fabricate).

**B. No duplication**

- Already enforced by `PK (poem_id, value_id)`. No action needed. Keep the importer's delete-then-insert idempotency.

**C. Distill to core (the main ask)** — do these together in ONE re-classification pass:

- Tighten caps to 2/2/2, rewrite the prompt for a dominant read + synonym-family exclusivity + rationale (§5c #1–2), add the confidence floor (§5c #3).
- Bump `TAXONOMY_VERSION`/prompt_version so re-tagged rows are distinguishable from v2.
- **Re-classify all 9,072** with the distilled prompt (gemini-3.6-flash, `--scope all`, `--resume`, `--max-cost`). At ~4 poems/call this is ~2,300 calls — **rough order $5–15**, well under the existing $60 cap. Import replaces each poem's rows idempotently. **Hold for user approval** (this is the big write).

**D. Schema hardening (optional, low risk)**

- Add `min_labels`/`max_labels` to `category_dimensions` (mood 1/2, topic 1/2, motif 0/2) so required-vs-optional is enforced in DB + rendered correctly in the UI, instead of living only in prompt prose.

---

## 7. Minor / incidental notes

- **Config drift:** `config.py` `DEFAULT_GEMINI_MODEL = "gemini/gemini-2.5-flash"` but the corpus was tagged with **gemini-3.6-flash** (per `categorization_model`). Harmless, but update the default so docs match reality.
- **`accessibility_level` is NULL for all 9,072** poems, while `accessibility_score` (0–10) is populated for all. The classifier produces `accessibility_level` (1–5) and the importer writes it, so something downstream (a later backfill?) supersedes it into `accessibility_score` and nulls the level. Not a categorization bug, but the dead column is confusing — reconcile or drop it.
- **century:** 6,636/9,072 (73%) populated; the rest are era_id=3 ("late/modern", deliberately mapped to NULL) or null era. By design.

---

## Appendix — scripts (read-only, in scratchpad)

- `audit_q.js`, `audit_q2.js`, `audit_q3.js` — the SELECT-only query batches.
- `distill_pass.js` — the 3-poem live distillation via the app proxy (no DB writes).
- `distill_before_after.json` — full before/after JSON.
