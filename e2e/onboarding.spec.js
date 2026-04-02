import { test, expect } from '@playwright/test';

/**
 * Onboarding Flow E2E Tests — Poetry Bil-Araby (Qafiyah)
 *
 * TDD skeleton: tests written BEFORE implementation.
 * Expected to fail (red) until the onboarding UI is built.
 *
 * Flow: Phase 0-3 (kinetic brand reveal) → Phase 4 (mood picker)
 *       → Phase 5 (era picker) → Phase 6 (topics/themes)
 *
 * All backend calls are intercepted for determinism.
 *
 * ── data-testid CONTRACT ──────────────────────────────────────────────
 * The onboarding-agent MUST add these data-testid attributes:
 *
 *   [data-testid="splash-screen"]     — outer onboarding container
 *   [data-testid="kinetic-continue"]  — Continue button shown at end of phase 3
 *   [data-testid="mood-picker"]       — phase 4 container
 *   [data-testid="mood-item"]         — individual mood emotion buttons (9 total)
 *   [data-testid="mood-continue"]     — Continue button in phase 4
 *   [data-testid="era-picker"]        — phase 5 container
 *   [data-testid="era-portal"]        — era portal buttons (Classical / Modern)
 *   [data-testid="era-continue"]      — Continue button in phase 5
 *   [data-testid="topics-picker"]     — phase 6 container
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

  // Mock tags endpoint (may be added by backend agent)
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

// ─── Helper: advance through kinetic phases 0-3 ─────────────────────

/**
 * Clicks through the kinetic brand reveal (phases 0-3).
 * The splash screen auto-advances on tap/click for phases 0-2,
 * then shows a Continue button at phase 3.
 */
