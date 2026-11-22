import { describe, expect, it } from 'vitest';
import { MemoryKV } from '../src/core/storage';
import {
  addAvatar,
  applyMatch,
  checkSeason,
  chooseStarter,
  claimQuest,
  claimStreak,
  cleanName,
  eloDelta,
  giveXp,
  newProfile,
  PROFILE_SCHEMA,
  rankTier,
  refreshQuests,
  rivals,
  squadAvatars,
  squadClash,
  specFor,
  touchStreak,
  unlockElement,
  ELEMENT_PRICE,
  type MatchSummary,
} from '../src/meta/profile';
import { SaveManager } from '../src/meta/save';
import { powersFor } from '../src/content/powers';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 10, 12);
const win: MatchSummary = { mode: 'champion', win: true, roundsWon: 2, kos: 2, falls: 0, hits: 40, powers: 6, perfect: 1, swaps: 2, damage: 1500, powerUse: { fire1: 6 } };

describe('profile', () => {
  it('starter gives a full squad of two of the free element, and only that element', () => {
    const p = newProfile('A', T0);
    chooseStarter(p, 'ice');
    expect(p.unlocked).toEqual(['ice']);
    expect(squadAvatars(p).map((a) => a.element)).toEqual(['ice', 'ice']);
    expect(addAvatar(p, 'fire')).toBeNull();
  });

  it('levels up with unlock messages and stops at 50', () => {
    const p = newProfile('A', T0);
    chooseStarter(p, 'fire');
    const a = p.avatars[0]!;
    const lu = giveXp(a, 2000);
    expect(lu!.to).toBeGreaterThanOrEqual(8);
    expect(lu!.unlocks.some((u) => u.includes('Scorch Dash'))).toBe(true);
    giveXp(a, 10_000_000);
    expect(a.level).toBe(50);
    expect(giveXp(a, 100)).toBeNull();
  });

  it('match rewards: coins, XP, stats and quest progress', () => {
    const p = newProfile('A', T0);
    chooseStarter(p, 'fire');
    refreshQuests(p, T0);
    const coins = p.coins;
    const r = applyMatch(p, { ...win }, squadAvatars(p));
    expect(p.coins).toBe(coins + r.coins);
    expect(p.stats.wins).toBe(1);
    const all = [...p.quests.daily, ...p.quests.weekly];
    expect(all.length).toBe(8);
    expect(all.some((q) => q.progress > 0)).toBe(true);
  });

  it('quests can only be claimed once, when complete', () => {
    const p = newProfile('A', T0);
    refreshQuests(p, T0);
    const q = p.quests.daily[0]!;
    expect(claimQuest(p, q.id)).toBeNull();
    q.progress = 1e9;
    expect(claimQuest(p, q.id)).not.toBeNull();
    expect(claimQuest(p, q.id)).toBeNull();
  });

  it('7-day streak counts up, resets after a missed day, pays once per day', () => {
    const p = newProfile('A', T0);
    expect(claimStreak(p, T0)).toBe(50);
    expect(claimStreak(p, T0 + 1000)).toBe(0);
    expect(claimStreak(p, T0 + DAY)).toBe(75);
    expect(touchStreak(p, T0 + 3 * DAY)).toBe(50);
  });

  it('ranked: Elo moves both ways, tiers, season reset halves the gain', () => {
    expect(eloDelta(1000, 1000, true)).toBe(16);
    expect(eloDelta(1000, 1000, false)).toBe(-16);
    expect(rankTier(1000).name).toBe('Bronze');
    expect(rankTier(1700).name).toBe('Champion');
    const p = newProfile('A', T0);
    p.ranked.rating = 1400;
    p.ranked.matches = 3;
    const reward = checkSeason(p, T0 + 40 * DAY);
    expect(reward).toBeGreaterThan(0);
    expect(p.ranked.rating).toBe(1200);
    expect(rivals(T0).length).toBe(25);
  });

  it('element unlock costs coins and cannot be bought twice', () => {
    const p = newProfile('A', T0);
    p.coins = ELEMENT_PRICE;
    expect(unlockElement(p, 'time', true)).toBe(true);
    expect(p.coins).toBe(0);
    expect(unlockElement(p, 'time', true)).toBe(false);
  });

  it('names are cleaned', () => {
    expect(cleanName('  <b>Zed</b>!!  ')).toBe('bZedb');
    expect(cleanName('A very long name indeed')).toHaveLength(12);
  });
});

