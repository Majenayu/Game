// Builds a Champion Road opponent squad. Shared by the game and the headless walkthrough test.
import type { Champion } from './champions';
import { stickSpec } from '../sim/stats';
import type { FighterSpec } from '../sim/types';

export function championTeam(c: Champion, lookId?: string): FighterSpec[] {
  const partner = `${c.name.split(' ').slice(-1)[0]}'s partner`;
  return [stickSpec(c.name, c.elements[0], c.level, [], false, lookId), stickSpec(partner, c.elements[1], Math.max(1, c.level - 1), [], false, lookId ? `${lookId}:2` : undefined)];
}
