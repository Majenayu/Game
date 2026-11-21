// A drawn character on the map: a sprite following a GridMover.

import Phaser from 'phaser';
import type { GridMover } from '../world/grid';
import { TILE_SIZE } from '../world/tiles';
import { NIB_KEY, walkAnim } from '../render/mapRender';

export class Actor {
  readonly sprite: Phaser.GameObjects.Sprite;

  constructor(
    scene: Phaser.Scene,
    readonly name: string,
    readonly texKey: string,
    readonly mover: GridMover,
    private kind: 'person' | 'nib' = 'person',
  ) {
    this.sprite = scene.add.sprite(0, 0, texKey, `${mover.facing}-0`).setOrigin(0.5, 1);
    if (kind === 'nib') this.sprite.play(`${NIB_KEY}:bob-${mover.facing}`);
    this.sync();
  }

  sync(): void {
    const m = this.mover;
    const x = (m.fx + 0.5) * TILE_SIZE;
    const y = (m.fy + 1) * TILE_SIZE - (this.kind === 'nib' ? 4 : 2);
    this.sprite.setPosition(Math.round(x), Math.round(y));
    this.sprite.setDepth(10 + y);
    if (this.kind === 'nib') {
      const key = `${NIB_KEY}:bob-${m.facing}`;
      if (this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key);
      return;
    }
    if (m.moving) {
      const key = walkAnim(this.texKey, m.facing);
      if (this.sprite.anims.currentAnim?.key !== key || !this.sprite.anims.isPlaying) this.sprite.play(key, true);
    } else if (this.sprite.anims.isPlaying || this.sprite.frame.name !== `${m.facing}-0`) {
      this.sprite.stop();
      this.sprite.setFrame(`${m.facing}-0`);
    }
  }

  /** Is this actor on (or stepping into or out of) a tile? */
  occupies(x: number, y: number): boolean {
    const m = this.mover;
    return (m.x === x && m.y === y) || (m.moving && m.prevX === x && m.prevY === y);
  }
}
