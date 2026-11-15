/** Data tables for everything unlockable or collectable. Pure data plus a few helpers. */
import { usableInBattle } from './battle';

export type ModeId = 'dm' | 'tdm' | 'coins' | 'hill';

export interface ModeDef {
  id: ModeId;
  name: string;
  desc: string;
  roundTime: number;
  team: boolean;
}

export const MODES: Record<ModeId, ModeDef> = {
  dm: { id: 'dm', name: 'Deathmatch', desc: 'Most kills wins.', roundTime: 90, team: false },
  tdm: {
    id: 'tdm',
    name: 'Team Battle',
    desc: 'Blue vs Red. Team with most kills wins.',
    roundTime: 90,
    team: true,
  },
  coins: {
    id: 'coins',
    name: 'Coin Rush',
    desc: 'Grab coins. Kills steal a bonus.',
    roundTime: 75,
    team: false,
  },
  hill: {
    id: 'hill',
    name: 'King of the Hill',
    desc: 'Hold the glowing zone alone to score.',
    roundTime: 90,
    team: false,
  },
};
export const MODE_LIST: ModeId[] = ['dm', 'tdm', 'coins', 'hill'];

export function isModeId(v: unknown): v is ModeId {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(MODES, v);
}

// ---- characters -------------------------------------------------------------

export interface CharacterDef {
  id: string;
  name: string;
  desc: string;
  hp: number;
  speed: number;
  /** Multiplies the time between shots (lower is faster). */
  fire: number;
  bulletSpeed: number;
  /** Multiplies skill cooldowns. */
  skillCd: number;
  /** Seconds per regenerated hit point, 0 for none. */
  regen: number;
  price: number;
  level: number;
}

export const CHARACTERS: Record<string, CharacterDef> = {
  nova: {
    id: 'nova',
    name: 'Nova',
    desc: 'Balanced all rounder.',
    hp: 3,
    speed: 1,
    fire: 1,
    bulletSpeed: 1,
    skillCd: 1,
    regen: 0,
    price: 0,
    level: 1,
  },
  bolt: {
    id: 'bolt',
    name: 'Bolt',
    desc: 'Very fast but fragile.',
    hp: 2,
    speed: 1.2,
    fire: 0.95,
    bulletSpeed: 1,
    skillCd: 1,
    regen: 0,
    price: 300,
    level: 2,
  },
  titan: {
    id: 'titan',
    name: 'Titan',
    desc: 'Slow tank with 5 HP.',
    hp: 5,
    speed: 0.82,
    fire: 1.2,
    bulletSpeed: 0.95,
    skillCd: 1,
    regen: 0,
    price: 600,
    level: 4,
  },
  viper: {
    id: 'viper',
    name: 'Viper',
    desc: 'Rapid shots, low HP.',
    hp: 2,
    speed: 1.05,
    fire: 0.68,
    bulletSpeed: 1,
    skillCd: 1,
    regen: 0,
    price: 800,
    level: 6,
  },
  ghost: {
    id: 'ghost',
    name: 'Ghost',
    desc: 'Skills recharge 30% faster.',
    hp: 3,
    speed: 1.08,
    fire: 1,
    bulletSpeed: 1,
    skillCd: 0.7,
    regen: 0,
    price: 1000,
    level: 8,
  },
  medic: {
    id: 'medic',
    name: 'Medic',
    desc: 'Regenerates 1 HP every 9 s.',
    hp: 3,
    speed: 0.98,
    fire: 1.05,
    bulletSpeed: 1,
    skillCd: 1,
    regen: 9,
    price: 1200,
    level: 10,
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper',
    desc: 'Fast bullets, slow fire.',
    hp: 3,
    speed: 0.95,
    fire: 1.35,
    bulletSpeed: 1.45,
    skillCd: 1,
    regen: 0,
    price: 1500,
    level: 12,
  },
};
export const CHARACTER_LIST = Object.values(CHARACTERS);

export function isCharacterId(v: unknown): v is string {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(CHARACTERS, v);
}

// ---- skills -----------------------------------------------------------------

export interface SkillDef {
  id: string;
  name: string;
  desc: string;
  cd: number;
  color: number;
  price: number;
  level: number;
}

