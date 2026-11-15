import { expect, test, type Page } from '@playwright/test';
import { seed } from './seed';

test.beforeEach(async ({ page }) => seed(page));

async function openPage(page: Page, name: string) {
  await page.goto('/');
  await expect(page.locator('#menu')).toBeVisible({ timeout: 15_000 });
  await page.locator(`[data-page="${name}"]`).click();
  await expect(page.locator('#page')).toBeVisible();
}

test('menu shows progress and every page opens', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#menu')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#menu [data-coins]')).not.toHaveText('');
  for (const name of [
    'arenas',
    'campaign',
    'loadout',
    'collection',
    'fusion',
    'shop',
    'daily',
    'quests',
    'spin',
    'dex',
    'bestiary',
    'tower',
    'ranked',
    'market',
    'training',
    'profile',
    'chests',
  ]) {
    await page.locator(`[data-page="${name}"]`).click();
    await expect(page.locator('#page')).toBeVisible();
    await expect(page.locator('#pagebody')).not.toBeEmpty();
    await page.locator('#pageclose').click();
    await expect(page.locator('#menu')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('bestiary shows the champion and all eight bosses', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#champ')).toBeVisible({ timeout: 15_000 });
  await page.locator('#champbtn').click();
  await expect(page.locator('.boss')).toHaveCount(9);
  await expect(page.locator('.boss.champion')).toContainText('Majen');
});

test('daily reward can be claimed once and adds coins', async ({ page }) => {
  await openPage(page, 'daily');
  const coinsBefore = Number(await page.locator('#page [data-coins]').first().innerText());
  await page.locator('[data-claimdaily]').click();
  await expect(page.locator('[data-claimdaily]')).toBeDisabled();
  const coinsAfter = Number(await page.locator('#page [data-coins]').first().innerText());
  expect(coinsAfter).toBeGreaterThan(coinsBefore);
});

test('shop purchase spends coins and unlocks an item', async ({ page }) => {
  await openPage(page, 'shop');
  await page.locator('[data-shoptab="color"]').click();
  const before = Number(await page.locator('#page [data-coins]').first().innerText());
  await page.locator('[data-buy="color:8"]').click();
  await expect(page.locator('[data-buy="color:8"]')).toHaveCount(0);
  const after = Number(await page.locator('#page [data-coins]').first().innerText());
  expect(after).toBeLessThan(before);
});

test('new players own five starter skills and can claim a daily skill drop', async ({ page }) => {
  await openPage(page, 'collection');
  await expect(page.locator('#pagebody .skillcard')).toHaveCount(5);
  await page.locator('[data-dailydrop]').click();
  await expect(page.locator('[data-dailydrop]')).toBeDisabled();
  await page.locator('#pageclose').click();
  await page.locator('[data-page="loadout"]').click();
  await expect(page.locator('#pagebody')).toContainText('Power budget');
});
test('lucky draw spins and grants a prize', async ({ page }) => {
  await openPage(page, 'spin');
  await page.locator('[data-spin]').click();
  await expect(page.locator('#spinresult')).toContainText('You won', { timeout: 10_000 });
});

test('campaign level 1 starts offline with an objective and bots', async ({ page }) => {
  await openPage(page, 'campaign');
  await page.locator('[data-lvl="1"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'campaign');
  await expect(page.locator('#objective')).toContainText('Defeat 3 orbs');
  await expect(page.locator('body')).toHaveAttribute('data-players', '3', { timeout: 5_000 });
  await expect(page.locator('#sk0')).toBeVisible();
});

test('every game mode starts offline and runs without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('#menu')).toBeVisible({ timeout: 15_000 });
  for (const mode of ['dm', 'tdm', 'coins', 'hill']) {
    await page.locator('[data-page="arenas"]').click();
    await page.locator(`[data-mode="${mode}"]`).click();
    await page.locator('[data-offline="neon"]').click();
    await expect(page.locator('body')).toHaveAttribute('data-arena', new RegExp(`^${mode}:neon`), {
      timeout: 8_000,
    });
    await page.keyboard.press('Space');
    await page.waitForTimeout(700);
    await page.locator('#leave').click();
    await expect(page.locator('#menu')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('skills can be used with the keyboard and show a cooldown', async ({ page }) => {
  await page.goto('/');
  await page.locator('#practice').click();
  await expect(page.locator('#sk0')).toBeVisible({ timeout: 8_000 });
  await page.locator('[data-lconfirm]').click();
  await page.waitForTimeout(3600);
  await page.keyboard.press('Digit1');
  await expect(page.locator('#sk0 .cdn')).not.toHaveText('', { timeout: 10_000 });
});

test('lobby shows every orb with skills, waits for confirm, then counts down 3 2 1', async ({ page }) => {
  await page.goto('/');
  await page.locator('#practice').click();
  await expect(page.locator('#lobby')).toBeVisible({ timeout: 8_000 });
  await expect(page.locator('#lobby .lp')).toHaveCount(8);
  await expect(page.locator('#lobby .lsk').first()).toBeVisible();
  await expect(page.locator('#lobbytime')).toHaveText(/^(2[0-5]|1\d)$/);
  await page.locator('[data-ledit]').click();
  await expect(page.locator('[data-lpick]').first()).toBeVisible();
  await page.locator('[data-lcancel]').click();
  await page.locator('[data-lconfirm]').click();
  await expect(page.locator('#lobby')).toBeHidden();
  await expect(page.locator('#countdown')).toBeVisible();
  await expect(page.locator('#countdown')).toHaveText(/^[123]$/);
  await expect(page.locator('#countdown')).toHaveText('GO!', { timeout: 5_000 });
});
test('anyone can challenge Majen 1v1; training starts at once; auto toggles', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#menu')).toBeVisible({ timeout: 15_000 });
  await page.locator('#champfight').click();
  await expect(page.locator('body')).toHaveAttribute('data-players', '2', { timeout: 8_000 });
  await expect(page.locator('#lobby')).toContainText('Majen');
  await page.locator('#leave').click();
  await expect(page.locator('#menu')).toBeVisible();
  await page.locator('[data-page="training"]').click();
  await page.locator('[data-train]').click();
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#lobby')).toBeHidden();
  await expect(page.locator('#autobtn')).toBeVisible();
  await page.locator('#autobtn').dispatchEvent('pointerdown');
  await expect(page.locator('#autobtn')).toHaveText('AUTO ON');
  await page.keyboard.press('x');
  await expect(page.locator('#autobtn')).toHaveText('AUTO');
});
test('ranked duel: lobby shows both fighters, confirm, countdown, fight', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openPage(page, 'ranked');
  await page.locator('[data-duelpractice]').click();
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'duelpractice');
  await expect(page.locator('#lobby')).toBeVisible({ timeout: 8_000 });
  await expect(page.locator('#lobby .lp')).toHaveCount(2);
  await page.locator('[data-lconfirm]').click();
  await expect(page.locator('#lobby')).toBeHidden();
  await page.waitForTimeout(3500);
  const st = await page.evaluate(() => {
    const g = (window as any).__orbGame;
    const d = g.scene.getScene('duel');
    return d.src.view().phase;
  });
  expect(st).toBe('fight');
  await page.keyboard.down('d');
  await page.waitForTimeout(600);
  await page.keyboard.up('d');
  await page.keyboard.press('j');
  await page.keyboard.press('Digit3');
  await page.locator('#leave').click();
  await expect(page.locator('#menu')).toBeVisible();
  expect(errors).toEqual([]);
});
test('online ranked duel finds a match on the server', async ({ page }) => {
  await openPage(page, 'ranked');
  await page.locator('[data-ranked]').click();
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'duel', { timeout: 15_000 });
  await expect(page.locator('#lobby')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#lobby')).toContainText('Ranked duel');
});
test('chests list their contents and opening one shows what you got', async ({ page }) => {
  await page.addInitScript(() => {
    const s = JSON.parse(localStorage.getItem('orb.save3') || '{}');
    if (!s.chests) {
      s.chests = { wood: 1, silver: 0, gold: 0, legend: 0 };
      localStorage.setItem('orb.save3', JSON.stringify(s));
    }
  });
  await openPage(page, 'chests');
  await expect(page.locator('#pagebody')).toContainText('Skill card odds');
  await page.locator('[data-open="wood"]').click();
  await expect(page.locator('#pagebody')).toContainText('You got');
  await expect(page.locator('#pagebody li').first()).toContainText('coins');
});
test('lucky draw has four wheels and 10 free spins', async ({ page }) => {
  await openPage(page, 'spin');
  await expect(page.locator('[data-wheel]')).toHaveCount(4);
  await expect(page.locator('[data-spin]')).toContainText('10 left');
  await page.locator('[data-wheel="weapons"]').click();
  await expect(page.locator('#pagebody')).toContainText('Rail Lance');
});
test('profile shows stats, loadout and leaderboard', async ({ page }) => {
  await openPage(page, 'profile');
  await expect(page.locator('#pagebody')).toContainText('Matches');
  await expect(page.locator('#pagebody')).toContainText('World ranking');
  await expect(page.locator('#pagebody .ico').first()).toBeVisible();
});
test('boss tower lists nine floors and starts locked', async ({ page }) => {
  await openPage(page, 'tower');
  await expect(page.locator('[data-tower]')).toHaveCount(9);
  await expect(page.locator('[data-tower="101"]')).toBeDisabled();
  await expect(page.locator('[data-tower="109"]')).toBeEnabled();
  await expect(page.locator('#pagebody')).toContainText('Majen');
});
test('market sells a skill for coins and marks it sold', async ({ page }) => {
  await openPage(page, 'market');
  await expect(page.locator('[data-buy]').first()).toBeVisible();
  const before = Number(await page.locator('#page [data-coins]').first().innerText());
  const cheapest = page.locator('[data-buy]:not([disabled])').first();
  await cheapest.click();
  const after = Number(await page.locator('#page [data-coins]').first().innerText());
  expect(after).toBeLessThan(before);
  await expect(page.locator('#pagebody button:has-text("Sold")')).toHaveCount(1);
});
test('2v2 ranked joins a four orb team match and quick chat works', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openPage(page, 'ranked');
  await expect(page.locator('#pagebody')).toContainText('Bronze');
  await page.locator('[data-team2]').click();
  await expect(page.locator('#hud')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('#overlay')).toBeHidden({ timeout: 20_000 });
  await expect(page.locator('#lobby')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#lobby .lp')).toHaveCount(4);
  await page.locator('[data-lconfirm]').click();
  await expect(page.locator('#emotebtn')).toBeVisible();
  await page.locator('#emotebtn').click();
  await expect(page.locator('#emotes')).toBeVisible();
  await page.locator('[data-emote="1"]').click();
  await expect(page.locator('#emotes')).toBeHidden();
  await page.keyboard.press('t');
  await expect(page.locator('#emotes')).toBeVisible();
  expect(errors).toEqual([]);
});