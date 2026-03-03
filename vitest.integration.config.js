import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Vitest configuration for integration tests (design-review-integration.test.js).
 * Integration tests are excluded from the normal vitest.config.js run.
 * They run against a real PostgreSQL database (local service in CI).
 *
 * Usage: npm run test:integration
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/test/*-integration.test.{js,ts}'],
    testTimeout: process.env.CI ? 15000 : 30000,
    hookTimeout: process.env.CI ? 10000 : 15000,
    pool: 'forks',
  },
})
