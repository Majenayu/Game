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
  fire: E('fire', 'Fire', 0xff6a1f, 0xffd23a, 'flame', 'Burns last 1 second longer.'),
  water: E('water', 'Water', 0x22c8ff, 0xc0f2ff, 'drop', 'Damage you deal also refills a little MP.'),
  ice: E('ice', 'Ice', 0xb8e6ff, 0xffffff, 'flake', 'Basic hits slow the foe a little.'),
  lightning: E('lightning', 'Lightning', 0xffd21f, 0xfff6a8, 'bolt', 'Dashes are faster.'),
  wind: E('wind', 'Wind', 0x6ef0b0, 0xd8fff0, 'swirl', 'Double jump.'),
  earth: E('earth', 'Earth', 0xd88a38, 0xffd08a, 'rock', 'Guard takes 10% less damage.'),
  leaf: E('leaf', 'Leaf', 0x6ee05a, 0xd4ff9a, 'leaf', 'Slowly heals when not hit for 3 seconds.'),
  light: E('light', 'Light', 0xffe8a0, 0xffffff, 'sun', 'Projectiles fly faster.'),
  gravity: E('gravity', 'Gravity', 0xc04cff, 0xf0c8ff, 'well', 'Knockback pulls foes a little closer.'),
  time: E('time', 'Time', 0x2fe0c8, 0xc8fff4, 'glass', 'Faster MP regen after a perfect guard.'),
};
