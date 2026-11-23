import { CLIPS, COMBO, airPose, auraAt, chargeAt, guardPose, idlePose, moveAt, sample, walkPose, type Clip, type Hit } from './anims';
import { drawAura, drawBodyArcs, drawBolt, drawFlare, drawPillar, drawShield, drawStormCloud, type Theme } from './fx';
import { BUILDS, PALETTES, TINT, drawRig, footDrop, jointWorld, lerpPose, loadParts, setBuild, solve, tintImage, type Build, type Face, type Parts, type Pose, type Skin } from './rig';
import { GROUND, STAGE_H, STAGE_W, bakeStage, drawArena, type Arena } from './stage';
import { ARENAS, type ArenaDef } from './arena';
import { Sound } from './audio';
import { drawBackdrop, loadBackdrop, type Backdrop } from './backdrop';
import { shellHtml } from './shell';

/**
 * Arena lab (shared by every arena folder in gemini/stages): move the Lightning avatar freely in the arena,
 * try every attack, combo and power on a sparring dummy that can fight back, block with the lightning shield,
 * and inspect poses, bones, hitboxes and frame data. Each arena folder calls startLab() with its ArenaDef.
 * Fixed 60 Hz update with a seeded RNG; rendering only reads state.
 */
const VIEW_W = 1600;
const VIEW_H = 900;
/** rig units to stage pixels */
const S = 0.74;
const GRAV = 0.95;
const WALK = 4.2;
const RUN = 7.4;
const JUMP = -18.5;
/** a guard raised this many frames before a hit is a perfect guard */
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

// ---------------------------------------------------------------- audio (tiny synth)
let ac: AudioContext | null = null;
function zap(freq: number, dur: number, type: OscillatorType = 'sawtooth', vol = 0.12, slide = 0.3): void {
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
function noise(dur: number, vol = 0.15, lowpass = 0): void {
  try {
    ac ??= new AudioContext();
    const b = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const s = ac.createBufferSource();
    const g = ac.createGain();
    g.gain.value = vol;
    s.buffer = b;
    if (lowpass) {
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass;
      s.connect(f).connect(g).connect(ac.destination);
    } else s.connect(g).connect(ac.destination);
    s.start();
  } catch {
    /* no audio */
  }
}
/** A thunder crack: sharp high snap plus a low rumble. */
function thunder(big = false): void {
  noise(0.08, 0.25);
  zap(1800, 0.06, 'square', 0.06, 0.2);
  noise(big ? 1.4 : 0.7, big ? 0.32 : 0.2, 380);
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
  clip: Clip | null = null;
  frame = 0;
  loopPreview = false;
  hitDone = new Set<number>();
  /** at least one hit of the current clip landed (lets a power cancel it) */
  landed = false;
  queued: string | null = null;
  stun = 0;
  hp = 100;
  t = 0;
  guarding = false;
  guardSince = 0;
  /** shield animation: grows in while guarding, flashes when it blocks */
  shieldPop = 0;
  shieldHit = 0;
  shieldPerfect = 0;
  shown: Pose = idlePose(0);
  ghosts: Ghost[] = [];
  ghostOn = 0;
  flash = 0;
  /** sparring AI: frames until the next attack, and the wind-up glint before it */
  aiTimer = 120;
  windup = 0;
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
    if (this.stun > 0) return 'hurt';
    return 'normal';
  }
  /** Target pose for this frame before smoothing. */
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
    const lying = GROUND - 30 + p.y * S;
    const k = Math.min(1, Math.abs(p.rot) / 85);
    return stand * (1 - k) + lying * k;
  }
  hipX(p: Pose): number {
    return this.x + p.x * S * this.facing;
  }
  /** Local rig point to stage space. */
  toStage(p: Pose, lx: number, ly: number): Pt {
    return { x: this.hipX(p) + lx * S * this.facing, y: this.hipY(p) + ly * S };
  }
  /** A joint of the skeleton in stage space. */
  joint(name: 'fw' | 'bw' | 'fa' | 'ba' | 'fe' | 'be' | 'fs' | 'bs' | 'fk' | 'bk' | 'neck' | 'hip'): Pt {
    const p = this.shown;
    const s = solve(p);
    const j = jointWorld(p, s[name]);
    return this.toStage(p, j.x, j.y);
  }
  chest(): Pt {
    return { x: this.hipX(this.shown), y: this.hipY(this.shown) - 130 * S };
  }
}

// ---------------------------------------------------------------- effects (state; drawn by fx.ts)
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
}
interface Bolt {
  a: Pt;
  b: Pt;
  life: number;
  max: number;
  width: number;
  seed: number;
  theme: Theme;
  forks: number;
}
interface Flare {
  x: number;
  y: number;
  size: number;
  life: number;
  max: number;
  theme: Theme;
}
interface Num {
  x: number;
  y: number;
  text: string;
  life: number;
  col: string;
  size: number;
}

