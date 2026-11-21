// Phase 1 test maps: Grandmother Elowen's study and the edge of Quill Harbor.
// Written as ASCII layouts and converted to Tiled JSON by buildMap().

import { buildMap, type AsciiMapDef, type LegendEntry } from '../../world/ascii';
import { TILE } from '../../world/tiles';

const outdoor: Record<string, LegendEntry> = {
  '.': { ground: TILE.GRASS },
  ',': { ground: TILE.FLOWERS },
  '=': { ground: TILE.PATH },
  C: { ground: TILE.COBBLE },
  ':': { ground: TILE.SAND },
  _: { ground: TILE.FOAM, solid: true },
  '~': { ground: TILE.WATER, solid: true },
  '#': { ground: TILE.DOCK },
  '"': { ground: TILE.MURMUR },
  R: { ground: TILE.ROOF, solid: true },
  W: { ground: TILE.WALL, solid: true },
  w: { ground: TILE.WINDOW, solid: true },
  D: { ground: TILE.DOOR },
  T: { ground: TILE.GRASS, deco: TILE.TREE, solid: true },
  b: { ground: TILE.GRASS, deco: TILE.BUSH, solid: true },
  o: { ground: TILE.GRASS, deco: TILE.ROCK, solid: true },
  f: { ground: TILE.GRASS, deco: TILE.FENCE, solid: true },
  S: { ground: TILE.GRASS, deco: TILE.SIGN, solid: true },
  L: { ground: TILE.COBBLE, deco: TILE.LAMP, solid: true },
  c: { ground: TILE.SAND, deco: TILE.CRATE, solid: true },
  k: { ground: TILE.SAND, deco: TILE.BARREL, solid: true },
  K: { ground: TILE.DOCK, deco: TILE.BARREL, solid: true },
};

const indoor: Record<string, LegendEntry> = {
  H: { ground: TILE.INWALL, solid: true },
  X: { ground: TILE.WALLTOP, solid: true },
  _: { ground: TILE.FLOOR },
  r: { ground: TILE.RUG },
  B: { ground: TILE.FLOOR, deco: TILE.BOOKSHELF, solid: true },
  d: { ground: TILE.FLOOR, deco: TILE.DESK, solid: true },
  e: { ground: TILE.FLOOR, deco: TILE.BED, solid: true },
  E: { ground: TILE.FLOOR, deco: TILE.BEDFOOT, solid: true },
  p: { ground: TILE.FLOOR, deco: TILE.PLANT, solid: true },
  k: { ground: TILE.FLOOR, deco: TILE.BARREL, solid: true },
  M: { ground: TILE.DOORMAT },
};

const x = (ch: string, n: number) => ch.repeat(n);

export const studyDef: AsciiMapDef = {
  id: 'study',
  title: "Elowen's study",
  legend: indoor,
  rows: [
    'XHHHHHHHHHHX',
    'XBB__dd__BBX',
    'X________p_X',
    'X__rrrr____X',
    'X__rrrr__e_X',
    'X________E_X',
    'Xp_______k_X',
    'X__________X',
    'XXXXXMXXXXXX',
  ],
  objects: [
    { kind: 'spawn', name: 'start', x: 5, y: 3, props: { facing: 'down' } },
    { kind: 'spawn', name: 'fromHarbor', x: 5, y: 7, props: { facing: 'up' } },
    { kind: 'warp', name: 'toHarbor', x: 5, y: 8, props: { toMap: 'harbor', toSpawn: 'fromStudy' } },
    { kind: 'sign', name: 'desk', x: 5, y: 1, w: 2, props: { script: 'elowen_desk' } },
    { kind: 'sign', name: 'shelfLeft', x: 1, y: 1, w: 2, props: { script: 'bookshelf' } },
    { kind: 'sign', name: 'shelfRight', x: 9, y: 1, w: 2, props: { script: 'bookshelf' } },
    { kind: 'sign', name: 'bed', x: 9, y: 4, h: 2, props: { script: 'bed' } },
  ],
  props: { indoor: true },
};

export const harborDef: AsciiMapDef = {
  id: 'harbor',
  title: 'Quill Harbor',
  legend: outdoor,
  rows: [
    x('T', 32),
    'T........T....................,T',
    'T..RRRRR..T....""""""""".......T',
    'T..RRRRR.......""""""""",......T',
    'T..WwDwW..T....""""""""".....o.T',
    'T....=.........""""""""".......T',
    'T....=.S......,.......b........T',
    'T....=' + x('.', 25) + 'T',
    'T....' + x('=', 12) + x('.', 14) + 'T',
    'T..b.......L' + x('C', 11) + 'L.......T',
    'T' + x('.', 10) + x('C', 13) + x('.', 7) + 'T',
    'T' + x('.', 10) + x('C', 13) + '...o...' + 'T',
    'T' + x('f', 6) + x('.', 4) + x('C', 13) + x('.', 7) + 'T',
    'T' + x(',', 5) + 'f' + x('.', 4) + x('C', 6) + '=' + x('C', 6) + x('.', 7) + 'T',
    'T' + x(',', 5) + 'f' + x('.', 10) + '=' + x('.', 13) + 'T',
    'T' + x(':', 16) + '=' + x(':', 6) + '###' + x(':', 4) + 'T',
    'T::c' + x(':', 19) + 'k###:::kT',
    'T' + x(':', 23) + '###' + x(':', 4) + 'T',
    'T' + x('_', 23) + '###' + x('_', 4) + 'T',
    x('~', 24) + '###' + x('~', 5),
    x('~', 24) + '###' + x('~', 5),
    x('~', 24) + '##K' + x('~', 5),
  ],
  objects: [
    { kind: 'spawn', name: 'fromStudy', x: 5, y: 5, props: { facing: 'down' } },
    { kind: 'spawn', name: 'square', x: 16, y: 12, props: { facing: 'down' } },
    { kind: 'warp', name: 'toStudy', x: 5, y: 4, props: { toMap: 'study', toSpawn: 'fromHarbor' } },
    { kind: 'npc', name: 'mara', x: 17, y: 10, props: { script: 'mara', look: 'mara', facing: 'down', move: 'still' } },
    { kind: 'npc', name: 'kid', x: 13, y: 12, props: { script: 'kid', look: 'kid', move: 'wander', radius: 2 } },
    { kind: 'npc', name: 'sailor', x: 9, y: 14, props: { script: 'sailor', look: 'sailor', move: 'patrol', path: '9,14;15,14' } },
    { kind: 'npc', name: 'fisher', x: 24, y: 21, props: { script: 'fisher', look: 'fisher', facing: 'down', move: 'still' } },
    { kind: 'sign', name: 'houseSign', x: 7, y: 6, props: { script: 'sign_house' } },
  ],
};

export const maps = {
  study: buildMap(studyDef),
  harbor: buildMap(harborDef),
};
