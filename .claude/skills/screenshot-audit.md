---
name: screenshot-audit
description: Runs screenshot automation across all E2E design files, then spawns design-reviewer agents in parallel to evaluate and fix issues.
user_invocable: true
---

# Screenshot Audit

Automate screenshot capture across all design files and spawn parallel reviewers to evaluate quality.

## Invocation

When the user runs `/screenshot-audit`, execute the following workflow.

## Phase 1: Discovery & Screenshot Capture

1. **Locate screenshot automation scripts:**
   - Check for `screenshot-audit.mjs`, `scripts/screenshots.js`, or similar
   - Check for Playwright screenshot configs in `playwright.config.js`
   - If no script exists, inform the user and offer to create one

2. **Discover design files to audit:**
   ```bash
   # Find all design/E2E files
   find . -name "*.spec.js" -o -name "*.spec.ts" | head -50
   ls e2e/ tests/ src/test/ 2>/dev/null
   ```

3. **Run screenshot automation:**
   ```bash
   # Execute screenshot script (project-specific)
   node scripts/screenshot-audit.mjs
   # Or run Playwright with screenshot flags
   npx playwright test --update-snapshots
   ```

4. **Verify screenshots captured:**
   - Count screenshots generated
   - Check for any capture failures
   - Report coverage (files with screenshots vs. total files)

## Phase 2: Parallel Review

1. **Batch screenshots into review groups:**
   - Group by directory or feature area
   - Target 5-10 screenshots per reviewer batch
   - Create review tasks for each batch

2. **Spawn design-reviewer agents in parallel:**
   - Each reviewer receives its batch of screenshots
   - Reviewers evaluate against quality signals:
     - Visual consistency (layout, spacing, alignment)
     - Responsive behavior (mobile vs. desktop)
     - Accessibility (contrast, text size, interactive elements)
     - Brand compliance (colors, typography, imagery)
   - Reviewers fix issues directly when possible (CSS, layout, content)

3. **Monitor review progress:**
   - Track completion via task system
   - Collect pass/fail results per screenshot
   - Handle reviewer-flagged issues

## Phase 3: Fix & Verify

1. **Collect all reviewer findings:**
   - Issues fixed automatically by reviewers
   - Issues requiring manual intervention
   - Screenshots that pass all checks

2. **Re-capture screenshots for fixed files:**
   ```bash
   # Re-run screenshot capture for modified files
   node scripts/screenshot-audit.mjs --files <modified-files>
   ```

3. **Commit fixes:**
   ```bash
   git add -A
   git commit -m "fix(design): resolve screenshot audit issues"
   git push
   ```

## Phase 4: Report

Generate audit summary:
- Total files audited
- Screenshots captured
- Issues found and auto-fixed
- Issues requiring manual attention
- Before/after comparison (if applicable)
- Overall quality score
