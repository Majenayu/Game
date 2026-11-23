// Film strips of the Hero Trial moves: the simulation is paused and stepped frame by frame, and the canvas is shot
// every few frames, so each move can be judged frame by frame. Run from Stickbound/ with the check server on 5191:
//   node gemini/trial/film.mjs [elements] [moves] [outDir]
// moves: comma list of combo, heavy, p1, p2, p3, ult, dash (default all). Writes <outDir>/<el>-<move>.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
const ALL = ['fire', 'water', 'ice', 'wind', 'earth', 'leaf', 'light', 'gravity', 'time'];
const els = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',') : ALL;
const moves = process.argv[3] && process.argv[3] !== 'all' ? process.argv[3].split(',') : ['combo', 'heavy', 'p1', 'p2', 'p3', 'ult', 'dash'];
const out = process.argv[4] ?? 'gemini/trial/shots/film';
mkdirSync(out, { recursive: true });
const KEYS = { heavy: ['KeyK'], p1: ['KeyU'], p2: ['KeyI'], p3: ['KeyO'], ult: ['KeyP'], dash: ['KeyL'] };
const b = await chromium.launch();
const errors = [];
for (const el of els) {
  const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('pageerror', (e) => errors.push(`${el}: ${e.message}`));
  await page.goto(`http://localhost:5191/gemini/trial/?el=${el}`);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 20000 });
  await page.evaluate(() => (window.__lab.speed = 0));
  const canvas = await page.$('#c');
  for (const mv of moves) {
    const gap = mv === 'ult' ? 300 : mv === 'dash' ? 420 : mv === 'combo' ? 120 : 240;
    await page.evaluate((gap) => {
      const s = window.__lab;
      s.dummyFights = false;
      s.freeMp = true;
      Object.assign(s.dummy, { hp: 100, status: {}, clip: null, stun: 0, x: 1100, feet: 760, vy: 0, vx: 0, grounded: true, facing: -1 });
      Object.assign(s.player, { x: 1100 - gap, feet: 760, vy: 0, vx: 0, grounded: true, facing: 1, clip: null, stun: 0, hp: 100, barrier: 0, history: [] });
      s.things = [];
      s.projs = [];
      s.sparks = [];
      s.beam = 0;
      s.camX = 1100 - gap / 2;
      window.__step(30);
    }, gap);
    // frames to film and the key presses on the way
    const plan = [];
    if (mv === 'combo') {
      for (let i = 0; i < 4; i++) plan.push({ press: 'KeyJ', at: i * 14 });
    } else plan.push({ press: KEYS[mv][0], at: 0 });
    const total = mv === 'ult' ? 160 : mv === 'combo' ? 96 : 64;
    const every = mv === 'ult' ? 10 : 4;
    const shots = [];
    for (let f = 0; f <= total; f++) {
      for (const p of plan) if (p.at === f) await page.evaluate((k) => window.__press(k), p.press);
      await page.evaluate(() => window.__step(1));
      if (f % every === 0) {
        await page.waitForTimeout(40);
        const state = await page.evaluate(() => {
          const p = window.__lab.player;
          return p.clip ? `${p.clip.name} ${p.frame}` : 'free';
        });
        const buf = await canvas.screenshot();
        shots.push({ buf, label: `f${f} ${state}` });
      }
    }
    // strip: crop the middle of the canvas, 6 per row
    const meta = await sharp(shots[0].buf).metadata();
    const cw = Math.round(meta.width * 0.62);
    const ch = Math.round(meta.height * 0.7);
    const cx = Math.round((meta.width - cw) / 2);
    const cy = Math.round(meta.height * 0.18);
    const tw = 420;
    const th = Math.round((ch / cw) * tw);
    const per = 6;
    const rows = Math.ceil(shots.length / per);
    const tiles = [];
    for (let i = 0; i < shots.length; i++) {
      const img = await sharp(shots[i].buf).extract({ left: cx, top: cy, width: cw, height: ch }).resize(tw, th).png().toBuffer();
      const x = (i % per) * tw;
      const y = Math.floor(i / per) * (th + 22);
      tiles.push({ input: img, left: x, top: y + 22 });
      const lab = shots[i].label.replace(/[<>&]/g, '');
      tiles.push({ input: Buffer.from(`<svg width="${tw}" height="22" xmlns="http://www.w3.org/2000/svg"><text x="4" y="16" font-size="15" font-family="Arial" fill="#ff0">${lab}</text></svg>`), left: x, top: y });
    }
    const strip = await sharp({ create: { width: per * tw, height: rows * (th + 22), channels: 4, background: { r: 10, g: 12, b: 20, alpha: 1 } } }).composite(tiles).png().toBuffer();
    writeFileSync(`${out}/${el}-${mv}.png`, strip);
  }
  await page.close();
}
await b.close();
console.log(errors.length ? errors.join('\n') : 'no page errors');
