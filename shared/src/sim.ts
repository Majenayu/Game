import {
  BULLET_RADIUS,
  BULLET_SPEED,
  BULLET_TTL,
  FIRE_INTERVAL,
  INVULN_TIME,
  MAX_PLAYERS,
  PICKUP_RADIUS,
  PLAYER_COLORS,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  RESPAWN_DELAY,
  SCOREBOARD_TIME,
  WORLD_H,
  WORLD_W,
} from './constants';
import {
  BULLET_FX,
  WEAPONS,
  CHARACTERS,
  CHARACTER_LIST,
  MODES,
  powerupId,
  powerupStats,
  rollPowerup,
  sanitizeLoadout,
  type EffectId,
  type ModeId,
  type PowerupDef,
} from './content';
import {
  BUFF_BY_ARCHETYPE,
  MAX_MP,
  MAX_PETS,
  MP_REGEN,
  botKit,
  defaultKit,
  dmgFromPower,
  elementStatus,
  neutralInstance,
  slotFromInstance,
  type SimPet,
  type SimZone,
  type SlotState,
} from './battle';
import { ARCHETYPES, ELEMENTS, RANKS, type Kind } from './skills/catalog';
import { ROTATION, getMap, type MapDef } from './maps';
import type { SkillInstance } from './skills/instances';
import { findPath, getNav, segmentClear } from './nav';
import {
  circlesOverlap,
  movePlayer,
  normalizeAngle,
  pointInRect,
  sanitizeNick,
  segmentBlocked,
  type PlayerInput,
  type Rng,
} from './util';

export type Phase = 'play' | 'scoreboard';

export interface SimConfig {
  /** A fixed mode, or 'mix' to rotate modes every round (Quick Play). */
  mode: ModeId | 'mix';
  /** A fixed map, or 'rotate' to change maps every round. */
  mapId: string;
  seats: number;
  /** 0 (clumsy bots) to 1 (sharp bots). */
  botSkill: number;
  /** Start the next round automatically after the scoreboard. */
  autoRestart: boolean;
  /** Add one boss bot. */
  boss: boolean;
  roundTime?: number;
  /** Boss name, max HP, colour and skill ids (Boss Tower). Defaults: Overlord, 12 HP, unique boss kit. */
  bossName?: string;
  bossHp?: number;
  bossColor?: number;
  bossKit?: number[];
  /** Seconds of "3, 2, 1, GO" freeze at the start of every round. 0 = start at once (tests). */
  countdown?: number;
  /** Training ground: bots are harmless dummies, your mana refills fast and you cannot be knocked out. */
  training?: boolean;
}

export const DEFAULT_CONFIG: SimConfig = {
  mode: 'dm',
  mapId: 'neon',
  seats: MAX_PLAYERS,
  botSkill: 0.5,
  autoRestart: true,
  boss: false,
};

export interface ActiveEffect {
  effect: EffectId;
  rarity: number;
  until: number;
  power: number;
}

export interface SimPlayer {
  id: string;
  name: string;
  bot: boolean;
  boss: boolean;
  color: number;
  charId: string;
  /** Equipped skills (up to five). */
  slots: SlotState[];
  mp: number;
  maxMp: number;
  /** Sim time when a skill being cast resolves, or -1 when not casting. */
  castAt: number;
  castSlot: number;
  hiddenUntil: number;
  dotUntil: number;
  dotBy: string;
  nextDot: number;
  trail: number;
  bfx: number;
  team: number;
  x: number;
  y: number;
  aim: number;
  hp: number;
  maxHp: number;
  kills: number;
  deaths: number;
  score: number;
  alive: boolean;
  invulnUntil: number;
  respawnAt: number;
  nextShot: number;
  moveX: number;
  moveY: number;
  shooting: boolean;
  seq: number;
  pendingSkill: number;
  effects: ActiveEffect[];
  shieldHits: number;
  slowUntil: number;
  dashUntil: number;
  dashX: number;
  dashY: number;
  dashSpeed: number;
  nextRegen: number;
  nextHazard: number;
  holdAcc: number;
  /** Main weapon (WEAPONS) and accessory (ACCESSORIES). */
  weapon: number;
  acc: number;
  /** Frozen and safe until this time (waiting in the lobby or for the countdown). */
  holdUntil: number;
}

export interface SimBullet {
  id: number;
  owner: string;
  team: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
  r: number;
  dmg: number;
  pierce: number;
  bounce: number;
  freeze: boolean;
  hit: string[];
  kind: number;
  /** Element status applied on hit (burn, slow, knockback, ...). */
  status: string;
  homing: boolean;
}

export interface SimPickup {
  id: number;
  x: number;
  y: number;
  pu: PowerupDef;
}

export interface SimCoin {
  id: number;
  x: number;
  y: number;
  v: number;
}

export interface SimMine {
  id: number;
  owner: string;
  team: number;
  x: number;
  y: number;
  armedAt: number;
  expires: number;
  dmg: number;
  r: number;
}

export type SimEvent =
  | { t: 'hit'; id: string; by: string; x: number; y: number }
  | { t: 'kill'; id: string; by: string; x: number; y: number }
  | { t: 'respawn'; id: string; x: number; y: number }
  | { t: 'pickup'; id: string; pu: number; x: number; y: number }
  | { t: 'coin'; id: string; v: number; x: number; y: number }
  | { t: 'cast'; id: string; skill: number; x: number; y: number; time: number }
  | { t: 'skill'; id: string; skill: number; kind: string; element: number; x: number; y: number }
  | { t: 'beam'; id: string; x: number; y: number; angle: number; len: number; element: number }
  | { t: 'swing'; id: string; x: number; y: number; angle: number; r: number; element: number }
  | { t: 'shield'; id: string; x: number; y: number }
  | { t: 'boom'; x: number; y: number }
  | { t: 'roundStart'; round: number; mode: ModeId; map: string }
  | { t: 'roundEnd'; winner: string; team: number };

interface BotBrain {
  nextThink: number;
  wanderX: number;
  wanderY: number;
  wanderUntil: number;
  strafe: number;
  aimErr: number;
  targetId: string | null;
  path: Array<{ x: number; y: number }>;
  pathGoalX: number;
  pathGoalY: number;
  repathAt: number;
  lastX: number;
  lastY: number;
  lastCheck: number;
  unstuckUntil: number;
  nextCast: number;
}

const BOT_NAMES = [
  'Bolt',
  'Pip',
  'Nova',
  'Zed',
  'Echo',
  'Dot',
  'Spark',
  'Mochi',
  'Orbit',
  'Ping',
  'Juno',
  'Kiwi',
];
export const TEAM_NAMES = ['Blue Team', 'Red Team'];
export const TEAM_COLORS = [0x2979ff, 0xff1744];

const COIN_TARGET = 22;
const COIN_RADIUS = 12;
const MINE_TRIGGER = 38;
const HAZARD_INTERVAL = 1.5;
const DASH_TIME = 0.18;
const DASH_SPEED = 900;
const MAX_EFFECTS = 4;

export interface PlayerOpts {
  charId?: string;
  /** Skill ids with neutral stats (bots, online beta). Ignored when `instances` is given. */
  skillIds?: number[];
  /** Owned skill instances with real levels, rolls and mastery (offline play). */
  instances?: SkillInstance[];
  color?: number;
  trail?: number;
  bfx?: number;
  weapon?: number;
  acc?: number;
  boss?: boolean;
}

export class Sim {
  players = new Map<string, SimPlayer>();
  bullets: SimBullet[] = [];
  pickups: SimPickup[] = [];
  coins: SimCoin[] = [];
  mines: SimMine[] = [];
  zones: SimZone[] = [];
  pets: SimPet[] = [];
  phase: Phase = 'play';
  timeLeft = 0;
  round = 1;
  winnerName = '';
  winnerTeam = -1;
  time = 0;
  events: SimEvent[] = [];
  mode: ModeId;
  map: MapDef;
  teamScore: [number, number] = [0, 0];
  /** Player id holding the hill, '*' when contested, '' when empty. */
  hillHolder = '';
  cfg: SimConfig;

