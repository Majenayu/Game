import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the production build (vite preview), so they test what players get.
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4180/', trace: 'off' },
  webServer: {
    command: 'npx vite preview --port 4180 --strictPort',
    url: 'http://localhost:4180/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'smoke', testMatch: /smoke\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    { name: 'shots', testMatch: /shots\.spec\.ts/ },
  ],
});
