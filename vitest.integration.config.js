import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Vitest configuration for integration tests (design-review-integration.test.js).
 * Integration tests are excluded from the normal vitest.config.js run but need
 * their own config that does not apply that exclusion.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/test/*-integration.test.{js,ts}'],
    // Integration tests hit a real database, so they need longer timeouts than unit tests.
    testTimeout: process.env.CI ? 15000 : 30000,
    hookTimeout: process.env.CI ? 10000 : 15000,
    pool: 'forks',
  },
})
