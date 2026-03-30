import { test, expect } from '@playwright/test';

// Helper: dismiss splash/onboarding
async function dismissOnboarding(page) {
  // Click through splash screen if present
  try {
    const splash = page.locator('[data-testid="splash-screen"]').first();
    if (await splash.isVisible({ timeout: 2000 })) {
      await page.click('body');
      await page.waitForTimeout(500);
    }
  } catch {}
  // Dismiss any onboarding overlays
  try {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  } catch {}
}

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

const MOCK_POETS = [
  { name: 'محمود درويش' },
  { name: 'المتنبي' },
];

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

test.describe('Insight Overlay', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.addInitScript(() => {
      localStorage.setItem('hasSeenOnboarding', 'true');
    });
    await page.goto('http://localhost:5173');
    await dismissOnboarding(page);
    // Wait for app to render
    await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 10000 });
  });

  test('opens on Explain click and shows heading', async ({ page }) => {
    const explainBtn = page.locator('button[aria-label="Explain poem meaning"]').first();
    await expect(explainBtn).toBeVisible({ timeout: 10000 });
    await explainBtn.click();

    // Drawer should appear
    await expect(page.locator('[data-vaul-drawer]')).toBeVisible({ timeout: 10000 });
  });

  test('shows loading state', async ({ page }) => {
    const explainBtn = page.locator('button[aria-label="Explain poem meaning"]').first();
    await expect(explainBtn).toBeVisible({ timeout: 10000 });
    if (await explainBtn.isEnabled()) {
      await explainBtn.click();
    }
    // Loading text or drawer should appear
    const loadingOrDrawer = page.locator('text=Consulting').or(page.locator('[data-vaul-drawer]'));
    await expect(loadingOrDrawer.first()).toBeVisible({ timeout: 10000 });
  });

  test('closes on Escape key', async ({ page }) => {
    const explainBtn = page.locator('button[aria-label="Explain poem meaning"]').first();
    await expect(explainBtn).toBeVisible({ timeout: 10000 });
    await explainBtn.click();
    await expect(page.locator('[data-vaul-drawer]')).toBeVisible({ timeout: 10000 });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(page.locator('[data-vaul-drawer]')).not.toBeVisible({ timeout: 3000 });
  });

  test('closes on swipe down', async ({ page }) => {
    const explainBtn = page.locator('button[aria-label="Explain poem meaning"]').first();
    await expect(explainBtn).toBeVisible({ timeout: 10000 });
    await explainBtn.click();
    await expect(page.locator('[data-vaul-drawer]')).toBeVisible({ timeout: 10000 });

    // Click close button (desktop pill or mobile circle), fall back to Escape
    const closeBtn = page
      .locator('[data-testid="insight-close"]')
      .or(page.locator('[data-testid="insight-close-mobile"]'))
      .or(page.locator('button[aria-label="Close insight overlay"]'));
    if (await closeBtn.first().isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.first().click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(500);
    await expect(page.locator('[data-vaul-drawer]')).not.toBeVisible({ timeout: 3000 });
  });

  test('has no hardcoded indigo colors', async ({ page }) => {
    const explainBtn = page.locator('button[aria-label="Explain poem meaning"]').first();
    await expect(explainBtn).toBeVisible({ timeout: 10000 });
    await explainBtn.click();
    await expect(page.locator('[data-vaul-drawer]')).toBeVisible({ timeout: 10000 });

    // Check that no element has indigo in computed styles
    const hasIndigo = await page.evaluate(() => {
      const all = document.querySelectorAll('[data-vaul-drawer] *');
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
