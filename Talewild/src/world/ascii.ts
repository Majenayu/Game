// Map generator: turns an ASCII layout plus an object list into a Tiled JSON map.
// This is how maps are authored as data without an editor.

import type { TiledMap, TiledObject, TiledProperty } from './tiled';
import { TILE_SIZE } from './tiles';

export interface LegendEntry {
  ground: number;
  deco?: number;
  solid?: boolean;
}

export type ObjectKind = 'spawn' | 'warp' | 'npc' | 'sign';

export interface MapObjectDef {
  kind: ObjectKind;
  name: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  props?: Record<string, string | number | boolean>;
}

export interface AsciiMapDef {
  id: string;
  title: string;
  legend: Record<string, LegendEntry>;
  rows: string[];
  objects: MapObjectDef[];
  props?: Record<string, string | number | boolean>;
}

function toProps(p: Record<string, string | number | boolean> | undefined): TiledProperty[] | undefined {
  if (!p) return undefined;
  return Object.entries(p).map(([name, value]) => ({
    name,
    value,
    type: typeof value === 'boolean' ? 'bool' : typeof value === 'number' ? (Number.isInteger(value) ? 'int' : 'float') : 'string',
  }));
}

export function buildMap(def: AsciiMapDef): TiledMap {
  const height = def.rows.length;
  const width = def.rows[0]?.length ?? 0;
  if (!width) throw new Error(`map ${def.id}: no rows`);
  const ground: number[] = [];
  const deco: number[] = [];
  const collision: number[] = [];
  def.rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`map ${def.id}: row ${y} has ${row.length} columns, expected ${width}`);
    for (const ch of row) {
      const e = def.legend[ch];
      if (!e) throw new Error(`map ${def.id}: unknown map character "${ch}" in row ${y}`);
      ground.push(e.ground);
      deco.push(e.deco ?? 0);
      collision.push(e.solid ? 1 : 0);
    }
  });
  const objects: TiledObject[] = def.objects.map((o, i) => ({
    id: i + 1,
    name: o.name,
    type: o.kind,
    x: o.x * TILE_SIZE,
    y: o.y * TILE_SIZE,
    width: (o.w ?? 1) * TILE_SIZE,
    height: (o.h ?? 1) * TILE_SIZE,
    rotation: 0,
    visible: true,
    properties: toProps(o.props),
  }));
  const tileLayer = (id: number, name: string, data: number[], visible = true) =>
    ({ type: 'tilelayer', id, name, width, height, data, visible, opacity: 1, x: 0, y: 0 }) as const;
  return {
    type: 'map',
    version: '1.10',
    tiledversion: '1.10.2',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    width,
    height,
    tilewidth: TILE_SIZE,
    tileheight: TILE_SIZE,
    infinite: false,
    nextlayerid: 5,
    nextobjectid: objects.length + 1,
    layers: [
      tileLayer(1, 'ground', ground),
      tileLayer(2, 'deco', deco),
      tileLayer(3, 'collision', collision, false),
      { type: 'objectgroup', id: 4, name: 'objects', objects, visible: true, opacity: 1, x: 0, y: 0 },
    ],
    tilesets: [{ firstgid: 1, source: 'talewild-tiles.tsj' }],
    properties: toProps({ id: def.id, title: def.title, ...(def.props ?? {}) }),
  };
}
