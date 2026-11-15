import { describe, expect, it } from 'vitest';
import {
  RANKS,
  type Rank,
  firstIdOfRank,
  getSkill,
  neutralInstance,
  skillCount,
  slotFromInstance,
  usableInBattle,
  type Kind,
  CHARACTERS,
  COLORS,
  EFFECT_LIST,
  LEVELS,
  MAPS,
  MAP_LIST,
  MAX_PLAYERS,
  MODES,
  MODE_LIST,
  MODS,
  PLAYER_RADIUS,
  POWERUP_TOTAL,
  RARITIES,
  RESPAWN_DELAY,
  SCOREBOARD_TIME,
  Sim,
  movePlayer,
  pointInRect,
  powerupFromId,
  powerupId,
  powerupName,
  rollPowerup,
  sanitizeInput,
  sanitizeLoadout,
  sanitizeNick,
  type PlayerInput,
  type SimConfig,
} from './index';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({
  moveX: 0,
  moveY: 0,
  aim: 0,
  shooting: false,
  seq: 1,
  skill: 0,
  ...o,
});

function run(sim: Sim, seconds: number) {
  for (let i = 0; i < seconds * 20; i++) sim.step(0.05);
}

/** Two players placed on a clear row so that a shoots b. */
function duel(cfg: Partial<SimConfig> = {}) {
  const sim = new Sim(seeded(), { seats: 2, mapId: 'neon', ...cfg });
  const a = sim.addPlayer('a', 'A');
  const b = sim.addPlayer('b', 'B');
  a.x = 300;
  a.y = 800;
  b.x = 500;
  b.y = 800;
  a.invulnUntil = 0;
  b.invulnUntil = 0;
  return { sim, a, b };
}

describe('util', () => {
  it('keeps players inside the world and out of obstacles', () => {
    let p = { x: 100, y: 100 };
    for (let i = 0; i < 400; i++) p = movePlayer(p.x, p.y, 1, 1, 0.05);
    expect(p.x).toBeLessThanOrEqual(1600 - PLAYER_RADIUS);
    expect(p.y).toBeLessThanOrEqual(900 - PLAYER_RADIUS);
    for (const o of MAPS.neon.obstacles) expect(pointInRect(p.x, p.y, o)).toBe(false);
  });

  it('does not let a player walk through the centre block', () => {
    let p = { x: 500, y: 450 };
    for (let i = 0; i < 100; i++) p = movePlayer(p.x, p.y, 1, 0, 0.05);
    expect(p.x).toBeLessThan(700);
  });

  it('sanitizes nicknames', () => {
    expect(sanitizeNick('<b>Bob</b>')).toBe('Bob');
    expect(sanitizeNick('  A   B  ')).toBe('A B');
    expect(sanitizeNick('x'.repeat(40)).length).toBe(16);
    expect(sanitizeNick('fuckface')).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d+$/);
    expect(sanitizeNick(undefined)).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d+$/);
  });

  it('validates and clamps input', () => {
    expect(sanitizeInput(null)).toBeNull();
    expect(sanitizeInput({ moveX: NaN, moveY: 0, aimAngle: 0, shooting: true, seq: 1 })).toBeNull();
    expect(sanitizeInput({ moveX: 'a', moveY: 0, aimAngle: 0, shooting: true, seq: 1 })).toBeNull();
    const ok = sanitizeInput({ moveX: 50, moveY: -50, aimAngle: 10, shooting: 1, seq: 3, skill: 7 })!;
    expect(ok.moveX).toBe(1);
    expect(ok.moveY).toBe(-1);
    expect(Math.abs(ok.aim)).toBeLessThanOrEqual(Math.PI);
    expect(ok.shooting).toBe(false);
    expect(ok.skill).toBe(3);
  });
});

