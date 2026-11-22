// 8 arena looks, drawn in code with flat colours and a few parallax silhouettes. Looks only; no rules change.

import type Phaser from 'phaser';

export const FLOOR_Y = 600;
export const WORLD_W = 1280;
export const WORLD_H = 720;

export interface ArenaDef {
  id: string;
  name: string;
  sky: [number, number];
  far: number;
  near: number;
  floor: number;
  line: number;
  dark: boolean;
  draw: (g: Phaser.GameObjects.Graphics, a: ArenaDef) => void;
}

function rnd(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

function sky(g: Phaser.GameObjects.Graphics, a: ArenaDef) {
  const bands = 10;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const c = mixColor(a.sky[0], a.sky[1], t);
    g.fillStyle(c, 1);
    g.fillRect(-400, (i * FLOOR_Y) / bands - 2, WORLD_W + 800, FLOOR_Y / bands + 4);
  }
  g.fillStyle(a.sky[0], 1).fillRect(-400, -800, WORLD_W + 800, 800);
}

function floor(g: Phaser.GameObjects.Graphics, a: ArenaDef) {
  g.fillStyle(a.floor, 1).fillRect(-400, FLOOR_Y, WORLD_W + 800, 600);
  g.fillStyle(a.line, 1).fillRect(-400, FLOOR_Y - 3, WORLD_W + 800, 6);
}

