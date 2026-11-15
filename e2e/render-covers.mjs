// Renders the three CrazyGames cover images (title only, no borders) with Playwright.
// Output: e2e/covers/landscape-1920x1080.png, portrait-800x1200.png, square-800x800.png
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const SIZES = [
  ['landscape', 1920, 1080],
  ['portrait', 800, 1200],
  ['square', 800, 800],
];

const html = (w, h) => `<!doctype html><html><body style="margin:0;background:#0b0e1a">
<canvas id="c" width="${w}" height="${h}"></canvas>
<script>
const c = document.getElementById('c'), g = c.getContext('2d');
const W = ${w}, H = ${h};
let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const bg = g.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H) * 0.7);
bg.addColorStop(0, '#1a2250'); bg.addColorStop(1, '#070914');
g.fillStyle = bg; g.fillRect(0, 0, W, H);
g.strokeStyle = 'rgba(90,110,255,0.08)'; g.lineWidth = 2;
for (let x = 0; x < W; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
for (let y = 0; y < H; y += 80) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
const colors = ['#4dd2ff', '#ff5e8a', '#7dff6b', '#ffc93c', '#b77dff', '#ff8a3c'];
const u = Math.min(W, H);
function orb(x, y, r, col, aim) {
  for (const [k, a] of [[3.2, 0.06], [2.2, 0.12], [1.5, 0.2]]) { g.fillStyle = col; g.globalAlpha = a; g.beginPath(); g.arc(x, y, r * k, 0, 7); g.fill(); }
  g.globalAlpha = 1; g.strokeStyle = col; g.lineWidth = r * 0.25; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x + Math.cos(aim) * r * 0.4, y + Math.sin(aim) * r * 0.4); g.lineTo(x + Math.cos(aim) * r * 1.5, y + Math.sin(aim) * r * 1.5); g.stroke();
  g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.arc(x - r * 0.28, y - r * 0.28, r * 0.4, 0, 7); g.fill();
}
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2 + 0.4;
  const x = W / 2 + Math.cos(a) * W * 0.36, y = H * 0.4 + Math.sin(a) * H * 0.26;
  const ang = Math.atan2(H * 0.4 - y, W / 2 - x);
  orb(x, y, u * 0.07, colors[i], ang);
  for (let k = 1; k < 5; k++) { g.fillStyle = colors[i]; g.globalAlpha = 0.9; g.beginPath(); g.arc(x + Math.cos(ang) * (u * 0.14 + k * u * 0.07), y + Math.sin(ang) * (u * 0.14 + k * u * 0.07), u * 0.012, 0, 7); g.fill(); }
}
g.globalAlpha = 1;
orb(W / 2, H * 0.4, u * 0.11, '#4dd2ff', -0.6);
g.textAlign = 'center'; g.textBaseline = 'middle';
const fs = Math.min(W * 0.17, u * 0.2);
g.font = '900 ' + fs + 'px "Trebuchet MS", "Segoe UI", sans-serif';
g.shadowColor = '#4dd2ff'; g.shadowBlur = 40; g.fillStyle = '#ffffff';
if (W > H) { g.fillText('ORB ARENA', W / 2, H * 0.84); }
else { g.font = '900 ' + (W * 0.2) + 'px "Trebuchet MS", sans-serif'; g.fillText('ORB', W / 2, H * 0.78); g.fillText('ARENA', W / 2, H * 0.78 + W * 0.22); }
</script></body></html>`;

mkdirSync(new URL('./covers/', import.meta.url), { recursive: true });
const browser = await chromium.launch();
for (const [name, w, h] of SIZES) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(html(w, h));
  const file = new URL(`./covers/${name}-${w}x${h}.png`, import.meta.url).pathname.replace(
    /^\/([A-Za-z]:)/,
    '$1',
  );
  await page.screenshot({ path: decodeURIComponent(file) });
  console.log('wrote', decodeURIComponent(file));
  await page.close();
}
await browser.close();
