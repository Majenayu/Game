/**
 * Ranked 1v1 duel engine: a side-view fighting game ("shadow fight" style) used only for ranked matches.
 * Two fighters on a flat stage with gravity. Walk, jump, block, a three-hit punch combo, kicks (standing,
 * flying and a low sweep), a strike with your weapon, plus five skills that use their real power.
 * Some skill kinds do not fit a side-view duel and are not allowed here (see DUEL_KINDS).
 * Best of three rounds. Deterministic given the rng, so the server and offline practice run the same code.
 */
import { HP_SCALE } from './constants';
import { CHARACTERS, WEAPONS, sanitizeLoadout } from './content';
import { MP_COST_SCALE, MP_REGEN, MAX_MP, dmgFromPower, neutralInstance, slotFromInstance, type SlotState } from './battle';
import { getSkill, rankOf, randomSkillOfRank } from './skills/generate';
import { RANKS, type Kind, type Rank } from './skills/catalog';
import type { SkillInstance } from './skills/instances';
import { playerLikeName, type PlayerInput, type Rng } from './util';

export const DUEL_W = 1600;
export const DUEL_H = 900;
export const DUEL_FLOOR = 760;
export const DUEL_ROUND_TIME = 60;
export const DUEL_ROUNDS_TO_WIN = 2;
export const DUEL_COUNTDOWN = 3;
export const DUEL_LOBBY = 25;
/** Skill kinds that work in the side-view duel. Summons, mines, stealth, portals, zones and world skills do not. */
export const DUEL_KINDS: Kind[] = ['projectile', 'beam', 'volley', 'cleave', 'nova', 'shield', 'heal', 'dash', 'blink', 'buff'];
export function duelUsable(skillId: number): boolean {
  return rankOf(skillId) !== null && DUEL_KINDS.includes(getSkill(skillId).kind);
}

const GRAVITY = 2600;
const JUMP_V = 1050;
const WALK = 330;
const HALF_W = 26;
/** Hitbox height; matches the drawn fighter (drawn at 1.35x scale). */
const HEIGHT = 210;
const WEAPON_CD = 1.1;

export interface Move {
  name: string;
  wind: number;
  active: number;
  recover: number;
  range: number;
  /** Damage in hearts per hit. */
  dmg: number;
  push: number;
  hits: number;
  /** Knocks the target down. */
  knock?: boolean;
  /** Ignores blocking. */
  unblockable?: boolean;
}
const M = (name: string, wind: number, active: number, recover: number, range: number, dmg: number, push: number, extra: Partial<Move> = {}): Move => ({
  name,
  wind,
  active,
  recover,
  range,
  dmg,
  push,
  hits: 1,
  ...extra,
});
/** Punch button: jab, cross, uppercut. */
export const PUNCHES: Move[] = [
  M('jab', 0.07, 0.09, 0.14, 95, 0.3, 50),
  M('cross', 0.08, 0.1, 0.17, 100, 0.38, 80),
  M('uppercut', 0.12, 0.12, 0.3, 105, 0.6, 260, { knock: true }),
];
export const KICK = M('kick', 0.11, 0.12, 0.26, 135, 0.55, 240);
export const FLYING_KICK = M('flying kick', 0.06, 0.2, 0.2, 150, 0.75, 360);
export const SWEEP = M('sweep', 0.1, 0.14, 0.3, 140, 0.45, 60, { knock: true });
/** One strike per main weapon (index = weapon id). */
export const WEAPON_MOVES: Move[] = [
  M('blade slash', 0.12, 0.14, 0.26, 165, 0.9, 260),
  M('scatter blast', 0.14, 0.1, 0.32, 190, 1.0, 460),
  M('rail thrust', 0.24, 0.1, 0.3, 245, 1.2, 300),
  M('buzz flurry', 0.06, 0.3, 0.2, 125, 0.3, 40, { hits: 3 }),
  M('mortar slam', 0.34, 0.14, 0.36, 160, 1.4, 420, { knock: true, unblockable: true }),
  M('twin strike', 0.08, 0.2, 0.22, 135, 0.5, 120, { hits: 2 }),
];

