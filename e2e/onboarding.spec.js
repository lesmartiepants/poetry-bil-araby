import { test, expect } from '@playwright/test';

/**
 * Onboarding Flow E2E Tests — Poetry Bil-Araby (Qafiyah)
 *
 * Updated flow (v3 — 5 phases):
 *   Phase 0: Ray-tracing splash — "Enter" button appears after animation
 *   Phase 1: MoodPicker — watercolor ink blobs
 *   Phase 2: EraPicker — portal buttons (Classical / Modern)
 *   Phase 3: SubEraPicker — era chips based on selected portals
 *   Phase 4: TopicsPicker — constellation with connecting lines
 *
 * All backend calls are intercepted for determinism.
 *
 * ── data-testid CONTRACT ──────────────────────────────────────────────
 *   [data-testid="splash-screen"]     — outer onboarding container
 *   [data-testid="mood-picker"]       — phase 1 container
 *   [data-testid="mood-item"]         — individual mood emotion buttons (9 total)
 *   [data-testid="mood-continue"]     — Continue button in phase 1
 *   [data-testid="era-picker"]        — phase 2 container
 *   [data-testid="era-portal"]        — era portal buttons (Classical / Modern)
 *   [data-testid="era-continue"]      — Continue button in phase 2
 *   [data-testid="sub-era-picker"]    — phase 3 container
 *   [data-testid="sub-era-chip"]      — individual sub-era chips
 *   [data-testid="sub-era-continue"]  — Continue button in phase 3
 *   [data-testid="topics-picker"]     — phase 4 container
 *   [data-testid="topic-node"]        — individual topic buttons (12 total)
 *   [data-testid="show-poetry-btn"]   — "أرني شعرًا" finish button
 *   [data-testid="poem-display"]      — the main poem view (already exists)
 * ──────────────────────────────────────────────────────────────────────
 */

// ─── Mock Data ──────────────────────────────────────────────────────

const MOCK_POEM = {
  id: 99001,
  poet: 'Al-Mutanabbi',
  poetArabic: 'المتنبي',
  title: 'Ambition',
  titleArabic: 'الإرادة',
  arabic: 'على قَدْرِ أهلِ العَزمِ تأتي العَزائِمُ\nوتأتي على قَدْرِ الكِرامِ المَكارِمُ',
  english: '',
  tags: ['حكمة'],
  isFromDatabase: true,
};

const MOCK_POETS = [
  { name: 'المتنبي' },
  { name: 'محمود درويش' },
];

// ─── Route Mocks ────────────────────────────────────────────────────

async function setupRouteMocks(page) {
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

  // Mock tags endpoint
  await page.route('**/api/tags*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        'حب', 'حكمة', 'وطنية', 'رثاء', 'طبيعة', 'زهد',
        'فخر', 'غزل', 'هجاء', 'مدح', 'حنين', 'تصوف',
      ]),
    });
  });
}

// ─── Helper: advance from splash to mood picker ─────────────────────

/**
 * Clicks "Enter" button on splash screen to advance to MoodPicker.
 */
async function advanceFromSplash(page) {
  const enterBtn = page.getByRole('button', { name: 'Enter the app' });
  await expect(enterBtn).toBeVisible({ timeout: 8000 });
  await enterBtn.click();
}

