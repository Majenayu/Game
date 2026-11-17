// Screenshots of a practice match with each core arena's art (for checking the visual pass).
// Needs the client dev server on http://localhost:5173. Output: e2e/ux/arenas/<map>.png
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('./ux/arenas/', import.meta.url));
mkdirSync(out, { recursive: true });
const maps = process.argv.slice(2).length ? process.argv.slice(2) : ['neon', 'crossfire', 'pillars', 'fortress', 'lava', 'maze'];
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
await ctx.addInitScript(
  (s) => localStorage.setItem('orb.save3', s),
  JSON.stringify({ profile: { cls: 'warrior', created: 1, onboarded: true } }),
);
const page = await ctx.newPage();
await page.goto('http://localhost:5173/');
await page.addStyleTag({ content: '#hint{display:none!important}' });
// Unlock every arena so each one can be started from the Arenas page.
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('orb.save3'));
  s.xp = 10_000_000;
  localStorage.setItem('orb.save3', JSON.stringify(s));
});
for (const id of maps) {
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('#menu:not([hidden])', { timeout: 20000 });
  await page.click('[data-page="arenas"]');
  // Locked arenas: enable the button just for the screenshot.
  await page.$eval(`[data-offline="${id}"]`, (b) => {
    b.disabled = false;
    b.click();
  });
  await page.click('[data-lconfirm]', { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(4200);
  await page.keyboard.press('x');
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${out}${id}.png` });
}await browser.close();
console.log('wrote', out);
