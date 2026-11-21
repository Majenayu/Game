import { expect, test } from '@playwright/test';
import { boot, finishDialogue, hold, newStory, state, teleport, waitScene } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('title screen, new story, walk, talk, door, save and load', async ({ page }) => {
  const errors = await boot(page);
  await waitScene(page, 'title');
  await expect(page.locator('.logo h1')).toHaveText('Talewild');

  await newStory(page);
  let s = await state(page);
  expect(s).toMatchObject({ map: 'study', x: 5, y: 3, slot: 1 });

  // walk: two steps down
  await hold(page, 'ArrowDown', 480);
  await page.waitForTimeout(300);
  s = await state(page);
  expect(s.y).toBeGreaterThan(3);

  // read the desk: dialogue, item and flag
  await teleport(page, 'study', 5, 2, 'up');
  await page.keyboard.press('Space');
  await expect.poll(async () => (await state(page)).dialogue).not.toBeNull();
  await finishDialogue(page);
  s = await state(page);
  expect(s.flags.got_letter).toBe(true);
  expect(s.bag.old_letter).toBe(1);

  // walk out of the door onto the harbour
  await teleport(page, 'study', 5, 7, 'down');
  await hold(page, 'ArrowDown', 300);
  await expect.poll(async () => (await state(page)).map, { timeout: 5000 }).toBe('harbor');
  s = await state(page);
  expect([s.x, s.y]).toEqual([5, 5]);

  // talk to Mara (choice + camera pan)
  await teleport(page, 'harbor', 17, 11, 'up');
  await page.keyboard.press('Space');
  await expect.poll(async () => (await state(page)).dialogue).toContain('Elowen');
  await finishDialogue(page, 40);
  expect((await state(page)).flags.met_mara).toBe(true);

  // a wall blocks movement
  await teleport(page, 'harbor', 1, 1, 'up');
  await hold(page, 'ArrowUp', 300);
  s = await state(page);
  expect([s.x, s.y]).toEqual([1, 1]);

  // save to slot 2 from the pause menu
  await teleport(page, 'harbor', 16, 12, 'left');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page)).paused).toBe(true);
  await page.click('#menu-save');
  await page.click('.slot[data-slot="2"]');
  await expect.poll(async () => (await state(page)).paused).toBe(false);

  // reload and continue: the latest save (slot 2) restores position, flags and bag
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __tw?: { ready: boolean } }).__tw?.ready === true);
  await page.click('#continue');
  await waitScene(page, 'world');
  s = await state(page);
  expect(s).toMatchObject({ map: 'harbor', x: 16, y: 12, facing: 'left', slot: 2 });
  expect(s.flags.met_mara).toBe(true);
  expect(s.bag.old_letter).toBe(1);

  expect(errors).toEqual([]);
});

test('touch controls move the player and talk', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = await boot(page, '?debug=1&touch=1');
  await waitScene(page, 'title');
  await newStory(page);
  const pad = page.locator('.pad');
  const box = (await pad.boundingBox())!;
  // hold the lower part of the pad
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 12);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  await page.waitForTimeout(300);
  expect((await state(page)).y).toBeGreaterThan(3);

  await teleport(page, 'study', 5, 2, 'up');
  await page.locator('.btn-a').dispatchEvent('pointerdown', { pointerId: 1 });
  await page.locator('.btn-a').dispatchEvent('pointerup', { pointerId: 1 });
  await expect.poll(async () => (await state(page)).dialogue).not.toBeNull();
  expect(errors).toEqual([]);
  await ctx.close();
});

test('portal events: gameplay stops in menus and starts in the world', async ({ page }) => {
  await boot(page);
  await waitScene(page, 'title');
  await newStory(page);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page)).paused).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page)).paused).toBe(false);
  const log = await page.evaluate(() => (window as unknown as { __tw: { platformLog: () => string[] } }).__tw.platformLog());
  expect(log.slice(0, 2)).toEqual(['loadingStart', 'loadingStop']);
  expect(log.slice(-3)).toEqual(['gameplayStart', 'gameplayStop', 'gameplayStart']);
});

test('a damaged save falls back to its backup', async ({ page }) => {
  await boot(page);
  await waitScene(page, 'title');
  await newStory(page);
  await teleport(page, 'harbor', 16, 12, 'down');
  await page.keyboard.press('Escape');
  await page.click('#menu-save');
  await page.click('.slot[data-slot="1"]');
  await page.evaluate(() => localStorage.setItem('tw.slot1', 'broken'));
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __tw?: { ready: boolean } }).__tw?.ready === true);
  await expect(page.locator('#continue')).toBeVisible();
  await expect(page.locator('#continue')).toHaveCount(1);
  await page.click('#continue');
  await waitScene(page, 'world');
  // the backup is the save written when the story began (or on the map change autosave)
  expect((await state(page)).map).not.toBeNull();
});
