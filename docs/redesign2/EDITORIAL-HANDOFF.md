# Editorial launch handoff

## Reader and API

- Excerpts are ordinary poem records linked to their complete work through `poems.full_poem_id`. The [migration](../../supabase/migrations/20261124000003_redesign2_poem_excerpts.sql) adds the nullable foreign key and its index.
- `GET /api/v2/poems/:id` returns `fullPoemId` when the poem is an excerpt. `GET /api/v2/poems/:id/doors` puts the complete work first, using its title. The reader renders that door for any excerpt, including at the end of a journey step.
- `GET /api/v2/poems?poet=…` lists the author's complete catalogue and bypasses the general serving thresholds and 200-result cap. Explore, search, automatic picks and ordinary doors retain their serving rules. Author and Explore counts exclude excerpt records.
- The pinned Wallada → Ibn Zaydun connection shown in the editorial review is a proposed door. The API change pins the complete work for excerpts.

## Shared Supabase

- The excerpt column is present in the linked database. Migration history lists `20261124000000` through `20261124000002`. The excerpt column was applied directly and migration history has no `20261124000003` entry. Apply the committed idempotent migration through the usual migration workflow before deploying the new API elsewhere.
- Featured corpus additions include two Layla al-Akhyaliyya elegies (`89735`, `89736`), the complete _Rain Song_ (`89737`) and Imruʾ al-Qays ode (`89738`), Nazik al-Malaika's _Cholera_ (`89742`), Iman Mersal's _The Idea of Home_ (`89743`), Fadwa Tuqan's _I Will Not Cry_ (`89744`), and Dunya Mikhail's _I Was in a Hurry_ (`89745`). Mersal and Mikhail also received poet records. The modern imports have bilingual texts, category tags, scores, and source credits. Mikhail's English is Elizabeth Winslow's supplied translation. The other three new modern translations are editorial drafts.
- Journey excerpt links are `89739 → 89738` (Imruʾ al-Qays), `89740 → 27173` (Al-Mutanabbi), and `89741 → 89737` (Al-Sayyab). The earlier Imruʾ al-Qays selection `89734` also points to the full ode. Existing rows were updated for Darwish's _To My Mother_ (`85954`), Majnun Layla's opening Tonight pick (`86021`), Al-Khansa's elegy (`48981`), Wallada's title (`86612`), and Ibn Zaydun's _Poem in N_ (`41998`). The Majnun and Imruʾ al-Qays launch records have English poet notes in Insights.
- At Siraj's request, 33 unselected short poems were removed from his legacy Favorites. The 36 selected short poems and 50 longer saves were verified after the cleanup. A recovery copy is local to Siraj's machine.

## Editorial and deployment state

- The [release seed](../../supabase/seed/redesign2-editorial-release.sql) loads the 49 Tonight picks, _Twelve Poems, Centuries of Arabic Verse_, and _Women Who Wrote the Canon_ together. It checks for aligned Arabic and English and all five journey excerpt links. Use the [Tonight queue](../../editorial/tonight.md) for the source roster and poem ID arguments.
- The redesigned app is served at `/new/`. For local review, point `DATABASE_URL` at a preview database containing the editorial corpus, run the seed with the database’s current date as `launch_date`, start `npm run dev:server`, and run `npm --prefix web run dev`. Vite serves `http://localhost:5180/new/` and proxies API calls to port 3001. Check `/api/health/full` before reviewing the screens.
- The localhost rehearsal used a separate database with 76 real poem records, including the five complete works reached from excerpts. It starts with Night 1, _I Pass by the Dwellings_. The seed takes a launch date in the target database’s calendar.
- Hosted `/new/` needs the web and Express API deployed from the updated code, the excerpt migration on the serving database, and the release seed applied there for the chosen launch date. Apply the seed before opening Tonight on launch day so the automatic pick does not claim that date.

## Editorial gaps after the preview

- The `Home` journey and `Start here: Gibran to Darwish` shelf are mock concepts. Each needs a reading roster and introduction before it can appear in the live lists. _Your First Seven_ has a separate editorial card.
- Explore’s Poet of the Week needs an editorial pick and note. Pathways and the reader’s ordinary doors use automatic recommendations with generic reasons. Curated pairings need a way to pin selections and display their reasons.
- The professor’s notes and reading cues remain in the cards. Review which cues to use for Insights, along with translation credits and the attribution and era of _Two Loves_ (`88842`).
