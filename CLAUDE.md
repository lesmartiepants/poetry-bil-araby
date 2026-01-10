# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev              # Start Vite dev server on localhost:5173
npm run build            # Build production bundle to dist/
npm run preview          # Preview production build locally
```

### Testing
```bash
# Unit/Component tests (Vitest)
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once (CI mode)
npm run test:coverage    # Generate coverage report
npm run test:ui          # Open Vitest UI

# E2E tests (Playwright)
npm run test:e2e         # Run E2E tests (CI: Chrome only, Local: all browsers)
npm run test:e2e:ui      # Run only UI/UX tests
npm run test:e2e:headed  # Run with visible browser
npm run test:e2e:debug   # Debug mode with Playwright inspector
npm run test:e2e:report  # Open last test report
npm run test:e2e:full    # Run full browser matrix (all devices)
```

## Architecture

### Single-File Component Design
The entire application lives in `src/app.jsx` (~1700+ lines). This is intentional for simplicity but creates specific patterns you must understand:

**Feature Flags** (app.jsx:14-17)
```javascript
const FEATURES = {
  grounding: false,  // Gemini API grounding
  debug: true,       // Debug panel visibility
};
```
Toggle features here rather than conditionally importing code.

**Onboarding Flow**
The app includes a splash screen and walkthrough guide for first-time users:
- `SplashScreen` (app.jsx:202-298) - Initial landing screen with mystical design
- `WalkthroughGuide` (app.jsx:300-496) - 4-step interactive tutorial
- Skip in tests: Add `?skipSplash=true` URL parameter
- Skip in development: Refresh page to bypass splash after first view

**Design System Constants** (app.jsx:19-75)
- `DESIGN`: Layout, typography, spacing tokens
- `THEME`: Dark/light mode color palettes
- Always use these constants rather than hardcoding Tailwind classes

**System Architecture**
```
┌─────────────────────────────────────────┐
│  DiwanApp (Main Component)              │
│  ├─ State Management (useState hooks)   │
│  ├─ Gemini API Integration              │
│  └─ Utility Components                  │
│     ├─ Pill, Chip (UI primitives)       │
│     ├─ Pane (Side panels)               │
│     └─ ControlBar (Navigation)          │
└─────────────────────────────────────────┘
```

### State Management Pattern
All state lives at the top level in `DiwanApp`:
- `poems` - Array of poem data
- `currentIndex` - Currently displayed poem
- `isPlaying` - Audio playback state
- `paneVisible` - Side panel visibility
- `darkMode` - Dark/light mode toggle
- `showSplash` - Controls splash screen visibility (checks `?skipSplash=true` URL param)
- `showWalkthrough` - Controls walkthrough guide visibility
- `walkthroughStep` - Tracks current step in 4-step tutorial (0-3)

No external state management library. Use React hooks (useState, useEffect, useRef, useMemo).

### Gemini API Integration
API key is injected via environment variable:
```javascript
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
```

**Important:** When testing API features locally, the user must set `VITE_GEMINI_API_KEY` in their environment or in app.jsx. Never commit API keys.

API interactions follow this pattern:
1. User triggers action (e.g., "Seek Insight" button)
2. App sends prompt to Gemini API with `SYSTEM_PROMPT` context
3. Response parsed and displayed in side pane
4. Audio synthesis uses Gemini's multimodal capabilities

### Test Architecture

**Unit Tests** (`src/test/*.test.jsx`)
- Uses Vitest + React Testing Library + happy-dom
- Component tests for utilities and main App
- Run fast (aggressive timeouts in CI: 3s per test)

**E2E Tests** (`e2e/*.spec.js`)
- Uses Playwright
- Two suites:
  - `app.spec.js` - Core functionality tests
  - `ui-ux.spec.js` - Design quality and accessibility (23 tests across 6 devices = 126 total)
- CI runs Chrome only for speed
- Locally runs full device matrix (6 browsers/devices)

**Playwright Browser Setup:**
```bash
# REQUIRED before running E2E tests locally:
npx playwright install chromium webkit firefox

# If SSL certificate errors occur:
# Option 1: Temporary workaround (use with caution)
NODE_TLS_REJECT_UNAUTHORIZED=0 npx playwright install chromium webkit

# Option 2: Push to CI and let tests run there (recommended)
# CI has no SSL issues and caches browsers automatically
```

**Performance Optimizations:**
- `vitest.config.js` - Aggressive timeouts, fail-fast in CI
- `playwright.config.js` - Reduced browser matrix in CI (2 vs 6)
- Both configs detect `process.env.CI` for conditional behavior

### CI/CD Pipeline
Four-stage pipeline in `.github/workflows/ci.yml`:
1. **Build** - Verify compilation, upload artifacts
2. **Unit Tests** - Run Vitest with coverage → Codecov
3. **E2E Tests** - Playwright on critical browsers
4. **UI/UX Tests** - Accessibility and design validation

**Key behaviors:**
- Runs on push to `main` and all PRs
- Fails fast on first error in CI
- Caches Playwright browsers for speed
- Uploads test reports and screenshots as artifacts

## Key Files

- `src/app.jsx` - Entire application (READ THIS FIRST)
- `src/main.jsx` - React entry point (minimal, just renders DiwanApp)
- `src/index.css` - Global styles and Tailwind directives
- `index.html` - HTML shell (includes Arabic fonts from Google Fonts)
- `vite.config.js` - Vite configuration (minimal)
- `vitest.config.js` - Test configuration with CI optimizations
- `playwright.config.js` - E2E test configuration with device matrix
- `tailwind.config.js` - Tailwind with custom font families (Amiri, Tajawal)

## Development Patterns

### Adding a Feature
1. Check if feature flag should control it
2. Add state to `DiwanApp` if needed
3. Use `DESIGN` and `THEME` constants for styling
4. For Gemini API features, update `SYSTEM_PROMPT` if needed
5. Add tests in `src/test/` for logic, `e2e/` for user flows

### Styling Guidelines
- Arabic text uses `font-amiri` or `font-tajawal` (from Tailwind config)
- Always use RTL (`dir="rtl"`) for Arabic content
- Reference `THEME[theme].*` for colors (supports dark/light mode)
- Use `DESIGN.*` for spacing, typography, and layout tokens

### Testing Guidelines
When writing tests:
- Unit tests: Fast, focused on logic and component behavior
- E2E tests: User-centric flows, verify visual output
- Use `test.describe()` blocks for grouping
- `beforeEach` should call `page.goto('/?skipSplash=true')` to bypass onboarding
- CRITICAL: Always use `?skipSplash=true` in E2E tests to prevent splash screen from blocking interactions
- Avoid waiting for `networkidle` (slow) - wait for specific elements instead
- Scope selectors to specific sections (e.g., `page.locator('footer button')`) to avoid conflicts with debug panel

### Modifying CI Behavior
Both `vitest.config.js` and `playwright.config.js` detect `process.env.CI`:
```javascript
testTimeout: process.env.CI ? 3000 : 5000
```
This ensures fast feedback in CI while allowing more relaxed timeouts locally.

## Common Gotchas

1. **Single File Complexity**: Since everything is in `app.jsx`, search carefully for the section you need. The file is organized with comment headers like:
   ```javascript
   /* ============================================
      1. FEATURE FLAGS & DESIGN SYSTEM
      ============================================ */
   ```

2. **Arabic Typography**: Always test with actual Arabic text. The app uses specialized fonts (Amiri, Tajawal) that may render differently than Latin text.

3. **API Key Management**: The app expects `VITE_GEMINI_API_KEY` to be set. In development, this can be set in `.env.local` (gitignored). In production (Vercel), it's set in environment variables.

4. **Test Environment Differences**: CI runs with much more aggressive timeouts. If tests pass locally but fail in CI, check timeout values in config files.

5. **Playwright Browser Matrix**: Local development runs 6 browser configs. CI runs only 2 (Desktop Chrome + Mobile Chrome). Use `npm run test:e2e:full` locally to run the comprehensive suite.

6. **Theme State**: Theme is stored in component state only (not localStorage). Refreshing the page resets to dark mode. This is intentional for simplicity. Theme is synced to `document.documentElement.className` for E2E test verification.

7. **Splash Screen in Tests**: The splash screen displays on first load and blocks all interactions. Always use `?skipSplash=true` URL parameter in E2E tests to bypass it. This is already configured in all E2E test files.

8. **Debug Panel Button Conflicts**: When `FEATURES.debug = true`, debug panel buttons render at the top of the page. Use scoped selectors (e.g., `page.locator('footer button')` or specific classes like `.rounded-full`) to avoid counting debug buttons in test selectors.

## Git Worktrees for Parallel Work

**Use git worktrees to run multiple Claude instances on different tasks simultaneously.**

### Using the worktree-manager Agent

**For complex worktree setups** (multiple worktrees, proper naming, guidance), use the dedicated agent:

```
"Set up worktrees for feature X, bugfix Y, and docs Z"
"I need parallel workspaces for authentication and testing"
"Create worktrees for issues #123, #124, #125"
```

The **worktree-manager** agent handles:
- Creating multiple worktrees with consistent naming
- Guiding you through terminal organization
- Providing cleanup instructions
- Coordinating with other agents

Located at: `.claude/agents/worktree-manager.md`

### Quick Start (Manual)
```bash
# Create single worktree manually
git worktree add ../poetry-feature-a feature/feature-a

