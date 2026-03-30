-- Clear all cached translations to re-generate with improved prompt (PR #397)
-- Previously cached_translation was cleared but translated_at was left set,
-- blocking the write-once guard (WHERE translated_at IS NULL) from saving
-- new translations. Clear everything so fresh translations get cached.
UPDATE poems SET
  cached_translation = NULL,
  cached_explanation = NULL,
  cached_author_bio = NULL,
  translated_at = NULL;
