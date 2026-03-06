-- Add column for diacritized (tashkeel) poem content
-- Populated by scripts/batch-diacritize.py using Mishkal
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS diacritized_content text;