export type DuelPhase = 'lobby' | 'countdown' | 'fight' | 'roundEnd' | 'matchEnd';
export type DuelAct = 'idle' | 'walk' | 'jump' | 'block' | 'attack' | 'cast' | 'hurt' | 'down' | 'ko' | 'dash';
export interface Fighter {
  id: string;
  name: string;
  bot: boolean;
  color: number;
  charId: string;
  weapon: number;
  acc: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  mp: number;
  slots: SlotState[];
  act: DuelAct;
  actT: number;
  actEnd: number;
  move: Move | null;
  combo: number;
  comboUntil: number;
  hitsDone: number;
  weaponCdUntil: number;
  invulnUntil: number;
  buffUntil: number;
  stunUntil: number;
  wins: number;
  ready: boolean;
  /** Last skill cast (for the cast animation). */
  lastSkill: number;
  moveX: number;
  moveY: number;
  attack: boolean;
  attackHeld: boolean;
  pendingSkill: number;
  pendingMoves: number;
  seq: number;
}
export interface DuelShot {
  id: number;
  owner: string;
  skill: number;
  x: number;
  y: number;
  vx: number;
  r: number;
  dmg: number;
  ttl: number;
  color: number;
}
export type DuelEvent =
  | { t: 'hit'; id: string; by: string; x: number; y: number; dmg: number; blocked: boolean; move: string }
  | { t: 'move'; id: string; move: string; x: number; y: number; dir: number }
  | { t: 'skill'; id: string; skill: number; kind: string; x: number; y: number; dir: number; power: number }
  | { t: 'beam'; id: string; skill: number; x: number; y: number; dir: number; len: number }
  | { t: 'ko'; id: string; by: string }
  | { t: 'round'; round: number }
  | { t: 'roundEnd'; winner: string; round: number }
  | { t: 'matchEnd'; winner: string };

export interface DuelOpts {
  name: string;
  bot?: boolean;
  loadout?: unknown;
  instances?: SkillInstance[];
  level?: number;
  color?: number;
}

export class Duel {
  fighters: Fighter[] = [];
  shots: DuelShot[] = [];
  phase: DuelPhase = 'lobby';
  /** Seconds left in the current phase (lobby, countdown, round, pause). */
  timer = DUEL_LOBBY;
  round = 1;
  time = 0;
  winner = '';
  private events: DuelEvent[] = [];
  private nextId = 1;
  private bot = { nextThink: 0, nextSkill: 1 };
  constructor(
    private rng: Rng = Math.random,
    /** 0 (clumsy) to 1 (sharp) for the fill bot. */
    private botSkill = 0.5,
  ) {}

  drainEvents(): DuelEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  /** A random name that looks like a real player (ranked fill opponents). */
  randomName(): string {
    return playerLikeName(this.rng);
  }

