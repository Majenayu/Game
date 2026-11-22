// Menu backdrop: a sci-fi hangar behind the DOM menus (the HANGAR arena: baked parallax layers, drones, a holo ring
// over the launch pad), with a slow camera drift and a floor glow that takes the colour of the mode card under the
// pointer. Low graphics / reduced motion: a still picture.
import Phaser from 'phaser';
import { FLOOR_Y, HANGAR, WORLD_H, WORLD_W } from '../render/arenas';
import { ArenaView } from '../render/arenaView';
import { bakeGlow, PhaserPen } from '../render/pen';
import { resolvedQuality, settings } from '../meta/settings';
function mix(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
const BASE_TINT = 0x3df5ff;
export class BackdropScene extends Phaser.Scene {
  private view!: ArenaView;
  private pen!: PhaserPen;
  private tint = BASE_TINT;
  private tintTarget = BASE_TINT;
  private drift = 0;
  private onTint = (e: Event) => {
    this.tintTarget = ((e as CustomEvent<number | null>).detail ?? BASE_TINT) as number;
  };
  constructor() {
    super('backdrop');
  }
  create(): void {
    bakeGlow(this);
    this.view = new ArenaView(this, HANGAR, resolvedQuality());
    const g = this.add.graphics().setDepth(3);
    const gAdd = this.add.graphics().setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
    this.pen = new PhaserPen(g, gAdd, this, 5);
    this.cameras.main.setBackgroundColor(HANGAR.bg);
    this.fit();
    this.scale.on('resize', this.fit, this);
    window.addEventListener('elementick:tint', this.onTint);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.fit, this);
      window.removeEventListener('elementick:tint', this.onTint);
    });
    this.draw(0);
  }
  private fit(): void {
    const cam = this.cameras?.main;
    if (!cam) return;
    const z = Math.max(this.scale.width / WORLD_W, this.scale.height / WORLD_H) * 1.04;
    cam.setZoom(z);
    cam.centerOn(WORLD_W / 2 + this.drift, WORLD_H / 2 - 10);
  }
  private draw(t: number): void {
    this.view.update(t);
    this.pen.begin();
    this.tint = mix(this.tint, this.tintTarget, 0.05);
    this.pen.add(true);
    this.pen.glow(WORLD_W * 0.5, FLOOR_Y + 30, 560, this.tint, 0.3);
    this.pen.glow(WORLD_W * 0.5, FLOOR_Y - 200, 380, this.tint, 0.1);
    this.pen.add(false);
  }
  override update(time: number): void {
    if (settings.reducedMotion || settings.lowGraphics) {
      if (this.tint !== this.tintTarget) this.draw(0);
      return;
    }
    const t = time / 1000;
    // a slow camera drift shows the parallax between the layers
    this.drift = Math.sin(t * 0.06) * 60;
    this.fit();
    this.draw(t);
  }
}
