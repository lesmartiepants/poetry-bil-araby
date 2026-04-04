/**
 * capture-panel-gifs.mjs
 *
 * Records a GIF of each panel pair's demo animation.
 * Requires: playwright, ffmpeg (brew install ffmpeg)
 *
 * Usage:
 *   node capture-panel-gifs.mjs
 *
 * Output: ./panel-gifs/*.gif  (one per pair)
 *
 * Prerequisites:
 *   - python3 -m http.server 8080   (serving the preview HTML)
 *   - npm run dev:server             (backend on :3001, only needed for real TTS)
 */

import { chromium } from 'playwright';
import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = path.join(__dirname, 'panel-gifs');
const TEMP_DIR  = path.join(__dirname, 'panel-gifs', '_tmp');

// Pair definitions — must match PANEL_IDS order in the HTML
// Each entry: label for the output file, pairIndex (0-based), demo duration ms
const PAIRS = [
  { name: 'AB-word-glow-underline',   pairIdx: 0, demoMs: 14000 },
  { name: 'DG-reveal-blur',           pairIdx: 1, demoMs: 14000 },
  { name: 'IJ-gold-pill',             pairIdx: 2, demoMs: 14000 },
  { name: 'H-gradient-clip',          pairIdx: 3, demoMs: 14000 },
];

const PREVIEW_URL = 'http://localhost:8080/tts-highlight-preview.html';
const VIEWPORT    = { width: 1280, height: 720 };
const FPS         = 12;

// ── Helpers ──────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function checkDep(cmd) {
  const r = spawnSync('which', [cmd]);
  if (r.status !== 0) {
    console.error(`\n❌  ${cmd} not found. Install with: brew install ${cmd}`);
    process.exit(1);
  }
}

function webmToGif(webmPath, gifPath) {
  // 1. Convert webm → palette
  const palettePath = webmPath.replace('.webm', '-palette.png');
  execSync(
    `ffmpeg -y -i "${webmPath}" -vf "fps=${FPS},scale=${VIEWPORT.width}:-1:flags=lanczos,palettegen" "${palettePath}"`,
    { stdio: 'pipe' }
  );
  // 2. Apply palette → gif
  execSync(
    `ffmpeg -y -i "${webmPath}" -i "${palettePath}" -lavfi "fps=${FPS},scale=${VIEWPORT.width}:-1:flags=lanczos [x]; [x][1:v] paletteuse" "${gifPath}"`,
    { stdio: 'pipe' }
  );
  fs.unlinkSync(palettePath);
}

// ── Main ─────────────────────────────────────────────────────────────────────

checkDep('ffmpeg');
ensureDir(OUT_DIR);
ensureDir(TEMP_DIR);

const browser = await chromium.launch({ headless: true });

for (const pair of PAIRS) {
  console.log(`\n▶  Recording pair ${pair.name} (pairIdx=${pair.pairIdx})…`);

  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: {
      dir: TEMP_DIR,
      size: VIEWPORT,
    },
  });

  const page = await context.newPage();
  await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 60000 });

  // Navigate to the correct pair
  for (let i = 0; i < pair.pairIdx; i++) {
    await page.click('#btn-next-pair');
    await page.waitForTimeout(400);
  }

  // Small pause so the pair is fully rendered before demo starts
  await page.waitForTimeout(500);

  // Start demo mode
  await page.click('#btn-demo');

  // Wait for demo to complete
  await page.waitForTimeout(pair.demoMs);

  // Close context — this finalises the video file
  const videoPath = await page.video().path();
  await context.close();

  // Convert to GIF
  const gifPath = path.join(OUT_DIR, `${pair.name}.gif`);
  console.log(`   Converting ${path.basename(videoPath)} → ${path.basename(gifPath)}`);
  webmToGif(videoPath, gifPath);
  fs.unlinkSync(videoPath);

  const sizeMb = (fs.statSync(gifPath).size / 1_048_576).toFixed(1);
  console.log(`   ✅  Saved ${path.basename(gifPath)} (${sizeMb} MB)`);
}

await browser.close();

// Clean up temp dir if empty
try { fs.rmdirSync(TEMP_DIR); } catch {}

console.log(`\n🎉  All GIFs saved to ${OUT_DIR}/`);
