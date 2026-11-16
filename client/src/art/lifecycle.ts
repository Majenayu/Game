import type Phaser from 'phaser';
import { type Kind, type EffectId } from '@orb/shared';

export const VISUAL_KINDS: Kind[] = ['projectile', 'beam', 'volley', 'nova', 'cleave', 'shield', 'barrier', 'heal', 'aura', 'buff', 'stealth', 'ambush', 'summon', 'mine', 'pull', 'slow', 'dash', 'blink', 'portal', 'world'];
export function lifecyclePhase(k: number): 'cast' | 'active' | 'end' {
  return k < 0.18 ? 'cast' : k < 0.78 ? 'active' : 'end';
}

/** Caster-local glyph: not a fabricated damage radius or an extra cast delay. */
export function drawCast(g: Phaser.GameObjects.Graphics, kind: string, x: number, y: number, angle: number, k: number, color: number): void {
  const index = Math.max(0, VISUAL_KINDS.indexOf(kind as Kind));
  const radius = 26 + k * 12;
  angle += index * 0.13;
  const count = 3 + index % 6;
  g.lineStyle(2, color, 0.8).strokeCircle(x, y, radius);
  g.lineStyle(3, 0xe5faff, 0.7).beginPath().arc(x, y, radius + 5, angle, angle + k * Math.PI * 2, false).strokePath();
  for (let i = 0; i < count; i++) {
    const a = angle + i * Math.PI * 2 / count;
    const r = radius + 8 + index % 3 * 3;
    g.lineStyle(2, color, 0.8).lineBetween(x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a) * (r + 5), y + Math.sin(a) * (r + 5));
  }
}
export function drawEnd(g: Phaser.GameObjects.Graphics, kind: string, x: number, y: number, angle: number, k: number, color: number): void {
  const index = Math.max(0, VISUAL_KINDS.indexOf(kind as Kind));
  const count = 3 + index % 5;
  const radius = 25 + k * (30 + index);
  for (let i = 0; i < count; i++) {
    const a = angle + i * Math.PI * 2 / count + index * 0.3;
    const px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius;
    g.lineStyle(2, color, (1 - k) * 0.7);
    if (index % 2) g.strokeCircle(px, py, 2 + (1 - k) * 3);
    else g.lineBetween(px, py, px + Math.cos(a) * 8, py + Math.sin(a) * 8);
  }
}
export function drawEffectGlyph(g: Phaser.GameObjects.Graphics, effect: EffectId, x: number, y: number, r: number, color: number): void {
  g.lineStyle(2, color, 1).fillStyle(color, 1);
  switch (effect) {
    case 'heal':
    case 'vampire':
      g.lineBetween(x - r, y, x + r, y).lineBetween(x, y - r, x, y + r);
      if (effect === 'vampire') g.strokeCircle(x, y, r + 3);
      break;
    case 'shield':
      g.beginPath().moveTo(x - r, y - r).lineTo(x + r, y - r).lineTo(x + r, y + r * 0.2).lineTo(x, y + r).lineTo(x - r, y + r * 0.2).closePath().strokePath();
      break;
    case 'freeze':
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI / 3;
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
      for (const offset of [-r, 0, r]) g.fillCircle(x + offset, y + Math.abs(offset) * 0.5, 2);
      break;
    case 'pierce':
      g.lineBetween(x - r, y, x + r, y).lineBetween(x, y - r, x + r, y).lineBetween(x, y + r, x + r, y);
      break;
    case 'speed':
      for (const off of [-3, 3]) g.beginPath().moveTo(x - r + off, y - r).lineTo(x + off, y).lineTo(x - r + off, y + r).strokePath();
      break;
    case 'rapid':
      for (const off of [-r,0,r]) g.lineBetween(x-r,y+off,x+r*.4,y+off).fillCircle(x+r,y+off,1.5);
      break;
    default:
      g.beginPath().moveTo(x + r, y - r).lineTo(x - 2, y).lineTo(x + 2, y).lineTo(x - r, y + r).strokePath();
  }
}
