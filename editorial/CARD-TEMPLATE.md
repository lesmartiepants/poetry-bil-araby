# Editorial card template

Use one Markdown file per journey or collection. The card is the blueprint an editor and an app implementer can work from together. Open with the professor’s reasons for choosing the poems. Give the app its display copy and ordered corpus IDs. Use the poem notes to show how the idea works in the actual reading.

Read the [editorial guide](EDITORIAL-GUIDE.md) for the larger purpose. The two complete cards are [Your First Seven](journeys/your-first-seven.md) and [Women Who Wrote the Canon](collections/women-who-wrote-the-canon.md).

## Write in the professor’s voice

Imagine introducing a poem to a curious reader who may be hearing Arabic poetry for the first time. Begin with a detail the reader can see, hear, or feel. Say what the poet does with it and why that matters here. A historical or formal detail earns its place when it changes the next reading. A good cue leaves the reader something to discover.

The **professor’s perspective** makes the case for the whole card. The **professor’s note** connects one particular poem to that case. The **reader cue** carries one insight onto the page in one to three sentences. Vary the rhythm of the cues. An observation can invite a rereading as easily as a question.

## Copy this structure

Save it under `journeys/<slug>.md` or `collections/<slug>.md`. Use a stable lower-case slug with hyphens.

When you add, rename, or remove a card, update the **Editorial files** list in the [editorial guide](EDITORIAL-GUIDE.md). Use the card’s display title and a relative link to its file.

```markdown
# <English title> · <Arabic title>

## The professor’s perspective

<The question I would bring to class and why this group of poems is worth reading.>

<For a journey, say how the reader gets from the opening poem to the ending.
For a collection, give the shelf one editorial question and explain the link or range the reader can explore.>

## App card

| Field                     | Value                                                            |
| ------------------------- | ---------------------------------------------------------------- |
| Kind and slug             | <journey or collection> · <stable slug>                          |
| English and Arabic titles | <English title> · <Arabic title>                                 |
| Step labels               | <step label in English> · <step label in Arabic>                 |
| Artwork                   | <colour hex> · <pattern key, or app default>                     |
| Card count                | <count derived from the reading order>                           |
| Detail route              | /new/<journey or collection>/<slug>                              |
| Release                   | <Draft, in review, or approved for preview, with any dependency> |

**Journey intro** or **Collection intro**

> <Reader-facing description in two or three sentences. Give the reader a reason to open the card.>

## Reading order

<Use the appropriate table below and put one row per poem in display order.>

## What to teach at each stop

### <Position and journey theme, or position and poet/poem title>

**Professor’s note.** <What is worth knowing about this poet, what the poem does, and why it belongs at this point. Link the source where it matters.>

**Reader cue.** <One to three sentences that put one concrete detail in the reader’s hands.>

## App handoff

<Flag corpus, credit, excerpt, door, and release details that someone needs to
act on. Specify the current state and any remaining decision.>
```

Use **What to teach in each poem** as the teaching section heading for a collection.

### Journey roster

Use a short step theme the app can show beside the poet’s name. An excerpt gets its own corpus ID, range, and linked full-poem ID.

| Position | Step theme    | Poem                                  | Corpus ID    | Reading                                       |
| -------- | ------------- | ------------------------------------- | ------------ | --------------------------------------------- |
| 1        | <short theme> | <Poet · English title · Arabic title> | <reading ID> | <Complete, or excerpt range and full-poem ID> |

### Collection roster

Use catalogue titles and poet names after checking them against the chosen edition. Mark traditional or disputed attribution where the reader needs to see it.

| Position | Poet   | English title | Arabic title | Corpus ID |
| -------- | ------ | ------------- | ------------ | --------- |
| 1        | <poet> | <title>       | <عنوان>      | <poem ID> |

### Where the fields go

