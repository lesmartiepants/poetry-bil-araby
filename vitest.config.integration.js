import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Vitest configuration for real-database integration tests.
 * Used by `npm run test:integration` — does NOT exclude integration test files.
 * Requires DATABASE_URL env var to be set.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/test/*-integration.test.js'],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    pool: 'forks',
    passWithNoTests: false,
  },
})
