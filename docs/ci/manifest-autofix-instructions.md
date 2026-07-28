# Auto-reconcile instructions (Claude-in-CI)

You are running non-interactively in CI after a push to `main`. The feature
manifest (`feature-manifest.json`) has drifted from the code. Your job is to
reconcile it **honestly** and, where possible, add a **verified** behavioral
test. Then leave your changes in the working tree; a later CI step opens the PR.

## The one rule that matters

**Never claim coverage you did not verify.** A dishonest `"coverage": "behavioral"`
label is worse than a red build, because it makes green meaningless. When in
doubt, label a feature `"none"` and move on. Honesty over completeness.

## Steps

1. Read the drift. It was written to `drift.json` (output of
   `node scripts/check-feature-manifest.mjs --json`). Also run
   `node scripts/check-feature-manifest.mjs` to see the human-readable report.

2. For each drift item:

   **`component_unmapped` / `endpoint_*` (an ADDITION):** a feature exists in
   code but not in the manifest. Add a manifest entry:
   - `id`, `name`: derive from the component/endpoint.
   - `userFacing`: read the actual component/source and write one true sentence
     about what the user experiences. Do not invent.
   - `entrypoints` / `endpoints`: the real files/routes.
   - `tier`: `critical` (core reading/playback loop), `important` (frequent real
     value), `nice` (enhancement/easter egg), `internal` (tooling, not user-facing).
     If unsure, pick the lower tier and note it in `gap`.
   - `coverage`: follow the coverage decision below. **Default to `"none"`.**
   - `gap`: one honest sentence about what is not covered.

   **`dead_entrypoint` / `dead_test` / `endpoint_removed` (a REMOVAL or RENAME):**
   the manifest points at a file/route that no longer exists. Decide which it is
   using git — check the recent history of the deleted path
   (`git log --oneline -3 -- <path>`) and look for a same-named/similar file that
   appeared (a `component_unmapped` in the same drift is often the moved file):
   - **Rename / move** (the code moved to a new path): update the feature's
     `entrypoints`/`endpoints` to the new location. Keep the feature, its coverage,
     and its tests. This also resolves the paired `component_unmapped`.
   - **True removal** (the feature is gone from the product): remove the feature
     entry entirely, and delete any now-orphaned test files it owned.
     Do not delete a feature just because one of several files moved.

   **`feature_updated` (an in-place UPDATE):** listed in `drift.json` under
   `updated`. The feature's own source changed since its last hash baseline, so its
   coverage may now be stale. For each updated feature:
   - If `coverage` is `"behavioral"`: RE-VERIFY the guard. Generate a fresh break
     for the feature's current source and run the gauntlet
     (`node scripts/guard-gauntlet.mjs`, see step 4) against the feature's existing
     test. If it still passes-clean-and-fails-on-break → keep `"behavioral"`. If the
     test now fails on clean code, or no longer fails on the break → the update
     broke or outdated the guard: downgrade `coverage` to `"none"`, note it in
     `gap`, and (if you can) regenerate a real test via step 4.
   - Re-read the component and refresh `userFacing`/`gap` if the behavior changed.
   - Leave `tier` unless the feature's importance genuinely changed.

3. Coverage decision, per new feature:
   - **Is it testable in headless Chromium CI?**
     - NO (audible audio, real OAuth redirect, iOS-only, PWA install/offline,
       purely decorative) → set `coverage` honestly to `"mocked"`, `"device-only"`,
       or `"none"`. Do NOT write a fake test. Explain in `gap`.
     - YES (UI state, DOM changes, store transitions, API-mocked flows) → attempt
       a behavioral test (step 4).

4. Generate + VERIFY a behavioral test (only for CI-testable features):
   - Write a test under `src/test/` (unit/integration) or `e2e/` (Playwright),
     following the patterns in the existing tests. It must assert a
     **user-observable outcome**, not an implementation detail, and not a source
     string.
   - Run the mutation gauntlet to prove it is a real guard:
     ```
     node scripts/guard-gauntlet.mjs '<spec.json>'
     ```
     where the spec names your test and a `break` that disables the feature
     (a string replacement in the feature's source that should make the test fail):
     ```json
     {
       "test": "src/test/yourFeature.test.js",
       "break": [{ "file": "src/.../feature.js", "find": "<real line>", "replace": "<disabled>" }],
       "flakeRuns": 2
     }
     ```
   - If the gauntlet exits 0 (verified: passes clean, FAILS on break, not flaky) →
     keep the test and set the feature `coverage` to `"behavioral"`.
   - If it exits 1 (theater / flaky / no baseline) → DELETE the test you wrote,
     set `coverage` to `"none"`, and note the failed attempt in `gap`. Do not
     keep an unverified test.

5. Regenerate the living doc: `node scripts/check-feature-manifest.mjs --update`
   (updates `docs/APP-STATE.md`).

6. Re-baseline the update hashes LAST, after all manifest edits:
   `node scripts/check-feature-manifest.mjs --update-hashes` (rewrites
   `feature-hashes.json`). This records the current source of every feature so the
   next push does not re-flag the same update.

7. Confirm the tree is fully in sync:
   `node scripts/check-feature-manifest.mjs --needs-reconcile` — it must now exit 0
   (no drift, no un-reconciled updates). Do not push or open a PR yourself; leave
   the changes staged in the working tree for the workflow to PR.

## Boundaries

- Touch ONLY: `feature-manifest.json`, `feature-hashes.json`, `docs/APP-STATE.md`,
  and test files under `src/test/**` or `e2e/**` (add new ones; delete only tests
  orphaned by a true feature removal). Do NOT modify application source (except a
  gauntlet break, which you must always revert — the gauntlet does this for you).
- If you cannot honestly classify a feature, `coverage: "none"` with a clear
  `gap` is the correct, honest answer.
- Keep the diff minimal and reviewable.
