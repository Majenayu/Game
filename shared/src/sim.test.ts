import { describe, expect, it } from 'vitest';
import {
  MAX_HP,
  MAX_PLAYERS,
  OBSTACLES,
  PLAYER_RADIUS,
  RESPAWN_DELAY,
  ROUND_TIME,
  SCOREBOARD_TIME,
  Sim,
  movePlayer,
  pointInRect,
  sanitizeInput,
  sanitizeNick,
} from './index';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function run(sim: Sim, seconds: number) {
  for (let i = 0; i < seconds * 20; i++) sim.step(0.05);
}

describe('util', () => {
  it('keeps players inside the world and out of obstacles', () => {
    let p = { x: 100, y: 100 };
    for (let i = 0; i < 400; i++) p = movePlayer(p.x, p.y, 1, 1, 0.05);
    expect(p.x).toBeLessThanOrEqual(1600 - PLAYER_RADIUS);
    expect(p.y).toBeLessThanOrEqual(900 - PLAYER_RADIUS);
    for (const o of OBSTACLES) expect(pointInRect(p.x, p.y, o)).toBe(false);
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
    const ok = sanitizeInput({ moveX: 50, moveY: -50, aimAngle: 10, shooting: 1, seq: 3 })!;
    expect(ok.moveX).toBe(1);
    expect(ok.moveY).toBe(-1);
    expect(Math.abs(ok.aim)).toBeLessThanOrEqual(Math.PI);
    expect(ok.shooting).toBe(false);
  });
});

describe('Sim', () => {
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
    const sim = new Sim(seeded());
    const a = sim.addPlayer('a', 'A');
    const b = sim.addPlayer('b', 'B');
    a.x = 300;
    a.y = 800;
    b.x = 500;
    b.y = 800;
    a.invulnUntil = 0;
    b.invulnUntil = 0;
    sim.applyInput('a', { moveX: 0, moveY: 0, aim: 0, shooting: true, seq: 1 });
    run(sim, 1.5);
    expect(b.alive).toBe(false);
    expect(a.kills).toBe(1);
    expect(b.deaths).toBe(1);
    run(sim, RESPAWN_DELAY + 0.2);
    expect(b.alive).toBe(true);
    expect(b.hp).toBe(MAX_HP);
    expect(b.invulnUntil).toBeGreaterThan(sim.time);
  });

  it('ignores damage while invulnerable', () => {
    const sim = new Sim(seeded());
    const a = sim.addPlayer('a', 'A');
    const b = sim.addPlayer('b', 'B');
    a.x = 300;
    a.y = 800;
    b.x = 500;
    b.y = 800;
    a.invulnUntil = 0;
    b.invulnUntil = 999;
    sim.applyInput('a', { moveX: 0, moveY: 0, aim: 0, shooting: true, seq: 1 });
    run(sim, 2);
    expect(b.hp).toBe(MAX_HP);
  });

  it('runs rounds: play, scoreboard, then restarts in the same room', () => {
    const sim = new Sim(seeded(7));
    sim.addPlayer('h', 'Human');
    sim.rebalanceBots();
    run(sim, ROUND_TIME + 0.2);
    expect(sim.phase).toBe('scoreboard');
    expect(sim.round).toBe(1);
    run(sim, SCOREBOARD_TIME + 0.2);
    expect(sim.phase).toBe('play');
    expect(sim.round).toBe(2);
    expect(sim.players.size).toBe(MAX_PLAYERS);
    for (const p of sim.players.values()) expect(p.kills).toBe(0);
  });

  it('bots fight each other and score kills over a round', () => {
    const sim = new Sim(seeded(3));
    sim.rebalanceBots();
    run(sim, 60);
    const total = Array.from(sim.players.values()).reduce((s, p) => s + p.kills, 0);
    expect(total).toBeGreaterThan(0);
  });

  it('spawns a rapid-fire pickup and grants it', () => {
    const sim = new Sim(seeded());
    const a = sim.addPlayer('a', 'A');
    run(sim, 15.2);
    expect(sim.pickups.length).toBe(1);
    a.x = sim.pickups[0].x;
    a.y = sim.pickups[0].y;
    sim.step(0.05);
    expect(sim.pickups.length).toBe(0);
    expect(a.rapidUntil).toBeGreaterThan(sim.time);
  });
});
