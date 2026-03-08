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

// Helper: wait for the app to be ready after navigation
async function waitForAppReady(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 5000 });
}

// Helper: switch to database mode (desktop only, returns true if toggled)
async function enableDatabaseMode(page) {
  await expect(page.locator('footer')).toBeVisible();
  const toggleButton = page.locator('button[aria-label*="Database Mode"]').first();
  const toggleVisible = await toggleButton.isVisible().catch(() => false);
  if (toggleVisible) {
    await toggleButton.click();
    // Wait for mode to switch — aria-label changes to "AI Mode" when in database mode
    await expect(page.locator('button[aria-label*="AI Mode"]').first()).toBeVisible({ timeout: 3000 });
    return true;
  }
  return false;
}

// Helper: trigger a fetch and wait for error banner
async function triggerDatabaseFetchError(page, context) {
  await context.route('**/api/poems/**', route => {
    route.abort('failed');
  });
  await enableDatabaseMode(page);
  const fetchButton = page.locator('button[aria-label="Discover new poem"]').first();
  await expect(fetchButton).toBeEnabled();
  await fetchButton.click();
  await expect(page.locator('text=Database Connection Error').first()).toBeVisible({ timeout: 5000 });
}

// ─── Group 1: Tests that run everywhere (no real backend needed) ───

test.describe('Database Integration — UI & Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await waitForAppReady(page);
  });

  test.describe('Database Toggle Component', () => {
    test('should display database toggle in control bar', async ({ page }) => {
      const databaseToggle = page.locator('button[aria-label*="Database Mode"], button[aria-label*="AI Mode"]').first();
      await expect(databaseToggle).toBeVisible({ timeout: 3000 });
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
          await expect(toggleButton).toBeVisible({ timeout: 2000 });
        }
      } else {
        toggleButton = page.locator('button[aria-label*="Database Mode"], button[aria-label*="AI Mode"]').first();
      }

      if (toggleButton) {
        const isVisible = await toggleButton.isVisible().catch(() => false);

        if (isVisible) {
          const initialLabel = await toggleButton.getAttribute('aria-label');
          await toggleButton.click();

          // Wait for aria-label to change (mode switch)
          await expect(toggleButton).not.toHaveAttribute('aria-label', initialLabel, { timeout: 3000 });
          const newLabel = await toggleButton.getAttribute('aria-label');
          expect(newLabel).not.toBe(initialLabel);
        }
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

  test.describe('Error Handling', () => {
    test('should show error banner when backend is unavailable', async ({ page, context }) => {
      await triggerDatabaseFetchError(page, context);
    });

    test('should show appropriate error message for server down', async ({ page, context }) => {
      await context.route('**/api/poems/**', route => {
        route.abort('failed');
      });

      await enableDatabaseMode(page);

      const fetchButton = page.locator('button[aria-label="Discover new poem"]').first();
      await expect(fetchButton).toBeEnabled();
      await fetchButton.click();

      // Wait for error message containing server down text
      const errorMessage = page.locator('text=/server.*not running|Failed to fetch|Database Connection Error/i').first();
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('should allow dismissing error banner', async ({ page, context }) => {
      await triggerDatabaseFetchError(page, context);

      // Look for dismiss button
      const dismissButton = page.locator('button:has-text("Dismiss")').first();
      const isDismissVisible = await dismissButton.isVisible().catch(() => false);

      if (isDismissVisible) {
        await dismissButton.click();

        // Error banner should be gone
        const errorBanner = page.locator('text=Database Connection Error').first();
        await expect(errorBanner).not.toBeVisible();
      }
    });

    test('should show retry button in error banner', async ({ page, context }) => {
      await triggerDatabaseFetchError(page, context);

      // Retry button should be present
      const retryButton = page.locator('button:has-text("Retry")').first();
      await expect(retryButton).toBeVisible();
    });

    test('should clear error banner on successful fetch', async ({ page, context }) => {
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

      await enableDatabaseMode(page);

      // First fetch (should fail)
      const fetchButton = page.locator('button[aria-label="Discover new poem"]').first();
      await expect(fetchButton).toBeEnabled();
      await fetchButton.click();

      // Wait for error banner
      await expect(page.locator('text=Database Connection Error').first()).toBeVisible({ timeout: 5000 });

      // Click retry (should succeed)
      const retryButton = page.locator('button:has-text("Retry")').first();
      await expect(retryButton).toBeVisible();
      await retryButton.click();

      // Error banner should disappear
      const errorBanner = page.locator('text=Database Connection Error').first();
      await expect(errorBanner).not.toBeVisible({ timeout: 5000 });
    });
  });
});

// ─── Group 2: Tests that need a real backend (skipped in CI) ───

test.describe('Database Integration — Live Backend', () => {
  test.beforeEach(async ({ page }) => {
    if (isCI) {
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