  add(id: string, o: DuelOpts): Fighter | null {
    if (this.fighters.length >= 2) return null;
    const l = sanitizeLoadout(o.loadout ?? {});
    const ch = CHARACTERS[l.char];
    const level = Math.max(1, Math.min(50, Math.floor(o.level ?? 1)));
    const maxHp = Math.round(ch.hp * HP_SCALE * 1.5 * (1 + 0.02 * (level - 1)));
    let slots: SlotState[] = o.instances?.length
      ? o.instances.filter((i) => duelUsable(i.skillId)).slice(0, 5).map(slotFromInstance)
      : l.skillIds.filter(duelUsable).slice(0, 5).map((id) => slotFromInstance(neutralInstance(id)));
    if (o.bot || !slots.length) slots = duelKit(this.rng, o.bot ? this.botSkill : 0.3).map((id) => slotFromInstance(neutralInstance(id)));
    const side = this.fighters.length;
    const bot = !!o.bot;
    const f: Fighter = {
      id,
      name: o.name.slice(0, 16) || 'Fighter',
      bot,
      color: o.color ?? (side === 0 ? 0x4dd2ff : 0xff5e8a),
      charId: l.char,
      weapon: bot ? Math.floor(this.rng() * WEAPONS.length) : l.weapon,
      acc: bot ? Math.floor(this.rng() * 9) : l.acc,
      x: side === 0 ? 450 : DUEL_W - 450,
      y: DUEL_FLOOR,
      vx: 0,
      vy: 0,
      facing: side === 0 ? 1 : -1,
      hp: maxHp,
      maxHp,
      mp: MAX_MP,
      slots,
      act: 'idle',
      actT: 0,
      actEnd: 0,
      move: null,
      combo: 0,
      comboUntil: 0,
      hitsDone: 0,
      weaponCdUntil: 0,
      invulnUntil: 0,
      buffUntil: 0,
      stunUntil: 0,
      wins: 0,
      ready: bot,
      lastSkill: -1,
      moveX: 0,
      moveY: 0,
      attack: false,
      attackHeld: false,
      pendingSkill: 0,
      pendingMoves: 0,
      seq: 0,
    };
    this.fighters.push(f);
    return f;
  }
  remove(id: string): void {
    const i = this.fighters.findIndex((f) => f.id === id);
    if (i < 0) return;
    this.fighters.splice(i, 1);
    if (this.phase !== 'lobby' && this.phase !== 'matchEnd' && this.fighters.length === 1) {
      // The one who stays wins by forfeit.
      this.winner = this.fighters[0].id;
      this.phase = 'matchEnd';
      this.timer = 6;
      this.events.push({ t: 'matchEnd', winner: this.winner });
    }
  }
  get(id: string): Fighter | undefined {
    return this.fighters.find((f) => f.id === id);
  }
  confirm(id: string): void {
    const f = this.get(id);
    if (f) f.ready = true;
    if (this.phase === 'lobby' && this.fighters.length === 2 && this.fighters.every((x) => x.ready)) this.startCountdown();
  }
  input(id: string, inp: PlayerInput): void {
    const f = this.get(id);
    if (!f || f.bot) return;
    f.moveX = inp.moveX;
    f.moveY = inp.moveY;
    f.attack = inp.shooting;
    f.seq = inp.seq;
    f.pendingSkill |= inp.skill & 31;
    f.pendingMoves |= (inp.moves ?? 0) & 3;
  }

  private startCountdown(): void {
    this.phase = 'countdown';
    this.timer = DUEL_COUNTDOWN;
    this.events.push({ t: 'round', round: this.round });
    this.fighters.forEach((f, side) => {
      f.x = side === 0 ? 450 : DUEL_W - 450;
      f.y = DUEL_FLOOR;
      f.vx = f.vy = 0;
      f.facing = side === 0 ? 1 : -1;
      f.hp = f.maxHp;
      f.mp = MAX_MP;
      f.act = 'idle';
      f.move = null;
      f.combo = 0;
      f.invulnUntil = f.buffUntil = f.stunUntil = f.weaponCdUntil = 0;
      f.pendingMoves = f.pendingSkill = 0;
      for (const s of f.slots) s.cdUntil = 0;
    });
    this.shots = [];
  }

  step(dt: number): void {
    this.time += dt;
    this.timer -= dt;
    if (this.phase === 'lobby') {
      if (this.fighters.length === 2 && this.timer <= 0) this.startCountdown();
      if (this.fighters.length < 2) this.timer = Math.max(this.timer, 0);
      return;
    }
    if (this.phase === 'countdown') {
      if (this.timer <= 0) {
        this.phase = 'fight';
        this.timer = DUEL_ROUND_TIME;
      }
      return;
    }
    if (this.phase === 'roundEnd') {
      if (this.timer <= 0) {
        this.round += 1;
        this.startCountdown();
      }
      return;
    }
    if (this.phase === 'matchEnd') return;
    const [a, b] = this.fighters;
    if (!a || !b) return;
    for (const f of this.fighters) if (f.bot) this.think(f, f === a ? b : a);
    this.stepFighter(a, b, dt);
    this.stepFighter(b, a, dt);
    this.separate(a, b);
    this.stepShots(dt);
    if (a.hp <= 0 || b.hp <= 0 || this.timer <= 0) this.endRound();
  }

