import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

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

    // Aggressive timeouts for CI performance
    testTimeout: process.env.CI ? 3000 : 5000, // 3s in CI, 5s locally
    hookTimeout: process.env.CI ? 2000 : 5000, // 2s in CI, 5s locally
    teardownTimeout: process.env.CI ? 1000 : 3000, // 1s in CI, 3s locally

    // Stop on first failure in CI for fast feedback
    bail: process.env.CI ? 1 : undefined,

    // Fail if no tests found (catch config issues)
    passWithNoTests: false,

    // Use forks pool for better performance
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },

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
      exclude: [
        'node_modules/',
        'src/test/',
        '*.config.js',
        'dist/',
        '.github/',
        'e2e/',
      ],
      // Speed up coverage collection in CI
      reportsDirectory: './coverage',
      clean: true,
      cleanOnRerun: true,
    },
  },
})
