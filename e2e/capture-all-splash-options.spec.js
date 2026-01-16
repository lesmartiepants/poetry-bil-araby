import { test } from '@playwright/test';

/**
 * Visual Review - Capture All Splash Options
 * Captures all 9 splash screen options in both dark and light modes
 */

const SPLASH_OPTIONS = [
  { id: 'particles', name: 'Particle Field', wait: 3000 },
  { id: 'constellation', name: 'Constellation Poetry', wait: 3000 },
  { id: 'mandala', name: 'Breathing Mandala', wait: 4000 },
  { id: 'geometric', name: 'Geometric Patterns', wait: 3000 },
  { id: 'zen', name: 'Zen Minimalism', wait: 2500 },
  { id: 'aurora', name: 'Aurora Light', wait: 3000 },
  { id: 'ink', name: 'Ink Calligraphy', wait: 3000 },
  { id: 'manuscript', name: 'Ancient Manuscript', wait: 3000 },
  { id: 'light', name: 'Light & Shadow', wait: 3000 },
];

// Capture all splash options in dark mode
for (const option of SPLASH_OPTIONS) {
  test(`capture ${option.name} - dark mode`, async ({ page }) => {
    // Navigate to app with specific splash option
    await page.goto(`/?mockup=${option.id}&skipSplash=false`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for splash to render
    await page.locator('text=بالعربي').first().waitFor({ timeout: 10000 });

    // Let animations settle
    await page.waitForTimeout(option.wait);

    await page.screenshot({
      path: `mockups/splash-${option.id}-dark.png`,
      fullPage: true
    });
    console.log(`✓ Captured ${option.name} (dark mode)`);
  });
}

// Capture all splash options in light mode
for (const option of SPLASH_OPTIONS) {
  test(`capture ${option.name} - light mode`, async ({ page }) => {
    // Navigate to app with specific splash option
    await page.goto(`/?mockup=${option.id}&skipSplash=false`);
    await page.waitForLoadState('domcontentloaded');

    // Wait for splash to render
    await page.locator('text=بالعربي').first().waitFor({ timeout: 10000 });

    // Click theme toggle to switch to light mode
    const themeToggle = page.locator('button').filter({ has: page.locator('svg') }).first();
    await themeToggle.click();

    // Let animations settle
    await page.waitForTimeout(option.wait);

    await page.screenshot({
      path: `mockups/splash-${option.id}-light.png`,
      fullPage: true
    });
    console.log(`✓ Captured ${option.name} (light mode)`);
  });
}

// Summary test that runs last
test('summary of all captured splash options', async () => {
  console.log('\n=================================');
  console.log('✓ All splash option screenshots captured!');
  console.log('\nDark Mode:');
  SPLASH_OPTIONS.forEach(opt => {
    console.log(`  - mockups/splash-${opt.id}-dark.png (${opt.name})`);
  });
  console.log('\nLight Mode:');
  SPLASH_OPTIONS.forEach(opt => {
    console.log(`  - mockups/splash-${opt.id}-light.png (${opt.name})`);
  });
  console.log(`\nTotal: ${SPLASH_OPTIONS.length * 2} screenshots`);
  console.log('=================================\n');
});
