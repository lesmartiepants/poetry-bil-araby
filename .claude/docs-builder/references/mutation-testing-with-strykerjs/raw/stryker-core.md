# Stryker Mutator — Core Concepts & JS Setup

## What mutation testing is

Mutation testing injects artificial defects (mutants) into your source code one at a time and re-runs your tests. If a test fails → mutant is **killed** (good). If all tests pass → mutant **survived** (bad: your tests didn't catch that logic change).

**Mutation score** = killed / total × 100. Target: >70% is generally considered good; >80% is thorough.

Coverage alone doesn't tell you this. You can have 90% branch coverage while every assertion is `expect(true).toBe(true)`. Mutation testing finds those hollow tests.

## What StrykerJS mutates (mutator list)

- **ArithmeticOperator**: `+` → `-`, `*` → `/`, etc.
- **BlockStatement**: empties function bodies `{ return x }` → `{}`
- **BooleanLiteral**: `true` → `false`
- **ConditionalExpression**: `condition ? a : b` → always `a`, always `b`
- **EqualityOperator**: `===` → `!==`, `>` → `>=`, etc.
- **LogicalOperator**: `&&` → `||`, `??` → `||`
- **StringLiteral**: replaces strings with `"Stryker was here"`
- **UnaryOperator**: `!x` → `x`
- **ArrayDeclaration**: `[a, b]` → `[]`
- **ObjectLiteral**: `{a: 1}` → `{}`
- **OptionalChaining**: `a?.b` → `a.b`
- **Regex**: simplifies regex patterns

JSX/React note: most JSX markup (className, data-testid strings, pure structure) generates low-value mutants from StringLiteral and ArrayDeclaration operators. These rarely survive if you have basic render tests, but they inflate mutant counts significantly on large component files.

## Stryker 7.0 + Vitest runner (2023–current)

Official Vitest support shipped in Stryker 7.0. The `@stryker-mutator/vitest-runner` package handles integration.

Key behaviors:

- Always uses `perTest` coverage analysis automatically (no config needed)
- Does NOT support Vitest Browser Mode — this is a hard limitation as of 2024/2025
- Works with happy-dom and jsdom environments
- Compatible with Vite + React projects

Install:

```bash
npm install --save-dev @stryker-mutator/core @stryker-mutator/vitest-runner
```

Minimal config (`stryker.config.json`):

```json
{
  "testRunner": "vitest",
  "coverageAnalysis": "perTest",
  "mutate": ["src/**/*.{js,jsx}", "!src/**/*.test.{js,jsx}", "!src/test/**"],
  "vitest": { "configFile": "vitest.config.js" },
  "incremental": true,
  "concurrency": 4
}
```

Run: `npx stryker run`

## Performance: what drives the cost

Formula: `total time ≈ (mutant_count × avg_test_run_time) / concurrency`

A test run is re-executed for each surviving mutant. With `perTest`, only tests covering that code path run — but you still pay one full dry run upfront on every execution.

Real numbers from GitHub issues and blog posts:

- 942 tests, 73s suite → 5,204 mutants → **estimated 72+ hours** (without perTest)
- With perTest, typically 80–95% of that time eliminated depending on test density
- A typical 100-test utility file: ~50–200 mutants, under 10 minutes with perTest
- A 2,000-line React component: ~800–2,000 mutants, 7 min – 4+ hours depending on config

Density rules of thumb:

- Pure JSX markup: ~0.5–1 mutant/line
- Conditional rendering (`&&`, `? :`): ~3–5 mutants/line
- Event handlers / logic: ~4–8 mutants/line
- `useEffect`, state updates: ~5–10 mutants/block
- Utility/helper functions: ~6–10 mutants/line

## Performance mitigations (in priority order)

1. **`coverageAnalysis: "perTest"`** — Vitest runner enforces this automatically. Biggest single win. Only runs tests that cover the mutated code.

2. **`incremental: true`** — Stryker stores results in `reports/stryker-incremental.json`. On subsequent runs, reuses results for unchanged mutants. Real example: 3,731 of 3,965 mutants reused = 94% reduction on unchanged codebase. Requires caching this file in CI (GitHub Actions: `actions/cache@v4` on branch name + main fallback).

3. **`ignoreStatic: true`** — Skips mutants Stryker can determine are never covered by any test. Requires `perTest` (already enforced by Vitest runner).

4. **Scope `mutate`** — Point at logic-dense dirs, skip JSX-heavy components. Example: `"mutate": ["src/utils/**/*.js", "src/stores/**/*.js"]`. This is the fastest way to get value cheaply.

5. **`concurrency`** — Default is `n-1` CPU cores. Cap at 4 for memory-heavy React environments to avoid OOM worker restarts. Too many workers can actually make it slower.

6. **`dryRunTimeoutMinutes: 10`** — Raise this if the initial dry run times out (it runs the full test suite once first).

7. **Avoid `@stryker-mutator/typescript-checker`** — Adds type checking per mutant. Useful for TypeScript projects but significant performance cost. Not worth it for JS.

## CI strategy

**Do NOT run on every commit.** This is the consensus across all sources. Options:

- Weekly scheduled job (GitHub Actions `schedule: cron`)
- Nightly on main
- PR gate only for changed files (requires incremental + git diff to narrow `mutate` globs)
- Manual trigger only, as a quality audit

GitHub Actions caching for incremental:

```yaml
- uses: actions/cache@v4
  with:
    path: reports/stryker-incremental.json
    key: stryker-incremental-${{ github.ref_name }}
    restore-keys: stryker-incremental-main
```

## Sources consulted

- https://stryker-mutator.io/docs/stryker-js/vitest-runner/
- https://stryker-mutator.io/docs/stryker-js/incremental/
- https://stryker-mutator.io/blog/announcing-stryker-js-7/
- https://github.com/stryker-mutator/stryker-js/issues/3320 (performance issue)
- https://stryker-mutator.io/docs/stryker-js/guides/react/
- https://medium.com/accor-digital-and-tech/introducing-mutation-testing-in-vue-js-with-strykerjs-e1083afe7326
