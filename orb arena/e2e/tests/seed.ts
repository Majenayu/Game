import type { BrowserContext, Page } from '@playwright/test';

/** Skips the first-run profile screen by storing a save that already has a class. */
export async function seed(target: Page | BrowserContext, extra: Record<string, unknown> = {}): Promise<void> {
  const save = JSON.stringify({ profile: { cls: 'warrior', created: 1, onboarded: true }, ...extra });
  await target.addInitScript((s) => {
    if (!localStorage.getItem('orb.save3')) localStorage.setItem('orb.save3', s);
    // Tests click every menu tile, so open the More section.
    if (!localStorage.getItem('orb.menuMore')) localStorage.setItem('orb.menuMore', '1');
  }, save);
}
