import { ELEMENTS, RANKS, type Kind, type Rank } from './skills/catalog';
import { firstIdOfRank, getSkill, rankOf, skillCount } from './skills/generate';
import { effectiveStats, type EffectiveStats, type SkillInstance } from './skills/instances';
import { uniqueIdOf } from './skills/uniques';
import type { EffectId } from './content';
import type { Rng } from './util';

/** Mana every player has in a match. */
export const MAX_MP = 100;
export const MP_REGEN = 7;
export const MAX_PETS = 5;

/** A skill equipped in one of the five slots during a match. */
export interface SlotState {
  skillId: number;
  kind: Kind;
  element: number;
  rank: Rank;
  archetype: number;
  stats: EffectiveStats;
  /** Absolute sim time when the skill can be used again. */
  cdUntil: number;
}

export interface SimZone {
  id: number;
  owner: string;
  team: number;
  kind: 'barrier' | 'heal' | 'slow' | 'pull';
  x: number;
  y: number;
  r: number;
  until: number;
  nextTick: number;
}

export interface SimPet {
  id: number;
  owner: string;
  team: number;
  x: number;
  y: number;
  until: number;
  nextShot: number;
  dmg: number;
  color: number;
}

/** Instance with neutral stats, used when only skill ids are known (online beta, bots). */
export function neutralInstance(skillId: number, uid = `n${skillId}`): SkillInstance {
  return {
    uid,
    skillId,
    level: 1,
    copies: 1,
    rolls: { power: 1, cooldown: 1, mp: 1, range: 1 },
    masteryXp: 0,
    bound: false,
  };
}

export function slotFromInstance(inst: SkillInstance): SlotState {
  const d = getSkill(inst.skillId);
  return {
    skillId: inst.skillId,
    kind: d.kind,
    element: d.element,
    rank: d.rank,
    archetype: d.archetype,
    stats: effectiveStats(inst),
    cdUntil: 0,
  };
}

/** Battle-usable instances only: world skills work outside matches. */
export function usableInBattle(skillId: number): boolean {
  const r = rankOf(skillId);
  return r !== null && getSkill(skillId).kind !== 'world';
}

/** Turns hit points of skill power into whole hit points of damage. */
export function dmgFromPower(power: number): number {
  return Math.max(1, Math.round(power / 60));
}

export function elementStatus(element: number): string {
  return ELEMENTS[element]?.status ?? '';
}

/** Which timed effect a boost archetype grants. */
export const BUFF_BY_ARCHETYPE: Record<string, EffectId | 'guard'> = {
  Surge: 'overdrive',
  Haste: 'speed',
  Fury: 'rapid',
  Focus: 'pierce',
  Overdrive: 'triple',
  Link: 'guard',
  Gravity: 'magnet',
};

// ---- default kit and bot kits -------------------------------------------------------

const OFFENSE: Kind[] = ['projectile', 'beam', 'volley', 'nova', 'cleave'];
const UTILITY: Kind[] = [
  'shield',
  'heal',
  'dash',
  'blink',
  'stealth',
  'barrier',
  'slow',
  'pull',
  'buff',
  'summon',
  'mine',
  'ambush',
  'aura',
];

function pickWhere(rank: Rank, rng: Rng, ok: (k: Kind) => boolean): number {
  const start = firstIdOfRank(rank);
  const n = skillCount(rank);
  for (let i = 0; i < 400; i++) {
    const id = start + Math.floor(rng() * n);
    if (ok(getSkill(id).kind)) return id;
  }
  return start;
}

/** A fixed, balanced kit used when a player has no loadout yet (found once, deterministic). */
let kit: number[] | null = null;
export function defaultKit(): number[] {
  if (kit) return kit;
  let s = 7;
  const rng = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  kit = [
    pickWhere('D', rng, (k) => k === 'projectile'),
    pickWhere('D', rng, (k) => k === 'volley'),
    pickWhere('D', rng, (k) => k === 'shield'),
    pickWhere('D', rng, (k) => k === 'dash'),
    pickWhere('D', rng, (k) => k === 'heal'),
  ];
  return kit;
}

/** Five skills for a bot. Sharper bots roll higher ranks. At least two attacks and one defensive or mobile skill. */
export function botKit(rng: Rng, skill: number, boss: boolean): number[] {
  if (boss) return [11, 15, 26, 29, 90].map(uniqueIdOf);
  const target = Math.max(0, Math.min(5, Math.round(skill * 5)));
  const pickRank = (): Rank => RANKS[Math.max(0, Math.min(5, target + [-1, 0, 0, 1][Math.floor(rng() * 4)]))];
  const out: number[] = [];
  for (let i = 0; i < 2; i++) out.push(pickWhere(pickRank(), rng, (k) => OFFENSE.includes(k)));
  out.push(pickWhere(pickRank(), rng, (k) => k === 'shield' || k === 'heal' || k === 'stealth'));
  out.push(pickWhere(pickRank(), rng, (k) => k === 'dash' || k === 'blink'));
  out.push(pickWhere(pickRank(), rng, (k) => UTILITY.includes(k)));
  return out;
}
