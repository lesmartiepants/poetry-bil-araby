-- Grant table-level access to PostgREST roles for auth-related tables
-- RLS policies (in 20260119 migration) filter rows; these GRANTs allow PostgREST
-- to reach the tables at all via the Supabase client SDK.

GRANT SELECT, INSERT, UPDATE, DELETE ON user_settings TO authenticated;
GRANT SELECT, INSERT, DELETE ON saved_poems TO authenticated;
GRANT SELECT ON discussions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON discussions TO authenticated;
GRANT SELECT ON discussion_likes TO anon;
GRANT SELECT, INSERT, DELETE ON discussion_likes TO authenticated;
