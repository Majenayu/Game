import { RANKS, type Rank } from './skills/catalog';
import { emptyBonus, type Bonus } from './progression';

/**
 * Gear: 8 slots x 30 designs x 12 colours x 8 ranks = 23,040 different items, all generated from an id.
 * Every item gives stat bonuses that grow with its rank (rank U gives about 10x rank F).
 */
export const GEAR_SLOTS = ['hat', 'gloves', 'armor', 'pants', 'shoes', 'bag', 'sword', 'vehicle'] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];
export const SLOT_NAMES: Record<GearSlot, string> = {
  hat: 'Hats',
  gloves: 'Gloves',
  armor: 'Armor',
  pants: 'Pants',
  shoes: 'Shoes',
  bag: 'Bags',
  sword: 'Swords & weapons',
  vehicle: 'Vehicles',
};
const DESIGNS: Record<GearSlot, string[]> = {
  hat: ['Cap', 'Beret', 'Helm', 'Crown', 'Hood', 'Top Hat', 'Bandana', 'Tiara', 'Horned Helm', 'Wizard Hat', 'Visor', 'Halo', 'Turban', 'Beanie', 'Samurai Kabuto', 'Pilot Goggles', 'Fedora', 'Jester Hat', 'Laurel', 'Knight Helm', 'Cat Ears', 'Antlers', 'Space Helmet', 'Straw Hat', 'Pirate Tricorn', 'Ninja Mask', 'Feather Cap', 'Diadem', 'Bunny Ears', 'Star Circlet'],
  gloves: ['Mitts', 'Gauntlets', 'Wraps', 'Claws', 'Bracers', 'Knuckles', 'Grips', 'Silk Gloves', 'Iron Fists', 'Thunder Hands', 'Frost Paws', 'Flame Gloves', 'Healer Wraps', 'Archer Tabs', 'Boxer Gloves', 'Rune Bracers', 'Spiked Fists', 'Shadow Grips', 'Crystal Gauntlets', 'Robot Hands', 'Dragon Claws', 'Feather Mitts', 'Pilot Gloves', 'Lucky Mitts', 'Gold Grips', 'Vine Wraps', 'Star Gloves', 'Void Fists', 'Coral Gloves', 'Titan Gauntlets'],
  armor: ['Vest', 'Chainmail', 'Plate', 'Robe', 'Cloak', 'Jacket', 'Breastplate', 'Tunic', 'Scale Mail', 'Kimono', 'Hoodie', 'Battle Suit', 'Mage Robe', 'Paladin Plate', 'Ninja Garb', 'Pirate Coat', 'Space Suit', 'Crystal Armor', 'Bone Armor', 'Leaf Armor', 'Dragon Scale', 'Mech Shell', 'Royal Coat', 'Storm Cloak', 'Frost Mail', 'Ember Plate', 'Shadow Wrap', 'Star Mantle', 'Void Carapace', 'Titan Shell'],
  pants: ['Shorts', 'Trousers', 'Greaves', 'Leggings', 'Cargo Pants', 'Kilt', 'Hakama', 'Jeans', 'Plate Legs', 'Silk Pants', 'Ninja Pants', 'Ranger Legs', 'Pirate Breeches', 'Mech Legs', 'Crystal Greaves', 'Bone Greaves', 'Leaf Leggings', 'Royal Trousers', 'Storm Legs', 'Frost Greaves', 'Ember Legs', 'Shadow Pants', 'Star Leggings', 'Void Greaves', 'Dragon Legs', 'Sport Pants', 'Desert Wraps', 'Coral Leggings', 'Titan Legs', 'Runner Shorts'],
  shoes: ['Sneakers', 'Boots', 'Sandals', 'Greaves', 'Slippers', 'Rocket Boots', 'Winged Shoes', 'Ninja Tabi', 'Ice Skates', 'Rollers', 'Cowboy Boots', 'Hiking Boots', 'Royal Shoes', 'Mech Feet', 'Crystal Boots', 'Spring Shoes', 'Lava Boots', 'Cloud Steps', 'Shadow Steps', 'Star Boots', 'Void Treads', 'Dragon Talons', 'Clown Shoes', 'Hover Boots', 'Leaf Sandals', 'Storm Striders', 'Frost Boots', 'Gold Sneakers', 'Titan Boots', 'Sprint Spikes'],
  bag: ['Pouch', 'Backpack', 'Satchel', 'Quiver', 'Sack', 'Lunchbox', 'Treasure Bag', 'Mage Tome Bag', 'Jetpack', 'Scroll Case', 'Coin Purse', 'Potion Belt', 'Ammo Pack', 'Crystal Bag', 'Shadow Bag', 'Star Pouch', 'Void Satchel', 'Dragon Hoard', 'Royal Purse', 'Mech Pack', 'Leaf Bag', 'Storm Pack', 'Frost Pack', 'Ember Pouch', 'Pirate Chest Bag', 'Ninja Pouch', 'Lucky Sack', 'Gold Purse', 'Titan Pack', 'Cosmic Bag'],
  sword: ['Short Sword', 'Katana', 'Broadsword', 'Rapier', 'Axe', 'Spear', 'Hammer', 'Scythe', 'Dagger', 'Staff', 'Wand', 'Bow', 'Crossbow', 'Trident', 'Halberd', 'Saber', 'Claymore', 'Whip', 'Chakram', 'Nunchaku', 'Lightsaber', 'Gunblade', 'Flail', 'Glaive', 'Sickle', 'Mace', 'Boomerang', 'Fan Blade', 'Dragon Blade', 'Star Sword'],
  vehicle: ['Skateboard', 'Bike', 'Scooter', 'Hoverboard', 'Horse', 'Wolf Mount', 'Car', 'Kart', 'Jetski', 'Glider', 'Rocket', 'Cloud', 'Carpet', 'Mech Walker', 'Tank', 'Drone Pod', 'Griffin', 'Dragon Mount', 'Turtle Mount', 'Motorbike', 'UFO', 'Sled', 'Boat', 'Balloon', 'Chariot', 'Unicycle', 'Train Cart', 'Phoenix', 'Star Ship', 'Void Rider'],
};
export const GEAR_COLORS: Array<{ name: string; hex: number }> = [
  { name: 'Crimson', hex: 0xe0334f },
  { name: 'Azure', hex: 0x2979ff },
  { name: 'Emerald', hex: 0x2fbf71 },
  { name: 'Golden', hex: 0xffc93c },
  { name: 'Violet', hex: 0x8a5cff },
  { name: 'Frost', hex: 0x7dd3ff },
  { name: 'Ember', hex: 0xff6b3d },
  { name: 'Shadow', hex: 0x4a4466 },
  { name: 'Pearl', hex: 0xf4eeff },
  { name: 'Jade', hex: 0x35e0c2 },
  { name: 'Rose', hex: 0xff7eb6 },
  { name: 'Steel', hex: 0xa9b4c8 },
];
const ND = 30;
const NC = GEAR_COLORS.length;
const NR = RANKS.length;
export const GEAR_TOTAL = GEAR_SLOTS.length * ND * NC * NR;
/** Rank multiplier: F 1x up to U 10x. */
export const GEAR_RANK_MUL = [1, 1.5, 2.2, 3.1, 4.4, 6.2, 8.2, 10];
/** Main bonus per slot (percent at rank F). */
const SLOT_MAIN: Record<GearSlot, Partial<Bonus>> = {
  hat: { aim: 3, spAttack: 1.5 },
  gloves: { attack: 2, reload: 2 },
  armor: { defence: 3, hp: 2 },
  pants: { defence: 2, speed: 1 },
  shoes: { speed: 2.5 },
  bag: { mp: 4, hp: 1 },
  sword: { attack: 3.5 },
  vehicle: { speed: 3, hp: 1 },
};
/** The colour adds a small extra stat. */
const COLOR_EXTRA: Array<Partial<Bonus>> = [
  { attack: 1 },
  { mp: 1.5 },
  { hp: 1 },
  { spAttack: 1 },
  { spAttack: 1.2 },
  { speed: 0.8 },
  { attack: 1.2 },
  { defence: 1 },
  { hp: 1.2 },
  { reload: 1 },
  { aim: 1.5 },
  { defence: 1.2 },
];

