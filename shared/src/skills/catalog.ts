/** Building blocks for the generated skill catalog: ranks, categories, elements, archetypes and modifiers. */

export type Rank = 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'U';
export const RANKS: Rank[] = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'U'];

export interface RankInfo {
  rank: Rank;
  name: string;
  color: number;
  /** Power multiplier for skills of this rank. */
  power: number;
  /** How many skill definitions exist at this rank (U is hand-made). */
  count: number;
  /** Cost of this rank in the ranked power budget. */
  budget: number;
}

export const RANK_INFO: Record<Rank, RankInfo> = {
  F: { rank: 'F', name: 'Junk', color: 0x7c84a8, power: 0.6, count: 12000, budget: 100 },
  E: { rank: 'E', name: 'Poor', color: 0x6bcb77, power: 0.75, count: 12000, budget: 160 },
  D: { rank: 'D', name: 'Common', color: 0x4da8ff, power: 0.9, count: 20000, budget: 260 },
  C: { rank: 'C', name: 'Uncommon', color: 0x35e0c2, power: 1.05, count: 30000, budget: 420 },
  B: { rank: 'B', name: 'Rare', color: 0xb77dff, power: 1.25, count: 30000, budget: 680 },
  A: { rank: 'A', name: 'Epic', color: 0xff8a3c, power: 1.6, count: 10000, budget: 1100 },
  S: { rank: 'S', name: 'Legendary', color: 0xffc93c, power: 2.1, count: 1000, budget: 1800 },
  U: { rank: 'U', name: 'Unique', color: 0xff4da6, power: 6.0, count: 100, budget: 3000 },
};

export type Category =
  | 'attack'
  | 'defence'
  | 'support'
  | 'boost'
  | 'shadow'
  | 'weapon'
  | 'summon'
  | 'control'
  | 'movement'
  | 'world';

export const CATEGORIES: Category[] = [
  'attack',
  'defence',
  'support',
  'boost',
  'shadow',
  'weapon',
  'summon',
  'control',
  'movement',
  'world',
];

/** What an archetype does when cast. The match simulation implements one behavior per kind. */
export type Kind =
  | 'projectile'
  | 'beam'
  | 'volley'
  | 'nova'
  | 'cleave'
  | 'shield'
  | 'barrier'
  | 'heal'
  | 'aura'
  | 'buff'
  | 'stealth'
  | 'ambush'
  | 'summon'
  | 'mine'
  | 'pull'
  | 'slow'
  | 'dash'
  | 'blink'
  | 'portal'
  | 'world';

export interface BaseStats {
  power: number;
  cooldown: number;
  mp: number;
  cast: number;
  range: number;
  area: number;
  duration: number;
}

const K = (
  power: number,
  cooldown: number,
  mp: number,
  cast: number,
  range: number,
  area: number,
  duration: number,
): BaseStats => ({
  power,
  cooldown,
  mp,
  cast,
  range,
  area,
  duration,
});

/** Base numbers per behavior kind. Archetypes tweak these a little. */
export const KIND_BASE: Record<Kind, BaseStats> = {
  projectile: K(40, 5, 18, 0.2, 640, 0, 0),
  beam: K(55, 9, 30, 0.5, 700, 0, 0.8),
  volley: K(22, 8, 32, 0.4, 600, 0, 0),
  nova: K(30, 10, 36, 0.4, 260, 260, 0),
  cleave: K(48, 6, 22, 0.25, 120, 120, 0),
  shield: K(0, 12, 28, 0.1, 0, 0, 1.8),
  barrier: K(0, 14, 34, 0.3, 160, 120, 6),
  heal: K(30, 16, 40, 0.5, 0, 0, 0),
  aura: K(8, 18, 44, 0.3, 0, 220, 8),
  buff: K(20, 15, 30, 0.2, 0, 0, 6),
  stealth: K(0, 14, 26, 0.1, 0, 0, 4),
  ambush: K(70, 12, 30, 0.2, 260, 0, 0),
  summon: K(18, 18, 46, 0.6, 200, 0, 12),
  mine: K(45, 7, 20, 0.2, 0, 85, 25),
  pull: K(10, 12, 32, 0.4, 420, 200, 1.5),
  slow: K(6, 11, 28, 0.3, 360, 180, 4),
  dash: K(0, 4, 14, 0.05, 200, 0, 0.18),
  blink: K(0, 6, 18, 0.1, 260, 0, 0),
  portal: K(0, 16, 40, 0.5, 500, 0, 10),
  world: K(0, 30, 0, 0, 0, 0, 0),
};