describe('content', () => {
  it('offers 1008 unique powerups with stable ids and names', () => {
    expect(POWERUP_TOTAL).toBe(EFFECT_LIST.length * RARITIES.length * MODS.length);
    expect(POWERUP_TOTAL).toBe(1008);
    const names = new Set<string>();
    for (let i = 0; i < POWERUP_TOTAL; i++) {
      const p = powerupFromId(i)!;
      expect(powerupId(p)).toBe(i);
      names.add(powerupName(p));
    }
    expect(names.size).toBe(POWERUP_TOTAL);
    expect(powerupFromId(POWERUP_TOTAL)).toBeNull();
    expect(powerupFromId(-1)).toBeNull();
  });

  it('rolls powerups with every rarity eventually', () => {
    const rng = seeded(9);
    const seen = new Set<number>();
    for (let i = 0; i < 4000; i++) seen.add(rollPowerup(rng).rarity);
    expect(seen.size).toBe(RARITIES.length);
  });

  it('sanitizes loadouts', () => {
    expect(sanitizeLoadout(null).char).toBe('nova');
    const a = idOfKind('projectile', 'C');
    const b = idOfKind('shield', 'C');
    const world = idOfKind('world', 'C');
    const l = sanitizeLoadout({
      char: 'titan',
      skillIds: [a, b, a, world, -4, 'x', 99999999],
      color: 5,
      trail: 99,
      bfx: 2,
    });
    expect(l.char).toBe('titan');
    expect(l.skillIds).toEqual([a, b]);
    expect(l.trail).toBe(0);
    expect(sanitizeLoadout({ char: 'hax', skillIds: 'nope' }).skillIds).toEqual([]);
    // the casual budget stops a client from claiming five legendary skills
    const legends = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => firstIdOfRank('S') + i).filter(usableInBattle);
    expect(sanitizeLoadout({ skillIds: legends }).skillIds.length).toBeLessThan(5);
    expect(COLORS.length).toBeGreaterThanOrEqual(16);
  });
  it('has sane maps and levels', () => {
    for (const m of MAP_LIST) {
      for (const o of [...m.obstacles, ...m.hazards]) {
        expect(o.x).toBeGreaterThanOrEqual(0);
        expect(o.y).toBeGreaterThanOrEqual(0);
        expect(o.x + o.w).toBeLessThanOrEqual(1600);
        expect(o.y + o.h).toBeLessThanOrEqual(900);
      }
      for (const o of m.obstacles) expect(pointInRect(m.hill.x, m.hill.y, o)).toBe(false);
    }
    for (const l of LEVELS) {
      expect(MAPS[l.map]).toBeDefined();
      expect(MODES[l.mode]).toBeDefined();
      expect(l.bots).toBeGreaterThan(0);
    }
    expect(LEVELS.length).toBe(12);
  });
});

describe('Sim basics', () => {
  it('fills seats with bots and replaces them with humans', () => {
    const sim = new Sim(seeded());
    sim.rebalanceBots();
    expect(sim.players.size).toBe(MAX_PLAYERS);
    sim.addPlayer('h1', 'Alice');
    sim.rebalanceBots();
    expect(sim.players.size).toBe(MAX_PLAYERS);
    expect(sim.humanCount).toBe(1);
    sim.removePlayer('h1');
    sim.rebalanceBots();
    expect(sim.botCount).toBe(MAX_PLAYERS);
  });

  it('damages, kills, scores and respawns', () => {
    const { sim, a, b } = duel();
    sim.applyInput('a', input({ shooting: true }));
    run(sim, 1.5);
    expect(b.alive).toBe(false);
    expect(a.kills).toBe(1);
    expect(a.score).toBe(1);
    expect(b.deaths).toBe(1);
    run(sim, RESPAWN_DELAY + 0.2);
    expect(b.alive).toBe(true);
    expect(b.hp).toBe(b.maxHp);
    expect(b.invulnUntil).toBeGreaterThan(sim.time);
  });

  it('ignores damage while invulnerable', () => {
    const { sim, b } = duel();
    b.invulnUntil = 999;
    sim.applyInput('a', input({ shooting: true }));
    run(sim, 2);
    expect(b.hp).toBe(b.maxHp);
  });

  it('runs rounds: play, scoreboard, then restarts in the same room', () => {
    const sim = new Sim(seeded(7));
    sim.addPlayer('h', 'Human');
    sim.rebalanceBots();
    run(sim, MODES.dm.roundTime + 0.2);
    expect(sim.phase).toBe('scoreboard');
    expect(sim.round).toBe(1);
    run(sim, SCOREBOARD_TIME + 0.2);
    expect(sim.phase).toBe('play');
    expect(sim.round).toBe(2);
    expect(sim.players.size).toBe(MAX_PLAYERS);
    for (const p of sim.players.values()) expect(p.kills).toBe(0);
  });

  it('bots fight each other and score over a round', () => {
    const sim = new Sim(seeded(3));
    sim.rebalanceBots();
    run(sim, 60);
    const total = Array.from(sim.players.values()).reduce((s, p) => s + p.kills, 0);
    expect(total).toBeGreaterThan(0);
  });
});

