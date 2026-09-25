import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const external = process.env.E2E_BASE_URL;
const baseURL = external ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
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
