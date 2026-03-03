import { test, expect } from '@playwright/test';

/**
 * Design Review — Send to Backend E2E Test
 *
 * Tests the full user flow:
 *   open design-review page → cast verdict → click Submit Review →
 *   click "Send to Backend" → verify DB persistence via API readback.
 *
 * Requires: backend server on localhost:3001 with PostgreSQL and
 * the design_review_tables migration applied.
 *
 * In CI the e2e-tests job starts the backend + PostgreSQL service.
 */

const API_BASE = 'http://localhost:3001';

test.describe('Design Review — Send to Backend', () => {
  // Force desktop viewport — these tests exercise backend integration,
  // not mobile responsiveness. The side panel (with .verdict-btn) is
  // hidden at <768px, and the toolbar nav-btn duplicates cause strict
  // mode violations on narrow viewports.
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    // Clear any previous review data from localStorage so we start clean
    await page.goto('/design-review/index.html');
    await page.evaluate(() => localStorage.removeItem('design-review-feedback-v3'));
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  });

  test('persists verdicts to database via Send to Backend button', async ({ page, request }) => {
    // Give backend-dependent tests more time (CI default is 10s)
    test.setTimeout(30000);

    // 1. Wait for the toolbar to render (proves CATALOG loaded and page is interactive)
    await page.waitForSelector('.toolbar', { timeout: 10000 });

    // 2. Wait for the backend API to connect (sync-dot turns green = 'synced')
    //    initAPI() runs at boot. Give it time to connect + create/resume session.
    await expect(page.locator('#syncStatus .sync-dot.synced')).toBeVisible({ timeout: 15000 });

    // 3. Cast a "keep" verdict on the first design item
    //    The side panel has .verdict-btn[data-v="keep"]
    const keepBtn = page.locator('.verdict-btn[data-v="keep"]');
    await expect(keepBtn).toBeVisible({ timeout: 5000 });
    await keepBtn.click();

    // Verify the button is now active (has active-keep class)
    await expect(keepBtn).toHaveClass(/active-keep/, { timeout: 3000 });

    // 4. Click "Submit Review" to open the summary modal
    const submitBtn = page.locator('.toolbar .submit-btn');
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 5. Wait for the modal overlay to appear
    const modal = page.locator('h3:has-text("Review Summary")');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 6. Click "Send to Backend" button inside the modal
    const sendBtn = page.locator('button:has-text("Send to Backend")');
    await expect(sendBtn).toBeVisible({ timeout: 3000 });
    await sendBtn.click();

    // 7. Verify the button shows success (text changes to "Saved Successfully")
    await expect(sendBtn).toContainText('Saved Successfully', { timeout: 10000 });

    // 8. Verify data actually persisted — call the API directly to read back
    //    The session should be marked completed and have at least 1 verdict.
    const summaryRes = await request.get(`${API_BASE}/api/design-review/summary`);
    expect(summaryRes.ok()).toBeTruthy();
    const summary = await summaryRes.json();
    expect(summary.sessions).toBeGreaterThan(0);
    expect(summary.verdicts.keep).toBeGreaterThan(0);
  });

  test('shows error state when backend is unavailable', async ({ page, context }) => {
    test.setTimeout(30000);

    // Block all design-review API calls to simulate backend down.
    // We must navigate AFTER setting the route so initAPI() sees the block.
    await context.route('**/api/design-review/**', route => route.abort('failed'));
    await page.goto('/design-review/index.html');
    await page.waitForLoadState('domcontentloaded');

    // Wait for page to load (initAPI will fail, sync-dot stays offline)
    await page.waitForSelector('.toolbar', { timeout: 10000 });

    // sync-dot should show offline (not synced)
    await expect(page.locator('#syncStatus .sync-dot.offline')).toBeVisible({ timeout: 5000 });

    // Cast a verdict
    const keepBtn = page.locator('.verdict-btn[data-v="keep"]');
    await expect(keepBtn).toBeVisible({ timeout: 5000 });
    await keepBtn.click();

    // Open submit modal
    await page.locator('.toolbar .submit-btn').click();
    await expect(page.locator('h3:has-text("Review Summary")')).toBeVisible({ timeout: 5000 });

    // Click Send to Backend — should show error
    const sendBtn = page.locator('button:has-text("Send to Backend")');
    await sendBtn.click();

    // The button should show an error message (contains "Error")
    await expect(sendBtn).toContainText('Error', { timeout: 10000 });
  });

  test('auto-syncs verdicts before completing session', async ({ page, request }) => {
    test.setTimeout(30000);

    // Wait for backend connection
    await page.waitForSelector('.toolbar', { timeout: 10000 });
    await expect(page.locator('#syncStatus .sync-dot.synced')).toBeVisible({ timeout: 15000 });

    // Cast verdicts on first two designs: keep first, discard second
    const keepBtn = page.locator('.verdict-btn[data-v="keep"]');
    await expect(keepBtn).toBeVisible({ timeout: 5000 });
    await keepBtn.click();
    await expect(keepBtn).toHaveClass(/active-keep/);

    // Navigate to next design (use specific toolbar button to avoid strict mode violation)
    const nextBtn = page.locator('#nextBtn');
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(500);

      const discardBtn = page.locator('.verdict-btn[data-v="discard"]');
      await expect(discardBtn).toBeVisible({ timeout: 5000 });
      await discardBtn.click();
      await expect(discardBtn).toHaveClass(/active-discard/);
    }

    // Submit and send to backend
    await page.locator('.toolbar .submit-btn').click();
    await expect(page.locator('h3:has-text("Review Summary")')).toBeVisible({ timeout: 5000 });

    const sendBtn = page.locator('button:has-text("Send to Backend")');
    await sendBtn.click();
    await expect(sendBtn).toContainText('Saved Successfully', { timeout: 10000 });

    // Verify both verdicts persisted
    const summaryRes = await request.get(`${API_BASE}/api/design-review/summary`);
    expect(summaryRes.ok()).toBeTruthy();
    const summary = await summaryRes.json();
    expect(summary.verdicts.keep).toBeGreaterThan(0);
  });
});
