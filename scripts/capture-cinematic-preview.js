// Capture preview of new cinematic splash screen (5e)
import { chromium } from 'playwright';

(async () => {
  console.log('\n🎬 Capturing Cinematic Splash Screen Preview...\n');

  const browser = await chromium.launch({ headless: true });

  // Desktop view (1920×1080)
  console.log('📸 Desktop Dark Mode...');
  let page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: 'cinematic-splash-desktop-dark.png',
    fullPage: false
  });
  await page.close();

  console.log('📸 Desktop Light Mode...');
  page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  const themeToggle = page.locator('button').first();
  await themeToggle.click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: 'cinematic-splash-desktop-light.png',
    fullPage: false
  });
  await page.close();

  // Mobile view (iPhone 14 Pro Max - 430×932)
  console.log('📱 Mobile Dark Mode...');
  page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: 'cinematic-splash-mobile-dark.png',
    fullPage: false
  });
  await page.close();

  console.log('📱 Mobile Light Mode...');
  page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  const mobileThemeToggle = page.locator('button').first();
  await mobileThemeToggle.click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: 'cinematic-splash-mobile-light.png',
    fullPage: false
  });
  await page.close();

  console.log('\n✅ Preview screenshots captured!\n');
  console.log('📁 Files created:');
  console.log('   - cinematic-splash-desktop-dark.png');
  console.log('   - cinematic-splash-desktop-light.png');
  console.log('   - cinematic-splash-mobile-dark.png');
  console.log('   - cinematic-splash-mobile-light.png\n');

  await browser.close();
})();
