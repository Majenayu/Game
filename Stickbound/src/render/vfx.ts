// Effects renderer: power visuals with telegraphs, hit sparks, dust, rings, status overlays.
// Particles live only in the renderer (never in the sim) and obey a global cap.

import { ELEMENTS } from '../content/elements';
import type { StatusId } from '../content/moves';
import type { Effect, Fighter } from '../sim/types';
import { effectBox } from '../sim/step';
import type { Pen } from './pen';
import { FLOOR_Y } from './arenas';

export const MAX_PARTICLES = 260;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: number;
  kind: 'spark' | 'dust' | 'ring' | 'dot' | 'line';
  grav: number;
}

export class Particles {
  list: Particle[] = [];
  reduced = false;

  add(p: Partial<Particle> & { x: number; y: number }): void {
    if (this.list.length >= MAX_PARTICLES) this.list.shift();
    this.list.push({ vx: 0, vy: 0, life: 20, size: 4, color: 0xffffff, kind: 'dot', grav: 0, ...p, max: p.life ?? 20 });
  }

  burst(x: number, y: number, color: number, n: number, speed: number, kind: Particle['kind'] = 'spark', life = 18): void {
    if (this.reduced) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const s = speed * (0.5 + Math.random() * 0.8);
      this.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life + Math.random() * 8, size: 3 + Math.random() * 3, color, kind, grav: kind === 'dust' ? -0.05 : 0.15 });
    }
  }

  ring(x: number, y: number, color: number, size: number, life = 16): void {
    this.add({ x, y, life, size, color, kind: 'ring' });
  }

  dust(x: number, y: number, n = 6): void {
    for (let i = 0; i < n; i++) this.add({ x: x + (Math.random() - 0.5) * 30, y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 1.6, life: 22, size: 5 + Math.random() * 5, color: 0xffffff, kind: 'dust' });
  }

  update(): void {
    for (const p of this.list) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.grav;
      p.vx *= 0.92;
      p.life--;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(pen: Pen): void {
    for (const p of this.list) {
      const t = p.life / p.max;
      if (p.kind === 'spark') pen.line(p.x, p.y, p.x - p.vx * 2.2, p.y - p.vy * 2.2, p.size * t + 1, p.color, Math.min(1, t * 1.4));
      else if (p.kind === 'ring') pen.circle(p.x, p.y, p.size * (1.6 - t), null, p.color, 4 * t + 1, t);
      else if (p.kind === 'dust') pen.circle(p.x, p.y, p.size * (1.4 - t * 0.5), 0xffffff, null, 0, t * 0.55);
      else pen.circle(p.x, p.y, p.size * t, p.color, null, 0, t);
    }
  }
}

/** Sim units (cpx, feet at y=0) to world pixels. */
export const wx = (x: number) => x / 100;
export const wy = (y: number) => FLOOR_Y + y / 100;

