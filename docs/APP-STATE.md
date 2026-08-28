# App Current State — Feature Inventory & Test Coverage

This is the living map of **what the app does** and **how well each feature is actually tested**. It exists because the suite has 595 unit + 80 e2e tests yet user-facing features (audio, iOS, PWA) keep regressing. The cause is not too few tests. It is tests pointed away from where the bugs are.

- **Source of truth:** [`feature-manifest.json`](../feature-manifest.json) (edit it when you add/remove a feature).
- **Drift gate:** [`scripts/check-feature-manifest.mjs`](../scripts/check-feature-manifest.mjs) fails CI when code and manifest disagree. On PRs it runs `--deadref-only` (read-only) and does **not** rewrite this file.
- **CI:** `.github/workflows/feature-coverage.yml` runs the gate on every PR and comments drift. The Manifest Auto-Reconcile bot (`manifest-autofix.yml` + `manifest-automerge.yml`) regenerates the auto block below and commits it via a PR when changes land on `main`.

Run locally:

```bash
npm run manifest:check     # fail on drift (what CI runs)
npm run manifest:update    # refresh the auto block below, never fails
```

---

## How to read coverage (the honest definitions)

A green test is not the same as a tested feature. We tag each feature with what its tests _actually_ exercise:

| Tag             | Meaning                                                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **behavioral**  | A test runs the feature's real logic and asserts real behavior. Trust it.                                                                                |
| **mocked**      | Covered by e2e/unit, but the fragile layer is mocked away (e.g. TTS returns silent PCM, Supabase is faked). Catches wiring breaks, not the real failure. |
| **source-only** | "Verified" only by grepping source text (`makeover-*.test.js`). If the logic regresses but keeps the same tokens, the test stays green. Weakest signal.  |
| **device-only** | Cannot run in Chromium-on-Linux CI. Needs real Safari/iOS or a device. Must be covered by a manual checklist.                                            |
| **none**        | No automated coverage.                                                                                                                                   |

---

## The testing frameworks we're standardizing on

