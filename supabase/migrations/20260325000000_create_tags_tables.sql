-- =============================================================
-- Migration: create_tags_tables
-- Creates the core tagging system tables: tags, poem_tags,
-- tagging_jobs, plus helper functions.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.poem_tags CASCADE;
--   DROP TABLE IF EXISTS public.tagging_jobs CASCADE;
--   DROP TABLE IF EXISTS public.tags CASCADE;
--   DROP TYPE IF EXISTS tag_type;
--   DROP FUNCTION IF EXISTS normalize_slug(TEXT);
--   DROP FUNCTION IF EXISTS assign_poem_tag(INTEGER, INTEGER, REAL, TEXT);
-- =============================================================

-- Tag type enum: extensible categories for Arabic poetry
DO $$ BEGIN
  CREATE TYPE tag_type AS ENUM (
    'theme',    -- poem subject matter (love, grief, war …)
    'form',     -- poetic form (qasida, ghazal, prose poem …)
    'period',   -- historical era (Abbasid, Andalusian, Modern …)
    'emotion',  -- primary emotional register (joy, despair …)
    'style',    -- rhetorical / stylistic trait (metaphor, imagery …)
    'region',   -- geographic / dialect origin (Levantine, Gulf …)
    'other'     -- catch-all for custom / admin tags
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tags master table
-- One row per distinct concept; bilingual (Arabic + English).
CREATE TABLE IF NOT EXISTS public.tags (
  id            SERIAL PRIMARY KEY,
  slug          VARCHAR(100)  NOT NULL UNIQUE,   -- URL-safe key e.g. 'ghazal', 'love-longing'
  name_ar       VARCHAR(200)  NOT NULL,           -- Arabic display label
  name_en       VARCHAR(200)  NOT NULL,           -- English display label
  description_ar TEXT,
  description_en TEXT,
  tag_type      tag_type      NOT NULL DEFAULT 'theme',
  color         VARCHAR(7),                        -- Hex color for UI badges e.g. '#c5a059'
  icon          VARCHAR(50),                       -- Optional Lucide icon name
  parent_tag_id INTEGER REFERENCES public.tags(id) ON DELETE SET NULL,
  display_order INTEGER       DEFAULT 0,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- Many-to-many: poem ↔ tag
-- confidence_score: 0-1 (1.0 = human-assigned; lower values = AI prediction)
-- source: 'manual' = human; 'auto' = AI pipeline
CREATE TABLE IF NOT EXISTS public.poem_tags (
  poem_id          INTEGER NOT NULL REFERENCES public.poems(id) ON DELETE CASCADE,
  tag_id           INTEGER NOT NULL REFERENCES public.tags(id)  ON DELETE CASCADE,
  confidence_score REAL    NOT NULL DEFAULT 1.0
    CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  source           VARCHAR(10) NOT NULL DEFAULT 'manual'
    CHECK (source IN ('auto', 'manual')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (poem_id, tag_id)
);

-- Async job tracking for bulk auto-tagging runs
CREATE TABLE IF NOT EXISTS public.tagging_jobs (
  id           SERIAL PRIMARY KEY,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'done', 'failed')),
  total        INTEGER     DEFAULT 0,
  processed    INTEGER     DEFAULT 0,
  failed_count INTEGER     DEFAULT 0,
  started_at   TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ,
  error_msg    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────

-- B-tree lookups on tags
CREATE INDEX IF NOT EXISTS idx_tags_slug        ON public.tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_type        ON public.tags(tag_type);
CREATE INDEX IF NOT EXISTS idx_tags_parent      ON public.tags(parent_tag_id)
  WHERE parent_tag_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tags_display_order ON public.tags(tag_type, display_order);

-- GIN full-text search across both name columns
-- Uses 'simple' config (no language-specific stemming) to handle Arabic safely
CREATE INDEX IF NOT EXISTS idx_tags_name_ar_gin ON public.tags
  USING GIN (to_tsvector('simple', name_ar));
CREATE INDEX IF NOT EXISTS idx_tags_name_en_gin ON public.tags
  USING GIN (to_tsvector('simple', name_en));

-- poem_tags join indexes
CREATE INDEX IF NOT EXISTS idx_poem_tags_tag_id ON public.poem_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_poem_tags_poem_id ON public.poem_tags(poem_id);
CREATE INDEX IF NOT EXISTS idx_poem_tags_source  ON public.poem_tags(source);
-- Composite for tag-filtered queries sorted by confidence
CREATE INDEX IF NOT EXISTS idx_poem_tags_tag_confidence
  ON public.poem_tags(tag_id, confidence_score DESC);

-- tagging_jobs status checks
CREATE INDEX IF NOT EXISTS idx_tagging_jobs_status ON public.tagging_jobs(status);

-- ── Helper functions ───────────────────────────────────────────

-- normalize_slug: produce a clean URL-safe lowercase ASCII slug from a text input.
-- Used during backfill to map Arabic theme names → slugs via their transliteration.
-- For Arabic input this will strip non-ASCII chars; callers must pass pre-transliterated text.
CREATE OR REPLACE FUNCTION normalize_slug(input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT lower(regexp_replace(trim(input), '[^a-z0-9\-]', '', 'g'));
$$;

-- assign_poem_tag: upsert a tag assignment onto a poem.
-- On conflict, keeps the higher confidence_score and prefers 'manual' source.
CREATE OR REPLACE FUNCTION assign_poem_tag(
  p_poem_id    INTEGER,
  p_tag_id     INTEGER,
  p_confidence REAL    DEFAULT 1.0,
  p_source     TEXT    DEFAULT 'manual'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.poem_tags (poem_id, tag_id, confidence_score, source)
  VALUES (p_poem_id, p_tag_id, p_confidence, p_source)
  ON CONFLICT (poem_id, tag_id) DO UPDATE
    SET confidence_score = GREATEST(poem_tags.confidence_score, EXCLUDED.confidence_score),
        source = CASE
                   WHEN EXCLUDED.source = 'manual' THEN 'manual'
                   ELSE poem_tags.source
                 END;
END;
$$;

-- get_or_create_tag: look up a tag by slug; create it if absent.
-- Returns the tag id. Useful for the auto-tagging pipeline.
CREATE OR REPLACE FUNCTION get_or_create_tag(
  p_slug    VARCHAR(100),
  p_name_ar VARCHAR(200),
  p_name_en VARCHAR(200),
  p_type    tag_type DEFAULT 'theme',
  p_color   VARCHAR(7) DEFAULT '#c5a059'
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_id INTEGER;
BEGIN
  SELECT id INTO v_id FROM public.tags WHERE slug = p_slug;
  IF NOT FOUND THEN
    INSERT INTO public.tags (slug, name_ar, name_en, tag_type, color)
    VALUES (p_slug, p_name_ar, p_name_en, p_type, p_color)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

-- ── Auto-update updated_at on tags ───────────────────────────
-- NOTE: update_updated_at_column() already exists from the auth migration.
-- We only need to attach the trigger to the new table.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tags_updated_at'
  ) THEN
    CREATE TRIGGER tags_updated_at
      BEFORE UPDATE ON public.tags
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ── Row-Level Security ─────────────────────────────────────────

ALTER TABLE public.tags         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poem_tags    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tagging_jobs ENABLE ROW LEVEL SECURITY;

-- Tags: public read, no public write (writes go through backend API with API_SECRET_KEY)
CREATE POLICY "Public read tags"
  ON public.tags FOR SELECT USING (true);

-- poem_tags: public read, no public write
CREATE POLICY "Public read poem_tags"
  ON public.poem_tags FOR SELECT USING (true);

-- tagging_jobs: only authenticated users can read job status
CREATE POLICY "Authenticated read tagging_jobs"
  ON public.tagging_jobs FOR SELECT USING (auth.role() = 'authenticated');

-- ── PostgREST grants ───────────────────────────────────────────
-- Allow Supabase client SDK / PostgREST to reach these tables.
-- RLS policies above govern which rows are visible.

GRANT SELECT ON public.tags         TO anon, authenticated;
GRANT SELECT ON public.poem_tags    TO anon, authenticated;
GRANT SELECT ON public.tagging_jobs TO authenticated;
-- Sequence grants (needed for INSERT from backend service role)
GRANT USAGE, SELECT ON SEQUENCE tags_id_seq         TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE tagging_jobs_id_seq TO authenticated;
