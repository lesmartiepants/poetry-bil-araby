# Editorial contributor instructions

These instructions apply to the Markdown workspace under `editorial/`. The repository’s [AGENTS.md](../AGENTS.md) also applies.

## Start here

- Read the [Editorial Guide](EDITORIAL-GUIDE.md) for the role, purpose, and publication checklist.
- Use the [Card Template](CARD-TEMPLATE.md) for card structure, field mappings, and worked examples.
- Follow [Your First Seven](journeys/your-first-seven.md) and [Women Who Wrote the Canon](collections/women-who-wrote-the-canon.md) for full examples. Keep the nightly reading queue in [Tonight](tonight.md).
- Update the **Editorial files** list in the [Editorial Guide](EDITORIAL-GUIDE.md) in the same change whenever you add, rename, or remove a card.

## Voice and intent

Write as a poetry professor who makes a first encounter with Arabic literature feel inviting and memorable. Assume intelligence and curiosity, and explain only the terms and history that deepen the reading. Lead with something the poem actually does. A sound returns, an image changes, or a speaker catches themselves mid-line. Explain the stakes in plain English. Give readers room to make their own discovery.

A journey earns its order through the links between stops. A collection earns its place through a question its poems explore in different ways. Explain why each poet and poem belongs. Let women shape the main reading path and make room for both canonical and living voices.

Keep reader cues and Why Tonight copy to one to three sentences. Use concrete observations and vary the openings. Avoid defaulting to “listen,” generic praise, or a quiz whose answer the note has already given away.

## Working with the app and corpus

- Keep each card’s bilingual title, reader-facing intro, route and slug, artwork, step labels, and ordered corpus IDs together in its Markdown file. Each poem gets a teaching note and a reader cue. Journey rows also get a short step theme and any excerpt range and full-poem ID.
- Use the existing app fields documented in the template. Put authoring notes and proposed copy in the card. Synchronize release SQL and verify the intended data and app screens when the task calls for release work.

## Fill a card’s corpus gaps

1. **Read the pending rows as a batch.** Use each poet, Arabic title or incipit (opening line), and requested reading range. Keep the supplied order and use the professor’s note to understand why that version or passage belongs.
2. **Search the app corpus and original Qafiyah dump first.** Search in Arabic by poet, title, and incipit. Normalize spelling and remove diacritics for matching while preserving the selected source text. For remaining gaps, use Qafiyah’s current API. Send the Arabic phrase to `GET /v1/search` with `types=poems` and `exact=true`, then fetch the full text with `GET /v1/poems/{slug}`. Check other editions when these sources leave a gap. [Original Qafiyah dump](https://github.com/WTFoss/qafiyah/tree/main/.db_dumps) · [Qafiyah API](https://api.qafiyah.com/v1/docs)
3. **Resolve the edition and app ID.** Reuse a verified app record for the chosen text. Compare variant openings and lineation before selecting a version, and record the decision in the card. Keep upstream numeric IDs and API slugs distinct from IDs verified in the shared app database. Record the exact source or edition used.
4. **Prepare the full bilingual text, then cut the excerpt.** Keep one English reading line per Arabic reading line. The corpus uses `*` as the line separator. Review the excerpt translation in the full text, then slice both languages from the same range. Give the excerpt its own bilingual titles marked **Excerpt / مقتطف** and set `poems.full_poem_id` to the complete work.
5. **Import the text and metadata together.** Verify the target database and the linked poet, which supplies the era. Fill the century, relevant form and catalogue fields, primary mood, topics, motifs, emotional intensity, and accessibility fields. Keep `poems.categories` and `poem_categories` in sync. Record source and translation credits, including draft status. Apply the corpus scoring convention for full works and excerpts. Dry-run the transaction with a rollback, then apply it with checks for matching records and ID collisions. [Categorization workflow](../poetry_quality_and_curation/categorization/README.md)
6. **Verify and update the card.** Read the records back and check the poet, edition, Arabic and English line counts, exact excerpt slices, full-poem links, and metadata. Use the direct poem endpoint to check serving because discovery filters may hide long works. Put the verified reading ID in the ordered row and record the full ID and range for excerpts. Give unresolved entries a specific pending reason and keep the card’s current release status. [Excerpt and reader implementation](../docs/redesign2/EDITORIAL-HANDOFF.md)
