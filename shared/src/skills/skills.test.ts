import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES,
  COMBOS,
  DROP_WEIGHTS,
  FUSION_MIN_LEVEL,
  GENERATED_TOTAL,
  LEVEL_COPIES,
  LOADOUT_SLOTS,
  MASTERY_XP,
  MODIFIERS,
  RANKS,
  RANK_INFO,
  RECIPES,
  STARTER_ODDS,
  TOTAL_SKILLS,
  UNIQUES,
  UNIQUE_BASE_ID,
  UniqueRegistry,
  addToInventory,
  budgetCost,
  craftRecipe,
  effectiveStats,
  firstIdOfRank,
  fuse,
  fusionsLeft,
  getSkill,
  idFromParts,
  isValidSkillId,
  levelForCopies,
  loadoutCost,
  makeInstance,
  masteryLevel,
  mergeDuplicate,
  rankOf,
  rollDrop,
  rollStarterPack,
  satisfiesRecipe,
  skillCount,
  uniqueIdOf,
  validateLoadout,
  weekId,
  type Rank,
  type SkillInstance,
} from '../index';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

let uidN = 0;
const inst = (id: number, level = 1, rng = seeded(5)): SkillInstance => ({
  ...makeInstance(id, rng, `t${uidN++}`),
  level,
});

describe('skill catalog', () => {
  it('has the planned numbers of skills per rank', () => {
    expect(RANK_INFO.S.count).toBe(1000);
    expect(RANK_INFO.A.count).toBe(10000);
    expect(RANK_INFO.U.count).toBe(100);
    expect(UNIQUES.length).toBe(100);
    expect(GENERATED_TOTAL).toBe(115_000);
    expect(TOTAL_SKILLS).toBe(115_100);
    expect(ARCHETYPES.length * 12 * MODIFIERS.length).toBe(COMBOS);
    for (const r of ['F', 'E', 'D', 'C', 'B', 'A', 'S'] as Rank[])
      expect(RANK_INFO[r].count).toBeLessThanOrEqual(COMBOS);
  });

  it('maps ids to ranks and rejects bad ids', () => {
    expect(rankOf(0)).toBe('F');
    expect(rankOf(firstIdOfRank('E'))).toBe('E');
    expect(rankOf(firstIdOfRank('S'))).toBe('S');
    expect(rankOf(GENERATED_TOTAL - 1)).toBe('S');
    expect(rankOf(GENERATED_TOTAL)).toBeNull();
    expect(rankOf(UNIQUE_BASE_ID + 1)).toBe('U');
    expect(rankOf(UNIQUE_BASE_ID + 100)).toBe('U');
    expect(rankOf(UNIQUE_BASE_ID + 101)).toBeNull();
    expect(rankOf(-1)).toBeNull();
    expect(isValidSkillId(1.5)).toBe(false);
    expect(() => getSkill(-5)).toThrow();
  });

  it('gives every generated skill a distinct name inside its rank, and generation is deterministic', () => {
    for (const r of ['F', 'E', 'D', 'C', 'B', 'A', 'S'] as Rank[]) {
      const names = new Set<string>();
      const start = firstIdOfRank(r);
      for (let k = 0; k < skillCount(r); k++) names.add(getSkill(start + k).name);
      expect(names.size).toBe(skillCount(r));
    }
    expect(getSkill(12345)).toEqual(getSkill(12345));
  });

  it('round-trips archetype and element back to an id', () => {
    const rng = seeded(3);
    for (let i = 0; i < 400; i++) {
      const rank = (['F', 'E', 'D', 'C', 'B', 'A'] as Rank[])[Math.floor(rng() * 6)];
      const id = firstIdOfRank(rank) + Math.floor(rng() * skillCount(rank));
      const d = getSkill(id);
      const back = idFromParts(rank, d.archetype, d.element, d.modifier);
      expect(back).toBe(id);
    }
  });

  it('scales power with rank and keeps stats sane', () => {
    const avg = (r: Rank) => {
      let s = 0;
      for (let i = 0; i < 300; i++) {
        const d = getSkill(firstIdOfRank(r) + i);
        if (d.kind === 'projectile') s += d.base.power;
      }
      return s;
    };
    expect(avg('S')).toBeGreaterThan(avg('A') * 0.9);
    for (let i = 0; i < 2000; i++) {
      const d = getSkill(i * 57);
      for (const v of Object.values(d.base)) expect(Number.isFinite(v) && v >= 0).toBe(true);
    }
    expect(getSkill(UNIQUE_BASE_ID + 11).name).toBe('Worldsplitter');
    expect(getSkill(UNIQUE_BASE_ID + 11).unique).toBe(true);
  });
});