describe('powerups', () => {
  it('spawns a pickup and grants a timed effect', () => {
    const sim = new Sim(seeded(5), { seats: 1 });
    const a = sim.addPlayer('a', 'A');
    run(sim, 9.2);
    expect(sim.pickups.length).toBe(1);
    const pu = sim.pickups[0].pu;
    a.x = sim.pickups[0].x;
    a.y = sim.pickups[0].y;
    sim.step(0.05);
    expect(sim.pickups.length).toBe(0);
    const instant = pu.effect === 'heal' || pu.effect === 'shield';
    expect(instant || a.effects.length === 1).toBe(true);
  });

  it('applies triple shot, rapid, shield and heal as designed', () => {
    const { sim, a } = duel();
    a.effects.push({ effect: 'triple', rarity: 0, until: 999, power: 1 });
    sim.applyInput('a', input({ shooting: true }));
    sim.step(0.05);
    expect(sim.bullets.length).toBe(3);

    const d2 = duel();
    d2.b.shieldHits = 2;
    d2.sim.applyInput('a', input({ shooting: true }));
    run(d2.sim, 0.9);
    expect(d2.b.hp).toBe(d2.b.maxHp);
    expect(d2.b.shieldHits).toBe(0);

    const d3 = duel();
    d3.a.effects.push({ effect: 'overdrive', rarity: 0, until: 999, power: 1 });
    d3.sim.applyInput('a', input({ shooting: true }));
    run(d3.sim, 0.6);
    expect(d3.b.hp).toBeLessThanOrEqual(d3.b.maxHp - 2);
  });

  it('pierce lets a bullet hit two targets', () => {
    const sim = new Sim(seeded(), { seats: 3 });
    const a = sim.addPlayer('a', 'A');
    const b = sim.addPlayer('b', 'B');
    const c = sim.addPlayer('c', 'C');
    [a, b, c].forEach((p) => (p.invulnUntil = 0));
    a.x = 300;
    a.y = 800;
    b.x = 450;
    b.y = 800;
    c.x = 600;
    c.y = 800;
    a.effects.push({ effect: 'pierce', rarity: 0, until: 999, power: 1 });
    sim.applyInput('a', input({ shooting: true }));
    sim.step(0.05);
    run(sim, 0.6);
    expect(b.hp).toBeLessThan(b.maxHp);
    expect(c.hp).toBeLessThan(c.maxHp);
  });
});

const kindCache = new Map<string, number>();
function idOfKind(kind: Kind, rank: Rank = 'C'): number {
  const key = kind + rank;
  const hit = kindCache.get(key);
  if (hit !== undefined) return hit;
  const start = firstIdOfRank(rank);
  for (let k = 0; k < skillCount(rank); k++) {
    if (getSkill(start + k).kind === kind) {
      kindCache.set(key, start + k);
      return start + k;
    }
  }
  throw new Error('no skill of kind ' + kind);
}

