// Captures 3 gameplay screenshots for Poki (PNG, 1920x1080, well under the 5 MiB limit) and a square
// 1080x1080 animated thumbnail cut from the landscape preview video.
// Needs the client dev server on http://localhost:5173 (npm run dev -w client).
// Output: e2e/poki/screenshot-1.png ... screenshot-3.png, e2e/poki/thumbnail-1080x1080.mp4
import { chromium } from '@playwright/test';
import ffmpegPath from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('./poki/', import.meta.url));
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
// A returning player, so the game opens on the menu instead of the first-run tutorial.
await ctx.addInitScript(
  (s) => localStorage.setItem('orb.save3', s),
  JSON.stringify({ profile: { cls: 'warrior', created: 1, onboarded: true } }),
);
const page = await ctx.newPage();
await page.goto('http://localhost:5173/');
await page.addStyleTag({ content: '#hint,#toast{display:none!important} *{cursor:none!important}' });
await page.click('#practice');
await page.waitForSelector('[data-lconfirm]', { timeout: 10000 }).catch(() => {});
await page.click('[data-lconfirm]', { timeout: 3000 }).catch(() => {});
await page.waitForTimeout(4500);
// Auto mode: the hero moves, aims and uses skills on its own, so the shots show real combat.
await page.keyboard.press('x');
for (const [i, wait] of [6000, 7000, 8000].entries()) {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}screenshot-${i + 1}.png` });
  console.log(`wrote ${out}screenshot-${i + 1}.png`);
}
await browser.close();

// Square animated thumbnail: the centre of the landscape preview, 1080x1080, no sound.
const video = fileURLToPath(new URL('./videos/preview-landscape-1920x1080.mp4', import.meta.url));
if (existsSync(video)) {
  execFileSync(ffmpegPath, [
    '-y',
    '-loglevel',
    'error',
    '-ss',
    '1',
    '-i',
    video,
    '-vf',
    'crop=1080:1080:420:0,fps=30,format=yuv420p',
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '22',
    '-movflags',
    '+faststart',
    `${out}thumbnail-1080x1080.mp4`,
  ]);
  console.log(`wrote ${out}thumbnail-1080x1080.mp4`);
} else console.warn('No landscape preview video yet: run npm run videos first.');
