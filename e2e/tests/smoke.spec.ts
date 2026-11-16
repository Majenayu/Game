import { expect, test, type Browser, type Page } from '@playwright/test';
import { seed } from './seed';

test.beforeEach(async ({ page }) => seed(page));
async function newPage(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext();
  await seed(ctx);
  return ctx.newPage();
}

async function play(page: Page, name: string) {
  await page.goto('/');
  await page.locator('#nick').fill(name);
  await page.locator('#play').click();
}

const humans = async (p: Page) => Number(await p.locator('body').getAttribute('data-humans'));

test('two browsers join the same room and see each other', async ({ browser }) => {
  const a = await newPage(browser);
  const b = await newPage(browser);
  const errors: string[] = [];
  for (const p of [a, b]) p.on('pageerror', (e) => errors.push(e.message));

  await play(a, 'Alice');
  await expect(a.locator('body')).toHaveAttribute('data-mode', 'online', { timeout: 15_000 });
  await expect.poll(() => humans(a), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
  await play(b, 'Bob');
  await expect(b.locator('body')).toHaveAttribute('data-mode', 'online', { timeout: 15_000 });

  const roomA = await a.locator('body').getAttribute('data-room');
  const roomB = await b.locator('body').getAttribute('data-room');
  expect(roomA).toBeTruthy();
  expect(roomA).toBe(roomB);

  // both pages agree on how many humans are in the room, and it includes both of them
  await expect
    .poll(async () => (await humans(a)) === (await humans(b)) && (await humans(a)) >= 2, { timeout: 15_000 })
    .toBe(true);
  await expect(a.locator('body')).toHaveAttribute('data-players', '4');
  const base = await humans(a);

  // invite button produces a link containing the room id, and opening it joins the same room
  await a.locator('#invite').click();
  await expect(a.locator('#toast')).toContainText(roomA!);
  const c = await newPage(browser);
  await c.goto('/?roomId=' + roomA + '&server=0');
  await expect(c.locator('body')).toHaveAttribute('data-room', roomA!, { timeout: 15_000 });
  await expect.poll(() => humans(a), { timeout: 15_000 }).toBe(base + 1);
  await c.locator('#leave').click();
  await expect.poll(() => humans(a), { timeout: 15_000 }).toBe(base);

  // Alice moves; both pages keep running without errors and the HUD is visible
  await a.keyboard.down('d');
  await a.waitForTimeout(800);
  await a.keyboard.up('d');
  await expect(a.locator('#hud')).toBeVisible();
  expect(errors).toEqual([]);

  await b.locator('#leave').click();
  await expect.poll(() => humans(a), { timeout: 15_000 }).toBe(base - 1);
  await a.close();
});

test('a lone offline player gets bots', async ({ page }) => {
  await page.goto('/');
  await page.locator('#practice').click();
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'offline');
  await expect(page.locator('body')).toHaveAttribute('data-players', '4', { timeout: 5_000 });
  await expect(page.locator('body')).toHaveAttribute('data-humans', '1');
  await expect(page.locator('#timer')).toContainText(':');
});

test('crazygames mode falls back safely and works', async ({ page }) => {
  await page.goto('/?crazygames=1&muteAudio=true');
  await expect(page.locator('#menu')).toBeVisible({ timeout: 15_000 });
});
