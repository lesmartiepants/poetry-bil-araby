# GitHub Copilot Instructions for Poetry Bil-Araby

This repository contains a React application for exploring Arabic poetry with AI-powered insights.

## Project Overview

**Poetry Bil-Araby** is a single-page React application featuring:
- Arabic poetry browsing with beautiful typography
- AI-powered audio recitation and analysis via Gemini API
- Dark/light mode theming
- Comprehensive test coverage (113 unit + 180 E2E tests)

**Tech Stack:** React 18, Vite, Tailwind CSS, Lucide React, Gemini API

## Architecture

### Single-File Design
The entire application lives in `src/app.jsx` (~1500+ lines). This is intentional for simplicity.

**Key sections in app.jsx:**
- Feature flags (lines 9-12): Toggle features like `grounding` and `debug`
- Design system constants (lines 14-68): `DESIGN` and `THEME` tokens
- State management: All state in `DiwanApp` component using React hooks
- Components: `Pill`, `Chip`, `Pane`, `ControlBar` (inline components)

**State structure:**
- `poems` - Array of poem data
- `currentIndex` - Currently displayed poem
- `isPlaying` - Audio playback state
- `paneVisible` - Side panel visibility
- `theme` - Dark/light mode toggle

### File Structure
```
src/
├── app.jsx          # Main application (~1500 lines)
├── main.jsx         # React entry point
├── index.css        # Global styles + Tailwind
└── test/            # Unit tests (Vitest)

e2e/
├── app.spec.js      # Core functionality tests
└── ui-ux.spec.js    # Design & accessibility tests
```

## Development Commands

```bash
# Development
npm run dev              # Start Vite dev server (localhost:5173)
npm run build            # Build production bundle
npm run preview          # Preview production build

# Unit Tests (Vitest + React Testing Library)
npm test                 # Watch mode
npm run test:run         # Single run (CI mode)
npm run test:coverage    # Generate coverage report
npm run test:ui          # Open Vitest UI

# E2E Tests (Playwright)
npm run test:e2e         # Run E2E tests (CI: Chrome only)
npm run test:e2e:ui      # UI/UX tests only
npm run test:e2e:headed  # Run with visible browser
npm run test:e2e:debug   # Debug mode with inspector
npm run test:e2e:report  # View HTML report
npm run test:e2e:full    # Full device matrix (6 browsers)
```

## Code Style & Conventions

### React Patterns
- Use functional components with hooks (no class components)
- State management: `useState`, `useEffect`, `useRef`, `useMemo`
- No external state management library (Redux, Zustand, etc.)

### Styling
- **Always use DESIGN and THEME constants** (defined in app.jsx) instead of hardcoding Tailwind classes
- Arabic text: Use `font-amiri` or `font-tajawal` (defined in tailwind.config.js)
- RTL support: Always use `dir="rtl"` for Arabic content
- Theme support: Reference `THEME[theme].*` for colors (supports dark/light)
- Spacing: Use `DESIGN.*` tokens for spacing, typography, and layout

### API Integration
- Gemini API key: `import.meta.env.VITE_GEMINI_API_KEY`
- Never commit API keys (use `.env.local` for local dev)
- Audio synthesis and analysis use Gemini's multimodal capabilities

### Testing Conventions
- **Unit tests:** Fast, focused on logic and component behavior
- **E2E tests:** User-centric flows, verify visual output
- Use `test.describe()` blocks for grouping
- Avoid waiting for `networkidle` - wait for specific elements
- CI uses aggressive timeouts (3s per test)

## Adding Features

1. Check if feature flag should control it (update `FEATURES` object)
2. Add state to `DiwanApp` if needed
3. Use `DESIGN` and `THEME` constants for styling
4. For Gemini API features, update `SYSTEM_PROMPT` if needed
5. Add tests:
   - Unit tests in `src/test/` for logic
   - E2E tests in `e2e/` for user flows

## Git Workflow

### Branch Naming
- `feature/descriptive-name` - New features
- `bugfix/issue-description` - Bug fixes
- `hotfix/critical-fix` - Urgent fixes
- `docs/what-is-documented` - Documentation
- `chore/what-changed` - Maintenance

### Commit Messages (Conventional Commits)
```
<type>(<scope>): <description>

[optional body]

[REQUIRED for fixes: Fixes #123]
```

**Types:** `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`, `ci`

### Issue Tracking
- Always create issues for bugs, test failures, technical debt
- Before fixing: Check `gh issue list`
- Include in commit: `Fixes #123`

## CI/CD Pipeline

Four-stage pipeline (`.github/workflows/ci.yml`):
1. **Build** - Verify compilation, upload artifacts
2. **Unit Tests** - Vitest with coverage → Codecov
3. **E2E Tests** - Playwright (critical browsers only)
4. **UI/UX Tests** - Accessibility and design validation

**CI Behaviors:**
- Runs on push to `main` and all PRs
- Fails fast on first error
- Caches Playwright browsers
- Aggressive timeouts (3s per test)
- CI runs 2 browser configs (Desktop/Mobile Chrome)
- Local runs 6 browser configs (full matrix)

## Common Gotchas

1. **Single File Complexity:** Everything is in `app.jsx`. Use comment headers to navigate:
   ```javascript
   /* ============================================
      1. FEATURE FLAGS & DESIGN SYSTEM
      ============================================ */
   ```

2. **Arabic Typography:** Always test with actual Arabic text. Fonts (Amiri, Tajawal) render differently than Latin.

3. **API Keys:** Never commit `VITE_GEMINI_API_KEY`. Use `.env.local` locally, Vercel env vars in production.

4. **Test Timeouts:** CI has aggressive timeouts. If tests pass locally but fail in CI, check `vitest.config.js` and `playwright.config.js`.

5. **Browser Matrix:** Local dev runs 6 configs. CI runs 2. Use `npm run test:e2e:full` for comprehensive testing.

6. **Theme State:** Not persisted to localStorage. Refreshing resets to dark mode (intentional).

## Documentation

- `CLAUDE.md` - Comprehensive guide for Claude AI
- `.github/TESTING_STRATEGY.md` - Testing strategy
- `.github/CI_CD_GUIDE.md` - CI/CD reference
- `README.md` - User-facing documentation

## Custom Agents (Claude)

This repository includes custom Claude agents in `.claude/agents/`:
- `git-workflow-manager` - Enforces branch naming and commit conventions
- `github-issue-manager` - Creates and manages GitHub issues
- `test-suite-maintainer` - Maintains test quality
- `ui-ux-reviewer` - Reviews UI/UX changes
- `worktree-manager` - Manages git worktrees for parallel work

When suggesting code changes that involve workflow, testing, or git operations, be aware these agents may be invoked by Claude.
