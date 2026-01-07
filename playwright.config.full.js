import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for FULL device matrix testing
 *
 * This configuration runs all tests across 6 device configurations:
 * - Desktop: Chrome, Firefox, Safari
 * - Mobile: Chrome (Pixel 5), Safari (iPhone 12)
 * - Tablet: iPad Pro
 *
 * Use this for:
 * - Pre-release comprehensive testing
 * - Scheduled nightly runs
 * - Manual full regression testing
 *
 * NOT for regular CI (too slow - use default config instead)
 *
 * Usage:
 *   npm run test:e2e:full
 *   or
 *   npx playwright test --config=playwright.config.full.js
 */
export default defineConfig({
  testDir: './e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail build on CI if tests were accidentally left as test.only
  forbidOnly: !!process.env.CI,

  // Retry once on failures for cross-browser quirks
  retries: 1,

  // Use all available workers for maximum speed
  workers: undefined,

  // Standard timeouts
  timeout: 30000,

  // Expect timeout for assertions
  expect: {
    timeout: 5000,
  },

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report-full' }],
    ['json', { outputFile: 'playwright-report-full/results.json' }],
    ['list']
  ],

  // Shared test settings
  use: {
    // Base URL for testing
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173',

    // Collect trace on failure for debugging
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Standard timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // FULL device matrix - all browsers and viewports
  projects: [
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

  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
