import type { InputMessage, Loadout, ModeId, PlayerView, SimEvent, SkillInstance } from '@orb/shared';

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

export interface ZoneView {
  id: string;
  x: number;
  y: number;
  r: number;
  kind: string;
  owner: string;
}

export interface PetView {
  id: string;
  x: number;
  y: number;
  owner: string;
  color: number;
}

export interface Snapshot {
  players: PlayerView[];
  bullets: BulletView[];
  pickups: PickupView[];
  coins: CoinView[];
  mines: MineView[];
  zones: ZoneView[];
  pets: PetView[];
  phase: 'play' | 'scoreboard';
  mode: ModeId;
  mapId: string;
  timeLeft: number;
  round: number;
  winner: string;
  winnerTeam: number;
  teamScore: [number, number];
  hillHolder: string;
  /** Seconds left to confirm in the lobby; 0 once the match has started. */
  lobby: number;
  /** Active domain expansion (fills the arena). */
  domain: { name: string; color: number; owner: string } | null;
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
  /** Sends a preset quick-chat line (index into EMOTES). */
  sendEmote(e: number): void;
  /** Fires when any player (including you) shows an emote. */
  onEmote: (id: string, e: number) => void;
  /** Confirm in the lobby: ready to fight. */
  confirm(): void;
  /** Change the loadout while still waiting in the lobby. */
  changeLoadout(l: Loadout, instances: SkillInstance[]): void;
  dispose(): void;
}
