import { expect, test } from './fixtures';

test('old nickname keys are removed, and ?reset=1 wipes everything', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('orb.nick', 'majenayu');
      localStorage.setItem('orb.save2', JSON.stringify({ nick: 'majenayu', coins: 5000 }));
    }
  });
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'offline', { timeout: 15_000 });
  const a = await page.evaluate(() => ({
    nick: (window as any).__orbProgress.data.nick,
    old: localStorage.getItem('orb.nick'),
    save2: localStorage.getItem('orb.save2'),
  }));
  expect(a.nick.toLowerCase()).not.toBe('majenayu');
  expect(a.old).toBeNull();
  expect(a.save2).toBeNull();
  await page.goto('/?reset=1');
  await expect(page.locator('body')).toHaveAttribute('data-mode', 'offline', { timeout: 15_000 });
  expect(page.url()).not.toContain('reset');
});
