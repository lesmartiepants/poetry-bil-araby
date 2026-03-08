import { test, expect } from '@playwright/test';

/**
 * Database Integration E2E Tests
 * Tests database mode toggle, error handling, and integration with backend API
 *
 * Split into two groups:
 * 1. Tests that run everywhere (toggle UI, error handling via route mocking)
 * 2. Tests that need a real backend (skipped in CI)
 */

const isCI = !!process.env.CI;

// Log a CI-visible warning when a test is skipped for environmental reasons
function ciWarn(reason) {
  if (isCI) console.log(`::warning::E2E SKIP: ${reason}`);
  else console.log(`[E2E SKIP] ${reason}`);
}

// Helper: wait for the app to be ready after navigation
async function waitForAppReady(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 5000 });
}

// Helper: switch to database mode (desktop only, returns true if toggled)
// Note: The toggle is disabled when VITE_GEMINI_API_KEY is not set (no API key = can't switch modes)
// The app starts in database mode when FEATURES.database is true (default), so the toggle shows "AI Mode"
async function enableDatabaseMode(page) {
  await expect(page.locator('footer')).toBeVisible();

  // Check if already in database mode (button shows "Switch to AI Mode")
  const alreadyInDbMode = await page.locator('button[aria-label*="AI Mode"]').first().isVisible().catch(() => false);
  if (alreadyInDbMode) return true;

  const toggleButton = page.locator('button[aria-label*="Database Mode"]').first();
  const toggleVisible = await toggleButton.isVisible().catch(() => false);
  if (!toggleVisible) {
    ciWarn('Database toggle button not visible in viewport');
    return false;
  }

  // Check if the button is disabled (no API key in CI)
  const isDisabled = await toggleButton.evaluate(el => el.classList.contains('opacity-50') || el.classList.contains('cursor-not-allowed'));
  if (isDisabled) {
    ciWarn('Database toggle is disabled — VITE_GEMINI_API_KEY is likely missing (required to switch modes)');
    return false;
  }

  await toggleButton.click();
  await expect(page.locator('button[aria-label*="AI Mode"]').first()).toBeVisible({ timeout: 3000 });
  return true;
}

// ─── Group 1: Tests that run everywhere (no real backend needed) ───

