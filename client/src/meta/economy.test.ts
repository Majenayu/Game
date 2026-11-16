import { describe, expect, it } from 'vitest';
import {
  ACCESSORIES,
  accessorySlot,
  LEVELS,
  getSkill,
  makeInstance,
  randomSkillOfRank,
  usableInBattle,
  type Rank,
} from '@orb/shared';
import type { Platform } from '../platform/crazygames';
import {
  DAILY_REWARDS,
  EXTRA_SPIN_COST,
  LOOK_GENRES,
  LOOK_WHEELS,
  Progress,
  WHEEL,
  WHEELS,
  dateKey,
  levelFromXp,
  weekKey,
  xpToNext,
} from './economy';
import { defaultSave, parseSave } from './save';

// vitest runs in node: provide the browser bits Progress touches
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
};
(globalThis as any).window = { setTimeout, clearTimeout };

const fakePlatform = { loadData: async () => null, saveData: () => {} } as unknown as Platform;

async function fresh(): Promise<Progress> {
  store.clear();
  const p = new Progress(fakePlatform);
  await p.init();
  return p;
}

describe('save parsing', () => {
  it('survives garbage and fills defaults', () => {
    expect(parseSave('not json')).toBeNull();
    expect(parseSave(null)).toBeNull();
    const s = parseSave(
      JSON.stringify({
        coins: -50,
        xp: 'x',
        owned: { chars: ['titan', 7], colors: ['a', 3] },
        dex: [1, 1, 5000, -2, 7],
      }),
    )!;
    expect(s.coins).toBe(0);
    expect(s.xp).toBe(0);
    expect(s.owned.chars).toContain('nova');
    expect(s.owned.chars).toContain('titan');
    expect(s.owned.colors).toContain(3);
    expect(s.dex.sort()).toEqual([1, 7]);
    expect(defaultSave().skills).toEqual([]);
    expect(s.skills).toEqual([]);
    expect(s.skillMeta.starterGiven).toBe(false);
  });
});

describe('old saves', () => {
  it('loads an old-shaped save and grants the starter pack', async () => {
    store.clear();
    store.set(
      'orb.save3',
      JSON.stringify({
        v: 2,
        updated: 5,
        coins: 321,
        loadout: { char: 'bolt', skills: ['dash', 'pulse'], color: 2, trail: 0, bfx: 0 },
        owned: { chars: ['nova', 'bolt'], skills: ['dash', 'shield', 'pulse'], colors: [0, 1, 2] },
      }),
    );
    const p = new Progress(fakePlatform);
    await p.init();
    expect(p.data.coins).toBe(321);
    expect(p.data.loadout.char).toBe('bolt');
    expect(p.data.skills.length).toBe(5);
    expect(p.data.skillMeta.starterGiven).toBe(true);
  });

  it('drops malformed stored skills and duplicates', () => {
    const good = makeInstance(0, () => 0.5, 'u1');
    const s = parseSave(
      JSON.stringify({
        skills: [good, { ...good, uid: 'u2' }, { uid: 'x', skillId: -4 }, 'junk', null],
      }),
    )!;
    expect(s.skills.length).toBe(1);
    expect(s.skills[0].uid).toBe('u1');
  });
});

describe('levels and rewards', () => {
  it('computes levels from xp', () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(xpToNext(1)).level).toBe(2);
    expect(levelFromXp(1e9).level).toBe(1000);
  });

  it('level ups pay coins', async () => {
    const p = await fresh();
    const coins = p.data.coins;
    const gained = p.addXp(xpToNext(1) + 1);
    expect(gained).toEqual([2]);
    expect(p.data.coins).toBe(coins + 70);
  });

  it('records match rewards and tracks quest progress', async () => {
    const p = await fresh();
    const r = p.recordMatch({ mode: 'dm', kills: 5, deaths: 2, score: 5, won: true });
    expect(r.coins).toBe(5 + 10 + 25);
    expect(p.data.stats.wins).toBe(1);
    const half = p.recordMatch({ mode: 'dm', kills: 5, deaths: 2, score: 5, won: true }, 0.5);
    expect(half.coins).toBe(20);
  });
});

