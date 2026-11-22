import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the production build (vite preview), so they test what players get.
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4190/', trace: 'off', actionTimeout: 15_000 },
  webServer: {
    command: 'npx vite preview --port 4190 --strictPort',
    url: 'http://localhost:4190/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'smoke', testMatch: /smoke\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    { name: 'firstrun', testMatch: /firstrun\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    { name: 'shots', testMatch: /shots\.spec\.ts/ },
    { name: 'perf', testMatch: /perf\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
  ],
});
