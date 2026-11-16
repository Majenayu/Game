import { expect, test } from '@playwright/test';
import { seed } from './seed';

test('presentation and audio preferences persist outside save data', async ({ page }) => {
  await seed(page, { coins: 9876, xp: 4200, nick: 'LegacyOrb' });
  await page.goto('/');
  await expect(page.locator('#menu')).toBeVisible({ timeout: 15_000 });
  const before = await page.evaluate(() => JSON.stringify((window as any).__orbProgress.data));
  await page.locator('#settings').click();
  await page.getByLabel('Graphics quality').selectOption('low');
  await page.locator('[data-pref="motion"]').uncheck();
  await page.locator('[data-pref="colorblind"]').check();
  await page.locator('input[data-pref="effects"]').evaluate((el: HTMLInputElement) => {
    el.value = '55';
    el.dispatchEvent(new Event('input'));
  });
  await expect(page.locator('html')).toHaveAttribute('data-quality', 'low');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => JSON.stringify((window as any).__orbProgress.data))).toBe(before);
  await page.reload();
  await page.locator('#settings').click();
  await expect(page.getByLabel('Graphics quality')).toHaveValue('low');
  await expect(page.locator('input[data-pref="effects"]')).toHaveValue('55');
});

test('portrait touch play uses readable camera and safe controls, then restores world view', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await seed(context);
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#menu')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#rotate')).toBeHidden();
  await page.locator('#practice').click();
  await page.locator('[data-lconfirm]').click();
  await page.waitForFunction(() => {
    const source = (window as any).__orbGame.scene.getScene('game').activeSource;
    return source?.view(performance.now()).players.find((p: any) => p.id === source.localId)?.hold <= 0;
  }, null, { timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => (window as any).__orbGame.scale.gameSize.width)).toBe(640);
  const skills = await page.locator('#skills').boundingBox();
  const leaderboard = await page.locator('#lb').boundingBox();
  expect(skills!.y).toBeGreaterThan(leaderboard!.y + leaderboard!.height);
  expect(skills!.x).toBeGreaterThanOrEqual(0);
  expect(skills!.x + skills!.width).toBeLessThanOrEqual(390);
  await page.locator('#leave').click();
  await expect(page.locator('#menu')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__orbGame.scale.gameSize.width)).toBe(1600);
  await context.close();
});

test('journey only presents existing goals and links to their original pages', async ({ page }) => {
  await seed(page, { coins: 4321, xp: 9000 });
  await page.goto('/');
  await expect(page.locator('#menu')).toBeVisible({ timeout: 15_000 });
  const before = await page.evaluate(() => JSON.stringify((window as any).__orbProgress.data));
  await page.locator('#journey summary').click();
  await expect(page.locator('.journey-card')).toHaveCount(3);
  expect(await page.evaluate(() => JSON.stringify((window as any).__orbProgress.data))).toBe(before);
  await page.locator('[data-journey-go="campaign"]').click();
  await expect(page.locator('#page')).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify((window as any).__orbProgress.data))).toBe(before);
});
