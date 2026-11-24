/**
 * Every hero's designed power effects for the Fight and Zombie screens and the roster stage. The moves are ported
 * from the two labs where they were designed: the Hero Trial (gemini/trial/lab.ts: power events, slams, ultimates,
 * floor things, statuses) and the Lightning lab (gemini/stages/engine/lab.ts: Spark Step, Chain Bolt, Skyfall Strike,
 * Volt Hammer, Thunder God). The labs work in their own stage units at hero scale 0.74; here every distance is
 * scaled by the hero's scale (q) and every floor thing is drawn in lab units round its own anchor, so the effects
 * keep their designed shapes at any size. Damage uses the lab numbers x10 (heroes have about 1000 HP here).
 */
import type { Clip, Hit, Status } from '../trial/anims';
import { boulder, bubble, clockRing, flames, flare, gearFx, glow, iceSpike, lotus, projectile, rockSpike, streak, swirl, vineLine, wave, wavy, well, type FxCol, type ProjKind } from '../trial/fx';
import { drawBolt, drawFlare, drawPillar, drawStormCloud, type Theme } from '../stages/engine/fx';
import type { Hero, Target, World } from './fight';
import type { El } from './save';
import type { G } from './ui';

type P = { x: number; y: number };
type Shape = 'line' | 'leaf' | 'petal' | 'shard' | 'drop' | 'dust' | 'ember';
interface MSpark { x: number; y: number; vx: number; vy: number; life: number; max: number; col: string; w: number; grav: number; shape: Shape; rot: number }
interface Thing {
  kind: string;
  owner: Hero;
  x: number;
  y: number;
  life: number;
  max: number;
  dir: number;
  w: number;
  h: number;
  seed: number;
  t: number;
  /** the owner's scale against the lab's */
  q: number;
  data?: number;
  hit: Set<number>;
  grab?: Target;
}
interface Proj { owner: Hero; kind: ProjKind; x: number; y: number; vx: number; vy: number; grav: number; r: number; life: number; hit: Hit; trail: P[]; done?: boolean }
interface Bolt { a: P; b: P; life: number; max: number; width: number; theme: Theme; forks: number; seed: number }
export interface MoveFx {
  things: Thing[];
  projs: Proj[];
  sparks: MSpark[];
  flares: Array<{ x: number; y: number; size: number; life: number; max: number; c: FxCol }>;
  rings: Array<{ x: number; y: number; r: number; life: number; max: number; col: string }>;
  bolts: Bolt[];
}
export const newMoveFx = (): MoveFx => ({ things: [], projs: [], sparks: [], flares: [], rings: [], bolts: [] });
export interface Ghost { x: number; feet: number; facing: 1 | -1; pose: Hero['shown']; life: number; max: number }

const rgb = (t: string, a = 1) => `rgba(${t},${a})`;
const WHITE: FxCol = { glow: '200,220,255', mid: '240,248,255', core: '255,255,255' };
const rnd = Math.random;
const LAB_S = 0.74;
const qOf = (h: Hero) => h.scale / LAB_S;
const SHAPES: Record<El, Shape> = { fire: 'ember', water: 'drop', ice: 'shard', wind: 'leaf', earth: 'dust', leaf: 'petal', light: 'line', gravity: 'line', time: 'line', lightning: 'line' };
const H = (dmg: number, kb: number, lift: number, stun: number, fx: Hit['fx'] = 'bolt', extra: Partial<Hit> = {}): Hit => ({ from: 0, to: 0, box: { x: 0, y: 0, w: 0, h: 0 }, dmg, kb, lift, stop: Math.min(14, 3 + Math.round(dmg / 2)), stun, fx, ...extra });
const STATUS_TEXT: Record<Status, string> = { burn: 'BURN', slow: 'SLOW', freeze: 'FROZEN', root: 'ROOTED', float: 'FLOAT', bubble: 'TRAPPED', stop: 'STOPPED', dazzle: 'DAZZLED' };

// ---------------------------------------------------------------- small helpers
const isHero = (t: Target): t is Hero => 'status' in t && 'kit' in t;
function foes(w: World, h: Hero): Target[] {
  return w.targets().filter((t) => t.team !== h.team && t.alive());
}
function nearest(w: World, h: Hero): Target | null {
  let best: Target | null = null;
  let d = Infinity;
  for (const t of foes(w, h)) {
    const dd = Math.abs(t.x - h.x);
    if (dd < d) {
      d = dd;
      best = t;
    }
  }
  return best;
}
const span = (w: World) => w.span ?? 1;
/** the foe's x, or a point ahead when there is none */
function targetX(w: World, h: Hero, ahead: number): number {
  const f = nearest(w, h);
  const x = f && Math.abs(f.x - h.x) < 900 * qOf(h) * span(w) ? f.x : h.x + h.facing * ahead * qOf(h) * span(w);
  return Math.max(w.left, Math.min(w.right, x));
}
const chestOf = (t: Target): P => (isHero(t) ? t.chest() : { x: t.x, y: t.box().y + t.box().h * 0.35 });
function addSparks(w: World, x: number, y: number, n: number, col: string, speed = 9, grav = 0.35, life = 30, shape: Shape = 'line'): void {
  const m = w.mv;
  for (let i = 0; i < n && m.sparks.length < 600; i++) {
    const a = rnd() * Math.PI * 2;
    const v = speed * (0.3 + rnd());
    m.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: life * (0.6 + rnd() * 0.6), max: life * 1.2, col: rnd() < 0.3 ? '#ffffff' : col, w: 2 + rnd() * 2, grav, shape, rot: rnd() * 6 });
  }
}
function elSparks(w: World, h: Hero, x: number, y: number, n: number, speed = 9, life = 34): void {
  const k = h.kit;
  const shape = SHAPES[h.el];
  const grav = shape === 'ember' ? -0.12 : shape === 'leaf' || shape === 'petal' ? 0.05 : shape === 'dust' ? 0.25 : 0.4;
  addSparks(w, x, y, Math.ceil(n * 0.6), rgb(k.fx.mid), speed, 0.3, life * 0.8, 'line');
  addSparks(w, x, y, Math.ceil(n * 0.5), h.el === 'leaf' ? '#ff9fd0' : rgb(k.fx2.mid), speed * 0.8, grav, life * 1.4, shape);
}
const addFlare = (w: World, x: number, y: number, size: number, life: number, c: FxCol) => w.mv.flares.push({ x, y, size, life, max: life, c });
const ring = (w: World, x: number, y: number, r: number, life: number, col: string) => w.mv.rings.push({ x, y, r, life, max: life, col });
const addBolt = (w: World, a: P, b: P, life = 12, width = 1, theme: Theme = 'cyan', forks = 3) => w.mv.bolts.push({ a, b, life, max: life, width, theme, forks, seed: Math.floor(rnd() * 1e6) });
function thing(w: World, h: Hero, kind: string, x: number, y: number, life: number, o: Partial<Thing> = {}): Thing {
  const t: Thing = { kind, owner: h, x, y, life, max: life, dir: 1, w: 0, h: 0, seed: Math.floor(rnd() * 1e6), t: 0, q: qOf(h), hit: new Set(), ...o };
  w.mv.things.push(t);
  return t;
}
function say(w: World, x: number, y: number, text: string, col: string, size = 28): void {
  w.floaters.push({ x, y, text, col, size, life: 50, max: 50 });
}
function shake(w: World, n: number): void {
  w.shake = Math.max(w.shake, n);
}
export function applyStatus(w: World, t: Hero, s: Status, dur: number, by?: Hero): void {
  const d = s === 'burn' && by?.el === 'fire' ? Math.round(dur * 1.3) : dur;
  t.status[s] = Math.max(t.status[s] ?? 0, d);
  const c = t.chest();
  say(w, c.x, c.y - 170 * t.scale, STATUS_TEXT[s], rgb((by ?? t).kit.fx.mid), 26);
  if (s === 'float' || s === 'bubble') {
    t.grounded = false;
    t.vy = Math.min(t.vy, -6);
  }
}
/** one hit from a power: lab damage x10, the hero's Spirit, the status if it lands */
function hitT(w: World, att: Hero, t: Target, h: Hit, at?: P): boolean {
  if (!t.alive()) return false;
  const dmg = Math.round(h.dmg * 10 * att.st[2] * (0.9 + rnd() * 0.2));
  const c = at ?? chestOf(t);
  const got = att.land(w, t, dmg, Math.abs(h.kb), Math.max(0, -h.lift), h.stun, c.x, c.y, h.fx === 'big');
  if (got > 0) {
    elSparks(w, att, c.x, c.y, h.fx === 'big' ? 40 : 18, h.fx === 'big' ? 13 : 9);
    addFlare(w, c.x, c.y, h.fx === 'big' ? 140 : 80, h.fx === 'big' ? 18 : 12, att.kit.fx);
    if (h.status && isHero(t)) applyStatus(w, t, h.status, h.dur ?? 60, att);
  }
  return got > 0;
}
/** area hit at x on every foe in reach (lab units) */
function strikeAt(w: World, att: Hero, x: number, reach: number, h: Hit, groundedOnly = false, once?: Set<number>): boolean {
  let any = false;
  for (const t of foes(w, att)) {
    if (once?.has(t.id)) continue;
    if (Math.abs(t.x - x) > reach * qOf(att)) continue;
    if (groundedOnly && t.feet < w.ground - 4) continue;
    once?.add(t.id);
    any = hitT(w, att, t, h) || any;
  }
  return any;
}
function shoot(w: World, h: Hero, kind: ProjKind, speed: number, r: number, hit: Hit, o: Partial<Proj> = {}): void {
  const q = qOf(h);
  const hand = h.joint('fw');
  const sp = (h.el === 'light' ? speed * 1.2 : speed) * q;
  w.mv.projs.push({ owner: h, kind, x: hand.x + h.facing * 20 * q, y: hand.y, vx: sp * h.facing, vy: 0, grav: 0, r: r * q, life: 90, hit, trail: [], ...o });
  addFlare(w, hand.x, hand.y, 70 * q, 12, h.kit.fx);
  elSparks(w, h, hand.x, hand.y, 12, 6);
}
const markOf = (w: World, h: Hero, kind = 'mark') => w.mv.things.find((t) => t.kind === kind && t.owner === h);

