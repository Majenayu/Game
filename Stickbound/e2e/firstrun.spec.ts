// Definition of Done 1: a new player goes from page load to winning a first fight in under 60 seconds.
// The "player" here is plain key mashing (walk right, attack, now and then a power, a swap), not a bot.
import { expect, test } from '@playwright/test';
import { fresh, hooks, waitFight, waitScreen } from './helpers';

test('page load to first win in under 60 seconds with simple key mashing', async ({ page }) => {
  const t0 = Date.now();
  const errors = await fresh(page);
  await waitScreen(page, 'starter');
  await waitScreen(page, 'starter');
  await page.locator('.el-card[data-el="fire"]').click();
  await waitFight(page);
  let i = 0;
  while (await hooks(page, (h) => h.inFight())) {
    if (Date.now() - t0 > 70_000) break;
    const m = await hooks(page, (h) => h.match());
    const key = i % 9 === 4 ? 'KeyU' : i % 23 === 11 ? 'KeyQ' : 'KeyJ';
    await page.keyboard.down('KeyD');
    await page.keyboard.press(key, { delay: 40 });
    i++;
    if (m && m.phase === 'over') await page.waitForTimeout(300);
  }
  await page.keyboard.up('KeyD');
  await waitScreen(page, 'results');
  const seconds = (Date.now() - t0) / 1000;
  const title = await page.locator('.frame-head h1').textContent();
  console.log(`first-run: "${title}" after ${seconds.toFixed(1)} s from page load`);
  expect(title).toBe('First win!');
  expect(seconds).toBeLessThan(60);
  expect(errors).toEqual([]);
});
