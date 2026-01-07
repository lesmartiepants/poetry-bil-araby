# CI/CD Quick Reference Guide

## Pipeline Overview

The Poetry Bil-Araby CI/CD pipeline runs automatically on:
- Every push to `main` branch
- Every pull request targeting `main` branch

## Pipeline Stages

### Stage 1: Build & Validate
**Job:** `build`
**Duration:** ~2-3 minutes
**Purpose:** Compile and validate application

**Steps:**
1. Checkout repository
2. Setup Node.js 21 with npm caching
3. Install dependencies (`npm ci`)
4. Build application (`npm run build`)
5. Upload build artifacts

**Artifacts:**
- `dist/` - Production build files (retained 7 days)

### Stage 2: Test Suite
**Job:** `test`
**Duration:** ~1-2 minutes
**Purpose:** Run unit tests and generate coverage

**Steps:**
1. Setup environment
2. Install dependencies
3. Run unit tests (`npm run test:run`)
4. Generate coverage report
5. Upload to CodeCov

**Artifacts:**
- Coverage reports (uploaded to CodeCov)

**Key Checks:**
- All unit tests pass
- Coverage meets thresholds (70% target)

### Stage 3: E2E Tests
**Job:** `e2e-tests`
**Duration:** ~5-8 minutes
**Purpose:** Test functionality across browsers and devices

**Steps:**
1. Setup environment
2. Install dependencies
3. Cache Playwright browsers (optimization)
4. Install browsers (Chrome, Firefox, Safari)
5. Run E2E tests across all viewports
6. Upload test reports and artifacts

**Browsers Tested:**
- Desktop Chrome (1920x1080)
- Desktop Firefox (1920x1080)
- Desktop Safari (1920x1080)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)
- iPad Pro

**Artifacts:**
- `playwright-report/` - HTML report with traces (retained 14 days)
- `playwright-results/` - Screenshots, videos, traces (retained 14 days)

**Key Checks:**
- Core functionality works across all browsers
- No JavaScript errors
- All user flows complete successfully

### Stage 4: UI/UX Tests
**Job:** `ui-ux-tests`
**Duration:** ~3-5 minutes
**Purpose:** Validate design quality and accessibility

**Steps:**
1. Setup environment
2. Install dependencies
3. Cache Playwright browsers
4. Install Chromium only (optimized)
5. Run UI/UX tests
6. Upload test reports and screenshots

**Focus Areas:**
- Responsive design (desktop, tablet, mobile)
- Arabic typography and RTL handling
- Color contrast (WCAG compliance)
- Touch target sizing (44x44px minimum)
- Keyboard accessibility
- Smooth animations
- Visual consistency

**Artifacts:**
- `ui-ux-report/` - HTML report (retained 14 days)
- `ui-ux-screenshots/` - Screenshots (retained 14 days)

**Key Checks:**
- Responsive layouts work on all viewports
- Accessibility requirements met
- Design consistency maintained
- No visual regressions

### Stage 5: Deploy Preview (PR only)
**Job:** `deploy-preview`
**Duration:** ~1-2 minutes
**Purpose:** Deploy preview environment for testing

**Steps:**
1. Download build artifacts
2. Deploy to preview environment (Vercel/Netlify)
3. Comment preview URL on PR

**Note:** Currently a placeholder - will be activated when Vercel/Netlify integration is configured.

### Stage 6: PR Feedback Bot (PR only)
**Job:** `pr-feedback`
**Duration:** ~30 seconds
**Purpose:** Provide comprehensive test summary

**Steps:**
1. Aggregate all test results
2. Generate detailed summary
3. Post comment on PR with:
   - Test status table
   - Coverage details
   - Links to reports
   - Actionable next steps
   - Debug resources

## Parallel Execution

The pipeline is optimized for speed with parallel execution:

```
Build & Validate
    ↓
    ├─→ Test Suite
    ├─→ E2E Tests (Stage 3)
    └─→ UI/UX Tests (Stage 4)
         ↓
    Deploy Preview (PR only)
         ↓
    PR Feedback Bot (PR only)
```

**Total Pipeline Duration:** ~8-10 minutes (including parallel execution)

## Performance Optimizations

### 1. Browser Caching
Playwright browsers are cached using GitHub Actions cache:
- Cache key: `${{ runner.os }}-playwright-${{ hashFiles('**/package-lock.json') }}`
- Cache path: `~/.cache/ms-playwright`
- Saves ~2-3 minutes per job

### 2. npm Caching
Node modules are cached by `setup-node` action:
- Automatically managed by GitHub Actions
- Saves ~30 seconds per job

### 3. Selective Browser Installation
- E2E tests: All browsers (Chrome, Firefox, Safari)
- UI/UX tests: Chromium only (faster)

### 4. Artifact Reuse
Build artifacts from Stage 1 are reused in subsequent stages.

### 5. Conditional Steps
- Browser installation skipped if cache hit
- System dependencies installed separately when cache hit

## Viewing Test Results

### During Pipeline Execution
1. Navigate to GitHub Actions tab
2. Click on the running workflow
3. View real-time logs for each job
4. Check job summaries for quick status

