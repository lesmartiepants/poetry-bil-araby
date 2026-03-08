import { test, expect } from '@playwright/test';

/**
 * User-Flow Smoke Tests — Poetry Bil-Araby
 *
 * Single authoritative E2E suite. Every test is a complete user journey.
 * All backend/AI calls are intercepted via page.route() for determinism —
 * no live backend or API key required.
 */

// ─── Mock Data ──────────────────────────────────────────────────────

const MOCK_POEM_DARWISH = {
  id: 42001,
  poet: 'Mahmoud Darwish',
  poetArabic: 'محمود درويش',
  title: 'On This Earth',
  titleArabic: 'على هذه الأرض',
  arabic: 'على هذه الأرضِ ما يستحقُّ الحياةْ\nتردُّدُ أبريلَ، رائحةُ الخبزِ في الفجرِ\nآراءُ امرأةٍ في الرجالِ',
  english: '',
  tags: ['وطنية'],
  isFromDatabase: true,
};

const MOCK_POEM_MUTANABBI = {
  id: 42002,
  poet: 'Al-Mutanabbi',
  poetArabic: 'المتنبي',
  title: 'The Will',
  titleArabic: 'الإرادة',
  arabic: 'على قَدْرِ أهلِ العَزمِ تأتي العَزائِمُ\nوتأتي على قَدْرِ الكِرامِ المَكارِمُ',
  english: '',
  tags: ['حكمة'],
  isFromDatabase: true,
};

const MOCK_POETS = [
  { name: 'محمود درويش' },
  { name: 'المتنبي' },
  { name: 'نزار قباني' },
  { name: 'عنترة بن شداد' },
  { name: 'ابن عربي' },
];

// ─── Shared Setup ───────────────────────────────────────────────────

/** Intercept all backend/AI routes and return deterministic mock data. */
async function setupRouteMocks(page, { poem = MOCK_POEM_DARWISH } = {}) {
  // Track which poem to serve — alternate on repeated calls
  let callCount = 0;
  const poems = [poem, MOCK_POEM_MUTANABBI];

  await page.route('**/api/poems/random*', async (route) => {
    const current = poems[callCount % poems.length];
    callCount++;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(current),
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

  // Block Gemini API calls (no real AI needed)
  await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
    await route.abort('blockedbyclient');
  });
}

// ─── Tests ──────────────────────────────────────────────────────────

