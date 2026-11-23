// Behaviour check for the Hero Trial: for every element, the 4-hit combo, the heavy, each power, the ultimate,
// block chip damage and the perfect guard. The page's real-time loop is paused and the simulation is stepped frame
// by frame through test hooks, so results never depend on how fast the machine renders.
// Run from Stickbound/ with the check server: npx vite --config gemini/parts/trial/vite.trial.config.mjs
// then: node gemini/parts/trial/check.mjs [elements]
import { chromium } from '@playwright/test';
const ALL = ['fire', 'water', 'ice', 'wind', 'earth', 'leaf', 'light', 'gravity', 'time'];
const els = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',') : ALL;
const URL = process.env.TRIAL_URL ?? 'http://localhost:5191/gemini/parts/trial/';
const b = await chromium.launch();
const errors = [];
const fails = [];
const rows = [];
for (const el of els) {
  const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('pageerror', (e) => errors.push(`${el}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${el}: ${m.text()}`));
  await page.goto(`${URL}?el=${el}`);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 20000 });
  await page.evaluate(() => (window.__lab.speed = 0));
  const reset = (gap) =>
    page.evaluate((gap) => {
      const s = window.__lab;
      s.dummyFights = false;
      s.freeMp = true;
      Object.assign(s.dummy, { hp: 100, status: {}, clip: null, stun: 0, x: 1100, feet: 760, vy: 0, vx: 0, grounded: true, facing: -1, guarding: false });
      Object.assign(s.player, { x: 1100 - gap, feet: 760, vy: 0, vx: 0, grounded: true, facing: 1, clip: null, stun: 0, hp: 100, barrier: 0, history: [], guarding: false });
      s.player.lastHurt = s.player.t + 100000; // no leaf regen during a measurement
      s.things = [];
      s.projs = [];
      s.beam = 0;
      s.hitStop = 0;
      window.__step(2);
    }, gap);
  /** press keys (one every few frames), then run n frames; returns the result and the statuses seen on the way */
  const run = (keys, frames) =>
    page.evaluate(
      ([keys, frames]) => {
        const s = window.__lab;
        const seen = new Set();
        let minHp = 100;
        for (const k of keys) {
          window.__press(k);
          window.__step(14);
        }
        for (let i = 0; i < frames; i++) {
          window.__step(1);
          for (const st of Object.keys(s.dummy.status)) seen.add(st);
          minHp = Math.min(minHp, s.dummy.hp);
        }
        return { dmg: 100 - minHp, status: [...seen], x: s.player.x, barrier: s.player.barrier, php: s.player.hp, things: s.things.map((t) => t.kind) };
      },
      [keys, frames],
    );
  const check = async (label, keys, gap, frames, ok, before) => {
    await reset(gap);
    if (before) await page.evaluate(before);
    const r = await run(keys, frames);
    const pass = ok(r);
    rows.push(`${el.padEnd(8)} ${label.padEnd(18)} dmg ${String(r.dmg).padStart(3)}  ${r.status.join(',').padEnd(14)} ${pass ? 'ok' : 'FAIL'}`);
    if (!pass) fails.push(`${el} ${label}: ${JSON.stringify(r)}`);
  };
  const hurt = (r) => r.dmg > 0;
  const has = (st) => (r) => r.dmg > 0 && r.status.includes(st);
  await check('combo J x4', ['KeyJ', 'KeyJ', 'KeyJ', 'KeyJ'], 120, 120, (r) => r.dmg >= 30);
  await check('heavy K', ['KeyK'], 150, 90, hurt);
  const spec = {
    fire: [['Hot Shot', has('burn')], ['Scorch Dash', has('burn')], ['Furnace Rise', has('burn')]],
    water: [['Jet Lance', (r) => r.dmg >= 10], ['Undertow', (r) => r.dmg >= 10], ['Bubble Lock', has('bubble')]],
    ice: [['Rime Dart', has('slow')], ['Glacier Gate', (r) => r.things.includes('wall')], ['Permafrost', has('freeze')]],
    wind: [['Breeze Shove', hurt], ['Whirl Kick', (r) => r.dmg >= 15], ['Razor Draft', (r) => r.dmg >= 14]],
    earth: [['Boulder Lob', hurt], ['Granite Fist', (r) => r.dmg >= 16], ['Groundbreak', hurt]],
    leaf: [['Vine Snare', hurt], ['Burr Mine', has('root')], ['Thicket Rise', (r) => has('root')(r) && r.php > 80]],
    light: [['Bright Dart', has('dazzle')], ['Sunlance', (r) => r.dmg >= 15], ['Shine Shield', (r) => r.barrier > 0]],
    gravity: [['Grav Well', hurt], ['Anchor Drop', (r) => r.dmg >= 15], ['Weightless', (r) => r.status.includes('float')]],
    time: [['Rewind Step', (r) => r.x < 1100 - 260 + 20], ['Tick Field', (r) => r.status.includes('slow')], ['Freeze Frame', (r) => r.status.includes('stop')]],
  }[el];
  const gap = { leaf: [260, 120, 220], earth: [300, 150, 260], wind: [200, 150, 260] }[el] ?? [260, 260, 220];
  const keyList = ['KeyU', 'KeyI', 'KeyO'];
  for (let i = 0; i < 3; i++) {
    let before;
    if (el === 'time' && i === 0)
      // walk right for 40 frames, then rewind to the start
      before = () => {
        window.__hold('KeyD', true);
        window.__step(40);
        window.__hold('KeyD', false);
      };
    if (el === 'leaf' && i === 2) before = () => (window.__lab.player.hp = 80);
    await check(`power ${keyList[i].slice(3)} ${spec[i][0]}`, [keyList[i]], gap[i], 150, spec[i][1], before);
  }
  await check('ultimate P', ['KeyP'], 300, 170, (r) => r.dmg >= 25);
  // block: guard raised early takes chip damage; raised 3 frames before the hit it is a perfect guard
  const guard = (early) =>
    page.evaluate((early) => {
      const s = window.__lab;
      if (early) {
        window.__hold('KeyS', true);
        window.__step(20);
      }
      s.dummy.play('jab');
      window.__step(3);
      if (!early) window.__hold('KeyS', true);
      window.__step(30);
      window.__hold('KeyS', false);
      window.__step(2);
      return { dmg: 100 - s.player.hp, perfect: s.player.shieldPerfect > 0 || s.dummy.stun > 0 };
    }, early);
  await reset(100);
  const chip = await guard(true);
  await reset(100);
  const perf = await guard(false);
  const gpass = chip.dmg > 0 && chip.dmg < 6 && perf.dmg === 0 && perf.perfect;
  rows.push(`${el.padEnd(8)} ${'guard'.padEnd(18)} early block ${chip.dmg} dmg, perfect guard ${perf.dmg} dmg  ${gpass ? 'ok' : 'FAIL'}`);
  if (!gpass) fails.push(`${el} guard: ${JSON.stringify({ chip, perf })}`);
  await page.close();
}
await b.close();
console.log(rows.join('\n'));
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
console.log(fails.length ? `FAILS:\n${fails.join('\n')}` : 'all checks passed');
process.exit(fails.length || errors.length ? 1 : 0);