- The app reads the slug, kind, titles, intro, step labels, colour, and optional `pattern_key` from `collections`. Keep the card count derived from the roster. User progress comes from the app.
- The ordered IDs go in `collection_poems.poem_id` with one-based `position`. Journey `theme` is the compact step title. Collections can leave it empty.
- The existing reader uses `poems.full_poem_id` to put the complete work first in the doors for an excerpt. Mark an excerpt in the catalogue title in both languages. Record any other proposed door with its target ID and say if it still needs wiring.
- A reader cue is draft copy for Insights. The app’s reading order carries IDs and step themes. Keep the longer teaching notes in the Markdown card.
- Before publishing, check the exact Arabic and English in the corpus, line alignment, titles, credits, attribution, and any excerpt boundaries. Record mismatches as handoff items with a specific action.

## Worked journey example · Your First Seven

**The professor’s perspective.** I’d begin with a poet asking two companions to stop. Once the reader hears the invitation in the Arabic, the campsite becomes a place where people can share grief. That gives us a gesture to come back to when a later poet tries to work out which part of himself has been left in another country.

**App card.** `journey` · `your-first-seven` · Your First Seven / سبع سماوات · Heaven / سماء · `#22406E` · `seljuk` · 7 heavens · `/new/journey/your-first-seven`.

**Journey intro**

> Seven poems begin with a plea to stop and weep and end with a poet caught between two places. Start anywhere, or follow the seven in order.

| Position | Step theme         | Poem                                                          | Corpus ID | Reading                            |
| -------- | ------------------ | ------------------------------------------------------------- | --------- | ---------------------------------- |
| 1        | The abandoned camp | Imruʾ al-Qays · Stop, Let Us Weep (Excerpt) · قفا نبك (مقتطف) | `89739`   | First six bayts. Full ode `89738`. |

**Professor’s note.** Imruʾ al-Qays gives us a way into the classical ode through the traces of a camp. A tiny likeness to peppercorns makes a vanished life imaginable. The invitation to weep prepares us for Al-Khansa addressing her own eye.

**Reader cue.** The speaker asks two companions to stop with him. What can he still see at the camp after everyone else has gone?

**App handoff.** The first door connects the excerpt `89739` to the complete work `89738`. The complete work uses its catalogue title as the door label.

## Worked collection example · Women Who Wrote the Canon

**The professor’s perspective.** What have women poets made possible in Arabic verse? Put Al-Khansa’s address to her eye beside the plea to both eyes in Fadwa Tuqan’s poem about Jaffa. One gesture travels across centuries, and the later poet changes what it can do.

**App card.** `collection` · `women-who-wrote-the-canon` · Women Who Wrote the Canon / نساء كتبن الديوان · Poem / قصيدة · `#4A1620` · `laceria` · 12 poems · `/new/collection/women-who-wrote-the-canon`.

**Collection intro**

> A bird calls a brother back to mind. A poet in Córdoba claims the right to give her own kiss. Read these poems for the ways women have made grief, desire, faith, and public memory speak in Arabic.

| Position | Poet      | English title        | Arabic title               | Corpus ID |
| -------- | --------- | -------------------- | -------------------------- | --------- |
| 1        | Al-Khansa | Lament for a Brother | يا عين جودي بدمع منك مهراق | `48981`   |

**Professor’s note.** Al-Khansa lets a bird’s call bring Sakhr back unbidden, then chooses what listeners will remember about him. The switch from involuntary memory to deliberate praise gives the reader something to recognize when they reach Tuqan’s _I Will Not Cry_.

**Reader cue.** A bird calls and the memory of a brother arrives. Where does her grief become a portrait of him?

**App handoff.** Use the corpus poem as position 1. Keep the pairing with Tuqan in the teaching note and keep the shelf’s step theme empty.

## Tonight uses the same voice

[Tonight](tonight.md) is a queue. Record the night, corpus ID, and a **Why Tonight** note of one to three sentences. The note should have the immediacy of a reader cue and the depth of a brief close reading. The day’s entry maps to `featured_poems.date`, `poem_id`, and `reason`.

**Example · Darwish, To My Mother · `85954`**

> There’s a quiet ache in the way Darwish remembers his mother through bread, coffee, and touch. The longing for Palestine takes on the intimacy of an ordinary morning at home.
