// The effects system. Shared by the fight (Phaser) and the canvas previews (style picker, Power Lab, lobby cards).
// It only READS sim state and events; nothing here can change gameplay or determinism. Its own randomness is a
// seeded generator, so the Power Lab contact sheets are reproducible.
//
// Every power has 4 phases:
//   1. anticipation  charge-up on the caster: gathering element particles, glowing hands, a ground rune, spotlight
//   2. cast          a burst flash, ring and smear lines on the release frame
//   3. travel/area   the effect itself, layered (additive glow + core + element particles + floor light + decals)
//   4. impact        hit flash, shockwave rings, element debris, freeze-frame and shake requests, lingering statuses
// Element visual languages are in EMIT (particles) and the look drawers below. Each power has its own look or move
// drawer plus per-power charge parameters, so no two powers draw the same.

import type { ElementId } from '../content/elements';
import { powersFor, mechanicOf } from '../content/powers';
import type { MoveDef, StatusId } from '../content/moves';
import { getMove, effectBox, fighterById } from '../sim/step';
import type { Effect, Ev, Fighter, Match } from '../sim/types';
import { FLOOR_Y } from './arenas';
import { drawStick, POSES, solve, type Joints } from './rig';
import { lookOf } from './fighterView';
import type { Pen } from './pen';
import type { ArenaReact } from './arenaReact';

export const wx = (x: number) => x / 100;
export const wy = (y: number) => FLOOR_Y + y / 100;

// ---- seeded randomness (render only) --------------------------------------------------------------------------
let seed = 12345;
const R = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const RS = () => R() * 2 - 1;
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ---- particles: one pooled structure-of-arrays, no per-frame allocation ---------------------------------------
const enum K {
  Dot, Glow, Streak, Shard, Chunk, Petal, Smoke, Ring, Drop, Star, Arc, Flame, Tick, Slash, Leaf,
}
const MAXP = 900;

class Pool {
  n = 0;
  x = new Float32Array(MAXP);
  y = new Float32Array(MAXP);
  vx = new Float32Array(MAXP);
  vy = new Float32Array(MAXP);
  life = new Float32Array(MAXP);
  max = new Float32Array(MAXP);
  size = new Float32Array(MAXP);
  rot = new Float32Array(MAXP);
  vr = new Float32Array(MAXP);
  grav = new Float32Array(MAXP);
  drag = new Float32Array(MAXP);
  color = new Uint32Array(MAXP);
  kind = new Uint8Array(MAXP);
  cap = MAXP;

  add(kind: K, x: number, y: number, vx: number, vy: number, life: number, size: number, color: number, grav = 0, drag = 0.94, rot = 0, vr = 0): void {
    let i = this.n;
    if (i >= this.cap) {
      // overwrite a random old particle instead of growing
      i = Math.floor(R() * this.cap);
    } else this.n++;
    this.kind[i] = kind;
    this.x[i] = x;
    this.y[i] = y;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.life[i] = life;
    this.max[i] = life;
    this.size[i] = size;
    this.color[i] = color;
    this.grav[i] = grav;
    this.drag[i] = drag;
    this.rot[i] = rot;
    this.vr[i] = vr;
  }

  update(): void {
    let w = 0;
    for (let i = 0; i < this.n; i++) {
      const l = this.life[i]! - 1;
      if (l <= 0) continue;
      if (w !== i) {
        this.kind[w] = this.kind[i]!;
        this.x[w] = this.x[i]!;
        this.y[w] = this.y[i]!;
        this.vx[w] = this.vx[i]!;
        this.vy[w] = this.vy[i]!;
        this.max[w] = this.max[i]!;
        this.size[w] = this.size[i]!;
        this.color[w] = this.color[i]!;
        this.grav[w] = this.grav[i]!;
        this.drag[w] = this.drag[i]!;
        this.rot[w] = this.rot[i]!;
        this.vr[w] = this.vr[i]!;
      }
      this.life[w] = l;
      this.vx[w] = this.vx[w]! * this.drag[w]!;
      this.vy[w] = this.vy[w]! * this.drag[w]! + this.grav[w]!;
      this.x[w] = this.x[w]! + this.vx[w]!;
      this.y[w] = this.y[w]! + this.vy[w]!;
      this.rot[w] = this.rot[w]! + this.vr[w]!;
      if (this.kind[w] !== K.Tick && this.y[w]! > FLOOR_Y + 4 && this.grav[w]! > 0) {
        // bounce once on the floor and settle
        this.y[w] = FLOOR_Y + 4;
        this.vy[w] = -this.vy[w]! * 0.3;
        this.vx[w] = this.vx[w]! * 0.6;
      }
      w++;
    }
    this.n = w;
  }

  draw(pen: Pen, additive: boolean): void {
    for (let i = 0; i < this.n; i++) {
      const k = this.kind[i]!;
      const isAdd = k === K.Glow || k === K.Streak || k === K.Ring || k === K.Star || k === K.Arc || k === K.Slash || k === K.Flame;
      if (isAdd !== additive) continue;
      const t = this.life[i]! / this.max[i]!;
      const x = this.x[i]!;
      const y = this.y[i]!;
      const s = this.size[i]!;
      const c = this.color[i]!;
      const r = this.rot[i]!;
      switch (k) {
        case K.Dot:
          pen.circle(x, y, s * (0.3 + 0.7 * t), c, null, 0, Math.min(1, t * 1.6));
          break;
        case K.Glow:
          if (pen.glow) pen.glow(x, y, s * (0.5 + 0.5 * t), c, t * 0.9);
          else pen.circle(x, y, s * 0.5 * t, c, null, 0, t * 0.6);
          break;
        case K.Streak:
          pen.line(x, y, x - this.vx[i]! * 2.4, y - this.vy[i]! * 2.4, s * t + 0.8, c, Math.min(1, t * 1.5));
          break;
        case K.Shard: {
          const cs = Math.cos(r) * s;
          const sn = Math.sin(r) * s;
          pen.poly([x + cs, y + sn, x - sn * 0.45, y + cs * 0.45, x - cs * 0.7, y - sn * 0.7], c, Math.min(1, t * 2));
          break;
        }
        case K.Chunk: {
          const cs = Math.cos(r) * s;
          const sn = Math.sin(r) * s;
          pen.poly([x + cs, y + sn, x - sn, y + cs, x - cs, y - sn, x + sn, y - cs], c, Math.min(1, t * 3));
          break;
        }
        case K.Petal: {
          const cs = Math.cos(r) * s;
          const sn = Math.sin(r) * s * 0.45;
          pen.poly([x + cs, y + sn, x - sn, y + cs * 0.45, x - cs, y - sn, x + sn, y - cs * 0.45], c, Math.min(1, t * 2));
          break;
        }
        case K.Leaf: {
          const cs = Math.cos(r) * s;
          const sn = Math.sin(r) * s;
          pen.poly([x + cs, y + sn, x - sn * 0.4, y + cs * 0.4, x - cs, y - sn, x + sn * 0.4, y - cs * 0.4], c, Math.min(1, t * 2));
          pen.line(x - cs, y - sn, x + cs, y + sn, 1.2, 0x1f5e1c, t * 0.8);
          break;
        }
        case K.Smoke:
          pen.circle(x, y, s * (1.6 - t * 0.8), c, null, 0, t * 0.35);
          break;
        case K.Ring:
          pen.circle(x, y, s * (1.15 - t), null, c, Math.max(1, 6 * t), t);
          break;
        case K.Drop:
          pen.circle(x, y, s * (0.5 + 0.5 * t), c, null, 0, Math.min(1, t * 2));
          pen.line(x, y, x - this.vx[i]! * 1.2, y - this.vy[i]! * 1.2, s * 0.8, c, t * 0.6);
          break;
        case K.Star: {
          const l = s * (0.4 + 0.6 * Math.sin(t * Math.PI));
          pen.line(x - l, y, x + l, y, 2, c, t);
          pen.line(x, y - l, x, y + l, 2, c, t);
          pen.line(x - l * 0.4, y - l * 0.4, x + l * 0.4, y + l * 0.4, 1.4, c, t * 0.7);
          pen.line(x - l * 0.4, y + l * 0.4, x + l * 0.4, y - l * 0.4, 1.4, c, t * 0.7);
          break;
        }
        case K.Arc: {
          // a small jagged static arc, re-jagged every frame
          let px = x;
          let py = y;
          const dx = Math.cos(r) * s;
          const dy = Math.sin(r) * s;
          for (let j = 1; j <= 4; j++) {
            const nx = x + (dx * j) / 4 + RS() * s * 0.25;
            const ny = y + (dy * j) / 4 + RS() * s * 0.25;
            pen.line(px, py, nx, ny, 2.4 * t + 0.6, c, t);
            px = nx;
            py = ny;
          }
          break;
        }
        case K.Flame: {
          // a flame tongue: a teardrop pointing up, wobbling
          const w = s * (0.5 + 0.5 * t);
          const top = y - s * 2.2 * (0.6 + 0.4 * t);
          const sway = Math.sin(r) * s * 0.5;
          pen.poly([x - w, y, x + sway, top, x + w, y, x, y + w * 0.6], c, t * 0.85);
          break;
        }
        case K.Tick: {
          // a tick mark orbiting a center (x, y) at radius vx, angle rot
          const rad = this.vx[i]!;
          const ax = x + Math.cos(r) * rad;
          const ay = y + Math.sin(r) * rad;
          pen.line(ax, ay, x + Math.cos(r) * (rad - s), y + Math.sin(r) * (rad - s), 3, c, t);
          break;
        }
        case K.Slash: {
          // a curved slash: arc of radius s from angle rot sweeping vr*8
          let pa = r;
          const sweep = this.vr[i]! * 8;
          let px = x + Math.cos(pa) * s;
          let py = y + Math.sin(pa) * s;
          for (let j = 1; j <= 6; j++) {
            pa = r + (sweep * j) / 6;
            const nx = x + Math.cos(pa) * s;
            const ny = y + Math.sin(pa) * s;
            pen.line(px, py, nx, ny, (4 - Math.abs(j - 3)) * t + 0.5, c, t);
            px = nx;
            py = ny;
          }
          break;
        }
      }
    }
  }
}

// ---- element palettes and visual languages ---------------------------------------------------------------------
interface Pal {
  main: number;
  light: number;
  hot: number;
  dark: number;
}
const PAL: Record<ElementId, Pal> = {
  fire: { main: 0xff6a1f, light: 0xffd23a, hot: 0xfff2b0, dark: 0x8a1f0a },
  water: { main: 0x22c8ff, light: 0xc0f2ff, hot: 0xeefcff, dark: 0x0a4a8a },
  ice: { main: 0xb8e6ff, light: 0xffffff, hot: 0xffffff, dark: 0x2a6f9a },
  lightning: { main: 0xffd21f, light: 0xfff6a8, hot: 0xffffff, dark: 0x8a6a00 },
  wind: { main: 0x6ef0b0, light: 0xd8fff0, hot: 0xffffff, dark: 0x1f7a4a },
  earth: { main: 0xd88a38, light: 0xffd08a, hot: 0xfff0d0, dark: 0x5a3a1a },
  leaf: { main: 0x6ee05a, light: 0xd4ff9a, hot: 0xf2ffd8, dark: 0x1f5e1c },
  light: { main: 0xffe8a0, light: 0xffffff, hot: 0xffffff, dark: 0xb08a1f },
  gravity: { main: 0xc04cff, light: 0xf0c8ff, hot: 0xfbeaff, dark: 0x3a1060 },
  time: { main: 0x2fe0c8, light: 0xc8fff4, hot: 0xffffff, dark: 0x0f5a50 },
};
export const palOf = (el: ElementId) => PAL[el];

