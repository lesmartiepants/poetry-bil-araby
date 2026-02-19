import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const screenshotsDir = path.join(__dirname, 'screenshots');
  const videosDir = path.join(screenshotsDir, 'videos');
  fs.mkdirSync(screenshotsDir, { recursive: true });
  fs.mkdirSync(videosDir, { recursive: true });

  const browser = await chromium.launch();
  const mockups = fs.readdirSync(__dirname)
    .filter(f => f.startsWith('e2e-') && f.endsWith('.html'))
    .sort();

  console.log(`Found ${mockups.length} mockups to capture`);

  for (const file of mockups) {
    try {
      console.log(`\n📸 Processing: ${file}`);
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const filePath = 'file://' + path.join(__dirname, file);

      await page.goto(filePath, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(3000); // let animations settle

      const name = file.replace('.html', '');

      // Desktop dark screenshot
      console.log('  - Desktop dark...');
      await page.screenshot({
        path: path.join(screenshotsDir, `${name}-desktop-dark.png`),
        fullPage: false
      });

      // Try to click theme toggle if exists
      const themeBtn = page.locator('button').filter({ hasText: /theme|light|dark|☀|🌙/i }).first();
      if (await themeBtn.count() > 0) {
        console.log('  - Desktop light...');
        await themeBtn.click().catch(() => {});
        await page.waitForTimeout(500);
        await page.screenshot({
          path: path.join(screenshotsDir, `${name}-desktop-light.png`),
          fullPage: false
        });
        // toggle back to dark
        await themeBtn.click().catch(() => {});
        await page.waitForTimeout(300);
      }

      // Mobile screenshot
      console.log('  - Mobile dark...');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(screenshotsDir, `${name}-mobile-dark.png`),
        fullPage: false
      });

      await page.close();

      // Video capture for animations
      console.log('  - Video recording...');
      const videoPage = await browser.newPage({
        viewport: { width: 1440, height: 900 },
        recordVideo: {
          dir: videosDir,
          size: { width: 1440, height: 900 }
        }
      });

      await videoPage.goto(filePath, { waitUntil: 'networkidle', timeout: 10000 });
      await videoPage.waitForTimeout(5000); // capture 5 seconds
      await videoPage.close(); // saves video

      // Wait for video to be saved
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log(`✅ Captured: ${file}`);
    } catch (error) {
      console.error(`❌ Error capturing ${file}:`, error.message);
    }
  }

  await browser.close();

  const pngCount = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png')).length;
  const videoCount = fs.readdirSync(videosDir).filter(f => f.endsWith('.webm')).length;

  console.log(`\n✨ Done!`);
  console.log(`   Screenshots: ${pngCount} PNG files in mockups/screenshots/`);
  console.log(`   Videos: ${videoCount} WebM files in mockups/screenshots/videos/`);
})();
