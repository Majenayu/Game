// One interface for every portal (CrazyGames, Poki, itch.io, plain web). Game code only talks to this.

import type { KV } from '../core/storage';

export type PlatformName = 'web' | 'crazygames';

export interface Platform {
  readonly name: PlatformName;
  /** Storage for saves. On CrazyGames this is the SDK data module (required there for guests too). */
  readonly storage: KV;
  init(): Promise<void>;
  loadingStart(): void;
  loadingStop(): void;
  /** Called when the player is playing (world active, no menu). */
  gameplayStart(): void;
  /** Called on every break (menus, title screen, pause). Not on focus loss: portals handle that themselves. */
  gameplayStop(): void;
  /** The portal asks the game to be silent; overrides in-game sound settings. */
  isMuted(): boolean;
  onMuteChange(fn: (muted: boolean) => void): void;
  /** Celebration on special moments (sparingly). */
  happytime(): void;
  /** Progress towards the end of the game, 0 to 100. */
  reportProgress(percent: number): void;
}

/** Shared bookkeeping: only send gameplay events when the state really changes. */
export abstract class BasePlatform implements Platform {
  abstract readonly name: PlatformName;
  abstract readonly storage: KV;
  /** Every event sent, for tests and the debug panel. */
  readonly log: string[] = [];
  private playing = false;
  private loading = false;

  async init(): Promise<void> {}

  loadingStart(): void {
    if (this.loading) return;
    this.loading = true;
    this.send('loadingStart');
  }

  loadingStop(): void {
    if (!this.loading) return;
    this.loading = false;
    this.send('loadingStop');
  }

  gameplayStart(): void {
    if (this.playing) return;
    this.playing = true;
    this.send('gameplayStart');
  }

  gameplayStop(): void {
    if (!this.playing) return;
    this.playing = false;
    this.send('gameplayStop');
  }

  isMuted(): boolean {
    return false;
  }

  onMuteChange(_fn: (muted: boolean) => void): void {}

  happytime(): void {
    this.send('happytime');
  }

  reportProgress(percent: number): void {
    this.send(`progress:${Math.max(0, Math.min(100, Math.round(percent)))}`);
  }

  protected send(event: string): void {
    this.log.push(event);
  }
}