/** Element particle languages. `mode`: 0 trail, 1 burst, 2 charge (toward x,y), 3 ambient. */
function emit(P: Pool, el: ElementId, mode: 0 | 1 | 2 | 3, x: number, y: number, n: number, power = 1, dir = 0): void {
  const p = PAL[el];
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2;
    const sp = (mode === 1 ? 3 + R() * 6 : 0.6 + R() * 1.6) * power;
    // charge particles start away and fly toward (x, y)
    const ox = mode === 2 ? Math.cos(a) * (40 + R() * 50) * power : RS() * 6;
    const oy = mode === 2 ? Math.sin(a) * (40 + R() * 50) * power : RS() * 6;
    const cvx = mode === 2 ? -ox / 14 : Math.cos(a) * sp - dir * (mode === 0 ? 1.2 : 0);
    const cvy = mode === 2 ? -oy / 14 : Math.sin(a) * sp;
    const X = x + ox;
    const Y = y + oy;
    switch (el) {
      case 'fire':
        if (R() < 0.5) P.add(K.Flame, X, Y, cvx * 0.3, -1 - R() * 1.5, 14 + R() * 10, 5 + R() * 5 * power, R() < 0.5 ? p.main : p.light, -0.03, 0.95, R() * 6, 0.4);
        else P.add(K.Glow, X, Y, cvx * 0.5, cvy * 0.5 - 1.2, 16 + R() * 14, 10 + R() * 8, R() < 0.3 ? p.hot : p.light, -0.05, 0.95);
        break;
      case 'water':
        if (R() < 0.6) P.add(K.Drop, X, Y, cvx, cvy - (mode === 1 ? 2 : 0), 20 + R() * 12, 2.5 + R() * 2.5, R() < 0.5 ? p.light : p.main, mode === 2 ? 0 : 0.28, 0.97);
        else P.add(K.Slash, X, Y, 0, 0, 12, 10 + R() * 14, p.light, 0, 1, a, 0.18 + R() * 0.12);
        break;
      case 'ice':
        if (R() < 0.55) P.add(K.Shard, X, Y, cvx, cvy, 18 + R() * 12, 4 + R() * 5 * power, R() < 0.5 ? p.light : p.main, mode === 1 ? 0.18 : 0, 0.95, a, RS() * 0.2);
        else if (R() < 0.5) P.add(K.Star, X, Y, cvx * 0.2, cvy * 0.2, 14 + R() * 10, 5 + R() * 5, p.hot, 0, 0.9);
        else P.add(K.Smoke, X, Y, cvx * 0.3, cvy * 0.3 - 0.2, 26, 8 + R() * 8, p.light, -0.01, 0.95);
        break;
      case 'lightning':
        if (R() < 0.6) P.add(K.Arc, X, Y, cvx * 0.4, cvy * 0.4, 6 + R() * 6, 14 + R() * 18 * power, R() < 0.5 ? p.hot : p.main, 0, 0.9, a);
        else P.add(K.Streak, X, Y, cvx * 1.6, cvy * 1.6, 8 + R() * 6, 2.5, p.light, 0, 0.9);
        break;
      case 'wind':
        if (R() < 0.55) P.add(K.Slash, X, Y, cvx * 0.6, cvy * 0.6, 14 + R() * 8, 14 + R() * 22 * power, R() < 0.5 ? p.light : p.main, 0, 0.95, a, 0.22 + R() * 0.15);
        else if (R() < 0.5) P.add(K.Leaf, X, Y, cvx, cvy, 30, 4 + R() * 3, 0x9ad97a, 0.02, 0.96, a, RS() * 0.3);
        else P.add(K.Smoke, X, Y, cvx * 0.5, cvy * 0.5, 22, 6 + R() * 6, 0xe8f5ff, 0, 0.94);
        break;
      case 'earth':
        if (R() < 0.6) P.add(K.Chunk, X, Y, cvx, cvy - (mode === 1 ? 3 : 0), 30 + R() * 16, 3 + R() * 5 * power, R() < 0.5 ? p.main : p.dark, mode === 2 ? 0 : 0.35, 0.97, a, RS() * 0.3);
        else P.add(K.Smoke, X, Y, cvx * 0.4, cvy * 0.4 - 0.3, 34, 10 + R() * 12, p.light, -0.01, 0.94);
        break;
      case 'leaf':
        if (R() < 0.6) P.add(K.Leaf, X, Y, cvx, cvy, 30 + R() * 16, 4 + R() * 4 * power, R() < 0.6 ? p.main : p.light, 0.03, 0.96, a, RS() * 0.25);
        else P.add(K.Petal, X, Y, cvx, cvy, 28 + R() * 12, 3 + R() * 3, R() < 0.5 ? 0xff9ad0 : 0xfff2a8, 0.02, 0.96, a, RS() * 0.3);
        break;
      case 'light':
        if (R() < 0.45) P.add(K.Star, X, Y, cvx * 0.4, cvy * 0.4, 16 + R() * 10, 6 + R() * 8 * power, p.hot, 0, 0.92);
        else if (R() < 0.5) P.add(K.Streak, X, Y, cvx * 2, cvy * 2, 10, 3, p.light, 0, 0.92);
        else P.add(K.Glow, X, Y, cvx * 0.5, cvy * 0.5, 16, 12 + R() * 10, p.main, 0, 0.94);
        break;
      case 'gravity':
        if (mode === 1 || R() < 0.4) P.add(K.Chunk, X, Y, cvx * 0.4, mode === 1 ? cvy * 0.5 : -0.5 - R(), 34 + R() * 20, 3 + R() * 4, R() < 0.5 ? p.dark : p.main, -0.02, 0.97, a, RS() * 0.1);
        else if (R() < 0.5) P.add(K.Ring, x, y, 0, 0, 18, 30 + R() * 30 * power, p.light, 0, 1);
        else P.add(K.Glow, X, Y, cvx * 0.3, cvy * 0.3, 18, 12 + R() * 10, p.main, 0, 0.95);
        break;
      case 'time':
        if (R() < 0.5) P.add(K.Tick, x, y, 30 + R() * 30 * power, 0, 18 + R() * 10, 6, R() < 0.5 ? p.light : p.main, 0, 1, a, (R() < 0.5 ? 1 : -1) * 0.12);
        else if (R() < 0.5) P.add(K.Glow, X, Y, cvx * 0.3, cvy * 0.3, 18, 10 + R() * 8, p.main, 0, 0.95);
        else P.add(K.Dot, X, Y, cvx * 0.2, 0.6 + R(), 30, 2 + R() * 2, 0xffe8a8, 0.02, 0.98);
        break;
    }
  }
}

// ---- ground decals ------------------------------------------------------------------------------------------------
interface Decal {
  x: number;
  w: number;
  life: number;
  max: number;
  el: ElementId;
  k: number;
}

// ---- per-power charge parameters (unique per power id) ------------------------------------------------------------
interface ChargeSpec {
  glyphs: number;
  spin: number;
  ringR: number;
  hand: 'a' | 'b' | 'both';
  pillar: boolean;
  mix: number;
}
const chargeCache = new Map<string, ChargeSpec>();
function chargeOf(mv: MoveDef): ChargeSpec {
  let c = chargeCache.get(mv.id);
  if (!c) {
    const h = hashStr(mv.id);
    const sup = mv.id.endsWith('3');
    c = {
      glyphs: 3 + (h % 6),
      spin: ((h >>> 3) % 2 ? 1 : -1) * (0.04 + ((h >>> 5) % 5) * 0.02),
      ringR: 42 + ((h >>> 8) % 4) * 10 + (sup ? 30 : 0),
      hand: (['a', 'b', 'both'] as const)[(h >>> 11) % 3]!,
      pillar: sup || (h >>> 14) % 4 === 0,
      mix: ((h >>> 17) % 100) / 100,
    };
    chargeCache.set(mv.id, c);
  }
  return c;
}

/** Render-side requests for the fight scene (it decides what to do with them). */
export interface FxRequests {
  freeze: number;
  shake: number;
  push: number;
  pushX: number;
  flash: number;
  flashColor: number;
  cutin: { name: string; element: ElementId; who: number } | null;
}

interface Ghost {
  j: Float32Array;
  n: number;
  head: number;
}
const GHOSTS = 6;

export class FxRenderer {
  private P = new Pool();
  private decals: Decal[] = [];
  private ghosts = new Map<number, Ghost>();
  private lastMf = new Map<number, number>();
  private castFlash = new Map<number, number>();
  /** 0.3 to 1: scales particle counts (adaptive quality and the low graphics setting) */
  quality = 1;
  reduced = false;
  hitboxes = false;
  /** the arena's reaction state (set by the fight scene or a preview); powers make the arena respond */
  react: ArenaReact | null = null;
  req: FxRequests = { freeze: 0, shake: 0, push: 0, pushX: 0, flash: 0, flashColor: 0xffffff, cutin: null };
  /** render-only copies of big strikes that sink into the floor after the sim removes them */
  private linger: { e: Effect; t: number }[] = [];
  private dimK = 0;
  private spotX = 0;
  private spotY = 0;

  reset(s = 12345): void {
    seed = s;
    this.P.n = 0;
    this.decals.length = 0;
    this.linger.length = 0;
    this.ghosts.clear();
    this.lastMf.clear();
    this.castFlash.clear();
    this.req = { freeze: 0, shake: 0, push: 0, pushX: 0, flash: 0, flashColor: 0xffffff, cutin: null };
  }

  /** Called with the frame time so the particle budget follows the device. */
  adapt(ms: number, low: boolean, last = ms): void {
    if (low) this.quality = 0.35;
    else if (last > 22) this.quality = Math.max(0.3, this.quality - 0.06);
    else if (ms > 17.5) this.quality = Math.max(0.3, this.quality - 0.03);
    else if (ms < 15.5) this.quality = Math.min(1, this.quality + 0.005);
    this.P.cap = Math.max(160, Math.floor(MAXP * this.quality));
  }

  private q(n: number): number {
    const v = n * this.quality * (this.reduced ? 0.5 : 1);
    return Math.floor(v) + (R() < v % 1 ? 1 : 0);
  }

