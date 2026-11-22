// App-wide state outside the sim: the platform, the save, the loaded profile and the Phaser game.
import type Phaser from 'phaser';
import type { Platform } from '../platform/types';
import { SaveManager } from '../meta/save';
import { newProfile, PROFILE_SCHEMA, type Profile } from '../meta/profile';
import { registerLook } from '../render/fighterView';

export interface App {
  platform: Platform;
  save: SaveManager<Profile>;
  profile: Profile;
  game: Phaser.Game | null;
  /** fights finished this session (midgame ads only every second break) */
  breaks: number;
}

export const app = {} as App;

export function initProfile(platform: Platform): void {
  app.platform = platform;
  app.save = new SaveManager<Profile>(platform.storage, PROFILE_SCHEMA, 'ek');
  app.breaks = 0;
  app.game = null;
  const loaded = app.save.read(1);
  app.profile = loaded?.data ?? newProfile('Player');
  syncLooks();
}

/** Writes the profile. A storage failure is reported once, the game keeps running. */
let warned = false;
export function saveProfile(): void {
  try {
    app.save.write(1, app.profile);
  } catch (e) {
    if (!warned) console.warn('save failed:', (e as Error).message);
    warned = true;
  }
  syncLooks();
}

/** The renderer looks up avatar looks by avatar id. */
export function syncLooks(): void {
  for (const a of app.profile.avatars) registerLook(a.id, a.look);
}
