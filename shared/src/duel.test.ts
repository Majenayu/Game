import { describe, expect, it } from 'vitest';
import { DUEL_KINDS, Duel, duelKit, duelUsable, firstIdOfRank, getSkill, skillCount } from './index';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const input = (o: Partial<{ moveX: number; moveY: number; shooting: boolean; skill: number; moves: number }> = {}) => ({
  moveX: 0,
  moveY: 0,
  aim: 0,
  shooting: false,
  seq: 1,
  skill: 0,
  moves: 0,
  ...o,
});
const run = (d: Duel, sec: number) => {
  for (let i = 0; i < sec * 20; i++) d.step(0.05);
};

describe('ranked duel', () => {
  it('waits in the lobby, counts down after both confirm, then fights', () => {
    const d = new Duel(seeded());
    d.add('a', { name: 'A' });
    d.add('b', { name: 'B' });
    run(d, 2);
    expect(d.phase).toBe('lobby');
    d.confirm('a');
    expect(d.phase).toBe('lobby');
    d.confirm('b');
    expect(d.phase).toBe('countdown');
    run(d, 3.1);
    expect(d.phase).toBe('fight');
  });
  it('the lobby starts on its own after 25 seconds', () => {
    const d = new Duel(seeded());
    d.add('a', { name: 'A' });
    d.add('b', { name: 'B' });
    run(d, 25.2);
    expect(d.phase).toBe('countdown');
  });
  it('walking, punching and blocking work; a block takes far less damage', () => {
    const d = new Duel(seeded());
    const a = d.add('a', { name: 'A' })!;
    const b = d.add('b', { name: 'B' })!;
    d.confirm('a');
    d.confirm('b');
    run(d, 3.1);
    d.input('a', input({ moveX: 1 }));
    run(d, 2);
    expect(Math.abs(b.x - a.x)).toBeLessThan(140);
    d.input('a', input({ shooting: true }));
    run(d, 0.4);
    d.input('a', input());
    run(d, 0.2);
    const open = b.maxHp - b.hp;
    expect(open).toBeGreaterThan(0);
    b.hp = b.maxHp;
    a.x = b.x - 90;
    d.input('b', input({ moveY: 1 }));
    run(d, 0.1);
    d.input('a', input({ shooting: true }));
    run(d, 0.4);
    expect(b.maxHp - b.hp).toBeLessThan(open);
  });
  it('has kicks, a flying kick, a low sweep that knocks down, and a weapon strike with a cooldown', () => {
    const fresh = (weapon = 0) => {
      const d = new Duel(seeded());
      const a = d.add('a', { name: 'A', loadout: { weapon } })!;
      const b = d.add('b', { name: 'B' })!;
      d.confirm('a');
      d.confirm('b');
      run(d, 3.1);
      a.x = 700;
      b.x = 800;
      return { d, a, b };
    };
    const k = fresh();
    k.d.input('a', input({ moves: 1 }));
    run(k.d, 0.5);
    expect(k.b.hp).toBeLessThan(k.b.maxHp);
    const s = fresh();
    s.d.input('a', input({ moves: 1, moveY: 1 }));
    run(s.d, 0.25);
    expect(s.b.act).toBe('down');
    const w = fresh(4);
    w.d.input('a', input({ moves: 2 }));
    run(w.d, 0.7);
    const afterOne = w.b.hp;
    expect(afterOne).toBeLessThan(w.b.maxHp);
    w.d.input('a', input({ moves: 2 }));
    run(w.d, 0.2);
    expect(w.a.act).not.toBe('attack');
    const j = fresh();
    j.d.input('a', input({ moveY: -1 }));
    run(j.d, 0.1);
    j.d.input('a', input({ moves: 1 }));
    run(j.d, 0.5);
    expect(j.b.hp).toBeLessThan(j.b.maxHp);
  });
  it('fill opponents get names that look like real players', () => {
    const d = new Duel(seeded(3));
    const n = d.randomName();
    expect(n.length).toBeGreaterThan(2);
    expect(n.toLowerCase()).not.toContain('bot');
  });
  it('plays best of three until a winner, with a bot that fights back', () => {
    const d = new Duel(seeded(9), 0.7);
    d.add('a', { name: 'A', bot: true });
    d.add('b', { name: 'B', bot: true });
    run(d, 26);
    run(d, 400);
    expect(d.phase).toBe('matchEnd');
    expect(['a', 'b']).toContain(d.winner);
    expect(d.fighters.find((f) => f.id === d.winner)!.wins).toBe(2);
  });
  it('only allows duel skill kinds and gives bots a legal kit', () => {
    const start = firstIdOfRank('C');
    let banned = -1;
    for (let k = 0; k < skillCount('C'); k++)
      if (getSkill(start + k).kind === 'summon') {
        banned = start + k;
        break;
      }
    expect(duelUsable(banned)).toBe(false);
    for (const id of duelKit(seeded(), 0.5)) expect(DUEL_KINDS).toContain(getSkill(id).kind);
    const d = new Duel(seeded());
    const f = d.add('a', { name: 'A', loadout: { skillIds: [banned] } })!;
    expect(f.slots.every((s) => DUEL_KINDS.includes(s.kind))).toBe(true);
  });
  it('a player who leaves loses by forfeit', () => {
    const d = new Duel(seeded());
    d.add('a', { name: 'A' });
    d.add('b', { name: 'B' });
    d.confirm('a');
    d.confirm('b');
    run(d, 4);
    d.remove('b');
    expect(d.phase).toBe('matchEnd');
    expect(d.winner).toBe('a');
  });
});
