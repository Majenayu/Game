import type Phaser from 'phaser';
import { WORLD_H, WORLD_W, type MapDef } from '@orb/shared';

/** Decorative environment art only; map geometry and hazards remain authoritative. */
export function drawArena(g: Phaser.GameObjects.Graphics, map: MapDef): void {
  const t = map.theme;
  g.clear().fillStyle(t.bg, 1).fillRect(0, 0, WORLD_W, WORLD_H);
  for (let y = 0; y < WORLD_H; y += 80)
    for (let x = 0; x < WORLD_W; x += 80)
      g.fillStyle((x / 80 + y / 80) % 2 ? 0x182b3b : 0x152234, 0.1).fillRect(x + 2, y + 2, 76, 76);

  g.lineStyle(1, t.grid, 0.5);
  for (let x = 0; x <= WORLD_W; x += 160) g.lineBetween(x, 0, x, WORLD_H);
  for (let y = 0; y <= WORLD_H; y += 160) g.lineBetween(0, y, WORLD_W, y);

  for (let i = 0; i < 12; i++) {
    const x = 100 + (i * 277) % 1400;
    const y = 100 + (i * 173) % 700;
    g.lineStyle(2, t.accent, 0.06);
    switch (map.id) {
      case 'crossfire':
        g.strokeRect(x - 30, y - 30, 60, 60).lineBetween(x - 50, y, x + 50, y);
        break;
      case 'pillars':
        g.strokeEllipse(x, y, 85, 38).strokeEllipse(x, y, 52, 24);
        break;
      case 'fortress':
        g.strokeRoundedRect(x - 40, y - 22, 80, 44, 3).lineBetween(x, y - 22, x, y + 22);
        break;
      case 'lava':
        g.beginPath().moveTo(x - 50, y + 20).lineTo(x - 12, y).lineTo(x + 8, y + 15).lineTo(x + 55, y - 25).strokePath();
        break;
      case 'maze':
        g.lineBetween(x - 45, y + 30, x - 45, y - 30).lineBetween(x - 45, y - 30, x + 40, y - 30).lineBetween(x + 40, y - 30, x + 40, y);
        break;
      default:
        g.lineBetween(x - 45, y, x, y).lineBetween(x, y, x + 24, y - 24).strokeCircle(x + 24, y - 24, 4);
    }
  }

  g.lineStyle(2, t.accent, 0.09).strokeCircle(WORLD_W / 2, WORLD_H / 2, 104);
  g.lineStyle(1, t.accent, 0.06).strokeCircle(WORLD_W / 2, WORLD_H / 2, 132);

  for (const h of map.hazards) {
    g.fillStyle(t.hazard, 0.15).fillRoundedRect(h.x, h.y, h.w, h.h, 8);
    g.lineStyle(2, t.hazard, 0.8).strokeRoundedRect(h.x, h.y, h.w, h.h, 8);
    g.lineStyle(2, t.hazard, 0.35);
    for (let x = h.x + 10; x < h.x + h.w - 10; x += 22)
      g.lineBetween(x, h.y + 4, Math.min(x + 12, h.x + h.w - 4), h.y + 15);
  }

  for (const o of map.obstacles) {
    g.fillStyle(0x020712, 0.55).fillRoundedRect(o.x + 5, o.y + 8, o.w, o.h, 5);
    g.fillStyle(t.wallLine, 0.06).fillRoundedRect(o.x - 7, o.y - 7, o.w + 14, o.h + 14, 8);
    g.fillStyle(t.wall, 1).fillRoundedRect(o.x, o.y, o.w, o.h, 5);
    g.lineStyle(2, t.wallLine, 0.55).strokeRoundedRect(o.x, o.y, o.w, o.h, 5);
    g.lineStyle(2, 0xc1edff, 0.23).lineBetween(o.x + 4, o.y + 3, o.x + o.w - 4, o.y + 3);
    g.fillStyle(t.accent, 0.5).fillRect(o.x + 6, o.y + 6, Math.min(18, o.w - 12), 2);
  }

  g.lineStyle(12, 0x020712, 0.7).strokeRect(0, 0, WORLD_W, WORLD_H);
  g.lineStyle(2, t.accent, 0.6).strokeRect(3, 3, WORLD_W - 6, WORLD_H - 6);
}