const state = {
  player: new Fighter(STAGE_W / 2 - 220, 1),
  dummy: new Fighter(STAGE_W / 2 + 160, -1, 'dummy'),
  dummyOn: true,
  dummyFights: true,
  sparks: [] as Spark[],
  bolts: [] as Bolt[],
  flares: [] as Flare[],
  nums: [] as Num[],
  rings: [] as Array<{ x: number; y: number; r: number; life: number; max: number; col: string }>,
  groundArcs: [] as Array<{ x: number; dir: number; dist: number; life: number; max: number; seed: number }>,
  scorches: [] as Array<{ x: number; life: number; max: number; w: number }>,
  pillars: [] as Array<{ x: number; life: number; max: number; w: number }>,
  clouds: [] as Array<{ x: number; life: number; max: number; size: number }>,
  mark: null as null | { x: number; life: number; max: number },
  /** Chain Bolt beam: frames left */
  beam: 0,
  hitStop: 0,
  shake: 0,
  flash: 0,
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

function addSparks(x: number, y: number, n: number, col = '#9ff3ff', speed = 9, grav = 0.35, life = 30): void {
  for (let i = 0; i < n && state.sparks.length < 600; i++) {
    const a = rnd() * Math.PI * 2;
    const v = speed * (0.3 + rnd());
    state.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: life * (0.6 + rnd() * 0.6), max: life * 1.2, col: rnd() < 0.3 ? '#ffffff' : col, w: 2 + rnd() * 2, grav });
  }
}
function addBolt(a: Pt, b: Pt, life = 12, width = 1, theme: Theme = 'cyan', forks = 3): void {
  if (state.bolts.length > 140) state.bolts.shift();
  state.bolts.push({ a: { ...a }, b: { ...b }, life, max: life, width, seed: Math.floor(rnd() * 1e6), theme, forks });
}
function addFlare(x: number, y: number, size: number, life = 12, theme: Theme = 'cyan'): void {
  state.flares.push({ x, y, size, life, max: life, theme });
}
function banner(text: string, col = '#ffe27a', life = 60): void {
  state.banner = { text, life, col };
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

function landHit(att: Fighter, def: Fighter, h: Hit, at: Pt): void {
  if (def.clip?.name === 'KO fall') return;
  const fromPlayer = att === state.player;
  const guarded = def.guarding && Math.sign(att.x - def.x) === def.facing;
  if (guarded) {
    const perfect = def.t - def.guardSince <= PERFECT_FRAMES;
    def.shieldHit = 1;
    const sx = def.x + def.facing * 70 * S;
    const sy = at.y;
    state.rings.push({ x: sx, y: sy, r: perfect ? 260 : 140, life: perfect ? 26 : 16, max: perfect ? 26 : 16, col: perfect ? '255,228,120' : '160,240,255' });
    addSparks(sx, sy, perfect ? 50 : 22, perfect ? '#ffe27a' : '#9ff3ff', 10);
    addFlare(sx, sy, perfect ? 120 : 60, perfect ? 18 : 10, perfect ? 'gold' : 'cyan');
    if (perfect) {
      // perfect guard: no damage, the shield shocks the attacker back
      def.shieldPerfect = 30;
      state.hitStop = 12;
      state.shake = 12;
      for (let i = 0; i < 4; i++) addBolt({ x: sx, y: sy }, att.chest(), 16, 1.4, i % 2 ? 'gold' : 'cyan', 2);
      att.play('hurt');
      att.stun = 34;
      att.vx = -att.facing * 6;
      att.flash = 8;
      banner('PERFECT GUARD', '#ffe27a', 70);
      state.nums.push({ x: sx, y: sy - 40, text: 'PERFECT', life: 60, col: '#ffe27a', size: 46 });
      zap(2400, 0.25, 'triangle', 0.12, 0.8);
      zap(1200, 0.4, 'sine', 0.08, 1);
      return;
    }
    const chip = Math.max(1, Math.round(h.dmg * 0.2));
    def.hp = Math.max(1, def.hp - chip);
    def.vx = h.kb * 0.4 * att.facing;
    state.hitStop = Math.max(3, h.stop - 2);
    state.shake = Math.max(state.shake, 4);
    state.nums.push({ x: sx, y: sy - 30, text: `${chip} BLOCK`, life: 45, col: '#9ff3ff', size: 32 });
    zap(900, 0.12, 'triangle', 0.1, 0.5);
    noise(0.05, 0.08);
    return;
  }
  const dmg = h.dmg;
  def.hp = Math.max(0, def.hp - dmg);
  def.vx = h.kb * att.facing;
  if (h.lift < 0) {
    def.vy = h.lift;
    def.grounded = false;
  } else if (!def.grounded) def.vy = Math.min(def.vy, -4); // juggle: hits in the air keep the foe up
  def.flash = 6;
  state.hitStop = h.stop;
  state.shake = Math.max(state.shake, dmg * 0.9);
  if (fromPlayer) {
    att.landed = true;
    state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
    state.comboTimer = 80;
    state.comboPop = 10;
  }
  state.nums.push({ x: at.x, y: at.y - 20, text: String(dmg), life: 50, col: '#ffd84a', size: 34 + dmg });
  addSparks(at.x, at.y, h.fx === 'big' ? 60 : h.fx === 'bolt' ? 34 : 18, '#9ff3ff', h.fx === 'big' ? 14 : 10);
  addFlare(at.x, at.y, h.fx === 'big' ? 150 : h.fx === 'bolt' ? 95 : 60, h.fx === 'big' ? 20 : 12, h.fx === 'spark' ? 'cyan' : 'white');
  const n = h.fx === 'big' ? 7 : h.fx === 'bolt' ? 4 : 2;
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const L = (h.fx === 'big' ? 220 : 120) * (0.6 + rnd() * 0.5);
    addBolt(at, { x: at.x + Math.cos(a) * L, y: at.y + Math.sin(a) * L }, 10, 0.9, i % 3 === 0 ? 'gold' : 'cyan', 1);
  }
  if (h.fx === 'big') {
    state.flash = 6;
    state.rings.push({ x: at.x, y: at.y, r: 240, life: 22, max: 22, col: '160,240,255' });
  }
  zap(h.fx === 'big' ? 160 : 320 + rnd() * 120, h.fx === 'spark' ? 0.08 : 0.2, 'square', 0.1);
  noise(0.06 + dmg * 0.006, 0.14);
  if (def.hp <= 0) {
    def.play('ko');
    state.shake = 18;
    state.hitStop = 16;
    if (fromPlayer) banner('K.O.!', '#ff5e8a', 90);
  } else {
    def.play('hurt');
    def.stun = h.stun;
  }
}