  // ---- events -> impacts ---------------------------------------------------------------------------------------
  events(m: Match, evs: Ev[]): void {
    for (const e of evs) {
      switch (e.t) {
        case 'hit': {
          const x = wx(e.x);
          const y = wy(e.y);
          const el = e.el;
          if (e.perfect) {
            this.P.add(K.Ring, x, y, 0, 0, 22, 90, 0xffd84a);
            this.P.add(K.Ring, x, y, 0, 0, 14, 50, 0xffffff);
            this.P.add(K.Glow, x, y, 0, 0, 14, 80, 0xffd84a);
            for (let i = 0; i < this.q(14); i++) this.P.add(K.Star, x + RS() * 30, y + RS() * 30, RS() * 3, RS() * 3, 18, 8, 0xfff2a8);
            this.req.freeze = Math.max(this.req.freeze, 5);
            break;
          }
          if (e.guarded) {
            for (let i = 0; i < this.q(8); i++) this.P.add(K.Streak, x, y, RS() * 6, RS() * 6, 10, 2, 0x9fd8ff);
            this.P.add(K.Ring, x, y, 0, 0, 10, 34, 0x9fd8ff);
            break;
          }
          if (!el) {
            // basic hit: white sparks and a small ring
            for (let i = 0; i < this.q(e.heavy ? 12 : 7); i++) this.P.add(K.Streak, x, y, RS() * 8, RS() * 8, 9 + R() * 5, 3, 0xffffff);
            this.P.add(K.Ring, x, y, 0, 0, 12, e.heavy ? 54 : 32, 0xffffff);
            this.P.add(K.Glow, x, y, 0, 0, 8, e.heavy ? 60 : 36, 0xffffff);
            if (e.heavy) this.req.freeze = Math.max(this.req.freeze, 3);
            break;
          }
          // power impact: flash, two shockwaves, element debris, decal, freeze-frame scaled to damage
          const p = PAL[el];
          const big = Math.min(1.6, 0.6 + e.dmg / 80);
          this.react?.trigger(el, x, y, Math.min(1.5, 0.5 + e.dmg / 90));
          this.P.add(K.Glow, x, y, 0, 0, 12, 56 * big, p.hot);
          this.P.add(K.Glow, x, y, 0, 0, 20, 100 * big, p.main);
          this.P.add(K.Ring, x, y, 0, 0, 16, 70 * big, p.hot);
          this.P.add(K.Ring, x, y, 0, 0, 26, 120 * big, p.main);
          for (let i = 0; i < this.q(8 * big); i++) {
            const a = R() * Math.PI * 2;
            this.P.add(K.Streak, x, y, Math.cos(a) * (6 + R() * 8), Math.sin(a) * (6 + R() * 8), 10, 3, p.light);
          }
          emit(this.P, el, 1, x, y, this.q(10 * big), big);
          if (y > FLOOR_Y - 140) this.decal(x, 40 + 50 * big, el, 0, 160);
          this.req.freeze = Math.max(this.req.freeze, Math.min(6, 3 + Math.floor(e.dmg / 45)));
          this.req.shake = Math.max(this.req.shake, Math.min(20, 4 + e.dmg / 7));
          this.req.flash = Math.max(this.req.flash, Math.min(0.3, e.dmg / 400));
          this.req.flashColor = p.light;
          break;
        }
        case 'power': {
          const f = fighterById(m, e.who);
          const mv = getMove(e.move);
          if (!f || !mv?.element) break;
          const slot = powersFor(f.spec.element, f.spec.archetype).findIndex((x) => x.id === mv.id);
          if (slot === 2 && f.spec.kind === 'stick') this.req.cutin = { name: mv.name, element: f.spec.element, who: f.id };
          if (slot === 2) this.react?.super(PAL[mv.element].main);
          this.react?.trigger(mv.element, wx(f.x), wy(f.y) - 60, 0.35);
          this.req.push = Math.max(this.req.push, slot === 2 ? 0.1 : 0.04);
          this.req.pushX = wx(f.x);
          break;
        }
        case 'counter': {
          const f = fighterById(m, e.who);
          if (!f) break;
          const p = PAL[f.spec.element];
          const x = wx(f.x);
          const y = wy(f.y) - 70;
          this.P.add(K.Glow, x, y, 0, 0, 16, 130, p.hot);
          for (let i = 0; i < 3; i++) this.P.add(K.Ring, x, y, 0, 0, 14 + i * 6, 60 + i * 40, i ? p.main : 0xffffff);
          emit(this.P, f.spec.element, 1, x, y, this.q(18), 1.3);
          this.req.freeze = Math.max(this.req.freeze, 6);
          this.req.shake = Math.max(this.req.shake, 10);
          break;
        }
        case 'buff': {
          const f = fighterById(m, e.who);
          if (!f) break;
          const p = PAL[f.spec.element];
          const x = wx(f.x);
          for (let i = 0; i < 4; i++) this.P.add(K.Ring, x, wy(f.y) - 60, 0, 0, 16 + i * 6, 50 + i * 30, i % 2 ? p.light : p.main);
          for (let i = 0; i < this.q(20); i++) this.P.add(K.Streak, x + RS() * 30, wy(f.y), RS() * 0.5, -6 - R() * 6, 16, 3, p.light);
          break;
        }
        case 'decoy': {
          const f = fighterById(m, e.who);
          if (!f) break;
          const x = wx(e.x);
          for (let i = 0; i < this.q(16); i++) this.P.add(K.Smoke, x + RS() * 30, FLOOR_Y - R() * 120, RS() * 1.5, -R(), 34, 12 + R() * 10, PAL[f.spec.element].light, 0, 0.94);
          emit(this.P, f.spec.element, 1, x, FLOOR_Y - 60, this.q(8), 0.8);
          break;
        }
        case 'barrier': {
          const f = fighterById(m, e.who);
          if (!f) break;
          const x = wx(f.x);
          const y = wy(f.y) - 62;
          for (let i = 0; i < this.q(12); i++) this.P.add(K.Shard, x + RS() * 60, y + RS() * 60, RS() * 5, RS() * 5, 22, 7, 0xfff4b0, 0.2, 0.95, R() * 6, RS() * 0.3);
          this.P.add(K.Ring, x, y, 0, 0, 18, 110, 0xffe46b);
          break;
        }
        case 'ko': {
          const f = fighterById(m, e.who);
          if (!f) break;
          const p = PAL[f.spec.element];
          this.P.add(K.Glow, wx(f.x), wy(f.y) - 60, 0, 0, 24, 160, p.main);
          emit(this.P, f.spec.element, 1, wx(f.x), wy(f.y) - 60, this.q(20), 1.4);
          break;
        }
        case 'swap': {
          const f = fighterById(m, e.to);
          if (!f) break;
          const p = PAL[f.spec.element];
          for (let i = 0; i < this.q(14); i++) this.P.add(K.Streak, wx(f.x) + RS() * 20, FLOOR_Y, RS() * 1, -8 - R() * 8, 14, 3, p.light);
          this.P.add(K.Ring, wx(f.x), FLOOR_Y - 60, 0, 0, 16, 80, 0xffffff);
          break;
        }
        case 'land':
        case 'dash':
        case 'jump': {
          const f = fighterById(m, e.who);
          if (!f) break;
          for (let i = 0; i < this.q(e.t === 'land' ? 6 : 4); i++) this.P.add(K.Smoke, wx(f.x) + RS() * 20, FLOOR_Y - 4, RS() * 2.5, -R() * 1.2, 22, 6 + R() * 6, 0xffffff, -0.01, 0.9);
          break;
        }
      }
    }
  }

  private decal(x: number, w: number, el: ElementId, k: number, life: number): void {
    if (this.decals.length > 40) this.decals.shift();
    this.decals.push({ x, w, life, max: life, el, k });
  }

  update(): void {
    this.P.update();
    for (const d of this.decals) d.life--;
    if (this.decals.length && this.decals[0]!.life <= 0) this.decals = this.decals.filter((d) => d.life > 0);
    this.req.flash *= 0.85;
  }

  // ---- layer 1: under fighters (dim + spotlight, floor light, decals, ground effects, ghosts) -----------------------
  drawUnder(pen: Pen, m: Match, time: number): void {
    // spotlight on a caster charging a power: dim everything a little, light the caster
    let dim = 0;
    for (const f of m.fighters) {
      if (!f.onField || f.st !== 'move' || !f.move) continue;
      const mv = getMove(f.move);
      if (!mv?.element || f.mf > mv.startup + 4) continue;
      const k = Math.min(1, f.mf / Math.max(1, mv.startup));
      if (k > dim) {
        dim = k;
        this.spotX = wx(f.x);
        this.spotY = wy(f.y) - 60;
      }
    }
    this.dimK += ((this.reduced ? dim * 0.4 : dim) - this.dimK) * 0.25;
    if (this.dimK > 0.02) {
      pen.poly([-600, -900, 1880, -900, 1880, 1500, -600, 1500], 0x05081a, 0.22 * this.dimK);
      pen.glow?.(this.spotX, this.spotY, 220, 0xffffff, 0.22 * this.dimK);
    }
    // decals on the floor
    for (const d of this.decals) this.drawDecal(pen, d, time);
    // floor light under every bright effect
    pen.add?.(true);
    for (const e of m.effects) {
      if (e.delay > 0) continue;
      const p = PAL[e.element];
      const x = wx(e.x);
      const h = Math.max(0, -e.y / 100);
      const a = Math.max(0, 0.35 - h / 900);
      if (a > 0.02) pen.glow?.(x, FLOOR_Y + 4, 90 + e.w * 0.4, p.main, a);
    }
    pen.add?.(false);
    // ground effects
    for (const e of m.effects) if (isGround(e)) this.drawEffect(pen, m, e, time);
  }

  /** Before the fighter's body: afterimages and the charge rune on the ground. */
  drawBehindFighter(pen: Pen, m: Match, f: Fighter, time: number): void {
    const g = this.ghosts.get(f.id);
    if (g && g.n > 0) {
      const look = lookOf(f);
      const col = PAL[f.spec.element].main;
      for (let k = 0; k < g.n; k++) {
        const idx = (g.head - 1 - k + GHOSTS) % GHOSTS;
        const a = (0.32 * (g.n - k)) / g.n;
        drawGhost(pen, g.j, idx * 24, look.thick, col, a);
      }
    }
    if (f.st === 'move' && f.move) {
      const mv = getMove(f.move);
      if (mv?.element && f.mf <= mv.startup + 2) {
        const c = chargeOf(mv);
        const k = Math.min(1, f.mf / Math.max(1, mv.startup));
        const p = PAL[mv.element];
        const x = wx(f.x);
        const r = c.ringR * (0.6 + 0.4 * k);
        // ground rune ring with glyph ticks
        pen.add?.(true);
        pen.circle(x, FLOOR_Y, r, null, p.main, 3, 0.6 * k);
        pen.circle(x, FLOOR_Y, r * 0.7, null, p.light, 2, 0.4 * k);
        for (let i = 0; i < c.glyphs; i++) {
          const a = time * c.spin * 60 + (i / c.glyphs) * Math.PI * 2;
          const gx = x + Math.cos(a) * r * 0.85;
          const gy = FLOOR_Y + Math.sin(a) * r * 0.22;
          pen.line(gx - 4, gy, gx + 4, gy - 6, 2.5, p.light, 0.8 * k);
        }
        if (c.pillar) pen.glow?.(x, wy(f.y) - 70, 110 * k, p.main, 0.35 * k);
        pen.add?.(false);
      }
    }
    void m;
  }

