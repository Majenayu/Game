// Fight screenshots with the hybrid hero parts. EK_EL picks the starter element. Output: docs/reference-art/compare-v5/fight-<size>.png
import { test } from '@playwright/test';
import { boot, waitFight, waitScreen } from './helpers';
const EL = process.env.EK_EL ?? 'lightning';
for (const s of [{ name: '1366x768', width: 1366, height: 768, touch: false }, { name: '844x390', width: 844, height: 390, touch: true }]) {
  test(`fight ${EL} ${s.name}`, async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, hasTouch: s.touch, isMobile: s.touch, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const q = s.touch ? '?touch=1' : '';
    await page.goto(`./${q}`);
    await page.evaluate(() => localStorage.clear());
    const errors = await boot(page, q);
    await waitScreen(page, 'starter');
    await page.waitForTimeout(400);
    const card = page.locator(`.el-card[data-el="${EL}"]`);
    if (await card.count()) await card.click();
    else await page.locator('.el-card').first().click();
    await waitFight(page);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `docs/reference-art/compare-v5/fight-${EL}-${s.name}.png` });
    if (errors.length) throw new Error(errors.join('\n'));
  });
}
