// One interface for every portal (CrazyGames, Poki, itch.io, plain web). Game code only talks to this.

import type { KV } from '../core/storage';

export type PlatformName = 'web' | 'crazygames' | 'poki';

export interface Platform {
  readonly name: PlatformName;
  readonly storage: KV;
  init(): Promise<void>;
  loadingStart(): void;
  loadingStop(): void;
  /** The player is playing (fight running, not paused). */
  gameplayStart(): void;
  /** Every break: menus, results, pause. Not on focus loss (portals handle that themselves). */
  gameplayStop(): void;
  isMuted(): boolean;
  onMuteChange(fn: (muted: boolean) => void): void;
  happytime(): void;
  reportProgress(percent: number): void;
  /** True if this platform can show rewarded ads (the game hides rewarded buttons otherwise). */
  readonly hasRewarded: boolean;
  /** Midgame ad at a natural break. Resolves when finished (or immediately if none). */
  midgame(): Promise<void>;
  /** Opt-in rewarded ad. Resolves true only if the player watched it to the end. */
  rewarded(): Promise<boolean>;
  /** Called by ads to pause and mute the game. */
  onAdState(fn: (playing: boolean) => void): void;
}

export abstract class BasePlatform implements Platform {
  abstract readonly name: PlatformName;
  abstract readonly storage: KV;
  readonly log: string[] = [];
  hasRewarded = false;
  private playing = false;
  private loading = false;
  protected adFns: ((playing: boolean) => void)[] = [];
  protected muteFns: ((m: boolean) => void)[] = [];

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

  onMuteChange(fn: (muted: boolean) => void): void {
    this.muteFns.push(fn);
  }

  happytime(): void {
    this.send('happytime');
  }

  reportProgress(percent: number): void {
    this.send(`progress:${Math.max(0, Math.min(100, Math.round(percent)))}`);
  }

  onAdState(fn: (playing: boolean) => void): void {
    this.adFns.push(fn);
  }

  protected adState(playing: boolean): void {
    for (const f of this.adFns) f(playing);
  }

  async midgame(): Promise<void> {
    this.send('midgame');
  }

  async rewarded(): Promise<boolean> {
    this.send('rewarded');
    return false;
  }

  protected send(event: string): void {
    this.log.push(event);
  }
}
