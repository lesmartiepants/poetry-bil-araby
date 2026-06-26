import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Vitest configuration for Poetry Bil-Araby
 *
 * Performance optimizations:
 * - Uses happy-dom (faster than jsdom)
 * - Aggressive timeouts for CI (3s test, 2s hooks)
 * - Fails fast in CI (bail on first failure)
 * - Pool: forks for better isolation and performance
 * - Optimized coverage collection
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  test: {
    teardownTimeout: process.env.CI ? 2000 : 3000,
    // Fail if no tests found (catch config issues)
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/test/', '*.config.js', 'dist/', '.github/', 'e2e/'],
      // Baseline thresholds — prevents silent test deletion
      thresholds: {
        statements: 35,
        branches: 25,
        functions: 30,
        lines: 35,
      },
      // Speed up coverage collection in CI
      reportsDirectory: './coverage',
      clean: true,
      cleanOnRerun: true,
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          globals: true,
          environment: 'happy-dom',
          setupFiles: './src/test/setup.js',
          css: true,
          include: ['src/**/*.test.{js,jsx,ts,tsx}'],
          exclude: ['node_modules/', 'dist/', 'e2e/'],
          // CI timeouts — raised to accommodate coverage-instrumented runs and
          // multi-step poet-picker tests that include several async waitFor calls
          testTimeout: 15000,
          hookTimeout: process.env.CI ? 3000 : 5000,
          // Retry flaky tests once (poet filtering tests have mock timing issues)
          retry: 1,
          // Stop on first failure in CI for fast feedback
          bail: process.env.CI ? 1 : undefined,
          // Use forks pool for better performance
          pool: 'forks',
          // Optimize CI performance
          ...(process.env.CI && {
            // Disable file parallelization in CI (limited resources)
            fileParallelism: false,
            // Reduce max concurrency in CI
            maxConcurrency: 2,
          }),
        },
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: 'chromium',
              },
            ],
          },
        },
      },
    ],
  },
});
