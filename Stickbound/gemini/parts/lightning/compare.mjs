// Side-by-side: reference figures from kit.png and the lab avatar in similar poses, both trimmed to the same height.
// Run from Stickbound/ with the dev server on 5190: node gemini/parts/lightning/compare.mjs
import { chromium } from '@playwright/test';
import sharp from 'sharp';
const out = 'gemini/parts/lightning/shots/compare.png';
const H = 480;
const b = await chromium.launch();
const page = await b.newPage();
await page.goto('http://localhost:5190/gemini/parts/lightning/');
await page.waitForSelector('body[data-ready="1"]');
const snap = async (kind, frame) => Buffer.from((await page.evaluate(([k, f]) => window.__snap(k, f), [kind, frame])).split(',')[1], 'base64');
const mineRaw = [await snap('idle', 0), await snap('walk', 14), await snap('cross', 10), await snap('guard', 0)];
await b.close();
const kit = 'gemini/parts/lightning/kit.png';
/** Cuts a reference figure off the green screen and trims it. */
async function ref(left, top, w, h) {
  const { data, info } = await sharp(kit).extract({ left, top, width: w, height: h }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) if (data[i + 1] > 150 && data[i] < 140 && data[i + 2] < 140) data[i + 3] = 0;
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).trim().resize({ height: H }).png().toBuffer();
}
const mine = (buf) => sharp(buf).trim().resize({ height: H }).png().toBuffer();
const tiles = [await ref(65, 410, 220, 300), await mine(mineRaw[0]), await ref(70, 70, 175, 285), await mine(mineRaw[1]), await ref(525, 70, 175, 285), await mine(mineRaw[2])];
let x = 20;
const comp = [];
for (const t of tiles) {
  const m = await sharp(t).metadata();
  comp.push({ input: t, left: x, top: 20 });
  x += m.width + 40;
}
await sharp({ create: { width: x, height: H + 40, channels: 4, background: '#2a3050' } }).composite(comp).png().toFile(out);
console.log('wrote', out);