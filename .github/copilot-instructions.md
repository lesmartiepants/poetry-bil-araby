# GitHub Copilot Instructions for Poetry Bil-Araby

Full-stack Arabic poetry app: React frontend (app.jsx ~2800 lines) + Express API + PostgreSQL (84K poems).

## Architecture

**Dual-Mode:** Database (PostgreSQL API) + AI (Gemini API)
**Frontend:** Single-file React in `src/app.jsx` with DESIGN/THEME constants
**Backend:** Express server (`server.js`) with 5 REST endpoints
**Tests:** 136 unit (Vitest) + 193 E2E (Playwright)
**CI/CD:** Integrated with agent-browser for AI-powered debugging

### Key Files
- `src/app.jsx` - Main app, feature flags (lines 9-15), DESIGN/THEME constants
- `server.js` - Express API, PostgreSQL connection
- `src/test/` - Unit tests (Vitest + Supertest)
- `e2e/` - Playwright tests (app, database, ui-ux)
- `.github/workflows/ci.yml` - CI pipeline with agent-browser integration
- `.github/scripts/` - Agent-browser helper scripts for debugging

## Development

```bash
npm run dev          # Frontend (localhost:5173)
npm run dev:server   # Backend API (localhost:3001)
npm run dev:all      # Both concurrently
npm test             # Unit tests
npm run test:e2e     # E2E tests
```

## Code Conventions

**React:**
- Functional components with hooks only
- State in `DiwanApp` component
- Use DESIGN/THEME constants, not hardcoded Tailwind classes

**Styling:**
- Arabic text: `font-amiri` (poems) or `font-tajawal` (UI)
- Always use `dir="rtl"` for Arabic content
- Reference `THEME[theme].*` for colors (dark/light mode)

**API:**
- Database mode: Fetch from `VITE_API_URL` (default: localhost:3001)
- AI mode: Use `VITE_GEMINI_API_KEY`
- Never commit API keys or credentials

**Testing:**
- Unit: Fast, focused on logic (getByRole > getByText > getByTestId)
- E2E: Wait for specific elements, not networkidle
- CI: 3s timeout per test, PostgreSQL service for integration tests

## Key Patterns

**Backend (server.js):**
- Parameterized queries only (prevent SQL injection)
- Connection pooling with `pg.Pool`
- Try-catch for all database queries
- Return 200/404/500 status codes

**Adding Features:**
1. Check if feature flag needed (FEATURES object)
2. Consider dual-mode impact (Database + AI)
3. Use DESIGN/THEME constants
4. Add tests (unit + E2E + backend if needed)

## Common Issues

- Single file: `app.jsx` ~2800 lines, use comment headers to navigate
- Dual-mode: Test both Database and AI modes
- Arabic: Test with actual Arabic text (العنوان not al-'unwān)
- CI timeouts: Aggressive (3s), check vitest/playwright configs if local passes but CI fails

## Documentation

See `.github/instructions/` for path-specific guidance on React, tests, configs, and backend.

## Debugging Test Failures in CI

**Agent Browser Integration:** When tests fail in CI, agent-browser automatically captures:
- Accessibility snapshots with element refs (@e1, @e2, etc.)
- Full page screenshots
- Console logs and JavaScript errors
- Page metadata

**How to debug:**
1. Download `agent-browser-debug-*` artifact from failed workflow
2. Read `AI-DEBUGGING-GUIDE.md` for step-by-step instructions
3. Check `js-errors.txt` for JavaScript errors
4. Review `accessibility-snapshot.txt` for page structure
5. View `page-screenshot.png` for visual state

**Documentation:** `.github/instructions/agent-browser.instructions.md`

## AI Agents

**GitHub Copilot:** Context-aware suggestions, repository patterns
