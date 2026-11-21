import { describe, expect, it } from 'vitest';
import {
  BOSS_UNIQUE_FIRST,
  CLASSES,
  Sim,
  UNIQUES,
  SIGNATURES,
  CREATURE_TOTAL,
  GEAR_SLOTS,
  GEAR_TOTAL,
  RANKS,
  WORLDS,
  bossUniques,
  combatFromSheet,
  fuse,
  getCreature,
  getGear,
  getSkill,
  guildBuff,
  guildLevel,
  levelSheet,
  levelUpGains,
  makeInstance,
  playerStats,
  randomGear,
  randomSkillOfRank,
  rollCreature,
  worldOfLevel,
} from './index';

const seeded = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
};

describe('boss form change pause', () => {
  it('freezes the whole battle: bots, bullets and the timer stop', () => {
    const sim = new Sim(seeded(5), { mode: 'dm', mapId: 'neon', boss: true, bossHp: 20, botLevel: 50 });
    sim.addPlayer('me', 'Me', false);
    sim.addPlayer('b', 'Boss', true, { boss: true });
    for (let i = 0; i < 200; i++) sim.step(1 / 30);
    sim.pauseUntil = sim.time + 2;
    const before = JSON.stringify([sim.timeLeft, [...sim.players.values()].map((p) => [p.x, p.y, p.hp]), sim.bullets.map((b) => [b.x, b.y])]);
    for (let i = 0; i < 30; i++) sim.step(1 / 30);
    const after = JSON.stringify([sim.timeLeft, [...sim.players.values()].map((p) => [p.x, p.y, p.hp]), sim.bullets.map((b) => [b.x, b.y])]);
    expect(after).toBe(before);
  });
  it('bots wear a random outfit and players show their gear', () => {
    const sim = new Sim(seeded(6), { mode: 'dm', mapId: 'neon', botLevel: 400 });
    sim.addPlayer('me', 'Me', false, { gear: [randomGear('S', seeded(2), 'hat')] });
    sim.addPlayer('b1', 'Bot', true);
    expect(sim.players.get('me')!.look.split(',').length).toBe(1);
    expect(sim.players.get('b1')!.look.length).toBeGreaterThan(0);
  });
});

describe('level 1000 progression', () => {
  it('every level raises every stat and level 1 defence blocks nothing', () => {
    const a = levelSheet(1);
    const b = levelSheet(1000);
    for (const k of Object.keys(a) as Array<keyof typeof a>) expect(b[k]).toBeGreaterThan(a[k]);
    const g = levelUpGains(72);
    for (const v of Object.values(g)) expect(v).toBeGreaterThan(0);
    expect(combatFromSheet(a).maxHp).toBeLessThan(combatFromSheet(b).maxHp);
  });
});

describe('gear', () => {
  it('has thousands of items over 8 slots and higher ranks give bigger buffs', () => {
    expect(GEAR_SLOTS.length).toBe(8);
    expect(GEAR_TOTAL).toBeGreaterThanOrEqual(10000);
    const rng = seeded(4);
    const low = getGear(randomGear('F', rng, 'sword'));
    const high = getGear(randomGear('U', rng, 'sword'));
    expect(low.slot).toBe('sword');
    expect(high.rank).toBe('U');
    expect(high.price).toBeGreaterThan(low.price);
    const sum = (b: Record<string, number>) => Object.values(b).reduce((x, y) => x + y, 0);
    expect(sum(high.bonus as unknown as Record<string, number>)).toBeGreaterThan(sum(low.bonus as unknown as Record<string, number>));
  });
  it('gear raises the player stats', () => {
    const bare = playerStats({ level: 10, gear: [] });
    const geared = playerStats({ level: 10, gear: [randomGear('S', seeded(9), 'gloves')] });
    expect(geared.combat.atkMul).toBeGreaterThanOrEqual(bare.combat.atkMul);
    expect(JSON.stringify(geared.bonus)).not.toBe(JSON.stringify(bare.bonus));
  });
});

