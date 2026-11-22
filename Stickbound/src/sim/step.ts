// The deterministic fight simulation. step() advances one 60 Hz frame from inputs only.
// Integer maths, seeded RNG in the state, no Date or Math.random. Rendering reads the state and never writes it.

import { ELEMENTS, matchup, matchupPct } from '../content/elements';
import { BASIC, COMBOS, STATUS_IDS, ZOMBIE_MOVES, type Box, type EffectDef, type HitDef, type MoveDef, type StatusId } from '../content/moves';
import { powersFor, RANK_DMG, RANK_MP_OFF, RANK_SIZE_PCT, RANK_STATUS_PCT, powerById, tuneFor } from '../content/powers';

/** sin(i * 2pi / 32) * 1000, an integer table so orbits stay deterministic on every engine */
const SIN32 = [0, 195, 383, 556, 707, 831, 924, 981, 1000, 981, 924, 831, 707, 556, 383, 195, 0, -195, -383, -556, -707, -831, -924, -981, -1000, -981, -924, -831, -707, -556, -383, -195];
const BUFF_KIND = { might: 1, speed: 2, iron: 3 } as const;
import { hpFor } from './stats';
import { IN, type Effect, type Fighter, type FighterSpec, type Match, type Mode, type ZombieKind } from './types';

// ---- tuning constants (cpx = centi-pixels) ------------------------------------------------------------------
export const ARENA_W = 1280;
export const WALL_L = 40 * 100;
export const WALL_R = (ARENA_W - 40) * 100;
const GRAV = 95;
const FALL_MAX = 2000;
const JUMP_V = -1850;
const WALK = 560;
const DASH_V = 1500;
const DASH_F = 13;
export const BODY_W = 46;
export const BODY_H = 125;
const INTRO_F = 100;
const KO_F = 110;
const ROUND_END_F = 70;
const START_MP = 300;
const BUF_F = 8;
const RECALL_F = 120;

export function getMove(id: string): MoveDef | undefined {
  return BASIC[id] ?? ZOMBIE_MOVES[id] ?? powerById(id);
}

// ---- RNG ----------------------------------------------------------------------------------------------------
function rnd(m: Match): number {
  m.rng = (m.rng + 0x6d2b79f5) | 0;
  let t = m.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) % 1000;
}
export function aiRnd(seedHolder: { seed: number }): number {
  seedHolder.seed = (seedHolder.seed + 0x6d2b79f5) | 0;
  let t = seedHolder.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) % 1000;
}

// ---- construction --------------------------------------------------------------------------------------------

const emptyStatus = (): Record<StatusId, number> => ({ burn: 0, slow: 0, freeze: 0, shock: 0, root: 0, weak: 0, float: 0 });

export function makeFighter(m: Match, spec: FighterSpec, team: 0 | 1, x: number, onField: boolean): Fighter {
  const hpMax = spec.kind === 'stick' ? hpFor(spec) : zombieHp(spec.kind, m.wave, spec.level);
  const f: Fighter = {
    id: m.nextId++,
    team,
    spec,
    x,
    y: 0,
    vx: 0,
    vy: 0,
    face: team === 0 ? 1 : -1,
    ground: true,
    hp: spec.hpPct ? Math.floor((hpMax * spec.hpPct) / 100) : hpMax,
    hpMax,
    mp: START_MP,
    gs: 1000,
    st: onField ? 'idle' : 'bench',
    sf: 0,
    move: null,
    mf: 0,
    moveHits: [],
    stun: 0,
    hitstop: 0,
    invuln: 0,
    armor: 0,
    combo: 0,
    status: emptyStatus(),
    airJumps: 0,
    airDash: false,
    guardSince: -999,
    lastHurt: -999,
    lastGuard: -999,
    barrier: 0,
    pgBoost: 0,
    counter: 0,
    counterMove: null,
    buff: 0,
    buffT: 0,
    prevIn: 0,
    buf: 0,
    bufT: 0,
    comboStep: 0,
    comboT: 0,
    onField,
    down: false,
    hist: new Array(RECALL_F * 2).fill(0),
    histI: 0,
    ai: null,
    koT: 0,
    dealt: 0,
    combosMax: 0,
    powersUsed: 0,
  };
  for (let i = 0; i < RECALL_F; i++) {
    f.hist[i * 2] = x;
    f.hist[i * 2 + 1] = 0;
  }
  m.fighters.push(f);
  return f;
}

export interface MatchOptions {
  mode: Mode;
  teamA: FighterSpec[];
  teamB: FighterSpec[];
  seed: number;
  winsNeeded?: number;
  timerSec?: number;
  /** bot difficulty per team (0 = human) */
  bots?: [number, number];
  ranked?: boolean;
  zombieLevel?: number;
}

export function createMatch(o: MatchOptions): Match {
  const m: Match = {
    mode: o.mode,
    frame: 0,
    rng: o.seed | 0,
    round: 1,
    phase: 'intro',
    pf: 0,
    timer: (o.timerSec ?? 60) * 60,
    timerMax: (o.timerSec ?? 60) * 60,
    fighters: [],
    effects: [],
    pickups: [],
    teams: [
      { members: [], active: 0, wins: 0 },
      { members: [], active: 0, wins: 0 },
    ],
    winsNeeded: o.winsNeeded ?? 2,
    roundWinner: -1,
    winner: -1,
    nextId: 1,
    events: [],
    wave: 0,
    waveLeft: 0,
    spawnT: 0,
    kills: 0,
    zombieLevel: o.zombieLevel ?? 1,
    slowmo: 0,
    ranked: !!o.ranked,
  };
  const place = (team: 0 | 1, specs: FighterSpec[]) => {
    specs.forEach((s, i) => {
      const f = makeFighter(m, s, team, team === 0 ? 38000 : 90000, i === 0);
      m.teams[team].members.push(f.id);
      const d = o.bots?.[team] ?? 0;
      if (d > 0) f.ai = { seed: (o.seed ^ (f.id * 7919)) | 0, next: 0, hold: 0, bits: 0, difficulty: d };
    });
  };
  place(0, o.teamA);
  if (o.mode !== 'zombie') place(1, o.teamB);
  return m;
}

// ---- small helpers -----------------------------------------------------------------------------------------

export const fighterById = (m: Match, id: number): Fighter | undefined => m.fighters.find((f) => f.id === id);

export function activeOf(m: Match, team: 0 | 1): Fighter | undefined {
  const t = m.teams[team];
  return fighterById(m, t.members[t.active]!);
}

function aliveMembers(m: Match, team: 0 | 1): Fighter[] {
  return m.teams[team].members.map((id) => fighterById(m, id)!).filter((f) => f && !f.down);
}

function enemiesOf(m: Match, f: Fighter): Fighter[] {
  return m.fighters.filter((o) => o.team !== f.team && o.onField && !o.down);
}

