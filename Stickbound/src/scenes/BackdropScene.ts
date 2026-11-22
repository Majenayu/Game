// Menu backdrop: a dusk rooftop city behind the DOM menus, with a slow parallax drift, drifting light motes and a
// glow that takes the colour of the mode card under the pointer. Low graphics / reduced motion: a still picture.
import Phaser from 'phaser';
import { FLOOR_Y, WORLD_H, WORLD_W } from '../render/arenas';
import { bakeGlow, PhaserPen } from '../render/pen';
import { settings } from '../meta/settings';

const DUSK = [0x1b1f5a, 0x3a2a70, 0x6a3d86, 0xb4587a, 0xe07a5f, 0xffb46b];

function mix(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export class BackdropScene extends Phaser.Scene {
  private far!: Phaser.GameObjects.Graphics;
  private near!: Phaser.GameObjects.Graphics;
  private g!: Phaser.GameObjects.Graphics;
  private gAdd!: Phaser.GameObjects.Graphics;
  private pen!: PhaserPen;
  private tint = 0xffb46b;
  private tintTarget = 0xffb46b;
  private onTint = (e: Event) => {
    this.tintTarget = ((e as CustomEvent<number | null>).detail ?? 0xffb46b) as number;
  };

  constructor() {
    super('backdrop');
  }

  create(): void {
    bakeGlow(this);
    const sky = this.add.graphics().setDepth(0);
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const k = t * (DUSK.length - 1);
      const c = mix(DUSK[Math.floor(k)]!, DUSK[Math.min(DUSK.length - 1, Math.floor(k) + 1)]!, k % 1);
      sky.fillStyle(c, 1).fillRect(-600, -400 + (i * (FLOOR_Y + 400)) / 12 - 2, WORLD_W + 1200, (FLOOR_Y + 400) / 12 + 4);
    }
    sky.fillStyle(0xffe2a8, 0.9).fillCircle(WORLD_W * 0.62, FLOOR_Y - 230, 70);
    this.far = this.add.graphics().setDepth(1);
    this.near = this.add.graphics().setDepth(2);
    const skyline = (g: Phaser.GameObjects.Graphics, color: number, base: number, seedN: number, windows: boolean) => {
      let x = -600;
      let s = seedN;
      while (x < WORLD_W + 600) {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        const w = 60 + (s % 90);
        const hh = 90 + ((s >>> 8) % 280);
        g.fillStyle(color, 1).fillRect(x, base - hh, w, hh + 400);
        if (windows)
          for (let wy = base - hh + 16; wy < base - 16; wy += 26)
            for (let wx = x + 10; wx < x + w - 14; wx += 18) if (((wx * 7 + wy * 3 + seedN) & 7) < 2) g.fillStyle(0xffd98a, 0.8).fillRect(wx, wy, 8, 12);
        x += w + 8;
      }
    };
    skyline(this.far, 0x4a2f6a, FLOOR_Y - 60, 11, false);
    skyline(this.near, 0x22173e, FLOOR_Y + 40, 29, true);
    this.g = this.add.graphics().setDepth(3);
    this.gAdd = this.add.graphics().setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
    this.pen = new PhaserPen(this.g, this.gAdd, this, 5);
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
    const z = Math.max(this.scale.width / WORLD_W, this.scale.height / WORLD_H);
    cam.setZoom(z);
    cam.centerOn(WORLD_W / 2, WORLD_H / 2 - 10);
  }

  private draw(t: number): void {
    this.pen.begin();
    this.tint = mix(this.tint, this.tintTarget, 0.05);
    this.pen.add(true);
    this.pen.glow(WORLD_W * 0.5, FLOOR_Y, 520, this.tint, 0.28);
    this.pen.glow(WORLD_W * 0.62, FLOOR_Y - 230, 260, 0xffd08a, 0.35);
    for (let i = 0; i < 26; i++) {
      const x = ((i * 137 + t * (10 + (i % 5) * 4)) % (WORLD_W + 200)) - 100;
      const y = 120 + ((i * 71) % 420) + Math.sin(t * 0.6 + i) * 18;
      this.pen.glow(x, y, 8 + (i % 4) * 4, i % 3 ? 0xfff2c8 : this.tint, 0.45);
    }
    this.pen.add(false);
  }

  override update(time: number): void {
    if (settings.reducedMotion || settings.lowGraphics) {
      if (this.tint !== this.tintTarget) this.draw(0);
      return;
    }
    const t = time / 1000;
    this.far.x = Math.sin(t * 0.05) * 30;
    this.near.x = Math.sin(t * 0.05) * 70;
    this.draw(t);
  }
}