  private brains = new Map<string, BotBrain>();
  private nextId = 1;
  private nextBot = 1;
  private pickupTimer = 6;
  private coinTimer = 0;
  private scoreboardLeft = 0;
  private rotIdx = 0;
  private bossMade = false;
  /** Everyone is frozen until this time (lobby and round countdown). */
  freezeUntil = 0;

  constructor(
    private rng: Rng = Math.random,
    config: Partial<SimConfig> = {},
  ) {
    this.cfg = { ...DEFAULT_CONFIG, ...config };
    const first = this.pickNext(true);
    this.mode = first.mode;
    this.map = getMap(first.map);
    this.timeLeft = this.roundLength();
  }

  get humanCount(): number {
    let n = 0;
    for (const p of this.players.values()) if (!p.bot) n++;
    return n;
  }

  get botCount(): number {
    return this.players.size - this.humanCount;
  }

  drainEvents(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  private roundLength(): number {
    return this.cfg.roundTime ?? MODES[this.mode].roundTime;
  }

  private pickNext(initial = false): { mode: ModeId; map: string } {
    const rotating = this.cfg.mode === 'mix' || this.cfg.mapId === 'rotate';
    if (!rotating) return { mode: this.cfg.mode as ModeId, map: this.cfg.mapId };
    const r = ROTATION[(initial ? 0 : this.rotIdx++ + 1) % ROTATION.length];
    if (initial) this.rotIdx = 0;
    return {
      mode: this.cfg.mode === 'mix' ? r.mode : this.cfg.mode,
      map: this.cfg.mapId === 'rotate' ? r.map : this.cfg.mapId,
    };
  }

  // ---- players ------------------------------------------------------------

  addPlayer(id: string, name: unknown, bot = false, opts: PlayerOpts = {}): SimPlayer {
    const load = sanitizeLoadout({
      char: opts.charId,
      skillIds: opts.skillIds ?? [],
      color: 0,
      trail: opts.trail,
      bfx: opts.bfx,
      weapon: opts.weapon,
      acc: opts.acc,
    });
    const ch = CHARACTERS[load.char];
    const used = new Set<number>();
    for (const p of this.players.values()) used.add(p.color);
    let color = opts.color;
    if (color === undefined)
      color =
        PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[this.players.size % PLAYER_COLORS.length];
    const boss = opts.boss === true;
    const maxHp = boss ? Math.max(1, Math.min(60, this.cfg.bossHp ?? 12)) : ch.hp;
    const team = MODES[this.mode].team ? this.smallerTeam() : 0;
    const spot = this.pickSpawn(undefined, true, MODES[this.mode].team ? team : -1);
    const p: SimPlayer = {
      id,
      name: sanitizeNick(name, this.rng),
      bot,
      boss,
      color,
      charId: load.char,
      slots: this.buildSlots(opts, load.skillIds, bot || opts.boss === true),
      mp: MAX_MP,
      maxMp: MAX_MP,
      castAt: -1,
      castSlot: 0,
      hiddenUntil: 0,
      dotUntil: 0,
      dotBy: '',
      nextDot: 0,
      trail: load.trail,
      bfx: load.bfx,
      team,
      x: spot.x,
      y: spot.y,
      aim: 0,
      hp: maxHp,
      maxHp,
      kills: 0,
      deaths: 0,
      score: 0,
      alive: this.phase === 'play',
      invulnUntil: this.time + INVULN_TIME,
      respawnAt: 0,
      nextShot: 0,
      moveX: 0,
      moveY: 0,
      shooting: false,
      seq: 0,
      pendingSkill: 0,
      effects: [],
      shieldHits: 0,
      slowUntil: 0,
      dashUntil: 0,
      dashX: 0,
      dashY: 0,
      dashSpeed: DASH_SPEED,
      nextRegen: this.time + (ch.regen || 0),
      nextHazard: 0,
      holdAcc: 0,
      weapon: load.weapon,
      acc: load.acc,
      holdUntil: 0,
    };
    if (boss) p.charId = 'titan';
    this.players.set(id, p);
    if (bot) this.brains.set(id, this.newBrain());
    return p;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
    this.brains.delete(id);
    this.bullets = this.bullets.filter((b) => b.owner !== id);
    this.mines = this.mines.filter((m) => m.owner !== id);
    this.balanceTeams();
  }

  private smallerTeam(): number {
    let a = 0;
    let b = 0;
    for (const p of this.players.values()) {
      if (p.team === 0) a++;
      else b++;
    }
    return a <= b ? 0 : 1;
  }

  /** Moves bots between teams so the sides differ by at most one. */
  private balanceTeams(): void {
    if (!MODES[this.mode].team) return;
    for (let i = 0; i < 8; i++) {
      const t: [SimPlayer[], SimPlayer[]] = [[], []];
      for (const p of this.players.values()) t[p.team === 0 ? 0 : 1].push(p);
      const big = t[0].length > t[1].length ? 0 : 1;
      if (Math.abs(t[0].length - t[1].length) <= 1) return;
      const bot = t[big].find((p) => p.bot);
      if (!bot) return;
      bot.team = big === 0 ? 1 : 0;
    }
  }

  /** Keeps total seats filled: bots fill whatever humans do not use. */
  rebalanceBots(): void {
    const want = Math.max(0, this.cfg.seats - this.humanCount);
    while (this.botCount > want) {
      let victim: string | null = null;
      for (const p of this.players.values()) if (p.bot && !p.boss) victim = p.id;
      if (!victim) for (const p of this.players.values()) if (p.bot) victim = p.id;
      if (!victim) break;
      this.removePlayer(victim);
    }
    while (this.botCount < want) {
      const taken = new Set(Array.from(this.players.values()).map((p) => p.name));
      let name = BOT_NAMES[(this.nextBot++ - 1) % BOT_NAMES.length];
      if (taken.has(name)) name = `${name}${this.nextBot}`;
      const boss = this.cfg.boss && !this.bossMade;
      if (boss) {
        this.bossMade = true;
        name = this.cfg.bossName ?? 'Overlord';
      }
      const ch = CHARACTER_LIST[Math.floor(this.rng() * CHARACTER_LIST.length)];
      const made = this.addPlayer(`bot_${this.nextId++}`, name, true, {
        charId: ch.id,
        color: boss ? this.cfg.bossColor : undefined,
        skillIds: boss && this.cfg.bossKit?.length ? this.cfg.bossKit : botKit(this.rng, this.cfg.botSkill, boss),
        trail: Math.floor(this.rng() * 3),
        bfx: Math.floor(this.rng() * BULLET_FX.length),
        boss,
      });
      // Boss names come from trusted config and may be longer than a player nickname.
      if (boss) made.name = name;
    }
    this.balanceTeams();
  }

  applyInput(id: string, input: PlayerInput): void {
    const p = this.players.get(id);
    if (!p || p.bot) return;
    p.moveX = input.moveX;
    p.moveY = input.moveY;
    p.aim = input.aim;
    p.shooting = input.shooting;
    p.seq = input.seq;
    p.pendingSkill |= input.skill & 31;
  }

  /** Builds equipped skill slots from instances, ids, or the default kit. Bots and bosses skip sanitizing. */
  private buildSlots(opts: PlayerOpts, ids: number[], trusted: boolean): SlotState[] {
    if (opts.instances && opts.instances.length) return opts.instances.slice(0, 5).map(slotFromInstance);
    const list = trusted && opts.skillIds ? opts.skillIds.slice(0, 5) : ids.length ? ids : defaultKit();
    return list.map((id) => slotFromInstance(neutralInstance(id)));
  }

  /** Applies a validated loadout to a human player (used on join). */
  setLoadout(id: string, raw: unknown): void {
    const p = this.players.get(id);
    if (!p || p.bot) return;
    const l = sanitizeLoadout(raw);
    const ch = CHARACTERS[l.char];
    p.charId = l.char;
    p.slots = (l.skillIds.length ? l.skillIds : defaultKit()).map((id) =>
      slotFromInstance(neutralInstance(id)),
    );
    p.trail = l.trail;
    p.bfx = l.bfx;
    p.weapon = l.weapon;
    p.acc = l.acc;
    p.maxHp = ch.hp;
    p.hp = ch.hp;
    p.nextRegen = this.time + (ch.regen || 0);
  }

  // ---- derived stats ------------------------------------------------------

  private eff(p: SimPlayer, id: EffectId): ActiveEffect | undefined {
    return p.effects.find((e) => e.effect === id && e.until > this.time);
  }

  speedMul(p: SimPlayer): number {
    let m = CHARACTERS[p.charId].speed;
    const sp = this.eff(p, 'speed');
    if (sp) m *= 1 + 0.35 * sp.power;
    if (this.time < p.slowUntil) m *= 0.6;
    if (p.castAt >= 0) m *= 0.5;
    // Bots move a little slower than people so fights feel fair; training dummies barely move.
    if (p.bot && !p.boss) m *= this.cfg.training ? 0.35 : 0.85;
    return m;
  }

  private isEnemy(a: SimPlayer, b: SimPlayer): boolean {
    return a.id !== b.id && (!MODES[this.mode].team || a.team !== b.team);
  }

  // ---- main step ----------------------------------------------------------

  step(dt: number): void {
    this.time += dt;
    if (this.phase === 'scoreboard') {
      this.scoreboardLeft -= dt;
      if (this.scoreboardLeft <= 0 && this.cfg.autoRestart) this.startRound();
      return;
    }
    const frozenAll = this.time < this.freezeUntil;
    if (!frozenAll) this.timeLeft -= dt;

    for (const p of this.players.values()) {
      if (p.bot) this.thinkBot(p);
      if (!p.alive) {
        if (this.time >= p.respawnAt) this.respawn(p);
        continue;
      }
      p.effects = p.effects.filter((e) => e.until > this.time);
      const ch = CHARACTERS[p.charId];
      if (ch.regen > 0 && this.time >= p.nextRegen) {
        p.nextRegen = this.time + ch.regen;
        if (p.hp < p.maxHp) p.hp += 1;
      }
      p.mp = Math.min(p.maxMp, p.mp + MP_REGEN * dt * (this.cfg.training && !p.bot ? 5 : 1));
      if (frozenAll || this.time < p.holdUntil) {
        p.pendingSkill = 0;
        continue;
      }
      if (this.time < p.dotUntil && this.time >= p.nextDot) {
        p.nextDot = this.time + 1;
        this.hurt(p, p.dotBy, 1);
        if (!p.alive) continue;
      }
      if (p.castAt >= 0 && this.time >= p.castAt) {
        p.castAt = -1;
        this.resolveCast(p, p.slots[p.castSlot]);
      }
      if (p.pendingSkill) {
        for (let s = 0; s < p.slots.length; s++) if (p.pendingSkill & (1 << s)) this.castSlot(p, s);
        p.pendingSkill = 0;
      }
      if (this.time < p.dashUntil) {
        const m = movePlayer(p.x, p.y, p.dashX, p.dashY, dt, p.dashSpeed, this.map.obstacles);
        p.x = m.x;
        p.y = m.y;
      } else {
        const m = movePlayer(
          p.x,
          p.y,
          p.moveX,
          p.moveY,
          dt,
          PLAYER_SPEED * this.speedMul(p),
          this.map.obstacles,
        );
        p.x = m.x;
        p.y = m.y;
      }
      if (p.shooting && this.time >= p.nextShot) this.fire(p);
      if (
        this.map.hazards.length &&
        this.time >= p.nextHazard &&
        this.map.hazards.some((h) => pointInRect(p.x, p.y, h))
      ) {
        p.nextHazard = this.time + HAZARD_INTERVAL;
        this.hurt(p, '', 1);
      }
    }

    this.stepBullets(dt);
    this.stepMines();
    this.stepZones(dt);
    this.stepPets(dt);
    this.stepPickups(dt);
    if (this.mode === 'coins') this.stepCoins(dt);
    if (this.mode === 'hill') this.stepHill(dt);

    if (this.timeLeft <= 0) this.endRound();
  }

  // ---- shooting -----------------------------------------------------------

  private shoot(p: SimPlayer, angle: number): void {
    const ch = CHARACTERS[p.charId];
    const big = this.eff(p, 'big');
    const pierce = this.eff(p, 'pierce');
    const ric = this.eff(p, 'ricochet');
    const od = this.eff(p, 'overdrive');
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const w = WEAPONS[p.weapon] ?? WEAPONS[0];
    const speed = BULLET_SPEED * ch.bulletSpeed * w.speed;
    this.bullets.push({
      id: this.nextId++,
      owner: p.id,
      team: p.team,
      x: p.x + dx * (PLAYER_RADIUS + 2),
      y: p.y + dy * (PLAYER_RADIUS + 2),
      vx: dx * speed,
      vy: dy * speed,
      ttl: BULLET_TTL * (ric ? 1.4 : 1) * w.range,
      r: BULLET_RADIUS * (big ? 1.4 + 0.3 * big.power : 1) * w.size,
      dmg: w.dmg + (od ? 1 : 0),
      pierce: pierce ? Math.ceil(pierce.power) : 0,
      bounce: ric ? Math.ceil(ric.power) : 0,
      freeze: !!this.eff(p, 'freeze'),
      hit: [],
      kind: p.bfx,
      status: '',
      homing: false,
    });
  }

  private fire(p: SimPlayer): void {
    const ch = CHARACTERS[p.charId];
    const rapid = this.eff(p, 'rapid');
    const w = WEAPONS[p.weapon] ?? WEAPONS[0];
    let interval = FIRE_INTERVAL * ch.fire * w.fire;
    if (rapid) interval /= 1 + 0.9 * rapid.power;
    if (p.boss) interval *= 0.9;
    else if (p.bot) interval *= 2.7 - this.cfg.botSkill;
    p.nextShot = this.time + interval;
    p.hiddenUntil = 0;
    const angles: number[] = [];
    for (let k = 0; k < w.pellets; k++) angles.push(p.aim + (k - (w.pellets - 1) / 2) * w.spread);
    if (this.eff(p, 'triple')) for (const a of angles.slice()) angles.push(a - 0.2, a + 0.2);
    for (const a of angles) this.shoot(p, a);
  }

  private stepBullets(dt: number): void {
    const keep: SimBullet[] = [];
    const obs = this.map.obstacles;
    for (const b of this.bullets) {
      const ox = b.x;
      const oy = b.y;
      if (b.homing) this.steerBullet(b, dt);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.ttl -= dt;
      if (b.ttl <= 0) continue;
      if (b.x < 0 || b.x > WORLD_W) {
        if (b.bounce-- <= 0) continue;
        b.vx = -b.vx;
        b.x = Math.min(WORLD_W, Math.max(0, b.x));
      }
      if (b.y < 0 || b.y > WORLD_H) {
        if (b.bounce-- <= 0) continue;
        b.vy = -b.vy;
        b.y = Math.min(WORLD_H, Math.max(0, b.y));
      }
      if (obs.some((o) => pointInRect(b.x, b.y, o, b.r))) {
        if (b.bounce <= 0) continue;
        b.bounce--;
        const freeX = !obs.some((o) => pointInRect(b.x, oy, o, b.r));
        const freeY = !obs.some((o) => pointInRect(ox, b.y, o, b.r));
        if (freeX && !freeY) b.vy = -b.vy;
        else if (freeY && !freeX) b.vx = -b.vx;
        else {
          b.vx = -b.vx;
          b.vy = -b.vy;
        }
        b.x = ox;
        b.y = oy;
      }
      let consumed = false;
      for (const p of this.players.values()) {
        if (!p.alive || p.id === b.owner || b.hit.includes(p.id)) continue;
        if (MODES[this.mode].team && p.team === b.team) continue;
        if (!circlesOverlap(b.x, b.y, b.r, p.x, p.y, PLAYER_RADIUS)) continue;
        this.hurt(p, b.owner, b.dmg);
        if (b.freeze) p.slowUntil = this.time + 2;
        if (b.status) this.applyStatus(p, this.players.get(b.owner), b.status);
        if (b.pierce > 0) {
          b.pierce--;
          b.hit.push(p.id);
        } else {
          consumed = true;
          break;
        }
      }
      if (!consumed) keep.push(b);
    }
    this.bullets = keep;
  }

  /** Central damage entry. Handles invulnerability and shield hits. */
  private hurt(victim: SimPlayer, by: string, dmg: number): void {
    if (!victim.alive) return;
    if (this.time < victim.invulnUntil || this.time < victim.holdUntil || this.time < this.freezeUntil) return;
    if (this.cfg.training && !victim.bot && victim.hp - dmg <= 0) {
      victim.hp = victim.maxHp;
      return;
    }
    if (victim.shieldHits > 0) {
      victim.shieldHits--;
      this.events.push({ t: 'shield', id: victim.id, x: victim.x, y: victim.y });
      return;
    }
    victim.hp -= dmg;
    if (victim.hp > 0) {
      this.events.push({ t: 'hit', id: victim.id, by, x: victim.x, y: victim.y });
      return;
    }
    victim.hp = 0;
    victim.alive = false;
    victim.deaths += 1;
    victim.shooting = false;
    victim.castAt = -1;
    victim.dotUntil = 0;
    victim.effects = [];
    victim.shieldHits = 0;
    victim.respawnAt = this.time + RESPAWN_DELAY;
    const killer = this.players.get(by);
    if (killer && killer.id !== victim.id) {
      killer.kills += 1;
      killer.score += this.mode === 'coins' ? 3 : this.mode === 'hill' ? 2 : 1;
      if (this.mode === 'tdm') this.teamScore[killer.team === 0 ? 0 : 1] += 1;
      const vamp = this.eff(killer, 'vampire');
      if (vamp && killer.alive)
        killer.hp = Math.min(killer.maxHp, killer.hp + Math.max(1, Math.round(vamp.power)));
    }
    this.events.push({ t: 'kill', id: victim.id, by, x: victim.x, y: victim.y });
  }

  /** Freezes everyone (lobby). Call release() to start the countdown. */
  lobby(seconds: number): void {
    this.freezeUntil = this.time + seconds;
  }
  /** Ends the lobby: the match starts after a short countdown. */
  release(countdown = 3): void {
    this.freezeUntil = Math.min(this.freezeUntil, this.time + countdown);
  }
  /** Seconds until the whole match is unfrozen. */
  get frozenFor(): number {
    return Math.max(0, this.freezeUntil - this.time);
  }
  /** Holds one player (joined a running match and has not confirmed yet). */
  holdPlayer(id: string, seconds: number): void {
    const p = this.players.get(id);
    if (p) p.holdUntil = this.time + seconds;
  }

  private respawn(p: SimPlayer): void {
    const s = this.pickSpawn(p.id, true, MODES[this.mode].team ? p.team : -1);
    p.x = s.x;
    p.y = s.y;
    p.hp = p.maxHp;
    p.alive = true;
    p.invulnUntil = this.time + INVULN_TIME;
    for (const sl of p.slots) sl.cdUntil = 0;
    p.mp = p.maxMp;
    p.castAt = -1;
    p.dashUntil = 0;
    this.events.push({ t: 'respawn', id: p.id, x: p.x, y: p.y });
  }

  // ---- skills -------------------------------------------------------------

  /** Starts casting the skill in a slot. Needs mana, a ready cooldown, and no cast already in progress. */
  private castSlot(p: SimPlayer, slot: number): void {
    const s = p.slots[slot];
    if (!s || s.kind === 'world' || p.castAt >= 0) return;
    if (this.time < s.cdUntil || p.mp < s.stats.mp) return;
    p.mp -= s.stats.mp;
    s.cdUntil = this.time + s.stats.cooldown * CHARACTERS[p.charId].skillCd;
    if (s.kind !== 'stealth') p.hiddenUntil = 0;
    this.events.push({ t: 'cast', id: p.id, skill: s.skillId, x: p.x, y: p.y, time: s.stats.cast });
    if (s.stats.cast <= 0.06) this.resolveCast(p, s);
    else {
      p.castAt = this.time + s.stats.cast;
      p.castSlot = slot;
    }
  }

  private nearestEnemy(p: SimPlayer, maxDist: number): SimPlayer | null {
    let best: SimPlayer | null = null;
    let bd = maxDist;
    for (const o of this.players.values()) {
      if (!o.alive || !this.isEnemy(p, o)) continue;
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  }

  private isAlly(a: SimPlayer, b: SimPlayer): boolean {
    return a.id === b.id || (MODES[this.mode].team && a.team === b.team);
  }

  /** Adds an element status to a hit target. */
  private applyStatus(victim: SimPlayer, owner: SimPlayer | undefined, status: string): void {
    if (!victim.alive || !status) return;
    switch (status) {
      case 'burn':
      case 'poison':
        victim.dotUntil = this.time + 3;
        victim.dotBy = owner?.id ?? '';
        victim.nextDot = this.time + 1;
        break;
      case 'slow':
        victim.slowUntil = this.time + 2;
        break;
      case 'knockback':
      case 'pull': {
        if (!owner) break;
        const dx = victim.x - owner.x;
        const dy = victim.y - owner.y;
        const d = Math.hypot(dx, dy) || 1;
        const sign = status === 'pull' ? -1 : 1;
        const m = movePlayer(
          victim.x,
          victim.y,
          (sign * dx) / d,
          (sign * dy) / d,
          90 / PLAYER_SPEED,
          PLAYER_SPEED,
          this.map.obstacles,
        );
        victim.x = m.x;
        victim.y = m.y;
        break;
      }
      case 'leech':
        if (owner && owner.alive) owner.hp = Math.min(owner.maxHp, owner.hp + 1);
        break;
    }
  }

  private skillBullet(
    p: SimPlayer,
    s: SlotState,
    angle: number,
    dmg: number,
    opts: { speed?: number; range?: number; r?: number } = {},
  ): void {
    const speed = opts.speed ?? 760;
    const status = elementStatus(s.element);
    this.bullets.push({
      id: this.nextId++,
      owner: p.id,
      team: p.team,
      x: p.x + Math.cos(angle) * (PLAYER_RADIUS + 2),
      y: p.y + Math.sin(angle) * (PLAYER_RADIUS + 2),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      ttl: Math.min(2.2, (opts.range ?? s.stats.range) / speed),
      r: opts.r ?? BULLET_RADIUS * 1.2,
      dmg,
      pierce: status === 'pierce' || status === 'chain' ? 1 : 0,
      bounce: status === 'bounce' ? 2 : 0,
      freeze: false,
      hit: [],
      kind: p.bfx,
      status,
      homing: status === 'homing',
    });
  }

  private refund(p: SimPlayer, s: SlotState): void {
    s.cdUntil = this.time + 0.4;
    p.mp = Math.min(p.maxMp, p.mp + s.stats.mp);
  }

  private addZone(p: SimPlayer, kind: SimZone['kind'], x: number, y: number, r: number, dur: number): void {
    const mine = this.zones.filter((z) => z.owner === p.id);
    if (mine.length >= 3) this.zones = this.zones.filter((z) => z !== mine[0]);
    this.zones.push({
      id: this.nextId++,
      owner: p.id,
      team: p.team,
      kind,
      x,
      y,
      r,
      until: this.time + dur,
      nextTick: this.time + 1,
    });
  }

  /** The effect of a skill, run when its cast time is over. One behavior per skill kind. */
  private resolveCast(p: SimPlayer, s: SlotState | undefined): void {
    if (!s || !p.alive) return;
    const st = s.stats;
    const dmg = dmgFromPower(st.power);
    const status = elementStatus(s.element);
    const aim = p.aim;
    const ax = Math.cos(aim);
    const ay = Math.sin(aim);
    this.events.push({
      t: 'skill',
      id: p.id,
      skill: s.skillId,
      kind: s.kind,
      element: s.element,
      x: p.x,
      y: p.y,
    });
    switch (s.kind) {
      case 'projectile': {
        const n = 1 + st.count;
        for (let i = 0; i < n; i++) this.skillBullet(p, s, aim + (i - (n - 1) / 2) * 0.16, dmg);
        break;
      }
      case 'volley': {
        const n = 3 + st.count + (RANKS.indexOf(s.rank) >= 5 ? 2 : 0);
        const d = Math.max(1, Math.round(dmg * 0.6));
        for (let i = 0; i < n; i++) this.skillBullet(p, s, aim + (i - (n - 1) / 2) * 0.2, d, { speed: 700 });
        break;
      }
      case 'nova': {
        const n = 10 + st.count * 2;
        const d = Math.max(1, Math.round(dmg * 0.6));
        for (let i = 0; i < n; i++)
          this.skillBullet(p, s, (i * Math.PI * 2) / n, d, { speed: 520, range: Math.max(220, st.area) });
        this.events.push({ t: 'boom', x: p.x, y: p.y });
        break;
      }
      case 'beam': {
        const len = Math.min(900, st.range);
        for (const o of this.players.values()) {
          if (!o.alive || !this.isEnemy(p, o)) continue;
          const rx = o.x - p.x;
          const ry = o.y - p.y;
          const along = rx * ax + ry * ay;
          if (along < 0 || along > len) continue;
          if (Math.abs(rx * ay - ry * ax) > PLAYER_RADIUS + 10) continue;
          if (segmentBlocked(p.x, p.y, o.x, o.y, this.map.obstacles)) continue;
          this.hurt(o, p.id, dmg);
          this.applyStatus(o, p, status);
        }
        this.events.push({ t: 'beam', id: p.id, x: p.x, y: p.y, angle: aim, len, element: s.element });
        break;
      }
      case 'cleave': {
        const r = Math.max(110, st.area + 20);
        for (const o of this.players.values()) {
          if (!o.alive || !this.isEnemy(p, o)) continue;
          const rx = o.x - p.x;
          const ry = o.y - p.y;
          if (Math.hypot(rx, ry) > r + PLAYER_RADIUS) continue;
          if (Math.abs(normalizeAngle(Math.atan2(ry, rx) - aim)) > 1.15) continue;
          this.hurt(o, p.id, dmg);
          this.applyStatus(o, p, status || 'knockback');
        }
        this.events.push({ t: 'swing', id: p.id, x: p.x, y: p.y, angle: aim, r, element: s.element });
        break;
      }
      case 'shield':
        p.invulnUntil = Math.max(p.invulnUntil, this.time + Math.max(1.2, st.duration));
        break;
      case 'heal': {
        const amount = Math.max(1, Math.round(st.power / 30));
        for (const o of this.players.values()) {
          if (!o.alive || !this.isAlly(p, o)) continue;
          if (o.id !== p.id && Math.hypot(o.x - p.x, o.y - p.y) > 220) continue;
          o.hp = Math.min(o.maxHp, o.hp + amount);
        }
        break;
      }
      case 'barrier':
        this.addZone(
          p,
          'barrier',
          p.x + ax * 80,
          p.y + ay * 80,
          Math.max(80, st.area * 0.7),
          Math.max(3, st.duration),
        );
        break;
      case 'aura':
        this.addZone(p, 'heal', p.x, p.y, Math.max(120, st.area), Math.max(4, st.duration));
        break;
      case 'slow':
        this.addZone(
          p,
          'slow',
          p.x + ax * Math.min(st.range, 300) * 0.7,
          p.y + ay * Math.min(st.range, 300) * 0.7,
          Math.max(110, st.area * 0.8),
          Math.max(2.5, st.duration),
        );
        break;
      case 'pull':
        this.addZone(
          p,
          'pull',
          p.x + ax * Math.min(st.range, 320) * 0.7,
          p.y + ay * Math.min(st.range, 320) * 0.7,
          Math.max(120, st.area * 0.8),
          Math.max(1.4, st.duration),
        );
        break;
      case 'buff': {
        const key = BUFF_BY_ARCHETYPE[ARCHETYPES[s.archetype]?.name ?? ''] ?? 'rapid';
        if (key === 'guard') {
          p.shieldHits = Math.max(p.shieldHits, 1 + Math.floor(st.power / 60));
          break;
        }
        const until = this.time + Math.max(4, st.duration);
        const power = 1 + st.power / 80;
        const have = p.effects.find((e) => e.effect === key);
        if (have) {
          have.until = Math.max(have.until, until);
          have.power = Math.max(have.power, power);
        } else {
          p.effects.push({ effect: key, rarity: Math.min(3, RANKS.indexOf(s.rank) >> 1), until, power });
          if (p.effects.length > MAX_EFFECTS) p.effects.shift();
        }
        break;
      }
      case 'stealth':
        p.hiddenUntil = this.time + Math.max(2.5, st.duration);
        break;
      case 'ambush': {
        const t = this.nearestEnemy(p, st.range);
        if (!t) {
          this.refund(p, s);
          break;
        }
        const m = movePlayer(
          t.x - Math.cos(t.aim) * (PLAYER_RADIUS * 2 + 4),
          t.y - Math.sin(t.aim) * (PLAYER_RADIUS * 2 + 4),
          0,
          0,
          0,
          PLAYER_SPEED,
          this.map.obstacles,
        );
        p.x = m.x;
        p.y = m.y;
        p.aim = Math.atan2(t.y - p.y, t.x - p.x);
        p.hiddenUntil = 0;
        this.hurt(t, p.id, dmg + 1);
        this.applyStatus(t, p, status);
        break;
      }
      case 'summon': {
        const n = Math.min(MAX_PETS, 1 + st.count + (RANKS.indexOf(s.rank) >= 5 ? 1 : 0));
        for (let i = 0; i < n; i++) {
          const owned = this.pets.filter((x) => x.owner === p.id);
          if (owned.length >= MAX_PETS) this.pets.splice(this.pets.indexOf(owned[0]), 1);
          this.pets.push({
            id: this.nextId++,
            owner: p.id,
            team: p.team,
            x: p.x + Math.cos(i * 1.7) * 30,
            y: p.y + Math.sin(i * 1.7) * 30,
            until: this.time + Math.max(8, st.duration),
            nextShot: this.time + 0.8,
            dmg: Math.max(1, Math.round(dmg * 0.5)),
            color: ELEMENTS[s.element]?.color ?? p.color,
          });
        }
        break;
      }
      case 'mine': {
        const mine = this.mines.filter((m) => m.owner === p.id);
        if (mine.length >= 3) this.mines = this.mines.filter((m) => m !== mine[0]);
        this.mines.push({
          id: this.nextId++,
          owner: p.id,
          team: p.team,
          x: p.x,
          y: p.y,
          armedAt: this.time + 0.8,
          expires: this.time + Math.max(15, st.duration),
          dmg,
          r: Math.max(70, st.area),
        });
        break;
      }
      case 'dash': {
        let dx = p.moveX;
        let dy = p.moveY;
        if (Math.hypot(dx, dy) < 0.1) {
          dx = ax;
          dy = ay;
        }
        const l = Math.hypot(dx, dy) || 1;
        p.dashX = dx / l;
        p.dashY = dy / l;
        p.dashSpeed = Math.max(500, st.range) / DASH_TIME;
        p.dashUntil = this.time + DASH_TIME;
        break;
      }
      case 'blink':
      case 'portal': {
        let x = p.x;
        let y = p.y;
        const steps = Math.max(4, Math.round(st.range / 20));
        for (let i = 0; i < steps; i++) {
          const m = movePlayer(x, y, ax, ay, 20 / PLAYER_SPEED, PLAYER_SPEED, this.map.obstacles);
          x = m.x;
          y = m.y;
        }
        p.x = x;
        p.y = y;
        if (s.kind === 'portal') p.invulnUntil = Math.max(p.invulnUntil, this.time + 0.8);
        break;
      }
      default:
        break;
    }
  }

  private stepMines(): void {
    const keep: SimMine[] = [];
    for (const m of this.mines) {
      if (this.time > m.expires) continue;
      let boom = false;
      if (this.time >= m.armedAt) {
        for (const p of this.players.values()) {
          if (!p.alive || p.id === m.owner) continue;
          if (MODES[this.mode].team && p.team === m.team) continue;
          if (Math.hypot(p.x - m.x, p.y - m.y) <= MINE_TRIGGER) {
            boom = true;
            break;
          }
        }
      }
      if (!boom) {
        keep.push(m);
        continue;
      }
      this.events.push({ t: 'boom', x: m.x, y: m.y });
      const owner = this.players.get(m.owner);
      for (const p of this.players.values()) {
        if (!p.alive || p.id === m.owner) continue;
        if (MODES[this.mode].team && p.team === m.team) continue;
        if (Math.hypot(p.x - m.x, p.y - m.y) <= m.r) {
          this.hurt(p, m.owner, m.dmg);
          if (owner) this.applyStatus(p, owner, 'knockback');
        }
      }
    }
    this.mines = keep;
  }

  private stepZones(dt: number): void {
    this.zones = this.zones.filter((z) => this.time < z.until);
    const team = MODES[this.mode].team;
    for (const z of this.zones) {
      const enemyOf = (o: SimPlayer) => o.alive && o.id !== z.owner && (!team || o.team !== z.team);
      if (z.kind === 'barrier') {
        this.bullets = this.bullets.filter((b) => {
          if (b.owner === z.owner || (team && b.team === z.team)) return true;
          return Math.hypot(b.x - z.x, b.y - z.y) > z.r;
        });
      } else if (z.kind === 'heal') {
        if (this.time >= z.nextTick) {
          z.nextTick += 1;
          for (const o of this.players.values()) {
            const ally = o.alive && (o.id === z.owner || (team && o.team === z.team));
            if (ally && Math.hypot(o.x - z.x, o.y - z.y) <= z.r) o.hp = Math.min(o.maxHp, o.hp + 1);
          }
        }
      } else if (z.kind === 'slow') {
        for (const o of this.players.values()) {
          if (enemyOf(o) && Math.hypot(o.x - z.x, o.y - z.y) <= z.r)
            o.slowUntil = Math.max(o.slowUntil, this.time + 0.35);
        }
      } else if (z.kind === 'pull') {
        for (const o of this.players.values()) {
          if (!enemyOf(o)) continue;
          const dx = z.x - o.x;
          const dy = z.y - o.y;
          const d = Math.hypot(dx, dy);
          if (d > z.r || d < 8) continue;
          const m = movePlayer(o.x, o.y, dx / d, dy / d, dt, 260, this.map.obstacles);
          o.x = m.x;
          o.y = m.y;
        }
      }
    }
  }

  private stepPets(dt: number): void {
    this.pets = this.pets.filter((pt) => this.time < pt.until && this.players.get(pt.owner)?.alive);
    const index = new Map<string, number>();
    for (const pt of this.pets) {
      const owner = this.players.get(pt.owner);
      if (!owner) continue;
      const i = index.get(pt.owner) ?? 0;
      index.set(pt.owner, i + 1);
      const a = this.time * 1.6 + i * 1.3;
      pt.x += (owner.x + Math.cos(a) * 54 - pt.x) * Math.min(1, 7 * dt);
      pt.y += (owner.y + Math.sin(a) * 54 - pt.y) * Math.min(1, 7 * dt);
      if (this.time < pt.nextShot) continue;
      const target = this.nearestEnemy(owner, 520);
      if (!target || segmentBlocked(pt.x, pt.y, target.x, target.y, this.map.obstacles)) continue;
      pt.nextShot = this.time + 1.3;
      const ang = Math.atan2(target.y - pt.y, target.x - pt.x);
      this.bullets.push({
        id: this.nextId++,
        owner: pt.owner,
        team: pt.team,
        x: pt.x,
        y: pt.y,
        vx: Math.cos(ang) * 640,
        vy: Math.sin(ang) * 640,
        ttl: 0.9,
        r: 7,
        dmg: pt.dmg,
        pierce: 0,
        bounce: 0,
        freeze: false,
        hit: [],
        kind: owner.bfx,
        status: '',
        homing: false,
      });
    }
  }
  // ---- powerups, coins, hill ------------------------------------------------

  private applyPowerup(p: SimPlayer, pu: PowerupDef): void {
    const st = powerupStats(pu);
    if (pu.effect === 'heal') {
      p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.round(st.power)));
      return;
    }
    if (pu.effect === 'shield') {
      p.shieldHits = Math.max(p.shieldHits, Math.ceil(st.power));
      return;
    }
    const until = this.time + st.duration;
    const have = p.effects.find((e) => e.effect === pu.effect);
    if (have) {
      have.until = Math.max(have.until, until);
      have.power = Math.max(have.power, st.power);
      have.rarity = Math.max(have.rarity, pu.rarity);
    } else {
      p.effects.push({ effect: pu.effect, rarity: pu.rarity, until, power: st.power });
      if (p.effects.length > MAX_EFFECTS) p.effects.shift();
    }
  }

