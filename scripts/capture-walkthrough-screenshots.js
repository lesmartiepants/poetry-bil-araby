import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WALKTHROUGHS = [
  { name: 'zen', mockup: 'zen', title: 'Zen Minimalist' },
  { name: 'mandala', mockup: 'mandala', title: 'Mandala Sacred Geometry' },
  { name: 'geometric', mockup: 'geometric', title: 'Geometric Islamic' },
  { name: 'aurora', mockup: 'aurora', title: 'Aurora Borealis' },
  { name: 'constellation', mockup: 'constellation', title: 'Constellation Celestial' },
  { name: 'particles', mockup: 'particles', title: 'Particles Flow' },
  { name: 'ink', mockup: 'ink', title: 'Ink Calligraphy' },
  { name: 'manuscript', mockup: 'manuscript', title: 'Manuscript Medieval' },
  { name: 'light', mockup: 'light', title: 'Light & Shadow' },
];

async function captureWalkthroughScreenshots() {
  const outputDir = path.join(__dirname, '../design-review-output');
  const currentStateDir = path.join(outputDir, 'current-state');

  // Create directories
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  if (!fs.existsSync(currentStateDir)) {
    fs.mkdirSync(currentStateDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  for (const walkthrough of WALKTHROUGHS) {
    console.log(`\nCapturing: ${walkthrough.title}...`);

    try {
      // Navigate to splash screen
      await page.goto(`http://localhost:5173/?mockup=${walkthrough.mockup}&showWalkthrough=false`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000); // Let splash animations settle

      // Capture splash screen
      console.log(`  📸 Capturing splash...`);
      await page.screenshot({
        path: path.join(currentStateDir, `${walkthrough.name}-1-splash.png`),
        fullPage: false
      });

      // Click to enter walkthrough
      await page.click('body');
      await page.waitForTimeout(800); // Wait for transition

      // Capture walkthrough step 1
      console.log(`  📸 Capturing walkthrough step 1...`);
      await page.screenshot({
        path: path.join(currentStateDir, `${walkthrough.name}-2-walkthrough-step1.png`),
        fullPage: false
      });

      // Navigate to step 2 if possible
      const nextButton = page.locator('button:has-text("Continue"), button:has-text("Next")').first();
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(800);

        console.log(`  📸 Capturing walkthrough step 2...`);
        await page.screenshot({
          path: path.join(currentStateDir, `${walkthrough.name}-3-walkthrough-step2.png`),
          fullPage: false
        });
      }

      // Navigate to step 3 if possible
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(800);

        console.log(`  📸 Capturing walkthrough step 3...`);
        await page.screenshot({
          path: path.join(currentStateDir, `${walkthrough.name}-4-walkthrough-step3.png`),
          fullPage: false
        });
      }

      console.log(`  ✅ Completed: ${walkthrough.title}`);
    } catch (error) {
      console.error(`  ❌ Error capturing ${walkthrough.title}:`, error.message);
    }
  }

  await browser.close();
  console.log(`\n✅ Screenshot capture complete! Files saved to: ${currentStateDir}`);
}

captureWalkthroughScreenshots().catch(console.error);
