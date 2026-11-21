// Map validator (dev tool and unit test): finds broken warps, unreachable doors and NPCs, missing scripts and
// soft locks before a player ever does.

import type { Script } from '../script/types';
import type { MapData } from './mapData';

export interface Issue {
  map: string;
  message: string;
}

/** Tiles reachable on foot from (sx, sy). NPC tiles count as blocked (they can stand in a corridor). */
export function reachable(map: MapData, sx: number, sy: number): Set<number> {
  const npcTiles = new Set(map.npcs().map((n) => n.y * map.width + n.x));
  const seen = new Set<number>();
  if (map.isSolid(sx, sy)) return seen;
  const queue: [number, number][] = [[sx, sy]];
  seen.add(sy * map.width + sx);
  while (queue.length) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const k = ny * map.width + nx;
      if (map.isSolid(nx, ny) || seen.has(k) || npcTiles.has(k)) continue;
      seen.add(k);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

const neighbours = (x: number, y: number): [number, number][] => [
  [x + 1, y],
  [x - 1, y],
  [x, y + 1],
  [x, y - 1],
];

export function validateMaps(maps: Record<string, MapData>, scripts: Record<string, Script>, startMap?: string, startSpawn?: string): Issue[] {
  const issues: Issue[] = [];
  const add = (map: string, message: string) => issues.push({ map, message });

  if (startMap) {
    const m = maps[startMap];
    if (!m) add(startMap, 'start map does not exist');
    else if (startSpawn && !m.spawn(startSpawn)) add(startMap, `start spawn "${startSpawn}" does not exist`);
  }

  for (const [id, map] of Object.entries(maps)) {
    if (map.id !== id) add(id, `map id property is "${map.id}"`);
    const spawns = map.objects.filter((o) => o.kind === 'spawn');
    if (!spawns.length) add(id, 'map has no spawn point');

    for (const s of spawns) if (map.isSolid(s.x, s.y)) add(id, `spawn "${s.name}" is on a solid tile`);

    // Everything must be reachable from the first spawn (all spawns are connected in a valid map).
    const first = spawns[0];
    const area = first ? reachable(map, first.x, first.y) : new Set<number>();
    const at = (x: number, y: number) => area.has(y * map.width + x);
    const nextTo = (x: number, y: number) => neighbours(x, y).some(([a, b]) => at(a, b));

    for (const s of spawns.slice(1)) if (!at(s.x, s.y)) add(id, `spawn "${s.name}" cannot be reached from "${first!.name}"`);

    for (const o of map.objects) {
      if (o.kind === 'warp') {
        if (map.isSolid(o.x, o.y)) add(id, `warp "${o.name}" is on a solid tile`);
        if (!at(o.x, o.y)) add(id, `warp "${o.name}" cannot be reached`);
        const target = maps[o.toMap];
        if (!target) add(id, `warp "${o.name}" leads to missing map "${o.toMap}"`);
        else {
          const sp = target.spawn(o.toSpawn);
          if (!sp) add(id, `warp "${o.name}" leads to missing spawn "${o.toMap}:${o.toSpawn}"`);
          else if (target.warpAt(sp.x, sp.y)) add(id, `warp "${o.name}" lands on another warp (endless loop)`);
          // Matched warps: the target map must have a way back to this map.
          const back = target.objects.some((t) => t.kind === 'warp' && t.toMap === id);
          if (!back) add(id, `warp "${o.name}" has no warp back from "${o.toMap}"`);
        }
      }
      if (o.kind === 'npc') {
        if (map.isSolid(o.x, o.y)) add(id, `NPC "${o.name}" stands on a solid tile`);
        if (!nextTo(o.x, o.y)) add(id, `NPC "${o.name}" cannot be reached to talk`);
        if (!scripts[o.script]) add(id, `NPC "${o.name}" uses missing script "${o.script}"`);
        if (o.move === 'patrol') {
          if (o.path.length < 2) add(id, `NPC "${o.name}" patrols with fewer than 2 points`);
          for (const [px, py] of o.path) if (map.isSolid(px, py)) add(id, `NPC "${o.name}" patrol point ${px},${py} is solid`);
        }
      }
      if (o.kind === 'sign') {
        if (!scripts[o.script]) add(id, `sign "${o.name}" uses missing script "${o.script}"`);
        let reach = false;
        for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) if (nextTo(x, y)) reach = true;
        if (!reach) add(id, `sign "${o.name}" cannot be reached`);
      }
    }
  }
  return issues;
}
