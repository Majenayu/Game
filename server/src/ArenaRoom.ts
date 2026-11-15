import { Room, ServerError, type AuthContext, type Client } from '@colyseus/core';
import {
  COLORS,
  MAX_PLAYERS,
  MSG_EVENT,
  MSG_INPUT,
  RECONNECT_SECONDS,
  Sim,
  TICK_MS,
  isMapId,
  isModeId,
  powerupId,
  sanitizeInput,
  toView,
  type ModeId,
  type PowerupDef,
} from '@orb/shared';
import { ArenaState, BulletState, CoinState, MineState, PickupState, PlayerState } from './schema';

const MAX_CONN_PER_IP = Number(process.env.MAX_CONN_PER_IP ?? 16);
const MAX_MSGS_PER_SEC = 60;

const ipCounts = new Map<string, number>();

function clientIp(ctx: AuthContext | undefined): string {
  if (!ctx) return 'unknown';
  const h = ctx.headers ?? {};
  const fly = h['fly-client-ip'];
  if (typeof fly === 'string') return fly;
  const xff = h['x-forwarded-for'];
  if (typeof xff === 'string') return xff.split(',')[0].trim();
  const ip = Array.isArray(ctx.ip) ? ctx.ip[0] : ctx.ip;
  return ip ?? 'unknown';
}

interface JoinOptions {
  name?: unknown;
  mode?: unknown;
  map?: unknown;
  loadout?: unknown;
  private?: unknown;
}

function pickMode(v: unknown): ModeId | 'mix' {
  return v === 'mix' || isModeId(v) ? v : 'mix';
}

function pickMap(v: unknown): string {
  return v === 'rotate' || isMapId(v) ? (v as string) : 'rotate';
}

export class ArenaRoom extends Room<ArenaState> {
  maxClients = MAX_PLAYERS;
  sim = new Sim();

  private acc = 0;
  private ipBySession = new Map<string, string>();
  private rate = new Map<string, { windowStart: number; count: number }>();

  onCreate(options?: JoinOptions): void {
    // Instant Multiplayer rooms are private: friends join by room id or invite link.
    if (options?.private === true) void this.setPrivate(true);
    this.sim = new Sim(Math.random, { mode: pickMode(options?.mode), mapId: pickMap(options?.map) });
    this.setState(new ArenaState());
    this.sim.rebalanceBots();
    this.syncState();

    this.onMessage(MSG_INPUT, (client, raw) => {
      if (!this.allowMessage(client.sessionId)) return;
      const input = sanitizeInput(raw);
      if (input) this.sim.applyInput(client.sessionId, input);
    });

    this.setSimulationInterval((deltaMs) => {
      this.acc += Math.min(deltaMs, 250);
      let steps = 0;
      while (this.acc >= TICK_MS && steps < 4) {
        this.sim.step(TICK_MS / 1000);
        this.acc -= TICK_MS;
        steps++;
      }
      if (steps > 0) {
        this.syncState();
        for (const ev of this.sim.drainEvents()) this.broadcast(MSG_EVENT, ev);
      }
    }, TICK_MS);
  }

  onAuth(client: Client, options: JoinOptions | undefined, context?: AuthContext): boolean {
    // Reject garbage mode/map values so nobody can spawn rooms with arbitrary keys.
    if (options?.mode !== undefined && options.mode !== 'mix' && !isModeId(options.mode)) {
      throw new ServerError(400, 'Bad mode');
    }
    if (options?.map !== undefined && options.map !== 'rotate' && !isMapId(options.map)) {
      throw new ServerError(400, 'Bad map');
    }
    if (!this.ipBySession.has(client.sessionId)) {
      const ip = clientIp(context);
      const n = ipCounts.get(ip) ?? 0;
      if (n >= MAX_CONN_PER_IP) throw new ServerError(429, 'Too many connections');
      ipCounts.set(ip, n + 1);
      this.ipBySession.set(client.sessionId, ip);
    }
    return true;
  }

  onJoin(client: Client, options: JoinOptions | undefined): void {
    this.sim.addPlayer(client.sessionId, options?.name);
    this.sim.setLoadout(client.sessionId, options?.loadout);
    const colorId = (options?.loadout as { color?: unknown } | undefined)?.color;
    const p = this.sim.players.get(client.sessionId);
    if (p && Number.isInteger(colorId)) p.color = colorHex(colorId as number, p.color);
    this.sim.rebalanceBots();
    if (this.sim.humanCount >= MAX_PLAYERS) void this.lock();
    this.syncState();
  }

  async onLeave(client: Client, consented: boolean): Promise<void> {
    const p = this.sim.players.get(client.sessionId);
    if (p) {
      p.moveX = 0;
      p.moveY = 0;
      p.shooting = false;
    }
    if (!consented) {
      try {
        await this.allowReconnection(client, RECONNECT_SECONDS);
        return;
      } catch {
        // reconnection window expired
      }
    }
    this.removeHuman(client.sessionId);
  }

  onDispose(): void {
    for (const id of Array.from(this.ipBySession.keys())) this.releaseIp(id);
  }

