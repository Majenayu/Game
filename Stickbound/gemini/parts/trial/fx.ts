/**
 * Element effects for the Hero Trial. Pure drawing: inputs plus a seed, never game state, so a frame always looks
 * the same. Colours come from the element kit (glow, mid and core rgb triplets).
 */
import { flameShape, gear } from './heads';
import type { Kit } from './kits';
type G = CanvasRenderingContext2D;
type P = { x: number; y: number };
export type FxCol = Kit['fx'];

export function rngOf(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const TAU = Math.PI * 2;
function path(g: G, pts: P[]): void {
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
}
function smooth(g: G, pts: P[]): void {
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const m = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
    g.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y);
  }
  const l = pts[pts.length - 1];
  g.lineTo(l.x, l.y);
}

/** Soft round glow. */
export function glow(g: G, x: number, y: number, r: number, c: FxCol, a: number): void {
  if (a <= 0.01 || r <= 0) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${c.core},${a})`);
  gr.addColorStop(0.3, `rgba(${c.mid},${0.6 * a})`);
  gr.addColorStop(1, `rgba(${c.glow},0)`);
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
  g.restore();
}
/** Star flare with rays (hits, releases). */
export function flare(g: G, x: number, y: number, size: number, a: number, seed: number, c: FxCol): void {
  if (a <= 0.01) return;
  glow(g, x, y, size, c, a);
  const r = rngOf(seed);
  g.save();
  g.globalCompositeOperation = 'lighter';
  const rot = r() * Math.PI;
  for (let i = 0; i < 8; i++) {
    const ang = rot + (i / 8) * TAU;
    const L = size * (i % 2 ? 0.9 : 1.5) * (0.8 + r() * 0.4);
    const w = size * 0.06;
    g.fillStyle = `rgba(${i % 2 ? c.mid : c.core},${a * 0.85})`;
    g.beginPath();
    g.moveTo(x + Math.cos(ang) * L, y + Math.sin(ang) * L);
    g.lineTo(x + Math.cos(ang + Math.PI / 2) * w, y + Math.sin(ang + Math.PI / 2) * w);
    g.lineTo(x - Math.cos(ang) * w * 2, y - Math.sin(ang) * w * 2);
    g.lineTo(x + Math.cos(ang - Math.PI / 2) * w, y + Math.sin(ang - Math.PI / 2) * w);
    g.closePath();
    g.fill();
  }
  g.restore();
}
/** A glowing energy line through points: wide glow, body, white core. */
export function streak(g: G, pts: P[], w: number, c: FxCol, a: number, curved = true): void {
  if (a <= 0.01 || pts.length < 2) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const draw = curved ? smooth : path;
  for (const [ww, col, al] of [[w * 3.2, c.glow, 0.16], [w * 1.6, c.glow, 0.5], [w * 0.8, c.mid, 0.9], [w * 0.32, c.core, 1]] as const) {
    draw(g, pts);
    g.strokeStyle = `rgba(${col},${al * a})`;
    g.lineWidth = ww;
    g.stroke();
  }
  g.restore();
}
/** Wavy line from A to B (beams, vines, jets). */
export function wavy(a: P, b: P, n: number, amp: number, phase: number, freq = 2): P[] {
  const pts: P[] = [];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const w = Math.sin(u * Math.PI * freq + phase) * amp * Math.sin(u * Math.PI);
    pts.push({ x: a.x + dx * u + (-dy / d) * w, y: a.y + dy * u + (dx / d) * w });
  }
  return pts;
}

// ---------------------------------------------------------------- element shapes
/** Fire: a cluster of flame tongues rising from base (columns, auras, trails). */
export function flames(g: G, cx: number, base: number, width: number, height: number, frame: number, a: number, seed = 1): void {
  if (a <= 0.01) return;
  const r = rngOf(Math.floor(frame / 3) * 31 + seed);
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = Math.min(1, a);
  const n = Math.max(3, Math.round(width / 26));
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : i / (n - 1) - 0.5;
    const h = height * (0.55 + 0.45 * r()) * (1 - Math.abs(u) * 0.8);
    const w = (width / n) * 2.2;
    flameShape(g, cx + u * width, base, w, h, (r() - 0.5) * 30 + Math.sin(frame / 5 + i) * 10, ['rgba(255,50,20,0.55)', 'rgba(255,130,30,0.6)', 'rgba(255,210,70,0.7)', 'rgba(255,250,210,0.75)']);
  }
  g.restore();
}
/** Water: a curling wave of height h moving in dir (1 right, -1 left), with foam. */
export function wave(g: G, x: number, ground: number, h: number, w: number, dir: number, frame: number, a: number): void {
  if (a <= 0.01) return;
  g.save();
  g.globalAlpha = Math.min(1, a);
  const pts: P[] = [];
  const crestX = x + dir * w * 0.25;
  pts.push({ x: x - dir * w * 0.6, y: ground });
  pts.push({ x: x - dir * w * 0.3, y: ground - h * 0.35 });
  pts.push({ x: crestX - dir * w * 0.12, y: ground - h * 0.95 });
  pts.push({ x: crestX + dir * w * 0.12, y: ground - h });
  pts.push({ x: crestX + dir * w * 0.22, y: ground - h * 0.7 });
  pts.push({ x: crestX + dir * w * 0.1, y: ground - h * 0.55 });
  pts.push({ x: x + dir * w * 0.45, y: ground });
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1];
    const q = pts[i];
    g.quadraticCurveTo(p.x + (q.x - p.x) * 0.5 + dir * 10, p.y + (q.y - p.y) * 0.2, q.x, q.y);
  }
  g.closePath();
  const gr = g.createLinearGradient(0, ground - h, 0, ground);
  gr.addColorStop(0, 'rgba(190,245,255,0.95)');
  gr.addColorStop(0.35, 'rgba(60,190,255,0.85)');
  gr.addColorStop(1, 'rgba(20,90,200,0.7)');
  g.fillStyle = gr;
  g.fill();
  g.shadowColor = '#7fe9ff';
  g.shadowBlur = 16;
  g.strokeStyle = 'rgba(220,250,255,0.95)';
  g.lineWidth = 4;
  g.stroke();
  // foam and inner curl lines
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(255,255,255,0.7)';
  g.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.arc(crestX - dir * (10 + i * 14), ground - h * (0.62 - i * 0.12), h * (0.22 + i * 0.06), dir > 0 ? Math.PI * 1.1 : -0.1, dir > 0 ? Math.PI * 1.9 : -Math.PI * 0.9 + Math.PI, dir < 0);
    g.stroke();
  }
  const r = rngOf(Math.floor(frame / 2) * 13);
  g.fillStyle = 'rgba(230,252,255,0.9)';
  for (let i = 0; i < 8; i++) {
    g.beginPath();
    g.arc(crestX + dir * (r() * 40), ground - h - r() * 26, 2 + r() * 4, 0, TAU);
    g.fill();
  }
  g.restore();
}
/** Ice: one crystal spike from the floor (lean in degrees). */
export function iceSpike(g: G, x: number, ground: number, h: number, w: number, lean: number, a: number): void {
  if (a <= 0.01 || h < 2) return;
  const la = (lean * Math.PI) / 180;
  const tip = { x: x + Math.sin(la) * h, y: ground - Math.cos(la) * h };
  g.save();
  g.globalAlpha = Math.min(1, a);
  g.beginPath();
  g.moveTo(x - w / 2, ground);
  g.lineTo(tip.x, tip.y);
  g.lineTo(x + w / 2, ground);
  g.closePath();
  const gr = g.createLinearGradient(x - w / 2, ground, tip.x + w / 2, tip.y);
  gr.addColorStop(0, 'rgba(70,150,230,0.85)');
  gr.addColorStop(0.6, 'rgba(180,230,255,0.9)');
  gr.addColorStop(1, 'rgba(255,255,255,0.95)');
  g.fillStyle = gr;
  g.fill();
  g.shadowColor = '#bfe9ff';
  g.shadowBlur = 14;
  g.strokeStyle = 'rgba(235,250,255,0.95)';
  g.lineWidth = 2.5;
  g.lineJoin = 'round';
  g.stroke();
  // facet line
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(255,255,255,0.6)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(x + w * 0.08, ground);
  g.lineTo(tip.x, tip.y);
  g.stroke();
  g.restore();
}
/** Earth: a jagged rock spike from the floor. */
export function rockSpike(g: G, x: number, ground: number, h: number, w: number, lean: number, a: number, seed: number): void {
  if (a <= 0.01 || h < 2) return;
  const r = rngOf(seed);
  const la = (lean * Math.PI) / 180;
  const pts: P[] = [{ x: x - w / 2, y: ground }];
  for (let i = 1; i < 4; i++) {
    const u = i / 4;
    pts.push({ x: x - w / 2 + (w * 0.2 + r() * 8) * u + Math.sin(la) * h * u, y: ground - h * u });
  }
  pts.push({ x: x + Math.sin(la) * h, y: ground - h });
  for (let i = 3; i >= 1; i--) {
    const u = i / 4;
    pts.push({ x: x + w / 2 - (w * 0.2 + r() * 8) * u + Math.sin(la) * h * u, y: ground - h * u + 4 });
  }
  pts.push({ x: x + w / 2, y: ground });
  g.save();
  g.globalAlpha = Math.min(1, a);
  path(g, pts);
  g.closePath();
  const gr = g.createLinearGradient(0, ground - h, 0, ground);
  gr.addColorStop(0, '#8a6038');
  gr.addColorStop(1, '#2a1a0e');
  g.fillStyle = gr;
  g.fill();
  g.shadowColor = '#e09a48';
  g.shadowBlur = 10;
  g.strokeStyle = '#e09a48';
  g.lineWidth = 3;
  g.lineJoin = 'round';
  g.stroke();
  g.restore();
}
/** A rough rock (projectiles, debris). */
export function boulder(g: G, x: number, y: number, r: number, rot: number, seed: number, a = 1): void {
  const rr = rngOf(seed);
  g.save();
  g.globalAlpha = a;
  g.translate(x, y);
  g.rotate(rot);
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * TAU;
    const k = 0.78 + rr() * 0.3;
    g.lineTo(Math.cos(ang) * r * k, Math.sin(ang) * r * k);
  }
  g.closePath();
  const gr = g.createLinearGradient(0, -r, 0, r);
  gr.addColorStop(0, '#8e6440');
  gr.addColorStop(1, '#2e1d10');
  g.fillStyle = gr;
  g.fill();
  g.shadowColor = '#e09a48';
  g.shadowBlur = 12;
  g.strokeStyle = '#f0b060';
  g.lineWidth = 3;
  g.lineJoin = 'round';
  g.stroke();
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(255,208,138,0.5)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-r * 0.4, -r * 0.2);
  g.lineTo(r * 0.1, r * 0.1);
  g.lineTo(r * 0.3, -r * 0.35);
  g.stroke();
  g.restore();
}
/** Wind / gravity: elliptical swirl lines around a centre (tornado bands, gravity rings). */
export function swirl(g: G, cx: number, cy: number, rx: number, ry: number, frame: number, c: FxCol, a: number, bands = 5, height = 0, spin = 1): void {
  if (a <= 0.01) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  for (let i = 0; i < bands; i++) {
    const u = bands === 1 ? 0.5 : i / (bands - 1);
    const y = cy - height * u;
    const k = height ? 0.55 + u * 0.6 : 1 - i * 0.12;
    const a0 = spin * frame * 0.12 + i * 1.3;
    for (const [w, col, al] of [[9, c.glow, 0.22], [3.5, c.mid, 0.8], [1.4, c.core, 0.9]] as const) {
      g.strokeStyle = `rgba(${col},${al * a})`;
      g.lineWidth = w;
      g.beginPath();
      g.ellipse(cx, y, rx * k, ry * k, 0, a0, a0 + 3.6);
      g.stroke();
    }
  }
  g.restore();
}
/** Time: a clock face ring with numerals as ticks and turning hands. */
export function clockRing(g: G, cx: number, cy: number, r: number, frame: number, c: FxCol, a: number, flat = 1): void {
  if (a <= 0.01) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.translate(cx, cy);
  g.scale(1, flat);
  g.strokeStyle = `rgba(${c.mid},${0.85 * a})`;
  g.shadowColor = `rgb(${c.mid})`;
  g.shadowBlur = 14;
  g.lineWidth = 4;
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.stroke();
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, 0, r * 0.82, 0, TAU);
  g.stroke();
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * TAU;
    const L = i % 3 === 0 ? 0.16 : 0.08;
    g.lineWidth = i % 3 === 0 ? 4 : 2;
    g.beginPath();
    g.moveTo(Math.cos(ang) * r * 0.82, Math.sin(ang) * r * 0.82);
    g.lineTo(Math.cos(ang) * r * (0.82 - L), Math.sin(ang) * r * (0.82 - L));
    g.stroke();
  }
  g.strokeStyle = `rgba(${c.core},${a})`;
  g.lineWidth = 4;
  const h1 = frame * 0.02;
  const h2 = frame * 0.16;
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(Math.cos(h1) * r * 0.45, Math.sin(h1) * r * 0.45);
  g.moveTo(0, 0);
  g.lineTo(Math.cos(h2) * r * 0.7, Math.sin(h2) * r * 0.7);
  g.stroke();
  g.restore();
}
/** Leaf: a vine from A to B with leaves, grown to fraction k. */
export function vineLine(g: G, a: P, b: P, k: number, frame: number, w = 6): void {
  const pts = wavy(a, { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, 18, 14, frame / 6, 3);
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.shadowColor = '#78e65a';
  g.shadowBlur = 12;
  g.strokeStyle = '#2f8a2c';
  g.lineWidth = w + 3;
  smooth(g, pts);
  g.stroke();
  g.strokeStyle = '#6ee05a';
  g.lineWidth = w * 0.6;
  smooth(g, pts);
  g.stroke();
  g.shadowBlur = 0;
  for (let i = 2; i < pts.length; i += 2) {
    const p = pts[i];
    g.save();
    g.translate(p.x, p.y);
    g.rotate(i * 1.9);
    g.fillStyle = i % 4 ? '#5fd04a' : '#8ff07a';
    g.beginPath();
    g.ellipse(0, -8, 5, 10, 0, 0, TAU);
    g.fill();
    g.restore();
  }
  g.restore();
}
/** Leaf: a blooming lotus of n petals (Lotus Bloom, Thicket). open 0..1. */
export function lotus(g: G, cx: number, base: number, size: number, open: number, frame: number, a: number): void {
  if (a <= 0.01) return;
  g.save();
  g.globalAlpha = Math.min(1, a);
  const layers: Array<[number, number, string, string]> = [[9, 1, 'rgba(120,220,90,0.7)', '#c8ff9a'], [7, 0.78, 'rgba(170,245,120,0.75)', '#eaffc8'], [5, 0.55, 'rgba(255,160,210,0.8)', '#ffe0f0']];
  for (const [n, s, fill, line] of layers) {
    for (let i = 0; i < n; i++) {
      const spread = (i / (n - 1) - 0.5) * Math.PI * 0.95 * open;
      g.save();
      g.translate(cx, base);
      g.rotate(spread + Math.sin(frame / 20 + i) * 0.03);
      g.beginPath();
      const L = size * s;
      const W = L * 0.32;
      g.moveTo(0, 0);
      g.quadraticCurveTo(-W, -L * 0.5, 0, -L);
      g.quadraticCurveTo(W, -L * 0.5, 0, 0);
      g.fillStyle = fill;
      g.fill();
      g.shadowColor = line;
      g.shadowBlur = 14;
      g.strokeStyle = line;
      g.lineWidth = 3;
      g.stroke();
      g.restore();
    }
  }
  g.restore();
}
/** Gravity: a dark well with a bright rim and inward streaks. */
export function well(g: G, x: number, y: number, r: number, frame: number, c: FxCol, a: number): void {
  if (a <= 0.01) return;
  g.save();
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(5,0,12,${0.95 * a})`);
  gr.addColorStop(0.55, `rgba(30,0,50,${0.8 * a})`);
  gr.addColorStop(1, 'rgba(30,0,50,0)');
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
  g.restore();
  swirl(g, x, y, r * 0.95, r * 0.42, frame, c, a, 3, 0, -1);
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = `rgba(${c.mid},${0.9 * a})`;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(x, y, r * 0.42, 0, TAU);
  g.stroke();
  const rr = rngOf(Math.floor(frame / 2) * 7);
  for (let i = 0; i < 10; i++) {
    const ang = rr() * TAU;
    const d0 = r * (1.1 + rr() * 0.5);
    const d1 = d0 * 0.55;
    g.strokeStyle = `rgba(${c.core},${0.5 * a})`;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x + Math.cos(ang) * d0, y + Math.sin(ang) * d0 * 0.6);
    g.lineTo(x + Math.cos(ang + 0.3) * d1, y + Math.sin(ang + 0.3) * d1 * 0.6);
    g.stroke();
  }
  g.restore();
}
/** Water: a trap bubble with shine. */
export function bubble(g: G, x: number, y: number, r: number, frame: number, a: number): void {
  if (a <= 0.01) return;
  const wob = 1 + Math.sin(frame / 5) * 0.04;
  g.save();
  g.globalAlpha = Math.min(1, a);
  g.beginPath();
  g.ellipse(x, y, r * wob, r / wob, 0, 0, TAU);
  const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  gr.addColorStop(0, 'rgba(220,250,255,0.35)');
  gr.addColorStop(0.7, 'rgba(60,180,255,0.18)');
  gr.addColorStop(1, 'rgba(120,230,255,0.55)');
  g.fillStyle = gr;
  g.fill();
  g.shadowColor = '#7fe9ff';
  g.shadowBlur = 18;
  g.strokeStyle = 'rgba(200,245,255,0.95)';
  g.lineWidth = 4;
  g.stroke();
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(x, y, r * 0.75, Math.PI * 1.1, Math.PI * 1.45);
  g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- projectiles
export type ProjKind = 'fireball' | 'jet' | 'bubble' | 'shard' | 'blade' | 'boulder' | 'dart' | 'well' | 'freeze';
/** Draws a projectile at (x,y) moving with (vx,vy); trail is the recent positions (oldest first). */
export function projectile(g: G, kind: ProjKind, k: Kit, x: number, y: number, vx: number, vy: number, frame: number, trail: P[], r: number): void {
  const c = k.fx;
  const ang = Math.atan2(vy, vx);
  if (kind === 'fireball') {
    // comet: a flame tail and a bright core
    for (let i = 0; i < trail.length; i++) {
      const u = i / trail.length;
      glow(g, trail[i].x, trail[i].y, r * (0.5 + u * 0.9), k.fx2, 0.25 * u);
    }
    g.save();
    g.translate(x, y);
    g.rotate(ang + Math.PI / 2);
    g.globalCompositeOperation = 'lighter';
    flameShape(g, 0, r * 0.5, r * 2.0, r * 3.6, Math.sin(frame / 2) * 6, ['rgba(255,60,20,0.6)', 'rgba(255,140,30,0.7)', 'rgba(255,220,90,0.8)']);
    g.restore();
    glow(g, x, y, r * 1.6, c, 0.9);
    glow(g, x, y, r * 0.7, { glow: c.core, mid: c.core, core: '255,255,255' }, 1);
  } else if (kind === 'jet' || kind === 'dart') {
    const tail = trail.length ? trail[0] : { x: x - vx * 6, y };
    streak(g, [tail, { x, y }], kind === 'jet' ? r * 1.1 : r * 0.8, c, 1, false);
    flare(g, x, y, r * 2.4, 0.9, frame, c);
    if (kind === 'jet') for (let i = 0; i < 4; i++) glow(g, x - vx * i * 1.5, y + Math.sin(frame + i) * 10, r * 0.6, c, 0.5);
  } else if (kind === 'bubble') {
    bubble(g, x, y, r, frame, 1);
  } else if (kind === 'shard') {
    for (let i = 0; i < trail.length; i++) glow(g, trail[i].x, trail[i].y, r * 0.8 * (i / trail.length), c, 0.3);
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.beginPath();
    g.moveTo(r * 2.2, 0);
    g.lineTo(0, -r * 0.6);
    g.lineTo(-r * 1.4, 0);
    g.lineTo(0, r * 0.6);
    g.closePath();
    const gr = g.createLinearGradient(-r * 1.4, 0, r * 2.2, 0);
    gr.addColorStop(0, 'rgba(90,170,255,0.8)');
    gr.addColorStop(1, '#ffffff');
    g.fillStyle = gr;
    g.shadowColor = '#bfe9ff';
    g.shadowBlur = 16;
    g.fill();
    g.strokeStyle = '#e6f7ff';
    g.lineWidth = 2;
    g.stroke();
    g.restore();
  } else if (kind === 'blade') {
    // crescent of wind
    g.save();
    g.translate(x, y);
    g.scale(Math.sign(vx) || 1, 1);
    g.globalCompositeOperation = 'lighter';
    for (const [w, col, al] of [[14, c.glow, 0.25], [6, c.mid, 0.85], [2.2, c.core, 1]] as const) {
      g.strokeStyle = `rgba(${col},${al})`;
      g.lineWidth = w;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(-r * 0.6, 0, r * 1.6, -1.0, 1.0);
      g.stroke();
    }
    g.restore();
    for (let i = 0; i < trail.length; i += 2) {
      const p = trail[i];
      streak(g, [{ x: p.x - vx * 2, y: p.y + (i % 4 ? -r : r) * 0.6 }, { x: p.x, y: p.y + (i % 4 ? -r : r) * 0.6 }], 3, c, 0.35 * (i / trail.length), false);
    }
  } else if (kind === 'boulder') {
    for (let i = 0; i < trail.length; i += 2) glow(g, trail[i].x, trail[i].y, r * 0.6, k.fx2, 0.12 * (i / trail.length));
    boulder(g, x, y, r, frame * 0.12, 7);
  } else if (kind === 'well') {
    well(g, x, y, r, frame, c, 1);
  } else if (kind === 'freeze') {
    clockRing(g, x, y, r, frame * 3, c, 1);
    glow(g, x, y, r * 0.9, c, 0.5);
  }
}

// ---------------------------------------------------------------- aura and shield
/**
 * Power-up aura: energy rising from the floor around the body in the element's own shape. side -1 draws the part
 * behind the body, 1 the part in front.
 */
export function aura(g: G, k: Kit, cx: number, ground: number, height: number, s: number, frame: number, side: -1 | 1): void {
  if (s <= 0.02) return;
  const c = k.fx;
  if (side < 0) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(cx, ground, 4, cx, ground, height * 0.6);
    gr.addColorStop(0, `rgba(${c.mid},${0.5 * s})`);
    gr.addColorStop(0.5, `rgba(${c.glow},${0.22 * s})`);
    gr.addColorStop(1, `rgba(${c.glow},0)`);
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(cx, ground, height * 0.6, height * 0.16, 0, 0, TAU);
    g.fill();
    const body = g.createRadialGradient(cx, ground - height * 0.45, 10, cx, ground - height * 0.45, height * 0.65);
    body.addColorStop(0, `rgba(${c.mid},${0.2 * s})`);
    body.addColorStop(1, `rgba(${c.mid},0)`);
    g.fillStyle = body;
    g.fillRect(cx - height, ground - height * 1.2, height * 2, height * 1.2);
    g.restore();
  }
  switch (k.id) {
    case 'fire':
      flames(g, cx + side * 6, ground, height * 0.6, height * 0.95 * s, frame + (side > 0 ? 5 : 0), s * (side > 0 ? 0.55 : 0.9), side > 0 ? 3 : 1);
      break;
    case 'water':
      if (side < 0) swirl(g, cx, ground - height * 0.1, height * 0.42, height * 0.1, frame, c, s * 0.8, 4, height * 0.8);
      else for (let i = 0; i < 3; i++) { const u = ((frame * 0.02 + i / 3) % 1); glow(g, cx + Math.sin(frame / 9 + i * 2) * height * 0.3, ground - u * height, 10, c, s * (1 - u)); }
      break;
    case 'ice': {
      const n = 7;
      for (let i = 0; i < n; i++) {
        if ((i % 2 === 0) !== side > 0) continue;
        const u = i / (n - 1) - 0.5;
        iceSpike(g, cx + u * height * 0.7, ground, height * 0.28 * s * (1 - Math.abs(u)), 22, u * 50, s);
      }
      if (side > 0) glow(g, cx, ground - height * 0.4, height * 0.35, c, 0.12 * s);
      break;
    }
    case 'wind':
    case 'gravity':
      swirl(g, cx, ground - 6, height * 0.4, height * 0.09, frame * (side > 0 ? 1 : -1), c, s * (side > 0 ? 0.6 : 0.9), 4, height * 0.85, k.id === 'gravity' ? -1 : 1);
      break;
    case 'earth': {
      const r = rngOf(Math.floor(frame / 30) * 3 + (side > 0 ? 1 : 0));
      for (let i = 0; i < 4; i++) {
        const u = ((frame * 0.01 + i / 4) % 1);
        boulder(g, cx + (r() - 0.5) * height * 0.8, ground - u * height * 0.7, 6 + r() * 8, frame * 0.05 + i, i + 1, s * (1 - u));
      }
      break;
    }
    case 'leaf':
      if (side < 0) lotus(g, cx, ground, height * 0.5 * s, 0.9, frame, s * 0.55);
      break;
    case 'light': {
      g.save();
      g.globalCompositeOperation = 'lighter';
      const rays = 10;
      for (let i = 0; i < rays; i++) {
        if ((i % 2 === 0) !== side > 0) continue;
        const a = (i / rays) * Math.PI - Math.PI + Math.sin(frame / 30) * 0.1;
        const L = height * (0.6 + 0.3 * Math.sin(frame / 7 + i)) * s;
        const ox = cx;
        const oy = ground - height * 0.45;
        g.fillStyle = `rgba(${c.mid},${0.16 * s})`;
        g.beginPath();
        g.moveTo(ox, oy);
        g.lineTo(ox + Math.cos(a - 0.06) * L, oy + Math.sin(a - 0.06) * L);
        g.lineTo(ox + Math.cos(a + 0.06) * L, oy + Math.sin(a + 0.06) * L);
        g.closePath();
        g.fill();
      }
      g.restore();
      break;
    }
    case 'time':
      if (side < 0) clockRing(g, cx, ground - height * 0.48, height * 0.5, frame, c, s * 0.6);
      else clockRing(g, cx, ground, height * 0.45, -frame, k.fx2, s * 0.6, 0.22);
      break;
  }
}
/** Element shield for guarding: a dome in front of the body with the element's pattern. */
export function shield(g: G, k: Kit, cx: number, cy: number, facing: number, radius: number, pop: number, hit: number, frame: number, perfect: boolean): void {
  if (pop <= 0.01) return;
  const R = radius * (0.6 + 0.4 * Math.min(1, pop * 1.2)) * (1 + hit * 0.08);
  const a0 = facing > 0 ? -1.25 : Math.PI - 1.25;
  const a1 = a0 + 2.5;
  const c = perfect ? { glow: '255,190,60', mid: '255,230,130', core: '255,255,230' } : k.fx;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
  gr.addColorStop(0, `rgba(${c.mid},0)`);
  gr.addColorStop(0.75, `rgba(${c.mid},${0.1 + hit * 0.2})`);
  gr.addColorStop(1, `rgba(${c.mid},${0.35 + hit * 0.4})`);
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(cx, cy);
  g.arc(cx, cy, R, a0, a1);
  g.closePath();
  g.fill();
  // element pattern inside the dome
  g.save();
  g.beginPath();
  g.moveTo(cx, cy);
  g.arc(cx, cy, R, a0, a1);
  g.closePath();
  g.clip();
  g.strokeStyle = `rgba(${c.mid},${0.3 + hit * 0.3})`;
  g.lineWidth = 2;
  const id = k.id;
  if (id === 'ice' || id === 'light') {
    const hs = R * 0.16;
    for (let yy = -R; yy < R; yy += hs * 1.5)
      for (let xx = -R; xx < R; xx += hs * 1.732) {
        const ox = cx + xx + ((Math.round(yy / (hs * 1.5)) & 1) ? hs * 0.866 : 0);
        const oy = cy + yy;
        g.beginPath();
        for (let q = 0; q < 6; q++) {
          const a = (q / 6) * TAU + Math.PI / 6;
          g.lineTo(ox + Math.cos(a) * hs * 0.55, oy + Math.sin(a) * hs * 0.55);
        }
        g.closePath();
        g.stroke();
      }
  } else if (id === 'time') {
    g.restore();
    clockRing(g, cx + facing * R * 0.35, cy, R * 0.55, frame, c, 0.7);
    g.save();
  } else if (id === 'earth') {
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.moveTo(cx + facing * R * (0.3 + i * 0.12), cy - R);
      g.lineTo(cx + facing * R * (0.45 + i * 0.1), cy + R);
      g.stroke();
    }
  } else if (id === 'leaf') {
    for (let i = 0; i < 8; i++) {
      g.save();
      g.translate(cx + facing * R * (0.55 + (i % 3) * 0.12), cy + (i - 3.5) * R * 0.22);
      g.rotate(i * 0.8);
      g.beginPath();
      g.ellipse(0, 0, 6, 13, 0, 0, TAU);
      g.stroke();
      g.restore();
    }
  } else {
    // flowing arcs (fire, water, wind, gravity)
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.arc(cx, cy, R * (0.55 + i * 0.12), a0 + Math.sin(frame / 10 + i) * 0.2, a1 - 0.3);
      g.stroke();
    }
  }
  g.restore();
  // living edge
  const edge: P[] = [];
  const steps = 22;
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    const rr = R + Math.sin(frame / 3 + i * 1.3) * (id === 'fire' ? 7 : 3);
    edge.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
  }
  g.restore();
  streak(g, edge, 5 + hit * 4, c, 0.95);
  if (id === 'fire') for (let i = 2; i < edge.length - 2; i += 3) flames(g, edge[i].x, edge[i].y + 6, 18, 30 + Math.sin(frame / 3 + i) * 8, frame + i, 0.55, i);
  if (id === 'ice') for (let i = 3; i < edge.length - 3; i += 5) iceSpike(g, edge[i].x, edge[i].y + 10, 26, 10, facing * 40, 0.8);
  if (id === 'earth') for (let i = 2; i < edge.length - 2; i += 4) boulder(g, edge[i].x, edge[i].y, 10, i, i, 0.95);
}
/** Gear pieces flying (time effects). */
export function gearFx(g: G, x: number, y: number, r: number, rot: number, line: string, a: number): void {
  g.save();
  g.globalAlpha = a;
  g.translate(x, y);
  g.rotate(rot);
  gear(g, r, 9, line, 'rgba(58,36,20,0.8)');
  g.restore();
}