async function advanceThroughKineticPhases(page) {
  const splash = page.locator('[data-testid="splash-screen"]');

  // Phases 0-2: tap/click the splash container to advance
  for (let i = 0; i < 3; i++) {
    await splash.click();
    // Small wait for animation transition between phases
    await page.waitForTimeout(300);
  }

  // Phase 3: wait for Continue button and click it
  const continueBtn = page.locator('[data-testid="kinetic-continue"]');
  await expect(continueBtn).toBeVisible({ timeout: 5000 });
  await continueBtn.click();
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

  // ── 2. Can tap through kinetic steps 0-3 ───────────────────────────

  test('can advance through kinetic brand reveal steps', async ({ page }) => {
    const splash = page.locator('[data-testid="splash-screen"]');
    await expect(splash).toBeVisible({ timeout: 5000 });

    // Tap through phases 0-2
    for (let i = 0; i < 3; i++) {
      await splash.click();
      await page.waitForTimeout(300);
    }

    // Phase 3 should show the Continue button
    const continueBtn = page.locator('[data-testid="kinetic-continue"]');
    await expect(continueBtn).toBeVisible({ timeout: 5000 });
  });

  // ── 3. Phase 3 Continue advances to mood picker (phase 4) ─────────

  test('phase 3 Continue button advances to mood picker', async ({ page }) => {
    await advanceThroughKineticPhases(page);

    // Mood picker (phase 4) should now be visible
    const moodPicker = page.locator('[data-testid="mood-picker"]');
    await expect(moodPicker).toBeVisible({ timeout: 5000 });

    // Should have 9 emotion buttons
    const moodItems = page.locator('[data-testid="mood-item"]');
    await expect(moodItems).toHaveCount(9);
  });

  // ── 4. Mood picker: selecting emotion reveals Continue ─────────────

  test('mood picker: selecting emotion shows Continue', async ({ page }) => {
    await advanceThroughKineticPhases(page);

    const moodPicker = page.locator('[data-testid="mood-picker"]');
    await expect(moodPicker).toBeVisible({ timeout: 5000 });

    // Continue should NOT be visible before selection
    const moodContinue = page.locator('[data-testid="mood-continue"]');
    await expect(moodContinue).not.toBeVisible();

    // Select one mood
    const firstMood = page.locator('[data-testid="mood-item"]').first();
    await firstMood.click();

    // Now Continue should appear
    await expect(moodContinue).toBeVisible({ timeout: 3000 });
  });

  // ── 5. Era picker: selecting portal reveals Continue ───────────────

  test('era picker: selecting a portal shows Continue', async ({ page }) => {
    await advanceThroughKineticPhases(page);

    // Advance past mood picker
    const firstMood = page.locator('[data-testid="mood-item"]').first();
    await firstMood.click();
    const moodContinue = page.locator('[data-testid="mood-continue"]');
    await moodContinue.click();

    // Era picker (phase 5) should be visible
    const eraPicker = page.locator('[data-testid="era-picker"]');
    await expect(eraPicker).toBeVisible({ timeout: 5000 });

    // Continue should NOT be visible before selection
    const eraContinue = page.locator('[data-testid="era-continue"]');
    await expect(eraContinue).not.toBeVisible();

    // Select one era portal
    const firstPortal = page.locator('[data-testid="era-portal"]').first();
    await firstPortal.click();

    // Now Continue should appear
    await expect(eraContinue).toBeVisible({ timeout: 3000 });
  });

  // ── 6. Topics: selecting 2+ themes reveals "أرني شعرًا" ────────────

  test('topics: selecting 2 themes shows show-poetry button', async ({ page }) => {
    await advanceThroughKineticPhases(page);

    // Advance past mood picker
    await page.locator('[data-testid="mood-item"]').first().click();
    await page.locator('[data-testid="mood-continue"]').click();

    // Advance past era picker
    await page.locator('[data-testid="era-portal"]').first().click();
    await page.locator('[data-testid="era-continue"]').click();

    // Topics picker (phase 6) should be visible
    const topicsPicker = page.locator('[data-testid="topics-picker"]');
    await expect(topicsPicker).toBeVisible({ timeout: 5000 });

    // "أرني شعرًا" button should NOT be visible with <2 selections
    const showPoetryBtn = page.locator('[data-testid="show-poetry-btn"]');
    await expect(showPoetryBtn).not.toBeVisible();

    // Select only 1 topic — button still hidden
    await page.locator('[data-testid="topic-node"]').nth(0).click();
    await expect(showPoetryBtn).not.toBeVisible();

    // Select 2nd topic — button should appear
    await page.locator('[data-testid="topic-node"]').nth(1).click();
    await expect(showPoetryBtn).toBeVisible({ timeout: 3000 });
  });

  // ── 7. Completing onboarding dismisses splash → poem visible ───────

  test('completing onboarding shows poem', async ({ page }) => {
    await advanceThroughKineticPhases(page);

    // Phase 4: mood
    await page.locator('[data-testid="mood-item"]').first().click();
    await page.locator('[data-testid="mood-continue"]').click();

    // Phase 5: era
    await page.locator('[data-testid="era-portal"]').first().click();
    await page.locator('[data-testid="era-continue"]').click();

    // Phase 6: topics — pick 2 and finish
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
    await advanceThroughKineticPhases(page);

    // Complete full flow
    await page.locator('[data-testid="mood-item"]').first().click();
    await page.locator('[data-testid="mood-continue"]').click();
    await page.locator('[data-testid="era-portal"]').first().click();
    await page.locator('[data-testid="era-continue"]').click();
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
    await advanceThroughKineticPhases(page);

    // Complete full flow with specific selections
    await page.locator('[data-testid="mood-item"]').first().click();
    await page.locator('[data-testid="mood-continue"]').click();
    await page.locator('[data-testid="era-portal"]').first().click();
    await page.locator('[data-testid="era-continue"]').click();
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

    // Arrays should be non-empty
    expect(prefs.moods.length).toBeGreaterThan(0);
    expect(prefs.eras.length).toBeGreaterThan(0);
    expect(prefs.topics.length).toBeGreaterThanOrEqual(2);

    // completedAt should be a valid ISO date
    expect(new Date(prefs.completedAt).toISOString()).toBe(prefs.completedAt);
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
    // Give a moment for splash to potentially appear, then assert it didn't
    await expect(splash).not.toBeVisible({ timeout: 3000 });

    // Poem content should be visible instead
    await expect(page.locator('[dir="rtl"]').first()).toBeVisible({ timeout: 10000 });
  });
});