  /** After the fighter's body: charge glow, cast burst, move visuals, buffs, counters, statuses. Records ghosts. */
  drawOnFighter(pen: Pen, m: Match, f: Fighter, j: Joints, time: number): void {
    const x = wx(f.x);
    const y = wy(f.y);
    const s = (f.spec.scale ?? 100) / 100;
    const mv = f.st === 'move' && f.move ? getMove(f.move) : undefined;
    // afterimages while dashing, blinking or rushing
    const fast = f.st === 'dash' || (mv && (mv.selfVx ?? 0) >= 900 && f.mf <= mv.startup + mv.active) || (mv?.special === 'teleportBehind' && f.mf <= mv.startup + 6);
    this.recordGhost(f, j, !!fast);
    if (mv?.element) {
      const p = PAL[mv.element];
      const c = chargeOf(mv);
      const k = Math.min(1, f.mf / Math.max(1, mv.startup));
      const active = f.mf > mv.startup && f.mf <= mv.startup + mv.active;
      pen.add?.(true);
      if (f.mf <= mv.startup) {
        // 1. anticipation: glowing hands and gathering particles
        const hands: [number, number][] = c.hand === 'both' ? [j.aHand, j.bHand] : c.hand === 'a' ? [j.aHand] : [j.bHand];
        for (const hh of hands) {
          pen.glow?.(hh[0], hh[1], 18 + 30 * k, p.main, 0.5 + 0.4 * k);
          pen.glow?.(hh[0], hh[1], 8 + 12 * k, p.hot, 0.8);
          if (R() < 0.8 * this.quality) emit(this.P, mv.element, 2, hh[0], hh[1], 1, 0.6 + 0.6 * k);
        }
        if (c.pillar && R() < 0.5 * this.quality) emit(this.P, mv.element, 3, x + RS() * 30, y - R() * 140, 1, 0.8);
      }
      // 2. cast: burst on the release frame (detected render-side from the move frame)
      const last = this.lastMf.get(f.id) ?? -1;
      if (f.mf === mv.startup + 1 || (last <= mv.startup && f.mf > mv.startup && f.mf <= mv.startup + 3 && last >= 0)) {
        const hx = (j.aHand[0] + j.bHand[0]) / 2;
        const hy = (j.aHand[1] + j.bHand[1]) / 2;
        this.P.add(K.Glow, hx, hy, 0, 0, 10, 90, p.hot);
        this.P.add(K.Ring, hx, hy, 0, 0, 14, 60 + c.ringR * 0.5, p.light);
        for (let i = 0; i < this.q(10); i++) {
          const a = (i / 10) * Math.PI * 2 + c.mix;
          this.P.add(K.Streak, hx, hy, Math.cos(a) * 9, Math.sin(a) * 9, 9, 3, p.light);
        }
        emit(this.P, mv.element, 1, hx, hy, this.q(8), 1);
        this.castFlash.set(f.id, 8);
      }
      // the move itself (melee, beams, dashes, flurries, launchers, stances)
      if (active || mv.special === 'counter') this.drawMoveFx(pen, f, mv, j, time);
      pen.add?.(false);
    }
    this.lastMf.set(f.id, f.st === 'move' ? f.mf : -1);
    // the light from a cast lingers on the body for a few frames
    const cf = this.castFlash.get(f.id) ?? 0;
    if (cf > 0) {
      this.castFlash.set(f.id, cf - 1);
      pen.glow?.(x, y - 60 * s, 80 * s, PAL[f.spec.element].main, (cf / 8) * 0.4);
    }
    // nearby effects light the fighter (a soft coloured glow)
    for (const e of m.effects) {
      if (e.delay > 0) continue;
      const d = Math.abs(wx(e.x) - x);
      if (d < 160 && e.owner !== f.id) {
        pen.glow?.(x, y - 60 * s, 70 * s, PAL[e.element].main, 0.18 * (1 - d / 160));
        break;
      }
    }
    // buffs
    if (f.buffT > 0) {
      const col = f.buff === 1 ? 0xffb03a : f.buff === 2 ? 0x7fe3ff : 0xc89a5a;
      pen.add?.(true);
      pen.glow?.(x, y - 60 * s, 70 * s + Math.sin(time * 10) * 6, col, 0.35);
      pen.add?.(false);
      if (R() < 0.5 * this.quality) this.P.add(f.buff === 3 ? K.Chunk : K.Streak, x + RS() * 26 * s, y - R() * 20, RS() * 0.4, -3 - R() * 3, 18, f.buff === 3 ? 3 : 2.5, col, f.buff === 3 ? -0.1 : 0, 0.97, R() * 6, 0.1);
      if (f.buff === 3) pen.circle(x, y - 62 * s, 46 * s, null, 0xc89a5a, 5, 0.45);
    }
    // the barrier from Shine Shield: a hexagon shell
    if (f.barrier > 0) {
      const r = 70 * s;
      const pts: number[] = [];
      for (let i = 0; i < 6; i++) pts.push(x + Math.cos((i / 6) * Math.PI * 2 + time) * r, y - 62 * s + Math.sin((i / 6) * Math.PI * 2 + time) * r);
      for (let i = 0; i < 6; i++) pen.line(pts[i * 2]!, pts[i * 2 + 1]!, pts[((i + 1) % 6) * 2]!, pts[((i + 1) % 6) * 2 + 1]!, 4, 0xffe46b, 0.7);
      pen.glow?.(x, y - 62 * s, r, 0xffe46b, 0.2);
    }
    this.drawStatus(pen, f, j, time);
  }

  // ---- layer 3: over everything ---------------------------------------------------------------------------------
  drawOver(pen: Pen, m: Match, time: number): void {
    for (const e of m.effects) if (!isGround(e)) this.drawEffect(pen, m, e, time);
    for (const l of this.linger) {
      l.t--;
      l.e.y += 700;
      l.e.age = 2;
      this.drawEffect(pen, m, l.e, time);
    }
    if (this.linger.length && this.linger[0]!.t <= 0) this.linger = this.linger.filter((l) => l.t > 0);
    this.P.draw(pen, false);
    pen.add?.(true);
    this.P.draw(pen, true);
    pen.add?.(false);
    if (this.hitboxes)
      for (const e of m.effects) {
        const [l, t, r, b] = effectBox(e);
        pen.poly([wx(l), wy(t), wx(r), wy(t), wx(r), wy(b), wx(l), wy(b)], 0xffff00, 0.2);
      }
  }

  // ---- ghosts (afterimages) -------------------------------------------------------------------------------------
  private recordGhost(f: Fighter, j: Joints, on: boolean): void {
    let g = this.ghosts.get(f.id);
    if (!on) {
      if (g && g.n > 0 && Math.floor(R() * 2) === 0) g.n--;
      return;
    }
    if (!g) {
      g = { j: new Float32Array(GHOSTS * 24), n: 0, head: 0 };
      this.ghosts.set(f.id, g);
    }
    const o = g.head * 24;
    const pts = [j.pelvis, j.neck, j.head, j.shoulder, j.aEl, j.aHand, j.bEl, j.bHand, j.aKn, j.aFoot, j.bKn, j.bFoot];
    for (let i = 0; i < 12; i++) {
      g.j[o + i * 2] = pts[i]![0];
      g.j[o + i * 2 + 1] = pts[i]![1];
    }
    g.head = (g.head + 1) % GHOSTS;
    g.n = Math.min(GHOSTS, g.n + 1);
  }

  // ---- decals ------------------------------------------------------------------------------------------------------
  private drawDecal(pen: Pen, d: Decal, time: number): void {
    const t = d.life / d.max;
    const p = PAL[d.el];
    const a = Math.min(1, t * 2);
    const y = FLOOR_Y + 2;
    switch (d.el) {
      case 'fire':
        pen.poly([d.x - d.w, y, d.x - d.w * 0.5, y - 5, d.x + d.w * 0.6, y - 4, d.x + d.w, y, d.x, y + 6], 0x2a1208, 0.5 * a);
        if (R() < 0.15 * t) this.P.add(K.Flame, d.x + RS() * d.w * 0.7, y, 0, -0.6, 14, 4, p.main, -0.02, 0.95, R() * 6, 0.5);
        break;
      case 'ice':
        pen.poly([d.x - d.w, y, d.x, y - 4, d.x + d.w, y, d.x, y + 5], 0xdff8ff, 0.7 * a);
        for (let i = 0; i < 4; i++) pen.line(d.x - d.w * 0.6 + i * d.w * 0.4, y, d.x - d.w * 0.5 + i * d.w * 0.4, y - 10 - (i % 2) * 8, 2.5, 0xffffff, 0.7 * a);
        break;
      case 'leaf':
        for (let i = 0; i < 5; i++) {
          const vx = d.x - d.w * 0.8 + i * d.w * 0.4;
          pen.line(vx, y, vx + Math.sin(time * 2 + i) * 6, y - 14 - (i % 3) * 6, 3, p.main, a);
        }
        break;
      case 'earth':
        for (let i = 0; i < 4; i++) pen.line(d.x, y, d.x + Math.cos(i * 1.7) * d.w, y + 1 + (i % 2) * 2, 2.5, 0x2a1a0a, 0.7 * a);
        break;
      case 'water':
        pen.circle(d.x, y + 2, d.w * 0.7 * (1.1 - t * 0.3), null, p.light, 2, 0.6 * a);
        break;
      case 'lightning':
        for (let i = 0; i < 3; i++) pen.line(d.x, y, d.x + RS() * d.w, y + R() * 3, 2, p.main, 0.6 * a * R());
        break;
      case 'light':
        pen.add?.(true);
        pen.glow?.(d.x, y, d.w, p.main, 0.35 * a);
        pen.add?.(false);
        break;
      case 'gravity':
        pen.circle(d.x, y + 1, d.w * 0.6, null, p.dark, 4, 0.6 * a);
        break;
      case 'time':
        pen.circle(d.x, y + 1, d.w * 0.5, null, p.main, 2, 0.6 * a);
        pen.line(d.x, y + 1, d.x + Math.cos(time * 3) * d.w * 0.4, y + 1 + Math.sin(time * 3) * 2, 2, p.light, a);
        break;
      case 'wind':
        pen.line(d.x - d.w, y, d.x + d.w, y, 2, p.light, 0.4 * a);
        break;
    }
  }

  // ---- statuses (lingering) ---------------------------------------------------------------------------------------
  private drawStatus(pen: Pen, f: Fighter, j: Joints, time: number): void {
    const x = wx(f.x);
    const y = wy(f.y);
    const s = (f.spec.scale ?? 100) / 100;
    let icon = 0;
    const iconAt = () => [j.head[0] - 30 + icon++ * 20, j.head[1] - 34 * s] as const;
    for (const st of Object.keys(f.status) as StatusId[]) {
      const left = f.status[st];
      if (left <= 0) continue;
      const [ix, iy] = iconAt();
      switch (st) {
        case 'burn':
          // embers and flame tongues licking the body
          if (R() < 0.6 * this.quality) this.P.add(K.Flame, x + RS() * 22 * s, y - R() * 110 * s, 0, -1.2, 14, 5 * s, R() < 0.5 ? 0xff5a2c : 0xffc23d, -0.03, 0.95, R() * 6, 0.5);
          if (R() < 0.3 * this.quality) this.P.add(K.Glow, x + RS() * 20 * s, y - R() * 100 * s, RS() * 0.4, -1.4, 22, 6, 0xffc23d, -0.02, 0.97);
          pen.poly([ix, iy - 9, ix + 6, iy + 6, ix - 6, iy + 6], 0xff5a2c);
          break;
        case 'freeze': {
          // ice crystals that grow on the joints, then a frozen shell
          const grow = Math.min(1, (90 - Math.min(90, left)) / 20 + 0.3);
          const pts = [j.aHand, j.bHand, j.aKn, j.bKn, j.head, j.aFoot, j.bFoot];
          pts.forEach((pt, k) => {
            const r = (8 + (k % 3) * 3) * grow * s;
            pen.poly([pt[0], pt[1] - r * 1.6, pt[0] + r * 0.7, pt[1], pt[0], pt[1] + r * 0.6, pt[0] - r * 0.7, pt[1]], 0xbff3ff, 0.85);
            pen.line(pt[0], pt[1] - r * 1.4, pt[0], pt[1] + r * 0.4, 1.5, 0xffffff, 0.9);
          });
          pen.poly([x - 30 * s, y, x - 34 * s, y - 128 * s, x + 34 * s, y - 132 * s, x + 30 * s, y], 0x7fe3ff, 0.22 * grow);
          if (R() < 0.15) this.P.add(K.Star, x + RS() * 30 * s, y - R() * 120 * s, 0, 0, 14, 6, 0xffffff);
          pen.line(ix - 7, iy, ix + 7, iy, 3, 0x7fe3ff);
          pen.line(ix, iy - 7, ix, iy + 7, 3, 0x7fe3ff);
          break;
        }
        case 'shock': {
          // static arcs jumping between joints
          const js = [j.head, j.aHand, j.bHand, j.pelvis, j.aFoot, j.bFoot];
          pen.add?.(true);
          for (let k = 0; k < 2; k++) {
            const a = js[Math.floor(R() * js.length)]!;
            const b = js[Math.floor(R() * js.length)]!;
            let px = a[0];
            let py = a[1];
            for (let q = 1; q <= 4; q++) {
              const nx = a[0] + ((b[0] - a[0]) * q) / 4 + RS() * 8;
              const ny = a[1] + ((b[1] - a[1]) * q) / 4 + RS() * 8;
              pen.line(px, py, nx, ny, 2.2, 0xfff6a8, 0.9);
              px = nx;
              py = ny;
            }
          }
          pen.add?.(false);
          pen.line(ix - 5, iy - 8, ix + 2, iy, 3, 0xffd21f);
          pen.line(ix + 2, iy, ix - 2, iy + 2, 3, 0xffd21f);
          pen.line(ix - 2, iy + 2, ix + 5, iy + 9, 3, 0xffd21f);
          break;
        }
        case 'root':
          // vines curling up the legs
          for (const [foot, knee] of [
            [j.aFoot, j.aKn],
            [j.bFoot, j.bKn],
          ] as const) {
            let px = foot[0] - 8;
            let py = FLOOR_Y;
            for (let q = 1; q <= 5; q++) {
              const tt = q / 5;
              const nx = foot[0] + (knee[0] - foot[0]) * tt + Math.sin(tt * 9 + time * 2) * 9;
              const ny = FLOOR_Y + (knee[1] - FLOOR_Y) * tt;
              pen.line(px, py, nx, ny, 4, 0x2f8f2a);
              if (q % 2 === 0) pen.circle(nx + 5, ny, 3.5, 0x6ad85a, null);
              px = nx;
              py = ny;
            }
          }
          pen.line(ix - 6, iy + 6, ix + 6, iy - 6, 3, 0x3fbf3a);
          break;
        case 'float':
          // floating bubbles rising around the body
          for (let q = 0; q < 4; q++) {
            const bx = x + Math.sin(time * 3 + q * 1.6) * 30 * s;
            const by = y - 20 - ((time * 50 + q * 30) % 130) * s;
            pen.circle(bx, by, 5 + (q % 2) * 3, null, 0xd6c4ff, 2, 0.8);
            pen.circle(bx - 2, by - 2, 1.5, 0xffffff, null, 0, 0.8);
          }
          pen.circle(ix, iy, 6, null, 0xd6c4ff, 2);
          break;
        case 'slow':
          // trickling sand and a slow clock tick
          if (R() < 0.3 * this.quality) this.P.add(K.Dot, x + RS() * 18 * s, y - 120 * s, 0, 0.8, 40, 2, 0xe8d8a0, 0.03, 0.98);
          pen.poly([ix - 7, iy - 5, ix + 7, iy - 5, ix, iy + 7], 0x7a8aa0);
          break;
        case 'weak':
          if (R() < 0.3 * this.quality) this.P.add(K.Drop, x + RS() * 16 * s, y - 80 * s - R() * 30, 0, 0.6, 26, 3, 0x6a4aa8, 0.15, 0.96);
          pen.line(ix, iy - 7, ix, iy + 7, 3, 0x9b6bff);
          pen.line(ix - 5, iy + 2, ix, iy + 7, 3, 0x9b6bff);
          pen.line(ix + 5, iy + 2, ix, iy + 7, 3, 0x9b6bff);
          break;
      }
    }
  }

