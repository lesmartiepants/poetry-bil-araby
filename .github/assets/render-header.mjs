// Render the README header banner to PNG.
//
// Uses the pre-installed Chromium (no node_modules required). Drives it in
// headless screenshot mode at 2x device scale so the wordmark and girih
// pattern stay crisp on high-DPI displays and when GitHub downscales.
//
// Usage:  node .github/assets/render-header.mjs
// Output: .github/assets/header.png
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const chrome = findChrome();
const args = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=2',
  '--window-size=1280,380',
  '--default-background-color=00000000',
  '--virtual-time-budget=12000', // give web fonts time to load before capture
  `--screenshot=${out}`,
  `file://${html}`,
];

execFileSync(chrome, args, { stdio: 'inherit' });
console.log(`Rendered ${out}`);
