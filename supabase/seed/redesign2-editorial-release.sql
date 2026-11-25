-- Apply to the real-corpus preview first. All entries are written together.
-- Required psql variables: launch_date, mersal_id, tuqan_id, malaika_id, mikhail_id.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE editorial_launch (
  launch_date date NOT NULL,
  mersal_id integer NOT NULL,
  tuqan_id integer NOT NULL,
  malaika_id integer NOT NULL,
  mikhail_id integer NOT NULL
) ON COMMIT DROP;
INSERT INTO editorial_launch VALUES
  (:'launch_date'::date, :'mersal_id'::integer, :'tuqan_id'::integer, :'malaika_id'::integer, :'mikhail_id'::integer);

DO $$
DECLARE
  launch editorial_launch%ROWTYPE;
BEGIN
  SELECT * INTO STRICT launch FROM editorial_launch;
  IF launch.launch_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'The launch date must be today or later';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.poems p JOIN public.poets a ON a.id = p.poet_id
    WHERE p.id = launch.mersal_id AND a.name LIKE '%مرسال%' AND p.title = 'فكرة البيوت'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.poems
    WHERE id = launch.tuqan_id AND poet_id = 143 AND title = 'لن أبكي'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.poems
    WHERE id = launch.malaika_id AND poet_id = 510 AND title = 'الكوليرا'
  ) THEN
    RAISE EXCEPTION 'The Mersal, Tuqan, and al-Malaika IDs must match the editorial roster';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.poems p JOIN public.poets a ON a.id = p.poet_id
    WHERE p.id = launch.mikhail_id AND p.full_poem_id IS NULL
      AND (a.name_en ILIKE '%dunya%mikhail%' OR a.name LIKE '%دنيا%ميخ%')
      AND lower(btrim(p.title_en)) = 'i was in a hurry'
  ) THEN
    RAISE EXCEPTION 'Question 12 requires Dunya Mikhail''s complete I Was in a Hurry';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(ARRAY[
      83956, 27143, 89749, 85954, 46151, 89739, 41998, 89748, 89741, 89747,
      48981, 88077, 86021, 89735, 89736, 88842,
      86660, 89572, 86612, 87922, launch.mersal_id, launch.tuqan_id, launch.malaika_id, launch.mikhail_id,
      85310, 20480, 27314, 6818, 86330, 84469, 87778, 89072, 87669, 87139, 85970,
      63382, 87183, 88933, 88871, 87530, 85509, 88474, 85579, 86226, 87373,
      85646, 86416, 88873, 85479, 88589, 85692, 43335, 85389, 86163, 89059,
      86827, 87286, 88897, 43398, 87505, 47679, 86248, 74289, 59663, 85330,
      6768, 86759, 14242, 88494, 87340, 87325
    ]) AS entry(id)
    LEFT JOIN public.poems p ON p.id = entry.id
    WHERE nullif(btrim(coalesce(p.diacritized_content,p.content)), '') IS NULL
      OR nullif(btrim(p.cached_translation), '') IS NULL
      OR cardinality(string_to_array(coalesce(p.diacritized_content,p.content),'*'))
         <> cardinality(string_to_array(p.cached_translation,'*'))
  ) THEN
    RAISE EXCEPTION 'Every editorial poem needs aligned Arabic and English before release';
  END IF;
  IF (SELECT count(*) FROM public.poems p JOIN public.poems f ON f.id = p.full_poem_id
      WHERE (p.id,f.id) IN ((89749,49023), (89739,89738), (89748,82417), (89741,89737), (89747,89746))
        AND f.full_poem_id IS NULL AND nullif(btrim(f.cached_translation),'') IS NOT NULL
        AND cardinality(string_to_array(coalesce(f.diacritized_content,f.content),'*'))
            = cardinality(string_to_array(f.cached_translation,'*'))) <> 5 THEN
    RAISE EXCEPTION 'All five journey excerpt links need complete bilingual poems';
  END IF;
END
$$;

INSERT INTO public.collections
  (slug, kind, title_en, title_ar, intro, step_label_en, step_label_ar, colour, pattern_key, published)
VALUES
  ('twelve-poems-centuries-of-arabic-verse', 'journey',
   'Twelve Poems, Centuries of Arabic Verse', 'اثنتا عشرة قصيدة عبر قرون من الشعر العربي',
   'Bread at dawn, a campsite after everyone has gone, a sound that changes each time it returns. Twelve poems take up questions about grief, desire, home, and what we owe each other. Start with whichever question stays with you.',
   'Question', 'سؤال', '#22406E', NULL, true),
  ('women-who-wrote-the-canon', 'collection', 'Women Who Wrote the Canon', 'نساء كتبن الديوان',
   'A bird calls a brother back to mind. A poet in Córdoba claims the right to give her own kiss. A poet in Baghdad makes the sound of an epidemic travel through the night. Read these twelve poems for the ways women have made grief, desire, faith, and public memory speak in Arabic.',
   'Poem', 'قصيدة', '#4A1620', 'laceria', true);

