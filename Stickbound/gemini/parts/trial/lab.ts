import { COMBO, airPose, auraAt, chargeAt, guardPose, idlePose, makeClips, moveAt, sample, walkPose, type Clip, type Hit, type Status } from './anims';
import { aura, boulder, bubble, clockRing, flames, flare, gearFx, glow, iceSpike, lotus, projectile, rockSpike, shield, streak, swirl, vineLine, wave, wavy, well, type FxCol, type ProjKind } from './fx';
import { makeHeads } from './heads';
import { KITS, TRIAL_ELEMENTS, type ElementId, type Kit } from './kits';
import { BUILDS, PALETTES, TINT, drawRig, footDrop, ghostPalette, heroPalette, jointWorld, lerpPose, loadTrialParts, setBuild, solve, tintImage, type Build, type Face, type Pieces, type Pose, type Skin, type TrialParts } from './rig';
import { GROUND, STAGE_H, STAGE_W, bakeStage } from './stage';

/**
 * Hero Trial: one lab for the nine element heroes (Lightning keeps its own lab). Move freely in the stadium, try
 * the combo, heavy, dash, the three powers, the ultimate and the element shield on a sparring dummy that can fight
 * back. Fixed 60 Hz update with a seeded RNG; rendering only reads state. ?el=<element> picks the hero.
 */
const params = new URLSearchParams(location.search);
const pick = (params.get('el') ?? localStorage.getItem('ek.trial.el') ?? 'fire') as ElementId;
const EL: ElementId = TRIAL_ELEMENTS.includes(pick) ? pick : 'fire';
const K: Kit = KITS[EL];
const CLIPS = makeClips(K);
const FX: FxCol = K.fx;
const FX2: FxCol = K.fx2;
const WHITE: FxCol = { glow: '200,220,255', mid: '240,248,255', core: '255,255,255' };
const GOLD: FxCol = { glow: '255,170,40', mid: '255,228,120', core: '255,252,225' };
const rgb = (t: string, a = 1) => `rgba(${t},${a})`;

const VIEW_W = 1600;
const VIEW_H = 900;
const S = 0.74;
const GRAV = 0.95;
const WALK = 4.2;
const RUN = 7.4;
const JUMP = -18.5;
const PERFECT_FRAMES = 8;
type Box = { x: number; y: number; w: number; h: number };
type Pt = { x: number; y: number };

let seed = 12345;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ---------------------------------------------------------------- audio (tiny synth, one voice set per element)
let ac: AudioContext | null = null;
function tone(freq: number, dur: number, type: OscillatorType = 'sawtooth', vol = 0.12, slide = 0.3): void {
  try {
    ac ??= new AudioContext();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), ac.currentTime + dur);
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + dur);
  } catch {
    /* no audio */
  }
}
function noise(dur: number, vol = 0.15, lowpass = 0, highpass = 0): void {
  try {
    ac ??= new AudioContext();
    const b = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const s = ac.createBufferSource();
    const g = ac.createGain();
    g.gain.value = vol;
    s.buffer = b;
    let node: AudioNode = s;
    if (lowpass) {
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass;
      node = node.connect(f);
    }
    if (highpass) {
      const f = ac.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = highpass;
      node = node.connect(f);
    }
    node.connect(g).connect(ac.destination);
    s.start();
  } catch {
    /* no audio */
  }
}
/** The element's power sound: fire roar, water splash, ice chime, wind whoosh, earth thud, leaf rustle, light shine, gravity hum, time tick. */
function sfx(kind: 'cast' | 'hit' | 'big' | 'charge'): void {
  const big = kind === 'big';
  switch (EL) {
    case 'fire':
      noise(big ? 1.0 : 0.4, big ? 0.3 : 0.18, 900);
      if (kind !== 'charge') tone(140, 0.3, 'sawtooth', 0.06, 0.5);
      break;
    case 'water':
      noise(big ? 0.9 : 0.35, 0.2, 1800, 200);
      tone(600, 0.2, 'sine', 0.06, 0.4);
      break;
    case 'ice':
      tone(1900, 0.25, 'triangle', 0.07, 1.4);
      tone(2600, 0.35, 'sine', 0.05, 0.9);
      if (big) noise(0.5, 0.18, 0, 2000);
      break;
    case 'wind':
      noise(big ? 1.2 : 0.45, 0.2, 0, 700);
      break;
    case 'earth':
      tone(70, big ? 0.6 : 0.3, 'square', 0.12, 0.5);
      noise(big ? 0.8 : 0.3, 0.25, 300);
      break;
    case 'leaf':
      noise(0.3, 0.12, 0, 2500);
      tone(520, 0.25, 'triangle', 0.06, 1.5);
      break;
    case 'light':
      tone(1200, 0.4, 'sine', 0.07, 2);
      tone(1800, 0.5, 'sine', 0.04, 1.5);
      break;
    case 'gravity':
      tone(55, big ? 1.0 : 0.5, 'sawtooth', 0.1, 0.6);
      tone(110, 0.4, 'sine', 0.06, 0.5);
      break;
    case 'time':
      tone(1400, 0.06, 'square', 0.06, 1);
      setTimeout(() => tone(1000, 0.06, 'square', 0.06, 1), 90);
      if (big) tone(200, 1.0, 'sine', 0.08, 0.4);
      break;
  }
}

// ---------------------------------------------------------------- fighters
interface Ghost {
  x: number;
  y: number;
  facing: number;
  pose: Pose;
  life: number;
  max: number;
}
class Fighter {
  x: number;
  feet = GROUND;
  vx = 0;
  vy = 0;
  facing = 1;
  grounded = true;
  airJumps = 0;
  clip: Clip | null = null;
  frame = 0;
  loopPreview = false;
  hitDone = new Set<number>();
  landed = false;
  queued: string | null = null;
  stun = 0;
  hp = 100;
  mp = 100;
  t = 0;
  guarding = false;
  guardSince = 0;
  shieldPop = 0;
  shieldHit = 0;
  shieldPerfect = 0;
  shown: Pose = idlePose(0);
  ghosts: Ghost[] = [];
  ghostOn = 0;
  flash = 0;
  aiTimer = 120;
  windup = 0;
  /** status effects: frames left */
  status: Partial<Record<Status, number>> = {};
  /** time-slow accumulator (slowed fighters update every other frame) */
  slowAcc = 0;
  /** one-hit barrier (Shine Shield) frames left */
  barrier = 0;
  /** recent positions for Rewind Step (2 s at 60 Hz) */
  history: Array<{ x: number; feet: number }> = [];
  lastHurt = 0;
  constructor(x: number, facing: number, readonly look: 'hero' | 'dummy' = 'hero') {
    this.x = x;
    this.facing = facing;
  }
  play(name: string, loop = false): void {
    const c = CLIPS[name];
    if (!c) return;
    this.clip = c;
    this.frame = 0;
    this.hitDone.clear();
    this.landed = false;
    this.loopPreview = loop;
  }
  face(): Face {
    if (this.clip) return this.clip.face;
    if (this.stun > 0 || this.status.freeze || this.status.bubble) return 'hurt';
    return 'normal';
  }
  target(): Pose {
    if (this.clip) return sample(this.clip, this.frame);
    if (!this.grounded) return airPose(this.vy);
    if (this.guarding) return guardPose;
    const sp = Math.abs(this.vx);
    if (sp > 0.6) return walkPose(this.t, sp);
    return idlePose(this.t);
  }
  hipY(p: Pose): number {
    const drop = footDrop(solve({ ...p, rot: 0 }));
    const stand = this.feet - drop * S + p.y * S;
    if (this.clip?.name !== 'KO fall') return stand;
    const lying = GROUND - 30 + p.y * S;
    const k = Math.min(1, Math.abs(p.rot) / 85);
    return stand * (1 - k) + lying * k;
  }
  hipX(p: Pose): number {
    return this.x + p.x * S * this.facing;
  }
  toStage(p: Pose, lx: number, ly: number): Pt {
    return { x: this.hipX(p) + lx * S * this.facing, y: this.hipY(p) + ly * S };
  }
  joint(name: 'fw' | 'bw' | 'fa' | 'ba' | 'fe' | 'be' | 'fs' | 'bs' | 'fk' | 'bk' | 'neck' | 'hip'): Pt {
    const p = this.shown;
    const s = solve(p);
    const j = jointWorld(p, s[name]);
    return this.toStage(p, j.x, j.y);
  }
  chest(): Pt {
    return { x: this.hipX(this.shown), y: this.hipY(this.shown) - 130 * S };
  }
  /** cannot act: frozen, bubbled, time-stopped */
  held(): boolean {
    return !!(this.status.freeze || this.status.bubble || this.status.stop);
  }
}

// ---------------------------------------------------------------- effect state
type Shape = 'line' | 'leaf' | 'petal' | 'shard' | 'drop' | 'dust' | 'ember' | 'gear';
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  col: string;
  w: number;
  grav: number;
  shape: Shape;
  rot: number;
}
interface Flare {
  x: number;
  y: number;
  size: number;
  life: number;
  max: number;
  c: FxCol;
}
interface Num {
  x: number;
  y: number;
  text: string;
  life: number;
  col: string;
  size: number;
}
interface Proj {
  kind: ProjKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  grav: number;
  r: number;
  life: number;
  hit: Hit;
  trail: Pt[];
  /** pierces (hits once and keeps flying) */
  pierce?: boolean;
  done?: boolean;
}
/** Anything that lives on the floor or in the air for a while and is drawn by kind. */
interface Thing {
  kind: string;
  x: number;
  y: number;
  life: number;
  max: number;
  dir: number;
  w: number;
  h: number;
  seed: number;
  /** frame counter of its own */
  t: number;
  hitOnce?: boolean;
  data?: number;
}

const state = {
  player: new Fighter(STAGE_W / 2 - 220, 1),
  dummy: new Fighter(STAGE_W / 2 + 160, -1, 'dummy'),
  dummyOn: true,
  dummyFights: true,
  freeMp: true,
  sparks: [] as Spark[],
  flares: [] as Flare[],
  nums: [] as Num[],
  rings: [] as Array<{ x: number; y: number; r: number; life: number; max: number; col: string }>,
  projs: [] as Proj[],
  things: [] as Thing[],
  beam: 0,
  hitStop: 0,
  shake: 0,
  flash: 0,
  flashCol: '255,255,255',
  combo: 0,
  comboTimer: 0,
  comboPop: 0,
  banner: null as null | { text: string; life: number; col: string },
  camX: STAGE_W / 2,
  zoom: 1,
  dim: 0,
  bones: false,
  boxes: false,
  speed: 1,
  preview: '',
  frameNo: 0,
};
const keys = new Set<string>();
const pressed = new Set<string>();

const SHAPES: Record<ElementId, Shape> = { fire: 'ember', water: 'drop', ice: 'shard', wind: 'leaf', earth: 'dust', leaf: 'petal', light: 'line', gravity: 'line', time: 'line' };
function addSparks(x: number, y: number, n: number, col = rgb(FX.mid), speed = 9, grav = 0.35, life = 30, shape: Shape = 'line'): void {
  for (let i = 0; i < n && state.sparks.length < 700; i++) {
    const a = rnd() * Math.PI * 2;
    const v = speed * (0.3 + rnd());
    state.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: life * (0.6 + rnd() * 0.6), max: life * 1.2, col: rnd() < 0.3 ? '#ffffff' : col, w: 2 + rnd() * 2, grav, shape, rot: rnd() * 6 });
  }
}
/** Element particles: embers, drops, shards, leaves, dust, petals. */
function elSparks(x: number, y: number, n: number, speed = 9, life = 34): void {
  const shape = SHAPES[EL];
  const grav = shape === 'ember' ? -0.12 : shape === 'leaf' || shape === 'petal' ? 0.05 : shape === 'dust' ? 0.25 : 0.4;
  addSparks(x, y, Math.ceil(n * 0.6), rgb(FX.mid), speed, 0.3, life * 0.8, 'line');
  addSparks(x, y, Math.ceil(n * 0.5), EL === 'leaf' ? '#ff9fd0' : rgb(FX2.mid), speed * 0.8, grav, life * 1.4, shape);
}
function addFlare(x: number, y: number, size: number, life = 12, c: FxCol = FX): void {
  state.flares.push({ x, y, size, life, max: life, c });
}
function ring(x: number, y: number, r: number, life = 20, col = FX.mid): void {
  state.rings.push({ x, y, r, life, max: life, col });
}
function thing(kind: string, x: number, y: number, life: number, o: Partial<Thing> = {}): Thing {
  const t: Thing = { kind, x, y, life, max: life, dir: 1, w: 0, h: 0, seed: Math.floor(rnd() * 1e6), t: 0, ...o };
  state.things.push(t);
  return t;
}
function banner(text: string, col = K.light, life = 60): void {
  state.banner = { text, life, col };
}
function shoutNum(x: number, y: number, text: string, col: string, size = 28, life = 45): void {
  state.nums.push({ x, y, text, life, col, size });
}
function flashScreen(n: number, col = FX.core): void {
  state.flash = Math.max(state.flash, n);
  state.flashCol = col;
}

