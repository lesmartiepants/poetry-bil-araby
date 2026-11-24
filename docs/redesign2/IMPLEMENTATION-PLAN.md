> Repo copy of the approved implementation plan. Updated as phases merge.

# ReDesign2 implementation plan

## Context

The [build spec](BUILD-SPEC.md) defines what ReDesign2 is, version by version (V1: 6 slices, V2: 3, V3: 5), and the App flow canvas holds the mocks (frames N.x). This plan turns the spec into an order of work with three goals the user set:

1. **The whole app is navigable quickly.** A walking skeleton of every tab and screen comes first, on mock data; real features then replace the mocks slice by slice.
2. **QA is against the mocks.** Each screen is compared side by side with its canvas frame.
3. **Tests check that the app works**, through user journeys, not an inflated unit suite. Unit tests only for pure logic.

Decisions already made: the new app deploys at **`/new` on the main app**; mocked sections carry **no visible marking**; production hides areas still on mocks (the spec's "coming" states), dev and preview builds show them.

Repo facts that shape this: plain JS today, no workspaces, no TypeScript; `vercel.json` builds `dist/` and rewrites everything else to `/index.html`; CI (`.github/workflows/ci.yml`) only triggers on `src/**` and `server.js` and has no Postgres; e2e already mocks the API with `page.route` (`e2e/fixtures/mocks.js`); same-origin `/new` passes the existing CORS list in `server.js`; new `server.js` routes must be added to `feature-manifest.json` (`npm run manifest:update`) or `manifest-check` fails.

## Branches, commits and the design record

- **One branch per phase**, cut from the working branch `claude/fervent-galileo-u0johv`, named `claude/redesign2-<phase>` (e.g. `claude/redesign2-p0-setup`, `claude/redesign2-p1-skeleton`, `claude/redesign2-v1.2-reader`). When a phase's checks pass, it merges back into the working branch with `git merge --no-ff` (one merge commit per phase), and both branches are pushed. No pull requests unless asked. Conventional commits throughout.
- **Phase D (first, before setup): commit the designs and documents.**
  - Refresh `design-review/design-refresh/canvas/` from the canvas artifact (every `project/*.dc.html` plus `canvas.json`; adds the new frames 4.7, 12.1, 12.8 and the reworked 3.3, 3.11, 12.5, 12.6; removes 0.1 Coverage), then rebuild the standalone viewer with `design-review/design-refresh/tools/build_viewer.py` and update that folder's `README.md`.
  - Export the three docs as Markdown into `docs/redesign2/`: `BUILD-SPEC.md` (the build spec), `FEATURE-REVIEW.md` (the support plan), and `IMPLEMENTATION-PLAN.md` (this plan). The Claude Docs stay the editable source; the repo copies are refreshed at each phase merge.
- Mock QA reads frames straight from `design-review/design-refresh/canvas/` (no second copy in `web/qa/`), so refreshing the canvas export refreshes the QA reference.
- Already done before this update: the build spec's "Done means" now describes mock QA and journey tests, and records `/new`; the working branch was fast-forwarded to `DesignRefresh`; an uncommitted `web/package.json` with installed dependencies exists and becomes the start of Phase 0.

## How the work runs

**Data sources, one switch per domain.** `web/core/sources.ts` lists every data domain (`poems`, `ai`, `tts`, `poets`, `explore`, `profile`, `keeps`, `lists`, `share`, `library`, `journey`, `collections`, `search`) as `mock` or `live`. Each domain has one interface in `web/core/api/` with two implementations: `mock/` (fixtures) and `live/` (Express or Supabase). Features only call the interface. A slice is "real" when its domains flip to `live` in that one file. In production builds, screens whose domain is still `mock` render the spec's "coming" state instead.

**Mock fixtures** come from two places: the poem pool `scripts/generate-poem-pool.js` already produces (real poems, real Arabic), and the frames' own content (poet of the week, lists, journeys, collections, search results) hand-copied into `web/core/api/mock/fixtures/*.json`.

**Mock QA.** The canvas frames come from the committed export in `design-review/design-refresh/canvas/` (refreshed when designs change). `web/qa/frames.json` maps each frame to the app state that should match it: route, page colour, and Playwright steps to reach it ("open Aa", "start listening", "tap word 3 of line 2"). `npm run qa:mocks -- --area 2` renders each frame and the app state at 390×844 (mock mode), writes side-by-side PNGs and a contact sheet (`web/qa/out/index.html`), and a perceptual-difference score per pair to flag drift. It is a review aid, not a CI gate: data and live fonts differ. I review every pair of a slice, fix, and attach the contact sheet to the PR.

**Tests that matter.**
- **Journeys (Playwright):** one spec per area, each test named by frame ("2.5 Insights opens over the poem"), driving real flows: read → Aa → change font → reload keeps it; listen → switch voice → line restarts; keep → Change → new list → delete list keeps poem. Run against mock mode in CI (fast, deterministic) at 390×844 in Chromium.
- **Live smoke:** the same journeys tagged `@live` run against `server.js` + a local Postgres (`postgres:17` service, `scripts/db-setup.sh` + `scripts/db-seed.sh`) for every domain already flipped to live.
- **Unit tests only for pure logic in `core/`:** playback state machine transitions, difficulty bands, icon-letter mapping, settings merge, card line-splitting. No component snapshots, no story-per-component.
- The spec's "Done means" changes accordingly (stories + visual regression → mock QA + journeys); Done: the spec now says this.

## Phase 0 · Setup (one PR)

- `web/`: Vite + React 18 + TypeScript, own `package.json`, `base: '/new/'`, build to `../dist/new`. Router: wouter (already used in `src/`); server state: TanStack Query; small local stores: zustand.
- Layout per the spec: `web/core/` (browser-free, aliased `@core`) and `web/src/{app,design-system,components,features/*}`; `eslint-plugin-boundaries` enforces import direction and bans DOM in `core/`.
- Tokens: `web/design-system/tokens.json` from the Brand page → generated CSS variables (Night, Parchment, Indigo via `data-page`, sizes 1–5, grounds, era colours).
- `vercel.json`: build command also runs `npm --prefix web ci && npm --prefix web run build`; rewrite `/new/(.*)` → `/new/index.html` placed before the catch-all.
- CI: new `.github/workflows/web.yml` on `web/**` and `server.js`: typecheck, lint, unit, journeys (mock), live smoke (Postgres service), and `qa:mocks` contact sheet uploaded as an artifact.
- QA tooling: `frames.json`, `qa:mocks` script (reusing the render approach in `scripts/capture-design-screenshots.js`).

## Phase 1 · Walking skeleton (all of V1–V3 on mocks)

- Tab shell (Journey, Explore, Library, You), every route in the spec, every sheet (Aa, Insights, Voice, Share, Keep) opening over its route.
- One screen per frame group, built from design-system primitives at layout fidelity: reading, Explore hub and browse screens, poet page, Library hub and lists, Journey tab (Tonight, Pathways, journey path), collections, search, You. Error and loading frames come later with their slice.
- All domains `mock`. Journey specs per area cover navigation only ("every tab and every screen is reachable in ≤ 3 taps").
- Done when: a full click-through of the app works at `/new` on a preview, and the contact sheet shows every frame paired with a screen.

## Phases 2–4 · Make it real, slice by slice

Each slice: finish fidelity for its frames (incl. error/loading), build server and migrations, flip its domains to `live`, journeys green on mock **and** live, contact sheet reviewed. Order follows the spec.

| Slice | Flips to live | Server / data work | Key journeys |
|---|---|---|---|
| V1.1 Foundations + dev panel | — (dev panel) | `settings_defaults`, `user_settings.prefs`; `GET /api/dev/events` | Force a server error → edge tab red with count; long-press hides tab |
| V1.2 Reader + Appearance | `poems`, `profile`, `ai` (explanation) | `poem_ai_text`; extend `GET /api/poems/:id`; `GET /api/poems/:id/ai` | Open poem, Aa font/size/page persist across reload; Insights over poem; end of poem → next / poet / feeling |
| V1.3 Tap a word | `ai` (gloss) | gloss kind in `/ai` | Tap word → gloss; second tap served from DB |
| V1.4 Listening | `tts` | reuse `/api/ai/live-tts`; playback engine in `core/` reusing `src/utils/liveAudioStream.js`, `src/utils/audioWordTiming.js`, `src/services/cache.js`; voices from `src/constants/voices.js` | Listen → glow advances; switch voice restarts line; play from verse; missing timings → verse highlight |
| V1.5 Explore | `poets`, `explore` | `featured_poets`, era columns, `show_in_explore`; `GET /api/featured/poet`; extend `GET /api/poets`; bands from `src/services/categoryBands.js` (`deriveDifficultyBands`) moved to `core/` | Hub → feeling / era / band → poem |
| V1.6 Poet pages | `poets` (detail) | `poets.region/gender`; `GET /api/poets/:slug`; Gemini fill | Every Explore poet opens a page of their poems |
| V2.1 Keep + lists | `keeps`, `lists` | `user_lists`, `saved_poems.list_ids`, DB rules (Favorites locked, delete keeps poems) | Keep → toast → Change → new list (auto letter) → delete list → poem still kept |
| V2.2 Share | `share` | `poems.share_slug`; extend `api/og/[id].js` for grounds/lines/dedication | 8 lines → two 1080×1350 images; `/p/<slug>` opens poem |
| V2.3 Library | `library` | `poet_follows`, `poem_reads`, grouping views/RPCs | Follow poet → appears in 8.5; select + remove + undo; 1,000-keep user < 1 s |
| V3.1 First run, Tonight, journeys | `journey` | `collections`, `collection_poems`, `progress`, `featured_poems`, `display_name`; `GET /api/tonight`, `/api/collections` | Welcome → Tonight → complete a step |
| V3.2 Doors | `ai` (doors) | scoring from `src/services/preferenceWeighting.js` server-side | Every poem ends with 3 doors with reasons |
| V3.3 Collections | `collections` | same tables; "Find … in" | Save collection → resume where left |
| V3.4 Search | `search` | `GET /api/search` (diacritic-insensitive) | Half-remembered line finds the poem |
| V3.5 You | `profile` (guide prefs) | prefs only | Change difficulty → next doors change |

V1 and V2 go live at `/new` as each version completes. Cut-over (new app at `/`, old `src/` retired) after V3.

Editorial seeding (4 journeys, 24 collections, featured poems) runs alongside from Phase 1; the mock fixtures double as its template.

## Files

- New: `web/**` (app, `core/`, `qa/`), `.github/workflows/web.yml`, migrations in `supabase/migrations/` per slice, `docs/redesign2/{BUILD-SPEC,FEATURE-REVIEW,IMPLEMENTATION-PLAN}.md`.
- Refreshed: `design-review/design-refresh/canvas/**`, `design-review/design-refresh/index.html`, its `README.md`.
- Changed: `vercel.json` (build + `/new` rewrite), `server.js` (new endpoints per slice), `feature-manifest.json` + `docs/APP-STATE.md` (via `npm run manifest:update` when endpoints are added), `api/og/[id].js` (V2.2).
- Reused (copied into `web/core`, tested there): `transliterate`, `consumeSSE`/`createStreamingPlayer`, `computeWordTimingsFromAudio`, `cacheOperations`, `deriveDifficultyBands`, `VOICE_CATALOG`, `scorePoem`/`sampleByScore`.

## Verification

- `npm --prefix web run dev` (mock mode) → click through every tab at 390×844; `VITE_SOURCES=live npm run dev:all` for live domains.
- `npm --prefix web run test:journeys` (mock) and `test:journeys:live` (local Postgres seeded via `npm run db:setup && npm run db:seed`).
- `npm --prefix web run qa:mocks -- --area N` → review `web/qa/out/index.html`; contact sheet attached to each slice PR.
- Preview deploy: `/new` on the Vercel preview URL; the old app at `/` unchanged.
