---
name: verify-deploy
description: Verifies fixes and features on the live Vercel preview using Playwright. Asks what to test, headed or headless, then spawns agents to verify on the deployment.
user_invocable: true
---

# Verify Deploy

Test fixes and features against the live Vercel preview deployment using Playwright.

## Invocation

When the user runs `/verify-deploy`, execute the following workflow.

## Step 0: Gather Context

1. **Ask the user:**
   - What feature or fix to verify? (e.g., "carousel translations", "audio playback", "URL routing")
   - Headed or headless browser? (headed lets them see the browser, headless is faster)

2. **Determine what's relevant to test** based on the feature/fix:
   - Look at recent commits (`git log --oneline -5`) to understand what changed
   - Read the changed files to understand which user-facing features are affected
   - Design test steps that exercise the specific feature from the USER's perspective — not implementation details

## Step 1: Get the Vercel Preview URL

1. Get the current branch HEAD SHA: `git rev-parse --short HEAD`
2. Check deploy status: `gh pr checks <PR_NUMBER> | grep Vercel`
3. If pending, poll every 10s until `pass`
4. Get URL:
   ```bash
   DEP_ID=$(gh api repos/lesmartiepants/poetry-bil-araby/deployments --jq '[.[] | select(.sha[:7] == "SHA")] | .[0].id')
   gh api repos/lesmartiepants/poetry-bil-araby/deployments/$DEP_ID/statuses --jq '.[0].environment_url'
   ```

**Bypass token:** Check `.env` for `VERCEL_AUTOMATION_BYPASS_SECRET`, or fetch from Vercel API:
```bash
source .env && curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/poetry-bil-araby" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(list(d.get('protectionBypass',{}).keys())[0])"
```

## Step 2: Playwright Setup Pattern

All test scripts MUST use this boilerplate:

```js
const { chromium } = require('playwright');
const BASE = 'DEPLOY_URL';
const BYPASS = 'BYPASS_TOKEN';
const DOMAIN = new URL(BASE).hostname;

(async () => {
  const browser = await chromium.launch({ headless: HEADED_OR_NOT });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  // Vercel auth bypass — header on same-origin only (avoids CORS on fonts/CDN)
  await page.route(new RegExp(DOMAIN.replace(/\./g, '\\.')), route => {
    route.continue({ headers: { ...route.request().headers(), 'x-vercel-protection-bypass': BYPASS } });
  });

  // Skip onboarding + clear cached poem for fresh state
  await page.goto(`${BASE}/?x-vercel-protection-bypass=${BYPASS}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    localStorage.removeItem('qafiyah_nextPoem');
  });
  await page.goto(`${BASE}/?x-vercel-protection-bypass=${BYPASS}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(8000);

  // ... feature-specific tests ...
  await browser.close();
})();
```

## Step 3: Spawn Verification Team

Create a team and spawn 1-2 agents based on the feature being tested. Each agent:
1. Writes a Playwright script tailored to the feature
2. Runs it against the live deployment
3. Reports PASS/FAIL with console logs and screenshots as evidence

**Agent design principle:** Test from the USER's perspective. Don't test implementation details — test what the user sees and does:
- "I click this button → I see this result"
- "I swipe to the next poem → I see a translation"
- "I share this URL → the recipient sees the same poem"

## Step 4: Report Results

Compile agent results into a table and post to the PR:
```bash
gh pr comment PR_NUMBER --body "## Deployment Verification ..."
```

Shut down agents and delete team.

## Learnings (avoid these mistakes)

- **Cookie bypass doesn't work** for Vercel auth — use `page.route()` with header
- **`extraHTTPHeaders` causes CORS** on cross-origin (fonts) — scope to same-domain via route regex
- **Skip onboarding** via `localStorage.setItem('hasSeenOnboarding', 'true')`
- **Clear cached poem** via `localStorage.removeItem('qafiyah_nextPoem')` for a fresh DB poem
- **Discover flow**: `[aria-label="Open discover"]` → `[aria-label="Discover new poem"]`
- **Use `domcontentloaded`** not `networkidle` — the app streams continuously
- **Sentry 429 and SW 401 are cosmetic** — filter from error counts
- **Audio can't produce sound headless** — verify via button state change (`Pause recitation`) and console logs
- **Wait generously**: 15s for AI translations, 45s for TTS generation (Render cold starts)
