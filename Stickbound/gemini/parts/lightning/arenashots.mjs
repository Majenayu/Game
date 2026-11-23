// Screenshots of the arena with its moving effects: calm, cloud drift, lightning strikes, the ultimate storm,
// all four screen sizes, a frame-rate reading and a sound check.
// Run from Stickbound/ with the dev server on 5190: node gemini/parts/lightning/arenashots.mjs
import { chromium } from '@playwright/test';
const dir = 'gemini/parts/lightning/shots/';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
const open = async (w, h) => {
  const page = await b.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('http://localhost:5190/gemini/parts/lightning/');
  await page.waitForSelector('body[data-ready="1"]');
  await page.waitForTimeout(400);
  return page;
};
const at = async (page, frame) => {
  await page.evaluate((f) => {
    window.__lab.speed = 0;
    window.__lab.frameNo = f;
  }, frame);
  await page.waitForTimeout(150);
};
const page = await open(1366, 768);
// find strike frames: big ground strikes at their 2nd frame, and a cloud arc
const found = await page.evaluate(() => {
  const big = [];
  const arc = [];
  for (let f = 100; f < 4000 && (big.length < 3 || !arc.length); f++)
    for (const s of window.__strikes(f, 0)) {
      if (s.t === 1 && s.ground && s.big && big.length < 3) big.push(f);
      if (s.t === 1 && !s.ground && !arc.length) arc.push(f);
    }
  return { big, arc };
});
console.log('strike frames', JSON.stringify(found));
await at(page, 60);
await page.screenshot({ path: dir + 'arena-calm.png' });
await at(page, 800);
await page.screenshot({ path: dir + 'arena-drift.png' });
for (const [i, f] of found.big.entries()) {
  await at(page, f);
  await page.screenshot({ path: dir + `arena-strike${i}.png` });
}
await at(page, found.arc[0]);
await page.screenshot({ path: dir + 'arena-arc.png' });
// the ultimate: storm mode with extra strikes
await page.evaluate(() => (window.__lab.speed = 1));
await page.keyboard.press('KeyP');
await page.waitForTimeout(1400);
await page.screenshot({ path: dir + 'arena-ult.png' });
// sound: the first key press starts it
await page.waitForTimeout(1500);
const sound = await page.evaluate(() => ({ state: window.__sound.ctx?.state ?? 'none', music: window.__sound.musicOn, rate: window.__sound.ctx?.sampleRate ?? 0 }));
console.log('sound', JSON.stringify(sound));
const fps = await page.evaluate(
  () =>
    new Promise((res) => {
      let n = 0;
      const t0 = performance.now();
      const tick = () => (++n, performance.now() - t0 < 2000 ? requestAnimationFrame(tick) : res((n * 1000) / (performance.now() - t0)));
      requestAnimationFrame(tick);
    }),
);
console.log('fps', fps.toFixed(1));
for (const [w, h] of [[1920, 1080], [844, 390], [390, 844]]) {
  const p = await open(w, h);
  await p.screenshot({ path: dir + `arena-${w}x${h}.png` });
  await p.close();
}
console.log('errors', JSON.stringify(errors));
await b.close();