describe('fusion recipes', () => {
  it('the same two skills always give the same result and never a lower rank', () => {
    const rng = seeded(1);
    for (let i = 0; i < 60; i++) {
      const rank = RANKS[1 + (i % 5)];
      const a = makeInstance(randomSkillOfRank(rank, rng), rng, 'a');
      const b = makeInstance(randomSkillOfRank(rank, rng), rng, 'b');
      if (a.skillId === b.skillId) continue;
      a.level = b.level = 30;
      const r1 = fuse(a, b);
      const r2 = fuse({ ...b, uid: 'c' }, { ...a, uid: 'd' });
      if (!r1.ok) continue;
      expect(r2.skillId).toBe(r1.skillId);
      expect(RANKS.indexOf(r1.rank!)).toBeGreaterThanOrEqual(RANKS.indexOf(rank));
    }
  });
  it('S + S can (rarely) forge a unique', () => {
    let uniques = 0;
    const rng = seeded(77);
    for (let i = 0; i < 1500; i++) {
      const a = { ...makeInstance(randomSkillOfRank('S', rng), rng, 'a'), level: 30 };
      const b = { ...makeInstance(randomSkillOfRank('S', rng), rng, 'b'), level: 30 };
      if (a.skillId === b.skillId) continue;
      const r = fuse(a, b);
      if (r.ok && r.rank === 'U') uniques++;
    }
    expect(uniques).toBeGreaterThan(0);
    expect(uniques).toBeLessThan(150);
  });
});

describe('campaign worlds', () => {
  it('8 maps of 11 nodes, each boss owns its own uniques', () => {
    expect(WORLDS.length).toBe(8);
    expect(worldOfLevel(1)).toEqual({ world: 0, index: 0 });
    expect(worldOfLevel(11)).toEqual({ world: 0, index: 10 });
    expect(worldOfLevel(12).world).toBe(1);
    const seen = new Set<number>();
    for (let w = 0; w < 8; w++) {
      const list = bossUniques(w);
      expect(list.length).toBeGreaterThan(0);
      for (const id of list) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
        expect(getSkill(id).rank).toBe('U');
      }
    }
    expect(BOSS_UNIQUE_FIRST).toBeGreaterThan(0);
  });
});

describe('new unique skills', () => {
  it('every new unique has a signature effect', () => {
    for (const n of ["Executioner's Verdict", 'Soul Harvest', 'Meteor Judgement', 'Absolute Zero']) {
      expect(UNIQUES.some((u) => u.name === n)).toBe(true);
      expect(SIGNATURES[n]).toBeDefined();
    }
  });
});

describe('guild buffs and summons', () => {
  it('five classes give Harmony, five of one class give Legion, and buffs grow with guild level', () => {
    const ids = CLASSES.map((c) => c.id);
    const five = ids.slice(0, 5);
    const mix = guildBuff(five, 1);
    const same = guildBuff([ids[0], ids[0], ids[0], ids[0], ids[0]], 1);
    expect(mix.lines.join(' ')).toMatch(/Harmony/);
    expect(same.lines.join(' ')).toMatch(/Legion/);
    const sum = (b: Record<string, number>) => Object.values(b).reduce((x, y) => x + y, 0);
    const hi = guildBuff(five, 10);
    expect(sum(hi.bonus as unknown as Record<string, number>)).toBeGreaterThan(sum(mix.bonus as unknown as Record<string, number>));
    expect(guildLevel(0)).toBe(1);
    expect(guildLevel(1_000_000)).toBeGreaterThan(1);
  });
  it('summon creatures are generated in hundreds and roll deterministically', () => {
    expect(CREATURE_TOTAL).toBeGreaterThanOrEqual(700);
    const id = rollCreature(seeded(3));
    expect(rollCreature(seeded(3))).toBe(id);
    expect(getCreature(id).name.length).toBeGreaterThan(0);
  });
});
