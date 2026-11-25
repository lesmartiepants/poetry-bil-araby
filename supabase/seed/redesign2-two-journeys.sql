-- Publishes "Your First Seven" and "The Foundational Voices" from editorial/*/*.md.
-- Requires supabase/migrations/20261125000000_redesign2_collection_subtitles.sql.
-- Idempotent: upserts each collection by slug (id is kept, so user progress survives)
-- and replaces that collection's steps. One transaction; any failed check aborts it.
\set ON_ERROR_STOP on
BEGIN;

DO $$
BEGIN
  -- Every step must exist, match the card's Arabic title, and have aligned Arabic/English lines.
  IF EXISTS (
    SELECT 1
    FROM (VALUES
      (89739,'قفا نبك (مقتطف)'), (48981,'يا عين جودي بدمع منك مهراق'), (89740,'واحَرَّ قلباه (مقتطف)'),
      (88077,'ألا هل لنا من بعد هذا التفرق'), (89741,'أنشودة المطر (مقتطف)'), (85954,'إلى أمي'),
      (85330,'غربة الروح'),
      (74289,'خمرة الرحيق وذوب العسل'), (89738,'معلقة امرئ القيس: قفا نبك'),
      (79325,'الموت لا يرعى والدهر معار'), (76508,'الشيخوخة وهلاك العمر'),
      (62403,'عتاب الزمان وخداع الأقارب'), (81220,'فخر القبيلة وحرب الأقدار'),
      (62296,'ظلام الظلم وفقدان العهد'), (76804,'مصير الأمير'), (85668,'وصية غريبة')
    ) AS e(id, title)
    LEFT JOIN public.poems p ON p.id = e.id AND p.title = e.title
    WHERE p.id IS NULL
      OR nullif(btrim(coalesce(p.diacritized_content,p.content)), '') IS NULL
      OR nullif(btrim(p.cached_translation), '') IS NULL
      OR cardinality(string_to_array(coalesce(p.diacritized_content,p.content),'*'))
         <> cardinality(string_to_array(p.cached_translation,'*'))
  ) THEN
    RAISE EXCEPTION 'Every step needs its poem, the card title, and aligned Arabic and English';
  END IF;
  IF (SELECT count(*) FROM public.poems WHERE (id, full_poem_id) IN ((89739,89738), (89740,27173), (89741,89737))) <> 3 THEN
    RAISE EXCEPTION 'The three excerpt steps must link to their full poems';
  END IF;
END
$$;

INSERT INTO public.collections
  (slug, kind, title_en, title_ar, subtitle_en, subtitle_ar, intro, step_label_en, step_label_ar, colour, pattern_key, published)
VALUES
  ('your-first-seven', 'journey', 'Your First Seven', 'سبع سماوات',
   'Weep at the ruins, end in exile. Welcome.', 'ابكِ على الأطلال، وانتهِ في المنفى. أهلًا بك.',
   'Seven poems begin with a plea to stop and weep and end with a poet caught between two places. Along the way, hear what happens when a bird, a cup of coffee, or the sound of rain carries more than a person can say outright. Start anywhere, or follow the seven in order.',
   'Heaven', 'سماء', '#22406E', 'seljuk', true),
  ('the-foundational-voices', 'collection', 'The Foundational Voices', 'أصوات التأسيس',
   'The originals. Everyone else is a cover band.', 'الأصوات الأولى، والباقون صدى',
   'A lover tastes rain and honey in a kiss. A sister hears her brother in a dove’s call. In these early Arabic poems, a place can remember the people who left it, and a borrowed day can change how you choose to live.',
   'Poem', 'قصيدة', '#654634', 'ogee', true)
ON CONFLICT (slug) DO UPDATE SET
  kind = EXCLUDED.kind, title_en = EXCLUDED.title_en, title_ar = EXCLUDED.title_ar,
  subtitle_en = EXCLUDED.subtitle_en, subtitle_ar = EXCLUDED.subtitle_ar, intro = EXCLUDED.intro,
  step_label_en = EXCLUDED.step_label_en, step_label_ar = EXCLUDED.step_label_ar,
  colour = EXCLUDED.colour, pattern_key = EXCLUDED.pattern_key, published = EXCLUDED.published;

DELETE FROM public.collection_poems
WHERE collection_id IN (SELECT id FROM public.collections WHERE slug IN ('your-first-seven', 'the-foundational-voices'));

INSERT INTO public.collection_poems (collection_id, position, poem_id, theme)
SELECT c.id, a.position::integer, a.poem_id, a.theme
FROM public.collections c
CROSS JOIN LATERAL unnest(
  ARRAY[89739,48981,89740,88077,89741,85954,85330],
  ARRAY['The abandoned camp','Grief','Pride','Desire','Rain','Home','Home, again']
) WITH ORDINALITY AS a(poem_id, theme, position)
WHERE c.slug = 'your-first-seven';

INSERT INTO public.collection_poems (collection_id, position, poem_id)
SELECT c.id, a.position::integer, a.poem_id
FROM public.collections c
CROSS JOIN LATERAL unnest(
  ARRAY[74289,89738,48981,79325,76508,62403,81220,62296,76804,85668]
) WITH ORDINALITY AS a(poem_id, position)
WHERE c.slug = 'the-foundational-voices';

COMMIT;
