-- Add raw_content column to preserve original undiacritized text
-- and remove excessively long poems (anthologies, not individual poems)
--
-- Run BEFORE uploading diacritized data to diacritized_content column.

-- 1. Add raw_content column
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS raw_content text;

-- 2. Copy current content to raw_content (backup before diacritized data arrives)
UPDATE poems SET raw_content = content WHERE raw_content IS NULL;

-- 3. Remove excessively long poems (>5012 chars = ~952 poems)
-- These are anthologies/collections with 110+ hemistichs, not individual poems for recitation
DELETE FROM poems WHERE length(content) > 5012;
