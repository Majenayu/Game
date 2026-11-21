/**
 * Poki SDK v2 wrapper (developers.poki.com/guide/sdk-html5). Used only in the Poki build (VITE_PLATFORM=poki).
 * - loadingStop()  -> PokiSDK.gameLoadingFinished()
 * - gameplayStart/Stop -> PokiSDK.gameplayStart/Stop()
 * - midgame ad     -> PokiSDK.commercialBreak() (Poki decides whether an ad really plays)
 * - rewarded ad    -> PokiSDK.rewardedBreak()
 * - invite links   -> PokiSDK.shareableURL() and PokiSDK.getURLParam()
 * Poki has no cloud save, so progress stays in localStorage.
 * If the SDK cannot load (an ad blocker, for example) every call becomes a no-op and the game still runs.
 */
import type { AdCallbacks, Platform, PlatformUser } from './crazygames';

const SDK_URL = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js';

function loadScript(src: string, timeoutMs = 6000): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    const timer = setTimeout(() => reject(new Error('Poki SDK load timeout')), timeoutMs);
    s.src = src;
    s.async = true;
    s.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    s.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Poki SDK load error'));
    };
    document.head.appendChild(s);
  });
}

export class PokiPlatform implements Platform {
  readonly name = 'poki' as const;
  readonly muteAudio = false;
  readonly disableChat = false;
  readonly isInstantMultiplayer = false;
  readonly device = null;
  private sdk: any = null;

  async init(): Promise<void> {
    try {
      await loadScript(SDK_URL);
      const sdk = (window as any).PokiSDK;
      await sdk.init();
      this.sdk = sdk;
    } catch (e) {
      // Ad blockers stop the SDK. The game must still work, so keep the no-op mode.
      console.warn('[Poki SDK] unavailable, continuing without it', e);
      this.sdk = null;
    }
  }
  private safe(fn: () => void): void {
    try {
      fn();
    } catch (e) {
      console.warn('[Poki SDK]', e);
    }
  }
  loadingStart(): void {}
  loadingStop(): void {
    this.safe(() => this.sdk?.gameLoadingFinished());
  }
  gameplayStart(): void {
    this.safe(() => this.sdk?.gameplayStart());
  }
  gameplayStop(): void {
    this.safe(() => this.sdk?.gameplayStop());
  }
  onSettingsChange(): void {}
  getInviteParam(key: string): string | null {
    try {
      const v = this.sdk?.getURLParam(key);
      if (v) return String(v);
    } catch {
      /* ignore */
    }
    return new URLSearchParams(location.search).get(key);
  }
  async getUser(): Promise<PlatformUser | null> {
    return null;
  }
  updateRoom(): void {}
  leftRoom(): void {}
  async loadData(): Promise<string | null> {
    return null;
  }
  saveData(): void {}
  async inviteLink(params: Record<string, string>): Promise<string | null> {
    try {
      const url = await this.sdk?.shareableURL(params);
      if (url) return String(url);
    } catch {
      /* fall through */
    }
    const u = new URL(location.href);
    u.search = new URLSearchParams(params).toString();
    return u.toString();
  }
  onJoinRoom(): void {}
  async showMidgameAd(callbacks?: AdCallbacks): Promise<void> {
    if (!this.sdk) return;
    try {
      // The callback fires only when an ad really starts; most calls play no ad.
      await this.sdk.commercialBreak(() => callbacks?.adStarted());
      callbacks?.adFinished();
    } catch (e) {
      callbacks?.adError(e);
    }
  }
  async showRewardedAd(callbacks?: AdCallbacks): Promise<boolean> {
    if (!this.sdk) {
      callbacks?.adError(new Error('Poki SDK unavailable'));
      return false;
    }
    try {
      const ok = !!(await this.sdk.rewardedBreak(() => callbacks?.adStarted()));
      callbacks?.adFinished();
      return ok;
    } catch (e) {
      callbacks?.adError(e);
      return false;
    }
  }
}
