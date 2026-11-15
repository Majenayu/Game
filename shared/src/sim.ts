import {
  BULLET_RADIUS,
  BULLET_SPEED,
  BULLET_TTL,
  FIRE_INTERVAL,
  INVULN_TIME,
  MAX_HP,
  MAX_PLAYERS,
  OBSTACLES,
  PICKUP_INTERVAL,
  PICKUP_RADIUS,
  PLAYER_COLORS,
  PLAYER_RADIUS,
  RAPID_DURATION,
  RAPID_FIRE_INTERVAL,
  RESPAWN_DELAY,
  ROUND_TIME,
  SCOREBOARD_TIME,
  WORLD_H,
  WORLD_W,
} from './constants';
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

export interface SimPlayer {
  id: string;
  name: string;
  bot: boolean;
  color: number;
  x: number;
  y: number;
  aim: number;
  hp: number;
  kills: number;
  deaths: number;
  alive: boolean;
  invulnUntil: number;
  rapidUntil: number;
  respawnAt: number;
  nextShot: number;
  moveX: number;
  moveY: number;
  shooting: boolean;
  seq: number;
}

export interface SimBullet {
  id: number;
  owner: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
}

export interface SimPickup {
  id: number;
  x: number;
  y: number;
}

export type SimEvent =
  | { t: 'hit'; id: string; by: string; x: number; y: number }
  | { t: 'kill'; id: string; by: string; x: number; y: number }
  | { t: 'respawn'; id: string; x: number; y: number }
  | { t: 'pickup'; id: string; x: number; y: number }
  | { t: 'roundStart'; round: number }
  | { t: 'roundEnd'; winner: string };

interface BotBrain {
  nextThink: number;
  wanderX: number;
  wanderY: number;
  wanderUntil: number;
  strafe: number;
  aimErr: number;
  targetId: string | null;
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

export class Sim {
  players = new Map<string, SimPlayer>();
  bullets: SimBullet[] = [];
  pickups: SimPickup[] = [];
  phase: Phase = 'play';
  timeLeft = ROUND_TIME;
  round = 1;
  winnerName = '';
  time = 0;
  events: SimEvent[] = [];

  private brains = new Map<string, BotBrain>();
  private nextId = 1;
  private nextBot = 1;
  private pickupTimer = PICKUP_INTERVAL;
  private scoreboardLeft = 0;

  constructor(private rng: Rng = Math.random) {}

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

  addPlayer(id: string, name: unknown, bot = false): SimPlayer {
    const used = new Set<number>();
    for (const p of this.players.values()) used.add(p.color);
    let color = PLAYER_COLORS.find((c) => !used.has(c));
    if (color === undefined) color = PLAYER_COLORS[this.players.size % PLAYER_COLORS.length];
    const spot = this.pickSpawn();
    const p: SimPlayer = {
      id,
      name: sanitizeNick(name, this.rng),
      bot,
      color,
      x: spot.x,
      y: spot.y,
      aim: 0,
      hp: MAX_HP,
      kills: 0,
      deaths: 0,
      alive: this.phase === 'play',
      invulnUntil: this.time + INVULN_TIME,
      rapidUntil: 0,
      respawnAt: 0,
      nextShot: 0,
      moveX: 0,
      moveY: 0,
      shooting: false,
      seq: 0,
    };
    this.players.set(id, p);
    if (bot) this.brains.set(id, this.newBrain());
    return p;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
    this.brains.delete(id);
    this.bullets = this.bullets.filter((b) => b.owner !== id);
  }

  /** Keeps total seats at MAX_PLAYERS: bots fill whatever humans do not use. */
  rebalanceBots(): void {
    const want = Math.max(0, MAX_PLAYERS - this.humanCount);
    while (this.botCount > want) {
      let victim: string | null = null;
      for (const p of this.players.values()) if (p.bot) victim = p.id;
      if (!victim) break;
      this.removePlayer(victim);
    }
    while (this.botCount < want) {
      const taken = new Set(Array.from(this.players.values()).map((p) => p.name));
      let name = BOT_NAMES[(this.nextBot++ - 1) % BOT_NAMES.length];
      if (taken.has(name)) name = `${name}${this.nextBot}`;
      this.addPlayer(`bot_${this.nextId++}`, name, true);
    }
  }

  applyInput(id: string, input: PlayerInput): void {
    const p = this.players.get(id);
    if (!p || p.bot) return;
    p.moveX = input.moveX;
    p.moveY = input.moveY;
    p.aim = input.aim;
    p.shooting = input.shooting;
    p.seq = input.seq;
  }

