// Builds a Champion Road opponent squad. Shared by the game and the headless walkthrough test.
// Each champion and partner get a fighting style from their name, and a pair of the same element never gets the
// same style, so AI squads have two different power sets too.
import { ARCHETYPE_IDS, type Archetype } from './archetypes';
import type { Champion } from './champions';
import { stickSpec } from '../sim/stats';
import type { FighterSpec } from '../sim/types';

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Two different-looking styles from a name (the second differs from the first when the elements match). */
export function stylesFor(name: string, sameElement: boolean): [Archetype, Archetype] {
  const h = hashStr(name);
  const a = ARCHETYPE_IDS[h % 3]!;
  let b = ARCHETYPE_IDS[(h >>> 5) % 3]!;
  if (sameElement && b === a) b = ARCHETYPE_IDS[(ARCHETYPE_IDS.indexOf(a) + 1) % 3]!;
  return [a, b];
}

export function championTeam(c: Champion, lookId?: string): FighterSpec[] {
  const partner = `${c.name.split(' ').slice(-1)[0]}'s partner`;
  const [s1, s2] = stylesFor(c.name, c.elements[0] === c.elements[1]);
  return [
    stickSpec(c.name, c.elements[0], c.level, [], false, lookId, s1),
    stickSpec(partner, c.elements[1], Math.max(1, c.level - 1), [], false, lookId ? `${lookId}:2` : undefined, s2),
  ];
}
