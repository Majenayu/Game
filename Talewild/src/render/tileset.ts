// Generates the island 1 tileset (Quill Harbor palette) at load. 16x16 art pixels per tile, 2x scale = 32 px.

import { Rng } from '../core/rng';
import { TILE, TILESET_COLUMNS, TILESET_ROWS, TILE_SIZE } from '../world/tiles';
import { makeCanvas, OUTLINE, PixelGrid } from './pixels';

const P = {
  grass: ['#6fb055', '#5f9e4a', '#7fc162', '#4f8a3e'],
  path: ['#e3c991', '#d4b87d', '#ecd7a6', '#c7aa72'],
  sand: ['#efd9a4', '#f6e5b8', '#e2c98e'],
  water: ['#3f93ba', '#4aa3c8', '#337fa5', '#9fdcf0'],
  murmur: ['#3f7d52', '#4c9161', '#356b46', '#8fe0b5'],
  dock: ['#9a6a43', '#86593a', '#b07c51'],
  roof: ['#b4533f', '#8a3a2d', '#c96a52'],
  wall: ['#f0e3c4', '#e2d2ad', '#cdbb92'],
  wood: '#7a4e32',
  woodDark: '#5c3824',
  floor: ['#b98a5b', '#a87a4e', '#c99a69'],
  inwall: ['#d9c7a3', '#c7b48f', '#7d6a8e'],
  rug: ['#7d4f8a', '#9a68a8', '#f2c14e'],
  leaf: ['#3d7a3a', '#4f9447', '#6db35f', '#2f5f2e'],
  stone: ['#a7a39a', '#8e8a82', '#c4c0b6'],
  cobble: ['#bfb6a6', '#a89f8f', '#d6cdbd'],
  glass: '#ffd77a',
  flower: ['#f28ab0', '#ffd34d', '#ffffff', '#9ad1ff'],
};

type Draw = (g: PixelGrid, r: Rng) => void;

const base = (colours: string[], flecks = 26): Draw => (g, r) => {
  g.fill(colours[0]!);
  g.flecks(r, colours.slice(1), flecks);
};