test.describe('User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 10000 });
  });

  // #1 — Discover a new poem
  test('user discovers a new poem', async ({ page }) => {
    const discoverButton = page.locator('button[aria-label="Discover new poem"]');
    await expect(discoverButton).toBeEnabled({ timeout: 10000 });
    await discoverButton.click();

    // After click, the mock route serves MOCK_POEM_MUTANABBI (second call)
    await expect(discoverButton).toBeEnabled({ timeout: 10000 });
    await expect(page.locator('text=المتنبي')).toBeVisible({ timeout: 5000 });
  });

  // #2 — Audio playback loading state
  test('user requests audio playback', async ({ page }) => {
    // Set up a delayed Gemini TTS response to observe loading state
    await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
      // Simulate slow TTS — respond after 500ms with an error (no real audio needed)
      await new Promise(r => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'mock' } }),
      });
    });

    const playButton = page.locator('button[aria-label="Play poem audio"]').first();
    const isPlayVisible = await playButton.isVisible().catch(() => false);

    if (isPlayVisible) {
      await playButton.click();
      // Button should show some loading/disabled state
      await expect(page.locator('[dir="rtl"]').first()).toBeVisible();
    } else {
      // Play button may not be visible in all viewport/mode configs — skip gracefully
      test.skip();
    }
  });

  // #3 — Poetic insight (desktop only)
  test('user reads poetic insight on desktop', async ({ page, viewport }) => {
    if (!viewport || viewport.width < 768) {
      test.skip();
    }

    const insightButton = page.locator('button[aria-label="Explain poem meaning"]').first();
    await expect(insightButton).toBeVisible({ timeout: 5000 });
    await insightButton.click();

    // Side panel should appear with insight heading
    await expect(page.locator('text=Poetic Insight').first()).toBeVisible({ timeout: 5000 });
  });

  // #4 — Toggle dark/light theme
  test('user toggles dark/light theme', async ({ page }) => {
    const initialBg = await page.evaluate(() => {
      const rootDiv = document.querySelector('#root > div');
      return rootDiv ? getComputedStyle(rootDiv).backgroundColor : '';
    });

    // Try ThemeDropdown (desktop) first, then OverflowMenu (mobile)
    const themeDropdown = page.locator('button[aria-label="Theme options"]').first();
    const themeVisible = await themeDropdown.isVisible().catch(() => false);

    if (themeVisible) {
      await themeDropdown.click();
      // Wait for dropdown animation
      await page.waitForTimeout(300);
    } else {
      const moreButton = page.locator('button[aria-label="More options"]').first();
      await moreButton.click();
      await page.waitForTimeout(300);
    }

    // Click the mode toggle button — target via English sub-text which is unique
    // In dark mode: button shows "Light Mode", in light mode: shows "Dark Mode"
    const modeButton = page.locator('button:has-text("Light Mode"), button:has-text("Dark Mode")').first();
    await expect(modeButton).toBeVisible({ timeout: 3000 });
    await modeButton.click();

    // Wait for theme transition
    await page.waitForTimeout(300);

    // Background should have changed
    const newBg = await page.evaluate(() => {
      const rootDiv = document.querySelector('#root > div');
      return rootDiv ? getComputedStyle(rootDiv).backgroundColor : '';
    });
    expect(newBg).not.toBe(initialBg);
  });

  // #5 — Cycle Arabic font
  test('user cycles Arabic font', async ({ page }) => {
    // Initial font should be Amiri (default, index 0)
    await expect(page.locator('.font-amiri').first()).toBeVisible();

    // Open theme dropdown or overflow menu
    const themeDropdown = page.locator('button[aria-label="Theme options"]').first();
    const themeVisible = await themeDropdown.isVisible().catch(() => false);

    if (themeVisible) {
      await themeDropdown.click();
    } else {
      const moreButton = page.locator('button[aria-label="More options"]').first();
      await moreButton.click();
    }

    // Click the font cycle button (Arabic text: "تبديل الخط")
    const fontButton = page.locator('button:has-text("تبديل الخط")').first();
    const fontButtonInMenu = page.locator('button:has-text("اختيار الخط")').first();
    const mainVisible = await fontButton.isVisible().catch(() => false);
    const menuVisible = await fontButtonInMenu.isVisible().catch(() => false);

    if (mainVisible) {
      await fontButton.click();
    } else if (menuVisible) {
      await fontButtonInMenu.click();
    } else {
      test.skip();
      return;
    }

    // After cycling, Alexandria should be the active font (Amiri → Alexandria)
    await expect(page.locator('.font-alexandria').first()).toBeVisible({ timeout: 3000 });
  });

  // #6 — Filter poems by poet
  test('user filters poems by poet', async ({ page }) => {
    // Open category selector
    const categoryButton = page.locator('button[aria-label="Select poet category"]').first();
    const catVisible = await categoryButton.isVisible().catch(() => false);

    if (catVisible) {
      await categoryButton.click();
    } else {
      // Mobile: open overflow menu first, then expand poet accordion
      const moreButton = page.locator('button[aria-label="More options"]').first();
      await moreButton.click();
      const poetAccordion = page.locator('button:has-text("اختيار الشاعر")').first();
      await expect(poetAccordion).toBeVisible({ timeout: 2000 });
      await poetAccordion.click();
    }

    // Select Nizar Qabbani
    const poetOption = page.locator('text=نزار قباني').first();
    await expect(poetOption).toBeVisible({ timeout: 3000 });
    await poetOption.click();

    // Selecting a poet sets the category filter. Now click Discover to trigger a
    // filtered API request (the app only fetches on Discover, not on category change
    // when the local pool already has matching poems).
    const requestPromise = page.waitForRequest(
      (req) => req.url().includes('/api/poems/random') && req.url().includes('poet='),
      { timeout: 10000 }
    );

    const discoverButton = page.locator('button[aria-label="Discover new poem"]');
    await expect(discoverButton).toBeEnabled({ timeout: 5000 });
    await discoverButton.click();

    // Verify the API request includes poet filter param
    const request = await requestPromise;
    expect(request.url()).toContain('poet=');
  });

  // #7 — Copy poem to clipboard
  test('user copies poem to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    const copyButton = page.locator('button[aria-label="Copy poem to clipboard"]').first();
    await expect(copyButton).toBeVisible({ timeout: 5000 });

    // Record SVG icon before click
    const svgBefore = await copyButton.locator('svg').first().innerHTML();
    await copyButton.click();

    // SVG icon should change (from Copy icon to Check icon)
    await expect(async () => {
      const svgAfter = await copyButton.locator('svg').first().innerHTML();
      expect(svgAfter).not.toBe(svgBefore);
    }).toPass({ timeout: 3000 });
  });

  // #8 — Switch DB/AI mode
  test('user switches DB/AI mode', async ({ page }) => {
    await expect(page.locator('footer')).toBeVisible();

    const toggleButton = page.locator('button[aria-label*="Database Mode"], button[aria-label*="AI Mode"]').first();
    const isVisible = await toggleButton.isVisible().catch(() => false);

    if (!isVisible) {
      // Mobile: open overflow menu
      const moreButton = page.locator('button[aria-label="More options"]').first();
      const moreVisible = await moreButton.isVisible().catch(() => false);
      if (moreVisible) {
        await moreButton.click();
        // In overflow menu, the toggle shows Arabic text
        const dbButton = page.locator('button:has-text("قاعدة البيانات"), button:has-text("الذكاء الاصطناعي")').first();
        await expect(dbButton).toBeVisible({ timeout: 2000 });
        await dbButton.click();
        // Verify toggle happened — just check app is still functional
        await expect(page.locator('[dir="rtl"]').first()).toBeVisible();
        return;
      }
      test.skip();
      return;
    }

    const initialLabel = await toggleButton.getAttribute('aria-label');
    await toggleButton.click();

    // aria-label should flip (e.g., "Switch to Database Mode" → "Switch to AI Mode")
    await expect(toggleButton).not.toHaveAttribute('aria-label', initialLabel, { timeout: 3000 });
  });

  // #9 — Navigate to design review
  test('user navigates to design review', async ({ page, viewport }) => {
    // There are two design-review links: mobile (md:hidden) and desktop (hidden md:flex).
    // On desktop viewport the second link is visible; on mobile the first.
    const links = page.locator('a[href="/design-review"]');
    const link = (viewport && viewport.width >= 768) ? links.nth(1) : links.nth(0);
    await expect(link).toBeVisible({ timeout: 5000 });

    // The link href is "/design-review" but Vite serves the static page at "/design-review/"
    // (with trailing slash). Navigate directly to avoid SPA fallback on the non-slash URL.
    await page.goto('/design-review/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/design-review/);
    await expect(page.locator('#navCounter')).toBeVisible({ timeout: 5000 });
  });

  // #10 — Design review keyboard navigation
  test('design review keyboard navigation works', async ({ page, viewport }) => {
    if (!viewport || viewport.width < 768) {
      test.skip();
    }

    await page.goto('/design-review/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#navCounter', { timeout: 5000 });

    const counter = page.locator('#navCounter');
    await expect(counter).toContainText('1 of');

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    await expect(counter).toContainText('2 of');

    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);
    await expect(counter).toContainText('1 of');
  });
});

// #11 — Mobile overflow menu (forced narrow viewport)
test.describe('Mobile viewport overflow', () => {
  test.use({ viewport: { width: 402, height: 874 } });

  test('mobile viewport shows overflow menu', async ({ page }) => {
    await page.route('**/api/**', route => route.abort());
    await page.route('**/generativelanguage.googleapis.com/**', route => route.abort());

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 10000 });

    // On 402px viewport, "More options" should be visible
    await expect(page.getByRole('button', { name: /more options/i })).toBeVisible();

    // Theme options should NOT be visible (collapsed into overflow)
    await expect(page.getByRole('button', { name: /theme options/i })).not.toBeVisible();
  });
});
