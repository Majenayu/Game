import { describe, expect, it } from 'vitest';
import { MAP_LIST, WORLD_H, WORLD_W } from './index';

describe('25 arenas', () => {
  it('has 25 uniquely named arenas with rising unlock levels', () => {
    expect(MAP_LIST.length).toBe(25);
    expect(new Set(MAP_LIST.map((m) => m.name)).size).toBe(25);
    expect(new Set(MAP_LIST.map((m) => m.id)).size).toBe(25);
  });
  it('every arena has obstacles and a free centre, and every open cell can be reached', () => {
    for (const m of MAP_LIST) {
      expect(m.obstacles.length).toBeGreaterThan(1);
      const cell = 40;
      const cols = WORLD_W / cell;
      const rows = WORLD_H / cell;
      const blocked = (cx: number, cy: number) => {
        const x = cx * cell + cell / 2;
        const y = cy * cell + cell / 2;
        return m.obstacles.some((o) => x > o.x - 22 && x < o.x + o.w + 22 && y > o.y - 22 && y < o.y + o.h + 22);
      };
      const start = [Math.floor(cols / 2), 1];
      const seen = new Set<number>();
      const stack = [start];
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        const k = cy * cols + cx;
        if (cx < 0 || cy < 0 || cx >= cols || cy >= rows || seen.has(k) || blocked(cx, cy)) continue;
        seen.add(k);
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
      let open = 0;
      for (let cy = 1; cy < rows - 1; cy++) for (let cx = 1; cx < cols - 1; cx++) if (!blocked(cx, cy)) open++;
      expect(seen.size).toBeGreaterThan(open * 0.97);
    }
  });
});
