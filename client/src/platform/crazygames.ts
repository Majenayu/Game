/**
 * CrazyGames SDK v3 wrapper. Outside CrazyGames (or without ?crazygames=1) a no-op stub with
 * the same interface is used so local development works.
 * Docs: https://docs.crazygames.com/sdk/intro/ and https://docs.crazygames.com/sdk/game/
 */

/**
 * When true the SDK is never loaded and every call is a no-op, so CrazyGames cannot detect updateRoom, the join
 * listener or inviteLink. Keep it false for the CrazyGames build. Ads stay off through ENABLE_ADS.
 */
export const BASIC_IMPLEMENTATION = false;
export const ENABLE_ADS = false;
const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

export interface PlatformUser {
  username: string;
  avatar?: string;
}

export interface AdCallbacks {
  adStarted: () => void;
  adFinished: () => void;
  adError: (error?: unknown) => void;
}

export interface Platform {
  readonly name: 'crazygames' | 'stub';
  init(): Promise<void>;
  loadingStart(): void;
  loadingStop(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  readonly muteAudio: boolean;
  readonly disableChat: boolean;
  onSettingsChange(cb: () => void): void;
  readonly isInstantMultiplayer: boolean;
  /** Device type from the platform (CrazyGames system info), or null when unknown. */
  readonly device: 'desktop' | 'tablet' | 'mobile' | null;
  getInviteParam(key: string): string | null;
  getUser(): Promise<PlatformUser | null>;
  updateRoom(info: { roomId?: string; isJoinable?: boolean; inviteParams?: Record<string, string> }): void;
  leftRoom(): void;
  /** Reads saved data. CrazyGames uses its Data module (cloud for logged-in players). */
  loadData(key: string): Promise<string | null>;
  saveData(key: string, value: string): void;
  /** Link a friend can open to join this room, or null when unavailable. */
  inviteLink(params: Record<string, string>): string | null;
  onJoinRoom(cb: (params: Record<string, string>) => void): void;
  showMidgameAd(callbacks?: AdCallbacks): Promise<void>;
  showRewardedAd(callbacks?: AdCallbacks): Promise<boolean>;
}

function onCrazyGames(): boolean {
  const q = new URLSearchParams(location.search);
  if (q.get('crazygames') === '1') return true;
  if (/crazygames\./i.test(location.hostname)) return true;
  try {
    if (/crazygames\./i.test(document.referrer)) return true;
    const ao = location.ancestorOrigins;
    if (ao && Array.from(ao).some((o) => /crazygames\./i.test(o))) return true;
  } catch {
    /* cross-origin access can throw */
  }
  return false;
}

function loadScript(src: string, timeoutMs = 6000): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    const timer = setTimeout(() => reject(new Error('SDK load timeout')), timeoutMs);
    s.src = src;
    s.async = true;
    s.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    s.onerror = () => {
      clearTimeout(timer);
      reject(new Error('SDK load error'));
    };
    document.head.appendChild(s);
  });
}

class StubPlatform implements Platform {
  readonly name = 'stub' as const;
  muteAudio = new URLSearchParams(location.search).get('muteAudio') === 'true';
  disableChat = new URLSearchParams(location.search).get('disableChat') === 'true';
  isInstantMultiplayer = false;
  device: 'desktop' | 'tablet' | 'mobile' | null = null;
  async init() {}
  loadingStart() {}
  loadingStop() {}
  gameplayStart() {}
  gameplayStop() {}
  onSettingsChange() {}
  getInviteParam(key: string) {
    return new URLSearchParams(location.search).get(key);
  }
  async getUser() {
    return null;
  }
  updateRoom() {}
  leftRoom() {}
  async loadData() {
    return null;
  }
  saveData() {}
  inviteLink(params: Record<string, string>) {
    const u = new URL(location.href);
    u.search = new URLSearchParams(params).toString();
    return u.toString();
  }
  onJoinRoom() {}
  async showMidgameAd(callbacks?: AdCallbacks) {
    callbacks?.adFinished();
  }
  async showRewardedAd(callbacks?: AdCallbacks) {
    callbacks?.adError(new Error('Ads are unavailable outside CrazyGames'));
    return false;
  }
}