/** Two players in the open: a (with the given skills) at the left, b 200 units to the right. */
function skillDuel(skillIds: number[]) {
  const sim = new Sim(seeded(), { seats: 2, mapId: 'neon' });
  const a = sim.addPlayer('a', 'A', false, { skillIds });
  const b = sim.addPlayer('b', 'B');
  a.slots = skillIds.map((id) => slotFromInstance(neutralInstance(id)));
  a.x = 300;
  a.y = 800;
  b.x = 500;
  b.y = 800;
  a.invulnUntil = 0;
  b.invulnUntil = 0;
  b.slots = [];
  return { sim, a, b };
}

/** Runs and returns the lowest HP the player reached (respawns reset HP). */
function lowestHp(sim: Sim, p: { hp: number }, seconds: number): number {
  let low = p.hp;
  for (let i = 0; i < seconds * 20; i++) {
    sim.step(0.05);
    low = Math.min(low, p.hp);
  }
  return low;
}

function cast(sim: Sim, slot = 0, aim = 0) {
  sim.applyInput('a', input({ aim, skill: 1 << slot, seq: 1 }));
}

describe('skills in battle', () => {
  const ATTACKS: Kind[] = ['projectile', 'beam', 'volley', 'nova', 'cleave', 'ambush'];
  for (const kind of ATTACKS) {
    it(`${kind} hurts an enemy in range`, () => {
      const { sim, b } = skillDuel([idOfKind(kind, 'C')]);
      if (kind === 'cleave') b.x = 360;
      cast(sim);
      expect(lowestHp(sim, b, 1.4)).toBeLessThan(b.maxHp);
    });
  }

  it('shield makes you invulnerable and heal restores HP', () => {
    const s = skillDuel([idOfKind('shield')]);
    cast(s.sim);
    run(s.sim, 0.3);
    expect(s.a.invulnUntil).toBeGreaterThan(s.sim.time);
    const h = skillDuel([idOfKind('heal')]);
    h.a.hp = 1;
    cast(h.sim);
    run(h.sim, 1);
    expect(h.a.hp).toBeGreaterThan(1);
  });

  it('barrier, aura, slow and pull create zones', () => {
    for (const kind of ['barrier', 'aura', 'slow', 'pull'] as Kind[]) {
      const { sim } = skillDuel([idOfKind(kind)]);
      cast(sim);
      run(sim, 1);
      expect(sim.zones.length).toBe(1);
    }
  });

  it('a barrier blocks enemy bullets', () => {
    const { sim, a, b } = skillDuel([idOfKind('barrier')]);
    b.shooting = true;
    b.aim = Math.PI;
    b.x = 700;
    b.y = 800;
    b.slots = [];
    // put the barrier right between them
    sim.applyInput('a', input({ aim: 0, skill: 1 }));
    run(sim, 1);
    expect(sim.zones[0]).toBeDefined();
    const z = sim.zones[0];
    z.x = 500;
    z.y = 800;
    z.r = 120;
    z.until = 999;
    b.shooting = true;
    sim.bullets = [];
    run(sim, 1.2);
    expect(a.hp).toBe(a.maxHp);
  });

  it('buff adds an effect, stealth hides, summon makes pets, mine places a mine', () => {
    const buff = skillDuel([idOfKind('buff')]);
    cast(buff.sim);
    run(buff.sim, 0.6);
    expect(buff.a.effects.length + buff.a.shieldHits).toBeGreaterThan(0);

    const st = skillDuel([idOfKind('stealth')]);
    cast(st.sim);
    run(st.sim, 0.3);
    expect(st.a.hiddenUntil).toBeGreaterThan(st.sim.time);

    const su = skillDuel([idOfKind('summon')]);
    cast(su.sim);
    run(su.sim, 1);
    expect(su.sim.pets.length).toBeGreaterThan(0);

    const mi = skillDuel([idOfKind('mine')]);
    cast(mi.sim);
    run(mi.sim, 0.3);
    expect(mi.sim.mines.length).toBe(1);
  });

  it('pets shoot nearby enemies', () => {
    const { sim, b } = skillDuel([idOfKind('summon', 'A')]);
    cast(sim);
    expect(lowestHp(sim, b, 6)).toBeLessThan(b.maxHp);
  });

  it('dash, blink and portal move the caster', () => {
    for (const kind of ['dash', 'blink', 'portal'] as Kind[]) {
      const { sim, a } = skillDuel([idOfKind(kind)]);
      b0(sim);
      const x0 = a.x;
      cast(sim);
      run(sim, 1);
      expect(Math.abs(a.x - x0)).toBeGreaterThan(100);
    }
  });

  it('casting costs mana and starts the cooldown, and cannot be repeated until ready', () => {
    const id = idOfKind('projectile');
    const { sim, a } = skillDuel([id]);
    const cost = a.slots[0].stats.mp;
    cast(sim);
    run(sim, 0.5);
    expect(a.mp).toBeLessThan(a.maxMp - cost + 7);
    expect(a.slots[0].cdUntil).toBeGreaterThan(sim.time);
    const bullets = sim.bullets.length;
    cast(sim);
    sim.step(0.05);
    expect(sim.bullets.length).toBeLessThanOrEqual(bullets);
  });

  it('refuses to cast without enough mana', () => {
    const { sim, a } = skillDuel([idOfKind('projectile')]);
    a.mp = 0;
    cast(sim);
    sim.step(0.05);
    expect(a.slots[0].cdUntil).toBe(0);
    expect(sim.bullets.length).toBe(0);
  });

  it('cast time delays the effect and being killed cancels it', () => {
    const { sim, a } = skillDuel([idOfKind('heal')]);
    a.hp = 1;
    cast(sim);
    sim.step(0.05);
    expect(a.castAt).toBeGreaterThan(sim.time);
    expect(a.hp).toBe(1);
    run(sim, 1);
    expect(a.hp).toBeGreaterThan(1);

    const k = skillDuel([idOfKind('heal')]);
    k.a.hp = 1;
    cast(k.sim);
    k.sim.step(0.05);
    expect(k.a.castAt).toBeGreaterThan(0);
    k.a.hp = 0;
    k.a.alive = true;
    (k.sim as any).hurt(k.a, 'b', 1);
    expect(k.a.castAt).toBe(-1);
  });

  it('world skills cannot be cast in battle', () => {
    const { sim, a } = skillDuel([idOfKind('world')]);
    cast(sim);
    run(sim, 0.5);
    expect(a.slots[0].cdUntil).toBe(0);
    expect(a.mp).toBeGreaterThan(a.maxMp - 1);
  });

  it('element status effects apply: burn damages over time, frost slows', () => {
    const start = firstIdOfRank('C');
    let burn = -1;
    let frost = -1;
    for (let k = 0; k < skillCount('C'); k++) {
      const d = getSkill(start + k);
      if (d.kind === 'projectile' && d.element === 0 && burn < 0) burn = start + k;
      if (d.kind === 'projectile' && d.element === 1 && frost < 0) frost = start + k;
      if (burn >= 0 && frost >= 0) break;
    }
    const f = skillDuel([burn]);
    cast(f.sim);
    expect(f.b.maxHp - lowestHp(f.sim, f.b, 5)).toBeGreaterThanOrEqual(2);
    const i = skillDuel([frost]);
    cast(i.sim);
    run(i.sim, 0.9);
    expect(i.b.slowUntil).toBeGreaterThan(0);
  });
});