  private stepPickups(dt: number): void {
    this.pickupTimer -= dt;
    if (this.pickupTimer <= 0) {
      this.pickupTimer = PICKUP_SPAWN_EVERY;
      if (this.pickups.length < 2) {
        const s = this.pickSpawn();
        this.pickups.push({ id: this.nextId++, x: s.x, y: s.y, pu: rollPowerup(this.rng) });
      }
    }
    for (const p of this.players.values()) {
      const mag = p.alive ? this.eff(p, 'magnet') : undefined;
      if (!mag) continue;
      for (const pk of this.pickups) {
        const d = Math.hypot(p.x - pk.x, p.y - pk.y);
        if (d < 260 * mag.power && d > 1) {
          pk.x += ((p.x - pk.x) / d) * 260 * dt;
          pk.y += ((p.y - pk.y) / d) * 260 * dt;
        }
      }
    }
    this.pickups = this.pickups.filter((pk) => {
      for (const p of this.players.values()) {
        if (p.alive && circlesOverlap(pk.x, pk.y, PICKUP_RADIUS, p.x, p.y, PLAYER_RADIUS)) {
          this.applyPowerup(p, pk.pu);
          this.events.push({ t: 'pickup', id: p.id, pu: powerupId(pk.pu), x: pk.x, y: pk.y });
          return false;
        }
      }
      return true;
    });
  }

