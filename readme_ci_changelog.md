# README CI Changelog

Automated record of README updates made by the `README Auto-Update` workflow
(`.github/workflows/readme-autoupdate.yml`). On each merge to `main`, Claude Code applies the
`/professional-readme` skill to keep the README accurate to the change that landed, and
prepends an entry below (newest first) describing **why** it changed and a concise
**before -> after** summary. The exact line diff lives in the accompanying pull request.

<!-- New entries are inserted directly below this line, newest first. -->

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
