import { ELEM_COUNT, MOD_COUNT, RANKS, RANK_INFO, type BaseStats, type Rank } from './catalog';
import type { Rng } from '../util';
import { getSkill, idFromParts, randomSkillOfRank, rankOf } from './generate';
import { UNIQUES, UniqueRegistry, uniqueIdOf } from './uniques';

// ---- owned skill instances ---------------------------------------------------

export interface Rolls {
  power: number;
  cooldown: number;
  mp: number;
  range: number;
}

export interface SkillInstance {
  uid: string;
  skillId: number;
  /** Skill level, 1 to MAX_SKILL_LEVEL. Raised automatically by merging duplicates. */
  level: number;
  /** Number of copies merged into this skill (1 = just the original). */
  copies: number;
  rolls: Rolls;
  /** Mastery experience from using the skill in matches. */
  masteryXp: number;
  /** Bound skills (starter pack, quest rewards) cannot be traded. */
  bound: boolean;
}

export const MAX_SKILL_LEVEL = 20;
export const MAX_MASTERY = 10;

/** Roll band per rank: higher ranks roll tighter and higher, so rare skills are more reliable. */
function rollBand(rank: Rank): [number, number] {
  const i = RANKS.indexOf(rank);
  return [0.9 + 0.01 * i, 1.1 + 0.005 * i];
}

export function rollStats(rank: Rank, rng: Rng): Rolls {
  const [lo, hi] = rollBand(rank);
  const r = () => lo + rng() * (hi - lo);
  return { power: r(), cooldown: 2 - r(), mp: 2 - r(), range: r() };
}

export function makeInstance(skillId: number, rng: Rng, uid: string, bound = false): SkillInstance {
  const rank = rankOf(skillId);
  if (!rank) throw new Error(`Unknown skill ${skillId}`);
  return { uid, skillId, level: 1, copies: 1, rolls: rollStats(rank, rng), masteryXp: 0, bound };
}

// ---- duplicate merging ---------------------------------------------------------

/** Copies needed to reach each level (index = level - 1). Diminishing returns. */
export const LEVEL_COPIES = [
  1, 2, 4, 7, 11, 16, 22, 29, 37, 46, 56, 67, 79, 92, 106, 121, 137, 154, 172, 191,
];

export function levelForCopies(copies: number): number {
  let lvl = 1;
  for (let i = 0; i < LEVEL_COPIES.length; i++) if (copies >= LEVEL_COPIES[i]) lvl = i + 1;
  return Math.min(MAX_SKILL_LEVEL, lvl);
}

/**
 * Merges a duplicate into the skill you already own. Happens automatically every time.
 * Rolls move toward the better of the two. Level follows the number of copies.
 */
export function mergeDuplicate(owned: SkillInstance, incoming: SkillInstance): SkillInstance {
  if (owned.skillId !== incoming.skillId) throw new Error('Only identical skills can merge');
  const best = (a: number, b: number, bigger: boolean) => (bigger ? Math.max(a, b) : Math.min(a, b));
  const copies = owned.copies + incoming.copies;
  return {
    ...owned,
    copies,
    level: levelForCopies(copies),
    rolls: {
      power: Math.min(1.2, best(owned.rolls.power, incoming.rolls.power, true) + 0.01),
      cooldown: Math.max(0.8, best(owned.rolls.cooldown, incoming.rolls.cooldown, false) - 0.01),
      mp: Math.max(0.8, best(owned.rolls.mp, incoming.rolls.mp, false) - 0.01),
      range: Math.min(1.2, best(owned.rolls.range, incoming.rolls.range, true) + 0.01),
    },
    masteryXp: owned.masteryXp + incoming.masteryXp,
    bound: owned.bound && incoming.bound,
  };
}

/** Adds a skill to an inventory, merging with an existing copy when there is one. */
export function addToInventory(
  inv: SkillInstance[],
  inst: SkillInstance,
): { inv: SkillInstance[]; merged: boolean; result: SkillInstance } {
  const i = inv.findIndex((x) => x.skillId === inst.skillId);
  if (i < 0) return { inv: [...inv, inst], merged: false, result: inst };
  const result = mergeDuplicate(inv[i], inst);
  const next = [...inv];
  next[i] = result;
  return { inv: next, merged: true, result };
}

