import { ARCHETYPES, RANKS, type Rank } from './skills/catalog';
import { getSkill, rankOf } from './skills/generate';
import type { SkillInstance } from './skills/instances';

/**
 * Out-of-battle ("world") skills are passive: owning them gives bonuses automatically, no slot needed.
 * Forge = more XP, Appraisal = more coins, Scout = luckier drops (chance to upgrade a drop one rank),
 * Gather = chance to get a drop twice.
 */
export type PassiveKind = 'xp' | 'coins' | 'luck' | 'double';
export interface WorldBonus {
  kind: PassiveKind;
  /** Percent. */
  pct: number;
  text: string;
}
export interface Passives {
  xp: number;
  coins: number;
  luck: number;
  double: number;
}
const BASE: Record<Rank, number> = { F: 2, E: 3, D: 5, C: 8, B: 12, A: 20, S: 35, U: 60 };
const BY_ARCH: Record<string, PassiveKind> = { Forge: 'xp', Appraisal: 'coins', Scout: 'luck', Gather: 'double' };
const KINDS: PassiveKind[] = ['xp', 'coins', 'luck', 'double'];
const LABEL: Record<PassiveKind, string> = {
  xp: 'more XP from matches and levels',
  coins: 'more coins from matches, levels and chests',
  luck: 'chance to upgrade each skill drop by one rank',
  double: 'chance to get each skill drop twice',
};
export const PASSIVE_CAPS: Passives = { xp: 300, coins: 300, luck: 60, double: 60 };

export function isWorldSkill(skillId: number): boolean {
  return rankOf(skillId) !== null && getSkill(skillId).kind === 'world';
}

export function worldBonusOf(skillId: number, level = 1): WorldBonus {
  const s = getSkill(skillId);
  const arch = ARCHETYPES[s.archetype]?.name ?? '';
  const kind = BY_ARCH[arch] ?? KINDS[Math.abs(skillId) % KINDS.length];
  const pct = Math.round(BASE[s.rank] * (1 + (Math.max(1, level) - 1) * 0.1) * 10) / 10;
  return { kind, pct, text: `+${pct}% ${LABEL[kind]}` };
}

/** Sum of every owned world skill, capped. */
export function totalPassives(skills: SkillInstance[]): Passives {
  const t: Passives = { xp: 0, coins: 0, luck: 0, double: 0 };
  for (const s of skills) {
    if (!isWorldSkill(s.skillId)) continue;
    const b = worldBonusOf(s.skillId, s.level);
    t[b.kind] += b.pct;
  }
  for (const k of KINDS) t[k] = Math.min(PASSIVE_CAPS[k], Math.round(t[k] * 10) / 10);
  return t;
}

/** Applies Scout luck: maybe one rank higher (never above S). */
export function luckyRank(rank: Rank, luckPct: number, rng: () => number): Rank {
  const i = RANKS.indexOf(rank);
  if (i < 0 || i >= RANKS.indexOf('S') || rng() * 100 >= luckPct) return rank;
  return RANKS[i + 1];
}
