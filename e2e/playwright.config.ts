import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.ORB_E2E_URL ?? 'http://localhost:5173',
    trace: 'off',
    // use the real GPU when there is one (much faster than software rendering); falls back safely otherwise
    launchOptions: {
      executablePath: process.env.ORB_CHROMIUM_PATH || undefined,
      args: ['--no-sandbox', '--enable-webgl', '--ignore-gpu-blocklist'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.ORB_E2E_URL ? (process.env.ORB_E2E_LOCAL ? [{
    command: 'TSX_TSCONFIG_PATH=server/tsconfig.json node --import tsx e2e/backend-fixture.ts',
    cwd: '..',
    url: 'http://127.0.0.1:2598/health',
    reuseExistingServer: false,
    timeout: 30_000,
  }] : undefined) : [
    {
      command: 'npm run start -w server',
      cwd: '..',
      url: 'http://localhost:2567/health',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npm run dev -w client',
      cwd: '..',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