function b0(sim: Sim) {
  const b = sim.players.get('b')!;
  b.x = 1500;
  b.y = 100;
}

describe('bots and skills', () => {
  it('every bot carries five battle skills and uses them', () => {
    const sim = new Sim(seeded(5), { botSkill: 0.8 });
    sim.addPlayer('h', 'Human');
    sim.rebalanceBots();
    for (const p of sim.players.values()) {
      if (!p.bot) continue;
      expect(p.slots.length).toBe(5);
      for (const s of p.slots) expect(s.kind).not.toBe('world');
    }
    const casts = new Map<string, number>();
    for (let i = 0; i < 20 * 40; i++) {
      sim.step(0.05);
      for (const e of sim.drainEvents())
        if (e.t === 'skill' && e.id.startsWith('bot_')) casts.set(e.id, (casts.get(e.id) ?? 0) + 1);
    }
    expect(casts.size).toBeGreaterThanOrEqual(5);
    for (const n of casts.values()) expect(n).toBeGreaterThan(0);
  });

  it('sharper bots carry higher ranks', () => {
    const avg = (skill: number) => {
      const sim = new Sim(seeded(9), { botSkill: skill });
      sim.rebalanceBots();
      let sum = 0;
      let n = 0;
      for (const p of sim.players.values()) for (const s of p.slots) ((sum += RANKS.indexOf(s.rank)), n++);
      return sum / n;
    };
    expect(avg(1)).toBeGreaterThan(avg(0.05) + 1);
  });

  it('the boss carries unique skills', () => {
    const sim = new Sim(seeded(2), { seats: 3, boss: true, autoRestart: false });
    sim.addPlayer('h', 'H');
    sim.rebalanceBots();
    const boss = Array.from(sim.players.values()).find((p) => p.boss)!;
    expect(boss.slots.length).toBe(5);
    expect(boss.slots.every((s) => s.rank === 'U')).toBe(true);
  });

  it('bots ignore a stealthed player unless they are very close', () => {
    const sim = new Sim(seeded(4), { seats: 2 });
    const h = sim.addPlayer('h', 'H');
    sim.rebalanceBots();
    const bot = Array.from(sim.players.values()).find((p) => p.bot)!;
    h.x = 200;
    h.y = 200;
    bot.x = 1200;
    bot.y = 700;
    h.hiddenUntil = 999;
    run(sim, 0.6);
    expect(bot.shooting).toBe(false);
  });
});

