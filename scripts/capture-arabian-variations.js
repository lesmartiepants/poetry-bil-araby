// Capture all Arabian variations
import { chromium } from 'playwright';

const variations = ['1', '2', '3a', '3b', '3c'];

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const variation of variations) {
    console.log(`\nCapturing Arabian variation ${variation}...`);

    const page = await browser.newPage();

    // Navigate with mockup parameter
    await page.goto(`http://localhost:5177?mockup=${variation}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Capture dark mode
    console.log(`  - ${variation} (dark mode)`);
    await page.screenshot({
      path: `arabian-${variation}-dark.png`,
      fullPage: true
    });

    // Toggle to light mode
    const themeToggle = await page.locator('button').first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Capture light mode
    console.log(`  - ${variation} (light mode)`);
    await page.screenshot({
      path: `arabian-${variation}-light.png`,
      fullPage: true
    });

    await page.close();
  }

  console.log('\n✅ All Arabian variations captured!');
  console.log('\nFiles created:');
  variations.forEach(v => {
    console.log(`  - arabian-${v}-dark.png`);
    console.log(`  - arabian-${v}-light.png`);
  });

  await browser.close();
})();