  private stepCoins(dt: number): void {
    this.coinTimer -= dt;
    if (this.coinTimer <= 0 && this.coins.length < COIN_TARGET) {
      this.coinTimer = 0.35;
      const s = this.pickSpawn(undefined, false);
      this.coins.push({ id: this.nextId++, x: s.x, y: s.y, v: this.rng() < 0.12 ? 5 : 1 });
    }
    for (const p of this.players.values()) {
      const mag = p.alive ? this.eff(p, 'magnet') : undefined;
      if (!mag) continue;
      for (const c of this.coins) {
        const d = Math.hypot(p.x - c.x, p.y - c.y);
        if (d < 240 * mag.power && d > 1) {
          c.x += ((p.x - c.x) / d) * 320 * dt;
          c.y += ((p.y - c.y) / d) * 320 * dt;
        }
      }
    }
    this.coins = this.coins.filter((c) => {
      for (const p of this.players.values()) {
        if (p.alive && circlesOverlap(c.x, c.y, COIN_RADIUS, p.x, p.y, PLAYER_RADIUS)) {
          p.score += c.v;
          if (MODES[this.mode].team) this.teamScore[p.team === 0 ? 0 : 1] += c.v;
          this.events.push({ t: 'coin', id: p.id, v: c.v, x: c.x, y: c.y });
          return false;
        }
      }
      return true;
    });
  }