test.describe('Database Integration — UI & Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page);
  });

  test.describe('Database Toggle Component', () => {
    test('should display database toggle in control bar', async ({ page, isMobile }) => {
      if (isMobile) {
        // On mobile, the toggle is inside the overflow menu — not directly in the control bar
        const moreButton = page.locator('button[aria-label="More options"]').first();
        const moreButtonVisible = await moreButton.isVisible().catch(() => false);
        if (!moreButtonVisible) {
          ciWarn('Display toggle: More options button not found on mobile');
          test.skip();
          return;
        }
        await moreButton.click();
        const dbToggle = page.locator('button:has-text("قاعدة البيانات"), button:has-text("الذكاء الاصطناعي")').first();
        await expect(dbToggle).toBeVisible({ timeout: 3000 });
      } else {
        const databaseToggle = page.locator('button[aria-label*="Database Mode"], button[aria-label*="AI Mode"]').first();
        await expect(databaseToggle).toBeVisible({ timeout: 3000 });
      }
    });

    test('should toggle between database and AI modes', async ({ page, isMobile }) => {
      await expect(page.locator('footer')).toBeVisible();

      let toggleButton;

      if (isMobile) {
        const moreButton = page.locator('button[aria-label="More options"]').first();
        const moreButtonVisible = await moreButton.isVisible().catch(() => false);

        if (moreButtonVisible) {
          await moreButton.click();
          toggleButton = page.locator('button:has-text("قاعدة البيانات"), button:has-text("الذكاء الاصطناعي")').first();
          const isVisible = await toggleButton.isVisible({ timeout: 2000 }).catch(() => false);
          if (!isVisible) {
            ciWarn('Toggle mode: mobile toggle button not visible in overflow menu');
            test.skip();
            return;
          }
        }
      } else {
        toggleButton = page.locator('button[aria-label*="Database Mode"], button[aria-label*="AI Mode"]').first();
      }

      if (!toggleButton) {
        ciWarn('Toggle mode: no toggle button reference found');
        test.skip();
        return;
      }

      const isVisible = await toggleButton.isVisible().catch(() => false);
      if (!isVisible) {
        ciWarn('Toggle mode: toggle button not visible in viewport');
        test.skip();
        return;
      }

      // Skip if button is disabled (no API key — can't toggle modes)
      const isDisabled = await toggleButton.evaluate(el => el.classList.contains('opacity-50') || el.classList.contains('cursor-not-allowed'));
      if (isDisabled) {
        ciWarn('Toggle mode: button disabled — VITE_GEMINI_API_KEY missing (required to switch between DB/AI modes)');
        test.skip();
        return;
      }

      // Capture initial state via aria-label (desktop) or text content (mobile)
      const initialLabel = await toggleButton.getAttribute('aria-label');
      const initialText = await toggleButton.textContent();
      await toggleButton.click();

      if (initialLabel) {
        // Desktop: wait for aria-label to change
        await expect(toggleButton).not.toHaveAttribute('aria-label', initialLabel, { timeout: 3000 });
      } else {
        // Mobile: wait for text content to change (e.g., "قاعدة البيانات" ↔ "الذكاء الاصطناعي")
        await expect(async () => {
          const newText = await toggleButton.textContent();
          expect(newText).not.toBe(initialText);
        }).toPass({ timeout: 3000 });
      }
    });

    test('should show correct icon for each mode', async ({ page, isMobile }) => {
      if (isMobile) {
        test.skip();
      }

      const toggleButton = page.locator('button[aria-label*="Database Mode"], button[aria-label*="AI Mode"]').first();
      await expect(toggleButton).toBeVisible();

      const iconExists = await toggleButton.locator('svg').count() > 0;
      expect(iconExists).toBe(true);
    });
  });

  // NOTE: The app currently logs DB errors to the debug panel but does not display
  // a user-facing error banner. These tests verify the app doesn't crash on fetch
  // failures and remains functional. Error banner UI is planned for a future release.
  test.describe('Error Handling', () => {
    test('should remain functional when backend fetch fails', async ({ page, context }) => {
      const dbEnabled = await enableDatabaseMode(page);
      if (!dbEnabled) {
        ciWarn('Error handling: could not enable DB mode (API key missing or toggle disabled)');
        test.skip();
        return;
      }

      // Abort all poem API calls
      await context.route('**/api/poems/**', route => route.abort('failed'));

      const fetchButton = page.locator('button[aria-label="Discover new poem"]').first();
      await expect(fetchButton).toBeEnabled();
      await fetchButton.click();

      // App should remain functional — discover button re-enables after the failed fetch
      await expect(fetchButton).toBeEnabled({ timeout: 5000 });

      // Arabic text should still be visible (previous poem stays)
      await expect(page.locator('[dir="rtl"]').first()).toBeVisible();
    });

    test('should recover after a failed fetch', async ({ page, context }) => {
      const dbEnabled = await enableDatabaseMode(page);
      if (!dbEnabled) {
        ciWarn('Error recovery: could not enable DB mode (API key missing or toggle disabled)');
        test.skip();
        return;
      }

      let failCount = 0;

      // First call fails, second call succeeds
      await context.route('**/api/poems/**', route => {
        if (failCount === 0) {
          failCount++;
          route.abort('failed');
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 999,
              poet: 'Test Poet',
              poetArabic: 'شاعر تجريبي',
              title: 'Test Poem',
              titleArabic: 'قصيدة تجريبية',
              arabic: 'بيت أول\nبيت ثاني',
              english: 'First verse\nSecond verse',
              tags: ['Test']
            })
          });
        }
      });

      const fetchButton = page.locator('button[aria-label="Discover new poem"]').first();

      // First fetch fails
      await expect(fetchButton).toBeEnabled();
      await fetchButton.click();
      await expect(fetchButton).toBeEnabled({ timeout: 5000 });

      // Second fetch succeeds — app should show the new poem
      await fetchButton.click();
      await expect(page.locator('text=شاعر تجريبي').first()).toBeVisible({ timeout: 5000 });
    });
  });
});