# Or create multiple worktrees
git worktree add ../poetry-feature-a feature/feature-a
git worktree add ../poetry-bugfix-b bugfix/issue-123
git worktree add ../poetry-testing feature/test-updates

# Open each in separate terminal tabs
cd ../poetry-feature-a && claude
cd ../poetry-bugfix-b && claude
cd ../poetry-testing && claude
```

### Benefits
- **Parallel Development**: Multiple features simultaneously without branch switching
- **Agent Isolation**: Each Claude instance has its own working directory
- **No Conflicts**: Independent file changes per worktree
- **Faster Context Switching**: No stashing or committing to switch tasks

### Best Practices
1. **Consistent Naming**: Use `../repo-branch-name` pattern for worktree directories
2. **One Terminal Per Worktree**: Keep organized with terminal tabs
3. **Clean Up When Done**: `git worktree remove ../poetry-feature-a`
4. **Shared Git History**: All worktrees share the same `.git` folder

### Example Workflow
```bash
# Main repo: Work on documentation
cd ~/poetry-bil-araby
claude  # Working on docs

# Worktree 1: Refactor authentication (separate terminal)
git worktree add ../poetry-auth feature/auth-refactor
cd ../poetry-auth
claude  # Working on auth

# Worktree 2: Fix test failures (separate terminal)
git worktree add ../poetry-tests bugfix/test-fixes
cd ../poetry-tests
claude  # Fixing tests

