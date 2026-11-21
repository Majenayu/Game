import type Phaser from 'phaser';
import { WORLD_H, WORLD_W, type MapDef } from '@orb/shared';
import { shade } from './render';

/**
 * Decorative environment art only; map geometry and hazards remain authoritative.
 * Drawn once per map into a render texture (see GameScene.applyMap), so the detail costs nothing per frame.
 * Layers: lit floor, floor pattern for the map's style, light pools, hazards, 3D walls, framed border.
 */
type FloorStyle = 'hex' | 'stripes' | 'plates' | 'bricks' | 'rock' | 'circuit' | 'carpet';

const STYLE: Record<string, FloorStyle> = {
  neon: 'hex',
  crossfire: 'stripes',
  pillars: 'plates',
  fortress: 'bricks',
  lava: 'rock',
  maze: 'circuit',
  throne: 'carpet',
  citadel: 'bricks',
  crypt: 'bricks',
  dunes: 'rock',
  canyon: 'rock',
  foundry: 'rock',
  orbit: 'circuit',
  clockwork: 'circuit',
  finale: 'carpet',
  solar: 'carpet',
};
const STYLES: FloorStyle[] = ['hex', 'plates', 'circuit', 'stripes', 'bricks', 'rock'];

export function floorStyle(id: string): FloorStyle {
  if (STYLE[id]) return STYLE[id];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return STYLES[h % STYLES.length];
}

/** A soft round light: many stacked circles with tiny alpha. */
function glow(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number, alpha: number, steps = 14): void {
  for (let i = steps; i > 0; i--) g.fillStyle(color, alpha / steps).fillCircle(x, y, (r * i) / steps);
}

