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
  CHARACTERS,
  CHARACTER_LIST,
  MODES,
  SKILLS,
  SKILL_LIST,
  powerupId,
  powerupStats,
  rollPowerup,
  sanitizeLoadout,
  type EffectId,
  type ModeId,
  type PowerupDef,
} from './content';
import { ROTATION, getMap, type MapDef } from './maps';
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
  skills: [string, string];
  cd: [number, number];
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
  nextRegen: number;
  nextHazard: number;
  holdAcc: number;
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
}

export type SimEvent =
  | { t: 'hit'; id: string; by: string; x: number; y: number }
  | { t: 'kill'; id: string; by: string; x: number; y: number }
  | { t: 'respawn'; id: string; x: number; y: number }
  | { t: 'pickup'; id: string; pu: number; x: number; y: number }
  | { t: 'coin'; id: string; v: number; x: number; y: number }
  | { t: 'skill'; id: string; skill: string; x: number; y: number }
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
const MINE_BLAST = 85;
const HAZARD_INTERVAL = 1.5;
const DASH_TIME = 0.18;
const DASH_SPEED = 900;
const MAX_EFFECTS = 4;

export interface PlayerOpts {
  charId?: string;
  skills?: [string, string];
  color?: number;
  trail?: number;
  bfx?: number;
  boss?: boolean;
}