describe('unique registry', () => {
  it('allows one owner, trading, and reincarnation after inactivity', () => {
    const reg = new UniqueRegistry();
    const id = uniqueIdOf(3);
    expect(reg.claim(id, 'alice', 0)).toBe(true);
    expect(reg.claim(id, 'bob', 0)).toBe(false);
    expect(reg.claim(5, 'bob')).toBe(false);
    expect(reg.ownerOf(id)).toBe('alice');
    expect(reg.unclaimed().length).toBe(99);
    expect(reg.transfer(id, 'bob', 'carol')).toBe(false);
    expect(reg.transfer(id, 'alice', 'bob', 1000)).toBe(true);
    expect(reg.ownerOf(id)).toBe('bob');
    const day = 86400000;
    expect(reg.releaseInactive(1000 + 30 * day)).toEqual([]);
    expect(reg.releaseInactive(1000 + 61 * day, 60, new Set(['bob']))).toEqual([]);
    expect(reg.releaseInactive(1000 + 61 * day)).toEqual([id]);
    expect(reg.ownerOf(id)).toBeNull();
    expect(reg.hall().length).toBe(100);
  });
});

describe('merging', () => {
  it('merges duplicates automatically and raises the level with diminishing returns', () => {
    const id = 500;
    const a = inst(id);
    const b = inst(id, 1, seeded(9));
    const m = mergeDuplicate(a, b);
    expect(m.copies).toBe(2);
    expect(m.level).toBe(2);
    expect(m.rolls.power).toBeGreaterThanOrEqual(Math.max(a.rolls.power, b.rolls.power));
    expect(() => mergeDuplicate(a, inst(id + 1))).toThrow();

    expect(levelForCopies(1)).toBe(1);
    expect(levelForCopies(4)).toBe(3);
    expect(levelForCopies(1000)).toBe(20);
    for (let i = 1; i < LEVEL_COPIES.length; i++)
      expect(LEVEL_COPIES[i] - LEVEL_COPIES[i - 1]).toBeGreaterThanOrEqual(
        i === 1 ? 1 : LEVEL_COPIES[i - 1] - LEVEL_COPIES[i - 2],
      );
  });

  it('never keeps duplicates in the inventory', () => {
    let inv: SkillInstance[] = [];
    for (let i = 0; i < 6; i++) {
      const r = addToInventory(inv, inst(77, 1, seeded(i + 1)));
      inv = r.inv;
      expect(r.merged).toBe(i > 0);
    }
    expect(inv.length).toBe(1);
    expect(inv[0].copies).toBe(6);
    expect(inv[0].level).toBe(levelForCopies(6));
  });

  it('keeps bound status only when everything merged is bound', () => {
    const a = { ...inst(9), bound: true };
    const b = { ...inst(9), bound: false };
    expect(mergeDuplicate(a, b).bound).toBe(false);
  });
});

describe('mastery and effective stats', () => {
  it('has ten mastery levels', () => {
    expect(MASTERY_XP.length).toBe(10);
    expect(masteryLevel(0)).toBe(1);
    expect(masteryLevel(100)).toBe(2);
    expect(masteryLevel(1e9)).toBe(10);
  });

  it('gets stronger with level and mastery, and faster with mastery', () => {
    const base = inst(30000);
    const hi = { ...base, level: 10, masteryXp: 3200 };
    const a = effectiveStats(base);
    const b = effectiveStats(hi);
    expect(b.power).toBeGreaterThan(a.power);
    expect(b.cooldown).toBeLessThan(a.cooldown);
  });
});

