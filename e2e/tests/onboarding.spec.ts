import { expect, test } from '@playwright/test';

test('first run asks for a class and look, then equips the class skills', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#onboard')).toBeVisible({ timeout: 15_000 });
  await page.locator('#onick').fill('Tester');
  await page.locator('[data-ocls="mage"]').click();
  await page.locator('[data-ocol="3"]').click();
  await page.locator('[data-oacc="6"]').click();
  await page.locator('[data-ostart]').click();
  await expect(page.locator('#onboard')).toBeHidden();
  await expect(page.locator('#menu')).toBeVisible();
  const p = await page.evaluate(() => {
    const pr = (window as any).__orbProgress;
    return { cls: pr.data.profile.cls, skills: pr.data.loadout.skillIds.length, acc: pr.data.loadout.acc, nick: pr.data.nick };
  });
  expect(p).toEqual({ cls: 'mage', skills: 5, acc: 6, nick: 'Tester' });
});