  private endRound(): void {
    const [a, b] = this.fighters;
    let w: Fighter;
    if (a.hp <= 0 && b.hp > 0) w = b;
    else if (b.hp <= 0 && a.hp > 0) w = a;
    else w = a.hp / a.maxHp >= b.hp / b.maxHp ? a : b;
    const l = w === a ? b : a;
    if (l.hp <= 0) {
      l.act = 'ko';
      this.events.push({ t: 'ko', id: l.id, by: w.id });
    }
    w.wins += 1;
    this.events.push({ t: 'roundEnd', winner: w.id, round: this.round });
    if (w.wins >= DUEL_ROUNDS_TO_WIN) {
      this.phase = 'matchEnd';
      this.winner = w.id;
      this.timer = 6;
      this.events.push({ t: 'matchEnd', winner: w.id });
    } else {
      this.phase = 'roundEnd';
      this.timer = 2.5;
    }
  }

  private dmgMul(f: Fighter): number {
    return this.time < f.buffUntil ? 1.5 : 1;
  }

  private hurt(v: Fighter, by: Fighter, hearts: number, push: number, move: string, knock = false, unblockable = false): void {
    if (v.hp <= 0 || this.time < v.invulnUntil || v.act === 'down') return;
    const blocked = !unblockable && v.act === 'block' && Math.sign(by.x - v.x) === v.facing;
    let dmg = Math.round(hearts * HP_SCALE * this.dmgMul(by));
    if (blocked) dmg = Math.round(dmg * 0.2);
    v.hp = Math.max(0, v.hp - Math.max(1, dmg));
    const dir = Math.sign(v.x - by.x) || by.facing;
    v.vx = dir * (blocked ? push * 0.3 : push);
    if (!blocked) {
      v.move = null;
      if (knock) {
        v.act = 'down';
        v.actT = 0;
        v.actEnd = 0.75;
        v.vy = -320;
      } else {
        v.act = 'hurt';
        v.actT = 0;
        v.actEnd = 0.22;
        if (push > 250) v.vy = -340;
      }
    }
    this.events.push({ t: 'hit', id: v.id, by: by.id, x: v.x, y: v.y - HEIGHT * 0.6, dmg, blocked, move });
  }

  private startMove(f: Fighter, m: Move): void {
    f.act = 'attack';
    f.move = m;
    f.actT = 0;
    f.actEnd = m.wind + m.active + m.recover;
    f.hitsDone = 0;
    this.events.push({ t: 'move', id: f.id, move: m.name, x: f.x, y: f.y - HEIGHT * 0.55, dir: f.facing });
  }