export const SKILLS: Record<string, SkillDef> = {
  dash: {
    id: 'dash',
    name: 'Dash',
    desc: 'Burst forward quickly.',
    cd: 4,
    color: 0x4dd2ff,
    price: 0,
    level: 1,
  },
  shield: {
    id: 'shield',
    name: 'Bubble',
    desc: '1.8 s of invulnerability.',
    cd: 12,
    color: 0x7dff6b,
    price: 0,
    level: 1,
  },
  pulse: {
    id: 'pulse',
    name: 'Pulse',
    desc: 'Shockwave hurts and pushes nearby foes.',
    cd: 9,
    color: 0xb77dff,
    price: 250,
    level: 3,
  },
  mine: {
    id: 'mine',
    name: 'Mine',
    desc: 'Drop a mine that explodes on foes.',
    cd: 7,
    color: 0xff8a3c,
    price: 350,
    level: 5,
  },
  blink: {
    id: 'blink',
    name: 'Blink',
    desc: 'Teleport forward.',
    cd: 6,
    color: 0x3cffd0,
    price: 400,
    level: 7,
  },
  burst: {
    id: 'burst',
    name: 'Burst',
    desc: 'Fire a fan of 5 shots.',
    cd: 8,
    color: 0xff5e8a,
    price: 500,
    level: 9,
  },
  repair: {
    id: 'repair',
    name: 'Repair',
    desc: 'Restore 1 HP.',
    cd: 20,
    color: 0xffc93c,
    price: 600,
    level: 11,
  },
};
export const SKILL_LIST = Object.values(SKILLS);

export function isSkillId(v: unknown): v is string {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(SKILLS, v);
}

// ---- powerups: 12 effects x 4 rarities x 21 modifiers = 1008 unique items -----

export type EffectId =
  | 'rapid'
  | 'speed'
  | 'triple'
  | 'shield'
  | 'heal'
  | 'pierce'
  | 'big'
  | 'vampire'
  | 'magnet'
  | 'freeze'
  | 'ricochet'
  | 'overdrive';

export interface EffectDef {
  id: EffectId;
  name: string;
  desc: string;
  color: number;
  /** Base duration in seconds (0 for instant effects). */
  dur: number;
}

export const EFFECT_LIST: EffectDef[] = [
  { id: 'rapid', name: 'Rapid Fire', desc: 'Shoot much faster.', color: 0xffc93c, dur: 6 },
  { id: 'speed', name: 'Swift Feet', desc: 'Move faster.', color: 0x4dd2ff, dur: 7 },
  { id: 'triple', name: 'Triple Shot', desc: 'Fire three bullets at once.', color: 0xff8a3c, dur: 7 },
  { id: 'shield', name: 'Guard', desc: 'Absorb incoming hits.', color: 0x7dff6b, dur: 0 },
  { id: 'heal', name: 'Heal', desc: 'Restore hit points now.', color: 0xff5e8a, dur: 0 },
  { id: 'pierce', name: 'Piercing', desc: 'Bullets pass through foes.', color: 0xb77dff, dur: 7 },
  { id: 'big', name: 'Big Shot', desc: 'Larger bullets.', color: 0xf2f2f2, dur: 7 },
  { id: 'vampire', name: 'Vampire', desc: 'Kills restore HP.', color: 0xc2185b, dur: 10 },
  { id: 'magnet', name: 'Magnet', desc: 'Pull coins and pickups.', color: 0x3cffd0, dur: 9 },
  { id: 'freeze', name: 'Frost Shot', desc: 'Hits slow the target.', color: 0x80d8ff, dur: 7 },
  { id: 'ricochet', name: 'Ricochet', desc: 'Bullets bounce off walls.', color: 0xffee58, dur: 8 },
  { id: 'overdrive', name: 'Overdrive', desc: 'Bullets deal double damage.', color: 0xff1744, dur: 4.5 },
];
export const EFFECTS: Record<EffectId, EffectDef> = Object.fromEntries(
  EFFECT_LIST.map((e) => [e.id, e]),
) as Record<EffectId, EffectDef>;