export interface Archetype {
  id: number;
  name: string;
  category: Category;
  kind: Kind;
}

const A = (name: string, category: Category, kind: Kind): Omit<Archetype, 'id'> => ({ name, category, kind });

const ARCH_SRC: Array<Omit<Archetype, 'id'>> = [
  // attack (10)
  A('Bolt', 'attack', 'projectile'),
  A('Lance', 'attack', 'beam'),
  A('Orb', 'attack', 'projectile'),
  A('Beam', 'attack', 'beam'),
  A('Barrage', 'attack', 'volley'),
  A('Volley', 'attack', 'volley'),
  A('Nova', 'attack', 'nova'),
  A('Comet', 'attack', 'projectile'),
  A('Cleave', 'attack', 'cleave'),
  A('Slash', 'attack', 'cleave'),
  // defence (6)
  A('Aegis', 'defence', 'shield'),
  A('Barrier', 'defence', 'barrier'),
  A('Ward', 'defence', 'shield'),
  A('Bulwark', 'defence', 'barrier'),
  A('Mirror', 'defence', 'shield'),
  A('Guard', 'defence', 'shield'),
  // support (6)
  A('Mend', 'support', 'heal'),
  A('Blessing', 'support', 'aura'),
  A('Aura', 'support', 'aura'),
  A('Haven', 'support', 'barrier'),
  A('Link', 'support', 'buff'),
  A('Renew', 'support', 'heal'),
  // boost (5)
  A('Surge', 'boost', 'buff'),
  A('Haste', 'boost', 'buff'),
  A('Fury', 'boost', 'buff'),
  A('Focus', 'boost', 'buff'),
  A('Overdrive', 'boost', 'buff'),
  // shadow (4)
  A('Veil', 'shadow', 'stealth'),
  A('Phantom', 'shadow', 'stealth'),
  A('Ambush', 'shadow', 'ambush'),
  A('Umbra', 'shadow', 'slow'),
  // weapon (6)
  A('Blade', 'weapon', 'cleave'),
  A('Gun', 'weapon', 'volley'),
  A('Bow', 'weapon', 'projectile'),
  A('Hammer', 'weapon', 'cleave'),
  A('Missile', 'weapon', 'projectile'),
  A('Chain', 'weapon', 'pull'),
  // summon (5)
  A('Familiar', 'summon', 'summon'),
  A('Legion', 'summon', 'summon'),
  A('Swarm', 'summon', 'summon'),
  A('Golem', 'summon', 'summon'),
  A('Totem', 'summon', 'mine'),
  // control (4)
  A('Snare', 'control', 'slow'),
  A('Gravity', 'control', 'pull'),
  A('Stasis', 'control', 'slow'),
  A('Quake', 'control', 'nova'),
  // movement (4)
  A('Dash', 'movement', 'dash'),
  A('Blink', 'movement', 'blink'),
  A('Rift', 'movement', 'portal'),
  A('Warp', 'movement', 'blink'),
  // world: out of battle (4)
  A('Forge', 'world', 'world'),
  A('Appraisal', 'world', 'world'),
  A('Scout', 'world', 'world'),
  A('Gather', 'world', 'world'),
];

export const ARCHETYPES: Archetype[] = ARCH_SRC.map((a, id) => ({ id, ...a }));

