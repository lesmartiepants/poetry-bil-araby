// Simple screenshot capture script
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Opening app...');
  await page.goto('http://localhost:5177');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Capture splash
  console.log('Capturing splash screen...');
  await page.screenshot({ path: 'screenshot-1-splash.png', fullPage: true });

  // Click Begin Journey
  console.log('Clicking Begin Journey...');
  const beginBtn = await page.getByText('Begin Journey').first();
  await beginBtn.click();
  await page.waitForTimeout(1500);

  // Capture walkthrough step 1
  console.log('Capturing walkthrough step 1...');
  await page.screenshot({ path: 'screenshot-2-walkthrough-step1.png', fullPage: true });

  // Click Next
  console.log('Clicking Next...');
  await page.getByText('Next').first().click();
  await page.waitForTimeout(1000);

  // Capture walkthrough step 2
  console.log('Capturing walkthrough step 2...');
  await page.screenshot({ path: 'screenshot-3-walkthrough-step2.png', fullPage: true });

  // Click Next
  console.log('Clicking Next...');
  await page.getByText('Next').first().click();
  await page.waitForTimeout(1000);

  // Capture walkthrough step 3
  console.log('Capturing walkthrough step 3...');
  await page.screenshot({ path: 'screenshot-4-walkthrough-step3.png', fullPage: true });

  // Click Next
  console.log('Clicking Next...');
  await page.getByText('Next').first().click();
  await page.waitForTimeout(1000);

  // Capture walkthrough step 4
  console.log('Capturing walkthrough step 4...');
  await page.screenshot({ path: 'screenshot-5-walkthrough-step4.png', fullPage: true });

  // Click Start Exploring
  console.log('Clicking Start Exploring...');
  await page.getByText('Start Exploring').first().click();
  await page.waitForTimeout(1500);

  // Capture main app
  console.log('Capturing main app...');
  await page.screenshot({ path: 'screenshot-6-main-app.png', fullPage: true });

  console.log('\n✅ All screenshots captured successfully!');
  console.log('Files created:');
  console.log('  - screenshot-1-splash.png');
  console.log('  - screenshot-2-walkthrough-step1.png');
  console.log('  - screenshot-3-walkthrough-step2.png');
  console.log('  - screenshot-4-walkthrough-step3.png');
  console.log('  - screenshot-5-walkthrough-step4.png');
  console.log('  - screenshot-6-main-app.png');

  await browser.close();
})();
