-- Predictable data for the @live journeys, on top of supabase/seed/fixtures.sql.
UPDATE poems SET cached_translation = 'This is an invented test text * A second line made for testing * A closing that says this poem is test data',
                 cached_explanation = 'A fixture explanation: the speaker addresses the test reader.' WHERE id = 24;
INSERT INTO featured_poets (week_start, poet_id, note) VALUES (CURRENT_DATE - 1, 5, 'A fixture poet of the week.') ON CONFLICT (week_start) DO NOTHING;
UPDATE poets SET region = 'Najd', gender = 'f' WHERE id = 5;
