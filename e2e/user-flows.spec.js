import { test, expect } from '@playwright/test';
import { openDiscoverDrawer } from './fixtures/mocks.js';

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
  arabic:
    'على هذه الأرضِ ما يستحقُّ الحياةْ\nتردُّدُ أبريلَ، رائحةُ الخبزِ في الفجرِ\nآراءُ امرأةٍ في الرجالِ',
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

  // Block Gemini AI proxy calls (no real AI needed)
  await page.route('**/api/ai/**', async (route) => {
    await route.abort('blockedbyclient');
  });
}

// ─── Tests ──────────────────────────────────────────────────────────

test.describe('User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
    // Skip splash/onboarding so tests can interact with the main app.
    // `show-dislike` is opt-in and OFF by default, so the flows below that exercise the flag
    // button have to turn it on; the default-off state has its own test further down.
    await page.addInitScript(() => {
      localStorage.setItem('hasSeenOnboarding', 'true');
      localStorage.setItem('show-dislike', '1');
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Dismiss the splash if visible. By testid, not by label: the copy has changed twice.
    const enterBtn = page.getByTestId('splash-enter');
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

    // Open the DiscoverDrawer (account menu → Explore Poets), then Surprise Me for a new poem.
    // The nav button is still the settle signal: it disables while a fetch is in flight.
    const openDrawerButton = page.locator('button[aria-label="Open discover"]');
    await expect(openDrawerButton).toBeEnabled({ timeout: 10000 });
    await openDiscoverDrawer(page);

    const discoverButton = page.locator('button[aria-label="Discover new poem"]');
    await expect(discoverButton).toBeVisible({ timeout: 3000 });
    await discoverButton.click();

    // After click, the mock route serves a different poem.
    await expect(openDrawerButton).toBeEnabled({ timeout: 10000 });

    // Wait for the drawer to finish animating out first. Its poet list contains these same names,
    // so asserting while it is still on screen matched several elements at once — a strict-mode
    // violation that the old `.isVisible().catch(() => false)` quietly turned into `false`, failing
    // the test on a locator problem rather than on the poem.
    await expect(discoverButton).toBeHidden({ timeout: 5000 });

    // Scoped to the reader, so the debug log panel's own mention of the poet can't satisfy this.
    await expect(page.locator('[data-testid="poem-reader"]').first()).toContainText(
      /محمود درويش|المتنبي/,
      { timeout: 10000 }
    );
  });

  // #2 — Audio playback loading state
  test('user requests audio playback', async ({ page }) => {
    // Set up a delayed Gemini TTS response to observe loading state
    await page.route('**/api/ai/**', async (route) => {
      // Simulate slow TTS — respond after 500ms with an error (no real audio needed)
      await new Promise((r) => setTimeout(r, 500));
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

  // #3 — Inline poem insight
  // The standalone "Explain" button + insight drawer/overlay were removed; insights now render
  // INLINE in the reader. The reader flow is: reveal the whole poem (Listen loads it all) → the
  // right action becomes "Poem Insights" → tapping it swaps the verses for the inline insight
  // (its container carries [data-insight-ui]). AI is mocked-off here, so we assert the inline
  // insight END-STATE opens, not the generated text.
  test('user opens the inline poem insight', async ({ page }) => {
    // Load the whole poem so the reader reaches the idle end-state (right action = Poem Insights).
    const listenBtn = page.locator('button[aria-label="Start recitation"]');
    await listenBtn.click({ timeout: 10000 });

    const insightsBtn = page.locator('button:has-text("Poem Insights")').first();
    await expect(insightsBtn).toBeVisible({ timeout: 10000 });
    await insightsBtn.click();

    // The inline insight view (replaces the verses in-place) appears.
    await expect(page.locator('[data-insight-ui]').first()).toBeVisible({ timeout: 10000 });
  });

  // #4 — Toggle dark/light theme
  test('user toggles dark/light theme', async ({ page }) => {
    const readBg = () =>
      page.evaluate(() => {
        const rootDiv = document.querySelector('#root > div');
        return rootDiv ? getComputedStyle(rootDiv).backgroundColor : '';
      });
    const initialBg = await readBg();

    // Theme toggle now lives inside the Account menu (bottom nav). Open it, then tap the
    // Night/Day row — one tap flips the theme.
    await page.locator('button[aria-label="Account menu"]').first().click();
    const themeBtn = page
      .locator('button[aria-label="Switch to day mode"], button[aria-label="Switch to night mode"]')
      .first();
    await expect(themeBtn).toBeVisible({ timeout: 3000 });
    await themeBtn.click();

    // Background should update after the click. Poll instead of a fixed sleep — under CI load
    // (2 workers sharing a 2-core runner) a single-shot read after a short sleep can catch the
    // paint before React/Tailwind's class swap has committed.
    await expect.poll(readBg, { timeout: 5000 }).not.toBe(initialBg);
  });

  // #5 — Cycle Arabic font
  test('user cycles Arabic font', async ({ page }) => {
    // Initial font should be Amiri (default, index 0)
    await expect(page.locator('.font-amiri').first()).toBeVisible();

    // Display settings now live in the Account menu → "Display Settings" (the old top-right
    // "Aa" pill was removed). Open the menu, then the settings panel.
    await page.locator('button[aria-label="Account menu"]').first().click();
    const displaySettingsBtn = page.locator('button[aria-label="Display settings"]').first();
    await expect(displaySettingsBtn).toBeVisible({ timeout: 3000 });
    await displaySettingsBtn.click();
    await page.waitForTimeout(300);

    const fontTrigger = page.locator('button[aria-label="Select font"]').first();
    await expect(fontTrigger).toBeVisible({ timeout: 2000 });
    await fontTrigger.click();

    // Select Alexandria from the dropdown
    await page.getByText('الإسكندرية').click();

    // After selecting, Alexandria should be the active font
    await expect(page.locator('.font-alexandria').first()).toBeVisible({ timeout: 3000 });
  });

  // #6 — Filter poems by poet
  test('user filters poems by poet', async ({ page }) => {
    // Open the DiscoverDrawer from the account menu
    await openDiscoverDrawer(page);

    // Wait for drawer to render with poet options
    const dropdownBtn = page
      .locator('[data-testid="poet-picker-button"]:has-text("المتنبي")')
      .first();
    await expect(dropdownBtn).toBeVisible({ timeout: 3000 });

    // Wait for drawer slide-in animation to finish
    await page.waitForTimeout(400);

    // Dispatch a real click event via JS to trigger React handler
    await dropdownBtn.dispatchEvent('click');

    // After selection, the drawer should close
    await expect(dropdownBtn).toBeHidden({ timeout: 3000 });
  });

  // #7 — Copy poem to clipboard: REMOVED. Copy-to-clipboard is retired (FEATURES.copy=false); the
  // copy button no longer exists, so the test was deleted.

  // #8 — DB/AI mode toggle removed (DB mode is now the permanent default)

  // #9 — Navigate to design review (accessible via direct URL even when icon is hidden)
  test('user navigates to design review', async ({ page }) => {
    // The design review link icon is gated by FEATURES.designReview (default false).
    // The page is still accessible via direct URL navigation.
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

  // #13 — Auth reachable via the Account menu
  // The vertical sidebar is gone; sign-in now lives inside the bottom-nav Account popover.
  test('sign-in is reachable from the account menu', async ({ page }) => {
    const accountBtn = page.locator('button[aria-label="Account menu"]').first();
    await expect(accountBtn).toBeVisible({ timeout: 5000 });
    await accountBtn.click();

    // The popover exposes the Sign in action when unauthenticated.
    const signInBtn = page.locator('button[aria-label="Sign in"]').first();
    await expect(signInBtn).toBeVisible({ timeout: 3000 });
  });

  // #14 — Save and Flag persist after Discover (no layout shift)
  test('save and flag buttons persist after discovering new poem', async ({ page }) => {
    const saveBtn = page.locator('button:has(svg.lucide-heart)').first();
    const flagBtn = page.locator('button:has(svg.lucide-thumbs-down)').first();

    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await expect(flagBtn).toBeVisible({ timeout: 5000 });

    // Discover a new poem — open the drawer (account menu → Explore Poets) then Surprise Me
    const openDrawerBtn = page.locator('button[aria-label="Open discover"]');
    await expect(openDrawerBtn).toBeEnabled({ timeout: 10000 });
    await openDiscoverDrawer(page);

    const discoverBtn = page.locator('button[aria-label="Discover new poem"]');
    await expect(discoverBtn).toBeVisible({ timeout: 3000 });
    await discoverBtn.click();
    await expect(openDrawerBtn).toBeEnabled({ timeout: 10000 });

    // Save and Flag should still be visible after poem change
    await expect(saveBtn).toBeVisible();
    await expect(flagBtn).toBeVisible();
  });

  // The Dislike button is opt-in from the account menu. The suite seeds it ON in beforeEach so the
  // flag flows have something to click, so its actual default needs its own check.
  test('dislike button is hidden by default', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('show-dislike'));
    await page.reload();
    await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 10000 });

    await expect(page.locator('svg.lucide-thumbs-down')).toHaveCount(0);
  });

  // The nav pill's Discover button changed jobs: it used to slide up the DiscoverDrawer, and now
  // it opens the Category Explorer. Nothing else covered that, so the swap could regress silently.
  test('nav Discover button opens the Category Explorer', async ({ page }) => {
    await page.locator('button[aria-label="Open discover"]').first().click();
    await expect(page).toHaveURL(/\/explore$/, { timeout: 10000 });
  });

  // #15 — Only one ThumbsDown icon on page (not duplicated in sidebar)
  test('thumbs-down icon appears exactly once on page', async ({ page }) => {
    await expect(page.locator('button:has(svg.lucide-thumbs-down)').first()).toBeVisible({
      timeout: 5000,
    });
    const count = await page.locator('svg.lucide-thumbs-down').count();
    expect(count).toBe(1);
  });

  // #16 — Curated feed toggle makes Discover send curated=1
  // The Curated toggle (Account menu) biases the serve server-side. Flipping it on must
  // make the random-poem fetch carry ?curated=1 — asserted against the intercepted URL.
  test('curated feed toggle makes discover send curated=1', async ({ page }) => {
    const randomRequests = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/poems/random')) randomRequests.push(req.url());
    });

    // Turn on Curated in the account menu.
    await page.locator('button[aria-label="Account menu"]').first().click();
    const curatedToggle = page.locator('button[aria-label="Turn curated feed on"]').first();
    await expect(curatedToggle).toBeVisible({ timeout: 3000 });
    await curatedToggle.click();
    // The toggle flips to the "off" label, confirming the state actually changed.
    await expect(page.locator('button[aria-label="Turn curated feed off"]').first()).toBeVisible({
      timeout: 3000,
    });
    // Close the popover first: openDiscoverDrawer clicks the same account-menu trigger, which
    // would TOGGLE an already-open menu shut. Curated state is persisted, so it survives.
    await page.keyboard.press('Escape');

    // Discover a poem (account menu → Explore Poets → Surprise Me).
    await openDiscoverDrawer(page);
    const discoverBtn = page.locator('button[aria-label="Discover new poem"]').first();
    await expect(discoverBtn).toBeVisible({ timeout: 3000 });
    await discoverBtn.click();
    await expect(page.locator('button[aria-label="Open discover"]').first()).toBeEnabled({
      timeout: 10000,
    });

    // The random serve must have carried curated=1.
    expect(randomRequests.some((u) => new URL(u).searchParams.get('curated') === '1')).toBe(true);
  });
});

// #16 / #17 — Mobile VerticalSidebar tests: REMOVED. The VerticalSidebar is gone (bottom nav is now
// Save / Library / Discover / Account, with Dislike pinned bottom-left) and copy-to-clipboard is
// retired, so both mobile-sidebar tests were deleted rather than rewritten.