export interface RarityDef {
  id: string;
  name: string;
  color: number;
  pow: number;
  dur: number;
  weight: number;
}

export const RARITIES: RarityDef[] = [
  { id: 'common', name: 'Common', color: 0xb0b8d8, pow: 1, dur: 1, weight: 60 },
  { id: 'rare', name: 'Rare', color: 0x4dd2ff, pow: 1.25, dur: 1.2, weight: 28 },
  { id: 'epic', name: 'Epic', color: 0xb77dff, pow: 1.6, dur: 1.5, weight: 10 },
  { id: 'legendary', name: 'Legendary', color: 0xffc93c, pow: 2.1, dur: 2, weight: 2 },
];

export interface ModDef {
  name: string;
  pow: number;
  dur: number;
}

export const MODS: ModDef[] = [
  { name: 'Standard', pow: 1, dur: 1 },
  { name: 'Mega', pow: 1.15, dur: 1 },
  { name: 'Long', pow: 1, dur: 1.4 },
  { name: 'Turbo', pow: 1.3, dur: 0.8 },
  { name: 'Ancient', pow: 1.1, dur: 1.3 },
  { name: 'Swift', pow: 1.2, dur: 0.9 },
  { name: 'Heavy', pow: 1.25, dur: 1 },
  { name: 'Lucky', pow: 1.1, dur: 1.1 },
  { name: 'Prime', pow: 1.2, dur: 1.2 },
  { name: 'Wild', pow: 1.35, dur: 0.7 },
  { name: 'Calm', pow: 0.9, dur: 1.5 },
  { name: 'Solar', pow: 1.15, dur: 1.15 },
  { name: 'Lunar', pow: 1.05, dur: 1.3 },
  { name: 'Storm', pow: 1.3, dur: 0.9 },
  { name: 'Royal', pow: 1.2, dur: 1.3 },
  { name: 'Faint', pow: 0.85, dur: 1 },
  { name: 'Pure', pow: 1.05, dur: 1.05 },
  { name: 'Echo', pow: 1, dur: 1.2 },
  { name: 'Frost', pow: 1.1, dur: 1 },
  { name: 'Ember', pow: 1.15, dur: 0.95 },
  { name: 'Void', pow: 1.25, dur: 1.1 },
];

export interface PowerupDef {
  effect: EffectId;
  rarity: number;
  mod: number;
}

export const POWERUP_TOTAL = EFFECT_LIST.length * RARITIES.length * MODS.length;

export function powerupId(p: PowerupDef): number {
  const e = EFFECT_LIST.findIndex((x) => x.id === p.effect);
  return (e * RARITIES.length + p.rarity) * MODS.length + p.mod;
}

export function powerupFromId(n: number): PowerupDef | null {
  if (!Number.isInteger(n) || n < 0 || n >= POWERUP_TOTAL) return null;
  const mod = n % MODS.length;
  const r = Math.floor(n / MODS.length) % RARITIES.length;
  const e = Math.floor(n / (MODS.length * RARITIES.length));
  return { effect: EFFECT_LIST[e].id, rarity: r, mod };
}

export function powerupName(p: PowerupDef): string {
  const mod = MODS[p.mod].name;
  return `${RARITIES[p.rarity].name} ${mod === 'Standard' ? '' : mod + ' '}${EFFECTS[p.effect].name}`;
}

export function powerupStats(p: PowerupDef): { power: number; duration: number } {
  const r = RARITIES[p.rarity];
  const m = MODS[p.mod];
  return { power: r.pow * m.pow, duration: EFFECTS[p.effect].dur * r.dur * m.dur };
}

export function rollPowerup(rng: () => number): PowerupDef {
  const effect = EFFECT_LIST[Math.floor(rng() * EFFECT_LIST.length)].id;
  let roll = rng() * RARITIES.reduce((s, r) => s + r.weight, 0);
  let rarity = 0;
  for (let i = 0; i < RARITIES.length; i++) {
    roll -= RARITIES[i].weight;
    if (roll <= 0) {
      rarity = i;
      break;
    }
  }
  return { effect, rarity, mod: Math.floor(rng() * MODS.length) };
}

// ---- cosmetics --------------------------------------------------------------

