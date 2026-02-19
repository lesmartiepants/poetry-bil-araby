import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const baseDir = __dirname;
  const screenshotsDir = path.join(baseDir, 'screenshots');
  fs.mkdirSync(path.join(screenshotsDir, 'before'), { recursive: true });

  const browser = await chromium.launch();

  const sets = ['set-a', 'set-b'];
  for (const setName of sets) {
    const setDir = path.join(baseDir, setName);
    const files = fs.readdirSync(setDir).filter(f => f.endsWith('.html'));

    for (const file of files) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto('file://' + path.join(setDir, file));
      await page.waitForTimeout(2000);

      const name = `${setName}-${file.replace('.html', '')}`;
      await page.screenshot({ path: path.join(screenshotsDir, 'before', `${name}-desktop.png`) });

      // Mobile
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotsDir, 'before', `${name}-mobile.png`) });

      await page.close();
      console.log('✓ Before: ' + name);
    }
  }

  await browser.close();
  console.log('Done! Baseline screenshots captured.');
})();