INSERT INTO public.collection_poems (collection_id, position, poem_id, theme)
SELECT c.id, a.position::integer, a.poem_id, a.theme
FROM editorial_launch l
JOIN public.collections c ON c.slug = 'twelve-poems-centuries-of-arabic-verse'
CROSS JOIN LATERAL unnest(
  ARRAY[83956,27143,89749,85954,46151,89739,l.malaika_id,41998,89748,89741,89747,l.mikhail_id],
  ARRAY[
    'What makes life worth living?', 'How high should we aspire?', 'What does grief do to language?',
    'What does home smell like?', 'Why do we desire forbidden things?', 'Can a place remember someone?',
    'Can a poem make us hear death?', 'What remains when love ends?', 'What can we truly know?',
    'Can rain mean grief and hope at once?', 'When is compromise a betrayal?', 'What is Arabic poetry becoming?'
  ]
) WITH ORDINALITY AS a(poem_id,theme,position);

INSERT INTO public.collection_poems (collection_id, position, poem_id)
SELECT c.id, a.position::integer, a.poem_id
FROM editorial_launch l
JOIN public.collections c ON c.slug = 'women-who-wrote-the-canon'
CROSS JOIN LATERAL unnest(
  ARRAY[48981,89735,89736,88842,86660,89572,86612,88077,l.malaika_id,l.tuqan_id,87922,l.mersal_id]
) WITH ORDINALITY AS a(poem_id,position);

