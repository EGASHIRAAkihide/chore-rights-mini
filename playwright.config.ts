import { defineConfig } from '@playwright/test';

const baseURL =
  process.env.E2E_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },
  reporter: [['list']],
});
