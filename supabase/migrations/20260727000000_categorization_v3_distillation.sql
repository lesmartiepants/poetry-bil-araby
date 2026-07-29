-- Categorization v3 (distillation) — schema support.
--
-- Pairs with the pipeline change in
--   poetry_quality_and_curation/categorization/config.py        (distilled prompt, caps 2/2/2, floor)
--   poetry_quality_and_curation/categorization/import_categories.py (confidence floor at import)
--
-- This migration is ADDITIVE and safe to apply before or after re-tagging:
--   * it adds the required-vs-optional contract (min_labels/max_labels) to
--     category_dimensions, encoding in the DB what previously lived only in the
--     classifier prompt (mood/topic required >=1, motif optional 0);
--   * it documents (does NOT drop) the redundant accessibility_level column.
--
-- HELD: apply only after user approval. Nothing here rewrites poem_categories or
-- poems.categories — the distilled re-tag is a separate, approval-gated step
-- (see poetry_quality_and_curation/categorization/audit/README.md).

-- ============================================================
-- 1. Required-vs-optional contract on dimensions
-- ============================================================
-- cardinality ('single'|'multi') says whether a dimension takes one or many
-- labels; it does NOT say whether a label is required. That distinction (mood is
-- required, motif is optional) previously existed only as prose in the prompt,
-- so 16% of poems legitimately having no motif looked like a coverage bug. These
-- columns make the contract explicit, machine-checkable, and renderable in the UI
-- ("motif — optional").
ALTER TABLE category_dimensions
  ADD COLUMN IF NOT EXISTS min_labels SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_labels SMALLINT;

-- Mirrors config.DIMENSION_MIN_LABELS / config.MAX_LABELS_PER_DIM. Keep these in
-- sync with config.py (its --print-seed emits the same UPDATEs). min=0 => the
-- dimension may be empty (optional); min>=1 => required.
UPDATE category_dimensions SET min_labels = 1, max_labels = 2 WHERE key = 'mood';
UPDATE category_dimensions SET min_labels = 1, max_labels = 2 WHERE key = 'topic';
UPDATE category_dimensions SET min_labels = 0, max_labels = 2 WHERE key = 'motif';

COMMENT ON COLUMN category_dimensions.min_labels IS
  'Minimum labels a poem must carry in this dimension. 0 = optional (e.g. motif); >=1 = required (mood, topic).';
COMMENT ON COLUMN category_dimensions.max_labels IS
  'Maximum labels accepted per poem in this dimension (distillation cap; NULL = unbounded).';

-- ============================================================
-- 2. accessibility_level — reconciliation (documented, not dropped)
-- ============================================================
-- The classifier produces accessibility_level (1-5). In production it is NULL on
-- every categorized poem, while accessibility_score (REAL, 0-10, higher = harder)
-- is populated for all of them by the separate quality-curation pipeline. So
-- accessibility_score is the canonical, queryable facet; accessibility_level is
-- raw model provenance only.
--
-- We deliberately DO NOT drop accessibility_level in this migration:
--   * import_categories.py still writes it, so dropping the column would break
--     the importer without a coordinated code change;
--   * it is harmless (NULL) and cheap to keep as provenance.
-- If a later cleanup wants it gone, do it together with removing the write in
-- import_categories.py. For now we just document the intent.
COMMENT ON COLUMN poems.accessibility_level IS
  'Raw model 1-5 ease estimate (provenance only; currently unused). Canonical difficulty facet is accessibility_score (0-10). Retained, not dropped — see migration 20260727000000.';
COMMENT ON COLUMN poems.accessibility_score IS
  'Canonical difficulty facet, 0-10 (higher = harder), populated by the quality-curation pipeline. Prefer this over accessibility_level.';