  private stepHill(dt: number): void {
    const h = this.map.hill;
    const inside: SimPlayer[] = [];
    for (const p of this.players.values()) {
      if (p.alive && Math.hypot(p.x - h.x, p.y - h.y) <= h.r) inside.push(p);
    }
    if (inside.length === 1) {
      const p = inside[0];
      this.hillHolder = p.id;
      p.holdAcc += dt;
      while (p.holdAcc >= 1) {
        p.holdAcc -= 1;
        p.score += 1;
      }
    } else this.hillHolder = inside.length > 1 ? '*' : '';
  }

  /** Picks a free spot. Prefers distance from living players when `awayFromPlayers` is set. */
  /** A free spot. `side` 0 or 1 keeps team spawns on the left or right third of the arena. */
  pickSpawn(excludeId?: string, awayFromPlayers = true, side = -1): { x: number; y: number } {
    let best = { x: WORLD_W / 2, y: 80 };
    let bestScore = -1;
    for (let i = 0; i < 24; i++) {
      const x = side === 0 ? 60 + this.rng() * 460 : side === 1 ? WORLD_W - 520 + this.rng() * 460 : 60 + this.rng() * (WORLD_W - 120);
      const y = 60 + this.rng() * (WORLD_H - 120);
      if (this.map.obstacles.some((o) => pointInRect(x, y, o, PLAYER_RADIUS + 10))) continue;
      if (this.map.hazards.some((o) => pointInRect(x, y, o, PLAYER_RADIUS + 10))) continue;
      let nearest = 1e9;
      if (awayFromPlayers) {
        for (const p of this.players.values()) {
          if (p.id === excludeId || !p.alive) continue;
          nearest = Math.min(nearest, Math.hypot(p.x - x, p.y - y));
        }
      } else nearest = this.rng() * 100;
      if (nearest > bestScore) {
        bestScore = nearest;
        best = { x, y };
      }
    }
    return best;
  }

