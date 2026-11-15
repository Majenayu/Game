import type { Room } from 'colyseus.js';
import {
  COLORS,
  EMOTES,
  EMOTE_COOLDOWN,
  MSG_EMOTE,
  MSG_EVENT,
  Sim,
  isEmoteId,
  powerupId,
  sanitizeInput,
  toView,
  type InputMessage,
  type Loadout,
  type ModeId,
  type PlayerView,
  type SimConfig,
  type SimEvent,
  type SkillInstance,
} from '@orb/shared';
import { INTERP_DELAY_MS, SnapshotBuffer } from './interp';
import type { GameSource, Snapshot } from './types';

/** Offline: runs the shared simulation locally with bots. */
export class OfflineSource implements GameSource {
  readonly online = false;
  readonly localId = 'me';
  onEvent: (ev: SimEvent) => void = () => {};
  onEmote: (id: string, e: number) => void = () => {};
  readonly sim: Sim;
  private lastEmote = -Infinity;
  private replyTimer = 0;
  /** Freezes the simulation (used when a campaign level ends). */
  paused = false;

  constructor(
    name: string,
    loadout: Loadout,
    config: Partial<SimConfig> = {},
    instances: SkillInstance[] = [],
  ) {
    this.sim = new Sim(Math.random, config);
    this.sim.addPlayer(this.localId, name, false, {
      charId: loadout.char,
      skillIds: loadout.skillIds,
      instances,
      color: COLORS[loadout.color]?.hex,
      trail: loadout.trail,
      bfx: loadout.bfx,
    });
    this.sim.rebalanceBots();
  }

  update(dt: number): void {
    if (this.paused) return;
    this.sim.step(Math.min(dt, 0.05));
    for (const e of this.sim.drainEvents()) this.onEvent(e);
  }

  sendInput(input: InputMessage): void {
    const clean = sanitizeInput(input);
    if (clean) this.sim.applyInput(this.localId, clean);
  }
  sendEmote(e: number): void {
    const now = performance.now();
    if (!isEmoteId(e) || now - this.lastEmote < EMOTE_COOLDOWN * 1000) return;
    this.lastEmote = now;
    this.onEmote(this.localId, e);
    // A bot sometimes answers, so offline chat does not feel empty.
    const bots = Array.from(this.sim.players.values()).filter((p) => p.bot && p.alive);
    if (!bots.length || Math.random() < 0.4) return;
    const bot = bots[Math.floor(Math.random() * bots.length)];
    const reply = [1, 2, 7, 9][Math.floor(Math.random() * 4)] % EMOTES.length;
    window.clearTimeout(this.replyTimer);
    this.replyTimer = window.setTimeout(() => this.onEmote(bot.id, reply), 900 + Math.random() * 900);
  }

  view(): Snapshot {
    const s = this.sim;
    return {
      players: Array.from(s.players.values()).map((p) => toView(p, s)),
      bullets: s.bullets.map((b) => ({
        id: String(b.id),
        owner: b.owner,
        x: b.x,
        y: b.y,
        vx: b.vx,
        vy: b.vy,
        r: b.r,
        kind: b.kind,
      })),
      pickups: s.pickups.map((p) => ({ id: String(p.id), x: p.x, y: p.y, pu: powerupId(p.pu) })),
      coins: s.coins.map((c) => ({ id: String(c.id), x: c.x, y: c.y, v: c.v })),
      mines: s.mines.map((m) => ({
        id: String(m.id),
        x: m.x,
        y: m.y,
        owner: m.owner,
        armed: s.time >= m.armedAt,
      })),
      zones: s.zones.map((z) => ({ id: String(z.id), x: z.x, y: z.y, r: z.r, kind: z.kind, owner: z.owner })),
      pets: s.pets.map((q) => ({ id: String(q.id), x: q.x, y: q.y, owner: q.owner, color: q.color })),
      phase: s.phase,
      mode: s.mode,
      mapId: s.map.id,
      timeLeft: Math.max(0, s.timeLeft),
      round: s.round,
      winner: s.winnerName,
      winnerTeam: s.winnerTeam,
      teamScore: [s.teamScore[0], s.teamScore[1]],
      hillHolder: s.hillHolder,
    };
  }

  dispose(): void {
    window.clearTimeout(this.replyTimer);
    this.onEmote = () => {};
  }
}

