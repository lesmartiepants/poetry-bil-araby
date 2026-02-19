# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Frontend
npm run dev              # Start Vite dev server on localhost:5173
npm run build            # Build production bundle to dist/
npm run preview          # Preview production build locally

# Backend (Database Mode)
npm run dev:server       # Start Express API server on localhost:3001
npm run dev:all          # Run frontend + backend concurrently
```

### Testing
```bash
# Unit Tests (Vitest)
npm test                 # Watch mode
npm run test:run         # CI mode
npm run test:coverage    # Coverage report

# E2E Tests (Playwright)
npm run test:e2e         # CI: Chrome only, Local: full matrix
npm run test:e2e:headed  # Visible browser
npm run test:e2e:debug   # Debug mode
```

## Architecture

### Single-File Component Design
The entire application lives in `src/app.jsx` (~1500+ lines). This is intentional for simplicity but creates specific patterns you must understand:

**Feature Flags** (app.jsx:9-18)
```javascript
const FEATURES = {
  grounding: false,   // Experimental: Google Search grounding
  debug: true,        // Debug panel visibility
  logging: true,      // Emit structured logs to console (captured by Vercel/browser)
  caching: true,      // IndexedDB caching for AI insights
  streaming: true,    // Streaming AI responses
  prefetching: true,  // Aggressive prefetching
  database: true      // Enable database poem source (requires backend)
};
```
Toggle features here rather than conditionally importing code.

**Design Constants** (app.jsx:14-68): `DESIGN` (layout/typography), `THEME` (colors). Never hardcode styles.

**Architecture:** Single-file React app with dual-mode system (Database/AI), Express backend, React hooks state management.

### Backend Integration

**Dual-Mode Architecture:**
The app supports two poem sources:
1. **Database Mode**: Fetches from PostgreSQL via Express API (84,329 poems)
2. **AI Mode**: Generates using Gemini API (existing behavior)

**Database Mode (server.js):**
- Express API server with 5 RESTful endpoints:
  - `GET /api/health` - Health check with poem count
  - `GET /api/poems/random` - Random poem (supports ?poet= filter)
  - `GET /api/poems/by-poet/:poet` - Poems by specific poet
  - `GET /api/poets` - List available poets
  - `GET /api/poems/search` - Search poems by text
- PostgreSQL connection via `pg` library
- Supports DATABASE_URL (production) or individual env vars (local)
- Keep-alive ping every 10 min to prevent Render cold starts

**Environment Variables:**
```javascript
// Frontend (VITE_ prefix)
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
VITE_SUPABASE_URL      // Supabase project URL (optional, for auth features)
VITE_SUPABASE_ANON_KEY // Supabase anonymous key (optional, for auth features)

