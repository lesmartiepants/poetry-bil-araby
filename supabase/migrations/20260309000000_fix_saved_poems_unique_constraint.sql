-- Drop the problematic UNIQUE constraint (B-tree can't handle TEXT columns > 2704 bytes)
ALTER TABLE saved_poems DROP CONSTRAINT IF EXISTS saved_poems_user_id_poem_id_poem_text_key;

-- Add a hash column for deduplication of AI-generated poems
ALTER TABLE saved_poems ADD COLUMN IF NOT EXISTS poem_text_hash TEXT;

-- Backfill existing rows
UPDATE saved_poems SET poem_text_hash = md5(poem_text)
  WHERE poem_text IS NOT NULL AND poem_text_hash IS NULL;

-- Auto-compute hash on insert/update
CREATE OR REPLACE FUNCTION set_poem_text_hash()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.poem_text IS NOT NULL THEN
    NEW.poem_text_hash := md5(NEW.poem_text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_poem_text_hash ON saved_poems;
CREATE TRIGGER trg_set_poem_text_hash
  BEFORE INSERT OR UPDATE ON saved_poems
  FOR EACH ROW EXECUTE FUNCTION set_poem_text_hash();

-- Partial unique index for database poems (poem_id is sufficient)
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_poems_unique_db
  ON saved_poems (user_id, poem_id) WHERE poem_id IS NOT NULL;

-- Partial unique index for AI-generated poems (use hash instead of full text)
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_poems_unique_ai
  ON saved_poems (user_id, poem_text_hash) WHERE poem_id IS NULL AND poem_text_hash IS NOT NULL;