  // ---- rounds -------------------------------------------------------------

  standings(): SimPlayer[] {
    return Array.from(this.players.values()).sort(
      (a, b) => b.score - a.score || b.kills - a.kills || a.deaths - b.deaths || a.name.localeCompare(b.name),
    );
  }

  private endRound(): void {
    this.phase = 'scoreboard';
    this.scoreboardLeft = SCOREBOARD_TIME;
    this.timeLeft = 0;
    this.bullets = [];
    this.pickups = [];
    this.coins = [];
    this.mines = [];
    this.hillHolder = '';
    for (const p of this.players.values()) {
      p.shooting = false;
      p.moveX = 0;
      p.moveY = 0;
    }
    this.winnerTeam = -1;
    this.winnerName = '';
    if (MODES[this.mode].team) {
      if (this.teamScore[0] !== this.teamScore[1]) {
        this.winnerTeam = this.teamScore[0] > this.teamScore[1] ? 0 : 1;
        this.winnerName = TEAM_NAMES[this.winnerTeam];
      }
    } else {
      const top = this.standings()[0];
      this.winnerName = top && top.score > 0 ? top.name : '';
    }
    this.events.push({ t: 'roundEnd', winner: this.winnerName, team: this.winnerTeam });
  }

  startRound(): void {
    const next = this.pickNext();
    this.mode = next.mode;
    this.map = getMap(next.map);
    this.phase = 'play';
    this.round += 1;
    this.timeLeft = this.roundLength();
    this.winnerName = '';
    this.winnerTeam = -1;
    this.teamScore = [0, 0];
    this.pickupTimer = 6;
    this.coinTimer = 0;
    this.bullets = [];
    this.pickups = [];
    this.coins = [];
    this.mines = [];
    this.hillHolder = '';
    let i = 0;
    for (const p of Array.from(this.players.values()).sort((a, b) => Number(a.bot) - Number(b.bot))) {
      p.team = MODES[this.mode].team ? i++ % 2 : 0;
      p.kills = 0;
      p.deaths = 0;
      p.score = 0;
      p.holdAcc = 0;
      p.hp = p.maxHp;
      p.alive = true;
      p.effects = [];
      p.shieldHits = 0;
      for (const sl of p.slots) sl.cdUntil = 0;
      p.mp = p.maxMp;
      p.castAt = -1;
      p.dotUntil = 0;
      p.dashUntil = 0;
      p.slowUntil = 0;
      p.invulnUntil = this.time + INVULN_TIME;
      p.nextShot = 0;
      p.holdUntil = 0;
      const s = this.pickSpawn(p.id, true, MODES[this.mode].team ? p.team : -1);
      p.x = s.x;
      p.y = s.y;
    }
    if (this.cfg.countdown) this.freezeUntil = this.time + this.cfg.countdown;
    this.events.push({ t: 'roundStart', round: this.round, mode: this.mode, map: this.map.id });
  }

