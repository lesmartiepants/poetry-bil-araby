import { test } from '@playwright/test';

/**
 * Visual Review - Capture Mandala Splash Screen
 * Captures the breathing mandala splash in both dark and light modes
 */

test('capture mandala splash - dark mode', async ({ page }) => {
  // Navigate to app with mandala mockup
  await page.goto('/?mockup=mandala&skipSplash=false');
  await page.waitForLoadState('domcontentloaded');

  // Wait for mandala to render
  await page.locator('text=بالعربي').first().waitFor({ timeout: 10000 });

  // Let animations settle and cycle once
  await page.waitForTimeout(4000); // Wait for one breathing cycle

  await page.screenshot({
    path: 'mockups/splash-mandala-dark.png',
    fullPage: true
  });
  console.log('✓ Captured mandala splash (dark mode)');
});

test('capture mandala splash - light mode', async ({ page }) => {
  // Navigate to app with mandala mockup
  await page.goto('/?mockup=mandala&skipSplash=false');
  await page.waitForLoadState('domcontentloaded');

  // Wait for mandala to render
  await page.locator('text=بالعربي').first().waitFor({ timeout: 10000 });

  // Click theme toggle to switch to light mode
  const themeToggle = page.locator('button').filter({ has: page.locator('svg') }).first();
  await themeToggle.click();

  // Let animations settle and cycle once
  await page.waitForTimeout(4000); // Wait for one breathing cycle

  await page.screenshot({
    path: 'mockups/splash-mandala-light.png',
    fullPage: true
  });
  console.log('✓ Captured mandala splash (light mode)');
});

test('capture mandala splash - mid-animation', async ({ page }) => {
  // Navigate to app with mandala mockup
  await page.goto('/?mockup=mandala&skipSplash=false');
  await page.waitForLoadState('domcontentloaded');

  // Wait for mandala to render
  await page.locator('text=بالعربي').first().waitFor({ timeout: 10000 });

  // Wait for middle of breathing cycle for maximum expansion
  await page.waitForTimeout(6000); // Wait 6 seconds (mid-cycle of 8s outer animation)

  await page.screenshot({
    path: 'mockups/splash-mandala-expanded.png',
    fullPage: true
  });
  console.log('✓ Captured mandala splash (expanded state)');

  console.log('\n=================================');
  console.log('✓ All mandala screenshots captured!');
  console.log('  - mockups/splash-mandala-dark.png');
  console.log('  - mockups/splash-mandala-light.png');
  console.log('  - mockups/splash-mandala-expanded.png');
  console.log('=================================\n');
});