export interface CosmeticDef {
  id: number;
  name: string;
  price: number;
  level: number;
  hex?: number;
}

export const COLORS: CosmeticDef[] = [
  { id: 0, name: 'Aqua', hex: 0x4dd2ff, price: 0, level: 1 },
  { id: 1, name: 'Rose', hex: 0xff5e8a, price: 0, level: 1 },
  { id: 2, name: 'Lime', hex: 0x7dff6b, price: 0, level: 1 },
  { id: 3, name: 'Gold', hex: 0xffc93c, price: 0, level: 1 },
  { id: 4, name: 'Violet', hex: 0xb77dff, price: 0, level: 1 },
  { id: 5, name: 'Amber', hex: 0xff8a3c, price: 0, level: 1 },
  { id: 6, name: 'Mint', hex: 0x3cffd0, price: 0, level: 1 },
  { id: 7, name: 'Snow', hex: 0xf2f2f2, price: 0, level: 1 },
  { id: 8, name: 'Crimson', hex: 0xff1744, price: 80, level: 1 },
  { id: 9, name: 'Ocean', hex: 0x2979ff, price: 80, level: 1 },
  { id: 10, name: 'Forest', hex: 0x00c853, price: 150, level: 3 },
  { id: 11, name: 'Sunset', hex: 0xff6d00, price: 150, level: 3 },
  { id: 12, name: 'Orchid', hex: 0xe040fb, price: 200, level: 4 },
  { id: 13, name: 'Ice', hex: 0x80d8ff, price: 200, level: 4 },
  { id: 14, name: 'Lemon', hex: 0xeeff41, price: 250, level: 5 },
  { id: 15, name: 'Shadow', hex: 0x90a4ae, price: 300, level: 6 },
];

export const TRAILS: CosmeticDef[] = [
  { id: 0, name: 'None', price: 0, level: 1 },
  { id: 1, name: 'Sparks', price: 100, level: 1 },
  { id: 2, name: 'Comet', price: 400, level: 4 },
  { id: 3, name: 'Bubbles', price: 400, level: 5 },
  { id: 4, name: 'Neon Line', price: 600, level: 7 },
  { id: 5, name: 'Rainbow', price: 1200, level: 10 },
];

export const BULLET_FX: CosmeticDef[] = [
  { id: 0, name: 'Classic', price: 0, level: 1 },
  { id: 1, name: 'Diamond', price: 250, level: 3 },
  { id: 2, name: 'Ring', price: 350, level: 5 },
  { id: 3, name: 'Comet', price: 500, level: 8 },
  { id: 4, name: 'Star', price: 800, level: 11 },
];

/** Main weapons change the basic attack. All are fair sidegrades; none is strictly better. */
export interface WeaponDef extends CosmeticDef {
  key: string;
  desc: string;
  /** Multiplier on the fire interval (higher = slower). */
  fire: number;
  /** Multiplier on bullet speed. */
  speed: number;
  /** Multiplier on bullet life (range). */
  range: number;
  dmg: number;
  /** Bullets per shot and the spread between them (radians). */
  pellets: number;
  spread: number;
  /** Multiplier on bullet size. */
  size: number;
}
export const WEAPONS: WeaponDef[] = [
  { id: 0, key: 'blaster', name: 'Blaster', desc: 'Balanced shots.', price: 0, level: 1, fire: 1, speed: 1, range: 1, dmg: 1, pellets: 1, spread: 0, size: 1 },
  { id: 1, key: 'scatter', name: 'Scatter Gun', desc: 'Three pellets, short range, slower.', price: 300, level: 2, fire: 1.6, speed: 0.9, range: 0.55, dmg: 1, pellets: 3, spread: 0.18, size: 0.9 },
  { id: 2, key: 'rail', name: 'Rail Lance', desc: 'Fast long shots that hit for 2, slow to reload.', price: 500, level: 4, fire: 2.6, speed: 1.6, range: 1.3, dmg: 2, pellets: 1, spread: 0, size: 0.8 },
  { id: 3, key: 'buzz', name: 'Buzz SMG', desc: 'Very fast fire, small bullets, less range.', price: 450, level: 3, fire: 0.5, speed: 1.05, range: 0.65, dmg: 1, pellets: 1, spread: 0.08, size: 0.7 },
  { id: 4, key: 'mortar', name: 'Orb Mortar', desc: 'Big slow orbs that hit for 2.', price: 700, level: 6, fire: 2.2, speed: 0.6, range: 1.4, dmg: 2, pellets: 1, spread: 0, size: 2 },
  { id: 5, key: 'twin', name: 'Twin Pistols', desc: 'Two parallel shots, a bit slower.', price: 600, level: 5, fire: 1.35, speed: 1, range: 0.85, dmg: 1, pellets: 2, spread: 0.06, size: 0.85 },
];
/** Accessories are looks only: hats and charms drawn on your orb. */
const BASE_ACCESSORIES: CosmeticDef[] = [
  { id: 0, name: 'None', price: 0, level: 1 },
  { id: 1, name: 'Crown', price: 400, level: 3 },
  { id: 2, name: 'Horns', price: 250, level: 2 },
  { id: 3, name: 'Halo', price: 350, level: 3 },
  { id: 4, name: 'Wizard Hat', price: 500, level: 5 },
  { id: 5, name: 'Headband', price: 150, level: 1 },
  { id: 6, name: 'Cat Ears', price: 300, level: 2 },
  { id: 7, name: 'Visor', price: 450, level: 4 },
  { id: 8, name: 'Antenna', price: 200, level: 2 },
];

