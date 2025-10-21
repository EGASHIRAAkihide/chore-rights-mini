import { defineConfig } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';


const envPath = (() => {
  const testEnv = resolve(__dirname, 'apps/web/.env.test.local');
  if (existsSync(testEnv)) {
    return testEnv;
  }
  const localEnv = resolve(__dirname, 'apps/web/.env.local');
  if (existsSync(localEnv)) {
    return localEnv;
  }
  return undefined;
})();

if (envPath) {
  loadEnv({ path: envPath });
}

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
  webServer: {
    command: 'pnpm -C apps/web dev -- --hostname 127.0.0.1 --port 3000',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: '3000',
    },
  },
});
