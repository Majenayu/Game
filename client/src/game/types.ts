import type { InputMessage, PlayerView, SimEvent } from '@orb/shared';

export interface BulletView {
  id: string;
  owner: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface PickupView {
  id: string;
  x: number;
  y: number;
}

export interface Snapshot {
  players: PlayerView[];
  bullets: BulletView[];
  pickups: PickupView[];
  phase: 'play' | 'scoreboard';
  timeLeft: number;
  round: number;
  winner: string;
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
