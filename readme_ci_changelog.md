# README CI Changelog

Automated record of README updates made by the `README Auto-Update` workflow
(`.github/workflows/readme-autoupdate.yml`). On each merge to `main`, Claude Code applies the
`/professional-readme` skill to keep the README accurate to the change that landed, and
prepends an entry below (newest first) describing **why** it changed and a concise
**before -> after** summary. The exact line diff lives in the accompanying pull request.

<!-- New entries are inserted directly below this line, newest first. -->

## 2026-07-22 — df64bef UX remediation sprint quarantines legacy audio/TTS e2e specs (#606-#614) (#615)

**Why:** `playwright.config.js` now unconditionally excludes `carousel.spec.js`, `audio.spec.js`, `insight-overlay.spec.js`, and `tts-highlight.spec.js` via `testIgnore` — they assert against the pre-vertical-feed reader (horizontal carousel, removed `VerticalSidebar` actions, the old top-right "Aa" pill) and no longer match the shipped UI. The README's Testing section claimed E2E coverage of "audio and TTS highlighting," which is no longer true; that behavior is now covered by unit tests instead (`togglePlayFallback.test.js`, `useTTSHighlight.test.jsx`, `voices.test.js`, etc.).

**README changes:**
- Testing: "End-to-end suites in `e2e/` exercise core flows, audio and TTS highlighting, the reader feed, translation caching, PWA behavior, and UI/UX quality." -> notes unit tests now cover audio/TTS (including the REST/Live fallback), lists the active E2E suites (core flows, sparkler reader feed, translation caching, PWA, onboarding tour), and names the quarantined legacy specs pending migration.

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