  // ---- move visuals (powers that are a body move, not a spawned effect) --------------------------------------------
  private drawMoveFx(pen: Pen, f: Fighter, mv: MoveDef, j: Joints, time: number): void {
    const el = mv.element!;
    const p = PAL[el];
    const x = wx(f.x);
    const y = wy(f.y);
    const face = f.face;
    const mech = mechanicOf(mv);
    const h = hashStr(mv.id);
    const k = (f.mf - mv.startup) / Math.max(1, mv.active);
    if (mech === 'counter') {
      // a stance: element sigil in front, pulsing; disappears when the stance ends
      if (f.counter <= 0) return;
      const cx = x + face * 34;
      const cy = y - 78;
      const r = 40 + Math.sin(time * 12) * 3;
      pen.glow?.(cx, cy, r * 1.6, p.main, 0.35);
      pen.circle(cx, cy, r, null, p.light, 4, 0.9);
      const sides = 3 + (h % 5);
      for (let i = 0; i < sides; i++) {
        const a1 = (i / sides) * Math.PI * 2 + time * 2 * (h % 2 ? 1 : -1);
        const a2 = ((i + 1) / sides) * Math.PI * 2 + time * 2 * (h % 2 ? 1 : -1);
        pen.line(cx + Math.cos(a1) * r * 0.7, cy + Math.sin(a1) * r * 0.7, cx + Math.cos(a2) * r * 0.7, cy + Math.sin(a2) * r * 0.7, 3, p.main, 0.9);
      }
      if (R() < 0.4 * this.quality) emit(this.P, el, 3, cx, cy, 1, 0.6);
      return;
    }
    if (!mv.box) return;
    const [bl, bt, br, bb] = [x + face * mv.box.x, y + mv.box.y, x + face * (mv.box.x + mv.box.w), y + mv.box.y + mv.box.h];
    const l = Math.min(bl, br);
    const r = Math.max(bl, br);
    const cy = (bt + bb) / 2;
    switch (mech) {
      case 'beam':
      case 'reach':
      case 'drain': {
        // layered beam: wide glow, colour body, hot core, and an element overlay along it
        const th = Math.max(14, bb - bt);
        const x0 = face > 0 ? l : r;
        const x1 = face > 0 ? r : l;
        const wob = Math.sin(time * 40) * 2;
        pen.line(x0, cy, x1, cy, th * 1.8, p.main, 0.25);
        pen.line(x0, cy, x1, cy, th * 0.9 + wob, p.main, 0.75);
        pen.line(x0, cy, x1, cy, th * 0.32, p.hot, 0.95);
        const len = Math.abs(x1 - x0);
        const segs = Math.max(4, Math.floor(len / 40));
        for (let i = 0; i < segs; i++) {
          const t0 = i / segs;
          const px = x0 + (x1 - x0) * t0;
          if (el === 'lightning') pen.line(px, cy + RS() * th * 0.6, px + (x1 - x0) / segs, cy + RS() * th * 0.6, 2.5, 0xffffff, 0.9);
          else if (el === 'leaf') pen.line(px, cy, px + face * 10, cy - th * 0.7 * (i % 2 ? 1 : -1), 3, p.dark, 0.9);
          else if (el === 'light') pen.line(px, cy, px + face * 20, cy + (i % 2 ? -1 : 1) * th * 1.4, 1.6, p.hot, 0.6);
          else if (el === 'ice') pen.poly([px, cy - th * 0.5, px + face * 12, cy - th * 1.2, px + face * 18, cy - th * 0.5], p.light, 0.9);
          else if (el === 'water') pen.line(px, cy + Math.sin(t0 * 12 + time * 20) * th * 0.5, px + (x1 - x0) / segs, cy + Math.sin((t0 + 1 / segs) * 12 + time * 20) * th * 0.5, 2.5, p.hot, 0.8);
        }
        pen.glow?.(x1, cy, th * 2.4, p.light, 0.6);
        if (R() < 0.9 * this.quality) emit(this.P, el, 0, x0 + (x1 - x0) * R(), cy, 1, 0.7, face);
        if (mech === 'drain') {
          // drained life flows back to the caster
          for (let i = 0; i < 2; i++) this.P.add(K.Glow, x1 - face * R() * 40, cy + RS() * 10, -face * (6 + R() * 4), RS() * 0.5, 16, 8, 0xff6a8a, 0, 0.98);
        }
        break;
      }
      case 'dash': {
        // a cutting streak along the path, element particles, speed lines
        pen.line(x - face * 120, cy, x + face * 40, cy, 26, p.main, 0.35);
        pen.line(x - face * 90, cy, x + face * 50, cy, 8, p.hot, 0.85);
        for (let i = 0; i < 3; i++) pen.line(x - face * (60 + i * 30), cy - 40 + i * 30, x - face * (150 + i * 30), cy - 40 + i * 30, 2, p.light, 0.6);
        if (R() < this.quality) emit(this.P, el, 0, x - face * 30, cy + RS() * 30, 2, 0.8, face);
        break;
      }
      case 'flurry': {
        // many fist streaks in a cone
        const n = 2 + (h % 3);
        for (let i = 0; i < n; i++) {
          const yy = cy + RS() * (bb - bt) * 0.5;
          const reach = 40 + R() * (r - l);
          pen.line(x + face * 20, yy, x + face * reach, yy + RS() * 8, 6, p.main, 0.7);
          pen.line(x + face * 30, yy, x + face * reach, yy, 2.5, p.hot, 0.9);
          pen.glow?.(x + face * reach, yy, 16, p.light, 0.5);
        }
        if (R() < this.quality) emit(this.P, el, 1, x + face * (r - l) * 0.6, cy, 1, 0.5);
        break;
      }
      case 'rising': {
        // a rising column with element shapes climbing it
        const top = bt - 40;
        pen.poly([x - 26, y, x - 14, top, x + 14, top, x + 26, y], p.main, 0.5);
        pen.poly([x - 10, y, x - 4, top + 20, x + 4, top + 20, x + 10, y], p.hot, 0.8);
        pen.glow?.(x, top, 60, p.light, 0.6);
        for (let i = 0; i < this.q(3); i++) emit(this.P, el, 0, x + RS() * 20, y - R() * (y - top), 1, 0.9);
        break;
      }
      case 'spin': {
        // a swirling disc of curved slashes around the body
        for (let i = 0; i < 3; i++) this.P.add(K.Slash, x, cy, 0, 0, 6, 50 + i * 16, i ? p.light : p.hot, 0, 1, time * 14 + i * 2.1, 0.32);
        pen.circle(x, cy, (r - l) * 0.5, null, p.main, 3, 0.4);
        if (R() < this.quality) emit(this.P, el, 0, x + RS() * 60, cy + RS() * 40, 1, 0.6, 0);
        break;
      }
      case 'armor': {
        // a heavy armored punch: rock-hard outline and a big impact glow at the fist
        pen.glow?.(j.aHand[0], j.aHand[1], 50, p.main, 0.6);
        pen.circle(x, y - 62, 52, null, p.light, 4, 0.5);
        break;
      }
      default: {
        // a strike: one curved slash at the fist
        this.P.add(K.Slash, j.aHand[0] - face * 30, j.aHand[1], 0, 0, 6, 40, p.light, 0, 1, face > 0 ? -1.2 : 1.9, face * 0.3);
        pen.glow?.(j.aHand[0], j.aHand[1], 30, p.main, 0.6);
        if (R() < this.quality) emit(this.P, el, 1, j.aHand[0], j.aHand[1], 1, 0.5);
      }
    }
    void k;
  }

