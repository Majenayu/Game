import { test as base } from '@playwright/test';
export { expect } from '@playwright/test';
export type { Browser, Page } from '@playwright/test';

/**
 * Opt-in isolation: exercise the real local backend rather than a production
 * account service. Only the browser's dev-module URL setting is overridden.
 * No shipped app code, user secret, or gameplay response is mocked.
 */
export const test = base.extend<{ isolatedContexts: void }>({
  isolatedContexts: [async ({ browser }, use) => {
    const existing = new Set(browser.contexts());
    await use();
    // Multi-player specs create contexts directly. Close them between tests so
    // their Phaser loops do not keep rendering behind subsequent measurements.
    await Promise.all(browser.contexts().filter(ctx => !existing.has(ctx)).map(ctx => ctx.close()));
  }, { auto: true }],
  browser: async ({ browser }, use) => {
    if (!process.env.ORB_E2E_LOCAL) return use(browser);
    const create = browser.newContext.bind(browser);
    browser.newContext = async options => {
      const context = await create(options);
      await context.route('**/src/net.ts*', async route => {
        const response = await route.fetch();
        const body = (await response.text()).replaceAll('import.meta.env.VITE_SERVER_URLS', JSON.stringify('ws://127.0.0.1:2598'));
        await route.fulfill({ response, body });
      });
      return context;
    };
    await use(browser);
    browser.newContext = create;
  },
});
