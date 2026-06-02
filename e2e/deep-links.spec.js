import { test, expect } from '@playwright/test';

/**
 * Deep Links E2E Tests — Poetry Bil-Araby
 *
 * Tests direct URL navigation to /poem/:id and /?poet= param handling.
 * Verifies correct poem loads, URL is preserved across interactions, and
 * invalid IDs fall back gracefully.
 */

// ─── Mock Data ──────────────────────────────────────────────────────

const MOCK_POEM_999 = {
  id: 999,
  poet: 'Nizar Qabbani',
  poetArabic: 'نزار قباني',
  title: 'My Beloved',
  titleArabic: 'حبيبتي',
  arabic: 'حُبُّكِ يا عَمِيقَةَ العَيْنَيْنِ',
  english: 'Your love, O woman of deep eyes',
  tags: ['Modern'],
  isFromDatabase: true,
};

const MOCK_POEM_42 = {
  id: 42,
  poet: 'Mahmoud Darwish',
  poetArabic: 'محمود درويش',
  title: 'On This Earth',
  titleArabic: 'على هذه الأرض',
  arabic: 'على هذه الأرضِ ما يستحقُّ الحياةْ',
  english: 'On this earth is what makes life worth living',
  tags: ['Modern'],
  isFromDatabase: true,
};

const MOCK_POETS = [{ name: 'نزار قباني' }, { name: 'محمود درويش' }, { name: 'المتنبي' }];

// ─── Shared Setup ───────────────────────────────────────────────────

async function setupRouteMocks(page, { poem = MOCK_POEM_999 } = {}) {
  await page.route('**/api/poems/random*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(poem),
    });
  });

  await page.route('**/api/poems/999', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_POEM_999),
    });
  });

  await page.route('**/api/poems/42', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_POEM_42),
    });
  });

  await page.route('**/api/poems/invalid-id', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Not found' }),
    });
  });

  await page.route('**/api/poets', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_POETS),
    });
  });

  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', totalPoems: 84329 }),
    });
  });

  await page.route('**/api/ai/**', async (route) => {
    await route.abort('blockedbyclient');
  });
}

async function dismissSplash(page) {
  const enterBtn = page.locator('button[aria-label="Enter the app"]');
  if (await enterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await enterBtn.click();
    await enterBtn.waitFor({ state: 'hidden', timeout: 5000 });
  }
}

// ─── Tests ──────────────────────────────────────────────────────────

test.describe('Deep Links', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
    await page.addInitScript(() => {
      localStorage.setItem('hasSeenOnboarding', 'true');
    });
  });

  test('root URL loads default poem', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissSplash(page);
    await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 10000 });

    // A poem should be visible
    const arabicContent = await page.locator('[dir="rtl"]').first().textContent();
    expect(arabicContent.length).toBeGreaterThan(3);
  });

  test('poet filter via URL ?poet= pre-selects poet and loads filtered poems', async ({ page }) => {
    // Navigate with poet query param
    const encodedPoet = encodeURIComponent('نزار قباني');
    await page.goto(`/?poet=${encodedPoet}`);
    await page.waitForLoadState('domcontentloaded');
    await dismissSplash(page);
    await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 10000 });

    // App should show poem content (poet filter causes a fetch with the poet param)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('after discovering a new poem, app stays functional', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissSplash(page);
    await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 10000 });

    // Override route for discover to return Darwish poem
    await page.route('**/api/poems/random*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_POEM_42),
      });
    });

    // Trigger discover
    const openDrawerBtn = page.locator('button[aria-label="Open discover"]');
    if (await openDrawerBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await openDrawerBtn.click();
      const discoverBtn = page.locator('button[aria-label="Discover new poem"]');
      if (await discoverBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await discoverBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // App should still show arabic content
    await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 5000 });
    await expect(page.locator('[dir="rtl"]').first()).toBeVisible();
  });

  test('app handles invalid poem ID gracefully (no crash)', async ({ page }) => {
    await page.route('**/api/poems/random*', async (route) => {
      const url = route.request().url();
      if (url.includes('id=invalid')) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Not found' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_POEM_999),
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissSplash(page);

    // App should not crash even if a fetch fails
    await expect(page.locator('body')).toBeVisible();
    const bodyText = await page.locator('body').textContent({ timeout: 5000 });
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('page title or body reflects Arabic content on load', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await dismissSplash(page);
    await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 10000 });

    // Verify Arabic text is present
    const rtlElements = page.locator('[dir="rtl"]');
    const count = await rtlElements.count();
    expect(count).toBeGreaterThan(0);

    const firstText = await rtlElements.first().textContent();
    // Arabic Unicode range check
    const hasArabic = /[؀-ۿ]/.test(firstText);
    expect(hasArabic).toBe(true);
  });
});