/** Online: reads the Colyseus room state and interpolates remote players. */
export class OnlineSource implements GameSource {
  readonly online = true;
  onEvent: (ev: SimEvent) => void = () => {};
  /** Fires on every authoritative state update (used for prediction reconciliation). */
  onServerState: (me: PlayerView | undefined) => void = () => {};
  onEmote: (id: string, e: number) => void = () => {};
  private buf = new SnapshotBuffer();
  private latest: Snapshot | null = null;
  private latestAt = 0;

  constructor(private room: Room) {
    room.onMessage(MSG_EVENT, (ev: SimEvent) => this.onEvent(ev));
    room.onMessage(MSG_EMOTE, (m: { id?: unknown; e?: unknown }) => {
      if (typeof m?.id === 'string' && isEmoteId(m.e)) this.onEmote(m.id, m.e);
    });
    room.onStateChange((state: any) => this.ingest(state));
    if (room.state && (room.state as any).players) this.ingest(room.state);
  }

  get localId(): string {
    return this.room.sessionId;
  }

  update(): void {}

  sendInput(input: InputMessage): void {
    try {
      this.room.send('input', input);
    } catch {
      /* socket closing */
    }
  }

  sendEmote(e: number): void {
    if (!isEmoteId(e)) return;
    try {
      this.room.send(MSG_EMOTE, e);
    } catch {
      /* socket closing */
    }
  }
  private ingest(state: any): void {
    const now = performance.now();
    const players: PlayerView[] = [];
    state.players.forEach((p: any, id: string) => {
      players.push({
        id,
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
        invuln: p.invuln,
        team: p.team,
        char: p.char,
        fx: p.fx,
        shield: p.shield,
        slow: p.slow,
        trail: p.trail,
        bfx: p.bfx,
        spd: p.spd,
        seq: p.seq,
        skills: p.skills,
        cds: p.cds,
        mp: p.mp,
        maxMp: p.maxMp,
        hidden: p.hidden,
        casting: p.casting,
      });
    });
    const bullets: Snapshot['bullets'] = [];
    state.bullets.forEach((b: any, id: string) =>
      bullets.push({ id, owner: b.owner, x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: b.r, kind: b.kind }),
    );
    const pickups: Snapshot['pickups'] = [];
    state.pickups.forEach((p: any, id: string) => pickups.push({ id, x: p.x, y: p.y, pu: p.pu }));
    const coins: Snapshot['coins'] = [];
    state.coins.forEach((c: any, id: string) => coins.push({ id, x: c.x, y: c.y, v: c.v }));
    const mines: Snapshot['mines'] = [];
    state.mines.forEach((m: any, id: string) =>
      mines.push({ id, x: m.x, y: m.y, owner: m.owner, armed: m.armed }),
    );
    const zones: Snapshot['zones'] = [];
    state.zones?.forEach((z: any, id: string) =>
      zones.push({ id, x: z.x, y: z.y, r: z.r, kind: z.kind, owner: z.owner }),
    );
    const pets: Snapshot['pets'] = [];
    state.pets?.forEach((q: any, id: string) =>
      pets.push({ id, x: q.x, y: q.y, owner: q.owner, color: q.color }),
    );
    this.latest = {
      players,
      bullets,
      pickups,
      coins,
      mines,
      zones,
      pets,
      phase: state.phase === 'scoreboard' ? 'scoreboard' : 'play',
      mode: state.mode as ModeId,
      mapId: state.mapId,
      timeLeft: state.timeLeft,
      round: state.round,
      winner: state.winner,
      winnerTeam: state.winnerTeam,
      teamScore: [state.teamScore0, state.teamScore1],
      hillHolder: state.hillHolder,
    };
    this.latestAt = now;
    this.buf.push(now, players);
    this.onServerState(players.find((p) => p.id === this.localId));
  }

  view(nowMs: number): Snapshot | null {
    if (!this.latest) return null;
    const ahead = Math.min(0.15, (nowMs - this.latestAt) / 1000);
    return {
      ...this.latest,
      players: this.buf.at(nowMs - INTERP_DELAY_MS),
      bullets: this.latest.bullets.map((b) => ({ ...b, x: b.x + b.vx * ahead, y: b.y + b.vy * ahead })),
    };
  }

  dispose(): void {
    this.onEvent = () => {};
    this.onServerState = () => {};
    this.onEmote = () => {};
  }
}
