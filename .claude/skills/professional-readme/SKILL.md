---
name: professional-readme
description: Produce a professional, product-grade README led by a custom brand-matched header banner. Researches ground truth from the codebase (no stale claims), extracts the project's visual identity, renders a reproducible header image, and writes an emoji-free, accurate README. Use when asked to redesign, professionalize, or create a README, or to make a repo "look like a real product".
user_invocable: true
---

# Professional README

Turn a repo's README into something that reads like a well-developed product: a custom
brand-matched header banner, an accurate feature set drawn from the actual code, and clean,
emoji-free prose. This skill encodes the principles and the hard-won gotchas from doing it well.

## Invocation

When the user runs `/professional-readme` (or asks to professionalize/redesign a README),
execute the workflow below. Confirm two creative choices up front if unclear: the **header
visual direction** and **how aggressively to trim non-product sections** (e.g. dev notes,
raw TODO lists).

## Guiding principles

1. **Ground truth over the old README.** Existing READMEs drift. Treat the _code_ as the
   source of truth and verify every claim before writing it.
2. **The banner is brand-matched, not stock.** Pull the real palette, fonts, and motifs from
   the codebase so the header looks like it belongs to the product.
3. **No emojis. No invented metrics.** Every number must be traceable to code, tests, or
   config. If you can't verify it, don't claim it.
4. **Reproducible artifacts.** The banner ships with its source + a render script so anyone
   can regenerate it.

## Step 1 — Establish ground truth

Do not trust the current README's claims. Explore the codebase (launch parallel read-only
explore agents when scope is uncertain) and pin down:

- **Core entities / scale.** Real counts (records, users, items) — find where they actually
  come from. Watch for figures that are _gated/filtered_ vs _raw totals_; state the one users
  actually experience and say so. Distinguish hardcoded constants from live values.
- **Implemented features.** Walk components/routes/services/stores and list what genuinely
  exists. Keep an explicit **"do NOT claim"** list of things that are stubbed, planned, or
  removed.
- **Tech stack.** Read `package.json` / lockfile / manifests for real versions and libraries
  (state management, routing, build tool, test runners). Don't guess.
- **Provenance & services.** Data sources, external APIs, auth providers, hosting.
- **Live URLs.** Search code, configs, OG meta, CI for the deployed URL(s); verify they resolve.
- **Voice / philosophy.** Mine prompts, comments, and copy for the product's intent — useful
  for an honest "why this exists" section.

Cross-check the final draft against `server`/backend code, `package.json`, and `src/` so
nothing contradicts the codebase. **Verify external links resolve** (e.g. `curl -sI` for a 200) before committing them.

## Step 2 — Extract the visual identity

From the codebase (design tokens, theme files, CSS variables, tailwind config, favicon,
splash/onboarding components), capture:

- **Palette** — exact hex values for primary/accent/background.
- **Typography** — the brand display fonts (and where they're used).
- **Motif/logo** — the icon, wordmark composition, any signature background (patterns,
  gradients, generative art). Reuse the _actual_ construction where feasible.

## Step 3 — Build the custom header banner

Render an HTML banner to PNG with the **pre-installed Chromium via playwright-core**. Use the
templates in this skill's `assets/` as a starting point:

- `assets/banner-template.html` — banner scaffold (palette vars, vendored `@font-face`,
  wordmark, tagline, optional generative background). Adapt colors/fonts/motif to the project.
- `assets/render-banner.mjs` — element-clip render script (see gotchas for _why_ element-clip).

Workflow:

1. Adapt the template to the project's identity (Step 2). Keep a tagline and, optionally, a
   short keyword triad that reflects the _experience_, not just properties.
2. **Vendor the fonts.** Download the brand woff2 files and reference them locally via
   `@font-face` so the render is reproducible offline (and survives proxies that block the
   Google Fonts CSS endpoint). OFL/open fonts are fine to commit.
3. Render: `node assets/render-banner.mjs` (after `npm install --no-save playwright-core`).
   Output goes under `.github/assets/`.
4. **Inspect the PNG visually** and iterate on sizing, balance, and legibility. The wordmark
   should fill the banner; content should be vertically balanced with no dead/black band.
5. Embed centered in the README:
   `<p align="center"><img src="./.github/assets/<name>.png" alt="<Project> — <tagline>" width="100%"></p>`

## Step 4 — Write the README

Recommended structure (drop sections that don't apply):

1. **Header banner** + centered title, one-line tagline, and a row of **shields.io badges**
   (live demo, CI status, key stack, license _only if a LICENSE exists_). Image badges, not emojis.
2. **Philosophy / why it exists** — short prose; the problem it solves.
3. **Core domain** — the data/library/engine, with accurate scale and provenance.
4. **Headline feature(s)** — give the standout capability its own section with detail.
5. **Features** — grouped, scannable, only what's real.
6. **Tech stack** — corrected versions and libraries.
7. **Architecture** — concise; how the pieces fit.
8. **Getting started** — install, configure (env table), run.
9. **Testing**, **Deployment** — accurate commands and env-by-service tables.
10. **Roadmap** — convert any raw TODO checklist to clean prose; cut dev-only notes.
11. **Acknowledgements** — datasets, libraries, font/designers.

Fix the project-structure tree to match the real layout.

## Step 5 — Commit and open a PR

- Conventional commit: `docs(readme): ...` (or `docs: ...`). Include co-author/session
  trailers if the repo convention requires them.
- Commit the README, the banner PNG, the banner source, the render script, and vendored fonts.
  Do **not** commit `node_modules` (playwright-core is a `--no-save` dev-only dependency).
- Push to a feature branch and open a PR. Don't merge unless asked.

## Gotchas (the expensive lessons)

- **GitHub caches README images (camo).** After you fix a banner, GitHub's image proxy keeps
  serving the _old_ image under the same URL — it looks like your fix didn't apply. **Bust the
  cache by renaming the image file** (e.g. `header.png` → `header-banner.png`) and updating the
  README `<img src>`. A query string on a relative repo path won't reliably bust it.
- **Headless screenshots bleed the page body.** Driving raw Chromium with
  `--window-size`/`--screenshot` can capture a viewport taller than your banner, so the body
  shows through as a flat dark/black band at the bottom. **Screenshot the banner _element_
  with a clip** (playwright-core `locator('#banner').screenshot(...)`) so output dimensions
  always equal the element. The provided `render-banner.mjs` does this.
- **Fonts over a proxy.** Sandboxed/proxied environments often fail TLS to Google Fonts inside
  the browser. `curl` (which trusts the proxy CA) can still fetch the woff2 — download and
  vendor them locally.
- **Gated vs total counts.** If the product only serves a filtered subset, the headline number
  should reflect what users actually see (and note the gating), not the raw table size.
- **Don't over-trim shared features.** Removing a "mode" or surface doesn't necessarily remove
  the capabilities layered on it — keep the ones that still apply, reframed correctly.
- **Render at 2x.** Use `deviceScaleFactor: 2` so the banner stays crisp when GitHub scales it.
