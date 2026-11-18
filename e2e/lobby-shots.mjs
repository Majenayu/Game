import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const out = 'ux/lobby/'; mkdirSync(out, { recursive: true });
const b = await chromium.launch();
for (const [n, w, h, t] of [['1366', 1366, 768, false], ['1920', 1920, 1080, false], ['phone', 844, 390, true], ['portrait', 390, 844, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: t, isMobile: t, deviceScaleFactor: t ? 2 : 1 });
  await ctx.addInitScript((s) => { if (!localStorage.getItem('orb.save3')) localStorage.setItem('orb.save3', s); }, JSON.stringify({ profile: { cls: 'warrior', created: 1, onboarded: true }, coins: 2450, xp: 5200, nick: 'NovaStar' }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:5173/');
  await p.waitForSelector('#menu:not([hidden])', { timeout: 20000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}${n}.png` });
  await p.click('#moretile');
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}${n}-more.png` });
  console.log(n, 'errors', JSON.stringify(errs));
  await ctx.close();
}
await b.close();
