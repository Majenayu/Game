/**
 * The small combat engine behind the Fight and Zombie Survival screens: heroes on the Hero Trial rig and clips,
 * hits from the clips' hit boxes, the three powers and the ultimate as element effects, projectiles, floating damage
 * numbers and sparks. Fixed 60 Hz steps; rendering only reads state.
 */
import { airPose, auraAt, chargeAt, guardPose, idlePose, moveAt, sample, walkPose, type Clip, type Status } from '../trial/anims';
import { bubble, clockRing, flames, flare, glow, iceSpike, lotus, projectile, rockSpike, shield, streak, swirl, vineLine, wave, well, type ProjKind } from '../trial/fx';
import type { Kit } from '../trial/kits';
import { jointWorld, lerpPose, solve, type Face, type Pose } from '../trial/rig';
import { bolt } from './art';
import { clipsOf, drawHero, heroShadow, heroStats, hipLift, kitOf } from './heroes';
import { profile, type El } from './save';
import { rng, type G } from './ui';
import { clipTick, drawHeroExtras, drawMovesBack, drawMovesFront, moveEvent, newMoveFx, statusTick, stepMoves, type Ghost, type MoveFx } from './moves';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export const overlap = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
/** anything that can be hit */
export interface Target {
  id: number;
  team: number;
  x: number;
  feet: number;
  alive(): boolean;
  box(): Box;
  /** returns the damage really taken (0 when blocked) */
  hurt(dmg: number, kb: number, lift: number, fromX: number, stun: number, w: World): number;
}
export interface Keys {
  left: boolean;
  right: boolean;
  up: boolean;
  guard: boolean;
  attack: boolean;
  heavy: boolean;
  dash: boolean;
  p1: boolean;
  p2: boolean;
  p3: boolean;
  ult: boolean;
  /** tag swap to the benched squad hero (handled by the fight screen) */
  swap: boolean;
}
export const noKeys = (): Keys => ({ left: false, right: false, up: false, guard: false, attack: false, heavy: false, dash: false, p1: false, p2: false, p3: false, ult: false, swap: false });

// ---------------------------------------------------------------- world
export interface Floater {
  x: number;
  y: number;
  text: string;
  col: string;
  size: number;
  life: number;
  max: number;
}
export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  col: string;
}
export interface Effect {
  kind: 'proj' | 'wave' | 'burst' | 'beam' | 'boom' | 'acid' | 'shock';
  el: El | 'acid' | 'rock' | 'boom';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  dmg: number;
  team: number;
  owner: number;
  hitAt: number;
  done: Set<number>;
  trail: Array<{ x: number; y: number }>;
  seed: number;
  dir: number;
  pk?: ProjKind;
}
export interface World {
  ground: number;
  left: number;
  right: number;
  frame: number;
  hitstop: number;
  shake: number;
  dim: number;
  flash: number;
  effects: Effect[];
  floaters: Floater[];
  sparks: Spark[];
  targets: () => Target[];
  /** each hero's designed power effects (moves.ts) */
  mv: MoveFx;
  /** shrinks how far powers reach (the roster stage is narrow); 1 in fights */
  span?: number;
  /** called when a hero lands a hit (combo counters, score) */
  onHit?: (by: Hero, dmg: number, t: Target) => void;
}
export function makeWorld(ground: number, left: number, right: number, targets: () => Target[]): World {
  return { ground, left, right, frame: 0, hitstop: 0, shake: 0, dim: 0, flash: 0, effects: [], floaters: [], sparks: [], targets, mv: newMoveFx() };
}
export function floater(w: World, x: number, y: number, text: string, col = '#ffb43a', size = 34): void {
  w.floaters.push({ x: x + (Math.random() - 0.5) * 30, y, text, col, size, life: 50, max: 50 });
}
export function sparks(w: World, x: number, y: number, n: number, col: string, speed = 9): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.3 + Math.random());
    w.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 20 + Math.random() * 16, max: 36, col });
  }
}

