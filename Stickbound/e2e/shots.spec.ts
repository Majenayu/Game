// Screenshots at the four required sizes. Run: npx playwright test --project=shots
// Output: docs/shots/<size>-<n>-<screen>.png
import { test, type Page } from '@playwright/test';
import { boot, hooks, waitFight, waitScreen } from './helpers';

const SIZES = [
  { name: '1366x768', width: 1366, height: 768, touch: false },
  { name: '1920x1080', width: 1920, height: 1080, touch: false },
  { name: '390x844', width: 390, height: 844, touch: true },
  { name: '844x390', width: 844, height: 390, touch: true },
];
const OUT = 'docs/shots';

async function seed(page: Page): Promise<void> {
  // a mid-game profile so menus show real content: levels, unlocked elements, quests in progress
  await page.evaluate(() => {
    const ek = (window as unknown as { __ek: { app: { profile: Record<string, unknown> } } }).__ek;
    const p = ek.app.profile as {
      avatars: { level: number; element: string; perks: (string | null)[] }[];
      unlocked: string[];
      champion: { cleared: number[]; seen: string[] };
      coins: number;
      tutorialDone: boolean;
      playerXp: number;
    };
    p.avatars[0]!.level = 24;
    p.avatars[1]!.level = 18;
    p.avatars[0]!.perks = ['power', null, null];
    p.unlocked.push('water', 'wind');
    p.champion.cleared = [0, 1, 2, 3, 4, 5, 6];
    p.champion.seen.push('premise');
    p.coins = 1460;
    p.playerXp = 3200;
    p.tutorialDone = true;
  });
}

for (const s of SIZES) {
  test(`screens at ${s.name}`, async ({ browser }) => {
    test.setTimeout(180_000);
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, hasTouch: s.touch, isMobile: s.touch, deviceScaleFactor: s.touch ? 2 : 1 });
    const page = await ctx.newPage();
    const q = s.touch ? '?touch=1' : '';
    await page.goto(`/${q}`);
    await page.evaluate(() => localStorage.clear());
    await boot(page, q);
    await waitScreen(page, 'title');
    await page.waitForTimeout(500);
    const shot = (n: string) => page.screenshot({ path: `${OUT}/${s.name}-${n}.png` });
    await shot('01-title');
    await page.getByRole('button', { name: 'Play' }).click();
    await waitScreen(page, 'starter');
    await shot('02-starter');
    await page.locator('.el-card[data-el="fire"]').click();
    await waitFight(page);
    await page.waitForTimeout(2600);
    await shot('03-tutorial');
    // quit the tutorial, then seed a mid-game profile
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await shot('04-pause');
    await page.getByRole('button', { name: 'Quit fight' }).click();
    await waitScreen(page, 'lobby');
    await seed(page);
    await page.evaluate(() => (window as unknown as { __ek: { show: (s: string) => void } }).__ek.show('lobby'));
    await page.waitForTimeout(400);
    await shot('05-lobby');
    await page.evaluate(() => (window as unknown as { __ek: { show: (s: string) => void } }).__ek.show('avatars'));
    await page.waitForTimeout(300);
    await shot('06-avatars');
    await page.evaluate(() => (window as unknown as { __ek: { show: (s: string) => void } }).__ek.show('road'));
    await page.waitForTimeout(300);
    await shot('07-road');
    await page.evaluate(() => (window as unknown as { __ek: { show: (s: string) => void } }).__ek.show('ranked'));
    await page.waitForTimeout(300);
    await shot('08-ranked');
    await page.evaluate(() => (window as unknown as { __ek: { show: (s: string) => void } }).__ek.show('shop'));
    await page.waitForTimeout(300);
    await shot('09-shop');
    await page.evaluate(() => (window as unknown as { __ek: { show: (s: string) => void } }).__ek.show('settings'));
    await page.waitForTimeout(300);
    await shot('10-settings');
    // a real Champion Road fight with powers flying (both sides bots)
    await page.evaluate(() => (window as unknown as { __ek: { show: (s: string) => void } }).__ek.show('vs:7'));
    await page.waitForTimeout(300);
    await shot('11-vs');
    await page.locator('[data-test="fight"]').click();
    await waitFight(page);
    await hooks(page, (h) => h.autopilot(5));
    await page.waitForTimeout(9000);
    await shot('12-fight');
    await page.waitForTimeout(5000);
    await shot('13-fight-later');
    await ctx.close();
  });
}
