// Capture preview of Option C: Geometric Poetry splash screen
import { chromium } from 'playwright';

(async () => {
  console.log('\n🔷 Capturing Geometric Poetry Splash Screen (Option C)...\n');

  const browser = await chromium.launch({ headless: true });

  // Desktop view (1920×1080)
  console.log('📸 Desktop Dark Mode...');
  let page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:5173?mockup=geometric');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000); // Extra time for animations to settle
  await page.screenshot({
    path: 'geometric-splash-desktop-dark.png',
    fullPage: false
  });
  await page.close();

  console.log('📸 Desktop Light Mode...');
  page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:5173?mockup=geometric');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  const themeToggle = page.locator('button').first();
  await themeToggle.click();
  await page.waitForTimeout(2000); // Extra time for animations
  await page.screenshot({
    path: 'geometric-splash-desktop-light.png',
    fullPage: false
  });
  await page.close();

  // Mobile view (iPhone 14 Pro Max - 430×932)
  console.log('📱 Mobile Dark Mode...');
  page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await page.goto('http://localhost:5173?mockup=geometric');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000);
  await page.screenshot({
    path: 'geometric-splash-mobile-dark.png',
    fullPage: false
  });
  await page.close();

  console.log('📱 Mobile Light Mode...');
  page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await page.goto('http://localhost:5173?mockup=geometric');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  const mobileThemeToggle = page.locator('button').first();
  await mobileThemeToggle.click();
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: 'geometric-splash-mobile-light.png',
    fullPage: false
  });
  await page.close();

  console.log('\n✅ Geometric splash preview screenshots captured!\n');
  console.log('📁 Files created:');
  console.log('   - geometric-splash-desktop-dark.png');
  console.log('   - geometric-splash-desktop-light.png');
  console.log('   - geometric-splash-mobile-dark.png');
  console.log('   - geometric-splash-mobile-light.png\n');
  console.log('🎨 Design: Islamic geometric patterns with gold/indigo palette');
  console.log('✨ Features: Animated tessellations, morphing stars, parallax depth\n');

  await browser.close();
})();
