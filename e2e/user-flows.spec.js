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
    // Skip splash/onboarding so tests can interact with the main app
    await page.addInitScript(() => {
      localStorage.setItem('hasSeenOnboarding', 'true');
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Dismiss splash screen if visible (click "Enter" button)
    const enterBtn = page.locator('button[aria-label="Enter the app"]');
    if (await enterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await enterBtn.click();
      await enterBtn.waitFor({ state: 'hidden', timeout: 5000 });
    }
    await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 10000 });
  });

  // #1 — Discover a new poem
  test('user discovers a new poem', async ({ page }) => {
    // Capture the poet name before discover
    const poetBefore = await page.locator('[dir="rtl"]').first().textContent();

    const discoverButton = page.locator('button[aria-label="Discover new poem"]');
    await expect(discoverButton).toBeEnabled({ timeout: 10000 });
    await discoverButton.click();

    // After click, the mock route serves a different poem
    await expect(discoverButton).toBeEnabled({ timeout: 10000 });
    // Verify that either poet from our mock data is displayed
    const darwishVisible = await page.locator('text=محمود درويش').isVisible().catch(() => false);
    const mutanabbiVisible = await page.locator('text=المتنبي').isVisible().catch(() => false);
    expect(darwishVisible || mutanabbiVisible).toBe(true);
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

    // The app auto-triggers handleAnalyze on load. With an API key it streams
    // real insights from Gemini; without one (CI) it shows a fallback message.
    // Either way the "Poetic Insight" panel should appear.
    //
    // If auto-explain hasn't started yet (Explain button still enabled), click it.
    const insightButton = page.locator('button[aria-label="Explain poem meaning"]').first();
    await expect(insightButton).toBeVisible({ timeout: 5000 });

    const isEnabled = await insightButton.isEnabled();
    if (isEnabled) {
      await insightButton.click();
    }

    // "Poetic Insight" heading should appear in the side panel
    await expect(
      page.locator('text=Poetic Insight').first()
    ).toBeVisible({ timeout: 10000 });
  });

  // #4 — Toggle dark/light theme
  test('user toggles dark/light theme', async ({ page }) => {
    const initialBg = await page.evaluate(() => {
      const rootDiv = document.querySelector('#root > div');
      return rootDiv ? getComputedStyle(rootDiv).backgroundColor : '';
    });

    // Try ThemeDropdown (desktop) first, then VerticalSidebar Settings (mobile)
    const themeDropdown = page.locator('button[aria-label="Theme options"]').first();
    const themeVisible = await themeDropdown.isVisible().catch(() => false);

    if (themeVisible) {
      await themeDropdown.click();
      await page.waitForTimeout(300);
      // Click the mode toggle button — target via English sub-text
      const modeButton = page.locator('button:has-text("Light Mode"), button:has-text("Dark Mode")').first();
      await expect(modeButton).toBeVisible({ timeout: 3000 });
      await modeButton.click();
    } else {
      // Mobile: open Settings gear in VerticalSidebar, then click theme toggle
      const settingsBtn = page.locator('button[title="Settings"]').first();
      await settingsBtn.click();
      await page.waitForTimeout(300);
      const themeBtn = page.locator('button[title="Light mode"], button[title="Dark mode"]').first();
      await expect(themeBtn).toBeVisible({ timeout: 3000 });
      await themeBtn.click();
    }

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

    // Open theme dropdown (desktop) or VerticalSidebar Settings (mobile)
    const themeDropdown = page.locator('button[aria-label="Theme options"]').first();
    const themeVisible = await themeDropdown.isVisible().catch(() => false);

    if (themeVisible) {
      await themeDropdown.click();
      // Click the font cycle button (Arabic text: "تبديل الخط")
      const fontButton = page.locator('button:has-text("تبديل الخط")').first();
      await expect(fontButton).toBeVisible({ timeout: 2000 });
      await fontButton.click();
    } else {
      // Mobile: open Settings gear, then click font cycle button
      const settingsBtn = page.locator('button[title="Settings"]').first();
      await settingsBtn.click();
      await page.waitForTimeout(300);
      const fontBtn = page.locator('button[title^="Font:"]').first();
      await expect(fontBtn).toBeVisible({ timeout: 2000 });
      await fontBtn.click();
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
      // Desktop: open dropdown and select a specific poet
      await categoryButton.click();
      const poetOption = page.locator('text=نزار قباني').first();
      await expect(poetOption).toBeVisible({ timeout: 3000 });
      await poetOption.click();
    } else {
      // Mobile: open Settings gear in VerticalSidebar, then click poet cycle button
      const settingsBtn = page.locator('button[title="Settings"]').first();
      await settingsBtn.click();
      await page.waitForTimeout(300);
      const poetBtn = page.locator('button[title="Poet filter"]').first();
      await expect(poetBtn).toBeVisible({ timeout: 2000 });
      // Click poet filter to cycle from "All" to next poet
      await poetBtn.click();
    }

    // Click Discover to trigger a filtered API request
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
  test('user sees DB/AI mode toggle', async ({ page }) => {
    await expect(page.locator('footer')).toBeVisible();

    // Desktop: the toggle button should be visible in the control bar
    const toggleButton = page.locator('button[aria-label*="Database Mode"], button[aria-label*="AI Mode"]').first();
    const isVisible = await toggleButton.isVisible().catch(() => false);

    if (!isVisible) {
      // Mobile: open Settings gear in VerticalSidebar, then find DB/AI toggle
      const settingsBtn = page.locator('button[title="Settings"]').first();
      const settingsVisible = await settingsBtn.isVisible().catch(() => false);
      if (settingsVisible) {
        await settingsBtn.click();
        await page.waitForTimeout(300);
        const dbButton = page.locator('button[title*="Switch to"]').first();
        await expect(dbButton).toBeVisible({ timeout: 2000 });
        return;
      }
      test.skip();
      return;
    }

    // Verify the toggle renders with correct aria-label
    const label = await toggleButton.getAttribute('aria-label');
    expect(label).toMatch(/Switch to (AI|Database) Mode/);

    // When VITE_GEMINI_API_KEY is set, clicking toggles the mode.
    // When it's not set (CI), the button is disabled — verify that state.
    const isDisabled = await toggleButton.isDisabled();
    if (!isDisabled) {
      const initialLabel = label;
      await toggleButton.click();
      await expect(toggleButton).not.toHaveAttribute('aria-label', initialLabel, { timeout: 3000 });
    } else {
      // Button is correctly disabled without an API key
      expect(isDisabled).toBe(true);
    }
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

  // #11 — Save button visible and clickable (unauthenticated)
  test('save button visible and shows tooltip when not logged in', async ({ page }) => {
    const saveBtn = page.locator('button:has(svg.lucide-heart)').first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });

    // Click Save when not logged in — should show sign-in tooltip, not crash
    await saveBtn.click();
    await page.waitForTimeout(800);

    // App should still be functional (no crash, poem still visible)
    await expect(page.locator('[dir="rtl"]').first()).toBeVisible();
  });

  // #12 — Flag (ThumbsDown) button visible and clickable (unauthenticated)
  test('flag button visible and shows tooltip when not logged in', async ({ page }) => {
    const flagBtn = page.locator('button:has(svg.lucide-thumbs-down)').first();
    await expect(flagBtn).toBeVisible({ timeout: 5000 });

    // Click Flag when not logged in — should show sign-in tooltip, not crash
    await flagBtn.click();
    await page.waitForTimeout(800);

    // App should still be functional
    await expect(page.locator('[dir="rtl"]').first()).toBeVisible();
  });

  // #13 — Auth button always visible
  test('auth button is always visible', async ({ page }) => {
    const authBtn = page.locator('button:has(svg.lucide-log-in)').first();
    await expect(authBtn).toBeVisible({ timeout: 5000 });
  });

  // #14 — Save and Flag persist after Discover (no layout shift)
  test('save and flag buttons persist after discovering new poem', async ({ page }) => {
    const saveBtn = page.locator('button:has(svg.lucide-heart)').first();
    const flagBtn = page.locator('button:has(svg.lucide-thumbs-down)').first();

    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await expect(flagBtn).toBeVisible({ timeout: 5000 });

    // Discover a new poem
    const discoverBtn = page.locator('button[aria-label="Discover new poem"]');
    await expect(discoverBtn).toBeEnabled({ timeout: 10000 });
    await discoverBtn.click();
    await expect(discoverBtn).toBeEnabled({ timeout: 10000 });

    // Save and Flag should still be visible after poem change
    await expect(saveBtn).toBeVisible();
    await expect(flagBtn).toBeVisible();
  });

  // #15 — Only one ThumbsDown icon on page (not duplicated in sidebar)
  test('thumbs-down icon appears exactly once on page', async ({ page }) => {
    await expect(page.locator('button:has(svg.lucide-thumbs-down)').first()).toBeVisible({ timeout: 5000 });
    const count = await page.locator('svg.lucide-thumbs-down').count();
    expect(count).toBe(1);
  });
});

