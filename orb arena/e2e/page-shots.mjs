// Screenshots of the home screen and the main menu pages, for design review.
// Needs the dev servers (npm run dev). Output: e2e/ux/pages-<tag>/<size>-<page>.png
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const tag = process.argv[2] ?? 'now';
const out = fileURLToPath(new URL(`./ux/pages-${tag}/`, import.meta.url));
mkdirSync(out, { recursive: true });
const PAGES = ['loadout', 'shop', 'daily', 'quests', 'spin', 'campaign', 'ranked'];
const SIZES_ALL = [
  { name: '1366', width: 1366, height: 768, touch: false },
  { name: 'phone', width: 844, height: 390, touch: true },
];
const SIZES = process.env.SIZE ? SIZES_ALL.filter((s) => s.name === process.env.SIZE) : SIZES_ALL;
const browser = await chromium.launch({ headless: true });
for (const s of SIZES) {
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    hasTouch: s.touch,
    isMobile: s.touch,
    deviceScaleFactor: s.touch ? 2 : 1,
  });
  await ctx.addInitScript(
    (save) => {
      if (!localStorage.getItem('orb.save3')) localStorage.setItem('orb.save3', save);
    },
    JSON.stringify({ profile: { cls: 'warrior', created: 1, onboarded: true }, coins: 2450, xp: 5200, nick: 'NovaStar' }),
  );
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('#menu:not([hidden])', { timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}${s.name}-0-home.png` });
  for (const p of PAGES) {
    const tile = page.locator(`[data-page="${p}"]`).first();
    if (!(await tile.isVisible())) await page.locator('#moretile').click().catch(() => {});
    await tile.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}${s.name}-${p}.png` });
    await page.locator('#pageclose').click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  // Round-end board: a short practice match that ends by itself.
  await ctx.close();
}
await browser.close();
console.log('wrote', out);

