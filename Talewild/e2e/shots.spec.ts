// Screenshots for the phase report at the four required sizes. Run: npm run shots
import { test } from '@playwright/test';
import { boot, teleport, waitScene, state } from './helpers';

const SIZES = [
  { name: '1366x768', width: 1366, height: 768, touch: false },
  { name: '1920x1080', width: 1920, height: 1080, touch: false },
  { name: '390x844', width: 390, height: 844, touch: true },
  { name: '844x390', width: 844, height: 390, touch: true },
];
const OUT = 'docs/phases/phase1';

for (const s of SIZES) {
  test(`screens at ${s.name}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, hasTouch: s.touch, isMobile: s.touch, deviceScaleFactor: s.touch ? 2 : 1 });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await boot(page, `?debug=1${s.touch ? '&touch=1' : ''}`);
    await waitScene(page, 'title');
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${s.name}-1-title.png` });

    await page.click('#new-story');
    await page.click('.slot[data-slot="1"]');
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/${s.name}-2-create.png` });
    await page.fill('.name-input', 'Wren');
    await page.click('#begin');
    await waitScene(page, 'world');
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${s.name}-3-study.png` });

    // read the desk first so Mara's full scene plays
    await teleport(page, 'study', 5, 2, 'up');
    await page.keyboard.press('Space');
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${OUT}/${s.name}-4-dialogue.png` });
    for (let i = 0; i < 12 && ((await state(page)).dialogue !== null || (await state(page)).scripting); i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(150);
    }

    await teleport(page, 'harbor', 16, 12, 'up');
    await page.waitForTimeout(2600);
    await page.screenshot({ path: `${OUT}/${s.name}-5-harbor.png` });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${s.name}-6-pause.png` });
    await ctx.close();
  });
}