describe('shop', () => {
  it('buys, rejects, and equips items', async () => {
    const p = await fresh();
    expect(p.buy('char', 'titan').ok).toBe(false); // level and coins
    p.data.coins = 5000;
    p.addXp(1e6);
    expect(p.buy('char', 'titan').ok).toBe(true);
    expect(p.buy('char', 'titan').reason).toBe('Already owned');
    expect(p.equip('char', 'titan')).toBe(true);
    expect(p.data.loadout.char).toBe('titan');
    expect(p.equip('char', 'sniper')).toBe(false);
    expect(p.buy('char', 'nope' as any).ok).toBe(false);
  });
});

describe('skill inventory', () => {
  const seeded = (seed: number) => {
    let s = seed;
    return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  };
  const battleSkill = (rank: Rank, rng: () => number, not: number[] = []): number => {
    for (;;) {
      const id = randomSkillOfRank(rank, rng);
      if (usableInBattle(id) && !not.includes(id)) return id;
    }
  };

  it('grants five bound starter skills once and equips them', async () => {
    const p = await fresh();
    expect(p.data.skills.length).toBe(5);
    expect(p.data.skills.every((s) => s.bound)).toBe(true);
    const ranks = p.data.skills.map((s) => getSkill(s.skillId).rank);
    expect(ranks.length).toBe(5);
    expect(p.data.loadout.skillIds.length).toBeGreaterThan(0);
    expect(p.loadoutInstances().length).toBe(p.data.loadout.skillIds.length);
    expect(p.grantStarterIfNeeded()).toBeNull();
    expect(p.data.skills.length).toBe(5);
  });

  it('merges duplicates automatically', async () => {
    const p = await fresh();
    const first = p.data.skills[0];
    const r = p.addSkill(makeInstance(first.skillId, seeded(1), p.newUid()));
    expect(r.merged).toBe(true);
    expect(p.data.skills.length).toBe(5);
    expect(p.skillBySkillId(first.skillId)!.copies).toBe(first.copies + 1);
  });

  it('gives one daily skill drop per day', async () => {
    const p = await fresh();
    expect(p.dailySkillStatus().canClaim).toBe(true);
    const d = p.claimDailySkill(seeded(7));
    expect(d).not.toBeNull();
    expect(p.claimDailySkill(seeded(7))).toBeNull();
    expect(p.dailySkillStatus().canClaim).toBe(false);
    p.data.skillMeta.dropDay = '2000-01-01';
    expect(p.dailySkillStatus().canClaim).toBe(true);
  });

  it('drops a skill after a match', async () => {
    const p = await fresh();
    const r = p.recordMatch({ mode: 'dm', kills: 1, deaths: 0, score: 1, won: false });
    expect(r.drop).toBeDefined();
    expect(p.skillBySkillId(r.drop!.skillId)).toBeDefined();
  });

  it('equips owned skills without a power-budget restriction', async () => {
    const p = await fresh();
    const rng = seeded(11);
    expect(p.equipSkills([123456789]).ok).toBe(false);
    const ids: number[] = [];
    for (let i = 0; i < 5; i++) {
      const id = battleSkill('A', rng, ids);
      ids.push(id);
      p.addSkill(makeInstance(id, rng, p.newUid()));
    }
    expect(p.equipSkills(ids.slice(0, 3))).toEqual({ ok: true });
    expect(p.data.loadout.skillIds).toEqual(ids.slice(0, 3));
    expect(p.equipSkills(ids)).toEqual({ ok: true });
    expect(p.data.loadout.skillIds).toEqual(ids);
  });

  it('allows one fusion per week and consumes the parents', async () => {
    const p = await fresh();
    const rng = seeded(5);
    const a = makeInstance(battleSkill('C', rng), rng, p.newUid());
    const b = makeInstance(battleSkill('C', rng, [a.skillId]), rng, p.newUid());
    a.level = 3;
    b.level = 3;
    p.data.skills.push(a, b);
    const total = p.data.skills.length;
    expect(p.fusionStatus().left).toBe(1);
    const r = p.fuseSkills(a.uid, b.uid, rng);
    expect(r).toMatchObject({ ok: true });
    expect(p.skillBySkillId(a.skillId)?.uid).not.toBe(a.uid);
    expect(p.data.skills.length).toBeLessThanOrEqual(total - 1);
    expect(p.fusionStatus().left).toBe(0);
    const again = p.fuseSkills(a.uid, b.uid, rng);
    expect(again.ok).toBe(false);
    expect(again.reason).toMatch(/week/);
    p.data.skillMeta.fusionWeek = '2000-W01';
    expect(p.fusionStatus().left).toBe(1);
  });

  it('fusion has no level requirement', async () => {
    const { FUSION_MIN_LEVEL } = await import('@orb/shared');
    expect(FUSION_MIN_LEVEL).toBe(1);
  });
});