  private stepFighter(f: Fighter, o: Fighter, dt: number): void {
    f.mp = Math.min(MAX_MP, f.mp + MP_REGEN * dt);
    const ground = f.y >= DUEL_FLOOR - 0.5;
    if (f.act !== 'attack' && f.act !== 'dash' && f.act !== 'down') f.facing = o.x >= f.x ? 1 : -1;
    f.actT += dt;
    const busy = f.act === 'attack' || f.act === 'cast' || f.act === 'hurt' || f.act === 'dash' || f.act === 'down';
    if (busy && f.actT >= f.actEnd) {
      f.act = 'idle';
      f.move = null;
    }
    const stunned = this.time < f.stunUntil;
    const free = !stunned && (f.act === 'idle' || f.act === 'walk' || f.act === 'jump' || f.act === 'block');
    // skills
    if (f.pendingSkill && free) {
      for (let s = 0; s < f.slots.length; s++)
        if (f.pendingSkill & (1 << s)) {
          this.cast(f, o, s);
          break;
        }
    }
    f.pendingSkill = 0;
    // moves: weapon, kick, punch combo
    const pressed = f.attack && !f.attackHeld;
    f.attackHeld = f.attack;
    if (free && f.act !== 'cast') {
      if (f.pendingMoves & 2 && this.time >= f.weaponCdUntil) {
        f.weaponCdUntil = this.time + WEAPON_CD;
        this.startMove(f, WEAPON_MOVES[f.weapon] ?? WEAPON_MOVES[0]);
      } else if (f.pendingMoves & 1) {
        this.startMove(f, !ground ? FLYING_KICK : f.moveY > 0.5 ? SWEEP : KICK);
      } else if (pressed) {
        f.combo = this.time < f.comboUntil ? (f.combo + 1) % PUNCHES.length : 0;
        this.startMove(f, PUNCHES[f.combo]);
        f.comboUntil = this.time + f.actEnd + 0.35;
      }
    }
    f.pendingMoves = 0;
    if (f.act === 'attack' && f.move) {
      const m = f.move;
      if (f.actT >= m.wind && f.actT <= m.wind + m.active && f.hitsDone < m.hits) {
        const slice = m.active / m.hits;
        const due = Math.min(m.hits, Math.floor((f.actT - m.wind) / slice) + 1);
        if (due > f.hitsDone) {
          f.hitsDone = due;
          const reach = m.range + HALF_W;
          if (Math.abs(o.x - f.x) <= reach && Math.sign(o.x - f.x || f.facing) === f.facing && Math.abs(o.y - f.y) < HEIGHT)
            this.hurt(o, f, m.dmg, m.push, m.name, m.knock, m.unblockable);
        }
      }
      if (m === FLYING_KICK && f.actT < m.wind + m.active) f.vx = f.facing * 520;
    }
    // movement
    const canMove = !stunned && (f.act === 'idle' || f.act === 'walk' || f.act === 'jump' || f.act === 'block');
    if (canMove) {
      const wantBlock = f.moveY > 0.5 && ground;
      if (wantBlock) {
        f.act = 'block';
        f.vx = 0;
      } else {
        if (f.act === 'block') f.act = 'idle';
        const sp = WALK * CHARACTERS[f.charId].speed;
        f.vx = f.moveX * sp;
        if (f.moveY < -0.5 && ground) {
          f.vy = -JUMP_V;
          f.act = 'jump';
        } else if (ground) f.act = Math.abs(f.moveX) > 0.1 ? 'walk' : 'idle';
      }
    } else if (f.act === 'hurt' || f.act === 'ko' || f.act === 'down') f.vx *= Math.pow(0.02, dt);
    else if (f.act !== 'dash' && f.move !== FLYING_KICK) f.vx *= Math.pow(0.001, dt);
    f.vy += GRAVITY * dt;
    f.x = Math.max(HALF_W + 10, Math.min(DUEL_W - HALF_W - 10, f.x + f.vx * dt));
    f.y += f.vy * dt;
    if (f.y >= DUEL_FLOOR) {
      f.y = DUEL_FLOOR;
      f.vy = 0;
      if (f.act === 'jump') f.act = 'idle';
    }
  }

  private separate(a: Fighter, b: Fighter): void {
    const d = b.x - a.x;
    const min = HALF_W * 2;
    if (Math.abs(d) < min && Math.abs(a.y - b.y) < HEIGHT * 0.7) {
      const push = (min - Math.abs(d)) / 2;
      const s = Math.sign(d) || 1;
      a.x = Math.max(HALF_W, a.x - s * push);
      b.x = Math.min(DUEL_W - HALF_W, b.x + s * push);
    }
  }

