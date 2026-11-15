import { RANKS, type Rank } from './skills/catalog';

export type SummonKind = 'beast' | 'robot' | 'dragon' | 'aquatic' | 'drone';

export interface SummonDef {
  id: number;
  name: string;
  kind: SummonKind;
  desc: string;
  power: number;
  price: number;
}

export const SUMMONS: SummonDef[] = [
  { id: 1, name: 'Ember Wolf', kind: 'beast', desc: 'A fast fire companion.', power: 12, price: 250 },
  { id: 2, name: 'Iron Sentinel', kind: 'robot', desc: 'A durable ranged guardian.', power: 10, price: 300 },
  { id: 3, name: 'Storm Drake', kind: 'dragon', desc: 'A lightning-breathing dragon.', power: 18, price: 650 },
  { id: 4, name: 'Tidefin', kind: 'aquatic', desc: 'A healing water companion.', power: 9, price: 220 },
  { id: 5, name: 'Meridian Mermaid', kind: 'aquatic', desc: 'A support summon with restorative waves.', power: 11, price: 400 },
  { id: 6, name: 'Scout Drone', kind: 'drone', desc: 'A small drone that marks targets.', power: 8, price: 180 },
  { id: 7, name: 'Golden Wyvern', kind: 'dragon', desc: 'A rare aerial attacker.', power: 22, price: 1200 },
  { id: 8, name: 'Mecha Bear', kind: 'robot', desc: 'A heavy close-range protector.', power: 16, price: 800 },
];

export function summonById(id: number): SummonDef | undefined {
  return SUMMONS.find((s) => s.id === id);
}

// ---- Creature catalog (generated summons that carry skill cards) ---------------------------------

/**
 * Summons: companion creatures that fight beside you in arena, campaign and practice matches (not ranked).
 * 8 families x 12 species x 8 ranks = 768 summons. Each one can carry up to two of your skill cards,
 * which it uses on its own, and can be levelled up to 50.
 */
export const SUMMON_FAMILIES = [
  { id: 'beast', name: 'Beasts', color: 0xff8a3c, species: ['Ember Wolf', 'Thunder Lion', 'Frost Bear', 'Shadow Panther', 'Rock Boar', 'Storm Tiger', 'Moon Fox', 'Iron Rhino', 'Sand Jackal', 'Vine Lynx', 'Lava Hound', 'Star Stag'] },
  { id: 'robot', name: 'Robots', color: 0xa9b4c8, species: ['Bolt Bot', 'Guard Mech', 'Laser Unit', 'Repair Droid', 'Tank Walker', 'Spark Spider', 'Titan Core', 'Scout Bot', 'Cannon Bot', 'Shield Mech', 'Nano Swarm', 'Omega Frame'] },
  { id: 'dragon', name: 'Dragons', color: 0xffc93c, species: ['Fire Wyrm', 'Ice Drake', 'Storm Wyvern', 'Void Serpent', 'Jade Dragon', 'Bone Drake', 'Sun Dragon', 'Moon Dragon', 'Crystal Wyrm', 'Toxic Drake', 'Blood Wyvern', 'Star Dragon'] },
  { id: 'animal', name: 'Animals', color: 0x7dff6b, species: ['Lucky Cat', 'Brave Dog', 'Wise Owl', 'Swift Hare', 'Battle Ram', 'Sky Eagle', 'Panda Monk', 'Turtle Sage', 'Bee Queen', 'Frog Ninja', 'Monkey King', 'Red Panda'] },
  { id: 'fish', name: 'Fish', color: 0x4dd2ff, species: ['Puffer', 'Shark Pup', 'Glow Squid', 'Sword Fish', 'Manta Ray', 'Coral Crab', 'Electric Eel', 'Jelly Lord', 'Koi Spirit', 'Angler', 'Orca', 'Leviathan Fry'] },
  { id: 'mermaid', name: 'Merfolk', color: 0x35e0c2, species: ['Pearl Siren', 'Tide Caller', 'Coral Knight', 'Wave Dancer', 'Abyss Queen', 'Shell Guard', 'Kelp Witch', 'Storm Siren', 'Moon Mermaid', 'Reef Prince', 'Deep Oracle', 'Ocean Empress'] },
  { id: 'drone', name: 'Drones', color: 0x8a5cff, species: ['Quad Drone', 'Stealth Drone', 'Heal Drone', 'Laser Drone', 'Bomb Drone', 'Shield Drone', 'Scout Eye', 'Swarm Pod', 'Ion Drone', 'Gravity Drone', 'Pulse Drone', 'Halo Drone'] },
  { id: 'spirit', name: 'Spirits', color: 0xffd6f5, species: ['Wisp', 'Phoenix Chick', 'Ghost Lantern', 'Forest Sprite', 'Star Fairy', 'Ash Phantom', 'Snow Spirit', 'Sun Wisp', 'Dream Moth', 'Void Wraith', 'Tide Spirit', 'Aurora Spirit'] },
] as const;
const NS = 12;
const NR = RANKS.length;
export const CREATURE_TOTAL = SUMMON_FAMILIES.length * NS * NR;
export const MAX_CREATURE_LEVEL = 50;

