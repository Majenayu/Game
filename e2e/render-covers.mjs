// Renders the three cover images (CrazyGames: title only, no borders or icons) from the real game:
// a live arena as the backdrop, the hero characters in front, and the title.
// Needs the client dev server on http://localhost:5173 (npm run dev -w client).
// Output: e2e/covers/landscape-1920x1080.png, portrait-800x1200.png, square-800x800.png
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SIZES = [
  ['landscape', 1920, 1080],
  ['portrait', 800, 1200],
  ['square', 800, 800],
  // itch.io's recommended cover size.
  ['itch', 630, 500],
];
const out = fileURLToPath(new URL('./covers/', import.meta.url));
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await ctx.addInitScript(
  (s) => localStorage.setItem('orb.save3', s),
  JSON.stringify({ profile: { cls: 'warrior', created: 1, onboarded: true } }),
);
const page = await ctx.newPage();
await page.goto('http://localhost:5173/');
await page.click('#practice');
await page.click('[data-lconfirm]', { timeout: 6000 }).catch(() => {});
await page.waitForTimeout(4500);
await page.keyboard.press('x');
await page.waitForTimeout(7000);
// The arena backdrop: only the game canvas, no HUD.
await page.addStyleTag({ content: 'body > *:not(#game):not(#cover){visibility:hidden!important}' });
await page.waitForTimeout(300);
const bg = (await page.locator('#game canvas').screenshot()).toString('base64');

for (const [name, w, h] of SIZES) {
  await page.setViewportSize({ width: w, height: h });
  await page.evaluate(
    async ({ bg, w, h }) => {
      const { heroSvg } = await import('/src/art/hero.ts');
      const url = (char) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(heroSvg({ char, gear: [] }));
      document.getElementById('cover')?.remove();
      const u = Math.min(w, h);
      const wide = w > h;
      const el = document.createElement('div');
      el.id = 'cover';
      el.style.cssText = `position:fixed;inset:0;z-index:99999;overflow:hidden;visibility:visible;background:#07061a`;
      // One hero in front in a dynamic pose, two allies behind it.
      const hero = (char, x, y, size, rot, z, flip, dim) =>
        `<img src="${url(char)}" style="position:absolute;left:${x}px;top:${y}px;width:${size}px;transform:translate(-50%,-50%) rotate(${rot}deg)${flip ? ' scaleX(-1)' : ''};z-index:${z};filter:drop-shadow(0 0 ${u * 0.03}px rgba(77,210,255,.75)) drop-shadow(0 ${u * 0.02}px ${u * 0.02}px rgba(0,0,0,.6)) brightness(${dim})"/>`;
      const main = u * (wide ? 0.6 : 0.62);
      const side = main * 0.72;
      const cy = h * (wide ? 0.4 : 0.38);
      el.innerHTML = `
        <div style="position:absolute;inset:-20px;background:url(data:image/png;base64,${bg}) center/cover;filter:blur(3px) brightness(.55) saturate(1.25)"></div>
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% ${wide ? 45 : 40}%, rgba(77,210,255,.35), rgba(7,6,26,0) 55%), linear-gradient(180deg, rgba(7,6,26,0) 55%, rgba(7,6,26,.85))"></div>
        ${hero('titan', w / 2 - main * (wide ? 0.62 : 0.5), cy + main * 0.08, side, -8, 1, false, 0.8)}
        ${hero('viper', w / 2 + main * (wide ? 0.62 : 0.5), cy + main * 0.08, side, 8, 1, true, 0.8)}
        ${hero('nova', w / 2, cy, main, -6, 2, false, 1)}
        <div style="position:absolute;left:0;right:0;bottom:${h * (wide ? 0.06 : 0.07)}px;z-index:3;text-align:center;font-family:Cinzel,Georgia,serif;font-weight:900;line-height:.95;color:#ffe9a8;letter-spacing:${u * 0.006}px;font-size:${wide ? w * 0.11 : w * 0.18}px;text-shadow:0 0 ${u * 0.03}px #ffc93c, 0 ${u * 0.012}px 0 #7a4a00, 0 0 ${u * 0.08}px rgba(255,201,60,.55)">${wide ? 'ORB ARENA' : 'ORB<br/>ARENA'}</div>`;
      document.body.appendChild(el);
      await Promise.all([...el.querySelectorAll('img')].map((i) => i.decode().catch(() => {})));
      await document.fonts.ready;
    },
    { bg, w, h },
  );
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}${name}-${w}x${h}.png` });
  console.log(`wrote ${out}${name}-${w}x${h}.png`);
}
await browser.close();