describe('fighting styles', () => {
  it('a v1 save without styles migrates: same-element avatars get different styles, and it loads', () => {
    const kv = new MemoryKV();
    const s = new SaveManager(kv, PROFILE_SCHEMA, 'ek');
    const p = newProfile('Old', T0) as unknown as Record<string, unknown>;
    chooseStarter(p as unknown as Parameters<typeof chooseStarter>[0], 'fire');
    // write a version-1 body by hand, the way the old game saved it
    const v1 = { ...p, version: 1, avatars: (p.avatars as Record<string, unknown>[]).map(({ archetype: _drop, ...rest }) => rest) };
    const body = JSON.stringify(v1);
    let h = 2166136261;
    for (let i = 0; i < body.length; i++) h = Math.imul(h ^ body.charCodeAt(i), 16777619);
    kv.setItem('ek.profile1', JSON.stringify({ sum: h >>> 0, body }));
    const loaded = s.read(1)!.data;
    expect(loaded.version).toBe(2);
    expect(loaded.avatars.map((a) => a.archetype)).toEqual(['classic', 'striker']);
    expect(squadClash(loaded)).toBe(false);
  });

  it('starter squad has two different power sets; the clash check works', () => {
    const p = newProfile('A', T0);
    chooseStarter(p, 'water');
    const [a, b] = squadAvatars(p);
    expect(a!.archetype).not.toBe(b!.archetype);
    expect(squadClash(p)).toBe(false);
    b!.archetype = a!.archetype;
    expect(squadClash(p)).toBe(true);
  });

  it('a new avatar defaults to the style the roster has least of', () => {
    const p = newProfile('A', T0);
    chooseStarter(p, 'leaf');
    expect(addAvatar(p, 'leaf')!.archetype).toBe('warden');
  });

  it('two same-element avatars with different styles get different powers in the sim', () => {
    const p = newProfile('A', T0);
    chooseStarter(p, 'ice');
    const [a, b] = squadAvatars(p).map((x) => specFor(x));
    expect(a!.archetype).not.toBe(b!.archetype);
    const names = (s: typeof a) => powersFor(s!.element, s!.archetype).map((m) => m.name);
    expect(names(a).some((n) => names(b).includes(n))).toBe(false);
  });
});

describe('save', () => {
  it('round-trips, keeps a backup, survives a corrupt main copy', () => {
    const kv = new MemoryKV();
    const s = new SaveManager(kv, PROFILE_SCHEMA, 'ek');
    const p = newProfile('A', T0);
    chooseStarter(p, 'leaf');
    s.write(1, p);
    p.coins = 999;
    s.write(1, p);
    expect(s.read(1)!.data.coins).toBe(999);
    kv.setItem('ek.profile1', '{broken');
    const r = s.read(1)!;
    expect(r.fromBackup).toBe(true);
    expect(r.data.avatars.length).toBe(2);
  });

  it('save codes round-trip and reject damage', () => {
    const s = new SaveManager(new MemoryKV(), PROFILE_SCHEMA, 'ek');
    const p = newProfile('A', T0);
    chooseStarter(p, 'earth');
    const code = s.exportCode(p);
    expect(code.startsWith('EK1.')).toBe(true);
    expect(s.importCode(code).avatars[0]!.element).toBe('earth');
    expect(() => s.importCode(code.slice(0, -2) + 'zz')).toThrow();
    expect(() => s.importCode('nonsense')).toThrow();
  });
});