// ─── Tests ──────────────────────────────────────────────────────────

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteMocks(page);
    // Clear localStorage so user appears as "new" (never seen onboarding)
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  // ── 1. New user sees the splash/onboarding screen ──────────────────

  test('new user sees onboarding splash', async ({ page }) => {
    const splash = page.locator('[data-testid="splash-screen"]');
    await expect(splash).toBeVisible({ timeout: 5000 });
  });

  // ── 2. Enter button advances to mood picker ───────────────────────

  test('Enter button advances to mood picker', async ({ page }) => {
    const splash = page.locator('[data-testid="splash-screen"]');
    await expect(splash).toBeVisible({ timeout: 5000 });

    // Click "Enter" button
    const enterBtn = page.getByRole('button', { name: 'Enter the app' });
    await expect(enterBtn).toBeVisible({ timeout: 8000 });
    await enterBtn.click();

    // Mood picker (phase 1) should now be visible
    const moodPicker = page.locator('[data-testid="mood-picker"]');
    await expect(moodPicker).toBeVisible({ timeout: 5000 });

    // Should have 9 emotion buttons
    const moodItems = page.locator('[data-testid="mood-item"]');
    await expect(moodItems).toHaveCount(9);
  });

  // ── 3. Mood picker: selecting emotion reveals Continue ─────────────

  test('mood picker: selecting emotion shows Continue', async ({ page }) => {
    await advanceFromSplash(page);

    const moodPicker = page.locator('[data-testid="mood-picker"]');
    await expect(moodPicker).toBeVisible({ timeout: 5000 });

    // CTA is always visible (shows "تخطى" before selection, "التالي" after)
    const moodContinue = page.locator('[data-testid="mood-continue"]');
    await expect(moodContinue).toBeVisible({ timeout: 3000 });

    // Select one mood
    const firstMood = page.locator('[data-testid="mood-item"]').first();
    await firstMood.click();

    // CTA should still be visible with "التالي" label
    await expect(moodContinue).toBeVisible();
  });

  // ── 4. Era picker: selecting portal reveals Continue ───────────────

  test('era picker: selecting a portal shows Continue', async ({ page }) => {
    await advanceFromSplash(page);

    // Advance past mood picker
    const firstMood = page.locator('[data-testid="mood-item"]').first();
    await firstMood.click();
    const moodContinue = page.locator('[data-testid="mood-continue"]');
    await moodContinue.click();

    // Era picker (phase 2) should be visible
    const eraPicker = page.locator('[data-testid="era-picker"]');
    await expect(eraPicker).toBeVisible({ timeout: 5000 });

    // CTA is always visible
    const eraContinue = page.locator('[data-testid="era-continue"]');
    await expect(eraContinue).toBeVisible({ timeout: 3000 });

    // Select one era portal
    const firstPortal = page.locator('[data-testid="era-portal"]').first();
    await firstPortal.click();

    // CTA still visible after selection
    await expect(eraContinue).toBeVisible();
  });

  // ── 5. Sub-era picker: shows chips based on selected portals ───────

  test('sub-era picker: shows chips for selected portals', async ({ page }) => {
    await advanceFromSplash(page);

    // Advance past mood picker
    await page.locator('[data-testid="mood-item"]').first().click();
    await page.locator('[data-testid="mood-continue"]').click();

    // Select Classical portal
    await page.locator('[data-testid="era-portal"]').first().click();
    await page.locator('[data-testid="era-continue"]').click();

    // Sub-era picker (phase 3) should be visible
    const subEraPicker = page.locator('[data-testid="sub-era-picker"]');
    await expect(subEraPicker).toBeVisible({ timeout: 5000 });

    // Should have chips for Classical eras
    const subEraChips = page.locator('[data-testid="sub-era-chip"]');
    await expect(subEraChips.count()).resolves.toBeGreaterThan(0);

    // CTA is always visible
    const subEraContinue = page.locator('[data-testid="sub-era-continue"]');
    await expect(subEraContinue).toBeVisible({ timeout: 3000 });
  });

  // ── 6. Topics: selecting 2+ themes reveals "أرني شعرًا" ────────────

  test('topics: selecting 2 themes shows show-poetry button', async ({ page }) => {
    await advanceFromSplash(page);

    // Advance past mood picker
    await page.locator('[data-testid="mood-item"]').first().click();
    await page.locator('[data-testid="mood-continue"]').click();

    // Advance past era picker
    await page.locator('[data-testid="era-portal"]').first().click();
    await page.locator('[data-testid="era-continue"]').click();

    // Advance past sub-era picker
    await page.locator('[data-testid="sub-era-chip"]').first().click();
    await page.locator('[data-testid="sub-era-continue"]').click();

    // Topics picker (phase 4) should be visible
    const topicsPicker = page.locator('[data-testid="topics-picker"]');
    await expect(topicsPicker).toBeVisible({ timeout: 5000 });

    // "أرني شعرًا" button is always visible
    const showPoetryBtn = page.locator('[data-testid="show-poetry-btn"]');
    await expect(showPoetryBtn).toBeVisible({ timeout: 3000 });

    // Select topics
    await page.locator('[data-testid="topic-node"]').nth(0).click();
    await page.locator('[data-testid="topic-node"]').nth(1).click();

    // Button should still be visible and clickable
    await expect(showPoetryBtn).toBeVisible();
  });

  // ── 7. Completing onboarding dismisses splash → poem visible ───────

  test('completing onboarding shows poem', async ({ page }) => {
    await advanceFromSplash(page);

    // Phase 1: mood
    await page.locator('[data-testid="mood-item"]').first().click();
    await page.locator('[data-testid="mood-continue"]').click();

    // Phase 2: era
    await page.locator('[data-testid="era-portal"]').first().click();
    await page.locator('[data-testid="era-continue"]').click();

    // Phase 3: sub-era
    await page.locator('[data-testid="sub-era-chip"]').first().click();
    await page.locator('[data-testid="sub-era-continue"]').click();

    // Phase 4: topics
    await page.locator('[data-testid="topic-node"]').nth(0).click();
    await page.locator('[data-testid="topic-node"]').nth(1).click();
    await page.locator('[data-testid="show-poetry-btn"]').click();

    // Splash should be gone
    const splash = page.locator('[data-testid="splash-screen"]');
    await expect(splash).not.toBeVisible({ timeout: 5000 });

    // Poem content should be visible (Arabic text with RTL direction)
    const poemDisplay = page.locator('[data-testid="poem-display"]');
    await expect(poemDisplay).toBeVisible({ timeout: 10000 });
  });

  // ── 8. localStorage.hasSeenOnboarding set after completion ─────────

  test('sets hasSeenOnboarding in localStorage', async ({ page }) => {
    await advanceFromSplash(page);

    // Complete full flow
    await page.locator('[data-testid="mood-item"]').first().click();
    await page.locator('[data-testid="mood-continue"]').click();
    await page.locator('[data-testid="era-portal"]').first().click();
    await page.locator('[data-testid="era-continue"]').click();
    await page.locator('[data-testid="sub-era-chip"]').first().click();
    await page.locator('[data-testid="sub-era-continue"]').click();
    await page.locator('[data-testid="topic-node"]').nth(0).click();
    await page.locator('[data-testid="topic-node"]').nth(1).click();
    await page.locator('[data-testid="show-poetry-btn"]').click();

    // Wait for splash to dismiss
    await expect(page.locator('[data-testid="splash-screen"]')).not.toBeVisible({ timeout: 5000 });

    // Verify localStorage flag
    const hasSeenOnboarding = await page.evaluate(() =>
      localStorage.getItem('hasSeenOnboarding')
    );
    expect(hasSeenOnboarding).toBe('true');
  });

  // ── 9. localStorage.onboardingPrefs has moods/eras/topics ──────────

  test('saves preferences to localStorage', async ({ page }) => {
    await advanceFromSplash(page);

    // Complete full flow with specific selections
    await page.locator('[data-testid="mood-item"]').first().click();
    await page.locator('[data-testid="mood-continue"]').click();
    await page.locator('[data-testid="era-portal"]').first().click();
    await page.locator('[data-testid="era-continue"]').click();
    await page.locator('[data-testid="sub-era-chip"]').first().click();
    await page.locator('[data-testid="sub-era-continue"]').click();
    await page.locator('[data-testid="topic-node"]').nth(0).click();
    await page.locator('[data-testid="topic-node"]').nth(2).click();
    await page.locator('[data-testid="show-poetry-btn"]').click();

    // Wait for onboarding to complete
    await expect(page.locator('[data-testid="splash-screen"]')).not.toBeVisible({ timeout: 5000 });

    // Verify preferences saved as JSON
    const prefsRaw = await page.evaluate(() =>
      localStorage.getItem('onboardingPrefs')
    );
    expect(prefsRaw).toBeTruthy();

    const prefs = JSON.parse(prefsRaw);
    expect(prefs).toHaveProperty('moods');
    expect(prefs).toHaveProperty('eras');
    expect(prefs).toHaveProperty('topics');
    expect(prefs).toHaveProperty('completedAt');

    // Arrays should exist
    expect(Array.isArray(prefs.moods)).toBe(true);
    expect(Array.isArray(prefs.eras)).toBe(true);
    expect(Array.isArray(prefs.topics)).toBe(true);
  });

  // ── 10. Returning visitor skips onboarding entirely ────────────────

  test('returning visitor skips onboarding', async ({ page }) => {
    // Pre-set hasSeenOnboarding BEFORE navigating
    await page.addInitScript(() => {
      localStorage.setItem('hasSeenOnboarding', 'true');
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Should NOT see splash screen
    const splash = page.locator('[data-testid="splash-screen"]');
    await expect(splash).not.toBeVisible({ timeout: 3000 });

    // Poem content should be visible instead
    await expect(page.locator('[dir="rtl"]').first()).toBeVisible({ timeout: 10000 });
  });
});