export function mixColor(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

const hills = (g: Phaser.GameObjects.Graphics, c: number, base: number, amp: number, seed: number, step = 120) => {
  const r = rnd(seed);
  g.fillStyle(c, 1);
  g.beginPath();
  g.moveTo(-400, FLOOR_Y);
  for (let x = -400; x <= WORLD_W + 400; x += step) g.lineTo(x, base - r() * amp);
  g.lineTo(WORLD_W + 400, FLOOR_Y);
  g.closePath();
  g.fillPath();
};

const skyline = (g: Phaser.GameObjects.Graphics, c: number, base: number, seed: number, windows?: number) => {
  const r = rnd(seed);
  for (let x = -400; x < WORLD_W + 400; ) {
    const w = 60 + r() * 90;
    const h = 120 + r() * 260;
    g.fillStyle(c, 1).fillRect(x, base - h, w, h + 10);
    if (windows !== undefined)
      for (let wy = base - h + 16; wy < base - 20; wy += 26)
        for (let wx = x + 10; wx < x + w - 14; wx += 18) if (r() < 0.45) g.fillStyle(windows, 0.85).fillRect(wx, wy, 8, 12);
    x += w + 6 + r() * 20;
  }
};

export const ARENAS: ArenaDef[] = [
  {
    id: 'gym', name: 'Old Gym', sky: [0xe9eef5, 0xd5deea], far: 0xc4cfdd, near: 0xb3c0d1, floor: 0xd9b98c, line: 0x8a6a45, dark: false,
    draw: (g, a) => {
      sky(g, a);
      g.fillStyle(a.far, 1).fillRect(-400, 120, WORLD_W + 800, 22);
      for (let x = -360; x < WORLD_W + 400; x += 160) g.fillStyle(a.near, 1).fillRect(x, 150, 18, FLOOR_Y - 150);
      g.fillStyle(0xffffff, 0.6);
      for (let x = 40; x < WORLD_W; x += 240) g.fillRoundedRect(x, 200, 130, 70, 10);
      floor(g, a);
      g.lineStyle(3, 0xffffff, 0.5).strokeCircle(WORLD_W / 2, FLOOR_Y + 60, 50);
    },
  },
  {
    id: 'rooftop', name: 'Rooftop', sky: [0x8fd0ff, 0xd8f0ff], far: 0xa9c6dd, near: 0x7f9ab3, floor: 0x5b6470, line: 0x2c3138, dark: false,
    draw: (g, a) => {
      sky(g, a);
      g.fillStyle(0xffffff, 0.8).fillCircle(200, 140, 40).fillCircle(240, 130, 50).fillCircle(290, 145, 38);
      g.fillStyle(0xffffff, 0.8).fillCircle(940, 100, 36).fillCircle(985, 92, 44);
      skyline(g, a.far, FLOOR_Y - 40, 3);
      skyline(g, a.near, FLOOR_Y, 9);
      floor(g, a);
      g.fillStyle(0xffd84a, 1);
      for (let x = -380; x < WORLD_W + 400; x += 120) g.fillRect(x, FLOOR_Y + 40, 50, 6);
    },
  },
  {
    id: 'forest', name: 'Green Hollow', sky: [0xd9f5d0, 0xf4ffe9], far: 0xa8d99a, near: 0x7fc271, floor: 0x9a7a4d, line: 0x5e4a2c, dark: false,
    draw: (g, a) => {
      sky(g, a);
      hills(g, a.far, FLOOR_Y - 140, 80, 2);
      const r = rnd(5);
      for (let x = -380; x < WORLD_W + 400; x += 90 + r() * 60) {
        const h = 140 + r() * 120;
        g.fillStyle(0x6b4d2e, 1).fillRect(x + 22, FLOOR_Y - h * 0.4, 14, h * 0.4);
        g.fillStyle(a.near, 1).fillCircle(x + 29, FLOOR_Y - h * 0.55, 46).fillCircle(x + 6, FLOOR_Y - h * 0.4, 32).fillCircle(x + 52, FLOOR_Y - h * 0.42, 32);
      }
      floor(g, a);
    },
  },
  {
    id: 'lava', name: 'Magma Works', sky: [0xffd3a8, 0xffb27a], far: 0xe89160, near: 0xc96a43, floor: 0x5a3a33, line: 0xff6a2a, dark: false,
    draw: (g, a) => {
      sky(g, a);
      hills(g, a.far, FLOOR_Y - 170, 150, 7, 90);
      hills(g, a.near, FLOOR_Y - 60, 80, 8, 70);
      floor(g, a);
      g.fillStyle(0xff8a2a, 0.9);
      for (let x = -380; x < WORLD_W + 400; x += 140) g.fillRect(x, FLOOR_Y + 30, 70, 8);
    },
  },
  {
    id: 'ice', name: 'Frozen Lake', sky: [0xdff6ff, 0xf6fdff], far: 0xbfe3f2, near: 0x9fd3ea, floor: 0xcdeffc, line: 0x6fb4d8, dark: false,
    draw: (g, a) => {
      sky(g, a);
      const r = rnd(4);
      g.fillStyle(a.far, 1);
      for (let x = -380; x < WORLD_W + 400; x += 180) g.fillTriangle(x, FLOOR_Y - 20, x + 110, FLOOR_Y - 220 - r() * 120, x + 220, FLOOR_Y - 20);
      g.fillStyle(0xffffff, 0.9);
      for (let x = -380; x < WORLD_W + 400; x += 180) g.fillTriangle(x + 85, FLOOR_Y - 190, x + 110, FLOOR_Y - 240, x + 135, FLOOR_Y - 190);
      hills(g, a.near, FLOOR_Y - 30, 30, 6);
      floor(g, a);
      g.lineStyle(2, 0xffffff, 0.8);
      for (let x = -360; x < WORLD_W + 400; x += 200) g.lineBetween(x, FLOOR_Y + 40, x + 90, FLOOR_Y + 60);
    },
  },
  {
    id: 'sky', name: 'Sky Platform', sky: [0xc9c4ff, 0xf3eaff], far: 0xe3dcff, near: 0xffffff, floor: 0xb7a8e8, line: 0x6a58b8, dark: false,
    draw: (g, a) => {
      sky(g, a);
      const r = rnd(11);
      for (let i = 0; i < 9; i++) {
        const x = -300 + r() * (WORLD_W + 600);
        const y = 120 + r() * 300;
        g.fillStyle(a.near, 0.8).fillCircle(x, y, 30 + r() * 20).fillCircle(x + 40, y - 10, 40 + r() * 20).fillCircle(x + 85, y, 30);
      }
      floor(g, a);
      g.fillStyle(a.far, 1).fillRect(-400, FLOOR_Y + 70, WORLD_W + 800, 30);
    },
  },
  {
    id: 'ruins', name: 'Sun Ruins', sky: [0xffe9b8, 0xfff6dc], far: 0xe8cf9a, near: 0xd2b07a, floor: 0xc49a5c, line: 0x7a5a2e, dark: false,
    draw: (g, a) => {
      sky(g, a);
      g.fillStyle(0xffffff, 0.7).fillCircle(1000, 150, 60);
      hills(g, a.far, FLOOR_Y - 90, 50, 12);
      for (let x = -340; x < WORLD_W + 400; x += 210) {
        g.fillStyle(a.near, 1).fillRect(x, FLOOR_Y - 230, 34, 230);
        g.fillRect(x - 10, FLOOR_Y - 240, 54, 16);
      }
      floor(g, a);
    },
  },
  {
    id: 'city', name: 'Night City', sky: [0x141a3a, 0x2b3466], far: 0x232a52, near: 0x1a1f3e, floor: 0x2a2f45, line: 0x7fe3ff, dark: true,
    draw: (g, a) => {
      sky(g, a);
      const r = rnd(13);
      for (let i = 0; i < 40; i++) g.fillStyle(0xffffff, 0.6).fillCircle(r() * WORLD_W, r() * 300, 1.5);
      g.fillStyle(0xfff6c8, 1).fillCircle(180, 120, 34);
      skyline(g, a.far, FLOOR_Y - 30, 21, 0xffd56a);
      skyline(g, a.near, FLOOR_Y, 25, 0x7fe3ff);
      floor(g, a);
    },
  },
];

export const arenaById = (id: string): ArenaDef => ARENAS.find((a) => a.id === id) ?? ARENAS[0]!;
