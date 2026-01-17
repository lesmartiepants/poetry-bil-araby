const { chromium } = require('playwright');
const path = require('path');

async function captureConstellationOptions() {
  console.log('🌟 Starting constellation options screenshot capture...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const options = [
    {
      name: 'option-1-refined',
      title: 'Option 1: Refined Constellation (Updated)',
      path: path.resolve(__dirname, '../constellation/previews/option-1-refined.html')
    },
    {
      name: 'option-2-minimal',
      title: 'Option 2: Minimal Stars (Updated)',
      path: path.resolve(__dirname, '../constellation/previews/option-2-minimal.html')
    },
    {
      name: 'option-3-animated',
      title: 'Option 3: Animated Cosmos (Updated)',
      path: path.resolve(__dirname, '../constellation/previews/option-3-animated.html')
    }
  ];

  for (const option of options) {
    console.log(`\n📸 Capturing: ${option.title}`);

    const page = await context.newPage();

    try {
      // Navigate to local file
      await page.goto(`file://${option.path}`, { waitUntil: 'networkidle' });

      // Wait for animations to settle
      await page.waitForTimeout(3000);

      // Take screenshot
      const screenshotPath = path.resolve(
        __dirname,
        `../constellation/mockups/${option.name}-updated.png`
      );

      await page.screenshot({
        path: screenshotPath,
        fullPage: false
      });

      console.log(`   ✅ Saved: ${screenshotPath}`);

    } catch (error) {
      console.error(`   ❌ Error capturing ${option.name}:`, error.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('\n✨ Constellation screenshot capture complete!');
}

captureConstellationOptions().catch(console.error);