// ---------------------------------------------------------------- sound (tiny synth blips)
let ac: AudioContext | null = null;
export function blip(kind: 'hit' | 'big' | 'cast' | 'boom' | 'ui' | 'hurt'): void {
  if (profile.sfx <= 0) return;
  try {
    ac ??= new AudioContext();
    const o = ac.createOscillator();
    const gn = ac.createGain();
    const now = ac.currentTime;
    const f = { hit: 220, big: 110, cast: 520, boom: 60, ui: 880, hurt: 160 }[kind];
    o.type = kind === 'cast' || kind === 'ui' ? 'triangle' : 'sawtooth';
    o.frequency.setValueAtTime(f, now);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f * 0.4), now + 0.15);
    gn.gain.setValueAtTime(0.08 * profile.sfx, now);
    gn.gain.exponentialRampToValueAtTime(0.001, now + (kind === 'boom' ? 0.5 : 0.18));
    o.connect(gn).connect(ac.destination);
    o.start(now);
    o.stop(now + 0.5);
  } catch {
    /* audio blocked until the first click */
  }
}

// ---------------------------------------------------------------- hero
let NEXT_ID = 1;
export const SC = 0.62;
const COMBO = ['jab', 'cross', 'kick', 'rising'];
/** MP the ultimate costs (MP max is 100) */
export const MP_ULT = 80;
/** MP a power costs in a fight: half the lab value, in steps of 5, at least 10 */
export function powerCost(mp: number): number {
  return Math.max(10, Math.round(mp / 10) * 5);
}
export class Hero implements Target {
  id = NEXT_ID++;
  kit: Kit;
  clips: Record<string, Clip>;
  feet: number;
  vx = 0;
  vy = 0;
  grounded = true;
  clip: Clip | null = null;
  clipName = '';
  frame = 0;
  hitDone = new Set<string>();
  stun = 0;
  hp: number;
  maxHp: number;
  mp = 40;
  t = 0;
  guarding = false;
  guardHit = 0;
  shown: Pose = idlePose(0);
  flash = 0;
  combo = 0;
  comboWindow = 0;
  ko = false;
  koFrame = 0;
  invuln = 0;
  prev = noKeys();
  /** consecutive hits landed (combo counter) */
  chain = 0;
  chainTimer = 0;
  lastHitBy = 0;
  scale = SC;
  /** statuses from the foe's powers: frames left */
  status: Partial<Record<Status, number>> = {};
  /** Shine Shield: blocks one whole hit */
  barrier = 0;
  /** recent positions (Rewind Step) */
  history: Array<{ x: number; feet: number }> = [];
  ghosts: Ghost[] = [];
  /** frames left of a beam power (Jet Lance, Sunlance, Chain Bolt) */
  beam = 0;
  slowAcc = 0;
  /** called when a move starts (Daily Quests count powers and ultimates) */
  onStart?: (name: string, cost: number) => void;
  /** vitality, might, spirit, guard, resolve, speed as multipliers of the plain value 80 */
  readonly st: number[];
  constructor(readonly el: El, public x: number, public facing: 1 | -1, readonly team: number, ground: number, lv = 1, cls?: string) {
    this.st = heroStats(el, lv, cls).map((v) => v / 80);
    const hp = Math.round(this.st[0] * 80 * 12);
    this.kit = kitOf(el);
    this.clips = clipsOf(el);
    this.feet = ground;
    this.hp = this.maxHp = hp;
  }
  alive(): boolean {
    return !this.ko;
  }
  play(name: string): void {
    const c = this.clips[name];
    if (!c) return;
    this.clip = c;
    this.clipName = name;
    this.frame = 0;
    this.hitDone.clear();
  }
  powerName(i: 0 | 1 | 2): string {
    return this.kit.powers[i].clip;
  }
  cost(name: string): number {
    if (name === 'ult') return MP_ULT;
    const p = this.kit.powers.find((q) => q.clip === name);
    return p ? powerCost(p.mp) : 0;
  }
  powerIndex(name: string): number {
    return this.kit.powers.findIndex((q) => q.clip === name);
  }
  target(): Pose {
    if (this.clip) return sample(this.clip, this.frame);
    if (!this.grounded) return airPose(this.vy);
    if (this.guarding) return guardPose;
    const sp = Math.abs(this.vx);
    if (sp > 0.6) return walkPose(this.t, sp);
    return lerpPose(idlePose(this.t), guardPose, 0.35);
  }
  hipY(p: Pose): number {
    const stand = this.feet - hipLift(p) * this.scale + p.y * this.scale;
    if (this.clipName !== 'ko') return stand;
    const k = Math.min(1, Math.abs(p.rot) / 85);
    return stand * (1 - k) + (this.feet - 26 + p.y * this.scale) * k;
  }
  hipX(p: Pose): number {
    return this.x + p.x * this.scale * this.facing;
  }
  box(): Box {
    const p = this.shown;
    const top = this.hipY(p) - 290 * this.scale;
    return { x: this.hipX(p) - 40 * this.scale, y: top, w: 80 * this.scale, h: 300 * this.scale };
  }
  chest(): { x: number; y: number } {
    return { x: this.hipX(this.shown), y: this.hipY(this.shown) - 130 * this.scale };
  }
  /** a rig joint on the screen (hands for shots and beams) */
  joint(name: 'fw' | 'bw' | 'fa' | 'ba' | 'fe' | 'be' | 'fs' | 'bs' | 'fk' | 'bk' | 'neck' | 'hip'): { x: number; y: number } {
    const p = this.shown;
    const j = jointWorld(p, solve(p)[name]);
    return { x: this.hipX(p) + j.x * this.scale * this.facing, y: this.hipY(p) + j.y * this.scale };
  }
  face(): Face {
    if (this.ko) return 'ko';
    if (this.clip) return this.clip.face;
    if (this.stun > 0) return 'hurt';
    return 'normal';
  }
  start(name: string): boolean {
    const cost = this.cost(name);
    if (this.mp < cost) return false;
    this.mp -= cost;
    this.play(name);
    this.onStart?.(name, cost);
    if (cost > 0) blip('cast');
    return true;
  }
  hurt(dmg: number, kb: number, lift: number, fromX: number, stun: number, w: World): number {
    if (this.ko || this.invuln > 0) return 0;
    const ci = this.clip?.invuln;
    if (ci && this.frame >= ci[0] && this.frame <= ci[1]) return 0;
    if (this.barrier > 0) {
      // Shine Shield takes the whole hit and heals a little
      this.barrier = 0;
      const heal = Math.round(this.maxHp * 0.06);
      this.hp = Math.min(this.maxHp, this.hp + heal);
      floater(w, this.x, this.chest().y - 60, `BLOCKED +${heal}`, `rgb(${this.kit.fx.mid})`, 30);
      return 0;
    }
    // Weightless: a floating hero takes 25% more
    dmg = Math.max(1, Math.round((dmg * (this.status.float ? 1.25 : 1)) / this.st[3]));
    const held = !!(this.status.freeze || this.status.stop || this.status.bubble);
    const fromFront = (fromX - this.x) * this.facing > 0;
    const ca = this.clip?.armor;
    const armored = !!ca && this.frame >= ca[0] && this.frame <= ca[1];
    if ((held || armored) && this.hp > dmg) {
      // frozen, stopped or trapped heroes (and armoured moves) take the hit without flinching
      this.hp -= dmg;
      this.flash = 4;
      this.mp = Math.min(100, this.mp + dmg * 0.02 * this.st[4]);
      blip('hurt');
      return dmg;
    }
    if (held) this.status = {};
    if (this.guarding && fromFront && this.grounded) {
      this.guardHit = 10;
      this.x -= Math.sign(fromX - this.x) * kb * 0.4;
      sparks(w, this.chest().x + this.facing * 20, this.chest().y, 6, '#bff4ff', 6);
      const chip = Math.max(1, Math.round(dmg * 0.1));
      this.hp = Math.max(1, this.hp - chip);
      return chip;
    }
    this.hp = Math.max(0, this.hp - dmg);
    this.flash = 4;
    this.stun = stun;
    this.vx = -Math.sign(fromX - this.x || 1) * kb * 0.6;
    if (lift > 0) {
      this.vy = -lift;
      this.grounded = false;
    }
    this.clip = null;
    this.beam = 0;
    this.chain = 0;
    this.mp = Math.min(100, this.mp + dmg * 0.02 * this.st[4]);
    this.play('hurt');
    blip('hurt');
    if (this.hp <= 0) {
      this.ko = true;
      this.play('ko');
      this.vx = -Math.sign(fromX - this.x || 1) * 6;
    }
    return dmg;
  }
  /** one 60 Hz step */
  step(w: World, k: Keys): void {
    this.ghosts = this.ghosts.filter((gh) => --gh.life > 0);
    if (!this.ko) {
      const st = statusTick(w, this);
      if (st === 'stop' || st === 'skip') {
        this.prev = { ...k };
        return;
      }
      if (st === 'held') k = noKeys();
    }
    this.t++;
    if (this.flash > 0) this.flash--;
    if (this.guardHit > 0) this.guardHit--;
    if (this.invuln > 0) this.invuln--;
    if (this.chainTimer > 0 && --this.chainTimer === 0) this.chain = 0;
    const pressed = (n: keyof Keys) => k[n] && !this.prev[n];
    if (this.ko) {
      if (this.clip && this.frame < this.clip.frames - 1) this.frame++;
      this.x += this.vx;
      this.vx *= 0.9;
      this.physics(w);
      this.shown = this.target();
      this.prev = { ...k };
      return;
    }
    // about 6 MP a second (master prompt), more with Resolve
    this.mp = Math.min(100, this.mp + 0.1 * this.st[4]);
    if (this.stun > 0) this.stun--;
    const busy = !!this.clip && this.clipName !== 'hurt';
    this.guarding = !busy && this.stun <= 0 && this.grounded && k.guard;
    if (this.comboWindow > 0) this.comboWindow--;
    if (!busy && this.stun <= 0 && !this.guarding) {
      const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      const run = 7.5 * this.st[5];
      this.vx += (dir * run - this.vx) * (this.grounded ? 0.3 : 0.08);
      if (dir) this.facing = dir as 1 | -1;
      if (pressed('up') && this.grounded) {
        this.vy = -17;
        this.grounded = false;
      }
      if (pressed('attack')) {
        if (!this.grounded) this.start('kick');
        else {
          const name = this.comboWindow > 0 ? COMBO[(this.combo + 1) % 4] : 'jab';
          this.combo = this.comboWindow > 0 ? (this.combo + 1) % 4 : 0;
          this.start(name);
        }
      } else if (pressed('heavy')) this.start('heavy');
      else if (pressed('dash')) this.start('dash');
      else if (pressed('p1')) this.start(this.powerName(0));
      else if (pressed('p2')) this.start(this.powerName(1));
      else if (pressed('p3')) this.start(this.powerName(2));
      else if (pressed('ult')) {
        if (this.start('ult')) {
          w.dim = 150;
          this.invuln = 130;
        }
      }
    } else if (this.guarding) this.vx *= 0.7;
    // clip
    if (this.clip) {
      const c = this.clip;
      this.vx *= 0.82;
      if (!this.status.root) this.x += moveAt(c, this.frame) * this.scale * this.facing * 1.4;
      this.hits(w, c);
      for (const [f, ev] of c.events ?? []) if (f === this.frame) this.event(w, ev);
      clipTick(w, this, c, this.frame);
      this.frame++;
      if (this.frame >= c.frames) {
        if (COMBO.includes(this.clipName)) this.comboWindow = 18;
        this.clip = null;
        this.clipName = '';
      }
    }
    this.x += this.vx;
    this.physics(w);
    // look toward the nearest foe when free
    if (!this.clip && !k.left && !k.right) {
      const foe = nearestFoe(w, this);
      if (foe) this.facing = foe.x > this.x ? 1 : -1;
    }
    this.shown = this.target();
    this.prev = { ...k };
  }
  physics(w: World): void {
    if (!this.grounded) {
      // floating and bubbled heroes hover (statusTick steers vy); everyone else falls
      if (!(this.status.float || this.status.bubble)) this.vy += 0.9;
      this.feet += this.vy;
      if (this.feet >= w.ground) {
        this.feet = w.ground;
        this.vy = 0;
        this.grounded = true;
      }
    } else if (!this.clip) this.vx *= 0.8;
    this.x = Math.max(w.left, Math.min(w.right, this.x));
  }
  hits(w: World, c: Clip): void {
    const p = sample(c, this.frame);
    (c.hits ?? []).forEach((h, i) => {
      if (this.frame < h.from || this.frame > h.to) return;
      const x0 = this.hipX(p) + (this.facing > 0 ? h.box.x : -h.box.x - h.box.w) * this.scale;
      const hb = { x: x0, y: this.hipY(p) + h.box.y * this.scale, w: h.box.w * this.scale, h: h.box.h * this.scale };
      for (const t of w.targets()) {
        if (t.team === this.team || !t.alive()) continue;
        const key = `${i}:${t.id}`;
        if (this.hitDone.has(key)) continue;
        if (!overlap(hb, t.box())) continue;
        this.hitDone.add(key);
        const dmg = Math.round(h.dmg * 10 * this.st[1] * (0.9 + Math.random() * 0.2));
        // the clips give lift as an upward speed (negative); hurt() takes it as a positive launch
        const got = this.land(w, t, dmg, Math.abs(h.kb), Math.max(0, -h.lift), h.stun, hb.x + hb.w / 2, hb.y + hb.h / 2, h.fx === 'big');
        if (got > 0 && h.status && t instanceof Hero) {
          t.status[h.status] = Math.max(t.status[h.status] ?? 0, h.dur ?? 60);
          floater(w, t.x, t.chest().y - 150 * t.scale, h.status.toUpperCase(), `rgb(${this.kit.fx.mid})`, 24);
        }
      }
    });
  }
  land(w: World, t: Target, dmg: number, kb: number, lift: number, stun: number, x: number, y: number, big: boolean): number {
    const got = t.hurt(dmg, kb, lift, this.x, stun, w);
    if (got <= 0) return 0;
    this.mp = Math.min(100, this.mp + 3 * this.st[4]);
    this.chain++;
    this.chainTimer = 70;
    w.hitstop = Math.max(w.hitstop, big ? 6 : 3);
    if (big) w.shake = Math.max(w.shake, 10);
    floater(w, x, y - 20, `-${got}`, '#ffb43a', big ? 40 : 32);
    sparks(w, x, y, big ? 16 : 9, `rgb(${this.kit.fx.mid})`);
    blip(big ? 'big' : 'hit');
    w.onHit?.(this, got, t);
    return got;
  }
  /** a clip event: each hero's designed power effect (moves.ts) */
  event(w: World, ev: string): void {
    moveEvent(w, this, ev);
  }
  draw(g: G, w: World): void {
    const p = this.shown;
    heroShadow(g, this.hipX(p), w.ground, this.scale * (1 - Math.min(0.5, (w.ground - this.feet) / 400)));
    const au = this.clip ? auraAt(this.clip, this.frame) : 0;
    const charge = this.clip ? chargeAt(this.clip, this.frame) : 0;
    for (const gh of this.ghosts) drawHero(g, this.el, { pose: gh.pose, face: 'normal', x: gh.x, feet: gh.feet, scale: this.scale, facing: gh.facing, t: this.t, alpha: (gh.life / gh.max) * 0.45 });
    drawHero(g, this.el, { pose: p, face: this.face(), x: this.x, feet: this.feet, scale: this.scale, facing: this.facing, t: this.status.stop || this.status.freeze ? 0 : this.t, aura: au, charge, speed: this.vx * this.facing, vy: this.vy, alpha: this.flash > 0 ? 0.6 : 1 });
    drawHeroExtras(g, w, this);
    if (this.guarding) {
      const c = this.chest();
      shield(g, this.kit, c.x, c.y, this.facing, 140 * this.scale, 1, this.guardHit / 10, w.frame, false);
    }
  }
}
export function nearestFoe(w: World, h: { x: number; team: number }): Target | null {
  let best: Target | null = null;
  let d = Infinity;
  for (const t of w.targets()) {
    if (t.team === h.team || !t.alive()) continue;
    const dd = Math.abs(t.x - h.x);
    if (dd < d) {
      d = dd;
      best = t;
    }
  }
  return best;
}
export function effect(kind: Effect['kind'], el: Effect['el'], x: number, y: number, vx: number, vy: number, life: number, r: number, dmg: number, owner: { id: number; team: number; facing?: number } | null, hitAt: number): Effect {
  return { kind, el, x, y, vx, vy, life, max: life, r, dmg, team: owner?.team ?? 9, owner: owner?.id ?? 0, hitAt, done: new Set(), trail: [], seed: Math.floor(Math.random() * 1e6), dir: Math.sign(vx) || owner?.facing || 1 };
}