Researched from current practice ([sources](#sources)). The shape matters less than pointing effort at real risk.

### 1. Testing Trophy over Test Pyramid (this app is API/UI-centric)

The [Test Pyramid](https://qalified.com/blog/test-pyramid-for-engineering-teams/) (lots of unit, few integration, fewer E2E) fits thick-domain-logic apps. The [Testing Trophy](https://testrigor.com/blog/what-is-the-testing-trophy-model/) (static analysis → unit → **integration as the focus** → minimal E2E) fits apps where the value is units collaborating across a UI and a backend. That's this app. Our bugs live in collaboration (togglePlay ↔ audio engine ↔ store ↔ DOM), which is exactly the integration layer the pyramid under-weights. So: keep ESLint/Prettier as the base, keep unit tests for pure logic (timing math, parsing), and **invest in integration/behavioral tests of the playback state machine**, with a thin E2E smoke layer on top.

### 2. Risk-based testing: tier every feature

From [risk-based regression practice](https://katalon.com/resources-center/blog/risk-based-approach-for-regression-testing): score features by _likelihood of breaking_ × _impact if broken_, and spend coverage proportionally. We encode this as a **tier** on every feature:

- **critical** — core journey; app is unusable if it breaks. Must have a behavioral smoke test gated on every PR.
- **important** — real value, frequent use. Must have regression coverage.
- **nice** — enhancement / easter egg. Best-effort.
- **internal** — tooling/ops, not user-facing.

### 3. Smoke vs regression: draw the line deliberately

From the [smoke-vs-regression guide](https://medium.com/pickme-engineering-blog/smoke-vs-regression-the-complete-classification-guide-to-drawing-the-line-in-testing-702e45143c2a): the **smoke suite is the minimum set that proves the build is usable** (target < 5 min, gates every merge); **everything else is regression** (runs pre-release or change-scoped). Our smoke suite = the critical-tier user journeys: load a poem, discover, listen (play→pause→stop), swipe. Resist letting smoke grow into full verification.

### 4. Feature traceability that can't go stale

From [traceability-in-CI practice](https://medium.com/@sancharini.panda/how-a-traceability-matrix-fits-into-modern-ci-cd-workflows-714c5a6862af): hand-maintained matrices decay into fiction. The fix is to (1) keep stable feature IDs, (2) link tests to features in a single artifact, and (3) **enforce it as a CI gate**. That's exactly what `feature-manifest.json` + the drift detector do: the doc can't silently drift, because CI fails when code grows an endpoint or component the manifest doesn't know about.

### 5. Device coverage is a first-class gap, not an afterthought

Half our regressions are iOS/Safari/PWA. CI runs Chromium-on-Linux only. Anything tagged **device-only** below is, by definition, invisible to CI and must be covered by the manual checklist in [`docs/DEVICE-QA-CHECKLIST.md`](./DEVICE-QA-CHECKLIST.md) before release.

---

## Current state (auto-generated)

The block below is regenerated by `npm run manifest:update` and by CI. Do not hand-edit it.

<!-- AUTO:BEGIN (generated by scripts/check-feature-manifest.mjs — do not edit by hand) -->
_Generated 2026-08-28. **Manifest is in sync with code.**_

_The Manifest Auto-Reconcile bot regenerates this block and commits it via a PR when changes land on `main`. On feature PRs the checker runs `--deadref-only` (read-only, no write) — it never rewrites this file in-PR._

### Inventory at a glance

- **Features tracked:** 41
- **HTTP endpoints in code:** 38
- **Components in code:** 45
- **Test files in code:** 67
- **Behavioral coverage:** 8/41 (20%)

| Tier | Features |
|------|----------|
| critical | 7 |
| important | 14 |
| nice | 16 |
| internal | 4 |

| Coverage | Features |
|----------|----------|
| behavioral | 8 |
| mocked | 20 |
| source-only | 1 |
| device-only | 3 |
| none | 9 |

### Feature coverage matrix

| Feature | Tier | Coverage | Device-only | Gap |
|---------|------|----------|-------------|-----|
| `poem-categorization` | important | mocked | - | server.test.js covers the enabled/disabled API paths with a mocked pool; no e2e yet for the Explore Poems UI (filter chips, in-place poem expand). |
| `onboarding-preferences` | nice | behavioral | - | Unit tests cover band derivation against a real measured histogram (era grouping, NULL-century handling, quantile difficulty cuts), the categoryTags adapter, stepping all five steps to completion, mood ordering, and the empty pre-migration state. Cross-device sync is unit-tested in both merge directions, plus write-through, read-back and version mismatch, against a stubbed Supabase client. No e2e yet for the rendered flow, and nothing exercises the JSONB column against a real Postgres row. |
| `taxonomy-tag-ui` | nice | none | - | No automated coverage. Components are ported but unmounted; add tests when a surface routes to them. |
| `poem-display` | critical | behavioral | - | Arabic font rendering (Amiri/Tajawal) differs prod vs CI; no visual regression. |
| `discover-random` | critical | mocked | - | e2e routes /api/** to canned JSON; real server SERVING filters + exclude fallback only covered by server.test.js in isolation. |
| `poem-carousel` | critical | mocked | - | carousel.spec skips silently when <2 dots populate; a broken carousel can pass as skipped. |
| `tts-playback` | critical | source-only | - | HIGHEST RISK. togglePlay.js (1025 lines, 105 branches) state machine is never executed behaviorally; makeover-tone asserts source text via regex; e2e runs on silent PCM with the streaming path aborted. |
| `tts-stop-on-swipe` | critical | mocked | - | Regressed in #552 on streaming/iOS players (no .state). liveAudioStream covers the streaming stop primitive; the togglePlay swipe path is not behaviorally tested. |
| `tts-voice-cycle` | important | mocked | - | voices.test covers nextVoice + persistence; the abort+restart race on mid-recitation switch is untested. |
| `tts-engine-switch` | important | none | - | Source of #560/#558/#561. The orphaned-stream/abort path on engine switch has no behavioral test. |
| `tts-word-highlight` | important | behavioral | - | Timing math and class transitions well covered. Auto-scroll layout (getBoundingClientRect) only real in Chromium, not jsdom. |
| `tts-seek-verse` | nice | mocked | - | startPlayer is mocked; isSeeking singleton clearing not behaviorally verified. |
| `tts-ios-silent-switch` | important | device-only | yes | navigator.audioSession + HTMLAudio unlock. Source of #556/#561. Impossible in CI; needs a manual iOS device checklist. |
| `tts-prefetch-cache` | nice | mocked | - | cache.test covers Blob->ArrayBuffer (iOS #554). Prefetch is skipped entirely in live mode; the in-flight prefetch poll (60s nested timeouts) is untested. |
| `ai-insights` | important | mocked | - | Parsing well covered. SSE streaming + swipe-bail (_analysisGeneration) only over mocked routes. |
| `save-poems` | important | mocked | - | Supabase fully mocked. Optimistic insert + 23505 dedup + post-OAuth auto-save stash only logic-tested. |
| `auth-oauth` | important | mocked | yes | Real OAuth redirect/PKCE exchange can't run in CI; only the stash/restore + short-circuit logic is mockable. |
| `settings-sync` | nice | mocked | - | Debounced upsert to user_settings only logic-tested; voice_preference column exists but UI uses localStorage. |
| `text-settings` | important | behavioral | - | Store + highlight defaults covered; full popover interaction matrix not exhaustively e2e-tested. |
| `theme-toggle` | important | behavioral | - | None significant. Toggle control moved out of the removed ThemeToggle.jsx into the nav/settings. |
| `share-card` | nice | mocked | - | canvas ctx mocked; real toDataURL pixels + navigator.share unavailable in CI; Arabic font rendering unverified. |
| `deep-link` | important | mocked | - | Param parsing covered; deep-link fetch-failure fallback to random only logic-level. |
| `copy-poem` | nice | mocked | - | clipboard stubbed in unit setup; e2e asserts the success state. |
| `downvote-flag` | nice | mocked | - | Frontend uses Supabase-direct emitEvent; the Express event endpoints are an unused alternate path. |
| `poet-filter` | important | mocked | - | search endpoint exists server-side but has no client service wrapper; search UI path thin. |
| `onboarding-splash` | nice | none | - | No behavioral test of phase progression or hasSeenOnboarding gating. |
| `zen-mode` | nice | none | - | No test for idle transition or that settings taps don't wake chrome. |
| `ratchet-mode` | nice | none | - | Easter-egg toggles + RATCHET_SYSTEM_PROMPT path untested. |
| `keyboard-shortcuts` | nice | mocked | - | Help overlay + a few shortcuts touched in e2e; full key matrix not asserted. |
| `bug-report` | nice | none | - | server.test covers the endpoint shape; the client submit flow is untested. |
| `pwa-offline` | important | device-only | yes | pwa-service-worker.spec needs a prod preview build (skips on dev); SW lifecycle absent in jsdom. |
| `pwa-release-update` | critical | device-only | yes | Source of #557. checkForNewRelease (fetch+compare+caches.delete+reload) is unit-testable with mocks but currently has NO unit test; iOS Safari SW unreliability is device-only. |
| `keep-alive` | internal | behavioral | - | None. |
| `ai-mode` | nice | mocked | - | Model ranking + thinking config covered; live generation mocked. |
| `internal-design-review` | internal | behavioral | - | Endpoints well covered against mocked pg. |
| `decorative-visuals` | nice | none | - | Purely decorative; no behavioral coverage, low risk. |
| `internal-tts-lab` | internal | none | - | Dev-only; no coverage needed. |
| `reader-feed` | critical | mocked | - | #714 N4 port. e2e drives the column with mocked poems: full-column render, monotonic reveal, inactive columns staying unread, the quill hold summoning (with reduced-motion completion) and early release no-oping, and scrubber absence. Not behaviorally asserted: sustained bottom-pull charging, TTS follow inside the scroller, and the hairline's insight branch. iOS long-press suppression and the 90-mote arrival cost are device-only. |
| `guided-tour` | important | mocked | - | #582/#602. e2e exercises step flow; conditional-step + resume-lifecycle branches only partly asserted. Unit test covers the full-screen-route mount gate only. |
| `enjoyability-lab` | internal | none | - | Dev tooling; no automated coverage by design. /enjoyability is gated by ENABLE_DEV_LAB (404 in prod); the Saved-curation endpoints are gated by SAVED_CURATION_EMAIL (unset in prod). |
| `feed-preference-weighting` | nice | behavioral | - | Unit tests pin the weighting and every partial-credit rule, the family/mood overlap discount in both directions, both halves of the no-lock-in guarantee (a zero-scoring candidate keeps a strictly positive softmax weight, AND the unanchored candidate page exists so it can be a candidate at all), the temperature calibration that carries the old wild 0.15 -> 0.25 mix forward, the batched multi-slide draw (ranked opening, sampled tail, no repeats, stable tie-break, load-more does not re-rank), the per-poem draw records the inspector reads, and the preference change notification that triggers the redraw. They also pin what the inspector RENDERS, so the panel cannot become a second implementation of the weighting: the per-term score decomposition sums to the score the scorer returned, and the per-dimension explanation resolves each facet to one of matched / present-but-unasked / asked-for-but-absent / partial, including the asked-for-but-absent case that the old truncating table had no way to express at all. The integration in fetchPoem.js (two-page candidate fetch, dedup, fallback to a plain fetch on an empty result) has no dedicated tests yet, and the inspector's LAYOUT (that nothing in the why block truncates at 375px) is verified in a browser rather than in CI; the end-to-end redraw is verified in a browser, not in CI. The browser check asserts a COUNT (exactly one scored draw fires) and that the reader rests on slot 0 ranked, because the regression it caught passed every non-zero check: the ranked opening was drawn correctly and then clobbered by a second fetch before the reader saw it. The rationale back-fill is unit-tested on both sides: the route is pinned on the cached path (no model call, no second write), the jsonb_set merge and its write-once guard, and the 503/502/no_rationale branches; the client service is pinned on POSTing to the persisting route, de-duplicating concurrent expands, and resolving null for every failure. The rendered bilingual block at 375px is verified in a browser, not in CI. |

### Critical features without behavioral CI coverage

These are the highest-leverage gaps. Each is a critical-tier feature whose real failure mode is not exercised by a test that runs in CI:

- `discover-random` — mocked: e2e routes /api/** to canned JSON; real server SERVING filters + exclude fallback only covered by server.test.js in isolation.
- `poem-carousel` — mocked: carousel.spec skips silently when <2 dots populate; a broken carousel can pass as skipped.
- `tts-playback` — source-only: HIGHEST RISK. togglePlay.js (1025 lines, 105 branches) state machine is never executed behaviorally; makeover-tone asserts source text via regex; e2e runs on silent PCM with the streaming path aborted.
- `tts-stop-on-swipe` — mocked: Regressed in #552 on streaming/iOS players (no .state). liveAudioStream covers the streaming stop primitive; the togglePlay swipe path is not behaviorally tested.
- `pwa-release-update` — device-only: Source of #557. checkForNewRelease (fetch+compare+caches.delete+reload) is unit-testable with mocks but currently has NO unit test; iOS Safari SW unreliability is device-only.
- `reader-feed` — mocked: #714 N4 port. e2e drives the column with mocked poems: full-column render, monotonic reveal, inactive columns staying unread, the quill hold summoning (with reduced-motion completion) and early release no-oping, and scrubber absence. Not behaviorally asserted: sustained bottom-pull charging, TTS follow inside the scroller, and the hairline's insight branch. iOS long-press suppression and the 90-mote arrival cost are device-only.
<!-- AUTO:END -->

---

## What to do about the gaps (priority order)

1. **Behavioral test for the `togglePlay` state machine.** It's `critical` + `source-only`, 1025 lines / 105 branches, and in 4 of the last 5 fixes. Test play → switch voice mid-recitation → stop → swipe with a stubbed AudioContext/Tone player, asserting `_currentPlayId` aborts and no orphaned stream survives. Highest leverage single test in the repo.
2. **Add a WebKit lane to CI.** `npx playwright install webkit` + a `webkit` project in the `process.env.CI` branch of `playwright.config.js`. Catches Safari JS/audio-API divergence (about half the iOS bug class). Won't catch hardware silent-switch.
3. **Unit-test `checkForNewRelease`** (PWA update, `critical` + `device-only`). The fetch+compare+`caches.delete`+reload logic is mockable today and caused #557; only the SW side effects are truly device-bound.
4. **Stand up the device-QA checklist** for the genuinely device-only set (iOS silent switch, OAuth redirect, real IndexedDB/WebKit Blob, `navigator.share`).
5. **Stop shipping risky changes without a regression test.** Consider a TDD guard (e.g. Probity) once the behavioral harness exists.

---

## Sources

- [Why the Test Pyramid Still Matters in 2025 — Qalified](https://qalified.com/blog/test-pyramid-for-engineering-teams/)
- [What is the Testing Trophy Model? — testRigor](https://testrigor.com/blog/what-is-the-testing-trophy-model/)
- [Risk-Based Approach for Regression Testing — Katalon](https://katalon.com/resources-center/blog/risk-based-approach-for-regression-testing)
- [Smoke vs Regression: Drawing the Line — PickMe Engineering](https://medium.com/pickme-engineering-blog/smoke-vs-regression-the-complete-classification-guide-to-drawing-the-line-in-testing-702e45143c2a)
- [How a Traceability Matrix Fits into Modern CI/CD — Medium](https://medium.com/@sancharini.panda/how-a-traceability-matrix-fits-into-modern-ci-cd-workflows-714c5a6862af)
- [Test Coverage and Traceability: A Complete QA Guide — TestRail](https://www.testrail.com/blog/test-coverage-traceability/)
