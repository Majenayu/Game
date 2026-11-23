// Screenshots of the Hero Trial for every element: idle, a combo hit, heavy, each power, the ultimate and guard.
// Run from Stickbound/ with the dev server on 5190: node gemini/parts/trial/shots.mjs [elements] [outDir]
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
const ALL = ['fire', 'water', 'ice', 'wind', 'earth', 'leaf', 'light', 'gravity', 'time'];
const els = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',') : ALL;
const out = process.argv[3] ?? 'gemini/parts/trial/shots';
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const errors = [];
for (const el of els) {
  const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('pageerror', (e) => errors.push(`${el}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${el}: ${m.text()}`));
  await page.goto(`http://localhost:5191/gemini/parts/trial/?el=${el}`);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 20000 });
  await page.waitForTimeout(500);
  const shot = (n) => page.screenshot({ path: `${out}/${el}-${n}.png` });
  const reset = () =>
    page.evaluate(() => {
      const s = window.__lab;
      s.player.x = s.dummy.x - 260;
      s.player.facing = 1;
      s.player.feet = 760;
      s.player.clip = null;
      s.dummy.hp = 100;
      s.dummy.status = {};
      s.dummyFights = false;
    });
  await shot('idle');
  // single pose close-ups through the snap hook
  for (const [k, f] of [['idle', 20], ['walk', 20], ['run', 12], ['heavy', 14], ['hurt', 4], ['victory', 30]]) {
    const url = await page.evaluate(([kind, frame]) => window.__snap(kind, frame), [k, f]);
    const buf = Buffer.from(url.split(',')[1], 'base64');
    const { writeFileSync } = await import('node:fs');
    writeFileSync(`${out}/${el}-pose-${k}.png`, buf);
  }
  const moves = [
    ['KeyK', 'heavy', 330],
    ['KeyU', 'p1', 0],
    ['KeyI', 'p2', 0],
    ['KeyO', 'p3', 0],
  ];
  for (const [key, name, wait] of moves) {
    await reset();
    await page.waitForTimeout(150);
    await page.keyboard.press(key);
    // shoot each power at its most visible moment
    const at = { p1: { fire: 420, water: 380, ice: 330, wind: 260, earth: 650, leaf: 420, light: 230, gravity: 600, time: 260 }, p2: { fire: 330, water: 750, ice: 420, wind: 380, earth: 360, leaf: 450, light: 420, gravity: 620, time: 600 }, p3: { fire: 640, water: 900, ice: 380, wind: 420, earth: 520, leaf: 520, light: 330, gravity: 620, time: 520 } };
    await page.waitForTimeout(wait || at[name][el]);
    await shot(name);
    await page.waitForTimeout(900);
  }
  await reset();
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(1200);
  await shot('ult-scene');
  await page.waitForTimeout(800);
  await shot('ult-final');
  await page.waitForTimeout(1500);
  await reset();
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(350);
  await shot('guard');
  await page.keyboard.up('KeyS');
  await page.close();
}
await b.close();
console.log(errors.length ? errors.join('\n') : 'no page errors');
