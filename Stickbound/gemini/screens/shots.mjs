// Screenshots of every screen next to its mock-up, plus a quick play check of the Fight and Zombie Survival.
// Run from Stickbound/ with the check server on 5191 (npx vite --config gemini/trial/vite.trial.config.mjs):
//   node gemini/screens/shots.mjs [pages,comma,separated] [outDir]
// Writes <outDir>/<page>.png and <outDir>/<page>-vs.png (left: the build, right: gemini/extra mock-up).
import { mkdirSync, existsSync } from 'node:fs';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
const MOCK = {
  title: 'logo-wordmark', lobby: 'lobby', road: 'champion-road-map', roster: 'hero-roster', 
  ranked: 'rank-ladder', versus: 'versus-screen', fight: 'fight-hud', pause: 'pause-menu', victory: 'victory-screen', levelup: 'level-up-popup',
  register: 'logo-wordmark', starter: 'hero-roster', partner: 'hero-roster', zombie: 'zombie-survival-hud', bestiary: 'zombie-enemies-sheet', icons: 'element-icons', keyart: 'key-art-landscape', poster: 'key-art-portrait', gallery: null, settings: null,
};
const list = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',') : Object.keys(MOCK);
const out = process.argv[3] ?? 'gemini/screens/shots';
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const errors = [];
const page = await b.newPage({ viewport: { width: 1376, height: 768 } });
page.on('pageerror', (e) => errors.push(`${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const B = process.env.BOXES ? '&boxes=1' : '';
// a registered player (HERO and MATE pick the squad) for every page but the first-run ones
const SEED = { registered: true, tutorial: true, name: 'Majen', hero: process.env.HERO ?? 'water', partner: process.env.MATE ?? 'earth', level: 3, xp: 400, coins: 1450 };
await page.addInitScript((seed) => {
  if (!/page=(title|register|starter)/.test(location.search) || seed.force) localStorage.setItem('ek.screens.player', JSON.stringify(seed));
}, SEED);
const ready = () => page.waitForSelector('body[data-ready="1"]', { timeout: 30000 });
for (const name of list) {
  const url = name === 'zombie' ? `http://localhost:5191/gemini/screens/?page=zombie&wave=10${B}` : `http://localhost:5191/gemini/screens/?page=${name}${B}`;
  if (name === 'pause') {
    await page.goto(`http://localhost:5191/gemini/screens/?page=fight${B}`);
    await ready();
    await page.evaluate(() => window.__step(200));
    await page.keyboard.press('Escape');
    await ready();
  } else if (name === 'victory') {
    await page.goto(`http://localhost:5191/gemini/screens/?page=fight${B}`);
    await ready();
    await page.evaluate(() => {
      window.__nav.result = { winner: 1, mode: 'quick', xp: 1500, coins: 500, levelUp: true };
      window.__go('victory');
    });
    await ready();
  } else {
    await page.goto(url);
    await ready();
  }
  // let the screen play a little (fights: walk in and trade blows)
  const frames = name === 'fight' ? 160 : name === 'zombie' ? 260 : name === 'versus' ? 60 : 90;
  if (name === 'fight' || name === 'zombie') {
    await page.keyboard.down('KeyD');
    await page.evaluate((n) => window.__step(n), 120);
    await page.keyboard.up('KeyD');
    for (let i = 0; i < 6; i++) {
      await page.keyboard.down('KeyJ');
      await page.evaluate(() => window.__step(2));
      await page.keyboard.up('KeyJ');
      await page.evaluate(() => window.__step(14));
    }
    await page.keyboard.down('KeyU');
    await page.evaluate(() => window.__step(2));
    await page.keyboard.up('KeyU');
    await page.evaluate(() => window.__step(18));
  } else await page.evaluate((n) => window.__step(n), frames);
  const file = `${out}/${name}.png`;
  await page.screenshot({ path: file });
  const mock = MOCK[name];
  if (mock && existsSync(`gemini/extra/${mock}.png`)) {
    const left = await sharp(file).resize(688, 384).toBuffer();
    const right = await sharp(`gemini/extra/${mock}.png`).resize(688, 384, { fit: 'contain', background: '#000' }).toBuffer();
    await sharp({ create: { width: 1376, height: 384, channels: 3, background: '#000' } })
      .composite([{ input: left, left: 0, top: 0 }, { input: right, left: 688, top: 0 }])
      .png()
      .toFile(`${out}/${name}-vs.png`);
  }
  console.log('shot', name);
}
await b.close();
console.log(errors.length ? `ERRORS:\n${[...new Set(errors)].join('\n')}` : 'no page errors');
