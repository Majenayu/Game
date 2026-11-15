import {
  ARCHETYPES,
  ARCH_COUNT,
  COMBOS,
  ELEMENTS,
  ELEM_COUNT,
  KIND_BASE,
  MODIFIERS,
  MOD_COUNT,
  RANKS,
  RANK_INFO,
  type BaseStats,
  type Category,
  type Kind,
  type Rank,
} from './catalog';
import { UNIQUES, UNIQUE_BASE_ID, UNIQUE_COUNT } from './uniques';

/**
 * Skill ids:
 *   0 .. 115,999     generated skills, laid out by rank: F, E, D, C, B, A, S
 *   1,000,001 ..     unique skills (see uniques.ts)
 * Every generated skill is a unique (archetype, element, modifier) combination inside its rank.
 */
const GENERATED_RANKS: Rank[] = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];

const RANK_START: Record<string, number> = {};
{
  let acc = 0;
  for (const r of GENERATED_RANKS) {
    RANK_START[r] = acc;
    acc += RANK_INFO[r].count;
  }
}
export const GENERATED_TOTAL = GENERATED_RANKS.reduce((s, r) => s + RANK_INFO[r].count, 0);
export const TOTAL_SKILLS = GENERATED_TOTAL + UNIQUE_COUNT;

/** Multiplier coprime to COMBOS so k -> (k * P) % COMBOS is a bijection. */
const P = 40009;
const SALT: Record<string, number> = { F: 11, E: 2203, D: 4409, C: 9007, B: 15013, A: 22027, S: 31039 };

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
if (gcd(P, COMBOS) !== 1) throw new Error('P must be coprime to the combo count');

function modInverse(a: number, m: number): number {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1, 0];
  while (r !== 0) {
    const q = Math.floor(old_r / r);
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return ((old_s % m) + m) % m;
}
const P_INV = modInverse(P, COMBOS);

export interface GeneratedSkill {
  id: number;
  rank: Rank;
  name: string;
  category: Category;
  kind: Kind;
  archetype: number;
  /** Element id, or -1 for unique skills. */
  element: number;
  modifier: number;
  desc: string;
  base: BaseStats;
  /** Extra projectiles or hits from the modifier twist. */
  count: number;
  unique: boolean;
}

const KIND_TEXT: Record<string, string> = {
  projectile: 'Fires a fast {e} shot where you aim',
  beam: 'Shoots a {e} laser that hits everything in a line',
  volley: 'Sprays a fan of {e} shots',
  nova: 'Blasts a {e} shockwave all around you',
  cleave: 'Swings a heavy {e} strike in front of you',
  shield: 'Wraps you in a {e} shield so nothing can hurt you for a moment',
  barrier: 'Raises a {e} wall that blocks enemy bullets',
  heal: 'Heals you and nearby allies with {e} energy',
  aura: 'Opens a {e} healing circle on the ground',
  buff: 'Charges you with {e} power for a while',
  stealth: 'Hides you in {e} mist',
  ambush: 'Teleports behind the nearest enemy and strikes with {e}',
  summon: 'Calls {e} companions that orbit you and shoot',
  mine: 'Drops a hidden {e} mine',
  pull: 'Opens a {e} vortex that drags enemies in',
  slow: 'Creates a {e} field that slows enemies',
  dash: 'Dashes forward in a burst of {e}',
  blink: 'Teleports you a short distance in a flash of {e}',
  portal: 'Opens a {e} portal that carries you across the arena',
  world: 'Passive {e} skill that boosts your rewards outside battle',
};
const STATUS_TEXT: Record<string, string> = {
  burn: 'sets enemies on fire',
  slow: 'freezes enemies so they move slower',
  chain: 'arcs to nearby enemies',
  pierce: 'goes through enemies',
  heal: 'heals you a little on hit',
  hide: 'briefly hides you',
  poison: 'poisons enemies over time',
  bounce: 'bounces off walls',
  knockback: 'knocks enemies back',
  leech: 'drains HP back to you',
  homing: 'curves toward enemies',
  pull: 'pulls enemies closer',
};
const TWIST_TEXT: Record<string, [string, string, string]> = {
  power: ['is slightly stronger', 'is stronger', 'is much stronger'],
  cooldown: ['recharges a bit faster', 'recharges faster', 'recharges much faster'],
  range: ['reaches a bit further', 'reaches further', 'reaches much further'],
  area: ['covers a bit more area', 'covers more area', 'covers a huge area'],
  duration: ['lasts a bit longer', 'lasts longer', 'lasts much longer'],
  count: ['adds an extra hit', 'adds extra hits', 'adds many extra hits'],
  mp: ['costs a little less mana', 'costs less mana', 'costs much less mana'],
  cast: ['casts a bit quicker', 'casts quicker', 'casts almost instantly'],
};
/** A readable one-line description built from the skill's parts. */
function describe(kind: string, element: string, status: string, twist: string, strength: number): string {
  const base = (KIND_TEXT[kind] ?? 'Unleashes {e} power').replace('{e}', element.toLowerCase());
  const st = STATUS_TEXT[status];
  const tw = TWIST_TEXT[twist]?.[strength <= 3 ? 0 : strength <= 7 ? 1 : 2] ?? '';
  const joiner = base.includes(' that ') || base.includes(' so ') ? ', and it ' : ' that ';
  const parts = [base + (st && kind !== 'world' ? joiner + st : '') + '.'];
  if (tw) parts.push(`This version ${tw}.`);
  return parts.join(' ');
}

