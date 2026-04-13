/**
 * Test script: clicks every pattern in generate.html and checks canvas rendering.
 *
 * Usage:
 *   node test-render.cjs [path-to-generate.html]
 *
 * Defaults to opening generate.html from the same directory via file:// protocol.
 * Outputs a report of which patterns rendered (non-blank canvas) and which failed.
 */

const { chromium } = require('playwright');
const path = require('path');

const htmlPath = process.argv[2] || path.join(__dirname, 'generate.html');
const fileUrl = `file://${path.resolve(htmlPath)}`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  console.log(`Loading: ${fileUrl}\n`);
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1000);

  // Get all clickable pattern items from the sidebar
  const items = await page.evaluate(() => {
    const els = document.querySelectorAll('.pattern-item');
    return Array.from(els).map((el, i) => ({
      index: i,
      text: el.textContent.trim().slice(0, 60),
    }));
  });

  console.log(`Found ${items.length} patterns to test.\n`);

  const results = { pass: [], fail: [], empty: [], error: [] };
  const ssDir = path.join(__dirname, 'test-screenshots');

  // Create screenshots dir
  const fs = require('fs');
  if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });

  for (const item of items) {
    const errsBefore = errors.length;

    try {
      // Click the pattern item
      const allItems = await page.$$('.pattern-item');
      if (!allItems[item.index]) {
        results.error.push({ ...item, reason: 'Element not found' });
        continue;
      }

      await allItems[item.index].click();
      await page.waitForTimeout(300); // Let canvas render

      // Check if canvas has non-background pixels
      const canvasCheck = await page.evaluate(() => {
        const canvas = document.getElementById('patternCanvas');
        if (!canvas) return { exists: false };

        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        if (w === 0 || h === 0) return { exists: true, blank: true, reason: 'zero dimensions' };

        // Sample pixels in a grid (not every pixel — too slow for large canvases)
        const sampleSize = Math.min(w, h, 512);
        const stepX = Math.max(1, Math.floor(w / sampleSize));
        const stepY = Math.max(1, Math.floor(h / sampleSize));

        let nonBgPixels = 0;
        let totalSampled = 0;
        const bgR = 13, bgG = 13, bgB = 20; // #0d0d14
        const tolerance = 10;

        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        for (let y = 0; y < h; y += stepY) {
          for (let x = 0; x < w; x += stepX) {
            const idx = (y * w + x) * 4;
            const r = data[idx], g = data[idx + 1], b = data[idx + 2];
            totalSampled++;

            if (Math.abs(r - bgR) > tolerance ||
                Math.abs(g - bgG) > tolerance ||
                Math.abs(b - bgB) > tolerance) {
              nonBgPixels++;
            }
          }
        }

        return {
          exists: true,
          width: w,
          height: h,
          totalSampled,
          nonBgPixels,
          fillRatio: nonBgPixels / totalSampled,
          blank: nonBgPixels === 0,
        };
      });

      const newErrors = errors.slice(errsBefore);
      const name = item.text.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);

      if (!canvasCheck.exists) {
        results.error.push({ ...item, reason: 'Canvas not found' });
        process.stdout.write('E');
      } else if (canvasCheck.blank) {
        // Take screenshot for debugging
        await page.screenshot({ path: path.join(ssDir, `BLANK-${name}.png`) });
        results.empty.push({ ...item, ...canvasCheck, jsErrors: newErrors });
        process.stdout.write('B');
      } else if (canvasCheck.fillRatio < 0.001) {
        // Barely anything drawn — suspicious
        await page.screenshot({ path: path.join(ssDir, `SPARSE-${name}.png`) });
        results.fail.push({ ...item, ...canvasCheck, jsErrors: newErrors, reason: 'Too sparse (<0.1% fill)' });
        process.stdout.write('S');
      } else {
        results.pass.push({ ...item, fillRatio: canvasCheck.fillRatio, nonBgPixels: canvasCheck.nonBgPixels });
        process.stdout.write('.');
      }
    } catch (e) {
      results.error.push({ ...item, reason: e.message.slice(0, 100) });
      process.stdout.write('X');
    }
  }

  await browser.close();

  // Report
  console.log('\n\n' + '='.repeat(60));
  console.log('ISLAMIC PATTERN RENDER TEST REPORT');
  console.log('='.repeat(60));

  console.log(`\nTotal patterns: ${items.length}`);
  console.log(`  ✓ Pass:    ${results.pass.length}`);
  console.log(`  B Blank:   ${results.empty.length}`);
  console.log(`  S Sparse:  ${results.fail.length}`);
  console.log(`  X Error:   ${results.error.length}`);

  if (results.empty.length > 0) {
    console.log('\n── BLANK (canvas all background color) ──');
    results.empty.forEach(r => {
      console.log(`  ${r.text}`);
      if (r.jsErrors?.length) console.log(`    JS: ${r.jsErrors[0].slice(0, 100)}`);
    });
  }

  if (results.fail.length > 0) {
    console.log('\n── SPARSE (<0.1% fill — barely visible) ──');
    results.fail.forEach(r => {
      console.log(`  ${r.text} — ${(r.fillRatio * 100).toFixed(3)}% fill (${r.nonBgPixels} pixels)`);
      if (r.jsErrors?.length) console.log(`    JS: ${r.jsErrors[0].slice(0, 100)}`);
    });
  }

  if (results.error.length > 0) {
    console.log('\n── ERRORS ──');
    results.error.forEach(r => {
      console.log(`  ${r.text} — ${r.reason}`);
    });
  }

  if (results.pass.length > 0) {
    console.log('\n── TOP 5 MOST DETAILED (highest fill ratio) ──');
    results.pass
      .sort((a, b) => b.fillRatio - a.fillRatio)
      .slice(0, 5)
      .forEach(r => {
        console.log(`  ${r.text} — ${(r.fillRatio * 100).toFixed(1)}% fill`);
      });
  }

  console.log('\n' + '='.repeat(60));

  if (results.empty.length > 0 || results.fail.length > 0) {
    console.log(`\nScreenshots saved to: ${ssDir}/`);
  }

  const exitCode = (results.empty.length + results.error.length > 0) ? 1 : 0;
  console.log(`\nExit code: ${exitCode}`);
  process.exit(exitCode);
})();