// ---------------------------------------------------------------- world step and draw
export function stepWorld(w: World, heroes: Hero[]): void {
  w.frame++;
  if (w.shake > 0) w.shake *= 0.85;
  if (w.dim > 0) w.dim--;
  if (w.flash > 0) w.flash--;
  for (const e of w.effects) {
    e.life--;
    const age = e.max - e.life;
    if (e.kind === 'proj' || e.kind === 'acid') {
      e.trail.push({ x: e.x, y: e.y });
      if (e.trail.length > 10) e.trail.shift();
      e.x += e.vx;
      e.y += e.vy;
      if (e.kind === 'acid') e.vy += 0.45;
      if (e.y > w.ground - 6 && e.kind === 'acid') {
        e.life = Math.min(e.life, 1);
        w.effects.push(effect('boom', 'acid', e.x, w.ground, 0, 0, 30, 60, 0, null, 99));
      }
    }
    if (e.kind === 'wave' || e.kind === 'shock') e.x += e.vx;
    // damage
    const hb = boxOf(e, w);
    if (!hb) continue;
    if (e.kind === 'burst' || e.kind === 'boom' || e.kind === 'beam') {
      if (age !== e.hitAt && !(e.kind === 'beam' && age % 6 === 0 && age <= 24)) continue;
      if (e.kind === 'beam') e.done.clear();
    }
    for (const t of w.targets()) {
      if (t.team === e.team || !t.alive() || e.done.has(t.id)) continue;
      if (!overlap(hb, t.box())) continue;
      e.done.add(t.id);
      const owner = heroes.find((h) => h.id === e.owner);
      const dmg = Math.round(e.dmg * (owner ? owner.st[2] : 1) * (0.9 + Math.random() * 0.2));
      const big = e.kind === 'burst' || e.kind === 'boom';
      if (owner) owner.land(w, t, dmg, big ? 16 : 10, big ? 12 : 4, 24, t.x, hb.y + hb.h / 2, big);
      else {
        const got = t.hurt(dmg, 14, 8, e.x, 24, w);
        if (got > 0) floater(w, t.x, t.box().y, `-${got}`, '#ff5a5a', 34);
      }
      if (e.kind === 'proj' || e.kind === 'acid') {
        e.life = 0;
        w.effects.push(effect('boom', e.kind === 'acid' ? 'acid' : (e.el as El), e.x, e.y, 0, 0, 20, 50, 0, null, 99));
      }
    }
    if ((e.kind === 'proj' || e.kind === 'wave' || e.kind === 'shock') && (e.x < w.left - 200 || e.x > w.right + 200)) e.life = 0;
  }
  w.effects = w.effects.filter((e) => e.life > 0);
  for (const f of w.floaters) {
    f.life--;
    f.y -= 1.2;
  }
  w.floaters = w.floaters.filter((f) => f.life > 0);
  for (const s of w.sparks) {
    s.x += s.vx;
    s.y += s.vy;
    s.vy += 0.4;
    s.vx *= 0.95;
    s.life--;
  }
  w.sparks = w.sparks.filter((s) => s.life > 0);
  stepMoves(w, heroes);
}
function boxOf(e: Effect, w: World): Box | null {
  switch (e.kind) {
    case 'proj':
    case 'acid':
      return { x: e.x - e.r, y: e.y - e.r, w: e.r * 2, h: e.r * 2 };
    case 'wave':
      return { x: e.x - 50, y: w.ground - 120, w: 100, h: 120 };
    case 'shock':
      return { x: e.x - 40, y: w.ground - 70, w: 80, h: 70 };
    case 'burst':
      return { x: e.x - e.r, y: w.ground - e.r * 2.6, w: e.r * 2, h: e.r * 2.6 };
    case 'boom':
      return e.dmg > 0 ? { x: e.x - e.r, y: e.y - e.r * 1.6, w: e.r * 2, h: e.r * 2 } : null;
    case 'beam':
      return e.dir > 0 ? { x: e.x, y: e.y - 30, w: 1100, h: 60 } : { x: e.x - 1100, y: e.y - 30, w: 1100, h: 60 };
  }
}
const fxOf = (el: Effect['el']): Kit['fx'] =>
  el === 'acid' ? { glow: '90,255,60', mid: '170,255,90', core: '235,255,200' } : el === 'rock' ? { glow: '255,90,40', mid: '255,170,90', core: '255,240,200' } : el === 'boom' ? { glow: '255,60,90', mid: '255,160,80', core: '255,250,220' } : kitOf(el).fx;