export function drawEffect(pen: Pen, e: Effect, time: number, parts: Particles, hitboxes: boolean): void {
  const [c, cl] = ELEMENTS[e.element].color;
  const [l, t, r, b] = effectBox(e).map((v, i) => (i % 2 === 0 ? wx(v) : wy(v)));
  const cx = (l! + r!) / 2;
  const cy = (t! + b!) / 2;
  const w = r! - l!;
  const h = b! - t!;
  const tele = e.delay > 0;
  const blink = 0.35 + 0.35 * Math.sin(time * 30);
  if (tele) {
    // telegraph: marker where it will land
    pen.line(l!, b! - 2, r!, b! - 2, 6, c, blink);
    pen.line(cx, b! - 10, cx, Math.max(t!, b! - 120), 2, c, blink * 0.7);
    if (hitboxes) pen.poly([l!, t!, r!, t!, r!, b!, l!, b!], 0xffff00, 0.15);
    return;
  }
  const wob = Math.sin(time * 20 + e.id) * 2;
  switch (e.look) {
    case 'fireball':
      pen.circle(cx - e.face * 10, cy, h * 0.42, cl, null, 0, 0.6);
      pen.circle(cx, cy, h * 0.5 + wob * 0.5, c, null);
      pen.circle(cx + e.face * 3, cy - 2, h * 0.25, 0xfff2b0, null);
      if (Math.random() < 0.6) parts.add({ x: cx - e.face * 14, y: cy + (Math.random() - 0.5) * 10, vx: -e.face * 1.5, vy: -0.6, life: 14, size: 5, color: c });
      break;
    case 'jet':
      pen.line(l! + 6, cy, r! - 6, cy, h, c, 0.9);
      pen.line(l! + 10, cy - 2, r! - 10, cy - 2, h * 0.35, cl, 0.9);
      break;
    case 'wave':
      pen.poly([l!, b!, cx - e.face * w * 0.1, t!, r!, b!], c, 0.85);
      pen.poly([l! + 8, b!, cx - e.face * w * 0.05, t! + 14, r! - 8, b!], cl, 0.7);
      break;
    case 'bubble':
      pen.circle(cx, cy, w * 0.5 + wob, null, c, 5, 0.9);
      pen.circle(cx - w * 0.15, cy - w * 0.15, w * 0.1, 0xffffff, null, 0, 0.9);
      break;
    case 'dart':
      pen.poly([cx + e.face * w * 0.5, cy, cx, cy - h * 0.6, cx - e.face * w * 0.5, cy, cx, cy + h * 0.6], c);
      pen.line(cx - e.face * w * 0.5, cy, cx - e.face * w * 1.6, cy, 3, cl, 0.7);
      break;
    case 'icewall':
      pen.poly([l!, b!, l!, t! + 10, cx, t!, r!, t! + 10, r!, b!], c, 0.85);
      pen.line(l! + 8, b! - 20, cx, t! + 20, 3, 0xffffff, 0.8);
      break;
    case 'frostburst': {
      const k = 1 - e.life / 20;
      pen.circle(cx, b! - 60, 40 + k * w * 0.5, null, c, 10 * (1 - k) + 2, 1 - k * 0.6);
      pen.circle(cx, b! - 60, 20 + k * w * 0.35, cl, null, 0, 0.35 * (1 - k));
      break;
    }
    case 'bolt': {
      let y = -200;
      let x = cx;
      while (y < b!) {
        const nx = cx + (Math.random() - 0.5) * w * 0.7;
        const ny = y + 50;
        pen.line(x, y, nx, ny, 9, c);
        pen.line(x, y, nx, ny, 3, 0xffffff);
        x = nx;
        y = ny;
      }
      pen.circle(cx, b!, 30, cl, null, 0, 0.6);
      break;
    }
    case 'blade':
      pen.line(cx - e.face * w * 0.5, cy + h * 0.6, cx + e.face * w * 0.5, cy - h * 0.6, 6, c);
      pen.line(cx - e.face * w * 0.3, cy + h * 0.5, cx + e.face * w * 0.55, cy - h * 0.2, 3, cl);
      break;
    case 'boulder':
      pen.circle(cx, cy, w * 0.5, c, 0x3a2a1a, 4);
      pen.circle(cx - w * 0.15, cy - w * 0.1, w * 0.12, cl, null);
      break;
    case 'quake':
      for (let i = 0; i < 4; i++) pen.line(cx - e.face * i * 16, b!, cx - e.face * i * 16 + e.face * 10, b! - 28 + i * 6, 6, c);
      parts.dust(cx, FLOOR_Y, 1);
      break;
    case 'mine':
      // a hidden mine: a faint burr on the floor
      pen.circle(cx, b! - 6, 9, c, 0x2a3a12, 2, 0.35 + 0.25 * Math.sin(time * 4));
      break;
    case 'roots':
      for (let x = l!; x < r!; x += 22) pen.line(x, b!, x + 8, b! - 30 - ((x * 7) % 30), 6, c);
      break;
    case 'lightball':
      pen.circle(cx, cy, h * 0.8, cl, null, 0, 0.5);
      pen.circle(cx, cy, h * 0.45, 0xffffff, null);
      break;
    case 'well':
      for (let i = 0; i < 3; i++) pen.circle(cx, b! - h * 0.4, (w * 0.2 + i * 20 + (time * 60) % 20) * (1 - i * 0.2), null, c, 4, 0.7 - i * 0.2);
      break;
    case 'press':
      pen.poly([l!, -100, r!, -100, r! - 10, b!, l! + 10, b!], c, 0.55);
      pen.line(l! + 10, b!, r! - 10, b!, 8, c);
      break;
    case 'zerog':
      pen.circle(cx, cy, w * 0.5, null, c, 4, 0.8);
      for (let i = 0; i < 6; i++) pen.circle(cx + Math.cos(time * 3 + i) * w * 0.35, cy + Math.sin(time * 3 + i) * w * 0.35, 4, cl, null);
      break;
    case 'field':
      pen.poly([l!, t!, r!, t!, r!, b!, l!, b!], c, 0.16);
      for (let i = 0; i < 6; i++) pen.line(l! + (w * i) / 6, b!, l! + (w * i) / 6, b! - 14, 3, c, 0.6);
      pen.circle(cx, t! + 30, 18, null, c, 3, 0.6);
      pen.line(cx, t! + 30, cx + Math.cos(time * 4) * 14, t! + 30 + Math.sin(time * 4) * 14, 3, c, 0.8);
      break;
    case 'clock':
      pen.circle(cx, cy, w * 0.5, 0xffffff, c, 4);
      pen.line(cx, cy, cx, cy - w * 0.35, 3, c);
      pen.line(cx, cy, cx + Math.cos(time * 12) * w * 0.3, cy + Math.sin(time * 12) * w * 0.3, 3, c);
      break;
    case 'pillar':
      pen.poly([l!, b!, l! + 10, t!, r! - 10, t!, r!, b!], c, 0.9);
      pen.poly([l! + 18, b!, l! + 26, t! + 40, r! - 26, t! + 40, r! - 18, b!], cl, 0.9);
      parts.add({ x: cx + (Math.random() - 0.5) * w, y: t! + 20, vy: -3, life: 16, size: 6, color: c });
      break;
    case 'firetrail':
      for (let x = l!; x < r!; x += 18) pen.circle(x, b! - 8 - Math.sin(time * 18 + x) * 4, 9, c, null, 0, 0.7);
      break;
    case 'spit':
      pen.circle(cx, cy, w * 0.5, 0x7fd14a, 0x355f1a, 3);
      break;
    default:
      pen.circle(cx, cy, Math.max(w, h) * 0.5, c, null, 0, 0.7);
  }
  if (hitboxes) pen.poly([l!, t!, r!, t!, r!, b!, l!, b!], 0xffff00, 0.2);
}

