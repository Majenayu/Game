import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the production build (vite preview), so they test what players get.
// EK_URL=https://.../stickbound/ runs them against a published build instead.
const remote = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.EK_URL;
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: remote ?? 'http://localhost:4190/', trace: 'off', actionTimeout: 15_000 },
  webServer: remote
    ? undefined
    : {
        command: 'npx vite preview --port 4190 --strictPort',
        url: 'http://localhost:4190/',
        reuseExistingServer: true,
        timeout: 60_000,
      },
  projects: [
    { name: 'smoke', testMatch: /smoke\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    { name: 'firstrun', testMatch: /firstrun\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    { name: 'shots', testMatch: /shots\.spec\.ts/ },
    { name: 'arenas', testMatch: /(arenas|diag)\.spec\.ts/, use: { ...devices['Desktop Chrome'], channel: 'chrome', headless: false } },
    { name: 'perf', testMatch: /perf\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    // same tests in a visible window: real GPU rendering instead of headless software rendering
    { name: 'powersheet', testMatch: /powersheet\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 2000, height: 900 }, deviceScaleFactor: 1 } },
    { name: 'videos', testMatch: /videos\.spec\.ts/, use: { channel: 'chrome', headless: false } },
    { name: 'media', testMatch: /media\.spec\.ts/, use: { channel: 'chrome', headless: false } },
    { name: 'profile', testMatch: /profile\.spec\.ts/, use: { ...devices['Desktop Chrome'], channel: 'chrome', headless: false, viewport: { width: 1366, height: 768 } } },
    { name: 'perf-gpu', testMatch: /perf\.spec\.ts/, use: { ...devices['Desktop Chrome'], channel: 'chrome', headless: false, viewport: { width: 1366, height: 768 } } },
  ],
});
