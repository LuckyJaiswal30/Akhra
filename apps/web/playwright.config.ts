import { defineConfig, devices } from '@playwright/test';

/**
 * The browser layer of the test suite. `pnpm test` proves the rules against a real database;
 * this proves the pages built on them render — in both languages, on a phone and on a desktop,
 * with nothing thrown into the console on the way.
 *
 * It builds the app and serves it on its own port, rather than borrowing `pnpm dev`. A production
 * build is what actually ships, and a development server is not built to answer a dozen parallel
 * requests: pointed at one, this suite corrupted its own prerender manifest and every page after
 * that returned 500.
 *
 *   pnpm test:browser:install   # once, to fetch the browser
 *   pnpm test:browser
 *
 * Set E2E_BASE_URL to test something already running — a preview deployment, say — and nothing is
 * built or started.
 */
const PORT = 3100;
const external = process.env.E2E_BASE_URL;
const baseURL = external ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // A smoke suite that retries is a smoke suite that hides a real flake.
  retries: 0,
  fullyParallel: true,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: external
    ? undefined
    : {
        command: `pnpm build && pnpm exec next start --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 5 * 60 * 1000,
        stdout: 'pipe',
      },
  projects: [
    { name: 'desktop', use: devices['Desktop Chrome'] },
    { name: 'phone', use: devices['Pixel 7'] },
  ],
});
