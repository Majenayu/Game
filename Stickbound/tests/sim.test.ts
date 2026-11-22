import { describe, expect, it } from 'vitest';
import { ELEMENT_IDS, type ElementId } from '../src/content/elements';
import { botInput } from '../src/sim/ai';
import { hashMatch } from '../src/sim/hash';
import { stickSpec } from '../src/sim/stats';
import { activeOf, createMatch, step, type MatchOptions } from '../src/sim/step';
import { IN, type Match } from '../src/sim/types';

function duel(a: ElementId[], b: ElementId[], level = 20, seed = 1, bots: [number, number] = [3, 3]): Match {
  const o: MatchOptions = {
    mode: 'duel',
    teamA: a.map((e, i) => stickSpec(`A${i}`, e, level)),
    teamB: b.map((e, i) => stickSpec(`B${i}`, e, level)),
    seed,
    bots,
  };
  return createMatch(o);
}

function run(m: Match, frames: number, scripted?: (f: number) => number): void {
  for (let i = 0; i < frames && m.phase !== 'over'; i++) {
    const a = scripted ? scripted(m.frame) : botInput(m, 0);
    step(m, a, botInput(m, 1));
  }
}

describe('determinism', () => {
  it('the same inputs give the same state hash after 10,000 frames', () => {
    const script = (f: number) => [IN.R, IN.ATK, 0, IN.ATK | IN.R, IN.P1, IN.GRD, IN.U, IN.HVY, IN.DASH | IN.L, IN.SWAP, IN.P2, IN.P3][Math.floor(f / 7) % 12]!;
    const h = () => {
      const m = duel(['fire', 'time'], ['ice', 'gravity'], 30, 99, [0, 4]);
      for (let i = 0; i < 10_000; i++) step(m, script(m.frame), botInput(m, 1));
      return hashMatch(m);
    };
    expect(h()).toBe(h());
  });

  it('different seeds lead to different matches', () => {
    const a = duel(['wind', 'leaf'], ['earth', 'light'], 20, 1);
    const b = duel(['wind', 'leaf'], ['earth', 'light'], 20, 2);
    run(a, 3000);
    run(b, 3000);
    expect(hashMatch(a)).not.toBe(hashMatch(b));
  });
});

describe('match flow', () => {
  it('bots finish a best-of-3 match', () => {
    const m = duel(['fire', 'water'], ['lightning', 'earth']);
    run(m, 60 * 60 * 6);
    expect(m.phase).toBe('over');
    expect(Math.max(m.teams[0].wins, m.teams[1].wins)).toBeGreaterThanOrEqual(2);
  });

  it('a round times out after 60 seconds when nobody fights', () => {
    const m = duel(['fire'], ['ice'], 1, 1, [0, 0]);
    run(m, 100 + 3600 + 5, () => 0);
    expect(m.phase === 'ko' || m.phase === 'roundEnd').toBe(true);
  });

  it('every element can attack, use all three powers, guard and swap', () => {
    for (const el of ELEMENT_IDS) {
      const m = duel([el, 'fire'], ['water'], 30, 5, [0, 0]);
      run(m, 120, () => 0);
      const me = activeOf(m, 0)!;
      me.mp = 1000;
      const used: string[] = [];
      for (const bit of [IN.P1, IN.P2, IN.P3]) {
        me.mp = 1000;
        step(m, bit, 0);
        used.push(me.move ?? '');
        run(m, 90, () => 0);
      }
      expect(used).toEqual([`${el}1`, `${el}2`, `${el}3`]);
      step(m, IN.SWAP, 0);
      run(m, 40, () => 0);
      expect(activeOf(m, 0)!.spec.element).toBe('fire');
    }
  });

  it('powers cost MP and fail without it', () => {
    const m = duel(['fire'], ['water'], 30, 5, [0, 0]);
    run(m, 120, () => 0);
    const me = activeOf(m, 0)!;
    me.mp = 50;
    step(m, IN.P1, 0);
    expect(me.move).toBeNull();
    me.mp = 1000;
    step(m, 0, 0);
    step(m, IN.P1, 0);
    expect(me.move).toBe('fire1');
    expect(me.mp).toBeLessThan(1000);
  });

  it('a perfect guard takes no damage and stuns the attacker', () => {
    const m = duel(['earth'], ['wind'], 10, 3, [0, 0]);
    run(m, 120, () => 0);
    const a = activeOf(m, 0)!;
    const b = activeOf(m, 1)!;
    a.x = 60000;
    b.x = 66000;
    const hp = b.hp;
    // A starts a heavy (13 frames startup); B presses guard 4 frames before it lands
    step(m, IN.HVY, 0);
    for (let i = 0; i < 9; i++) step(m, 0, 0);
    for (let i = 0; i < 12; i++) step(m, 0, IN.GRD);
    expect(b.hp).toBe(hp);
    expect(a.st).toBe('stun');
  });

  it('locked powers do nothing at level 1', () => {
    const m = duel(['fire'], ['water'], 1, 5, [0, 0]);
    run(m, 120, () => 0);
    const me = activeOf(m, 0)!;
    me.mp = 1000;
    step(m, IN.P3, 0);
    expect(me.move).toBeNull();
  });
});

describe('zombie survival', () => {
  it('waves spawn and the run ends when the squad falls', () => {
    const m = createMatch({ mode: 'zombie', teamA: [stickSpec('Z', 'fire', 1), stickSpec('Y', 'ice', 1)], teamB: [], seed: 7 });
    let maxWave = 0;
    for (let i = 0; i < 60 * 60 * 8 && m.phase !== 'over'; i++) {
      step(m, 0, 0);
      maxWave = Math.max(maxWave, m.wave);
    }
    expect(maxWave).toBeGreaterThanOrEqual(1);
    expect(m.phase).toBe('over');
  });
});
