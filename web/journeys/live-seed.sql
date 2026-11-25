-- Predictable data for the @live journeys, on top of supabase/seed/fixtures.sql.
UPDATE poems SET cached_translation = 'This is an invented test text * A second line made for testing * A closing that says this poem is test data',
                 cached_explanation = 'A fixture explanation: the speaker addresses the test reader.' WHERE id = 24;
INSERT INTO featured_poets (week_start, poet_id, note) VALUES (CURRENT_DATE - 1, 5, 'A fixture poet of the week.') ON CONFLICT (week_start) DO NOTHING;
UPDATE poets SET region = 'Najd', gender = 'f' WHERE id = 5;
-- V3: a published journey and collection, and tonight's pick (a journey step).
INSERT INTO collections (slug, kind, title_en, title_ar, intro, step_label_en, step_label_ar, colour, published) VALUES
  ('fixture-journey', 'journey', 'Fixture journey', 'رحلة الاختبار', 'Three fixture poems, one step at a time.', 'Heaven', 'سماء', '#22406E', true),
  ('fixture-collection', 'collection', 'Fixture collection', 'مختارات الاختبار', 'Fixture poems by fixture poets.', 'Poem', 'قصيدة', '#4A1620', true)
ON CONFLICT (slug) DO NOTHING;
INSERT INTO collection_poems (collection_id, position, poem_id)
SELECT c.id, x.pos, x.poem FROM collections c, (VALUES ('fixture-journey', 1, 24), ('fixture-journey', 2, 9), ('fixture-journey', 3, 3),
  ('fixture-collection', 1, 9), ('fixture-collection', 2, 11)) AS x(slug, pos, poem)
WHERE c.slug = x.slug ON CONFLICT DO NOTHING;
INSERT INTO featured_poems (date, poem_id, reason) VALUES (CURRENT_DATE, 24, 'A fixture reason for tonight.') ON CONFLICT (date) DO NOTHING;
