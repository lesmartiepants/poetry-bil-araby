# GitHub Copilot Instructions

This directory contains custom instructions for GitHub Copilot to provide better context-aware suggestions when working with this repository.

## Files

### Repository-Wide Instructions

**`.github/copilot-instructions.md`** - Main instructions file that applies to all code in the repository.

Contains:
- Project overview and architecture (dual-mode: Database + AI)
- Development commands and workflow (frontend + backend)
- Code style and conventions
- Testing strategy (136 unit + 193 E2E tests)
- CI/CD pipeline details
- Git workflow and commit conventions

### Path-Specific Instructions

Located in `.github/instructions/`, these files apply to specific file types:

**`react-components.instructions.md`**
- Applies to: `src/**/*.jsx`
- React patterns and hooks usage
- Styling requirements (DESIGN and THEME constants)
- Arabic content styling
- State management patterns

**`unit-tests.instructions.md`**
- Applies to: `src/test/**/*.test.jsx`, `src/test/**/*.test.js`
- Vitest + React Testing Library patterns
- Supertest for backend API tests
- Test structure and organization
- Query preferences (getByRole, getByText, etc.)
- Mocking and async testing

**`e2e-tests.instructions.md`**
- Applies to: `e2e/**/*.spec.js`
- Playwright testing patterns
- Element selectors and user interactions
- Device testing (desktop, mobile, tablet)
- UI/UX and accessibility testing
- Database integration testing

**`backend-server.instructions.md`**
- Applies to: `server.js`, `**/*.server.js`
- Express.js REST API patterns
- PostgreSQL database connection
- Error handling and security
- Performance optimization
- Deployment considerations

**`config-files.instructions.md`**
- Applies to: `*.config.js`, `*.config.json`
- Configuration best practices
- CI/CD detection patterns
- Performance considerations
- Environment variable handling

**`documentation.instructions.md`**
- Applies to: `**/*.md`
- Excluded from: Copilot coding agent (code-review only)
- Markdown style guide
- Documentation structure
- Code examples in docs
- Tone and style guidelines

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
