import type { BrowserContext, Page } from '@playwright/test';

/** Skips the first-run profile screen by storing a save that already has a class. */
export async function seed(target: Page | BrowserContext, extra: Record<string, unknown> = {}): Promise<void> {
  const save = JSON.stringify({ profile: { cls: 'warrior', created: 1 }, ...extra });
  await target.addInitScript((s) => {
    if (!localStorage.getItem('orb.save2')) localStorage.setItem('orb.save2', s);
  }, save);
}