const DRAW: Record<number, Draw> = {
  [TILE.GRASS]: (g, r) => {
    base(P.grass)(g, r);
    for (let i = 0; i < 4; i++) {
      const x = r.int(1, 14);
      const y = r.int(3, 14);
      g.set(x, y, P.grass[3]!);
      g.set(x, y - 1, P.grass[2]!);
    }
  },
  [TILE.FLOWERS]: (g, r) => {
    DRAW[TILE.GRASS]!(g, r);
    for (let i = 0; i < 5; i++) {
      const x = r.int(1, 14);
      const y = r.int(1, 14);
      const c = r.pick(P.flower);
      g.set(x, y, c);
      g.set(x + 1, y, c);
      g.set(x, y + 1, '#3d7a3a');
    }
  },
  [TILE.PATH]: base(P.path, 30),
  [TILE.SAND]: (g, r) => {
    base(P.sand, 22)(g, r);
    for (let i = 0; i < 2; i++) g.set(r.int(1, 14), r.int(1, 14), '#ffffff');
  },
  [TILE.WATER]: (g, r) => {
    base(P.water.slice(0, 3), 20)(g, r);
    for (let i = 0; i < 3; i++) {
      const x = r.int(1, 10);
      const y = r.int(2, 13);
      g.rect(x, y, 3, 1, P.water[3]!);
    }
  },
  [TILE.FOAM]: (g, r) => {
    DRAW[TILE.WATER]!(g, r);
    g.rect(0, 0, 16, 5, P.sand[0]!);
    g.flecks(r, P.sand.slice(1), 8, 0, 0, 16, 5);
    for (let x = 0; x < 16; x++) g.set(x, 5 + ((x >> 2) % 2), '#ffffff');
    g.rect(0, 6, 16, 1, '#d8f3fa');
  },
  [TILE.MURMUR]: (g, r) => {
    base(P.murmur.slice(0, 3), 20)(g, r);
    for (let i = 0; i < 6; i++) {
      const x = r.int(0, 15);
      const y = r.int(4, 15);
      g.rect(x, y - 4, 1, 5, P.murmur[2]!);
      g.set(x, y - 5, P.murmur[1]!);
    }
    if (r.float() < 0.5) g.set(r.int(2, 13), r.int(2, 13), P.murmur[3]!);
  },
  [TILE.DOCK]: (g, r) => {
    g.fill(P.dock[0]!);
    for (let y = 3; y < 16; y += 4) g.rect(0, y, 16, 1, P.dock[1]!);
    g.flecks(r, [P.dock[2]!], 10);
    g.set(2, 1, P.woodDark);
    g.set(13, 9, P.woodDark);
  },
  [TILE.ROOF]: (g) => {
    g.fill(P.roof[0]!);
    for (let y = 0; y < 16; y += 4) {
      g.rect(0, y + 3, 16, 1, P.roof[1]!);
      for (let x = (y / 4) % 2 ? 2 : 0; x < 16; x += 4) g.set(x, y + 1, P.roof[2]!);
    }
  },
  [TILE.WALL]: (g, r) => {
    base(P.wall, 12)(g, r);
    g.rect(0, 0, 16, 2, P.wood);
    g.rect(0, 14, 16, 2, P.wall[2]!);
    g.rect(0, 0, 1, 16, P.wood);
  },
  [TILE.WINDOW]: (g, r) => {
    DRAW[TILE.WALL]!(g, r);
    g.rect(3, 4, 10, 8, OUTLINE);
    g.rect(4, 5, 8, 6, P.glass);
    g.rect(7, 5, 2, 6, P.wood);
    g.rect(4, 7, 8, 1, P.wood);
    g.set(5, 6, '#fff4c8');
  },
  [TILE.DOOR]: (g, r) => {
    DRAW[TILE.WALL]!(g, r);
    g.rect(3, 2, 10, 14, OUTLINE);
    g.rect(4, 3, 8, 13, P.wood);
    g.rect(4, 3, 8, 1, P.woodDark);
    g.rect(7, 4, 1, 12, P.woodDark);
    g.set(10, 10, P.glass);
  },
  [TILE.FLOOR]: (g, r) => {
    g.fill(P.floor[0]!);
    for (let y = 3; y < 16; y += 4) g.rect(0, y, 16, 1, P.floor[1]!);
    g.flecks(r, [P.floor[2]!], 12);
  },
  [TILE.INWALL]: (g, r) => {
    base(P.inwall.slice(0, 2), 10)(g, r);
    g.rect(0, 11, 16, 5, P.inwall[2]!);
    g.rect(0, 11, 16, 1, OUTLINE);
  },
  [TILE.RUG]: (g) => {
    g.fill(P.rug[0]!);
    g.rect(1, 1, 14, 14, P.rug[1]!);
    g.rect(3, 3, 10, 10, P.rug[0]!);
    for (let i = 4; i < 12; i += 3) g.set(i, 7, P.rug[2]!);
  },
  [TILE.DOORMAT]: (g, r) => {
    DRAW[TILE.FLOOR]!(g, r);
    g.rect(2, 4, 12, 10, '#8a3a2d');
    g.rect(3, 5, 10, 8, '#b4533f');
  },
  [TILE.COBBLE]: (g, r) => {
    g.fill(P.cobble[1]!);
    for (let y = 0; y < 16; y += 4)
      for (let x = (y / 4) % 2 ? -2 : 0; x < 16; x += 4) {
        g.rect(x + 1, y + 1, 3, 3, r.pick([P.cobble[0]!, P.cobble[2]!]));
      }
  },
  [TILE.WALLTOP]: (g, r) => {
    g.fill('#4a3a5c');
    g.flecks(r, ['#55456a', '#3f3150'], 14);
    g.rect(0, 0, 16, 1, '#6a5a82');
  },
  // ---- decoration (transparent background) ----
  [TILE.TREE]: (g, r) => {
    g.rect(7, 11, 2, 5, P.wood);
    g.oval(1, 0, 14, 12, P.leaf[1]!);
    g.oval(3, 1, 7, 5, P.leaf[2]!);
    g.flecks(r, [P.leaf[0]!, P.leaf[3]!], 10, 2, 4, 12, 7);
    g.outline();
  },
  [TILE.BUSH]: (g, r) => {
    g.oval(1, 5, 14, 10, P.leaf[1]!);
    g.oval(3, 6, 6, 4, P.leaf[2]!);
    g.flecks(r, [P.leaf[0]!], 8, 2, 8, 12, 6);
    if (r.float() < 0.7) g.set(10, 8, '#e0644a');
    g.outline();
  },
  [TILE.ROCK]: (g) => {
    g.oval(2, 6, 12, 9, P.stone[0]!);
    g.oval(4, 7, 5, 3, P.stone[2]!);
    g.rect(4, 13, 9, 1, P.stone[1]!);
    g.outline();
  },
  [TILE.FENCE]: (g) => {
    g.rect(1, 6, 2, 9, P.wood);
    g.rect(13, 6, 2, 9, P.wood);
    g.rect(0, 8, 16, 2, P.wood);
    g.rect(0, 12, 16, 1, P.woodDark);
    g.outline();
  },
  [TILE.SIGN]: (g) => {
    g.rect(7, 9, 2, 7, P.wood);
    g.rect(2, 3, 12, 7, P.wood);
    g.rect(3, 4, 10, 5, '#a8754a');
    g.rect(4, 5, 6, 1, OUTLINE);
    g.rect(4, 7, 8, 1, OUTLINE);
    g.outline();
  },
  [TILE.LAMP]: (g) => {
    g.rect(7, 5, 2, 11, '#3d3d52');
    g.rect(5, 1, 6, 5, '#3d3d52');
    g.rect(6, 2, 4, 3, P.glass);
    g.rect(5, 15, 6, 1, '#3d3d52');
    g.outline();
  },
  [TILE.CRATE]: (g) => {
    g.rect(2, 4, 12, 11, '#b07c51');
    g.rect(2, 4, 12, 1, '#c99a69');
    g.rect(2, 9, 12, 1, P.woodDark);
    g.rect(7, 4, 1, 11, P.woodDark);
    g.outline();
  },
  [TILE.BARREL]: (g) => {
    g.oval(3, 3, 10, 12, '#9a6a43');
    g.rect(3, 6, 10, 1, '#5c5c6e');
    g.rect(3, 11, 10, 1, '#5c5c6e');
    g.oval(5, 3, 6, 2, '#b07c51');
    g.outline();
  },
  [TILE.BOOKSHELF]: (g, r) => {
    g.rect(1, 0, 14, 16, P.woodDark);
    for (const y of [1, 6, 11]) {
      g.rect(2, y, 12, 4, '#3b2a22');
      for (let x = 2; x < 14; x++) if (r.float() < 0.85) g.rect(x, y + (r.float() < 0.3 ? 1 : 0), 1, 4 - (r.float() < 0.3 ? 1 : 0), r.pick(['#b4533f', '#3b5ba8', '#4f8a5a', '#e0b04a', '#8a5a9e', '#efe6d2']));
    }
    g.outline();
  },
  [TILE.DESK]: (g) => {
    g.rect(0, 5, 16, 5, P.wood);
    g.rect(0, 5, 16, 1, '#a8754a');
    g.rect(1, 10, 2, 6, P.woodDark);
    g.rect(13, 10, 2, 6, P.woodDark);
    g.rect(3, 3, 5, 3, '#fff8e6');
    g.rect(10, 2, 2, 3, '#283a7a');
    g.set(12, 1, '#fff8e6');
    g.set(13, 0, '#fff8e6');
    g.outline();
  },
  [TILE.BED]: (g) => {
    g.rect(1, 0, 14, 16, P.woodDark);
    g.rect(2, 1, 12, 14, '#3b5ba8');
    g.rect(2, 1, 12, 4, '#fff8e6');
    g.rect(2, 8, 12, 1, '#2c437d');
    g.outline();
  },
  [TILE.BEDFOOT]: (g) => {
    g.rect(1, 0, 14, 15, P.woodDark);
    g.rect(2, 0, 12, 13, '#3b5ba8');
    g.rect(2, 4, 12, 1, '#2c437d');
    g.rect(2, 9, 12, 1, '#2c437d');
    g.rect(1, 13, 14, 2, '#5c3824');
    g.outline();
  },
  [TILE.PLANT]: (g) => {
    g.rect(5, 10, 6, 5, '#b4533f');
    g.oval(3, 1, 10, 10, P.leaf[1]!);
    g.oval(5, 2, 4, 3, P.leaf[2]!);
    g.outline();
  },
};

/** Draws the full tileset into a canvas laid out by gid (gid 1 at column 0, row 0). */
export function drawTileset(): HTMLCanvasElement {
  const canvas = makeCanvas(TILESET_COLUMNS * TILE_SIZE, TILESET_ROWS * TILE_SIZE);
  const ctx = canvas.getContext('2d')!;
  for (const [gidText, draw] of Object.entries(DRAW)) {
    const gid = Number(gidText);
    const g = new PixelGrid(16, 16);
    draw(g, new Rng(gid * 977));
    const i = gid - 1;
    g.paint(ctx, (i % TILESET_COLUMNS) * TILE_SIZE, Math.floor(i / TILESET_COLUMNS) * TILE_SIZE);
  }
  return canvas;
}
