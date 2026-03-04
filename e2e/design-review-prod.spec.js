import { test, expect } from '@playwright/test';

/**
 * Design Review — Production smoke test
 *
 * Tests the design-review static page and the live Render backend.
 * Exercises: page load, keyboard verdicts, Submit modal, "Send to Backend" button,
 * and all design-review API endpoints.
 */

const PROD_API = 'https://poetry-bil-araby-2mb0.onrender.com';

test.describe('Design Review — Page UI', () => {
  // The design-review page hides the side panel and nav counter on mobile
  // viewports, so these UI tests only run on desktop-width browsers.
  test.beforeEach(async ({ page }, testInfo) => {
    const vw = testInfo.project.use.viewport?.width ?? 1920;
    test.skip(vw < 768, 'Design-review page UI requires desktop viewport');
    await page.goto(`file://${process.cwd()}/design-review/index.html`);
    await page.waitForLoadState('domcontentloaded');
    // Wait for the page to render the catalog
    await page.waitForSelector('#navCounter', { timeout: 5000 });
  });

  test('page loads with toolbar, nav counter, and Submit Review button', async ({ page }) => {
    // Nav counter
    await expect(page.getByText(/\d+ of \d+/).first()).toBeVisible();
    // Submit Review button
    await expect(page.getByRole('button', { name: 'Submit Review' })).toBeVisible();
    // Prev/Next nav buttons
    await expect(page.getByRole('button', { name: 'Next' }).first()).toBeVisible();
  });

  test('keyboard navigation cycles through designs', async ({ page }) => {
    const counter = page.getByText(/\d+ of \d+/).first();
    const initial = await counter.textContent();
    expect(initial).toContain('1 of');

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    const after = await counter.textContent();
    expect(after).toContain('2 of');

    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);
    const back = await counter.textContent();
    expect(back).toContain('1 of');
  });

  test('verdict buttons update progress and active state', async ({ page }) => {
    // Initially 0 reviewed
    await expect(page.getByText('0 of 58 reviewed')).toBeVisible();

    // Click Keep
    await page.getByRole('button', { name: /Keep/ }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText('1 of 58 reviewed')).toBeVisible();
    // Keep count should update
    await expect(page.getByText(/1 keep/).first()).toBeVisible();

    // Navigate to next and click Discard
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Discard/ }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText('2 of 58 reviewed')).toBeVisible();
    await expect(page.getByText(/1 discard/).first()).toBeVisible();

    // Navigate to next and click Revisit
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Revisit/ }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText('3 of 58 reviewed')).toBeVisible();
    await expect(page.getByText(/1 revisit/).first()).toBeVisible();
  });

  test('Submit Review modal shows Send to Backend and export buttons', async ({ page }) => {
    // Set a verdict first
    await page.keyboard.press('k');
    await page.waitForTimeout(200);

    // Click Submit Review
    await page.getByRole('button', { name: 'Submit Review' }).click();

    // Wait for modal content
    await expect(page.getByText('Review Summary')).toBeVisible({ timeout: 3000 });

    // "Send to Backend" button
    await expect(page.getByRole('button', { name: /Send to Backend/ })).toBeVisible();

    // Export buttons
    await expect(page.getByRole('button', { name: 'Copy Markdown' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy JSON' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download JSON' })).toBeVisible();

    // Summary stats visible
    await expect(page.getByText(/\d+ keep/).first()).toBeVisible();
  });

  test('review progress updates when verdicts are set', async ({ page }) => {
    // Initially 0 reviewed
    await expect(page.getByText('0 of 58 reviewed')).toBeVisible();

    // Set a verdict
    await page.keyboard.press('k');
    await page.waitForTimeout(300);

    // Progress should update to 1
    await expect(page.getByText('1 of 58 reviewed')).toBeVisible();
  });

  test('side panel shows current design details', async ({ page }) => {
    await expect(page.getByText('Current Design')).toBeVisible();
    await expect(page.getByText('Your Review')).toBeVisible();
    await expect(page.getByText('Keyboard Shortcuts')).toBeVisible();
    // Verdict buttons
    await expect(page.getByRole('button', { name: /Keep/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Discard/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Revisit/ })).toBeVisible();
  });
});

test.describe('Design Review — Prod API Direct', () => {
  test.use({ ignoreHTTPSErrors: true });

  test('health endpoint returns 84329 poems', async ({ request }) => {
    const res = await request.get(`${PROD_API}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.totalPoems).toBe(84329);
  });

  test('design-review items endpoint returns array', async ({ request }) => {
    const res = await request.get(`${PROD_API}/api/design-review/items`);
    expect(res.ok()).toBeTruthy();
    const items = await res.json();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  test('full round-trip: sync → session → verdict → retrieve → complete', async ({ request }) => {
    const itemKey = `pw-${Date.now()}`;

    // 1. Sync item
    const syncRes = await request.post(`${PROD_API}/api/design-review/items/sync`, {
      data: { items: [{ item_key: itemKey, name: 'PW Test', component: 'Test', category: 'testing', file_path: 'e2e/test.js', generation: 1 }] }
    });
    expect(syncRes.ok()).toBeTruthy();
    expect((await syncRes.json()).upserted).toBe(1);

    // 2. Create session
    const sessRes = await request.post(`${PROD_API}/api/design-review/sessions`, {
      data: { agent_id: 'playwright', items: [], summary: 'PW round-trip' }
    });
    expect(sessRes.ok()).toBeTruthy();
    const session = await sessRes.json();

    // 3. Submit verdict
    const vRes = await request.post(`${PROD_API}/api/design-review/sessions/${session.id}/verdicts`, {
      data: { verdicts: [{ item_key: itemKey, verdict: 'keep', comment: 'PW test', priority: 0 }] }
    });
    expect(vRes.ok()).toBeTruthy();
    expect((await vRes.json()).saved).toBe(1);

    // 4. Retrieve verdict
    const gRes = await request.get(`${PROD_API}/api/design-review/sessions/${session.id}/verdicts`);
    const verdicts = await gRes.json();
    const ours = verdicts.find(v => v.item_key === itemKey);
    expect(ours.verdict).toBe('keep');

    // 5. Complete session
    const pRes = await request.patch(`${PROD_API}/api/design-review/sessions/${session.id}`, {
      data: { status: 'completed', reviewed_count: 1 }
    });
    expect(pRes.ok()).toBeTruthy();

    // 6. Verify claude-context
    const ctx = await (await request.get(`${PROD_API}/api/design-review/claude-context`)).json();
    expect(ctx.items.length).toBeGreaterThanOrEqual(1);
    expect(ctx.sessions.length).toBeGreaterThanOrEqual(1);

    // 7. Verify summary
    const summary = await (await request.get(`${PROD_API}/api/design-review/summary`)).json();
    expect(summary.total_items).toBeGreaterThanOrEqual(1);
  });

  test('random poem returns valid data', async ({ request }) => {
    const res = await request.get(`${PROD_API}/api/poems/random`);
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).poet).toBeTruthy();
  });

  test('poets list is non-empty', async ({ request }) => {
    const res = await request.get(`${PROD_API}/api/poets`);
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).length).toBeGreaterThan(0);
  });
});
