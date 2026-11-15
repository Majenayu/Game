import type { LevelDef } from './levels';
import { UNIQUES, uniqueIdOf } from './skills/uniques';

/** One encounter of the Boss Tower. Art and lore live in the client bestiary under the same id. */
export interface BossFight {
  /** Matches the bestiary figure id. */
  figure: string;
  name: string;
  /** Boss max HP (a normal orb has 3 to 5). */
  hp: number;
  color: number;
  /** Five unique skill names the boss fights with. */
  kit: string[];
}

export const BOSS_FIGHTS: BossFight[] = [
  {
    figure: 'hollow',
    name: 'Hollow Sovereign',
    hp: 14,
    color: 0x8a5cff,
    kit: ['Dusk Blade', 'Nightfall', 'Shadow Step', 'Thorn Mantle', 'Ghost Army'],
  },
  {
    figure: 'mirror',
    name: 'Mirror King',
    hp: 16,
    color: 0x9fe8ff,
    kit: ['Glass Katana', 'Mirror Aegis', 'Black Mirror', 'Prism Link', 'Rewind'],
  },
  {
    figure: 'storm',
    name: 'Stormbreaker',
    hp: 18,
    color: 0x4dd2ff,
    kit: ['Tempest Crown', 'Storm Bow', 'Hyper Dash', 'Rune Barrier', 'Chain Whip'],
  },
  {
    figure: 'eclipse',
    name: 'Eclipse Warden',
    hp: 20,
    color: 0xffb347,
    kit: ['Crimson Eclipse', 'Solar Judgment', 'Eclipse Grip', 'Immortal Oath', 'Phoenix Veil'],
  },
  {
    figure: 'hydra',
    name: 'Hydra of Chains',
    hp: 22,
    color: 0x5bf09a,
    kit: ['Thousand Thorns', 'Twin Fangs', 'Gravity Well', 'Stoneheart', 'Spirit Wolf'],
  },
  {
    figure: 'maw',
    name: 'The Gilded Maw',
    hp: 24,
    color: 0xffd36e,
    kit: ['Gravity Maw', 'Siege Cannon', 'Black Hole', 'Unbreakable Bastion', 'Golem Guardian'],
  },
  {
    figure: 'echo',
    name: 'Echo Twins',
    hp: 26,
    color: 0xff5e8a,
    kit: ['Umbral Clone', 'Phantom Cannon', 'Silent Execution', 'Night Dancer', 'Blessing of Haste'],
  },
  {
    figure: 'star',
    name: 'The Last Star',
    hp: 30,
    color: 0xffe9a8,
    kit: ['Starfall Sovereign', 'Meteor Verdict', 'Omega Barrage', 'Sanctuary Field', 'Time Stop'],
  },
  {
    figure: 'majen',
    name: 'Majen',
    hp: 36,
    color: 0xffc93c,
    kit: ['Excalibur Orb', 'Solar Judgment', 'Immortal Oath', 'Hyper Dash', 'Domain Expansion'],
  },
];

/** Skill id of a unique by name, or -1 when there is no such unique. */
export function uniqueIdByName(name: string): number {
  const u = UNIQUES.find((x) => x.name === name);
  return u ? uniqueIdOf(u.n) : -1;
}

export function bossKitIds(f: BossFight): number[] {
  return f.kit.map(uniqueIdByName).filter((id) => id > 0);
}

/** Boss Tower levels use ids from 101 so they never clash with the 12 campaign levels. */
export const TOWER_FIRST_ID = 101;
const TOWER_MAPS = ['crypt', 'glacier', 'orbit', 'solar', 'jungle', 'foundry', 'nebula', 'abyss', 'finale'];

export const BOSS_LEVELS: LevelDef[] = BOSS_FIGHTS.map((f, i) => ({
  id: TOWER_FIRST_ID + i,
  name: f.figure === 'majen' ? 'Champion: Majen' : f.name,
  mode: 'dm',
  map: TOWER_MAPS[i],
  bots: 1 + Math.min(3, Math.floor(i / 2)),
  skill: Math.min(0.95, 0.55 + i * 0.05),
  time: 150,
  obj: { type: 'boss', n: 1 },
  par: 70 + i * 8,
  boss: true,
  bossName: f.name,
  bossHp: f.hp,
  bossColor: f.color,
  bossKit: bossKitIds(f),
  reward: 500 + i * 150,
}));

/** The Boss Tower opens after campaign level 6; each floor needs the floor below. */
export const TOWER_UNLOCK_LEVEL = 6;
