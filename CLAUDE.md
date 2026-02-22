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
The entire application lives in `src/app.jsx` (~2700+ lines). This is intentional for simplicity but creates specific patterns you must understand:

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
- Keep-alive self-ping every 9-13 min (randomized) to prevent Render cold starts (production only)

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

## Agent System

9 specialized agents live in `.claude/agents/`. Cursor discovers them via `.cursor/rules/agents.mdc`.

**Agents:** `test-orchestrator`, `test-suite-maintainer`, `test-coverage-reviewer`, `ci-test-guardian`, `git-workflow-manager`, `worktree-manager`, `github-issue-manager`, `docs-sync-reviewer`, `ui-ux-reviewer`

**Maintenance Rule -- MANDATORY when creating or modifying agents:**
1. Update `.cursor/rules/agents.mdc` -- keep the Agent Registry table, coordination flow, and file list in sync
2. Update this section of `CLAUDE.md` -- keep the agent list above current
3. If the new/changed agent alters coordination patterns, update the flow diagram and Key Coordination Patterns in `.cursor/rules/agents.mdc`

## Key Files (Absolute Paths)

**Core:** `src/app.jsx` (main app), `src/hooks/useAuth.js` (auth hooks), `src/supabaseClient.js` (Supabase config), `server.js` (API), `package.json` (scripts)
**Tests:** `src/test/*.test.jsx`, `src/test/auth.test.jsx`, `e2e/*.spec.js`
**Config:** `vite.config.js`, `vitest.config.js`, `playwright.config.js`, `tailwind.config.js`
**Migrations:** `supabase/migrations/*.sql` (auth & user features, PostgREST schema grants)
**Agents:** `.claude/agents/*.md` (9 agent definitions), `.cursor/rules/agents.mdc` (Cursor discovery)
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

10. **Backend Keep-Alive**: Backend uses self-ping mechanism (pings itself every 9-13 minutes with randomized intervals in production) to prevent Render free tier cold starts (15 min timeout). Frontend also provides backup pings when users have the app open.

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

## Security: API Keys & Sensitive Tokens

**CRITICAL: Never expose API keys, tokens, or credentials in chat or terminal output.**

### The Golden Rule
> **Claude MUST NEVER display, echo, or log the actual values of API keys, tokens, passwords, or any sensitive credentials.**

### Required Pattern for All Sensitive Data

#### 1. Always Ask for the Environment Variable Name
- BAD: "What's your Supabase API key?"
- GOOD: "What's the name of your environment variable? (e.g., SUPABASE_SERVICE_ROLE_KEY)"

#### 2. Verify Existence Without Exposing Value
```bash
# Check if key exists in .env file
grep -q "^SUPABASE_SERVICE_ROLE_KEY=" .env && echo "Found" || echo "Not found"

# Verify it's not empty (without showing value)
[ -n "$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env | cut -d'=' -f2-)" ] && echo "Has value" || echo "Empty"
```

#### 3. Use Variables in Commands (Never Inline Values)
```bash
# CORRECT: Use environment variable
source .env && supabase link --project-ref $PROJECT_REF

# WRONG: Never do this
supabase link --project-ref abcd1234xyz  # Exposes the ref!

# CORRECT: For API requests
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" https://api.example.com

# WRONG: Never inline the token
curl -H "Authorization: Bearer eyJhbGc..." https://api.example.com
```

### User Setup Instructions

When a user needs to set up API keys, guide them through this process:

```bash
# 1. Create .env file if it doesn't exist
cat > .env << 'EOF'
# Supabase Configuration
SUPABASE_PROJECT_REF=your-project-ref-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_PERSONAL_ACCESS_TOKEN=your-personal-access-token-here

# Gemini API
VITE_GEMINI_API_KEY=your-gemini-api-key-here

# Add other keys as needed
EOF

# 2. Ensure .env is gitignored (verify)
grep -q "^\.env$" .gitignore && echo ".env is gitignored" || echo ".env" >> .gitignore

# 3. Set proper permissions
chmod 600 .env
```

### Validating Setup (Without Exposure)

```bash
# Check all required keys are present
required_keys=("SUPABASE_PROJECT_REF" "SUPABASE_SERVICE_ROLE_KEY" "VITE_GEMINI_API_KEY")
for key in "${required_keys[@]}"; do
    if grep -q "^${key}=" .env && [ -n "$(grep "^${key}=" .env | cut -d'=' -f2-)" ]; then
        echo "$key is configured"
    else
        echo "$key is missing or empty"
    fi
done
```

### If a Token Gets Exposed

If you or Claude accidentally exposes a token in chat or terminal:

1. **Immediately rotate/regenerate** the token in the service's dashboard:
   - Supabase: Project Settings > API > Generate new key
   - Gemini: Google AI Studio > Get API Key > Regenerate
   - GitHub: Settings > Developer settings > Personal access tokens > Regenerate
2. **Update .env** with the new token:
   ```bash
   # Edit .env securely (opens in default editor)
   nano .env  # or vim, code, etc.
   ```
3. **Verify the old token is revoked:**
   ```bash
   # Test that old token no longer works (use new one)
   source .env && curl -H "Authorization: Bearer $YOUR_TOKEN_NAME" <endpoint>
   ```
4. **For Git history exposure:**
   - If committed: Rotate immediately, rewrite history with `git filter-branch` or BFG Repo Cleaner
   - If pushed to remote: Treat as compromised permanently, rotate ALL tokens

### Common Scenarios

**Scenario 1: Supabase CLI Authentication**
```bash
# CORRECT
source .env && echo $SUPABASE_PERSONAL_ACCESS_TOKEN | supabase login

# WRONG - exposes token in terminal history
supabase login --token sbp_abc123xyz...
```

**Scenario 2: Testing API Endpoints**
```bash
# CORRECT - token stays hidden
source .env && curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "https://your-project.supabase.co/rest/v1/poems" | jq '.[] | .title'

# WRONG - token visible in output and history
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1..." https://...
```

**Scenario 3: Debugging Environment Variables**
```bash
# CORRECT - confirm variables are loaded without showing values
source .env && env | grep -E "SUPABASE|GEMINI" | cut -d'=' -f1

# WRONG - prints all values
env | grep SUPABASE
```

### Claude's Responsibilities

As Claude, when working with sensitive data:

1. Always ask for variable names, never ask for actual values
2. Use bash commands that reference variables, never echo/print their values
3. Verify setup using existence checks, not value checks
4. If you need to use a token in a command, use `$VARIABLE_NAME` pattern
5. Educate the user if they try to paste a token directly in chat
6. Never read `.env` file contents directly -- only use bash to check existence and retrieve values without displaying them

### Example Claude Behavior

**User:** "I need to set up Supabase CLI"

**Claude:** "I'll help you set up Supabase CLI authentication. First, what's the name of your environment variable for the Supabase personal access token?

It's typically called `SUPABASE_PERSONAL_ACCESS_TOKEN` and should be in your `.env` file.

If you don't have it yet:
1. Go to https://supabase.com/dashboard/account/tokens
2. Generate a new personal access token
3. Add it to your `.env` file as `SUPABASE_PERSONAL_ACCESS_TOKEN=<token>`

Once it's in `.env`, I can help you authenticate without exposing the token."

### Testing in CI/CD

In GitHub Actions, use repository secrets (never commit tokens):

```yaml
env:
  VITE_GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
  SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

Secrets are automatically masked in logs, but still follow the principle of minimal exposure.