  private cast(f: Fighter, o: Fighter, slot: number): void {
    const s = f.slots[slot];
    if (!s || !DUEL_KINDS.includes(s.kind) || this.time < s.cdUntil) return;
    const cost = s.stats.mp * MP_COST_SCALE;
    if (f.mp < cost) return;
    f.mp -= cost;
    s.cdUntil = this.time + s.stats.cooldown;
    // Higher ranks and levels hit harder: damage follows the skill's real power.
    const rankBoost = 1 + RANKS.indexOf(s.rank) * 0.08;
    const hearts = dmgFromPower(s.stats.power) * 1.2 * rankBoost;
    const dir = f.facing;
    f.lastSkill = s.skillId;
    this.events.push({ t: 'skill', id: f.id, skill: s.skillId, kind: s.kind, x: f.x, y: f.y - HEIGHT * 0.6, dir, power: s.stats.power });
    f.act = 'cast';
    f.actT = 0;
    f.actEnd = 0.28;
    switch (s.kind) {
      case 'projectile':
      case 'volley': {
        const n = s.kind === 'volley' ? 3 : 1 + Math.min(1, s.stats.count);
        for (let i = 0; i < n; i++)
          this.shots.push({
            id: this.nextId++,
            owner: f.id,
            skill: s.skillId,
            x: f.x + dir * 40,
            y: f.y - HEIGHT * (0.62 + 0.1 * (i - (n - 1) / 2)),
            vx: dir * (900 + i * 60),
            r: 12 + RANKS.indexOf(s.rank) * 2,
            dmg: s.kind === 'volley' ? hearts * 0.6 : hearts,
            ttl: Math.min(2, s.stats.range / 700 + 0.6),
            color: 0xffffff,
          });
        break;
      }
      case 'beam': {
        const len = Math.max(400, s.stats.range);
        this.events.push({ t: 'beam', id: f.id, skill: s.skillId, x: f.x, y: f.y - HEIGHT * 0.55, dir, len });
        if (Math.sign(o.x - f.x) === dir && Math.abs(o.x - f.x) <= len && Math.abs(o.y - f.y) < HEIGHT) this.hurt(o, f, hearts, 120, 'beam');
        break;
      }
      case 'cleave':
        if (Math.abs(o.x - f.x) <= 190 && Math.sign(o.x - f.x) === dir) this.hurt(o, f, hearts * 1.3, 420, 'cleave', true);
        break;
      case 'nova':
        if (Math.hypot(o.x - f.x, o.y - f.y) <= 260) this.hurt(o, f, hearts, 360, 'nova');
        break;
      case 'shield':
        f.invulnUntil = this.time + Math.max(1.2, Math.min(3, s.stats.duration));
        break;
      case 'heal':
        f.hp = Math.min(f.maxHp, f.hp + Math.round(f.maxHp * (0.12 + RANKS.indexOf(s.rank) * 0.015)));
        break;
      case 'dash':
        f.act = 'dash';
        f.actEnd = 0.25;
        f.vx = dir * 1500;
        f.invulnUntil = this.time + 0.25;
        break;
      case 'blink':
        f.x = Math.max(HALF_W + 10, Math.min(DUEL_W - HALF_W - 10, o.x - o.facing * 90));
        f.facing = o.x >= f.x ? 1 : -1;
        break;
      case 'buff':
        f.buffUntil = this.time + Math.max(4, Math.min(8, s.stats.duration));
        break;
      default:
        break;
    }
  }

  private stepShots(dt: number): void {
    const keep: DuelShot[] = [];
    for (const sh of this.shots) {
      sh.x += sh.vx * dt;
      sh.ttl -= dt;
      if (sh.ttl <= 0 || sh.x < 0 || sh.x > DUEL_W) continue;
      const owner = this.get(sh.owner);
      const o = this.fighters.find((f) => f.id !== sh.owner);
      if (owner && o && o.act !== 'down' && Math.abs(o.x - sh.x) < HALF_W + sh.r && sh.y > o.y - HEIGHT && sh.y < o.y + 4) {
        this.hurt(o, owner, sh.dmg, 160, 'shot');
        continue;
      }
      keep.push(sh);
    }
    this.shots = keep;
  }

