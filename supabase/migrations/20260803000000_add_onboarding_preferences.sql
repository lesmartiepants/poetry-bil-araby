-- Onboarding answers follow a signed-in reader across devices.
--
-- Until now the five onboarding answers (family, moods, motifs, era, difficulty)
-- lived only in localStorage.onboardingPrefs, so clearing browser data or picking
-- up a second device lost them.
--
-- ONE JSONB COLUMN, NOT FIVE TYPED ONES. The payload is already versioned
-- (`"version": 2`) and the taxonomy it references is still growing: motif was
-- added after the first cut, era and difficulty store DERIVED BAND KEYS whose
-- banding is recomputed from the live distribution. Typed columns would need a
-- migration every time the flow gains, drops or renames a question. The shape is
-- read by exactly one consumer (src/services/preferences.js), which validates the
-- version on the way in, so the database does not need to know the schema.
--
-- Stored shape (version 2):
--   {"version":2,"family":"love-desire","moods":["pride"],"motifs":["night"],
--    "era":"c9-9","difficulty":"gentle","completedAt":"2026-08-03T14:01:45Z"}
--
-- Named `onboarding_preferences` rather than `preferences`: user_settings already
-- holds theme, font_id and voice_preference, which are all "preferences" too. The
-- name matches the localStorage key it mirrors.
--
-- NULL means "this reader has never completed onboarding on any device", which is
-- distinct from an all-null answer object. No DEFAULT, for that reason.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS onboarding_preferences JSONB;

COMMENT ON COLUMN public.user_settings.onboarding_preferences IS
  'Versioned onboarding answers mirrored from localStorage.onboardingPrefs. Shape owned by src/services/preferences.js, see PREFS_VERSION. NULL means the reader has never completed onboarding.';

-- No new RLS policy and no new GRANT are required:
--   * The policies in 20260119000000_auth_and_user_features.sql are ROW level
--     (`auth.uid() = user_id`) with no column lists, so they already cover every
--     column on the table, present and future.
--   * 20260219000000_postgrest_schema_grants.sql grants table-level
--     SELECT/INSERT/UPDATE/DELETE on user_settings to `authenticated`; a
--     table-level grant extends to columns added later. (A column-level grant
--     would NOT have, which is why this is worth stating rather than assuming.)
-- Re-asserted here anyway so this file is correct standalone and safely re-runnable.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