// ---------------------------------------------------------------- power events
/** a clip event of a hero (the clips name them at fixed frames) */
export function moveEvent(w: World, h: Hero, ev: string): void {
  if (h.el === 'lightning') return lightningEvent(w, h, ev);
  if (ev === 'trail') return;
  if (ev === 'slam') return slam(w, h);
  if (ev.startsWith('ult')) return ultEvent(w, h, ev);
  const q = qOf(h);
  const hand = h.joint('fw');
  const tx = targetX(w, h, 340);
  const G0 = w.ground;
  const foe = nearest(w, h);
  switch (`${h.el}:${ev}`) {
    case 'fire:shoot':
      return shoot(w, h, 'fireball', 15, 22, H(10, 6, -3, 26, 'bolt', { status: 'burn', dur: 150 }));
    case 'fire:mark':
      thing(w, h, 'mark', tx, G0, 22, { w: 90 });
      return;
    case 'fire:column': {
      const m = markOf(w, h);
      const x = m ? m.x : tx;
      thing(w, h, 'column', x, G0, 46, { w: 110, h: 620 });
      ring(w, x, G0, 260 * q, 24, h.kit.fx.mid);
      w.flash = Math.max(w.flash, 5);
      shake(w, 16);
      strikeAt(w, h, x, 100, H(20, 3, -19, 50, 'big', { status: 'burn', dur: 120 }));
      return;
    }
    case 'water:jet':
      h.beam = 18;
      return;
    case 'water:shoot':
      return shoot(w, h, 'bubble', 6.5, 46, H(6, 0, 0, 20, 'spark', { status: 'bubble', dur: 100 }), { life: 140 });
    case 'ice:shoot':
      return shoot(w, h, 'shard', 24, 18, H(8, 4, 0, 20, 'bolt', { status: 'slow', dur: 150 }));
    case 'ice:cast': {
      const x = Math.max(w.left, Math.min(w.right, h.x + h.facing * 170 * q * span(w)));
      thing(w, h, 'wall', x, G0, 240, { w: 70, h: 300, dir: h.facing });
      ring(w, x, G0, 180 * q, 18, h.kit.fx.mid);
      elSparks(w, h, x, G0 - 100 * q, 40, 10);
      shake(w, 8);
      for (const t of foes(w, h)) if (Math.abs(t.x - x) < 70 * q) hitT(w, h, t, H(6, 10, -5, 20, 'bolt'));
      return;
    }
    case 'wind:shoot':
      if (h.clipName === 'breezeShove') {
        thing(w, h, 'gustCone', hand.x, hand.y, 22, { dir: h.facing, w: 260 });
        return;
      }
      return shoot(w, h, 'blade', 21, 30, H(7, 5, -2, 22, 'bolt'), { life: 110, y: hand.y + (rnd() - 0.5) * 40 * q });
    case 'wind:whirl':
      thing(w, h, 'whirl', h.x, G0, 32, { w: 120 });
      return;
    case 'earth:lift':
      thing(w, h, 'liftRock', h.x, G0, 13);
      return;
    case 'earth:shoot': {
      const dx = tx - hand.x;
      const vx = Math.max(-22 * q, Math.min(22 * q, dx / 34));
      w.mv.projs.push({ owner: h, kind: 'boulder', x: hand.x, y: hand.y - 30 * q, vx: Math.abs(vx) < 4 * q ? 4 * q * h.facing : vx, vy: -17 * q, grav: 1.0 * q, r: 34 * q, life: 120, hit: H(14, 7, -8, 36, 'big'), trail: [] });
      return;
    }
    case 'earth:fist': {
      const p = h.joint('bw');
      boulderBurst(w, p.x + h.facing * 30 * q, p.y, q);
      return;
    }
    case 'leaf:vine':
      thing(w, h, 'vine', hand.x, hand.y, 30, { dir: h.facing, w: 430 });
      return;
    case 'leaf:mine': {
      const x = h.x + h.facing * 90 * q;
      thing(w, h, 'mine', x, G0, 600);
      elSparks(w, h, x, G0 - 10, 14, 5);
      return;
    }
    case 'leaf:cast': {
      for (let i = 0; i < 9; i++) thing(w, h, 'root', h.x + h.facing * (60 + i * 55) * q * span(w), G0, 70 + i * 3, { data: i * 3, seed: i * 31 + 5, dir: h.facing });
      const heal = Math.round(h.maxHp * 0.08);
      h.hp = Math.min(h.maxHp, h.hp + heal);
      say(w, h.x, h.chest().y - 180 * h.scale, `+${heal} HP`, '#a6ff7a', 32);
      return;
    }
    case 'light:shoot':
      return shoot(w, h, 'dart', 30, 14, H(8, 4, 0, 20, 'bolt', { status: 'dazzle', dur: 90 }));
    case 'light:beam':
      h.beam = 24;
      return;
    case 'light:cast': {
      h.barrier = 360;
      const c = h.chest();
      ring(w, h.x, c.y, 200 * q, 24, h.kit.fx.mid);
      elSparks(w, h, c.x, c.y, 40, 9);
      return;
    }
    case 'gravity:well':
      thing(w, h, 'well', tx, G0 - 120 * q, 70, { w: 90 });
      return;
    case 'gravity:mark':
      thing(w, h, 'mark', tx, G0, 22, { w: 100 });
      return;
    case 'gravity:drop': {
      const m = markOf(w, h);
      thing(w, h, 'anchor', m ? m.x : tx, G0 - 700 * q, 26, { w: 80 });
      return;
    }
    case 'gravity:cast': {
      if (foe && Math.abs(foe.x - h.x) < 520 * q) {
        if (isHero(foe)) {
          applyStatus(w, foe, 'float', 150, h);
          foe.vy = -9;
        }
        ring(w, foe.x, chestOf(foe).y, 160 * q, 24, h.kit.fx.mid);
      } else say(w, h.x + h.facing * 200 * q, G0 - 200 * q, 'OUT OF RANGE', '#ff9fb4', 24);
      thing(w, h, 'pulse', h.x, h.chest().y, 30, { w: 520 });
      return;
    }
    case 'time:rewind': {
      const old = h.history[0] ?? { x: h.x, feet: h.feet };
      const from = h.chest();
      for (let i = 0; i < h.history.length; i += 12) h.ghosts.push({ x: h.history[i].x, feet: h.history[i].feet, facing: h.facing, pose: { ...h.shown }, life: 26, max: 26 });
      h.x = old.x;
      h.feet = old.feet;
      h.grounded = h.feet >= G0;
      thing(w, h, 'clock', from.x, from.y, 26, { w: 120 });
      thing(w, h, 'clock', h.x, h.chest().y, 26, { w: 120 });
      return;
    }
    case 'time:cast':
      thing(w, h, 'field', h.x + h.facing * 260 * q * span(w), G0, 240, { w: 240 });
      return;
    case 'time:shoot':
      return shoot(w, h, 'freeze', 13, 34, H(0, 0, 0, 0, 'spark', { status: 'stop', dur: 72 }), { life: 70 });
  }
}
function boulderBurst(w: World, x: number, y: number, q: number): void {
  for (let i = 0; i < 7; i++) w.mv.sparks.push({ x, y, vx: (rnd() - 0.5) * 16 * q, vy: (-6 - rnd() * 9) * q, life: 40, max: 40, col: '#8a6038', w: (6 + rnd() * 8) * q, grav: 0.6 * q, shape: 'dust', rot: rnd() * 6 });
}
/** the heavy's ground slam in the element's style */
function slam(w: World, h: Hero): void {
  const q = qOf(h);
  const G0 = w.ground;
  const x = h.x + h.facing * 110 * q;
  elSparks(w, h, x, G0 - 10, 40, 12);
  addFlare(w, x, G0 - 10, 130 * q, 16, h.kit.fx);
  ring(w, x, G0, 220 * q, 18, h.kit.fx.mid);
  shake(w, 14);
  const name = h.clipName;
  if (h.el === 'water' && name === 'undertow') {
    thing(w, h, 'wave', x, G0, 120, { dir: h.facing, w: 170, h: 150 });
    return;
  }
  if (h.el === 'ice' && name === 'permafrost') {
    thing(w, h, 'permafrost', h.x, G0, 70, { w: 300 });
    w.flash = Math.max(w.flash, 4);
    for (const t of foes(w, h)) if (Math.abs(t.x - h.x) < 300 * q) hitT(w, h, t, H(12, 2, -4, 30, 'big', { status: 'freeze', dur: 90 }));
    return;
  }
  if (h.el === 'earth' && name === 'groundbreak') {
    thing(w, h, 'quake', x, G0, 60, { dir: h.facing });
    thing(w, h, 'quake', x, G0, 60, { dir: -h.facing });
    return;
  }
  thing(w, h, 'scorch', x, G0, 80, { w: 110 });
  if (h.el === 'fire') thing(w, h, 'floorFire', x, G0, 60, { w: 120 });
  if (h.el === 'ice') for (let i = -2; i <= 2; i++) thing(w, h, 'spike', x + i * 34 * q, G0, 40, { h: 70 - Math.abs(i) * 14, w: 26, dir: i * 12 });
  if (h.el === 'earth') boulderBurst(w, x, G0 - 20 * q, q);
  if (h.el === 'leaf') for (let i = 0; i < 4; i++) thing(w, h, 'root', x + (i - 1.5) * 40 * q, G0, 50, { data: i * 2, seed: i * 13 + 1, dir: h.facing });
  if (h.el === 'time') thing(w, h, 'clock', x, G0 - 60 * q, 30, { w: 150 });
  if (h.el === 'gravity') thing(w, h, 'pulse', x, G0 - 40 * q, 26, { w: 260 });
}
function ultEvent(w: World, h: Hero, ev: string): void {
  const q = qOf(h);
  const G0 = w.ground;
  const tx = targetX(w, h, 340);
  const foe = nearest(w, h);
  const hitSmall = H(4, 1, -4, 24, 'bolt');
  const hitFinal = H(16, 6, -19, 60, 'big');
  if (ev === 'ultStart') {
    thing(w, h, 'ultSelf', h.x, G0, 60, { w: 200 });
    return;
  }
  if (ev === 'ultCall') {
    thing(w, h, 'ultScene', tx, G0, 70, { w: 260 });
    const st: Partial<Record<El, Status>> = { time: 'stop', gravity: 'float', wind: 'float', water: 'bubble' };
    const s = st[h.el];
    if (s && foe && isHero(foe)) applyStatus(w, foe, s, s === 'stop' ? 60 : 66, h);
    w.flash = Math.max(w.flash, 4);
    return;
  }
  if (ev === 'ultHit') {
    const x = tx + (rnd() - 0.5) * 50 * q;
    switch (h.el) {
      case 'fire':
        w.mv.projs.push({ owner: h, kind: 'fireball', x: x + (-160 + rnd() * 80) * q, y: G0 - 760 * q, vx: 6 * q, vy: 22 * q, grav: 0, r: 22 * q, life: 60, hit: { ...hitSmall, status: 'burn', dur: 60 }, trail: [] });
        break;
      case 'earth':
        w.mv.projs.push({ owner: h, kind: 'boulder', x: x + (rnd() - 0.5) * 60 * q, y: G0 - 780 * q, vx: 0, vy: 14 * q, grav: 0.8 * q, r: 30 * q, life: 80, hit: hitSmall, trail: [] });
        break;
      case 'ice':
        thing(w, h, 'spike', x + (rnd() - 0.5) * 80 * q, G0, 40, { h: 160, w: 44, dir: (rnd() - 0.5) * 30 });
        strikeAt(w, h, x, 90, { ...hitSmall, status: 'slow', dur: 60 });
        break;
      case 'light':
        thing(w, h, 'ray', x, G0, 18, { w: 46 });
        strikeAt(w, h, x, 80, hitSmall);
        break;
      case 'time': {
        const side = rnd() < 0.5 ? -1 : 1;
        h.ghosts.push({ x: x + side * 120 * q, feet: G0, facing: side > 0 ? -1 : 1, pose: { ...h.shown }, life: 20, max: 20 });
        thing(w, h, 'slash', x, foe ? chestOf(foe).y : G0 - 160 * q, 14, { dir: side, w: 220 });
        strikeAt(w, h, x, 120, hitSmall);
        break;
      }
      default:
        thing(w, h, 'burst', x, foe ? chestOf(foe).y : G0 - 160 * q, 16, { w: 90 });
        strikeAt(w, h, x, 110, hitSmall);
    }
    return;
  }
  if (ev === 'ultFinal') {
    thing(w, h, 'ultFinal', tx, G0, 50, { w: 300 });
    strikeAt(w, h, tx, 160, hitFinal);
    if (h.el === 'leaf') {
      const heal = Math.round(h.maxHp * 0.15);
      h.hp = Math.min(h.maxHp, h.hp + heal);
      say(w, h.x, h.chest().y - 180 * h.scale, `+${heal} HP`, '#a6ff7a', 34);
    }
    w.flash = Math.max(w.flash, 12);
    shake(w, 28);
  }
}

