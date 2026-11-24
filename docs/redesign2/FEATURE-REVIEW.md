# ReDesign2: feature review and support plan

> Repo copy of the [feature review doc](https://claude.ai/artifact/LHgTQAkQ5AhokHWinTq5gr), which stays the editable source.

Nov 23, 2026

This is the analysis behind ReDesign2: what today's app supports, where the gaps are, and why the frontend is rebuilt rather than refactored. **What gets built**, version by version, with screens, data, API, rules and done-when tests, **is in the [ReDesign2 build spec](BUILD-SPEC.md)**. Decisions reached here are recorded there, not repeated here.

ReDesign2 turns a one-reader app into a guided, four-tab product (Journey, Explore, Library, You). Of its 31 features, 4 work today, 12 partly and 15 not at all.

## What the app supports today

Today's app is a single reader with drawers. It serves 4,767 curated poems one at a time through a preference-weighted feed. Saves, auth and settings go straight from the client to Supabase. Poet pages, collections, journeys, follows, history and notifications do not exist anywhere in the code.

**Data model** (`supabase/migrations/*.sql`)

| Table | What it holds | Relevant gaps |
| --- | --- | --- |
| `poems` | Title AR/EN, content, diacritized\_content, poet\_id, theme, meter, quality\_score; cached\_translation / cached\_explanation / cached\_author\_bio (Gemini, write-once); mood\_primary, emotional\_intensity, accessibility\_score, century, categories (rationale AR/EN) | No transliteration, audio or word timings; no era column (era comes via the poet); one translation style only |
| `poets` | name, name\_en, slug, era\_id, bio, birth/death/active year, date\_confidence | No region, image or guide bio; the API never returns `bio` or the dates |
| `eras`, `meters`, `themes`, `rhymes`, `patterns` | Lookups | `eras` has name and slug only: no AR name, date range, place, description or colour |
| `category_dimensions` / `_families` / `_values`, `poem_categories`, `poem_factor_scores` | Mood / topic / motif taxonomy and per-poem labels with confidence | No editorial "feeling" set; ReDesign2's 9 feelings must map onto moods |
| `tags`, `poem_tags` | Legacy tagging | Unused by the reader |
| `user_settings` | theme, font\_id, voice\_preference, transliteration\_enabled, onboarding\_preferences (jsonb) | No display name, page colour, text size, vowel marks, translation style, sounds style, guide weights, notification time |
| `saved_poems` | user\_id, poem\_id, denormalised text, saved\_at | Fine for keeps; pins are localStorage only |
| `poem_events` | downvote / save / serve / share / copy / view | Usable as reading history, but no "read" (finished) event |
| `discussions`, `discussion_likes` | Nothing uses them |  |
| `bug_reports`, design-review tables | Ops and tooling | Unaffected |

**API** (`server.js`): health; `GET /api/poems/random` (poet, exclude, curated); `/api/poems/by-poet/:poet`; `/api/poets`; `/api/poems/search` (ILIKE on title, content, poet name); `/api/categories`; `/api/poems/by-category` (mood/topic/motif, era, century, intensity, accessibility); `/api/poems/:id`; write-backs for translation and rationale; downvote and event; `og-image`; Gemini proxy (`/api/ai/:model/:action`) and `/api/ai/live-tts` (PCM audio plus word timings from transcript fragments); bug reports; design review; dev lab.

**Frontend**

- Routes: `/`, `/poem/:id`, `/explore`, `/onboarding` (wouter in `src/app.jsx`, full-screen list in `src/constants/routes.js`).
- Reader: `feed/PoemFeed`, `PoemReader`, `PoemColumn`, `ReaderActions`, `InlineInsights`; next poem by holding the quill (`PoemSeal`); legacy `PoemCarousel` when `verticalFeed` is off.
- Bottom nav in `app.jsx`: Save, Library, Discover, Share, Account menu.
- Listening: `src/stores/actions/togglePlay.js` (Gemini Live with REST fallback), `useTTSHighlight`, `utils/audioWordTiming.js`; 30 voices in `constants/voices.js`; audio and timings cached in IndexedDB (`services/cache.js`).
- Insights: Gemini streaming via `actions/analyzePoem.js`; sections Poem, The depth, The author (`src/prompts.js`).
- Keeps: `auth/SavedPoemsView` (Khazana sheet: search, sort, pin, bulk actions), `useSavedPoems` in `src/hooks/useAuth.js`. Saving requires sign-in.
- Share: `ShareCardModal`, 9 canvas styles in `utils/shareCardDesigns.js`, PNG + `navigator.share`; OG previews via `api/og/[id].js`.
- Settings: `TextSettingsPill` (10+ fonts, size, highlight, background, sparkles, parallax), dark/light, reading posture (arabic / english / learning) in `uiStore`.
- Discovery: `DiscoverDrawer` (poet search, Surprise Me), `PoetPicker`, `CategoryExplorer` at `/explore`; `services/preferenceWeighting.js` scores the feed from onboarding answers.
- Onboarding and help: 6-step `OnboardingFlow`, `SplashScreen`, `SpotlightTour`, `ShortcutHelp`.
- Transliteration: rule-based on the client (`src/utils/transliterate.js`). Translation: Gemini once, then `poems.cached_translation`.
- Offline: Workbox service worker; `/api/poems/*` network-first.

## Gap analysis

V1 is mostly partial: the poem catalogue, insights, live TTS and deep links already exist. V2 and V3 surfaces mostly have no data behind them: lists, follows and reads (V2), and the editorial content plus per-user progress (V3).

| Feature | Version | Frames | Today |
| --- | --- | --- | --- |
| Deep link to a poem, OG preview | V1 | 2.11 | Supported |
| Insights: meaning and poet | V1 | 2.5, 2.14, 2.16 | Supported |
| Four-tab app shell | V1 | all | Missing |
| Reading mode: Arabic / translation / sounds | V1 | 2.4, 12.7 | Partial |
| Aa: text size, vowel marks, page, Arabic font | V1 | 2.4, 2.8, 2.9, 12.1, 12.2 | Partial |
| Tap a word for its meaning | V1 | 2.6, 3.7 | Missing |
| End of poem: next, more by the poet, more of the feeling | V1 | 2.7, 2.13 | Partial |
| Read-along word glow | V1 | 3.1, 3.2, 3.10 | Partial |
| Voice picker, every voice grouped | V1 | 3.3, 3.11, 12.6 | Partial |
| Player pill, play from a verse, resume | V1 | 3.4–3.9 | Partial |
| Developer panel and edge tab | V1 | 1.2–1.7 | Partial |
| Explore hub, poet of the week | V1 | 4.1 | Missing |
| Poet list A–Z, era filter | V1 | 4.2 | Partial |
| Feelings and eras shelves | V1 | 4.3–4.6 | Partial |
| Poet page with bio | V1 | 5.1–5.4 | Missing |
| Keep / unkeep, Kept in Favorites toast | V2 | 6.1, 6.3 | Supported |
| Apple + Google sign-in | V2 | 6.2, 6.8 | Supported |
| Lists: keep in lists, new list, icon letter | V2 | 6.4–6.6 | Missing |
| Library hub with lists; all lists; rename, colour, delete | V2 | 8.1–8.4 | Missing |
| Library by poet / feeling / era, A–Z rail | V2 | 8.6–8.9 | Missing |
| Select and remove from Library | V2 | 8.10, 8.11 | Partial |
| Follow a poet | V2 | 8.5 | Missing |
| Read tracking (READ badges, read counts) | V2 | 5.1, 8.5 | Missing |
| Share cards, choose lines, split, dedication, Copy text | V2 | 7.1–7.15 | Partial |
| Tonight's poem | V3 | 9.3, 9.4, 9.10 | Missing |
| The guide's doors with reasons | V3 | 2.17, 2.18, 9.5 | Missing |
| Journeys: named steps, progress, completion | V3 | 9.5–9.9 | Missing |
| Collections: browse, read in order, save | V3 | 10.1–10.3, 8.15 | Missing |
| Search across poets, poems, lines, collections | V3 | 11.1–11.3 | Partial |
| First run: name and reading mode | V3 | 9.1–9.3 | Missing |
| You: what moves you, how the guide chooses | V3 | 12.3–12.5 | Missing |

## Why rebuild the frontend

Build ReDesign2 as a new frontend beside the current app, organised by feature and built from a shared component library. The current `src/` carries a 1,000-line playback state machine, 13 modal flags, sparkle and parallax settings and two reader generations. Refactoring it would drag those into the new shape. Keep the backend, the database and a few pure utilities; rebuild everything a user sees.

## Mobile readiness

A native app may follow, in React Native or Swift. A Swift app would reuse the API, the database and its rules, the tokens and the designs; a React Native app could also reuse the browser-free core. The build spec's rules keep either port mostly a UI job. What's left to weigh:

Watch, no action yet: audio is the hardest part of a port (background play, lock-screen controls, interruptions, word timing per platform), and caching generated audio on the server may be worth it then. The App Store needs delete account (12.8) and, if Google sign-in is offered, Sign in with Apple. Tap a word and the word glow need one tappable span per word, never CSS-only tricks.

Not planned: building the web app in React Native for Web or Expo now. Arabic typography and right-to-left layout come out noticeably worse on the web, a daily cost for a port that may be years away. If the port happens, React Native with Expo is the default, since the core is TypeScript; Swift only if iOS polish, audio above all, becomes the edge.