function nearestEnemy(m: Match, f: Fighter): Fighter | undefined {
  let best: Fighter | undefined;
  let bd = 1e12;
  for (const o of enemiesOf(m, f)) {
    const d = Math.abs(o.x - f.x);
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}

const scaleOf = (f: Fighter) => f.spec.scale ?? 100;

export function hurtbox(f: Fighter): [number, number, number, number] {
  const s = scaleOf(f);
  const hw = (BODY_W * s) / 2;
  const h = f.st === 'down' ? 40 : (BODY_H * s) / 100;
  return [f.x - hw, f.y - h * 100, f.x + hw, f.y];
}

export function moveBox(f: Fighter, b: Box, sizePct = 100): [number, number, number, number] {
  const s = (scaleOf(f) * sizePct) / 100;
  const bx = ((b.x * s) / 100) | 0;
  const bw = ((b.w * s) / 100) | 0;
  const by = (b.y * scaleOf(f)) / 100;
  const bh = (b.h * scaleOf(f)) / 100;
  const left = f.face === 1 ? f.x + bx * 100 : f.x - (bx + bw) * 100;
  return [left, f.y + by * 100, left + bw * 100, f.y + (by + bh) * 100];
}

export function effectBox(e: Effect): [number, number, number, number] {
  const hw = (e.w * 100) / 2;
  const anchorBottom = e.kind !== 'proj' || e.groundOnly;
  const top = anchorBottom ? e.y - e.h * 100 : e.y - (e.h * 100) / 2;
  return [e.x - hw, top, e.x + hw, top + e.h * 100];
}

const overlap = (a: number[], b: number[]) => a[0]! < b[2]! && a[2]! > b[0]! && a[1]! < b[3]! && a[3]! > b[1]!;

function canAct(f: Fighter): boolean {
  return f.onField && !f.down && (f.st === 'idle' || f.st === 'walk' || f.st === 'air' || f.st === 'guard');
}

// ---- damage ---------------------------------------------------------------------------------------------------

function powerRank(f: Fighter, moveId: string): number {
  const list = powersFor(f.spec.element, f.spec.archetype);
  const i = list.findIndex((p) => p.id === moveId);
  return i < 0 ? 1 : Math.max(1, f.spec.ranks[i]!);
}

function damageFor(m: Match, a: Fighter, v: Fighter, base: number, isPower: boolean, el: string | null, pct: number, finisher: boolean): number {
  const atk = isPower ? a.spec.stats.spirit : a.spec.stats.might;
  const def = isPower ? v.spec.stats.resolve : v.spec.stats.guard;
  let d = Math.floor((base * (100 + atk)) / (100 + def));
  d = Math.floor((d * pct) / 100);
  if (el) d = Math.floor((d * matchupPct(a.spec.element, v.spec.element)) / 100);
  if (isPower) d = Math.floor((d * tuneFor(a.spec.element, a.spec.archetype)) / 100);
  if (a.buff === 1 && a.buffT > 0) d = Math.floor((d * 125) / 100);
  if (v.buff === 3 && v.buffT > 0) d = Math.floor((d * 75) / 100);
  if (isPower && a.spec.perks.includes('power')) d = Math.floor((d * 110) / 100);
  if (isPower && v.spec.perks.includes('shield')) d = Math.floor((d * 90) / 100);
  if (isPower && v.spec.level >= 30) d = Math.floor((d * 95) / 100);
  if (finisher && a.spec.perks.includes('finisher')) d = Math.floor((d * 125) / 100);
  if (a.status.weak > 0) d = Math.floor((d * 75) / 100);
  if (v.status.float > 0) d = Math.floor((d * 120) / 100);
  const scale = v.combo <= 3 ? 100 : Math.max(40, 100 - (v.combo - 3) * 12);
  d = Math.floor((d * scale) / 100);
  if (m.mode === 'zombie' && a.team === 1) d = Math.floor((d * (100 + m.wave * 4)) / 100);
  return Math.max(base > 0 ? 1 : 0, d);
}

function addStatus(m: Match, a: Fighter, v: Fighter, s: StatusId, frames: number, pct: number): void {
  let dur = Math.floor((frames * pct) / 100);
  if (s === 'burn' && a.spec.element === 'fire') dur += 60;
  if (matchup(a.spec.element, v.spec.element) === 'strong') dur = Math.floor((dur * 130) / 100);
  dur = Math.floor((dur * 200) / (100 + v.spec.stats.resolve));
  if (dur <= 0) return;
  v.status[s] = Math.max(v.status[s], dur);
  if (s === 'freeze') {
    v.move = null;
    v.st = v.ground ? 'stun' : v.st === 'down' ? 'down' : 'stun';
    v.stun = Math.max(v.stun, dur);
    v.vx = 0;
  }
  if (s === 'shock' && v.move && !v.armor) {
    v.move = null;
    v.st = 'stun';
    v.stun = Math.max(v.stun, 14);
  }
  m.events.push({ t: 'status', who: v.id, status: s });
}

/** Applies a hit. Returns true if it connected (hit or guarded), false if it passed through. */
function applyHit(m: Match, a: Fighter, v: Fighter, h: HitDef, move: MoveDef | undefined, dmgPct: number, statusPct: number, fromX: number, melee: boolean): boolean {
  if (v.invuln > 0 || v.down || !v.onField) return false;
  if (h.groundOnly && !v.ground) return false;
  const isPower = !!move?.element;
  const el = move?.element ?? null;
  const dirX = v.x >= fromX ? 1 : -1;
  const finisher = move?.id === 'fin3' || move?.id === 'fin5';
  const hx = Math.floor((v.x + a.x) / 2);
  const hy = v.y - 9000;

  if (v.barrier > 0) {
    v.barrier = 0;
    m.events.push({ t: 'barrier', who: v.id });
    return true;
  }

  // counter stance: the hit is caught, and the counter's own hit goes back to the attacker if it is in reach
  if (v.counter > 0 && v.counterMove && v.st === 'move') {
    const cm = getMove(v.counterMove);
    v.counter = 0;
    v.invuln = Math.max(v.invuln, 14);
    m.events.push({ t: 'counter', who: v.id, target: a.id, move: v.counterMove });
    if (cm?.hit && a.onField && !a.down && Math.abs(a.x - v.x) < 32000) {
      v.face = a.x >= v.x ? 1 : -1;
      const rank = powerRank(v, cm.id);
      applyHit(m, v, a, cm.hit, cm, RANK_DMG[rank]!, RANK_STATUS_PCT[rank]!, v.x, true);
    }
    // the stance ends into a short recovery
    v.mf = Math.max(v.mf, (cm?.startup ?? 0) + (cm?.active ?? 0));
    return true;
  }

  const facingAttack = v.face === -dirX;
  if (v.st === 'guard' && facingAttack && !h.unblockable && v.status.freeze === 0) {
    const perfect = m.frame - v.guardSince <= v.spec.pgWindow;
    if (perfect) {
      v.mp = Math.min(1000, v.mp + 60);
      if (v.spec.element === 'time') v.pgBoost = 120;
      if (melee && a.onField) {
        a.move = null;
        a.st = 'stun';
        a.stun = 24;
        a.vx = 0;
      }
      a.hitstop = v.hitstop = 6;
      m.events.push({ t: 'hit', x: hx, y: hy, dmg: 0, el, guarded: true, perfect: true, heavy: false, victim: v.id, attacker: a.id, strong: false });
      return true;
    }
    let chip = Math.floor((damageFor(m, a, v, h.dmg, isPower, el, dmgPct, finisher) * 30) / 100);
    if (v.spec.element === 'earth') chip = Math.floor((chip * 90) / 100);
    v.hp = Math.max(1, v.hp - chip);
    const drain = v.spec.perks.includes('steady') ? Math.floor((h.guardDmg * 75) / 100) : h.guardDmg;
    v.gs -= drain;
    v.mp = Math.min(1000, v.mp + 20);
    v.lastGuard = m.frame;
    v.vx = (dirX * h.kbx) >> 1;
    if (v.gs <= 0) {
      v.gs = 500;
      v.st = 'gbreak';
      v.stun = 55;
      m.events.push({ t: 'gbreak', who: v.id });
    } else v.stun = Math.max(v.stun, h.block);
    if (melee) a.hitstop = 3;
    v.hitstop = 3;
    m.events.push({ t: 'hit', x: hx, y: hy, dmg: chip, el, guarded: true, perfect: false, heavy: h.dmg >= 90, victim: v.id, attacker: a.id, strong: false });
    return true;
  }

  // clean hit
  const dmg = damageFor(m, a, v, h.dmg, isPower, el, dmgPct, finisher);
  v.hp -= dmg;
  a.dealt += dmg;
  if (h.drain && !a.down) a.hp = Math.min(a.hpMax, a.hp + Math.floor((dmg * h.drain) / 100));
  v.lastHurt = m.frame;
  v.combo++;
  if (v.combo > a.combosMax) a.combosMax = v.combo;
  a.mp = Math.min(1000, a.mp + 30 + (a.spec.element === 'water' ? Math.floor(dmg / 5) : 0));
  if (m.mode === 'duel' && v.mp > 50) v.mp = Math.max(50, v.mp - 10);
  const stop = Math.min(8, 3 + Math.floor(dmg / 25));
  v.hitstop = stop;
  if (melee) a.hitstop = stop;
  const strong = !!el && matchup(a.spec.element, v.spec.element) === 'strong';
  m.events.push({ t: 'hit', x: hx, y: hy, dmg, el, guarded: false, perfect: false, heavy: dmg >= 90 || !!h.launch, victim: v.id, attacker: a.id, strong });

  if (h.status) addStatus(m, a, v, h.status[0], h.status[1], statusPct);
  if (a.spec.element === 'ice' && !isPower && melee) addStatus(m, a, v, 'slow', 20, 100);

  if (v.armor > 0 && v.st === 'move') return true;

  // stun with decay so long combos get easier to escape
  const decay = Math.max(50, 100 - (v.combo - 1) * 5);
  let kbx = h.kbx;
  if (a.spec.element === 'gravity') kbx = Math.floor((kbx * 65) / 100);
  if (v.spec.kind === 'boss' || v.spec.kind === 'brute') kbx = Math.floor(kbx / 3);
  v.move = null;
  v.st = 'stun';
  v.stun = Math.max(Math.floor((h.stun * decay) / 100), v.status.freeze);
  v.vx = h.pull ? -dirX * Math.min(kbx, 1100) : dirX * kbx;
  if (h.kby !== 0 || h.launch || !v.ground) {
    v.vy = h.kby !== 0 ? h.kby : v.vy;
    if (h.kby < 0) v.ground = false;
  }
  if (h.launch) v.ground = false;
  // juggle limit and anti-infinite burst
  if (v.combo >= 16 || (!v.ground && v.combo >= 10)) {
    v.invuln = 45;
    v.vx = dirX * 1200;
    v.vy = -900;
    v.ground = false;
  }
  // wall pushback on the attacker so corners do not become infinites
  if ((v.x <= WALL_L + 500 && dirX < 0) || (v.x >= WALL_R - 500 && dirX > 0)) if (melee) a.vx = -dirX * (kbx >> 1);
  return true;
}

// ---- moves and effects ----------------------------------------------------------------------------------------

function startMove(m: Match, f: Fighter, id: string): void {
  const mv = getMove(id)!;
  f.move = id;
  f.mf = 0;
  f.st = 'move';
  f.moveHits = [];
  f.armor = mv.armor ?? 0;
  if (mv.mp) {
    const rank = powerRank(f, id);
    f.mp -= Math.max(0, mv.mp - RANK_MP_OFF[rank]!) * 10;
    f.powersUsed++;
    m.events.push({ t: 'power', who: f.id, move: id });
  } else m.events.push({ t: 'move', who: f.id, move: id });
}

function spawnEffect(m: Match, f: Fighter, mv: MoveDef, e: EffectDef, fxi = 0): void {
  const rank = mv.element ? powerRank(f, mv.id) : 1;
  const size = RANK_SIZE_PCT[rank]!;
  const foe = nearestEnemy(m, f);
  let x = f.x + f.face * e.dx * 100;
  if (e.atFoe && foe) x = Math.max(WALL_L, Math.min(WALL_R, foe.x + f.face * e.dx * 100));
  const lightFast = f.spec.element === 'light' && e.kind === 'proj' ? 120 : 100;
  m.effects.push({
    id: m.nextId++,
    owner: f.id,
    team: f.team,
    move: mv.id,
    element: f.spec.element,
    kind: e.kind,
    look: e.look,
    x,
    y: f.y + e.dy * 100,
    vx: Math.floor(((e.vx ?? 0) * f.face * lightFast * size) / 10000),
    vy: e.vy ?? 0,
    gravity: e.gravity ?? 0,
    w: Math.floor((e.w * size) / 100),
    h: Math.floor((e.h * size) / 100),
    life: e.life,
    delay: e.delay ?? 0,
    rehit: e.rehit ?? 0,
    pierce: !!e.pierce,
    groundOnly: !!e.groundOnly,
    blocksProj: !!e.blocksProj,
    follow: !!e.follow,
    dmgPct: mv.element ? RANK_DMG[rank]! : 100,
    statusPct: mv.element ? RANK_STATUS_PCT[rank]! : 100,
    hits: [],
    face: f.face,
    age: 0,
    orbitR: e.orbit ? e.orbit.r * 100 : 0,
    orbitS: e.orbit ? e.orbit.speed : 0,
    orbitA: e.orbit ? (e.orbit.start ?? 0) : 0,
    returnAt: e.returnAt ?? 0,
    fxi,
  });
}

function moveDefOf(id: string): MoveDef {
  return getMove(id)!;
}

function stepMove(m: Match, f: Fighter): void {
  const mv = moveDefOf(f.move!);
  f.mf++;
  const total = mv.startup + mv.active + mv.recovery;
  const activeStart = mv.startup + 1;
  const activeEnd = mv.startup + mv.active;
  if (mv.invuln && f.mf >= mv.invuln[0] && f.mf <= mv.invuln[1]) f.invuln = Math.max(f.invuln, 1);
  if (f.armor > 0) f.armor--;
  if (mv.selfVx !== undefined && f.mf <= activeEnd) f.vx = mv.selfVx * f.face;
  else if (f.ground) f.vx = Math.trunc((f.vx * 70) / 100);

  if (f.mf === activeStart) {
    if (mv.special === 'teleportBehind') {
      const foe = nearestEnemy(m, f);
      if (foe) {
        const side = foe.x >= f.x ? 1 : -1;
        f.x = Math.max(WALL_L, Math.min(WALL_R, foe.x + side * 6000));
        f.face = side === 1 ? -1 : 1;
        f.y = foe.y;
        f.ground = foe.ground;
      }
    }
    if (mv.special === 'recall') {
      const i = f.histI % RECALL_F;
      f.x = f.hist[i * 2]!;
      f.y = Math.min(0, f.hist[i * 2 + 1]!);
      f.vx = f.vy = 0;
      f.ground = f.y >= 0;
    }
    if (mv.special === 'barrier') {
      f.barrier = 1;
      f.hp = Math.min(f.hpMax, f.hp + Math.floor(((mv.value ?? 0) * RANK_DMG[powerRank(f, mv.id)]!) / 100));
    }
    if (mv.special === 'heal') f.hp = Math.min(f.hpMax, f.hp + Math.floor(((mv.value ?? 0) * RANK_DMG[powerRank(f, mv.id)]!) / 100));
    if (mv.special === 'counter') {
      f.counter = mv.active;
      f.counterMove = mv.id;
    }
    if (mv.special === 'buff' && mv.buff) {
      f.buff = BUFF_KIND[mv.buff];
      f.buffT = Math.floor(((mv.value ?? 0) * RANK_STATUS_PCT[powerRank(f, mv.id)]!) / 100);
      m.events.push({ t: 'buff', who: f.id, kind: f.buff });
    }
    if (mv.spawn) spawnEffect(m, f, mv, mv.spawn);
    if (mv.spawns) mv.spawns.forEach((e, i) => spawnEffect(m, f, mv, e, i));
    if (mv.special === 'decoy') {
      // the double stays where you stood; you slip back
      m.events.push({ t: 'decoy', who: f.id, x: f.x });
      f.x = Math.max(WALL_L, Math.min(WALL_R, f.x - f.face * (mv.value ?? 150) * 100));
      f.vx = 0;
    }
  }

  if (mv.box && mv.hit && f.mf >= activeStart && f.mf <= activeEnd) {
    const sizePct = mv.element ? RANK_SIZE_PCT[powerRank(f, mv.id)]! : 100;
    const box = moveBox(f, mv.box, sizePct);
    for (const v of enemiesOf(m, f)) {
      const k = f.moveHits.indexOf(v.id);
      if (k >= 0 && (!mv.multi || m.frame < f.moveHits[k + 1]!)) continue;
      if (!overlap(box, hurtbox(v))) continue;
      const pct = mv.element ? RANK_DMG[powerRank(f, mv.id)]! : 100;
      const spct = mv.element ? RANK_STATUS_PCT[powerRank(f, mv.id)]! : 100;
      if (applyHit(m, f, v, mv.hit, mv, pct, spct, f.x, true)) {
        if (k >= 0) f.moveHits[k + 1] = m.frame + (mv.multi ?? 999);
        else f.moveHits.push(v.id, m.frame + (mv.multi ?? 999));
      }
    }
  }

  if (mv.id === 'zboom' && f.mf === activeEnd + 1) {
    f.hp = 0;
  }
  if (f.mf >= total || (mv.air && f.ground && f.mf > 2)) {
    if (f.mf === total && !f.moveHits.length && (mv.id === 'heavy' || mv.id.startsWith('fin'))) m.events.push({ t: 'whiff', who: f.id, heavy: true });
    f.move = null;
    f.st = f.ground ? 'idle' : 'air';
    f.sf = 0;
  }
}

function stepEffects(m: Match): void {
  const keep: Effect[] = [];
  for (const e of m.effects) {
    const owner = fighterById(m, e.owner);
    e.age++;
    // an owner who left the field or was knocked out takes their following effects along
    if (e.follow && owner && (!owner.onField || owner.down)) e.life = 0;
    if (e.follow && owner) {
      if (e.orbitR) {
        e.orbitA = (e.orbitA + e.orbitS) & 31;
        e.x = owner.x + Math.floor((SIN32[(e.orbitA + 8) & 31]! * e.orbitR) / 1000);
        e.y = owner.y - 8000 + Math.floor((SIN32[e.orbitA]! * e.orbitR) / 2000);
      } else {
        e.x = owner.x;
        e.y = owner.y;
      }
    }
    if (e.returnAt && e.age === e.returnAt) {
      e.vx = -e.vx;
      e.hits = [];
    }
    // the warning delay does not use up the effect's life (a delayed strike always lands)
    if (e.delay > 0) e.delay--;
    else {
      e.life--;
      e.x += e.vx;
      e.vy += e.gravity;
      e.y += e.vy;
      if (e.kind === 'proj' && !e.groundOnly && e.y >= 0 && (e.gravity || e.vy > 0)) e.life = 0;
      if (e.x < WALL_L - 4000 || e.x > WALL_R + 4000) e.life = 0;
    }
    if (e.life <= 0) continue;
    let alive = true;
    if (e.delay === 0 && owner) {
      const box = effectBox(e);
      // enemy walls stop projectiles
      if (e.kind === 'proj')
        for (const w of m.effects)
          if (w.blocksProj && w.team !== e.team && w.delay === 0 && overlap(box, effectBox(w))) {
            alive = false;
            m.events.push({ t: 'hit', x: e.x, y: e.y, dmg: 0, el: e.element, guarded: true, perfect: false, heavy: false, victim: 0, attacker: owner.id, strong: false });
          }
      const mv = moveDefOf(e.move);
      const hit = (mv.spawns?.[e.fxi] ?? mv.spawn)?.hit;
      if (alive && hit)
        for (const v of m.fighters) {
          if (v.team === e.team || !v.onField || v.down) continue;
          if (e.groundOnly && !v.ground) continue;
          const k = e.hits.indexOf(v.id);
          if (k >= 0 && (!e.rehit || m.frame < e.hits[k + 1]!)) continue;
          if (!overlap(box, hurtbox(v))) continue;
          const connected = applyHit(m, owner, v, hit, mv, e.dmgPct, e.statusPct, e.kind === 'zone' || e.kind === 'trap' ? e.x - e.face * 100 : e.x - e.vx, false);
          if (!connected) continue;
          if (k >= 0) e.hits[k + 1] = m.frame + (e.rehit || 99999);
          else e.hits.push(v.id, m.frame + (e.rehit || 99999));
          if (e.kind === 'trap' || (e.kind === 'proj' && !e.pierce)) alive = false;
        }
    }
    if (alive) keep.push(e);
  }
  m.effects = keep;
}

// ---- fighter update -------------------------------------------------------------------------------------------


function tryPower(m: Match, f: Fighter, slot: 0 | 1 | 2): boolean {
  if (f.spec.kind !== 'stick') return false;
  if (f.spec.ranks[slot]! <= 0) return false;
  const p = powersFor(f.spec.element, f.spec.archetype)[slot];
  const cost = Math.max(0, (p.mp ?? 0) - RANK_MP_OFF[f.spec.ranks[slot]!]!) * 10;
  if (f.mp < cost) return false;
  startMove(m, f, p.id);
  return true;
}

function swapOut(m: Match, f: Fighter): boolean {
  if (m.mode === 'training' && f.team === 1) return false;
  const t = m.teams[f.team];
  const other = t.members.map((id) => fighterById(m, id)!).find((o) => o && o.id !== f.id && !o.down);
  if (!other || m.mode === 'zombie' && f.team === 1) return false;
  f.st = 'swapout';
  f.sf = 0;
  f.move = null;
  f.vx = 0;
  return true;
}

function bringIn(m: Match, team: 0 | 1, from: Fighter): void {
  const t = m.teams[team];
  const idx = t.members.findIndex((id) => id !== from.id && !fighterById(m, id)!.down);
  if (idx < 0) return;
  const g = fighterById(m, t.members[idx]!)!;
  t.active = idx;
  from.onField = false;
  if (!from.down) from.st = 'bench';
  g.onField = true;
  g.x = from.x;
  g.y = from.down ? 0 : from.y;
  g.vx = 0;
  g.vy = 0;
  g.ground = g.y >= 0;
  g.st = 'swapin';
  g.sf = 0;
  g.invuln = 16;
  g.face = from.face;
  g.combo = 0;
  for (let i = 0; i < RECALL_F; i++) {
    g.hist[i * 2] = g.x;
    g.hist[i * 2 + 1] = g.y;
  }
  m.events.push({ t: 'swap', team, to: g.id });
}

function stepFighter(m: Match, f: Fighter, input: number): void {
  const prev = f.prevIn;
  f.prevIn = input;
  // buffer presses so a button pressed a few frames early still works
  const presses = input & ~prev & (IN.ATK | IN.HVY | IN.P1 | IN.P2 | IN.P3 | IN.SWAP | IN.DASH | IN.U);
  if (presses) {
    f.buf |= presses;
    f.bufT = BUF_F;
  } else if (f.bufT > 0 && --f.bufT === 0) f.buf = 0;

  if (f.hitstop > 0) {
    f.hitstop--;
    return;
  }
  f.sf++;
  if (f.invuln > 0) f.invuln--;
  if (f.pgBoost > 0) f.pgBoost--;
  if (f.buffT > 0 && --f.buffT === 0) f.buff = 0;
  if (f.counter > 0) f.counter--;
  if (f.st !== 'move') f.counter = 0;

  // statuses
  for (const s of STATUS_IDS) if (f.status[s] > 0) f.status[s]--;
  if (f.status.burn > 0 && f.status.burn % 30 === 0 && f.hp > 1) f.hp = Math.max(1, f.hp - 5);

  // recall history
  f.hist[(f.histI % RECALL_F) * 2] = f.x;
  f.hist[(f.histI % RECALL_F) * 2 + 1] = f.y;
  f.histI++;

  // MP and guard stamina
  if (m.phase === 'fight') {
    let regen = 1;
    if (f.spec.perks.includes('flow') && m.frame % 3 === 0) regen++;
    if (f.pgBoost > 0) regen++;
    if (m.mode === 'training') regen = 3;
    f.mp = Math.min(1000, f.mp + regen);
  }
  if (f.st !== 'guard' && m.frame - f.lastGuard > 40) f.gs = Math.min(1000, f.gs + 4);
  if (f.spec.element === 'leaf' && m.frame - f.lastHurt > 180 && m.frame % 20 === 0 && !f.down) f.hp = Math.min(f.hpMax, f.hp + 2);
  if (m.mode === 'training' && f.team === 1 && m.frame - f.lastHurt > 90) f.hp = f.hpMax;

  const slow = Math.floor(((f.status.slow > 0 ? 60 : 100) * (f.buff === 2 && f.buffT > 0 ? 130 : 100)) / 100);
  const speedPct = Math.floor(((100 + (f.spec.stats.speed - 100)) * slow) / 100);
  const rooted = f.status.root > 0 || f.status.freeze > 0;
  const dir = (input & IN.R ? 1 : 0) - (input & IN.L ? 1 : 0);
  const take = (bit: number) => {
    if (f.buf & bit) {
      f.buf &= ~bit;
      return true;
    }
    return false;
  };

  switch (f.st) {
    case 'ko':
      break;
    case 'swapout':
      if (f.sf >= 9) f.invuln = Math.max(f.invuln, 1);
      if (f.sf >= 16) bringIn(m, f.team, f);
      break;
    case 'swapin':
      if (f.sf >= 14) f.st = 'idle';
      break;
    case 'down':
      f.vx = Math.trunc((f.vx * 80) / 100);
      f.invuln = Math.max(f.invuln, 1);
      if (f.sf >= 34) {
        f.st = 'idle';
        f.invuln = 10;
        f.combo = 0;
      }
      break;
    case 'stun':
    case 'gbreak':
      if (f.ground) f.vx = Math.trunc((f.vx * 85) / 100);
      if (f.stun > 0) f.stun--;
      if (f.stun <= 0 && f.ground) {
        f.st = 'idle';
        f.combo = 0;
      }
      break;
    case 'move':
      stepMove(m, f);
      // combo chain and cancels (buffered)
      if (f.st === 'move' && f.move) {
        const mv = moveDefOf(f.move);
        const afterActive = f.mf > mv.startup;
        const seq = COMBOS[f.spec.comboLen]!;
        const isBasic = seq.includes(f.move) && !mv.air;
        const connected = f.moveHits.length > 0;
        if (afterActive && isBasic) {
          if (f.buf & IN.ATK && f.comboStep + 1 < seq.length) {
            take(IN.ATK);
            f.comboStep++;
            startMove(m, f, seq[f.comboStep]!);
          } else if (connected && take(IN.HVY)) startMove(m, f, 'heavy');
        }
        if (afterActive && connected && (isBasic || f.move === 'heavy') && f.st === 'move') {
          if (f.buf & IN.P1 && tryPower(m, f, 0)) take(IN.P1);
          else if (f.buf & IN.P2 && tryPower(m, f, 1)) take(IN.P2);
          else if (f.buf & IN.P3 && tryPower(m, f, 2)) take(IN.P3);
        }
      }
      break;
    case 'dash':
      if (f.sf <= 5) f.invuln = Math.max(f.invuln, 1);
      if (f.sf >= DASH_F) {
        f.st = f.ground ? 'idle' : 'air';
        f.vx = Math.trunc(f.vx / 3);
      }
      break;
    default: {
      // idle, walk, air, guard: the player is in control
      if (!f.onField) break;
      if (f.ground) {
        f.airJumps = f.spec.element === 'wind' ? 1 : 0;
        f.airDash = false;
      }
      const wantGuard = (input & IN.GRD) !== 0 && f.ground && f.spec.kind !== 'bomber';
      if (take(IN.SWAP) && f.ground && swapOut(m, f)) break;
      if (f.buf & IN.P1 && tryPower(m, f, 0)) {
        take(IN.P1);
        break;
      }
      if (f.buf & IN.P2 && tryPower(m, f, 1)) {
        take(IN.P2);
        break;
      }
      if (f.buf & IN.P3 && tryPower(m, f, 2)) {
        take(IN.P3);
        break;
      }
      if (take(IN.HVY)) {
        if (f.ground) {
          f.comboStep = 0;
          startMove(m, f, 'heavy');
          break;
        }
      }
      if (take(IN.ATK)) {
        f.comboStep = 0;
        startMove(m, f, f.ground ? COMBOS[f.spec.comboLen]![0]! : 'air');
        break;
      }
      if (take(IN.DASH) && !rooted && (f.ground || !f.airDash)) {
        if (!f.ground) f.airDash = true;
        const d = dir !== 0 ? dir : f.face;
        const v = f.spec.element === 'lightning' ? (DASH_V * 125) / 100 : DASH_V;
        f.vx = Math.floor((d * v * slow) / 100);
        if (!f.ground) f.vy = Math.min(f.vy, -200);
        f.st = 'dash';
        f.sf = 0;
        m.events.push({ t: 'dash', who: f.id });
        break;
      }
      if (wantGuard) {
        if (f.st !== 'guard') {
          f.guardSince = m.frame;
          f.st = 'guard';
        }
        f.lastGuard = m.frame;
        f.vx = 0;
        break;
      }
      if (f.st === 'guard') f.st = 'idle';
      if (take(IN.U) && !rooted) {
        if (f.ground) {
          f.vy = JUMP_V;
          f.ground = false;
          f.st = 'air';
          m.events.push({ t: 'jump', who: f.id });
        } else if (f.airJumps > 0) {
          f.airJumps--;
          f.vy = (JUMP_V * 85) / 100;
          m.events.push({ t: 'jump', who: f.id });
        }
      }
      const walk = Math.floor((WALK * speedPct) / 100);
      if (!rooted) {
        if (f.ground) {
          f.vx = dir * walk;
          f.st = dir !== 0 ? 'walk' : 'idle';
        } else {
          f.vx += dir * 90;
          if (f.vx > walk) f.vx = walk;
          if (f.vx < -walk) f.vx = -walk;
          f.st = 'air';
        }
      } else if (f.ground) {
        f.vx = 0;
        f.st = 'idle';
      }
    }
  }

  // physics
  if (!f.onField) return;
  const g = f.status.float > 0 ? 30 : GRAV;
  const dashing = f.st === 'dash' && f.sf < DASH_F - 3;
  if (!f.ground && !dashing) f.vy = Math.min(FALL_MAX, f.vy + g);
  f.x += f.vx;
  f.y += f.vy;
  if (f.y >= 0) {
    f.y = 0;
    if (!f.ground) {
      f.ground = true;
      f.vy = 0;
      m.events.push({ t: 'land', who: f.id });
      if (f.st === 'stun' && (f.stun > 0 || f.combo > 0) && f.status.freeze === 0) {
        // landed after a launch: knockdown
        f.st = 'down';
        f.sf = 0;
        f.stun = 0;
      } else if (f.st === 'air') f.st = 'idle';
    }
  } else if (f.ground && f.vy === 0 && f.y < 0) f.ground = false;
  if (f.x < WALL_L) {
    f.x = WALL_L;
    if (f.vx < 0) f.vx = 0;
  }
  if (f.x > WALL_R) {
    f.x = WALL_R;
    if (f.vx > 0) f.vx = 0;
  }
}

function faceEnemies(m: Match): void {
  for (const f of m.fighters) {
    if (!f.onField || f.down) continue;
    if (f.st === 'idle' || f.st === 'walk' || f.st === 'guard' || f.st === 'swapin' || (f.st === 'air' && f.sf < 2)) {
      const e = nearestEnemy(m, f);
      if (e && e.x !== f.x) f.face = e.x > f.x ? 1 : -1;
    }
  }
}

function pushApart(m: Match): void {
  const on = m.fighters.filter((f) => f.onField && !f.down && f.st !== 'swapout');
  for (let i = 0; i < on.length; i++)
    for (let j = i + 1; j < on.length; j++) {
      const a = on[i]!;
      const b = on[j]!;
      if (a.team === b.team && m.mode !== 'zombie') continue;
      if (a.team === b.team && a.team === 1) continue;
      if (a.invuln > 0 && a.st === 'dash') continue;
      if (b.invuln > 0 && b.st === 'dash') continue;
      const min = ((BODY_W * (scaleOf(a) + scaleOf(b))) / 200) * 100 * 0.8;
      const dx = b.x - a.x;
      if (Math.abs(dx) >= min || Math.abs(a.y - b.y) > 9000) continue;
      const push = Math.ceil((min - Math.abs(dx)) / 2);
      const s = dx === 0 ? (a.id < b.id ? 1 : -1) : Math.sign(dx);
      a.x -= s * push;
      b.x += s * push;
      a.x = Math.max(WALL_L, Math.min(WALL_R, a.x));
      b.x = Math.max(WALL_L, Math.min(WALL_R, b.x));
    }
}

// ---- KO, rounds, waves --------------------------------------------------------------------------------------

function checkKos(m: Match): void {
  for (const f of m.fighters) {
    if (f.down) {
      if (f.onField) {
        f.koT++;
        if (f.koT === 50 && m.phase === 'fight') {
          if (aliveMembers(m, f.team).length > 0 && !(m.mode === 'zombie' && f.team === 1)) bringIn(m, f.team, f);
        }
      }
      continue;
    }
    if (f.hp <= 0 && f.onField) {
      if (m.mode === 'training' && f.team === 1) {
        f.hp = f.hpMax;
        continue;
      }
      f.hp = 0;
      f.down = true;
      f.st = 'ko';
      f.move = null;
      f.koT = 0;
      f.invuln = 9999;
      f.vy = Math.min(f.vy, -700);
      f.ground = false;
      m.events.push({ t: 'ko', who: f.id });
      if (m.mode === 'zombie' && f.team === 1) {
        m.kills++;
        if (rnd(m) < 220) {
          const r = rnd(m);
          m.pickups.push({ id: m.nextId++, kind: r < 500 ? 'hp' : r < 850 ? 'mp' : 'boost', x: f.x, y: 0, life: 600 });
        }
      }
    }
  }
  if (m.mode === 'zombie') {
    // remove fallen zombies after their fall animation (keeps memory flat over long runs)
    const gone = new Set(m.fighters.filter((f) => f.team === 1 && f.down && f.koT > 70).map((f) => f.id));
    if (gone.size) {
      m.fighters = m.fighters.filter((f) => !gone.has(f.id));
      m.teams[1].members = m.teams[1].members.filter((id) => !gone.has(id));
    }
  }
}

function totalHpPct(m: Match, team: 0 | 1): number {
  let hp = 0;
  let max = 0;
  for (const id of m.teams[team].members) {
    const f = fighterById(m, id)!;
    hp += Math.max(0, f.hp);
    max += f.hpMax;
  }
  return max ? Math.floor((hp * 10000) / max) : 0;
}

function resetRound(m: Match): void {
  m.round++;
  m.phase = 'intro';
  m.pf = 0;
  m.timer = m.timerMax;
  m.effects = [];
  for (const team of [0, 1] as const) {
    const t = m.teams[team];
    t.active = 0;
    t.members.forEach((id, i) => {
      const f = fighterById(m, id)!;
      Object.assign(f, {
        x: team === 0 ? 38000 : 90000,
        y: 0,
        vx: 0,
        vy: 0,
        face: team === 0 ? 1 : -1,
        ground: true,
        hp: f.hpMax,
        mp: START_MP,
        gs: 1000,
        st: i === 0 ? 'idle' : 'bench',
        sf: 0,
        move: null,
        stun: 0,
        hitstop: 0,
        invuln: 0,
        armor: 0,
        combo: 0,
        status: emptyStatus(),
        barrier: 0,
        counter: 0,
        counterMove: null,
        buff: 0,
        buffT: 0,
        onField: i === 0,
        down: false,
        koT: 0,
        buf: 0,
        bufT: 0,
      });
    });
  }
}

const ZOMBIE_BASE_HP: Record<ZombieKind, number> = { walker: 150, runner: 100, spitter: 120, brute: 420, bomber: 80, shield: 230, boss: 1800 };

function zombieHp(kind: ZombieKind, wave: number, level: number): number {
  return Math.floor((ZOMBIE_BASE_HP[kind] * (100 + wave * 10 + level * 2)) / 100);
}

const ZOMBIE_ELEMENTS = ['fire', 'water', 'ice', 'lightning', 'wind', 'earth', 'leaf', 'light', 'gravity', 'time'] as const;

function spawnZombie(m: Match, kind: ZombieKind): void {
  const el = ZOMBIE_ELEMENTS[rnd(m) % 10]!;
  const lvl = Math.min(50, m.zombieLevel + Math.floor(m.wave / 2));
  const spec: FighterSpec = {
    name: kind,
    element: el,
    level: lvl,
    stats: { vit: 100, might: 90 + lvl, spirit: 90 + lvl, guard: 90 + lvl, resolve: 90 + lvl, speed: 100 },
    ranks: [0, 0, 0],
    comboLen: 3,
    pgWindow: 0,
    perks: [],
    kind,
    scale: kind === 'boss' ? 170 : kind === 'brute' ? 130 : kind === 'runner' ? 90 : 100,
  };
  const side = rnd(m) < 500 ? WALL_L + 2000 : WALL_R - 2000;
  const f = makeFighter(m, spec, 1, side, true);
  f.face = side < 64000 ? 1 : -1;
  f.ai = { seed: m.rng ^ (f.id * 31), next: 20 + (rnd(m) % 40), hold: 0, bits: 0, difficulty: 0 };
  f.invuln = 30;
  f.st = 'swapin';
  m.teams[1].members.push(f.id);
  m.events.push({ t: 'spawn', id: f.id });
}

function stepWaves(m: Match): void {
  const alive = m.fighters.filter((f) => f.team === 1 && !f.down).length;
  if (m.waveLeft === 0 && alive === 0) {
    m.spawnT++;
    if (m.spawnT >= 90) {
      m.wave++;
      const boss = m.wave % 10 === 0;
      m.waveLeft = Math.min(28, 3 + m.wave * 2);
      m.spawnT = 0;
      m.events.push({ t: 'wave', n: m.wave, boss });
      if (boss) {
        spawnZombie(m, 'boss');
        m.waveLeft = Math.max(2, m.waveLeft - 6);
      }
    }
    return;
  }
  const cap = Math.min(6, 2 + Math.floor(m.wave / 3));
  if (m.waveLeft > 0 && alive < cap && ++m.spawnT >= 55) {
    m.spawnT = 0;
    m.waveLeft--;
    const pool: ZombieKind[] = ['walker'];
    if (m.wave >= 2) pool.push('runner', 'walker');
    if (m.wave >= 3) pool.push('spitter');
    if (m.wave >= 4) pool.push('shield');
    if (m.wave >= 5) pool.push('brute');
    if (m.wave >= 6) pool.push('bomber');
    spawnZombie(m, pool[rnd(m) % pool.length]!);
  }
}

/** Zombie brains live inside the sim (deterministic). */
function zombieInput(m: Match, z: Fighter): number {
  const target = activeOf(m, 0);
  if (!target || target.down || !z.ai) return 0;
  const ai = z.ai;
  const dx = target.x - z.x;
  const dist = Math.abs(dx);
  const toward = dx > 0 ? IN.R : IN.L;
  const away = dx > 0 ? IN.L : IN.R;
  if (ai.next > 0) {
    ai.next--;
    return ai.bits & (IN.L | IN.R | IN.GRD);
  }
  const k = z.spec.kind as ZombieKind;
  let bits = 0;
  let wait = 8;
  const r = aiRnd(ai);
  switch (k) {
    case 'spitter':
      if (dist < 25000) bits = away;
      else if (dist > 50000) bits = toward;
      if (dist < 60000 && r < 350) {
        bits = IN.ATK;
        wait = 50;
      }
      break;
    case 'brute':
      bits = toward;
      if (dist < 11000 && r < 500) {
        bits = IN.ATK;
        wait = 40;
      }
      break;
    case 'bomber':
      bits = toward;
      if (dist < 7000) {
        bits = IN.ATK;
        wait = 60;
      }
      break;
    case 'shield':
      bits = toward;
      if (target.st === 'move' && dist < 16000 && r < 700) {
        bits = IN.GRD;
        wait = 20;
      } else if (dist < 8500 && r < 500) {
        bits = IN.ATK;
        wait = 30;
      }
      break;
    case 'boss':
      bits = toward;
      if (dist < 14000 && r < 450) {
        bits = IN.ATK;
        wait = 40;
      } else if (dist > 30000 && r < 250) {
        bits = IN.HVY;
        wait = 40;
      }
      break;
    default:
      bits = toward;
      if (dist < 8000 && r < 400) {
        bits = IN.ATK;
        wait = 26;
      }
  }
  ai.bits = bits;
  ai.next = wait;
  return bits;
}

/** Zombies use their own moves: ATK maps to the kind's attack, HVY to the boss's spit. */
function zombieAct(m: Match, z: Fighter, bits: number): number {
  if (!canAct(z) || z.st === 'air') return bits & (IN.L | IN.R | IN.GRD);
  const k = z.spec.kind;
  if (bits & IN.ATK) {
    const id = k === 'spitter' ? 'zspit' : k === 'brute' || k === 'boss' ? 'zslam' : k === 'bomber' ? 'zboom' : 'zbite';
    startMove(m, z, id);
    return 0;
  }
  if (bits & IN.HVY && k === 'boss') {
    startMove(m, z, 'zspit');
    return 0;
  }
  return bits & (IN.L | IN.R | IN.GRD);
}

function speedFor(f: Fighter): number {
  switch (f.spec.kind) {
    case 'runner':
      return 150;
    case 'walker':
    case 'shield':
      return 45;
    case 'brute':
    case 'boss':
      return 40;
    case 'bomber':
      return 120;
    case 'spitter':
      return 55;
    default:
      return 100;
  }
}

// ---- the step ---------------------------------------------------------------------------------------------------

/**
 * Advances one frame. `inputs[team]` is the input for that team's active fighter. Bot teams are driven by the
 * caller through botInput() (src/sim/ai.ts) so that a network peer can replace them with real inputs.
 */
export function step(m: Match, inA: number, inB: number): void {
  m.events = [];
  m.frame++;
  m.pf++;
  if (m.slowmo > 0) m.slowmo--;

  const fighting = m.phase === 'fight';
  if (m.phase === 'intro') {
    if (m.pf === 1) m.events.push({ t: 'round', n: m.round });
    if (m.pf >= INTRO_F) {
      m.phase = 'fight';
      m.pf = 0;
      m.events.push({ t: 'fight' });
    }
  }

  const a = activeOf(m, 0);
  const b = m.mode === 'zombie' ? undefined : activeOf(m, 1);
  for (const f of [...m.fighters]) {
    if (!f.onField) {
      // bench: slow regen of MP and a little HP
      if (!f.down && fighting && m.frame % 2 === 0) f.mp = Math.min(1000, f.mp + 2);
      if (!f.down && fighting && m.frame % 6 === 0) f.hp = Math.min(f.hpMax, f.hp + 1);
      continue;
    }
    let input = 0;
    if (fighting) {
      if (f === a) input = inA;
      else if (f === b) input = m.mode === 'training' ? trainingDummy(m, f, inB) : inB;
      else if (m.mode === 'zombie' && f.team === 1) input = zombieAct(m, f, zombieInput(m, f));
    }
    if (f.spec.kind !== 'stick' && (f.st === 'walk' || f.st === 'idle')) {
      stepFighter(m, f, input);
      if (f.st === 'walk') f.vx = Math.floor((f.vx * speedFor(f)) / 100);
    } else stepFighter(m, f, input);
  }
  stepEffects(m);
  faceEnemies(m);
  pushApart(m);
  checkKos(m);
  stepPickups(m);

  if (m.phase === 'fight') {
    if (m.mode === 'zombie') {
      stepWaves(m);
      if (aliveMembers(m, 0).length === 0) {
        m.phase = 'over';
        m.pf = 0;
        m.winner = 1;
        m.slowmo = 60;
        m.events.push({ t: 'matchEnd', winner: 1 });
      }
    } else if (m.mode === 'duel') {
      m.timer--;
      const aDown = aliveMembers(m, 0).length === 0;
      const bDown = aliveMembers(m, 1).length === 0;
      if (aDown || bDown || m.timer <= 0) {
        const timeout = !aDown && !bDown;
        let w = aDown && bDown ? 2 : aDown ? 1 : bDown ? 0 : -1;
        if (timeout) {
          const pa = totalHpPct(m, 0);
          const pb = totalHpPct(m, 1);
          w = pa > pb ? 0 : pb > pa ? 1 : 2;
        }
        m.roundWinner = w;
        if (w === 0 || w === 1) m.teams[w].wins++;
        m.phase = 'ko';
        m.pf = 0;
        m.slowmo = timeout ? 0 : 50;
        m.events.push({ t: 'roundEnd', winner: w, timeout });
      }
    }
  } else if (m.phase === 'ko' && m.pf >= KO_F) {
    m.phase = 'roundEnd';
    m.pf = 0;
    for (const t of [0, 1] as const) {
      const f = activeOf(m, t);
      if (f && !f.down && (m.roundWinner === t)) f.st = 'win';
    }
  } else if (m.phase === 'roundEnd' && m.pf >= ROUND_END_F) {
    const [ta, tb] = m.teams;
    if (ta.wins >= m.winsNeeded || tb.wins >= m.winsNeeded || m.round >= 5) {
      m.phase = 'over';
      m.pf = 0;
      m.winner = ta.wins > tb.wins ? 0 : tb.wins > ta.wins ? 1 : 2;
      m.events.push({ t: 'matchEnd', winner: m.winner });
    } else resetRound(m);
  }
}

function trainingDummy(m: Match, f: Fighter, botBits: number): number {
  switch (f.spec.dummy) {
    case 'guard':
      return IN.GRD;
    case 'jump':
      return m.frame % 70 < 2 ? IN.U : 0;
    case 'bot':
      return botBits;
    default:
      return 0;
  }
}

function stepPickups(m: Match): void {
  if (!m.pickups.length) return;
  const p0 = activeOf(m, 0);
  m.pickups = m.pickups.filter((p) => {
    p.life--;
    if (p0 && !p0.down && Math.abs(p0.x - p.x) < 4000 && p0.y > -6000) {
      if (p.kind === 'hp') p0.hp = Math.min(p0.hpMax, p0.hp + Math.floor(p0.hpMax / 6));
      else if (p.kind === 'mp') p0.mp = Math.min(1000, p0.mp + 400);
      else p0.barrier = 1;
      m.events.push({ t: 'pickup', who: p0.id, kind: p.kind });
      return false;
    }
    return p.life > 0;
  });
}

/** Revive the player's active avatar in Zombie Survival (rewarded ad). */
export function reviveTeam(m: Match): void {
  m.teams[0].members.forEach((id, i) => {
    const f = fighterById(m, id)!;
    Object.assign(f, { down: false, hp: Math.floor(f.hpMax / 2), st: i === 0 ? 'idle' : 'bench', invuln: 120, onField: false, koT: 0 });
  });
  const first = fighterById(m, m.teams[0].members[0]!)!;
  first.onField = true;
  m.teams[0].active = 0;
  m.phase = 'fight';
  m.winner = -1;
  m.pf = 0;
}

export const ELEMENT_INFO = ELEMENTS;