// ─── Group 2: Tests that need a real backend (skipped in CI) ───

test.describe('Database Integration — Live Backend', () => {
  test.beforeEach(async ({ page }) => {
    if (isCI) {
      ciWarn('Live Backend tests skipped in CI — requires real database with production schema');
      test.skip();
    }
    await waitForAppReady(page);
  });

  test.describe('Database Mode Poem Fetching', () => {
    test('should fetch poem in database mode', async ({ page, isMobile }) => {
      await expect(page.locator('footer')).toBeVisible();

      // Try to enable database mode
      if (isMobile) {
        const moreButton = page.locator('button[aria-label="More options"]').first();
        const moreButtonVisible = await moreButton.isVisible().catch(() => false);

        if (moreButtonVisible) {
          await moreButton.click();

          const dbToggle = page.locator('button:has-text("قاعدة البيانات")').first();
          const dbToggleVisible = await dbToggle.isVisible().catch(() => false);

          if (dbToggleVisible) {
            await dbToggle.click();
          }
        }
      } else {
        await enableDatabaseMode(page);
      }

      // Get current poem
      const initialPoem = await page.locator('[dir="rtl"]').first().textContent();

      // Click discover button
      const fetchButton = page.locator('button[aria-label="Discover new poem"]').first();
      await expect(fetchButton).toBeEnabled({ timeout: 10000 });
      await fetchButton.click();

      // Wait for the discover button to be enabled again (fetch complete)
      await expect(fetchButton).toBeEnabled({ timeout: 10000 });

      // Either poem changed or error banner appeared
      const newPoem = await page.locator('[dir="rtl"]').first().textContent();
      const errorBanner = await page.locator('[data-testid="error-banner"]').count();

      expect(newPoem !== initialPoem || errorBanner > 0).toBe(true);
    });

    test('should display line breaks correctly in database poems', async ({ page }) => {
      const poemText = page.locator('[dir="rtl"]').first();
      await expect(poemText).toBeVisible();

      const poemHTML = await poemText.innerHTML();

      // Database poems should have line breaks (not * characters)
      expect(poemHTML).not.toContain('*');
    });
  });

  test.describe('Poet Filtering in Database Mode', () => {
    test('should respect poet filter when fetching from database', async ({ page, isMobile }) => {
      if (isMobile) {
        test.skip();
      }

      await enableDatabaseMode(page);

      // Try to select a specific poet category
      const categoryButton = page.locator('button').filter({ hasText: /نزار قباني/ }).first();
      const categoryVisible = await categoryButton.isVisible().catch(() => false);

      if (categoryVisible) {
        await categoryButton.click();

        // Fetch a poem
        const fetchButton = page.locator('button[aria-label="Discover new poem"]').first();
        await expect(fetchButton).toBeEnabled({ timeout: 10000 });
        await fetchButton.click();

        // Wait for fetch to complete
        await expect(fetchButton).toBeEnabled({ timeout: 10000 });

        // Check if poet name appears in the poem (if backend is running)
        const poetText = page.locator('text=/نزار قباني/').first();
        const hasPoetText = await poetText.isVisible().catch(() => false);

        // Either poem matches poet or error occurred (backend down)
        const errorBanner = await page.locator('[data-testid="error-banner"]').count();
        expect(hasPoetText || errorBanner > 0).toBe(true);
      }
    });
  });
});
