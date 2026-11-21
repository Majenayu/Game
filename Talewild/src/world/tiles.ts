// Tile ids (Tiled "gid", firstgid = 1). Ground tiles are opaque; decoration tiles are drawn over the ground.
// The art for each id is generated in src/render/tileset.ts.

export const TILE = {
  GRASS: 1,
  FLOWERS: 2,
  PATH: 3,
  SAND: 4,
  WATER: 5,
  FOAM: 6,
  MURMUR: 7,
  DOCK: 8,
  ROOF: 9,
  WALL: 10,
  WINDOW: 11,
  DOOR: 12,
  FLOOR: 13,
  INWALL: 14,
  RUG: 15,
  DOORMAT: 16,
  COBBLE: 17,
  WALLTOP: 18,
  // decoration (transparent background)
  TREE: 20,
  BUSH: 21,
  ROCK: 22,
  FENCE: 23,
  SIGN: 24,
  LAMP: 25,
  CRATE: 26,
  BOOKSHELF: 27,
  DESK: 28,
  BED: 29,
  PLANT: 30,
  BARREL: 31,
  BEDFOOT: 19,
} as const;

export type TileId = (typeof TILE)[keyof typeof TILE];

export const TILESET_COLUMNS = 8;
export const TILESET_ROWS = 4;
export const TILE_SIZE = 32;
