// Capture wildcard and new direction variations (5a-5e)
import { chromium } from 'playwright';

const variations = ['5a', '5b', '5c', '5d', '5e'];

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const variation of variations) {
    console.log(`\nCapturing variation ${variation}...`);

    const page = await browser.newPage();

    // Navigate with mockup parameter
    await page.goto(`http://localhost:5177?mockup=${variation}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500); // Extra time for animations

    // Capture dark mode
    console.log(`  - ${variation} (dark mode)`);
    await page.screenshot({
      path: `wildcard-${variation}-dark.png`,
      fullPage: true
    });

    // Toggle to light mode - button location varies by design
    const themeToggle = page.locator('button').first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Capture light mode
    console.log(`  - ${variation} (light mode)`);
    await page.screenshot({
      path: `wildcard-${variation}-light.png`,
      fullPage: true
    });

    await page.close();
  }

  console.log('\n✅ All wildcard variations captured!');
  console.log('\nFiles created:');
  variations.forEach(v => {
    console.log(`  - wildcard-${v}-dark.png`);
    console.log(`  - wildcard-${v}-light.png`);
  });

  await browser.close();
})();
