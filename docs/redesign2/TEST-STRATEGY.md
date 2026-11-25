# ReDesign2 test strategy

Nov 25, 2026. Covers the new app (`web/`, `server/redesign2.js`, `/api/v2`). The old app (`src/`, v1 routes, `e2e/`, `src/test/`) is frozen and goes at cut-over (after V3).

## Principles

1. **A test proves a feature works for a reader.** Each one is a Playwright journey named by frame (`'6.4 a poem in two lists shows in both…'`) that drives the real UI at 390×844.
2. **Three data layers, same journeys.**
   - Mock: in-browser fixtures. Every PR runs these, fast and deterministic.
   - `@live`: `server.js` plus Postgres with seed data. Proves SQL, serving rules and the `/api/v2` contract.
   - `@live @supabase`: real auth, RLS and triggers. Proves per-user data.
3. **Rules in the database are tested in the database.** `supabase/tests/redesign2_rules.sql` asserts the triggers, constraints and grants inside one transaction that is rolled back.
4. **Unit tests only for pure logic with real edge cases**: Arabic sorting and normalising, difficulty bands, icon letters, prefs merge, card splitting and escaping, the playback state machine. That is today's `web/core/logic/logic.test.ts`: 22 tests, all earning their place, none removed. No component tests, no snapshots, no story-per-component.
5. **Tests follow the app's structure.** One spec per area, `NN-<area>.spec.ts`. When a spec holds several areas, split it the next time that area's code changes. Live specs are tagged rather than placed in folders: `@live`, `@supabase`, `@prod`.

## Coverage matrix

Key:

- **M** = mock journey, **L** = `@live`, **S** = `@live @supabase` (not run in CI until the new job is green), **P** = `@prod`, **R** = rules SQL.
- **NEW** = added in this branch. **GAP** = not proven yet. **(V3 agent)** = owned by `claude/redesign2-v3-doors`; I left those tests alone.

### 1 Shell and developer panel (V1.1)

| Criterion                                                                  | Proof                                                                  |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1.1 splash, then the app; every tab reachable                              | M                                                                      |
| Done when: a server error turns the edge tab red (1.3, 1.4)                | M                                                                      |
| 1.5 Report a bug files through the bug-report endpoint                     | M **NEW** (the endpoint is answered by the test, so no issue is filed) |
| 1.6 long-press the tab bar                                                 | M                                                                      |
| 1.7 long-press the dock or mark while reading                              | **GAP, and not built**: `App.tsx` never passes `onLongPressMark`       |
| Done when: primitives pass stories in Night and Parchment at sizes 1 and 5 | Replaced by `qa:mocks` review (advisory), as the plan records          |

### 2 Reading (V1.2, V1.3, V3.2) (V3 agent)

| Criterion                                                                    | Proof                                                              |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 2.1 poem, 2.2–2.3 dock and fan, 2.4 Aa persists, 2.5 Insights, 2.7 end, 2.11 | M; 2.1, 2.5, 2.11 also L; 2.1 also P                               |
| Done when: settings persist across devices signed in                         | S (12.2)                                                           |
| …and fall back to defaults signed out                                        | **GAP**                                                            |
| 2.6 tap a word                                                               | M                                                                  |
| V1.3 done when: gloss from Gemini the first time, from the database after    | **GAP**: needs an L test against a seeded `poem_ai_text` gloss row |
| 2.10, 2.12–2.16 errors and loading                                           | **GAP**                                                            |
| 2.17 three doors with reasons (V3.2 done when)                               | L, P                                                               |
| 2.18 You finished                                                            | **GAP** (V3 agent)                                                 |

### 3 Listening (V1.4)

| Criterion                                               | Proof                                                     |
| ------------------------------------------------------- | --------------------------------------------------------- |
| 3.1 player and glow, 3.3 voices, 3.7, 3.8, 3.10, 3.11   | M                                                         |
| 3.4–3.6 pill and fan while listening, audio keeps going | M **NEW**                                                 |
| Done when: stalled audio (3.9)                          | M **NEW** (`mock.stall` switch in the engine)             |
| Real recitation (`tts` live)                            | **GAP**: `tts` is still mock. Add an L test when it flips |

### 4 Explore, 5 Poet pages (V1.5, V1.6)

| Criterion                                                                                                                                  | Proof                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| V1.5 done when: every browse path reaches a poem (feeling chip, feeling shelves, era shelves, era card, band, all poets, poet of the week) | M **NEW**; L for feeling and band; P                                                                       |
| 4.2 era filter, 4.7 band hop                                                                                                               | M                                                                                                          |
| V1.6 done when: every poet opens a page of all their served poems                                                                          | M **NEW** (every poet, list matches its count); L, P (one poet)                                            |
| 5.3 bio and "Find … in"                                                                                                                    | M, L; P (poet of the week)                                                                                 |
| Production data                                                                                                                            | **GAP (data)**: 539 of 966 poets have no bio and 960 have no region, so the Gemini fill in V1.6 hasn't run |

