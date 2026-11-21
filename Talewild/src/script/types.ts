// Event-script format: dialogue, choices, flags, items, camera moves and branching, written as plain data so
// hundreds of scenes can be authored without code. Text values are locale keys (see src/content/locale/en.ts).

import type { Dir } from '../core/input';

export type Cmd =
  /** Show a line. `who` is a speaker id (locale key `name.<who>`); omit for narration. */
  | { say: string; who?: string }
  /** Offer choices (locale keys). Runs the matching branch. */
  | { choice: string[]; branches: Cmd[][] }
  /** Set a flag (default true). */
  | { set: string; value?: boolean }
  /** Branch on a flag. "!name" means "not set". */
  | { if: string; then: Cmd[]; else?: Cmd[] }
  /** Add to a number variable. */
  | { add: string; n: number }
  /** Branch on a variable being at least `gte`. */
  | { ifVar: string; gte: number; then: Cmd[]; else?: Cmd[] }
  /** Give items to the bag. */
  | { give: string; n?: number }
  /** Move the camera to a tile, or back to the player. */
  | { camera: { x: number; y: number; ms?: number } | 'player' }
  | { wait: number }
  /** Turn an NPC ("player" for the player). */
  | { face: string; dir: Dir }
  /** Small emote bubble above an actor. */
  | { emote: string; icon: 'heart' | 'note' | 'surprise' | 'dots' }
  /** Placeholder for Phase 2: start a battle. */
  | { battle: string }
  /** Stop the script. */
  | { end: true };

export interface Script {
  id: string;
  steps: Cmd[];
}

export const CMD_KEYS = ['say', 'choice', 'set', 'if', 'add', 'ifVar', 'give', 'camera', 'wait', 'face', 'emote', 'battle', 'end'] as const;
