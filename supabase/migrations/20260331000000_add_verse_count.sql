-- Add precomputed verse_count column to avoid expensive per-row array_length()
-- computation in ORDER BY RANDOM() queries, which caused 5s query timeouts on
-- Supabase's connection pooler when scanning all 84K+ poems.
--
-- After this migration, server.js uses p.verse_count <= N (index scan) instead of
-- array_length(string_to_array(content, '*'), 1) <= N (full table scan + per-row compute).

ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS verse_count smallint;

-- Backfill using diacritized_content when available, falling back to content
UPDATE public.poems
SET verse_count = array_length(
  string_to_array(COALESCE(diacritized_content, content), '*'),
  1
)
WHERE verse_count IS NULL;

-- Index to make serving-filter queries fast
CREATE INDEX IF NOT EXISTS poems_verse_count_idx ON public.poems (verse_count);
