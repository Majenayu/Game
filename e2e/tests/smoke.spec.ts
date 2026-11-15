import { expect, test, type Page } from '@playwright/test';

async function play(page: Page, name: string) {
  await page.goto('/');
  await page.locator('#nick').fill(name);
  await page.locator('#play').click();
}

test('two browsers join the same room and see 2 humans', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  const errors: string[] = [];
  for (const p of [a, b]) p.on('pageerror', (e) => errors.push(e.message));

  await play(a, 'Alice');
  await expect(a.locator('body')).toHaveAttribute('data-mode', 'online', { timeout: 15_000 });
  await play(b, 'Bob');
  await expect(b.locator('body')).toHaveAttribute('data-mode', 'online', { timeout: 15_000 });

  await expect(a.locator('body')).toHaveAttribute('data-humans', '2', { timeout: 15_000 });
  await expect(b.locator('body')).toHaveAttribute('data-humans', '2', { timeout: 15_000 });
  await expect(a.locator('body')).toHaveAttribute('data-players', '8');

  const roomA = await a.locator('body').getAttribute('data-room');
  const roomB = await b.locator('body').getAttribute('data-room');
  expect(roomA).toBeTruthy();
  expect(roomA).toBe(roomB);

  // invite button produces a link containing the room id, and opening it joins the same room
  await a.locator('#invite').click();
  await expect(a.locator('#toast')).toContainText(roomA!);
  const c = await (await browser.newContext()).newPage();
  await c.goto('/?roomId=' + roomA + '&server=0');
  await expect(c.locator('body')).toHaveAttribute('data-room', roomA!, { timeout: 15_000 });
  await expect(a.locator('body')).toHaveAttribute('data-humans', '3', { timeout: 15_000 });
  await c.locator('#leave').click();

  // Alice moves; both pages keep running without errors and the canvas is visible
  await a.keyboard.down('d');
  await a.waitForTimeout(800);
  await a.keyboard.up('d');
  await expect(a.locator('#hud')).toBeVisible();
  expect(errors).toEqual([]);

  await b.locator('#leave').click();
  await expect(a.locator('body')).toHaveAttribute('data-humans', '1', { timeout: 15_000 });
  await a.close();
});

test('a lone offline player gets bots', async ({ page }) => {
  await page.goto('/');
  await page.locator('#practice').click();
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'offline');
  await expect(page.locator('body')).toHaveAttribute('data-players', '8', { timeout: 5_000 });
  await expect(page.locator('body')).toHaveAttribute('data-humans', '1');
  await expect(page.locator('#timer')).toContainText(':');
});

test('crazygames mode falls back safely and works', async ({ page }) => {
  await page.goto('/?crazygames=1&muteAudio=true');
  await expect(page.locator('#menu')).toBeVisible({ timeout: 15_000 });
});