  // ---- bots -------------------------------------------------------------

  private newBrain(): BotBrain {
    return {
      nextThink: 0,
      wanderX: WORLD_W / 2,
      wanderY: WORLD_H / 2,
      wanderUntil: 0,
      strafe: this.rng() < 0.5 ? -1 : 1,
      aimErr: 0,
      targetId: null,
      path: [],
      pathGoalX: -1,
      pathGoalY: -1,
      repathAt: 0,
      lastX: 0,
      lastY: 0,
      lastCheck: 0,
      unstuckUntil: 0,
      nextCast: 0,
    };
  }

  /** Bots cast by skill kind: defend when hurt, attack when the target is in range, set traps and summons when close. */
  private botCast(p: SimPlayer, brain: BotBrain, target: SimPlayer | null, dist: number): void {
    if (this.time < brain.nextCast || p.castAt >= 0) return;
    const skill = p.boss ? 0.9 : this.cfg.botSkill;
    const ready = p.slots
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.kind !== 'world' && this.time >= s.cdUntil && p.mp >= s.stats.mp);
    if (!ready.length) return;
    const has = (kinds: Kind[]) => ready.find(({ s }) => kinds.includes(s.kind));
    const low = p.hp <= Math.max(1, Math.floor(p.maxHp / 3));
    const visible = !!target && !segmentBlocked(p.x, p.y, target.x, target.y, this.map.obstacles);
    let pick: { s: SlotState; i: number } | undefined;
    if (low) pick = has(['heal', 'shield', 'stealth', 'barrier']) ?? has(['dash', 'blink', 'portal']);
    else if (target && visible) {
      if (dist < 170) pick = has(['cleave', 'nova', 'pull', 'slow']) ?? has(['shield']);
      if (!pick && dist < 760) pick = has(['beam', 'projectile', 'volley']);
      if (pick && ['beam', 'projectile', 'volley'].includes(pick.s.kind) && dist > pick.s.stats.range * 0.95)
        pick = undefined;
      if (!pick && dist < 420)
        pick = has(['summon', 'mine', 'barrier', 'buff', 'ambush', 'slow', 'pull', 'aura']);
      if (!pick && dist > 400 && this.rng() < 0.4) pick = has(['dash', 'blink', 'portal']);
    } else if (target && dist < 600) pick = has(['summon', 'buff', 'stealth']);
    if (!pick) return;
    if (target) p.aim = normalizeAngle(Math.atan2(target.y - p.y, target.x - p.x) + brain.aimErr);
    this.castSlot(p, pick.i);
    brain.nextCast = this.time + 1.8 + (1 - skill) * 2.2 + this.rng() * 1.2;
  }

  private steerBullet(b: SimBullet, dt: number): void {
    let best: SimPlayer | null = null;
    let bd = 420;
    const team = MODES[this.mode].team;
    for (const o of this.players.values()) {
      if (!o.alive || o.id === b.owner || (team && o.team === b.team)) continue;
      const d = Math.hypot(o.x - b.x, o.y - b.y);
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    if (!best) return;
    const speed = Math.hypot(b.vx, b.vy);
    const cur = Math.atan2(b.vy, b.vx);
    const diff = normalizeAngle(Math.atan2(best.y - b.y, best.x - b.x) - cur);
    const turn = Math.max(-3.5 * dt, Math.min(3.5 * dt, diff));
    b.vx = Math.cos(cur + turn) * speed;
    b.vy = Math.sin(cur + turn) * speed;
  }
  private thinkBot(p: SimPlayer): void {
    const brain = this.brains.get(p.id);
    if (!brain) return;
    if (!p.alive) {
      p.shooting = false;
      return;
    }
    const skill = p.boss ? 0.9 : this.cfg.botSkill;
    if (this.cfg.training) {
      // Training dummies wander slowly and never attack.
      p.shooting = false;
      if (this.time >= brain.wanderUntil) {
        brain.wanderX = 200 + this.rng() * (WORLD_W - 400);
        brain.wanderY = 150 + this.rng() * (WORLD_H - 300);
        brain.wanderUntil = this.time + 3 + this.rng() * 3;
      }
      const d = this.steer(p, brain, brain.wanderX, brain.wanderY);
      p.moveX = d.x;
      p.moveY = d.y;
      return;
    }
    if (this.time >= brain.nextThink) {
      brain.nextThink = this.time + 0.35 - skill * 0.15 + this.rng() * 0.15;
      brain.aimErr = (this.rng() - 0.5) * (0.22 + (1 - skill) * 0.8);
      if (this.rng() < 0.15) brain.strafe = -brain.strafe;
      let target: SimPlayer | null = null;
      let best = 1e9;
      for (const o of this.players.values()) {
        if (!o.alive || !this.isEnemy(p, o)) continue;
        const d = Math.hypot(o.x - p.x, o.y - p.y);
        if (o.hiddenUntil > this.time && d > 150) continue;
        if (d < best) {
          best = d;
          target = o;
        }
      }
      brain.targetId = target ? target.id : null;
      if (this.time >= brain.wanderUntil || Math.hypot(brain.wanderX - p.x, brain.wanderY - p.y) < 40) {
        brain.wanderX = 80 + this.rng() * (WORLD_W - 160);
        brain.wanderY = 80 + this.rng() * (WORLD_H - 160);
        brain.wanderUntil = this.time + 2 + this.rng() * 2;
      }
      this.botCast(p, brain, target, best);
    }

    const target = brain.targetId ? this.players.get(brain.targetId) : undefined;
    let goalX = brain.wanderX;
    let goalY = brain.wanderY;
    p.shooting = false;
    const pk = this.pickups[0];
    const mode = this.mode;
    if (mode === 'coins' && this.coins.length) {
      let bd = 1e9;
      for (const c of this.coins) {
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        if (d < bd) {
          bd = d;
          goalX = c.x;
          goalY = c.y;
        }
      }
    } else if (mode === 'hill') {
      goalX = this.map.hill.x + Math.cos(this.time + p.x) * 40;
      goalY = this.map.hill.y + Math.sin(this.time + p.y) * 40;
    }
    if (pk && Math.hypot(pk.x - p.x, pk.y - p.y) < 450) {
      goalX = pk.x;
      goalY = pk.y;
    }
    if (target && target.alive) {
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const d = Math.hypot(dx, dy);
      const visible = d < 700 && !segmentBlocked(p.x, p.y, target.x, target.y, this.map.obstacles);
      if (visible) {
        p.aim = normalizeAngle(Math.atan2(dy, dx) + brain.aimErr);
        p.shooting = true;
        const objective = mode === 'coins' || mode === 'hill';
        if (!objective || d < 260) {
          if (d > 300) {
            goalX = target.x;
            goalY = target.y;
          } else if (d < 170) {
            goalX = p.x - dx;
            goalY = p.y - dy;
          } else {
            goalX = p.x - dy * brain.strafe;
            goalY = p.y + dx * brain.strafe;
          }
        }
      } else if (d < 900 && mode !== 'coins' && mode !== 'hill') {
        goalX = target.x;
        goalY = target.y;
      }
    }
    // stuck recovery: if a moving bot barely moved for a second, pick a far wander goal for a while
    if (this.time - brain.lastCheck >= 1) {
      const moved = Math.hypot(p.x - brain.lastX, p.y - brain.lastY);
      if (
        brain.lastCheck > 0 &&
        moved < 14 &&
        (Math.abs(p.moveX) > 0.1 || Math.abs(p.moveY) > 0.1) &&
        this.time - p.respawnAt > 2.5
      ) {
        brain.unstuckUntil = this.time + 1.6;
        brain.wanderX = 80 + this.rng() * (WORLD_W - 160);
        brain.wanderY = 80 + this.rng() * (WORLD_H - 160);
        brain.path = [];
        brain.strafe = -brain.strafe;
      }
      brain.lastX = p.x;
      brain.lastY = p.y;
      brain.lastCheck = this.time;
    }
    if (this.time < brain.unstuckUntil) {
      goalX = brain.wanderX;
      goalY = brain.wanderY;
    }
    const dir = this.steer(p, brain, goalX, goalY);
    p.moveX = dir.x;
    p.moveY = dir.y;
    if (!p.shooting) p.aim = Math.atan2(p.moveY, p.moveX);
  }
  /** Direction toward a goal that goes around walls using grid pathfinding. */
  private steer(p: SimPlayer, brain: BotBrain, goalX: number, goalY: number): { x: number; y: number } {
    const nav = getNav(this.map);
    const gx = Math.min(WORLD_W - 30, Math.max(30, goalX));
    const gy = Math.min(WORLD_H - 30, Math.max(30, goalY));
    let tx = gx;
    let ty = gy;
    if (!segmentClear(nav, p.x, p.y, gx, gy)) {
      const moved = Math.hypot(brain.pathGoalX - gx, brain.pathGoalY - gy);
      if (!brain.path.length || moved > 90 || this.time >= brain.repathAt) {
        brain.path = findPath(nav, p.x, p.y, gx, gy);
        brain.pathGoalX = gx;
        brain.pathGoalY = gy;
        brain.repathAt = this.time + 1.2;
      }
      while (brain.path.length && Math.hypot(brain.path[0].x - p.x, brain.path[0].y - p.y) < 26)
        brain.path.shift();
      if (brain.path.length) {
        tx = brain.path[0].x;
        ty = brain.path[0].y;
      }
    } else brain.path = [];
    const dx = tx - p.x;
    const dy = ty - p.y;
    const d = Math.hypot(dx, dy);
    return d > 8 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 };
  }
}