// ---------------------------------------------------------------- hits and guard
function hurtbox(f: Fighter): Box {
  const p = f.shown;
  const top = f.hipY(p) - 290 * S;
  return { x: f.hipX(p) - 40 * S, y: top, w: 80 * S, h: 300 * S };
}
function hitboxStage(f: Fighter, h: Hit): Box {
  const p = f.shown;
  const x0 = f.hipX(p) + (f.facing > 0 ? h.box.x : -h.box.x - h.box.w) * S;
  return { x: x0, y: f.hipY(p) + h.box.y * S, w: h.box.w * S, h: h.box.h * S };
}
const overlap = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const H = (dmg: number, kb: number, lift: number, stun: number, fx: Hit['fx'] = 'bolt', extra: Partial<Hit> = {}): Hit => ({ from: 0, to: 0, box: { x: 0, y: 0, w: 0, h: 0 }, dmg, kb, lift, stop: Math.min(14, 3 + Math.round(dmg / 2)), stun, fx, ...extra });

const STATUS_TEXT: Record<Status, string> = { burn: 'BURN', slow: 'SLOW', freeze: 'FROZEN', root: 'ROOTED', float: 'FLOAT', bubble: 'TRAPPED', stop: 'STOPPED', dazzle: 'DAZZLED' };
function applyStatus(def: Fighter, s: Status, dur: number): void {
  const d = s === 'burn' && EL === 'fire' ? Math.round(dur * 1.3) : dur;
  def.status[s] = Math.max(def.status[s] ?? 0, d);
  shoutNum(def.x, def.hipY(def.shown) - 320 * S, STATUS_TEXT[s], rgb(FX.mid), 26, 50);
  if (s === 'float' || s === 'bubble') {
    def.grounded = false;
    def.vy = Math.min(def.vy, -6);
  }
}
function landHit(att: Fighter, def: Fighter, h: Hit, at: Pt): void {
  if (def.clip?.name === 'KO fall') return;
  const fromPlayer = att === state.player;
  const dc = def.clip;
  if (dc?.invuln && def.frame >= dc.invuln[0] && def.frame <= dc.invuln[1]) return;
  // Shine Shield: blocks one whole hit and heals a little
  if (def.barrier > 0) {
    def.barrier = 0;
    def.hp = Math.min(100, def.hp + 6);
    const c = def.chest();
    addFlare(c.x, c.y, 160, 22, FX);
    ring(c.x, c.y, 220, 24);
    elSparks(c.x, c.y, 40, 12);
    shoutNum(c.x, c.y - 60, 'BLOCKED +6', rgb(FX.mid), 34, 60);
    state.hitStop = 8;
    sfx('big');
    return;
  }
  const guarded = def.guarding && Math.sign(att.x - def.x) === def.facing && !def.held();
  if (guarded) {
    const perfect = def.t - def.guardSince <= PERFECT_FRAMES;
    def.shieldHit = 1;
    const sx = def.x + def.facing * 70 * S;
    const sy = at.y;
    const c = def.look === 'hero' ? FX : WHITE;
    ring(sx, sy, perfect ? 260 : 140, perfect ? 26 : 16, perfect ? GOLD.mid : c.mid);
    addSparks(sx, sy, perfect ? 50 : 22, perfect ? '#ffe27a' : rgb(c.mid), 10);
    addFlare(sx, sy, perfect ? 120 : 60, perfect ? 18 : 10, perfect ? GOLD : c);
    if (perfect) {
      def.shieldPerfect = 30;
      state.hitStop = 12;
      state.shake = 12;
      att.play('hurt');
      att.stun = 34;
      att.vx = -att.facing * 6;
      att.flash = 8;
      if (def === state.player && EL === 'time') def.mp = Math.min(100, def.mp + 15);
      banner('PERFECT GUARD', '#ffe27a', 70);
      shoutNum(sx, sy - 40, 'PERFECT', '#ffe27a', 46, 60);
      tone(2400, 0.25, 'triangle', 0.12, 0.8);
      tone(1200, 0.4, 'sine', 0.08, 1);
      return;
    }
    const k = def === state.player && EL === 'earth' ? 0.1 : 0.2;
    const chip = Math.max(1, Math.round(h.dmg * k));
    def.hp = Math.max(1, def.hp - chip);
    def.vx = h.kb * 0.4 * att.facing;
    state.hitStop = Math.max(3, h.stop - 2);
    state.shake = Math.max(state.shake, 4);
    shoutNum(sx, sy - 30, `${chip} BLOCK`, rgb(c.mid), 32);
    tone(900, 0.12, 'triangle', 0.1, 0.5);
    noise(0.05, 0.08);
    return;
  }
  // Weightless: the floating foe takes 25% more
  const dmg = Math.round(h.dmg * (def.status.float ? 1.25 : 1));
  def.hp = Math.max(0, def.hp - dmg);
  def.lastHurt = def.t;
  const armored = dc?.armor && def.frame >= dc.armor[0] && def.frame <= dc.armor[1];
  if (!def.held() && !armored) {
    def.vx = h.kb * att.facing;
    // gravity passive: knockback pulls the foe slightly back toward the hero
    if (fromPlayer && EL === 'gravity') def.vx *= 0.75;
    if (h.lift < 0) {
      def.vy = h.lift;
      def.grounded = false;
    } else if (!def.grounded) def.vy = Math.min(def.vy, -4);
  }
  def.flash = 6;
  state.hitStop = Math.max(state.hitStop, h.stop);
  state.shake = Math.max(state.shake, dmg * 0.9);
  if (fromPlayer) {
    att.landed = true;
    state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
    state.comboTimer = 80;
    state.comboPop = 10;
    att.mp = Math.min(100, att.mp + (EL === 'water' ? 5 : 3));
    if (h.status) applyStatus(def, h.status, h.dur ?? 60);
    else if (EL === 'ice' && !def.status.slow) def.status.slow = 30;
  }
  shoutNum(at.x, at.y - 20, String(dmg), fromPlayer ? K.light : '#ff9fb4', 34 + dmg);
  const c = fromPlayer ? FX : WHITE;
  if (fromPlayer) elSparks(at.x, at.y, h.fx === 'big' ? 50 : h.fx === 'bolt' ? 30 : 16, h.fx === 'big' ? 14 : 10);
  else addSparks(at.x, at.y, 14, '#ffffff', 9);
  addFlare(at.x, at.y, h.fx === 'big' ? 150 : h.fx === 'bolt' ? 95 : 60, h.fx === 'big' ? 20 : 12, c);
  if (h.fx === 'big') {
    flashScreen(6);
    ring(at.x, at.y, 240, 22);
  }
  if (fromPlayer) sfx(h.fx === 'big' ? 'big' : 'hit');
  else noise(0.06, 0.12);
  tone(h.fx === 'big' ? 160 : 320 + rnd() * 120, h.fx === 'spark' ? 0.08 : 0.16, 'square', 0.07);
  if (def.hp <= 0) {
    def.status = {};
    def.play('ko');
    state.shake = 18;
    state.hitStop = 16;
    if (fromPlayer) banner('K.O.!', '#ff5e8a', 90);
  } else if (!def.held() && !armored) {
    def.play('hurt');
    def.stun = h.stun;
  }
}
/** Area hit at x (from the sky, the floor or a field). */
function strikeAt(f: Fighter, other: Fighter, x: number, reach: number, h: Hit, groundedOnly = false): boolean {
  if (!state.dummyOn || other.clip?.name === 'KO fall') return false;
  if (Math.abs(other.x - x) > reach) return false;
  if (groundedOnly && !other.grounded) return false;
  landHit(f, other, h, { x: other.x, y: other.hipY(other.shown) - 120 * S });
  return true;
}

// ---------------------------------------------------------------- control
const POWERS: Record<string, string> = { KeyK: 'heavy', KeyP: 'ult' };
for (const p of K.powers) POWERS[p.key] = p.clip;
const MP_ULT = 100;
function costOf(name: string): number {
  if (name === 'ult') return MP_ULT;
  return CLIPS[name]?.mp ?? 0;
}
function startAttack(f: Fighter, name: string): boolean {
  if (f === state.player && !state.freeMp) {
    const cost = costOf(name);
    if (f.mp < cost) {
      shoutNum(f.x, f.hipY(f.shown) - 330 * S, 'NOT ENOUGH MP', '#ff9fb4', 24, 40);
      tone(160, 0.12, 'square', 0.05, 0.8);
      return false;
    }
    f.mp -= cost;
  }
  f.play(name);
  f.guarding = false;
  if (name === 'dash') {
    f.ghostOn = 14;
    sfx('cast');
  }
  if (name === 'ult') {
    tone(90, 1.0, 'sawtooth', 0.08, 4);
    banner(K.ultBanner, K.light, 90);
  } else if (CLIPS[name]?.mp) sfx('charge');
  return true;
}
const nameOf = (c: Clip) => Object.keys(CLIPS).find((k) => CLIPS[k] === c) ?? '';

function control(f: Fighter): void {
  const left = keys.has('KeyA') || keys.has('ArrowLeft');
  const right = keys.has('KeyD') || keys.has('ArrowRight');
  const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
  if (state.preview) return;
  if (f.clip) {
    const n = nameOf(f.clip);
    if (pressed.has('KeyJ') && f.clip.cancel !== undefined && COMBO.includes(n)) {
      const i = COMBO.indexOf(n);
      if (i < COMBO.length - 1) f.queued = COMBO[i + 1];
    }
    if (f.landed && COMBO.includes(n)) {
      for (const [k, p] of Object.entries(POWERS))
        if (pressed.has(k) && startAttack(f, p)) {
          shoutNum(f.x, f.hipY(f.shown) - 330 * S, 'CANCEL!', rgb(FX.mid), 28, 40);
          return;
        }
    }
    return;
  }
  if (f.stun > 0) return;
  const wantGuard = keys.has('KeyS') && f.grounded;
  if (wantGuard && !f.guarding) {
    f.guardSince = f.t;
    tone(520, 0.15, 'sine', 0.05, 1.6);
  }
  f.guarding = wantGuard;
  const dir = (right ? 1 : 0) - (left ? 1 : 0);
  if (!f.guarding) {
    const sp = run ? RUN : WALK;
    f.vx = f.grounded ? dir * sp : f.vx * 0.9 + dir * sp * 0.1;
    if (dir) f.facing = dir;
  } else f.vx = 0;
  const jump = pressed.has('KeyW') || pressed.has('Space') || pressed.has('ArrowUp');
  if (jump && f.grounded && !f.guarding) {
    f.vy = JUMP;
    f.grounded = false;
    f.airJumps = EL === 'wind' ? 1 : 0;
    tone(500, 0.12, 'triangle', 0.06, 1.8);
    addSparks(f.x, GROUND, 10, rgb(FX.mid), 5);
  } else if (jump && !f.grounded && f.airJumps > 0) {
    // wind passive: double jump on a gust ring
    f.airJumps--;
    f.vy = JUMP * 0.85;
    const c = f.chest();
    ring(c.x, f.feet, 110, 18);
    swirlBurst(f.x, f.feet - 10);
    noise(0.3, 0.15, 0, 900);
  }
  if (pressed.has('KeyJ')) startAttack(f, f.grounded ? 'jab' : 'kick');
  else if (pressed.has('KeyL')) startAttack(f, 'dash');
  else if (pressed.has('KeyT')) startAttack(f, 'taunt');
  else if (pressed.has('KeyV')) startAttack(f, 'victory');
  else if (pressed.has('KeyH')) {
    f.play('hurt');
    f.stun = 20;
  } else if (pressed.has('KeyX')) f.play('ko');
  else
    for (const [k, p] of Object.entries(POWERS))
      if (pressed.has(k)) {
        startAttack(f, p);
        break;
      }
}
function swirlBurst(x: number, y: number): void {
  thing('gust', x, y, 22, { w: 90 });
}

