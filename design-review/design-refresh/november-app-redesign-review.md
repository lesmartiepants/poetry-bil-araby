# poetry بالعربي · November app redesign review

Nov 18, 2026 · @Albert

## Summary

The current app is a single reading surface with 14 screens and overlays and 33 user-facing features, of which 8 are critical to the core loop: open, read, listen, understand, move to the next poem.

- **What it is:** a PWA for classical Arabic poetry. It serves 4,767 curated poems (quality score 75+ and 24 lines or fewer) from a 9,073-poem database, with full diacritics, English translation, transliteration, AI recitation and AI insight.
- **Promise (from the README):** discoverable, accessible, pleasurable.
- **Core loop:** splash → reader → listen or read insights → hold the quill or swipe up for the next poem → save the ones you love.
- **Method:** catalogued from the app's source code and feature manifest in [lesmartiepants/poetry-bil-araby](https://github.com/lesmartiepants/poetry-bil-araby) (last push 16 Nov 2026), cross-checked against the live app at [poetry-bil-araby.vercel.app](https://poetry-bil-araby.vercel.app/) and your reader screenshot. The live site is client-rendered, so the source is the authoritative inventory. Dev-only tools are listed separately.

## Screen inventory

Fourteen reader-facing surfaces, plus three dev tools that currently ship to production.

| # | Screen / overlay | How you get there | Purpose |
| --- | --- | --- | --- |
| 1 | **Splash (Zen Haiku)** | First visit | Brand mark, a breathing line and an Enter button; sets the mood, then hands off to onboarding (no saved prefs) or the feed |
| 2 | **Onboarding preferences** (`/onboarding`) | After splash on first visit; Account › "Set up / Change your feed" | Six full-screen steps: welcome (curated feed or straight to reading), mood (16, multi), imagery/motif (12, optional), family (7, single), reading difficulty, era. Biases the feed; never filters it |
| 3 | **Reader (flow feed)** | Default home; `/poem/:id` deep link | The whole poem in one scrolling column, verses ahead dimmed until read; vertical swipe between poems; title, poet, Arabic, translation, transliteration |
| 4 | **Inline insights** (inside reader) | "Poem Insights" in the reader action bar | End-of-poem sections, one at a time: The Meaning, then About the Author, revealed word by word; "Consulting the Diwan…" loading state |
| 5 | **Listening state** (inside reader) | "Listen" | Transport (previous verse, play/pause, next verse), word-by-word highlight with auto-scroll, voice pill |
| 6 | **Zen idle mode** (inside reader) | 2 s of inactivity | Chrome fades; only the poem, Aa, theme and a floating Listen/Pause remain |
| 7 | **Text settings popover** | Aa pill / Account › Display Settings | Translation and romanize toggles, font size and font, highlight style, action-button weight; Advanced: header geometry line colour and pattern |
| 8 | **Category Explorer** (`/explore`) | Bottom nav › Discover | Full-screen taxonomy browser: filter by mood, topic, motif, family, emotional intensity, difficulty 0–10; tap a result to expand the poem in place |
| 9 | **Poet picker drawer** | Account › Explore Poets | Horizontal featured-poet tiles, All Poets, sticky Surprise Me and poet search; reading then narrows to that poet |
| 10 | **Library (Khazana)** | Bottom nav › Library (count badge, 99+) | Bilingual drawer of saved poems: search, sort (recently saved, oldest, poet A→Z, title A→Z), grouped Today / This week / Earlier, pin, remove, multi-select bulk remove, swipe actions |
| 11 | **Share card** | Bottom nav › Share; reader › Share | Live card preview; choose lines; 12 named designs (Dīwān, Ibn Muqla, Layl, Najma…); dedication "to a friend, to a lover, to a stranger, to yourself"; download image, copy link, native share |
| 12 | **Sign-in modal + return overlay** | Account › Sign In; saving while signed out | Google and Apple OAuth; syncs saved poems and settings; app works fully without it |
| 13 | **Guided tour** | Account › Take / Resume tour; `?tour=1`; corner compass | Eight spotlight steps: welcome, listen, pause, discover by category, understand the meaning, save, library, done |
| 14 | **Keyboard shortcut help** | `?` | Space, arrows, E, T, R, Esc reference |
| dev | **Debug panel** (bug icon), **Draw inspector الميزان** (scales icon), **Design review / Geometric Explorer** links | Floating buttons; Aa › Advanced | Engine switching, bug reports to GitHub, feed-scoring inspection, design tooling. Visible in your production screenshot |