# All three Claude instances work independently!
```

### Clean Up
```bash
# When feature is merged
git worktree remove ../poetry-auth
git branch -d feature/auth-refactor  # If merged
```

### iTerm2 Notifications (Mac)
Set up notifications in iTerm2 Preferences → Profiles → Terminal → Notifications to alert when Claude needs attention across multiple worktrees.

## Git Workflow & Issue Tracking

### Branch Protection - NEVER COMMIT TO MAIN

**IMPORTANT: All work must be on feature branches. The git-workflow-manager agent enforces this.**

**Branch Naming:**
- `feature/descriptive-name` - New features
- `bugfix/issue-description` - Bug fixes
- `hotfix/critical-fix` - Urgent fixes
- `docs/what-is-documented` - Documentation only
- `chore/what-changed` - Maintenance

### Conventional Commits (REQUIRED)

```
<type>(<scope>): <description>

[optional body]

[REQUIRED for fixes: Fixes #123]
[OPTIONAL: Related to #456]
```

**Types:** `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`, `ci`

### GitHub Issue Tracking

**Always create issues for:** bugs, test failures, technical debt, coverage gaps

**Before committing a fix:**
1. Check if issue exists: `gh issue list`
2. If NO issue: Call `github-issue-manager` agent to create one
3. Include in commit: `Fixes #123`

**Issue Priorities:**
- P0: Critical (blocks all development)
- P1: High (blocks features)
- P2: Medium (non-blocking)
- P3: Low (nice-to-have)

### GitHub CLI Commands
```bash
gh issue create --title "Title" --body "Description"
gh issue list --label "test-failure" --state open
gh pr create --title "Title" --body "Description"
gh run list --limit 5
```