describe('daily reward, quests, lucky draw', () => {
  it('claims once per day and builds a streak', async () => {
    const p = await fresh();
    expect(p.dailyStatus().canClaim).toBe(true);
    const r = p.claimDaily()!;
    expect(r.coins).toBe(DAILY_REWARDS[0]);
    expect(p.claimDaily()).toBeNull();
    expect(p.dailyStatus().canClaim).toBe(false);
    const y = new Date();
    y.setDate(y.getDate() - 1);
    p.data.daily.last = dateKey(y);
    const r2 = p.claimDaily()!;
    expect(r2.day).toBe(2);
  });

  it('resets the streak after a missed day', async () => {
    const p = await fresh();
    p.data.daily = { last: '2000-01-01', streak: 5 };
    expect(p.claimDaily()!.day).toBe(1);
  });

  it('assigns daily and weekly quests and pays on claim', async () => {
    const p = await fresh();
    expect(p.data.quests.list.length).toBe(3);
    expect(p.data.quests.weekList.length).toBe(2);
    expect(weekKey()).toMatch(/^\d{4}-W\d{2}$/);
    const q = p.data.quests.list[0];
    const def = p.questDef(q.id)!;
    expect(p.claimQuest(q)).toBeNull();
    p.track(def.type, def.target);
    expect(q.progress).toBe(def.target);
    const coins = p.data.coins;
    // Quests pay double coins (plus stones and a chest).
    expect(p.claimQuest(q)!.coins).toBe(def.coins * 2);
    expect(p.data.coins).toBe(coins + def.coins * 2);
    expect(p.claimQuest(q)).toBeNull();
  });

  it('lucky draw: one free spin per day, then it costs coins; prizes are granted', async () => {
    const p = await fresh();
    expect(p.spinStatus().free).toBe(true);
    expect(p.spinStatus().left).toBe(10);
    for (let i = 0; i < 10; i++) expect(p.payForSpin()).toBe(true);
    expect(p.spinStatus().free).toBe(false);
    p.data.coins = 0;
    expect(p.payForSpin()).toBe(false);
    p.data.coins = 1000;
    expect(p.payForSpin()).toBe(true);
    expect(p.data.coins).toBe(850);
    const counts = new Array(WHEELS.coins.length).fill(0);
    let s = 3;
    const rng = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
    for (let i = 0; i < 4000; i++) counts[p.rollSpin(rng)]++;
    counts.forEach((n) => expect(n).toBeGreaterThan(0));
    expect(counts[0]).toBeGreaterThan(counts[7]);
    const before = p.data.coins;
    expect(p.grantPrize(WHEELS.coins.findIndex((w) => w.kind === 'coins' && w.value === 50))).toBe('50 coins');
    expect(p.data.coins).toBe(before + 50);
    const lvSum = () => p.data.skills.reduce((a, s) => a + s.level + 1, 0);
    const skills = lvSum();
    p.grantPrize(WHEEL.findIndex((w) => w.kind === 'skill'), Math.random, 'skills');
    // Uniques are never on the wheels: they come only from bosses and fusion.
    expect(WHEEL.some((w) => w.kind === 'unique')).toBe(false);
    const wi = p.data.owned.weapons.length;
    p.grantPrize(0, Math.random, 'weapons');
    expect(p.data.owned.weapons.length).toBe(wi + 1);
    expect(lvSum()).toBeGreaterThan(skills);
    const skinIdx = WHEELS.coins.findIndex((w) => w.kind === 'cosmetic');
    const owned = p.data.owned.colors.length + p.data.owned.trails.length + p.data.owned.bfx.length;
    p.grantPrize(skinIdx);
    expect(p.data.owned.colors.length + p.data.owned.trails.length + p.data.owned.bfx.length).toBe(owned + 1);
  });

  it('has one looks wheel per genre and grants a look of that genre', async () => {
    expect(LOOK_WHEELS).toHaveLength(LOOK_GENRES.length);
    for (let g = 0; g < LOOK_WHEELS.length; g++) {
      const p = await fresh();
      const wheel = LOOK_WHEELS[g];
      for (let tier = 0; tier < WHEELS[wheel].length; tier++) {
        const before = p.data.owned.accs.slice();
        p.grantPrize(tier, Math.random, wheel);
        const got = p.data.owned.accs.filter((id: number) => !before.includes(id));
        expect(got).toHaveLength(1);
        expect(accessorySlot(got[0])).toBe(g);
        expect(Math.floor((ACCESSORIES[got[0]].level - 1) / 8)).toBe(tier);
      }
    }
  });
  it('grants batched lucky-draw rewards after charging free spins first', async () => {
    const p = await fresh();
    const ten = p.spinBatch(10, () => 0, 'coins');
    expect(ten.ok).toBe(true);
    expect(ten.prizes).toHaveLength(10);
    expect(p.spinStatus().left).toBe(0);
    p.data.coins = 20_000;
    const before = p.data.coins;
    const hundred = p.spinBatch(100, () => 0, 'coins');
    expect(hundred.ok).toBe(true);
    expect(hundred.prizes).toHaveLength(100);
    expect(p.data.coins).toBe(before - 100 * EXTRA_SPIN_COST + 100 * 25);
  });
});