## Features, buttons and interactions

The reader carries most of the product; nine controls sit in the bottom nav and action bar, and the rest hide behind Account, Aa and gestures. Tier is the app's own: critical, important, nice.

| Area | Control or interaction | Where | What it does | Tier |
| --- | --- | --- | --- | --- |
| Read | Scrolling column with reveal | Reader | Verses ahead stay dimmed until scrolled to; hairline shows progress | critical |
| Read | Arabic + translation + transliteration | Reader | Full diacritics; English and romanization toggled in Aa or with T / R keys | critical |
| Read | Dark / light theme | Account › Night/Day row | Switches theme; resets to dark unless signed in | important |
| Read | Zen idle | Automatic after 2 s | Hides chrome, keeps a floating Listen | nice |
| Next poem | Quill hold (760 ms) or pull past the end (120 px) | Bottom of poem | Summons the next poem with ink and bloom effects | critical |
| Next poem | Vertical swipe | Reader | Moves between poems; stops any audio | critical |
| Next poem | Right arrow / Surprise Me | Keyboard; poet drawer | Loads a random poem | critical |
| Next poem | Feed weighting | Behind the scenes | Scores candidates 0–5 against onboarding answers; never locks anyone in | nice |
| Next poem | Curated feed toggle | Account | Turns preference weighting on or off | nice |
| Listen | Listen | Reader action bar | Starts AI recitation; Space toggles | critical |
| Listen | Previous / next verse, play/pause | Action bar while playing | Seeks by verse | nice |
| Listen | Word-by-word highlight | Reader | Highlights and auto-scrolls the spoken word | important |
| Listen | Voice | Account › Voice row | Cycles 30 reciter voices; restarts playback | important |
| Listen | Plays through iOS silent switch, prefetch + cache | Behind the scenes | Instant, reliable audio | important |
| Understand | Poem Insights → Author Insights | Action bar | Inline The Meaning, then About the Author; Back to Poem / Back to Insights | important |
| Understand | Ratchet mode | Long-press Discover or type "yalla" | Gen-Z slang insights with orange glow | nice |
| Discover | Discover (flame) | Bottom nav | Opens Category Explorer | important |
| Discover | Explore Poets | Account | Poet picker drawer: featured tiles, search, Surprise Me | important |
| Keep | Save / Saved (heart) | Bottom nav | Saves to Khazana; prompts sign-in to sync | important |
| Keep | Library (count badge) | Bottom nav | Opens saved poems: search, sort, group, pin, bulk remove | important |
| Keep | Dislike (thumbs down) | Bottom nav, left of Save | Flags the poem and auto-advances; hideable in Account | nice |
| Share | Share | Bottom nav and reader | Card designer: lines, 12 designs, dedication, download, copy link, native share | nice |
| Share | Deep link `/poem/:id` | URL | Opens a specific poem with social preview card | important |
| Personalise | Set up / Change your feed | Account | Reopens onboarding preferences | nice |
| Personalise | Display Settings (Aa) | Reader pill, Account | Type, highlight style, button weight, header geometry | important |
| Account | Sign in / out | Account | Google, Apple; syncs saves, theme and font | important |
| Help | Take / Resume tour | Account, corner compass | Eight-step spotlight tour | important |
| Help | Keyboard shortcuts | `?` | Space, ← →, E, T, R, Esc | nice |
| App | Install, offline, auto-update on new release | PWA | Home-screen app; clears stale cache on deploy | important |
| Ambience | Islamic geometric background, gold sparkles, parallax, consultation effect | Reader | Decoration; sparkles and parallax toggled in Aa | nice |
| Dev | Debug panel, draw inspector, AI poem generation, design review, Share Modal Design link | Floating buttons, Account, Aa | Internal tools; several visible to all readers today | internal |

## Goals and jobs to be done

Seven jobs explain every feature; the first four are the product, the last three keep people coming back.

