import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Use the machine's preinstalled Chromium when there is one (cloud containers).
const exe = process.env.PW_CHROMIUM ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

// Journey tests: real flows at phone size, on mock data by default.
// Mock runs force all-mock data; `test:journeys:live` uses the real sources for live domains.
const LIVE = process.env.VITE_SOURCES === 'live';
const PORT = LIVE ? 5181 : 5180;
export default defineConfig({
  testDir: './journeys',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/new/`,
    ...devices['Pixel 7'],
    viewport: { width: 390, height: 844 },
    trace: 'off',
    launchOptions: exe ? { executablePath: exe } : {},
  },
  projects: [{ name: 'phone', use: { browserName: 'chromium' } }],
  webServer: {
    command: `${LIVE ? '' : 'VITE_SOURCES=mock '}npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/new/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
