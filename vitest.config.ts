import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./apps/web/src', import.meta.url)),
    },
  },
  // The app leaves JSX to Next's compiler; tests that render an email template need it transformed here.
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['packages/**/tests/**/*.test.ts', 'apps/**/tests/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['./apps/web/tests/global-setup.ts'],
    setupFiles: ['./apps/web/tests/setup.ts'],
    server: { deps: { inline: ['next-intl', 'use-intl'] } },
    // Suites share one database and its rate-limit counters.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
