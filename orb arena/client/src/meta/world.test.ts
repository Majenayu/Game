import { describe, expect, it } from 'vitest';
import { BOSS_LEVELS, LEVELS, RANKED_START, makeInstance, randomSkillOfRank } from '@orb/shared';

import type { Platform } from '../platform/crazygames';
import { Progress } from './economy';
import { parseSave } from './save';

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

describe('auction house and map gifts', () => {
  it('a low bid is outbid by a bot and costs nothing; a high bid leads and pays out next round', async () => {
    const { auctionLots, placeBid, settleAuction, AUCTION_ROUND_MS } = await import('./auction');
    const p = await fresh();
    p.data.coins = 1_000_000;
    const t = AUCTION_ROUND_MS * 1000 + 1000;
    const lot = auctionLots(p, t).lots[0];
    const low = placeBid(p, 0, lot.next, t);
    expect(low.ok).toBe(true);
    if (low.outbid) expect(p.data.coins).toBe(1_000_000);
    const big = placeBid(p, 0, 999_999, t);
    expect(big.ok).toBe(true);
    expect(auctionLots(p, t).lots[0].mine).toBe(true);
    const won = settleAuction(p, t + AUCTION_ROUND_MS);
    expect(won.length).toBe(1);
  });
  it('map gifts open once after the level before them is cleared', async () => {
    const { openMapGift } = await import('./worldmap');
    const p = await fresh();
    expect(openMapGift(p, '0:3')).toBeNull();
    p.data.campaign['3'] = 1;
    const stones = p.data.stones;
    expect(openMapGift(p, '0:3')).toContain('coins');
    expect(p.data.stones).toBeGreaterThan(stones);
    expect(openMapGift(p, '0:3')).toBeNull();
  });
});

describe('boss tower progress', () => {
  it('opens after campaign level 6 and each floor needs the one below', async () => {
    const p = await fresh();
    expect(p.levelUnlocked(BOSS_LEVELS[0])).toBe(false);
    p.data.campaign['6'] = 1;
    expect(p.levelUnlocked(BOSS_LEVELS[0])).toBe(true);
    expect(p.levelUnlocked(BOSS_LEVELS[1])).toBe(false);
    const r = p.finishLevel(BOSS_LEVELS[0], 2);
    expect(r.coins).toBeGreaterThan(BOSS_LEVELS[0].reward);
    expect(r.drop).toBeDefined();
    expect(p.levelUnlocked(BOSS_LEVELS[1])).toBe(true);
    expect(p.levelUnlocked(LEVELS[1])).toBe(false);
  });
});

describe('champion, weapons and accessories', () => {
  it('anyone can challenge the champion from level 1; the winner picks a skill from his kit and takes the crown', async () => {
    const p = await fresh();
    const majen = BOSS_LEVELS[8];
    expect(p.levelUnlocked(majen)).toBe(true);
    p.finishLevel(majen, 1);
    const kit = p.championKit();
    expect(kit.length).toBe(5);
    expect(p.claimChampion(123)).toBeNull();
    const d = p.claimChampion(kit[2])!;
    expect(d.rank).toBe('U');
    expect(p.data.champion.isYou).toBe(true);
    expect(p.data.chests.legend).toBe(1);
    expect(p.canChallengeChampion().ok).toBe(false);
  });
  it('opens chests and lists every item, and out-of-battle skills boost rewards', async () => {
    const p = await fresh();
    expect(p.passives.coins).toBe(0);
    p.data.chests.gold = 1;
    const coins = p.data.coins;
    const r = p.openChest('gold')!;
    expect(r.items.length).toBeGreaterThanOrEqual(5);
    expect(p.data.coins).toBeGreaterThanOrEqual(coins + 300);
    expect(p.openChest('gold')).toBeNull();
    const { firstIdOfRank, skillCount, getSkill } = await import('@orb/shared');
    const st = firstIdOfRank('S');
    for (let k = 0; k < skillCount('S'); k++)
      if (getSkill(st + k).kind === 'world') p.addSkill(makeInstance(st + k, Math.random, 'w' + k));
    const pv = p.passives;
    expect(pv.xp + pv.coins + pv.luck + pv.double).toBeGreaterThan(0);
  });
  it('the 30 day calendar pays chests on milestone days, and the profile sets a class kit', async () => {
    const p = await fresh();
    p.data.daily = { last: '', streak: 2 };
    const r = p.claimDaily()!;
    expect(r.day).toBe(1);
    expect(p.createProfile('guardian', { nick: 'G', char: 'medic', color: 2, acc: 6 })).toBe(true);
    expect(p.data.loadout.skillIds.length).toBeGreaterThanOrEqual(4);
    expect(p.data.loadout.acc).toBe(6);
    expect(p.data.loadout.char).toBe('medic');
    expect(p.needsProfile).toBe(false);
  });
  it('buys and equips weapons and accessories', async () => {
    const p = await fresh();
    p.data.coins = 5000;
    p.data.xp = 100000;
    expect(p.buy('weapon', 1).ok).toBe(true);
    expect(p.equip('weapon', 1)).toBe(true);
    expect(p.data.loadout.weapon).toBe(1);
    expect(p.buy('acc', 1).ok).toBe(true);
    expect(p.equip('acc', 1)).toBe(true);
    expect(p.data.loadout.acc).toBe(1);
    expect(p.equip('weapon', 4)).toBe(false);
  });
});

