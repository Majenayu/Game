import { expect, type Page } from '@playwright/test';

export interface TwState {
  scene: 'world' | 'title' | 'boot';
  map: string | null;
  x: number | null;
  y: number | null;
  facing: string | null;
  slot: number | null;
  flags: Record<string, boolean>;
  bag: Record<string, number>;
  uiBusy: boolean;
  dialogue: string | null;
  scripting: boolean;
  paused: boolean;
}

export const state = (page: Page): Promise<TwState> =>
  page.evaluate(() => (window as unknown as { __tw: { state: () => TwState } }).__tw.state());

export async function boot(page: Page, query = '?debug=1'): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`/${query}`);
  await page.waitForFunction(() => (window as unknown as { __tw?: { ready: boolean } }).__tw?.ready === true, null, { timeout: 30_000 });
  return errors;
}

export async function waitScene(page: Page, scene: TwState['scene']): Promise<void> {
  await expect.poll(async () => (await state(page)).scene, { timeout: 15_000 }).toBe(scene);
}

/** Press a key and hold it for a while (walking). */
export async function hold(page: Page, key: string, ms: number): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

/** Starts a new story in slot 1 with the default look. */
export async function newStory(page: Page, name = 'Tester'): Promise<void> {
  await page.click('#new-story');
  await page.click('.slot[data-slot="1"]');
  if (await page.locator('.slot.confirm').count()) await page.click('.slot[data-slot="1"]');
  await page.fill('.name-input', name);
  await page.click('#begin');
  await waitScene(page, 'world');
}

/** Advances dialogue until it closes (max n presses). */
export async function finishDialogue(page: Page, max = 20): Promise<void> {
  for (let i = 0; i < max; i++) {
    const s = await state(page);
    if (s.dialogue === null && !s.scripting) return;
    if (s.dialogue === null) {
      await page.waitForTimeout(150);
      continue;
    }
    if (await page.locator('.dlg-choices button').count()) await page.locator('.dlg-choices button').first().click();
    else await page.keyboard.press('Space');
    await page.waitForTimeout(120);
  }
  throw new Error('dialogue did not close');
}

export async function teleport(page: Page, map: string, x: number, y: number, facing: string): Promise<void> {
  await page.evaluate(
    ([m, px, py, f]) => (window as unknown as { __tw: { debug: { teleport: (...a: unknown[]) => void } } }).__tw.debug.teleport(m, px, py, f),
    [map, x, y, facing] as const,
  );
  await expect.poll(async () => {
    const s = await state(page);
    return `${s.map}:${s.x},${s.y}`;
  }).toBe(`${map}:${x},${y}`);
  await page.waitForTimeout(350);
}
