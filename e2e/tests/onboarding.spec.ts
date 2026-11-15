import { expect, test } from '@playwright/test';
import { seed } from './seed';

const uniq = () => 'T' + Math.random().toString(36).slice(2, 10);

test('first run lands straight in a tutorial, then asks for a unique name, class and look', async ({ page }) => {
  await page.goto('/');
  // CrazyGames: zero clicks to gameplay
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'offline', { timeout: 15_000 });
  await expect(page.locator('#hint .kc').first()).toBeVisible();
  await page.locator('#leave').click();
  await expect(page.locator('#onboard')).toBeVisible({ timeout: 8_000 });
  await page.locator('#onick').fill('ab');
  await expect(page.locator('#onamemsg')).toContainText('3 to 16');
  const name = uniq();
  await page.locator('#onick').fill(name);
  await expect(page.locator('#onamemsg')).toContainText('free', { timeout: 8_000 });
  await page.locator('[data-ocls="mage"]').click();
  await page.locator('[data-ocol="3"]').click();
  await page.locator('[data-oacc="6"]').click();
  await page.locator('[data-ostart]').click();
  await expect(page.locator('#onboard')).toBeHidden({ timeout: 8_000 });
  await expect(page.locator('#menu')).toBeVisible();
  const p = await page.evaluate(() => {
    const pr = (window as any).__orbProgress;
    return { cls: pr.data.profile.cls, reg: pr.data.profile.registered, skills: pr.data.loadout.skillIds.length, acc: pr.data.loadout.acc, nick: pr.data.nick };
  });
  expect(p).toEqual({ cls: 'mage', reg: true, skills: 5, acc: 6, nick: name });
});

test('a taken name is refused', async ({ browser }) => {
  const name = uniq();
  const a = await (await browser.newContext()).newPage();
  await a.goto('/');
  await a.locator('#leave').click({ timeout: 15_000 });
  await a.locator('#onick').fill(name);
  await a.locator('[data-oquick]').click();
  await expect(a.locator('#onboard')).toBeHidden({ timeout: 8_000 });
  const b = await (await browser.newContext()).newPage();
  await b.goto('/');
  await b.locator('#leave').click({ timeout: 15_000 });
  await b.locator('#onick').fill(name.toLowerCase());
  await expect(b.locator('#onamemsg')).toContainText('taken', { timeout: 8_000 });
  await b.locator('[data-ostart]').click();
  await expect(b.locator('#onboard')).toBeVisible();
  await expect(b.locator('#onamemsg')).toContainText('taken');
});

test('skill details, merge animation, guilds, world ranking and pause', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await expect(page.locator('#menu')).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-page="collection"]').click();
  await page.locator('[data-dailydrop]').click();
  await expect(page.locator('#mergefx')).toBeVisible();
  await page.locator('#pagebody [data-skill]').first().click();
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#modal')).toContainText('Cooldown');
  await page.locator('#modal [data-mclose]').click();
  await expect(page.locator('#modal')).toBeHidden();
  await page.locator('#pageclose').click();
  await page.locator('[data-page="profile"]').click();
  await expect(page.locator('#pagebody')).toContainText('How ranking works');
  await expect(page.locator('#pagebody')).toContainText('ranked players worldwide', { timeout: 8_000 });
  await page.locator('#pageclose').click();
  await page.locator('[data-page="guild"]').click();
  await expect(page.locator('#pagebody')).toContainText('World guild ranking', { timeout: 8_000 });
  await page.locator('#pageclose').click();
  await page.locator('#practice').click();
  await expect(page.locator('#lobby')).toBeVisible({ timeout: 8_000 });
  await page.locator('[data-lconfirm]').click();
  await page.keyboard.press('p');
  await expect(page.locator('#overlay')).toContainText('Paused');
  await page.locator('#overlay button', { hasText: 'Leave match' }).click();
  await expect(page.locator('#menu')).toBeVisible();
});
