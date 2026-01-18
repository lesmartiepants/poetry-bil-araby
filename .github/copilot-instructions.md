# GitHub Copilot Instructions for Poetry Bil-Araby

This repository contains a React application for exploring Arabic poetry with AI-powered insights and database integration.

## Project Overview

**Poetry Bil-Araby** is a full-stack application featuring:
- Arabic poetry browsing with beautiful typography (84K+ poems)
- **Dual-mode architecture**: Database mode (PostgreSQL) + AI mode (Gemini API)
- AI-powered audio recitation and analysis via Gemini API
- Backend Express API server with 5 RESTful endpoints
- Dark/light mode theming
- Comprehensive test coverage (136 unit + 193 E2E tests)

**Tech Stack:** React 18, Vite, Tailwind CSS, Lucide React, Express.js, PostgreSQL, Gemini API

## Architecture

### Single-File Design
The entire frontend application lives in `src/app.jsx` (~2800+ lines). This is intentional for simplicity.

**Key sections in app.jsx:**
- Feature flags (lines 9-15): Toggle features like `database`, `caching`, `streaming`, `prefetching`, `debug`
- Design system constants (lines 14-68): `DESIGN` and `THEME` tokens
- State management: All state in `DiwanApp` component using React hooks
- Components: `Pill`, `Chip`, `Pane`, `ControlBar` (inline components)

**State structure:**
- `poems` - Array of poem data
- `currentIndex` - Currently displayed poem
- `isPlaying` - Audio playback state
- `paneVisible` - Side panel visibility
- `theme` - Dark/light mode toggle
- `mode` - 'database' or 'ai' (dual-mode system)

### Backend Architecture

**Express API Server (server.js):**
- RESTful API with 5 endpoints for poem data
- PostgreSQL database connection (84,329 poems)
- CORS enabled for frontend communication
- Keep-alive ping to prevent cold starts on Render

### File Structure
```
src/
├── app.jsx          # Main application (~2800 lines)
├── main.jsx         # React entry point
├── index.css        # Global styles + Tailwind
└── test/            # Unit tests (Vitest)
    ├── App.test.jsx
    ├── database-components.test.jsx
    └── server.test.js

e2e/
├── app.spec.js               # Core functionality tests
├── database-integration.spec.js  # Database mode tests
└── ui-ux.spec.js             # Design & accessibility tests

server.js            # Express API backend
poetry-database/     # Database schema and migrations
supabase/           # Supabase configuration
render.yaml         # Render deployment config
```

## Development Commands

```bash
# Frontend Development
npm run dev              # Start Vite dev server (localhost:5173)
npm run build            # Build production bundle
npm run preview          # Preview production build

# Backend Development (Database Mode)
npm run dev:server       # Start Express API server (localhost:3001)
npm run dev:all          # Run frontend + backend concurrently

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
- **Database Mode**: Fetch poems from Express API at `VITE_API_URL` (default: `http://localhost:3001`)
  - `GET /api/health` - Health check with poem count
  - `GET /api/poems/random?poet=X` - Random poem (with optional poet filter)
  - `GET /api/poems/by-poet/:poet` - Poems by specific poet
  - `GET /api/poets` - List available poets
  - `GET /api/poems/search?q=text` - Search poems by text
- **AI Mode**: Gemini API key from `import.meta.env.VITE_GEMINI_API_KEY`
- Never commit API keys or database credentials (use `.env.local` for local dev)
- Audio synthesis uses Gemini's multimodal capabilities (AI mode only)
- Database mode supports IndexedDB caching for AI insights

### Testing Conventions
- **Unit tests:** Fast, focused on logic and component behavior (136 tests)
- **E2E tests:** User-centric flows, verify visual output (193+ executions across devices)
- **Database tests:** Test Express API endpoints with PostgreSQL
- Use `test.describe()` blocks for grouping
- Avoid waiting for `networkidle` - wait for specific elements
- CI uses aggressive timeouts (3s per test)
- CI runs PostgreSQL service for database integration tests

## Adding Features

1. Check if feature flag should control it (update `FEATURES` object in app.jsx)
2. Consider dual-mode impact: Does it work in both Database and AI modes?
3. Add state to `DiwanApp` if needed
4. Use `DESIGN` and `THEME` constants for styling
5. For backend features, update `server.js` API endpoints
6. For Gemini API features, update `SYSTEM_PROMPT` if needed
7. Add tests:
   - Unit tests in `src/test/` for logic
   - E2E tests in `e2e/` for user flows
   - Backend tests in `src/test/server.test.js` for API endpoints

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
3. **E2E Tests** - Playwright with PostgreSQL service (critical browsers only)
4. **UI/UX Tests** - Accessibility and design validation

**CI Behaviors:**
- Runs on push to `main` and all PRs
- Fails fast on first error
- Caches Playwright browsers
- PostgreSQL service for database integration tests
- Aggressive timeouts (3s per test)
- CI runs 2 browser configs (Desktop/Mobile Chrome)
- Local runs 6 browser configs (full matrix)

## Common Gotchas

1. **Single File Complexity:** Everything is in `app.jsx` (~2800 lines). Use comment headers to navigate:
   ```javascript
   /* ============================================
      1. FEATURE FLAGS & DESIGN SYSTEM
      ============================================ */
   ```

2. **Dual-Mode Architecture:** Features may behave differently in Database vs AI mode. Test both modes.

3. **Arabic Typography:** Always test with actual Arabic text. Fonts (Amiri, Tajawal) render differently than Latin.

4. **API Keys & Database:** Never commit `VITE_GEMINI_API_KEY` or database credentials. Use `.env.local` locally, Vercel/Render env vars in production.

5. **Test Timeouts:** CI has aggressive timeouts. If tests pass locally but fail in CI, check `vitest.config.js` and `playwright.config.js`.

6. **Browser Matrix:** Local dev runs 6 configs. CI runs 2. Use `npm run test:e2e:full` for comprehensive testing.

7. **Theme State:** Not persisted to localStorage. Refreshing resets to dark mode (intentional).

8. **Backend Dependencies:** Database mode requires PostgreSQL 15+. Frontend-only mode works without backend.

## Documentation

- `CLAUDE.md` - Comprehensive guide for Claude AI
- `.github/TESTING_STRATEGY.md` - Testing strategy
- `.github/CI_CD_GUIDE.md` - CI/CD reference
- `.github/copilot-instructions.md` - This file (GitHub Copilot guidance)
- `.github/instructions/` - Path-specific Copilot instructions
- `DEPLOYMENT.md` - Deployment guide for Render and Vercel
- `README.md` - User-facing documentation

## AI Agents

This repository supports multiple AI coding agents with specialized instructions:

### GitHub Copilot (This File)
- Provides context-aware code suggestions
- Path-specific instructions in `.github/instructions/`
- Helps with React patterns, testing, configuration, and documentation
- **Use Copilot when:** Writing code, getting suggestions, or following repository patterns

### Claude (claude.ai/code)
Custom Claude agents in `.claude/agents/`:
- `git-workflow-manager` - Enforces branch naming and commit conventions
- `github-issue-manager` - Creates and manages GitHub issues
- `test-suite-maintainer` - Maintains test quality
- `ui-ux-reviewer` - Reviews UI/UX changes
- `worktree-manager` - Manages git worktrees for parallel work
- **Use Claude agents when:** Complex tasks require specialized domain expertise

Both Copilot and Claude can act as coding agents in this repository. Choose based on your workflow and the task at hand.
