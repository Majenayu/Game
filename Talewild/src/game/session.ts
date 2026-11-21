// The story being played: player position and look, flags, bag and play time. Converts to and from SaveData.

import type { Dir } from '../core/input';
import { SAVE_VERSION, type Look, type SaveData, type Slot } from '../core/save';
import { GameState } from '../script/state';

export interface PlayerState {
  name: string;
  look: Look;
  map: string;
  x: number;
  y: number;
  facing: Dir;
}

export class Session {
  readonly state = new GameState();
  playMs = 0;

  constructor(
    public player: PlayerState,
    public slot: Slot | null,
  ) {}

  static fromSave(data: SaveData, slot: Slot): Session {
    const s = new Session({ ...data.player, look: { ...data.player.look } }, slot);
    s.state.load(data);
    s.playMs = data.playMs;
    return s;
  }

  toSave(now = Date.now()): SaveData {
    return {
      version: SAVE_VERSION,
      savedAt: now,
      playMs: Math.round(this.playMs),
      player: { ...this.player, look: { ...this.player.look } },
      flags: { ...this.state.flags },
      vars: { ...this.state.vars },
      bag: { ...this.state.bag },
    };
  }
}

/** Allowed name characters: letters (any language), digits, space, apostrophe and hyphen; 1 to 12 characters. */
export function cleanName(raw: string): string {
  const cleaned = raw
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} '\-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return [...cleaned].slice(0, 12).join('');
}
