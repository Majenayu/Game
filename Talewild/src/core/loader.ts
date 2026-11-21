// Per-chapter lazy bundles. Each chapter is a separate chunk loaded only when needed, keeping the first download
// small. Phase 1 has one test chapter; later chapters add entries here.

import { MapData } from '../world/mapData';
import type { Script } from '../script/types';

export interface LoadedChapter {
  id: string;
  startMap: string;
  startSpawn: string;
  maps: Record<string, MapData>;
  scripts: Record<string, Script>;
}

const BUNDLES: Record<string, () => Promise<{ chapter: { id: string; startMap: string; startSpawn: string; maps: Record<string, import('../world/tiled').TiledMap>; scripts: Record<string, Script> } }>> = {
  ch0: () => import('../content/chapter0'),
};

const cache = new Map<string, Promise<LoadedChapter>>();

export function loadChapter(id: string): Promise<LoadedChapter> {
  let p = cache.get(id);
  if (!p) {
    const load = BUNDLES[id];
    if (!load) return Promise.reject(new Error(`unknown chapter ${id}`));
    p = load().then(({ chapter }) => ({
      id: chapter.id,
      startMap: chapter.startMap,
      startSpawn: chapter.startSpawn,
      maps: Object.fromEntries(Object.entries(chapter.maps).map(([k, v]) => [k, new MapData(v)])),
      scripts: chapter.scripts,
    }));
    cache.set(id, p);
  }
  return p;
}
