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
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    // Per-file environment overrides: server tests run in node (import.meta.url is a real file: URL there)
    environmentMatchGlobs: [
      ['**/src/test/server.test.js', 'node'],
      ['**/src/test/design-review-api.test.js', 'node'],
    ],
    // jsdom needs a url for localStorage/sessionStorage to work
    environmentOptions: {
      jsdom: { url: 'http://localhost/' },
    },
    setupFiles: './src/test/setup.js',
    css: true,
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['node_modules/', 'dist/', 'e2e/'],

    // CI timeouts — raised to accommodate coverage-instrumented runs and
    // multi-step poet-picker tests that include several async waitFor calls
    testTimeout: 15000,
    hookTimeout: process.env.CI ? 3000 : 5000,
    teardownTimeout: process.env.CI ? 2000 : 3000,

    // Retry flaky tests once (poet filtering tests have mock timing issues)
    retry: 1,

    // Stop on first failure in CI for fast feedback
    bail: process.env.CI ? 1 : undefined,

    // Fail if no tests found (catch config issues)
    passWithNoTests: false,

    // Use forks pool for better performance
    pool: 'forks',

    // Optimize CI performance
    ...(process.env.CI && {
      // Disable file parallelization in CI (limited resources)
      fileParallelism: false,
      // Reduce max concurrency in CI
      maxConcurrency: 2,
    }),

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/test/', '*.config.js', 'dist/', '.github/', 'e2e/'],
      // Coverage ratchet — floor can only go up, never down.
      // autoUpdate: true means a passing run updates these values automatically;
      // CI fails if any metric drops below the recorded floor.
      thresholds: {
        autoUpdate: true,
        statements: 60,
        branches: 50,
        functions: 55,
        lines: 60,
      },
      // Speed up coverage collection in CI
      reportsDirectory: './coverage',
      clean: true,
      cleanOnRerun: true,
    },
  },
});
