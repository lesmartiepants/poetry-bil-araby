// Render the README header banner to PNG.
//
// Uses playwright-core driving the pre-installed Chromium (no browser download).
// Screenshots the #banner element directly at 2x device scale, so the output
// dimensions always match the banner exactly — no viewport/window-size guesswork.
//
// Setup (once):  npm install --no-save playwright-core
// Usage:         node .github/assets/render-header.mjs
// Output:        .github/assets/header.png
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const html = resolve(here, 'header.source.html');
const out = resolve(here, 'header.png');

// Locate the Chromium binary shipped with Playwright's browser cache.
function findChrome() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!existsSync(root)) throw new Error(`No browser cache at ${root}`);
  const dir = readdirSync(root).find((d) => d.startsWith('chromium-'));
  if (!dir) throw new Error(`No chromium-* directory under ${root}`);
  const bin = resolve(root, dir, 'chrome-linux', 'chrome');
  if (!existsSync(bin)) throw new Error(`Chromium binary missing at ${bin}`);
  return bin;
}

const browser = await chromium.launch({
  executablePath: findChrome(),
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.goto(pathToFileURL(html).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.locator('#banner').screenshot({ path: out });
await browser.close();
console.log(`Rendered ${out}`);