// ---------------------------------------------------------------- Lightning (his own lab's moves)
function lightningEvent(w: World, h: Hero, ev: string): void {
  const q = qOf(h);
  const G0 = w.ground;
  const foe = nearest(w, h);
  if (ev === 'teleport') {
    const from = h.chest();
    h.ghosts.push({ x: h.x, feet: h.feet, facing: h.facing, pose: { ...h.shown }, life: 26, max: 26 });
    const target = foe && Math.abs(foe.x - h.x) < 900 * q * span(w) ? foe.x + (foe.x > h.x ? 120 : -120) * q : h.x + h.facing * 280 * q * span(w);
    h.x = Math.max(w.left, Math.min(w.right, target));
    if (foe) h.facing = foe.x > h.x ? 1 : -1;
    const to = h.chest();
    addBolt(w, from, to, 22, 2.2 * q, 'white', 5);
    addBolt(w, { x: from.x, y: from.y + 30 * q }, { x: to.x, y: to.y + 30 * q }, 18, 1.2 * q, 'gold', 2);
    addSparks(w, from.x, from.y, 30, '#9ff3ff');
    addSparks(w, to.x, to.y, 36, '#ffe27a');
    addFlare(w, from.x, from.y, 90 * q, 14, h.kit.fx2);
    addFlare(w, to.x, to.y, 110 * q, 16, WHITE);
    w.flash = Math.max(w.flash, 3);
  } else if (ev === 'beam') h.beam = 24;
  else if (ev === 'beamEnd') {
    const tp = beamEnd(w, h, 470);
    addFlare(w, tp.x, tp.y, 160 * q, 20, WHITE);
    ring(w, tp.x, tp.y, 200 * q, 20, '160,240,255');
    addSparks(w, tp.x, tp.y, 50, '#9ff3ff', 13);
  } else if (ev === 'mark') {
    const x = targetX(w, h, 320);
    thing(w, h, 'lmark', x, G0, 30, { w: 110 });
    thing(w, h, 'cloud', x, G0, 60, { w: 320 });
    const hand = h.joint('fw');
    addBolt(w, hand, { x: hand.x + (rnd() - 0.5) * 40, y: G0 - 760 * q }, 30, 0.9 * q, 'cyan', 2);
  } else if (ev === 'skybolt') {
    const m = markOf(w, h, 'lmark');
    skyStrike(w, h, m ? m.x : targetX(w, h, 320), true, H(22, 3, -16, 50, 'big'));
    if (m) m.life = 0;
  } else if (ev === 'slam') {
    const x = h.x + h.facing * 110 * q;
    addSparks(w, x, G0, 46, '#ffd84a', 12);
    addFlare(w, x, G0 - 10, 130 * q, 16, h.kit.fx);
    ring(w, x, G0, 220 * q, 18, '255,228,120');
    for (const dir of [1, -1]) thing(w, h, 'groundArc', x, G0, 30, { dir });
    thing(w, h, 'scorch', x, G0, 90, { w: 110 });
    shake(w, 14);
  } else if (ev === 'ultCall') {
    const x = targetX(w, h, 320);
    thing(w, h, 'cloud', x, G0, 80, { w: 420 });
    const hand = h.joint('fw');
    for (let i = 0; i < 3; i++) addBolt(w, hand, { x: hand.x + (i - 1) * 60 * q, y: G0 - 760 * q }, 40, 1.2 * q, i === 1 ? 'white' : 'gold', 3);
  } else if (ev === 'ultBolt') skyStrike(w, h, targetX(w, h, 320) + (rnd() - 0.5) * 50 * q, false, H(4, 1, -4, 24, 'bolt'));
  else if (ev === 'ultFinal') {
    const x = targetX(w, h, 320);
    skyStrike(w, h, x, true, H(16, 6, -19, 60, 'big'));
    thing(w, h, 'pillar', x, G0, 40, { w: 90 });
    w.flash = Math.max(w.flash, 12);
    shake(w, 28);
  }
}
/** a bolt from the sky at x (big: a pillar and a scorch mark); hits the foe standing under it */
function skyStrike(w: World, h: Hero, x: number, big: boolean, hit: Hit): void {
  const q = qOf(h);
  const G0 = w.ground;
  for (let i = 0; i < (big ? 3 : 2); i++) addBolt(w, { x: x + (rnd() - 0.5) * 60 * q, y: G0 - 780 * q }, { x, y: G0 }, big ? 22 : 14, (big ? 2.6 : 1.6) * q, i === 0 ? 'white' : i === 1 ? 'cyan' : 'gold', 4);
  if (big) thing(w, h, 'pillar', x, G0, 28, { w: 60 });
  addSparks(w, x, G0 - 10, big ? 80 : 30, '#9ff3ff', big ? 15 : 10);
  addFlare(w, x, G0 - 20, (big ? 200 : 110) * q, big ? 22 : 12, WHITE);
  ring(w, x, G0, (big ? 300 : 150) * q, 24, '160,240,255');
  thing(w, h, 'scorch', x, G0, big ? 120 : 70, { w: big ? 140 : 80 });
  strikeAt(w, h, x, big ? 110 : 80, hit);
  if (big) shake(w, 16);
}

