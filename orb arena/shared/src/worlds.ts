import { BOSS_FIGHTS, bossKitIds } from './bosses';
import { UNIQUES, uniqueIdOf } from './skills/uniques';

/**
 * Campaign: 8 worlds. Each world is a path of 10 one-on-one fights (one enemy at a time) and then its
 * Bestiary boss. A world opens when the boss of the world before it falls. Fights are decided by HP only:
 * your HP reaching zero fails the level. Stars: HP left above 75% = 3, above 50% = 2, otherwise 1.
 */
export type ArenaEffect = 'none' | 'snow' | 'fire' | 'storm' | 'toxic' | 'void' | 'dark';
export interface WorldDef {
  id: number;
  name: string;
  /** Arena (map id) for every fight in this world. */
  map: string;
  effect: ArenaEffect;
  /** Element that is 30% stronger here (ELEMENTS index), -1 for none. */
  element: number;
  /** Colours for the world map art. */
  sky: [string, string];
  path: string;
  desc: string;
  /** Index into BOSS_FIGHTS. */
  boss: number;
}
export const WORLDS: WorldDef[] = [
  { id: 0, name: 'Neon Gate', map: 'neon', effect: 'none', element: -1, sky: ['#1a2a6c', '#0b0e1a'], path: '#4dd2ff', desc: 'A calm start. No arena effects.', boss: 0 },
  { id: 1, name: 'Crossfire Valley', map: 'crossfire', effect: 'storm', element: 2, sky: ['#6e8aff', '#141845'], path: '#ffe14d', desc: 'Storm: lightning strikes at random. Storm skills hit 30% harder.', boss: 1 },
  { id: 2, name: 'Pillar Expanse', map: 'pillars', effect: 'toxic', element: 6, sky: ['#5effc0', '#0e1a0a'], path: '#8be04d', desc: 'Toxin: poison clouds drift in. Toxin skills hit 30% harder.', boss: 2 },
  { id: 3, name: 'Iron Fortress', map: 'fortress', effect: 'void', element: 3, sky: ['#d05eff', '#120a1f'], path: '#e58aff', desc: 'Void: shots fly 25% faster. Void skills hit 30% harder.', boss: 3 },
  { id: 4, name: 'Ember Crater', map: 'lava', effect: 'fire', element: 0, sky: ['#f7a24a', '#45201a'], path: '#ffd38a', desc: 'Fire: meteors fall on the arena. Flame skills hit 30% harder.', boss: 4 },
  { id: 5, name: 'Moon Maze', map: 'maze', effect: 'dark', element: 5, sky: ['#40304a', '#0b0610'], path: '#c08ad6', desc: 'Darkness: you only see close by. Shadow skills hit 30% harder.', boss: 5 },
  { id: 6, name: 'Frost Crypt', map: 'crypt', effect: 'snow', element: 1, sky: ['#8fd4ff', '#14304a'], path: '#e6f6ff', desc: 'Snow: everyone moves 15% slower. Frost skills hit 30% harder.', boss: 6 },
  { id: 7, name: 'Glacier Crown', map: 'glacier', effect: 'snow', element: 4, sky: ['#e8f6ff', '#2a3f5e'], path: '#fff3b0', desc: 'Blizzard and holy light: everyone moves 15% slower. Light skills hit 30% harder.', boss: 7 },
];
/** World and position of a campaign level id (1..88). */
export function worldOfLevel(levelId: number): { world: number; index: number } {
  return { world: Math.floor((levelId - 1) / 11), index: (levelId - 1) % 11 };
}
export const NODES_PER_WORLD = 11;
export const ENEMIES_PER_WORLD = 10;

export interface CampaignNode {
  world: number;
  /** 0..9 = enemies, 10 = boss. */
  index: number;
  /** Global level number 1..88. */
  number: number;
  boss: boolean;
  /** Enemy level (stats grow with it): the further you go, the tougher. */
  enemyLevel: number;
  /** 0..1 bot sharpness. */
  skill: number;
  coins: number;
  xp: number;
}
export function campaignNode(world: number, index: number): CampaignNode {
  const number = world * NODES_PER_WORLD + index + 1;
  const boss = index === ENEMIES_PER_WORLD;
  return {
    world,
    index,
    number,
    boss,
    enemyLevel: Math.round(1 + (number - 1) * 7 + (boss ? 15 : 0)),
    skill: Math.min(0.95, 0.15 + number * 0.009 + (boss ? 0.1 : 0)),
    coins: 30 + number * 6 + (boss ? 300 : 0),
    xp: 40 + number * 12 + (boss ? 400 : 0),
  };
}
export function nodeKey(world: number, index: number): string {
  return `w${world}n${index}`;
}
/** HP left (0..1) to stars. */
export function starsForHp(frac: number): number {
  if (frac > 0.75) return 3;
  if (frac > 0.5) return 2;
  return 1;
}
/** Star milestones per world: extra rewards for collecting stars. 33 stars is perfect. */
export const STAR_MILESTONES: Array<{ stars: number; text: string; reward: 'silver' | 'gold' | 'legend'; stones: number; sRank: boolean; egg: boolean }> = [
  { stars: 10, text: 'Silver Chest + 3 fusion stones', reward: 'silver', stones: 3, sRank: false, egg: false },
  { stars: 20, text: 'Gold Chest + an S-rank skill', reward: 'gold', stones: 0, sRank: true, egg: false },
  { stars: 33, text: 'Legend Chest + 10 fusion stones + a summon egg', reward: 'legend', stones: 10, sRank: false, egg: true },
];
/** Unique skills each world boss can drop (rare). Every unique belongs to exactly one boss or to Majen. */
export function bossUniques(world: number): number[] {
  const majen = new Set(bossKitIds(BOSS_FIGHTS[8]));
  return UNIQUES.map((u) => uniqueIdOf(u.n)).filter((id, i) => !majen.has(id) && i % 8 === world);
}
/** Chance (percent) that a world boss drops one of its uniques. */
export const BOSS_UNIQUE_FIRST = 12;
export const BOSS_UNIQUE_REPEAT = 2;
