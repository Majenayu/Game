// Fight simulation types. The sim is pure, deterministic TypeScript: fixed 60 Hz steps, integer maths, a seeded RNG
// stored in the state, and inputs as bit masks. Same inputs give the same state (and hash) on every machine, which
// is what rollback netcode needs later.

import type { ElementId } from '../content/elementPrefs';
import type { StatusId } from '../content/moves';
import type { Archetype } from '../content/archetypes';

/** Input bits. */
export const IN = {
  L: 1,
  R: 2,
  U: 4,
  D: 8,
  ATK: 16,
  HVY: 32,
  GRD: 64,
  P1: 128,
  P2: 256,
  P3: 512,
  SWAP: 1024,
  DASH: 2048,
} as const;

export type Mode = 'duel' | 'zombie' | 'training';
export type ZombieKind = 'walker' | 'runner' | 'spitter' | 'brute' | 'bomber' | 'shield' | 'boss';
export type DummyMode = 'stand' | 'guard' | 'jump' | 'bot';

export interface Stats {
  vit: number;
  might: number;
  spirit: number;
  guard: number;
  resolve: number;
  speed: number;
}

export interface FighterSpec {
  name: string;
  element: ElementId;
  level: number;
  stats: Stats;
  /** power ranks 0 (locked) to 5 */
  ranks: [number, number, number];
  comboLen: 3 | 4 | 5;
  pgWindow: number;
  perks: string[];
  kind: 'stick' | ZombieKind;
  /** size percent (bosses) */
  scale?: number;
  /** starting HP percent (tutorial foes) */
  hpPct?: number;
  dummy?: DummyMode;
  /** look id for the renderer (not used by rules) */
  look?: string;
  /** fighting style: which 3 powers this fighter has (default 'classic') */
  archetype?: Archetype;
}

export type FState =
  | 'idle'
  | 'walk'
  | 'air'
  | 'dash'
  | 'move'
  | 'stun'
  | 'guard'
  | 'gbreak'
  | 'down'
  | 'swapout'
  | 'swapin'
  | 'ko'
  | 'win'
  | 'bench';

export interface AiMem {
  seed: number;
  next: number;
  hold: number;
  bits: number;
  difficulty: number;
}

export interface Fighter {
  id: number;
  team: 0 | 1;
  spec: FighterSpec;
  x: number;
  y: number;
  vx: number;
  vy: number;
  face: 1 | -1;
  ground: boolean;
  hp: number;
  hpMax: number;
  /** MP in tenths (0 to 1000) */
  mp: number;
  /** guard stamina (0 to 1000) */
  gs: number;
  st: FState;
  sf: number;
  move: string | null;
  mf: number;
  /** fighter ids hit by the current move, with the frame each may be hit again */
  moveHits: number[];
  stun: number;
  hitstop: number;
  invuln: number;
  armor: number;
  combo: number;
  status: Record<StatusId, number>;
  airJumps: number;
  airDash: boolean;
  guardSince: number;
  lastHurt: number;
  lastGuard: number;
  barrier: number;
  pgBoost: number;
  /** counter stance frames left (special 'counter'); the move id that set it */
  counter: number;
  counterMove: string | null;
  /** self-buff: 0 none, 1 might (+25% damage), 2 speed (+30% move speed), 3 iron (-25% damage taken) */
  buff: number;
  buffT: number;
  prevIn: number;
  /** buffered button presses (bits) and frames left */
  buf: number;
  bufT: number;
  comboStep: number;
  comboT: number;
  onField: boolean;
  down: boolean;
  /** recall history (x, y) every frame for 2 seconds */
  hist: number[];
  histI: number;
  ai: AiMem | null;
  koT: number;
  /** damage dealt and taken this match (results screen) */
  dealt: number;
  combosMax: number;
  powersUsed: number;
}

export interface Effect {
  id: number;
  owner: number;
  team: 0 | 1;
  move: string;
  element: ElementId;
  kind: string;
  look: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  w: number;
  h: number;
  life: number;
  delay: number;
  rehit: number;
  pierce: boolean;
  groundOnly: boolean;
  blocksProj: boolean;
  follow: boolean;
  dmgPct: number;
  statusPct: number;
  /** [targetId, frame it may be hit again] pairs */
  hits: number[];
  face: 1 | -1;
  /** frames since spawned */
  age: number;
  /** orbit radius (cpx) and angle step per frame (table of 32), or 0 */
  orbitR: number;
  orbitS: number;
  orbitA: number;
  /** boomerang: turns around at this age (0 = never) */
  returnAt: number;
  /** index into the move's spawns list (0 for a single spawn) */
  fxi: number;
}

export interface Pickup {
  id: number;
  kind: 'hp' | 'mp' | 'boost';
  x: number;
  y: number;
  life: number;
}

export interface Team {
  members: number[];
  active: number;
  wins: number;
}

export type Ev =
  | { t: 'hit'; x: number; y: number; dmg: number; el: ElementId | null; guarded: boolean; perfect: boolean; heavy: boolean; victim: number; attacker: number; strong: boolean }
  | { t: 'power'; who: number; move: string }
  | { t: 'move'; who: number; move: string }
  | { t: 'swap'; team: 0 | 1; to: number }
  | { t: 'ko'; who: number }
  | { t: 'gbreak'; who: number }
  | { t: 'status'; who: number; status: StatusId }
  | { t: 'barrier'; who: number }
  | { t: 'counter'; who: number; target: number; move: string }
  | { t: 'buff'; who: number; kind: number }
  | { t: 'decoy'; who: number; x: number }
  | { t: 'round'; n: number }
  | { t: 'fight' }
  | { t: 'roundEnd'; winner: number; timeout: boolean }
  | { t: 'matchEnd'; winner: number }
  | { t: 'wave'; n: number; boss: boolean }
  | { t: 'pickup'; who: number; kind: string }
  | { t: 'spawn'; id: number }
  | { t: 'jump'; who: number }
  | { t: 'land'; who: number }
  | { t: 'dash'; who: number }
  | { t: 'whiff'; who: number; heavy: boolean };

export type Phase = 'intro' | 'fight' | 'ko' | 'roundEnd' | 'over';

export interface Match {
  mode: Mode;
  frame: number;
  rng: number;
  round: number;
  phase: Phase;
  pf: number;
  timer: number;
  timerMax: number;
  fighters: Fighter[];
  effects: Effect[];
  pickups: Pickup[];
  teams: [Team, Team];
  winsNeeded: number;
  roundWinner: number;
  winner: number;
  nextId: number;
  events: Ev[];
  // zombie survival
  wave: number;
  waveLeft: number;
  spawnT: number;
  kills: number;
  zombieLevel: number;
  /** slow motion request for the renderer (final KO), frames left */
  slowmo: number;
  /** hitbox counters for the results screen */
  ranked: boolean;
}