describe('weekly fusion and recipes', () => {
  it('limits manual fusion to once a week unless a perk says otherwise', () => {
    expect(fusionsLeft(0)).toBe(1);
    expect(fusionsLeft(1)).toBe(0);
    expect(fusionsLeft(1, { timeWeaver: true })).toBe(1);
    expect(fusionsLeft(50, { infiniteFusion: true })).toBe(Infinity);
    expect(weekId(new Date('2026-11-15T12:00:00Z'))).toMatch(/^2026-W\d{2}$/);
    expect(weekId(new Date('2026-11-16T12:00:00Z'))).not.toBe(weekId(new Date('2026-11-15T12:00:00Z')));
  });

  it('only fuses valid pairs and produces a real skill', () => {
    const rng = seeded(8);
    const a = inst(firstIdOfRank('B') + 10, 5);
    const b = inst(firstIdOfRank('B') + 90, 5);
    const ok = fuse(a, b, rng);
    expect(ok.ok).toBe(true);
    expect(isValidSkillId(ok.skillId!)).toBe(true);
    expect(['B', 'A']).toContain(ok.rank);
    expect(fuse(a, a, rng).ok).toBe(false);
    expect(fuse(a, inst(a.skillId, 5), rng).ok).toBe(false);
    expect(fuse({ ...a, level: FUSION_MIN_LEVEL - 1 }, b, rng).ok).toBe(false);
    expect(fuse(a, inst(firstIdOfRank('F') + 1, 5), rng).ok).toBe(false);
    expect(fuse(inst(UNIQUE_BASE_ID + 1, 5), b, rng).ok).toBe(false);
  });

  it('sometimes upgrades a fusion by one rank, never beyond Legendary or into Unique', () => {
    const rng = seeded(21);
    let upgrades = 0;
    for (let i = 0; i < 400; i++) {
      const a = inst(firstIdOfRank('C') + i, 20);
      const b = inst(firstIdOfRank('C') + i + 777, 20);
      const r = fuse(a, b, rng);
      if (r.upgraded) upgrades++;
      expect(r.rank).not.toBe('U');
    }
    expect(upgrades).toBeGreaterThan(40);
    expect(upgrades).toBeLessThan(250);
    const top = fuse(inst(firstIdOfRank('S') + 1, 20), inst(firstIdOfRank('S') + 2, 20), seeded(1));
    expect(top.rank).toBe('S');
  });

  it('has 15 secret recipes that create real unique skills', () => {
    expect(RECIPES.length).toBe(15);
    for (const r of RECIPES) {
      expect(r.result).toBeGreaterThan(UNIQUE_BASE_ID);
      expect(r.result).toBeLessThanOrEqual(UNIQUE_BASE_ID + 100);
      expect(r.requires.length).toBeGreaterThanOrEqual(2);
    }
    expect(new Set(RECIPES.map((r) => r.result)).size).toBeGreaterThan(10);
  });

  it('crafts a unique only when the skills match, and only for the first crafter', () => {
    const recipe = RECIPES[2]; // Light + Shadow, both Legendary level 15
    const light = firstSkill('S', (d) => d.element === 4);
    const shadow = firstSkill('S', (d) => d.element === 5);
    const have = [inst(light, 15), inst(shadow, 15)];
    expect(satisfiesRecipe(recipe, have)).toBe(true);
    expect(satisfiesRecipe(recipe, [inst(light, 14), inst(shadow, 15)])).toBe(false);
    expect(satisfiesRecipe(recipe, [inst(light, 15), inst(light, 15)])).toBe(false);
    const reg = new UniqueRegistry();
    expect(craftRecipe(recipe, have, reg, 'alice').ok).toBe(true);
    expect(reg.ownerOf(recipe.result)).toBe('alice');
    expect(craftRecipe(recipe, have, reg, 'bob').ok).toBe(false);
    expect(craftRecipe(RECIPES[1], have, reg, 'bob').ok).toBe(false);
  });
});

function firstSkill(rank: Rank, test: (d: ReturnType<typeof getSkill>) => boolean): number {
  const start = firstIdOfRank(rank);
  for (let k = 0; k < skillCount(rank); k++) if (test(getSkill(start + k))) return start + k;
  throw new Error('none found');
}