### 6 Keep, 7 Share, 8 Library (V2)

| Criterion                                                                                     | Proof                                                                                                                                 |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 6.2 sign in on save, 6.3–6.6 keep, change, new list                                           | M, S                                                                                                                                  |
| V2.1 done when: two lists show it; deleting one leaves the other; out of Favorites still kept | M **NEW**; R; S (delete only)                                                                                                         |
| 6.5 rename keeps a chosen icon; 6.6 the 28-letter drawer                                      | Unit only. **GAP** for a journey                                                                                                      |
| 6.7, 6.8 error states                                                                         | **GAP**: needs a mock failure switch                                                                                                  |
| 7.1–7.7 card, colours, lines, dedication, Copy text                                           | M                                                                                                                                     |
| V2.2 done when: 8 lines make two 1080×1350 images that link back                              | Split: unit. PNG: L, P. `/p/<slug>`: M. **GAP**: one journey that chooses 8 lines and gets 2 cards (mock poems have 4 lines)          |
| 7.9–7.10 paging, 7.15 photos error                                                            | **GAP**                                                                                                                               |
| 8.2 Favorites locked, 8.10–8.11 remove and undo                                               | M; 8.10 also S                                                                                                                        |
| 8.4 List deleted · UNDO                                                                       | M **NEW**                                                                                                                             |
| 8.5 follow and read counts                                                                    | S; R                                                                                                                                  |
| 8.6–8.9 your poems by poet, feeling and era; English order                                    | M **NEW**. Finding: Arabic order uses plain `localeCompare`, not the dictionary filing (`arabicSortKey`), and there is no letter rail |
| 8.12 empty                                                                                    | S                                                                                                                                     |
| 8.13, 8.14 sync error                                                                         | **GAP**                                                                                                                               |
| V2.3 done when: 1,000 keeps load every view in under a second                                 | **GAP**: add to the Supabase job (seed 1,000 keeps, time the views)                                                                   |

### 9 Journey and first run, 12 You (V3.1, V3.5) (V3 agent)

| Criterion                                                      | Proof                                                           |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| V3.1 done when: Welcome → Tonight → a completed step           | M (9.1–9.4, 9.6–9.7); L (9.4, 9.5–9.6); S (progress per reader) |
| 9.8 journey complete, 9.9 loading                              | **GAP**                                                         |
| 12.5 bands match Explore, 12.8 delete asks first               | M                                                               |
| V3.5 done when: a setting changes the next doors and Next poem | **GAP**                                                         |
| 12.1 Appearance preview, 12.3, 12.4, 12.6, 12.7                | **GAP** (12.2 via S)                                            |

### 10 Collections, 11 Search (V3.3, V3.4)

| Criterion                                                       | Proof                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| V3.3 done when: a saved collection resumes where it left off    | M **NEW** (resumes after a reload); collection progress has no S test yet |
| 10.1 every collection opens in order; 8.15 saved in the Library | M **NEW**; L, P                                                           |
| V3.4 done when: a half-remembered line finds the poem           | M **NEW** (opens it); L (ignores vowel marks); P                          |
| 11.1 recent searches on the device                              | M **NEW**                                                                 |
| 11.3 nothing found offers the closest                           | M, L, P                                                                   |

### Rules in the database

`redesign2_rules.sql` covers:

- Favorites is created once.
- A keep goes to Favorites.
- Deleting a list keeps its poems.
- Taking a poem out of Favorites never un-keeps it.
- Favorites is locked.
- Foreign lists are refused.
- `mark_read` counts rereads.
- `set_follow` is idempotent.
- Grants.

**GAP:** RLS isolation between users (only S proves it), `progress`, and `user_settings.prefs`. Add these as assertions under a second user's claims.

## What not to add (and what to cut)

- **No unit tests for components, hooks, API clients or the mock layer.** The journeys cover them through the UI. A test that rebuilds the implementation's output in the test is restating code.
- **No snapshot or pixel tests in CI.** Visual fidelity is `qa:mocks`, reviewed by a person per slice.
- **No duplicate journeys across layers.** Mock covers the UI flow. L and S re-run only the flows whose data path matters (SQL, RLS, triggers). P is a thin read-only spine.
- **Cut in this branch:** nothing in `web/`; the 22 unit tests are all pure logic with edge cases. In CI, `--pass-with-no-tests` on the live job is gone, because it let a grep that matched nothing pass.
- **Stop expanding now:** `src/test/` (63 files), `e2e/`, the root Storybook and Vitest projects, and old-app items in `feature-manifest.json`. Bug fixes only, each with the smallest test that proves the fix.

## CI shape