describe('campaign and collection', () => {
  it('unlocks levels in order and pays less on replays', async () => {
    const p = await fresh();
    expect(p.levelUnlocked(LEVELS[0])).toBe(true);
    expect(p.levelUnlocked(LEVELS[1])).toBe(false);
    const first = p.finishLevel(LEVELS[0], 2);
    expect(first.coins).toBe(LEVELS[0].reward + 60);
    expect(p.levelUnlocked(LEVELS[1])).toBe(true);
    const replay = p.finishLevel(LEVELS[0], 2);
    expect(replay.coins).toBe(Math.round(LEVELS[0].reward * 0.2));
    p.finishLevel(LEVELS[0], 3);
    expect(p.data.campaign['1']).toBe(3);
    expect(p.totalStars()).toBe(3);
  });

  it('grants each campaign map star milestone once', async () => {
    const p = await fresh();
    const mapLevels = LEVELS.filter((x) => x.map === LEVELS[0].map);
    for (const level of mapLevels.slice(0, 4)) p.finishLevel(level, 3);
    expect(p.data.campaignBonuses[LEVELS[0].map]).toBe(1);
    expect(p.data.chests.silver).toBeGreaterThan(0);
    const before = p.data.chests.silver;
    p.finishLevel(mapLevels[0], 3);
    expect(p.data.chests.silver).toBe(before);
  });

  it('tracks discovered powerups once', async () => {
    const p = await fresh();
    expect(p.discover(5)).toBe(true);
    expect(p.discover(5)).toBe(false);
    expect(p.data.dex).toEqual([5]);
  });

  it('purchases and upgrades summons persistently', async () => {
    const p = await fresh();
    p.data.coins = 10_000;
    expect(p.summon(1)).toEqual({ ok: true });
    expect(p.data.summons.owned).toContain(1);
    expect(p.upgradeSummon(1)).toEqual({ ok: true, level: 2 });
    expect(p.data.summons.levels['1']).toBe(2);
    expect(p.summon(1).ok).toBe(false);
  });

  it('persists to storage and reloads', async () => {
    const p = await fresh();
    p.data.coins = 777;
    p.flush();
    const p2 = new Progress(fakePlatform);
    await p2.init();
    expect(p2.data.coins).toBe(777);
  });
});
