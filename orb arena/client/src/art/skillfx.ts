import Phaser from 'phaser';
import { ELEMENTS, RANKS, RANK_INFO, getSkill } from '@orb/shared';

/**
 * Every skill gets its own look: the style (rings, spikes, spiral, shards, petals, lightning), the number of
 * points and the spin come from the skill id, the colour from its element, and the size and brightness grow
 * with its rank and power. So two skills rarely look the same, and a stronger skill looks bigger.
 */
export interface SkillLook {
  style: number;
  points: number;
  spin: number;
  color: number;
  accent: number;
  /** 1 for rank F up to about 2.4 for unique skills. */
  scale: number;
}
export function lookOf(skillId: number, power = 0): SkillLook {
  const s = getSkill(skillId);
  let h = (skillId * 2654435761) >>> 0;
  const next = () => {
    h = (Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) ^ 0x9e3779b9;
    return (h >>> 0) / 4294967296;
  };
  const ri = Math.max(0, RANKS.indexOf(s.rank));
  const color = ELEMENTS[s.element]?.color ?? 0xff4da6;
  return {
    style: Math.floor(next() * 6),
    points: 4 + Math.floor(next() * 8),
    spin: (next() - 0.5) * 6,
    color,
    accent: RANK_INFO[s.rank].color,
    scale: 1 + ri * 0.18 + Math.min(0.4, power / 400),
  };
}

/** Draws one frame of a skill burst. \`q\` goes from 0 (start) to 1 (gone). */
export function drawBurst(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, q: number, l: SkillLook): void {
  const r = size * l.scale * (0.35 + 0.65 * q);
  const a = 1 - q;
  const rot = l.spin * q;
  g.fillStyle(l.color, 0.18 * a).fillCircle(x, y, r);
  g.lineStyle(3 + 5 * a * l.scale, l.color, a).strokeCircle(x, y, r);
  g.lineStyle(2, l.accent, a).strokeCircle(x, y, r * 0.7);
  const n = l.points;
  for (let i = 0; i < n; i++) {
    const t = rot + (i / n) * Math.PI * 2;
    const cx = Math.cos(t);
    const cy = Math.sin(t);
    switch (l.style) {
      case 0: // spikes
        g.lineStyle(4 * a + 1, l.color, a).lineBetween(x + cx * r * 0.4, y + cy * r * 0.4, x + cx * r * 1.25, y + cy * r * 1.25);
        break;
      case 1: // orbiting sparks
        g.fillStyle(0xffffff, a).fillCircle(x + cx * r, y + cy * r, 4 + 4 * l.scale * a);
        break;
      case 2: {
        // spiral arms
        const t2 = t + 0.9;
        g.lineStyle(3, l.color, a).lineBetween(x + cx * r * 0.3, y + cy * r * 0.3, x + Math.cos(t2) * r, y + Math.sin(t2) * r);
        break;
      }
      case 3: // shards
        g.fillStyle(l.color, a).fillTriangle(
          x + cx * r * 1.1,
          y + cy * r * 1.1,
          x + Math.cos(t + 0.12) * r * 0.75,
          y + Math.sin(t + 0.12) * r * 0.75,
          x + Math.cos(t - 0.12) * r * 0.75,
          y + Math.sin(t - 0.12) * r * 0.75,
        );
        break;
      case 4: // petals
        g.fillStyle(l.accent, 0.5 * a).fillEllipse(x + cx * r * 0.7, y + cy * r * 0.7, r * 0.5, r * 0.22);
        break;
      default: {
        // lightning
        const mx = x + cx * r * 0.6 + (i % 2 ? 10 : -10);
        const my = y + cy * r * 0.6;
        g.lineStyle(3, 0xffffff, a).lineBetween(x, y, mx, my).lineBetween(mx, my, x + cx * r * 1.2, y + cy * r * 1.2);
      }
    }
  }
}

/** A projectile shaped by its skill (orb, star, shard, crescent, ring or bolt). */
export function drawShot(g: Phaser.GameObjects.Graphics, x: number, y: number, vx: number, l: SkillLook, now: number): void {
  const r = 9 * l.scale;
  const d = Math.sign(vx) || 1;
  g.fillStyle(l.color, 0.3).fillCircle(x, y, r * 2.2);
  g.lineStyle(5, l.color, 0.5).lineBetween(x - d * r * 4, y, x, y);
  const spin = now / 80;
  switch (l.style) {
    case 0: {
      const pts: Phaser.Types.Math.Vector2Like[] = [];
      for (let i = 0; i < 10; i++) {
        const a = spin + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.5 : r * 1.3;
        pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
      }
      g.fillStyle(0xffffff, 1).fillPoints(pts, true);
      break;
    }
    case 1:
      g.fillStyle(0xffffff, 1).fillTriangle(x + d * r * 1.6, y, x - d * r, y - r, x - d * r, y + r);
      break;
    case 2:
      g.lineStyle(5, 0xffffff, 1).beginPath();
      g.arc(x, y, r * 1.2, -1.2 + (d < 0 ? Math.PI : 0), 1.2 + (d < 0 ? Math.PI : 0), false);
      g.strokePath();
      break;
    case 3:
      g.lineStyle(4, 0xffffff, 1).strokeCircle(x, y, r);
      g.fillStyle(l.accent, 1).fillCircle(x, y, r * 0.4);
      break;
    case 4:
      g.lineStyle(4, 0xffffff, 1).lineBetween(x - d * r, y - r, x, y + r * 0.2).lineBetween(x, y + r * 0.2, x + d * r * 1.3, y - r * 0.4);
      break;
    default:
      g.fillStyle(0xffffff, 1).fillCircle(x, y, r);
      g.fillStyle(l.accent, 1).fillCircle(x, y, r * 0.5);
  }
}
