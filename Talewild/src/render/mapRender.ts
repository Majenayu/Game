// Phaser glue: generated textures, tilemap layers from MapData, character animations, camera zoom.

import Phaser from 'phaser';
import type { Dir } from '../core/input';
import type { Look } from '../core/save';
import type { MapData } from '../world/mapData';
import { TILE_SIZE } from '../world/tiles';
import { buildCharacterSheet, buildNibSheet, CHAR_H, CHAR_W, DIR_ORDER, NIB_H, NIB_W, WALK_FRAMES } from './characters';
import { drawTileset } from './tileset';

export const TILES_KEY = 'tiles';
export const NIB_KEY = 'nib';

export function lookKey(look: Look): string {
  return `char:${look.skin}-${look.hair}-${look.hairStyle}-${look.outfit}`;
}

function addSheet(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement, fw: number, fh: number, cols: number): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.addCanvas(key, canvas)!;
  DIR_ORDER.forEach((dir, row) => {
    for (let f = 0; f < cols; f++) tex.add(`${dir}-${f}`, 0, f * fw, row * fh, fw, fh);
  });
}

export function ensureTileset(scene: Phaser.Scene): void {
  if (!scene.textures.exists(TILES_KEY)) scene.textures.addCanvas(TILES_KEY, drawTileset());
}

/** Builds (once) the sprite sheet and walk animations for a look. Returns the texture key. */
export function ensureCharacter(scene: Phaser.Scene, look: Look): string {
  const key = lookKey(look);
  if (scene.textures.exists(key)) return key;
  addSheet(scene, key, buildCharacterSheet(look), CHAR_W, CHAR_H, WALK_FRAMES);
  for (const dir of DIR_ORDER)
    scene.anims.create({
      key: `${key}:walk-${dir}`,
      frames: [1, 0, 2, 0].map((f) => ({ key, frame: `${dir}-${f}` })),
      frameRate: 8,
      repeat: -1,
    });
  return key;
}

export function ensureNib(scene: Phaser.Scene): void {
  if (scene.textures.exists(NIB_KEY)) return;
  addSheet(scene, NIB_KEY, buildNibSheet(), NIB_W, NIB_H, 2);
  for (const dir of DIR_ORDER)
    scene.anims.create({ key: `${NIB_KEY}:bob-${dir}`, frames: [0, 1].map((f) => ({ key: NIB_KEY, frame: `${dir}-${f}` })), frameRate: 3, repeat: -1 });
}

export function walkAnim(key: string, dir: Dir): string {
  return `${key}:walk-${dir}`;
}

/** Creates ground and decoration layers for a map. */
export function buildTilemap(scene: Phaser.Scene, map: MapData): Phaser.Tilemaps.Tilemap {
  ensureTileset(scene);
  const tm = scene.make.tilemap({ tileWidth: TILE_SIZE, tileHeight: TILE_SIZE, width: map.width, height: map.height });
  const ts = tm.addTilesetImage(TILES_KEY, TILES_KEY, TILE_SIZE, TILE_SIZE, 0, 0, 1)!;
  const to2d = (data: number[]) => Array.from({ length: map.height }, (_, y) => data.slice(y * map.width, (y + 1) * map.width).map((v) => (v ? v : -1)));
  const ground = tm.createBlankLayer('ground', ts, 0, 0)!;
  ground.putTilesAt(to2d(map.ground), 0, 0);
  ground.setDepth(0);
  const deco = tm.createBlankLayer('deco', ts, 0, 0)!;
  deco.putTilesAt(to2d(map.deco), 0, 0);
  deco.setDepth(1);
  return tm;
}

/**
 * Camera zoom in steps of 0.5. Textures use 2 screen pixels per art pixel, so any multiple of 0.5 keeps the pixel
 * grid even. Aims for about 20 tiles across and 11 down (a classic handheld RPG view), never below 1.
 */
export function zoomFor(width: number, height: number): number {
  const z = Math.min(width / (20 * TILE_SIZE), height / (11 * TILE_SIZE));
  return Math.max(1, Math.floor(z * 2) / 2);
}

/** Centres maps that are smaller than the view instead of pinning them to the top left. */
export function cameraBounds(cam: Phaser.Cameras.Scene2D.Camera, map: MapData): void {
  const w = map.width * TILE_SIZE;
  const hgt = map.height * TILE_SIZE;
  const vw = cam.width / cam.zoom;
  const vh = cam.height / cam.zoom;
  const bx = w < vw ? -(vw - w) / 2 : 0;
  const by = hgt < vh ? -(vh - hgt) / 2 : 0;
  cam.setBounds(bx, by, Math.max(w, vw), Math.max(hgt, vh));
}
