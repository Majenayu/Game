import { Room, ServerError, type AuthContext, type Client } from '@colyseus/core';
import {
  COLORS,
  MAX_PLAYERS,
  EMOTE_COOLDOWN,
  COUNTDOWN_SECONDS,
  eloUpdate,
  guildBuff,
  guildLevel,
  playerStats,
  rankedTier,
  LOBBY_SECONDS,
  MSG_EMOTE,
  MSG_EVENT,
  MSG_INPUT,
  MSG_LOADOUT,
  MSG_READY,
  RECONNECT_SECONDS,
  Sim,
  TICK_MS,
  isEmoteId,
  isMapId,
  isModeId,
  powerupId,
  sanitizeInput,
  toView,
  type ModeId,
  type PowerupDef,
} from '@orb/shared';
import { Store, validToken } from './store';
import {
  ArenaState,
  BulletState,
  CoinState,
  MineState,
  PetState,
  PickupState,
  PlayerState,
  ZoneState,
} from './schema';

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
  /** Set by the server when the room is defined (never from clients). */
  store?: unknown;
  token?: unknown;
  gear?: unknown;
  summon?: unknown;
  name?: unknown;
  mode?: unknown;
  map?: unknown;
  loadout?: unknown;
  private?: unknown;
  level?: unknown;
}
/** 2v2 ranked rooms hold four orbs; empty seats are filled by bots so matches start at once. */
export const RANKED_SEATS = 4;
export type RankedMode = '1v1' | '2v2' | 'war' | null;

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
  private lastEmote = new Map<string, number>();
  /** Players who pressed Confirm. */
  private ready = new Set<string>();
  /** True while the first lobby is waiting for confirmations. */
  private lobbyOpen = true;
  /** True for 2v2 ranked rooms (see RankedRoom). Clients cannot choose this through join options. */
  protected readonly isRanked: boolean = false;
  /** Ranked 1v1, ranked 2v2, guild war, or null for casual rooms. */
  protected readonly rankedMode: RankedMode = null;
  protected store: Store | null = null;
  /** Session id -> registered player id. */
  protected accounts = new Map<string, string>();
  /** Guild war: the two guild ids (team 0 and team 1). */
  protected warGuilds: string[] = [];

  onCreate(options?: JoinOptions): void {
    // Instant Multiplayer rooms are private: friends join by room id or invite link.
    if (options?.private === true) void this.setPrivate(true);
    // Only the server passes a real Store; anything a client sends is ignored.
    const so = (options as { store?: unknown } | undefined)?.store;
    this.store = so instanceof Store ? so : null;
    const ranked = this.isRanked || this.rankedMode !== null;
    const rm = this.rankedMode;
    const seats = rm === '1v1' ? 2 : rm === 'war' ? 10 : RANKED_SEATS;
    if (ranked) this.maxClients = seats;
    this.sim = ranked
      ? new Sim(Math.random, {
          mode: rm === '1v1' ? 'dm' : 'tdm',
          mapId: 'rotate',
          seats,
          countdown: COUNTDOWN_SECONDS,
          roundTime: rm === '1v1' ? 120 : 150,
        })
      : new Sim(Math.random, {
          mode: pickMode(options?.mode),
          mapId: pickMap(options?.map),
          countdown: COUNTDOWN_SECONDS,
        });
    // Lobby: everyone waits up to LOBBY_SECONDS for confirmations, then the countdown runs.
    this.sim.lobby(LOBBY_SECONDS + COUNTDOWN_SECONDS);
    this.setState(new ArenaState());
    this.state.ranked = ranked;
    this.sim.rebalanceBots();
    this.syncState();

    this.onMessage(MSG_INPUT, (client, raw) => {
      if (!this.allowMessage(client.sessionId)) return;
      const input = sanitizeInput(raw);
      if (input) this.sim.applyInput(client.sessionId, input);
    });
    this.onMessage(MSG_READY, (client) => {
      if (!this.allowMessage(client.sessionId)) return;
      this.ready.add(client.sessionId);
      const p = this.sim.players.get(client.sessionId);
      if (!this.lobbyOpen && p && p.holdUntil > this.sim.time)
        p.holdUntil = Math.min(p.holdUntil, this.sim.time + COUNTDOWN_SECONDS);
      this.checkLobby();
    });
    this.onMessage(MSG_LOADOUT, (client, raw) => {
      if (!this.allowMessage(client.sessionId)) return;
      const p = this.sim.players.get(client.sessionId);
      // Loadouts can only change while waiting, never in the middle of a fight.
      const waiting = this.lobbyOpen || (p !== undefined && p.holdUntil > this.sim.time);
      if (!p || !waiting || this.ready.has(client.sessionId)) return;
      const color = p.color;
      this.sim.setLoadout(client.sessionId, raw);
      p.color = color;
      this.syncState();
    });
    this.onMessage(MSG_EMOTE, (client, raw) => {
      if (!this.allowMessage(client.sessionId) || !isEmoteId(raw)) return;
      const now = Date.now();
      if (now - (this.lastEmote.get(client.sessionId) ?? 0) < EMOTE_COOLDOWN * 1000) return;
      this.lastEmote.set(client.sessionId, now);
      this.broadcast(MSG_EMOTE, { id: client.sessionId, e: raw });
    });

    this.setSimulationInterval((deltaMs) => {
      this.acc += Math.min(deltaMs, 250);
      let steps = 0;
      while (this.acc >= TICK_MS && steps < 4) {
        this.sim.step(TICK_MS / 1000);
        this.acc -= TICK_MS;
        steps++;
      }
      if (this.lobbyOpen && this.sim.frozenFor <= COUNTDOWN_SECONDS) this.lobbyOpen = false;
      if (steps > 0) {
        this.syncState();
        for (const ev of this.sim.drainEvents()) {
          this.broadcast(MSG_EVENT, ev);
          if (ev.t === 'roundEnd') this.rateRound(ev.team);
        }
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
    const reg = validToken(options?.token) ? this.store?.byToken(options.token) : undefined;
    if (reg) this.accounts.set(client.sessionId, reg.id);
    this.sim.addPlayer(client.sessionId, reg ? reg.name : options?.name);
    this.sim.setLoadout(client.sessionId, options?.loadout);
    this.sim.setLevel(client.sessionId, Number(options?.level) || 1);
    // Stats from level, gear, cosmetics and the guild buff (computed here, not trusted from the client).
    const load = (options?.loadout ?? {}) as { trail?: unknown; bfx?: unknown };
    const gear = Array.isArray(options?.gear) ? (options!.gear as unknown[]).filter((x): x is number => typeof x === 'number').slice(0, 8) : [];
    const g = reg?.guild ? this.store?.db.guilds[reg.guild] : undefined;
    const guildBonus = g ? guildBuff(g.members.map((m) => this.store!.db.players[m]?.cls ?? ''), guildLevel(g.xp ?? 0)).bonus : undefined;
    const st = playerStats({
      level: Math.max(1, Math.min(1000, Number(options?.level) || 1)),
      gear,
      trail: Number(load.trail) || 0,
      bfx: Number(load.bfx) || 0,
      guild: guildBonus,
    });
    this.sim.setStats(client.sessionId, st.combat);
    // Summons fight in casual rooms only.
    const sm = options?.summon as { id?: unknown; level?: unknown; cards?: unknown } | undefined;
    if (!this.rankedMode && !this.isRanked && sm && typeof sm.id === 'number')
      this.sim.setSummon(client.sessionId, {
        id: sm.id,
        level: Number(sm.level) || 1,
        cards: Array.isArray(sm.cards) ? (sm.cards as unknown[]).filter((x): x is number => typeof x === 'number') : [],
      });
    // Guild war: members of the same guild share a team.
    if (this.rankedMode === 'war' && reg?.guild) {
      const p = this.sim.players.get(client.sessionId);
      if (p) p.team = Math.max(0, this.warGuilds.indexOf(reg.guild));
    }
    const colorId = (options?.loadout as { color?: unknown } | undefined)?.color;
    const p = this.sim.players.get(client.sessionId);
    if (p && Number.isInteger(colorId)) p.color = colorHex(colorId as number, p.color);
    // Joining a running match: you wait (safe) until you confirm, at most LOBBY_SECONDS.
    if (!this.lobbyOpen) this.sim.holdPlayer(client.sessionId, LOBBY_SECONDS);
    this.sim.rebalanceBots();
    if (this.sim.humanCount >= this.maxClients) void this.lock();
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

  /** Applies ranked results (1v1, 2v2) or guild war XP at the end of every round. */
  private rateRound(winnerTeam: number): void {
    const store = this.store;
    if (!store || !this.rankedMode) return;
    const humans = Array.from(this.sim.players.values()).filter((p) => !p.bot && this.accounts.has(p.id));
    if (!humans.length) return;
    const standings = this.sim.standings();
    const won = (p: { id: string; team: number }) =>
      this.rankedMode === '1v1' ? standings[0]?.id === p.id && standings[0].score > 0 : winnerTeam >= 0 && p.team === winnerTeam;
    if (this.rankedMode === 'war') {
      const wt = winnerTeam >= 0 ? this.warGuilds[winnerTeam] : undefined;
      for (const gid of this.warGuilds) {
        const g = store.db.guilds[gid];
        if (!g) continue;
        g.xp = (g.xp ?? 0) + (gid === wt ? 300 : 100);
        if (gid === wt) g.wars = (g.wars ?? 0) + 1;
      }
      store.changed();
      return;
    }
    for (const p of humans) {
      const rec = store.db.players[this.accounts.get(p.id)!];
      if (!rec) continue;
      const enemies = Array.from(this.sim.players.values()).filter((o) => o.id !== p.id && (this.rankedMode === '1v1' || o.team !== p.team));
      const mine = this.rankedMode === '1v1' ? rec.rating : (rec.rating2 ?? 1000);
      const opp = enemies.length
        ? enemies.reduce((s, o) => {
            const r = this.accounts.has(o.id) ? store.db.players[this.accounts.get(o.id)!] : undefined;
            return s + (r ? (this.rankedMode === '1v1' ? r.rating : (r.rating2 ?? 1000)) : mine);
          }, 0) / enemies.length
        : mine;
      const w = won(p);
      const next = eloUpdate(mine, opp, w ? 1 : 0);
      if (this.rankedMode === '1v1') {
        rec.rating = next;
        rec.best = Math.max(rec.best, next);
        rec.games += 1;
        if (w) rec.wins += 1;
      } else {
        rec.rating2 = next;
        rec.games2 = (rec.games2 ?? 0) + 1;
        if (w) rec.wins2 = (rec.wins2 ?? 0) + 1;
      }
      // Ranked wins also grow the player's guild.
      const g = rec.guild ? store.db.guilds[rec.guild] : undefined;
      if (g && w) g.xp = (g.xp ?? 0) + 20;
      const c = this.clients.find((x) => x.sessionId === p.id);
      c?.send('rated', { mode: this.rankedMode, rating: next, delta: next - mine, tier: rankedTier(next).name, rank: store.rankOf(rec.id) });
    }
    store.changed();
  }
  private removeHuman(id: string): void {
    this.sim.removePlayer(id);
    this.sim.rebalanceBots();
    this.rate.delete(id);
    this.lastEmote.delete(id);
    this.ready.delete(id);
    this.checkLobby();
    this.releaseIp(id);
    if (this.sim.humanCount < this.maxClients) void this.unlock();
    this.syncState();
  }

  /** Starts the countdown once every human in the lobby has confirmed. */
  private checkLobby(): void {
    if (!this.lobbyOpen || this.sim.humanCount === 0) return;
    for (const p of this.sim.players.values()) if (!p.bot && !this.ready.has(p.id)) return;
    this.lobbyOpen = false;
    this.sim.release(COUNTDOWN_SECONDS);
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
    s.domainName = sim.domain?.name ?? '';
    s.domainColor = sim.domain?.color ?? 0;
    s.domainOwner = sim.domain?.owner ?? '';
    s.lobby = this.lobbyOpen ? Math.max(0, Math.round((sim.frozenFor - COUNTDOWN_SECONDS) * 10) / 10) : 0;

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
      ps.skills = v.skills;
      ps.cds = v.cds;
      ps.mp = Math.round(v.mp);
      ps.maxMp = v.maxMp;
      ps.hidden = v.hidden;
      ps.casting = Math.round(v.casting * 10) / 10;
      ps.weapon = v.weapon;
      ps.acc = v.acc;
      ps.hold = Math.round(v.hold * 10) / 10;
      ps.form = v.form;
      ps.lv = v.lv;
      ps.atk = v.atk;
      ps.def = v.def;
      ps.ready = v.bot || this.ready.has(p.id);
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
    syncMap(
      s.zones,
      sim.zones.map((z) => ({ key: String(z.id), b: z })),
      () => undefined,
      (z) => {
        const st = new ZoneState();
        st.x = z.x;
        st.y = z.y;
        st.r = z.r;
        st.kind = z.kind;
        st.owner = z.owner;
        return st;
      },
      false,
    );
    syncMap(
      s.pets,
      sim.pets.map((pt) => ({ key: String(pt.id), b: pt })),
      (st: PetState, pt) => {
        st.x = pt.x;
        st.y = pt.y;
      },
      (pt) => {
        const st = new PetState();
        st.x = pt.x;
        st.y = pt.y;
        st.owner = pt.owner;
        st.color = pt.color;
        return st;
      },
      true,
    );
  }
}

/** 2v2 ranked: four seats, team battle, rotating maps. */
export class RankedRoom extends ArenaRoom {
  protected readonly isRanked: boolean = true;
}

/** Ranked 1v1: two seats, deathmatch with a 2 minute timer. */
export class Ranked1v1Room extends ArenaRoom {
  protected readonly rankedMode: RankedMode = '1v1';
}
/** Ranked 2v2: four seats, team deathmatch. */
export class Ranked2v2Room extends ArenaRoom {
  protected readonly rankedMode: RankedMode = '2v2';
}
/** Guild war: 5 against 5, one guild per team. Bots fill empty seats. */
export class GuildWarRoom extends ArenaRoom {
  protected readonly rankedMode: RankedMode = 'war';
  onAuth(client: Client, options: JoinOptions | undefined, context?: AuthContext): boolean {
    const reg = validToken(options?.token) ? this.store?.byToken(options.token) : undefined;
    if (!reg || !reg.guild) throw new ServerError(403, 'Join a guild first');
    if (!this.warGuilds.includes(reg.guild)) {
      if (this.warGuilds.length >= 2) throw new ServerError(409, 'This war is full');
      this.warGuilds.push(reg.guild);
    }
    return super.onAuth(client, options, context);
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
