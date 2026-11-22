import { test } from '@playwright/test';
import { boot, waitFight } from './helpers';
test('diag', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('./');
  await page.evaluate((q) => { localStorage.clear(); localStorage.setItem('ek.settings', JSON.stringify({ quality: q })); }, process.env.EK_Q ?? 'high');
  const errs = await boot(page);
  await page.evaluate(() => (window as any).__ek.botFight(0));
  await waitFight(page);
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(2000);
    console.log(JSON.stringify(await page.evaluate(() => { const e = (window as any).__ek; const m = e.match(); return { m, fps: (window as any).Phaser ? 0 : 0, raf: 0 }; })));
  }
  console.log(errs.join('\n').slice(0, 2000));
});