const STATUS_COLOR: Record<StatusId, number> = {
  burn: 0xff5a2c,
  slow: 0x7a8aa0,
  freeze: 0x7fe3ff,
  shock: 0xffd21f,
  root: 0x3fbf3a,
  weak: 0x9b6bff,
  float: 0xd6c4ff,
};

/** Overlays for statuses (shape cues plus colour) and the light barrier. */
export function drawStatusFx(pen: Pen, f: Fighter, headX: number, headY: number, time: number, parts: Particles): void {
  const x = wx(f.x);
  const y = wy(f.y);
  const s = (f.spec.scale ?? 100) / 100;
  let i = 0;
  for (const st of Object.keys(f.status) as StatusId[]) {
    if (f.status[st] <= 0) continue;
    const c = STATUS_COLOR[st];
    const ix = headX - 30 + i * 20;
    const iy = headY - 34 * s;
    i++;
    // small shape icon above the head
    switch (st) {
      case 'burn':
        pen.poly([ix, iy - 9, ix + 6, iy + 6, ix - 6, iy + 6], c);
        if (Math.random() < 0.3) parts.add({ x: x + (Math.random() - 0.5) * 30, y: y - Math.random() * 100 * s, vy: -1.5, life: 14, size: 5, color: c });
        break;
      case 'slow':
        pen.poly([ix - 7, iy - 5, ix + 7, iy - 5, ix, iy + 7], c);
        break;
      case 'freeze':
        pen.poly([x - 30 * s, y, x - 34 * s, y - 128 * s, x + 34 * s, y - 132 * s, x + 30 * s, y], c, 0.35);
        pen.line(x - 20 * s, y - 20 * s, x + 10 * s, y - 110 * s, 3, 0xffffff, 0.7);
        pen.line(ix - 7, iy, ix + 7, iy, 3, c);
        pen.line(ix, iy - 7, ix, iy + 7, 3, c);
        break;
      case 'shock':
        pen.line(ix - 5, iy - 8, ix + 2, iy, 3, c);
        pen.line(ix + 2, iy, ix - 2, iy + 2, 3, c);
        pen.line(ix - 2, iy + 2, ix + 5, iy + 9, 3, c);
        if (Math.random() < 0.4) pen.line(x - 20, y - 60 * s, x + 20, y - 80 * s, 2, c);
        break;
      case 'root':
        for (let k = -2; k <= 2; k++) pen.line(x + k * 9, y, x + k * 12, y - 26, 4, c);
        pen.line(ix - 6, iy + 6, ix + 6, iy - 6, 3, c);
        break;
      case 'weak':
        pen.line(ix, iy - 7, ix, iy + 7, 3, c);
        pen.line(ix - 5, iy + 2, ix, iy + 7, 3, c);
        pen.line(ix + 5, iy + 2, ix, iy + 7, 3, c);
        break;
      case 'float':
        pen.circle(ix, iy, 6, null, c, 2);
        pen.circle(x + Math.sin(time * 4) * 20, y - 40 * s - ((time * 40) % 60), 5, null, c, 2, 0.7);
        break;
    }
  }
  if (f.barrier > 0) pen.circle(x, y - 62 * s, 74 * s, null, 0xffe46b, 4, 0.55 + 0.25 * Math.sin(time * 8));
}