function dummyAI(d: Fighter, p: Fighter): void {
  if (!state.dummyFights || d.clip || d.stun > 0 || p.clip?.name === 'KO fall' || d.held()) return;
  const dist = Math.abs(p.x - d.x);
  if (d.windup > 0) {
    d.windup--;
    if (d.windup === 0) d.play(rnd() < 0.6 ? 'jab' : 'kick');
    return;
  }
  const rooted = !!d.status.root;
  const wall = state.things.find((t) => t.kind === 'wall' && Math.sign(t.x - d.x) === Math.sign(p.x - d.x) && Math.abs(t.x - d.x) < Math.abs(p.x - d.x));
  if (dist > 190 && !rooted) d.vx = Math.sign(p.x - d.x) * 2.6 * (d.status.slow ? 0.5 : 1);
  if (wall && Math.abs(wall.x - d.x) < 60) d.vx = 0;
  if (--d.aiTimer <= 0 && dist < 200) {
    d.aiTimer = 100 + Math.floor(rnd() * 70);
    d.windup = 14;
    tone(300, 0.1, 'square', 0.04, 0.6);
  }
}

// ---------------------------------------------------------------- power events
function targetX(f: Fighter, other: Fighter, ahead: number): number {
  return state.dummyOn && other.clip?.name !== 'KO fall' ? other.x : f.x + f.facing * ahead;
}
function shoot(f: Fighter, kind: ProjKind, speed: number, r: number, hit: Hit, o: Partial<Proj> = {}): void {
  const hand = f.joint('fw');
  const sp = EL === 'light' ? speed * 1.2 : speed;
  state.projs.push({ kind, x: hand.x + f.facing * 20, y: hand.y, vx: sp * f.facing, vy: 0, grav: 0, r, life: 90, hit, trail: [], ...o });
  addFlare(hand.x, hand.y, 70, 12);
  elSparks(hand.x, hand.y, 12, 6);
  sfx('cast');
}
function runEvents(f: Fighter, other: Fighter): void {
  const c = f.clip;
  if (!c) return;
  for (const [fr, ev] of c.events ?? []) if (fr === f.frame) event(f, other, ev);
}
function event(f: Fighter, other: Fighter, ev: string): void {
  const hand = f.joint('fw');
  const tx = targetX(f, other, 340);
  // shared events
  if (ev === 'trail') return;
  if (ev === 'slam') return slam(f, other);
  if (ev.startsWith('ult')) return ultEvent(f, other, ev);
  switch (`${EL}:${ev}`) {
    // ---- fire
    case 'fire:shoot':
      return shoot(f, 'fireball', 15, 22, H(10, 6, -3, 26, 'bolt', { status: 'burn', dur: 150 }));
    case 'fire:mark':
      thing('mark', tx, GROUND, 22, { w: 90 });
      return;
    case 'fire:column': {
      const m = state.things.find((t) => t.kind === 'mark');
      const x = m ? m.x : tx;
      thing('column', x, GROUND, 46, { w: 110, h: 620 });
      ring(x, GROUND, 260, 24);
      flashScreen(5);
      state.shake = Math.max(state.shake, 16);
      sfx('big');
      strikeAt(f, other, x, 100, H(20, 3, -19, 50, 'big', { status: 'burn', dur: 120 }));
      return;
    }
    // ---- water
    case 'water:jet':
      state.beam = 18;
      sfx('cast');
      return;
    case 'water:jetEnd':
      return;
    case 'water:shoot':
      return shoot(f, 'bubble', 6.5, 46, H(6, 0, 0, 20, 'spark', { status: 'bubble', dur: 100 }), { life: 140 });
    // ---- ice
    case 'ice:shoot':
      return shoot(f, 'shard', 24, 18, H(8, 4, 0, 20, 'bolt', { status: 'slow', dur: 150 }));
    case 'ice:cast': {
      const x = f.x + f.facing * 170;
      thing('wall', x, GROUND, 240, { w: 70, h: 300, dir: f.facing });
      ring(x, GROUND, 180, 18);
      elSparks(x, GROUND - 100, 40, 10);
      sfx('big');
      state.shake = Math.max(state.shake, 8);
      // the wall shoves a foe that stands where it rises
      if (state.dummyOn && Math.abs(other.x - x) < 70) landHit(f, other, H(6, 10, -5, 20, 'bolt'), { x, y: GROUND - 150 });
      return;
    }
    // ---- wind
    case 'wind:shoot':
      if (nameOf(f.clip!) === 'breezeShove') {
        thing('gustCone', hand.x, hand.y, 22, { dir: f.facing, w: 260 });
        sfx('cast');
        return;
      }
      return shoot(f, 'blade', 21, 30, H(7, 5, -2, 22, 'bolt'), { pierce: false, life: 110, y: hand.y + (rnd() - 0.5) * 40 });
    case 'wind:whirl':
      thing('whirl', f.x, GROUND, 32, { w: 120 });
      sfx('cast');
      return;
    // ---- earth
    case 'earth:lift':
      thing('liftRock', 0, 0, 13, {});
      return;
    case 'earth:shoot': {
      const dx = tx - hand.x;
      const t = 34;
      const vx = Math.max(-22, Math.min(22, dx / t));
      state.projs.push({ kind: 'boulder', x: hand.x, y: hand.y - 30, vx: Math.abs(vx) < 4 ? 4 * f.facing : vx, vy: -17, grav: 1.0, r: 34, life: 120, hit: H(14, 7, -8, 36, 'big'), trail: [] });
      sfx('cast');
      return;
    }
    case 'earth:fist': {
      const p = f.joint('bw');
      boulderBurst(p.x + f.facing * 30, p.y);
      return;
    }
    // ---- leaf
    case 'leaf:vine':
      thing('vine', hand.x, hand.y, 30, { dir: f.facing, w: 430 });
      sfx('cast');
      return;
    case 'leaf:pull':
      return;
    case 'leaf:mine': {
      const x = f.x + f.facing * 90;
      thing('mine', x, GROUND, 600, {});
      elSparks(x, GROUND - 10, 14, 5);
      tone(700, 0.1, 'triangle', 0.05, 1.5);
      return;
    }
    case 'leaf:cast': {
      for (let i = 0; i < 9; i++) thing('root', f.x + f.facing * (60 + i * 55), GROUND, 70 + i * 3, { data: i * 3, seed: i * 31 + 5, dir: f.facing });
      f.hp = Math.min(100, f.hp + 8);
      shoutNum(f.x, f.hipY(f.shown) - 330 * S, '+8 HP', '#a6ff7a', 32, 60);
      sfx('big');
      return;
    }
    // ---- light
    case 'light:shoot':
      return shoot(f, 'dart', 30, 14, H(8, 4, 0, 20, 'bolt', { status: 'dazzle', dur: 90 }));
    case 'light:beam':
      state.beam = 24;
      sfx('cast');
      return;
    case 'light:beamEnd':
      return;
    case 'light:cast':
      f.barrier = 360;
      ring(f.x, f.chest().y, 200, 24);
      elSparks(f.chest().x, f.chest().y, 40, 9);
      sfx('big');
      return;
    // ---- gravity
    case 'gravity:well':
      thing('well', tx, GROUND - 120, 70, { w: 90 });
      sfx('cast');
      return;
    case 'gravity:mark':
      thing('mark', tx, GROUND, 22, { w: 100 });
      return;
    case 'gravity:drop': {
      const m = state.things.find((t) => t.kind === 'mark');
      thing('anchor', m ? m.x : tx, -120, 26, { w: 80 });
      sfx('charge');
      return;
    }
    case 'gravity:cast':
      if (state.dummyOn && Math.abs(other.x - f.x) < 520 && other.clip?.name !== 'KO fall') {
        applyStatus(other, 'float', 150);
        other.vy = -9;
        ring(other.x, other.chest().y, 160, 24);
        sfx('big');
      } else shoutNum(f.x + f.facing * 300, GROUND - 200, 'OUT OF RANGE', '#ff9fb4', 24, 40);
      thing('pulse', f.x, f.chest().y, 30, { w: 520 });
      return;
    // ---- time
    case 'time:rewind': {
      const old = f.history[0] ?? { x: f.x, feet: f.feet };
      const from = f.chest();
      for (let i = 0; i < f.history.length; i += 12) f.ghosts.push({ x: f.history[i].x, y: f.history[i].feet, facing: f.facing, pose: { ...f.shown }, life: 26, max: 26 });
      f.x = old.x;
      f.feet = old.feet;
      f.grounded = f.feet >= GROUND;
      thing('clock', from.x, from.y, 26, { w: 120 });
      thing('clock', f.x, f.chest().y, 26, { w: 120 });
      sfx('cast');
      return;
    }
    case 'time:cast':
      thing('field', f.x + f.facing * 260, GROUND, 240, { w: 240 });
      sfx('big');
      return;
    case 'time:shoot':
      return shoot(f, 'freeze', 13, 34, H(0, 0, 0, 0, 'spark', { status: 'stop', dur: 72 }), { life: 70 });
  }
}
/** The heavy's ground slam in the element's style. */
function slam(f: Fighter, other: Fighter): void {
  const gp = f.toStage(f.shown, 110, 0);
  const x = gp.x;
  elSparks(x, GROUND - 10, 40, 12);
  addFlare(x, GROUND - 10, 130, 16);
  ring(x, GROUND, 220, 18);
  state.shake = Math.max(state.shake, 14);
  sfx('big');
  const name = nameOf(f.clip!);
  if (EL === 'water' && name === 'undertow') {
    thing('wave', x, GROUND, 120, { dir: f.facing, w: 170, h: 150 });
    return;
  }
  if (EL === 'ice' && name === 'permafrost') {
    thing('permafrost', f.x, GROUND, 70, { w: 300 });
    flashScreen(4);
    if (state.dummyOn && Math.abs(other.x - f.x) < 300 && other.clip?.name !== 'KO fall') landHit(f, other, H(12, 2, -4, 30, 'big', { status: 'freeze', dur: 90 }), { x: other.x, y: other.chest().y });
    return;
  }
  if (EL === 'earth' && name === 'groundbreak') {
    thing('quake', x, GROUND, 60, { dir: f.facing, w: 0 });
    thing('quake', x, GROUND, 60, { dir: -f.facing, w: 0 });
    return;
  }
  // the element heavy leaves its mark on the floor
  thing('scorch', x, GROUND, 80, { w: 110 });
  if (EL === 'fire') thing('floorFire', x, GROUND, 60, { w: 120 });
  if (EL === 'ice') for (let i = -2; i <= 2; i++) thing('spike', x + i * 34, GROUND, 40, { h: 70 - Math.abs(i) * 14, w: 26, dir: i * 12 });
  if (EL === 'earth') boulderBurst(x, GROUND - 20);
  if (EL === 'leaf') for (let i = 0; i < 4; i++) thing('root', x + (i - 1.5) * 40, GROUND, 50, { data: i * 2, seed: i * 13 + 1, dir: f.facing });
  if (EL === 'time') thing('clock', x, GROUND - 60, 30, { w: 150 });
  if (EL === 'gravity') thing('pulse', x, GROUND - 40, 26, { w: 260 });
}
function boulderBurst(x: number, y: number): void {
  for (let i = 0; i < 7; i++) state.sparks.push({ x, y, vx: (rnd() - 0.5) * 16, vy: -6 - rnd() * 9, life: 40, max: 40, col: '#8a6038', w: 6 + rnd() * 8, grav: 0.6, shape: 'dust', rot: rnd() * 6 });
}

