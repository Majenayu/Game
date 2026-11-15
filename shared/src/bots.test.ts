import { describe, expect, it } from 'vitest';
import { MAP_LIST, MODE_LIST, Sim } from './index';

function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Fraction of bot samples (every 2 s) where a living bot moved less than 12 units. */
function stuckRatio(mode: (typeof MODE_LIST)[number], mapId: string, seed: number): number {
  const sim = new Sim(seeded(seed), { mode, mapId });
  sim.addPlayer('h', 'Human');
  sim.rebalanceBots();
  const last = new Map<string, { x: number; y: number }>();
  let samples = 0;
  let stuck = 0;
  for (let step = 1; step <= 20 * 60; step++) {
    sim.step(0.05);
    if (step % 40 !== 0) continue;
    for (const p of sim.players.values()) {
      if (!p.bot) continue;
      const prev = last.get(p.id);
      last.set(p.id, { x: p.x, y: p.y });
      if (!prev || !p.alive || sim.time - p.respawnAt < 2.5) continue;
      samples++;
      if (Math.hypot(p.x - prev.x, p.y - prev.y) < 12) stuck++;
    }
  }
  return samples ? stuck / samples : 0;
}

describe('bots keep moving', () => {
  it('rarely stall on any map in any mode', () => {
    const rows: string[] = [];
    let worst = 0;
    for (const mode of MODE_LIST) {
      for (const m of MAP_LIST) {
        const r = stuckRatio(mode, m.id, 7);
        worst = Math.max(worst, r);
        rows.push(`${mode}/${m.id}: ${(r * 100).toFixed(1)}%`);
      }
    }
    console.log('STUCK', rows.join(' | '));
    expect(worst).toBeLessThan(0.1);
  });
});
