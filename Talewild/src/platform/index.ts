// Picks the platform: the CrazyGames build (vite --mode crazygames), the crazygames.com host, or ?platform=crazygames
// for local testing. Falls back to plain web if the SDK cannot load, so the game always starts.

import type { Platform } from './types';
import { WebPlatform } from './web';

declare const __PLATFORM__: string;

export function wantsCrazyGames(): boolean {
  const q = new URLSearchParams(location.search).get('platform');
  if (q) return q === 'crazygames';
  return __PLATFORM__ === 'crazygames' || /(^|\.)crazygames\./.test(location.hostname);
}

export async function createPlatform(): Promise<Platform> {
  if (wantsCrazyGames()) {
    try {
      const { CrazyGamesPlatform } = await import('./crazygames');
      const p = new CrazyGamesPlatform();
      await p.init();
      return p;
    } catch (e) {
      console.warn('CrazyGames SDK unavailable, using plain web:', (e as Error).message);
    }
  }
  const p = new WebPlatform();
  await p.init();
  return p;
}
