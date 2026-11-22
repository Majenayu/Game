// The 10 elements. The wheel below is the output of src/content/wheelSearch.ts (tools/element-wheel.test.ts):
// all 9 owner-preferred pairs and 10 of 11 thematic tie-breakers. tests/content.test.ts proves it is regular.

import { ELEMENT_IDS, type ElementId } from './elementPrefs';

export { ELEMENT_IDS, type ElementId };

export const BEATS: Record<ElementId, readonly [ElementId, ElementId]> = {
  fire: ['ice', 'leaf'],
  water: ['fire', 'light'],
  ice: ['wind', 'leaf'],
  lightning: ['water', 'gravity'],
  wind: ['lightning', 'time'],
  earth: ['lightning', 'fire'],
  leaf: ['earth', 'water'],
  light: ['time', 'ice'],
  gravity: ['light', 'wind'],
  time: ['earth', 'gravity'],
};

/** Damage multiplier in percent: strong +25, weak -20 (C2). */
export const STRONG_PCT = 125;
export const WEAK_PCT = 80;

export function matchup(attacker: ElementId, defender: ElementId): 'strong' | 'weak' | 'neutral' {
  if (BEATS[attacker].includes(defender)) return 'strong';
  if (BEATS[defender].includes(attacker)) return 'weak';
  return 'neutral';
}

export function matchupPct(attacker: ElementId, defender: ElementId): number {
  const m = matchup(attacker, defender);
  return m === 'strong' ? STRONG_PCT : m === 'weak' ? WEAK_PCT : 100;
}

export type IconShape = 'flame' | 'drop' | 'flake' | 'bolt' | 'swirl' | 'rock' | 'leaf' | 'sun' | 'well' | 'glass';

export interface ElementInfo {
  id: ElementId;
  name: string;
  /** [main, light] colours */
  color: [number, number];
  css: [string, string];
  icon: IconShape;
  passive: string;
}

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const E = (id: ElementId, name: string, main: number, light: number, icon: IconShape, passive: string): ElementInfo => ({
  id,
  name,
  color: [main, light],
  css: [hex(main), hex(light)],
  icon,
  passive,
});

export const ELEMENTS: Record<ElementId, ElementInfo> = {
  fire: E('fire', 'Fire', 0xff5a2c, 0xffc23d, 'flame', 'Burns last 1 second longer.'),
  water: E('water', 'Water', 0x2f8cff, 0x8fd7ff, 'drop', 'Damage you deal also refills a little MP.'),
  ice: E('ice', 'Ice', 0x5fd6f0, 0xe2fbff, 'flake', 'Basic hits slow the foe a little.'),
  lightning: E('lightning', 'Lightning', 0xffd21f, 0xfff6a8, 'bolt', 'Dashes are faster.'),
  wind: E('wind', 'Wind', 0x5ee39a, 0xd5ffe5, 'swirl', 'Double jump.'),
  earth: E('earth', 'Earth', 0xb07a3c, 0xe3c08a, 'rock', 'Guard takes 10% less damage.'),
  leaf: E('leaf', 'Leaf', 0x3fbf3a, 0xb9f27a, 'leaf', 'Slowly heals when not hit for 3 seconds.'),
  light: E('light', 'Light', 0xffe46b, 0xfffbe0, 'sun', 'Projectiles fly faster.'),
  gravity: E('gravity', 'Gravity', 0x8b5cf6, 0xd6c4ff, 'well', 'Knockback pulls foes a little closer.'),
  time: E('time', 'Time', 0xe86fd0, 0xffd6f4, 'glass', 'Faster MP regen after a perfect guard.'),
};
