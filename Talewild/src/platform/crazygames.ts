// CrazyGames SDK v3 adapter. Written against https://docs.crazygames.com/sdk/ (intro, game, data), read 2026-11-21:
// - load https://sdk.crazygames.com/crazygames-sdk-v3.js, then `await SDK.init()` before any call
// - game.loadingStart/Stop around loading; game.gameplayStart/Stop around play and breaks (not on focus loss)
// - game.settings.muteAudio must override in-game audio; listen with addSettingsChangeListener
// - data module has the localStorage API, 1 MB limit, saves debounced by about 1 second; on CrazyGames the game
//   must rely on it for guests too (it falls back to localStorage itself)
// Ads are not used in Phase 1; the ad module is added in Phase 6 after re-reading the ad requirements.

import type { KV } from '../core/storage';
import { BasePlatform } from './types';

interface CrazySdk {
  init(): Promise<void>;
  game: {
    loadingStart(): void;
    loadingStop(): void;
    gameplayStart(): void;
    gameplayStop(): void;
    happytime(): void;
    reportGameCompletedPercentage?(p: number): void;
    settings: { muteAudio: boolean; disableChat: boolean };
    addSettingsChangeListener(fn: (s: { muteAudio: boolean }) => void): void;
  };
  data: KV;
}

declare global {
  interface Window {
    CrazyGames?: { SDK: CrazySdk };
  }
}

export const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`could not load ${src}`));
    document.head.appendChild(s);
  });
}

export class CrazyGamesPlatform extends BasePlatform {
  readonly name = 'crazygames' as const;
  private sdk!: CrazySdk;
  private muteFns: ((m: boolean) => void)[] = [];

  get storage(): KV {
    return this.sdk.data;
  }

  override async init(): Promise<void> {
    if (!window.CrazyGames?.SDK) await loadScript(SDK_URL);
    const sdk = window.CrazyGames?.SDK;
    if (!sdk) throw new Error('CrazyGames SDK did not load');
    await sdk.init();
    this.sdk = sdk;
    sdk.game.addSettingsChangeListener((s) => this.muteFns.forEach((f) => f(!!s.muteAudio)));
  }

  override isMuted(): boolean {
    return !!this.sdk.game.settings.muteAudio;
  }

  override onMuteChange(fn: (muted: boolean) => void): void {
    this.muteFns.push(fn);
  }

  override reportProgress(percent: number): void {
    super.reportProgress(percent);
    this.sdk.game.reportGameCompletedPercentage?.(Math.max(0, Math.min(100, Math.round(percent))));
  }

  protected override send(event: string): void {
    super.send(event);
    const g = this.sdk?.game;
    if (!g) return;
    if (event === 'loadingStart') g.loadingStart();
    else if (event === 'loadingStop') g.loadingStop();
    else if (event === 'gameplayStart') g.gameplayStart();
    else if (event === 'gameplayStop') g.gameplayStop();
    else if (event === 'happytime') g.happytime();
  }
}
