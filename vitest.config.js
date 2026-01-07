import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.js',
    css: true,
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['node_modules/', 'dist/', 'e2e/'],
    testTimeout: 5000, // Reduced from 10s to 5s for CI performance
    hookTimeout: 5000, // Reduced from 10s to 5s for CI performance
    teardownTimeout: 3000, // Reduced from 5s to 3s
    bail: process.env.CI ? 1 : undefined, // Stop on first failure in CI
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
    },
  },
})