// ---------------------------------------------------------------- per-frame hero hooks
/** runs every frame of a clip: Scorch Dash's burning trail, the dash afterimages */
export function clipTick(w: World, h: Hero, c: Clip, frame: number): void {
  const q = qOf(h);
  if (h.el === 'fire' && c.name === 'Scorch Dash' && frame >= 9 && frame <= 25 && frame % 2 === 0) thing(w, h, 'floorFire', h.x - h.facing * 20 * q, w.ground, 70, { w: 46 });
  if (h.clipName === 'dash' && frame < 14 && frame % 2 === 0) {
    h.ghosts.push({ x: h.x, feet: h.feet, facing: h.facing, pose: { ...h.shown }, life: 18, max: 18 });
    addSparks(w, h.x, w.ground - 4, 2, rgb(h.kit.fx.mid), 3, 0.2, 24, SHAPES[h.el]);
    if (h.el === 'lightning') addBolt(w, { x: h.x - h.facing * 80 * q, y: h.chest().y }, h.chest(), 8, 0.8 * q, 'cyan', 1);
  }
  const live = (c.hits ?? []).some((x) => frame >= x.from - 3 && frame <= x.to + 2);
  if (c.limb && live && frame % 2 === 0) {
    const j = h.joint(c.limb);
    addSparks(w, j.x, j.y, 3, rgb(h.kit.fx.mid), 4, 0.1, 16, SHAPES[h.el] === 'ember' ? 'ember' : 'line');
  }
}
/**
 * Statuses on a hero, once per frame. Returns 'stop' when nothing may move (time stop, frozen), 'skip' on the
 * frames a slowed hero sits out, 'held' when the hero cannot act (trapped in a bubble), otherwise null.
 */
export function statusTick(w: World, h: Hero): 'stop' | 'skip' | 'held' | null {
  const s = h.status;
  for (const k of Object.keys(s) as Status[]) {
    s[k] = (s[k] ?? 0) - 1;
    if ((s[k] ?? 0) <= 0) delete s[k];
  }
  if (h.barrier > 0) h.barrier--;
  if (s.burn && w.frame % 30 === 0 && h.hp > 10) {
    h.hp -= 10;
    say(w, h.x, h.chest().y - 150 * h.scale, '10', '#ffb060', 22);
  }
  if (s.burn && w.frame % 3 === 0) addSparks(w, h.x + (rnd() - 0.5) * 50 * h.scale, h.feet - rnd() * 260 * h.scale, 1, '#ffa040', 2, -0.2, 26, 'ember');
  if (s.stop || s.freeze) {
    if (s.freeze && w.frame % 4 === 0) addSparks(w, h.x + (rnd() - 0.5) * 60 * h.scale, h.feet - rnd() * 260 * h.scale, 1, '#dff6ff', 1, 0.05, 20, 'shard');
    return 'stop';
  }
  if (s.slow) {
    h.slowAcc += 0.5;
    if (h.slowAcc < 1) return 'skip';
    h.slowAcc -= 1;
  }
  if (s.root) h.vx = 0;
  if (s.float || s.bubble) {
    const hover = w.ground - (s.bubble ? 170 : 210) * h.scale;
    h.grounded = false;
    h.vy = (hover - h.feet) * 0.08;
    h.vx *= 0.9;
  }
  h.history.push({ x: h.x, feet: h.feet });
  if (h.history.length > 120) h.history.shift();
  return s.bubble ? 'held' : null;
}

