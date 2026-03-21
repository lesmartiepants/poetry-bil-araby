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
    setupFiles: './src/test/setup.js',
    css: true,
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['node_modules/', 'dist/', 'e2e/'],

    // CI timeouts — match local to avoid flaky failures on slower runners
    testTimeout: 5000,
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
  },
});
