-- =============================================================
-- ROLLBACK: Tagging System (migrations 20260325000000–000004)
-- Run this file to completely remove the tagging system.
--
-- WARNING: This is destructive. All tag assignments and tag data
-- will be permanently deleted. The themes table and theme_id FK
-- on poems are preserved (backward compatible).
--
-- Execute in order — each step depends on the previous.
-- =============================================================

-- ── Step 1: Remove trigger + function from poems ──────────────
DROP TRIGGER IF EXISTS sync_poem_primary_tag ON public.poem_tags;
DROP FUNCTION IF EXISTS public.update_poem_primary_tag();

-- ── Step 2: Remove primary_tag_id from poems ─────────────────
ALTER TABLE public.poems DROP COLUMN IF EXISTS primary_tag_id;

-- ── Step 3: Drop helper views and functions (migration 000003) ─
DROP VIEW IF EXISTS public.poem_tag_summary;
DROP FUNCTION IF EXISTS public.poems_by_tag(VARCHAR, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.tag_usage_counts();
DROP FUNCTION IF EXISTS public.normalize_tag_name(TEXT);

-- ── Step 4: Drop junction table (migration 000000) ────────────
DROP TABLE IF EXISTS public.poem_tags CASCADE;

-- ── Step 5: Drop async job tracking table ────────────────────
DROP TABLE IF EXISTS public.tagging_jobs CASCADE;

-- ── Step 6: Drop tags table + all data ───────────────────────
-- (CASCADE removes the FK reference from primary_tag_id if not already dropped)
DROP TABLE IF EXISTS public.tags CASCADE;

-- ── Step 7: Drop helper functions (migration 000000) ──────────
DROP FUNCTION IF EXISTS public.normalize_slug(TEXT);
DROP FUNCTION IF EXISTS public.assign_poem_tag(INTEGER, INTEGER, REAL, TEXT);
DROP FUNCTION IF EXISTS public.get_or_create_tag(VARCHAR, VARCHAR, VARCHAR, tag_type, VARCHAR);

-- ── Step 8: Drop enum type ────────────────────────────────────
-- Only safe once all tables referencing it are gone
DROP TYPE IF EXISTS tag_type;

-- ── Verification ─────────────────────────────────────────────
-- After running, confirm no tagging objects remain:
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name IN ('tags', 'poem_tags', 'tagging_jobs');
-- SELECT routine_name FROM information_schema.routines
--   WHERE routine_schema = 'public'
--     AND routine_name IN ('normalize_slug', 'normalize_tag_name',
--                          'assign_poem_tag', 'get_or_create_tag',
--                          'poems_by_tag', 'tag_usage_counts',
--                          'update_poem_primary_tag');
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND table_name = 'poems'
--     AND column_name = 'primary_tag_id';
