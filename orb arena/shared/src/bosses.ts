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
  /** Domain expansion at half HP: fills the whole arena. */
  domain: { name: string; color: number; effect: 'silence' | 'slow' | 'burn' | 'haste' | 'all' };
  /** Final form (below 25% HP): share of damage ignored and damage multiplier. */
  final: { armor: number; dmg: number };
}

export const BOSS_FIGHTS: BossFight[] = [
  {
    figure: 'hollow',
    name: 'Hollow Sovereign',
    hp: 14,
    color: 0x8a5cff,
    kit: ['Dusk Blade', 'Nightfall', 'Shadow Step', 'Thorn Mantle', 'Ghost Army'],
    domain: { name: 'Forgotten Kingdom', color: 0x8a5cff, effect: 'silence' },
    final: { armor: 0.6, dmg: 3 },
  },
  {
    figure: 'mirror',
    name: 'Mirror King',
    hp: 16,
    color: 0x9fe8ff,
    kit: ['Glass Katana', 'Mirror Aegis', 'Black Mirror', 'Prism Link', 'Rewind'],
    domain: { name: 'Hall of Mirrors', color: 0x9fe8ff, effect: 'haste' },
    final: { armor: 0.62, dmg: 3 },
  },
  {
    figure: 'storm',
    name: 'Stormbreaker',
    hp: 18,
    color: 0x4dd2ff,
    kit: ['Tempest Crown', 'Storm Bow', 'Hyper Dash', 'Rune Barrier', 'Chain Whip'],
    domain: { name: 'Eye of the Storm', color: 0x4dd2ff, effect: 'slow' },
    final: { armor: 0.64, dmg: 3.5 },
  },
  {
    figure: 'eclipse',
    name: 'Eclipse Warden',
    hp: 20,
    color: 0xffb347,
    kit: ['Crimson Eclipse', 'Solar Judgment', 'Eclipse Grip', 'Immortal Oath', 'Phoenix Veil'],
    domain: { name: 'Endless Eclipse', color: 0xffb347, effect: 'burn' },
    final: { armor: 0.66, dmg: 3.5 },
  },
  {
    figure: 'hydra',
    name: 'Hydra of Chains',
    hp: 22,
    color: 0x5bf09a,
    kit: ['Thousand Thorns', 'Twin Fangs', 'Gravity Well', 'Stoneheart', 'Spirit Wolf'],
    domain: { name: 'Garden of Chains', color: 0x5bf09a, effect: 'slow' },
    final: { armor: 0.68, dmg: 4 },
  },
  {
    figure: 'maw',
    name: 'The Gilded Maw',
    hp: 24,
    color: 0xffd36e,
    kit: ['Gravity Maw', 'Siege Cannon', 'Black Hole', 'Unbreakable Bastion', 'Golem Guardian'],
    domain: { name: 'Golden Hunger', color: 0xffd36e, effect: 'silence' },
    final: { armor: 0.7, dmg: 4 },
  },
  {
    figure: 'echo',
    name: 'Echo Twins',
    hp: 26,
    color: 0xff5e8a,
    kit: ['Umbral Clone', 'Phantom Cannon', 'Silent Execution', 'Night Dancer', 'Blessing of Haste'],
    domain: { name: 'Twin Echo Theatre', color: 0xff5e8a, effect: 'haste' },
    final: { armor: 0.72, dmg: 4.5 },
  },
  {
    figure: 'star',
    name: 'The Last Star',
    hp: 30,
    color: 0xffe9a8,
    kit: ['Starfall Sovereign', 'Meteor Verdict', 'Omega Barrage', 'Sanctuary Field', 'Time Stop'],
    domain: { name: 'Last Light', color: 0xffe9a8, effect: 'burn' },
    final: { armor: 0.75, dmg: 5 },
  },
  {
    figure: 'majen',
    name: 'Majen',
    hp: 50,
    color: 0xffc93c,
    kit: ['Excalibur Orb', 'Solar Judgment', 'Immortal Oath', 'Hyper Dash', 'Domain Expansion'],
    // The champion: in his final form attack and defence go to the maximum ("9999").
    domain: { name: 'Crown of Eternity', color: 0xffc93c, effect: 'all' },
    final: { armor: 0.92, dmg: 99 },
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
const TOWER_MAPS = ['crypt', 'glacier', 'orbit', 'solar', 'jungle', 'foundry', 'nebula', 'abyss', 'throne'];
/** Level id of the champion duel. Anyone may challenge Majen at any time. */
export const CHAMPION_LEVEL_ID = TOWER_FIRST_ID + 8;

export const BOSS_LEVELS: LevelDef[] = BOSS_FIGHTS.map((f, i) => ({
  id: TOWER_FIRST_ID + i,
  name: f.figure === 'majen' ? 'Champion: Majen' : f.name,
  mode: 'dm',
  map: TOWER_MAPS[i],
  // Majen fights alone (1v1 in an empty arena); the other bosses bring guards.
  bots: f.figure === 'majen' ? 1 : 1 + Math.min(3, Math.floor(i / 2)),
  skill: Math.min(0.95, 0.55 + i * 0.05),
  time: 150,
  obj: { type: 'boss', n: 1 },
  par: 70 + i * 8,
  boss: true,
  bossName: f.name,
  bossHp: f.hp,
  bossColor: f.color,
  bossKit: bossKitIds(f),
  bossDomain: f.domain,
  bossFinal: f.final,
  reward: 500 + i * 150,
}));

/** The Boss Tower opens after campaign level 6; each floor needs the floor below. */
export const TOWER_UNLOCK_LEVEL = 6;
