import { expect, test, type Page } from '@playwright/test';

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
  for (const name of ['arenas', 'campaign', 'loadout', 'shop', 'daily', 'quests', 'spin', 'dex']) {
    await page.locator(`[data-page="${name}"]`).click();
    await expect(page.locator('#page')).toBeVisible();
    await expect(page.locator('#pagebody')).not.toBeEmpty();
    await page.locator('#pageclose').click();
    await expect(page.locator('#menu')).toBeVisible();
  }
  expect(errors).toEqual([]);
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

test('lucky draw spins and grants a prize', async ({ page }) => {
  await openPage(page, 'spin');
  await page.locator('[data-spin]').click();
  await expect(page.locator('#spinresult')).toContainText('You won', { timeout: 10_000 });
});

test('campaign level 1 starts offline with an objective and bots', async ({ page }) => {
  await openPage(page, 'campaign');
  await page.locator('[data-level="1"]').click();
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
    await page.keyboard.press('Escape');
    await expect(page.locator('#menu')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('skills can be used with the keyboard and show a cooldown', async ({ page }) => {
  await page.goto('/');
  await page.locator('#practice').click();
  await expect(page.locator('#sk0')).toBeVisible({ timeout: 8_000 });
  await page.waitForTimeout(500);
  await page.keyboard.press('Space');
  await expect(page.locator('#sk0 .cdn')).not.toHaveText('', { timeout: 3_000 });
});
