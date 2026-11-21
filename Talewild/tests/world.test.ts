import { describe, expect, it } from 'vitest';
import { GridMover, TURN_HOLD_MS, WALK_TILES_PER_SEC } from '../src/world/grid';
import { NpcBrain } from '../src/world/npc';
import { Rng } from '../src/core/rng';
import { buildMap, type AsciiMapDef } from '../src/world/ascii';
import { MapData } from '../src/world/mapData';
import { validateMaps } from '../src/world/validate';
import { chapter } from '../src/content/chapter0';
import { TILE } from '../src/world/tiles';

const open = () => false;
const step = (m: GridMover, ms: number, want: Parameters<GridMover['update']>[1], blocked = open, total = ms) => {
  for (let t = 0; t < total; t += ms) m.update(ms, want, false, blocked);
};

describe('GridMover', () => {
  it('a tap in a new direction only turns', () => {
    const m = new GridMover(0, 0, 'down');
    m.update(16, 'right', false, open);
    m.update(16, null, false, open);
    expect(m.facing).toBe('right');
    expect([m.x, m.y]).toEqual([0, 0]);
  });

  it('holding a direction walks one tile in about 1/speed seconds', () => {
    const m = new GridMover(0, 0, 'right');
    step(m, 10, 'right', open, 10);
    expect(m.x).toBe(1);
    expect(m.moving).toBe(true);
    const msPerTile = 1000 / WALK_TILES_PER_SEC;
    step(m, 10, null, open, msPerTile);
    expect(m.moving).toBe(false);
    expect(m.fx).toBe(1);
  });

  it('turns and then walks after the hold delay', () => {
    const m = new GridMover(0, 0, 'down');
    step(m, 10, 'left', open, TURN_HOLD_MS + 20);
    expect(m.x).toBe(-1);
  });

  it('does not enter blocked tiles and reports a bump', () => {
    const m = new GridMover(0, 0, 'up');
    const r = m.update(16, 'up', false, () => true);
    expect(r.bumped).toBe(true);
    expect(m.y).toBe(0);
  });

  it('chains steps smoothly while a key is held', () => {
    const m = new GridMover(0, 0, 'right');
    step(m, 16, 'right', open, 1000);
    expect(m.x).toBeGreaterThanOrEqual(4);
    expect(m.x).toBeLessThanOrEqual(5);
  });
});

describe('NpcBrain', () => {
  it('wanders but never leaves its radius', () => {
    const b = new NpcBrain({ move: 'wander', homeX: 10, homeY: 10, radius: 2, path: [], facing: 'down' }, new Rng(3));
    for (let i = 0; i < 3000; i++) {
      b.update(16, open);
      expect(Math.abs(b.mover.x - 10)).toBeLessThanOrEqual(2);
      expect(Math.abs(b.mover.y - 10)).toBeLessThanOrEqual(2);
    }
  });

  it('patrols between its points', () => {
    const b = new NpcBrain({ move: 'patrol', homeX: 0, homeY: 0, radius: 0, path: [[0, 0], [3, 0]], facing: 'down' }, new Rng(1));
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      b.update(16, open);
      seen.add(b.mover.x);
    }
    expect(seen).toEqual(new Set([0, 1, 2, 3]));
  });

  it('stands still while talking', () => {
    const b = new NpcBrain({ move: 'wander', homeX: 0, homeY: 0, radius: 3, path: [], facing: 'down' }, new Rng(2));
    b.talking = true;
    for (let i = 0; i < 500; i++) b.update(16, open);
    expect([b.mover.x, b.mover.y]).toEqual([0, 0]);
  });
});

describe('ascii maps', () => {
  const def: AsciiMapDef = {
    id: 'mini',
    title: 'Mini',
    legend: { '.': { ground: TILE.GRASS }, '#': { ground: TILE.WALL, solid: true } },
    rows: ['###', '#.#', '###'],
    objects: [{ kind: 'spawn', name: 'a', x: 1, y: 1 }],
  };

  it('builds a Tiled map with ground, deco, collision and object layers', () => {
    const m = buildMap(def);
    expect(m.layers.map((l) => l.name)).toEqual(['ground', 'deco', 'collision', 'objects']);
    const d = new MapData(m);
    expect(d.isSolid(0, 0)).toBe(true);
    expect(d.isSolid(1, 1)).toBe(false);
    expect(d.isSolid(-1, 1)).toBe(true);
    expect(d.spawn('a')).toMatchObject({ x: 1, y: 1 });
  });

  it('rejects rows of the wrong length and unknown characters', () => {
    expect(() => buildMap({ ...def, rows: ['###', '#.', '###'] })).toThrow(/columns/);
    expect(() => buildMap({ ...def, rows: ['###', '#?#', '###'] })).toThrow(/unknown map character/);
  });
});

describe('map validator', () => {
  it('passes for the chapter 0 maps', () => {
    const maps = Object.fromEntries(Object.entries(chapter.maps).map(([k, v]) => [k, new MapData(v)]));
    expect(validateMaps(maps, chapter.scripts, chapter.startMap, chapter.startSpawn)).toEqual([]);
  });

  it('finds broken warps, missing scripts and unreachable NPCs', () => {
    const a = new MapData(
      buildMap({
        id: 'a',
        title: 'A',
        legend: { '.': { ground: TILE.GRASS }, '#': { ground: TILE.WALL, solid: true } },
        rows: ['.....', '#####', '.....'],
        objects: [
          { kind: 'spawn', name: 's', x: 0, y: 0 },
          { kind: 'warp', name: 'w', x: 4, y: 0, props: { toMap: 'nowhere', toSpawn: 'x' } },
          { kind: 'npc', name: 'lost', x: 2, y: 2, props: { script: 'missing' } },
        ],
      }),
    );
    const issues = validateMaps({ a }, {}).map((i) => i.message);
    expect(issues).toContain('warp "w" leads to missing map "nowhere"');
    expect(issues).toContain('NPC "lost" cannot be reached to talk');
    expect(issues).toContain('NPC "lost" uses missing script "missing"');
  });
});
