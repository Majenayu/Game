// Menu backdrop: an arena with two idle stick figures sparring in slow motion behind the DOM menus.
import Phaser from 'phaser';
import { DEFAULT_LOOK } from '../content/looks';
import { arenaById, FLOOR_Y, WORLD_H, WORLD_W } from '../render/arenas';
import { PhaserPen } from '../render/pen';
import { bakeArena } from '../render/bake';
import { drawStick, mix, POSES, solve } from '../render/rig';
import { ELEMENTS } from '../content/elements';
import { settings } from '../meta/settings';

export class BackdropScene extends Phaser.Scene {
  private arenaId = 'rooftop';
  private g!: Phaser.GameObjects.Graphics;
  private pen!: PhaserPen;
  private cloth: { x: number; y: number }[][] = [[], []];

  constructor() {
    super('backdrop');
  }

  init(data: { arena?: string }): void {
    if (data?.arena) this.arenaId = data.arena;
  }

  create(): void {
    const a = arenaById(this.arenaId);
    bakeArena(this, a);
    this.g = this.add.graphics();
    this.pen = new PhaserPen(this.g);
    this.cameras.main.setBackgroundColor(a.sky[0]);
    this.fit();
    this.scale.on('resize', this.fit, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.fit, this));
  }

  private fit(): void {
    const cam = this.cameras?.main;
    if (!cam) return;
    const z = Math.max(this.scale.width / WORLD_W, this.scale.height / WORLD_H);
    cam.setZoom(z);
    cam.centerOn(WORLD_W / 2, WORLD_H / 2 - 10);
  }

  override update(time: number): void {
    const t = settings.reducedMotion ? 0 : time / 1000;
    this.g.clear();
    const k = (Math.sin(t * 1.3) + 1) / 2;
    const p0 = mix(POSES.idle!, POSES.jab1!, k * k * 0.9);
    const p1 = mix(POSES.idle!, POSES.guard!, k);
    const looks = [
      { ...DEFAULT_LOOK, hat: 1 },
      { ...DEFAULT_LOOK, hat: 2, back: 0, eyes: 5, body: 1 },
    ];
    const els = [ELEMENTS.fire, ELEMENTS.water];
    [
      [WORLD_W / 2 - 120, 1, p0],
      [WORLD_W / 2 + 120, -1, p1],
    ].forEach(([x, face, pose], i) => {
      const s = 1.2;
      const j = solve(pose as typeof p0, x as number, FLOOR_Y + Math.sin(t * 2 + i) * 2, face as number, s);
      this.pen.line((x as number) - 36, FLOOR_Y + 2, (x as number) + 36, FLOOR_Y + 2, 8, 0, 0.15);
      drawStick(this.pen, j, face as number, s, {
        look: looks[i]!,
        element: els[i]!.color[0],
        elementLight: els[i]!.color[1],
        expression: i === 0 ? 'determined' : 'smug',
        aura: 0.35,
        cloth: this.cloth[i],
        time: t,
      });
    });
  }
}
