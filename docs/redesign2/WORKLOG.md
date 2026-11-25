# ReDesign2 work log (merge to production, then V3)

Standing instructions from the user (2026-11-24). Re-read this before each step.

1. Push migration `20261124000003` to production (dry run first, report what applied).
2. Push `claude/fervent-galileo-u0johv`, open the PR to `main`, merge once CI passes.
3. Check production: `/new` on Vercel and `/api/v2` on Render.
4. Editorial seed: the other agent is done; this session takes care of it. It is a production data write, so confirm with the user before running it.
5. Meanwhile a background agent starts V3 on a new branch. After steps 1–3, take over its work. Scope is ALL of V3 (every slice in BUILD-SPEC, not just doors), and every feature checked against its "Done when" criteria.
6. Then: write a script that screenshots the app and compares it to the mocks, and checks reactive states (loading, empty, error, signed in/out, kept/unkept, progress). Collect every issue, then fix them together.
7. Every design change goes into the app AND the design reference (canvas frame + its copy in `design-review/design-refresh/index.html`).
8. Never echo secrets. Never commit to `main` directly. Production writes need the user's confirmation.

## Progress

- [x] 1. Migration 20261124000003 in production (column and index already existed; now recorded)
- [x] 2. PR #752 merged into main (01683ec) after CI green and test-agent sign-off. Production DB was already up to date, so deploy.yml's db push is a no-op.
- [x] 3. Production checked (2026-11-25): https://poetry-bil-araby.vercel.app/new/ loads on a phone viewport with no errors; calls Render /api/v2 and Supabase; Tonight = seed night 1; journey + collection from the seed; card.png 200. deploy.yml migration step failed on CLI v3 config → fix PR #754 merged (7995edd) after sign-off.
  - QA issues seen in production for step 6: (a) Tonight on a shorter phone (iPhone 13, 664px tall) the ENTER door overlaps the WHY TONIGHT text; (b) poet of the week reads "· 295 poems" with an empty era; (c) Explore's poet row leads with obscure poets (Yarbu'i, Rabi'ah, Fahl…); (d) Pathways doors are the old ones (V3 agent); (e) Tonight requests `/api/v2/poems/` with an empty id before tonight loads (`usePoem('')` needs `enabled: !!id`); (f) live test 9.5–9.6 (Pathways) failed on main CI after the merge: the PATHWAYS tab kept detaching for 30s, but it passed on the PR and passes locally in a CI-like setup, so it's timing-dependent; rerun passed (flaky confirmed); the test agent is hardening it (wait for Tonight's content before clicking the tab).
- [x] 4. Editorial seed in production (user approved; launch 2026-11-25; 2 collections, 24 steps, 49 Tonight picks to 2027-01-12)
- [~] 5. V3 taken over (2026-11-25) on branch claude/redesign2-v3. V3.2 doors done by the agent (5ba298c), verified here: 36 mock + 18 live journeys, unit suites green. Remaining V3 (from the agent's audit):
  - V3.1: 9.2 to match NWelcomeRead ("<NAME>, HOW WOULD YOU LIKE TO READ?", row descriptions, "BEGIN WITH TONIGHT'S POEM"); 9.3 Tonight "WELCOME · YOUR FIRST POEM" missing; 9.8 journey complete vs NJourneyDone; Pathways journey list vs NDoors (START HERE card + rows).
  - V3.3 Collections and V3.4 Search: audit against Done-when + mocks.
  - V3.5 You: audit 12.3–12.7 vs mocks; fix frames.json 12.1 mapping (NYou is 12.3; 12.1 is FRYouV1). Next poem left the UI (doors replace it).
  - QA notes: 2.18 reasons repeat "A change of voice" with fixture data; 2.17 end lacks the reader dock shown in the mock.
- [~] 5b. PR #759 (claude/redesign2-v3-rest): 9.2, 9.3, 9.5, 9.8, 10.1, 10.2, 11.2, 11.3, 12.7 matched to mocks; waiting on test-agent sign-off (the original test agent's session ended, so a new ci-test-guardian agent replaced it). IA note: in the 11.2 mock, search sits under the Library tab; the app puts it under Explore.
- [~] 5c. Sonnet agent: editorial journey subtitle (subtitle_en/subtitle_ar column, cards, template, seed) on claude/redesign2-journey-subtitle, replacing the derived first-to-last-poet span. Production migration and seed need user approval.
- [x] 6. State QA (`npm run qa:states`, 53 cases, green) found and fixed together on claude/redesign2-qa-fixes: shared `Pending`/`LoadNote` primitives (skeleton while loading, "Try again" on failure) on every screen that showed nothing on error; unknown feeling/collection/list links say so; ENTER door no longer covers WHY TONIGHT on short phones; poet of the week hides the empty era dot; `usePoem('')` no longer fetches; "somewhere new" reasons vary; duplicate React key on journey complete.

- [~] Test-strategy agent started (branch claude/redesign2-test-strategy): TEST-STRATEGY.md, coverage matrix by area, feature-focused CI, old-app test deprecation plan. The agent opens a PR when done; this session reviews and integrates (merges) that PR itself. It must make real changes (tests, CI), not just docs. STANDING RULE: every time this session opens a PR, wake the test agent (SendMessage) with the PR number so it checks the PR's tests/CI and pushes fixes. Do NOT merge a PR until the test agent signs off that CI is sound.
- [~] Editorial agent started (branch claude/redesign2-editorial) to gather missing content from the user; relay the user's messages to it.

## Still needed for a complete app (not covered by steps 1–6)

- [~] 7. Recitation live (branch claude/redesign2-tts-live): `tts` is live; server generates Gemini TTS once per poem and voice (`poem_audio`), `pauseLines` honoured. Needs in production: migration 20261125000001, `GEMINI_API_KEY` on Render, then a real listen.
- [ ] 8. Rest of V3: the full first-run flow (only step 0 exists), "the rest of You", settings steering doors and Next poem.
- [ ] 9. Editorial content complete in production: 4 journeys, 24 collections, a featured poem a day, step names, poet regions.
- [ ] 10. Short share links (`share_slug`, `/p/<slug>`): production data write, ask first.
- [ ] 11. Parity check: every old-app feature in BUILD-SPEC's "replaced by" table has its new home.
- [ ] 12. Production smoke tests: a `@prod` journey run against the deployed `/new` (read, keep signed in, share image, journey step).
- [ ] 13. Real-phone pass: iOS Safari and Android Chrome (safe areas, share sheet, audio autoplay, keyboard).
- [ ] 14. Cut-over: the new app at `/`, old app retired, once every V3 "done when" passes.
- [ ] Minor: QA 2.5 click selector.
