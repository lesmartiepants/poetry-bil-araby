// Generic README banner renderer.
//
// Renders an HTML banner to PNG using playwright-core driving a Chromium binary.
// Screenshots the #banner ELEMENT (not the window) at 2x device scale, so the
// output dimensions always match the banner exactly — this avoids the common bug
// where raw `--window-size`/`--screenshot` captures a viewport taller than the
// banner and the page body bleeds through as a dark band at the bottom.
//
// Setup (once):  npm install --no-save playwright-core
// Usage:         node render-banner.mjs [input.html] [output.png]
// Defaults:      input  = ./banner.source.html
//                output = ./banner.png
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const here = dirname(fileURLToPath(import.meta.url));
const html = resolve(here, process.argv[2] || 'banner.source.html');
const out = resolve(here, process.argv[3] || 'banner.png');

// Locate a Chromium binary. Prefers Playwright's browser cache; falls back to
// letting playwright-core resolve its own bundled browser if none is found.
function findChrome() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!existsSync(root)) return undefined;
  const dir = readdirSync(root).find((d) => d.startsWith('chromium-'));
  if (!dir) return undefined;
  const bin = resolve(root, dir, 'chrome-linux', 'chrome');
  return existsSync(bin) ? bin : undefined;
}

const executablePath = findChrome();
const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.goto(pathToFileURL(html).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.locator('#banner').screenshot({ path: out });
await browser.close();
console.log(`Rendered ${out}`);
