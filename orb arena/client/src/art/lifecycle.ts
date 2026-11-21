import type Phaser from 'phaser';
import type { EffectId, Kind } from '@orb/shared';

export const VISUAL_KINDS: Kind[] = [
  'projectile', 'beam', 'volley', 'nova', 'cleave', 'shield', 'barrier',
  'heal', 'aura', 'buff', 'stealth', 'ambush', 'summon', 'mine', 'pull',
  'slow', 'dash', 'blink', 'portal', 'world',
];

export function lifecyclePhase(k: number): 'cast' | 'active' | 'end' {
  return k < 0.18 ? 'cast' : k < 0.78 ? 'active' : 'end';
}

export function drawCast(
  g: Phaser.GameObjects.Graphics,
  kind: string,
  x: number,
  y: number,
  angle: number,
  k: number,
  color: number,
): void {
  const index = Math.max(0, VISUAL_KINDS.indexOf(kind as Kind));
  const radius = 24 + k * 13;
  const count = 3 + (index % 5);
  g.lineStyle(2, color, 0.75).strokeCircle(x, y, radius);
  g.lineStyle(2, 0xffffff, 0.65).beginPath().arc(x, y, radius + 5, angle, angle + k * Math.PI * 2, false).strokePath();
  for (let i = 0; i < count; i++) {
    const a = angle + index * 0.11 + (i * Math.PI * 2) / count;
    g.lineStyle(2, color, 0.8).lineBetween(
      x + Math.cos(a) * (radius + 5), y + Math.sin(a) * (radius + 5),
      x + Math.cos(a) * (radius + 11), y + Math.sin(a) * (radius + 11),
    );
  }
}

export function drawEnd(
  g: Phaser.GameObjects.Graphics,
  kind: string,
  x: number,
  y: number,
  angle: number,
  k: number,
  color: number,
): void {
  const index = Math.max(0, VISUAL_KINDS.indexOf(kind as Kind));
  const count = 3 + (index % 5);
  const radius = 26 + k * (26 + index);
  for (let i = 0; i < count; i++) {
    const a = angle + (i * Math.PI * 2) / count + index * 0.23;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    g.lineStyle(2, color, (1 - k) * 0.75);
    if (index % 2) g.strokeCircle(px, py, 2 + (1 - k) * 3);
    else g.lineBetween(px, py, px + Math.cos(a) * 8, py + Math.sin(a) * 8);
  }
}

export function drawEffectGlyph(
  g: Phaser.GameObjects.Graphics,
  effect: EffectId,
  x: number,
  y: number,
  r: number,
  color: number,
): void {
  g.lineStyle(2, color, 1).fillStyle(color, 1);
  switch (effect) {
    case 'heal':
      g.lineBetween(x - r, y, x + r, y).lineBetween(x, y - r, x, y + r);
      break;
    case 'vampire':
      g.strokeCircle(x, y, r).lineBetween(x - r * 0.65, y, x + r * 0.65, y).lineBetween(x, y - r * 0.65, x, y + r * 0.65);
      break;
    case 'shield':
      g.beginPath().moveTo(x - r, y - r).lineTo(x + r, y - r).lineTo(x + r, y + r * 0.2).lineTo(x, y + r).lineTo(x - r, y + r * 0.2).closePath().strokePath();
      break;
    case 'freeze':
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        g.lineBetween(x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      break;
    case 'magnet':
      g.beginPath().arc(x, y, r, 0, Math.PI, false).strokePath().lineBetween(x - r, y, x - r, y - r).lineBetween(x + r, y, x + r, y - r);
      break;
    case 'ricochet':
      g.beginPath().moveTo(x - r, y + r).lineTo(x, y - r).lineTo(x + r, y + r).strokePath();
      break;
    case 'big':
      g.strokeCircle(x, y, r).fillCircle(x, y, 2);
      break;
    case 'triple':
      for (const off of [-r, 0, r]) g.fillCircle(x + off, y + Math.abs(off) * 0.4, 2);
      break;
    case 'pierce':
      g.lineBetween(x - r, y, x + r, y).lineBetween(x, y - r, x + r, y).lineBetween(x, y + r, x + r, y);
      break;
    case 'speed':
      for (const off of [-3, 3]) g.beginPath().moveTo(x - r + off, y - r).lineTo(x + off, y).lineTo(x - r + off, y + r).strokePath();
      break;
    case 'rapid':
      for (const off of [-r, 0, r]) g.lineBetween(x - r, y + off, x + r * 0.35, y + off).fillCircle(x + r, y + off, 1.5);
      break;
    default:
      g.beginPath().moveTo(x + r, y - r).lineTo(x - 2, y).lineTo(x + 2, y).lineTo(x - r, y + r).strokePath();
  }
}
