import type Phaser from 'phaser';
import { drawCast, drawEnd, lifecyclePhase } from './lifecycle';
import { presentation } from '../presentation';

/**
 * Skill animation engine. Every skill plays two layers:
 *  - a MOTION by skill kind (shock ring, healing column, shield dome, dash streak, pull vortex, summon circle ...)
 *  - an ELEMENT motif (flames, ice crystals, lightning, void spiral, light pillars, shadow tendrils, toxic bubbles,
 *    spinning blades, wind arcs, blood drops, falling stars, gravity rings).
 * k goes from 0 (start) to 1 (end). s is the size scale (rank and power; uniques are huge).
 */
type G = Phaser.GameObjects.Graphics;
const TAU = Math.PI * 2;
const hash = (i: number, seed: number) => {
  const v = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

export function drawSkillAnim(g: G, kind: string, element: number, x: number, y: number, angle: number, k: number, s: number, color: number, seed: number): void {
  if (lifecyclePhase(k) === 'cast') {
    drawCast(g, kind, x, y, angle, k / 0.18, color);
    return;
  }
  if (lifecyclePhase(k) === 'end') {
    drawEnd(g, kind, x, y, angle, (k - 0.78) / 0.22, color);
    return;
  }
  if (!presentation.prefs.motion) {
    drawCast(g, kind, x, y, angle, 0.65, color);
    return;
  }
  const a = Math.max(0, 1 - k);
  const R = 52 * s;
  motion(g, kind, x, y, angle, k, a, R, color, seed);
  if (presentation.budget.detail > 0.5) motif(g, element, x, y, angle, k, a * 0.65, R, color, seed);
  else drawCast(g, kind, x, y, angle, k, color);
}

function motion(g: G, kind: string, x: number, y: number, ang: number, k: number, a: number, R: number, c: number, seed: number): void {
  switch (kind) {
    case 'projectile':
    case 'beam':
    case 'volley':
    case 'cleave': {
      const count = kind === 'volley' ? 5 : kind === 'cleave' ? 3 : 1;
      for (let i = 0; i < count; i++) {
        const dir = ang + (i - (count - 1) / 2) * 0.22;
        const dx = Math.cos(dir), dy = Math.sin(dir);
        const length = kind === 'beam' ? R * 1.5 : R * 0.6;
        g.lineStyle(kind === 'beam' ? 4 : 2, c, a).lineBetween(x + dx * 26, y + dy * 26, x + dx * (32 + length * k), y + dy * (32 + length * k));
      }
      if (kind === 'cleave') g.lineStyle(5, 0xe3f8ff, a).beginPath().arc(x, y, R * 0.7, ang - 0.9 + k, ang + 0.9 + k, false).strokePath();
      break;
    }
    case 'nova':
    case 'world': {
      // double shock wave with a bright core
      for (const d of [0, 0.18]) {
        const q = Math.min(1, Math.max(0, k - d) * 1.3);
        g.lineStyle(14 * (1 - q) + 2, c, (1 - q) * 0.9).strokeCircle(x, y, R * 1.4 * q);
      }
      g.fillStyle(0xffffff, 0.6 * a * a).fillCircle(x, y, R * 0.35 * (1 - k * 0.5));
      if (kind === 'world') g.lineStyle(2, c, a).strokeEllipse(x, y, R * 2.6, R * 0.7).strokeEllipse(x, y, R * 0.7, R * 2.6);
      break;
    }
    case 'heal': {
      g.fillStyle(0x7dff6b, 0.18 * a).fillRect(x - R * 0.35, y - R * 1.6 * k, R * 0.7, R * 1.6 * k + 20);
      for (let i = 0; i < 8; i++) {
        const px = x + (hash(i, seed) - 0.5) * R;
        const py = y + 20 - k * R * (0.8 + hash(i + 9, seed));
        g.fillStyle(0x7dff6b, a).fillRect(px - 9, py - 3, 18, 6).fillRect(px - 3, py - 9, 6, 18);
      }
      break;
    }
    case 'shield':
    case 'barrier': {
      // hexagon dome
      const r = R * (0.55 + 0.25 * Math.min(1, k * 3));
      const pts: Phaser.Types.Math.Vector2Like[] = [];
      for (let i = 0; i < 6; i++) pts.push({ x: x + Math.cos(i * (TAU / 6) + 0.5) * r, y: y + Math.sin(i * (TAU / 6) + 0.5) * r });
      g.fillStyle(c, 0.15 * a).fillPoints(pts, true);
      g.lineStyle(5, c, a).strokePoints(pts, true);
      g.lineStyle(2, 0xffffff, a * 0.8);
      for (const p of pts) g.lineBetween(x, y, p.x, p.y);
      if (kind === 'barrier') g.lineStyle(3, c, a).strokeRoundedRect(x - r, y - r * 0.6, r * 2, r * 1.2, 7);
      break;
    }
    case 'buff':
    case 'aura': {
      // rising arrows spiralling around the caster
      for (let i = 0; i < 6; i++) {
        const t = i * (TAU / 6) + k * 6;
        const px = x + Math.cos(t) * R * 0.5;
        const py = y + Math.sin(t) * R * 0.25 - k * R * 0.6;
        g.fillStyle(c, a).fillTriangle(px, py - 14, px - 9, py + 4, px + 9, py + 4);
      }
      g.lineStyle(4, c, a).strokeEllipse(x, y + 10, R * 1.1, R * 0.4);
      if (kind === 'aura') g.lineStyle(2, c, a).strokeCircle(x, y, R * 0.75).strokeCircle(x, y, R * 0.9);
      break;
    }
    case 'dash':
    case 'blink':
    case 'ambush': {
      // after-images along the direction of travel and a flash at the end
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      for (let i = 0; i < 6; i++) {
        const d = -i * 26 * (1 + k);
        g.fillStyle(c, (0.5 - i * 0.07) * a).fillCircle(x + dx * d, y + dy * d, 20 - i * 2);
      }
      g.lineStyle(6, 0xffffff, a).lineBetween(x - dx * R, y - dy * R, x, y);
      if (kind !== 'dash') g.fillStyle(0xffffff, 0.7 * a * a).fillCircle(x, y, R * 0.5 * (1 - a));
      if (kind === 'blink') g.lineStyle(2, c, a).strokeTriangle(x, y - R * 0.7, x - R * 0.5, y + R * 0.35, x + R * 0.5, y + R * 0.35);
      if (kind === 'ambush') g.lineStyle(3, c, a).lineBetween(x - R * 0.5, y - R * 0.3, x + R * 0.5, y + R * 0.3).lineBetween(x - R * 0.5, y + R * 0.3, x + R * 0.5, y - R * 0.3);
      break;
    }
    case 'pull':
    case 'slow': {
      // arrows sucked into the centre
      for (let i = 0; i < 10; i++) {
        const t = i * (TAU / 10) + k;
        const d = R * 1.3 * (1 - k);
        const px = x + Math.cos(t) * d;
        const py = y + Math.sin(t) * d;
        g.lineStyle(4, c, a).lineBetween(px, py, px - Math.cos(t) * 26, py - Math.sin(t) * 26);
      }
      g.lineStyle(3, c, a * 0.7).strokeCircle(x, y, R * 1.3 * (1 - k * 0.7));
      if (kind === 'slow') {
        g.lineStyle(3, c, a).lineBetween(x, y - R * 0.3, x, y).lineBetween(x, y, x + R * 0.2, y + R * 0.1);
        g.strokeCircle(x, y, R * 0.5);
      }
      break;
    }
    case 'summon':
    case 'mine':
    case 'portal': {
      // magic circle with turning runes
      const r = R * 0.8;
      g.lineStyle(4, c, a).strokeCircle(x, y, r);
      g.lineStyle(2, 0xffffff, a).strokeCircle(x, y, r * 0.75);
      for (let i = 0; i < 5; i++) {
        const t1 = i * (TAU / 5) + k * 2;
        const t2 = (i + 2) * (TAU / 5) + k * 2;
        g.lineBetween(x + Math.cos(t1) * r * 0.75, y + Math.sin(t1) * r * 0.75, x + Math.cos(t2) * r * 0.75, y + Math.sin(t2) * r * 0.75);
      }
      if (kind === 'portal') g.fillStyle(0x000000, 0.5 * a).fillCircle(x, y, r * 0.5);
      if (kind === 'mine') g.lineStyle(3, c, a).strokeTriangle(x, y - r * 0.5, x - r * 0.5, y + r * 0.4, x + r * 0.5, y + r * 0.4);
      break;
    }
    case 'stealth': {
      for (let i = 0; i < 9; i++) {
        const px = x + (hash(i, seed) - 0.5) * R;
        const py = y + (hash(i + 4, seed) - 0.5) * R * 0.6 - k * 30;
        g.fillStyle(0x6b6f8a, 0.4 * a).fillCircle(px, py, 18 + k * 30);
      }
      break;
    }
    default: {
      // projectile, volley, beam, cleave: a muzzle burst in the aim direction
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      g.fillStyle(c, 0.5 * a).fillCircle(x + dx * 30, y + dy * 30, 26 * (1 + k));
      for (let i = -2; i <= 2; i++) {
        const t = ang + i * 0.25;
        g.lineStyle(4, 0xffffff, a).lineBetween(x + Math.cos(t) * 30, y + Math.sin(t) * 30, x + Math.cos(t) * (60 + k * R), y + Math.sin(t) * (60 + k * R));
      }
    }
  }
}

function motif(g: G, el: number, x: number, y: number, ang: number, k: number, a: number, R: number, c: number, seed: number): void {
  const n = 10;
  switch (el) {
    case 0: // flame tongues rising
      for (let i = 0; i < n; i++) {
        const px = x + (hash(i, seed) - 0.5) * R * 1.6;
        const py = y + R * 0.3 - k * R * (0.6 + hash(i + 3, seed));
        const h = 30 * a + 10;
        g.fillStyle(i % 2 ? 0xff6b3d : 0xffc93c, a).fillTriangle(px, py - h, px - 9, py + 6, px + 9, py + 6);
      }
      break;
    case 1: // ice crystals
      for (let i = 0; i < 7; i++) {
        const t = i * (TAU / 7) + seed;
        const d = R * (0.4 + 0.7 * k);
        const px = x + Math.cos(t) * d;
        const py = y + Math.sin(t) * d;
        g.lineStyle(3, 0xdff6ff, a);
        for (let j = 0; j < 3; j++) {
          const u = (j * Math.PI) / 3;
          g.lineBetween(px - Math.cos(u) * 12, py - Math.sin(u) * 12, px + Math.cos(u) * 12, py + Math.sin(u) * 12);
        }
      }
      break;
    case 2: // lightning bolts from the sky
      for (let i = 0; i < 4; i++) {
        let px = x + (hash(i, seed + Math.floor(k * 6)) - 0.5) * R * 1.5;
        let py = y - R * 1.5;
        g.lineStyle(4, 0xffffff, a);
        for (let j = 0; j < 5; j++) {
          const nx = px + (hash(i * 7 + j, seed + Math.floor(k * 8)) - 0.5) * 40;
          const ny = py + R * 0.3;
          g.lineBetween(px, py, nx, ny);
          px = nx;
          py = ny;
        }
        g.lineStyle(9, 0xffe14d, 0.35 * a).lineBetween(px, py - R * 1.5, px, py);
      }
      break;
    case 3: // void spiral collapsing inward
    case 11: // gravity rings
      for (let i = 0; i < 4; i++) {
        const r = R * (1.3 - ((k + i * 0.25) % 1) * 1.2);
        if (el === 3) {
          g.lineStyle(3, 0xb77dff, a).beginPath();
          g.arc(x, y, Math.max(4, r), k * 8 + i, k * 8 + i + 2.4, false);
          g.strokePath();
        } else g.lineStyle(3, 0x9aa6ff, a).strokeEllipse(x, y, Math.max(4, r) * 2, Math.max(4, r) * 0.9);
      }
      g.fillStyle(0x12002a, 0.6 * a).fillCircle(x, y, 18);
      break;
    case 4: // light pillars
      for (let i = 0; i < 5; i++) {
        const px = x + (i - 2) * R * 0.35;
        g.fillStyle(0xfff6c4, 0.35 * a).fillRect(px - 8, y - R * 1.6, 16, R * 1.6 + 20);
      }
      break;
    case 5: // shadow tendrils
      for (let i = 0; i < 8; i++) {
        const t = i * (TAU / 8) + seed;
        g.lineStyle(6 * a + 1, 0x2a1640, a).beginPath();
        g.moveTo(x, y);
        for (let j = 1; j <= 6; j++) {
          const d = (R * 1.2 * k * j) / 6;
          g.lineTo(x + Math.cos(t + Math.sin(j + k * 6) * 0.4) * d, y + Math.sin(t + Math.sin(j + k * 6) * 0.4) * d);
        }
        g.strokePath();
      }
      break;
    case 6: // toxic bubbles
      for (let i = 0; i < 12; i++) {
        const px = x + (hash(i, seed) - 0.5) * R * 1.6;
        const py = y + (hash(i + 5, seed) - 0.5) * R - k * 40;
        g.lineStyle(2, 0x8be04d, a).strokeCircle(px, py, 5 + hash(i + 2, seed) * 12 * (0.5 + k));
      }
      break;
    case 7: // spinning blades
      for (let i = 0; i < 4; i++) {
        const t = i * (TAU / 4) + k * 10;
        const px = x + Math.cos(t) * R * 0.8;
        const py = y + Math.sin(t) * R * 0.8;
        g.fillStyle(0xdfe8ff, a).fillTriangle(px + Math.cos(t + 1.6) * 22, py + Math.sin(t + 1.6) * 22, px - Math.cos(t + 1.6) * 22, py - Math.sin(t + 1.6) * 22, px + Math.cos(t) * 10, py + Math.sin(t) * 10);
      }
      break;
    case 8: // wind arcs
      for (let i = 0; i < 5; i++) {
        g.lineStyle(4, 0xe6fff6, a).beginPath();
        g.arc(x, y, R * (0.4 + i * 0.2) * (0.6 + k), ang + k * 5 + i, ang + k * 5 + i + 1.2, false);
        g.strokePath();
      }
      break;
    case 9: // blood drops splash
      for (let i = 0; i < 12; i++) {
        const t = i * (TAU / 12) + seed;
        const d = R * k * (0.6 + hash(i, seed) * 0.6);
        g.fillStyle(0xd0103a, a).fillCircle(x + Math.cos(t) * d, y + Math.sin(t) * d + k * k * 40, 6 * a + 2);
      }
      break;
    case 10: // falling stars
      for (let i = 0; i < 6; i++) {
        const px = x + (hash(i, seed) - 0.5) * R * 1.6;
        const py = y - R + ((k * 1.6 + hash(i + 3, seed)) % 1) * R * 1.6;
        const pts: Phaser.Types.Math.Vector2Like[] = [];
        for (let j = 0; j < 10; j++) {
          const t = (j * Math.PI) / 5 + k * 4;
          const rr = j % 2 ? 5 : 12;
          pts.push({ x: px + Math.cos(t) * rr, y: py + Math.sin(t) * rr });
        }
        g.fillStyle(0xffe58a, a).fillPoints(pts, true);
      }
      break;
    default:
      g.lineStyle(3, c, a).strokeCircle(x, y, R * k);
  }
}
