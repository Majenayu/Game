import { Room, ServerError, type AuthContext, type Client } from '@colyseus/core';
import {
  MAX_PLAYERS,
  MSG_EVENT,
  MSG_INPUT,
  RECONNECT_SECONDS,
  Sim,
  TICK_MS,
  sanitizeInput,
  toView,
} from '@orb/shared';
import { ArenaState, BulletState, PickupState, PlayerState } from './schema';

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

export class ArenaRoom extends Room<ArenaState> {
  maxClients = MAX_PLAYERS;
  sim = new Sim();

  private acc = 0;
  private ipBySession = new Map<string, string>();
  private rate = new Map<string, { windowStart: number; count: number }>();

  onCreate(options?: { private?: unknown }): void {
    // Instant Multiplayer rooms are private: friends join by room id or invite link.
    if (options?.private === true) void this.setPrivate(true);
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

  onAuth(client: Client, _options: unknown, context?: AuthContext): boolean {
    if (!this.ipBySession.has(client.sessionId)) {
      const ip = clientIp(context);
      const n = ipCounts.get(ip) ?? 0;
      if (n >= MAX_CONN_PER_IP) throw new ServerError(429, 'Too many connections');
      ipCounts.set(ip, n + 1);
      this.ipBySession.set(client.sessionId, ip);
    }
    return true;
  }

  onJoin(client: Client, options: { name?: unknown } | undefined): void {
    this.sim.addPlayer(client.sessionId, options?.name);
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
    s.timeLeft = Math.max(0, sim.timeLeft);
    s.round = sim.round;
    s.winner = sim.winnerName;

    for (const id of Array.from(s.players.keys())) if (!sim.players.has(id)) s.players.delete(id);
    for (const p of sim.players.values()) {
      let ps = s.players.get(p.id);
      if (!ps) {
        ps = new PlayerState();
        s.players.set(p.id, ps);
      }
      const v = toView(p, sim.time);
      ps.name = v.name;
      ps.bot = v.bot;
      ps.color = v.color;
      ps.x = v.x;
      ps.y = v.y;
      ps.aim = v.aim;
      ps.hp = v.hp;
      ps.kills = v.kills;
      ps.deaths = v.deaths;
      ps.alive = v.alive;
      ps.invuln = v.invuln;
      ps.rapid = v.rapid;
      ps.seq = v.seq;
    }

    const live = new Set<string>();
    for (const b of sim.bullets) {
      const key = String(b.id);
      live.add(key);
      let bs = s.bullets.get(key);
      if (!bs) {
        bs = new BulletState();
        bs.owner = b.owner;
        bs.vx = b.vx;
        bs.vy = b.vy;
        bs.x = b.x;
        bs.y = b.y;
        s.bullets.set(key, bs);
      } else {
        bs.x = b.x;
        bs.y = b.y;
      }
    }
    for (const key of Array.from(s.bullets.keys())) if (!live.has(key)) s.bullets.delete(key);

    const livePk = new Set<string>();
    for (const pk of sim.pickups) {
      const key = String(pk.id);
      livePk.add(key);
      if (!s.pickups.has(key)) {
        const ps = new PickupState();
        ps.x = pk.x;
        ps.y = pk.y;
        s.pickups.set(key, ps);
      }
    }
    for (const key of Array.from(s.pickups.keys())) if (!livePk.has(key)) s.pickups.delete(key);
  }
}
