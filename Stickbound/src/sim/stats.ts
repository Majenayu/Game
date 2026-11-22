// Stats from level (used by the sim builder and the Avatars screen). Integer maths only.

import type { ElementId } from '../content/elementPrefs';
import { POWER_UNLOCK_LEVELS } from '../content/powers';
import type { Archetype } from '../content/archetypes';
import type { FighterSpec, Stats } from './types';

export const MAX_LEVEL = 50;

/** Small element flavour on base stats (sums are equal, so no element is stronger overall). */
const BIAS: Record<ElementId, Stats> = {
  fire: { vit: 98, might: 104, spirit: 106, guard: 96, resolve: 96, speed: 100 },
  water: { vit: 102, might: 98, spirit: 102, guard: 100, resolve: 102, speed: 96 },
  ice: { vit: 100, might: 100, spirit: 102, guard: 102, resolve: 100, speed: 96 },
  lightning: { vit: 96, might: 102, spirit: 102, guard: 96, resolve: 98, speed: 106 },
  wind: { vit: 96, might: 100, spirit: 100, guard: 96, resolve: 100, speed: 108 },
  earth: { vit: 106, might: 104, spirit: 96, guard: 106, resolve: 98, speed: 90 },
  leaf: { vit: 104, might: 98, spirit: 100, guard: 100, resolve: 102, speed: 96 },
  light: { vit: 98, might: 98, spirit: 106, guard: 98, resolve: 102, speed: 98 },
  gravity: { vit: 102, might: 102, spirit: 102, guard: 100, resolve: 98, speed: 96 },
  time: { vit: 98, might: 98, spirit: 104, guard: 98, resolve: 104, speed: 98 },
};

/**
 * Stat value at a level: +60% from level 1 to 50. In Ranked the growth is capped at +15% (owner decision),
 * so a level 50 is at most about 15% stronger than a level 1.
 */
export function statAt(base: number, level: number, ranked = false): number {
  const growth = ranked ? 15 : 60;
  return base + Math.floor((base * growth * (Math.min(level, MAX_LEVEL) - 1)) / (100 * (MAX_LEVEL - 1)));
}

export function statsFor(element: ElementId, level: number, ranked = false): Stats {
  const b = BIAS[element];
  return {
    vit: statAt(b.vit, level, ranked),
    might: statAt(b.might, level, ranked),
    spirit: statAt(b.spirit, level, ranked),
    guard: statAt(b.guard, level, ranked),
    resolve: statAt(b.resolve, level, ranked),
    speed: statAt(b.speed, level, ranked),
  };
}

/** Power ranks grow with level (automatic upgrades). 0 = still locked. */
export function ranksFor(level: number): [number, number, number] {
  const r = (unlock: number, step: number) => (level < unlock ? 0 : Math.min(5, 1 + Math.floor((level - unlock) / step)));
  return [r(POWER_UNLOCK_LEVELS[0], 12), r(POWER_UNLOCK_LEVELS[1], 10), r(POWER_UNLOCK_LEVELS[2], 7)];
}

export const comboLenFor = (level: number): 3 | 4 | 5 => (level >= 35 ? 5 : level >= 15 ? 4 : 3);
export const pgWindowFor = (level: number): number => (level >= 40 ? 10 : level >= 20 ? 9 : 8);

export interface PerkDef {
  id: string;
  tier: 0 | 1 | 2;
  name: string;
  text: string;
}

export const PERK_LEVELS = [15, 30, 45] as const;

export const PERKS: PerkDef[] = [
  { id: 'power', tier: 0, name: 'Hard Hitter', text: 'Powers deal 10% more damage.' },
  { id: 'steady', tier: 0, name: 'Steady Guard', text: 'Guard stamina drains 25% slower.' },
  { id: 'flow', tier: 1, name: 'Flow', text: 'MP refills 30% faster.' },
  { id: 'shield', tier: 1, name: 'Element Shield', text: 'Take 10% less damage from powers.' },
  { id: 'finisher', tier: 2, name: 'Finisher', text: 'Combo finishers deal 25% more damage.' },
  { id: 'vital', tier: 2, name: 'Iron Body', text: '10% more HP.' },
];

/** HP from vitality. */
export function hpFor(spec: FighterSpec): number {
  const base = 280 + spec.stats.vit * 3;
  return spec.perks.includes('vital') ? Math.floor((base * 110) / 100) : base;
}

export function stickSpec(name: string, element: ElementId, level: number, perks: string[] = [], ranked = false, look?: string, archetype: Archetype = 'classic'): FighterSpec {
  return {
    archetype,
    name,
    element,
    level,
    stats: statsFor(element, level, ranked),
    ranks: ranksFor(level),
    comboLen: comboLenFor(level),
    pgWindow: pgWindowFor(level),
    perks,
    kind: 'stick',
    look,
  };
}
