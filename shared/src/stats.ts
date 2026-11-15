import { gearBonus, isGearId } from './gear';
import { addBonus, combatFromSheet, emptyBonus, finalSheet, type Bonus, type CombatStats, type StatSheet } from './progression';

/** Trails and bullet styles give small buffs too (index = cosmetic id). */
export const TRAIL_BUFFS: Array<Partial<Bonus>> = [{}, { speed: 2 }, { speed: 4 }, { mp: 5 }, { speed: 5, aim: 3 }, { speed: 6, mp: 6 }];
export const BFX_BUFFS: Array<Partial<Bonus>> = [{}, { attack: 3 }, { reload: 4 }, { attack: 5, aim: 3 }, { attack: 7, spAttack: 4 }];

export interface StatsInput {
  level: number;
  gear: number[];
  trail?: number;
  bfx?: number;
  guild?: Partial<Bonus>;
}
/** Everything that builds a player's stats, in one place (used by the client UI and the server). */
export function playerStats(i: StatsInput): { sheet: StatSheet; combat: CombatStats; bonus: Bonus } {
  const bonus = emptyBonus();
  addBonus(bonus, gearBonus(i.gear.filter(isGearId)));
  addBonus(bonus, TRAIL_BUFFS[i.trail ?? 0] ?? {});
  addBonus(bonus, BFX_BUFFS[i.bfx ?? 0] ?? {});
  if (i.guild) addBonus(bonus, i.guild);
  const sheet = finalSheet(i.level, bonus);
  return { sheet, combat: combatFromSheet(sheet), bonus };
}
