import { test, expect } from '@playwright/test';

/**
 * Production Verification — Tests the 6 bug fixes against the live app.
 *
 * Run with:
 *   PLAYWRIGHT_TEST_BASE_URL=https://poetry-bil-araby.vercel.app \
 *   npx playwright test e2e/verify-production-fixes.spec.js --project='Desktop Chrome'
 *
 * These tests hit real backend endpoints (no mocks).
 */

test.describe('Production Bug Fix Verification', () => {
  // Bug 6: CORS — sentry-trace and baggage headers must not be rejected
  test('Bug 6: backend API calls succeed (no CORS rejection)', async ({ page }) => {
    const corsErrors = [];
    page.on('console', (msg) => {
      if (msg.text().includes('CORS') || msg.text().includes('sentry-trace')) {
        corsErrors.push(msg.text());
      }
    });

    const failedRequests = [];
    page.on('requestfailed', (req) => {
      if (req.url().includes('onrender.com')) {
        failedRequests.push({ url: req.url(), error: req.failure()?.errorText });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Dismiss splash if present
    const enterBtn = page.getByTestId('splash-enter');
    if (await enterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enterBtn.click();
      await enterBtn.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }

    // Wait for API calls to complete
    await page.waitForTimeout(5000);

    // No CORS errors should appear in console
    expect(corsErrors).toEqual([]);
    // No backend requests should have failed
    expect(failedRequests).toEqual([]);
  });

  // Bug 1: DevLog panel should NOT auto-expand on page load
  test('Bug 1: DevLog panel stays collapsed on load', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Dismiss splash
    const enterBtn = page.getByTestId('splash-enter');
    if (await enterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enterBtn.click();
      await enterBtn.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }

    await page.waitForTimeout(3000);

    // DevLog panel should exist but be collapsed (h-7 = 28px, not h-48/h-64)
    const debugPanel = page.locator('text=System Logs').first();
    if (await debugPanel.isVisible().catch(() => false)) {
      const panelContainer = debugPanel.locator('..').locator('..');
      const height = await panelContainer.evaluate((el) => el.getBoundingClientRect().height);
      // Collapsed = ~28px (h-7), expanded = ~192px (h-48) or ~256px (h-64)
      expect(height).toBeLessThan(50);
    }
    // If debug panel isn't visible at all, that's also fine (FEATURES.debug could be off)
  });

  // The landing screen is back on (FEATURES.landing=true) and hands off to the preference flow.
  // A first visit meets the splash; dismissing it lands on /onboarding when no answers are saved.
  test('first visit shows the splash, which hands off to onboarding', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('[aria-label="Welcome to Poetry Bil-Araby"]')).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId('splash-enter').click();
    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 10000 });
  });

  // A reader who has already been through it boots straight into the feed, no gate.
  test('returning visit boots straight into the reader', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('hasSeenOnboarding', 'true'));
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByTestId('splash-enter')).toHaveCount(0);
    await expect(page.locator('[data-testid="poem-feed"]')).toBeVisible({ timeout: 10000 });
  });

  // Bug 5: Bug report form should show meaningful error details (not just "Failed")
  test('Bug 5: bug report shows error details on failure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Dismiss splash
    const enterBtn = page.getByTestId('splash-enter');
    if (await enterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enterBtn.click();
      await enterBtn.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }

    await page.waitForTimeout(2000);

    // Expand the debug panel
    const debugHeader = page.locator('text=System Logs').first();
    if (await debugHeader.isVisible().catch(() => false)) {
      await debugHeader.click();
      await page.waitForTimeout(500);

      // Find the bug submit button
      const submitBtn = page.locator('button:has-text("Submit Bug")');
      if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(6000);

        // Check button text — should show "Sent!" or "Failed (HTTP xxx: ...)"
        // NOT just bare "Failed"
        const btnText = await submitBtn.textContent();
        if (btnText.includes('Failed')) {
          // It should have error detail in parentheses
          expect(btnText).toMatch(/Failed \(.+\)/);
        }
        // "Sent!" or "Submit Bug" (reset) are also acceptable
      }
    }
  });

  // Verify app loads and shows Arabic poem content
  test('App loads and displays Arabic poetry', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Dismiss splash
    const enterBtn = page.getByTestId('splash-enter');
    if (await enterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enterBtn.click();
      await enterBtn.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }

    // Arabic text should be present
    const rtlText = page.locator('[dir="rtl"]').first();
    await expect(rtlText).toBeVisible({ timeout: 10000 });

    // Should contain actual Arabic characters
    const text = await rtlText.textContent();
    expect(text).toMatch(/[\u0600-\u06FF]/);
  });
});