describe('starter pack and luck', () => {
  it('always gives one skill each of B, C, D, E and F', () => {
    const rng = seeded(2);
    for (let i = 0; i < 300; i++) {
      const p = rollStarterPack(rng, `u${i}`, `acc${i}`, new UniqueRegistry());
      expect(p.skills.length).toBe(5);
      if (!p.lucky) expect(p.skills.map((s) => rankOf(s.skillId))).toEqual(['B', 'C', 'D', 'E', 'F']);
    }
  });

  it('matches the promised odds: about 1 in 1,000 for A, and S or U essentially never in 100,000 packs', () => {
    const rng = seeded(11);
    const counts = { A: 0, S: 0, U: 0 };
    const N = 100_000;
    const reg = new UniqueRegistry();
    for (let i = 0; i < N; i++) {
      const p = rollStarterPack(rng, 'o' + i, 'acc' + i, reg, STARTER_ODDS);
      if (p.lucky) counts[p.lucky]++;
    }
    expect(counts.A).toBeGreaterThan(55);
    expect(counts.A).toBeLessThan(160);
    expect(counts.S + counts.U).toBeLessThanOrEqual(3);
  });

  it('applies lucky upgrades and claims the unique so nobody else can get it', () => {
    const reg = new UniqueRegistry();
    const forceU = rollStarterPack(seeded(1), 'x', 'alice', reg, { A: 0, S: 0, U: 1 });
    expect(forceU.lucky).toBe('U');
    expect(rankOf(forceU.skills[0].skillId)).toBe('U');
    expect(reg.ownerOf(forceU.skills[0].skillId)).toBe('alice');
    expect(reg.unclaimed().length).toBe(99);
    const forceS = rollStarterPack(seeded(1), 'y', 'bob', reg, { A: 0, S: 1, U: 0 });
    expect(forceS.lucky).toBe('S');
    expect(rankOf(forceS.skills[0].skillId)).toBe('S');
    const forceA = rollStarterPack(seeded(1), 'z', 'carl', reg, { A: 1, S: 0, U: 0 });
    expect(rankOf(forceA.skills[0].skillId)).toBe('A');
    // when no unique is left, a U roll falls through to the other chances
    const empty = new UniqueRegistry();
    for (const id of empty.unclaimed()) empty.claim(id, 'nobody');
    const none = rollStarterPack(seeded(1), 'w', 'dina', empty, { A: 0, S: 0, U: 1 });
    expect(none.lucky).toBeNull();
  });
});

describe('drops', () => {
  it('has sensible tables per source', () => {
    for (const w of Object.values(DROP_WEIGHTS)) {
      const total = Object.values(w).reduce((s, v) => s + (v ?? 0), 0);
      expect(total).toBeGreaterThan(99);
      expect(total).toBeLessThan(101);
    }
    const rng = seeded(4);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 20000; i++) {
      const r = rollDrop('boss', rng);
      counts[r] = (counts[r] ?? 0) + 1;
    }
    expect(counts.F).toBeUndefined();
    expect(counts.B).toBeGreaterThan(counts.A);
    expect(counts.S).toBeGreaterThan(0);
    const legendary = rollDrop('legendary', seeded(2));
    expect(['B', 'A', 'S']).toContain(legendary);
    expect(rollDrop('daily', seeded(3))).not.toBe('S');
  });
});

describe('loadout and power budget', () => {
  it('validates five distinct owned skills within the budget', () => {
    const inv = RANKS.slice(0, 7).map((r, i) => inst(firstIdOfRank(r) + i, 1));
    const ids = inv.slice(0, 5).map((i) => i.uid);
    expect(validateLoadout(ids, inv).ok).toBe(true);
    expect(validateLoadout([...ids, inv[5].uid], inv).ok).toBe(false);
    expect(validateLoadout([ids[0], ids[0]], inv).ok).toBe(false);
    expect(validateLoadout(['nope'], inv).ok).toBe(false);
    const cost = loadoutCost(inv.slice(0, 5));
    expect(validateLoadout(ids, inv, cost).ok).toBe(true);
    expect(validateLoadout(ids, inv, cost - 1).ok).toBe(false);
    expect(LOADOUT_SLOTS).toBe(5);
  });

  it('charges more for higher ranks and levels', () => {
    expect(budgetCost(inst(firstIdOfRank('S')))).toBeGreaterThan(budgetCost(inst(firstIdOfRank('B'))));
    expect(budgetCost(inst(firstIdOfRank('B'), 10))).toBeGreaterThan(budgetCost(inst(firstIdOfRank('B'), 1)));
  });
});
