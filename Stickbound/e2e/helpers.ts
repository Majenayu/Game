import { expect, type Page } from '@playwright/test';

type Hooks = {
  screen: () => string;
  autopilot: (d?: number) => boolean;
  inFight: () => boolean;
  match: () => { phase: string; winner: number; frame: number } | null;
  platformLog: () => string[];
};

export const hooks = <T>(page: Page, fn: (h: Hooks) => T): Promise<T> =>
  page.evaluate((src) => {
    const h = (window as unknown as { __ek: Hooks }).__ek;
    return new Function('h', `return (${src})(h)`)(h) as T;
  }, fn.toString());

export async function boot(page: Page, query = ''): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`/${query}`);
  await page.waitForFunction(() => !!(window as unknown as { __ek?: unknown }).__ek, null, { timeout: 30_000 });
  return errors;
}

export async function fresh(page: Page, query = ''): Promise<string[]> {
  await page.goto(`/${query}`);
  await page.evaluate(() => localStorage.clear());
  return boot(page, query);
}

export async function waitScreen(page: Page, id: string, timeout = 20_000): Promise<void> {
  await expect.poll(() => hooks(page, (h) => h.screen()), { timeout }).toBe(id);
}

export async function waitFight(page: Page): Promise<void> {
  await expect.poll(() => hooks(page, (h) => h.inFight()), { timeout: 15_000 }).toBe(true);
}

/** Hands the player's side to a bot and waits for the fight to end. */
export async function autoWin(page: Page, difficulty = 5, timeout = 200_000): Promise<void> {
  await waitFight(page);
  await page.evaluate((d) => (window as unknown as { __ek: Hooks }).__ek.autopilot(d), difficulty);
  await expect.poll(() => hooks(page, (h) => h.inFight()), { timeout, intervals: [500] }).toBe(false);
}

/** Quits the running fight from the pause menu. */
export async function quitFight(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Quit fight' }).click();
  await expect.poll(() => hooks(page, (h) => h.inFight())).toBe(false);
}
