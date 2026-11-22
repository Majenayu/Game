// Store media: 3 covers, 5 screenshots and 2 raw gameplay clips (landscape 16:9 and portrait 2:3).
// Run: npx playwright test --project=media, then node tools/make-videos.mjs. Output: store/
import { test, type Page } from '@playwright/test';
import { mkdirSync, renameSync } from 'node:fs';
import { fresh, hooks, waitScreen } from './helpers';

const OUT = 'store';
mkdirSync(`${OUT}/raw`, { recursive: true });

type Ek = { cover: (k: string) => void; show: (s: string) => void; botFight: (i: number) => void; app: { profile: Record<string, unknown> } };

async function seeded(page: Page): Promise<void> {
  await fresh(page);
  await waitScreen(page, 'starter');
  await page.locator('.el-card[data-el="fire"]').click();
  await page.waitForTimeout(800);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Quit fight' }).click();
  await waitScreen(page, 'lobby');
  await page.evaluate(() => {
    const p = (window as unknown as { __ek: Ek }).__ek.app.profile as { avatars: { level: number; perks: (string | null)[] }[]; unlocked: string[]; champion: { cleared: number[]; seen: string[] }; coins: number; playerXp: number };
    p.avatars[0]!.level = 31;
    p.avatars[1]!.level = 27;
    p.avatars[0]!.perks = ['power', 'flow', null];
    p.unlocked.push('water', 'wind', 'light', 'leaf');
    p.champion.cleared = Array.from({ length: 12 }, (_, i) => i);
    p.champion.seen.push('premise');
    p.coins = 2350;
    p.playerXp = 9000;
  });
}

for (const [kind, width, height] of [
  ['landscape', 1920, 1080],
  ['portrait', 800, 1200],
  ['square', 800, 800],
] as const) {
  test(`cover ${kind}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height } });
    const page = await ctx.newPage();
    await fresh(page);
    await waitScreen(page, 'starter');
    await page.evaluate((k) => (window as unknown as { __ek: Ek }).__ek.cover(k), kind);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/cover-${kind}-${width}x${height}.png` });
    await ctx.close();
  });
}

test('store screenshots 1920x1080', async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await seeded(page);
  const ek = (fn: string, arg?: unknown) => page.evaluate(([f, a]) => ((window as unknown as { __ek: Record<string, (x: unknown) => void> }).__ek[f as string]!)(a), [fn, arg] as const);
  await ek('botFight', 6);
  await page.waitForTimeout(9500);
  await page.screenshot({ path: `${OUT}/screenshot-1-fight.png` });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${OUT}/screenshot-2-fight.png` });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Quit fight' }).click();
  await waitScreen(page, 'lobby');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/screenshot-3-lobby.png` });
  await ek('show', 'avatars');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/screenshot-4-avatars.png` });
  await ek('show', 'road');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/screenshot-5-champion-road.png` });
  await ctx.close();
});

for (const [name, width, height] of [
  ['landscape', 1920, 1080],
  ['portrait', 1080, 1620],
] as const) {
  test(`gameplay clip ${name}`, async ({ browser }) => {
    test.setTimeout(120_000);
    const ctx = await browser.newContext({ viewport: { width, height }, recordVideo: { dir: `${OUT}/raw`, size: { width, height } } });
    const page = await ctx.newPage();
    await seeded(page);
    await page.evaluate(() => (window as unknown as { __ek: Ek }).__ek.botFight(11));
    await page.waitForTimeout(26_000);
    void hooks;
    const video = page.video();
    await ctx.close();
    if (video) renameSync(await video.path(), `${OUT}/raw/clip-${name}.webm`);
  });
}
