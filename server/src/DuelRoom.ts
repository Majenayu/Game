import { Room, type Client } from '@colyseus/core';
import { MapSchema, Schema, type } from '@colyseus/schema';
import { Duel, MSG_INPUT, MSG_READY, TICK_MS, fighterView, rankedTier, sanitizeInput, sanitizeNick } from '@orb/shared';
import { applyRanked } from './api';
import { type Store, hashToken, validToken } from './store';

export class FighterState extends Schema {
  @type('string') name = '';
  @type('boolean') bot = false;
  @type('uint32') color = 0;
  @type('string') char = 'nova';
  @type('uint8') weapon = 0;
  @type('uint8') acc = 0;
  @type('float32') x = 0;
  @type('float32') y = 0;
  @type('int8') facing = 1;
  @type('uint16') hp = 0;
  @type('uint16') maxHp = 0;
  @type('uint8') mp = 0;
  @type('string') act = 'idle';
  @type('float32') actT = 0;
  @type('uint8') combo = 0;
  @type('uint8') wins = 0;
  @type('boolean') ready = false;
  @type('boolean') shield = false;
  @type('boolean') buff = false;
  @type('string') skills = '';
  @type('string') cds = '';
}
export class ShotState extends Schema {
  @type('float32') x = 0;
  @type('float32') y = 0;
  @type('float32') vx = 0;
  @type('uint32') color = 0;
}
export class DuelState extends Schema {
  @type({ map: FighterState }) fighters = new MapSchema<FighterState>();
  @type({ map: ShotState }) shots = new MapSchema<ShotState>();
  @type('string') phase = 'lobby';
  @type('float32') timer = 0;
  @type('uint8') round = 1;
  @type('string') winner = '';
  @type('boolean') waiting = true;
}

/** Seconds a lone player waits for a human opponent before a ranked bot steps in. */
export const BOT_FILL_SECONDS = 12;
const MAX_MSGS_PER_SEC = 60;

/** Ranked 1v1 duel (side-view fighting). Two seats; a bot fills in when nobody else is queueing. */
export class DuelRoom extends Room<DuelState> {
  maxClients = 2;
  duel = new Duel(Math.random, 0.6);
  private acc = 0;
  private waited = 0;
  private rate = new Map<string, { t: number; n: number }>();
  private store: Store | null = null;
  /** Session id -> registered player id. */
  private players = new Map<string, string>();
  private rated = false;

  onCreate(options?: { store?: Store }): void {
    this.store = options?.store ?? null;
    this.setState(new DuelState());
    this.onMessage(MSG_INPUT, (c, raw) => {
      if (!this.allow(c.sessionId)) return;
      const i = sanitizeInput(raw);
      if (i) this.duel.input(c.sessionId, i);
    });
    this.onMessage(MSG_READY, (c) => {
      if (this.allow(c.sessionId)) this.duel.confirm(c.sessionId);
    });
    this.setSimulationInterval((ms) => {
      this.acc += Math.min(ms, 250);
      let n = 0;
      while (this.acc >= TICK_MS && n < 4) {
        this.duel.step(TICK_MS / 1000);
        this.acc -= TICK_MS;
        n++;
      }
      if (this.duel.fighters.length === 1 && this.duel.phase === 'lobby') {
        this.waited += ms / 1000;
        if (this.waited >= BOT_FILL_SECONDS) {
          // Fill opponent: looks and plays like a normal ranked player.
          this.duel.add('bot', { name: this.duel.randomName(), bot: true, level: 1 + Math.floor(Math.random() * 20) });
          this.duel.timer = 25;
          void this.lock();
        }
      }
      if (n > 0) {
        this.sync();
        for (const ev of this.duel.drainEvents()) {
          this.broadcast('duel', ev);
          if (ev.t === 'matchEnd') this.rate1v1(ev.winner);
        }
      }
    }, TICK_MS);
  }
  onJoin(client: Client, options?: { name?: unknown; loadout?: unknown; level?: unknown; token?: unknown }): void {
    const reg = validToken(options?.token) ? this.store?.byToken(options.token) : undefined;
    if (reg) this.players.set(client.sessionId, hashToken(options!.token as string));
    this.duel.add(client.sessionId, {
      name: reg ? reg.name : sanitizeNick(options?.name),
      loadout: options?.loadout,
      level: Number(options?.level) || 1,
    });
    this.duel.timer = 25;
    if (this.duel.fighters.length >= 2) void this.lock();
    this.sync();
  }
  onLeave(client: Client): void {
    this.duel.remove(client.sessionId);
    this.rate.delete(client.sessionId);
    this.sync();
    if (!this.duel.fighters.some((f) => !f.bot)) void this.disconnect();
  }
  /** Updates world ratings once per match and tells each player their new rating. */
  private rate1v1(winner: string): void {
    if (this.rated || !this.store) return;
    this.rated = true;
    const loser = this.duel.fighters.find((f) => f.id !== winner)?.id ?? '';
    const res = applyRanked(this.store, this.players.get(winner) ?? null, this.players.get(loser) ?? null);
    for (const c of this.clients) {
      const r = res[this.players.get(c.sessionId) ?? ''];
      if (r) c.send('rated', { ...r, tier: rankedTier(r.rating).name });
    }
  }
  private allow(id: string): boolean {
    const now = Date.now();
    const r = this.rate.get(id) ?? { t: now, n: 0 };
    if (now - r.t > 1000) {
      r.t = now;
      r.n = 0;
    }
    r.n++;
    this.rate.set(id, r);
    return r.n <= MAX_MSGS_PER_SEC;
  }
  private sync(): void {
    const s = this.state;
    const d = this.duel;
    s.phase = d.phase;
    s.timer = Math.max(0, Math.round(d.timer * 10) / 10);
    s.round = d.round;
    s.winner = d.winner;
    s.waiting = d.fighters.length < 2;
    for (const id of Array.from(s.fighters.keys())) if (!d.get(id)) s.fighters.delete(id);
    for (const f of d.fighters) {
      let st = s.fighters.get(f.id);
      if (!st) {
        st = new FighterState();
        s.fighters.set(f.id, st);
      }
      const { id: _id, ...view } = fighterView(f, d);
      Object.assign(st, view);
    }
    const live = new Set(d.shots.map((x) => String(x.id)));
    for (const id of Array.from(s.shots.keys())) if (!live.has(id)) s.shots.delete(id);
    for (const sh of d.shots) {
      let st = s.shots.get(String(sh.id));
      if (!st) {
        st = new ShotState();
        s.shots.set(String(sh.id), st);
      }
      st.x = sh.x;
      st.y = sh.y;
      st.vx = sh.vx;
      st.color = sh.color;
    }
  }
}