| Job the reader hires the app for | How the current app serves it | Friction today |
| --- | --- | --- |
| **Encounter a poem I'd never find alone** | Weighted random feed, quill summon, Surprise Me, onboarding preferences | Three ways to get "another poem" (quill, swipe, Surprise Me) plus two ways to browse (Discover, Explore Poets) in different places |
| **Read it correctly** | Full diacritics, Amiri type, reveal-as-you-read column | Strong; settings for it are buried in an Advanced-heavy popover |
| **Understand it** | Translation, transliteration, The Meaning, About the Author | Insights live at the end of the poem only; no word-level help |
| **Hear it** | AI recitation, 30 voices, word highlight, verse seek | Voice choice hides in the Account menu; 30 voices is more choice than most need |
| **Keep what moves me** | Save to Khazana, Library with pin, sort, search | Save and Library are two of five nav slots; dislike competes in the same pill |
| **Share it** | 12-design card maker with dedication | Share takes a permanent nav slot for a per-poem action |
| **Make it mine** | Onboarding prefs, curated toggle, display settings, theme, sign-in sync | Personalisation split across onboarding, Account and Aa |

**Experience goals stated in the code and README:** reading should feel like an occasion, not a lookup; audio must never play in the background after you move on; the app must work fully without an account; no reader is locked into a narrow feed.

## Redesign notes

Proposal: keep all seven jobs, cut the surfaces from 14 to about 8, and move per-poem actions off the global nav so the nav only holds places (Read, Discover, Library, You).

| Feature | Proposal | Why | New-brand screen |
| --- | --- | --- | --- |
| Splash | Keep, simplify | Already exists as P1; Enter is the only action | P1 Splash |
| Onboarding (6 steps) | Merge to 2–3 steps | Mood + family + difficulty carry most of the weighting; motif and era can be learned from saves | To design |
| Reader column + reveal | Keep | The heart of the product | P2 Reading |
| Quill summon, swipe, Surprise Me | Merge into one gesture | One way to get "another poem"; swipe up stays, the quill becomes its visual cue | P2, to refine |
| Listen + transport + word highlight | Keep | Strong; mark as play button | P4, P7 |
| Voice (30 voices) | Rethink | 3–4 curated reciters in the player, not the Account menu | To design (player sheet) |
| Poem Insights / Author Insights | Keep, rethink placement | Insights beside the lines they explain (marginalia) and a tap-a-word gloss | Reader Concepts 04, 05 (first canvas); to redo in brand |
| Ratchet mode | Remove or hide | Easter egg that contradicts the voice rules | — |
| Discover → Category Explorer | Merge with Explore Poets | One Discover place: browse by mood, theme, era, poet, plus search | To design |
| Save + Library | Keep, split by role | Save is a per-poem action; Library is a place in the nav | P3 Saved poem stamp; Library to design |
| Dislike | Rethink | Move to a long-press or the poem's overflow menu, not the nav | To design |
| Share card (12 designs) | Keep, trim to 3–4 | Brand-consistent designs; keep lines and dedication | Reader Concepts 08; to redo in brand |
| Text settings (Aa) | Keep, simplify | Display, translation, vowel marks, size, theme in one sheet; drop sparkles and parallax | Reader Concepts 10; to redo in brand |
| Theme toggle | Merge into Aa | Reading appearance lives in one place | Aa sheet |
| Curated feed toggle, Set up feed | Merge into a "Your feed" screen | One place for preferences | To design |
| Sign in | Keep, defer | Ask only at the first save | To design |
| Guided tour (8 steps) | Replace | Contextual one-time hints at first Listen, first save, first insight | To design |
| Keyboard shortcuts | Keep | Desktop only, no visual cost | — |
| Zen idle | Keep | Matches the mark-only reading header | P2 behaviour |
| Dev tools in production | Remove from public builds | Debug and scales icons appear on the live reader | — |

**Flows still to design in the new brand:**

1. First run: splash → short onboarding → first poem → first-time hints.
2. Discover: one screen for categories, poets and search.
3. Library: saved poems, pinned, collections.
4. Insights in context: marginalia and tap-a-word.
5. Player sheet: reciter choice, speed, repeat.
6. Share flow in the new brand.
7. Settings: Aa sheet and "You" (feed, account, theme).
8. Sign-in at first save, and empty and error states (offline, no audio, loading).

