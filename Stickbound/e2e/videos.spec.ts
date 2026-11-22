// Videos: 10 flagship powers (Power Lab), the lobby, and a real Power III cut-in. Raw .webm into docs/videos/raw,
// then tools/make-clips.mjs turns them into mp4. Run: npx playwright test --project=videos
import { test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, renameSync } from 'node:fs';
import { fresh, waitFight, waitScreen } from './helpers';

const RAW = 'docs/videos/raw';
mkdirSync(RAW, { recursive: true });
export const FLAGSHIPS = ['fire_s3', 'water_s3', 'ice_s3', 'lightning_w3', 'wind_s3', 'earth_s3', 'leaf_s3', 'light_w3', 'gravity_w3', 'time_w3'];

async function record(browser: Browser, name: string, w: number, h: number, body: (page: Page) => Promise<void>): Promise<void> {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, recordVideo: { dir: RAW, size: { width: w, height: h } } });
  const page = await ctx.newPage();
  await body(page);
  const v = page.video();
  await ctx.close();
  if (v) renameSync(await v.path(), `${RAW}/${name}.webm`);
}

async function seeded(page: Page, q = ''): Promise<void> {
  await fresh(page, q);
  await waitScreen(page, 'starter');
  await page.locator('.el-card[data-el="lightning"]').click();
  await waitFight(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Quit fight' }).click();
  await waitScreen(page, 'lobby');
  await page.evaluate(() => {
    const p = (window as unknown as { __ek: { app: { profile: Record<string, unknown> } } }).__ek.app.profile as { avatars: { level: number }[]; coins: number; playerXp: number };
    p.avatars[0]!.level = 30;
    p.avatars[1]!.level = 26;
    p.coins = 2350;
    p.playerXp = 9000;
  });
}

for (const id of FLAGSHIPS) {
  test(`flagship ${id}`, async ({ browser }) => {
    await record(browser, `power-${id}`, 1280, 720, async (page) => {
      await page.goto(`./?powers=1&play=${id}`);
      await page.waitForFunction(() => !!(window as unknown as { __lab?: unknown }).__lab);
      await page.waitForTimeout(5400);
    });
  });
}

test('lobby', async ({ browser }) => {
  test.setTimeout(90_000);
  await record(browser, 'lobby', 1366, 768, async (page) => {
    await seeded(page);
    await page.evaluate(() => (window as unknown as { __ek: { show: (s: string) => void } }).__ek.show('lobby'));
    await page.waitForTimeout(1800);
    for (const m of ['.m-road', '.m-ranked', '.m-zombie', '.m-training']) {
      await page.locator(m).hover();
      await page.waitForTimeout(700);
    }
    await page.mouse.move(10, 10);
    const st = page.locator('.hero-stage canvas');
    const box = (await st.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.6);
    await page.waitForTimeout(2600);
    await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.6);
    await page.waitForTimeout(2600);
  });
});

test('power III cut-in', async ({ browser }) => {
  test.setTimeout(90_000);
  await record(browser, 'cutin', 1366, 768, async (page) => {
    await seeded(page);
    await page.evaluate(() => (window as unknown as { __ek: { show: (s: string) => void } }).__ek.show('training'));
    await page.getByRole('button', { name: 'Start training' }).click();
    await waitFight(page);
    await page.waitForTimeout(2600);
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyD');
    await page.evaluate(() => {
      const m = (window as unknown as { __ek: { match: () => { fighters: { team: number; mp: number }[] } } }).__ek.match();
      for (const f of m.fighters) if (f.team === 0) f.mp = 1000;
    });
    await page.keyboard.press('KeyO');
    await page.waitForTimeout(4000);
  });
});
