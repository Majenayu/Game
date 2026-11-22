// Picks the platform: the CrazyGames build (vite --mode crazygames) or crazygames.com host, the Poki build, or
// ?platform=... for local testing. Falls back to plain web if an SDK cannot load, so the game always starts.

import type { Platform } from './types';
import { WebPlatform } from './web';

declare const __PLATFORM__: string;

export function wantedPlatform(): 'web' | 'crazygames' | 'poki' {
  const q = new URLSearchParams(location.search).get('platform');
  if (q === 'crazygames' || q === 'poki' || q === 'web') return q;
  if (__PLATFORM__ === 'crazygames' || /(^|\.)crazygames\./.test(location.hostname)) return 'crazygames';
  if (__PLATFORM__ === 'poki' || /poki/.test(location.hostname)) return 'poki';
  return 'web';
}

export async function createPlatform(): Promise<Platform> {
  const want = wantedPlatform();
  try {
    if (want === 'crazygames') {
      const { CrazyGamesPlatform } = await import('./crazygames');
      const p = new CrazyGamesPlatform();
      await p.init();
      return p;
    }
    if (want === 'poki') {
      const { PokiPlatform } = await import('./poki');
      const p = new PokiPlatform();
      await p.init();
      return p;
    }
  } catch (e) {
    console.warn(`${want} SDK unavailable, using plain web:`, (e as Error).message);
  }
  const p = new WebPlatform();
  await p.init();
  return p;
}
