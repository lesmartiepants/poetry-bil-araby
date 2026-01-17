#!/usr/bin/env node

/**
 * Generic Screenshot Capture Script
 *
 * Captures screenshots of design mockups for the design review system.
 * Supports round-based structure and auto-discovers preview HTML files.
 *
 * Usage:
 *   node capture-template.js <component> <theme> [--round N]
 *
 * Examples:
 *   node capture-template.js splash aurora
 *   node capture-template.js splash aurora --round 2
 *   node capture-template.js control-bar primary --round 1
 *
 * Auto-discovery:
 *   - Scans theme/previews/ directory for HTML files
 *   - Captures both dark and light mode variants
 *   - Generates: mockups/[filename]-dark.png and mockups/[filename]-light.png
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const component = args[0];
const themeId = args[1];
const roundArg = args.find(arg => arg.startsWith('--round'));
const round = roundArg ? parseInt(roundArg.split('=')[1]) : 1;

if (!component || !themeId) {
  console.error('❌ Usage: node capture-template.js <component> <theme> [--round=N]');
  console.error('   Example: node capture-template.js splash aurora --round=2');
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');
const componentDir = path.join(rootDir, component);
const roundDir = path.join(componentDir, `round-${round}`);
const themeDir = path.join(roundDir, themeId);
const previewsDir = path.join(themeDir, 'previews');
const mockupsDir = path.join(themeDir, 'mockups');

console.log(`\n📸 Capturing ${component}/${themeId} (Round ${round})...\n`);

// Validate directories exist
if (!fs.existsSync(roundDir)) {
  console.error(`❌ Round directory not found: ${roundDir}`);
  console.error(`   Run: node start-new-round.js ${component} ${round}`);
  process.exit(1);
}

if (!fs.existsSync(themeDir)) {
  console.error(`❌ Theme directory not found: ${themeDir}`);
  console.error(`   Available themes in round-${round}:`);
  fs.readdirSync(roundDir).forEach(name => {
    if (fs.statSync(path.join(roundDir, name)).isDirectory() && name !== 'current-state') {
      console.error(`   - ${name}`);
    }
  });
  process.exit(1);
}

if (!fs.existsSync(previewsDir)) {
  console.error(`❌ Previews directory not found: ${previewsDir}`);
  console.error('   Create the directory and add HTML preview files first');
  process.exit(1);
}

// Discover HTML files in previews directory
const htmlFiles = fs.readdirSync(previewsDir).filter(file => file.endsWith('.html'));

if (htmlFiles.length === 0) {
  console.error(`❌ No HTML files found in ${previewsDir}`);
  console.error('   Add HTML preview files to the previews/ directory first');
  process.exit(1);
}

console.log(`📋 Found ${htmlFiles.length} preview(s):`);
htmlFiles.forEach(file => console.log(`   • ${file}`));

// Create mockups directory
fs.mkdirSync(mockupsDir, { recursive: true });

// Capture screenshots
async function captureTheme() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  for (const htmlFile of htmlFiles) {
    const baseName = path.basename(htmlFile, '.html');
    const previewPath = path.join(previewsDir, htmlFile);
    const fileUrl = `file://${previewPath}`;

    console.log(`\n📸 Capturing: ${baseName}`);

    try {
      await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(1500); // Wait for animations to settle

      // Capture dark mode (default)
      const darkPath = path.join(mockupsDir, `${baseName}-dark.png`);
      await page.screenshot({ path: darkPath, fullPage: false });
      console.log(`   ✓ Dark: ${baseName}-dark.png`);

      // Check if theme toggle exists and capture light mode
      const themeToggle = await page.locator('button[class*="theme"], button[id*="theme"], .theme-toggle').first();
      const toggleExists = await themeToggle.count() > 0;

      if (toggleExists) {
        await themeToggle.click();
        await page.waitForTimeout(500); // Wait for theme transition

        const lightPath = path.join(mockupsDir, `${baseName}-light.png`);
        await page.screenshot({ path: lightPath, fullPage: false });
        console.log(`   ✓ Light: ${baseName}-light.png`);
      } else {
        console.log(`   ⚠️  No theme toggle found, skipping light mode`);
      }

    } catch (error) {
      console.error(`   ❌ Failed to capture ${htmlFile}:`);
      console.error(`   ${error.message}`);
    }
  }

  await browser.close();
}

// Run capture
captureTheme()
  .then(() => {
    console.log(`\n✅ Capture complete!`);
    console.log(`📂 Screenshots saved to: ${mockupsDir}\n`);
  })
  .catch(error => {
    console.error(`\n❌ Capture failed: ${error.message}\n`);
    process.exit(1);
  });
