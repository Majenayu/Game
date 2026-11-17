// Screenshots of the first minute (tutorial, menu, practice lobby, practice match) at three sizes.
// Needs the client dev server on http://localhost:5173. Output: e2e/ux/<size>-<step>.png
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL(`./ux/${process.argv[2] ?? 'now'}/`, import.meta.url));
mkdirSync(out, { recursive: true });
const SIZES = [
  { name: '1920', width: 1920, height: 1080, touch: false },
  { name: '1366', width: 1366, height: 768, touch: false },
  { name: 'phone', width: 844, height: 390, touch: true },
];
const browser = await chromium.launch({ headless: true });
for (const s of SIZES) {
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    hasTouch: s.touch,
    isMobile: s.touch,
    deviceScaleFactor: s.touch ? 2 : 1,
  });
  const page = await ctx.newPage();
  const shot = (step) => page.screenshot({ path: `${out}${s.name}-${step}.png` });
  // 1. Brand-new player: lands in the tutorial.
  await page.goto('http://localhost:5173/');
  await page.waitForTimeout(5000);
  await shot('1-first-visit');
  await page.waitForTimeout(6000);
  await shot('2-first-visit-later');
  // 2. Leave the tutorial: the "create your fighter" screen and then the menu.
  await page.locator('#leave').click().catch(() => {});
  await page.waitForTimeout(1500);
  await shot('3-after-tutorial');
  for (let i = 0; i < 8 && (await page.locator('#onboard:not([hidden]) button').count()); i++) {
    await page.locator('#onboard:not([hidden]) button').last().click().catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.waitForSelector('#menu:not([hidden])', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  await shot('4-menu');
  // 3. Practice match: lobby, then the match.
  await page.locator('#practice').click().catch(() => {});
  await page.waitForTimeout(2500);
  await shot('5-practice-start');
  await page.locator('[data-lconfirm]').click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(6000);
  await shot('6-practice-match');
  await ctx.close();
}
await browser.close();
console.log('wrote', out);
