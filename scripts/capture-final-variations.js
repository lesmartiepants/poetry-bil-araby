// Capture final Arabian variations (4a, 4b, 4c)
import { chromium } from 'playwright';

const variations = ['4a', '4b', '4c'];

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const variation of variations) {
    console.log(`\nCapturing Final variation ${variation}...`);

    const page = await browser.newPage();

    // Navigate with mockup parameter
    await page.goto(`http://localhost:5177?mockup=${variation}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Capture dark mode
    console.log(`  - ${variation} (dark mode)`);
    await page.screenshot({
      path: `final-${variation}-dark.png`,
      fullPage: true
    });

    // Toggle to light mode - button is now OUTSIDE modal in top right
    const themeToggle = page.locator('button').first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Capture light mode
    console.log(`  - ${variation} (light mode)`);
    await page.screenshot({
      path: `final-${variation}-light.png`,
      fullPage: true
    });

    await page.close();
  }

  console.log('\n✅ All final variations captured!');
  console.log('\nFiles created:');
  variations.forEach(v => {
    console.log(`  - final-${v}-dark.png`);
    console.log(`  - final-${v}-light.png`);
  });

  await browser.close();
})();
