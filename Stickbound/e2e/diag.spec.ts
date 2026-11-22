import { test } from '@playwright/test';
import { boot, waitFight } from './helpers';
test('diag', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('./');
  await page.evaluate((q) => { localStorage.clear(); if (q !== 'auto') localStorage.setItem('ek.settings', JSON.stringify({ quality: q })); }, process.env.EK_Q ?? 'high');
  const errs = await boot(page);
  await page.evaluate(() => (window as any).__ek.botFight(0));
  await waitFight(page);
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(2000);
    console.log(JSON.stringify(await page.evaluate(() => { const e = (window as any).__ek; const m = e.match(); return { frame: m.frame, phase: m.phase, q: document.documentElement.dataset.quality, auto: JSON.parse(localStorage.getItem('ek.settings') ?? '{}').autoQuality, fps: Math.round((window as any).__ek.app.game.loop.actualFps), qf: (window as any).__ek.app.game.scene.getScene('fight').qFrames, qs: Math.round((window as any).__ek.app.game.scene.getScene('fight').qSum), sq: JSON.stringify((window as any).__ek.settings ?? null) }; })));
  }
  console.log(errs.join('\n').slice(0, 2000));
});
