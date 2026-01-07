# Testing Strategy - Poetry Bil-Araby

## Overview

Poetry Bil-Araby employs a comprehensive, multi-layered testing strategy designed for agentic development workflows. Our CI/CD pipeline ensures code quality, functional correctness, and design excellence across all devices and browsers.

## Test Pyramid Architecture

```
                    E2E Tests (Playwright)
                  /                      \
            UI/UX Tests              Functional Tests
                \                      /
                  Unit Tests (Vitest)
```

## Testing Layers

### 1. Unit Tests (Vitest)
**Location:** `src/**/*.test.jsx`, `src/**/*.test.js`
**Runner:** Vitest
**Environment:** jsdom/happy-dom
**CI Job:** `test`

**Purpose:**
- Test individual React components in isolation
- Validate business logic and utility functions
- Ensure proper state management
- Test error handling and edge cases

**Commands:**
```bash
npm run test          # Watch mode
npm run test:run      # Single run
npm run test:ui       # Visual UI for tests
npm run test:coverage # Generate coverage report
```

**Coverage Requirements:**
- Minimum 70% code coverage (target)
- Critical paths must have 100% coverage
- Coverage reports uploaded to CodeCov

### 2. E2E Tests (Playwright)
**Location:** `e2e/app.spec.js`
**Runner:** Playwright
**Browsers:** Chrome, Firefox, Safari
**CI Job:** `e2e-tests`

**Purpose:**
- Test complete user journeys and workflows
- Verify core functionality across browsers
- Validate poem navigation and discovery
- Test audio player integration
- Verify theme switching (dark/light mode)
- Test category filtering and selection
- Validate poetic insight feature
- Test copy-to-clipboard functionality

**Test Scenarios:**
1. **Core Functionality**
   - Application loads with initial poem
   - Navigate between poems using controls
   - Toggle dark/light mode
   - Open category selector
   - Discover new poems
   - Request poetic insight
   - Copy poem text

2. **Audio Player**
   - Play button is visible and interactive
   - Audio controls respond correctly

3. **Debug Panel**
   - Collapsible debug panel functionality
   - Toggle state persistence

**Viewports Tested:**
- Desktop: 1920x1080 (Chrome, Firefox, Safari)
- Mobile: Pixel 5, iPhone 12
- Tablet: iPad Pro

**Commands:**
```bash
npm run test:e2e           # Run all E2E tests
npm run test:e2e:headed    # Run with browser visible
npm run test:e2e:debug     # Debug mode with Playwright inspector
npm run test:e2e:report    # View HTML report
```

### 3. UI/UX Tests (Playwright)
**Location:** `e2e/ui-ux.spec.js`
**Runner:** Playwright
**Browser:** Chromium (optimized for speed)
**CI Job:** `ui-ux-tests`

**Purpose:**
- Validate responsive design across viewports
- Ensure Arabic typography quality (Amiri font)
- Verify color contrast ratios (WCAG compliance)
- Test touch target sizes for mobile (44x44px minimum)
- Validate smooth animations and transitions
- Ensure keyboard accessibility
- Test RTL/LTR text handling
- Verify visual consistency and design hierarchy

**Test Categories:**

#### Visual Design
- Responsive layout (desktop vs mobile)
- Arabic typography and line height
- Color contrast ratios
- Smooth animations
- Header prominence and styling

#### Interaction Design
- Button hover states
- Keyboard accessibility (Tab navigation)
- Touch target sizing (mobile)
- Smooth scrolling

#### Content Readability
- Poem text spacing
- No viewport overflow
- Text selectability
- Control visibility (glass effect)

#### Accessibility
- Proper viewport meta tag
- Page title presence
- Keyboard-only navigation
- RTL/LTR text direction handling

#### Visual Consistency
- Consistent color scheme
- Consistent border radius
- Visual hierarchy (header > body text)

**Commands:**
```bash
npm run test:e2e:ui  # Run UI/UX tests only
```

## CI/CD Pipeline Integration

### Pipeline Stages

**Stage 1: Build & Validate**
- Checkout code
- Setup Node.js 21 with npm caching
- Install dependencies
- Build application
- Upload build artifacts

**Stage 2: Test Suite**
- Run unit tests (Vitest)
- Generate coverage reports
- Upload coverage to CodeCov
- Runs in parallel with build

**Stage 3: E2E Tests (Playwright)**
- Install dependencies
- Cache Playwright browsers (optimization)
- Install Playwright browsers and system deps
- Run all E2E tests across all configured browsers/viewports
- Upload test reports and screenshots/videos on failure
- Runs in parallel with UI/UX tests

**Stage 4: UI/UX Tests**
- Install dependencies
- Cache Playwright browsers
- Install Chromium only (optimized)
- Run UI/UX-specific tests
- Upload test reports and screenshots
- Runs in parallel with E2E tests

**Stage 5: Deploy Preview** (PR only)
- Download build artifacts
- Deploy to preview environment (Vercel/Netlify)
- Comment preview URL on PR

**Stage 6: PR Feedback Bot** (PR only)
- Aggregate all test results
- Post comprehensive summary to PR
- Include links to test reports
- Provide actionable next steps for AI contributors

### Test Artifacts

All test artifacts are retained for 14 days:

1. **playwright-report**: HTML report with test results, traces, screenshots
2. **playwright-results**: Raw test results, videos, traces
3. **ui-ux-report**: UI/UX-specific test reports
4. **ui-ux-screenshots**: Screenshots from UI/UX tests
5. **dist**: Build artifacts
6. **coverage**: Code coverage reports (uploaded to CodeCov)

