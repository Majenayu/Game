// Arenas are drawn with many filled polygons. A Phaser Graphics object re-triangulates all of them every frame, which
// was most of the CPU time in a fight. Baking the arena once into a texture makes it a single quad.
import type Phaser from 'phaser';
import { FLOOR_Y, WORLD_W, type ArenaDef } from './arenas';

const PAD_X = 400;
const TOP = -160;
const BOTTOM = FLOOR_Y + 600;

export function bakeArena(scene: Phaser.Scene, a: ArenaDef): Phaser.GameObjects.GameObject {
  const g = scene.make.graphics({}, false);
  a.draw(g, a);
  const w = WORLD_W + PAD_X * 2;
  const h = BOTTOM - TOP;
  const key = `arena-${a.id}`;
  if (!scene.textures.exists(key)) {
    const rt = scene.make.renderTexture({ x: 0, y: 0, width: w, height: h }, false);
    rt.draw(g, PAD_X, -TOP);
    rt.saveTexture(key);
  }
  g.destroy();
  return scene.add.image(-PAD_X, TOP, key).setOrigin(0, 0);
}