// ---------------------------------------------------------------- ultimates
function ultEvent(f: Fighter, other: Fighter, ev: string): void {
  const tx = targetX(f, other, 340);
  const hitSmall = H(4, 1, -4, 24, 'bolt');
  const hitFinal = H(16, 6, -19, 60, 'big');
  if (ev === 'ultStart') {
    thing('ultSelf', f.x, GROUND, 60, { w: 200 });
    return;
  }
  if (ev === 'ultCall') {
    thing('ultScene', tx, GROUND, 70, { w: 260 });
    if (EL === 'time' && state.dummyOn) applyStatus(other, 'stop', 60);
    if (EL === 'gravity' && state.dummyOn) applyStatus(other, 'float', 70);
    if (EL === 'wind' && state.dummyOn) applyStatus(other, 'float', 66);
    if (EL === 'water' && state.dummyOn) applyStatus(other, 'bubble', 62);
    sfx('big');
    flashScreen(4);
    return;
  }
  if (ev === 'ultHit') {
    const x = tx + (rnd() - 0.5) * 50;
    switch (EL) {
      case 'fire':
        state.projs.push({ kind: 'fireball', x: x - 160 + rnd() * 80, y: -60, vx: 6, vy: 22, grav: 0, r: 22, life: 60, hit: { ...hitSmall, status: 'burn', dur: 60 }, trail: [] });
        break;
      case 'earth':
        state.projs.push({ kind: 'boulder', x: x + (rnd() - 0.5) * 60, y: -80, vx: 0, vy: 14, grav: 0.8, r: 30, life: 80, hit: hitSmall, trail: [] });
        break;
      case 'ice':
        thing('spike', x + (rnd() - 0.5) * 80, GROUND, 40, { h: 160, w: 44, dir: (rnd() - 0.5) * 30 });
        strikeAt(f, other, x, 90, { ...hitSmall, status: 'slow', dur: 60 });
        break;
      case 'light':
        thing('ray', x, GROUND, 18, { w: 46 });
        strikeAt(f, other, x, 80, hitSmall);
        break;
      case 'time': {
        // an afterimage of the hero dashes through the stopped foe
        const side = rnd() < 0.5 ? -1 : 1;
        f.ghosts.push({ x: x + side * 120, y: GROUND, facing: -side, pose: sample(CLIPS.cross, 9), life: 20, max: 20 });
        thing('slash', x, other.chest().y, 14, { dir: side, w: 220 });
        strikeAt(f, other, x, 120, hitSmall);
        break;
      }
      default:
        thing('burst', x, state.dummyOn ? other.chest().y : GROUND - 160, 16, { w: 90 });
        strikeAt(f, other, x, 110, hitSmall);
    }
    sfx('hit');
    return;
  }
  if (ev === 'ultFinal') {
    thing('ultFinal', tx, GROUND, 50, { w: 300 });
    strikeAt(f, other, tx, 160, hitFinal);
    if (EL === 'leaf') {
      f.hp = Math.min(100, f.hp + 15);
      shoutNum(f.x, f.hipY(f.shown) - 330 * S, '+15 HP', '#a6ff7a', 34, 60);
    }
    flashScreen(12);
    state.shake = 28;
    sfx('big');
    banner(`${K.ultBanner}!`, K.light, 80);
  }
}

// ---------------------------------------------------------------- update
function beamOrigin(p: Fighter): Pt {
  return p.joint('fw');
}
function beamEnd(p: Fighter, d: Fighter, reach: number): Pt {
  const hand = beamOrigin(p);
  if (state.dummyOn && Math.sign(d.x - p.x) === p.facing && Math.abs(d.x - p.x) < reach + 40 && d.clip?.name !== 'KO fall') return d.chest();
  return { x: hand.x + p.facing * reach, y: hand.y };
}
function stepProjectiles(): void {
  const p = state.player;
  const d = state.dummy;
  for (const pr of state.projs) {
    pr.trail.push({ x: pr.x, y: pr.y });
    if (pr.trail.length > 10) pr.trail.shift();
    pr.vy += pr.grav;
    pr.x += pr.vx;
    pr.y += pr.vy;
    pr.life--;
    if (pr.kind === 'bubble') pr.y += Math.sin(state.frameNo / 6) * 1.2;
    if (state.frameNo % 2 === 0 && pr.kind !== 'bubble') addSparks(pr.x, pr.y, 1, rgb(FX.mid), 2, pr.kind === 'fireball' ? -0.15 : 0.1, 18, pr.kind === 'fireball' ? 'ember' : 'line');
    // walls stop the foe, not your own shots; projectiles break on the floor
    if (pr.y > GROUND - 4) {
      pr.done = true;
      impact(pr, pr.x, GROUND - 10);
      if (pr.kind === 'boulder') strikeAt(p, d, pr.x, 90, pr.hit);
      continue;
    }
    if (pr.x < -100 || pr.x > STAGE_W + 100 || pr.life <= 0) {
      pr.done = true;
      continue;
    }
    if (!state.dummyOn || d.clip?.name === 'KO fall') continue;
    const r = pr.r * 0.8;
    if (overlap({ x: pr.x - r, y: pr.y - r, w: r * 2, h: r * 2 }, hurtbox(d))) {
      landHit(p, d, pr.hit, { x: pr.x, y: pr.y });
      impact(pr, pr.x, pr.y);
      pr.done = !pr.pierce;
    }
  }
  state.projs = state.projs.filter((x) => !x.done);
}
function impact(pr: Proj, x: number, y: number): void {
  elSparks(x, y, pr.kind === 'boulder' ? 30 : 20, 10);
  addFlare(x, y, pr.r * 4, 14);
  ring(x, y, pr.r * 5, 16);
  if (pr.kind === 'boulder') {
    boulderBurst(x, y);
    thing('scorch', x, GROUND, 60, { w: 70 });
    state.shake = Math.max(state.shake, 10);
    sfx('big');
  }
  if (pr.kind === 'fireball') thing('floorFire', x, GROUND, 40, { w: 60 });
}
function stepThings(): void {
  const p = state.player;
  const d = state.dummy;
  const live = state.dummyOn && d.clip?.name !== 'KO fall';
  for (const t of state.things) {
    t.t++;
    t.life--;
    switch (t.kind) {
      case 'wave': {
        t.x += t.dir * 12;
        if (state.frameNo % 2 === 0) addSparks(t.x + t.dir * 40, GROUND - t.h, 3, '#dffaff', 6, 0.4, 24, 'drop');
        if (!t.hitOnce && live && Math.abs(d.x - t.x) < 80 && d.grounded) {
          t.hitOnce = true;
          landHit(p, d, H(14, 9 * t.dir * p.facing, -13, 40, 'big'), { x: d.x, y: d.chest().y + 40 });
        }
        if (t.x < 0 || t.x > STAGE_W) t.life = Math.min(t.life, 8);
        break;
      }
      case 'quake': {
        t.w += 16;
        const x = t.x + t.dir * t.w;
        if (t.t % 3 === 0) thing('rockSpike', x, GROUND, 34, { h: 90 + rnd() * 50, w: 40, dir: t.dir * 14 });
        if (!t.hitOnce && live && Math.abs(d.x - x) < 50) {
          t.hitOnce = true;
          if (d.grounded) landHit(p, d, H(18, 4, -15, 46, 'big'), { x: d.x, y: GROUND - 60 });
        }
        break;
      }
      case 'wall':
        if (live && Math.abs(d.x - t.x) < 55) d.x = t.x + Math.sign(d.x - t.x || 1) * 55;
        if (t.life === 1) {
          elSparks(t.x, GROUND - 140, 50, 12);
          tone(2200, 0.3, 'triangle', 0.06, 0.5);
        }
        break;
      case 'mine':
        if (t.t > 20 && live && Math.abs(d.x - t.x) < 50 && d.grounded) {
          t.life = 0;
          landHit(p, d, H(8, 0, 0, 20, 'bolt', { status: 'root', dur: 110 }), { x: t.x, y: GROUND - 60 });
          for (let i = 0; i < 5; i++) thing('root', t.x + (i - 2) * 24, GROUND, 110, { data: i, seed: i * 7 + 3, dir: 1 });
        }
        break;
      case 'vine': {
        const reach = t.w * Math.min(1, t.t / 8);
        if (!t.hitOnce && live && Math.sign(d.x - t.x) === t.dir && Math.abs(d.x - t.x) < reach) {
          t.hitOnce = true;
          t.data = 1;
          landHit(p, d, H(7, 0, 0, 34, 'bolt'), { x: d.x, y: d.chest().y });
        }
        // once it grabs, it pulls the foe in
        if (t.data && live && t.t > 10) {
          const stop = p.x + t.dir * 110;
          d.x += (stop - d.x) * 0.2;
          d.vx = 0;
        }
        break;
      }
      case 'field':
        if (live && Math.abs(d.x - t.x) < t.w) d.status.slow = Math.max(d.status.slow ?? 0, 6);
        break;
      case 'well':
        if (live && t.t > 6) {
          const stop = p.x + p.facing * 120;
          d.x += (stop - d.x) * 0.06;
          if (t.t === 40) landHit(p, d, H(9, 2, -3, 30, 'bolt'), { x: d.x, y: d.chest().y });
        }
        break;
      case 'anchor':
        t.y += 34;
        if (t.y >= GROUND - 60 && !t.hitOnce) {
          t.hitOnce = true;
          t.life = 14;
          ring(t.x, GROUND, 280, 22);
          thing('scorch', t.x, GROUND, 80, { w: 120 });
          state.shake = Math.max(state.shake, 20);
          flashScreen(5);
          sfx('big');
          elSparks(t.x, GROUND - 20, 40, 12);
          if (live && Math.abs(d.x - t.x) < 110) {
            landHit(p, d, H(18, 2, 0, 50, 'big'), { x: d.x, y: d.chest().y });
            d.vy = 14;
          }
        }
        break;
      case 'whirl':
        if (p.clip) t.x = p.x;
        if (t.t % 3 === 0) addSparks(p.x + (rnd() - 0.5) * 140, GROUND - rnd() * 200, 2, '#9fffd0', 4, 0.02, 30, 'leaf');
        break;
      case 'gustCone':
        if (!t.hitOnce && live && Math.sign(d.x - t.x) === t.dir && Math.abs(d.x - t.x) < t.w) {
          t.hitOnce = true;
          landHit(p, d, H(9, 18, -6, 30, 'bolt'), { x: d.x, y: d.chest().y });
        }
        break;
      case 'root':
        if (t.t === (t.data ?? 0) + 4 && live && Math.abs(d.x - t.x) < 45 && d.grounded && !d.status.root) landHit(p, d, H(9, 0, 0, 30, 'bolt', { status: 'root', dur: 120 }), { x: d.x, y: GROUND - 80 });
        break;
      case 'liftRock':
        break;
    }
  }
  state.things = state.things.filter((t) => t.life > 0);
}
function stepStatus(f: Fighter): void {
  const s = f.status;
  for (const k of Object.keys(s) as Status[]) {
    s[k] = (s[k] ?? 0) - 1;
    if ((s[k] ?? 0) <= 0) delete s[k];
  }
  if (s.burn && f.t % 30 === 0 && f.hp > 1) {
    f.hp -= 1;
    shoutNum(f.x, f.hipY(f.shown) - 280 * S, '1', '#ffb060', 22, 30);
  }
  if (s.burn && f.t % 3 === 0) addSparks(f.x + (rnd() - 0.5) * 50, f.hipY(f.shown) - rnd() * 200 * S, 1, '#ffa040', 2, -0.2, 26, 'ember');
  if (s.root) f.vx = 0;
  if (s.float || s.bubble) {
    // drift up to a hover height, then stay there
    const hover = GROUND - (s.bubble ? 170 : 210);
    f.grounded = false;
    f.vy = (hover - f.feet) * 0.08;
    f.vx *= 0.9;
  }
}
function stepFighter(f: Fighter, other: Fighter, isPlayer: boolean): void {
  stepStatus(f);
  // time stop and freeze: nothing moves, not even the pose
  if (f.status.stop || f.status.freeze) {
    if (f.status.freeze && f.t % 4 === 0) addSparks(f.x + (rnd() - 0.5) * 60, f.hipY(f.shown) - rnd() * 200 * S, 1, '#dff6ff', 1, 0.05, 20, 'shard');
    return;
  }
  // slowed fighters run at half speed
  if (f.status.slow) {
    f.slowAcc += 0.5;
    if (f.slowAcc < 1) return;
    f.slowAcc -= 1;
  }
  f.t++;
  if (f.flash > 0) f.flash--;
  if (f.stun > 0) f.stun--;
  if (f.barrier > 0) f.barrier--;
  if (isPlayer) {
    if (!state.freeMp) f.mp = Math.min(100, f.mp + 0.1);
    // leaf passive: slow HP regen out of combat
    if (EL === 'leaf' && f.t - f.lastHurt > 180 && f.t % 40 === 0 && f.hp < 100) f.hp++;
    f.history.push({ x: f.x, feet: f.feet });
    if (f.history.length > 120) f.history.shift();
    control(f);
  } else if (!f.status.bubble) dummyAI(f, other);
  f.shieldPop = f.guarding ? Math.min(1, f.shieldPop + 0.18) : Math.max(0, f.shieldPop - 0.2);
  f.shieldHit = Math.max(0, f.shieldHit - 0.08);
  if (f.shieldPerfect > 0) f.shieldPerfect--;
  if (f.clip) {
    runEvents(f, other);
    const mv = moveAt(f.clip, f.frame);
    if (mv && !f.status.root) f.vx = mv * f.facing;
    else if (f.grounded) f.vx *= ['Hurt', 'KO fall'].includes(f.clip.name) ? 0.86 : 0.6;
    if (state.dummyOn)
      (f.clip.hits ?? []).forEach((h, i) => {
        if (f.hitDone.has(i) || f.frame < h.from || f.frame > h.to) return;
        const hb = hitboxStage(f, h as Hit);
        if (overlap(hb, hurtbox(other))) {
          f.hitDone.add(i);
          landHit(f, other, h as Hit, { x: other.x - f.facing * 20, y: Math.max(hb.y + hb.h / 2, f.hipY(f.shown) - 200) });
        }
      });
    const live = (f.clip.hits ?? []).some((h) => f.frame >= h.from - 3 && f.frame <= h.to + 2);
    if (f.clip.limb && live && f.t % 2 === 0 && f.look === 'hero') {
      const j = f.joint(f.clip.limb);
      addSparks(j.x, j.y, 3, rgb(FX.mid), 4, 0.1, 16, SHAPES[EL] === 'ember' ? 'ember' : 'line');
    }
    const au = auraAt(f.clip as never, f.frame);
    if (au > 0.2 && f.t % 2 === 0 && f.look === 'hero') for (let i = 0; i < 2; i++) addSparks(f.x + (rnd() - 0.5) * 140 * S, GROUND - rnd() * 40, 1, rnd() < 0.5 ? rgb(FX.mid) : rgb(FX2.mid), 2, -0.18, 50, SHAPES[EL]);
    // Scorch Dash leaves a burning trail
    if (EL === 'fire' && f.clip.name === 'Scorch Dash' && f.frame >= 9 && f.frame <= 25 && f.frame % 2 === 0) thing('floorFire', f.x - f.facing * 20, GROUND, 70, { w: 46, hitOnce: false });
    f.frame++;
    if (f.clip && f.clip.cancel !== undefined && f.queued && f.frame >= f.clip.cancel + 4) {
      const q = f.queued;
      f.queued = null;
      startAttack(f, q);
    } else if (f.clip && f.frame >= f.clip.frames) {
      if (f.loopPreview) {
        f.frame = 0;
        f.hitDone.clear();
      } else {
        if (f.clip.name === 'KO fall') f.hp = 100;
        f.clip = null;
        f.queued = null;
      }
    }
  }
  if (!f.grounded) {
    if (!(f.status.float || f.status.bubble)) f.vy += GRAV;
    f.feet += f.vy;
    if (f.feet >= GROUND) {
      f.feet = GROUND;
      f.vy = 0;
      f.grounded = true;
      addSparks(f.x, GROUND, 8, rgb(FX.mid), 4);
    }
  } else if (!isPlayer && !f.clip) f.vx *= 0.8;
  const px = f.x;
  f.x = Math.max(70, Math.min(STAGE_W - 70, f.x + f.vx));
  if (!isPlayer && !f.clip && f.stun <= 0) f.facing = state.player.x > f.x ? 1 : -1;
  const tgt = f.target();
  f.shown = lerpPose(f.shown, tgt, f.clip ? 0.55 : 0.3);
  if (f.ghostOn > 0) {
    f.ghostOn--;
    if (f.t % 2 === 0) f.ghosts.push({ x: f.x, y: f.feet, facing: f.facing, pose: { ...f.shown }, life: 18, max: 18 });
    const y = f.hipY(f.shown) - 90 * S;
    thing('dashLine', (px + f.x) / 2, y + (rnd() - 0.5) * 50, 12, { w: Math.abs(f.x - px) + 60, dir: f.facing });
    addSparks(f.x, GROUND - 4, 2, rgb(FX.mid), 3, 0.2, 24, SHAPES[EL]);
  }
  f.ghosts = f.ghosts.filter((g) => --g.life > 0);
}
function stepFloorFire(): void {
  const d = state.dummy;
  if (!state.dummyOn || d.clip?.name === 'KO fall' || !d.grounded) return;
  for (const t of state.things) if (t.kind === 'floorFire' && Math.abs(d.x - t.x) < t.w * 0.7 && t.t % 20 === 10) landHit(state.player, d, H(2, 0, 0, 8, 'spark', { status: 'burn', dur: 60 }), { x: d.x, y: GROUND - 60 });
}

