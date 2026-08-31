# README CI Changelog

Automated record of README updates made by the `README Auto-Update` workflow
(`.github/workflows/readme-autoupdate.yml`). On each merge to `main`, Claude Code applies the
`/professional-readme` skill to keep the README accurate to the change that landed, and
prepends an entry below (newest first) describing **why** it changed and a concise
**before -> after** summary. The exact line diff lives in the accompanying pull request.

<!-- New entries are inserted directly below this line, newest first. -->

## 2026-08-31 — full-audit periodic accuracy sweep

**Why:** A full-codebase audit (not tied to a single commit) found two drifted claims. (1) `src/constants/features.js` (`categoryExplorer: true`) and `src/components/AccountMenu.jsx` ("Explore Poems" entry, navigating to `/explore`) show a real, shipped, account-menu-reachable feature — filtering/browsing the library directly by mood, topic, motif, family, intensity, and reading difficulty — that `feature-manifest.json` tracks as `important` tier, but the README's Discovery section never mentioned it. (2) The Testing section claimed the GitHub Actions pipeline "runs the E2E suite against a PostgreSQL service," but `.github/workflows/ci.yml` only runs a Playwright smoke suite with every API call mocked (single Chromium project, no database); the only workflow that provisions real PostgreSQL (`db-reconstruct.yml`) is scoped to migration/seed-file changes, not the general pipeline.

**README changes:**
- Features > Discovery: added a bullet for Explore Poems (mood/topic/motif/family/intensity/difficulty filtering from the account menu).
- Testing: "The GitHub Actions pipeline builds, runs unit tests, then runs the E2E suite against a PostgreSQL service." -> accurate description of `ci.yml` (build, manifest-drift gate, unit tests with coverage, mocked-API Chromium smoke suite, PR preview deploy) plus a note on the separate migration-scoped `db-reconstruct.yml` workflow that is the only place real PostgreSQL runs in CI.

_Full diff: see the accompanying PR._

## 2026-08-30 — 1e8642f feat(reader): flow column + quill summon (N4 port from #714) (#737)

**Why:** This commit removed the sparkler-reveal reader (`SparklerStage.jsx`, `useSparklerReveal.js`, `ProgressScrubber.jsx`, `e2e/sparkler-reader.spec.js`) and replaced it with a scrolling-column reader (`PoemColumn.jsx`, `PoemSeal.jsx`, `e2e/flow-reader.spec.js`): the whole poem now renders in one scrolling column with verses ahead dimmed until read, and poem-to-poem movement is a quill you press and hold to summon the next poem — the vertical swipe between poems is gone (`feature-manifest.json`'s `reader-feed` entry was renamed from "Sparkler reveal reader (vertical feed)" to "Flow reader (scrolling column + quill summon)"). The README's Philosophy, Islamic Art and Geometry, and Features sections still described the old tap-to-reveal sparkler and vertical swipe feed.

**README changes:**
- Philosophy (Pleasurable principle): "tap-to-reveal reading experience — where each verse blooms into view in time with the recitation" -> "scrolling reading column — where verses ahead stay dimmed until read"
- Islamic Art and Geometry: "the sparkler-style verse reveal, the feed transitions" -> "the scrolling verse reveal, the quill you hold to summon the next poem"
- Features > Reading: "A vertical swipe feed where each poem unfolds through a sparkler reveal — verse by verse ... uncovered in time with the recitation" -> "The whole poem in one scrolling column ... with verses ahead dimmed until read; press and hold the quill to summon the next poem"
- Features > Discovery: "Poet filtering and a vertical feed you swipe through, poem to poem" -> "Poet filtering, and a swipeable carousel of poems by the same poet" (the vertical swipe-between-poems gesture no longer exists; the same-poet carousel is a separate, unaffected feature)

_Full diff: see the accompanying PR._

## 2026-08-15 — 713390c feat(onboarding): reach the preference flow from the account menu (#712)

**Why:** The preference flow at `/onboarding` was previously reachable only from the debug panel, so the README's Personalization list correctly omitted it as a hidden/dev-only surface. This commit adds a real account-menu entry ("Set up your feed" / "Change your feed"), making it a discoverable, user-facing feature that biases the discovery feed by mood/era/topic.

**README changes:**

- Features > Personalization: added a bullet for the account-menu preference flow that biases the discovery feed.

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
