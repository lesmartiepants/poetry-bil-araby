import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureAndalusianScreenshots() {
  console.log('Starting Andalusian Islamic Geometric Pattern capture...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set viewport
  await page.setViewportSize({ width: 1920, height: 1080 });

  const previewPath = path.resolve(__dirname, '../mandala/previews/option-1-refined.html');
  console.log(`Loading: ${previewPath}`);

  await page.goto(`file://${previewPath}`);
  await page.waitForTimeout(1500); // Let animations settle

  // Capture dark mode
  console.log('Capturing dark mode...');
  await page.screenshot({
    path: path.resolve(__dirname, '../mandala/mockups/andalusian-dark.png'),
    fullPage: false
  });

  // Switch to light mode
  console.log('Switching to light mode...');
  await page.click('.theme-toggle');
  await page.waitForTimeout(800); // Let theme transition settle

  // Capture light mode
  console.log('Capturing light mode...');
  await page.screenshot({
    path: path.resolve(__dirname, '../mandala/mockups/andalusian-light.png'),
    fullPage: false
  });

  // Capture hover state (dark mode)
  console.log('Switching back to dark mode for hover capture...');
  await page.click('.theme-toggle');
  await page.waitForTimeout(800);

  // Hover over CTA button
  console.log('Capturing CTA hover state...');
  await page.hover('.cta');
  await page.waitForTimeout(500);

  await page.screenshot({
    path: path.resolve(__dirname, '../mandala/mockups/andalusian-hover.png'),
    fullPage: false
  });

  console.log('All screenshots captured successfully!');
  await browser.close();
}

captureAndalusianScreenshots().catch(console.error);