export interface GearDef {
  id: number;
  slot: GearSlot;
  design: number;
  color: number;
  rank: Rank;
  name: string;
  bonus: Bonus;
  price: number;
}
export function isGearId(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id >= 0 && id < GEAR_TOTAL;
}
export function gearId(slot: number, design: number, color: number, rank: number): number {
  return ((slot * ND + design) * NC + color) * NR + rank;
}
export function getGear(id: number): GearDef {
  const rank = id % NR;
  const color = Math.floor(id / NR) % NC;
  const design = Math.floor(id / (NR * NC)) % ND;
  const slotI = Math.floor(id / (NR * NC * ND)) % GEAR_SLOTS.length;
  const slot = GEAR_SLOTS[slotI];
  const mul = GEAR_RANK_MUL[rank];
  const bonus = emptyBonus();
  for (const [k, v] of Object.entries(SLOT_MAIN[slot])) bonus[k as keyof Bonus] += (v as number) * mul;
  for (const [k, v] of Object.entries(COLOR_EXTRA[color])) bonus[k as keyof Bonus] += (v as number) * mul * 0.5;
  // Designs late in the list lean a little more toward the main stat.
  const tilt = 1 + design / 60;
  for (const k of Object.keys(bonus) as Array<keyof Bonus>) bonus[k] = Math.round(bonus[k] * tilt * 10) / 10;
  const r = RANKS[rank];
  return {
    id,
    slot,
    design,
    color,
    rank: r,
    name: `${GEAR_COLORS[color].name} ${DESIGNS[slot][design]}`,
    bonus,
    price: Math.round(60 * Math.pow(2.2, rank)),
  };
}
/** A random gear item of a rank (any slot, or one slot). */
export function randomGear(rank: Rank, rng: () => number, slot?: GearSlot): number {
  const s = slot ? GEAR_SLOTS.indexOf(slot) : Math.floor(rng() * GEAR_SLOTS.length);
  return gearId(s, Math.floor(rng() * ND), Math.floor(rng() * NC), Math.max(0, RANKS.indexOf(rank)));
}
/** Sum of bonuses of the equipped gear. */
export function gearBonus(ids: number[]): Bonus {
  const b = emptyBonus();
  const seen = new Set<GearSlot>();
  for (const id of ids) {
    if (!isGearId(id)) continue;
    const g = getGear(id);
    if (seen.has(g.slot)) continue;
    seen.add(g.slot);
    for (const k of Object.keys(b) as Array<keyof Bonus>) b[k] += g.bonus[k];
  }
  return b;
}
export function bonusText(b: Partial<Bonus>): string {
  const L: Record<string, string> = { hp: 'HP', mp: 'Mana', attack: 'Attack', defence: 'Defence', spAttack: 'Sp. Atk', speed: 'Speed', reload: 'Reload', aim: 'Aim' };
  return Object.entries(b)
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v]) => `+${v}% ${L[k]}`)
    .join(', ');
}
