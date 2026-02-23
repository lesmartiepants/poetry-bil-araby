import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DESIGN_REVIEW_DIR = path.join(PROJECT_ROOT, 'design-review');
const SCREENSHOTS_DIR = path.join(DESIGN_REVIEW_DIR, 'screenshots');
const DESKTOP_DIR = path.join(SCREENSHOTS_DIR, 'desktop');
const MOBILE_DIR = path.join(SCREENSHOTS_DIR, 'mobile');

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const ANIMATION_SETTLE_MS = 3000;

/**
 * Recursively find all HTML files under a directory,
 * skipping the screenshots/ directory itself.
 */
function findHtmlFiles(dir, rootDir = dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip the screenshots directory
    if (fullPath.startsWith(SCREENSHOTS_DIR)) continue;

    if (entry.isDirectory()) {
      results.push(...findHtmlFiles(fullPath, rootDir));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push({
        absolutePath: fullPath,
        relativePath: path.relative(DESIGN_REVIEW_DIR, fullPath)
      });
    }
  }

  return results;
}

/**
 * Derive a flat screenshot filename from the relative path.
 * e.g. "splash/zen/previews/option-1-refined.html" -> "splash--zen--previews--option-1-refined"
 */
function deriveScreenshotName(relativePath) {
  return relativePath
    .replace(/\.html$/, '')
    .replace(/\//g, '--');
}

/**
 * Try to toggle theme to light mode by clicking a theme button.
 * Returns true if a toggle was found and clicked.
 */
async function tryToggleTheme(page) {
  const themeBtn = page.locator('button').filter({ hasText: /theme|light|dark/i }).first();
  if (await themeBtn.count() > 0) {
    await themeBtn.click().catch(() => {});
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

(async () => {
  // Ensure output directories exist
  fs.mkdirSync(DESKTOP_DIR, { recursive: true });
  fs.mkdirSync(MOBILE_DIR, { recursive: true });

  const htmlFiles = findHtmlFiles(DESIGN_REVIEW_DIR).sort(
    (a, b) => a.relativePath.localeCompare(b.relativePath)
  );

  if (htmlFiles.length === 0) {
    console.log('No HTML files found in design-review/. Nothing to capture.');
    process.exit(0);
  }

  console.log(`Found ${htmlFiles.length} HTML files to capture.\n`);

  const browser = await chromium.launch();
  const manifest = [];

  for (const file of htmlFiles) {
    const name = deriveScreenshotName(file.relativePath);
    const fileUrl = 'file://' + file.absolutePath;
    const entry = {
      filename: file.relativePath,
      desktop: [],
      mobile: [],
      capturedAt: new Date().toISOString()
    };

    try {
      console.log(`Processing: ${file.relativePath}`);

      // --- Desktop captures ---
      const desktopPage = await browser.newPage({ viewport: DESKTOP_VIEWPORT });
      await desktopPage.goto(fileUrl, { waitUntil: 'networkidle', timeout: 15000 });
      await desktopPage.waitForTimeout(ANIMATION_SETTLE_MS);

      // Desktop dark mode
      const desktopDarkFile = `${name}-dark.png`;
      console.log('  Desktop dark...');
      await desktopPage.screenshot({
        path: path.join(DESKTOP_DIR, desktopDarkFile),
        fullPage: false
      });
      entry.desktop.push(desktopDarkFile);

      // Desktop light mode (if theme toggle exists)
      const desktopToggled = await tryToggleTheme(desktopPage);
      if (desktopToggled) {
        const desktopLightFile = `${name}-light.png`;
        console.log('  Desktop light...');
        await desktopPage.screenshot({
          path: path.join(DESKTOP_DIR, desktopLightFile),
          fullPage: false
        });
        entry.desktop.push(desktopLightFile);

        // Toggle back to dark for consistency
        await tryToggleTheme(desktopPage);
      }

      await desktopPage.close();

      // --- Mobile captures ---
      const mobilePage = await browser.newPage({ viewport: MOBILE_VIEWPORT });
      await mobilePage.goto(fileUrl, { waitUntil: 'networkidle', timeout: 15000 });
      await mobilePage.waitForTimeout(ANIMATION_SETTLE_MS);

      // Mobile dark mode
      const mobileDarkFile = `${name}-dark.png`;
      console.log('  Mobile dark...');
      await mobilePage.screenshot({
        path: path.join(MOBILE_DIR, mobileDarkFile),
        fullPage: false
      });
      entry.mobile.push(mobileDarkFile);

      // Mobile light mode (if theme toggle exists)
      const mobileToggled = await tryToggleTheme(mobilePage);
      if (mobileToggled) {
        const mobileLightFile = `${name}-light.png`;
        console.log('  Mobile light...');
        await mobilePage.screenshot({
          path: path.join(MOBILE_DIR, mobileLightFile),
          fullPage: false
        });
        entry.mobile.push(mobileLightFile);

        await tryToggleTheme(mobilePage);
      }

      await mobilePage.close();

      manifest.push(entry);
      console.log(`  Done.\n`);
    } catch (error) {
      console.error(`  Error capturing ${file.relativePath}: ${error.message}\n`);
    }
  }

  await browser.close();

  // Write manifest
  const manifestPath = path.join(SCREENSHOTS_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  // Summary
  const desktopCount = fs.readdirSync(DESKTOP_DIR).filter(f => f.endsWith('.png')).length;
  const mobileCount = fs.readdirSync(MOBILE_DIR).filter(f => f.endsWith('.png')).length;

  console.log('Capture complete.');
  console.log(`  Files processed: ${manifest.length}`);
  console.log(`  Desktop screenshots: ${desktopCount} in design-review/screenshots/desktop/`);
  console.log(`  Mobile screenshots:  ${mobileCount} in design-review/screenshots/mobile/`);
  console.log(`  Manifest: design-review/screenshots/manifest.json`);
})();