/** Small deterministic random so the same map always looks the same. */
function rng(seed: string): () => number {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function floor(g: Phaser.GameObjects.Graphics, map: MapDef, style: FloorStyle): void {
  const t = map.theme;
  const r = rng(map.id);
  const lineA = shade(t.grid, 0.25);
  switch (style) {
    case 'hex': {
      const s = 46;
      const w = s * Math.sqrt(3);
      g.lineStyle(1, lineA, 0.35);
      for (let row = -1; row * s * 1.5 < WORLD_H + s; row++)
        for (let col = -1; col * w < WORLD_W + w; col++) {
          const cx = col * w + (row % 2 ? w / 2 : 0);
          const cy = row * s * 1.5;
          const pts = Array.from({ length: 6 }, (_, k) => {
            const a = Math.PI / 6 + (k * Math.PI) / 3;
            return { x: cx + Math.cos(a) * s, y: cy + Math.sin(a) * s };
          });
          g.strokePoints(pts, true);
          if (r() < 0.08) g.fillStyle(t.accent, 0.05).fillPoints(pts, true);
        }
      break;
    }
    case 'stripes': {
      // Lanes of hazard stripes across the middle, with target marks.
      g.fillStyle(shade(t.bg, 0.06), 1).fillRect(0, WORLD_H / 2 - 60, WORLD_W, 120);
      g.lineStyle(10, t.accent, 0.05);
      for (let x = -120; x < WORLD_W + 120; x += 48) g.lineBetween(x, WORLD_H / 2 - 60, x + 60, WORLD_H / 2 + 60);
      g.lineStyle(1, lineA, 0.3);
      for (let x = 0; x <= WORLD_W; x += 100) g.lineBetween(x, 0, x, WORLD_H);
      for (const [x, y] of [[300, 220], [1300, 680], [1300, 220], [300, 680]]) {
        g.lineStyle(2, t.accent, 0.12).strokeCircle(x, y, 42).strokeCircle(x, y, 22);
        g.lineBetween(x - 56, y, x + 56, y).lineBetween(x, y - 56, x, y + 56);
      }
      break;
    }
    case 'plates': {
      g.lineStyle(1, lineA, 0.22);
      for (let y = 0; y <= WORLD_H; y += 100) g.lineBetween(0, y, WORLD_W, y);
      for (let x = 0; x <= WORLD_W; x += 100) g.lineBetween(x, 0, x, WORLD_H);
      for (let i = 0; i < 14; i++) {
        const x = 80 + r() * (WORLD_W - 160);
        const y = 80 + r() * (WORLD_H - 160);
        const rad = 34 + r() * 40;
        g.fillStyle(shade(t.bg, 0.08), 1).fillCircle(x, y, rad);
        g.lineStyle(2, lineA, 0.45).strokeCircle(x, y, rad);
        g.lineStyle(1, t.accent, 0.1).strokeCircle(x, y, rad * 0.6);
      }
      break;
    }
    case 'bricks': {
      const bw = 96;
      const bh = 48;
      for (let row = 0; row * bh < WORLD_H; row++)
        for (let col = -1; col * bw < WORLD_W; col++) {
          const x = col * bw + (row % 2 ? bw / 2 : 0);
          const y = row * bh;
          g.fillStyle(shade(t.bg, 0.03 + r() * 0.07), 1).fillRect(x + 2, y + 2, bw - 4, bh - 4);
          g.lineStyle(1, shade(t.bg, 0.22), 0.5).lineBetween(x + 2, y + 2, x + bw - 2, y + 2);
          g.lineStyle(1, 0x000000, 0.35).lineBetween(x + 2, y + bh - 2, x + bw - 2, y + bh - 2);
        }
      break;
    }
    case 'rock': {
      for (let i = 0; i < 70; i++) {
        const x = r() * WORLD_W;
        const y = r() * WORLD_H;
        g.fillStyle(shade(t.bg, 0.04 + r() * 0.05), 0.55).fillEllipse(x, y, 60 + r() * 120, 30 + r() * 60);
      }
      // Glowing cracks.
      for (let i = 0; i < 16; i++) {
        let x = r() * WORLD_W;
        let y = r() * WORLD_H;
        const pts = [{ x, y }];
        for (let k = 0; k < 5; k++) {
          x += (r() - 0.5) * 140;
          y += (r() - 0.5) * 90;
          pts.push({ x, y });
        }
        g.lineStyle(7, t.accent, 0.05).strokePoints(pts);
        g.lineStyle(2, t.accent, 0.28).strokePoints(pts);
      }
      break;
    }
    case 'circuit': {
      g.lineStyle(1, lineA, 0.25);
      for (let x = 0; x <= WORLD_W; x += 80) g.lineBetween(x, 0, x, WORLD_H);
      for (let y = 0; y <= WORLD_H; y += 80) g.lineBetween(0, y, WORLD_W, y);
      for (let i = 0; i < 40; i++) {
        let x = Math.round((r() * WORLD_W) / 40) * 40;
        let y = Math.round((r() * WORLD_H) / 40) * 40;
        const pts = [{ x, y }];
        for (let k = 0; k < 4; k++) {
          if (k % 2) x += (r() < 0.5 ? -1 : 1) * 40 * (1 + Math.floor(r() * 3));
          else y += (r() < 0.5 ? -1 : 1) * 40 * (1 + Math.floor(r() * 3));
          pts.push({ x, y });
        }
        g.lineStyle(2, t.accent, 0.16).strokePoints(pts);
        g.fillStyle(t.accent, 0.35).fillCircle(x, y, 3);
      }
      for (let i = 0; i < 8; i++) {
        const x = 120 + r() * (WORLD_W - 240);
        const y = 120 + r() * (WORLD_H - 240);
        g.fillStyle(shade(t.bg, 0.1), 1).fillRect(x - 22, y - 14, 44, 28);
        g.lineStyle(1, t.accent, 0.25).strokeRect(x - 22, y - 14, 44, 28);
        for (let p = -16; p <= 16; p += 8) g.lineBetween(x + p, y - 14, x + p, y - 20).lineBetween(x + p, y + 14, x + p, y + 20);
      }
      break;
    }
    case 'carpet': {
      g.lineStyle(1, lineA, 0.2);
      for (let x = 0; x <= WORLD_W; x += 100) g.lineBetween(x, 0, x, WORLD_H);
      for (let y = 0; y <= WORLD_H; y += 100) g.lineBetween(0, y, WORLD_W, y);
      const cw = 220;
      g.fillStyle(shade(t.wall, -0.2), 0.75).fillRect(WORLD_W / 2 - cw / 2, 0, cw, WORLD_H);
      g.lineStyle(4, t.accent, 0.35).lineBetween(WORLD_W / 2 - cw / 2 + 10, 0, WORLD_W / 2 - cw / 2 + 10, WORLD_H);
      g.lineBetween(WORLD_W / 2 + cw / 2 - 10, 0, WORLD_W / 2 + cw / 2 - 10, WORLD_H);
      for (let y = 60; y < WORLD_H; y += 120) {
        g.lineStyle(2, t.accent, 0.25).strokePoints(
          [
            { x: WORLD_W / 2, y: y - 30 },
            { x: WORLD_W / 2 + 30, y },
            { x: WORLD_W / 2, y: y + 30 },
            { x: WORLD_W / 2 - 30, y },
          ],
          true,
        );
      }
      break;
    }
  }
}

function wall(g: Phaser.GameObjects.Graphics, o: { x: number; y: number; w: number; h: number }, map: MapDef): void {
  const t = map.theme;
  const depth = 12;
  // Shadow on the floor, then the front face (the wall's "height"), then the top.
  g.fillStyle(0x000000, 0.45).fillRoundedRect(o.x + 6, o.y + depth + 6, o.w, o.h, 6);
  g.fillStyle(t.wallLine, 0.08).fillRoundedRect(o.x - 8, o.y - 8, o.w + 16, o.h + depth + 16, 10);
  g.fillStyle(shade(t.wall, -0.45), 1).fillRoundedRect(o.x, o.y + depth, o.w, o.h, 6);
  g.fillStyle(shade(t.wall, -0.25), 1).fillRect(o.x, o.y + 6, o.w, o.h + depth - 12);
  g.fillStyle(t.wall, 1).fillRoundedRect(o.x, o.y, o.w, o.h, 6);
  // Inset panel and lighting.
  if (o.w > 20 && o.h > 20) g.fillStyle(shade(t.wall, 0.08), 1).fillRoundedRect(o.x + 5, o.y + 5, o.w - 10, o.h - 10, 4);
  g.lineStyle(2, shade(t.wall, 0.45), 0.6).lineBetween(o.x + 5, o.y + 2, o.x + o.w - 5, o.y + 2);
  g.lineStyle(2, t.wallLine, 0.85).strokeRoundedRect(o.x, o.y, o.w, o.h, 6);
  g.lineStyle(2, t.wallLine, 0.35).lineBetween(o.x + 4, o.y + o.h + depth - 1, o.x + o.w - 4, o.y + o.h + depth - 1);
  // A glowing strip along the long side and rivets in the corners.
  const long = o.w >= o.h;
  g.fillStyle(t.accent, 0.12);
  if (long) g.fillRect(o.x + 10, o.y + o.h / 2 - 3, o.w - 20, 6);
  else g.fillRect(o.x + o.w / 2 - 3, o.y + 10, 6, o.h - 20);
  g.fillStyle(t.accent, 0.8);
  if (long) g.fillRect(o.x + 12, o.y + o.h / 2 - 1, o.w - 24, 2);
  else g.fillRect(o.x + o.w / 2 - 1, o.y + 12, 2, o.h - 24);
  g.fillStyle(shade(t.wallLine, 0.4), 0.9);
  for (const [cx, cy] of [
    [o.x + 6, o.y + 6],
    [o.x + o.w - 6, o.y + 6],
    [o.x + 6, o.y + o.h - 6],
    [o.x + o.w - 6, o.y + o.h - 6],
  ])
    if (o.w > 16 && o.h > 16) g.fillCircle(cx, cy, 2);
}

export function drawArena(g: Phaser.GameObjects.Graphics, map: MapDef): void {
  const t = map.theme;
  const style = floorStyle(map.id);
  g.clear().fillStyle(t.bg, 1).fillRect(0, 0, WORLD_W, WORLD_H);
  floor(g, map, style);
  // Lit floor: brighter in the middle, darker towards the edges.
  glow(g, WORLD_W / 2, WORLD_H / 2, 820, shade(t.accent, -0.55), 0.3, 24);
  // Light pools under the main fighting spots.
  const r = rng(map.id + ':light');
  glow(g, WORLD_W / 2, WORLD_H / 2, 260, t.accent, 0.12);
  for (let i = 0; i < 5; i++) glow(g, 160 + r() * (WORLD_W - 320), 140 + r() * (WORLD_H - 280), 130 + r() * 90, t.accent, 0.07);
  // Centre ring.
  g.lineStyle(3, t.accent, 0.16).strokeCircle(WORLD_W / 2, WORLD_H / 2, 110);
  g.lineStyle(1, t.accent, 0.12).strokeCircle(WORLD_W / 2, WORLD_H / 2, 136);
  // Edge vignette.
  for (let i = 0; i < 8; i++) g.lineStyle(26, 0x000000, 0.07).strokeRect(13 + i * 22, 13 + i * 22, WORLD_W - 26 - i * 44, WORLD_H - 26 - i * 44);

  for (const h of map.hazards) {
    glow(g, h.x + h.w / 2, h.y + h.h / 2, Math.max(h.w, h.h) * 0.75, t.hazard, 0.18, 10);
    g.fillStyle(t.hazard, 0.18).fillRoundedRect(h.x, h.y, h.w, h.h, 8);
    g.lineStyle(3, t.hazard, 0.9).strokeRoundedRect(h.x, h.y, h.w, h.h, 8);
    g.lineStyle(3, t.hazard, 0.4);
    for (let x = h.x + 10; x < h.x + h.w - 10; x += 22) g.lineBetween(x, h.y + 5, Math.min(x + 12, h.x + h.w - 4), h.y + 17);
  }

  for (const o of map.obstacles) wall(g, o, map);

  // Framed border with corner pieces.
  g.lineStyle(16, 0x020712, 0.85).strokeRect(0, 0, WORLD_W, WORLD_H);
  g.lineStyle(3, t.accent, 0.75).strokeRect(4, 4, WORLD_W - 8, WORLD_H - 8);
  g.lineStyle(1, t.accent, 0.3).strokeRect(12, 12, WORLD_W - 24, WORLD_H - 24);
  g.lineStyle(6, t.wallLine, 0.95);
  const c = 46;
  for (const [x, y, sx, sy] of [
    [4, 4, 1, 1],
    [WORLD_W - 4, 4, -1, 1],
    [4, WORLD_H - 4, 1, -1],
    [WORLD_W - 4, WORLD_H - 4, -1, -1],
  ])
    g.lineBetween(x, y, x + c * sx, y).lineBetween(x, y, x, y + c * sy);
}