### Performance Optimizations

1. **Browser Caching**: Playwright browsers are cached between runs
2. **Parallel Execution**: E2E and UI/UX tests run in parallel
3. **Selective Browser Installation**: UI/UX tests only install Chromium
4. **npm Caching**: Node modules cached with setup-node
5. **Artifact Reuse**: Build artifacts shared between jobs

## Test Configuration Files

### Playwright Configuration
**File:** `playwright.config.js`

Key settings:
- Test directory: `./e2e`
- Base URL: `http://localhost:5173` (or env var)
- Retries: 2 on CI, 0 locally
- Workers: 1 on CI (stability), unlimited locally
- Screenshots: only on failure
- Videos: retain on failure
- Traces: on first retry
- Web server: Automatic Vite dev server startup

### Vitest Configuration
**File:** `vitest.config.js`

Key settings:
- Environment: jsdom
- Globals: enabled
- Coverage: v8 provider
- Reporters: text, json, html, lcov
- Setup files: `./src/test/setup.js`

## Agent Integration

### UI/UX Reviewer Agent
**Location:** `.claude/agents/ui-ux-reviewer.md`

**Responsibilities:**
- Review visual design choices
- Validate responsive design
- Check accessibility compliance
- Test interaction quality
- Verify content readability
- Run UI/UX tests and analyze results

**Integration:**
- Automatically triggered by CI on PR
- Can be invoked manually for design review
- Provides specific, actionable feedback
- Prioritizes issues by severity

### Test Orchestrator Agent
**Role:** Coordinates all testing activities

**Responsibilities:**
- Discover and inventory test agents
- Verify CI/CD integration
- Orchestrate test execution
- Analyze and synthesize results
- Provide comprehensive test reports

## Continuous Feedback Loop

### For AI Contributors

1. **Pre-Commit:**
   - Run unit tests locally: `npm run test:run`
   - Run E2E tests if changing UI: `npm run test:e2e`
   - Review test coverage: `npm run test:coverage`

2. **Post-Push:**
   - Monitor CI pipeline execution
   - Review PR feedback bot comments
   - Download and analyze test artifacts if failures occur
   - Address test failures before requesting review

3. **Test Failure Response:**
   - Check Playwright HTML report for detailed traces
   - Review screenshots/videos to understand visual failures
   - Check console logs in test output
   - Run tests locally with `--headed` or `--debug` flags
   - Fix issues and push updates

### Quality Gates

**Merge Requirements:**
- All unit tests must pass
- All E2E tests must pass (core functionality)
- All UI/UX tests must pass (design quality)
- Build must succeed
- No critical accessibility violations

**Warnings (can merge with caution):**
- Coverage decrease (review required)
- Non-critical UI/UX issues (document in PR)

## Testing Best Practices

### For E2E Tests
1. Use stable selectors (prefer data-testid or semantic selectors)
2. Wait for network idle before assertions
3. Handle mobile vs desktop differences explicitly
4. Use `isMobile` context variable for conditional logic
5. Grant permissions explicitly (clipboard, notifications)
6. Avoid hardcoded timeouts (use waitFor* methods)

### For UI/UX Tests
1. Test responsive breakpoints explicitly
2. Verify RTL and LTR text separately
3. Check computed styles, not inline styles
4. Test keyboard navigation systematically
5. Validate touch targets on mobile viewports
6. Use viewport context to skip irrelevant tests

### For Unit Tests
1. Test components in isolation
2. Mock external dependencies (APIs, localStorage)
3. Test both success and error states
4. Use descriptive test names
5. Follow AAA pattern (Arrange, Act, Assert)

## Monitoring and Metrics

### Key Metrics Tracked
- Test execution time (per job)
- Test pass rate
- Code coverage percentage
- Browser-specific failures
- Viewport-specific failures
- Test flakiness rate

### Dashboard Access
- GitHub Actions: View workflow runs
- CodeCov: Coverage trends and reports
- Playwright Report: Detailed test traces

## Future Enhancements

### Planned Additions
1. Visual regression testing with Percy or Chromatic
2. Performance testing with Lighthouse CI
3. Accessibility testing with axe-core
4. API testing with Playwright or REST Assured
5. Load testing for production environment
6. Screenshot comparison for design changes
7. A11y audit automation

### Continuous Improvement
- Monitor test flakiness and improve stability
- Add more edge case coverage
- Expand mobile device emulation
- Add internationalization testing
- Implement mutation testing for code quality

## Support and Troubleshooting

### Common Issues

**Playwright browsers not found:**
```bash
npx playwright install --with-deps
```

**Tests failing on CI but passing locally:**
- Check environment variables
- Review CI logs for system dependencies
- Verify browser versions match
- Check timing issues (increase timeouts if needed)

**UI/UX tests failing:**
- Review screenshots in artifacts
- Check viewport-specific issues
- Verify font loading (Google Fonts timing)
- Check for animation timing issues

### Getting Help
1. Review test artifacts (reports, screenshots, videos)
2. Run tests locally with debug mode
3. Check Playwright documentation
4. Review agent documentation
5. Consult with UI/UX Reviewer agent

---

**Last Updated:** 2026-01-07
**Maintained By:** Test Orchestrator Agent
**Version:** 1.0.0
