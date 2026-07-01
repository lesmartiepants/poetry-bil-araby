import { test, expect } from '@playwright/test';

/**
 * Inline Insights E2E — the end-of-poem insight, redesigned.
 *
 * The standalone "Explain" button and the vaul insight drawer/overlay were removed. Insights now
 * render INLINE inside the reader: once the whole poem is revealed the reader reaches its idle
 * end-state and the right action becomes "Poem Insights"; tapping it swaps the verses for the
 * inline insight ([data-insight-ui]) with "Back to Poem" to return. AI is mocked-off, so these
 * tests assert the inline insight UI/navigation, not the generated text.
 */

const MOCK_POEM = {
  id: 42001,
  poet: 'Mahmoud Darwish',
  poetArabic: 'محمود درويش',
  title: 'On This Earth',
  titleArabic: 'على هذه الأرض',
  arabic: 'على هذه الأرضِ ما يستحقُّ الحياةْ\nتردُّدُ أبريلَ، رائحةُ الخبزِ في الفجرِ',
  english: '',
  tags: ['وطنية'],
  isFromDatabase: true,
};

const MOCK_POETS = [{ name: 'محمود درويش' }, { name: 'المتنبي' }];

async function setupMocks(page) {
  await page.route('**/api/poems/random*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_POEM),
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

// Reveal the whole poem so the reader reaches idle and exposes the "Poem Insights" action, then
// open the inline insight.
async function openInlineInsight(page) {
  const listenBtn = page.locator('button[aria-label="Start recitation"]');
  await listenBtn.click({ timeout: 10000 });
  const insightsBtn = page.locator('button:has-text("Poem Insights")').first();
  await expect(insightsBtn).toBeVisible({ timeout: 10000 });
  await insightsBtn.click();
  await expect(page.locator('[data-insight-ui]').first()).toBeVisible({ timeout: 10000 });
}

test.describe('Inline Insights', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.addInitScript(() => {
      localStorage.setItem('hasSeenOnboarding', 'true');
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Wait for the reader to render.
    await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 10000 });
  });

  test('opens the inline insight from the Poem Insights action', async ({ page }) => {
    await openInlineInsight(page);
    // The verse stage is replaced in place by the inline insight container.
    await expect(page.locator('[data-insight-ui]').first()).toBeVisible();
  });

  test('returns to the poem with Back to Poem', async ({ page }) => {
    await openInlineInsight(page);

    const backBtn = page.locator('button:has-text("Back to Poem")').first();
    await expect(backBtn).toBeVisible({ timeout: 5000 });
    await backBtn.click();

    // The inline insight is dismissed and the verse stage is shown again.
    await expect(page.locator('[data-insight-ui]')).toHaveCount(0);
    await expect(page.locator('[data-testid="sparkler-stage"]').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('the inline insight is not the old vaul drawer', async ({ page }) => {
    await openInlineInsight(page);
    // The removed insight drawer/overlay must not appear.
    await expect(page.locator('[data-vaul-drawer]')).toHaveCount(0);
  });

  test('has no hardcoded indigo colors in the inline insight', async ({ page }) => {
    await openInlineInsight(page);
    const hasIndigo = await page.evaluate(() => {
      const all = document.querySelectorAll('[data-insight-ui] *');
      for (const el of all) {
        const style = getComputedStyle(el);
        const color = style.color + style.backgroundColor + style.borderColor;
        if (color.includes('99, 102, 241') || color.includes('79, 70, 229')) return true;
      }
      return false;
    });
    expect(hasIndigo).toBe(false);
  });
});
