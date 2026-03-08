# E2E Smoke Tests

Single-suite user-flow smoke tests using Playwright. Each test is a complete user journey with all API calls intercepted via `page.route()` for determinism -- no live backend or API key required.

## Test Suite

### `user-flows.spec.js` (11 tests)

| # | Test | User Story |
|---|------|-----------|
| 1 | Discover a new poem | Click Discover, verify new poem loads |
| 2 | Audio playback | Click Play, observe loading state |
| 3 | Poetic insight (desktop) | Click Explain, verify side panel |
| 4 | Theme toggle | Switch dark/light mode |
| 5 | Font cycle | Cycle through Arabic fonts |
| 6 | Poet filter | Select poet, verify API filter param |
| 7 | Copy poem | Click copy, verify icon change |
| 8 | DB/AI mode toggle | Switch between Database and AI modes |
| 9 | Design review navigation | Click review link, verify page loads |
| 10 | Design review keyboard nav | Arrow keys cycle through designs |
| 11 | Mobile overflow menu | Verify 402px viewport shows overflow |

## Running Tests

```bash
npm run test:e2e           # CI: Chrome only | Local: full matrix
npm run test:e2e:headed    # Visible browser
npm run test:e2e:debug     # Debug mode
npm run test:e2e:report    # View HTML report
```

## CI

The `smoke-tests` job in `.github/workflows/ci.yml` runs Desktop Chrome only with all API calls mocked (no PostgreSQL or backend server needed).

## Configuration

- **CI**: Desktop Chrome only (mobile coverage via `test.use()` viewport overrides)
- **Local**: Full 7-project device matrix (Chrome, Firefox, Safari, Pixel 5, iPhone 12, iPhone 16 Pro, iPad Pro)

See `playwright.config.js` for details.
