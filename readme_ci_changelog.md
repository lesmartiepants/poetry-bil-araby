# README CI Changelog

Automated record of README updates made by the `README Auto-Update` workflow
(`.github/workflows/readme-autoupdate.yml`). On each merge to `main`, Claude Code applies the
`/professional-readme` skill to keep the README accurate to the change that landed, and
prepends an entry below (newest first) describing **why** it changed and a concise
**before -> after** summary. The exact line diff lives in the accompanying pull request.

<!-- New entries are inserted directly below this line, newest first. -->

## 2026-07-28 — f985357 feat(categorization): add Explore Poems (mood/topic/motif filtering) (#652)

**Why:** This merge adds a poem categorization layer (`feature-manifest.json` entry `poem-categorization`, feature flag `categoryExplorer` in `src/constants/features.js`): a new "Explore Poems" entry in the Account menu (`src/components/AccountMenu.jsx`) opens `CategoryExplorer.jsx`, letting readers browse or filter the library by mood, topic, motif, emotional intensity, and reading difficulty. The backend gained two endpoints, `GET /api/categories` and `GET /api/poems/by-category` (`server.js`), gated behind a `hasCategorization` check that stays false until the new `supabase/migrations/20260722000000_add_poem_categorization.sql` migration has run. The README's Discovery feature list and API description were missing this.

**README changes:**
- Features > Discovery: added "Explore Poems (Account menu): browse or filter the library by mood, topic, and motif, emotional intensity, and reading difficulty, then expand a result in place"
- Architecture: "exposing random, by-poet, poets, and translation-cache endpoints." -> "exposing random, by-poet, poets, translation-cache, and category-filter endpoints. The category endpoints gracefully report empty results until the categorization migration (mood/topic/motif tagging) has been run against the database."

_Full diff: see the accompanying PR._

## 2026-07-19 — 919f899 feat(fonts): add Aref Ruqaa as a 10th Arabic typeface (#621)

**Why:** The commit adds Aref Ruqaa to `src/constants/fonts.js`, `src/styles/app.css`, and the Google Fonts link in `index.html`, bringing the total number of selectable Arabic typefaces from nine to ten. The README's Features section listed the old count and omitted the new font.

**README changes:**
- Features > Reading: "Nine Arabic typefaces (Amiri, Alexandria, El Messiri, Lalezar, Rakkas, Fustat, Kufam, Katibeh, Scheherazade New)" -> "Ten Arabic typefaces (Amiri, Alexandria, El Messiri, Lalezar, Rakkas, Fustat, Kufam, Katibeh, Scheherazade New, Aref Ruqaa)"

_Full diff: see the accompanying PR._

## 2026-06-30 — 30869ab feat(fonts): add Scheherazade New as a 9th Arabic typeface (#595)

**Why:** The commit adds Scheherazade New to `src/constants/fonts.js` and `src/styles/app.css`, bringing the total number of selectable Arabic typefaces from eight to nine. The README's Features section listed the old count and omitted the new font.

**README changes:**

- Features > Reading: "Eight Arabic typefaces (Amiri, Alexandria, El Messiri, Lalezar, Rakkas, Fustat, Kufam, Katibeh)" -> "Nine Arabic typefaces (Amiri, Alexandria, El Messiri, Lalezar, Rakkas, Fustat, Kufam, Katibeh, Scheherazade New)"

_Full diff: see the accompanying PR._
