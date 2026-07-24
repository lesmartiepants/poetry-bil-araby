# Poem Categorization — Product Read (Opinion 1)

Branch: `claude/poet-categorization-schema-ertkxf` (1 commit, `dbad695`)

A PM + experience-designer read of the categorization layer, done as ASCII panels.

```
+==============================================================================+
|                                                                              |
|      POEM CATEGORIZATION  ::  a "vibe layer" over 84,329 Arabic poems        |
|      branch: claude/poet-categorization-schema-ertkxf   (1 commit, dbad695)  |
|                                                                              |
+==============================================================================+
```

## 1. What's actually been designed

```
   THE PROBLEM IT ATTACKS
   ----------------------
   Today a poem has ONE scholarly label (غرض) and it's often wrong or useless:
       al-Khansa's war elegy ......... "غير مصنف"  (uncategorized)
       al-Rafi'i love poem ........... "خمر"       (wine — just wrong)
       Abu Nuwas ghazal .............. "قصيرة"      (that's "short", not a theme)
   You can browse by POET. You cannot browse by how a poem FEELS.

   THE SHAPE OF THE FIX  (additive — leaves theme/era/meter untouched)
   --------------------------------------------------------------------
   +-----------------------------------------------------------------------+
   |  3 MULTI-LABEL DIMENSIONS            |  4 SCALARS (columns on poems)   |
   |  ...................................  |  .............................. |
   |  mood   16 values  (حزن، حنين، فرح…) |  mood_primary       one mood    |
   |  topic  16 values  (الحب، الوطن…)    |  emotional_intensity  0..100    |
   |  motif  12 values  (الليل، الطلل…)   |  accessibility_level  1..5      |
   |  max 4 / 4 / 5 labels per poem       |  century            ~CE int     |
   +-----------------------------------------------------------------------+

   PIPELINE (mirrors the proven quality-scoring pipeline)
   ------------------------------------------------------
   config.py ---> Claude (Haiku bulk / Sonnet refine) ---> Parquet ---> DB import
      |            LiteLLM, async, resumable,               ~$0.45 / 1k poems
      |            cost-capped, --dry-run
      +--> also GENERATES the SQL vocab seed AND the Arabic prompt
           (single source of truth: prompt & validation can't drift)

   API (backward-compatible, gated by a startup hasCategorization check)
   --------------------------------------------------------------------
   GET /api/categories          -> dimensions + values + counts (for filter UI)
   GET /api/poems/by-category    -> ?mood=&topic=&motif=&minIntensity=&
                                      maxAccessibility=&limit=  (AND across dims,
                                      OR within a dim, ORDER BY RANDOM())
```

The engineering is clean: normalized vocab tables, a JSONB provenance twin, RLS matching existing posture, idempotent seeds, tests passing. But one fact dominates everything below:

```
   +----------------------------------------------------------------+
   |  ZERO frontend consumes this. The only caller is a test file.  |
   |  100% of the reader value is still locked behind a UI nobody    |
   |  has designed yet. This is a foundation, not a feature.         |
   +----------------------------------------------------------------+
```

## 2. Two opinionated personas walk in

```
+------------------------------+     +--------------------------------------+
|  LAYLA  ~  the heritage      |     |  USTADH KAREEM  ~  the purist        |
|          seeker              |     |                 (Arabic teacher)     |
|..............................|     |......................................|
|  Diaspora, 29. Reads Arabic  |     |  60s. Teaches classical poetry.      |
|  at a B1 level, keeps        |     |  Reveres the غرض tradition. Deeply   |
|  translation ON. Opens the   |     |  suspicious of a model slapping      |
|  app "when I miss home."     |     |  "melancholy" on al-Mutanabbi.       |
|                              |     |                                      |
|  WANTS:                      |     |  WANTS:                              |
|   - "give me something sad   |     |   - accuracy he can trust, or he     |
|     and beautiful" entry     |     |     won't recommend it to students   |
|   - poems she can actually   |     |   - motif fidelity (طلل, الليل are  |
|     read (accessibility!)    |     |     the real craft signals)          |
|   - playlists, "more like    |     |   - to SEE why a tag was applied     |
|     this", saved moods       |     |                                      |
|                              |     |  DISTRUSTS:                          |
|  ANNOYED BY:                 |     |   - 16 moods that blur together      |
|   - 16 shades of sad she     |     |   - a machine guessing the "century" |
|     can't tell apart         |     |     of a poem from its text          |
|   - that none of this is     |     |   - flattening a qasida to 4 chips   |
|     visible in the app yet   |     |                                      |
+------------------------------+     +--------------------------------------+
        \                                      /
         \   both are right, and they pull    /
          \  the roadmap in useful tension:  /
           `----> Layla = MORE entry points, FEWER, clearer labels
                  Kareem = HIGHER trust, EXPLAINABILITY, less guessing
