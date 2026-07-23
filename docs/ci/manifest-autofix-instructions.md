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

   **`dead_entrypoint` / `dead_test` (a DEAD REF):** the manifest points at a file
   that no longer exists. Update the entry to the file's new location, or remove
   the stale reference. Do not delete a whole feature unless the feature is truly
   gone from the product.

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

6. Confirm the tree is clean: run `node scripts/check-feature-manifest.mjs` — it
   must now report 0 drift. Do not push or open a PR yourself; leave the changes
   staged in the working tree for the workflow to PR.

## Boundaries

- Touch ONLY: `feature-manifest.json`, `docs/APP-STATE.md`, and new test files
  under `src/test/**` or `e2e/**`. Do NOT modify application source (except a
  gauntlet break, which you must always revert — the gauntlet does this for you).
- If you cannot honestly classify a feature, `coverage: "none"` with a clear
  `gap` is the correct, honest answer.
- Keep the diff minimal and reviewable.
