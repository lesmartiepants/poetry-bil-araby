import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// @prod smoke: read-only journeys against the deployed app (default: production /new/).
//   npm run test:prod                         # production
//   PROD_URL=https://<preview>.vercel.app npm run test:prod
// The spec blocks every write (see journeys/prod.spec.ts), so it is safe to run any time.
const exe = process.env.PW_CHROMIUM ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const BASE = (process.env.PROD_URL ?? 'https://poetry-bil-araby.vercel.app').replace(/\/$/, '');

export default defineConfig({
  testDir: './journeys',
  testMatch: 'prod.spec.ts',
  grep: /@prod/,
  timeout: 60_000, // a cold Render API can take ~30 s to wake
  expect: { timeout: 20_000 },
  retries: 1,
  workers: 2,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `${BASE}/new/`,
    ...devices['Pixel 7'],
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
    launchOptions: exe ? { executablePath: exe } : {},
  },
  projects: [{ name: 'phone', use: { browserName: 'chromium' } }],
});
