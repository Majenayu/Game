/**
 * Elementick screens: boot, scaling, the fixed 60 Hz loop, input and navigation. Open
 * http://localhost:5190/gemini/screens/ (all screens) or ?page=<name> for one screen.
 * Test hooks: window.__go(name), window.__step(n), window.__page(), body[data-ready="1"] once a page has drawn.
 */
import { loadHeroes } from './heroes';
import './menus';
import './menus2';
import { nav, pages, type PageName } from './nav';
import './play';
import { H, W, click, input } from './ui';

const canvas = document.querySelector<HTMLCanvasElement>('#c')!;
const g = canvas.getContext('2d')!;
let scale = 1;
let ox = 0;
let oy = 0;
function resize(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = window.innerWidth;
  const ch = window.innerHeight;
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  canvas.style.width = `${cw}px`;
  canvas.style.height = `${ch}px`;
  scale = Math.min(cw / W, ch / H);
  ox = (cw - W * scale) / 2;
  oy = (ch - H * scale) / 2;
  g.setTransform(dpr * scale, 0, 0, dpr * scale, ox * dpr, oy * dpr);
}
window.addEventListener('resize', resize);
resize();

let current: PageName = 'title';
let ready = false;
let t = 0;
nav.go = (name: PageName) => {
  const page = pages[name];
  if (!page) return;
  ready = false;
  document.body.dataset.ready = '0';
  const params = new URLSearchParams(location.search);
  params.set('page', name);
  if (name !== 'zombie') params.delete('wave');
  history.replaceState(null, '', `?${params.toString()}`);
  document.title = `Elementick · ${page.title}`;
  input.held.clear();
  const els = page.heroes?.() ?? [];
  void loadHeroes(els).then(() => {
    current = name;
    nav.name = name;
    page.enter?.();
    ready = true;
  });
};
const first = (new URLSearchParams(location.search).get('page') ?? 'gallery') as PageName;
nav.go(first in pages ? first : 'gallery');

// ---- input
const toDesign = (e: { clientX: number; clientY: number }) => ({ x: (e.clientX - ox) / scale, y: (e.clientY - oy) / scale });
const pointers = new Map<number, { x: number; y: number }>();
const syncPointers = () => (input.pointers = [...pointers.values()]);
canvas.addEventListener('pointerdown', (e) => {
  const p = toDesign(e);
  input.mx = p.x;
  input.my = p.y;
  pointers.set(e.pointerId, p);
  syncPointers();
  canvas.setPointerCapture(e.pointerId);
  if (ready) click(p.x, p.y);
});
canvas.addEventListener('pointermove', (e) => {
  const p = toDesign(e);
  input.mx = p.x;
  input.my = p.y;
  if (pointers.has(e.pointerId)) {
    pointers.set(e.pointerId, p);
    syncPointers();
  }
});
const lift = (e: PointerEvent) => {
  pointers.delete(e.pointerId);
  syncPointers();
};
canvas.addEventListener('pointerup', lift);
canvas.addEventListener('pointercancel', lift);
const GAME_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
window.addEventListener('keydown', (e) => {
  if (GAME_KEYS.has(e.code)) e.preventDefault();
  if (e.repeat) return;
  input.held.add(e.code);
  const page = pages[current];
  if (page.key) page.key(e);
  else if (e.code === 'Escape' && current !== 'gallery') nav.go('gallery');
});
window.addEventListener('keyup', (e) => input.held.delete(e.code));
window.addEventListener('blur', () => input.held.clear());

// ---- loop
function frame(): void {
  input.regions = [];
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#03040c';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.restore();
  g.save();
  g.beginPath();
  g.rect(0, 0, W, H);
  g.clip();
  if (ready) {
    pages[current].draw(g, t);
    if (document.body.dataset.ready !== '1') document.body.dataset.ready = '1';
  } else {
    g.fillStyle = '#05061a';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#9fd8ff';
    g.font = '700 28px Bahnschrift, sans-serif';
    g.textAlign = 'center';
    g.fillText('Loading…', W / 2, H / 2);
  }
  g.restore();
}
function step(): void {
  t++;
  if (ready) pages[current].step?.();
}
let acc = 0;
let last = performance.now();
let manual = false;
function loop(now: number): void {
  if (!manual) {
    acc += Math.min(100, now - last);
    while (acc >= 1000 / 60) {
      step();
      acc -= 1000 / 60;
    }
  }
  last = now;
  frame();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
const w = window as unknown as Record<string, unknown>;
w.__go = (name: PageName) => nav.go(name);
w.__page = () => current;
w.__nav = nav;
/** stop the clock and step n frames by hand (screenshots) */
w.__step = (n: number) => {
  manual = true;
  for (let i = 0; i < n; i++) step();
  frame();
};
w.__run = () => (manual = false);