```

## 3. Removals — cut before you ship

```
  [ CUT ] century (scalar)
          Haiku guessing "10 or 20 CE" from poem text is the noisiest field
          here, and poets.era already gives you period at the poet level.
          KAREEM: "You already know al-Mutanabbi is 10th century. Why ask a
          model to re-guess it, worse?"  -> derive from poet, don't classify.

  [ CUT / WIRE ] poem_categories.confidence  +  categories.confidences (JSONB)
          The schema reserves per-label confidence. The prompt never asks for
          it. It's a dead column today. Either make the classifier emit it and
          USE it (threshold weak tags, show "high confidence" filter) or drop
          it. Half-built provenance rots.

  [ DEFER ] motif as a LAUNCH facet
          Motifs are the least reader-legible discovery axis ("I want poems
          with... birds?"). Gorgeous for Kareem, confusing for Layla. Keep
          classifying them (cheap), but don't put them in the v1 filter bar.

  [ COLLAPSE ] 16 moods -> ~8 for the UI
          melancholy / grief / despair / yearning / nostalgia = 5 flavors of
          sad. Keep all 16 in the data; expose a curated 8 as chips, with the
          rest as an "advanced" reveal. LAYLA can't pick between حزن and أسى.
```

## 4. Improvements — sharpen what's there

```
  ~ VALIDATION: guarantee mood_primary is a member of moods[]. Right now the
    prompt asks for both independently; nothing enforces the invariant. A
    poem tagged primary=joy with moods=[grief] should never import.

  ~ PERFORMANCE: by-category does EXISTS-per-dimension + ORDER BY RANDOM()
    across 84k rows. The GIN index you added is on the JSONB column, but the
    endpoint queries the normalized join, so it goes unused. Add the index
    that matches the query, or the "random melancholy poem" call gets slow
    exactly when it's the hero interaction.

  ~ COUNTS: /api/categories computes poem counts live via JOIN. Cache them
    (or a nightly rollup). "Melancholy (3,412)" is a great UI affordance but
    not worth a full-table count on every filter-bar render.

  ~ COMPOSABILITY: by-category can't take a poet= or era=. The most natural
    real query is "melancholy poems by Darwish." One missing passthrough
    blocks the whole poet x vibe cross-browse.

  ~ LEAD WITH accessibility_level. It's the most OBJECTIVE, most defensible
    scalar and it directly serves Layla's #1 need. It's buried as param #5.
    Make it a first-class entry point, not a fine-tuning knob.
```

## 5. Gaps — the holes that block trust and shipping

```
   GAP                        WHY IT MATTERS                    WHOSE PAIN
   -------------------------  --------------------------------  ----------
   No frontend, anywhere      the entire value is invisible     Layla
   Only 4 POC samples,        can't trust mood filters at 84k   Kareem
     no accuracy eval           without a gold set + spot-check
   No "why this tag"          a matched line/reason = trust     Kareem
     explainability             (and a beautiful UI detail)
   No feedback loop           84k AI labels WILL be wrong       both
     (thumbs up/down a tag)     sometimes; no way to correct
   No tie to saved-poems      mood filter + save = playlists,   Layla
     / auth                     the obvious next feature, unbuilt
   No RTL filter-UI design    labels are bilingual in DB but    Layla
                                nobody designed the Arabic chip bar
   century likely null-heavy  no "unknown" handling in filter   both
```

## 6. Additions — what this foundation actually unlocks

```
   NOW (data exists, just needs surface)          reuses existing app parts
   ------------------------------------           -------------------------
   [1] "How do you want to feel?" home entry ...  the poem carousel
       one tap: Melancholic / Serene / Defiant    /api/poems/by-category
       -> a curated stream instead of pure random

   [2] Learner Ladder ........................... translation + Listen(TTS)
       accessibility <=2, intensity moderate,
       translation ON. A guided rung-by-rung path.
       (Layla's dream; also your most defensible claim)

   [3] "More like this" on every poem ..........  poem detail view
       same mood_primary + one shared topic.
       Cheapest possible reccomender, huge stickiness.

   NEXT (small build on top)
   -------------------------
   [4] Themed collections / playlists ..........  saved-poems + auth
       editorial + AI: "Poems of Exile", "The Night".
       Feed them straight into the TTS listen queue.

   [5] Feedback chip: "feels melancholic? y/n" .  cheap human-in-loop
       turns 84k readers into your QA team; fixes
       Kareem's accuracy objection over time.

   [6] Seasonal / temporal serve ...............  daily-poem
       night+moon motifs after dark; garden/dawn in spring.

   LATER (differentiators)
   -----------------------
   [7] Mood JOURNEY through a poet's life (century+mood over a poet's corpus)
   [8] Emotional-intensity DIAL: slide calm <-----> intense, live re-serve
   [9] Motif as a VISUAL discovery map (Kareem's craft view, done as art)
```

## 7. One-line verdict

```
+------------------------------------------------------------------------------+
|  The plumbing is excellent and the taxonomy is thoughtful. The risk is that   |
|  it stays a beautiful backend forever. Ship the smallest reader surface       |
|  ([1] mood entry + [2] accessibility ladder), collapse the moods to 8, cut    |
|  `century`, and add a feedback chip so Kareem's trust problem fixes itself.   |
|  Everything else is a fast-follow once something is visible.                  |
+------------------------------------------------------------------------------+
```

## Highest-leverage next moves

- (a) Build the "How do you want to feel?" entry against the existing carousel.
- (b) Write a proper classifier eval (gold set + accuracy report) before trusting the mood filters.
- (c) Draft the migration that cuts `century` and wires `confidence`.
