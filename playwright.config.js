import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Poetry Bil-Araby
 * Tests UI/UX across desktop and mobile viewports
 */
export default defineConfig({
  testDir: './e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail build on CI if tests were accidentally left as test.only
  forbidOnly: !!process.env.CI,

  // Retry on CI only - reduced from 2 to 1 for faster feedback
  retries: process.env.CI ? 1 : 0,

  // Optimize workers on CI - increased from 1 to 2 for parallelization
  workers: process.env.CI ? 2 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
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
  },

  // Configure projects for major browsers and viewports
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

  // Web server configuration for local dev
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
