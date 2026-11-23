import { chromium } from '@playwright/test';
import sharp from 'sharp';
const ARENA = process.argv[2] ?? 'lightningarena';
(await import('node:fs')).mkdirSync(`gemini/stages/${ARENA}/shots`, { recursive: true });
const H = 400;
const b = await chromium.launch();
const page = await b.newPage();
await page.goto(`http://localhost:5190/gemini/stages/${ARENA}/`);
await page.waitForSelector('body[data-ready="1"]');
const tiles = [];
for (const build of ['slim', 'medium', 'bold']) {
  await page.selectOption('#build', build);
  for (const [k, f] of [['idle', 0], ['walk', 14], ['cross', 10]]) {
    const url = await page.evaluate(([k, f]) => window.__snap(k, f), [k, f]);
    tiles.push(await sharp(Buffer.from(url.split(',')[1], 'base64')).trim().resize({ height: H }).png().toBuffer());
  }
}
await page.selectOption('#build', 'slim');
await b.close();
let x = 20; const comp = [];
for (let i = 0; i < tiles.length; i++) { const m = await sharp(tiles[i]).metadata(); comp.push({ input: tiles[i], left: x, top: 50 }); x += m.width + (i % 3 === 2 ? 90 : 30); }
const svg = Buffer.from(`<svg width="${x}" height="50"><text x="20" y="34" font-size="28" fill="#fff" font-family="Arial">SLIM</text><text x="${x * 0.36}" y="34" font-size="28" fill="#fff" font-family="Arial">MEDIUM</text><text x="${x * 0.69}" y="34" font-size="28" fill="#fff" font-family="Arial">BOLD</text></svg>`);
comp.push({ input: svg, left: 0, top: 0 });
await sharp({ create: { width: x, height: H + 70, channels: 4, background: '#2a3050' } }).composite(comp).png().toFile(`gemini/stages/${ARENA}/shots/builds.png`);
console.log('ok');
