// Capture Round 6 variations (6a-6f) - Creative exploration
import { chromium } from 'playwright';

const variations = ['6a', '6b', '6c', '6d', '6e', '6f'];

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const variation of variations) {
    console.log(`\nCapturing Round 6 variation ${variation}...`);

    const page = await browser.newPage();

    // Navigate with mockup parameter
    await page.goto(`http://localhost:5177?mockup=${variation}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500); // Extra time for animations/gradients

    // Capture dark mode
    console.log(`  - ${variation} (dark mode)`);
    await page.screenshot({
      path: `mockups/round6/${variation}-dark.png`,
      fullPage: true
    });

    // Toggle to light mode
    const themeToggle = page.locator('button').first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Capture light mode
    console.log(`  - ${variation} (light mode)`);
    await page.screenshot({
      path: `mockups/round6/${variation}-light.png`,
      fullPage: true
    });

    await page.close();
  }

  console.log('\n✅ All Round 6 variations captured!');
  console.log('\nFiles created in mockups/round6/:');
  variations.forEach(v => {
    console.log(`  - ${v}-dark.png`);
    console.log(`  - ${v}-light.png`);
  });

  await browser.close();
})();