class CrazyPlatform implements Platform {
  readonly name = 'crazygames' as const;
  private sdk: any = null;
  private listeners: Array<() => void> = [];
  muteAudio = false;
  disableChat = false;
  isInstantMultiplayer = false;
  device: 'desktop' | 'tablet' | 'mobile' | null = null;
  async init() {
    await loadScript(SDK_URL);
    const cg = (window as any).CrazyGames;
    await cg.SDK.init();
    this.sdk = cg.SDK;
    const read = () => {
      const s = this.sdk.game?.settings ?? {};
      this.muteAudio = !!s.muteAudio;
      this.disableChat = !!s.disableChat;
    };
    read();
    this.sdk.game?.addSettingsChangeListener?.(() => {
      read();
      this.listeners.forEach((l) => l());
    });
    this.isInstantMultiplayer = !!this.sdk.game?.isInstantMultiplayer;
    try {
      const t = this.sdk.user?.systemInfo?.device?.type;
      if (t === 'desktop' || t === 'tablet' || t === 'mobile') this.device = t;
    } catch {
      /* no system info */
    }
  }
  private safe(fn: () => void) {
    try {
      fn();
    } catch (e) {
      console.warn('[CrazyGames SDK]', e);
    }
  }
  loadingStart() {
    this.safe(() => this.sdk?.game.loadingStart());
  }
  loadingStop() {
    this.safe(() => this.sdk?.game.loadingStop());
  }
  gameplayStart() {
    this.safe(() => this.sdk?.game.gameplayStart());
  }
  gameplayStop() {
    this.safe(() => this.sdk?.game.gameplayStop());
  }
  onSettingsChange(cb: () => void) {
    this.listeners.push(cb);
  }
  getInviteParam(key: string): string | null {
    try {
      const v = this.sdk?.game.getInviteParam(key);
      if (v) return String(v);
    } catch {
      /* ignore */
    }
    return new URLSearchParams(location.search).get(key);
  }
  async getUser(): Promise<PlatformUser | null> {
    try {
      if (!this.sdk?.user?.isUserAccountAvailable) return null;
      const u = await this.sdk.user.getUser();
      if (u?.username) return { username: String(u.username), avatar: u.profilePictureUrl };
    } catch {
      /* not logged in */
    }
    return null;
  }
  updateRoom(info: { roomId?: string; isJoinable?: boolean; inviteParams?: Record<string, string> }) {
    this.safe(() => this.sdk?.game.updateRoom(info));
  }
  leftRoom() {
    this.safe(() => this.sdk?.game.leftRoom());
  }
  async loadData(key: string): Promise<string | null> {
    try {
      const v = this.sdk?.data?.getItem(key);
      return typeof v === 'string' ? v : null;
    } catch {
      return null;
    }
  }
  saveData(key: string, value: string) {
    this.safe(() => this.sdk?.data?.setItem(key, value));
  }
  inviteLink(params: Record<string, string>): string | null {
    try {
      const link = this.sdk?.game.inviteLink(params);
      return link ? String(link) : null;
    } catch {
      return null;
    }
  }

  onJoinRoom(cb: (params: Record<string, string>) => void) {
    this.safe(() => this.sdk?.game.addJoinRoomListener(cb));
  }
  private requestAd(type: 'midgame' | 'rewarded', callbacks?: AdCallbacks): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.sdk?.ad?.requestAd) {
        callbacks?.adError(new Error('CrazyGames ad module unavailable'));
        return resolve(false);
      }
      let ok = false;
      let settled = false;
      const finish = (result: boolean) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      try {
        this.sdk.ad.requestAd(type, {
          adStarted: () => callbacks?.adStarted(),
          adFinished: () => {
            ok = true;
            callbacks?.adFinished();
            finish(true);
          },
          adError: (error: unknown) => {
            callbacks?.adError(error);
            finish(ok);
          },
        });
      } catch (error) {
        callbacks?.adError(error);
        finish(false);
      }
    });
  }
  async showMidgameAd(callbacks?: AdCallbacks) {
    await this.requestAd('midgame', callbacks);
  }
  async showRewardedAd(callbacks?: AdCallbacks) {
    return this.requestAd('rewarded', callbacks);
  }
}

/** Creates the platform. SDK failures fall back to the stub so the game still runs. */
export async function createPlatform(): Promise<Platform> {
  if (BASIC_IMPLEMENTATION || !onCrazyGames()) return new StubPlatform();
  const p = new CrazyPlatform();
  try {
    await p.init();
    return p;
  } catch (e) {
    console.warn('CrazyGames SDK unavailable, using stub', e);
    return new StubPlatform();
  }
}

/** Ad hook: called between rounds. Does nothing unless ENABLE_ADS is true. */
export async function showMidgameAd(platform: Platform, callbacks?: AdCallbacks): Promise<void> {
  if (!ENABLE_ADS) return;
  await platform.showMidgameAd(callbacks);
}

/** Ad hook for rewarded ads (future cosmetics). Does nothing unless ENABLE_ADS is true. */
export async function showRewardedAd(platform: Platform, callbacks?: AdCallbacks): Promise<boolean> {
  if (!ENABLE_ADS) return false;
  return platform.showRewardedAd(callbacks);
}
