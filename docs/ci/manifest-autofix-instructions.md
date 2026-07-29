# Auto-reconcile enrichment instructions (headless Claude in CI)

You are running non-interactively (`claude -p`) inside the **Manifest Auto-Reconcile**
workflow, after a push to `main`. A deterministic script has **already** done all the
mechanical work: it added a skeleton entry to `feature-manifest.json` for each new
feature (with `coverage:"none"`), re-baselined `feature-hashes.json`, and regenerated
`docs/APP-STATE.md`. A later CI step opens the PR and merges it.

**Your one job:** for each newly-added feature, try to write a _real_ test that proves
the feature works, and upgrade its coverage label **only if the test is proven**. That
is the only thing a human/LLM can do that the script cannot.

## The one rule that matters

**Never claim coverage you did not verify.** A dishonest `"coverage": "behavioral"`
label is worse than a red build — it makes green meaningless. If you cannot prove a
test with the mutation gauntlet, the correct, honest answer is to leave the feature at
`"none"` and write one true sentence in its `gap`. Honesty over completeness.

## What you are given

The workflow passes you the list of new feature ids (the `added_ids`). Each already
exists in `feature-manifest.json` with `coverage:"none"` and real `entrypoints`.

## Steps (per new feature)

1. Read the feature's `entrypoints` in `feature-manifest.json` and the component/source
   they point at. Understand what the user actually observes when it works.

2. Decide if it is testable in headless Chromium CI:
   - **NO** (audible audio, real OAuth redirect, iOS-only Safari, PWA install/offline,
     purely decorative) → leave `coverage:"none"` (or set `"mocked"` / `"device-only"`
     only if that is literally true) and write an honest `gap`. Do not fake a test.
   - **YES** (UI state, DOM changes, store transitions, API-mocked flows) → go to step 3.

3. Write a test under `src/test/` (Vitest) or `e2e/` (Playwright), following the patterns
   in the existing tests there. It must assert a **user-observable outcome**, not an
   implementation detail and not a source string.

4. **Prove it with the mutation gauntlet.** A test only earns `"behavioral"` if it
   passes on clean code, FAILS when the feature is broken, and is not flaky:

   ```
   node scripts/guard-gauntlet.mjs '{
     "test": "src/test/yourFeature.test.js",
     "break": [{ "file": "src/.../feature.js", "find": "<real line>", "replace": "<disabled>" }],
     "flakeRuns": 2
   }'
   ```

   - Exit **0** (proven: passes clean, fails on break, not flaky) → keep the test and set
     the feature's `coverage` to `"behavioral"`. Add the test file to the feature's
     `tests.unit` or `tests.e2e` array.
   - Exit **1** (theater / flaky / no baseline) → **delete the test you wrote**, leave
     `coverage:"none"`, and note the failed attempt in `gap`. Never keep an unproven test.

## Boundaries (hard)

- Touch ONLY: **new test files** under `src/test/**` or `e2e/**`, and the `coverage` /
  `gap` / `tests` fields of the new features in `feature-manifest.json`.
- Do NOT edit application source (except a gauntlet `break`, which the gauntlet always
  reverts for you). Do NOT touch `feature-hashes.json` or `docs/APP-STATE.md` — the
  workflow regenerates those after you. Do NOT re-tier features or rewrite other entries.
- Do NOT commit, push, or open a PR. Leave your changes in the working tree; the workflow
  commits and PRs them.
- If you can honestly cover nothing, that is a fine outcome — the features still merge with
  an accurate `coverage:"none"`, and the inventory is still complete.

## Why it is split this way

The mechanical facts (a component exists, its source hash, the doc table) are deterministic,
so a script does them with zero LLM cost and zero chance of a hallucinated inventory. The
semantic judgment (does this test actually exercise the feature? is the coverage label
honest?) is the only part that needs you. Keeping the split means a broken or skipped
enrichment can never corrupt the inventory — at worst a real feature merges labeled `"none"`,
which is true.