export interface Element {
  id: number;
  name: string;
  /** Status effect or behavior the element adds. */
  status: string;
  color: number;
}

export const ELEMENTS: Element[] = [
  { id: 0, name: 'Flame', status: 'burn', color: 0xff6b3d },
  { id: 1, name: 'Frost', status: 'slow', color: 0x7dd3ff },
  { id: 2, name: 'Storm', status: 'chain', color: 0xffe14d },
  { id: 3, name: 'Void', status: 'pierce', color: 0x8a5cff },
  { id: 4, name: 'Light', status: 'heal', color: 0xfff3b0 },
  { id: 5, name: 'Shadow', status: 'hide', color: 0x7b6bb5 },
  { id: 6, name: 'Toxin', status: 'poison', color: 0x8be04d },
  { id: 7, name: 'Metal', status: 'bounce', color: 0xb8c4d6 },
  { id: 8, name: 'Wind', status: 'knockback', color: 0xa8f0e0 },
  { id: 9, name: 'Blood', status: 'leech', color: 0xe0334f },
  { id: 10, name: 'Star', status: 'homing', color: 0xffd6f5 },
  { id: 11, name: 'Gravity', status: 'pull', color: 0x6c7cff },
];

/** 80 adjectives. Each also implies a numeric twist (see MODIFIER_TWISTS). */
export const MODIFIER_NAMES = [
  'Crimson',
  'Azure',
  'Golden',
  'Silent',
  'Raging',
  'Hollow',
  'Radiant',
  'Ancient',
  'Swift',
  'Heavy',
  'Wicked',
  'Gentle',
  'Primal',
  'Ethereal',
  'Savage',
  'Sacred',
  'Cursed',
  'Blazing',
  'Frozen',
  'Thunder',
  'Phantom',
  'Iron',
  'Silver',
  'Obsidian',
  'Jade',
  'Scarlet',
  'Violet',
  'Amber',
  'Ivory',
  'Onyx',
  'Lunar',
  'Solar',
  'Stellar',
  'Cosmic',
  'Abyssal',
  'Celestial',
  'Infernal',
  'Verdant',
  'Arctic',
  'Desert',
  'Storm',
  'Ember',
  'Gale',
  'Tidal',
  'Rune',
  'Dragon',
  'Titan',
  'Fallen',
  'Rising',
  'Eternal',
  'Fierce',
  'Calm',
  'Wild',
  'Noble',
  'Rogue',
  'Royal',
  'Mystic',
  'Arcane',
  'Spectral',
  'Crystal',
  'Molten',
  'Void-touched',
  'Dread',
  'Bright',
  'Dusk',
  'Dawn',
  'Mirror',
  'Shatter',
  'Echoing',
  'Burning',
  'Piercing',
  'Vengeful',
  'Lucky',
  'Forgotten',
  'Twin',
  'Grand',
  'Tiny',
  'Endless',
  'Final',
  'Genesis',
];

/** Eight numeric twists x ten strengths = 80 distinct modifier effects. */
export const MODIFIER_TWISTS = [
  'power',
  'cooldown',
  'range',
  'area',
  'duration',
  'count',
  'mp',
  'cast',
] as const;
export type Twist = (typeof MODIFIER_TWISTS)[number];

export interface Modifier {
  id: number;
  name: string;
  twist: Twist;
  /** 1 (small) to 10 (large) */
  strength: number;
}

export const MODIFIERS: Modifier[] = MODIFIER_NAMES.map((name, id) => ({
  id,
  name,
  twist: MODIFIER_TWISTS[id % 8],
  strength: Math.floor(id / 8) + 1,
}));

export const ARCH_COUNT = ARCHETYPES.length;
export const ELEM_COUNT = ELEMENTS.length;
export const MOD_COUNT = MODIFIERS.length;
/** Distinct (archetype, element, modifier) combinations available per rank. */
export const COMBOS = ARCH_COUNT * ELEM_COUNT * MOD_COUNT;
