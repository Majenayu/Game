// Arena gallery for the visual review: a bot fight in each of the 10 arenas, two frames each.
// Run: npx playwright test --project=arenas   (EK_SIZES=1366x768,844x390  EK_Q=high|medium|low  EK_OUT=dir)
import { test } from '@playwright/test';
import { boot, waitFight } from './helpers';
const ALL = ['1366x768', '1920x1080', '390x844', '844x390'];
const SIZES = (process.env.EK_SIZES ?? '1366x768').split(',').filter((s) => ALL.includes(s));
const Q = process.env.EK_Q ?? 'high';
const OUT = process.env.EK_OUT ?? 'docs/visual-overhaul/after';
const ONLY = process.env.EK_ARENAS ? process.env.EK_ARENAS.split(',').map(Number) : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
for (const size of SIZES) {
  test(`arenas at ${size} (${Q})`, async ({ browser }) => {
    test.setTimeout(400_000);
    const [w, h] = size.split('x').map(Number) as [number, number];
    const touch = w < 900;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
    const page = await ctx.newPage();
    const q = touch ? '?touch=1' : '';
    await page.goto(`./${q}`);
    await page.evaluate((quality) => {
      localStorage.clear();
      localStorage.setItem('ek.settings', JSON.stringify({ quality }));
    }, Q);
    const errors = await boot(page, q);
    for (const i of ONLY) {
      await page.evaluate((n) => (window as unknown as { __ek: { botFight: (i: number) => void } }).__ek.botFight(n), i);
      await waitFight(page);
      const id = await page.evaluate(() => document.body.dataset.arena ?? 'arena');
      await page.waitForTimeout(4200);
      await page.screenshot({ path: `${OUT}/${size}-arena-${String(i).padStart(2, '0')}-${id}-a.png` });
      await page.waitForTimeout(3800);
      await page.screenshot({ path: `${OUT}/${size}-arena-${String(i).padStart(2, '0')}-${id}-b.png` });
    }
    if (errors.length) throw new Error(errors.join('\n'));
    await ctx.close();
  });
}