// ---------------------------------------------------------------- control
const POWERS: Record<string, string> = { KeyK: 'heavy', KeyU: 'sparkStep', KeyI: 'chainBolt', KeyO: 'skyfall', KeyP: 'thunderGod' };
function startAttack(f: Fighter, name: string): void {
  f.play(name);
  f.guarding = false;
  if (name === 'dash') {
    f.ghostOn = 14;
    zap(900, 0.18, 'sawtooth', 0.07, 0.2);
  }
  if (['heavy', 'sparkStep', 'chainBolt', 'skyfall', 'rising'].includes(name)) zap(180, 0.35, 'sawtooth', 0.06, 3);
  if (name === 'thunderGod') {
    zap(90, 1.0, 'sawtooth', 0.09, 4);
    banner('THUNDER GOD', '#8ff0ff', 90);
  }
}
const nameOf = (c: Clip) => Object.keys(CLIPS).find((k) => CLIPS[k] === c) ?? '';

function control(f: Fighter): void {
  const left = keys.has('KeyA') || keys.has('ArrowLeft');
  const right = keys.has('KeyD') || keys.has('ArrowRight');
  const run = keys.has('ShiftLeft') || keys.has('ShiftRight');
  if (state.preview) return;
  if (f.clip) {
    const n = nameOf(f.clip);
    // combo chain on J
    if (pressed.has('KeyJ') && f.clip.cancel !== undefined && COMBO.includes(n)) {
      const i = COMBO.indexOf(n);
      if (i < COMBO.length - 1) f.queued = COMBO[i + 1];
    }
    // a power cancels a normal attack once it has hit
    if (f.landed && (COMBO.includes(n) || n === 'kick')) {
      for (const [k, p] of Object.entries(POWERS))
        if (pressed.has(k)) {
          startAttack(f, p);
          state.nums.push({ x: f.x, y: f.hipY(f.shown) - 330 * S, text: 'CANCEL!', life: 40, col: '#8ff0ff', size: 28 });
          return;
        }
    }
    return;
  }
  if (f.stun > 0) return;
  const wantGuard = keys.has('KeyS') && f.grounded;
  if (wantGuard && !f.guarding) {
    f.guardSince = f.t;
    zap(520, 0.15, 'sine', 0.05, 1.6);
  }
  f.guarding = wantGuard;
  const dir = (right ? 1 : 0) - (left ? 1 : 0);
  if (!f.guarding) {
    const sp = run ? RUN : WALK;
    f.vx = f.grounded ? dir * sp : f.vx * 0.9 + dir * sp * 0.1;
    if (dir) f.facing = dir;
  } else f.vx = 0;
  if ((pressed.has('KeyW') || pressed.has('Space') || pressed.has('ArrowUp')) && f.grounded && !f.guarding) {
    f.vy = JUMP;
    f.grounded = false;
    zap(500, 0.12, 'triangle', 0.06, 1.8);
    addSparks(f.x, GROUND, 10, '#ffd84a', 5);
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

/** The sparring dummy steps in and throws a jab or a kick every couple of seconds, with a red glint first. */
function dummyAI(d: Fighter, p: Fighter): void {
  if (!state.dummyFights || d.clip || d.stun > 0 || p.clip?.name === 'KO fall') return;
  const dist = Math.abs(p.x - d.x);
  if (d.windup > 0) {
    d.windup--;
    if (d.windup === 0) d.play(rnd() < 0.6 ? 'jab' : 'kick');
    return;
  }
  if (dist > 190) d.vx = Math.sign(p.x - d.x) * 2.6;
  if (--d.aiTimer <= 0 && dist < 200) {
    d.aiTimer = 100 + Math.floor(rnd() * 70);
    d.windup = 14;
    zap(300, 0.1, 'square', 0.04, 0.6);
  }
}

// ---------------------------------------------------------------- power events
function targetPoint(f: Fighter, other: Fighter, ahead: number): number {
  return state.dummyOn && other.clip?.name !== 'KO fall' ? other.x : f.x + f.facing * ahead;
}
function runEvents(f: Fighter, other: Fighter): void {
  const c = f.clip;
  if (!c) return;
  for (const [fr, ev] of c.events ?? []) {
    if (fr !== f.frame) continue;
    if (ev === 'teleport') {
      const from = f.chest();
      f.ghosts.push({ x: f.x, y: f.feet, facing: f.facing, pose: { ...f.shown }, life: 26, max: 26 });
      const target = state.dummyOn ? other.x + (other.x > f.x ? 120 : -120) : f.x + f.facing * 280;
      f.x = Math.max(80, Math.min(STAGE_W - 80, target));
      if (state.dummyOn) f.facing = other.x > f.x ? 1 : -1;
      const to = f.chest();
      // the body becomes a bolt that zips to the new spot and stays visible for a moment
      addBolt(from, to, 22, 2.2, 'white', 5);
      addBolt({ x: from.x, y: from.y + 30 }, { x: to.x, y: to.y + 30 }, 18, 1.2, 'gold', 2);
      addSparks(from.x, from.y, 30);
      addSparks(to.x, to.y, 36, '#ffe27a');
      addFlare(from.x, from.y, 90, 14, 'cyan');
      addFlare(to.x, to.y, 110, 16, 'white');
      state.flash = 3;
      zap(1400, 0.25, 'sawtooth', 0.08, 0.1);
      noise(0.12, 0.15);
    } else if (ev === 'beam') {
      state.beam = 24;
      zap(240, 0.5, 'sawtooth', 0.08, 2.5);
    } else if (ev === 'beamEnd') {
      const tp = beamEnd(f, other);
      addFlare(tp.x, tp.y, 160, 20, 'white');
      state.rings.push({ x: tp.x, y: tp.y, r: 200, life: 20, max: 20, col: '160,240,255' });
      addSparks(tp.x, tp.y, 50, '#9ff3ff', 13);
      thunder();
    } else if (ev === 'mark') {
      const x = targetPoint(f, other, 320);
      state.mark = { x, life: 30, max: 30 };
      state.clouds.push({ x, life: 60, max: 60, size: 320 });
      const hand = f.joint('fw');
      addBolt(hand, { x: hand.x + (rnd() - 0.5) * 40, y: -60 }, 30, 0.9, 'cyan', 2);
    } else if (ev === 'skybolt' && state.mark) {
      const mx = state.mark.x;
      strike(f, other, mx, true, { dmg: 22, kb: 3, lift: -16, stop: 12, stun: 50 });
      state.mark = null;
    } else if (ev === 'slam') {
      const gp = f.toStage(f.shown, 110, 0);
      addSparks(gp.x, GROUND, 46, '#ffd84a', 12);
      addFlare(gp.x, GROUND - 10, 130, 16, 'gold');
      state.rings.push({ x: gp.x, y: GROUND, r: 220, life: 18, max: 18, col: '255,228,120' });
      // shockwaves race along the floor both ways
      for (const dir of [1, -1]) state.groundArcs.push({ x: gp.x, dir, dist: 0, life: 30, max: 30, seed: Math.floor(rnd() * 1e6) });
      state.scorches.push({ x: gp.x, life: 90, max: 90, w: 110 });
      thunder();
    } else if (ev === 'ultCall') {
      const x = targetPoint(f, other, 320);
      state.clouds.push({ x, life: 80, max: 80, size: 420 });
      const hand = f.joint('fw');
      for (let i = 0; i < 3; i++) addBolt(hand, { x: hand.x + (i - 1) * 60, y: -60 }, 40, 1.2, i === 1 ? 'white' : 'gold', 3);
      zap(60, 1.4, 'sawtooth', 0.1, 5);
    } else if (ev === 'ultBolt') {
      const x = targetPoint(f, other, 320) + (rnd() - 0.5) * 50;
      strike(f, other, x, false, { dmg: 4, kb: 1, lift: -4, stop: 3, stun: 24 });
    } else if (ev === 'ultFinal') {
      const x = targetPoint(f, other, 320);
      strike(f, other, x, true, { dmg: 16, kb: 6, lift: -19, stop: 16, stun: 60 });
      state.pillars.push({ x, life: 40, max: 40, w: 90 });
      state.flash = 12;
      state.shake = 28;
      banner('THUNDER GOD!', '#ffe27a', 80);
    }
  }
}
/** A bolt from the sky at x. big: a full pillar with a scorch mark. Hits the foe when it stands under it. */
function strike(f: Fighter, other: Fighter, x: number, big: boolean, h: { dmg: number; kb: number; lift: number; stop: number; stun: number }): void {
  for (let i = 0; i < (big ? 3 : 2); i++) addBolt({ x: x + (rnd() - 0.5) * 60, y: -80 }, { x, y: GROUND }, big ? 22 : 14, big ? 2.6 : 1.6, i === 0 ? 'white' : i === 1 ? 'cyan' : 'gold', 4);
  if (big) state.pillars.push({ x, life: 28, max: 28, w: 60 });
  addSparks(x, GROUND - 10, big ? 80 : 30, '#9ff3ff', big ? 15 : 10);
  addFlare(x, GROUND - 20, big ? 200 : 110, big ? 22 : 12, 'white');
  state.rings.push({ x, y: GROUND, r: big ? 300 : 150, life: 24, max: 24, col: '160,240,255' });
  state.scorches.push({ x, life: big ? 120 : 70, max: big ? 120 : 70, w: big ? 140 : 80 });
  state.flash = Math.max(state.flash, big ? 9 : 4);
  state.shake = Math.max(state.shake, big ? 22 : 8);
  thunder(big);
  if (state.dummyOn && Math.abs(other.x - x) < (big ? 100 : 80))
    landHit(f, other, { from: 0, to: 0, box: { x: 0, y: 0, w: 0, h: 0 }, ...h, fx: big ? 'big' : 'bolt' }, { x, y: other.hipY(other.shown) - 120 * S });
}
/** Where the Chain Bolt beam ends: the foe's chest when in front and in reach, else full range. */
function beamEnd(p: Fighter, d: Fighter): Pt {
  const hand = p.joint('fw');
  if (state.dummyOn && Math.sign(d.x - p.x) === p.facing && Math.abs(d.x - p.x) < 480) return d.chest();
  return { x: hand.x + p.facing * 440, y: hand.y + Math.sin(state.frameNo / 4) * 12 };
}

// ---------------------------------------------------------------- update
function stepFighter(f: Fighter, other: Fighter, isPlayer: boolean): void {
  f.t++;
  if (f.flash > 0) f.flash--;
  if (f.stun > 0) f.stun--;
  if (isPlayer) control(f);
  else dummyAI(f, other);
  f.shieldPop = f.guarding ? Math.min(1, f.shieldPop + 0.18) : Math.max(0, f.shieldPop - 0.2);
  f.shieldHit = Math.max(0, f.shieldHit - 0.08);
  if (f.shieldPerfect > 0) f.shieldPerfect--;
  if (f.clip) {
    runEvents(f, other);
    const mv = moveAt(f.clip, f.frame);
    if (mv) f.vx = mv * f.facing;
    else if (f.grounded) f.vx *= ['Hurt', 'KO fall'].includes(f.clip.name) ? 0.86 : 0.6;
    // hits (both ways: the dummy can hit the player too)
    if (state.dummyOn)
      (f.clip.hits ?? []).forEach((h, i) => {
        if (f.hitDone.has(i) || f.frame < h.from || f.frame > h.to) return;
        const hb = hitboxStage(f, h);
        if (overlap(hb, hurtbox(other))) {
          f.hitDone.add(i);
          landHit(f, other, h, { x: other.x - f.facing * 20, y: Math.max(hb.y + hb.h / 2, f.hipY(f.shown) - 200) });
        }
      });
    // effects tied to the clip: glowing striking limb, aura embers, beam
    const live = (f.clip.hits ?? []).some((h) => f.frame >= h.from - 3 && f.frame <= h.to + 2);
    if (f.clip.limb && live && f.t % 2 === 0) {
      const j = f.joint(f.clip.limb);
      addSparks(j.x, j.y, 3, '#ffe27a', 4, 0.1, 16);
    }
    const aura = auraAt(f.clip, f.frame);
    if (aura > 0.2 && f.t % 2 === 0) for (let i = 0; i < 3; i++) addSparks(f.x + (rnd() - 0.5) * 140 * S, GROUND - rnd() * 40, 1, rnd() < 0.5 ? '#8ff0ff' : '#ffe27a', 2, -0.18, 50);
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
  // physics
  if (!f.grounded) {
    f.vy += GRAV;
    f.feet += f.vy;
    if (f.feet >= GROUND) {
      f.feet = GROUND;
      f.vy = 0;
      f.grounded = true;
      addSparks(f.x, GROUND, 8, '#ffd84a', 4);
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
    // the dash leaves a lightning streak along its path
    const y = f.hipY(f.shown) - 90 * S;
    addBolt({ x: px - f.facing * 40, y: y + (rnd() - 0.5) * 30 }, { x: f.x, y }, 14, 1.3, rnd() < 0.4 ? 'gold' : 'cyan', 1);
    addSparks(f.x, GROUND - 4, 2, '#ffe27a', 3);
  }
  f.ghosts = f.ghosts.filter((g) => --g.life > 0);
}

function step(): void {
  state.frameNo++;
  if (pressed.has('KeyB')) state.bones = !state.bones;
  if (pressed.has('KeyG')) state.boxes = !state.boxes;
  if (state.hitStop > 0) {
    // presses made during hit-stop are kept and used when the action resumes (combo inputs feel reliable)
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
  if (state.beam > 0) {
    state.beam--;
    if (state.frameNo % 2 === 0) {
      const e = beamEnd(p, d);
      addSparks(e.x, e.y, 4, '#9ff3ff', 7);
      if (rnd() < 0.5) addBolt(e, { x: e.x + (rnd() - 0.5) * 140, y: GROUND }, 8, 0.8, 'cyan', 1);
    }
    if (state.frameNo % 6 === 0) zap(160 + rnd() * 60, 0.1, 'sawtooth', 0.04, 1.4);
  }
  if (state.mark) state.mark.life--;
  for (const s of state.sparks) {
    s.x += s.vx;
    s.y += s.vy;
    s.vy += s.grav;
    s.vx *= 0.96;
    s.life--;
  }
  state.sparks = state.sparks.filter((s) => s.life > 0);
  state.bolts = state.bolts.filter((b) => --b.life > 0);
  state.flares = state.flares.filter((f) => --f.life > 0);
  state.nums = state.nums.filter((n) => ((n.y -= 1.1), --n.life > 0));
  state.rings = state.rings.filter((r) => --r.life > 0);
  for (const ga of state.groundArcs) {
    ga.dist += 17;
    if (state.frameNo % 2 === 0) addSparks(ga.x + ga.dir * ga.dist, GROUND - 6, 2, '#ffe27a', 5);
  }
  state.groundArcs = state.groundArcs.filter((g) => --g.life > 0);
  state.scorches = state.scorches.filter((s) => --s.life > 0);
  state.pillars = state.pillars.filter((s) => --s.life > 0);
  state.clouds = state.clouds.filter((s) => --s.life > 0);
  if (state.banner && --state.banner.life <= 0) state.banner = null;
  if (state.shake > 0) state.shake *= 0.86;
  if (state.flash > 0) state.flash--;
  if (state.comboPop > 0) state.comboPop--;
  if (state.comboTimer > 0) state.comboTimer--;
  else state.combo = 0;
  // camera: follows the midpoint, pushes in during the ultimate
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
}
function makeSkins(p: Parts): Skins {
  return {
    hero: { head: p.head, pal: PALETTES.hero },
    dummy: { head: tintImage(p.head, TINT.gray), pal: PALETTES.dummy },
    ghost: { head: tintImage(p.head, TINT.ghost), pal: PALETTES.ghost },
    flash: { head: tintImage(p.head, TINT.flash), pal: PALETTES.flash },
  };
}
/** Joint chains of a fighter in stage space (for arcs crawling over the body). */
function bodyChains(f: Fighter): Pt[][] {
  const j = (n: Parameters<Fighter['joint']>[0]) => f.joint(n);
  return [
    [j('fs'), j('fe'), j('fw')],
    [j('bs'), j('be'), j('bw')],
    [j('hip'), j('fk'), j('fa')],
    [j('hip'), j('bk'), j('ba')],
    [j('hip'), j('neck')],
  ];
}
function drawFighter(g: CanvasRenderingContext2D, skins: Skins, f: Fighter): void {
  const p = f.shown;
  const aura = f.clip ? auraAt(f.clip, f.frame) : 0;
  const charge = f.clip ? chargeAt(f.clip, f.frame) : 0;
  const top = 360 * S;
  if (aura > 0) drawAura(g, f.hipX(p), GROUND, top * (0.9 + aura * 0.5), aura, state.frameNo, -1);
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
  const air = (GROUND - f.feet) / 300;
  g.beginPath();
  g.ellipse(f.hipX(p), GROUND + 4, 70 * S * (1 - air * 0.5), 14 * S, 0, 0, Math.PI * 2);
  g.fill();
  g.translate(f.hipX(p), f.hipY(p));
  g.scale(S * f.facing, S);
  const skin = f.flash > 0 ? skins.flash : skins[f.look];
  drawRig(g, skin, p, { face: f.face(), charge, bones: state.bones, t: f.t });
  g.restore();
  if (aura > 0) drawAura(g, f.hipX(p), GROUND, top * (0.9 + aura * 0.5), aura, state.frameNo, 1);
  if (charge > 0.3 || aura > 0.3 || (f.clip?.name === 'Bolt Dash')) drawBodyArcs(g, bodyChains(f), Math.max(charge, aura) * (f.look === 'hero' ? 1 : 0.4), state.frameNo + (f.look === 'hero' ? 0 : 50));
  // the striking limb crackles while the hit is live (reference: the punching fist bursts with sparks)
  const c = f.clip;
  if (c?.limb && f.look === 'hero') {
    const live = (c.hits ?? []).some((h) => f.frame >= h.from - 3 && f.frame <= h.to + 2);
    if (live) {
      const j = f.joint(c.limb);
      const elbow = f.joint(c.limb === 'fw' ? 'fe' : c.limb === 'bw' ? 'be' : 'fk');
      drawFlare(g, j.x, j.y, 46, 0.9, state.frameNo, 'gold');
      drawBolt(g, elbow, j, state.frameNo * 7 + 3, 0.6, 0.9, 'cyan', 2);
      drawBolt(g, j, { x: j.x + f.facing * 50, y: j.y + Math.sin(state.frameNo) * 20 }, state.frameNo * 13, 0.5, 0.8, 'gold', 1);
    }
  }
  // the sparring dummy's red glint warns before it attacks
  if (f.windup > 0) {
    const j = f.joint('fw');
    drawFlare(g, j.x, j.y, 40 * (1 - f.windup / 14) + 10, 0.9, state.frameNo, 'gold');
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(255,60,80,${0.5 * (1 - f.windup / 14)})`;
    g.beginPath();
    g.arc(j.x, j.y, 22, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  // lightning shield while guarding
  if (f.shieldPop > 0) {
    const ch = f.chest();
    drawShield(g, ch.x + f.facing * 18, ch.y + 10, f.facing, 175 * S, f.shieldPop, f.shieldHit, state.frameNo, f.shieldPerfect > 0);
  }
}

/** The arena picture with its effects (engine/backdrop.ts). */
let def: ArenaDef;
let backdrop: Backdrop | null = null;
function render(g: CanvasRenderingContext2D, stage: Arena, skins: Skins): void {
  const cw = g.canvas.width;
  const ch = g.canvas.height;
  const zoom = Math.min(cw / VIEW_W, ch / VIEW_H) * state.zoom;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#05061a';
  g.fillRect(0, 0, cw, ch);
  const sx = Math.sin(state.frameNo * 2.7) * state.shake * 0.5;
  const sy = Math.cos(state.frameNo * 3.1) * state.shake * 0.5;
  // camera centred on (camX, camY); during the push-in it moves toward the fighters' chests
  const push = Math.min(1, Math.max(0, (state.zoom - 1) / 0.14));
  const camY = VIEW_H / 2 + (GROUND - 200 - VIEW_H / 2) * push;
  g.setTransform(zoom, 0, 0, zoom, cw / 2 + sx, ch / 2 + sy);
  g.translate(-state.camX, -camY);
  if (backdrop) drawBackdrop(g, backdrop, { ground: GROUND, stageW: STAGE_W, camX: state.camX, halfW: cw / 2 / zoom, frame: state.frameNo, flash: state.flash, storm: state.dim / 0.55 });
  else drawArena(g, stage, state.camX, state.frameNo, state.flash, state.dim / 0.55);
  // the arena darkens for the ultimate
  if (state.dim > 0.01) {
    g.fillStyle = `rgba(2,3,14,${state.dim})`;
    g.fillRect(-200, -200, STAGE_W + 400, STAGE_H + 400);
  }
  // scorch marks on the floor
  for (const s of state.scorches) {
    const a = s.life / s.max;
    g.fillStyle = `rgba(5,6,20,${0.55 * a})`;
    g.beginPath();
    g.ellipse(s.x, GROUND + 6, s.w, s.w * 0.18, 0, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(140,230,255,${0.6 * a})`;
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(s.x, GROUND + 6, s.w * 0.7, s.w * 0.12, 0, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }
  for (const c of state.clouds) {
    const k = c.life / c.max;
    drawStormCloud(g, c.x, 70, c.size, Math.min(1, (1 - k) * 4, k * 3), state.frameNo);
  }
  if (state.mark) {
    const k = 1 - state.mark.life / state.mark.max;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(150,240,255,${0.6 + 0.4 * Math.sin(state.frameNo / 2)})`;
    g.lineWidth = 4;
    g.beginPath();
    g.ellipse(state.mark.x, GROUND, 110 - k * 60, 22 - k * 12, 0, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(state.mark.x - 130, GROUND);
    g.lineTo(state.mark.x + 130, GROUND);
    g.stroke();
    g.restore();
  }
  if (state.dummyOn) drawFighter(g, skins, state.dummy);
  drawFighter(g, skins, state.player);
  // Chain Bolt beam: 3 living strands from the palm to the target
  if (state.beam > 0) {
    const p = state.player;
    const hand = p.joint('fw');
    const e = beamEnd(p, state.dummy);
    const a = Math.min(1, state.beam / 6);
    drawBolt(g, hand, e, Math.floor(state.frameNo / 2) * 31, 1.8, a, 'white', 4);
    drawBolt(g, hand, { x: e.x, y: e.y - 18 }, Math.floor(state.frameNo / 2) * 57 + 1, 0.9, a, 'cyan', 2);
    drawBolt(g, hand, { x: e.x, y: e.y + 20 }, Math.floor(state.frameNo / 2) * 91 + 2, 0.8, a, 'gold', 2);
    drawFlare(g, hand.x, hand.y, 55, a, state.frameNo, 'cyan');
    drawFlare(g, e.x, e.y, 80, a, state.frameNo + 3, 'white');
  }
  for (const ga of state.groundArcs) {
    const a = ga.life / ga.max;
    const x2 = ga.x + ga.dir * ga.dist;
    drawBolt(g, { x: ga.x, y: GROUND - 4 }, { x: x2, y: GROUND - 6 }, ga.seed + Math.floor(state.frameNo / 2) * 7, 1.1, a, 'gold', 3);
    drawBolt(g, { x: x2 - ga.dir * 40, y: GROUND - 40 }, { x: x2, y: GROUND - 4 }, ga.seed + state.frameNo, 0.7, a, 'cyan', 1);
  }
  for (const pl of state.pillars) drawPillar(g, pl.x, -100, GROUND, pl.w, 1 - pl.life / pl.max, state.frameNo);
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
  for (const b of state.bolts) {
    const a = b.life / b.max;
    drawBolt(g, b.a, b.b, b.seed + Math.floor(b.life / 2) * 13, b.width, a, b.theme, b.forks);
  }
  for (const f of state.flares) drawFlare(g, f.x, f.y, f.size * (0.6 + 0.4 * (f.life / f.max)), f.life / f.max, f.x + f.life, f.theme);
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  for (const s of state.sparks) {
    g.strokeStyle = s.col;
    g.globalAlpha = Math.max(0, s.life / s.max);
    g.lineWidth = s.w;
    g.beginPath();
    g.moveTo(s.x, s.y);
    g.lineTo(s.x - s.vx * 1.6, s.y - s.vy * 1.6);
    g.stroke();
  }
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
        const b = hitboxStage(f, h);
        const live = f.frame >= h.from && f.frame <= h.to;
        g.fillStyle = live ? 'rgba(255,40,80,0.45)' : 'rgba(255,40,80,0.12)';
        g.fillRect(b.x, b.y, b.w, b.h);
      }
    }
  }
  // ---- screen-space HUD
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (state.flash > 0) {
    g.fillStyle = `rgba(200,245,255,${state.flash * 0.05})`;
    g.fillRect(0, 0, cw, ch);
  }
  const bar = (x: number, w: number, hp: number, label: string, col: string, alignRight: boolean) => {
    g.fillStyle = 'rgba(5,6,26,0.7)';
    g.fillRect(x - 4, 20, w + 8, 34);
    g.fillStyle = col;
    const fw = (w * hp) / 100;
    g.fillRect(alignRight ? x + w - fw : x, 24, fw, 26);
    g.fillStyle = '#fff';
    g.font = 'bold 16px Rajdhani, Arial, sans-serif';
    g.textAlign = alignRight ? 'right' : 'left';
    g.strokeStyle = '#0b0e24';
    g.lineWidth = 4;
    const tx = alignRight ? x + w - 8 : x + 8;
    g.strokeText(label, tx, 43);
    g.fillText(label, tx, 43);
  };
  // small screens: start right of the menu button, split the free width, and use short labels so the bars never overlap
  const compact = cw < 1000;
  const left = compact ? 66 : 24;
  const w = compact ? Math.min(300, (cw - left - 24 - 16) / 2) : Math.min(360, cw * 0.3);
  const short = w < 200;
  bar(left, w, state.player.hp, short ? `LIGHTNING ${state.player.hp}` : `LIGHTNING  ${state.player.hp} HP`, '#ffd84a', false);
  if (state.dummyOn) bar(cw - w - 24, w, state.dummy.hp, short ? `DUMMY ${state.dummy.hp}` : `SPARRING DUMMY  ${state.dummy.hp} HP`, '#ff5e8a', true);
  if (state.combo > 1) {
    const pop = 1 + state.comboPop * 0.04;
    const label = state.combo >= 8 ? 'SHOCKING!' : state.combo >= 5 ? 'ELECTRIC!' : state.combo >= 3 ? 'NICE' : '';
    g.save();
    g.translate(40, ch * 0.32);
    g.scale(pop, pop);
    g.textAlign = 'left';
    g.font = 'bold 54px Orbitron, Arial, sans-serif';
    const grd = g.createLinearGradient(0, -50, 0, 10);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.5, '#ffe27a');
    grd.addColorStop(1, '#8ff0ff');
    g.lineWidth = 7;
    g.strokeStyle = '#0b0e24';
    g.strokeText(`${state.combo} HITS`, 0, 0);
    g.fillStyle = grd;
    g.fillText(`${state.combo} HITS`, 0, 0);
    if (label) {
      g.font = 'bold 30px Orbitron, Arial, sans-serif';
      g.strokeText(label, 4, 40);
      g.fillStyle = '#8ff0ff';
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
  if (!h) return `${c.frames} frames`;
  const active = h.to - h.from + 1;
  return `startup ${h.from} · active ${active} · recovery ${c.frames - h.to - 1} · dmg ${(c.hits ?? []).reduce((a, x) => a + x.dmg, 0)}`;
}
function buildPanel(): void {
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
}
/** On-screen buttons for phones and tablets: each one holds a keyboard key while pressed. */
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

/** Builds the page and runs the lab in the given arena. */
export async function startLab<F>(arena: ArenaDef<F>): Promise<void> {
  def = arena as unknown as ArenaDef;
  document.title = `Elementick · Trial Ground · Lightning · ${arena.name}`;
  document.body.innerHTML = shellHtml(def, ARENAS);
  const pick = document.getElementById('arena') as HTMLSelectElement;
  pick.onchange = () => (location.href = `../${pick.value}/`);
  // keep the arena list from taking the game keys
  pick.onkeydown = (e) => e.preventDefault();
  // the other heroes live in the Trial Ground; keep this arena
  const hero = document.getElementById('hero') as HTMLSelectElement;
  hero.onchange = () => (location.href = `../../trial/?el=${hero.value}&arena=${def.id}`);
  hero.onkeydown = (e) => e.preventDefault();
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  const g = canvas.getContext('2d')!;
  const skins = makeSkins(await loadParts());
  const stage = bakeStage();
  backdrop = await loadBackdrop(def);
  // sound: starts on the first input (browser rule), panel switches, M toggles the music
  const sound = new Sound(def.song, def.air);
  const music = document.getElementById('music') as HTMLInputElement;
  const sfx = document.getElementById('sfx') as HTMLInputElement;
  const vol = document.getElementById('vol') as HTMLInputElement;
  music.checked = sound.musicOn;
  sfx.checked = sound.sfxOn;
  vol.value = String(sound.volume);
  document.getElementById('volv')!.textContent = `${Math.round(sound.volume * 100)}%`;
  music.onchange = () => sound.setMusic(music.checked);
  sfx.onchange = () => sound.setSfx(sfx.checked);
  vol.oninput = () => {
    sound.setVolume(Number(vol.value));
    document.getElementById('volv')!.textContent = `${Math.round(Number(vol.value) * 100)}%`;
  };
  const wake = () => sound.start();
  addEventListener('pointerdown', wake);
  addEventListener('keydown', (e) => {
    wake();
    if (e.code === 'KeyM' && !e.repeat) {
      music.checked = !music.checked;
      sound.setMusic(music.checked);
    }
  });
  (window as unknown as { __sound: Sound }).__sound = sound;
  for (const [k, v] of Object.entries(def.hooks ?? {})) (window as unknown as Record<string, unknown>)[k] = v;
  (window as unknown as { __arenaSounds: unknown }).__arenaSounds = (from: number, to: number) => def.sounds?.(from, to, 0) ?? [];
  // test hook: renders this arena's song loop offline; returns levels and a 16-bit mono WAV (base64)
  (window as unknown as { __renderSong: unknown }).__renderSong = async () => {
    const buf = await new Sound(def.song, def.air).render();
    const L = buf.getChannelData(0);
    const R = buf.getChannelData(1);
    const n = L.length;
    let peak = 0;
    let sum = 0;
    let quietSeconds = 0;
    let secSum = 0;
    const per = buf.sampleRate;
    const pcm = new Int16Array(n);
    for (let i = 0; i < n; i++) {
      const v = (L[i] + R[i]) / 2;
      const a = Math.max(Math.abs(L[i]), Math.abs(R[i]));
      if (a > peak) peak = a;
      sum += v * v;
      secSum += v * v;
      if ((i + 1) % per === 0) {
        if (Math.sqrt(secSum / per) < 0.005) quietSeconds++;
        secSum = 0;
      }
      pcm[i] = Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
    }
    const wav = new DataView(new ArrayBuffer(44 + n * 2));
    const str = (o: number, s: string) => [...s].forEach((c, k) => wav.setUint8(o + k, c.charCodeAt(0)));
    str(0, 'RIFF');
    wav.setUint32(4, 36 + n * 2, true);
    str(8, 'WAVEfmt ');
    wav.setUint32(16, 16, true);
    wav.setUint16(20, 1, true);
    wav.setUint16(22, 1, true);
    wav.setUint32(24, per, true);
    wav.setUint32(28, per * 2, true);
    wav.setUint16(32, 2, true);
    wav.setUint16(34, 16, true);
    str(36, 'data');
    wav.setUint32(40, n * 2, true);
    new Int16Array(wav.buffer, 44).set(pcm);
    let bin = '';
    const bytes = new Uint8Array(wav.buffer);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { seconds: n / per, peak, rms: Math.sqrt(sum / n), quietSeconds, wav: btoa(bin) };
  };
  let heardTo = 0;
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
  buildPanel();
  buildTouch();
  // test hook: draws one pose alone on a transparent canvas (for side-by-side checks against the reference art)
  (window as unknown as { __snap: (kind: string, frame: number) => string }).__snap = (kind, frame) => {
    const c = document.createElement('canvas');
    c.width = 700;
    c.height = 760;
    const x = c.getContext('2d')!;
    const p = kind === 'idle' ? idlePose(frame) : kind === 'walk' ? walkPose(frame, 4.2) : kind === 'run' ? walkPose(frame, 7.4) : kind === 'guard' ? guardPose : sample(CLIPS[kind], frame);
    const drop = footDrop(solve({ ...p, rot: 0 }));
    x.translate(330, 700 - drop * 1.4 + p.y * 1.4);
    x.scale(1.4, 1.4);
    drawRig(x, skins.hero, p, { face: kind === 'idle' || kind === 'walk' ? 'normal' : CLIPS[kind]?.face ?? 'normal', t: frame });
    return c.toDataURL('image/png');
  };
  (window as unknown as { __lab: typeof state }).__lab = state;
  // test hook: the arena picture with its effects at frame f, at the picture's own size, no fighters or panel
  // (bare = the baked picture only, i.e. what is left behind the moving parts)
  (window as unknown as { __plate: (f: number, bare?: boolean) => string }).__plate = (f, bare = false) => {
    if (!backdrop) return '';
    const c = document.createElement('canvas');
    c.width = backdrop.img.width;
    c.height = backdrop.img.height;
    const x = c.getContext('2d')!;
    x.drawImage(backdrop.img, 0, 0);
    if (!bare) def.draw?.(x, backdrop.fx as never, f, 0, 0);
    return c.toDataURL('image/png');
  };
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
    // a sound for each arena effect that began since the last frame drawn
    if (backdrop && def.sounds && state.frameNo !== heardTo) {
      if (state.frameNo > heardTo) for (const s of def.sounds(heardTo, state.frameNo, state.dim / 0.55)) sound.play(s);
      heardTo = state.frameNo;
    }
    const p = state.player;
    document.getElementById('state')!.textContent = p.clip ? `${p.clip.name}  frame ${p.frame}/${p.clip.frames}` : p.grounded ? (Math.abs(p.vx) > 5.5 ? 'Run' : Math.abs(p.vx) > 0.6 ? 'Walk' : p.guarding ? 'Guard' : 'Idle') : p.vy < 0 ? 'Jump' : 'Fall';
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  document.body.dataset.ready = '1';
}