  // ---- spawned effects (unique drawer per look) -----------------------------------------------------------------
  private drawEffect(pen: Pen, m: Match, e: Effect, time: number): void {
    const el = e.element;
    const p = PAL[el];
    const [L, T, Rr, B] = effectBox(e).map((v, i) => (i % 2 === 0 ? wx(v) : wy(v))) as [number, number, number, number];
    const cx = (L + Rr) / 2;
    const cy = (T + B) / 2;
    const w = Rr - L;
    const h = B - T;
    const face = e.face;
    const q = this.quality;
    if (e.delay > 0) {
      // telegraph: a warning mark on the floor where it will land, plus a gathering glow
      const blink = 0.4 + 0.4 * Math.sin(time * 26);
      pen.add?.(true);
      pen.line(L, FLOOR_Y - 2, Rr, FLOOR_Y - 2, 6, p.main, blink);
      pen.circle(cx, FLOOR_Y, Math.max(16, w * 0.5) * (1 - e.delay / 60), null, p.light, 3, blink);
      if (e.kind === 'strike' || e.kind === 'proj') pen.glow?.(cx, Math.max(T, FLOOR_Y - 400), 40, p.main, 0.3 * blink);
      pen.add?.(false);
      return;
    }
    const age = e.age;
    const life = e.life;
    if (e.life === 1 && e.kind === 'strike' && LINGER.has(e.look) && this.linger.length < 8) this.linger.push({ e: { ...e, hits: [] }, t: 26 });
    const spin = time * 10 + e.id;
    pen.add?.(true);
    // the light around an effect: tall strikes light their lower part, not the whole sky
    const gh = Math.min(h, 220);
    pen.glow?.(cx, e.kind === 'strike' ? B - gh * 0.5 : cy, Math.min(260, Math.max(w, gh) * 0.9 + 20), p.main, 0.45);
    pen.add?.(false);
    switch (e.look) {
      // ---------------- fire ----------------
      case 'fireball': {
        // a layered fireball: flame tongues trailing, hot core
        for (let i = 0; i < 4; i++) pen.poly([cx + face * h * 0.3, cy - h * 0.4, cx - face * (h * (1 + i * 0.5) + Math.sin(spin + i) * 6), cy + (i - 1.5) * h * 0.25, cx + face * h * 0.3, cy + h * 0.4], i % 2 ? p.light : p.main, 0.8);
        pen.circle(cx, cy, h * 0.5, p.main, null);
        pen.circle(cx + face * 3, cy - 2, h * 0.3, p.hot, null);
        if (R() < q) emit(this.P, 'fire', 0, cx - face * 14, cy, 1, 0.8, face);
        break;
      }
      case 'firetrail':
        for (let x = L; x < Rr; x += 16) {
          pen.poly([x - 8, B, x + Math.sin(spin + x) * 4, B - 16 - Math.sin(time * 18 + x) * 8, x + 8, B], (x / 16) % 2 ? p.main : p.light, 0.8);
        }
        if (R() < q * 0.5) this.decal(cx + RS() * w * 0.4, 20, 'fire', 0, 80);
        break;
      case 'pillar': {
        // furnace column: swirling flame bands and rising embers
        pen.poly([L, B, L + 10, T, Rr - 10, T, Rr, B], p.main, 0.85);
        for (let i = 0; i < 5; i++) {
          const yy = B - ((age * 18 + i * 52) % h);
          pen.poly([L + 6, yy, cx + Math.sin(spin + i) * 12, yy - 30, Rr - 6, yy], p.light, 0.7);
        }
        pen.poly([L + 22, B, L + 28, T + 30, Rr - 28, T + 30, Rr - 22, B], p.hot, 0.8);
        if (R() < q) emit(this.P, 'fire', 0, cx + RS() * w * 0.4, T + R() * h, 2, 1.2);
        if (age === 1) this.decal(cx, w, 'fire', 0, 220);
        break;
      }
      case 'meteor': {
        // falling meteors with a long burning tail
        const tail = 70;
        pen.line(cx - 22, cy - tail, cx, cy, h * 0.9, p.main, 0.55);
        pen.line(cx - 12, cy - tail * 0.6, cx, cy, h * 0.45, p.light, 0.8);
        pen.circle(cx, cy, h * 0.48, 0x4a2010, p.main, 4);
        pen.circle(cx - 4, cy - 4, h * 0.2, p.light, null);
        if (R() < q) emit(this.P, 'fire', 0, cx - 8, cy - 20, 1, 1);
        break;
      }
      case 'heatward':
        pen.circle(cx, cy, 14, p.main, null);
        pen.circle(cx, cy, 8, p.hot, null);
        for (let i = 0; i < 3; i++) pen.poly([cx - 7, cy, cx + Math.sin(spin * 2 + i * 2) * 5, cy - 24 - i * 3, cx + 7, cy], i ? p.light : p.main, 0.7);
        if (R() < q * 0.6) this.P.add(K.Flame, cx, cy, 0, -0.5, 10, 4, p.light, -0.02, 0.95, R() * 6, 0.5);
        break;
      case 'kiln': {
        // a dome of fire bricks with heat shimmer
        const r = Math.min(w, h * 1.4) * 0.5;
        const by = B;
        for (let i = 0; i < 7; i++) {
          const a1 = Math.PI + (i / 7) * Math.PI;
          const a2 = Math.PI + ((i + 1) / 7) * Math.PI;
          pen.line(cx + Math.cos(a1) * r, by + Math.sin(a1) * r, cx + Math.cos(a2) * r, by + Math.sin(a2) * r, 10, i % 2 ? p.main : p.dark, 0.75);
        }
        for (let i = 0; i < 4; i++) {
          const yy = by - r * 0.3 - i * 18 - ((age * 2) % 18);
          pen.line(cx - r * 0.6, yy, cx + r * 0.6, yy + Math.sin(spin + i) * 4, 2, p.light, 0.25);
        }
        if (R() < q) this.P.add(K.Flame, cx + RS() * r * 0.8, by, 0, -1.2, 16, 6, p.main, -0.02, 0.95, R() * 6, 0.5);
        break;
      }
      // ---------------- water ----------------
      case 'jet': {
        // a tapering jet with flowing ribbons and spray
        pen.line(L, cy, Rr, cy, h, p.main, 0.85);
        for (let i = 0; i < 2; i++) {
          let px = L;
          let py = cy;
          for (let s = 1; s <= 6; s++) {
            const nx = L + (w * s) / 6;
            const ny = cy + Math.sin(s * 1.3 + spin * 2 + i * 3) * h * 0.5;
            pen.line(px, py, nx, ny, 2.5, p.hot, 0.8);
            px = nx;
            py = ny;
          }
        }
        pen.glow?.(face > 0 ? Rr : L, cy, h * 1.6, p.light, 0.6);
        if (R() < q) this.P.add(K.Drop, face > 0 ? Rr : L, cy, face * (2 + R() * 3), RS() * 2, 18, 3, p.light, 0.25, 0.97);
        break;
      }
      case 'wave': {
        // a rolling wave with a white curl and foam
        pen.poly([L, B, cx - face * w * 0.1, T, Rr, B], p.main, 0.85);
        pen.poly([cx - face * w * 0.1, T, cx + face * w * 0.35, T + h * 0.3, cx + face * w * 0.15, T + h * 0.45], p.hot, 0.9);
        pen.poly([L + 8, B, cx - face * w * 0.05, T + 16, Rr - 8, B], p.light, 0.6);
        if (R() < q) this.P.add(K.Drop, cx + face * w * 0.3, T + 6, face * 2, -2 - R() * 2, 20, 3, p.hot, 0.28, 0.97);
        if (R() < q * 0.3) this.decal(cx, 30, 'water', 0, 60);
        break;
      }
      case 'bubble':
        pen.circle(cx, cy, w * 0.5 + Math.sin(spin) * 2, p.main, null, 0, 0.18);
        pen.circle(cx, cy, w * 0.5 + Math.sin(spin) * 2, null, p.light, 4, 0.9);
        pen.circle(cx - w * 0.16, cy - w * 0.16, w * 0.1, 0xffffff, null, 0, 0.9);
        pen.circle(cx + w * 0.2, cy + w * 0.1, w * 0.05, 0xffffff, null, 0, 0.6);
        break;
      case 'geyser': {
        // an erupting geyser column with a spray crown
        pen.poly([L + 6, B, cx - 6, T + 20, cx + 6, T + 20, Rr - 6, B], p.main, 0.8);
        pen.line(cx, B, cx, T + 30, 10, p.hot, 0.8);
        for (let i = 0; i < this.q(4); i++) this.P.add(K.Drop, cx + RS() * 12, T + 20, RS() * 4, -2 - R() * 4, 26, 3.5, R() < 0.5 ? p.light : p.hot, 0.3, 0.98);
        if (age === 1) this.decal(cx, 40, 'water', 0, 120);
        break;
      }
      case 'mistclone':
      case 'snowclone':
      case 'mirrorclone':
      case 'ghostclone': {
        // a decoy: a see-through copy of the caster in their guard pose
        const owner = fighterById(m, e.owner);
        if (owner) {
          const look = lookOf(owner);
          const jj = solve(POSES.guard!, cx, B, owner.face, 1);
          const pulse = 0.45 + 0.15 * Math.sin(time * 6);
          drawStick(pen, jj, owner.face, 1, { look, element: p.main, elementLight: p.light, expression: 'smug', aura: 0.6, alpha: pulse, time });
          pen.add?.(true);
          if (e.look === 'mistclone' && R() < q) this.P.add(K.Smoke, cx + RS() * 20, B - R() * 120, RS() * 0.5, -0.4, 30, 10, p.light, 0, 0.96);
          if (e.look === 'snowclone' && R() < q) this.P.add(K.Star, cx + RS() * 26, B - R() * 120, 0, 0.4, 20, 5, 0xffffff);
          if (e.look === 'mirrorclone') pen.line(cx - 30, B - 130, cx + 30, B, 3, p.hot, 0.5 * pulse);
          if (e.look === 'ghostclone') for (let i = 0; i < 3; i++) pen.circle(cx, B - 60, 30 + ((age * 2 + i * 20) % 60), null, p.main, 2, 0.4);
          pen.add?.(false);
        }
        break;
      }
      case 'monsoon': {
        // dark clouds and falling rain streaks over an area
        const ct = Math.max(T, FLOOR_Y - 320);
        for (let i = 0; i < 5; i++) pen.circle(L + (w * (i + 0.5)) / 5, ct + 20 + Math.sin(i + time) * 4, 36 + (i % 2) * 10, 0x3a4a6a, null, 0, 0.8);
        for (let i = 0; i < 5; i++) pen.circle(L + (w * (i + 0.2)) / 5, ct + 6, 26, 0x55678c, null, 0, 0.7);
        for (let i = 0; i < this.q(6); i++) this.P.add(K.Streak, L + R() * w, ct + 40, -0.6, 10 + R() * 4, 22, 1.6, p.light, 0, 1);
        if (R() < q * 0.4) this.decal(L + R() * w, 18, 'water', 0, 50);
        break;
      }
      // ---------------- ice ----------------
      case 'dart':
        pen.poly([cx + face * w * 0.6, cy, cx, cy - h * 0.7, cx - face * w * 0.5, cy, cx, cy + h * 0.7], p.light);
        pen.poly([cx + face * w * 0.6, cy, cx, cy - h * 0.3, cx - face * w * 0.1, cy], 0xffffff, 0.9);
        pen.line(cx - face * w * 0.5, cy, cx - face * w * 1.8, cy, 3, p.main, 0.6);
        if (R() < q * 0.5) this.P.add(K.Star, cx - face * w, cy, 0, 0, 10, 4, 0xffffff);
        break;
      case 'shard': {
        // a spinning ice shard leaving frost breath
        const a = spin * 1.6;
        const r = w * 0.7;
        pen.poly([cx + Math.cos(a) * r, cy + Math.sin(a) * r, cx + Math.cos(a + 2.4) * r * 0.5, cy + Math.sin(a + 2.4) * r * 0.5, cx + Math.cos(a + 3.14) * r * 0.9, cy + Math.sin(a + 3.14) * r * 0.9, cx + Math.cos(a + 4) * r * 0.5, cy + Math.sin(a + 4) * r * 0.5], p.light);
        if (R() < q) this.P.add(K.Smoke, cx, cy, -face, 0, 18, 6, 0xffffff, 0, 0.9);
        break;
      }
      case 'icewall':
        pen.poly([L, B, L, T + 10, cx, T, Rr, T + 10, Rr, B], p.main, 0.8);
        pen.poly([L + 6, B, L + 6, T + 20, cx, T + 12, cx, B], p.light, 0.6);
        pen.line(L + 8, B - 20, cx, T + 20, 3, 0xffffff, 0.8);
        if (age < 12) for (let i = 0; i < this.q(2); i++) this.P.add(K.Shard, cx + RS() * w, T + R() * h, RS() * 3, -R() * 3, 20, 5, p.light, 0.2, 0.95, R() * 6, RS() * 0.3);
        if (age === 1) this.decal(cx, 40, 'ice', 0, 200);
        break;
      case 'frostburst': {
        const k = 1 - life / 20;
        pen.circle(cx, B - 60, 40 + k * w * 0.5, null, p.light, 10 * (1 - k) + 2, 1 - k * 0.6);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          const rr = 30 + k * w * 0.45;
          pen.poly([cx + Math.cos(a) * rr, B - 60 + Math.sin(a) * rr * 0.6, cx + Math.cos(a + 0.12) * (rr - 26), B - 60 + Math.sin(a + 0.12) * (rr - 26) * 0.6, cx + Math.cos(a - 0.12) * (rr - 26), B - 60 + Math.sin(a - 0.12) * (rr - 26) * 0.6], p.hot, 1 - k);
        }
        if (age === 1) this.decal(cx, w * 0.45, 'ice', 0, 240);
        break;
      }
      case 'blizzard': {
        // swirling snow over the whole area and a frost floor
        for (let i = 0; i < this.q(5); i++) this.P.add(K.Dot, L + R() * w, T + R() * h * 0.6, 3 + R() * 2, 1 + R() * 1.5, 30, 2.5, 0xffffff, 0, 0.99);
        for (let i = 0; i < this.q(2); i++) this.P.add(K.Slash, L + R() * w, T + R() * h, 0, 0, 14, 24, p.light, 0, 1, R() * 6, 0.25);
        pen.line(L, B - 2, Rr, B - 2, 5, 0xdff8ff, 0.5);
        break;
      }
      // ---------------- lightning ----------------
      case 'bolt':
      case 'chainbolt': {
        // a branching bolt from the sky with a ground splash
        const branches = e.look === 'bolt' ? 2 : 1;
        let px = cx + RS() * 30;
        let py = -300;
        while (py < B) {
          const nx = cx + RS() * w * 0.6;
          const ny = py + 40 + R() * 30;
          pen.line(px, py, nx, ny, 11, p.main, 0.9);
          pen.line(px, py, nx, ny, 4, 0xffffff);
          if (R() < 0.25 * branches) pen.line(nx, ny, nx + RS() * 70, ny + 40, 3, p.light, 0.8);
          px = nx;
          py = ny;
        }
        pen.glow?.(cx, B, 90, p.light, 0.8);
        if (age === 1) {
          this.decal(cx, 40, 'lightning', 0, 90);
          for (let i = 0; i < this.q(8); i++) this.P.add(K.Arc, cx, B - 10, RS() * 3, -R() * 3, 10, 30, p.hot, 0, 0.9, -R() * 3);
        }
        break;
      }
      case 'surge': {
        // overcharge burst: a crackling sphere
        const k = 1 - life / 12;
        pen.circle(cx, cy, w * 0.5 * (0.4 + k * 0.6), null, p.light, 6 * (1 - k) + 1, 1 - k);
        for (let i = 0; i < this.q(4); i++) this.P.add(K.Arc, cx, cy, 0, 0, 6, w * 0.4, p.hot, 0, 0.9, R() * 6);
        break;
      }
      case 'coil': {
        // a charged coil ball: a ring with orbiting sparks
        pen.circle(cx, cy, 13, p.main, null);
        pen.circle(cx, cy, 19, null, p.hot, 2, 0.8);
        for (let i = 0; i < 3; i++) pen.circle(cx + Math.cos(spin * 3 + i * 2) * 22, cy + Math.sin(spin * 3 + i * 2) * 22, 2.5, 0xffffff, null);
        if (R() < q * 0.4) this.P.add(K.Arc, cx, cy, 0, 0, 5, 22, p.light, 0, 0.9, R() * 6);
        break;
      }
      case 'shockmine': {
        // a mine on the floor with a crackling top
        const pulse = 0.5 + 0.5 * Math.sin(time * 8);
        pen.poly([cx - 18, B, cx - 10, B - 10, cx + 10, B - 10, cx + 18, B], 0x3a3a20, 0.9);
        pen.circle(cx, B - 12, 5, p.main, null, 0, pulse);
        if (R() < q * 0.3) this.P.add(K.Arc, cx, B - 12, 0, 0, 5, 18, p.light, 0, 0.9, -1.57 + RS());
        break;
      }
      // ---------------- wind ----------------
      case 'blade':
        // a crescent air blade with streaks
        for (let i = 0; i < 3; i++) {
          const yy = cy - h * 1.4 + i * h * 1.4;
          pen.line(cx - face * w * 0.6, yy + (i - 1) * 4, cx + face * w * 0.5, cy, 4 - Math.abs(i - 1) * 2, i === 1 ? p.hot : p.light, 0.9);
        }
        pen.line(cx - face * w * 1.4, cy, cx - face * w * 0.6, cy, 2, p.main, 0.6);
        if (R() < q * 0.5) emit(this.P, 'wind', 0, cx, cy, 1, 0.5, face);
        break;
      case 'galeblade': {
        // a spinning X of wind with a leaf swirl
        const a = spin * 2;
        for (let i = 0; i < 2; i++) pen.line(cx + Math.cos(a + i * 1.57) * 16, cy + Math.sin(a + i * 1.57) * 16, cx - Math.cos(a + i * 1.57) * 16, cy - Math.sin(a + i * 1.57) * 16, 4, i ? p.light : p.hot);
        if (R() < q * 0.5) this.P.add(K.Leaf, cx, cy, -face * 1.5, RS(), 20, 3, 0x9ad97a, 0.02, 0.96, R() * 6, 0.3);
        break;
      }
      case 'gustwall': {
        // a standing wall of rising wind curls
        for (let i = 0; i < 5; i++) {
          const yy = B - ((age * 6 + i * 34) % h);
          this.P.n < this.P.cap && R() < q * 0.3 && this.P.add(K.Slash, cx, yy, 0, -1, 10, 18, p.light, 0, 1, face > 0 ? 3.4 : -0.3, 0.3);
          pen.line(cx - 6, yy, cx + 6 + Math.sin(spin + i) * 8, yy - 20, 3, i % 2 ? p.main : p.light, 0.8);
        }
        break;
      }
      case 'stormeye': {
        // a cyclone around the caster pulling dust in
        for (let i = 0; i < 4; i++) {
          const rr = w * (0.2 + i * 0.1);
          this.P.n < this.P.cap && R() < q * 0.4 && this.P.add(K.Slash, cx, B - 80, 0, 0, 8, rr, i % 2 ? p.light : p.main, 0, 1, spin + i, 0.35);
        }
        pen.circle(cx, B - 80, w * 0.45, null, p.main, 2, 0.3);
        if (R() < q) this.P.add(K.Leaf, cx + RS() * w * 0.5, B - R() * h, 0, 0, 20, 3, 0x9ad97a, 0, 0.92, R() * 6, 0.4);
        break;
      }
      // ---------------- earth ----------------
      case 'boulder': {
        const a = spin;
        const r = w * 0.5;
        const pts: number[] = [];
        for (let i = 0; i < 7; i++) {
          const rr = r * (0.85 + ((i * 37) % 10) / 50);
          pts.push(cx + Math.cos(a + (i / 7) * 6.28) * rr, cy + Math.sin(a + (i / 7) * 6.28) * rr);
        }
        pen.poly(pts, p.main);
        pen.circle(cx - r * 0.25, cy - r * 0.2, r * 0.22, p.light, null);
        if (R() < q * 0.4) this.P.add(K.Chunk, cx, cy, RS(), RS(), 20, 3, p.dark, 0.3, 0.97, R() * 6, 0.2);
        break;
      }
      case 'quake':
        // rock spikes bursting up along the ground
        for (let i = 0; i < 4; i++) {
          const sx = cx - face * i * 18;
          pen.poly([sx - 9, B, sx + face * 4, B - 34 + i * 7, sx + 9, B], i % 2 ? p.main : p.dark);
        }
        if (R() < q) this.P.add(K.Chunk, cx, B - 10, RS() * 2, -3 - R() * 3, 24, 4, p.main, 0.35, 0.97, R() * 6, 0.3);
        if (R() < q * 0.5) this.decal(cx, 24, 'earth', 0, 120);
        break;
      case 'tremor': {
        const k = 1 - life / 10;
        pen.line(L, B, Rr, B, 6, p.dark, 1 - k);
        for (let i = 0; i < 6; i++) pen.poly([L + (w * i) / 6, B, L + (w * (i + 0.5)) / 6, B - 26 * (1 - k), L + (w * (i + 1)) / 6, B], p.main, 1 - k);
        if (age === 1) {
          this.decal(cx, w * 0.4, 'earth', 0, 200);
          for (let i = 0; i < this.q(10); i++) this.P.add(K.Chunk, L + R() * w, B, RS() * 3, -4 - R() * 5, 30, 4, p.main, 0.4, 0.97, R() * 6, 0.3);
        }
        break;
      }
      case 'mountain': {
        // a huge peak falling from above
        const top = Math.max(T, B - 300);
        pen.poly([L - 30, B, cx - 40, top + 90, cx, top, cx + 50, top + 110, Rr + 30, B], p.main, 0.95);
        pen.poly([cx - 20, top + 60, cx, top, cx + 10, top + 50], 0xffffff, 0.85);
        pen.poly([L + 20, B, cx, B - 100, Rr - 30, B], p.dark, 0.6);
        if (age === 1) {
          this.decal(cx, w * 0.6, 'earth', 0, 260);
          for (let i = 0; i < this.q(16); i++) this.P.add(K.Chunk, cx + RS() * w * 0.5, B - 10, RS() * 5, -3 - R() * 6, 34, 5, R() < 0.5 ? p.main : p.dark, 0.4, 0.97, R() * 6, 0.3);
          this.req.shake = Math.max(this.req.shake, 18);
        }
        break;
      }
      case 'spikepit': {
        // a pit lid with spikes that peek out
        const peek = Math.max(0, Math.sin(time * 3)) * 6;
        pen.line(cx - 30, B - 2, cx + 30, B - 2, 4, p.dark, 0.7);
        for (let i = -2; i <= 2; i++) pen.poly([cx + i * 11 - 4, B - 2, cx + i * 11, B - 6 - peek, cx + i * 11 + 4, B - 2], p.light, 0.7);
        break;
      }
      case 'prison': {
        // a stone pillar wall with carved bands
        pen.poly([L, B, L + 4, T, Rr - 4, T, Rr, B], p.main, 0.95);
        for (let i = 1; i < 4; i++) pen.line(L + 4, T + (h * i) / 4, Rr - 4, T + (h * i) / 4, 3, p.dark, 0.8);
        if (age < 8) for (let i = 0; i < this.q(2); i++) this.P.add(K.Chunk, cx, B, RS() * 3, -2 - R() * 3, 24, 4, p.dark, 0.35, 0.97, R() * 6, 0.3);
        break;
      }
      // ---------------- leaf ----------------
      case 'mine':
        pen.circle(cx, B - 6, 9, p.main, p.dark, 2, 0.35 + 0.25 * Math.sin(time * 4));
        for (let i = 0; i < 6; i++) pen.line(cx, B - 6, cx + Math.cos(i) * 13, B - 6 + Math.sin(i) * 6, 2, p.dark, 0.5);
        break;
      case 'roots':
        for (let x = L; x < Rr; x += 20) {
          const hh = 30 + ((x * 7) % 30);
          pen.line(x, B, x + 6, B - hh * 0.5, 7, p.dark);
          pen.line(x + 6, B - hh * 0.5, x + 2 + Math.sin(spin + x) * 5, B - hh, 5, p.main);
          pen.circle(x + 2, B - hh, 4, p.light, null);
        }
        if (age === 1) this.decal(cx, w * 0.4, 'leaf', 0, 200);
        break;
      case 'seed':
        pen.poly([cx + face * 10, cy, cx, cy - 6, cx - face * 8, cy, cx, cy + 6], 0x8a6a2a);
        pen.line(cx - face * 8, cy, cx - face * 18, cy - 4, 2, p.main, 0.8);
        if (R() < q * 0.5) this.P.add(K.Leaf, cx, cy, -face, RS() * 0.5, 16, 3, p.light, 0.03, 0.96, R() * 6, 0.3);
        break;
      case 'petal': {
        const a = spin * 2;
        pen.poly([cx + Math.cos(a) * 12, cy + Math.sin(a) * 5, cx - Math.sin(a) * 5, cy + Math.cos(a) * 12, cx - Math.cos(a) * 12, cy - Math.sin(a) * 5, cx + Math.sin(a) * 5, cy - Math.cos(a) * 12], 0xff9ad0);
        pen.circle(cx, cy, 3, 0xfff2a8, null);
        if (R() < q * 0.5) this.P.add(K.Petal, cx, cy, RS(), -0.5, 18, 3, 0xffc8e6, 0.03, 0.96, R() * 6, 0.3);
        break;
      }
      case 'leafring':
        pen.poly([cx + 14, cy, cx, cy - 7, cx - 14, cy, cx, cy + 7], p.main);
        pen.line(cx - 14, cy, cx + 14, cy, 1.5, p.dark, 0.9);
        break;
      // ---------------- light ----------------
      case 'lightball':
        pen.circle(cx, cy, h * 0.45, 0xffffff, null);
        for (let i = 0; i < 6; i++) pen.line(cx, cy, cx + Math.cos(spin + i) * h, cy + Math.sin(spin + i) * h, 2, p.light, 0.7);
        if (R() < q * 0.5) this.P.add(K.Star, cx - face * 10, cy, 0, 0, 12, 5, p.hot);
        break;
      case 'prism': {
        // a prism ray that splits into colours
        pen.line(cx - face * 30, cy, cx + face * 20, cy, 6, 0xffffff, 0.9);
        const cols = [0xff6b6b, 0xffd84a, 0x6bff9b, 0x6bc4ff, 0xb46bff];
        cols.forEach((c, i) => pen.line(cx - face * 40, cy, cx - face * 80, cy + (i - 2) * 6, 2, c, 0.7));
        pen.poly([cx + face * 20, cy - 10, cx + face * 34, cy, cx + face * 20, cy + 10], 0xffffff, 0.8);
        break;
      }
      case 'daybreak': {
        const k = 1 - life / 14;
        pen.circle(cx, cy, w * 0.5 * (0.3 + k * 0.7), 0xffffff, null, 0, 0.5 * (1 - k));
        for (let i = 0; i < 12; i++) pen.line(cx, cy, cx + Math.cos(i * 0.52) * w * (0.4 + k * 0.5), cy + Math.sin(i * 0.52) * w * (0.4 + k * 0.5), 4, p.light, 1 - k);
        break;
      }
      case 'halo':
        pen.circle(cx, cy, 12, null, p.hot, 4, 0.95);
        pen.circle(cx, cy, 6, p.light, null, 0, 0.8);
        if (R() < q * 0.3) this.P.add(K.Star, cx, cy, 0, 0, 10, 5, 0xffffff);
        break;
      case 'star': {
        // falling stars with a flare streak
        pen.line(cx, cy - 60, cx, cy, 6, p.light, 0.6);
        const a = spin;
        const pts: number[] = [];
        for (let i = 0; i < 10; i++) {
          const rr = i % 2 ? 8 : 18;
          pts.push(cx + Math.cos(a + (i / 10) * 6.28) * rr, cy + Math.sin(a + (i / 10) * 6.28) * rr);
        }
        pen.poly(pts, p.hot);
        break;
      }
      // ---------------- gravity ----------------
      case 'well':
        for (let i = 0; i < 4; i++) pen.circle(cx, B - h * 0.4, (w * 0.5 - ((age * 2 + i * 18) % (w * 0.5))) * 1, null, p.main, 3, 0.7);
        pen.circle(cx, B - h * 0.4, 14, p.dark, null);
        if (R() < q) {
          const a = R() * 6.28;
          this.P.add(K.Streak, cx + Math.cos(a) * w * 0.5, B - h * 0.4 + Math.sin(a) * h * 0.5, -Math.cos(a) * 6, -Math.sin(a) * 6, 12, 2, p.light, 0, 1);
        }
        break;
      case 'press':
        pen.poly([L, -100, Rr, -100, Rr - 10, B, L + 10, B], p.dark, 0.6);
        pen.line(L + 10, B, Rr - 10, B, 10, p.main);
        for (let i = 0; i < 3; i++) pen.line(L + 10 + i * (w / 3), -100, L + 10 + i * (w / 3), B, 2, p.light, 0.5);
        if (age === 1) this.decal(cx, w * 0.6, 'gravity', 0, 200);
        break;
      case 'zerog':
        pen.circle(cx, cy, w * 0.5, p.dark, null, 0, 0.3);
        pen.circle(cx, cy, w * 0.5, null, p.light, 3, 0.8);
        for (let i = 0; i < 6; i++) pen.poly([cx + Math.cos(spin * 0.5 + i) * w * 0.35 - 4, cy + Math.sin(spin * 0.5 + i) * w * 0.35, cx + Math.cos(spin * 0.5 + i) * w * 0.35, cy + Math.sin(spin * 0.5 + i) * w * 0.35 - 6, cx + Math.cos(spin * 0.5 + i) * w * 0.35 + 4, cy + Math.sin(spin * 0.5 + i) * w * 0.35], p.main);
        break;
      case 'comet': {
        // a dark comet with a warping tail; flips when it returns
        const back = e.returnAt && e.age > e.returnAt ? -1 : 1;
        const dir = face * back;
        for (let i = 1; i <= 4; i++) pen.circle(cx - dir * i * 14, cy, w * 0.5 * (1 - i * 0.18), null, p.light, 2, 0.5 - i * 0.1);
        pen.circle(cx, cy, w * 0.42, p.dark, p.main, 4);
        pen.circle(cx, cy, w * 0.16, p.hot, null);
        break;
      }
      case 'darkrock': {
        pen.line(cx + 10, cy - 50, cx, cy, 8, p.main, 0.4);
        pen.poly([cx - 12, cy - 6, cx - 4, cy - 14, cx + 12, cy - 8, cx + 10, cy + 10, cx - 8, cy + 12], p.dark);
        pen.circle(cx, cy, 20, null, p.light, 2, 0.6);
        if (age === 1 || R() < 0.05) this.P.add(K.Ring, cx, cy, 0, 0, 14, 40, p.main);
        break;
      }
      case 'satellite': {
        pen.poly([cx - 14, cy - 4, cx - 6, cy - 12, cx + 12, cy - 8, cx + 14, cy + 8, cx - 4, cy + 12], p.dark);
        pen.circle(cx, cy, 18, null, p.light, 2, 0.6);
        break;
      }
      case 'cage': {
        // bars of warped gravity around the trapped area
        for (let i = 0; i < 6; i++) {
          const bx = L + (w * i) / 5;
          pen.line(bx, B, bx + Math.sin(spin + i) * 4, T, 3, p.light, 0.8);
        }
        pen.line(L, T, Rr, T, 4, p.main, 0.8);
        pen.circle(cx, cy, w * 0.4, null, p.main, 2, 0.4 + 0.2 * Math.sin(time * 6));
        if (R() < q) this.P.add(K.Chunk, L + R() * w, B, RS() * 0.3, -1 - R(), 34, 3, p.dark, -0.01, 0.98, R() * 6, 0.05);
        break;
      }
      // ---------------- time ----------------
      case 'field': {
        pen.poly([L, T, Rr, T, Rr, B, L, B], p.main, 0.12);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * 6.28;
          pen.line(cx + Math.cos(a) * w * 0.42, cy + Math.sin(a) * h * 0.42, cx + Math.cos(a) * w * 0.38, cy + Math.sin(a) * h * 0.38, 3, p.light, 0.8);
        }
        pen.line(cx, cy, cx + Math.cos(time * 2) * w * 0.3, cy + Math.sin(time * 2) * h * 0.3, 3, p.light, 0.8);
        pen.line(cx, cy, cx + Math.cos(time * 0.3) * w * 0.2, cy + Math.sin(time * 0.3) * h * 0.2, 4, p.main, 0.8);
        break;
      }
      case 'clock':
        pen.circle(cx, cy, w * 0.5, 0xffffff, p.main, 4);
        for (let i = 0; i < 12; i++) pen.line(cx + Math.cos(i * 0.52) * w * 0.4, cy + Math.sin(i * 0.52) * w * 0.4, cx + Math.cos(i * 0.52) * w * 0.32, cy + Math.sin(i * 0.52) * w * 0.32, 2, p.main);
        pen.line(cx, cy, cx, cy - w * 0.35, 3, p.dark);
        pen.line(cx, cy, cx + Math.cos(time * 12) * w * 0.3, cy + Math.sin(time * 12) * w * 0.3, 3, p.main);
        break;
      case 'hourglass': {
        const k = 1 - life / 12;
        pen.poly([cx - 30, cy - 60, cx + 30, cy - 60, cx, cy], p.light, 1 - k);
        pen.poly([cx - 30, cy + 60, cx + 30, cy + 60, cx, cy], p.main, 1 - k);
        pen.circle(cx, cy, w * 0.5 * (0.4 + k), null, p.main, 4, 1 - k);
        break;
      }
      case 'hourhand':
        pen.line(cx - Math.cos(spin) * 20, cy - Math.sin(spin) * 20, cx + Math.cos(spin) * 20, cy + Math.sin(spin) * 20, 5, p.main);
        pen.poly([cx + Math.cos(spin) * 26, cy + Math.sin(spin) * 26, cx + Math.cos(spin + 0.3) * 16, cy + Math.sin(spin + 0.3) * 16, cx + Math.cos(spin - 0.3) * 16, cy + Math.sin(spin - 0.3) * 16], p.light);
        pen.circle(cx, cy, 4, 0xffffff, null);
        break;
      case 'spit':
        pen.circle(cx, cy, w * 0.5, 0x7fd14a, 0x355f1a, 3);
        break;
      default:
        pen.circle(cx, cy, Math.max(w, h) * 0.5, p.main, null, 0, 0.7);
    }
  }
}

const LINGER = new Set(['mountain', 'pillar', 'geyser', 'press']);

function isGround(e: Effect): boolean {
  return e.groundOnly || e.kind === 'zone' || e.kind === 'trap' || (e.kind === 'wall' && !e.orbitR);
}

/** A see-through outline of a recorded pose. */
function drawGhost(pen: Pen, j: Float32Array, o: number, thick: number, col: number, a: number): void {
  const P = (i: number) => [j[o + i * 2]!, j[o + i * 2 + 1]!] as const;
  const w = 6 + thick * 2;
  const seg = (i1: number, i2: number) => {
    const [x1, y1] = P(i1);
    const [x2, y2] = P(i2);
    pen.line(x1, y1, x2, y2, w, col, a);
  };
  seg(0, 1);
  seg(3, 4);
  seg(4, 5);
  seg(3, 6);
  seg(6, 7);
  seg(0, 8);
  seg(8, 9);
  seg(0, 10);
  seg(10, 11);
  const [hx, hy] = P(2);
  pen.circle(hx, hy, 16, null, col, w * 0.6, a);
}