  /** Fighting bot: closes in, chains punches and kicks, uses its weapon, blocks some hits, casts skills. */
  private think(f: Fighter, o: Fighter): void {
    const br = this.bot;
    const sk = this.botSkill;
    if (this.time < br.nextThink) return;
    br.nextThink = this.time + 0.12 + (1 - sk) * 0.18;
    const d = o.x - f.x;
    const dist = Math.abs(d);
    const threatened = o.act === 'attack' && dist < 180;
    f.moveY = threatened && this.rng() < 0.25 + sk * 0.4 ? 1 : 0;
    f.moveX = dist > 120 ? Math.sign(d) : dist < 60 ? -Math.sign(d) * 0.6 : 0;
    if (this.rng() < 0.04) f.moveY = -1;
    const r = this.rng();
    f.attack = false;
    if (dist < 130 && f.moveY <= 0) {
      if (r < 0.15) f.pendingMoves |= 1;
      else if (r < 0.25) f.pendingMoves |= 2;
      else f.attack = r < 0.55 + sk * 0.35;
    } else if (dist < 240 && r < 0.12) f.pendingMoves |= 2;
    if (this.time >= br.nextSkill) {
      br.nextSkill = this.time + 2.2 + (1 - sk) * 2.5 + this.rng() * 1.5;
      const ready = f.slots.map((s, i) => ({ s, i })).filter(({ s }) => this.time >= s.cdUntil && f.mp >= s.stats.mp * MP_COST_SCALE);
      const pick =
        (f.hp < f.maxHp * 0.35 && ready.find(({ s }) => s.kind === 'heal' || s.kind === 'shield')) ||
        (dist < 170 && ready.find(({ s }) => s.kind === 'cleave' || s.kind === 'nova')) ||
        (dist > 250 && ready.find(({ s }) => s.kind === 'projectile' || s.kind === 'beam' || s.kind === 'volley' || s.kind === 'dash' || s.kind === 'blink')) ||
        ready.find(({ s }) => s.kind === 'buff');
      if (pick) f.pendingSkill |= 1 << pick.i;
    }
  }
}

/** Five duel-legal skills for a bot or an empty loadout. */
export function duelKit(rng: Rng, skill: number): number[] {
  const ranks: Rank[] = ['F', 'E', 'D', 'C', 'B', 'A'];
  const r = ranks[Math.max(0, Math.min(5, Math.round(skill * 5)))];
  const wants: Kind[][] = [['projectile', 'beam'], ['cleave', 'nova'], ['shield', 'heal'], ['dash', 'blink'], ['volley', 'buff']];
  return wants.map((k) => {
    for (let t = 0; t < 400; t++) {
      const id = randomSkillOfRank(r, rng);
      if (k.includes(getSkill(id).kind)) return id;
    }
    return randomSkillOfRank(r, rng);
  });
}

export interface FighterView {
  id: string;
  name: string;
  bot: boolean;
  color: number;
  char: string;
  weapon: number;
  acc: number;
  x: number;
  y: number;
  facing: number;
  hp: number;
  maxHp: number;
  mp: number;
  act: string;
  actT: number;
  /** Name of the move in progress ('' when none). */
  move: string;
  combo: number;
  wins: number;
  ready: boolean;
  shield: boolean;
  buff: boolean;
  skills: string;
  cds: string;
  /** Seconds until the weapon strike is ready. */
  wcd: number;
  lastSkill: number;
}
export function fighterView(f: Fighter, d: Duel): FighterView {
  return {
    id: f.id,
    name: f.name,
    bot: f.bot,
    color: f.color,
    char: f.charId,
    weapon: f.weapon,
    acc: f.acc,
    x: f.x,
    y: f.y,
    facing: f.facing,
    hp: f.hp,
    maxHp: f.maxHp,
    mp: Math.round(f.mp),
    act: f.act,
    actT: f.actT,
    move: f.move?.name ?? '',
    combo: f.combo,
    wins: f.wins,
    ready: f.ready,
    shield: d.time < f.invulnUntil,
    buff: d.time < f.buffUntil,
    skills: f.slots.map((s) => s.skillId).join(','),
    cds: f.slots.map((s) => `${Math.max(0, s.cdUntil - d.time).toFixed(1)}:${s.stats.cooldown.toFixed(1)}`).join(','),
    wcd: Math.max(0, Math.round((f.weaponCdUntil - d.time) * 10) / 10),
    lastSkill: f.lastSkill,
  };
}
