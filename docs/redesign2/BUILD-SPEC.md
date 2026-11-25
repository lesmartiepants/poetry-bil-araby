# ReDesign2 build spec

> Repo copy of the [build spec doc](https://claude.ai/artifact/7no4ANJqJfAisFTCn5pThf), which stays the editable source. Refreshed at each phase merge.

Nov 24, 2026

## Context

This spec says what gets built for ReDesign2, version by version, in an order you can turn into tickets. Each version is a list of slices; each slice names its screens, behaviour, data, API and a done-when test. For the analysis behind it (what exists today, gaps, alternatives) see the [support plan](https://claude.ai/artifact/LHgTQAkQ5AhokHWinTq5gr). Designs are on the App flow page of the [canvas](https://claude.ai/artifact/CEnvFen637adhmNMr99ZAx).

**What the app is.** Poetry بالعربي is a web app for reading Arabic poetry with translation, transliteration, AI insights and recitation. Today it is a single reader with drawers. ReDesign2 makes it a four-tab app: **Journey**, **Explore**, **Library**, **You**.

**What exists today.** A React app on Vercel, an Express API (`server.js`) on Render, Supabase Postgres and auth, and Gemini for translation, insights and live recitation. The database holds 9,073 curated poems; 4,767 pass the serving filters. Keeps, sign-in and settings already work through Supabase.

**How it gets built.** A new app in `web/`, in this repo, beside today's `src/`, on the same API and database. The current app stays live at `/` until V3 is done; V1 and V2 reach users early at `/new` on the main app. A slice ships end to end (screens, data, loading and error states, tests) before the next starts.

**Versions at a glance**

| Version | What users get                                                                                                                | Areas                           | Editorial content needed                                      |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------- |
| V1      | Read, listen, browse: the reader, tap a word, recitation, Explore, poet pages, Appearance, developer panel                    | 1, 2, 3, 4, 5, 12 (first build) | A poet of the week                                            |
| V2      | Keep and share: Favorites and lists, share cards, the Library                                                                 | 6, 7, 8                         | None                                                          |
| V3      | The guide: first run, Tonight's poem, doors, journeys, collections, search, the rest of You                                   | 2 (doors), 8.15, 9, 10, 11, 12  | 4 journeys, 24 collections, step names, a featured poem a day |
| Later   | Dual translations, scholarly sounds, keeps while signed out, resurfaced poems, a new tour, delete account (designed), desktop | —                               | —                                                             |

**Frame numbers.** Every screen is numbered N.x. N is a feature area and never changes: 1 Shell and developer panel · 2 Reading · 3 Listening · 4 Explore · 5 Poet pages · 6 Keep and lists · 7 Share · 8 Library · 9 Journey and first run · 10 Collections · 11 Search · 12 You. A later version continues its area's sequence (Reading is 2.1–2.16 in V1, 2.17–2.18 in V3). Feature folders, routes and test names use the same numbers.

## Architecture and build rules

These apply to every slice. A slice that breaks one isn't done.

**Folders in `web/`.** A Vite + React app with its own `package.json`, built into the main Vercel deploy and served at `/new` until cut-over. It talks to the same `server.js` and Supabase project as today's app.

```
web/
  core/             browser-free TypeScript: API client + query hooks, playback state machine,
                    transliteration, difficulty bands, storage interface
  src/
    app/            tab shell, tab bar, router, sheet layer
    design-system/  tokens + primitives; knows nothing about poetry
    components/     shared poetry pieces used by 2+ features
    features/       one folder per canvas area (N in N.x)
      shell/        1  splash, developer panel and edge tab      V1
      reader/       2  reading, Aa, Insights, tap a word         V1 (+ doors V3)
      listening/    3  player, read-along, voices                V1
      explore/      4  hub, poets, feelings, eras, difficulty    V1 (+ collections row V3)
      poet/         5  poet pages                                V1 (+ follow V2)
      keep/         6  keep, lists, new list, letters            V2
      share/        7  share cards, copy, saved images           V2
      library/      8  hub, lists, your poems                    V2 (+ collections V3)
      journey/      9  first run, Tonight, journeys              V3
      collections/  10 collections                               V3
      search/       11 search                                    V3
      you/          12 Appearance, account; guide settings       V1 (+ V3)
```

- Imports run one way: `app` → `features` → `components` → `design-system` → `core`. A feature never imports another feature; anything two features need moves down. An ESLint import-boundaries rule enforces it.
- A feature owns everything for its screens: screens, feature-only components, hooks, local state, tests. A later version's improvement lands in the same folder.
- `design-system/` primitives: Button, IconButton, Tabs, SegmentedControl, Switch, Slider, Sheet, Toast, Chip, Skeleton, FullAreaError, LetterRail, MarginNote.
- `components/`: Verse, PoemHeader, PoemRow, PoetAvatar, PoetRow, CollectionCard, DoorCard, KeptBadge, ProgressBar (journeys and collections). A component moves here only when a second feature needs it.
- `core/` has no `window`, DOM or CSS imports (lint-enforced), so a React Native app could reuse it.

A component moves down to `components/` only when a second feature needs it.

**Tokens.** One JSON file, taken from the Brand page, generates CSS variables: three pages (Night, Parchment, Indigo) switched by `data-page`, text sizes 1–5, the 4 share grounds, era colours, spacing, radii and motion. No hard-coded colours or sizes in features.

**Data.**

- The shared catalogue (poems, poets, eras, feelings, AI text, collections) comes through Express. Every endpoint is declared in a typed contract (OpenAPI or zod) that generates the client in `core/`.
- Per-user data (settings, keeps, lists, reads, follows, progress) goes from the client to Supabase under row-level security, as today. The rules live in the database (constraints, triggers, RPCs), never only in a React hook.
- No API key reaches the client. Every Gemini call goes through `server.js`.
- AI text is read-or-generate: read the stored row; if it's missing, ask Gemini, store it, return it.
- Settings are `settings_defaults` with the user's choices on top. Signed-out readers get the defaults.
- Migrations are additive and ship with the slice that first needs them; today's app keeps working against the same database.

**State.** Server data through TanStack Query; loading and error screens come from query state, not ad-hoc flags. Shareable things have stable URLs that will become universal links in a native app: `/p/:slug`, `/poet/:slug`, `/explore/feeling/:key`, `/explore/era/:slug`, `/explore/difficulty/:band`, `/library/*`, `/you/*`, and in V3 `/collection/:slug`, `/journey/:slug`, `/search`. Sheets (Aa, Insights, Voice, Share, Keep) open over the current route.

**Done means, for every slice:**

- Screens match their frames: npm run qa:mocks puts each frame beside the app in the same state at 390×844, and every pair in the slice is reviewed (contact sheet attached to the PR), in Night and Parchment, with real Arabic.
- Loading, empty and error states from the frames are built.
- Journey tests, not a large unit suite: one Playwright spec per area, each test named by frame ("2.5 Insights opens over the poem") and driving a real flow, run on mock data in CI and against a local server and database once the slice is live. Unit tests only for pure logic in core/ (playback states, difficulty bands, icon letters, settings merge, card splitting).
- New endpoints are in the contract; new tables have migrations, RLS and seed data.
- Nothing in `core/` touches the browser.

**Build order inside the foundations:** tokens and a dozen primitives first, then one flow at a time, end to end.

**Reuse from today's code** (copy into `web/` and test; never import across the two apps):

- `src/utils/transliterate.js` for Sounds, until stored transliterations exist.
- `src/utils/liveAudioStream.js` and `src/utils/audioWordTiming.js`, into the playback engine.
- `src/services/cache.js`, the IndexedDB audio cache, behind the storage interface.
- `src/services/preferenceWeighting.js`, moved server-side for Tonight and the doors (V3).
- `api/og/[id].js`, extended for share cards (V2).

Everything else in today's `src/` is left behind and retired at cut-over, including `uiStore`, `modalStore`, `PoemFeed`, `PoemCarousel`, `PoemSeal`, `TextSettingsPill`, `AccountMenu`, `DiscoverDrawer`, `CategoryExplorer`, `OnboardingFlow` and `SpotlightTour`.

## V1 · First build: read, listen, browse

**Goal:** a better reader than today's, plus Explore and poet pages, on data the backend mostly serves already. Six slices, in this order.

**Not in V1 (hidden, not greyed out):** Keep, lists and the Library tab's content (V2); the Journey tab's content, search icons, the Collections row in Explore and "Find Al-Khansa in" (V3). Tabs whose content isn't built show a short "coming" state. How Keep and Share behave in the V1 dock is an open decision (see Open items).

### V1.1 · Foundations and developer panel · 1.1–1.7

- **Build:** the `web/` app with its folder layers and lint rules; the `core/` package; the typed API client; tokens from one JSON file; the design-system primitives with stories; the four-tab shell and splash (1.1).
- **Developer panel (dev builds only):** an edge tab on every screen, quiet grey (1.2), red with a count after an error (1.3). It opens a relative timeline of front-end events and API exchanges (1.4). Requests and replies share a card and one HTTP path, with source and error filters. It also opens a Report a bug form that files a GitHub issue through today's bug-report endpoint (1.5). Long-press the tab bar (1.6), or the dock or mark while reading (1.7), to hide or show the edge tab. Old fonts, effects, the TTS engine and temperature switches live here, not in the app.
- **Data:** `settings_defaults` (one row of default prefs); `user_settings.prefs` (jsonb).
- **API:** The browser logs requests and replies from its own session. The build line checks `GET /api/health`.
- **Done when:** every primitive passes its stories in Night and Parchment at sizes 1 and 5; forcing a server error turns the edge tab red with a count.

### V1.2 · Reader and Appearance · 2.1–2.5, 2.7–2.16, 12.1–12.2

- **Reading (2.1–2.3):** the poem with an action dock (Listen, Insights, Keep, Share, Aa). Scrolling folds the dock into the mark (2.2); tapping the mark opens the fan with the same five actions (2.3).
- **Aa sheet (2.4):** show under the Arabic (English, Sounds or Nothing); Arabic font (Amiri, Naskh, Scheherazade); text size 1–5; vowel marks on or off (`diacritized_content` vs `content`); page (Night, Parchment, Indigo). Changes apply live and are saved to prefs.
- **Insights (2.5):** a sheet over the poem with two tabs, The meaning and The poet; a player that's running stays at the bottom.
- **End of poem (2.7):** past the last line, END and three ways on: Next poem (swipe up or tap; today's curated draw), More by the poet (5.1), More of the feeling (4.4).
- **Parchment (2.8, 2.9):** built through tokens; these frames are the spot checks.
- **Errors and loading (2.10–2.16):** poem didn't open, shared link leads nowhere, translation missing, next poem didn't arrive, insights didn't load; loading for a poem and for insights.
- **You, first build (12.1, 12.2):** a small You tab with Appearance (the same controls as Aa, with a live preview) and the account (signed in with Apple or Google, sign out; signed out shows Sign in).
- **Data:** `poem_ai_text` (explanations now, glosses in V1.3, doors in V3).
- **API:** extend `GET /api/poems/:id` (era, line count, reading time; 404 for removed poems); `GET /api/poems/:id/ai?kind=explanation`. Next poem keeps using `GET /api/poems/random`.
- **Done when:** the area 2 specs pass on a phone; settings persist across devices when signed in and fall back to defaults when signed out.

### V1.3 · Tap a word · 2.6, 3.7

- **Behaviour:** tapping a word opens a small sheet with its root and its meaning in this line. While listening, tapping a verse offers Play from here or Meaning (3.7).
- **Data and API:** gloss rows in `poem_ai_text`, keyed by line and word, through `GET /api/poems/:id/ai?kind=gloss&line=&word=`.
- **Done when:** a gloss comes from Gemini the first time and from the database every time after.

### V1.4 · Listening · 3.1–3.11

- **Player (3.1, 3.2):** Listen turns the dock into the player in place. Read-along: words still to come stay white, the word being recited glows gold, recited words fade; the English line for the current verse turns gold. LINE n OF N with progress segments, the voice name ▾, pause.
- **Voice sheet (3.3):** every voice in today's catalogue (16) under its Gemini name, grouped Female and Male. Tapping one switches and restarts the current line; the last voice picked becomes the default. Curated named reciters come later.
- **Pill and fan (3.4–3.6):** scrolling shrinks the player to a pill (mark and pause); the fan while listening shows pause on Listen; audio keeps playing.
- **Play from a verse (3.7):** see V1.3.
- **Errors (3.8–3.11):** recitation won't load; stopped mid read-along with resume; audio without word timing falls back to verse-level highlight; a voice that fails keeps the current one and says so.
- **Build:** a new playback engine in `core/`, an explicit state machine (idle, loading, playing, paused, stalled, error) with audio output behind an adapter, reusing today's live-TTS client, word-timing helpers and IndexedDB audio cache.
- **API:** today's `/api/ai/live-tts` (word timings, REST fallback). No Gemini key in the client.
- **Done when:** the area 3 specs pass, including stalled audio and missing timings.

### V1.5 · Explore · 4.1–4.7

- **Hub (4.1):** poet of the week, poets, Find by feeling (9 feelings), By difficulty (Gentle, Measured, Demanding), Eras.
- **Browse (4.2–4.7):** all poets A–Z with an era filter; shelves by feeling; one feeling; shelves by era, oldest first; one era; one difficulty band. Every list ends in a poem (2.1).
- **Difficulty bands:** cut from `accessibility_score` where the corpus actually sits (as today's onboarding does), so each band holds about a third of the poems. The band logic lives in `core/` and on the server, not in a screen.
- **Data:** `featured_poets` (week, poet, note); `eras.name_ar`, `years`, `colour`; `category_values.show_in_explore` to pick the 9 feelings.
- **API:** `GET /api/featured/poet`; extend `GET /api/poets` (era, region, century, poem count, Arabic or English sort); existing `GET /api/categories` (feelings, counts, accessibility histogram) and `GET /api/poems/by-category` (feeling, era, `minAccessibility`/`maxAccessibility`).
- **Editorial:** a poet of the week, picked ahead.
- **Done when:** every browse path reaches a poem.

### V1.6 · Poet pages · 5.1–5.4

- **Behaviour:** a hero with the poet's names and a pattern chosen by region (Arabia reuses an existing pattern). Poems tab: every served poem by its first line (5.1); scrolling folds the hero into a band (5.2). The poet tab: the bio (5.3, 5.4). "Find Al-Khansa in" stays hidden until V3.
- **Data:** `poets.region` and `poets.gender` (gender is stored for future collections, not shown). Gemini fills bio, region and gender when empty, into the existing `poets.bio`.
- **API:** `GET /api/poets/:slug` (poet, bio, poems in order).
- **Done when:** every poet in Explore opens a page listing all their served poems.

## V2 · Keep and share

**Goal:** let people keep what they love, organise it in lists, share it beautifully, and come back to it in the Library. No editorial content needed. Three slices.

### V2.1 · Keep and lists · 6.1–6.8

- **Keep (6.1, 6.3):** one tap. The mark stamps the poem, then the poem goes to Favorites and a toast reads "Kept in Favorites" with UNDO and CHANGE. The heart has no long-press.
- **Sign in on save (6.2):** a signed-out reader who keeps is asked to sign in with Apple or Google, or Not now. Keeps need an account (no signed-out keeps until Later).
- **Lists (6.4):** CHANGE on the toast is the only way into lists: a sheet of your lists with checks, Favorites first, and New list.
- **New list (6.5, 6.6):** a name, a colour, and an icon letter. By default the icon is the name's first letter as the nearest Arabic letter (L→ل, F→ف, T→ت, C→ك, P→ب, V→ف, G→ج); an Arabic name uses its own first letter. The row also offers the first letters of the name's other words, or CHOOSE, which opens all 28 letters in a drawer. Renaming updates an automatic icon, never a chosen one.
- **Errors (6.7, 6.8):** keep didn't save; sign-in didn't finish.
- **Rules (in the database):** `saved_poems` is the record of every keep. Favorites is each user's default list, created with the first keep; it can't be renamed or deleted, but poems can be taken out of it. Taking a poem out of a list never un-keeps it.
- **Data:** `user_lists` (id, user, name, colour, icon_letter, is_default); `saved_poems.list_ids` (array, indexed).
- **Done when:** a poem kept in two lists shows in both; deleting one list leaves it in the other; taking it out of Favorites leaves it kept.

### V2.2 · Share · 7.1–7.15

- **Cards:** from Share in the dock or fan: a short poem fits one card (7.1); otherwise choose lines, shown in Arabic or English (7.3, 7.4). Chosen lines split across cards (8 lines → 4 + 4, 10 lines → 6 + 4; 7.5, 7.6); a long poem pages through cards (7.9, 7.10). Optional dedication (7.7, 7.8). Four grounds in brand colours.
- **Copy text (7.2):** beside Copy link.
- **Saved images (7.11–7.14):** 1080×1350 PNGs with a short link, `/p/<slug>`. Photos permission error (7.15).
- **Build:** one card layout, `web/core/logic/shareCard.js`, draws the card as SVG. The app shows it as the preview; `GET /api/v2/poems/:id/card.png` rasterises the same SVG with resvg and the vendored fonts (`server/fonts`, OFL), so every platform shares identical images. Six colours (the frames' swatches) rather than four.
- **Data:** `poems.share_slug` (unique, from the transliterated title, e.g. `/p/amurru`); `GET /api/poems/:idOrSlug` accepts either.
- **Done when:** sharing 8 chosen lines produces two 1080×1350 images that open the poem from their link.

### V2.3 · Library · 8.1–8.14

- **Hub (8.1):** still called "Your diwan". Your lists first (Favorites, then lists by most recent keep), poets you follow, recent keeps, and a POEMS tab. No New list here.
- **Lists (8.2–8.4):** all lists; a list's options (rename, colour, delete; Favorites is locked); delete confirm. Deleting a list keeps its poems kept, then shows "List deleted · UNDO".
- **Follow (8.5):** poets you follow, each with era, poem count and how many you've read. Following is a button on the poet page (5.1), added in this slice.
- **Your poems (8.6–8.9):** by poet with an Arabic A–Z rail (8.6), English order with one tap on the sort label (8.7), by feeling (8.8), by era (8.9). Built for 1,000+ keeps.
- **Select and remove (8.10, 8.11):** select, then Remove, with Undo.
- **States (8.12–8.14):** empty before the first keep; Parchment check; sync error.
- **Reads:** a poem counts as read when the reader passes its last line. Reads drive READ badges on poet pages and the read counts in 8.5.
- **Data:** `poet_follows` (user, poet, followed_at); `poem_reads` (user, poem, first and last read, count); grouping as Postgres views or RPCs so large libraries group on the server.
- **Done when:** a seeded user with 1,000 keeps loads every Library view in under a second.

## V3 · The guide

**Goal:** the app chooses with you: a welcome, a poem for tonight, doors at the end of every poem, journeys and collections to read in order, search, and the settings that steer it all. V3 needs editorial content as much as code, so seeding starts alongside V1. Cut-over to the new app at `/` happens once every V3 spec passes.

**Editorial content to seed:** 4 journeys and 24 collections (ordered poems, a short intro, step names in English and Arabic such as Heaven / سماء; collections default to Poem / قصيدة); a featured poem for each day, curated after the journeys.

### V3.1 · First run, Tonight and journeys · 9.1–9.10

- **First run (9.1–9.3):** Welcome and your name; how you'd like to read (Arabic only, with translation, or with sounds; translation preselected), shown on one verse three ways; your first poem.
- **Tonight's poem (9.4, 9.10):** the Journey tab opens on one pick per day, the same for everyone, signed in or not. The eyebrow names the journey step when the pick is one (9.4), otherwise "Chosen for tonight" (9.10), with a reason line.
- **Pathways (9.5):** the guide's three doors and the journeys. A door opens its poem directly. The first journey is suggested, never required.
- **Journeys (9.6–9.9):** a path of named steps (Heaven 1–7, Home 1–5, …), one at a time; step complete; journey complete; loading.
- **Data:** `collections` (slug, kind collection or journey, titles, intro, step labels, pattern); `collection_poems` (position, poem, theme); `progress` (user, collection, position, saved, completed); `featured_poems` (date, poem, reason); `user_settings.display_name`.
- **API:** `GET /api/tonight` (today's row; if none, picks from a curated pool, writes the reason, saves the row; cacheable); `GET /api/collections?kind=journey`, `GET /api/collections/:slug`.
- **Done when:** a new user goes from Welcome to Tonight's poem to a completed journey step.

### V3.2 · The guide's doors · 2.17, 2.18

- **Behaviour** · The reader's "Where the guide would take you next" section, Pathways, and You finished all show the destination title, factual connection, and poet. A journey step ends with its completion action (9.7). Tonight's poem outside a journey opens You finished (2.18, `/journey/finished/:id`) with the recommendations and "Enough for tonight". Pathways (9.5) shows the recommendations from the last finished poem once `library.lastRead()` has one.
- **Choosing** · The guide offers the complete poem first for a linked excerpt, then the same feeling from another poet, more from the same poet, and a shared image with a different feeling. "Somewhere new" fills any remaining spots, up to three. The rules live in `web/core/logic/guide.js`, shared by the server and mock API.
- **Steering:** the guide's settings (classical or modern, difficulty band, length, feelings) go with every doors and Next poem request (`?cm=&difficulty=&length=&feelings=`) and rank each pool; a cut-down `preferenceWeighting.js` (`guideScore`). Changing a setting changes the doors (journey 2.17).
- **Words** · Each card's label comes from the rule and the catalog, for example "Tears, from grief to melancholy". Recommendations run without a Gemini or AI-cache request.
- **Data and API** · `GET /api/v2/poems/:id/doors` and the legacy `/ai?kind=doors` alias return `poem`, `connection: { kind, label }`, and the built-in `hook` and `reason` for older clients. `GET /api/v2/poems/next` takes the same settings.
- **Done when:** every poem ends with three doors that have reasons.

### V3.3 · Collections · 10.1–10.3, 8.15

- **Behaviour:** all collections in Explore (10.1); one collection read in order, or any poem, with the shared progress bar and Continue to the next unread (10.2); loading (10.3); saved collections in the Library (8.15). The Collections row appears in Explore, and "Find Al-Khansa in" fills on poet pages: the collections and journeys the poet appears in, and where.
- **Data:** the same three tables as journeys.
- **Done when:** a saved collection resumes where it left off.

### V3.4 · Search · 11.1–11.3

- **Behaviour:** the search icon in Explore and the Library opens a full-width bar with recent searches (11.1); results grouped into poets, poems, lines and collections, with the matched line shown (11.2); no results shows the nearest poets and feelings, without a reason line (11.3).
- **API:** `GET /api/search?q=&type=`, diacritic-insensitive, replacing `/api/poems/search`. Recent searches stay on the device.
- **Done when:** searching a half-remembered line finds the poem.

### V3.5 · You · 12.3–12.7

- **Hub (12.3):** the first-build hub plus the guide's settings. No short tour.
- **What moves you (12.4):** feeling chips, and Learn from what I keep.
- **How the guide chooses (12.5):** classical or modern; difficulty (Any, Gentle, Measured, Demanding: the same bands as Explore); poem length.
- **Reciter (12.6):** the same grouped voices as the player, each with a sample; play through silent mode; pause between lines.
- **Translation and sounds (12.7):** what sits under the Arabic; tap a word on or off.
- **Data:** all in `user_settings.prefs`.
- **Done when:** changing a setting changes the next doors and Next poem.

## Later, and what the new app drops

**Later (not in V1–V3):**

- Translation style (Faithful / Poetic): one cached translation until then, no setting.
- Sounds style (Simple / Scholarly): Simple only, from today's `transliterate.js`.
- Keeps while signed out, merged on sign-in.
- Resurfaced poems ("kept 14 months ago") on the Library hub.
- A new guided tour.
- Delete account: designed (12.8), a confirm sheet from You; required before an App Store release with Apple sign-in.
- Desktop and tablet layouts, keyboard shortcuts, update and offline prompts. Until then the phone layout is centred on wide screens.
- Curating the voices down to named reciters.

**Not carried into the new app.** These stay in today's app until cut-over and are not rebuilt.

| Today                                                                 | Instead                                                                    |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Random poem, Surprise Me, hold the quill for next                     | Next poem at the end of a poem (V1), the guide's doors (V3)                |
| Same-poet carousel                                                    | Poet page (5.1)                                                            |
| Poet picker and poet search drawer                                    | Explore and All poets (4.1, 4.2)                                           |
| Category Explorer and tag UI                                          | Feeling, era and difficulty shelves; the taxonomy data stays               |
| Six-step onboarding and preferences drawer                            | First run (9.1–9.3) and You (12.4, 12.5); saved answers migrate into prefs |
| Curated-feed toggle, ratchet mode, AI-generated poems                 | Always curated, database only                                              |
| 10+ fonts, highlight styles, sparkles, parallax, backgrounds          | Three Arabic fonts and three pages; the rest only in the developer panel   |
| 30 voices, engine and temperature switches                            | The 16-voice grouped sheet; switches only in the developer panel           |
| 9 share card styles                                                   | 4 grounds (7.1)                                                            |
| Spotlight tour                                                        | Removed; a new tour comes later                                            |
| Debug panel, draw inspector, enjoyability lab, design review, TTS lab | The developer panel (1.2–1.7)                                              |
| Dislike / downvote                                                    | Removed from the UI; the guide learns from keeps                           |
| Pin a poem                                                            | Removed                                                                    |
| Nightly reminder                                                      | Dropped                                                                    |
| `discussions` and legacy `tags` tables                                | Unused; drop after cut-over                                                |

## Reference: data and API by version

**Database changes.** All additive, in `supabase/migrations/`, shipped with the slice that needs them. Ten new tables; everything else reuses `poems`, `poets`, `eras`, the mood taxonomy, `saved_poems` and `user_settings`.

| Version | Slice | Table or column                   | Holds                                                                                                            | Shared or per user |
| ------- | ----- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------ |
| V1      | 1.1   | `settings_defaults` (new)         | One row of default prefs                                                                                         | shared             |
| V1      | 1.1   | `user_settings.prefs`             | Your choices over the defaults                                                                                   | per user           |
| V1      | 1.2   | `poem_ai_text` (new)              | poem, kind (explanation, gloss, doors), key (line:word for glosses), payload, model; unique on poem + kind + key | shared             |
| V1      | 1.5   | `featured_poets` (new)            | week, poet, note                                                                                                 | shared             |
| V1      | 1.5   | `eras.name_ar`, `years`, `colour` | Era shelves and pages                                                                                            | shared             |
| V1      | 1.5   | `category_values.show_in_explore` | Picks the 9 feelings                                                                                             | shared             |
| V1      | 1.6   | `poets.region`, `poets.gender`    | Hero pattern; future collections                                                                                 | shared             |
| V2      | 2.1   | `user_lists` (new)                | name, colour, icon_letter, is_default                                                                            | per user           |
| V2      | 2.1   | `saved_poems.list_ids`            | The lists a kept poem is in                                                                                      | per user           |
| V2      | 2.2   | `poems.share_slug`                | Word links like `/p/amurru`                                                                                      | shared             |
| V2      | 2.3   | `poet_follows` (new)              | user, poet, followed_at                                                                                          | per user           |
| V2      | 2.3   | `poem_reads` (new)                | user, poem, first and last read, count                                                                           | per user           |
| V3      | 3.1   | `collections` (new)               | slug, kind, titles, intro, step labels EN/AR, pattern                                                            | shared             |
| V3      | 3.1   | `collection_poems` (new)          | collection, position, poem, theme                                                                                | shared             |
| V3      | 3.1   | `progress` (new)                  | user, collection, position, saved, completed_at                                                                  | per user           |
| V3      | 3.1   | `featured_poems` (new)            | date, poem, reason                                                                                               | shared             |
| V3      | 3.1   | `user_settings.display_name`      | Your name from first run                                                                                         | per user           |

Computed, not stored: line count, reading time, first lines, avatar initials, century. Queries, not tables: Explore shelves and counts, "Find Al-Khansa in", most read and most followed. On the device only: recent searches. Unchanged: `poem_events` as the raw event log; recitation stays live TTS with a device cache. Today's poems.cached_explanation and cached_author_bio stay readable until moved into poem_ai_text and poets.bio.

**Express endpoints.** Per-user data does not go through Express; it uses Supabase from the client, with the hooks `useProfile` (V1), `useKeeps`, `useLists`, `useReads`, `useFollows`, `useLibrary` (V2) and `useProgress` (V3).

| Version | Endpoint                                             | Returns                                                                      |
| ------- | ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| V1      | `GET /api/dev/events`                                | Recent server requests and errors, dev only                                  |
| V1      | `GET /api/poems/:idOrSlug` (extend)                  | Poem plus era, line count, reading time; 404 for removed poems; slug from V2 |
| V1      | `GET /api/poems/:id/ai?kind=&line=&word=`            | Read-or-generate explanation, gloss, and (V3) doors                          |
| V1      | `GET /api/poems/random` (existing)                   | Next poem until the doors arrive                                             |
| V1      | `/api/ai/live-tts` (existing)                        | Recitation audio with word timings                                           |
| V1      | `GET /api/poets` (extend)                            | Adds era, region, century, poem count; Arabic or English sort                |
| V1      | `GET /api/poets/:slug`                               | Poet, bio, poems in order; "Find… in" from V3                                |
| V1      | `GET /api/featured/poet`                             | This week's poet                                                             |
| V1      | `GET /api/categories` (existing)                     | Feelings with counts; accessibility histogram for the bands                  |
| V1      | `GET /api/poems/by-category` (existing)              | One feeling, era or difficulty band, oldest first                            |
| V2      | `api/og` (extend)                                    | Share card images for the 4 grounds, chosen lines, splits, dedication        |
| V3      | `GET /api/tonight`                                   | Today's featured poem and reason, the same for everyone                      |
| V3      | `GET /api/collections`, `GET /api/collections/:slug` | Collections and journeys with step labels; one in order                      |
| V3      | `GET /api/search?q=&type=`                           | Grouped hits; nearest poets and feelings when nothing matches                |

Not built: `/api/voices` (the voice list is a constant in the app; samples are static files), `/api/explore`, `/api/feelings*`, `/api/eras*`.

## Open items and risks

**Designs to review on App flow** before their slice starts:

- [ ] Voices grouped by Gemini name: 3.3, 3.11, 12.6 (V1.4)
- [ ] Difficulty in Explore and in the guide: 4.1, 4.7, 12.5 (V1.5, V3.5)
- [ ] You first build with Appearance: 12.1, 12.2 (V1.2)
- [ ] Delete account: 12.8 (Later)

**Decisions still needed:**

- [ ] Keep and Share in the V1 dock and fan. Recommendation: in V1, Share sends the poem's link (deep links and previews already work) and Keep is hidden until V2.
- [x] Where V1 and V2 go live before cut-over: decided, at `/new` on the main app.
- [ ] 16 or 30 voices. The repo's catalogue holds 16; the other 14 were shelved, most for poor read-along timing.
- [ ] 12.7 Translation and sounds still shows Faithful / Poetic and the Sounds style, which are Later. Redraw without them before V3.5.

**Risks:**

- Editorial volume is the critical path for V3: 4 journeys, 24 collections, step names and daily picks. Start seeding during V1.
- Word timings from live TTS are approximate, so read-along quality depends on them until recordings exist.
- Two frontends double the CI and deploy surface until cut-over; keep the old app frozen to bug fixes.
- A native app may follow. The `core/` package, server-side rules, server-rendered cards, typed API and stable routes keep that port mostly a UI job; audio is the hardest part to port.
