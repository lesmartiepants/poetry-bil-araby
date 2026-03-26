const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch(headless: false });
  const page = await browser.newPage();

  // Navigate to the app
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Capture collapsed state (default)
  await page.screenshot({ path: 'current-state/1-collapsed.png', fullPage: false });

  // Click to expand sidebar
  const sidebarButton = page.locator('[aria-label="Open sidebar controls"]');
  await sidebarButton.click();
  await page.waitForTimeout(500);

  // Capture expanded state
  await page.screenshot({ path: 'current-state/2-expanded.png', fullPage: false });

  // Click settings to show submenu
  const settingsButton = page.locator('[aria-label="Settings"]');
  await settingsButton.click();
  await page.waitForTimeout(400);

  // Capture settings submenu open
  await page.screenshot({ path: 'current-state/3-settings-open.png', fullPage: false });

  await browser.close();
  console.log('Screenshots captured');
})();