// Backend (server.js)
DATABASE_URL       // Supabase/Render connection string (production)
PGUSER            // PostgreSQL username (local, defaults to $USER)
PGHOST            // PostgreSQL host (local, defaults to localhost)
PGDATABASE        // Database name (local, defaults to qafiyah)
PGPASSWORD        // Database password (local, defaults to empty)
PGPORT            // Database port (local, defaults to 5432)
PORT              // API server port (defaults to 3001)
LOG_ENABLED       // Enable HTTP request logging (defaults to true)
LOG_DEBUG         // Enable verbose database debug logs (defaults to false)
```

**Important:** Never commit API keys or database credentials.

**API Interaction Pattern:**
- Database Mode: Fetch from `/api/poems/random?poet=X`
- AI Mode: Send prompt to Gemini API with SYSTEM_PROMPT context
- Audio synthesis uses Gemini's multimodal capabilities (AI mode only)

### Test Architecture

**Unit Tests:** Vitest + React Testing Library (136 tests)
**E2E Tests:** Playwright (3 suites: app, database, ui-ux | 193+ executions)
**CI Pipeline:** Build → Unit Tests → E2E (with PostgreSQL) → UI/UX
**Setup:** `npx playwright install chromium webkit firefox`

## Key Files (Absolute Paths)

**Core:** `src/app.jsx` (main app), `src/hooks/useAuth.js` (auth hooks), `src/supabaseClient.js` (Supabase config), `server.js` (API), `package.json` (scripts)
**Tests:** `src/test/*.test.jsx`, `src/test/auth.test.jsx`, `e2e/*.spec.js`
**Config:** `vite.config.js`, `vitest.config.js`, `playwright.config.js`, `tailwind.config.js`
**Migrations:** `supabase/migrations/*.sql` (auth & user features, PostgREST schema grants)
**Docs:** `README.md`, `DEPLOYMENT.md`, `docs/AUTHENTICATION_SETUP.md`, `.github/TESTING_STRATEGY.md`

## Common Gotchas

1. **Single File Complexity**: Since everything is in `app.jsx`, search carefully for the section you need. The file is organized with comment headers like:
   ```javascript
   /* ============================================
      1. FEATURE FLAGS & DESIGN SYSTEM
      ============================================ */
   ```

2. **Arabic Typography**: Always test with actual Arabic text. The app uses specialized fonts (Amiri, Tajawal) that may render differently than Latin text.

3. **Environment Variable Management**:
   - Frontend: `VITE_GEMINI_API_KEY` (AI mode), `VITE_API_URL` (database mode), `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (auth, optional)
   - Backend: `DATABASE_URL` (production) or individual PG* vars (local), `LOG_ENABLED` and `LOG_DEBUG` (logging control)
   - Development: Set in `.env.local` (gitignored)
   - Production: Set in Vercel (frontend) and Render (backend)
   - **Important**: Supabase anon keys must be in JWT format (long strings starting with `eyJ`)

4. **Test Environment Differences**: CI runs with much more aggressive timeouts. If tests pass locally but fail in CI, check timeout values in config files.

5. **Playwright Browser Matrix**: Local development runs 6 browser configs. CI runs only 2 (Desktop Chrome + Mobile Chrome). Use `npm run test:e2e:full` locally to run the comprehensive suite.

6. **Theme State**: Theme is stored in component state only (not localStorage). Refreshing the page resets to dark mode. This is intentional for simplicity.

7. **Database Mode Requirements**: To use database mode locally:
   - Install PostgreSQL 15+ (17 required for Supabase auth features due to `gen_random_uuid()` requirement)
   - Create `qafiyah` database
   - Start backend: `npm run dev:server`
   - Start frontend: `npm run dev`
   - Or use `npm run dev:all` to run both concurrently

8. **Authentication (Optional)**: Supabase auth features are optional:
   - App works fully without authentication
   - When configured, enables saved poems and persistent settings
   - Requires running migrations: `supabase db push`
   - PostgREST schema grants migration required for Supabase Data API access

9. **Structured Logging**: Three-layer logging system:
   - **Frontend**: `FEATURES.logging` flag (app.jsx) emits logs to console
   - **Backend**: `LOG_ENABLED` (HTTP requests) and `LOG_DEBUG` (verbose DB queries) env vars
   - **Auth Hooks**: Structured logger in `useAuth.js` for auth/settings/saved poems operations
   - All logs formatted as `[Context:Label] message data` for easy filtering

10. **Backend Keep-Alive**: Frontend pings backend every 10 minutes when in database mode to prevent Render free tier cold starts (15 min timeout).

## Git Workflow

**Branch Protection:** Never commit to main. Use feature branches (`feature/`, `bugfix/`, `docs/`, `chore/`).

**Conventional Commits Required:**
```
<type>(<scope>): <description>

[optional body]
[Fixes #123]  # REQUIRED for bug fixes
```

**Types:** `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`, `ci`

**GitHub Issue Tracking:**
- Always create issues for bugs/failures
- Check existing: `gh issue list`
- Link in commits: `Fixes #123`
- Use `github-issue-manager` agent for complex issues

**Git Worktrees:**
Use `worktree-manager` agent (`.claude/agents/worktree-manager.md`) for parallel development:
```bash
git worktree add ../poetry-feature-a feature/feature-a
cd ../poetry-feature-a && claude
```