function step(): void {
  state.frameNo++;
  if (pressed.has('KeyB')) state.bones = !state.bones;
  if (pressed.has('KeyG')) state.boxes = !state.boxes;
  if (state.hitStop > 0) {
    state.hitStop--;
    return;
  }
  const p = state.player;
  const d = state.dummy;
  stepFighter(p, d, true);
  if (state.dummyOn) stepFighter(d, p, false);
  if (state.dummyOn && p.grounded && d.grounded && d.clip?.name !== 'KO fall') {
    const gap = d.x - p.x;
    const min = 64;
    if (Math.abs(gap) < min) {
      const push = (min - Math.abs(gap)) / 2;
      const s = gap >= 0 ? 1 : -1;
      p.x -= push * s;
      d.x += push * s;
    }
  }
  // beams: Jet Lance (water) and Sunlance (light) hit every few frames while they last
  if (state.beam > 0) {
    state.beam--;
    const reach = EL === 'water' ? 420 : 620;
    const e = beamEnd(p, d, reach);
    if (state.frameNo % 2 === 0) elSparks(e.x, e.y, 3, 7, 24);
    const every = EL === 'water' ? 6 : 6;
    if (state.beam % every === 0 && state.dummyOn && d.clip?.name !== 'KO fall' && Math.sign(d.x - p.x) === p.facing && Math.abs(d.x - p.x) < reach + 40) {
      const last = state.beam < every;
      landHit(p, d, EL === 'water' ? H(last ? 6 : 3, last ? 15 : 4, last ? -4 : 0, 22, last ? 'bolt' : 'spark') : H(last ? 8 : 5, last ? 7 : 2, 0, 22, last ? 'bolt' : 'spark'), e);
    }
    if (state.frameNo % 6 === 0) noise(0.1, 0.05, EL === 'water' ? 1500 : 0, EL === 'light' ? 2000 : 0);
  }
  stepProjectiles();
  stepThings();
  stepFloorFire();
  for (const s of state.sparks) {
    s.x += s.vx;
    s.y += s.vy;
    s.vy += s.grav;
    s.vx *= 0.96;
    s.rot += 0.12;
    if (s.shape === 'leaf' || s.shape === 'petal') s.vx += Math.sin(s.life / 6) * 0.3;
    if (s.y > GROUND && s.grav > 0) {
      s.y = GROUND;
      s.vy *= -0.3;
      s.vx *= 0.6;
    }
    s.life--;
  }
  state.sparks = state.sparks.filter((s) => s.life > 0);
  state.flares = state.flares.filter((f) => --f.life > 0);
  state.nums = state.nums.filter((n) => ((n.y -= 1.1), --n.life > 0));
  state.rings = state.rings.filter((r) => --r.life > 0);
  if (state.banner && --state.banner.life <= 0) state.banner = null;
  if (state.shake > 0) state.shake *= 0.86;
  if (state.flash > 0) state.flash--;
  if (state.comboPop > 0) state.comboPop--;
  if (state.comboTimer > 0) state.comboTimer--;
  else state.combo = 0;
  const ult = p.clip?.dim && p.frame >= p.clip.dim[0] && p.frame <= p.clip.dim[1];
  state.dim += ((ult ? 0.55 : 0) - state.dim) * 0.08;
  state.zoom += ((ult ? 1.14 : 1) - state.zoom) * 0.06;
  const mid = state.dummyOn ? (p.x + d.x) / 2 : p.x;
  state.camX += (mid - state.camX) * 0.12;
  const half = VIEW_W / 2 / state.zoom;
  state.camX = Math.max(half, Math.min(STAGE_W - half, state.camX));
  pressed.clear();
}

