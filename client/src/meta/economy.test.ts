import { describe, expect, it } from 'vitest';
import { LEVELS } from '@orb/shared';
import type { Platform } from '../platform/crazygames';
import { DAILY_REWARDS, Progress, WHEEL, dateKey, levelFromXp, weekKey, xpToNext } from './economy';
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
    expect(defaultSave().owned.skills).toEqual(['dash', 'shield']);
  });
});

describe('levels and rewards', () => {
  it('computes levels from xp', () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(xpToNext(1)).level).toBe(2);
    expect(levelFromXp(1e9).level).toBe(50);
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
    expect(p.buy('skill', 'pulse').ok).toBe(true);
    p.equip('skill', 'pulse', 1);
    expect(p.data.loadout.skills).toEqual(['dash', 'pulse']);
    p.equip('skill', 'pulse', 0);
    expect(new Set(p.data.loadout.skills).size).toBe(2);
    expect(p.buy('char', 'nope' as any).ok).toBe(false);
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
    expect(p.claimQuest(q)!.coins).toBe(def.coins);
    expect(p.data.coins).toBe(coins + def.coins);
    expect(p.claimQuest(q)).toBeNull();
  });

  it('lucky draw: one free spin per day, then it costs coins; prizes are granted', async () => {
    const p = await fresh();
    expect(p.spinStatus().free).toBe(true);
    expect(p.payForSpin()).toBe(true);
    expect(p.spinStatus().free).toBe(false);
    p.data.coins = 0;
    expect(p.payForSpin()).toBe(false);
    p.data.coins = 1000;
    expect(p.payForSpin()).toBe(true);
    expect(p.data.coins).toBe(850);
    const counts = new Array(WHEEL.length).fill(0);
    let s = 3;
    const rng = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
    for (let i = 0; i < 4000; i++) counts[p.rollSpin(rng)]++;
    counts.forEach((n) => expect(n).toBeGreaterThan(0));
    expect(counts[0]).toBeGreaterThan(counts[7]);
    const before = p.data.coins;
    expect(p.grantPrize(1)).toBe('50 coins');
    expect(p.data.coins).toBe(before + 50);
    const skinIdx = WHEEL.findIndex((w) => w.kind === 'cosmetic');
    const owned = p.data.owned.colors.length + p.data.owned.trails.length + p.data.owned.bfx.length;
    p.grantPrize(skinIdx);
    expect(p.data.owned.colors.length + p.data.owned.trails.length + p.data.owned.bfx.length).toBe(owned + 1);
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

  it('tracks discovered powerups once', async () => {
    const p = await fresh();
    expect(p.discover(5)).toBe(true);
    expect(p.discover(5)).toBe(false);
    expect(p.data.dex).toEqual([5]);
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