const PICKUP_SPAWN_EVERY = 9;

export interface PlayerView {
  id: string;
  name: string;
  bot: boolean;
  boss: boolean;
  color: number;
  x: number;
  y: number;
  aim: number;
  hp: number;
  maxHp: number;
  kills: number;
  deaths: number;
  score: number;
  alive: boolean;
  invuln: boolean;
  team: number;
  char: string;
  /** Active timed effects as "effect:rarity" joined by commas. */
  fx: string;
  shield: number;
  slow: boolean;
  trail: number;
  bfx: number;
  spd: number;
  seq: number;
  /** Equipped skill ids, comma separated. */
  skills: string;
  /** Per slot cooldown as remaining:total seconds, comma separated. */
  cds: string;
  mp: number;
  maxMp: number;
  hidden: boolean;
  /** Seconds left of the cast in progress, 0 when not casting. */
  casting: number;
  weapon: number;
  acc: number;
  /** Seconds until this player may act (lobby, countdown or waiting to confirm). 0 = free. */
  hold: number;
}

export function toView(p: SimPlayer, sim: Sim): PlayerView {
  const t = sim.time;
  return {
    id: p.id,
    name: p.name,
    bot: p.bot,
    boss: p.boss,
    color: p.color,
    x: p.x,
    y: p.y,
    aim: p.aim,
    hp: p.hp,
    maxHp: p.maxHp,
    kills: p.kills,
    deaths: p.deaths,
    score: p.score,
    alive: p.alive,
    invuln: t < p.invulnUntil,
    team: p.team,
    char: p.charId,
    fx: p.effects
      .filter((e) => e.until > t)
      .map((e) => `${e.effect}:${e.rarity}`)
      .join(','),
    shield: p.shieldHits,
    slow: t < p.slowUntil,
    trail: p.trail,
    bfx: p.bfx,
    spd: sim.speedMul(p),
    seq: p.seq,
    skills: p.slots.map((s) => s.skillId).join(','),
    cds: p.slots
      .map(
        (s) =>
          `${Math.max(0, s.cdUntil - t).toFixed(1)}:${(s.stats.cooldown * CHARACTERS[p.charId].skillCd).toFixed(1)}`,
      )
      .join(','),
    mp: Math.round(p.mp),
    maxMp: p.maxMp,
    hidden: t < p.hiddenUntil,
    casting: p.castAt >= 0 ? Math.max(0, p.castAt - t) : 0,
    weapon: p.weapon,
    acc: p.acc,
    hold: Math.max(0, Math.max(sim.freezeUntil, p.holdUntil) - t),
  };
}