INSERT INTO public.featured_poems(date, poem_id, reason)
SELECT l.launch_date + a.day_offset, a.poem_id, a.reason
FROM editorial_launch l
CROSS JOIN LATERAL (VALUES
  (0,86021,'The walls are what grief can still touch. The Arabic keeps returning to the word for the dwellings, as though the speaker were making one more pass.'),
  (1,85954,'There’s a quiet ache in the way Darwish remembers his mother through bread, coffee, and touch. The longing for Palestine takes on the intimacy of an ordinary morning at home.'),
  (2,85310,'The notebooks and cigarettes give the opening the plain detail of a search. As Darwish turns to the body, he imagines how much harder it is to take away a voice.'),
  (3,20480,'Ibn Mayyada gives water a face that can laugh and weep at once. In four short lines, the poem changes our sense of how much water a tear can hold.'),
  (4,27314,'Al-Mutanabbi lets us hear a tipsy guest trying to preserve his dignity. His praise grows so elaborate that the smallness of what he wants is part of the joke.'),
  (5,6818,'Al-Hallaj starts by speaking of “Him” and suddenly turns to “You.” One pronoun is enough to bring an unseen beloved into the room.'),
  (6,86330,'Grief drains the color from the speaker’s hair just as the departing caravan floods the poem with red. The farewell is told in colors the eye can still hold after the people are gone.'),
  (7,84469,'Al-Baroudi begins like a man defending his accounts. The poem asks what wealth is worth when someone close to you needs it.'),
  (8,87778,'Qabbani uses the language of a police report to describe a country’s pursuit of love. The chill comes from how ordinary the verbs sound.'),
  (9,89072,'A whole friendship is measured in arm’s lengths and outstretched hands. Every attempt at closeness gives the other person a new distance to put between them.'),
  (10,87669,'Ibn al-Khatib makes separation a bodily ailment, with a pounding heart and a wounded eyelid. The speaker judges the health of his love by a different measure.'),
  (11,87139,'Qabbani addresses the sky as though it could settle a private grievance. The repeated “how” lets hurt turn, almost in the same breath, into wonder.'),
  (12,85970,'Darwish puts the windows of a childhood home and the cold window of a prison into the same inventory. The repeated “I have” lets the speaker claim a life large enough to hold both.'),
  (13,63382,'Longing changes the size of the world in this little poem. As the earth closes in, the soul seems to have room for just one thing.'),
  (14,87183,'Al-Murtaḍā gives Time sharp blades and then lets it fall ill like one of us. The change makes it feel both more dangerous and more familiar.'),
  (15,88933,'The rain over Baghdad takes on the direction and force of the speaker’s tears. His longing is so strong that he starts bargaining with the very days that kept him away.'),
  (16,88871,'At the caravan’s farewell, sunset and dawn seem to occupy the same instant. The faces begin to shine just as they are about to disappear behind their curtains.'),
  (17,87530,'Al-Waʿwaʾ begins with a stranger weeping and ends by making the eye itself a place of exile. The image puts an entire sea inside the smallest part of the face.'),
  (18,85509,'Ibn Zaydun gives hope the shape of work done with the hands. The image of planting makes what he eventually harvests all the harder to bear.'),
  (19,88474,'The person who cannot sleep calls out to the dead as though they were sleeping. The farewell is tender enough to wish them the one thing grief has denied the living.'),
  (20,85579,'Al-Ilbiri carries the dead to their graves with his own hands and still feels strangely far from what he witnesses. The poem catches the uneasy distance between knowing something and taking it in.'),
  (21,86226,'A look leaves a mark and an imagined handshake hurts. Al-Nazzam makes desire so vivid that thought itself seems capable of touching a body.'),
  (22,87373,'The first couplet treats safety as the strangest thing in the world. That reversal sets the pace for two more familiar words the poem asks us to reconsider.'),
  (23,85646,'Daisies, dawn, and wine all arrive in one smile. Abu Firas lets the senses run together until the beloved seems to make the whole morning possible.'),
  (24,86416,'The poet answers a rebuke with an ocean and a rain cloud. Giving feels as natural here as weather, and just as difficult to argue with.'),
  (25,88873,'Here a song can melt rock and make a river overflow with fragrance. The images ask us to imagine a poem powerful enough to change the material world.'),
  (26,85479,'Al-Hallaj sends a breeze to deliver a message about a thirst that only grows when he drinks. The body gives us a way to feel a longing it cannot satisfy.'),
  (27,88589,'In these four lines, the speaker is ready to forgive time itself if it brings one place close again. The bargain gives an almost legal shape to an entirely private longing.'),
  (28,85692,'Abu Nuwas imagines the part of himself that is still alive standing beside the part that has died. The strangeness of that image gives his final prayer a very human vulnerability.'),
  (29,43335,'Growing old feels to Abu al-Atahiya like watching a branch stripped of leaves. He gives youth the tenderness of a person he would like to see once more.'),
  (30,85389,'Al-Rundi takes the hard rings of armor and remakes them out of ripples. By the time darkness comes, even the difference between the stream and the sky feels uncertain.'),
  (31,86163,'A dove wakes the poet and immediately makes him doubt his own grief. The bird has become the measure of what he can honestly say about loving Layla.'),
  (32,89059,'The rain cloud is embarrassed by this man’s generosity. Al-Tanukhi keeps looking for something large enough to measure what a human being can give.'),
  (33,86827,'The speaker’s body, resolve, and heart live in three different cities. The poem makes a map out of the parts of himself he can no longer keep together.'),
  (34,87286,'Al-Ma’arri gives the soul a house and then imagines what can happen to it when the tenant leaves. The image lets him ask about death as plainly as someone looking at a building.'),
  (35,88897,'The speaker wakes the sleepers to ask whether love can kill. The poem grows more unsettling as a question about the body turns into a question about guilt.'),
  (36,43398,'Al-Rundi puts an eclipse on a face. A few beauty marks are enough to make looking at a person feel like looking up at the night sky.'),
  (37,87505,'Some eyes sleep while others stay open over things that may never happen. The poem gives worry a bodily cost before it offers the sleepless person any comfort.'),
  (38,47679,'There is time for one last look and no time for a goodbye. The poet makes the eyes do the work that words can no longer do.'),
  (39,86248,'Abu al-Atahiya imagines day and night as a millstone that never stops turning. Gray hair becomes the visible dust left by all that quiet grinding.'),
  (40,74289,'Wine, rain, lavender, and honey pass through the same image. Imruʾ al-Qays makes a trace of a mouth arrive with the abundance of a whole landscape.'),
  (41,59663,'The silence in the lovers’ eyes is as palpable as the stillness of the embrace. Then the poem gives distance a hand and lets it pour the drink.'),
  (42,85330,'Ibn ʿAbd Rabbih starts by naming the soul’s loneliness, then corrects himself mid-line. For a moment we can feel him trying to work out which part of him has really been exiled.'),
  (43,6768,'Al-Hallaj gives the beloved the warmth of fire and the promise of paradise in one breath. The words for sin and shame begin to change meaning under the pressure of that devotion.'),
  (44,86759,'A desert becomes a sea and a rib cage becomes a place to keep a fire. The poem makes the burdens of the road and the burdens we carry in ourselves feel unexpectedly close.'),
  (45,14242,'The hand that writes will turn to dust while the words may remain. In four lines, the poem makes that survival feel like a responsibility.'),
  (46,88494,'Someone steps between the speaker and the heat. What begins as a small act of care becomes a little puzzle about how one sun can shelter us from another.'),
  (47,87340,'A rose can be smelled, a cheek can be kissed, and the poem keeps letting the two touch. By the last cup, even the speaker has trouble telling the sources of his delight apart.'),
  (48,87325,'Ibn ʿArabi uses the image of Jesus raising the dead to describe what a word or a glance can do to a heart. The miracle makes the silence at the start of the poem feel especially sharp.')
) AS a(day_offset,poem_id,reason);

COMMIT;
