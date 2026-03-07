-- Add curation/quality columns to poems table for the scoring pipeline
-- Populated by scripts/score_poems.py using LiteLLM

-- Quality score (0-100, overall composite score)
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS quality_score SMALLINT;

-- Sub-scores breakdown: {sound, imagery, emotion, language, cultural}
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS quality_subscores JSONB;

-- Which dataset this poem came from (default 'original' for existing poems)
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS source_dataset VARCHAR(20) DEFAULT 'original';

-- Poem form: 1=classical, 2=modern
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS poem_form SMALLINT;

-- Which AI model produced the quality score
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS scoring_model VARCHAR(30);

-- When the poem was scored
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ;

-- Indexes for quality-based filtering and sorting
CREATE INDEX IF NOT EXISTS idx_poems_quality_score ON public.poems (quality_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_poems_source_dataset ON public.poems (source_dataset);
CREATE INDEX IF NOT EXISTS idx_poems_quality_poet ON public.poems (quality_score DESC NULLS LAST, poet_id);

-- Backfill existing poems with 'original' source_dataset
UPDATE poems SET source_dataset = 'original' WHERE source_dataset IS NULL;