// ---- mastery -----------------------------------------------------------------

/** XP needed for each mastery level (1 to 10). */
export const MASTERY_XP = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];

export function masteryLevel(xp: number): number {
  let lvl = 1;
  for (let i = 0; i < MASTERY_XP.length; i++) if (xp >= MASTERY_XP[i]) lvl = i + 1;
  return Math.min(MAX_MASTERY, lvl);
}

// ---- effective stats ---------------------------------------------------------

export interface EffectiveStats extends BaseStats {
  /** Extra projectiles or hits. */
  count: number;
}

/** What the match simulation uses: definition x level x rolls x mastery. */
export function effectiveStats(inst: SkillInstance): EffectiveStats {
  const def = getSkill(inst.skillId);
  const lvl = 1 + 0.06 * (inst.level - 1);
  const mastery = masteryLevel(inst.masteryXp);
  const cdMastery = 1 - 0.015 * (mastery - 1);
  return {
    power: def.base.power * lvl * inst.rolls.power,
    cooldown: def.base.cooldown * inst.rolls.cooldown * cdMastery,
    mp: def.base.mp * inst.rolls.mp,
    cast: def.base.cast,
    range: def.base.range * inst.rolls.range,
    area: def.base.area,
    duration: def.base.duration,
    count: def.count,
  };
}

// ---- weekly fusion ----------------------------------------------------------

export const FUSION_MIN_LEVEL = 1;

