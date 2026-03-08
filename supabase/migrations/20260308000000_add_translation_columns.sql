-- Add columns for caching AI-generated translations on poems
-- Allows serving pre-translated poems without hitting the Gemini API

ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS cached_translation TEXT;
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS cached_explanation TEXT;
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS cached_author_bio TEXT;
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS translated_at TIMESTAMPTZ;

-- Partial index for "prefer translated" single-query approach
CREATE INDEX IF NOT EXISTS idx_poems_has_translation
  ON public.poems (id)
  WHERE cached_translation IS NOT NULL;
