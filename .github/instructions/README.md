# GitHub Copilot Instructions

Custom instructions for context-aware code suggestions in this repository.

## Repository-Wide

**`.github/copilot-instructions.md`** (77 lines) - Applies to all files
- Dual-mode architecture (Database + AI)
- Development commands (frontend + backend)
- Code conventions (DESIGN/THEME constants, Arabic typography)
- Testing strategy, CI/CD, common issues

## Path-Specific

**`react-components.instructions.md`** → `src/**/*.jsx` (33 lines)
- Functional components, hooks, DESIGN/THEME usage, Arabic fonts

**`unit-tests.instructions.md`** → `src/test/**/*.test.jsx,src/test/**/*.test.js` (54 lines)
- Vitest + RTL patterns, Supertest for backend, query preferences, timeouts

**`e2e-tests.instructions.md`** → `e2e/**/*.spec.js` (72 lines)
- Playwright patterns, selectors, device matrix, database integration, debugging

**`backend-server.instructions.md`** → `server.js,**/*.server.js` (71 lines)
- Express API, PostgreSQL, security (SQL injection), performance, testing

**`config-files.instructions.md`** → `*.config.js,*.config.json` (38 lines)
- Vite/Vitest/Playwright configs, CI detection, env vars, timeouts

**`documentation.instructions.md`** → `**/*.md` (70 lines, code-review only)
- Markdown standards, code examples, README structure, tone

## How It Works

Copilot reads repository-wide + path-specific instructions based on file type:

- Editing `src/app.jsx` → repo-wide + react-components
- Editing `src/test/App.test.jsx` → repo-wide + unit-tests
- Editing `e2e/app.spec.js` → repo-wide + e2e-tests
- Editing `server.js` → repo-wide + backend-server
- Editing `vite.config.js` → repo-wide + config-files
- Editing `README.md` → repo-wide + documentation (code-review only)

**Total:** 415 lines (74% reduction from 1,592 lines)

## How It Works

GitHub Copilot automatically reads these instructions when you work on files in this repository:

1. **Repository-wide instructions** (copilot-instructions.md) apply to all files
2. **Path-specific instructions** apply when you edit files matching the `applyTo` pattern
3. If multiple instructions apply, Copilot uses both

## Best Practices

- Instructions are written in natural language (Markdown)
- Keep instructions focused and actionable
- Update instructions when development patterns change
- Test that instructions improve Copilot suggestions

## More Information

- [GitHub Copilot Custom Instructions Docs](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [Poetry Bil-Araby CLAUDE.md](../../CLAUDE.md) - Comprehensive guide for Claude AI
- [Testing Strategy](.github/TESTING_STRATEGY.md) - Testing philosophy and approach
