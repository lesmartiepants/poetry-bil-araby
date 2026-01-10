// Capture all three mockup screenshots
import { chromium } from 'playwright';

const mockups = ['modern', 'minimalist', 'arabian'];

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const mockup of mockups) {
    console.log(`\nCapturing ${mockup} mockup...`);

    const page = await browser.newPage();

    // Navigate with mockup parameter
    await page.goto(`http://localhost:5177?mockup=${mockup}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Capture dark mode
    console.log(`  - ${mockup} (dark mode)`);
    await page.screenshot({
      path: `mockup-${mockup}-dark.png`,
      fullPage: true
    });

    // Toggle to light mode
    const themeToggle = await page.locator('button').first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Capture light mode
    console.log(`  - ${mockup} (light mode)`);
    await page.screenshot({
      path: `mockup-${mockup}-light.png`,
      fullPage: true
    });

    await page.close();
  }

  console.log('\n✅ All mockups captured!');
  console.log('\nFiles created:');
  mockups.forEach(m => {
    console.log(`  - mockup-${m}-dark.png`);
    console.log(`  - mockup-${m}-light.png`);
  });

  await browser.close();
})();