const ACCESSORY_SLOTS = ['Hat', 'Gloves', 'Armor', 'Pants', 'Shoes', 'Bag', 'Weapon', 'Vehicle'];
const ACCESSORY_COLORS = ['Aqua', 'Rose', 'Lime', 'Gold', 'Violet', 'Amber', 'Snow', 'Crimson'];

/** Large deterministic cosmetic catalog; only owned or market-selected entries are rendered at once. */
export const ACCESSORIES: CosmeticDef[] = [
  ...BASE_ACCESSORIES,
  ...Array.from({ length: 10_000 - BASE_ACCESSORIES.length }, (_, i) => {
    const id = i + BASE_ACCESSORIES.length;
    const slot = ACCESSORY_SLOTS[i % ACCESSORY_SLOTS.length];
    const color = ACCESSORY_COLORS[Math.floor(i / ACCESSORY_SLOTS.length) % ACCESSORY_COLORS.length];
    return {
      id,
      name: `${color} ${slot} ${String(i + 1).padStart(4, '0')}`,
      price: 150 + (i % 20) * 50,
      level: 1 + (i % 40),
    };
  }),
];

export interface Loadout {  char: string;
  /** Up to five skill ids (see skills/). Empty means "use the default kit". */
  skillIds: number[];
  color: number;
  trail: number;
  bfx: number;
  /** Main weapon id (WEAPONS). */
  weapon: number;
  /** Accessory id (ACCESSORIES). */
  acc: number;
}

export const DEFAULT_LOADOUT: Loadout = { char: 'nova', skillIds: [], color: 0, trail: 0, bfx: 0, weapon: 0, acc: 0 };

/** Validates untrusted loadout data from a client. Falls back to defaults field by field. */
export function sanitizeLoadout(raw: unknown): Loadout {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const int = (v: unknown, max: number, d: number) =>
    Number.isInteger(v) && (v as number) >= 0 && (v as number) < max ? (v as number) : d;
  const char = isCharacterId(r.char) ? r.char : DEFAULT_LOADOUT.char;
  const skillIds: number[] = [];
  if (Array.isArray(r.skillIds)) {
    for (const v of r.skillIds) {
      if (skillIds.length >= 5) break;
      if (typeof v !== 'number' || !Number.isInteger(v) || skillIds.includes(v) || !usableInBattle(v))
        continue;
      skillIds.push(v);
    }
  }
  return {
    char,
    skillIds,
    color: int(r.color, COLORS.length, 0),
    trail: int(r.trail, TRAILS.length, 0),
    bfx: int(r.bfx, BULLET_FX.length, 0),
    weapon: int(r.weapon, WEAPONS.length, 0),
    acc: int(r.acc, ACCESSORIES.length, 0),
  };
}
