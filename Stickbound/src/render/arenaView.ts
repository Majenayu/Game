// An arena inside a Phaser scene: baked parallax layers as images, animated hooks as graphics at matching scroll
// factors, a foreground pass, and the whole-screen reactions (shake, warp) applied to the layers.
import type Phaser from 'phaser';
import type { ArenaDef } from './arenas';
import { BAKE_X, BAKE_Y, sweepBeams } from './arenas';
import { ArenaReact } from './arenaReact';
import { bakedLayers, type Quality } from './arenaBake';
import { PhaserPen } from './pen';

interface Hook {
  pen: PhaserPen;
  g: Phaser.GameObjects.Graphics;
  gAdd: Phaser.GameObjects.Graphics;
}

export class ArenaView {
  readonly react: ArenaReact;
  private images: { img: Phaser.GameObjects.Image; scroll: number; scale: number }[] = [];
  private far: Hook | null = null;
  private mid: Hook | null = null;
  private near: Hook;
  private fgHook: Hook | null = null;
  private detail: number;

  constructor(
    private scene: Phaser.Scene,
    readonly arena: ArenaDef,
    readonly quality: Quality,
  ) {
    this.react = new ArenaReact(arena.props);
    this.react.q = quality === 'low' ? 0 : quality === 'medium' ? 0.6 : 1;
    this.detail = quality === 'high' ? 1 : quality === 'medium' ? 0.6 : 0.35;
    const layers = bakedLayers(arena, quality);
    layers.forEach((l, i) => {
      const key = `arena:${l.key}`;
      if (!scene.textures.exists(key)) scene.textures.addCanvas(key, l.canvas);
      const img = scene.add.image(BAKE_X, BAKE_Y, key).setOrigin(0, 0).setScale(1 / l.scale).setScrollFactor(l.scroll).setDepth(-20 + i * 2);
      this.images.push({ img, scroll: l.scroll, scale: l.scale });
      if (quality !== 'low') {
        if (i === 1 && arena.animFar) this.far = this.hook(l.scroll, -19 + i * 2);
        if (i === 2 && arena.animMid) this.mid = this.hook(l.scroll, -19 + i * 2);
      }
    });
    this.near = this.hook(1, -1);
    if (quality !== 'low' && arena.fg) this.fgHook = this.hook(1.08, 8);
  }

  destroy(): void {
    for (const { img } of this.images) img.destroy();
    for (const h of [this.far, this.mid, this.near, this.fgHook]) {
      if (!h) continue;
      h.pen.destroy();
      h.g.destroy();
      h.gAdd.destroy();
    }
    this.images = [];
  }
  /** pen on the floor plane under the fighters (valid after update) */
  get floorPen(): PhaserPen {
    return this.near.pen;
  }
  private hook(scroll: number, depth: number): Hook {
    const g = this.scene.add.graphics().setDepth(depth).setScrollFactor(scroll);
    const gAdd = this.scene.add.graphics().setDepth(depth + 0.5).setScrollFactor(scroll).setBlendMode(1);
    const pen = new PhaserPen(g, gAdd, this.scene, depth + 0.6, scroll);
    pen.maxGlows = 60;
    return { pen, g, gAdd };
  }

  update(t: number): void {
    const A = this.react;
    A.update();
    const a = this.arena;
    for (const h of [this.far, this.mid, this.near, this.fgHook]) h?.pen.begin();
    if (this.far) a.animFar!(this.far.pen, t, A, this.detail);
    if (this.mid) a.animMid!(this.mid.pen, t, A, this.detail);
    sweepBeams(this.near.pen, t, a, A, this.detail);
    a.animNear?.(this.near.pen, t, A, this.detail);
    A.drawFloor(this.near.pen, t, a.accent);
    if (this.fgHook) a.fg!(this.fgHook.pen, t, A, this.detail);
    // earth shakes the structures (more in the far layers), gravity pulls them toward the effect
    const shake = A.shake * 7;
    this.images.forEach(({ img, scroll, scale }, i) => {
      const sx = shake ? Math.sin(t * 61 + i * 1.7) * shake * (1.2 - scroll) : 0;
      const sy = shake ? Math.cos(t * 53 + i) * shake * 0.5 * (1.2 - scroll) : 0;
      const w = A.warp * (1 - scroll) * 0.05;
      img.setScale((1 / scale) * (1 + w));
      img.setPosition(BAKE_X + sx - (A.warpX - BAKE_X) * w, BAKE_Y + sy - (A.warpY - BAKE_Y) * w);
    });
  }
}
