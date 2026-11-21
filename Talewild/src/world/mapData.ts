// Runtime view of a Tiled map: layers as arrays, collision lookups and typed objects in tile coordinates.

import type { Dir } from '../core/input';
import { prop, type TiledMap, type TiledObjectLayer, type TiledTileLayer } from './tiled';

export type NpcMove = 'still' | 'wander' | 'patrol';

export interface SpawnObj {
  kind: 'spawn';
  name: string;
  x: number;
  y: number;
  facing: Dir;
}
export interface WarpObj {
  kind: 'warp';
  name: string;
  x: number;
  y: number;
  toMap: string;
  toSpawn: string;
}
export interface NpcObj {
  kind: 'npc';
  name: string;
  x: number;
  y: number;
  facing: Dir;
  script: string;
  look: string;
  move: NpcMove;
  radius: number;
  /** Patrol points as "x,y;x,y". */
  path: [number, number][];
}
export interface SignObj {
  kind: 'sign';
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  script: string;
}
export type MapObj = SpawnObj | WarpObj | NpcObj | SignObj;

const DIRS = new Set(['up', 'down', 'left', 'right']);
const asDir = (v: unknown, fallback: Dir = 'down'): Dir => (DIRS.has(String(v)) ? (v as Dir) : fallback);

export class MapData {
  readonly id: string;
  readonly title: string;
  readonly width: number;
  readonly height: number;
  readonly ground: number[];
  readonly deco: number[];
  private readonly solid: Uint8Array;
  readonly objects: MapObj[];

  constructor(readonly raw: TiledMap) {
    this.width = raw.width;
    this.height = raw.height;
    this.id = String(prop(raw.properties, 'id') ?? '');
    this.title = String(prop(raw.properties, 'title') ?? this.id);
    const layer = (name: string) => raw.layers.find((l): l is TiledTileLayer => l.type === 'tilelayer' && l.name === name);
    const size = this.width * this.height;
    this.ground = layer('ground')?.data ?? new Array(size).fill(0);
    this.deco = layer('deco')?.data ?? new Array(size).fill(0);
    this.solid = Uint8Array.from(layer('collision')?.data ?? new Array(size).fill(0), (v) => (v ? 1 : 0));
    const objLayer = raw.layers.find((l): l is TiledObjectLayer => l.type === 'objectgroup' && l.name === 'objects');
    const T = raw.tilewidth;
    this.objects = (objLayer?.objects ?? []).map((o): MapObj => {
      const x = Math.floor(o.x / T);
      const y = Math.floor(o.y / T);
      const p = (n: string) => prop(o.properties, n);
      switch (o.type) {
        case 'spawn':
          return { kind: 'spawn', name: o.name, x, y, facing: asDir(p('facing')) };
        case 'warp':
          return { kind: 'warp', name: o.name, x, y, toMap: String(p('toMap') ?? ''), toSpawn: String(p('toSpawn') ?? '') };
        case 'npc': {
          const path = String(p('path') ?? '')
            .split(';')
            .filter(Boolean)
            .map((pair) => pair.split(',').map(Number) as [number, number]);
          return {
            kind: 'npc',
            name: o.name,
            x,
            y,
            facing: asDir(p('facing')),
            script: String(p('script') ?? ''),
            look: String(p('look') ?? o.name),
            move: (String(p('move') ?? 'still') as NpcMove) || 'still',
            radius: Number(p('radius') ?? 2),
            path,
          };
        }
        case 'sign':
          return { kind: 'sign', name: o.name, x, y, w: Math.max(1, Math.round(o.width / T)), h: Math.max(1, Math.round(o.height / T)), script: String(p('script') ?? '') };
        default:
          throw new Error(`map ${this.id}: unknown object type "${o.type}"`);
      }
    });
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /** Solid terrain or outside the map. NPCs are checked separately by the world. */
  isSolid(x: number, y: number): boolean {
    return !this.inBounds(x, y) || this.solid[y * this.width + x] === 1;
  }

  spawn(name: string): SpawnObj | undefined {
    return this.objects.find((o): o is SpawnObj => o.kind === 'spawn' && o.name === name);
  }

  warpAt(x: number, y: number): WarpObj | undefined {
    return this.objects.find((o): o is WarpObj => o.kind === 'warp' && o.x === x && o.y === y);
  }

  signAt(x: number, y: number): SignObj | undefined {
    return this.objects.find((o): o is SignObj => o.kind === 'sign' && x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h);
  }

  npcs(): NpcObj[] {
    return this.objects.filter((o): o is NpcObj => o.kind === 'npc');
  }
}
