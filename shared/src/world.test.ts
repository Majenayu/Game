import { describe, expect, it } from 'vitest';
import {
  BOSS_FIGHTS,
  BOSS_LEVELS,
  EMOTES,
  Sim,
  eloUpdate,
  isEmoteId,
  marketOffers,
  rankOf,
  rankedTier,
  sellPrice,
  buyPrice,
  usableInBattle,
} from './index';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('boss tower', () => {
  it('has the eight bosses plus Majen, each with five usable unique skills', () => {
    expect(BOSS_FIGHTS.length).toBe(9);
    expect(BOSS_FIGHTS[8].name).toBe('Majen');
    for (const l of BOSS_LEVELS) {
      expect(l.bossKit?.length).toBe(5);
      for (const id of l.bossKit ?? []) {
        expect(rankOf(id)).toBe('U');
        expect(usableInBattle(id)).toBe(true);
      }
    }
  });
  it('spawns the named boss with its HP, colour and kit', () => {
    const l = BOSS_LEVELS[8];
    const sim = new Sim(seeded(3), {
      mode: 'dm',
      mapId: l.map,
      seats: l.bots + 1,
      botSkill: l.skill,
      autoRestart: false,
      boss: true,
      bossName: l.bossName,
      bossHp: l.bossHp,
      bossColor: l.bossColor,
      bossKit: l.bossKit,
    });
    sim.addPlayer('h', 'Hero');
    sim.rebalanceBots();
    const boss = Array.from(sim.players.values()).find((p) => p.boss)!;
    expect(boss.name).toBe('Majen');
    expect(boss.maxHp).toBe(36);
    expect(boss.color).toBe(0xffc93c);
    expect(boss.slots.map((s) => s.skillId)).toEqual(l.bossKit);
    for (let i = 0; i < 20 * 20; i++) sim.step(0.05);
    expect(Number.isFinite(boss.x)).toBe(true);
  });
});

describe('social and ranked', () => {
  it('validates emote ids', () => {
    expect(isEmoteId(0)).toBe(true);
    expect(isEmoteId(EMOTES.length)).toBe(false);
    expect(isEmoteId(-1)).toBe(false);
    expect(isEmoteId('1')).toBe(false);
    expect(isEmoteId(1.5)).toBe(false);
  });
  it('moves ratings like Elo and names tiers', () => {
    expect(eloUpdate(1000, 1000, 1)).toBe(1016);
    expect(eloUpdate(1000, 1000, 0)).toBe(984);
    expect(eloUpdate(1000, 1400, 1)).toBeGreaterThan(1025);
    expect(eloUpdate(5, 1000, 0)).toBeGreaterThanOrEqual(0);
    expect(rankedTier(1000).name).toBe('Bronze');
    expect(rankedTier(1300).name).toBe('Gold');
    expect(rankedTier(2000).name).toBe('Starforged');
  });
  it('prices skills by rank and keeps daily stock stable without uniques', () => {
    const a = marketOffers(20000);
    expect(a).toEqual(marketOffers(20000));
    expect(a).not.toEqual(marketOffers(20001));
    for (const o of a) {
      expect(rankOf(o.skillId)).not.toBe('U');
      expect(o.price).toBe(buyPrice(o.skillId));
      expect(o.price).toBeGreaterThan(sellPrice(o.skillId, 1));
    }
    const id = a[0].skillId;
    expect(sellPrice(id, 5)).toBeGreaterThan(sellPrice(id, 1));
  });
});
