import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mockups with heavy animations that need video recording
const ANIMATION_HEAVY = [
  'set-a/01-ethereal-gold.html',
  'set-a/03-cosmic-scholar.html',
  'set-a/04-desert-poet.html',
  'set-a/08-glass-pavilion.html',
  'set-b/01-particle-scroll.html',
  'set-b/02-ethereal-spotlight.html',
  'set-b/06-spotlight-library.html',
  'set-b/10-ethereal-constellation.html'
];

(async () => {
  const baseDir = __dirname;
  const screenshotsDir = path.join(baseDir, 'screenshots');
  const afterDir = path.join(screenshotsDir, 'after');
  const videosDir = path.join(screenshotsDir, 'videos');

  fs.mkdirSync(afterDir, { recursive: true });
  fs.mkdirSync(videosDir, { recursive: true });

  const browser = await chromium.launch();

  const sets = ['set-a', 'set-b'];
  for (const setName of sets) {
    const setDir = path.join(baseDir, setName);
    const files = fs.readdirSync(setDir).filter(f => f.endsWith('.html')).sort();

    for (const file of files) {
      const name = `${setName}-${file.replace('.html', '')}`;
      const filePath = path.join(setDir, file);
      const fileUrl = 'file://' + filePath;
      const relativeFilePath = `${setName}/${file}`;
      const needsVideo = ANIMATION_HEAVY.includes(relativeFilePath);

      console.log(`\n📸 Processing: ${name}`);

      // Desktop Dark Mode
      const context1 = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: 'dark'
      });
      const page1 = await context1.newPage();
      await page1.goto(fileUrl);
      await page1.waitForTimeout(3000); // Wait for animations to settle
      await page1.screenshot({ path: path.join(afterDir, `${name}-desktop-dark.png`), fullPage: true });
      await context1.close();
      console.log(`  ✓ Desktop Dark`);

      // Desktop Light Mode
      const context2 = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: 'light'
      });
      const page2 = await context2.newPage();
      await page2.goto(fileUrl);
      await page2.waitForTimeout(1000);

      // Click theme toggle button to switch to light mode
      try {
        await page2.click('button[aria-label*="theme" i], button[title*="theme" i], .theme-toggle, [class*="theme"]', { timeout: 2000 });
        await page2.waitForTimeout(2000); // Wait for theme transition
      } catch (e) {
        // If no theme toggle found, that's okay - some mockups might not have it
      }

      await page2.screenshot({ path: path.join(afterDir, `${name}-desktop-light.png`), fullPage: true });
      await context2.close();
      console.log(`  ✓ Desktop Light`);

      // Mobile Dark Mode
      const context3 = await browser.newContext({
        viewport: { width: 390, height: 844 },
        colorScheme: 'dark'
      });
      const page3 = await context3.newPage();
      await page3.goto(fileUrl);
      await page3.waitForTimeout(3000);
      await page3.screenshot({ path: path.join(afterDir, `${name}-mobile-dark.png`), fullPage: true });
      await context3.close();
      console.log(`  ✓ Mobile Dark`);

      // Video Recording for animation-heavy mockups
      if (needsVideo) {
        try {
          const videoContext = await browser.newContext({
            viewport: { width: 1440, height: 900 },
            recordVideo: {
              dir: videosDir,
              size: { width: 1440, height: 900 }
            }
          });
          const videoPage = await videoContext.newPage();
          await videoPage.goto(fileUrl);
          await videoPage.waitForTimeout(5000); // Record 5 seconds of animation
          await videoContext.close();

          // Rename video file to match mockup name
          const videoFiles = fs.readdirSync(videosDir).filter(f => f.endsWith('.webm'));
          if (videoFiles.length > 0) {
            const latestVideo = videoFiles[videoFiles.length - 1];
            fs.renameSync(
              path.join(videosDir, latestVideo),
              path.join(videosDir, `${name}.webm`)
            );
            console.log(`  ✓ Video recorded`);
          }
        } catch (videoError) {
          console.log(`  ⚠ Video capture failed (continuing anyway): ${videoError.message}`);
        }
      }
    }
  }

  await browser.close();
  console.log('\n✅ Done! All after screenshots and videos captured.');
  console.log(`📁 Screenshots: ${afterDir}`);
  console.log(`🎬 Videos: ${videosDir}`);
})();
