import { test, expect } from '@playwright/test';

/**
 * Visual Review - Single Flow
 * Captures all screens in one continuous test
 */

test('capture complete splash and walkthrough flow', async ({ page }) => {
  // Step 1: Capture splash screen
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('text=بالعربي').first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(1500); // Let animations settle

  await page.screenshot({
    path: 'visual-splash-screen.png',
    fullPage: true
  });
  console.log('✓ Captured splash screen');

  // Step 2: Click begin and capture walkthrough step 1
  const beginButton = page.locator('button:has-text("Begin Journey")');
  await beginButton.waitFor({ timeout: 10000 });
  await beginButton.click();
  await page.waitForTimeout(1200);

  await page.locator('text=Welcome to Poetry Bil-Araby').waitFor({ timeout: 10000 });
  await page.screenshot({
    path: 'visual-walkthrough-step1.png',
    fullPage: true
  });
  console.log('✓ Captured walkthrough step 1');

  // Step 3: Click next and capture step 2
  await page.locator('button:has-text("Next")').click();
  await page.waitForTimeout(1000);

  await page.locator('text=Navigate Through Poems').waitFor({ timeout: 10000 });
  await page.screenshot({
    path: 'visual-walkthrough-step2.png',
    fullPage: true
  });
  console.log('✓ Captured walkthrough step 2');

  // Step 4: Click next and capture step 3
  await page.locator('button:has-text("Next")').click();
  await page.waitForTimeout(1000);

  await page.locator('text=Listen to Poetry').waitFor({ timeout: 10000 });
  await page.screenshot({
    path: 'visual-walkthrough-step3.png',
    fullPage: true
  });
  console.log('✓ Captured walkthrough step 3');

  // Step 5: Click next and capture step 4
  await page.locator('button:has-text("Next")').click();
  await page.waitForTimeout(1000);

  await page.locator('text=Discover Hidden Meanings').waitFor({ timeout: 10000 });
  await page.screenshot({
    path: 'visual-walkthrough-step4.png',
    fullPage: true
  });
  console.log('✓ Captured walkthrough step 4');

  // Step 6: Click start exploring and capture main app
  await page.locator('button:has-text("Start Exploring")').click();
  await page.waitForTimeout(1500);

  await page.locator('text=poetry').waitFor({ timeout: 10000 });
  await page.screenshot({
    path: 'visual-main-app.png',
    fullPage: true
  });
  console.log('✓ Captured main app');

  console.log('\n=================================');
  console.log('✓ All screenshots captured successfully!');
  console.log('=================================\n');
});
