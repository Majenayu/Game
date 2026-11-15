import type { InputMessage, ModeId, PlayerView, SimEvent } from '@orb/shared';

export interface BulletView {
  id: string;
  owner: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  kind: number;
}

export interface PickupView {
  id: string;
  x: number;
  y: number;
  /** Powerup id, see shared content. */
  pu: number;
}

export interface CoinView {
  id: string;
  x: number;
  y: number;
  v: number;
}

export interface MineView {
  id: string;
  x: number;
  y: number;
  owner: string;
  armed: boolean;
}

export interface Snapshot {
  players: PlayerView[];
  bullets: BulletView[];
  pickups: PickupView[];
  coins: CoinView[];
  mines: MineView[];
  phase: 'play' | 'scoreboard';
  mode: ModeId;
  mapId: string;
  timeLeft: number;
  round: number;
  winner: string;
  winnerTeam: number;
  teamScore: [number, number];
  hillHolder: string;
}

/** A source of game state: the local offline simulation or a Colyseus room. */
export interface GameSource {
  readonly online: boolean;
  readonly localId: string;
  /** Called every frame with the frame delta in seconds. */
  update(dt: number): void;
  sendInput(input: InputMessage): void;
  /** Latest authoritative view (remote entities interpolated for online). */
  view(nowMs: number): Snapshot | null;
  onEvent: (ev: SimEvent) => void;
  dispose(): void;
}