// ---------------------------------------------------------------- world step
function beamEnd(w: World, h: Hero, reach: number): P {
  const hand = h.joint('fw');
  const r = reach * qOf(h);
  const f = nearest(w, h);
  if (f && Math.sign(f.x - h.x) === h.facing && Math.abs(f.x - h.x) < r + 40) return chestOf(f);
  return { x: hand.x + h.facing * r, y: hand.y };
}
const beamReach = (h: Hero) => (h.el === 'water' ? 420 : h.el === 'lightning' ? 470 : 620);
export function stepMoves(w: World, heroes: Hero[]): void {
  const m = w.mv;
  const G0 = w.ground;
  // beams: Jet Lance (water) and Sunlance (light) hit every 6 frames; Chain Bolt's hits come from its clip
  for (const h of heroes) {
    if (h.beam <= 0) continue;
    h.beam--;
    if (!h.clip) {
      h.beam = 0;
      continue;
    }
    const e = beamEnd(w, h, beamReach(h));
    if (w.frame % 2 === 0) {
      if (h.el === 'lightning') {
        addSparks(w, e.x, e.y, 4, '#9ff3ff', 7);
        if (rnd() < 0.5) addBolt(w, e, { x: e.x + (rnd() - 0.5) * 140 * qOf(h), y: G0 }, 8, 0.8 * qOf(h), 'cyan', 1);
      } else elSparks(w, h, e.x, e.y, 3, 7, 24);
    }
    if (h.el !== 'lightning' && h.beam % 6 === 0) {
      const last = h.beam < 6;
      const hit = h.el === 'water' ? H(last ? 6 : 3, last ? 15 : 4, last ? -4 : 0, 22, last ? 'bolt' : 'spark') : H(last ? 8 : 5, last ? 7 : 2, 0, 22, last ? 'bolt' : 'spark');
      for (const t of foes(w, h)) if (Math.sign(t.x - h.x) === h.facing && Math.abs(t.x - h.x) < beamReach(h) * qOf(h) + 40) hitT(w, h, t, hit, e);
    }
  }
  // projectiles
  for (const pr of m.projs) {
    pr.trail.push({ x: pr.x, y: pr.y });
    if (pr.trail.length > 10) pr.trail.shift();
    pr.vy += pr.grav;
    pr.x += pr.vx;
    pr.y += pr.vy;
    pr.life--;
    if (pr.kind === 'bubble') pr.y += Math.sin(w.frame / 6) * 1.2;
    if (w.frame % 2 === 0 && pr.kind !== 'bubble') addSparks(w, pr.x, pr.y, 1, rgb(pr.owner.kit.fx.mid), 2, pr.kind === 'fireball' ? -0.15 : 0.1, 18, pr.kind === 'fireball' ? 'ember' : 'line');
    if (pr.y > G0 - 4) {
      pr.done = true;
      impact(w, pr, pr.x, G0 - 10);
      if (pr.kind === 'boulder') strikeAt(w, pr.owner, pr.x, 90, pr.hit);
      continue;
    }
    if (pr.x < w.left - 200 || pr.x > w.right + 200 || pr.life <= 0) {
      pr.done = true;
      continue;
    }
    const r = pr.r * 0.8;
    for (const t of foes(w, pr.owner)) {
      const b = t.box();
      if (pr.x + r > b.x && pr.x - r < b.x + b.w && pr.y + r > b.y && pr.y - r < b.y + b.h) {
        hitT(w, pr.owner, t, pr.hit, { x: pr.x, y: pr.y });
        impact(w, pr, pr.x, pr.y);
        pr.done = true;
        break;
      }
    }
  }
  m.projs = m.projs.filter((p) => !p.done);
  // floor things
  for (const t of m.things) {
    t.t++;
    t.life--;
    const p = t.owner;
    const q = t.q;
    const list = foes(w, p);
    switch (t.kind) {
      case 'wave':
        t.x += t.dir * 12 * q;
        if (w.frame % 2 === 0) addSparks(w, t.x + t.dir * 40 * q, G0 - t.h * q, 3, '#dffaff', 6, 0.4, 24, 'drop');
        for (const d of list) if (!t.hit.has(d.id) && Math.abs(d.x - t.x) < 80 * q && d.feet >= G0 - 4) {
          t.hit.add(d.id);
          hitT(w, p, d, H(14, 9, -13, 40, 'big'));
        }
        if (t.x < w.left || t.x > w.right) t.life = Math.min(t.life, 8);
        break;
      case 'quake': {
        t.w += 16;
        const x = t.x + t.dir * t.w * q;
        if (t.t % 3 === 0) thing(w, p, 'rockSpike', x, G0, 34, { h: 90 + rnd() * 50, w: 40, dir: t.dir * 14 });
        for (const d of list) if (!t.hit.has(d.id) && Math.abs(d.x - x) < 50 * q) {
          t.hit.add(d.id);
          if (d.feet >= G0 - 4) hitT(w, p, d, H(18, 4, -15, 46, 'big'));
        }
        break;
      }
      case 'wall':
        for (const d of list) if (Math.abs(d.x - t.x) < 55 * q) d.x = t.x + Math.sign(d.x - t.x || -t.dir) * 55 * q;
        if (t.life === 1) elSparks(w, p, t.x, G0 - 140 * q, 50, 12);
        break;
      case 'mine':
        for (const d of list)
          if (t.t > 20 && Math.abs(d.x - t.x) < 50 * q && d.feet >= G0 - 4) {
            t.life = 0;
            hitT(w, p, d, H(8, 0, 0, 20, 'bolt', { status: 'root', dur: 110 }), { x: t.x, y: G0 - 60 * q });
            for (let i = 0; i < 5; i++) thing(w, p, 'root', t.x + (i - 2) * 24 * q, G0, 110, { data: i, seed: i * 7 + 3, dir: 1 });
            break;
          }
        break;
      case 'vine': {
        const reach = t.w * q * Math.min(1, t.t / 8);
        if (!t.grab)
          for (const d of list)
            if (Math.sign(d.x - t.x) === t.dir && Math.abs(d.x - t.x) < reach) {
              t.grab = d;
              hitT(w, p, d, H(7, 0, 0, 34, 'bolt'));
              break;
            }
        if (t.grab && t.grab.alive() && t.t > 10) {
          const stop = p.x + t.dir * 110 * q;
          t.grab.x += (stop - t.grab.x) * 0.2;
        }
        break;
      }
      case 'field':
        for (const d of list) if (isHero(d) && Math.abs(d.x - t.x) < t.w * q) d.status.slow = Math.max(d.status.slow ?? 0, 6);
        break;
      case 'well':
        if (t.t > 6)
          for (const d of list) {
            if (Math.abs(d.x - t.x) > 500 * q) continue;
            const stop = p.x + p.facing * 120 * q;
            d.x += (stop - d.x) * 0.06;
            if (t.t === 40) hitT(w, p, d, H(9, 2, -3, 30, 'bolt'));
          }
        break;
      case 'anchor':
        t.y += 34 * q;
        if (t.y >= G0 - 60 * q && !t.data) {
          t.data = 1;
          t.life = 14;
          ring(w, t.x, G0, 280 * q, 22, p.kit.fx.mid);
          thing(w, p, 'scorch', t.x, G0, 80, { w: 120 });
          shake(w, 20);
          w.flash = Math.max(w.flash, 5);
          elSparks(w, p, t.x, G0 - 20, 40, 12);
          for (const d of list) if (Math.abs(d.x - t.x) < 110 * q) hitT(w, p, d, H(18, 2, 0, 50, 'big'));
        }
        break;
      case 'whirl':
        if (p.clip) t.x = p.x;
        if (t.t % 3 === 0) addSparks(w, p.x + (rnd() - 0.5) * 140 * q, G0 - rnd() * 200 * q, 2, '#9fffd0', 4, 0.02, 30, 'leaf');
        break;
      case 'gustCone':
        for (const d of list) if (!t.hit.has(d.id) && Math.sign(d.x - t.x) === t.dir && Math.abs(d.x - t.x) < t.w * q) {
          t.hit.add(d.id);
          hitT(w, p, d, H(9, 18, -6, 30, 'bolt'));
        }
        break;
      case 'root':
        if (t.t === (t.data ?? 0) + 4) for (const d of list) if (Math.abs(d.x - t.x) < 45 * q && d.feet >= G0 - 4 && !(isHero(d) && d.status.root)) hitT(w, p, d, H(9, 0, 0, 30, 'bolt', { status: 'root', dur: 120 }), { x: d.x, y: G0 - 80 * q });
        break;
      case 'floorFire':
        if (t.t % 20 === 10) for (const d of list) if (Math.abs(d.x - t.x) < t.w * q * 0.7 && d.feet >= G0 - 4) hitT(w, p, d, H(2, 0, 0, 8, 'spark', { status: 'burn', dur: 60 }));
        break;
      case 'groundArc':
        t.w += 17;
        if (w.frame % 2 === 0) addSparks(w, t.x + t.dir * t.w * q, G0 - 6, 2, '#ffe27a', 5);
        for (const d of list) if (!t.hit.has(d.id) && Math.abs(d.x - (t.x + t.dir * t.w * q)) < 40 * q && d.feet >= G0 - 4) {
          t.hit.add(d.id);
          hitT(w, p, d, H(6, 4, -6, 24, 'bolt'));
        }
        break;
    }
  }
  m.things = m.things.filter((t) => t.life > 0);
  for (const s of m.sparks) {
    s.x += s.vx;
    s.y += s.vy;
    s.vy += s.grav;
    s.vx *= 0.96;
    s.rot += 0.12;
    if (s.shape === 'leaf' || s.shape === 'petal') s.vx += Math.sin(s.life / 6) * 0.3;
    if (s.y > G0 && s.grav > 0) {
      s.y = G0;
      s.vy *= -0.3;
      s.vx *= 0.6;
    }
    s.life--;
  }
  m.sparks = m.sparks.filter((s) => s.life > 0);
  m.flares = m.flares.filter((f) => --f.life > 0);
  m.rings = m.rings.filter((r) => --r.life > 0);
  m.bolts = m.bolts.filter((b) => --b.life > 0);
}
function impact(w: World, pr: Proj, x: number, y: number): void {
  const h = pr.owner;
  const q = qOf(h);
  elSparks(w, h, x, y, pr.kind === 'boulder' ? 30 : 20, 10);
  addFlare(w, x, y, pr.r * 4, 14, h.kit.fx);
  ring(w, x, y, pr.r * 5, 16, h.kit.fx.mid);
  if (pr.kind === 'boulder') {
    boulderBurst(w, x, y, q);
    thing(w, h, 'scorch', x, w.ground, 60, { w: 70 });
    shake(w, 10);
  }
  if (pr.kind === 'fireball') thing(w, h, 'floorFire', x, w.ground, 40, { w: 60 });
}

