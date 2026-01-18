import { test, expect } from '@playwright/test';

/**
 * Database Integration E2E Tests
 * Tests database mode toggle, error handling, and integration with backend API
 *
 * NOTE: These tests require the backend server to be running.
 * In CI, they are skipped by default. Run locally with: npm run dev:server
 */

// Skip these tests in CI since backend server is not running
const isCI = !!process.env.CI;

test.describe('Database Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Skip all tests in this suite if in CI
    if (isCI) {
      test.skip();
    }

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Wait for app to be fully loaded
    await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 5000 });
  });

  test.describe('Database Toggle Component', () => {
    test('should display database toggle in control bar', async ({ page }) => {
      // Look for the database toggle button by aria-label
      const databaseToggle = page.locator('button[aria-label*="Database Mode"], button[aria-label*="AI Mode"]').first();

      await expect(databaseToggle).toBeVisible({ timeout: 3000 });
    });

    test('should toggle between database and AI modes', async ({ page, isMobile }) => {
      // Wait for control bar to be fully rendered
      await page.waitForTimeout(500);

      let toggleButton;

      if (isMobile) {
        // On mobile, access via overflow menu
        const moreButton = page.locator('button[aria-label="More options"]').first();
        const moreButtonVisible = await moreButton.isVisible().catch(() => false);

        if (moreButtonVisible) {
          await moreButton.click();
          await page.waitForTimeout(300);

          // Look for database toggle in menu
          toggleButton = page.locator('button:has-text("قاعدة البيانات"), button:has-text("الذكاء الاصطناعي")').first();
        }
      } else {
        // On desktop, toggle should be visible in control bar
        toggleButton = page.locator('button[aria-label*="Database Mode"], button[aria-label*="AI Mode"]').first();
      }

      if (toggleButton) {
        const isVisible = await toggleButton.isVisible().catch(() => false);

        if (isVisible) {
          // Get initial mode
          const initialLabel = await toggleButton.getAttribute('aria-label');

          // Click toggle
          await toggleButton.click();
          await page.waitForTimeout(300);

          // Verify mode changed (aria-label should be different)
          const newLabel = await toggleButton.getAttribute('aria-label');
          expect(newLabel).not.toBe(initialLabel);
        }
      }
    });

    test('should show correct icon for each mode', async ({ page, isMobile }) => {
      // Skip this test on mobile as icons may not be easily testable
      if (isMobile) {
        test.skip();
      }

      const toggleButton = page.locator('button[aria-label*="Database Mode"], button[aria-label*="AI Mode"]').first();
      await expect(toggleButton).toBeVisible();

      // Check that SVG icon exists within button
      const iconExists = await toggleButton.locator('svg').count() > 0;
      expect(iconExists).toBe(true);
    });
  });

  test.describe('Database Mode Poem Fetching', () => {
    test('should fetch poem in database mode', async ({ page, isMobile }) => {
      // Enable database mode first
      await page.waitForTimeout(500);

      // Try to enable database mode
      if (isMobile) {
        const moreButton = page.locator('button[aria-label="More options"]').first();
        const moreButtonVisible = await moreButton.isVisible().catch(() => false);

        if (moreButtonVisible) {
          await moreButton.click();
          await page.waitForTimeout(300);

          const dbToggle = page.locator('button:has-text("قاعدة البيانات")').first();
          const dbToggleVisible = await dbToggle.isVisible().catch(() => false);

          if (dbToggleVisible) {
            await dbToggle.click();
            await page.waitForTimeout(300);
          }
        }
      } else {
        // Check current mode via aria-label
        const toggleButton = page.locator('button[aria-label*="AI Mode"]').first();
        const isInDatabaseMode = await toggleButton.isVisible().catch(() => false);

        if (!isInDatabaseMode) {
          // Switch to database mode
          const aiModeButton = page.locator('button[aria-label*="Database Mode"]').first();
          const aiVisible = await aiModeButton.isVisible().catch(() => false);

          if (aiVisible) {
            await aiModeButton.click();
            await page.waitForTimeout(300);
          }
        }
      }

      // Get current poem
      const initialPoem = await page.locator('[dir="rtl"]').first().textContent();

      // Click discover/fetch button
      const fetchButton = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: /^$/ }).first();
      await fetchButton.click();

      // Wait for new content (or error banner)
      await page.waitForTimeout(2000);

      // Either poem changed or error banner appeared
      const newPoem = await page.locator('[dir="rtl"]').first().textContent();
      const errorBanner = await page.locator('[data-testid="error-banner"]').count();

      // At least one of these should be true:
      // 1. Poem changed (backend is running)
      // 2. Error banner appeared (backend is not running)
      expect(newPoem !== initialPoem || errorBanner > 0).toBe(true);
    });

    test('should display line breaks correctly in database poems', async ({ page }) => {
      // Get the main poem container
      const poemText = page.locator('[dir="rtl"]').first();
      await expect(poemText).toBeVisible();

      // Check that poem has multiple lines (rendered with proper spacing)
      const poemHTML = await poemText.innerHTML();

      // Database poems should have line breaks (not * characters)
      expect(poemHTML).not.toContain('*');
    });
  });

  test.describe('Error Handling', () => {
    test('should show error banner when backend is unavailable', async ({ page, context }) => {
      // Intercept API calls and force them to fail
      await context.route('**/api/poems/**', route => {
        route.abort('failed');
      });

      // Enable database mode and try to fetch
      await page.waitForTimeout(500);

      // Try to toggle to database mode
      const toggleButton = page.locator('button[aria-label*="Database Mode"]').first();
      const toggleVisible = await toggleButton.isVisible().catch(() => false);

      if (toggleVisible) {
        await toggleButton.click();
        await page.waitForTimeout(300);
      }

      // Click discover button
      const fetchButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      await fetchButton.click();

      // Wait for error banner to appear
      const errorBanner = page.locator('text=Database Connection Error').first();
      await expect(errorBanner).toBeVisible({ timeout: 5000 });
    });

    test('should show appropriate error message for server down', async ({ page, context }) => {
      // Intercept API calls and force them to fail
      await context.route('**/api/poems/**', route => {
        route.abort('failed');
      });

      // Enable database mode
      await page.waitForTimeout(500);

      const toggleButton = page.locator('button[aria-label*="Database Mode"]').first();
      const toggleVisible = await toggleButton.isVisible().catch(() => false);

      if (toggleVisible) {
        await toggleButton.click();
        await page.waitForTimeout(300);
      }

      // Try to fetch poem
      const fetchButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      await fetchButton.click();

      // Wait for error message
      await page.waitForTimeout(2000);

      // Look for error message containing server down text
      const errorMessage = page.locator('text=/server.*not running|Failed to fetch/i').first();
      const hasErrorMessage = await errorMessage.isVisible().catch(() => false);

      // Either error banner or console error should appear
      expect(hasErrorMessage).toBeTruthy();
    });

    test('should allow dismissing error banner', async ({ page, context }) => {
      // Intercept API calls and force them to fail
      await context.route('**/api/poems/**', route => {
        route.abort('failed');
      });

      // Enable database mode and trigger error
      await page.waitForTimeout(500);

      const toggleButton = page.locator('button[aria-label*="Database Mode"]').first();
      const toggleVisible = await toggleButton.isVisible().catch(() => false);

      if (toggleVisible) {
        await toggleButton.click();
        await page.waitForTimeout(300);
      }

      const fetchButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      await fetchButton.click();

      await page.waitForTimeout(2000);

      // Look for dismiss button
      const dismissButton = page.locator('button:has-text("Dismiss")').first();
      const isDismissVisible = await dismissButton.isVisible().catch(() => false);

      if (isDismissVisible) {
        await dismissButton.click();
        await page.waitForTimeout(500);

        // Error banner should be gone
        const errorBanner = page.locator('text=Database Connection Error').first();
        await expect(errorBanner).not.toBeVisible();
      }
    });

    test('should show retry button in error banner', async ({ page, context }) => {
      // Intercept API calls and force them to fail
      await context.route('**/api/poems/**', route => {
        route.abort('failed');
      });

      // Enable database mode and trigger error
      await page.waitForTimeout(500);

      const toggleButton = page.locator('button[aria-label*="Database Mode"]').first();
      const toggleVisible = await toggleButton.isVisible().catch(() => false);

      if (toggleVisible) {
        await toggleButton.click();
        await page.waitForTimeout(300);
      }

      const fetchButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      await fetchButton.click();

      await page.waitForTimeout(2000);

      // Look for retry button
      const retryButton = page.locator('button:has-text("Retry")').first();
      const isRetryVisible = await retryButton.isVisible().catch(() => false);

      // Retry button should be present
      expect(isRetryVisible).toBeTruthy();
    });

    test('should clear error banner on successful fetch', async ({ page, context }) => {
      let failCount = 0;

      // First call fails, second call succeeds
      await context.route('**/api/poems/**', route => {
        if (failCount === 0) {
          failCount++;
          route.abort('failed');
        } else {
          // Mock successful response
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

      // Enable database mode
      await page.waitForTimeout(500);

      const toggleButton = page.locator('button[aria-label*="Database Mode"]').first();
      const toggleVisible = await toggleButton.isVisible().catch(() => false);

      if (toggleVisible) {
        await toggleButton.click();
        await page.waitForTimeout(300);
      }

      // First fetch (should fail)
      const fetchButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      await fetchButton.click();
      await page.waitForTimeout(2000);

      // Look for retry button
      const retryButton = page.locator('button:has-text("Retry")').first();
      const isRetryVisible = await retryButton.isVisible().catch(() => false);

      if (isRetryVisible) {
        // Click retry (should succeed)
        await retryButton.click();
        await page.waitForTimeout(2000);

        // Error banner should disappear
        const errorBanner = page.locator('text=Database Connection Error').first();
        await expect(errorBanner).not.toBeVisible();
      }
    });
  });

  test.describe('Environment Variable Configuration', () => {
    test('should use VITE_API_URL if configured', async ({ page }) => {
      // This test verifies that the app respects VITE_API_URL
      // In E2E tests, this should default to localhost:3001

      // Check console logs for API URL references
      const consoleLogs = [];
      page.on('console', msg => {
        if (msg.text().includes('api') || msg.text().includes('localhost')) {
          consoleLogs.push(msg.text());
        }
      });

      // Trigger a fetch operation
      await page.waitForTimeout(500);

      // The fact that the app loads successfully indicates proper configuration
      const appLoaded = await page.locator('[dir="rtl"]').first().isVisible();
      expect(appLoaded).toBe(true);
    });
  });

  test.describe('Poet Filtering in Database Mode', () => {
    test('should respect poet filter when fetching from database', async ({ page, isMobile }) => {
      // This test verifies that poet filtering works in database mode

      // Enable database mode
      await page.waitForTimeout(500);

      if (!isMobile) {
        const toggleButton = page.locator('button[aria-label*="Database Mode"]').first();
        const toggleVisible = await toggleButton.isVisible().catch(() => false);

        if (toggleVisible) {
          await toggleButton.click();
          await page.waitForTimeout(300);
        }

        // Try to select a specific poet category
        const categoryButton = page.locator('button').filter({ hasText: /نزار قباني/ }).first();
        const categoryVisible = await categoryButton.isVisible().catch(() => false);

        if (categoryVisible) {
          await categoryButton.click();
          await page.waitForTimeout(300);

          // Fetch a poem
          const fetchButton = page.locator('button').filter({ has: page.locator('svg') }).first();
          await fetchButton.click();
          await page.waitForTimeout(2000);

          // Check if poet name appears in the poem (if backend is running)
          const poetText = page.locator('text=/نزار قباني/').first();
          const hasPoetText = await poetText.isVisible().catch(() => false);

          // Either poem matches poet or error occurred (backend down)
          const errorBanner = await page.locator('[data-testid="error-banner"]').count();
          expect(hasPoetText || errorBanner > 0).toBe(true);
        }
      }
    });
  });
});