  private removeHuman(id: string): void {
    this.sim.removePlayer(id);
    this.sim.rebalanceBots();
    this.rate.delete(id);
    this.releaseIp(id);
    if (this.sim.humanCount < MAX_PLAYERS) void this.unlock();
    this.syncState();
  }

  private releaseIp(sessionId: string): void {
    const ip = this.ipBySession.get(sessionId);
    if (ip === undefined) return;
    this.ipBySession.delete(sessionId);
    const n = (ipCounts.get(ip) ?? 1) - 1;
    if (n <= 0) ipCounts.delete(ip);
    else ipCounts.set(ip, n);
  }

  private allowMessage(id: string): boolean {
    const now = Date.now();
    let r = this.rate.get(id);
    if (!r || now - r.windowStart >= 1000) {
      r = { windowStart: now, count: 0 };
      this.rate.set(id, r);
    }
    r.count++;
    return r.count <= MAX_MSGS_PER_SEC;
  }

  private syncState(): void {
    const s = this.state;
    const sim = this.sim;
    s.phase = sim.phase;
    s.mode = sim.mode;
    s.mapId = sim.map.id;
    s.timeLeft = Math.max(0, sim.timeLeft);
    s.round = sim.round;
    s.winner = sim.winnerName;
    s.winnerTeam = sim.winnerTeam;
    s.teamScore0 = sim.teamScore[0];
    s.teamScore1 = sim.teamScore[1];
    s.hillHolder = sim.hillHolder;

    for (const id of Array.from(s.players.keys())) if (!sim.players.has(id)) s.players.delete(id);
    for (const p of sim.players.values()) {
      let ps = s.players.get(p.id);
      if (!ps) {
        ps = new PlayerState();
        s.players.set(p.id, ps);
      }
      const v = toView(p, sim);
      ps.name = v.name;
      ps.bot = v.bot;
      ps.boss = v.boss;
      ps.color = v.color;
      ps.char = v.char;
      ps.x = v.x;
      ps.y = v.y;
      ps.aim = v.aim;
      ps.hp = v.hp;
      ps.maxHp = v.maxHp;
      ps.kills = v.kills;
      ps.deaths = v.deaths;
      ps.score = v.score;
      ps.alive = v.alive;
      ps.invuln = v.invuln;
      ps.team = v.team;
      ps.fx = v.fx;
      ps.shield = v.shield;
      ps.slow = v.slow;
      ps.trail = v.trail;
      ps.bfx = v.bfx;
      ps.spd = v.spd;
      ps.seq = v.seq;
      ps.sk0 = v.sk0;
      ps.sk1 = v.sk1;
      ps.cd0 = Math.round(v.cd0 * 10) / 10;
      ps.cd1 = Math.round(v.cd1 * 10) / 10;
    }

    syncMap(
      s.bullets,
      sim.bullets.map((b) => ({ key: String(b.id), b })),
      (st: BulletState, b) => {
        st.x = b.x;
        st.y = b.y;
      },
      (b) => {
        const st = new BulletState();
        st.owner = b.owner;
        st.vx = b.vx;
        st.vy = b.vy;
        st.r = b.r;
        st.kind = b.kind;
        st.x = b.x;
        st.y = b.y;
        return st;
      },
      true,
    );
    syncMap(
      s.pickups,
      sim.pickups.map((pk) => ({ key: String(pk.id), b: pk })),
      (st: PickupState, pk) => {
        st.x = pk.x;
        st.y = pk.y;
      },
      (pk) => {
        const st = new PickupState();
        st.x = pk.x;
        st.y = pk.y;
        st.pu = powerupId(pk.pu as PowerupDef);
        return st;
      },
      true,
    );
    syncMap(
      s.coins,
      sim.coins.map((c) => ({ key: String(c.id), b: c })),
      (st: CoinState, c) => {
        st.x = c.x;
        st.y = c.y;
      },
      (c) => {
        const st = new CoinState();
        st.x = c.x;
        st.y = c.y;
        st.v = c.v;
        return st;
      },
      true,
    );
    syncMap(
      s.mines,
      sim.mines.map((m) => ({ key: String(m.id), b: m })),
      (st: MineState, m) => {
        st.armed = sim.time >= m.armedAt;
      },
      (m) => {
        const st = new MineState();
        st.x = m.x;
        st.y = m.y;
        st.owner = m.owner;
        st.armed = sim.time >= m.armedAt;
        return st;
      },
      false,
    );
  }
}

function colorHex(id: number, fallback: number): number {
  const c = COLORS[id];
  return c && c.hex !== undefined ? c.hex : fallback;
}

/** Adds, updates and removes entries of a schema map so it mirrors `items`. */
function syncMap<S extends { x: number }, T>(
  map: {
    get(k: string): S | undefined;
    set(k: string, v: S): void;
    delete(k: string): boolean;
    keys(): IterableIterator<string>;
  },
  items: Array<{ key: string; b: T }>,
  update: (st: S, item: T) => void,
  create: (item: T) => S,
  _movesEveryTick: boolean,
): void {
  const live = new Set<string>();
  for (const { key, b } of items) {
    live.add(key);
    const st = map.get(key);
    if (st) update(st, b);
    else map.set(key, create(b));
  }
  for (const key of Array.from(map.keys())) if (!live.has(key)) map.delete(key);
}