export interface CreatureDef {
  id: number;
  family: (typeof SUMMON_FAMILIES)[number]['id'];
  familyName: string;
  species: number;
  name: string;
  rank: Rank;
  color: number;
  /** How many skill cards it can carry. */
  cardSlots: number;
}
export interface CreatureInstance {
  uid: string;
  id: number;
  level: number;
  /** Skill ids attached to this summon. */
  cards: number[];
}
export function isCreatureId(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id >= 0 && id < CREATURE_TOTAL;
}
export function creatureId(family: number, species: number, rank: number): number {
  return (family * NS + species) * NR + rank;
}
export function getCreature(id: number): CreatureDef {
  const rank = id % NR;
  const species = Math.floor(id / NR) % NS;
  const fam = SUMMON_FAMILIES[Math.floor(id / (NR * NS)) % SUMMON_FAMILIES.length];
  return {
    id,
    family: fam.id,
    familyName: fam.name,
    species,
    name: fam.species[species],
    rank: RANKS[rank],
    color: fam.color,
    cardSlots: rank >= 5 ? 2 : 1,
  };
}
/** Fighting stats of a summon at a level. */
export function creatureStats(id: number, level: number): { dmg: number; fire: number; hp: number } {
  const r = id % NR;
  const l = Math.max(1, Math.min(MAX_CREATURE_LEVEL, level));
  const mul = (1 + r * 0.45) * (1 + (l - 1) * 0.04);
  return { dmg: Math.round(25 * mul), fire: Math.max(0.5, 1.4 - r * 0.08), hp: Math.round(200 * mul) };
}
export function creatureUpgradeCost(id: number, level: number): number {
  return Math.round(80 * level * (1 + (id % NR)));
}
/** Summon gacha odds (percent per rank). */
export const CREATURE_ODDS: Partial<Record<Rank, number>> = { F: 30, E: 26, D: 20, C: 13, B: 7, A: 3, S: 0.9, U: 0.1 };
export const CREATURE_COST = 300;
export function rollCreature(rng: () => number, bonusLuck = 0): number {
  let r = rng() * 100;
  let rank: Rank = 'F';
  for (const [k, p] of Object.entries(CREATURE_ODDS) as Array<[Rank, number]>) {
    r -= p;
    if (r <= 0) {
      rank = k;
      break;
    }
  }
  let ri = RANKS.indexOf(rank);
  if (ri < RANKS.indexOf('S') && rng() * 100 < bonusLuck) ri++;
  return creatureId(Math.floor(rng() * SUMMON_FAMILIES.length), Math.floor(rng() * NS), ri);
}
