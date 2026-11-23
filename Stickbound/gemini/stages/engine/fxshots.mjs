// Screenshots of the lightning effects at their key frames (the game runs slowed down so each shot is on time).
// Run from Stickbound/ with the dev server on 5190: node gemini/stages/engine/fxshots.mjs [arena folder, default lightningarena]
import { chromium } from '@playwright/test';
const ARENA = process.argv[2] ?? 'lightningarena';
(await import('node:fs')).mkdirSync(`gemini/stages/${ARENA}/shots`, { recursive: true });
const out = `gemini/stages/${ARENA}/shots`;
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:5190/gemini/stages/${ARENA}/`);
await page.waitForSelector('body[data-ready="1"]');
const reset = (gap, fights = false) =>
  page.evaluate(
    ([gap, fights]) => {
      const s = window.__lab;
      s.speed = 1;
      s.dummyFights = fights;
      for (const f of [s.player, s.dummy]) {
        f.clip = null;
        f.stun = 0;
        f.hp = 100;
        f.vx = 0;
      }
      s.dummy.windup = 0;
      s.dummy.aiTimer = 9999;
      s.dummy.x = 1260;
      s.player.x = 1260 - gap;
      s.player.facing = 1;
    },
    [gap, fights],
  );
/** Starts a move with a key, runs until the player's clip reaches a frame, then shoots. */
async function moveShot(key, gap, frame, name) {
  await reset(gap);
  await page.waitForTimeout(150);
  await page.evaluate(() => (window.__lab.speed = 0.25));
  await page.keyboard.press(key);
  for (let i = 0; i < 400; i++) {
    const f = await page.evaluate(() => (window.__lab.player.clip ? window.__lab.player.frame : -1));
    if (f >= frame) break;
    await page.waitForTimeout(10);
  }
  await page.evaluate(() => (window.__lab.speed = 0.00001));
  await page.waitForTimeout(60);
  await page.screenshot({ path: `${out}/fx-${name}.png` });
  await page.evaluate(() => (window.__lab.speed = 1));
  await page.waitForTimeout(1500);
}
await moveShot('KeyJ', 130, 7, 'jab');
await moveShot('KeyK', 150, 11, 'hammer-charge');
await moveShot('KeyK', 150, 24, 'hammer-slam');
await moveShot('KeyU', 300, 12, 'sparkstep');
await moveShot('KeyI', 300, 26, 'chainbolt');
await moveShot('KeyO', 300, 34, 'skyfall-cloud');
await moveShot('KeyO', 300, 47, 'skyfall-strike');
await moveShot('KeyP', 300, 40, 'ult-aura');
await moveShot('KeyP', 300, 74, 'ult-bolts');
await moveShot('KeyP', 300, 117, 'ult-final');
await moveShot('KeyL', 300, 8, 'dash');
// shield and perfect guard
await reset(110, true);
await page.keyboard.down('KeyS');
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/fx-shield.png` });
await page.evaluate(() => {
  const s = window.__lab;
  s.player.guardSince = s.player.t;
  s.dummy.facing = -1;
  s.dummy.windup = 1;
  s.speed = 0.2;
});
for (let i = 0; i < 300; i++) {
  if (await page.evaluate(() => window.__lab.player.shieldPerfect > 24)) break;
  await page.waitForTimeout(10);
}
await page.evaluate(() => (window.__lab.speed = 0.00001));
await page.waitForTimeout(60);
await page.screenshot({ path: `${out}/fx-perfect-guard.png` });
await page.keyboard.up('KeyS');
console.log('errors', JSON.stringify(errors));
await b.close();
