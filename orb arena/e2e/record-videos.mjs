// Records the two CrazyGames preview videos (MP4, no sound, < 20 s) from a scripted offline match.
// Needs the client dev server on http://localhost:5173 (run `npm run dev -w client` first).
// Output: e2e/videos/preview-landscape-1920x1080.mp4 and preview-portrait-1080x1620.mp4
import { chromium } from '@playwright/test';
import ffmpegPath from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';

const OUT = new URL('./videos/', import.meta.url);
const dir = (p) => decodeURIComponent(new URL(p, OUT).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const cover = (p) =>
  decodeURIComponent(new URL(`./covers/${p}`, import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
rmSync(dir('./'), { recursive: true, force: true });
mkdirSync(dir('./'), { recursive: true });

const CLIPS = [
  { name: 'landscape', w: 1920, h: 1080, cover: 'landscape-1920x1080.png', zoom: false },
  { name: 'portrait', w: 1080, h: 1620, cover: 'portrait-800x1200.png', zoom: true },
];
const GAME_SECONDS = 18.5;
const COVER_SECONDS = 0.8;

// Autopilot: aim at the nearest enemy, strafe around it, stay near the middle of the arena.
const AUTOPILOT = () => {
  const scene = window.__orbGame.scene.getScene('game');
  let flip = 1;
  let lastFlip = 0;
  let lastSkill = 0;
  scene.readInput = (px, py) => {
    const now = performance.now();
    if (now - lastFlip > 1100) {
      flip = -flip;
      lastFlip = now;
    }
    if (now - lastSkill > 2200) {
      lastSkill = now;
      scene.queueSkill(Math.random() < 0.5 ? 0 : 1);
    }
    const snap = scene.source.view(now);
    const me = snap && snap.players.find((p) => p.id === scene.source.localId);
    if (!me || !me.alive) return { moveX: 0, moveY: 0, aim: 0, shooting: false };
    let best = null;
    let bd = 1e9;
    for (const p of snap.players) {
      if (p.id === me.id || !p.alive) continue;
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    if (!best) return { moveX: 0, moveY: 0, aim: 0, shooting: false };
    const dx = best.x - px;
    const dy = best.y - py;
    const aim = Math.atan2(dy, dx);
    let mx = (-dy / bd) * flip;
    let my = (dx / bd) * flip;
    if (bd < 220) {
      mx -= dx / bd;
      my -= dy / bd;
    } else if (bd > 420) {
      mx += dx / bd;
      my += dy / bd;
    }
    const cx = 800 - px;
    const cy = 450 - py;
    mx += cx / 500;
    my += cy / 500;
    return { moveX: mx, moveY: my, aim, shooting: bd < 750 };
  };
};

const browser = await chromium.launch({
  // headless with the real GPU: full frame rate and no window size limit
  headless: true,
  args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
for (const c of CLIPS) {
  const ctx = await browser.newContext({
    viewport: { width: c.w, height: c.h },
    recordVideo: { dir: dir('./'), size: { width: c.w, height: c.h } },
  });
  // A returning player (profile done) so the game opens on the menu, not the first-run tutorial.
  await ctx.addInitScript((s) => localStorage.setItem('orb.save3', s), JSON.stringify({ profile: { cls: 'warrior', created: 1, onboarded: true } }));
  const page = await ctx.newPage();
  const t0 = Date.now();
  await page.goto('http://localhost:5173/');
  await page.addStyleTag({
    content: `#hint,#leave,#invite,#toast,#mute,#skillbanner{display:none!important} *{cursor:none!important}
      ${c.zoom ? '#game canvas{position:absolute!important;height:100%!important;width:178%!important;left:50%!important;top:0!important;margin:0!important;transform:translateX(-50%)!important}' : ''}`,
  });
  await page.click('#practice');
  // The pre-match lobby ('Get ready') waits for Confirm; press it, then let the 3, 2, 1 countdown run.
  await page.waitForSelector('[data-lconfirm]', { timeout: 10000 }).catch(() => {});
  await page.click('[data-lconfirm]', { timeout: 3000 }).catch(() => {});
  await page.evaluate(AUTOPILOT);
  await page.waitForTimeout(4500);
  const startMs = Date.now() - t0;
  await page.waitForTimeout(GAME_SECONDS * 1000 + 800);
  const webm = await page.video().path();
  await ctx.close();

  const out = dir(`./preview-${c.name}-${c.w}x${c.h}.mp4`);
  const vf = (i) => `[${i}:v]scale=${c.w}:${c.h}:flags=lanczos,setsar=1,fps=30,format=yuv420p[v${i}]`;
  execFileSync(
    ffmpegPath,
    [
      '-y',
      '-loglevel',
      'error',
      '-loop',
      '1',
      '-t',
      String(COVER_SECONDS),
      '-i',
      cover(c.cover),
      '-ss',
      String(startMs / 1000),
      '-t',
      String(GAME_SECONDS),
      '-i',
      webm,
      '-filter_complex',
      `${vf(0)};${vf(1)};[v0][v1]concat=n=2:v=1:a=0[v]`,
      '-map',
      '[v]',
      '-c:v',
      'libx264',
      '-crf',
      '20',
      '-preset',
      'medium',
      '-an',
      '-movflags',
      '+faststart',
      out,
    ],
    { stdio: 'inherit' },
  );
  console.log('wrote', out);
}
await browser.close();
// remove the intermediate webm files
for (const f of (await import('node:fs')).readdirSync(dir('./')))
  if (f.endsWith('.webm')) rmSync(dir(`./${f}`));