// ---------------------------------------------------------------- render
interface Skins {
  hero: Skin;
  dummy: Skin;
  ghost: Skin;
  flash: Skin;
  frozen: Skin;
  dummyFrozen: Skin;
}
function makeSkins(parts: TrialParts): Skins {
  const heads = parts.heads;
  const circles = parts.circles;
  const map = (fn: Parameters<typeof tintImage>[1]) => ({
    normal: tintImage(heads.normal, fn),
    attack: tintImage(heads.attack, fn),
    hurt: tintImage(heads.hurt, fn),
    ko: tintImage(heads.ko, fn),
  });
  const tintPieces = (fn: Parameters<typeof tintImage>[1]): Pieces => {
    const o: Pieces = {};
    for (const [k, im] of Object.entries(parts.pieces)) if (im) o[k as keyof Pieces] = tintImage(im, fn);
    return o;
  };
  // the sparring dummy is a plain grey figure with a slit visor (no element crown)
  const plain = makeHeads({ ...KITS.gravity, line: '#d4d9e4', light: '#ffffff', fill: '#24272f' });
  const gray = { normal: tintImage(plain.normal, TINT.gray), attack: tintImage(plain.attack, TINT.gray), hurt: tintImage(plain.hurt, TINT.gray), ko: tintImage(plain.ko, TINT.gray) };
  return {
    hero: { heads, circles, pieces: parts.pieces, pal: heroPalette(K), kit: K },
    dummy: { heads: gray, pal: PALETTES.dummy },
    ghost: { heads: map((r, g, b) => [Math.min(255, r * 0.6 + 90), Math.min(255, g * 0.6 + 90), Math.min(255, b * 0.6 + 90)]), circles, pal: ghostPalette(K) },
    flash: { heads: map(TINT.flash), circles, pal: PALETTES.flash },
    frozen: { heads: map(TINT.frozen), circles, pieces: tintPieces(TINT.frozen), pal: PALETTES.frozen, kit: K },
    dummyFrozen: { heads: { normal: tintImage(plain.normal, TINT.frozen), attack: tintImage(plain.attack, TINT.frozen), hurt: tintImage(plain.hurt, TINT.frozen), ko: tintImage(plain.ko, TINT.frozen) }, pal: PALETTES.frozen },
  };
}
function drawFighter(g: CanvasRenderingContext2D, skins: Skins, f: Fighter): void {
  const p = f.shown;
  const hero = f.look === 'hero';
  const au = f.clip && hero ? auraAt(f.clip as never, f.frame) : 0;
  const charge = f.clip ? chargeAt(f.clip as never, f.frame) : 0;
  const top = 360 * S;
  if (au > 0) aura(g, K, f.hipX(p), GROUND, top * (0.9 + au * 0.5), au, state.frameNo, -1);
  for (const gh of f.ghosts) {
    g.save();
    const hip = f.hipY(gh.pose);
    g.translate(gh.x + gh.pose.x * S * gh.facing, hip - (f.feet - gh.y));
    g.scale(S * gh.facing, S);
    drawRig(g, skins.ghost, gh.pose, { face: 'normal', alpha: (gh.life / gh.max) * 0.5 });
    g.restore();
  }
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.35)';
  const air = Math.min(1, (GROUND - f.feet) / 300);
  g.beginPath();
  g.ellipse(f.hipX(p), GROUND + 4, 70 * S * (1 - air * 0.5), 14 * S, 0, 0, Math.PI * 2);
  g.fill();
  g.translate(f.hipX(p), f.hipY(p));
  // render-only spin for spinning kicks: the body turns round every 4 frames
  let face = f.facing;
  const sp = f.clip?.spin;
  if (sp && f.frame >= sp[0] && f.frame <= sp[1] && Math.floor((f.frame - sp[0]) / 4) % 2 === 1) face = -face;
  g.scale(S * face, S);
  const stopped = !!(f.status.stop || f.status.freeze);
  const skin = f.flash > 0 ? skins.flash : stopped ? (hero ? skins.frozen : skins.dummyFrozen) : hero ? skins.hero : skins.dummy;
  drawRig(g, skin, p, { face: f.face(), charge, bones: state.bones, t: stopped ? 0 : f.t, speed: f.vx * f.facing, vy: f.vy });
  g.restore();
  if (au > 0) aura(g, K, f.hipX(p), GROUND, top * (0.9 + au * 0.5), au, state.frameNo, 1);
  // status looks
  const cx = f.hipX(p);
  const cy = f.hipY(p);
  if (f.status.freeze) {
    // ice block around the body
    g.save();
    g.globalAlpha = 0.55;
    const x0 = cx - 70 * S;
    const y0 = cy - 300 * S;
    const gr = g.createLinearGradient(x0, y0, x0 + 140 * S, y0 + 330 * S);
    gr.addColorStop(0, 'rgba(220,245,255,0.9)');
    gr.addColorStop(1, 'rgba(90,170,240,0.6)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(x0, y0 + 30);
    g.lineTo(x0 + 40, y0);
    g.lineTo(x0 + 140 * S, y0 + 20);
    g.lineTo(x0 + 140 * S + 10, GROUND - cy + cy - 10 - y0 + y0);
    g.lineTo(x0 - 8, GROUND);
    g.closePath();
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = '#e6f7ff';
    g.lineWidth = 3;
    g.stroke();
    g.restore();
  }
  if (f.status.stop) clockRing(g, cx, cy - 120 * S, 120, 0, FX, 0.7);
  if (f.status.root) for (let i = 0; i < 3; i++) vineLine(g, { x: cx - 40 + i * 40, y: GROUND }, { x: cx - 30 + i * 30, y: GROUND - 120 * S }, 1, state.frameNo + i * 9, 5);
  if (f.status.slow && !f.status.stop) swirl(g, cx, GROUND - 4, 60, 12, state.frameNo, EL === 'ice' ? FX : WHITE, 0.5, 1);
  if (f.status.bubble) bubble(g, cx, cy - 110 * S, 150 * S, state.frameNo, 1);
  if (f.status.float) swirl(g, cx, cy - 100 * S, 90, 26, state.frameNo, FX, 0.8, 2, 80, -1);
  if (f.status.dazzle) glow(g, cx + f.facing * 20, cy - 250 * S, 46 + Math.sin(state.frameNo / 3) * 6, FX, 0.5);
  if (f.barrier > 0) {
    const ch = f.chest();
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgb(FX.mid, 0.5 + 0.2 * Math.sin(state.frameNo / 6));
    g.lineWidth = 4;
    g.beginPath();
    g.ellipse(ch.x, ch.y - 10, 120 * S + 30, 200 * S, 0, 0, Math.PI * 2);
    g.stroke();
    g.restore();
    glow(g, ch.x, ch.y, 140, FX, 0.12);
  }
  if (charge > 0.3 && hero) {
    const c = f.chest();
    glow(g, c.x, c.y, 60 + charge * 30, FX, 0.25 * charge);
  }
  const c = f.clip;
  if (c?.limb && hero) {
    const live = (c.hits ?? []).some((h) => f.frame >= h.from - 3 && f.frame <= h.to + 2);
    if (live) {
      const j = f.joint(c.limb);
      const elbow = f.joint(c.limb === 'fw' ? 'fe' : c.limb === 'bw' ? 'be' : 'fk');
      flare(g, j.x, j.y, 46, 0.9, state.frameNo, FX);
      streak(g, [elbow, j], 6, FX, 0.7, false);
      if (EL === 'fire') flames(g, j.x, j.y + 10, 36, 50, state.frameNo, 0.7, 4);
    }
  }
  if (f.windup > 0) {
    const j = f.joint('fw');
    flare(g, j.x, j.y, 40 * (1 - f.windup / 14) + 10, 0.9, state.frameNo, GOLD);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(255,60,80,${0.5 * (1 - f.windup / 14)})`;
    g.beginPath();
    g.arc(j.x, j.y, 22, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  if (f.shieldPop > 0) {
    const ch = f.chest();
    if (hero) shield(g, K, ch.x + f.facing * 18, ch.y + 10, f.facing, 175 * S, f.shieldPop, f.shieldHit, state.frameNo, f.shieldPerfect > 0);
  }
}
/** Floor things drawn behind the fighters. */
function drawThingsBack(g: CanvasRenderingContext2D): void {
  for (const t of state.things) {
    const k = t.life / t.max;
    const inK = Math.min(1, t.t / 6);
    switch (t.kind) {
      case 'scorch': {
        g.fillStyle = `rgba(5,6,20,${0.5 * k})`;
        g.beginPath();
        g.ellipse(t.x, GROUND + 6, t.w, t.w * 0.18, 0, 0, Math.PI * 2);
        g.fill();
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = rgb(FX.mid, 0.55 * k);
        g.lineWidth = 3;
        g.beginPath();
        g.ellipse(t.x, GROUND + 6, t.w * 0.7, t.w * 0.12, 0, 0, Math.PI * 2);
        g.stroke();
        g.restore();
        break;
      }
      case 'mark': {
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = rgb(FX.mid, 0.6 + 0.4 * Math.sin(state.frameNo / 2));
        g.lineWidth = 4;
        g.beginPath();
        g.ellipse(t.x, GROUND, t.w * (0.6 + k * 0.6), 22 * (0.6 + k * 0.6), 0, 0, Math.PI * 2);
        g.stroke();
        g.restore();
        glow(g, t.x, GROUND, t.w, FX, 0.3);
        break;
      }
      case 'field': {
        const a = Math.min(1, k * 4, inK);
        clockRing(g, t.x, GROUND, t.w, state.frameNo, FX, 0.8 * a, 0.2);
        g.save();
        g.globalCompositeOperation = 'lighter';
        const gr = g.createLinearGradient(0, GROUND - 340, 0, GROUND);
        gr.addColorStop(0, rgb(FX.glow, 0));
        gr.addColorStop(1, rgb(FX.glow, 0.22 * a));
        g.fillStyle = gr;
        g.fillRect(t.x - t.w, GROUND - 340, t.w * 2, 340);
        g.restore();
        clockRing(g, t.x, GROUND - 200, 110, state.frameNo * 0.5, FX, 0.35 * a);
        break;
      }
      case 'mine':
        if (t.t < 20 || state.frameNo % 40 < 20) {
          glow(g, t.x, GROUND - 6, 16, FX, t.t < 20 ? 0.8 : 0.35);
          g.fillStyle = '#2f6a2a';
          g.beginPath();
          g.arc(t.x, GROUND - 5, 7, 0, Math.PI * 2);
          g.fill();
        }
        break;
      case 'permafrost': {
        const grow = Math.min(1, t.t / 8);
        for (let i = -6; i <= 6; i++) {
          if (i === 0) continue;
          const u = Math.abs(i) / 6;
          iceSpike(g, t.x + i * 46, GROUND, (170 - u * 90) * grow * (0.8 + ((i * 7) % 5) / 10), 40 - u * 10, i * 6, Math.min(1, k * 3));
        }
        break;
      }
      case 'ultSelf':
        if (EL === 'water') {
          wave(g, t.x - 120, GROUND, 260 * Math.min(1, t.t / 20), 240, 1, state.frameNo, Math.min(1, k * 3) * 0.8);
          wave(g, t.x + 120, GROUND, 260 * Math.min(1, t.t / 20), 240, -1, state.frameNo, Math.min(1, k * 3) * 0.8);
        } else if (EL === 'leaf') lotus(g, t.x, GROUND, 300 * Math.min(1, t.t / 25), Math.min(1, t.t / 30), state.frameNo, Math.min(1, k * 3));
        else if (EL === 'time') clockRing(g, t.x, GROUND - 150, 230, state.frameNo, FX, Math.min(1, k * 3) * 0.8);
        else if (EL === 'fire') flames(g, t.x, GROUND, 300, 420 * Math.min(1, t.t / 18), state.frameNo, Math.min(1, k * 3) * 0.85, 9);
        break;
      case 'ultScene':
        drawUltScene(g, t, k, true);
        break;
    }
  }
}
/** Things drawn in front of the fighters. */
function drawThingsFront(g: CanvasRenderingContext2D): void {
  for (const t of state.things) {
    const k = t.life / t.max;
    switch (t.kind) {
      case 'column': {
        const grow = Math.min(1, t.t / 5);
        flames(g, t.x, GROUND, t.w * 1.4, t.h * grow * (0.7 + 0.3 * k), state.frameNo, Math.min(1, k * 2.5), t.seed);
        glow(g, t.x, GROUND - 60, 160, FX, 0.5 * k);
        break;
      }
      case 'floorFire':
        flames(g, t.x, GROUND + 4, t.w, 50 * Math.min(1, k * 2), state.frameNo, Math.min(1, k * 2) * 0.8, t.seed);
        break;
      case 'wave':
        wave(g, t.x, GROUND, t.h * Math.min(1, t.t / 10), t.w, t.dir, state.frameNo, Math.min(1, k * 4));
        break;
      case 'wall': {
        const grow = Math.min(1, t.t / 7);
        const a = Math.min(1, t.life / 12);
        for (let i = -2; i <= 2; i++) iceSpike(g, t.x + i * 16, GROUND, t.h * grow * (1 - Math.abs(i) * 0.18), 46, i * 4, a);
        glow(g, t.x, GROUND - 140, 120, FX, 0.18 * a);
        break;
      }
      case 'spike':
        iceSpike(g, t.x, GROUND, t.h * Math.min(1, t.t / 4), t.w, t.dir, Math.min(1, k * 3));
        break;
      case 'rockSpike':
        rockSpike(g, t.x, GROUND, t.h * Math.min(1, t.t / 4), t.w, t.dir, Math.min(1, k * 3), t.seed);
        break;
      case 'root': {
        if (t.t < (t.data ?? 0)) break;
        const grow = Math.min(1, (t.t - (t.data ?? 0)) / 8);
        const a = Math.min(1, k * 3);
        g.save();
        g.globalAlpha = a;
        vineLine(g, { x: t.x, y: GROUND + 4 }, { x: t.x + t.dir * 20, y: GROUND - 130 }, grow, state.frameNo + t.seed, 7);
        g.restore();
        break;
      }
      case 'vine': {
        const reach = t.w * Math.min(1, t.t / 8);
        const p = state.player;
        const hand = p.joint('fw');
        const d = state.dummy;
        const end = t.data && state.dummyOn ? d.chest() : { x: hand.x + t.dir * reach, y: hand.y + 10 };
        g.save();
        g.globalAlpha = Math.min(1, k * 3);
        vineLine(g, hand, end, 1, state.frameNo, 8);
        g.restore();
        break;
      }
      case 'well':
        well(g, t.x, t.y, t.w * Math.min(1, t.t / 8), state.frameNo, FX, Math.min(1, k * 3));
        break;
      case 'anchor':
        if (!t.hitOnce) {
          streak(g, [{ x: t.x, y: t.y - 200 }, { x: t.x, y: t.y }], 30, FX, 0.5, false);
          well(g, t.x, t.y, 60, state.frameNo, FX, 1);
        } else {
          swirl(g, t.x, GROUND - 6, 160 * (1 - k) + 40, 30 * (1 - k) + 10, state.frameNo, FX, k, 2);
        }
        break;
      case 'pulse':
        swirl(g, t.x, t.y, t.w * (1 - k) + 40, (t.w * (1 - k) + 40) * 0.3, state.frameNo, FX, k, 2);
        break;
      case 'gust':
      case 'whirl':
        swirl(g, t.x, t.kind === 'whirl' ? GROUND - 10 : t.y, t.w * (t.kind === 'gust' ? 1 + (1 - k) : 1), t.kind === 'gust' ? 18 : 22, state.frameNo, FX, Math.min(1, k * 2), t.kind === 'whirl' ? 4 : 2, t.kind === 'whirl' ? 230 : 0);
        break;
      case 'gustCone': {
        const reach = t.w * Math.min(1, t.t / 6);
        for (let i = 0; i < 5; i++) {
          const y = t.y + (i - 2) * 26 * (0.5 + t.t / 12);
          const pts = wavy({ x: t.x, y: t.y }, { x: t.x + t.dir * reach, y }, 8, 10, state.frameNo / 3 + i, 1.5);
          streak(g, pts, 4, FX, Math.min(1, k * 2) * 0.8);
        }
        break;
      }
      case 'clock':
        clockRing(g, t.x, t.y, t.w * (0.6 + 0.4 * (1 - k)), state.frameNo * 2, FX, k);
        for (let i = 0; i < 3; i++) gearFx(g, t.x + Math.cos(i * 2 + t.t / 10) * t.w * (1 - k), t.y + Math.sin(i * 2 + t.t / 10) * t.w * (1 - k), 12, t.t / 5, K.accent, k);
        break;
      case 'dashLine':
        streak(g, [{ x: t.x - (t.w / 2) * t.dir, y: t.y }, { x: t.x + (t.w / 2) * t.dir, y: t.y }], 5, FX, (t.life / t.max) * 0.8, false);
        if (EL === 'fire') flames(g, t.x, t.y + 30, 40, 40, state.frameNo, 0.4 * k, t.seed);
        break;
      case 'liftRock': {
        const hand = state.player.joint('fw');
        boulder(g, hand.x, hand.y - 30, 34, state.frameNo * 0.05, 7);
        break;
      }
      case 'ray': {
        g.save();
        g.globalCompositeOperation = 'lighter';
        const gr = g.createLinearGradient(t.x - t.w, 0, t.x + t.w, 0);
        gr.addColorStop(0, rgb(FX.glow, 0));
        gr.addColorStop(0.5, rgb(FX.core, 0.9 * k));
        gr.addColorStop(1, rgb(FX.glow, 0));
        g.fillStyle = gr;
        g.fillRect(t.x - t.w, -200, t.w * 2, GROUND + 200);
        g.restore();
        flare(g, t.x, GROUND - 20, 140 * k + 40, k, t.seed, FX);
        break;
      }
      case 'slash':
        streak(g, [{ x: t.x - t.dir * t.w * 0.5, y: t.y - 60 }, { x: t.x + t.dir * t.w * 0.5, y: t.y + 50 }], 7, FX, k, false);
        break;
      case 'burst':
        flare(g, t.x, t.y, t.w * (1.4 - k * 0.6), k, t.seed, FX);
        if (EL === 'leaf') for (let i = 0; i < 2; i++) addSparks(t.x, t.y, 2, '#ff9fd0', 7, 0.05, 40, 'petal');
        if (EL === 'wind') swirl(g, t.x, t.y, 90, 30, state.frameNo, FX, k, 2);
        if (EL === 'gravity') well(g, t.x, t.y, 40, state.frameNo, FX, k);
        break;
      case 'ultScene':
        drawUltScene(g, t, k, false);
        break;
      case 'ultFinal':
        drawUltFinal(g, t, k);
        break;
    }
  }
}
/** The ultimate's set piece around the foe (between ultCall and the final blow). */
function drawUltScene(g: CanvasRenderingContext2D, t: Thing, k: number, back: boolean): void {
  const a = Math.min(1, k * 4, t.t / 10);
  const d = state.dummy;
  const cy = state.dummyOn ? d.chest().y : GROUND - 160;
  switch (EL) {
    case 'fire':
      if (back) flames(g, t.x, GROUND, 220, 260, state.frameNo, a * 0.6, 21);
      else swirl(g, t.x, GROUND - 10, 140, 30, state.frameNo, FX, a * 0.8, 4, 280);
      break;
    case 'water':
      if (!back) swirl(g, t.x, GROUND - 10, 170, 36, state.frameNo, FX, a, 5, 300);
      break;
    case 'ice':
      if (back) glow(g, t.x, GROUND - 100, 260, FX, 0.25 * a);
      break;
    case 'wind':
      swirl(g, t.x, GROUND - 6, back ? 120 : 160, 28, state.frameNo * (back ? -1.5 : 1.5), FX, a * (back ? 0.6 : 0.9), 6, 420);
      if (!back && state.frameNo % 2 === 0) addSparks(t.x + (rnd() - 0.5) * 240, GROUND - rnd() * 380, 1, '#9fffd0', 4, -0.1, 30, 'leaf');
      break;
    case 'earth':
      if (back) for (let i = 0; i < 6; i++) boulder(g, t.x + Math.cos(i + t.t / 14) * 220, GROUND - 160 + Math.sin(i * 2 + t.t / 14) * 120, 22 + (i % 3) * 8, t.t / 10 + i, i + 1, a);
      break;
    case 'leaf':
      if (back) lotus(g, t.x, GROUND, 260 * Math.min(1, t.t / 20), Math.min(1, t.t / 26), state.frameNo, a);
      else if (state.frameNo % 2 === 0) addSparks(t.x + (rnd() - 0.5) * 300, GROUND - 300 - rnd() * 100, 2, '#ff9fd0', 3, 0.1, 50, 'petal');
      break;
    case 'light':
      if (back) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 14; i++) {
          const ang = (i / 14) * Math.PI * 2 + state.frameNo * 0.01;
          g.fillStyle = rgb(FX.mid, 0.12 * a);
          g.beginPath();
          g.moveTo(t.x, cy);
          g.lineTo(t.x + Math.cos(ang - 0.05) * 900, cy + Math.sin(ang - 0.05) * 900);
          g.lineTo(t.x + Math.cos(ang + 0.05) * 900, cy + Math.sin(ang + 0.05) * 900);
          g.closePath();
          g.fill();
        }
        g.restore();
      }
      break;
    case 'gravity':
      if (!back) {
        well(g, t.x, cy - 160, 90 + Math.sin(state.frameNo / 5) * 6, state.frameNo, FX, a);
        for (let i = 0; i < 8; i++) {
          const ang = i * 0.8 + t.t / 12;
          const r = 200 * (1 - (t.t % 60) / 80);
          boulder(g, t.x + Math.cos(ang) * r, cy - 160 + Math.sin(ang) * r * 0.4, 8 + (i % 3) * 4, ang, i + 3, a * 0.9);
        }
      }
      break;
    case 'time':
      if (back) clockRing(g, t.x, cy, 220, state.frameNo * 0.3, FX, a * 0.8);
      else clockRing(g, t.x, cy, 140, -state.frameNo, FX2, a * 0.6);
      break;
  }
}
function drawUltFinal(g: CanvasRenderingContext2D, t: Thing, k: number): void {
  const a = Math.min(1, k * 2.5);
  const grow = Math.min(1, t.t / 6);
  switch (EL) {
    case 'fire':
      flames(g, t.x, GROUND, 360, 760 * grow, state.frameNo, a, 77);
      break;
    case 'water':
      wave(g, t.x - 120 + t.t * 6, GROUND, 420 * grow, 360, 1, state.frameNo, a);
      break;
    case 'ice':
      for (let i = -5; i <= 5; i++) iceSpike(g, t.x + i * 40, GROUND, (380 - Math.abs(i) * 50) * grow, 70, i * 7, a);
      break;
    case 'wind':
      swirl(g, t.x, GROUND - 6, 220, 40, state.frameNo * 3, FX, a, 7, 600);
      break;
    case 'earth':
      for (let i = -4; i <= 4; i++) rockSpike(g, t.x + i * 50, GROUND, (330 - Math.abs(i) * 50) * grow, 70, i * 8, a, i + 40);
      break;
    case 'leaf':
      lotus(g, t.x, GROUND, 360 * grow, 1, state.frameNo, a);
      for (let i = 0; i < 6; i++) vineLine(g, { x: t.x + (i - 2.5) * 50, y: GROUND }, { x: t.x + (i - 2.5) * 20, y: GROUND - 360 }, grow, state.frameNo + i * 5, 9);
      break;
    case 'light': {
      g.save();
      g.globalCompositeOperation = 'lighter';
      const gr = g.createLinearGradient(t.x - 160, 0, t.x + 160, 0);
      gr.addColorStop(0, rgb(FX.glow, 0));
      gr.addColorStop(0.5, rgb(FX.core, 0.95 * a));
      gr.addColorStop(1, rgb(FX.glow, 0));
      g.fillStyle = gr;
      g.fillRect(t.x - 160, -300, 320, GROUND + 300);
      g.restore();
      flare(g, t.x, GROUND - 160, 420 * a, a, t.seed, FX);
      break;
    }
    case 'gravity':
      well(g, t.x, GROUND - 160, 220 * (1 - grow * 0.6), state.frameNo, FX, a);
      swirl(g, t.x, GROUND - 6, 300 * (1 - k) + 60, 60, state.frameNo, FX, a, 3);
      break;
    case 'time':
      clockRing(g, t.x, GROUND - 160, 320 * (1.2 - k * 0.4), state.frameNo * 4, FX, a);
      for (let i = 0; i < 8; i++) gearFx(g, t.x + Math.cos(i) * 300 * (1 - k), GROUND - 160 + Math.sin(i) * 200 * (1 - k), 18, t.t / 4 + i, K.accent, a);
      break;
  }
}
function drawSpark(g: CanvasRenderingContext2D, s: Spark): void {
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
    case 'gear':
      gearFx(g, s.x, s.y, s.w * 2, s.rot, K.accent, a);
      break;
  }
}

function render(g: CanvasRenderingContext2D, stage: HTMLCanvasElement, skins: Skins): void {
  const cw = g.canvas.width;
  const ch = g.canvas.height;
  const zoom = Math.min(cw / VIEW_W, ch / VIEW_H) * state.zoom;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#05061a';
  g.fillRect(0, 0, cw, ch);
  const sx = Math.sin(state.frameNo * 2.7) * state.shake * 0.5;
  const sy = Math.cos(state.frameNo * 3.1) * state.shake * 0.5;
  const push = Math.min(1, Math.max(0, (state.zoom - 1) / 0.14));
  const camY = VIEW_H / 2 + (GROUND - 200 - VIEW_H / 2) * push;
  g.setTransform(zoom, 0, 0, zoom, cw / 2 + sx, ch / 2 + sy);
  g.translate(-state.camX, -camY);
  const off = (state.camX - STAGE_W / 2) * 0.35;
  g.drawImage(stage, 0, 0, STAGE_W, GROUND, off - 160, -40, STAGE_W + 320, GROUND + 40);
  g.drawImage(stage, 0, GROUND - 4, STAGE_W, STAGE_H - GROUND + 4, 0, GROUND - 4, STAGE_W, STAGE_H - GROUND + 4);
  if (state.dim > 0.01) {
    g.fillStyle = `rgba(2,3,14,${state.dim})`;
    g.fillRect(-200, -200, STAGE_W + 400, STAGE_H + 400);
  }
  drawThingsBack(g);
  if (state.dummyOn) drawFighter(g, skins, state.dummy);
  drawFighter(g, skins, state.player);
  // beams
  if (state.beam > 0) {
    const p = state.player;
    const hand = beamOrigin(p);
    const reach = EL === 'water' ? 420 : 620;
    const e = beamEnd(p, state.dummy, reach);
    const a = Math.min(1, state.beam / 5);
    if (EL === 'water') {
      for (let i = 0; i < 3; i++) streak(g, wavy(hand, { x: e.x, y: e.y + (i - 1) * 10 }, 14, 9, state.frameNo / 2 + i * 2, 3), 13 - i * 3, FX, a);
      for (let i = 0; i < 4; i++) addSparks(e.x, e.y, 1, '#dffaff', 8, 0.4, 20, 'drop');
    } else {
      streak(g, [hand, e], 26, FX, a, false);
      streak(g, [hand, e], 9, WHITE, a, false);
    }
    flare(g, hand.x, hand.y, 60, a, state.frameNo, FX);
    flare(g, e.x, e.y, 90, a, state.frameNo + 3, FX);
  }
  for (const pr of state.projs) projectile(g, pr.kind, K, pr.x, pr.y, pr.vx, pr.vy, state.frameNo, pr.trail, pr.r);
  drawThingsFront(g);
  for (const r of state.rings) {
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
  for (const f of state.flares) flare(g, f.x, f.y, f.size * (0.6 + 0.4 * (f.life / f.max)), f.life / f.max, Math.floor(f.x + f.life), f.c);
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  for (const s of state.sparks) drawSpark(g, s);
  g.restore();
  g.textAlign = 'center';
  for (const n of state.nums) {
    g.font = `bold ${n.size}px Orbitron, Arial, sans-serif`;
    g.globalAlpha = Math.min(1, n.life / 20);
    g.lineWidth = 6;
    g.strokeStyle = '#0b0e24';
    g.strokeText(n.text, n.x, n.y);
    g.fillStyle = n.col;
    g.fillText(n.text, n.x, n.y);
  }
  g.globalAlpha = 1;
  if (state.boxes) {
    const fighters = state.dummyOn ? [state.player, state.dummy] : [state.player];
    for (const f of fighters) {
      const hb = hurtbox(f);
      g.strokeStyle = '#4dff8a';
      g.lineWidth = 3;
      g.strokeRect(hb.x, hb.y, hb.w, hb.h);
      for (const h of f.clip?.hits ?? []) {
        const b = hitboxStage(f, h as Hit);
        const live = f.frame >= h.from && f.frame <= h.to;
        g.fillStyle = live ? 'rgba(255,40,80,0.45)' : 'rgba(255,40,80,0.12)';
        g.fillRect(b.x, b.y, b.w, b.h);
      }
    }
    for (const pr of state.projs) {
      g.strokeStyle = '#ff4d6a';
      g.strokeRect(pr.x - pr.r * 0.8, pr.y - pr.r * 0.8, pr.r * 1.6, pr.r * 1.6);
    }
  }
  // ---- screen-space HUD
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (state.flash > 0) {
    g.fillStyle = `rgba(${state.flashCol},${Math.min(0.22, state.flash * 0.022)})`;
    g.fillRect(0, 0, cw, ch);
  }
  const bar = (x: number, w: number, hp: number, mp: number | null, label: string, col: string, alignRight: boolean) => {
    g.fillStyle = 'rgba(5,6,26,0.7)';
    g.fillRect(x - 4, 20, w + 8, mp === null ? 34 : 46);
    g.fillStyle = col;
    const fw = (w * hp) / 100;
    g.fillRect(alignRight ? x + w - fw : x, 24, fw, 26);
    if (mp !== null) {
      g.fillStyle = '#2a3270';
      g.fillRect(x, 53, w, 8);
      g.fillStyle = '#5fd0ff';
      g.fillRect(x, 53, (w * mp) / 100, 8);
    }
    g.fillStyle = '#fff';
    g.font = 'bold 16px Rajdhani, Arial, sans-serif';
    g.textAlign = alignRight ? 'right' : 'left';
    g.strokeStyle = '#0b0e24';
    g.lineWidth = 4;
    const tx = alignRight ? x + w - 8 : x + 8;
    g.strokeText(label, tx, 43);
    g.fillText(label, tx, 43);
  };
  const compact = cw < 1000;
  const left = compact ? 66 : 24;
  const w = compact ? Math.min(300, (cw - left - 24 - 16) / 2) : Math.min(360, cw * 0.3);
  const short = w < 200;
  const pl = state.player;
  const nm = K.name.toUpperCase();
  bar(left, w, pl.hp, state.freeMp ? null : pl.mp, short ? `${nm} ${pl.hp}` : `${nm}  ${pl.hp} HP${state.freeMp ? '' : `  ·  ${Math.floor(pl.mp)} MP`}`, K.line, false);
  if (state.dummyOn) bar(cw - w - 24, w, state.dummy.hp, null, short ? `DUMMY ${state.dummy.hp}` : `SPARRING DUMMY  ${state.dummy.hp} HP`, '#ff5e8a', true);
  if (state.combo > 1) {
    const pop = 1 + state.comboPop * 0.04;
    const label = state.combo >= 8 ? K.shouts[2] : state.combo >= 5 ? K.shouts[1] : state.combo >= 3 ? K.shouts[0] : '';
    g.save();
    g.translate(40, ch * 0.32);
    g.scale(pop, pop);
    g.textAlign = 'left';
    g.font = 'bold 54px Orbitron, Arial, sans-serif';
    const grd = g.createLinearGradient(0, -50, 0, 10);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.5, K.light);
    grd.addColorStop(1, K.line);
    g.lineWidth = 7;
    g.strokeStyle = '#0b0e24';
    g.strokeText(`${state.combo} HITS`, 0, 0);
    g.fillStyle = grd;
    g.fillText(`${state.combo} HITS`, 0, 0);
    if (label) {
      g.font = 'bold 30px Orbitron, Arial, sans-serif';
      g.strokeText(label, 4, 40);
      g.fillStyle = K.line;
      g.fillText(label, 4, 40);
    }
    g.restore();
  }
  if (state.banner) {
    const b = state.banner;
    const k = Math.min(1, (90 - b.life) / 8);
    g.save();
    g.translate(cw / 2, ch * 0.22);
    g.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
    g.globalAlpha = Math.min(1, b.life / 15);
    g.textAlign = 'center';
    g.font = `bold ${Math.round(Math.min(72, cw / 14))}px Orbitron, Arial, sans-serif`;
    g.lineWidth = 9;
    g.strokeStyle = '#0b0e24';
    g.strokeText(b.text, 0, 0);
    g.fillStyle = b.col;
    g.fillText(b.text, 0, 0);
    g.restore();
  }
}

// ---------------------------------------------------------------- boot and panel
function frameData(c: Clip): string {
  const h = c.hits?.[0];
  const cost = c.mp ? ` · ${c.mp} MP` : '';
  if (!h) return `${c.frames} frames${cost}`;
  const active = h.to - h.from + 1;
  return `startup ${h.from} · active ${active} · recovery ${c.frames - h.to - 1} · dmg ${(c.hits ?? []).reduce((a, x) => a + x.dmg, 0)}${cost}`;
}
function buildPanel(): void {
  document.title = `Elementick · ${K.name} Hero Trial`;
  document.documentElement.style.setProperty('--el', K.line);
  document.getElementById('title')!.textContent = `${K.icon} ${K.name} Hero Trial`;
  const sel = document.getElementById('element') as HTMLSelectElement;
  for (const id of TRIAL_ELEMENTS) {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = `${KITS[id].icon} ${KITS[id].name}`;
    sel.appendChild(o);
  }
  const o = document.createElement('option');
  o.value = 'lightning';
  o.textContent = '⚡ Lightning (own lab)';
  sel.appendChild(o);
  sel.value = EL;
  sel.onchange = () => {
    if (sel.value === 'lightning') {
      location.href = '../lightning/';
      return;
    }
    localStorage.setItem('ek.trial.el', sel.value);
    location.search = `?el=${sel.value}`;
  };
  const [p1, p2, p3] = K.powers;
  const pw = document.getElementById('powers')!;
  pw.innerHTML =
    `<div class="row"><kbd>J</kbd> x4 combo: jab, cross, ${K.kick}, ${K.rising} · air: kick</div>` +
    `<div class="row"><kbd>K</kbd> ${K.heavy} (heavy) · <kbd>L</kbd> ${K.dash}</div>` +
    `<div class="row"><kbd>U</kbd> <b>${p1.name}</b> (${p1.mp} MP): ${p1.text}</div>` +
    `<div class="row"><kbd>I</kbd> <b>${p2.name}</b> (${p2.mp} MP): ${p2.text}</div>` +
    `<div class="row"><kbd>O</kbd> <b>${p3.name}</b> (${p3.mp} MP): ${p3.text}</div>` +
    `<div class="row"><kbd>P</kbd> <b>${K.ult}</b> (ultimate, ${MP_ULT} MP)</div>` +
    `<div class="row"><kbd>S</kbd> ${K.shield} (raise it just before a hit for a perfect guard)</div>` +
    `<div class="row">Passive: ${K.passive}</div>`;
  const list = document.getElementById('clips')!;
  const mk = (label: string, fn: () => void) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = () => {
      fn();
      (document.activeElement as HTMLElement | null)?.blur();
    };
    list.appendChild(b);
    return b;
  };
  mk('Free control', () => {
    state.preview = '';
    state.player.clip = null;
    info('Free control');
  });
  for (const [k, c] of Object.entries(CLIPS))
    mk(c.name, () => {
      state.preview = k;
      state.player.play(k, true);
      info(`${c.name}: ${frameData(c)}`);
    });
  const speed = document.getElementById('speed') as HTMLInputElement;
  speed.oninput = () => {
    state.speed = Number(speed.value);
    document.getElementById('speedv')!.textContent = `${state.speed.toFixed(2)}x`;
  };
  const chk = (id: string, fn: (v: boolean) => void) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return;
    el.onchange = () => {
      fn(el.checked);
      el.blur();
    };
  };
  const build = document.getElementById('build') as HTMLSelectElement;
  const saved = localStorage.getItem('ek.lab.build') as Build | null;
  if (saved && saved in BUILDS) build.value = saved;
  setBuild(build.value as Build);
  build.onchange = () => {
    setBuild(build.value as Build);
    localStorage.setItem('ek.lab.build', build.value);
    build.blur();
  };
  chk('bones', (v) => (state.bones = v));
  chk('boxes', (v) => (state.boxes = v));
  chk('dummy', (v) => (state.dummyOn = v));
  chk('fight', (v) => (state.dummyFights = v));
  chk('freemp', (v) => {
    state.freeMp = v;
    state.player.mp = 100;
  });
}
function buildTouch(): void {
  const pad = document.getElementById('touch')!;
  for (const el of pad.querySelectorAll<HTMLElement>('[data-key]')) {
    const code = el.dataset.key!;
    const down = (e: Event) => {
      e.preventDefault();
      if (!keys.has(code)) pressed.add(code);
      keys.add(code);
      el.classList.add('on');
    };
    const up = (e: Event) => {
      e.preventDefault();
      keys.delete(code);
      el.classList.remove('on');
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  }
  document.getElementById('menu')!.onclick = () => document.body.classList.toggle('panel-open');
}
function info(t: string): void {
  document.getElementById('info')!.textContent = t;
}

async function boot(): Promise<void> {
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  const g = canvas.getContext('2d')!;
  buildPanel();
  const skins = makeSkins(await loadTrialParts(EL));
  const stage = bakeStage(K);
  const fit = () => {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * devicePixelRatio);
    canvas.height = Math.round(r.height * devicePixelRatio);
  };
  fit();
  addEventListener('resize', fit);
  addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (!keys.has(e.code)) pressed.add(e.code);
    keys.add(e.code);
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  buildTouch();
  // test hooks: one pose alone on a transparent canvas, the lab state, and the clip table
  const w = window as unknown as { __snap: (kind: string, frame: number) => string; __lab: typeof state; __clips: typeof CLIPS; __el: string };
  w.__snap = (kind, frame) => {
    const c = document.createElement('canvas');
    c.width = 700;
    c.height = 760;
    const x = c.getContext('2d')!;
    const p = kind === 'idle' ? idlePose(frame) : kind === 'walk' ? walkPose(frame, 4.2) : kind === 'run' ? walkPose(frame, 7.4) : kind === 'guard' ? guardPose : sample(CLIPS[kind] as never, frame);
    const drop = footDrop(solve({ ...p, rot: 0 }));
    x.translate(330, 700 - drop * 1.4 + p.y * 1.4);
    x.scale(1.4, 1.4);
    drawRig(x, skins.hero, p, { face: kind === 'idle' || kind === 'walk' || kind === 'run' || kind === 'guard' ? 'normal' : CLIPS[kind]?.face ?? 'normal', t: frame });
    return c.toDataURL('image/png');
  };
  w.__lab = state;
  const hook = window as unknown as { __step: (n: number) => void; __press: (code: string) => void; __hold: (code: string, down: boolean) => void };
  hook.__step = (n) => {
    for (let i = 0; i < n; i++) step();
  };
  hook.__press = (code) => {
    pressed.add(code);
  };
  hook.__hold = (code, down) => {
    if (down) {
      if (!keys.has(code)) pressed.add(code);
      keys.add(code);
    } else keys.delete(code);
  };
  w.__clips = CLIPS;
  w.__el = EL;
  let last = performance.now();
  let acc = 0;
  const loop = (now: number) => {
    acc += Math.min(100, now - last) * state.speed;
    last = now;
    while (acc >= 1000 / 60) {
      step();
      acc -= 1000 / 60;
    }
    render(g, stage, skins);
    const p = state.player;
    document.getElementById('state')!.textContent = p.clip ? `${p.clip.name}  frame ${p.frame}/${p.clip.frames}` : p.grounded ? (Math.abs(p.vx) > 5.5 ? 'Run' : Math.abs(p.vx) > 0.6 ? 'Walk' : p.guarding ? 'Guard' : 'Idle') : p.vy < 0 ? 'Jump' : 'Fall';
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  document.body.dataset.ready = '1';
}
void boot();