  step(dt: number): void {
    this.time += dt;
    if (this.phase === 'scoreboard') {
      this.scoreboardLeft -= dt;
      if (this.scoreboardLeft <= 0) this.startRound();
      return;
    }
    this.timeLeft -= dt;

    for (const p of this.players.values()) {
      if (p.bot) this.thinkBot(p);
      if (!p.alive) {
        if (this.time >= p.respawnAt) this.respawn(p);
        continue;
      }
      const m = movePlayer(p.x, p.y, p.moveX, p.moveY, dt);
      p.x = m.x;
      p.y = m.y;
      if (p.shooting && this.time >= p.nextShot) this.fire(p);
    }

    this.stepBullets(dt);
    this.stepPickups(dt);

    if (this.timeLeft <= 0) this.endRound();
  }

  private fire(p: SimPlayer): void {
    const rapid = this.time < p.rapidUntil;
    let interval = rapid ? RAPID_FIRE_INTERVAL : FIRE_INTERVAL;
    if (p.bot) interval *= 1.6;
    p.nextShot = this.time + interval;
    const dx = Math.cos(p.aim);
    const dy = Math.sin(p.aim);
    this.bullets.push({
      id: this.nextId++,
      owner: p.id,
      x: p.x + dx * (PLAYER_RADIUS + 2),
      y: p.y + dy * (PLAYER_RADIUS + 2),
      vx: dx * BULLET_SPEED,
      vy: dy * BULLET_SPEED,
      ttl: BULLET_TTL,
    });
  }

  private stepBullets(dt: number): void {
    const keep: SimBullet[] = [];
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.ttl -= dt;
      if (b.ttl <= 0 || b.x < 0 || b.y < 0 || b.x > WORLD_W || b.y > WORLD_H) continue;
      if (OBSTACLES.some((o) => pointInRect(b.x, b.y, o, BULLET_RADIUS))) continue;
      let consumed = false;
      for (const p of this.players.values()) {
        if (!p.alive || p.id === b.owner) continue;
        if (!circlesOverlap(b.x, b.y, BULLET_RADIUS, p.x, p.y, PLAYER_RADIUS)) continue;
        consumed = true;
        if (this.time >= p.invulnUntil) this.damage(p, b.owner);
        break;
      }
      if (!consumed) keep.push(b);
    }
    this.bullets = keep;
  }

  private damage(victim: SimPlayer, by: string): void {
    victim.hp -= 1;
    if (victim.hp > 0) {
      this.events.push({ t: 'hit', id: victim.id, by, x: victim.x, y: victim.y });
      return;
    }
    victim.hp = 0;
    victim.alive = false;
    victim.deaths += 1;
    victim.shooting = false;
    victim.respawnAt = this.time + RESPAWN_DELAY;
    const killer = this.players.get(by);
    if (killer) killer.kills += 1;
    this.events.push({ t: 'kill', id: victim.id, by, x: victim.x, y: victim.y });
  }

  private respawn(p: SimPlayer): void {
    const s = this.pickSpawn(p.id);
    p.x = s.x;
    p.y = s.y;
    p.hp = MAX_HP;
    p.alive = true;
    p.invulnUntil = this.time + INVULN_TIME;
    p.rapidUntil = 0;
    this.events.push({ t: 'respawn', id: p.id, x: p.x, y: p.y });
  }

  private stepPickups(dt: number): void {
    this.pickupTimer -= dt;
    if (this.pickupTimer <= 0) {
      this.pickupTimer = PICKUP_INTERVAL;
      if (this.pickups.length === 0) {
        const s = this.pickSpawn();
        this.pickups.push({ id: this.nextId++, x: s.x, y: s.y });
      }
    }
    this.pickups = this.pickups.filter((pk) => {
      for (const p of this.players.values()) {
        if (p.alive && circlesOverlap(pk.x, pk.y, PICKUP_RADIUS, p.x, p.y, PLAYER_RADIUS)) {
          p.rapidUntil = this.time + RAPID_DURATION;
          this.events.push({ t: 'pickup', id: p.id, x: pk.x, y: pk.y });
          return false;
        }
      }
      return true;
    });
  }