export function drawEffects(g: G, w: World, front: boolean): void {
  if (front) drawMovesFront(g, w);
  else drawMovesBack(g, w);
  for (const e of w.effects) {
    const age = e.max - e.life;
    const k = age / e.max;
    const a = Math.min(1, e.life / 10);
    const fx = fxOf(e.el);
    const isFront = e.kind === 'proj' || e.kind === 'acid' || e.kind === 'beam' || e.kind === 'boom';
    if (isFront !== front) continue;
    switch (e.kind) {
      case 'proj':
        projectile(g, e.pk ?? 'fireball', kitOf(e.el as El), e.x, e.y, e.vx, e.vy, w.frame, e.trail, e.r);
        break;
      case 'acid':
        glow(g, e.x, e.y, 26, fx, 0.8);
        g.save();
        g.fillStyle = '#b8ff6a';
        g.shadowColor = '#7dff4a';
        g.shadowBlur = 16;
        g.beginPath();
        g.arc(e.x, e.y, 11, 0, Math.PI * 2);
        g.fill();
        g.restore();
        break;
      case 'boom':
        flare(g, e.x, e.y - 10, e.r * (0.6 + k * 1.2), 1 - k, e.seed, fx);
        break;
      case 'beam': {
        const len = 1100 * Math.min(1, age / 6);
        streak(g, [{ x: e.x, y: e.y }, { x: e.x + e.dir * len, y: e.y }], 26 * a, fx, a, false);
        if (e.el === 'lightning') bolt(g, e.x, e.y, e.x + e.dir * len, e.y, e.seed + Math.floor(age / 3));
        break;
      }
      case 'shock':
        rockSpike(g, e.x, w.ground, 60 + Math.sin(age) * 10, 40, e.dir * 0.2, a, e.seed);
        break;
      case 'wave':
        drawWave(g, e, w, a, age);
        break;
      case 'burst':
        drawBurst(g, e, w, k, a, age);
        break;
    }
  }
}
function drawWave(g: G, e: Effect, w: World, a: number, age: number): void {
  const fx = fxOf(e.el);
  const gr = w.ground;
  switch (e.el) {
    case 'fire':
      for (let i = 0; i < 4; i++) flames(g, e.x - e.dir * i * 40, gr, 60, 110 - i * 18, w.frame + i * 7, a * (1 - i * 0.2), e.seed + i);
      break;
    case 'water':
      wave(g, e.x, gr, 140, 220, e.dir, w.frame, a);
      break;
    case 'ice':
      for (let i = 0; i < 4; i++) iceSpike(g, e.x - e.dir * i * 50, gr, 120 - i * 22, 30, e.dir * 0.1, a);
      break;
    case 'earth':
      for (let i = 0; i < 4; i++) rockSpike(g, e.x - e.dir * i * 50, gr, 120 - i * 20, 36, e.dir * 0.12, a, e.seed + i);
      break;
    case 'wind':
      swirl(g, e.x, gr - 90, 70, 26, w.frame, fx, a, 5, 160, e.dir);
      break;
    case 'leaf':
      vineLine(g, { x: e.x - e.dir * 220, y: gr - 6 }, { x: e.x, y: gr - 40 }, 1, w.frame, 9);
      lotus(g, e.x, gr, 50, 1, w.frame, a);
      break;
    case 'gravity':
      well(g, e.x, gr - 60, 60, w.frame, fx, a);
      break;
    case 'time':
      clockRing(g, e.x, gr - 80, 80, w.frame, fx, a, 1);
      break;
    default:
      glow(g, e.x, gr - 60, 80, fx, a);
  }
  void age;
}
function drawBurst(g: G, e: Effect, w: World, k: number, a: number, age: number): void {
  const fx = fxOf(e.el);
  const gr = w.ground;
  const up = Math.min(1, age / 8);
  const h = e.r * 2.6 * up;
  switch (e.el) {
    case 'fire':
      flames(g, e.x, gr, e.r * 1.6, h, w.frame, a, e.seed);
      break;
    case 'water':
      wave(g, e.x - e.r, gr, h * 0.8, e.r * 2, 1, w.frame, a * 0.8);
      bubble(g, e.x, gr - e.r * 1.2, e.r * 0.9, w.frame, a);
      break;
    case 'ice':
      for (let i = -2; i <= 2; i++) iceSpike(g, e.x + i * e.r * 0.4, gr, h * (1 - Math.abs(i) * 0.25), e.r * 0.3, i * 0.12, a);
      break;
    case 'earth':
    case 'rock':
      for (let i = -2; i <= 2; i++) rockSpike(g, e.x + i * e.r * 0.4, gr, h * (1 - Math.abs(i) * 0.25), e.r * 0.34, i * 0.14, a, e.seed + i);
      break;
    case 'wind':
      swirl(g, e.x, gr - h / 2, e.r * 0.8, e.r * 0.3, w.frame, fx, a, 6, h, 1);
      break;
    case 'leaf':
      lotus(g, e.x, gr, e.r * 0.9, up, w.frame, a);
      for (let i = -1; i <= 1; i++) vineLine(g, { x: e.x + i * 40, y: gr }, { x: e.x + i * 20, y: gr - h }, 1, w.frame, 8);
      break;
    case 'gravity':
      well(g, e.x, gr - e.r, e.r, w.frame, fx, a);
      break;
    case 'time':
      clockRing(g, e.x, gr - e.r * 1.2, e.r, w.frame, fx, a, 1);
      break;
    case 'lightning': {
      for (let i = 0; i < 3; i++) bolt(g, e.x + (i - 1) * 30, gr - 700, e.x + (i - 1) * 10, gr - 10, e.seed + i + Math.floor(age / 3), '#fffbd0', 4);
      glow(g, e.x, gr - 40, e.r, fx, a);
      break;
    }
    default:
      glow(g, e.x, gr - h / 2, e.r * 1.2, fx, a);
      streak(g, [{ x: e.x, y: gr }, { x: e.x, y: gr - h }], e.r * 0.5, fx, a, false);
  }
  void k;
}
export function drawFloaters(g: G, w: World): void {
  for (const f of w.floaters) {
    const a = Math.min(1, f.life / 15);
    const s = f.size * (f.life > f.max - 6 ? 1.3 : 1);
    g.save();
    g.globalAlpha = a;
    g.font = `italic 800 ${s}px Bahnschrift, 'Segoe UI', Arial, sans-serif`;
    g.textAlign = 'center';
    g.lineJoin = 'round';
    g.strokeStyle = '#3a0c00';
    g.lineWidth = 5;
    g.strokeText(f.text, f.x, f.y);
    g.fillStyle = f.col;
    g.shadowColor = f.col;
    g.shadowBlur = 10;
    g.fillText(f.text, f.x, f.y);
    g.restore();
  }
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const s of w.sparks) {
    g.globalAlpha = s.life / s.max;
    g.strokeStyle = s.col;
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(s.x, s.y);
    g.lineTo(s.x - s.vx * 2, s.y - s.vy * 2);
    g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- hero AI
export function heroAI(h: Hero, foe: Hero | null, w: World, level = 1): Keys {
  const k = noKeys();
  if (!foe || h.ko) return k;
  const r = rng(w.frame * 7 + h.id);
  const d = foe.x - h.x;
  const dist = Math.abs(d);
  const toward = d > 0 ? 'right' : 'left';
  const away = d > 0 ? 'left' : 'right';
  const foeAttacking = !!foe.clip && foe.clipName !== 'hurt';
  if (foeAttacking && dist < 240 && r() < 0.5 * level) {
    k.guard = true;
    return k;
  }
  if (h.mp >= MP_ULT && dist < 700 && r() < 0.02) k.ult = true;
  else if (dist > 420 && h.mp >= h.cost(h.powerName(0)) && r() < 0.025) k.p1 = true;
  else if (dist < 420 && dist > 160 && h.mp >= h.cost(h.powerName(1)) + 10 && r() < 0.01) k.p2 = true;
  else if (dist < 520 && dist > 200 && h.mp >= h.cost(h.powerName(2)) && r() < 0.012) k.p3 = true;
  else if (dist > 150) k[toward] = true;
  else if (r() < 0.16 * level) k.attack = true;
  else if (r() < 0.02) k.heavy = true;
  else if (r() < 0.02) k[away] = true;
  if (r() < 0.004) k.up = true;
  return k;
}
