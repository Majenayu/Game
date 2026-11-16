import { expect, test } from './fixtures';
import { seed } from './seed';

const uniq = () => 'T' + Math.random().toString(36).slice(2, 10);

test('a stale availability response cannot overwrite a newer invalid name', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/name?*', async route => {
    await gate;
    await route.fulfill({ status:200, contentType:'application/json', headers:{'access-control-allow-origin':'*'}, body:JSON.stringify({ok:true,available:false,reason:'That name is taken'}) });
  });
  await page.goto('/');
  const requested = page.waitForRequest('**/api/name?*');
  await page.locator('#leave').click({timeout:15000});
  await requested;
  await page.locator('#onick').fill('ab');
  await expect(page.locator('#onamemsg')).toContainText('3 to 16');
  const response = page.waitForResponse('**/api/name?*');
  release();
  await (await response).finished();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.locator('#onamemsg')).toContainText('3 to 16');
});

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
  await page.locator('[data-ocls="mage"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-ocls="mage"]')).toHaveAttribute('aria-pressed','true');
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
  await page.locator('#pagebody [data-skill-detail]').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#modal')).toContainText('Cooldown');
  await page.locator('#modal [data-mclose]').click();
  await expect(page.locator('#modal')).toBeHidden();
  await page.locator('#pageclose').click();
  await page.locator('[data-page="loadout"]').click();
  await page.locator('[data-pgtab="profile"]').click();
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
