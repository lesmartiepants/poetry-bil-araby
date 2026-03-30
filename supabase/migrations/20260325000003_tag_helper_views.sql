-- =============================================================
-- Migration: tag_helper_views
-- Adds a tag-aware poem view and additional helper utilities
-- that make server.js queries simpler and more performant.
--
-- Rollback:
--   DROP VIEW IF EXISTS public.poem_tag_summary;
--   DROP FUNCTION IF EXISTS public.normalize_tag_name(TEXT);
--   DROP FUNCTION IF EXISTS public.poems_by_tag(VARCHAR, INTEGER, INTEGER);
-- =============================================================

-- normalize_tag_name: trim + collapse inner whitespace + lowercase.
-- Used by the auto-tagging pipeline when matching AI output → slugs.
CREATE OR REPLACE FUNCTION public.normalize_tag_name(input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT lower(trim(regexp_replace(input, '\s+', ' ', 'g')));
$$;

-- poem_tag_summary: lightweight view for the API.
-- Returns one row per (poem_id, tag) with the tag's bilingual names.
-- server.js can aggregate these into an array per poem using
--   array_agg(tag_slug ORDER BY confidence_score DESC)
CREATE OR REPLACE VIEW public.poem_tag_summary AS
SELECT
  pt.poem_id,
  pt.confidence_score,
  pt.source,
  t.id           AS tag_id,
  t.slug         AS tag_slug,
  t.name_ar      AS tag_name_ar,
  t.name_en      AS tag_name_en,
  t.tag_type,
  t.color
FROM public.poem_tags pt
JOIN public.tags t ON t.id = pt.tag_id
ORDER BY pt.poem_id, pt.confidence_score DESC;

-- Grant the view access
GRANT SELECT ON public.poem_tag_summary TO anon, authenticated;

-- poems_by_tag: returns poem IDs for a given tag slug, ordered by
-- confidence (highest first), with optional pagination.
-- Usage: SELECT * FROM poems_by_tag('elegy', 20, 0);
CREATE OR REPLACE FUNCTION public.poems_by_tag(
  p_slug  VARCHAR(100),
  p_limit  INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (poem_id INTEGER, confidence_score REAL, source VARCHAR)
LANGUAGE sql
STABLE
AS $$
  SELECT
    pt.poem_id,
    pt.confidence_score,
    pt.source
  FROM public.poem_tags pt
  JOIN public.tags t ON t.id = pt.tag_id
  WHERE t.slug = p_slug
  ORDER BY pt.confidence_score DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- tag_usage_counts: materialized-style function for tag analytics.
-- Returns each tag slug with the count of poems assigned to it.
-- Called infrequently (admin/analytics), so not materialized.
CREATE OR REPLACE FUNCTION public.tag_usage_counts()
RETURNS TABLE (
  tag_id   INTEGER,
  slug     VARCHAR(100),
  name_ar  VARCHAR(200),
  name_en  VARCHAR(200),
  tag_type tag_type,
  poem_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    t.id,
    t.slug,
    t.name_ar,
    t.name_en,
    t.tag_type,
    COUNT(pt.poem_id) AS poem_count
  FROM public.tags t
  LEFT JOIN public.poem_tags pt ON pt.tag_id = t.id
  GROUP BY t.id, t.slug, t.name_ar, t.name_en, t.tag_type
  ORDER BY poem_count DESC, t.display_order;
$$;

-- Additional performance index: cover the common API query pattern of
-- fetching tags for a SET of poem IDs in one shot (e.g. after random selection)
CREATE INDEX IF NOT EXISTS idx_poem_tags_covering
  ON public.poem_tags(poem_id, tag_id, confidence_score DESC)
  INCLUDE (source);
