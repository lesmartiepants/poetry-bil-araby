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

- The `editorial/redesign2-curation` branch contains the Markdown editorial workspace and `supabase/seed/redesign2-editorial-release.sql`. The seed prepares 49 nights plus the first journey and collection in one transaction. It requires a chosen launch date. The joint release slugs and upcoming opening picks were absent in the linked database at handoff.
- Confirm Heaven 7 before running that seed. The checked-in draft still uses Mikhail. Siraj also selected Ibn ʿAbd Rabbih's `85330` as a replacement during review, and the subsequent discussion moved to Tonight and Favorites.
- The redesigned app is served at `/new/`. For local review, start the API with `npm run dev:server` and run `npm --prefix web run dev`. The web dev server defaults to port 5180 and proxies API calls to port 3001. Point the API at the intended database and check `/api/health/full`. The local backend found on port 3001 during handoff was serving a 26-poem fixture.
- No hosted deployment was made for the app changes in this handoff. The Vercel configuration builds the web app under `/new/`. A hosted rehearsal needs the updated Express API and the excerpt migration on the database it uses.
- Verified web type-checking, 22 web unit tests, and the migration and excerpt endpoints on isolated Postgres. The 49-night seed was exercised against isolated fixtures. The editorial HTML review lives in Siraj's Downloads folder.