  /** Picks a free spot, preferring distance from living players. */
  pickSpawn(excludeId?: string): { x: number; y: number } {
    let best = { x: WORLD_W / 2, y: 80 };
    let bestScore = -1;
    for (let i = 0; i < 24; i++) {
      const x = 60 + this.rng() * (WORLD_W - 120);
      const y = 60 + this.rng() * (WORLD_H - 120);
      if (OBSTACLES.some((o) => pointInRect(x, y, o, PLAYER_RADIUS + 10))) continue;
      let nearest = 1e9;
      for (const p of this.players.values()) {
        if (p.id === excludeId || !p.alive) continue;
        nearest = Math.min(nearest, Math.hypot(p.x - x, p.y - y));
      }
      if (nearest > bestScore) {
        bestScore = nearest;
        best = { x, y };
      }
    }
    return best;
  }

  standings(): SimPlayer[] {
    return Array.from(this.players.values()).sort(
      (a, b) => b.kills - a.kills || a.deaths - b.deaths || a.name.localeCompare(b.name),
    );
  }

  private endRound(): void {
    this.phase = 'scoreboard';
    this.scoreboardLeft = SCOREBOARD_TIME;
    this.timeLeft = 0;
    this.bullets = [];
    this.pickups = [];
    for (const p of this.players.values()) {
      p.shooting = false;
      p.moveX = 0;
      p.moveY = 0;
    }
    const top = this.standings()[0];
    this.winnerName = top && top.kills > 0 ? top.name : '';
    this.events.push({ t: 'roundEnd', winner: this.winnerName });
  }

  private startRound(): void {
    this.phase = 'play';
    this.round += 1;
    this.timeLeft = ROUND_TIME;
    this.winnerName = '';
    this.pickupTimer = PICKUP_INTERVAL;
    for (const p of this.players.values()) {
      p.kills = 0;
      p.deaths = 0;
      p.hp = MAX_HP;
      p.alive = true;
      p.rapidUntil = 0;
      p.invulnUntil = this.time + INVULN_TIME;
      p.nextShot = 0;
      const s = this.pickSpawn(p.id);
      p.x = s.x;
      p.y = s.y;
    }
    this.events.push({ t: 'roundStart', round: this.round });
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
    };
  }

  private thinkBot(p: SimPlayer): void {
    const brain = this.brains.get(p.id);
    if (!brain) return;
    if (!p.alive) {
      p.shooting = false;
      return;
    }
    if (this.time >= brain.nextThink) {
      brain.nextThink = this.time + 0.2 + this.rng() * 0.15;
      brain.aimErr = (this.rng() - 0.5) * 0.32;
      if (this.rng() < 0.15) brain.strafe = -brain.strafe;
      let target: SimPlayer | null = null;
      let best = 1e9;
      for (const o of this.players.values()) {
        if (o.id === p.id || !o.alive) continue;
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
    }

    const target = brain.targetId ? this.players.get(brain.targetId) : undefined;
    let goalX = brain.wanderX;
    let goalY = brain.wanderY;
    p.shooting = false;
    const pk = this.pickups[0];
    if (pk && Math.hypot(pk.x - p.x, pk.y - p.y) < 450) {
      goalX = pk.x;
      goalY = pk.y;
    } else if (target && target.alive) {
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const d = Math.hypot(dx, dy);
      const visible = d < 700 && !segmentBlocked(p.x, p.y, target.x, target.y);
      if (visible) {
        p.aim = normalizeAngle(Math.atan2(dy, dx) + brain.aimErr);
        p.shooting = true;
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
      } else if (d < 900) {
        goalX = target.x;
        goalY = target.y;
      }
    }
    const gx = goalX - p.x;
    const gy = goalY - p.y;
    const gd = Math.hypot(gx, gy);
    if (gd > 8) {
      p.moveX = gx / gd;
      p.moveY = gy / gd;
    } else {
      p.moveX = 0;
      p.moveY = 0;
    }
    if (!p.shooting) p.aim = Math.atan2(p.moveY, p.moveX);
  }
}

export interface PlayerView {
  id: string;
  name: string;
  bot: boolean;
  color: number;
  x: number;
  y: number;
  aim: number;
  hp: number;
  kills: number;
  deaths: number;
  alive: boolean;
  invuln: boolean;
  rapid: boolean;
  seq: number;
}

export function toView(p: SimPlayer, time: number): PlayerView {
  return {
    id: p.id,
    name: p.name,
    bot: p.bot,
    color: p.color,
    x: p.x,
    y: p.y,
    aim: p.aim,
    hp: p.hp,
    kills: p.kills,
    deaths: p.deaths,
    alive: p.alive,
    invuln: time < p.invulnUntil,
    rapid: time < p.rapidUntil,
    seq: p.seq,
  };
}
