// Behaviour check for the lab: the 4-hit combo chains, every power plays and hits, a power cancels a normal on hit,
// and guarding blocks the dummy (a guard raised just before the hit is a perfect guard).
// Run from Stickbound/ with the dev server on 5190: node gemini/stages/engine/check.mjs [arena folder, default lightningarena]
import { chromium } from '@playwright/test';
const ARENA = process.argv[2] ?? 'lightningarena';
(await import('node:fs')).mkdirSync(`gemini/stages/${ARENA}/shots`, { recursive: true });
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
      s.dummyFights = fights;
      s.player.clip = null;
      s.player.stun = 0;
      s.player.hp = 100;
      s.dummy.hp = 100;
      s.dummy.clip = null;
      s.dummy.stun = 0;
      s.dummy.windup = 0;
      s.dummy.aiTimer = 9999;
      s.dummy.x = 1260;
      s.dummy.vx = 0;
      s.player.x = 1260 - gap;
      s.player.facing = 1;
    },
    [gap, fights],
  );
const watch = async (ms) => {
  const seen = new Set();
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    seen.add(await page.evaluate(() => window.__lab.player.clip?.name ?? '-'));
    await page.waitForTimeout(16);
  }
  return [...seen].filter((x) => x !== '-');
};
const hp = () => page.evaluate(() => window.__lab.dummy.hp);
const results = {};
await reset(130);
for (const wait of [110, 150, 190]) {
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(wait);
}
await page.keyboard.press('KeyJ');
results.combo4 = { clips: await watch(1600), dmg: 100 - (await hp()) };
for (const [key, gap, ms] of [['KeyK', 150, 1500], ['KeyU', 300, 1500], ['KeyI', 300, 1500], ['KeyO', 300, 1700], ['KeyP', 300, 3200], ['KeyL', 300, 800]]) {
  await reset(gap);
  await page.waitForTimeout(100);
  await page.keyboard.press(key);
  results[key] = { clips: await watch(ms), dmg: 100 - (await hp()) };
}
// cancel: jab hits, then I cancels into Chain Bolt
await reset(130);
await page.keyboard.press('KeyJ');
await page.waitForTimeout(180);
await page.keyboard.press('KeyI');
results.cancel = { clips: await watch(1300), dmg: 100 - (await hp()) };
// guard: the dummy attacks; hold S early (normal block) and just before the hit (perfect guard)
const guardTest = async (early) => {
  await reset(110, true);
  if (early) {
    await page.keyboard.down('KeyS');
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => {
    const s = window.__lab;
    s.dummy.facing = -1;
    s.dummy.windup = 1;
  });
  if (!early) {
    // the dummy attack (jab or kick) hits about 6 to 10 frames after it starts
    await page.waitForTimeout(40);
    await page.keyboard.down('KeyS');
  }
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => ({ hp: window.__lab.player.hp, banner: window.__lab.banner?.text ?? '', dummyStun: window.__lab.dummy.clip?.name ?? '-' }));
  await page.keyboard.up('KeyS');
  return r;
};
results.blockEarly = await guardTest(true);
results.blockLate = await guardTest(false);
await reset(110, true);
await page.evaluate(() => { window.__lab.dummy.windup = 1; });
await page.waitForTimeout(900);
results.noGuard = { hp: await page.evaluate(() => window.__lab.player.hp) };
console.log(JSON.stringify(results));
console.log('errors', JSON.stringify(errors));
await b.close();
