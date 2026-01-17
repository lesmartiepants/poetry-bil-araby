#!/usr/bin/env node

/**
 * Start New Design Review Round
 *
 * Creates a new round directory structure for iterative design refinement.
 * Reads feedback from the previous round and sets up the new round with
 * only the themes that need work.
 *
 * Usage:
 *   node start-new-round.js <component> <round-number>
 *
 * Example:
 *   node start-new-round.js splash 2
 *
 * This will:
 * 1. Create design-review-output/splash/round-2/ directory
 * 2. Copy review HTML templates from round-1
 * 3. Copy previous feedback JSON as FEEDBACK-FROM-ROUND-1.json
 * 4. Create theme directories for designs that need revision
 * 5. Generate a round-specific theme config
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const [component, roundNumber] = process.argv.slice(2);

if (!component || !roundNumber) {
  console.error('❌ Usage: node start-new-round.js <component> <round-number>');
  console.error('   Example: node start-new-round.js splash 2');
  process.exit(1);
}

const round = parseInt(roundNumber);
if (isNaN(round) || round < 2) {
  console.error('❌ Round number must be 2 or higher');
  process.exit(1);
}

const previousRound = round - 1;
const rootDir = path.join(__dirname, '..');
const componentDir = path.join(rootDir, component);
const previousRoundDir = path.join(componentDir, `round-${previousRound}`);
const newRoundDir = path.join(componentDir, `round-${round}`);

console.log(`\n🎨 Starting Round ${round} for ${component}...\n`);

// Validate previous round exists
if (!fs.existsSync(previousRoundDir)) {
  console.error(`❌ Previous round not found: ${previousRoundDir}`);
  console.error(`   Make sure round-${previousRound} exists before creating round-${round}`);
  process.exit(1);
}

// Check if new round already exists
if (fs.existsSync(newRoundDir)) {
  console.error(`❌ Round ${round} already exists: ${newRoundDir}`);
  console.error('   Delete it first or use a higher round number');
  process.exit(1);
}

// Create new round directory
console.log(`📁 Creating ${newRoundDir}...`);
fs.mkdirSync(newRoundDir, { recursive: true });

// Copy review HTML templates
console.log(`📄 Copying review HTML templates...`);
const htmlFiles = [
  'interactive-review.html',
  'master-comparison.html',
  'streamlined-review.html'
];

htmlFiles.forEach(file => {
  const srcPath = path.join(previousRoundDir, file);
  const destPath = path.join(newRoundDir, file);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`   ✓ ${file}`);
  } else {
    console.warn(`   ⚠️  ${file} not found in previous round`);
  }
});

// Copy feedback JSON from previous round
console.log(`\n💬 Looking for feedback from round-${previousRound}...`);
const previousFeedbackPath = path.join(previousRoundDir, 'design-review.json');

if (fs.existsSync(previousFeedbackPath)) {
  const feedbackDestPath = path.join(newRoundDir, `FEEDBACK-FROM-ROUND-${previousRound}.json`);
  fs.copyFileSync(previousFeedbackPath, feedbackDestPath);
  console.log(`   ✓ Copied to FEEDBACK-FROM-ROUND-${previousRound}.json`);

  // Parse feedback to identify themes that need work
  const feedback = JSON.parse(fs.readFileSync(previousFeedbackPath, 'utf-8'));

  // Extract unique themes from feedback
  const themesNeedingWork = new Set();

  if (feedback.selections) {
    feedback.selections.forEach(selection => {
      // Extract theme from key (e.g., "particles-1" -> "particles")
      const themeId = selection.key.split('-')[0];
      themesNeedingWork.add(themeId);
    });
  }

  if (feedback.allNotes) {
    Object.keys(feedback.allNotes).forEach(key => {
      const themeId = key.split('-')[0];
      themesNeedingWork.add(themeId);
    });
  }

  console.log(`\n🎯 Identified ${themesNeedingWork.size} themes needing work:`);
  themesNeedingWork.forEach(theme => console.log(`   • ${theme}`));

  // Create theme directories
  console.log(`\n📂 Creating theme directories...`);
  themesNeedingWork.forEach(themeId => {
    const themeDir = path.join(newRoundDir, themeId);
    fs.mkdirSync(themeDir, { recursive: true });

    // Create subdirectories
    fs.mkdirSync(path.join(themeDir, 'mockups'), { recursive: true });
    fs.mkdirSync(path.join(themeDir, 'previews'), { recursive: true });

    console.log(`   ✓ ${themeId}/ (with mockups/ and previews/)`);
  });

  // Generate round-specific theme config
  const configPath = path.join(__dirname, 'config', `${component}-themes.json`);
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const roundConfig = {
      ...config,
      round: round,
      previousRound: previousRound,
      themes: config.themes.filter(theme => themesNeedingWork.has(theme.id))
    };

    const roundConfigPath = path.join(newRoundDir, `round-${round}-themes.json`);
    fs.writeFileSync(roundConfigPath, JSON.stringify(roundConfig, null, 2));
    console.log(`\n📋 Generated round-${round}-themes.json with ${roundConfig.themes.length} themes`);
  }

} else {
  console.warn(`   ⚠️  No design-review.json found in round-${previousRound}`);
  console.warn('   Continuing anyway, but you may need to manually identify themes to work on');
}

// Copy shared current-state directory if it exists
const currentStateDir = path.join(previousRoundDir, 'current-state');
if (fs.existsSync(currentStateDir)) {
  console.log(`\n📸 Copying shared current-state screenshots...`);
  const destCurrentState = path.join(newRoundDir, 'current-state');

  // Simple recursive copy
  function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  copyDir(currentStateDir, destCurrentState);
  console.log(`   ✓ Copied current-state directory`);
}

// Create README for the new round
const readmeContent = `# Round ${round} - ${component.charAt(0).toUpperCase() + component.slice(1)} Design Review

This round refines designs based on feedback from Round ${previousRound}.

## Feedback Summary

See \`FEEDBACK-FROM-ROUND-${previousRound}.json\` for detailed feedback from the previous round.

## Themes in This Round

${Array.from(fs.readdirSync(newRoundDir))
  .filter(name => {
    const stat = fs.statSync(path.join(newRoundDir, name));
    return stat.isDirectory() && !name.startsWith('.');
  })
  .filter(name => name !== 'current-state')
  .map(name => `- **${name}**: Refinements based on user feedback`)
  .join('\n')}

## Workflow

1. **Review feedback**: Read \`FEEDBACK-FROM-ROUND-${previousRound}.json\` to understand what needs changing
2. **Create new HTML previews**: Add refined designs to each theme's \`previews/\` folder
3. **Capture screenshots**: Run \`node ../scripts/capture-template.js ${component} <theme> --round ${round}\`
4. **Review**: Open \`streamlined-review.html\` or \`interactive-review.html\` in browser
5. **Provide feedback**: Mark keepers and add notes
6. **Export**: Click "Export" button to save \`design-review.json\`

## Next Round

When ready for Round ${round + 1}:

\`\`\`bash
node ../scripts/start-new-round.js ${component} ${round + 1}
\`\`\`
`;

fs.writeFileSync(path.join(newRoundDir, 'README.md'), readmeContent);
console.log(`\n📝 Created README.md with workflow instructions`);

console.log(`\n✅ Round ${round} setup complete!\n`);
console.log(`📂 Location: ${newRoundDir}`);
console.log(`\n🚀 Next steps:`);
console.log(`   1. Read FEEDBACK-FROM-ROUND-${previousRound}.json`);
console.log(`   2. Create new HTML preview files in theme/previews/ folders`);
console.log(`   3. Capture screenshots with capture-template.js`);
console.log(`   4. Review designs in ${component}/round-${round}/streamlined-review.html\n`);
