// The arena picture with its effects at chosen frames, at the picture's own size (no fighters, no panel), plus the
// baked picture alone (frame -1 = what is left behind the moving parts), to check cut-outs for holes and halos.
// Run from Stickbound/ with the dev server on 5190: node gemini/stages/engine/plateshots.mjs <arena folder> [frames...]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const ARENA = process.argv[2] ?? 'lightningarena';
const frames = process.argv.slice(3).map(Number);
if (!frames.length) frames.push(-1, 0, 30, 600, 800);
const dir = `gemini/stages/${ARENA}/shots/`;
fs.mkdirSync(dir, { recursive: true });
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:5190/gemini/stages/${ARENA}/`);
await page.waitForSelector('body[data-ready="1"]');
await page.waitForTimeout(300);
for (const f of frames) {
  const url = await page.evaluate((f) => window.__plate(Math.max(0, f), f < 0), f);
  if (!url) continue;
  fs.writeFileSync(`${dir}plate-${f < 0 ? 'base' : 'f' + f}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('plate', f);
}
console.log('errors', JSON.stringify(errors));
await b.close();
