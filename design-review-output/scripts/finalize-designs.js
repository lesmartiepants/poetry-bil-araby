#!/usr/bin/env node

/**
 * Finalize Approved Designs
 *
 * Copies approved designs from the latest round to a "final" directory.
 * Reads the design-review.json to identify which options were kept.
 *
 * Usage:
 *   node finalize-designs.js <component> [--round N]
 *
 * Examples:
 *   node finalize-designs.js splash
 *   node finalize-designs.js splash --round=2
 *   node finalize-designs.js control-bar --round=3
 *
 * This will:
 * 1. Read design-review.json from the specified round
 * 2. Create component/final/ directory
 * 3. Copy approved preview HTML files
 * 4. Copy approved mockup screenshots
 * 5. Generate selected-designs.json summary
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const component = args[0];
const roundArg = args.find(arg => arg.startsWith('--round'));

if (!component) {
  console.error('❌ Usage: node finalize-designs.js <component> [--round=N]');
  console.error('   Example: node finalize-designs.js splash --round=2');
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');
const componentDir = path.join(rootDir, component);

// Auto-detect latest round if not specified
let round;
if (roundArg) {
  round = parseInt(roundArg.split('=')[1]);
} else {
  // Find highest round number
  const rounds = fs.readdirSync(componentDir)
    .filter(name => name.startsWith('round-'))
    .map(name => parseInt(name.replace('round-', '')))
    .sort((a, b) => b - a);

  if (rounds.length === 0) {
    console.error(`❌ No rounds found in ${componentDir}`);
    process.exit(1);
  }

  round = rounds[0];
  console.log(`📍 Auto-detected latest round: ${round}`);
}

const roundDir = path.join(componentDir, `round-${round}`);
const finalDir = path.join(componentDir, 'final');
const feedbackPath = path.join(roundDir, 'design-review.json');

console.log(`\n🎯 Finalizing designs from ${component}/round-${round}...\n`);

// Validate round exists
if (!fs.existsSync(roundDir)) {
  console.error(`❌ Round directory not found: ${roundDir}`);
  process.exit(1);
}

// Check for feedback JSON
if (!fs.existsSync(feedbackPath)) {
  console.error(`❌ No design-review.json found in round-${round}`);
  console.error('   Export your feedback from the review interface first');
  process.exit(1);
}

// Read feedback
const feedback = JSON.parse(fs.readFileSync(feedbackPath, 'utf-8'));

if (!feedback.selections || feedback.selections.length === 0) {
  console.error(`❌ No selections found in design-review.json`);
  console.error('   Mark some designs as "kept" in the review interface first');
  process.exit(1);
}

console.log(`✓ Found ${feedback.selections.length} approved designs\n`);

// Create final directory
fs.mkdirSync(finalDir, { recursive: true });

// Copy each approved design
const finalizedDesigns = [];

for (const selection of feedback.selections) {
  const { key, theme, option, description, note } = selection;
  const [themeId, optionNum] = key.split('-');

  console.log(`📦 Finalizing: ${theme} - ${option}`);

  const themeDir = path.join(roundDir, themeId);
  if (!fs.existsSync(themeDir)) {
    console.warn(`   ⚠️  Theme directory not found: ${themeId}`);
    continue;
  }

  // Find preview HTML file
  const previewsDir = path.join(themeDir, 'previews');
  if (fs.existsSync(previewsDir)) {
    const previewFiles = fs.readdirSync(previewsDir)
      .filter(f => f.includes(`option-${optionNum}`) && f.endsWith('.html'));

    if (previewFiles.length > 0) {
      const previewFile = previewFiles[0];
      const srcPath = path.join(previewsDir, previewFile);
      const destPath = path.join(finalDir, `${themeId}-${previewFile}`);

      fs.copyFileSync(srcPath, destPath);
      console.log(`   ✓ Preview: ${themeId}-${previewFile}`);

      finalizedDesigns.push({
        key,
        theme,
        option,
        description,
        note,
        previewFile: `${themeId}-${previewFile}`
      });
    }
  }

  // Copy mockup screenshots
  const mockupsDir = path.join(themeDir, 'mockups');
  if (fs.existsSync(mockupsDir)) {
    const mockupFiles = fs.readdirSync(mockupsDir)
      .filter(f => f.includes(`option-${optionNum}`) && f.endsWith('.png'));

    if (mockupFiles.length > 0) {
      const mockupDestDir = path.join(finalDir, 'mockups');
      fs.mkdirSync(mockupDestDir, { recursive: true });

      mockupFiles.forEach(mockupFile => {
        const srcPath = path.join(mockupsDir, mockupFile);
        const destPath = path.join(mockupDestDir, `${themeId}-${mockupFile}`);
        fs.copyFileSync(srcPath, destPath);
      });

      console.log(`   ✓ Mockups: ${mockupFiles.length} screenshots`);
    }
  }

  console.log('');
}

// Generate summary JSON
const summary = {
  component,
  round,
  timestamp: new Date().toISOString(),
  totalSelected: finalizedDesigns.length,
  designs: finalizedDesigns
};

const summaryPath = path.join(finalDir, 'selected-designs.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

console.log(`\n✅ Finalization complete!\n`);
console.log(`📂 Location: ${finalDir}`);
console.log(`📊 Summary: ${finalizedDesigns.length} designs finalized from round-${round}`);
console.log(`📝 Details: ${summaryPath}\n`);
