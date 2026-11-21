// Title background: the harbour map drifting slowly behind the title menu, with a warm evening wash.

import Phaser from 'phaser';
import { getContext } from '../game/context';
import { buildTilemap, zoomFor } from '../render/mapRender';
import { TILE_SIZE } from '../world/tiles';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create(): void {
    const ctx = getContext();
    const map = ctx.chapter.maps.harbor ?? Object.values(ctx.chapter.maps)[0]!;
    buildTilemap(this, map);
    const cam = this.cameras.main;
    const fit = () => cam.setZoom(zoomFor(this.scale.width, this.scale.height));
    fit();
    this.scale.on('resize', fit, this);
    this.events.once('shutdown', () => this.scale.off('resize', fit, this));
    cam.setBounds(0, 0, map.width * TILE_SIZE, map.height * TILE_SIZE);
    cam.centerOn(6 * TILE_SIZE, 8 * TILE_SIZE);
    if (!ctx.settings.reducedMotion)
      this.tweens.add({ targets: cam, scrollX: '+=320', scrollY: '+=120', duration: 30000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const wash = this.add.rectangle(0, 0, 4000, 4000, 0x2a1d3a, 0.35).setOrigin(0).setScrollFactor(0).setDepth(100);
    wash.setBlendMode(Phaser.BlendModes.MULTIPLY);
  }
}