| Workflow and job                                         | Runs on                                                                                                              | Gating                                          | Budget              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------- |
| `web.yml` check (types, lint, unit, build)               | `web/**`, `server.js`, `server/**`, `supabase/**`, `scripts/db-*.sh`, root `package*.json`, canvas export, `web.yml` | yes                                             | ~2 min              |
| `web.yml` journeys (mock) + mock QA                      | same                                                                                                                 | journeys yes; QA advisory (artifact)            | ~3 min, suite ~20 s |
| `web.yml` live-smoke (Postgres + rules SQL)              | same                                                                                                                 | yes                                             | ~4 min              |
| `web.yml` live-supabase (`@supabase`) **NEW**            | same                                                                                                                 | advisory until green on a few runs, then gating | ~6 min              |
| `web-prod-smoke.yml` **NEW**                             | after each successful Vercel Production deployment; or by hand with a URL                                            | reports, never blocks                           | ~3 min              |
| `ci.yml` old app                                         | `src/**`, `index.html`, `server.js`, `e2e/**`, root configs, `design-review/**` except `design-refresh/`             | until cut-over                                  | ~12 min             |
| Database Reconstruct, manifest gates, actionlint, CodeQL | unchanged                                                                                                            | yes                                             |                     |

What changed in this branch:

- `ci.yml` no longer runs the old app's suite on web-only changes. The `**/*.test.*` glob that matched `web/core/logic/logic.test.ts` is gone, the design-refresh canvas is excluded, and the workflow filter now names only `ci.yml`.
- `server.js` is shared, so it still triggers both workflows.

**Production smoke (`npm run test:prod`, `journeys/prod.spec.ts`)** is read-only by construction:

- A route guard aborts every non-GET request.
- It also aborts the two GETs that can write: `/api/v2/poems/:id/ai` (read-or-generate) and `/api/v2/tonight` (stores the day's pick). Set `PROD_ALLOW_CACHE_FILL=1` to let those through.
- Signed-in steps (keep, lists, settings) are absent on purpose.
- Today it runs 10 checks against production: Explore, feeling → poem, bands, poet page, poet-of-the-week bio, doors, broken link, search, collections, card PNG. All pass. Tonight is skipped unless cache fills are allowed.

**Feature manifest and APP-STATE.** `scripts/check-feature-manifest.mjs` scans only `server.js`, `src/components`, `src/test` and `e2e`, so the `/api/v2` endpoints, web features and web journeys are invisible to the drift gate. Recommendation:

- Add `server/redesign2.js` to endpoint discovery (the `app.get(` regex already fits).
- Add `web/src/features/*/` as entrypoints and `web/journeys/*.spec.ts` as tests.
- Add one manifest feature per area N (`redesign2-<N>-<area>`) listing its endpoints, folder and spec.

That makes APP-STATE show coverage per area and fails CI when an endpoint ships without a manifest entry. Do it after the V3 branch merges, so its new endpoints land in one reconcile.

**Known noise:**

- CodeQL has pre-existing alerts in `design-review/` and `enjoyability-lab.html`. These are old-app and prototype HTML, not ReDesign2, and go with the cut-over cleanup.
- The committed `tokens.css` is Prettier-formatted (lowercase hex), while `npm run tokens` writes uppercase. CI regenerates it, so this is harmless. Don't commit the regenerated file.

## Deprecation plan for the old app's tests

- **Now:** freeze `src/test/`, `e2e/` and the root Vitest and Storybook projects. No new tests except for bug fixes.
- **Keep until cut-over:**
  - `ci.yml` build, unit and smoke, because the old app is live at `/`.
  - `src/test/server.db.test.js` plus Database Reconstruct, because `server.js` v1 routes still serve it.
  - Feature Coverage, for v1 endpoints.
- **At cut-over** (new app at `/`, every V3 spec green):
  - Delete `src/test/` and `e2e/`, the root `vitest.config.js` projects `unit` and `storybook`, `playwright.config*.js`, `.storybook/`, and the old-app parts of `ci.yml`.
  - Move `server.db.test.js` cases for any v1 route the new app still calls (`/api/ai/live-tts`, `/api/bug-reports`) to `@live` journeys or a small API test, and drop the rest with the v1 routes.
  - Rebase the feature manifest on `web/` areas.
  - Make `web.yml` the main CI, with no path filter for `web/**`.
- **After cut-over:** drop the `design-review/` prototype HTML that CodeQL flags.

## Decisions for you

1. **Duplicate web runs.** `web.yml` runs twice per push to a branch with an open PR: once as `push`, once as `pull_request`. Recommendation: limit `push` to `main` and `claude/fervent-galileo-u0johv`. The catch: phase branches without a PR would then get no CI until a PR is opened.
2. **Make `live-supabase` gating** once it has been green on a few runs. It is the only CI proof of RLS and cross-device data.
3. **Manifest coverage of `web/`**, as described above. Do it after V3 merges?
4. **@prod writes.** Leave signed-in production steps out (recommended), or add an opt-in run with a dedicated test account whose rows are cleaned up?
5. **Product gaps found while testing:**
   - 1.7 long-press on the mark isn't wired.
   - Library Arabic order isn't dictionary filing, and there is no letter rail (8.6).
   - 539 production poets have no bio and 960 have no region (V1.6 Gemini fill).