// ---------------------------------------------------------------- drawing
/** draws a floor thing in lab units round its anchor (x, ground) */
function local(g: G, t: Thing, gr: number, fn: (y: number) => void): void {
  g.save();
  g.translate(t.x, gr);
  g.scale(t.q, t.q);
  fn((t.y - gr) / t.q);
  g.restore();
}
/** effects behind the heroes */
export function drawMovesBack(g: G, w: World): void {
  const gr = w.ground;
  for (const t of w.mv.things) {
    const k = t.life / t.max;
    const inK = Math.min(1, t.t / 6);
    const K = t.owner.kit;
    const FX = K.fx;
    const el = t.owner.el;
    switch (t.kind) {
      case 'scorch':
        local(g, t, gr, () => {
          g.fillStyle = `rgba(5,6,20,${0.5 * k})`;
          g.beginPath();
          g.ellipse(0, 6, t.w, t.w * 0.18, 0, 0, Math.PI * 2);
          g.fill();
          g.globalCompositeOperation = 'lighter';
          g.strokeStyle = rgb(el === 'lightning' ? '140,230,255' : FX.mid, 0.55 * k);
          g.lineWidth = 3;
          g.beginPath();
          g.ellipse(0, 6, t.w * 0.7, t.w * 0.12, 0, 0, Math.PI * 2);
          g.stroke();
        });
        break;
      case 'mark':
      case 'lmark':
        local(g, t, gr, () => {
          g.globalCompositeOperation = 'lighter';
          g.strokeStyle = rgb(t.kind === 'lmark' ? '150,240,255' : FX.mid, 0.6 + 0.4 * Math.sin(w.frame / 2));
          g.lineWidth = 4;
          g.beginPath();
          g.ellipse(0, 0, t.w * (0.6 + k * 0.6), 22 * (0.6 + k * 0.6), 0, 0, Math.PI * 2);
          g.stroke();
          if (t.kind === 'lmark') {
            g.beginPath();
          g.moveTo(-130, 0);
            g.lineTo(130, 0);
            g.stroke();
          }
          g.globalCompositeOperation = 'source-over';
          glow(g, 0, 0, t.w, FX, 0.3);
        });
        break;
      case 'field':
        local(g, t, gr, () => {
          const a = Math.min(1, k * 4, inK);
          clockRing(g, 0, 0, t.w, w.frame, FX, 0.8 * a, 0.2);
          g.save();
          g.globalCompositeOperation = 'lighter';
          const gd = g.createLinearGradient(0, -340, 0, 0);
          gd.addColorStop(0, rgb(FX.glow, 0));
          gd.addColorStop(1, rgb(FX.glow, 0.22 * a));
          g.fillStyle = gd;
          g.fillRect(-t.w, -340, t.w * 2, 340);
          g.restore();
          clockRing(g, 0, -200, 110, w.frame * 0.5, FX, 0.35 * a);
        });
        break;
      case 'mine':
        if (t.t < 20 || w.frame % 40 < 20)
          local(g, t, gr, () => {
            glow(g, 0, -6, 16, FX, t.t < 20 ? 0.8 : 0.35);
            g.fillStyle = '#2f6a2a';
            g.beginPath();
            g.arc(0, -5, 7, 0, Math.PI * 2);
            g.fill();
          });
        break;
      case 'permafrost':
        local(g, t, gr, () => {
          const grow = Math.min(1, t.t / 8);
          for (let i = -6; i <= 6; i++) {
            if (i === 0) continue;
            const u = Math.abs(i) / 6;
            iceSpike(g, i * 46, 0, (170 - u * 90) * grow * (0.8 + ((i * 7) % 5) / 10), 40 - u * 10, i * 6, Math.min(1, k * 3));
          }
        });
        break;
      case 'ultSelf':
        local(g, t, gr, () => {
          const a = Math.min(1, k * 3);
          if (el === 'water') {
            wave(g, -120, 0, 260 * Math.min(1, t.t / 20), 240, 1, w.frame, a * 0.8);
            wave(g, 120, 0, 260 * Math.min(1, t.t / 20), 240, -1, w.frame, a * 0.8);
          } else if (el === 'leaf') lotus(g, 0, 0, 300 * Math.min(1, t.t / 25), Math.min(1, t.t / 30), w.frame, a);
          else if (el === 'time') clockRing(g, 0, -150, 230, w.frame, FX, a * 0.8);
          else if (el === 'fire') flames(g, 0, 0, 300, 420 * Math.min(1, t.t / 18), w.frame, a * 0.85, 9);
        });
        break;
      case 'ultScene':
        local(g, t, gr, (y) => ultScene(g, w, t, k, true, y));
        break;
      case 'cloud':
        drawStormCloud(g, t.x, gr - 600 * t.q, t.w * t.q, Math.min(1, (1 - k) * 4, k * 3), w.frame);
        break;
    }
  }
}
/** effects in front of the heroes */
export function drawMovesFront(g: G, w: World): void {
  const heroes = w.targets().filter(isHero);
  const gr = w.ground;
  const m = w.mv;
  // beams
  for (const h of heroes) {
    if (h.beam <= 0) continue;
    const hand = h.joint('fw');
    const e = beamEnd(w, h, beamReach(h));
    const q = qOf(h);
    const FX = h.kit.fx;
    const a = Math.min(1, h.beam / 5);
    if (h.el === 'lightning') {
      drawBolt(g, hand, e, Math.floor(w.frame / 2) * 31, 1.8 * q, a, 'white', 4);
      drawBolt(g, hand, { x: e.x, y: e.y - 18 * q }, Math.floor(w.frame / 2) * 57 + 1, 0.9 * q, a, 'cyan', 2);
      drawBolt(g, hand, { x: e.x, y: e.y + 20 * q }, Math.floor(w.frame / 2) * 91 + 2, 0.8 * q, a, 'gold', 2);
      drawFlare(g, hand.x, hand.y, 55 * q, a, w.frame, 'cyan');
      drawFlare(g, e.x, e.y, 80 * q, a, w.frame + 3, 'white');
      continue;
    }
    if (h.el === 'water') for (let i = 0; i < 3; i++) streak(g, wavy(hand, { x: e.x, y: e.y + (i - 1) * 10 * q }, 14, 9 * q, w.frame / 2 + i * 2, 3), (13 - i * 3) * q, FX, a);
    else {
      streak(g, [hand, e], 26 * q, FX, a, false);
      streak(g, [hand, e], 9 * q, WHITE, a, false);
    }
    flare(g, hand.x, hand.y, 60 * q, a, w.frame, FX);
    flare(g, e.x, e.y, 90 * q, a, w.frame + 3, FX);
  }
  for (const pr of m.projs) projectile(g, pr.kind, pr.owner.kit, pr.x, pr.y, pr.vx, pr.vy, w.frame, pr.trail, pr.r);
  for (const t of m.things) {
    const k = t.life / t.max;
    const K = t.owner.kit;
    const FX = K.fx;
    const el = t.owner.el;
    switch (t.kind) {
      case 'column':
        local(g, t, gr, () => {
          flames(g, 0, 0, t.w * 1.4, t.h * Math.min(1, t.t / 5) * (0.7 + 0.3 * k), w.frame, Math.min(1, k * 2.5), t.seed);
          glow(g, 0, -60, 160, FX, 0.5 * k);
        });
        break;
      case 'floorFire':
        local(g, t, gr, () => flames(g, 0, 4, t.w, 50 * Math.min(1, k * 2), w.frame, Math.min(1, k * 2) * 0.8, t.seed));
        break;
      case 'wave':
        local(g, t, gr, () => wave(g, 0, 0, t.h * Math.min(1, t.t / 10), t.w, t.dir, w.frame, Math.min(1, k * 4)));
        break;
      case 'wall':
        local(g, t, gr, () => {
          const grow = Math.min(1, t.t / 7);
          const a = Math.min(1, t.life / 12);
          for (let i = -2; i <= 2; i++) iceSpike(g, i * 16, 0, t.h * grow * (1 - Math.abs(i) * 0.18), 46, i * 4, a);
          glow(g, 0, -140, 120, FX, 0.18 * a);
        });
        break;
      case 'spike':
        local(g, t, gr, () => iceSpike(g, 0, 0, t.h * Math.min(1, t.t / 4), t.w, t.dir, Math.min(1, k * 3)));
        break;
      case 'rockSpike':
        local(g, t, gr, () => rockSpike(g, 0, 0, t.h * Math.min(1, t.t / 4), t.w, t.dir, Math.min(1, k * 3), t.seed));
        break;
      case 'root':
        if (t.t < (t.data ?? 0)) break;
        local(g, t, gr, () => {
          g.globalAlpha = Math.min(1, k * 3);
          vineLine(g, { x: 0, y: 4 }, { x: t.dir * 20, y: -130 }, Math.min(1, (t.t - (t.data ?? 0)) / 8), w.frame + t.seed, 7);
        });
        break;
      case 'vine': {
        const p = t.owner;
        const hand = p.joint('fw');
        const reach = t.w * t.q * Math.min(1, t.t / 8);
        const end = t.grab && t.grab.alive() ? chestOf(t.grab) : { x: hand.x + t.dir * reach, y: hand.y + 10 * t.q };
        g.save();
        g.globalAlpha = Math.min(1, k * 3);
        vineLine(g, hand, end, 1, w.frame, 8 * t.q);
        g.restore();
        break;
      }
      case 'well':
        local(g, t, gr, (y) => well(g, 0, y, t.w * Math.min(1, t.t / 8), w.frame, FX, Math.min(1, k * 3)));
        break;
      case 'anchor':
        local(g, t, gr, (y) => {
          if (!t.data) {
            streak(g, [{ x: 0, y: y - 200 }, { x: 0, y }], 30, FX, 0.5, false);
            well(g, 0, y, 60, w.frame, FX, 1);
          } else swirl(g, 0, -6, 160 * (1 - k) + 40, 30 * (1 - k) + 10, w.frame, FX, k, 2);
        });
        break;
      case 'pulse':
        local(g, t, gr, (y) => swirl(g, 0, y, t.w * (1 - k) + 40, (t.w * (1 - k) + 40) * 0.3, w.frame, FX, k, 2));
        break;
      case 'whirl':
        local(g, t, gr, () => swirl(g, 0, -10, t.w, 22, w.frame, FX, Math.min(1, k * 2), 4, 230));
        break;
      case 'gustCone':
        local(g, t, gr, (y) => {
          const reach = t.w * Math.min(1, t.t / 6);
          for (let i = 0; i < 5; i++) {
            const yy = y + (i - 2) * 26 * (0.5 + t.t / 12);
            streak(g, wavy({ x: 0, y }, { x: t.dir * reach, y: yy }, 8, 10, w.frame / 3 + i, 1.5), 4, FX, Math.min(1, k * 2) * 0.8);
          }
        });
        break;
      case 'clock':
        local(g, t, gr, (y) => {
          clockRing(g, 0, y, t.w * (0.6 + 0.4 * (1 - k)), w.frame * 2, FX, k);
          for (let i = 0; i < 3; i++) gearFx(g, Math.cos(i * 2 + t.t / 10) * t.w * (1 - k), y + Math.sin(i * 2 + t.t / 10) * t.w * (1 - k), 12, t.t / 5, K.accent, k);
        });
        break;
      case 'liftRock': {
        const hand = t.owner.joint('fw');
        boulder(g, hand.x, hand.y - 30 * t.q, 34 * t.q, w.frame * 0.05, 7);
        break;
      }
      case 'ray':
        local(g, t, gr, () => {
          g.save();
          g.globalCompositeOperation = 'lighter';
          const gd = g.createLinearGradient(-t.w, 0, t.w, 0);
          gd.addColorStop(0, rgb(FX.glow, 0));
          gd.addColorStop(0.5, rgb(FX.core, 0.9 * k));
          gd.addColorStop(1, rgb(FX.glow, 0));
          g.fillStyle = gd;
          g.fillRect(-t.w, -900, t.w * 2, 900);
          g.restore();
          flare(g, 0, -20, 140 * k + 40, k, t.seed, FX);
        });
        break;
      case 'slash':
        local(g, t, gr, (y) => streak(g, [{ x: -t.dir * t.w * 0.5, y: y - 60 }, { x: t.dir * t.w * 0.5, y: y + 50 }], 7, FX, k, false));
        break;
      case 'burst':
        local(g, t, gr, (y) => {
          flare(g, 0, y, t.w * (1.4 - k * 0.6), k, t.seed, FX);
          if (el === 'wind') swirl(g, 0, y, 90, 30, w.frame, FX, k, 2);
          if (el === 'gravity') well(g, 0, y, 40, w.frame, FX, k);
        });
        break;
      case 'ultScene':
        local(g, t, gr, (y) => ultScene(g, w, t, k, false, y));
        break;
      case 'ultFinal':
        local(g, t, gr, () => ultFinal(g, w, t, k));
        break;
      case 'groundArc': {
        const a = t.life / t.max;
        const x2 = t.x + t.dir * t.w * t.q;
        drawBolt(g, { x: t.x, y: gr - 4 }, { x: x2, y: gr - 6 }, t.seed + Math.floor(w.frame / 2) * 7, 1.1 * t.q, a, 'gold', 3);
        drawBolt(g, { x: x2 - t.dir * 40 * t.q, y: gr - 40 * t.q }, { x: x2, y: gr - 4 }, t.seed + w.frame, 0.7 * t.q, a, 'cyan', 1);
        break;
      }
      case 'pillar':
        drawPillar(g, t.x, gr - 800 * t.q, gr, t.w * t.q, 1 - k, w.frame);
        break;
    }
  }
  for (const b of m.bolts) drawBolt(g, b.a, b.b, b.seed + Math.floor(b.life / 2) * 13, b.width, b.life / b.max, b.theme, b.forks);
  for (const r of m.rings) {
    const k = 1 - r.life / r.max;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(${r.col},${1 - k})`;
    g.lineWidth = 12 * (1 - k) + 2;
    g.beginPath();
    g.ellipse(r.x, r.y, r.r * k, r.r * k * 0.45, 0, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }
  for (const f of m.flares) flare(g, f.x, f.y, f.size * (0.6 + 0.4 * (f.life / f.max)), f.life / f.max, Math.floor(f.x + f.life), f.c);
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  for (const s of m.sparks) drawSpark(g, s);
  g.restore();
}
function ultScene(g: G, w: World, t: Thing, k: number, back: boolean, y: number): void {
  const a = Math.min(1, k * 4, t.t / 10);
  const K = t.owner.kit;
  const FX = K.fx;
  const cy = -160;
  void y;
  switch (t.owner.el) {
    case 'fire':
      if (back) flames(g, 0, 0, 220, 260, w.frame, a * 0.6, 21);
      else swirl(g, 0, -10, 140, 30, w.frame, FX, a * 0.8, 4, 280);
      break;
    case 'water':
      if (!back) swirl(g, 0, -10, 170, 36, w.frame, FX, a, 5, 300);
      break;
    case 'ice':
      if (back) glow(g, 0, -100, 260, FX, 0.25 * a);
      break;
    case 'wind':
      swirl(g, 0, -6, back ? 120 : 160, 28, w.frame * (back ? -1.5 : 1.5), FX, a * (back ? 0.6 : 0.9), 6, 420);
      break;
    case 'earth':
      if (back) for (let i = 0; i < 6; i++) boulder(g, Math.cos(i + t.t / 14) * 220, -160 + Math.sin(i * 2 + t.t / 14) * 120, 22 + (i % 3) * 8, t.t / 10 + i, i + 1, a);
      break;
    case 'leaf':
      if (back) lotus(g, 0, 0, 260 * Math.min(1, t.t / 20), Math.min(1, t.t / 26), w.frame, a);
      break;
    case 'light':
      if (back) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 14; i++) {
          const ang = (i / 14) * Math.PI * 2 + w.frame * 0.01;
          g.fillStyle = rgb(FX.mid, 0.12 * a);
          g.beginPath();
          g.moveTo(0, cy);
          g.lineTo(Math.cos(ang - 0.05) * 900, cy + Math.sin(ang - 0.05) * 900);
          g.lineTo(Math.cos(ang + 0.05) * 900, cy + Math.sin(ang + 0.05) * 900);
          g.closePath();
          g.fill();
        }
        g.restore();
      }
      break;
    case 'gravity':
      if (!back) {
        well(g, 0, cy - 160, 90 + Math.sin(w.frame / 5) * 6, w.frame, FX, a);
        for (let i = 0; i < 8; i++) {
          const ang = i * 0.8 + t.t / 12;
          const r = 200 * (1 - (t.t % 60) / 80);
          boulder(g, Math.cos(ang) * r, cy - 160 + Math.sin(ang) * r * 0.4, 8 + (i % 3) * 4, ang, i + 3, a * 0.9);
        }
      }
      break;
    case 'time':
      if (back) clockRing(g, 0, cy, 220, w.frame * 0.3, FX, a * 0.8);
      else clockRing(g, 0, cy, 140, -w.frame, K.fx2, a * 0.6);
      break;
  }
}
function ultFinal(g: G, w: World, t: Thing, k: number): void {
  const a = Math.min(1, k * 2.5);
  const grow = Math.min(1, t.t / 6);
  const K = t.owner.kit;
  const FX = K.fx;
  switch (t.owner.el) {
    case 'fire':
      flames(g, 0, 0, 360, 760 * grow, w.frame, a, 77);
      break;
    case 'water':
      wave(g, -120 + t.t * 6, 0, 420 * grow, 360, 1, w.frame, a);
      break;
    case 'ice':
      for (let i = -5; i <= 5; i++) iceSpike(g, i * 40, 0, (380 - Math.abs(i) * 50) * grow, 70, i * 7, a);
      break;
    case 'wind':
      swirl(g, 0, -6, 220, 40, w.frame * 3, FX, a, 7, 600);
      break;
    case 'earth':
      for (let i = -4; i <= 4; i++) rockSpike(g, i * 50, 0, (330 - Math.abs(i) * 50) * grow, 70, i * 8, a, i + 40);
      break;
    case 'leaf':
      lotus(g, 0, 0, 360 * grow, 1, w.frame, a);
      for (let i = 0; i < 6; i++) vineLine(g, { x: (i - 2.5) * 50, y: 0 }, { x: (i - 2.5) * 20, y: -360 }, grow, w.frame + i * 5, 9);
      break;
    case 'light': {
      g.save();
      g.globalCompositeOperation = 'lighter';
      const gd = g.createLinearGradient(-160, 0, 160, 0);
      gd.addColorStop(0, rgb(FX.glow, 0));
      gd.addColorStop(0.5, rgb(FX.core, 0.95 * a));
      gd.addColorStop(1, rgb(FX.glow, 0));
      g.fillStyle = gd;
      g.fillRect(-160, -1000, 320, 1000);
      g.restore();
      flare(g, 0, -160, 420 * a, a, t.seed, FX);
      break;
    }
    case 'gravity':
      well(g, 0, -160, 220 * (1 - grow * 0.6), w.frame, FX, a);
      swirl(g, 0, -6, 300 * (1 - k) + 60, 60, w.frame, FX, a, 3);
      break;
    case 'time':
      clockRing(g, 0, -160, 320 * (1.2 - k * 0.4), w.frame * 4, FX, a);
      for (let i = 0; i < 8; i++) gearFx(g, Math.cos(i) * 300 * (1 - k), -160 + Math.sin(i) * 200 * (1 - k), 18, t.t / 4 + i, K.accent, a);
      break;
  }
}
function drawSpark(g: G, s: MSpark): void {
  const a = Math.max(0, s.life / s.max);
  g.globalAlpha = a;
  switch (s.shape) {
    case 'line':
    case 'ember':
      g.strokeStyle = s.col;
      g.lineWidth = s.w;
      g.beginPath();
      g.moveTo(s.x, s.y);
      g.lineTo(s.x - s.vx * 1.6, s.y - s.vy * 1.6);
      g.stroke();
      if (s.shape === 'ember') {
        g.fillStyle = s.col;
        g.beginPath();
        g.arc(s.x, s.y, s.w * 0.9, 0, Math.PI * 2);
        g.fill();
      }
      break;
    case 'drop':
      g.fillStyle = s.col;
      g.beginPath();
      g.ellipse(s.x, s.y, s.w * 0.9, s.w * 1.5, Math.atan2(s.vy, s.vx) + Math.PI / 2, 0, Math.PI * 2);
      g.fill();
      break;
    case 'shard':
      g.save();
      g.translate(s.x, s.y);
      g.rotate(s.rot);
      g.fillStyle = s.col;
      g.beginPath();
      g.moveTo(0, -s.w * 2.2);
      g.lineTo(s.w * 0.8, 0);
      g.lineTo(0, s.w * 2.2);
      g.lineTo(-s.w * 0.8, 0);
      g.closePath();
      g.fill();
      g.restore();
      break;
    case 'leaf':
    case 'petal':
      g.save();
      g.translate(s.x, s.y);
      g.rotate(s.rot);
      g.fillStyle = s.shape === 'petal' && s.col === '#ffffff' ? '#ffd6ec' : s.col;
      g.beginPath();
      g.ellipse(0, 0, s.w * 1.1, s.w * 2.4, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
      break;
    case 'dust':
      g.globalCompositeOperation = 'source-over';
      if (s.w > 5) boulder(g, s.x, s.y, s.w, s.rot, Math.floor(s.w * 10), a);
      else {
        g.fillStyle = 'rgba(200,160,110,0.8)';
        g.beginPath();
        g.arc(s.x, s.y, s.w * 1.4, 0, Math.PI * 2);
        g.fill();
      }
      g.globalCompositeOperation = 'lighter';
      break;
  }
  g.globalAlpha = 1;
}
/** status looks, the Shine Shield barrier and the striking limb's glow, drawn over a hero */
export function drawHeroExtras(g: G, w: World, h: Hero): void {
  const FX = h.kit.fx;
  const c = h.chest();
  const cx = c.x;
  const s = h.scale;
  const st = h.status;
  if (st.freeze) {
    g.save();
    g.globalAlpha = 0.55;
    const x0 = cx - 70 * s;
    const y0 = h.feet - 330 * s;
    const gd = g.createLinearGradient(x0, y0, x0 + 140 * s, h.feet);
    gd.addColorStop(0, 'rgba(220,245,255,0.9)');
    gd.addColorStop(1, 'rgba(90,170,240,0.6)');
    g.fillStyle = gd;
    g.beginPath();
    g.moveTo(x0, y0 + 30 * s);
    g.lineTo(x0 + 40 * s, y0);
    g.lineTo(x0 + 140 * s, y0 + 20 * s);
    g.lineTo(x0 + 150 * s, h.feet);
    g.lineTo(x0 - 8 * s, h.feet);
    g.closePath();
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = '#e6f7ff';
    g.lineWidth = 3;
    g.stroke();
    g.restore();
  }
  if (st.stop) clockRing(g, cx, c.y, 120 * s / LAB_S, 0, FX, 0.7);
  if (st.root) for (let i = 0; i < 3; i++) vineLine(g, { x: cx - 40 * s + i * 40 * s, y: w.ground }, { x: cx - 30 * s + i * 30 * s, y: w.ground - 120 * s }, 1, w.frame + i * 9, 5);
  if (st.slow && !st.stop) swirl(g, cx, w.ground - 4, 60 * s / LAB_S, 12, w.frame, WHITE, 0.5, 1);
  if (st.bubble) bubble(g, cx, c.y + 20 * s, 150 * s, w.frame, 1);
  if (st.float) swirl(g, cx, c.y + 30 * s, 90 * s / LAB_S, 26, w.frame, FX, 0.8, 2, 80, -1);
  if (st.dazzle) glow(g, cx + h.facing * 20 * s, c.y - 120 * s, 46 + Math.sin(w.frame / 3) * 6, FX, 0.5);
  if (h.barrier > 0) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgb(FX.mid, 0.5 + 0.2 * Math.sin(w.frame / 6));
    g.lineWidth = 4;
    g.beginPath();
    g.ellipse(c.x, c.y - 10 * s, 120 * s + 30 * s, 200 * s, 0, 0, Math.PI * 2);
    g.stroke();
    g.restore();
    glow(g, c.x, c.y, 140 * s / LAB_S, FX, 0.12);
  }
  const cl = h.clip;
  if (cl?.limb) {
    const live = (cl.hits ?? []).some((x) => h.frame >= x.from - 3 && h.frame <= x.to + 2);
    if (live) {
      const j = h.joint(cl.limb);
      const elbow = h.joint(cl.limb === 'fw' ? 'fe' : cl.limb === 'bw' ? 'be' : 'fk');
      flare(g, j.x, j.y, 46 * s / LAB_S, 0.9, w.frame, FX);
      streak(g, [elbow, j], 6 * s / LAB_S, FX, 0.7, false);
      if (h.el === 'fire') flames(g, j.x, j.y + 10 * s, 36 * s / LAB_S, 50 * s / LAB_S, w.frame, 0.7, 4);
      if (h.el === 'lightning') drawBolt(g, elbow, j, w.frame * 7, 0.6 * s / LAB_S, 0.8, 'cyan', 1);
    }
  }
}