## Gaps and decisions needed

The screens now outrun this doc: curation replaced the algorithmic feed, so the biggest gaps are the editorial model, rights to modern poems, and how the guide personalises without onboarding.

**Decided since this catalog (Brand canvas, App flows page):**

- Navigation: four tabs, Tonight · Explore · Library · You (N12–N15), as a floating pill; while reading, the action dock replaces the tabs.
- Reading states N1–N11 and Aa (N16): prelude, reading, scrolling, actions fan, listening, insights, keep with stamp and undo, sign-in at first keep, share, end-of-poem doors.
- Curation over algorithm: a guide picks Tonight's poem with a reason; Explore holds hand-made collections and seven-poem journeys.
- Removed: Category Explorer, poet picker, six-step onboarding, curated-feed toggle, ratchet mode, sparkles, parallax, dev tools in production.

**Missing from this doc:**

1. An editorial model: who curates, how often, and the quality bar for a guide note.
2. Rights: modern poets (Darwish, Qabbani, Fadwa Tuqan) are under copyright; the corpus today is classical (Qafiyah).
3. A content model for collections, journeys, guide notes and "next doors" (new tables beside today's taxonomy).
4. Cold start and personalisation without onboarding.
5. Success metrics for a curated product.
6. Migration for existing readers' saved poems and settings.
7. States not yet drawn: empty, loading, offline, audio failure; desktop and tablet layouts; light themes (Parchment, Indigo) on every screen.

| Decision | Options | Recommendation | Blocks |
| --- | --- | --- | --- |
| Curation cadence | One poem a night · a weekly set of seven · on demand | One a night, plus collections and journeys for anyone who wants more | Tonight (N12), content volume |
| Who writes guide notes | Human editor · AI draft + editor · AI only | AI draft, human approval; about 365 notes a year | Guide voice, quality |
| Modern poets | License Darwish, Qabbani, Tuqan · name only, link out · classical only at launch | Launch classical; pursue one or two licenses for a "Start here" collection | Collection "Gibran to Darwish" |
| Swipe for next poem | Keep as shortcut · guide only | Keep swipe, but it serves the guide's next pick, not random | N2, N11 |
| Onboarding | None · one question · short pick of moods | None; learn from keeps and "Not for me", tune in You (N13) | First-run flow |
| Opening a poem | N1 Prelude · N1a Opening (note folds into the title) | Pick one; N1a is lighter, N1 gives the note more room | Reading entry |
| Insights | Generated live · pre-generated and reviewed for curated poems | Pre-generate and review for every curated poem; live for the rest | Trust, cost |
| Recitation | One TTS engine and 3–4 reciters · human recordings for curated poems | One engine now; human recordings for journeys later | Listening (N5) |
| Nightly reminder | None · opt-in notification at a chosen hour | Opt-in, asked after the third night | Retention |
| Share designs | Today's 12 · 4 brand grounds | 4 grounds | Share (N10) |
| Success measure | Daily opens · poems finished · keeps · journeys completed | Poems finished per week and keeps per reader; journeys completed second | Analytics plan |
| Brand clearance | Ship as is · test first | Trademark search and a 5–8 person test of the Seven heavens mark before launch | Logo, icon |

**Decided on 19 Nov 2026:**

- **Guide notes:** you or an agent write the first pass; review stays human.
- **Poets:** classical and modern from the start. This is a research project, so modern poets are included without licensing for now; revisit before any public launch.
- **Where curation lives:** the first tab (mark icon) has two views, Tonight's poem and Doors & journeys (N12, N12b). Explore keeps collections, poets and search (N13).
- **First run:** no onboarding. A base journey, Your first seven, is suggested as the starting point but never required; on first run, tonight's poem is its first heaven.
- **Swipe:** kept; it serves the guide's next pick, not a random poem.
- **Share:** chosen verses or the whole poem, on four brand grounds (N10).

**Still open:** N1 Prelude vs N1a Opening; live vs pre-generated insights; recitation; nightly reminder; success measures; brand clearance.
