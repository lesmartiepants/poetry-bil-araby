/**
 * Visual Capture Script for WalkthroughGuideInk Redesign
 *
 * Captures screenshots of all 3 steps in both dark and light modes
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureWalkthroughScreenshots() {
  console.log('🎨 Starting WalkthroughGuideInk screenshot capture...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const outputDir = path.join(__dirname, '..', 'mockups', 'walkthrough-ink');

  // Dark Mode - All 3 Steps
  console.log('📸 Capturing Dark Mode screens...');
  await page.goto('http://localhost:5173/?skipSplash=true&showWalkthrough=true&mockup=ink', {
    waitUntil: 'networkidle'
  });
  await page.waitForTimeout(1000);

  // Step 1
  await page.screenshot({
    path: path.join(outputDir, 'ink-walkthrough-step1-dark.png'),
    fullPage: false
  });
  console.log('  ✅ Step 1 (Dark)');

  // Step 2
  await page.getByRole('button', { name: /Continue/i }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(outputDir, 'ink-walkthrough-step2-dark.png'),
    fullPage: false
  });
  console.log('  ✅ Step 2 (Dark)');

  // Step 3
  await page.getByRole('button', { name: /Continue/i }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(outputDir, 'ink-walkthrough-step3-dark.png'),
    fullPage: false
  });
  console.log('  ✅ Step 3 (Dark)');

  // Light Mode - All 3 Steps
  console.log('\n📸 Capturing Light Mode screens...');

  // Toggle to light mode via theme button
  const themeToggle = page.locator('button[aria-label*="Switch to light mode"]').first();
  await themeToggle.click();
  await page.waitForTimeout(500);

  // Reset to step 1
  await page.goto('http://localhost:5173/?skipSplash=true&showWalkthrough=true&mockup=ink&theme=light', {
    waitUntil: 'networkidle'
  });
  await page.waitForTimeout(1000);

  // Step 1
  await page.screenshot({
    path: path.join(outputDir, 'ink-walkthrough-step1-light.png'),
    fullPage: false
  });
  console.log('  ✅ Step 1 (Light)');

  // Step 2
  await page.getByRole('button', { name: /Continue/i }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(outputDir, 'ink-walkthrough-step2-light.png'),
    fullPage: false
  });
  console.log('  ✅ Step 2 (Light)');

  // Step 3
  await page.getByRole('button', { name: /Continue/i }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(outputDir, 'ink-walkthrough-step3-light.png'),
    fullPage: false
  });
  console.log('  ✅ Step 3 (Light)');

  await browser.close();

  console.log('\n✨ Screenshot capture complete!');
  console.log(`📁 Saved to: ${outputDir}`);
}

captureWalkthroughScreenshots().catch(console.error);
