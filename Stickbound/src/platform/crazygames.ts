// CrazyGames SDK v3 adapter. Written against https://docs.crazygames.com/sdk/ (intro, game, data, ads).
// - load https://sdk.crazygames.com/crazygames-sdk-v3.js, then await SDK.init() before any call
// - game.loadingStart/Stop around loading; game.gameplayStart/Stop around play and breaks (not on focus loss)
// - game.settings.muteAudio overrides in-game audio; addSettingsChangeListener for changes
// - data module: localStorage API, 1 MB limit, used for guests too (the SDK falls back to localStorage itself)
// - ads (docs.crazygames.com/sdk/video-ads, checked 2026-11-22): ad.requestAd('midgame' | 'rewarded', { adStarted,
//   adFinished, adError }); pause + mute on adStarted, resume on adFinished / adError. adError covers adsDisabled
//   (Basic Launch, kids mode), unfilled, adblock and adCooldown (midgame about every 3 minutes); the game always goes on.
// - user.systemInfo.device.type decides touch controls (the docs say not to rely on touch detection)

import type { KV } from '../core/storage';
import { BasePlatform } from './types';

interface AdCallbacks {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (e: unknown) => void;
}

interface CrazySdk {
  init(): Promise<void>;
  environment?: string;
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
  ad: {
    requestAd(type: 'midgame' | 'rewarded', cb: AdCallbacks): void;
    hasAdblock?(): Promise<boolean>;
  };
  data: KV;
  user?: { systemInfo?: { device?: { type?: string } } };
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

  get storage(): KV {
    return this.sdk.data;
  }

  override async init(): Promise<void> {
    if (!window.CrazyGames?.SDK) await loadScript(SDK_URL);
    const sdk = window.CrazyGames?.SDK;
    if (!sdk) throw new Error('CrazyGames SDK did not load');
    await sdk.init();
    this.sdk = sdk;
    this.hasRewarded = true;
    // rewarded buttons must not stay clickable without effect: hide them when an adblocker is detected
    try {
      if (await sdk.ad.hasAdblock?.()) this.hasRewarded = false;
    } catch {
      /* detection failed: keep offering, adError will turn it off */
    }
    sdk.game.addSettingsChangeListener((s) => this.muteFns.forEach((f) => f(!!s.muteAudio)));
  }

  override deviceType(): 'desktop' | 'tablet' | 'mobile' | null {
    const t = this.sdk.user?.systemInfo?.device?.type;
    return t === 'desktop' || t === 'tablet' || t === 'mobile' ? t : null;
  }

  override isMuted(): boolean {
    return !!this.sdk.game.settings.muteAudio;
  }

  override reportProgress(percent: number): void {
    super.reportProgress(percent);
    this.sdk.game.reportGameCompletedPercentage?.(Math.max(0, Math.min(100, Math.round(percent))));
  }

  private ad(type: 'midgame' | 'rewarded'): Promise<boolean> {
    return new Promise((resolve) => {
      let started = false;
      this.sdk.ad.requestAd(type, {
        adStarted: () => {
          started = true;
          this.adState(true);
        },
        adFinished: () => {
          if (started) this.adState(false);
          resolve(true);
        },
        adError: (e) => {
          if (started) this.adState(false);
          const code = (e as { code?: string } | undefined)?.code;
          // adsDisabled: Basic Launch, kids mode or offline; adblock: blocked. Neither will work this session.
          if (code === 'adsDisabled' || code === 'adblock') this.hasRewarded = false;
          resolve(false);
        },
      });
    });
  }

  override async midgame(): Promise<void> {
    this.send('midgame');
    await this.ad('midgame');
  }

  override async rewarded(): Promise<boolean> {
    this.send('rewarded');
    return this.ad('rewarded');
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
