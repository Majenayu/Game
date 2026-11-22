// Smoke test: opens every screen and plays a fight in every mode (player side on autopilot), with no console errors.
import { expect, test, type Page } from '@playwright/test';
import { autoWin, fresh, hooks, quitFight, waitFight, waitScreen } from './helpers';

async function toLobbyFromResults(page: Page): Promise<void> {
  for (let i = 0; i < 12; i++) {
    const s = await hooks(page, (h) => h.screen());
    if (s === 'lobby') return;
    const primary = page.locator('#screens .btn.primary').first();
    if (await primary.count()) await primary.click();
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
  await waitScreen(page, 'lobby');
}

async function back(page: Page): Promise<void> {
  await page.locator('.frame-head .btn.back').click();
}

test('every screen opens and every mode plays without errors', async ({ page }) => {
  test.setTimeout(600_000);
  const errors = await fresh(page, '?fakeads=1');
  await waitScreen(page, 'starter');
  await page.locator('.el-card[data-el="water"]').click();
  await autoWin(page);
  await waitScreen(page, 'results');
  await toLobbyFromResults(page);

  // lobby panels
  await expect(page.locator('.play-btn')).toBeVisible();
  await expect(page.locator('.quests')).toHaveCount(2);
  await expect(page.locator('.quests').nth(0).locator('.quest')).toHaveCount(3);
  await expect(page.locator('.quests').nth(1).locator('.quest')).toHaveCount(5);
  await page.locator('.streak .btn.claim').click();

  // Avatars, Forge, matchups, new avatar screen
  await page.locator('.lobby-nav').getByRole('button', { name: 'Avatars' }).click();
  await waitScreen(page, 'avatars');
  await expect(page.locator('.power')).toHaveCount(3);
  await page.getByRole('button', { name: 'Forge (looks)' }).click();
  await waitScreen(page, 'forge');
  await page.getByRole('button', { name: 'Next Hat / hair' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await waitScreen(page, 'avatars');
  await page.getByRole('button', { name: 'Element matchups' }).click();
  await waitScreen(page, 'matchups');
  await expect(page.locator('.mu-row')).toHaveCount(10);
  await back(page);
  await page.getByRole('button', { name: '+ New avatar' }).click();
  await waitScreen(page, 'newav');
  await back(page);
  await back(page);
  await waitScreen(page, 'lobby');

  // Shop and Settings
  await page.locator('.lobby-nav').getByRole('button', { name: 'Shop' }).click();
  await waitScreen(page, 'shop');
  await back(page);
  await page.locator('.lobby-nav').getByRole('button', { name: 'Settings' }).click();
  await waitScreen(page, 'settings');
  await page.locator('.btn.toggle').first().click();
  await back(page);
  await waitScreen(page, 'lobby');

  // Champion Road: premise story, district list, one fight
  await page.locator('.m-road').click();
  await waitScreen(page, 'story');
  await page.getByRole('button', { name: 'Skip' }).click();
  await waitScreen(page, 'road');
  await expect(page.locator('.btn.champ')).toHaveCount(41);
  await page.locator('.btn.champ.current').click();
  await waitScreen(page, 'vs');
  await page.locator('[data-test="fight"]').click();
  await autoWin(page);
  // win: outro story -> results -> (level up / perk) -> next champion's VS screen; loss: results -> road
  for (let i = 0; i < 12; i++) {
    const s = await hooks(page, (h) => h.screen());
    if (s === 'vs' || s === 'road') break;
    await page.locator('#screens .btn.primary').first().click().catch(() => undefined);
    await page.waitForTimeout(300);
  }
  if ((await hooks(page, (h) => h.screen())) === 'vs') await back(page);
  await waitScreen(page, 'road');
  await back(page);
  await waitScreen(page, 'lobby');

  // Ranked Ladder
  await page.locator('.m-ranked').click();
  await waitScreen(page, 'ranked');
  await expect(page.locator('.ai-tag').first()).toBeVisible();
  await page.locator('.scr-ranked .btn.primary.big').click();
  await autoWin(page);
  await waitScreen(page, 'results');
  await page.locator('#screens .btn.primary').first().click();
  for (let i = 0; i < 6 && (await hooks(page, (h) => h.screen())) !== 'ranked'; i++) {
    await page.locator('#screens .btn.primary').first().click().catch(() => undefined);
    await page.waitForTimeout(250);
  }
  await waitScreen(page, 'ranked');
  await back(page);

  // Zombie Survival: play a little, quit
  await page.locator('.m-zombie').click();
  await waitScreen(page, 'zombie');
  await page.getByRole('button', { name: 'Start' }).click();
  await waitFight(page);
  await page.waitForTimeout(4000);
  await quitFight(page);
  await waitScreen(page, 'results');
  await page.locator('#screens .btn.primary').first().click();
  for (let i = 0; i < 6 && (await hooks(page, (h) => h.screen())) !== 'zombie'; i++) {
    await page.locator('#screens .btn.primary').first().click().catch(() => undefined);
    await page.waitForTimeout(250);
  }
  await waitScreen(page, 'zombie');
  await back(page);

  // Training
  await page.locator('.m-training').click();
  await waitScreen(page, 'training');
  await page.getByRole('button', { name: 'Hitboxes: off' }).click();
  await page.getByRole('button', { name: 'Start training' }).click();
  await waitFight(page);
  await page.keyboard.down('KeyD');
  await page.keyboard.press('KeyJ');
  await page.keyboard.press('KeyJ');
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(1500);
  await quitFight(page);
  await waitScreen(page, 'training');
  await back(page);

  // Local 2P
  await page.locator('.m-local').click();
  await waitScreen(page, 'local');
  await page.getByRole('button', { name: 'Fight!' }).click();
  await waitFight(page);
  await page.waitForTimeout(2500);
  await quitFight(page);
  await waitScreen(page, 'local');
  await back(page);
  await waitScreen(page, 'lobby');

  // Zombie revive: overrun on purpose, the offer shows 3 equal choices, the ad revive brings the squad back
  await page.locator('.m-zombie').click();
  await page.getByRole('button', { name: 'Start' }).click();
  await waitFight(page);
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const m = (window as unknown as { __ek: { match: () => { fighters: { team: number; hp: number }[] } } }).__ek.match()!;
    for (const f of m.fighters) if (f.team === 0) f.hp = 1;
  });
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('dialog').getByRole('button')).toHaveCount(3);
  await page.getByRole('dialog').getByRole('button', { name: /Watch an ad/ }).click();
  await expect(page.locator('.banner')).toHaveText('BACK IN!', { timeout: 10_000 });
  expect(await hooks(page, (h) => h.inFight())).toBe(true);
  await quitFight(page);
  await waitScreen(page, 'results');
  await page.locator('#screens .btn.primary').first().click();
  for (let i = 0; i < 6 && (await hooks(page, (h) => h.screen())) !== 'zombie'; i++) {
    await page.locator('#screens .btn.primary').first().click().catch(() => undefined);
    await page.waitForTimeout(250);
  }
  await waitScreen(page, 'zombie');
  await back(page);
  await waitScreen(page, 'lobby');

  const log = await hooks(page, (h) => h.platformLog());
  expect(log).toContain('gameplayStart');
  expect(log).toContain('gameplayStop');
  expect(errors).toEqual([]);
});
