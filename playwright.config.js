import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Poetry Bil-Araby
 *
 * CI Mode: Fast feedback with critical browsers only (Chrome desktop + mobile)
 * Local Mode: Full device matrix for comprehensive testing
 *
 * Performance optimizations:
 * - CI uses 2 workers (optimal for GitHub Actions 2-core runners)
 * - Reduced timeouts (10s test, 3s assertions)
 * - No retries in CI for fast failure detection
 * - Minimal device matrix in CI (2 projects vs 6)
 */
export default defineConfig({
  testDir: './e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail build on CI if tests were accidentally left as test.only
  forbidOnly: !!process.env.CI,

  // No retries on CI for fast feedback - let developers debug locally
  retries: process.env.CI ? 0 : 1,

  // Optimize workers for GitHub Actions (2 workers for 2-core runners)
  // Local: use all available cores for faster execution
  workers: process.env.CI ? 2 : undefined,

  // Aggressive timeouts for CI performance (10s test, 3s assertions)
  timeout: process.env.CI ? 10000 : 30000,

  // Expect timeout for assertions
  expect: {
    timeout: process.env.CI ? 3000 : 5000,
  },

  // Reporter configuration - use GitHub Actions reporter in CI
  reporter: process.env.CI
    ? [
        ['github'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['json', { outputFile: 'playwright-report/results.json' }],
      ]
    : [
        ['html', { outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'playwright-report/results.json' }],
        ['list']
      ],

  // Shared test settings
  use: {
    // Base URL for testing
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173',

    // Collect trace only on retry (not on first failure for speed)
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on retry only to save time
    video: 'retain-on-failure',

    // Reduce action timeout in CI
    actionTimeout: process.env.CI ? 5000 : 10000,

    // Reduce navigation timeout in CI
    navigationTimeout: process.env.CI ? 10000 : 30000,
  },

  // Configure projects based on environment
  // CI: Only critical browsers (Desktop Chrome + Mobile Chrome) for fast feedback
  // Local: Full device matrix for comprehensive testing
  projects: process.env.CI ? [
    // CI: Critical browsers only for fast feedback (< 3 minutes)
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ] : [
    // Local: Full device matrix for comprehensive testing
    // Desktop browsers
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'Desktop Firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'Desktop Safari',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Tablet viewports
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
    },
  ],

  // Web server configuration for local dev
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000, // 30s should be enough for Vite to start
    // In CI, reduce startup timeout to 20s
    ...(process.env.CI && { timeout: 20000 }),
  },
});