/** ISO week id such as "2026-W46". */
export function weekId(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(w).padStart(2, '0')}`;
}

/** One manual fusion per week. Infinite Fusion owners are exempt; Time Weaver owners get a second one. */
export function fusionsLeft(
  usedThisWeek: number,
  perks: { infiniteFusion?: boolean; timeWeaver?: boolean } = {},
): number {
  if (perks.infiniteFusion) return Infinity;
  return Math.max(0, 1 + (perks.timeWeaver ? 1 : 0) - usedThisWeek);
}

export interface FusionResult {
  ok: boolean;
  reason?: string;
  skillId?: number;
  rank?: Rank;
  upgraded?: boolean;
}

/**
 * Fuse two different skills of the same or adjacent rank. The result inherits the archetype of one parent and the
 * element of the other. A chance based on both levels upgrades it one rank (never into Unique).
 */
/** A random stream fixed by the pair of skill ids (order does not matter). */
export function pairRng(a: number, b: number): Rng {
  let s = (Math.imul(Math.min(a, b) + 0x9e3779b9, 2654435761) ^ Math.imul(Math.max(a, b) + 7, 40503)) >>> 0;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5) >>> 0;
    return s / 4294967296;
  };
}
/** Percent of S + S pairs that create a unique skill. */
export const UNIQUE_FUSION_PCT = 3;
export function fuse(a: SkillInstance, b: SkillInstance, _rng?: Rng): FusionResult {
  const rng = pairRng(a.skillId, b.skillId);
  if (a.uid === b.uid) return { ok: false, reason: 'Pick two different skills' };
  if (a.skillId === b.skillId) return { ok: false, reason: 'Duplicates merge automatically' };
  if (a.level < FUSION_MIN_LEVEL || b.level < FUSION_MIN_LEVEL)
    return { ok: false, reason: `Both skills must be level ${FUSION_MIN_LEVEL}` };
  const da = getSkill(a.skillId);
  const db = getSkill(b.skillId);
  if (da.unique || db.unique) return { ok: false, reason: 'Unique skills cannot be fused' };
  const ia = RANKS.indexOf(da.rank);
  const ib = RANKS.indexOf(db.rank);
  if (Math.abs(ia - ib) > 1) return { ok: false, reason: 'Ranks are too far apart' };
  let rankIdx = Math.max(ia, ib);
  // Two S skills: a small share of recipes forge a unique skill. Very rare, but it happens.
  if (ia === RANKS.indexOf('S') && ib === ia && rng() * 100 < UNIQUE_FUSION_PCT) {
    const u = UNIQUES[Math.floor(rng() * UNIQUES.length)];
    return { ok: true, skillId: uniqueIdOf(u.n), rank: 'U', upgraded: true };
  }
  // Same rank pairs rank up in about 1 of 5 recipes (A + A can give S). Never lower than the best parent.
  const upgraded = ia === ib && rankIdx < RANKS.indexOf('S') && rng() < 0.2;
  if (upgraded) rankIdx += 1;
  const rank = RANKS[rankIdx];
  const arch = rng() < 0.5 ? da.archetype : db.archetype;
  const elem = arch === da.archetype ? db.element : da.element;
  let id = idFromParts(rank, arch, elem, Math.floor(rng() * MOD_COUNT));
  if (id === null) id = idFromParts(rank, arch, Math.floor(rng() * ELEM_COUNT), 0);
  if (id === null) id = randomSkillOfRank(rank, rng);
  return { ok: true, skillId: id, rank, upgraded };
}

// ---- secret recipes (create uniques) -------------------------------------------

export interface RecipeReq {
  rank: Rank;
  /** Element id, or undefined for any. */
  element?: number;
  category?: string;
  minLevel: number;
}

export interface Recipe {
  id: number;
  name: string;
  /** The unique skill this recipe creates. */
  result: number;
  hint: string;
  requires: RecipeReq[];
}

const R = (rank: Rank, minLevel: number, element?: number, category?: string): RecipeReq => ({
  rank,
  minLevel,
  element,
  category,
});

/** 15 recipes. Each needs several high-level skills. The result is a unique skill, so only the first crafter gets it. */
export const RECIPES: Recipe[] = [
  {
    id: 1,
    name: 'Elemental Sovereign',
    result: uniqueIdOf(11),
    hint: 'Three Legendary elements of fire, ice and storm.',
    requires: [R('S', 15, 0), R('S', 15, 1), R('S', 15, 2)],
  },
  {
    id: 2,
    name: 'Eternal Bulwark',
    result: uniqueIdOf(26),
    hint: 'Three Epic defences, all at a high level.',
    requires: [
      R('A', 15, undefined, 'defence'),
      R('A', 15, undefined, 'defence'),
      R('A', 15, undefined, 'defence'),
    ],
  },
  {
    id: 3,
    name: 'Moon and Sun',
    result: uniqueIdOf(95),
    hint: 'Light and shadow, both Legendary.',
    requires: [R('S', 15, 4), R('S', 15, 5)],
  },
  {
    id: 4,
    name: 'Blood Pact',
    result: uniqueIdOf(17),
    hint: 'Blood magic plus two Epic attacks.',
    requires: [R('S', 15, 9), R('A', 15, undefined, 'attack'), R('A', 15, undefined, 'attack')],
  },
  {
    id: 5,
    name: 'Legion Crown',
    result: uniqueIdOf(77),
    hint: 'Four summoning skills at high level.',
    requires: [
      R('A', 15, undefined, 'summon'),
      R('A', 15, undefined, 'summon'),
      R('A', 15, undefined, 'summon'),
      R('A', 15, undefined, 'summon'),
    ],
  },
  {
    id: 6,
    name: 'Shadow Throne',
    result: uniqueIdOf(48),
    hint: 'Three Epic shadow skills.',
    requires: [
      R('A', 15, undefined, 'shadow'),
      R('A', 15, undefined, 'shadow'),
      R('A', 15, undefined, 'shadow'),
    ],
  },
  {
    id: 7,
    name: 'Starfall Engine',
    result: uniqueIdOf(15),
    hint: 'A Legendary star and a Legendary gravity skill.',
    requires: [R('S', 15, 10), R('S', 15, 11)],
  },
  {
    id: 8,
    name: 'Perfect Weapon',
    result: uniqueIdOf(61),
    hint: 'Five Epic weapons.',
    requires: [
      R('A', 15, undefined, 'weapon'),
      R('A', 15, undefined, 'weapon'),
      R('A', 15, undefined, 'weapon'),
      R('A', 15, undefined, 'weapon'),
      R('A', 15, undefined, 'weapon'),
    ],
  },
  {
    id: 9,
    name: 'Chrono Weave',
    result: uniqueIdOf(90),
    hint: 'A Legendary control, a movement and a support skill.',
    requires: [
      R('S', 15, undefined, 'control'),
      R('S', 15, undefined, 'movement'),
      R('S', 15, undefined, 'support'),
    ],
  },
  {
    id: 10,
    name: 'Merchant Crown',
    result: uniqueIdOf(4),
    hint: 'Skills of every low rank at a high level.',
    requires: [R('F', 15), R('E', 15), R('D', 15), R('C', 15), R('B', 15)],
  },
  {
    id: 11,
    name: 'Genesis Seed',
    result: uniqueIdOf(1),
    hint: 'Three Legendary world skills.',
    requires: [
      R('S', 15, undefined, 'world'),
      R('S', 15, undefined, 'world'),
      R('S', 15, undefined, 'world'),
    ],
  },
  {
    id: 12,
    name: 'Endless Weave',
    result: uniqueIdOf(2),
    hint: 'A Legendary of each element: wind, metal and toxin.',
    requires: [R('S', 15, 8), R('S', 15, 7), R('S', 15, 6)],
  },
  {
    id: 13,
    name: 'Phoenix Rite',
    result: uniqueIdOf(29),
    hint: 'Flame and light at Legendary, plus a heal.',
    requires: [R('S', 15, 0), R('S', 15, 4), R('A', 15, undefined, 'support')],
  },
  {
    id: 14,
    name: 'Void Sovereign',
    result: uniqueIdOf(25),
    hint: 'Void and gravity, both Legendary, plus a shadow skill.',
    requires: [R('S', 15, 3), R('S', 15, 11), R('A', 15, undefined, 'shadow')],
  },
  {
    id: 15,
    name: 'World Reset',
    result: uniqueIdOf(99),
    hint: 'Every element once at Epic or better.',
    requires: Array.from({ length: 12 }, (_, e) => R('A', 15, e)),
  },
];

/** Checks that the chosen skills satisfy a recipe using distinct skills. */
export function satisfiesRecipe(recipe: Recipe, chosen: SkillInstance[]): boolean {
  if (chosen.length !== recipe.requires.length) return false;
  const used = new Set<number>();
  for (const req of recipe.requires) {
    const idx = chosen.findIndex((c, i) => {
      if (used.has(i)) return false;
      const d = getSkill(c.skillId);
      if (d.rank !== req.rank || c.level < req.minLevel) return false;
      if (req.element !== undefined && d.element !== req.element) return false;
      if (req.category !== undefined && d.category !== req.category) return false;
      return true;
    });
    if (idx < 0) return false;
    used.add(idx);
  }
  return true;
}

/** Tries to craft a recipe. Fails when the unique already has an owner. */
export function craftRecipe(
  recipe: Recipe,
  chosen: SkillInstance[],
  registry: UniqueRegistry,
  account: string,
): { ok: boolean; reason?: string } {
  if (!satisfiesRecipe(recipe, chosen)) return { ok: false, reason: 'The skills do not match the recipe' };
  if (registry.isClaimed(recipe.result))
    return { ok: false, reason: 'That unique skill already has an owner' };
  if (!registry.claim(recipe.result, account))
    return { ok: false, reason: 'Could not claim the unique skill' };
  return { ok: true };
}

// ---- starter pack and luck -------------------------------------------------------

/** Chance that the first pack contains something better (each tried in this order: U, S, A). */
export const STARTER_ODDS = { A: 1 / 1000, S: 1 / 100_000, U: 1 / 1_000_000 };
export const STARTER_RANKS: Rank[] = ['B', 'C', 'D', 'E', 'F'];

export interface StarterPack {
  skills: SkillInstance[];
  /** The lucky upgrade, if any. */
  lucky: 'A' | 'S' | 'U' | null;
}

/** Starter kits are playable: three attacks, one defence and one move skill. */
const STARTER_ROLES: string[][] = [
  ['projectile', 'beam', 'volley'],
  ['nova', 'cleave', 'projectile'],
  ['shield', 'heal', 'barrier'],
  ['dash', 'blink'],
  ['projectile', 'volley', 'beam'],
];
function starterOfRole(rank: Rank, kinds: string[], rng: Rng): number {
  for (let t = 0; t < 300; t++) {
    const id = randomSkillOfRank(rank, rng);
    if (kinds.includes(getSkill(id).kind)) return id;
  }
  return randomSkillOfRank(rank, rng);
}
export function rollStarterPack(
  rng: Rng,
  uidPrefix: string,
  account: string,
  registry: UniqueRegistry,
  odds: { A: number; S: number; U: number } = STARTER_ODDS,
): StarterPack {
  let lucky: StarterPack['lucky'] = null;
  const ranks: Rank[] = [...STARTER_RANKS];
  const roll = rng();
  const free = registry.unclaimed();
  if (roll < odds.U && free.length > 0) lucky = 'U';
  else if (rng() < odds.S) lucky = 'S';
  else if (rng() < odds.A) lucky = 'A';
  const skills: SkillInstance[] = [];
  ranks.forEach((rank, i) => {
    let id: number;
    if (i === 0 && lucky === 'U') {
      id = free[Math.floor(rng() * free.length)];
      registry.claim(id, account);
    } else if (i === 0 && lucky) id = randomSkillOfRank(lucky, rng);
    else id = starterOfRole(rank, STARTER_ROLES[i % STARTER_ROLES.length], rng);
    skills.push(makeInstance(id, rng, `${uidPrefix}-${i}`));
  });
  return { skills, lucky };
}

// ---- drops --------------------------------------------------------------------

export type DropSource =
  'solo' | 'team' | 'story' | 'quest' | 'openworld' | 'boss' | 'legendary' | 'ranked' | 'daily';

/** Percent weights per rank for each source. They need not sum to exactly 100. */
export const DROP_WEIGHTS: Record<DropSource, Partial<Record<Rank, number>>> = {
  daily: { F: 34, E: 28, D: 20, C: 12, B: 5.9, A: 0.1 },
  solo: { F: 30, E: 26, D: 20, C: 14, B: 8.6, A: 1.35, S: 0.05 },
  team: { F: 28, E: 25, D: 21, C: 15, B: 9, A: 1.9, S: 0.1 },
  story: { F: 20, E: 22, D: 24, C: 18, B: 12, A: 3.8, S: 0.2 },
  quest: { E: 20, D: 30, C: 28, B: 17, A: 4.8, S: 0.2 },
  openworld: { F: 24, E: 24, D: 22, C: 16, B: 10, A: 3.8, S: 0.2 },
  boss: { D: 10, C: 28, B: 40, A: 20, S: 2 },
  legendary: { B: 10, A: 60, S: 30 },
  ranked: { C: 15, B: 45, A: 36, S: 4 },
};

export function rollDrop(source: DropSource, rng: Rng): Rank {
  const w = DROP_WEIGHTS[source];
  const entries = Object.entries(w) as Array<[Rank, number]>;
  const total = entries.reduce((s, [, v]) => s + v, 0);
  let r = rng() * total;
  for (const [rank, v] of entries) {
    r -= v;
    if (r <= 0) return rank;
  }
  return entries[entries.length - 1][0];
}

// ---- loadout and ranked power budget -----------------------------------------------

export const LOADOUT_SLOTS = 5;

/** Budget cost of a skill: rank value grown a little by level. */
export function budgetCost(inst: SkillInstance): number {
  const rank = rankOf(inst.skillId)!;
  return Math.round(RANK_INFO[rank].budget * (1 + 0.03 * (inst.level - 1)));
}

export function loadoutCost(skills: SkillInstance[]): number {
  return skills.reduce((s, i) => s + budgetCost(i), 0);
}

/** Validates five distinct skills that the player owns. */
export function validateLoadout(
  ids: string[],
  inventory: SkillInstance[],
  _budget?: number,
): { ok: boolean; reason?: string } {
  if (ids.length > LOADOUT_SLOTS) return { ok: false, reason: `At most ${LOADOUT_SLOTS} skills` };
  if (new Set(ids).size !== ids.length) return { ok: false, reason: 'A skill can only be equipped once' };
  const picked: SkillInstance[] = [];
  for (const uid of ids) {
    const inst = inventory.find((i) => i.uid === uid);
    if (!inst) return { ok: false, reason: 'You do not own that skill' };
    picked.push(inst);
  }
  return { ok: true };
}
