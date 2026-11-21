// The subset of the open Tiled JSON map format (https://doc.mapeditor.org/en/stable/reference/json-map-format/)
// that Talewild uses. Maps are written by code (src/world/ascii.ts) in this format, so the Tiled editor can open
// them later, but no editor is needed.

export interface TiledProperty {
  name: string;
  type: 'string' | 'int' | 'bool' | 'float';
  value: string | number | boolean;
}

export interface TiledTileLayer {
  type: 'tilelayer';
  id: number;
  name: string;
  width: number;
  height: number;
  data: number[];
  visible: boolean;
  opacity: number;
  x: 0;
  y: 0;
}

export interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: 0;
  visible: boolean;
  properties?: TiledProperty[];
}

export interface TiledObjectLayer {
  type: 'objectgroup';
  id: number;
  name: string;
  objects: TiledObject[];
  visible: boolean;
  opacity: number;
  x: 0;
  y: 0;
}

export type TiledLayer = TiledTileLayer | TiledObjectLayer;

export interface TiledMap {
  type: 'map';
  version: string;
  tiledversion: string;
  orientation: 'orthogonal';
  renderorder: 'right-down';
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  infinite: false;
  nextlayerid: number;
  nextobjectid: number;
  layers: TiledLayer[];
  tilesets: { firstgid: number; source: string }[];
  properties?: TiledProperty[];
}

export function prop(props: TiledProperty[] | undefined, name: string): string | number | boolean | undefined {
  return props?.find((p) => p.name === name)?.value;
}
