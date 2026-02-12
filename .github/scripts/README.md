# Agent Browser Helper Scripts

This directory contains helper scripts for the agent-browser CI integration.

## Scripts

### agent-browser-debug.sh

**Purpose:** Captures complete browser state when tests fail in CI.

**Usage:**
```bash
./agent-browser-debug.sh <test-url> <output-dir>
```

**Example:**
```bash
./agent-browser-debug.sh http://localhost:5173 ./debug-output
```

**What it captures:**
- Accessibility snapshot (text and JSON formats)
- Full page screenshot
- Console logs
- JavaScript errors
- Page metadata (title, URL, viewport)
- AI-DEBUGGING-GUIDE.md with step-by-step instructions

**Use case:** When E2E or UI/UX tests fail in CI, this script runs automatically to capture the complete browser state for AI agents to debug.

---

### agent-browser-snapshot.sh

**Purpose:** Quick snapshot capture of UI state (lighter than full debug).

**Usage:**
```bash
./agent-browser-snapshot.sh <test-url> <output-file>
```

**Example:**
```bash
./agent-browser-snapshot.sh http://localhost:5173 snapshot.json
```

**What it captures:**
- Accessibility snapshot (JSON for machines)
- Accessibility snapshot (text for humans)

**Use case:** When you just need a quick snapshot of the UI state without full debugging artifacts.

---

### agent-browser-analyze.sh

**Purpose:** Analyzes Playwright test failures and creates AI-friendly reports.

**Usage:**
```bash
./agent-browser-analyze.sh <playwright-report-dir> <output-dir>
```

**Example:**
```bash
./agent-browser-analyze.sh ./test-results ./analysis
```

**What it creates:**
- FAILURE-SUMMARY.md with overview of all failures
- Copies of failure screenshots with descriptive names
- AI debugging instructions

**Use case:** After Playwright tests fail, this script analyzes the test-results directory and creates a summary report for AI agents.

---

## CI Integration

These scripts are called automatically in `.github/workflows/ci.yml` when tests fail:

```yaml
# E2E Tests
- name: Capture browser state with agent-browser
  if: always() && steps.e2e-tests-run.outcome == 'failure'
  run: |
    chmod +x .github/scripts/agent-browser-debug.sh
    .github/scripts/agent-browser-debug.sh "http://localhost:5173" "./agent-browser-debug"

- name: Analyze test failures with agent-browser
  if: always() && steps.e2e-tests-run.outcome == 'failure'
  run: |
    chmod +x .github/scripts/agent-browser-analyze.sh
    .github/scripts/agent-browser-analyze.sh "./test-results" "./agent-browser-analysis"
```

## Local Testing

You can run these scripts locally to test the integration:

```bash
# Start your app first
npm run dev

# In another terminal, run the debug script
./.github/scripts/agent-browser-debug.sh http://localhost:5173 ./local-debug

# View the results
ls -la ./local-debug/
cat ./local-debug/AI-DEBUGGING-GUIDE.md
```

## Requirements

- Node.js and npm installed
- agent-browser package installed (`npm install`)
- A running development server (for capturing snapshots)

## Permissions

All scripts are executable (`chmod +x`). If you get permission errors:

```bash
chmod +x .github/scripts/*.sh
```

## Documentation

For complete documentation on using agent-browser for debugging, see:
- `.github/instructions/agent-browser.instructions.md`
- `.github/CI_CD_GUIDE.md`