export function rankOf(id: number): Rank | null {
  if (id > UNIQUE_BASE_ID && id <= UNIQUE_BASE_ID + UNIQUE_COUNT) return 'U';
  if (!Number.isInteger(id) || id < 0 || id >= GENERATED_TOTAL) return null;
  for (let i = GENERATED_RANKS.length - 1; i >= 0; i--)
    if (id >= RANK_START[GENERATED_RANKS[i]]) return GENERATED_RANKS[i];
  return null;
}

export function isValidSkillId(id: number): boolean {
  return rankOf(id) !== null;
}

function partsOf(rank: Rank, k: number): { a: number; e: number; m: number } {
  const idx = (k * P + SALT[rank]) % COMBOS;
  return {
    a: idx % ARCH_COUNT,
    e: Math.floor(idx / ARCH_COUNT) % ELEM_COUNT,
    m: Math.floor(idx / (ARCH_COUNT * ELEM_COUNT)),
  };
}

/** Applies a modifier twist to base stats. Strength 1..10 maps to a few percent up to about 45%. */
function applyTwist(base: BaseStats, twist: string, strength: number): { stats: BaseStats; count: number } {
  const s = { ...base };
  const f = 0.045 * strength;
  let count = 0;
  switch (twist) {
    case 'power':
      s.power *= 1 + f;
      break;
    case 'cooldown':
      s.cooldown *= 1 - f * 0.7;
      break;
    case 'range':
      s.range *= 1 + f;
      break;
    case 'area':
      s.area *= 1 + f;
      break;
    case 'duration':
      s.duration *= 1 + f;
      break;
    case 'count':
      count = Math.floor((strength + 1) / 4);
      break;
    case 'mp':
      s.mp *= 1 - f * 0.7;
      break;
    case 'cast':
      s.cast *= 1 - f * 0.8;
      break;
  }
  return { stats: s, count };
}

const cache = new Map<number, GeneratedSkill>();

export function getSkill(id: number): GeneratedSkill {
  const hit = cache.get(id);
  if (hit) return hit;
  const rank = rankOf(id);
  if (!rank) throw new Error(`Unknown skill id ${id}`);
  const info = RANK_INFO[rank];
  let def: GeneratedSkill;
  if (rank === 'U') {
    const u = UNIQUES[id - UNIQUE_BASE_ID - 1];
    const base = { ...KIND_BASE[u.kind] };
    base.power *= info.power;
    def = {
      id,
      rank,
      name: u.name,
      category: u.category,
      kind: u.kind,
      archetype: -1,
      element: -1,
      modifier: -1,
      desc: u.desc,
      base,
      count: 0,
      unique: true,
    };
  } else {
    const k = id - RANK_START[rank];
    const { a, e, m } = partsOf(rank, k);
    const arch = ARCHETYPES[a];
    const elem = ELEMENTS[e];
    const mod = MODIFIERS[m];
    const kindBase = KIND_BASE[arch.kind];
    const scaled: BaseStats = {
      ...kindBase,
      power: kindBase.power * info.power,
      mp: kindBase.mp * (1 + 0.08 * RANKS.indexOf(rank)),
    };
    const { stats, count } = applyTwist(scaled, mod.twist, mod.strength);
    def = {
      id,
      rank,
      name: `${mod.name} ${elem.name} ${arch.name}`,
      category: arch.category,
      kind: arch.kind,
      archetype: a,
      element: e,
      modifier: m,
      desc: describe(arch.kind, elem.name, elem.status, mod.twist, mod.strength),
      base: stats,
      count,
      unique: false,
    };
  }
  if (cache.size > 5000) cache.clear();
  cache.set(id, def);
  return def;
}

/**
 * Finds the id of a skill of `rank` with the given archetype and element, trying modifiers starting at `modPref`.
 * Returns null when this rank has no such skill (small ranks only contain a slice of all combinations).
 */
export function idFromParts(rank: Rank, a: number, e: number, modPref = 0): number | null {
  if (rank === 'U') return null;
  const count = RANK_INFO[rank].count;
  for (let dm = 0; dm < MOD_COUNT; dm++) {
    const m = (modPref + dm) % MOD_COUNT;
    const idx = m * ARCH_COUNT * ELEM_COUNT + e * ARCH_COUNT + a;
    const k = (((idx - SALT[rank]) % COMBOS) + COMBOS) % COMBOS;
    const kk = (k * P_INV) % COMBOS;
    if (kk < count) return RANK_START[rank] + kk;
  }
  return null;
}

export function firstIdOfRank(rank: Rank): number {
  return rank === 'U' ? UNIQUE_BASE_ID + 1 : RANK_START[rank];
}

export function skillCount(rank: Rank): number {
  return RANK_INFO[rank].count;
}

export function randomSkillOfRank(rank: Rank, rng: () => number): number {
  if (rank === 'U') return UNIQUE_BASE_ID + 1 + Math.floor(rng() * UNIQUE_COUNT);
  return RANK_START[rank] + Math.floor(rng() * RANK_INFO[rank].count);
}
