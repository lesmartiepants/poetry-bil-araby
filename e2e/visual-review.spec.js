import { test, expect } from '@playwright/test';

/**
 * Visual Review - Splash Screen & Walkthrough Design
 * Captures screenshots for UX review
 */

test.describe('Visual Review - Splash & Walkthrough', () => {
  test('capture splash screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for splash screen to be visible
    await page.locator('text=بالعربي').first().waitFor();
    await page.waitForTimeout(1000); // Let animations settle

    // Capture full splash screen
    await page.screenshot({
      path: 'visual-review-splash.png',
      fullPage: true
    });

    console.log('✓ Captured splash screen');
  });

  test('capture walkthrough - step 1', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for splash to load and click "Begin Journey" button
    const beginButton = page.locator('button:has-text("ابدأ الرحلة")');
    await beginButton.waitFor({ timeout: 15000 });
    await beginButton.click();
    await page.waitForTimeout(1000); // Let animations settle

    // Should see first walkthrough step
    await page.locator('text=مرحباً بك في ديوان الشعر العربي').waitFor({ timeout: 10000 });

    // Capture walkthrough step 1
    await page.screenshot({
      path: 'visual-review-walkthrough-step1.png',
      fullPage: true
    });

    console.log('✓ Captured walkthrough step 1');
  });

  test('capture walkthrough - step 2', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Click through to walkthrough
    const beginButton = page.locator('button:has-text("ابدأ الرحلة")');
    await beginButton.waitFor({ timeout: 15000 });
    await beginButton.click();
    await page.waitForTimeout(800);

    // Click next to step 2
    await page.locator('button:has-text("التالي")').click();
    await page.waitForTimeout(1000);

    // Should see step 2
    await page.locator('text=تجوّل في رحاب الشعر').waitFor({ timeout: 10000 });

    // Capture walkthrough step 2
    await page.screenshot({
      path: 'visual-review-walkthrough-step2.png',
      fullPage: true
    });

    console.log('✓ Captured walkthrough step 2');
  });

  test('capture walkthrough - step 3', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Click through to walkthrough
    const beginButton = page.locator('button:has-text("ابدأ الرحلة")');
    await beginButton.waitFor({ timeout: 15000 });
    await beginButton.click();
    await page.waitForTimeout(800);

    // Click next twice to step 3
    await page.locator('button:has-text("التالي")').click();
    await page.waitForTimeout(600);
    await page.locator('button:has-text("التالي")').click();
    await page.waitForTimeout(1000);

    // Should see step 3
    await page.locator('text=استمع إلى أنغام القصيد').waitFor({ timeout: 10000 });

    // Capture walkthrough step 3
    await page.screenshot({
      path: 'visual-review-walkthrough-step3.png',
      fullPage: true
    });

    console.log('✓ Captured walkthrough step 3');
  });

  test('capture walkthrough - step 4', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Click through to walkthrough
    const beginButton = page.locator('button:has-text("ابدأ الرحلة")');
    await beginButton.waitFor({ timeout: 15000 });
    await beginButton.click();
    await page.waitForTimeout(800);

    // Click next three times to step 4
    await page.locator('button:has-text("التالي")').click();
    await page.waitForTimeout(600);
    await page.locator('button:has-text("التالي")').click();
    await page.waitForTimeout(600);
    await page.locator('button:has-text("التالي")').click();
    await page.waitForTimeout(1000);

    // Should see step 4
    await page.locator('text=اكتشف المعاني الخفية').waitFor({ timeout: 10000 });

    // Capture walkthrough step 4
    await page.screenshot({
      path: 'visual-review-walkthrough-step4.png',
      fullPage: true
    });

    console.log('✓ Captured walkthrough step 4');
  });

  test('capture main app after walkthrough', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Click through to walkthrough
    const beginButton = page.locator('button:has-text("ابدأ الرحلة")');
    await beginButton.waitFor({ timeout: 15000 });
    await beginButton.click();
    await page.waitForTimeout(800);

    // Click through all steps
    for (let i = 0; i < 3; i++) {
      await page.locator('button:has-text("التالي")').click();
      await page.waitForTimeout(600);
    }

    // Click final "Start Exploring" button
    await page.locator('button:has-text("ابدأ الاستكشاف")').click();
    await page.waitForTimeout(1000);

    // Should now see main app
    await page.locator('text=poetry').waitFor({ timeout: 10000 });

    // Capture main app
    await page.screenshot({
      path: 'visual-review-main-app.png',
      fullPage: true
    });

    console.log('✓ Captured main app');
  });
});