describe('chests, merging and duel loadout', () => {
  it('every won round and every won level pays a chest', async () => {
    const p = await fresh();
    const r = p.recordMatch({ mode: 'dm', kills: 3, deaths: 0, score: 3, won: true });
    expect(r.chest).toBe('wood');
    expect(p.data.chests.wood).toBe(1);
    expect(p.recordMatch({ mode: 'dm', kills: 0, deaths: 3, score: 0, won: false }).chest).toBeUndefined();
    const l = p.finishLevel(LEVELS[0], 1);
    expect(l.chest).toBe('silver');
    expect(p.finishLevel(LEVELS[0], 1).chest).toBe('wood');
    p.data.campaign['6'] = 1;
    expect(p.finishLevel(BOSS_LEVELS[0], 1).chest).toBe('gold');
    expect(p.finishLevel(BOSS_LEVELS[0], 1).chest).toBe('silver');
  });
  it('a duplicate merges and reports the copies and levels for the animation', async () => {
    const p = await fresh();
    const id = randomSkillOfRank('C', Math.random);
    const seen: Array<{ merged: boolean; level: number; prevLevel: number; copies: number }> = [];
    p.onSkill((d) => seen.push(d));
    p.addSkill(makeInstance(id, Math.random, 'm1'));
    p.addSkill(makeInstance(id, Math.random, 'm2'));
    expect(seen[0]).toMatchObject({ merged: false, copies: 1, level: 1 });
    expect(seen[1]).toMatchObject({ merged: true, copies: 2, level: 2, prevLevel: 1 });
  });
  it('the duel loadout only takes owned duel-legal skills', async () => {
    const p = await fresh();
    const { getSkill, firstIdOfRank, skillCount, duelUsable } = await import('@orb/shared');
    const st = firstIdOfRank('D');
    let legal = -1;
    let illegal = -1;
    for (let k = 0; k < skillCount('D') && (legal < 0 || illegal < 0); k++) {
      const s = getSkill(st + k);
      if (legal < 0 && duelUsable(s.id)) legal = s.id;
      if (illegal < 0 && s.kind === 'summon') illegal = s.id;
    }
    p.addSkill(makeInstance(legal, Math.random, 'd1'));
    p.addSkill(makeInstance(illegal, Math.random, 'd2'));
    expect(p.equipDuelSkills([illegal]).ok).toBe(false);
    expect(p.equipDuelSkills([legal]).ok).toBe(true);
    expect(p.duelSkillIds()).toEqual([legal]);
    expect(p.duelInstances()[0].skillId).toBe(legal);
  });
  it('reset wipes progress but keeps the name', async () => {
    const p = await fresh();
    p.data.nick = 'Majenayu';
    p.data.coins = 99999;
    p.resetProgress();
    expect(p.data.coins).toBe(100);
    expect(p.data.nick).toBe('Majenayu');
  });
});

describe('ranked', () => {
  it('moves the rating and records games and wins', async () => {
    const p = await fresh();
    expect(p.data.ranked.rating).toBe(RANKED_START);
    const w = p.recordRanked(true);
    expect(w.delta).toBe(16);
    const l = p.recordRanked(false);
    expect(l.delta).toBeLessThan(0);
    expect(p.data.ranked.games).toBe(2);
    expect(p.data.ranked.wins).toBe(1);
    expect(p.data.ranked.best).toBe(1016);
  });
  it('old saves get a default rating and bad values are cleaned', () => {
    const s = parseSave(JSON.stringify({ ranked: { rating: -40, games: 'x' }, market: { day: 3, bought: [1, 99, 'a'] } }))!;
    expect(s.ranked.rating).toBe(0);
    expect(s.ranked.games).toBe(0);
    expect(s.market.bought).toEqual([1]);
    expect(parseSave('{}')!.ranked.rating).toBe(RANKED_START);
  });
});

describe('market', () => {
  it('buys each offer once per day for Crowns', async () => {
    const p = await fresh();
    const now = Date.UTC(2026, 0, 5);
    const offers = p.marketToday(now);
    expect(offers.length).toBe(8);
    p.data.coins = 0;
    expect(p.buyOffer(0, now).ok).toBe(false);
    p.data.coins = 100000;
    const r = p.buyOffer(0, now);
    expect(r.ok).toBe(true);
    expect(p.data.coins).toBe(100000 - offers[0].price);
    expect(p.skillBySkillId(offers[0].skillId)).toBeDefined();
    expect(p.buyOffer(0, now).ok).toBe(false);
    expect(p.marketToday(now)[0].sold).toBe(true);
    expect(p.marketToday(now + 86_400_000)[0].sold).toBe(false);
  });
  it('sells unbound, unequipped skills and refuses the rest', async () => {
    const p = await fresh();
    const starter = p.data.skills.find((s) => s.bound);
    if (starter) expect(p.sellSkill(starter.skillId).ok).toBe(false);
    const id = randomSkillOfRank('B', Math.random);
    p.addSkill(makeInstance(id, Math.random, 'x1'));
    const coins = p.data.coins;
    const value = p.sellValue(id);
    expect(value).toBeGreaterThan(0);
    p.data.loadout.skillIds = [id];
    expect(p.sellSkill(id).ok).toBe(false);
    p.data.loadout.skillIds = [];
    expect(p.sellSkill(id).ok).toBe(true);
    expect(p.data.coins).toBe(coins + value);
    expect(p.skillBySkillId(id)).toBeUndefined();
  });
});
