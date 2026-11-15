import type { Room } from 'colyseus.js';
import {
  MSG_EVENT,
  Sim,
  sanitizeInput,
  toView,
  type InputMessage,
  type PlayerView,
  type SimEvent,
} from '@orb/shared';
import { INTERP_DELAY_MS, SnapshotBuffer } from './interp';
import type { GameSource, Snapshot } from './types';

/** Offline: runs the shared simulation locally with bots. */
export class OfflineSource implements GameSource {
  readonly online = false;
  readonly localId = 'me';
  onEvent: (ev: SimEvent) => void = () => {};
  private sim = new Sim();

  constructor(name: string) {
    this.sim.addPlayer(this.localId, name);
    this.sim.rebalanceBots();
  }

  update(dt: number): void {
    this.sim.step(Math.min(dt, 0.05));
    for (const e of this.sim.drainEvents()) this.onEvent(e);
  }

  sendInput(input: InputMessage): void {
    const clean = sanitizeInput(input);
    if (clean) this.sim.applyInput(this.localId, clean);
  }

  view(): Snapshot {
    const s = this.sim;
    return {
      players: Array.from(s.players.values()).map((p) => toView(p, s.time)),
      bullets: s.bullets.map((b) => ({
        id: String(b.id),
        owner: b.owner,
        x: b.x,
        y: b.y,
        vx: b.vx,
        vy: b.vy,
      })),
      pickups: s.pickups.map((p) => ({ id: String(p.id), x: p.x, y: p.y })),
      phase: s.phase,
      timeLeft: Math.max(0, s.timeLeft),
      round: s.round,
      winner: s.winnerName,
    };
  }

  dispose(): void {}
}

/** Online: reads the Colyseus room state and interpolates remote players. */
export class OnlineSource implements GameSource {
  readonly online = true;
  onEvent: (ev: SimEvent) => void = () => {};
  /** Fires on every authoritative state update (used for prediction reconciliation). */
  onServerState: (me: PlayerView | undefined) => void = () => {};
  private buf = new SnapshotBuffer();
  private latest: Snapshot | null = null;
  private latestAt = 0;

  constructor(private room: Room) {
    room.onMessage(MSG_EVENT, (ev: SimEvent) => this.onEvent(ev));
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

  private ingest(state: any): void {
    const now = performance.now();
    const players: PlayerView[] = [];
    state.players.forEach((p: any, id: string) => {
      players.push({
        id,
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
        invuln: p.invuln,
        rapid: p.rapid,
        seq: p.seq,
      });
    });
    const bullets: Snapshot['bullets'] = [];
    state.bullets.forEach((b: any, id: string) =>
      bullets.push({ id, owner: b.owner, x: b.x, y: b.y, vx: b.vx, vy: b.vy }),
    );
    const pickups: Snapshot['pickups'] = [];
    state.pickups.forEach((p: any, id: string) => pickups.push({ id, x: p.x, y: p.y }));
    this.latest = {
      players,
      bullets,
      pickups,
      phase: state.phase === 'scoreboard' ? 'scoreboard' : 'play',
      timeLeft: state.timeLeft,
      round: state.round,
      winner: state.winner,
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
  }
}