### After Pipeline Completion
1. **Unit Test Results**: Check CodeCov badge or workflow summary
2. **E2E Test Results**: Download `playwright-report` artifact
3. **UI/UX Test Results**: Download `ui-ux-report` artifact
4. **PR Summary**: Review automated PR comment (comprehensive overview)

### Accessing Artifacts
1. Go to workflow run page
2. Scroll to "Artifacts" section at bottom
3. Download relevant artifacts:
   - `playwright-report` - Full HTML report with traces
   - `playwright-results` - Raw test results
   - `ui-ux-report` - UI/UX test report
   - `ui-ux-screenshots` - Design test screenshots
   - `dist` - Build artifacts

## Test Failure Workflow

### When Tests Fail

1. **Check PR Comment**
   - Review automated feedback bot comment
   - Identify which test suite failed
   - Check failure summary

2. **Download Artifacts**
   - Download relevant test reports
   - Open HTML report in browser
   - Review screenshots and videos

3. **Analyze Failures**
   - Review test traces in Playwright report
   - Check console logs and errors
   - Compare screenshots to identify visual issues
   - Review timing issues or flaky tests

4. **Debug Locally**
   ```bash
   # For E2E failures
   npm run test:e2e:headed     # Run with browser visible
   npm run test:e2e:debug      # Open Playwright inspector

   # For UI/UX failures
   npm run test:e2e:ui -- --headed

   # For unit test failures
   npm run test                # Run in watch mode
   ```

5. **Fix Issues**
   - Address root cause
   - Add additional tests if needed
   - Update existing tests if requirements changed

6. **Re-run Pipeline**
   - Push fixes to branch
   - Pipeline automatically re-runs
   - Verify all tests pass

## Environment Variables

### Required for CI
- `CI=true` - Automatically set by GitHub Actions
- `NODE_VERSION=21` - Specified in workflow

### Optional
- `CODECOV_TOKEN` - For coverage reporting (set in repository secrets)
- `PLAYWRIGHT_TEST_BASE_URL` - Override base URL for tests

### Playwright-Specific
- Automatically detected in CI environment
- Retries set to 2 (vs 0 locally)
- Workers limited to 1 (vs unlimited locally)
- forbidOnly enabled (prevents accidental test.only)

## Common Commands

### Local Testing
```bash
# Unit tests
npm run test              # Watch mode
npm run test:run          # Single run
npm run test:coverage     # With coverage

# E2E tests
npm run test:e2e          # All tests
npm run test:e2e:ui       # UI/UX only
npm run test:e2e:headed   # With browser visible
npm run test:e2e:debug    # Debug mode
npm run test:e2e:report   # View last report

# Build
npm run build             # Production build
npm run preview           # Preview build
```

### CI Simulation
```bash
# Simulate CI environment
CI=true npm run test:run
CI=true npm run test:e2e
```

## Troubleshooting

### Pipeline Not Triggering
- Verify `.github/workflows/ci.yml` exists
- Check workflow triggers (push/PR to main)
- Ensure repository has Actions enabled

### Tests Failing Only on CI
- Check Node.js version match (21)
- Review environment differences
- Check timing issues (increase timeouts)
- Verify browser versions

### Slow Pipeline
- Check cache hit rates
- Review test parallelization
- Monitor GitHub Actions minutes quota
- Consider test optimization

### Artifact Upload Failures
- Check artifact path exists
- Verify retention days (max 90)
- Ensure artifact name is unique

## Quality Gates

### Must Pass (Blocking)
- Build success
- All unit tests pass
- All E2E tests pass
- All UI/UX tests pass

### Warnings (Non-Blocking)
- Coverage decrease (review required)
- Minor UI/UX issues (document in PR)
- Long test execution time (optimize)

## Integration with Agents

### Test Orchestrator Agent
The Test Orchestrator can:
- View pipeline status
- Analyze test results
- Coordinate test execution
- Generate comprehensive reports
- Recommend improvements

### UI/UX Reviewer Agent
The UI/UX Reviewer monitors:
- UI/UX test results
- Design quality metrics
- Accessibility compliance
- Visual regressions
- Responsive design issues

## Best Practices

### For Contributors
1. Run tests locally before pushing
2. Review test output thoroughly
3. Address failures promptly
4. Keep tests fast and reliable
5. Update tests when changing functionality

### For AI Agents
1. Always check CI status before proceeding
2. Download and analyze artifacts on failure
3. Provide specific, actionable fixes
4. Verify fixes with local test runs
5. Document test changes in commits

## Monitoring and Metrics

### Key Metrics
- Pipeline success rate: Target >95%
- Average pipeline duration: ~8-10 minutes
- Test flakiness rate: Target <2%
- Coverage: Target >70%

### Dashboard Links
- GitHub Actions: `https://github.com/[owner]/poetry-bil-araby/actions`
- CodeCov: Integration pending

## Support

### Resources
- Playwright Docs: https://playwright.dev
- Vitest Docs: https://vitest.dev
- GitHub Actions Docs: https://docs.github.com/actions

### Getting Help
1. Review test artifacts and reports
2. Consult `.github/TESTING_STRATEGY.md`
3. Run tests locally with debug mode
4. Review Playwright traces
5. Engage Test Orchestrator agent

---

**Last Updated:** 2026-01-07
**Pipeline Version:** 1.0.0
**Maintained By:** Test Orchestrator Agent