describe('characters', () => {
  it('characters set max HP and medic regenerates', () => {
    const sim = new Sim(seeded(), { seats: 1 });
    const t = sim.addPlayer('t', 'T', false, { charId: 'titan' });
    expect(t.maxHp).toBe(CHARACTERS.titan.hp);
    const m = sim.addPlayer('m', 'M', false, { charId: 'medic' });
    m.hp = 1;
    run(sim, 10);
    expect(m.hp).toBeGreaterThan(1);
  });

  it('setLoadout applies a validated loadout', () => {
    const sim = new Sim(seeded(), { seats: 1 });
    sim.addPlayer('a', 'A');
    const ids = [idOfKind('projectile'), idOfKind('shield')];
    sim.setLoadout('a', { char: 'bolt', skillIds: ids, color: 2, trail: 1, bfx: 1 });
    const a = sim.players.get('a')!;
    expect(a.charId).toBe('bolt');
    expect(a.maxHp).toBe(CHARACTERS.bolt.hp);
    expect(a.slots.map((s) => s.skillId)).toEqual(ids);
    sim.setLoadout('a', { skillIds: [] });
    expect(a.slots.length).toBe(5);
  });

  it('players without a loadout get a working default kit', () => {
    const sim = new Sim(seeded(), { seats: 1 });
    const a = sim.addPlayer('a', 'A');
    expect(a.slots.length).toBe(5);
    expect(a.mp).toBe(a.maxMp);
  });
});
describe('game modes', () => {
  it('every mode and map combination runs a full round with bots', () => {
    for (const mode of MODE_LIST) {
      for (const m of MAP_LIST) {
        const sim = new Sim(seeded(11), { mode, mapId: m.id });
        sim.addPlayer('h', 'Human');
        sim.rebalanceBots();
        run(sim, MODES[mode].roundTime + 0.5);
        expect(sim.phase).toBe('scoreboard');
        for (const p of sim.players.values()) {
          expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
          for (const o of m.obstacles) expect(pointInRect(p.x, p.y, o)).toBe(false);
        }
      }
    }
  });

  it('team battle splits teams evenly and counts team score', () => {
    const sim = new Sim(seeded(2), { mode: 'tdm' });
    sim.addPlayer('h1', 'H1');
    sim.addPlayer('h2', 'H2');
    sim.addPlayer('h3', 'H3');
    sim.rebalanceBots();
    const t0 = Array.from(sim.players.values()).filter((p) => p.team === 0).length;
    expect(Math.abs(t0 - (sim.players.size - t0))).toBeLessThanOrEqual(1);
    run(sim, 60);
    expect(sim.teamScore[0] + sim.teamScore[1]).toBe(
      Array.from(sim.players.values()).reduce((s, p) => s + p.kills, 0),
    );
  });

  it('teammates do not hurt each other', () => {
    const sim = new Sim(seeded(), { mode: 'tdm', seats: 2 });
    const a = sim.addPlayer('a', 'A');
    const b = sim.addPlayer('b', 'B');
    a.team = 0;
    b.team = 0;
    a.x = 300;
    a.y = 800;
    b.x = 500;
    b.y = 800;
    a.invulnUntil = 0;
    b.invulnUntil = 0;
    sim.applyInput('a', input({ shooting: true }));
    run(sim, 1.5);
    expect(b.hp).toBe(b.maxHp);
  });

  it('coin rush spawns coins and scores pickups', () => {
    const sim = new Sim(seeded(4), { mode: 'coins', mapId: 'neon', seats: 1 });
    const a = sim.addPlayer('a', 'A');
    run(sim, 3);
    expect(sim.coins.length).toBeGreaterThan(3);
    const c = sim.coins[0];
    a.x = c.x;
    a.y = c.y;
    sim.step(0.05);
    expect(a.score).toBeGreaterThanOrEqual(1);
  });

  it('hill scores only for a lone holder', () => {
    const sim = new Sim(seeded(), { mode: 'hill', mapId: 'neon', seats: 2 });
    const a = sim.addPlayer('a', 'A');
    const b = sim.addPlayer('b', 'B');
    a.x = sim.map.hill.x + 60;
    a.y = sim.map.hill.y - 80;
    b.x = 100;
    b.y = 100;
    run(sim, 3.1);
    expect(a.score).toBeGreaterThanOrEqual(2);
    expect(sim.hillHolder).toBe('a');
    b.x = sim.map.hill.x - 60;
    b.y = sim.map.hill.y - 80;
    const s = a.score;
    sim.step(0.05);
    expect(sim.hillHolder).toBe('*');
    run(sim, 2);
    expect(a.score).toBe(s);
  });

  it('lava hazards hurt players standing in them', () => {
    const sim = new Sim(seeded(), { mapId: 'lava', seats: 1 });
    const a = sim.addPlayer('a', 'A');
    a.invulnUntil = 0;
    const h = MAPS.lava.hazards[0];
    a.x = h.x + h.w / 2;
    a.y = h.y + h.h / 2;
    sim.step(0.05);
    expect(a.hp).toBe(a.maxHp - 1);
  });

  it('quick play rotates modes and maps each round', () => {
    const sim = new Sim(seeded(), { mode: 'mix', mapId: 'rotate' });
    sim.addPlayer('h', 'H');
    sim.rebalanceBots();
    const seen = new Set<string>([`${sim.mode}:${sim.map.id}`]);
    for (let i = 0; i < 4; i++) {
      run(sim, 100 + SCOREBOARD_TIME + 1);
      seen.add(`${sim.mode}:${sim.map.id}`);
    }
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });

  it('campaign boss level creates one boss with extra HP', () => {
    const sim = new Sim(seeded(), { seats: 4, boss: true, autoRestart: false });
    sim.addPlayer('h', 'H');
    sim.rebalanceBots();
    const bosses = Array.from(sim.players.values()).filter((p) => p.boss);
    expect(bosses.length).toBe(1);
    expect(bosses[0].maxHp).toBeGreaterThan(8);
  });
});

