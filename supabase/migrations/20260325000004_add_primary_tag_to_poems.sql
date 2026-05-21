-- =============================================================
-- Migration: add_primary_tag_to_poems
-- Adds a denormalized primary_tag_id column to poems for fast
-- single-tag lookups without joining poem_tags every time.
--
-- This is the "category_id" concept for the poems table:
-- a single tag representing the poem's dominant classification
-- (equivalent to the legacy theme_id, but pointing to the new tags table).
--
-- The column is nullable — poems without any tag assignment have NULL.
-- It is kept in sync via the update_poem_primary_tag() trigger.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS sync_poem_primary_tag ON public.poem_tags;
--   DROP FUNCTION IF EXISTS public.update_poem_primary_tag();
--   ALTER TABLE public.poems DROP COLUMN IF EXISTS primary_tag_id;
-- =============================================================

-- Add primary_tag_id column to poems (nullable FK to tags)
ALTER TABLE public.poems
  ADD COLUMN IF NOT EXISTS primary_tag_id INTEGER
    REFERENCES public.tags(id) ON DELETE SET NULL;

-- Index for fast filter-by-tag queries on the poems table
CREATE INDEX IF NOT EXISTS idx_poems_primary_tag_id
  ON public.poems(primary_tag_id)
  WHERE primary_tag_id IS NOT NULL;

-- ── Trigger: keep primary_tag_id in sync ─────────────────────
-- After any INSERT/UPDATE/DELETE on poem_tags, pick the tag with
-- the highest confidence_score (preferring 'manual' over 'auto' on tie)
-- and write it to poems.primary_tag_id.

CREATE OR REPLACE FUNCTION public.update_poem_primary_tag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_poem_id  INTEGER;
  v_tag_id   INTEGER;
BEGIN
  -- Determine which poem_id changed
  v_poem_id := COALESCE(NEW.poem_id, OLD.poem_id);

  -- Select the best tag for this poem
  SELECT tag_id INTO v_tag_id
  FROM public.poem_tags
  WHERE poem_id = v_poem_id
  ORDER BY
    confidence_score DESC,
    -- Prefer 'manual' on tie (manual=0 sorts first when DESC doesn't matter)
    CASE source WHEN 'manual' THEN 0 ELSE 1 END ASC
  LIMIT 1;

  -- Update poems.primary_tag_id (NULL if no tags remain)
  UPDATE public.poems
  SET primary_tag_id = v_tag_id
  WHERE id = v_poem_id;

  RETURN NULL; -- AFTER trigger, return value ignored
END;
$$;

-- Attach trigger to poem_tags (fires after each row change)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'sync_poem_primary_tag'
  ) THEN
    CREATE TRIGGER sync_poem_primary_tag
      AFTER INSERT OR UPDATE OR DELETE ON public.poem_tags
      FOR EACH ROW EXECUTE FUNCTION public.update_poem_primary_tag();
  END IF;
END $$;

-- ── Backfill: set primary_tag_id for existing poems ──────────
-- Run once to populate the column for poems already in poem_tags.
-- Uses the same ordering logic as the trigger above.
UPDATE public.poems p
SET primary_tag_id = (
  SELECT pt.tag_id
  FROM public.poem_tags pt
  WHERE pt.poem_id = p.id
  ORDER BY
    pt.confidence_score DESC,
    CASE pt.source WHEN 'manual' THEN 0 ELSE 1 END ASC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM public.poem_tags WHERE poem_id = p.id
);