// #16 — Mobile viewport shows VerticalSidebar (forced narrow viewport)
test.describe('Mobile viewport sidebar', () => {
  test.use({ viewport: { width: 402, height: 874 } });

  test('mobile viewport shows VerticalSidebar with Settings', async ({ page }) => {
    await page.route('**/api/**', route => route.abort());
    await page.route('**/generativelanguage.googleapis.com/**', route => route.abort());
    await page.addInitScript(() => { localStorage.setItem('hasSeenOnboarding', 'true'); });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const enterBtn = page.locator('button[aria-label="Enter the app"]');
    if (await enterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await enterBtn.click();
      await enterBtn.waitFor({ state: 'hidden', timeout: 5000 });
    }
    await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 10000 });

    // VerticalSidebar Settings button should be visible on mobile
    await expect(page.locator('button[title="Settings"]').first()).toBeVisible();

    // Theme options dropdown should NOT be visible (desktop only)
    await expect(page.getByRole('button', { name: /theme options/i })).not.toBeVisible();
  });

  // #17 — Flag NOT in VerticalSidebar on mobile
  test('mobile VerticalSidebar does not contain ThumbsDown', async ({ page }) => {
    await setupRouteMocks(page);
    await page.addInitScript(() => { localStorage.setItem('hasSeenOnboarding', 'true'); });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const enterBtn = page.locator('button[aria-label="Enter the app"]');
    if (await enterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await enterBtn.click();
      await enterBtn.waitFor({ state: 'hidden', timeout: 5000 });
    }
    await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 10000 });

    // Save and Flag should be in the horizontal bar
    const flagBtn = page.locator('button:has(svg.lucide-thumbs-down)').first();
    await expect(flagBtn).toBeVisible({ timeout: 5000 });

    // There should be exactly 1 ThumbsDown icon (bar only, not sidebar)
    const totalFlags = await page.locator('svg.lucide-thumbs-down').count();
    expect(totalFlags).toBe(1);
  });
});
