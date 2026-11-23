// Trial Ground check: opens every hero in every arena (and the training stadium), throws a power so the effects
// show, and records page errors and the frame rate. Saves a screenshot of each hero in its home arena, plus any
// pairs given on the command line, in shots/ground/.
// Run from Stickbound/ with the check server: npx vite --config gemini/trial/vite.trial.config.mjs
// then: node gemini/trial/ground.mjs [all | home] [extra pairs like water:timearena,fire:stadium]
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
const HEROES = ['fire', 'water', 'ice', 'wind', 'earth', 'leaf', 'light', 'gravity', 'time'];
const ARENAS = ['stadium', 'lightningarena', 'firearena', 'waterarena', 'icearena', 'windarena', 'eartharena', 'leafarena', 'lightarena', 'shadowarena', 'gravityarena', 'timearena'];
const mode = process.argv[2] ?? 'home';
const extra = (process.argv[3] ?? '').split(',').filter(Boolean).map((p) => p.split(':'));
const out = 'gemini/trial/shots/ground';
mkdirSync(out, { recursive: true });
const pairs = [];
for (const el of HEROES) for (const a of ARENAS) if (mode === 'all' || a === `${el}arena`) pairs.push([el, a, a === `${el}arena`]);
for (const [el, a] of extra) pairs.push([el, a, true]);
const b = await chromium.launch();
const errors = [];
for (const [el, arena, shoot] of pairs) {
  const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('pageerror', (e) => errors.push(`${el} in ${arena}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${el} in ${arena}: ${m.text()}`));
  await page.goto(`http://localhost:5191/gemini/trial/?el=${el}&arena=${arena}`);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 30000 });
  const got = await page.evaluate(() => [window.__el, window.__arena, document.title]);
  if (got[0] !== el || got[1] !== arena) errors.push(`${el} in ${arena}: page shows ${got.join(' / ')}`);
  await page.evaluate(() => {
    const s = window.__lab;
    s.dummyFights = false;
    s.player.x = s.dummy.x - 300;
    s.player.facing = 1;
  });
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyU');
  // frames simulated in 1.5 s of real time = the frame rate the loop keeps up with
  const f0 = await page.evaluate(() => window.__lab.frameNo);
  await page.waitForTimeout(1500);
  const fps = ((await page.evaluate(() => window.__lab.frameNo)) - f0) / 1.5;
  if (shoot) await page.screenshot({ path: `${out}/${el}-${arena}.png` });
  console.log(`${el.padEnd(8)} ${arena.padEnd(15)} ${fps.toFixed(0)} fps`);
  await page.close();
}
// Lightning: his own lab, reached from the hero list; check the list leads back to the Trial Ground
const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
page.on('pageerror', (e) => errors.push(`lightning: ${e.message}`));
await page.goto('http://localhost:5191/gemini/trial/?el=lightning&arena=timearena');
await page.waitForSelector('body[data-ready="1"]', { timeout: 30000 });
const where = new URL(page.url()).pathname;
if (!where.endsWith('/gemini/stages/timearena/')) errors.push(`lightning went to ${where}`);
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/lightning-timearena.png` });
await page.selectOption('#hero', 'ice');
await page.waitForSelector('body[data-ready="1"]', { timeout: 30000 });
const back = await page.evaluate(() => [window.__el, window.__arena]);
if (back[0] !== 'ice' || back[1] !== 'timearena') errors.push(`lightning lab hero list went to ${back.join(' / ')}`);
console.log(`lightning -> ${where}, hero list -> ${back.join(' in ')}`);
await b.close();
console.log(errors.length ? errors.join('\n') : 'no page errors');
