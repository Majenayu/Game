import { describe, expect, it } from 'vitest';
import { BOSS_LEVELS, CHAMPION_ARENA, MAP_LIST, Sim, WEAPONS, getMap, sanitizeLoadout, toView } from './index';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const run = (sim: Sim, sec: number) => {
  for (let i = 0; i < sec * 20; i++) sim.step(0.05);
};

describe('round countdown and lobby', () => {
  it('freezes everyone for the countdown, then lets them move and the clock tick', () => {
    const sim = new Sim(seeded(), { mode: 'dm', mapId: 'neon', seats: 2, countdown: 3 });
    const me = sim.addPlayer('me', 'Me');
    sim.rebalanceBots();
    sim.startRound();
    const x0 = me.x;
    const t0 = sim.timeLeft;
    sim.applyInput('me', { moveX: 1, moveY: 0, aim: 0, shooting: true, seq: 1, skill: 0 });
    run(sim, 2);
    expect(me.x).toBe(x0);
    expect(sim.bullets.length).toBe(0);
    expect(sim.timeLeft).toBe(t0);
    expect(toView(me, sim).hold).toBeGreaterThan(0.5);
    run(sim, 1.5);
    expect(me.x).not.toBe(x0);
    expect(sim.timeLeft).toBeLessThan(t0);
    expect(toView(me, sim).hold).toBe(0);
  });
  it('lobby holds the match until release, and a held player is safe', () => {
    const sim = new Sim(seeded(), { mode: 'dm', mapId: 'neon', seats: 2 });
    const me = sim.addPlayer('me', 'Me');
    sim.rebalanceBots();
    sim.lobby(25);
    run(sim, 5);
    expect(sim.frozenFor).toBeGreaterThan(19);
    sim.release(3);
    expect(sim.frozenFor).toBeLessThanOrEqual(3);
    run(sim, 3.1);
    sim.holdPlayer('me', 10);
    me.hp = 1;
    (sim as any).hurt(me, 'x', 5);
    expect(me.alive).toBe(true);
  });
});

describe('teams start on opposite sides', () => {
  it('puts team 0 on the left and team 1 on the right', () => {
    const sim = new Sim(seeded(4), { mode: 'tdm', mapId: 'neon', seats: 4 });
    sim.addPlayer('me', 'Me');
    sim.rebalanceBots();
    sim.startRound();
    for (const p of sim.players.values()) {
      if (p.team === 0) expect(p.x).toBeLessThan(600);
      else expect(p.x).toBeGreaterThan(1000);
    }
  });
});

describe('weapons and accessories', () => {
  it('sanitizes weapon and accessory ids', () => {
    expect(sanitizeLoadout({ weapon: 2, acc: 3 }).weapon).toBe(2);
    expect(sanitizeLoadout({ weapon: 99, acc: -1 })).toMatchObject({ weapon: 0, acc: 0 });
  });
  it('each weapon fires its own pattern', () => {
    for (const w of WEAPONS) {
      const sim = new Sim(seeded(), { mode: 'dm', mapId: 'neon', seats: 1 });
      const me = sim.addPlayer('me', 'Me', false, { weapon: w.id });
      me.invulnUntil = 0;
      sim.applyInput('me', { moveX: 0, moveY: 0, aim: 0, shooting: true, seq: 1, skill: 0 });
      sim.step(0.05);
      expect(sim.bullets.length).toBe(w.pellets);
      expect(sim.bullets[0].dmg).toBe(w.dmg);
    }
  });
});

describe('hp, boss forms and domain expansion', () => {
  it('uses HP bars: hearts x 100, more with player level', () => {
    const sim = new Sim(seeded(), { mode: 'dm', mapId: 'neon', seats: 1 });
    const a = sim.addPlayer('a', 'A', false, { charId: 'nova' });
    const b = sim.addPlayer('b', 'B', false, { charId: 'nova', level: 26 });
    expect(a.maxHp).toBe(300);
    expect(b.maxHp).toBe(355);
    a.invulnUntil = 0;
    (sim as any).hurt(a, 'b', 1);
    expect(a.hp).toBe(200);
  });
  it('a boss changes form every 25%, never skips a form, and casts its domain at half HP', () => {
    const l = BOSS_LEVELS[0];
    const sim = new Sim(seeded(5), {
      mode: 'dm',
      mapId: 'neon',
      seats: 2,
      boss: true,
      bossHp: 10,
      bossDomain: l.bossDomain,
      bossFinal: l.bossFinal,
    });
    sim.addPlayer('me', 'Me');
    sim.rebalanceBots();
    const boss = Array.from(sim.players.values()).find((p) => p.boss)!;
    const hit = (n: number) => {
      boss.invulnUntil = 0;
      sim.pauseUntil = 0;
      (sim as any).hurt(boss, 'me', n);
    };
    hit(50);
    expect(boss.hp).toBe(750);
    expect(boss.form).toBe(1);
    hit(10);
    expect(boss.form).toBe(2);
    expect(sim.domain?.name).toBe(l.bossDomain!.name);
    hit(10);
    expect(boss.form).toBe(3);
    expect(boss.armor).toBeGreaterThan(0.5);
    const before = boss.hp;
    hit(1);
    expect(before - boss.hp).toBeLessThan(50);
    const ev = sim.drainEvents().filter((e) => e.t === 'form');
    expect(ev.length).toBe(3);
  });
  it('Majen in his final form hits for huge damage and shrugs off hits', () => {
    const m = BOSS_LEVELS[8];
    expect(m.bossFinal!.dmg).toBeGreaterThanOrEqual(50);
    expect(m.bossFinal!.armor).toBeGreaterThanOrEqual(0.9);
    expect(m.bossDomain!.effect).toBe('all');
  });
});

describe('training ground and champion', () => {
  it('training dummies never attack and you cannot be knocked out', () => {
    const sim = new Sim(seeded(2), { mode: 'dm', mapId: 'neon', seats: 4, training: true });
    const me = sim.addPlayer('me', 'Me');
    sim.rebalanceBots();
    run(sim, 10);
    expect(sim.bullets.filter((b) => b.owner !== 'me').length).toBe(0);
    me.invulnUntil = 0;
    (sim as any).hurt(me, 'x', 99);
    expect(me.alive).toBe(true);
  });
  it('Majen fights alone in an empty arena that is not in the normal rotation', () => {
    const l = BOSS_LEVELS[8];
    expect(l.bots).toBe(1);
    expect(l.map).toBe('throne');
    expect(getMap('throne').obstacles.length).toBe(0);
    expect(MAP_LIST.includes(CHAMPION_ARENA)).toBe(false);
  });
});
