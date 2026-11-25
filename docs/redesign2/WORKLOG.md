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
- [~] 2. PR #752 opened (https://github.com/lesmartiepants/poetry-bil-araby/pull/752); waiting on CI, then merge
- [ ] 3. Production checked
- [x] 4. Editorial seed in production (user approved; launch 2026-11-25; 2 collections, 24 steps, 49 Tonight picks to 2027-01-12)
- [~] 5. V3 agent started (branch claude/redesign2-v3-doors) / taken over
- [ ] 6. Screenshot + state QA script, issues collected, fixes applied

- [~] Test-strategy agent started (branch claude/redesign2-test-strategy): TEST-STRATEGY.md, coverage matrix by area, feature-focused CI, old-app test deprecation plan. Merge its branch after review.
- [~] Editorial agent started (branch claude/redesign2-editorial) to gather missing content from the user; relay the user's messages to it.

## Still needed for a complete app (not covered by steps 1–6)

- [ ] 7. Recitation live: flip `tts` to live, verify the player against real Gemini audio in production.
- [ ] 8. Rest of V3: the full first-run flow (only step 0 exists), "the rest of You", settings steering doors and Next poem.
- [ ] 9. Editorial content complete in production: 4 journeys, 24 collections, a featured poem a day, step names, poet regions.
- [ ] 10. Short share links (`share_slug`, `/p/<slug>`): production data write, ask first.
- [ ] 11. Parity check: every old-app feature in BUILD-SPEC's "replaced by" table has its new home.
- [ ] 12. Production smoke tests: a `@prod` journey run against the deployed `/new` (read, keep signed in, share image, journey step).
- [ ] 13. Real-phone pass: iOS Safari and Android Chrome (safe areas, share sheet, audio autoplay, keyboard).
- [ ] 14. Cut-over: the new app at `/`, old app retired, once every V3 "done when" passes.
- [ ] Minor: QA 2.5 click selector, `pauseLines` honoured by playback.