export class Sim {
  players = new Map<string, SimPlayer>();
  bullets: SimBullet[] = [];
  pickups: SimPickup[] = [];
  coins: SimCoin[] = [];
  mines: SimMine[] = [];
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
      skills: opts.skills,
      color: 0,
      trail: opts.trail,
      bfx: opts.bfx,
    });
    const ch = CHARACTERS[load.char];
    const used = new Set<number>();
    for (const p of this.players.values()) used.add(p.color);
    let color = opts.color;
    if (color === undefined)
      color =
        PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[this.players.size % PLAYER_COLORS.length];
    const boss = opts.boss === true;
    const maxHp = boss ? 12 : ch.hp;
    const spot = this.pickSpawn();
    const p: SimPlayer = {
      id,
      name: sanitizeNick(name, this.rng),
      bot,
      boss,
      color,
      charId: load.char,
      skills: load.skills,
      cd: [0, 0],
      trail: load.trail,
      bfx: load.bfx,
      team: MODES[this.mode].team ? this.smallerTeam() : 0,
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
      nextRegen: this.time + (ch.regen || 0),
      nextHazard: 0,
      holdAcc: 0,
    };
    if (boss) {
      p.skills = ['shield', 'pulse'];
      p.charId = 'titan';
    }
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
        name = 'Overlord';
      }
      const ch = CHARACTER_LIST[Math.floor(this.rng() * CHARACTER_LIST.length)];
      const pool = SKILL_LIST.map((s) => s.id);
      const a = pool[Math.floor(this.rng() * pool.length)];
      let b = pool[Math.floor(this.rng() * pool.length)];
      if (b === a) b = pool[(pool.indexOf(a) + 1) % pool.length];
      this.addPlayer(`bot_${this.nextId++}`, name, true, {
        charId: ch.id,
        skills: [a, b],
        trail: Math.floor(this.rng() * 3),
        bfx: Math.floor(this.rng() * BULLET_FX.length),
        boss,
      });
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
    p.pendingSkill |= input.skill & 3;
  }

  /** Applies a validated loadout to a human player (used on join). */
  setLoadout(id: string, raw: unknown): void {
    const p = this.players.get(id);
    if (!p || p.bot) return;
    const l = sanitizeLoadout(raw);
    const ch = CHARACTERS[l.char];
    p.charId = l.char;
    p.skills = l.skills;
    p.trail = l.trail;
    p.bfx = l.bfx;
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
    this.timeLeft -= dt;

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
      if (p.pendingSkill) {
        for (let s = 0; s < 2; s++)
          if (p.pendingSkill & (1 << s) && this.time >= p.cd[s]) this.useSkill(p, s);
        p.pendingSkill = 0;
      }
      if (this.time < p.dashUntil) {
        const m = movePlayer(p.x, p.y, p.dashX, p.dashY, dt, DASH_SPEED, this.map.obstacles);
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
    const speed = BULLET_SPEED * ch.bulletSpeed;
    this.bullets.push({
      id: this.nextId++,
      owner: p.id,
      team: p.team,
      x: p.x + dx * (PLAYER_RADIUS + 2),
      y: p.y + dy * (PLAYER_RADIUS + 2),
      vx: dx * speed,
      vy: dy * speed,
      ttl: BULLET_TTL * (ric ? 1.4 : 1),
      r: BULLET_RADIUS * (big ? 1.4 + 0.3 * big.power : 1),
      dmg: od ? 2 : 1,
      pierce: pierce ? Math.ceil(pierce.power) : 0,
      bounce: ric ? Math.ceil(ric.power) : 0,
      freeze: !!this.eff(p, 'freeze'),
      hit: [],
      kind: p.bfx,
    });
  }

  private fire(p: SimPlayer): void {
    const ch = CHARACTERS[p.charId];
    const rapid = this.eff(p, 'rapid');
    let interval = FIRE_INTERVAL * ch.fire;
    if (rapid) interval /= 1 + 0.9 * rapid.power;
    if (p.boss) interval *= 0.8;
    else if (p.bot) interval *= 2.2 - this.cfg.botSkill;
    p.nextShot = this.time + interval;
    if (this.eff(p, 'triple')) {
      this.shoot(p, p.aim - 0.2);
      this.shoot(p, p.aim);
      this.shoot(p, p.aim + 0.2);
    } else this.shoot(p, p.aim);
  }

  private stepBullets(dt: number): void {
    const keep: SimBullet[] = [];
    const obs = this.map.obstacles;
    for (const b of this.bullets) {
      const ox = b.x;
      const oy = b.y;
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
    if (this.time < victim.invulnUntil) return;
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

  private respawn(p: SimPlayer): void {
    const s = this.pickSpawn(p.id);
    p.x = s.x;
    p.y = s.y;
    p.hp = p.maxHp;
    p.alive = true;
    p.invulnUntil = this.time + INVULN_TIME;
    p.cd = [0, 0];
    p.dashUntil = 0;
    this.events.push({ t: 'respawn', id: p.id, x: p.x, y: p.y });
  }

  // ---- skills -------------------------------------------------------------

  private useSkill(p: SimPlayer, slot: number): void {
    const id = p.skills[slot];
    const def = SKILLS[id];
    if (!def) return;
    p.cd[slot] = this.time + def.cd * CHARACTERS[p.charId].skillCd;
    this.events.push({ t: 'skill', id: p.id, skill: id, x: p.x, y: p.y });
    switch (id) {
      case 'dash': {
        let dx = p.moveX;
        let dy = p.moveY;
        if (Math.hypot(dx, dy) < 0.1) {
          dx = Math.cos(p.aim);
          dy = Math.sin(p.aim);
        }
        const l = Math.hypot(dx, dy) || 1;
        p.dashX = dx / l;
        p.dashY = dy / l;
        p.dashUntil = this.time + DASH_TIME;
        break;
      }
      case 'shield':
        p.invulnUntil = Math.max(p.invulnUntil, this.time + 1.8);
        break;
      case 'pulse':
        for (const o of this.players.values()) {
          if (!o.alive || !this.isEnemy(p, o)) continue;
          const dx = o.x - p.x;
          const dy = o.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d > 170) continue;
          const m = movePlayer(
            o.x,
            o.y,
            dx / (d || 1),
            dy / (d || 1),
            140 / PLAYER_SPEED,
            PLAYER_SPEED,
            this.map.obstacles,
          );
          o.x = m.x;
          o.y = m.y;
          this.hurt(o, p.id, 1);
        }
        this.events.push({ t: 'boom', x: p.x, y: p.y });
        break;
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
          expires: this.time + 25,
        });
        break;
      }
      case 'repair':
        p.hp = Math.min(p.maxHp, p.hp + 1);
        break;
      case 'blink': {
        let x = p.x;
        let y = p.y;
        for (let i = 0; i < 13; i++) {
          const m = movePlayer(
            x,
            y,
            Math.cos(p.aim),
            Math.sin(p.aim),
            20 / PLAYER_SPEED,
            PLAYER_SPEED,
            this.map.obstacles,
          );
          x = m.x;
          y = m.y;
        }
        p.x = x;
        p.y = y;
        break;
      }
      case 'burst':
        for (let i = -2; i <= 2; i++) this.shoot(p, p.aim + i * 0.17);
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
      for (const p of this.players.values()) {
        if (!p.alive || p.id === m.owner) continue;
        if (MODES[this.mode].team && p.team === m.team) continue;
        if (Math.hypot(p.x - m.x, p.y - m.y) <= MINE_BLAST) this.hurt(p, m.owner, 1);
      }
    }
    this.mines = keep;
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
  pickSpawn(excludeId?: string, awayFromPlayers = true): { x: number; y: number } {
    let best = { x: WORLD_W / 2, y: 80 };
    let bestScore = -1;
    for (let i = 0; i < 24; i++) {
      const x = 60 + this.rng() * (WORLD_W - 120);
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
      p.cd = [0, 0];
      p.dashUntil = 0;
      p.slowUntil = 0;
      p.invulnUntil = this.time + INVULN_TIME;
      p.nextShot = 0;
      const s = this.pickSpawn(p.id);
      p.x = s.x;
      p.y = s.y;
    }
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
    };
  }

  private botUse(p: SimPlayer, ids: string[]): boolean {
    for (let s = 0; s < 2; s++) {
      if (ids.includes(p.skills[s]) && this.time >= p.cd[s]) {
        this.useSkill(p, s);
        return true;
      }
    }
    return false;
  }

  private thinkBot(p: SimPlayer): void {
    const brain = this.brains.get(p.id);
    if (!brain) return;
    if (!p.alive) {
      p.shooting = false;
      return;
    }
    const skill = p.boss ? 0.9 : this.cfg.botSkill;
    if (this.time >= brain.nextThink) {
      brain.nextThink = this.time + 0.35 - skill * 0.15 + this.rng() * 0.15;
      brain.aimErr = (this.rng() - 0.5) * (0.12 + (1 - skill) * 0.6);
      if (this.rng() < 0.15) brain.strafe = -brain.strafe;
      let target: SimPlayer | null = null;
      let best = 1e9;
      for (const o of this.players.values()) {
        if (!o.alive || !this.isEnemy(p, o)) continue;
        const d = Math.hypot(o.x - p.x, o.y - p.y);
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
      // skills
      if (this.rng() < 0.25 + skill * 0.5) {
        if (p.hp <= 1 && p.maxHp > 1) {
          this.botUse(p, ['shield', 'repair', 'dash', 'blink']);
        } else if (target && best < 170) {
          this.botUse(p, ['pulse', 'shield']);
        } else if (target && best < 380) {
          this.botUse(p, ['burst', 'mine']);
        }
      }
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
  sk0: string;
  sk1: string;
  cd0: number;
  cd1: number;
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
    sk0: p.skills[0],
    sk1: p.skills[1],
    cd0: Math.max(0, p.cd[0] - t),
    cd1: Math.max(0, p.cd[1] - t),
  };
}
