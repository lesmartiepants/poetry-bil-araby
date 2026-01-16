import { test, expect } from '@playwright/test';

test.describe('Cinematic Splash Screen (5e)', () => {
  test('displays on first load', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Wait for React hydration

    // Check for splash screen headline
    await expect(page.locator('text="Where Words Transcend Time"')).toBeVisible({ timeout: 10000 });

    // Check for Arabic complement
    await expect(page.locator('text="حيث تتجاوز الكلمات الزمن"')).toBeVisible();

    // Check for CTA button
    await expect(page.locator('text="Enter the Collection"')).toBeVisible();

    // Check for logo
    await expect(page.locator('text="poetry"')).toBeVisible();
    await expect(page.locator('text="بالعربي"')).toBeVisible();
  });

  test('theme toggle works on splash', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for splash
    await expect(page.locator('text="Where Words Transcend Time"')).toBeVisible({ timeout: 5000 });

    // Get theme toggle button (should be top-right)
    const themeToggle = page.locator('button').first();

    // Click to toggle theme
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Verify splash is still visible
    await expect(page.locator('text="Where Words Transcend Time"')).toBeVisible();
  });

  test('"Enter the Collection" button dismisses splash', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for splash
    await expect(page.locator('text="Where Words Transcend Time"')).toBeVisible({ timeout: 5000 });

    // Click "Enter the Collection" button
    await page.locator('text="Enter the Collection"').click();
    await page.waitForTimeout(500);

    // Splash should be gone, main app should appear
    await expect(page.locator('text="Where Words Transcend Time"')).not.toBeVisible();

    // Check for main app content (poem or controls)
    const mainAppVisible = await page.locator('footer button').first().isVisible();
    expect(mainAppVisible).toBe(true);
  });

  test('can be bypassed with skipSplash parameter', async ({ page }) => {
    await page.goto('/?skipSplash=true');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Splash should NOT appear
    const splashVisible = await page.locator('text="Where Words Transcend Time"').isVisible().catch(() => false);
    expect(splashVisible).toBe(false);

    // Main app should be visible immediately
    const mainAppVisible = await page.locator('footer button').first().isVisible();
    expect(mainAppVisible).toBe(true);
  });

  test('is mobile responsive', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Splash should display correctly on mobile
    await expect(page.locator('text="Where Words Transcend Time"')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text="Enter the Collection"')).toBeVisible();

    // Button should be touch-accessible (44x44px minimum)
    const button = page.locator('text="Enter the Collection"');
    const box = await button.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
  });
});
