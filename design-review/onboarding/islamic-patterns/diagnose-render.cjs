/**
 * Diagnose rendering issues: captures screenshots of specific patterns
 * and checks for construction line leakage (lines that shouldn't be visible).
 *
 * Usage: node diagnose-render.cjs
 *
 * Saves before-screenshots to diagnose-screenshots/
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const htmlPath = path.join(__dirname, 'generate.html');
const fileUrl = `file://${path.resolve(htmlPath)}`;
const ssDir = path.join(__dirname, 'diagnose-screenshots');
if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });

// Patterns to specifically check — mix of known issues and representatives
const TARGETS = [
  '8 and 8',
  '8 Ring',
  '4.8^2',
  '4^4',
  'regular-4',
  '3-8-12',
  '6',
  '6.5',
  '7.6',
  'Penrose',
  'Square Wave',
  'Girih Star',
  'Girih Tiles',
  'Al-Mustansiriyya',
  'Green Mosque',
  'Alhambra 16',
  'alhambra16',
  'Alcazar De Seville 12 8',
  'Diamond Hive',
  '3.4.6',
  'Mamluk Quran',
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));

  await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);

  // Switch to Tilings tab so .pattern-item elements are visible
  const tilingsTab = await page.$('[data-tab="tilings"]');
  if (tilingsTab) {
    await tilingsTab.click();
    await page.waitForTimeout(500);
  }

  // Get all pattern items
  const allItems = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.pattern-item')).map((el, i) => ({
      index: i,
      text: el.textContent.trim(),
    }));
  });

  console.log(`Found ${allItems.length} total patterns.\n`);
  console.log('Capturing diagnostic screenshots...\n');

  for (const target of TARGETS) {
    // Find the item matching this target name
    const match = allItems.find(it =>
      it.text.toLowerCase().includes(target.toLowerCase())
    );

    if (!match) {
      console.log(`  ✗ "${target}" — not found in sidebar`);
      continue;
    }

    // Click it
    const items = await page.$$('.pattern-item');
    if (!items[match.index]) {
      console.log(`  ✗ "${target}" — element gone`);
      continue;
    }

    await items[match.index].click();
    await page.waitForTimeout(500);

    // Analyze canvas
    const analysis = await page.evaluate(() => {
      const canvas = document.getElementById('patternCanvas');
      if (!canvas) return { error: 'no canvas' };
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      if (w === 0 || h === 0) return { error: 'zero size' };

      const data = ctx.getImageData(0, 0, w, h).data;
      const bgR = 13, bgG = 13, bgB = 20;
      let nonBg = 0, total = 0;
      let colorBuckets = {}; // Track unique colors

      const step = Math.max(1, Math.floor(Math.min(w, h) / 300));
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const idx = (y * w + x) * 4;
          const r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
          total++;
          if (Math.abs(r - bgR) > 8 || Math.abs(g - bgG) > 8 || Math.abs(b - bgB) > 8) {
            nonBg++;
            // Bucket the color
            const key = `${Math.round(r/10)*10},${Math.round(g/10)*10},${Math.round(b/10)*10}`;
            colorBuckets[key] = (colorBuckets[key] || 0) + 1;
          }
        }
      }

      // Sort color buckets by frequency
      const topColors = Object.entries(colorBuckets)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([c, n]) => `rgb(${c}): ${n}`);

      return {
        width: w, height: h,
        fillRatio: nonBg / total,
        nonBgPixels: nonBg,
        totalSampled: total,
        topColors,
      };
    });

    // Save screenshot of canvas area only
    const canvasEl = await page.$('#patternCanvas');
    const safeName = target.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ssPath = path.join(ssDir, `AFTER-${safeName}.png`);

    if (canvasEl) {
      await canvasEl.screenshot({ path: ssPath });
    } else {
      await page.screenshot({ path: ssPath });
    }

    const fill = analysis.fillRatio ? (analysis.fillRatio * 100).toFixed(1) : '?';
    const status = analysis.fillRatio > 0.001 ? '✓' : '⚠';
    console.log(`  ${status} "${target}" — ${fill}% fill`);
    if (analysis.topColors) {
      console.log(`    Colors: ${analysis.topColors.slice(0, 3).join(' | ')}`);
    }
    if (analysis.error) console.log(`    Error: ${analysis.error}`);
  }

  if (jsErrors.length) {
    console.log(`\nJS Errors: ${jsErrors.length}`);
    jsErrors.slice(0, 5).forEach(e => console.log(`  ${e.slice(0, 100)}`));
  }

  await browser.close();
  console.log(`\nScreenshots saved to: ${ssDir}/`);
  console.log('Review AFTER-*.png files to compare with BEFORE-*.png in before/ subfolder.');
})();
