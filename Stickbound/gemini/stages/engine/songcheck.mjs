// Renders each arena's song loop offline (music and air bed), prints its level and writes a WAV preview to
// gemini/stages/<arena>/shots/song.wav, so the music can be heard without opening the lab.
// Run from Stickbound/ with the dev server on 5190: node gemini/stages/engine/songcheck.mjs [arena folders...]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const all = ['lightningarena', 'firearena', 'waterarena', 'leafarena', 'lightarena', 'eartharena', 'windarena', 'gravityarena', 'timearena', 'shadowarena', 'icearena'];
const list = process.argv.length > 2 ? process.argv.slice(2) : all;
const b = await chromium.launch();
for (const arena of list) {
  const page = await b.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`http://localhost:5190/gemini/stages/${arena}/`);
  await page.waitForSelector('body[data-ready="1"]');
  const r = await page.evaluate(() => window.__renderSong());
  fs.mkdirSync(`gemini/stages/${arena}/shots`, { recursive: true });
  fs.writeFileSync(`gemini/stages/${arena}/shots/song.wav`, Buffer.from(r.wav, 'base64'));
  console.log(`${arena.padEnd(15)} ${r.seconds.toFixed(1)} s  peak ${r.peak.toFixed(2)}  rms ${r.rms.toFixed(3)}  quiet seconds ${r.quietSeconds}  errors ${JSON.stringify(errors)}`);
  await page.close();
}
await b.close();
