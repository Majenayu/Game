import type { ModeId } from './content';
import { BOSS_FIGHTS, bossKitIds } from './bosses';

export type ObjectiveType = 'kills' | 'coins' | 'hold' | 'survive' | 'boss';

export interface LevelDef {
  id: number;
  name: string;
  mode: ModeId;
  map: string;
  /** Number of enemy bots (a boss counts as one). */
  bots: number;
  /** 0 (clumsy) to 1 (sharp) */
  skill: number;
  time: number;
  obj: { type: ObjectiveType; n: number };
  /** Finish within this many seconds for the second star. */
  par: number;
  boss?: boolean;
  /** Boss Tower only: shown name, max HP, colour and unique skill ids of the boss. */
  bossName?: string;
  bossHp?: number;
  bossColor?: number;
  bossKit?: number[];
  bossDomain?: { name: string; color: number; effect: 'silence' | 'slow' | 'burn' | 'haste' | 'all' };
  bossFinal?: { armor: number; dmg: number };
  reward: number;
}

const BASE_LEVELS: LevelDef[] = [
  {
    id: 1,
    name: 'First Blood',
    mode: 'dm',
    map: 'neon',
    bots: 2,
    skill: 0.15,
    time: 60,
    obj: { type: 'kills', n: 3 },
    par: 35,
    reward: 60,
  },
  {
    id: 2,
    name: 'Warm Up',
    mode: 'dm',
    map: 'crossfire',
    bots: 3,
    skill: 0.25,
    time: 75,
    obj: { type: 'kills', n: 6 },
    par: 50,
    reward: 90,
  },
  {
    id: 3,
    name: 'Coin Dash',
    mode: 'coins',
    map: 'neon',
    bots: 2,
    skill: 0.25,
    time: 60,
    obj: { type: 'coins', n: 15 },
    par: 40,
    reward: 120,
  },
  {
    id: 4,
    name: 'Hill Rookie',
    mode: 'hill',
    map: 'pillars',
    bots: 3,
    skill: 0.3,
    time: 80,
    obj: { type: 'hold', n: 25 },
    par: 60,
    reward: 150,
  },
  {
    id: 5,
    name: 'Hold On',
    mode: 'dm',
    map: 'fortress',
    bots: 4,
    skill: 0.35,
    time: 60,
    obj: { type: 'survive', n: 60 },
    par: 60,
    reward: 180,
  },
  {
    id: 6,
    name: 'Gold Rush',
    mode: 'coins',
    map: 'crossfire',
    bots: 3,
    skill: 0.4,
    time: 70,
    obj: { type: 'coins', n: 25 },
    par: 55,
    reward: 210,
  },
  {
    id: 7,
    name: 'Lava Rumble',
    mode: 'dm',
    map: 'lava',
    bots: 4,
    skill: 0.45,
    time: 90,
    obj: { type: 'kills', n: 10 },
    par: 65,
    reward: 240,
  },
  {
    id: 8,
    name: 'Hill Siege',
    mode: 'hill',
    map: 'fortress',
    bots: 4,
    skill: 0.5,
    time: 90,
    obj: { type: 'hold', n: 40 },
    par: 75,
    reward: 270,
  },
  {
    id: 9,
    name: 'Maze Hunt',
    mode: 'dm',
    map: 'maze',
    bots: 5,
    skill: 0.55,
    time: 100,
    obj: { type: 'kills', n: 14 },
    par: 80,
    reward: 300,
  },
  {
    id: 10,
    name: 'Coin Storm',
    mode: 'coins',
    map: 'lava',
    bots: 5,
    skill: 0.6,
    time: 80,
    obj: { type: 'coins', n: 35 },
    par: 65,
    reward: 330,
  },
  {
    id: 11,
    name: 'Last Stand',
    mode: 'dm',
    map: 'pillars',
    bots: 6,
    skill: 0.65,
    time: 90,
    obj: { type: 'survive', n: 90 },
    par: 90,
    reward: 360,
  },
  {
    id: 12,
    name: 'The Overlord',
    mode: 'dm',
    map: 'maze',
    bots: 3,
    skill: 0.75,
    time: 120,
    obj: { type: 'boss', n: 1 },
    par: 90,
    boss: true,
    reward: 600,
  },
];

const CAMPAIGN_MAPS = [
  { id: 'neon', name: 'Neon Gate' },
  { id: 'crossfire', name: 'Crossfire Valley' },
  { id: 'pillars', name: 'Pillar Expanse' },
  { id: 'fortress', name: 'Iron Fortress' },
  { id: 'lava', name: 'Ember Crater' },
  { id: 'maze', name: 'Moon Maze' },
  { id: 'crypt', name: 'Frost Crypt' },
  { id: 'glacier', name: 'Glacier Crown' },
] as const;

/** Basic campaign progression: ten single-enemy HP encounters, then one map boss. */
export const LEVELS: LevelDef[] = CAMPAIGN_MAPS.flatMap((map, mapIndex) => {
  const first = mapIndex * 11 + 1;
  const encounters = Array.from({ length: 10 }, (_, encounter) => {
    const base = BASE_LEVELS[Math.min(BASE_LEVELS.length - 1, encounter + mapIndex)];
    return {
      id: first + encounter,
      name: `${map.name} ${encounter + 1}`,
      mode: 'dm' as const,
      map: map.id,
      bots: 1,
      skill: Math.min(0.95, 0.15 + mapIndex * 0.09 + encounter * 0.035),
      time: 3600,
      obj: { type: 'kills' as const, n: 1 },
      par: 3600,
      reward: base.reward + mapIndex * 80 + encounter * 20,
    };
  });
  const boss = BOSS_FIGHTS[mapIndex];
  return [
    ...encounters,
    {
      id: first + 10,
      name: `${map.name}: ${boss.name}`,
      mode: 'dm' as const,
      map: map.id,
      bots: 1,
      skill: Math.min(0.98, 0.5 + mapIndex * 0.05),
      time: 3600,
      obj: { type: 'boss' as const, n: 1 },
      par: 3600,
      boss: true,
      bossName: boss.name,
      bossHp: boss.hp,
      bossColor: boss.color,
      bossKit: bossKitIds(boss),
      bossDomain: boss.domain,
      bossFinal: boss.final,
      reward: 600 + mapIndex * 200,
    },
  ];
});

export const SURVIVE_MAX_DEATHS = 2;

export function objectiveText(l: LevelDef): string {
  switch (l.obj.type) {
    case 'kills':
      return `Defeat ${l.obj.n === 1 ? 'one enemy' : `${l.obj.n} enemies`}`;
    case 'coins':
      return `Collect ${l.obj.n} coins`;
    case 'hold':
      return `Hold the hill for ${l.obj.n} seconds`;
    case 'survive':
      return `Survive ${l.obj.n} seconds (max ${SURVIVE_MAX_DEATHS} deaths)`;
    case 'boss':
      return `Defeat ${l.bossName ?? 'the Overlord'}`;
  }
}
