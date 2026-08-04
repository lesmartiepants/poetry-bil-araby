# README CI Changelog

Automated record of README updates made by the `README Auto-Update` workflow
(`.github/workflows/readme-autoupdate.yml`). On each merge to `main`, Claude Code applies the
`/professional-readme` skill to keep the README accurate to the change that landed, and
prepends an entry below (newest first) describing **why** it changed and a concise
**before -> after** summary. The exact line diff lives in the accompanying pull request.

<!-- New entries are inserted directly below this line, newest first. -->

## 2026-08-04 — 4ab3c76 feat(db): make the schema reconstructable from this repo (#695)

**Why:** The commit updates CLAUDE.md to flag that the long-standing "84,329 poems" figure "does not match production and should not be relied on," but the README's "The Library" section still stated it as a hard fact ("84,000+ classical Arabic poems"). The commit also adds `npm run test:db` and a `db-reconstruct.yml` CI workflow that runs it, neither of which the Testing section mentioned.

**README changes:**
- The Library: "The poem corpus holds **84,000+ classical Arabic poems** sourced from..." -> dropped the unverifiable count, noting the corpus isn't in the repo and the "84,329" figure predates current production data.
- Testing: added `npm run test:db` to the command list and a sentence explaining it runs `src/test/server.db.test.js` against a real seeded Postgres, plus a note that `db-reconstruct.yml` runs it in CI.

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
