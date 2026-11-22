// The 10 futuristic arenas ("neon arena-tech"). Every arena is drawn through the Pen interface:
//   layers[]  static art, back to front (sky, mega-structures, mid structures, near props, floor). Baked once to
//             canvas textures at load (arenaBake.ts), so they cost one image draw per frame.
//   animFar / animMid / animNear / fg   animated life drawn every frame at matching parallax depths.
// Backgrounds stay darker and calmer than the fighters; the fight plane (y 300 to 600) is kept free of busy detail.
// Old arena ids (from earlier saves, Champion Road and tests) map to the new ones through LEGACY.
import type { Pen } from './pen';
import type { ArenaReact } from './arenaReact';

export const FLOOR_Y = 600;
export const WORLD_W = 1280;
export const WORLD_H = 720;
/** baked area in world px: x -640..1920, y -400..960 */
export const BAKE_X = -640;
export const BAKE_Y = -400;
export const BAKE_W = 2560;
export const BAKE_H = 1360;

export function mixColor(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export type Rng = () => number;
export function rng(seed: number): Rng {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

export interface Layer {
  /** parallax factor: 0 = fixed to the camera, 1 = moves with the fight */
  scroll: number;
  draw(p: Pen, r: Rng): void;
}

/** Animation hooks get time, the reaction state and a detail factor (1 high, ~0.6 medium). */
export type Anim = (p: Pen, t: number, A: ArenaReact, q: number) => void;

export interface ArenaDef {
  id: string;
  name: string;
  /** camera background colour */
  bg: number;
  /** two neon accents used by rim light, floor glow and reactions */
  accent: number;
  accent2: number;
  /** x positions of props where Leaf vines can climb */
  props: number[];
  layers: Layer[];
  animFar?: Anim;
  animMid?: Anim;
  animNear?: Anim;
  fg?: Anim;
  /** ambient sound layer for the synth */
  ambient: 'city' | 'hum' | 'reactor' | 'cold' | 'forest' | 'forge' | 'wind' | 'ruins' | 'data' | 'void';
  /** legacy fields kept for code that still reads them */
  sky: [number, number];
  dark: true;
}

// ---- drawing helpers -----------------------------------------------------------------------------------------------
const X0 = BAKE_X;
const X1 = BAKE_X + BAKE_W;
export const rect = (p: Pen, x: number, y: number, w: number, h: number, c: number, a = 1) => p.poly([x, y, x + w, y, x + w, y + h, x, y + h], c, a);

/** vertical gradient made of bands */
function sky(p: Pen, y0: number, y1: number, stops: number[], n = 28): void {
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const k = t * (stops.length - 1);
    const c = mixColor(stops[Math.floor(k)]!, stops[Math.min(stops.length - 1, Math.floor(k) + 1)]!, k % 1);
    rect(p, X0, y0 + ((y1 - y0) * i) / n - 1, X1 - X0, (y1 - y0) / n + 2, c);
  }
}

function stars(p: Pen, r: Rng, n: number, y0: number, y1: number, color = 0xffffff): void {
  for (let i = 0; i < n; i++) {
    const x = X0 + r() * (X1 - X0);
    const y = y0 + r() * (y1 - y0);
    const s = r();
    p.circle(x, y, 0.6 + s * 1.6, color, null, 0, 0.35 + s * 0.6);
    if (s > 0.93) p.glow?.(x, y, 10, color, 0.5);
  }
}

function glowLine(p: Pen, x1: number, y1: number, x2: number, y2: number, w: number, c: number, a = 1): void {
  p.add?.(true);
  p.line(x1, y1, x2, y2, w * 4, c, 0.08 * a);
  p.line(x1, y1, x2, y2, w * 2, c, 0.18 * a);
  p.add?.(false);
  p.line(x1, y1, x2, y2, w, c, a);
}

interface TowerOpts {
  base: number;
  minH: number;
  maxH: number;
  wMin: number;
  wMax: number;
  color: number;
  edge?: number;
  windows?: number;
  winA?: number;
  gap?: number;
  antenna?: number;
}
function towers(p: Pen, r: Rng, o: TowerOpts): number[] {
  const tops: number[] = [];
  let x = X0;
  while (x < X1) {
    const w = o.wMin + r() * (o.wMax - o.wMin);
    const h = o.minH + r() * (o.maxH - o.minH);
    const top = o.base - h;
    // stepped crown on some towers
    if (r() < 0.35) {
      rect(p, x + w * 0.2, top - 26, w * 0.6, 28, o.color);
      if (o.antenna !== undefined) {
        p.line(x + w * 0.5, top - 26, x + w * 0.5, top - 70, 2, o.color);
        p.glow?.(x + w * 0.5, top - 70, 8, o.antenna, 0.9);
      }
    }
    rect(p, x, top, w, h + 400, o.color);
    if (o.edge !== undefined) {
      p.line(x + 1, top, x + 1, o.base, 1.4, o.edge, 0.55);
      p.line(x, top, x + w, top, 1.4, o.edge, 0.7);
    }
    if (o.windows !== undefined)
      for (let wy = top + 10; wy < o.base - 8; wy += 12)
        for (let wx = x + 5; wx < x + w - 6; wx += 9) if (r() < 0.22) rect(p, wx, wy, 4, 6, o.windows, (o.winA ?? 0.7) * (0.4 + r() * 0.6));
    tops.push(x + w / 2, top);
    x += w + (o.gap ?? 4) + r() * 10;
  }
  return tops;
}

/** glossy floor: gradient, perspective grid, bright edge, faked light streaks reflected from above */
function floor(p: Pen, r: Rng, top: number, bottom: number, grid: number, edge: number, streaks: number[] = []): void {
  sky(p, FLOOR_Y, 960, [top, bottom], 14);
  const hy = FLOOR_Y - 340;
  const proj = (k: number, y: number) => 640 + k * ((y - hy) / (FLOOR_Y - hy));
  p.add?.(true);
  for (let k = -1400; k <= 1400; k += 80) p.line(proj(k, FLOOR_Y), FLOOR_Y, proj(k, 960), 960, 1.4, grid, 0.22);
  let d = 10;
  for (let i = 0; i < 11; i++) {
    p.line(X0, FLOOR_Y + d, X1, FLOOR_Y + d, 1.4, grid, 0.28 - i * 0.02);
    d *= 1.42;
  }
  // reflected light streaks: soft vertical smears on the gloss
  for (let i = 0; i < streaks.length; i += 2) {
    const x = streaks[i]!;
    const c = streaks[i + 1]!;
    for (let k = 0; k < 6; k++) p.line(x, FLOOR_Y + 4 + k * 22, x, FLOOR_Y + 26 + k * 22, 6 - k * 0.7, c, 0.16 - k * 0.022);
  }
  p.add?.(false);
  glowLine(p, X0, FLOOR_Y, X1, FLOOR_Y, 3, edge, 0.9);
  void r;
}

/** soft volumetric beam, additive */
function beam(p: Pen, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, c: number, a: number): void {
  p.add?.(true);
  p.poly([x0 - w0, y0, x0 + w0, y0, x1 + w1, y1, x1 - w1, y1], c, a);
  p.poly([x0 - w0 * 0.4, y0, x0 + w0 * 0.4, y0, x1 + w1 * 0.4, y1, x1 - w1 * 0.4, y1], c, a * 0.8);
  p.add?.(false);
}

/** Two slow searchlight beams from above in the arena's accents; supers pulse them. Shared by every arena. */
export function sweepBeams(p: Pen, t: number, a: ArenaDef, A: ArenaReact, q: number): void {
  if (q < 0.5) return;
  const k = 1 + A.superK * 1.6 + A.light * 0.8;
  for (let i = 0; i < 2; i++) {
    const x0 = i ? 1040 : 240;
    const sway = Math.sin(t * 0.23 + i * 2.1) * 260;
    const c = A.superK > 0.05 ? mixColor(i ? a.accent2 : a.accent, A.superColor, A.superK) : i ? a.accent2 : a.accent;
    beam(p, x0, -60, x0 + sway, FLOOR_Y, 10, 130, c, 0.022 * k);
  }
}

function ellipse(p: Pen, cx: number, cy: number, rx: number, ry: number, w: number, c: number, a: number, a0 = 0, a1 = Math.PI * 2, n = 40): void {
  let px = cx + Math.cos(a0) * rx;
  let py = cy + Math.sin(a0) * ry;
  for (let i = 1; i <= n; i++) {
    const ang = a0 + ((a1 - a0) * i) / n;
    const nx = cx + Math.cos(ang) * rx;
    const ny = cy + Math.sin(ang) * ry;
    p.line(px, py, nx, ny, w, c, a);
    px = nx;
    py = ny;
  }
}
export { ellipse };

/** holographic billboard: frame, gradient body, stripes */
function billboard(p: Pen, x: number, y: number, w: number, h: number, c1: number, c2: number, r: Rng): void {
  rect(p, x - 3, y - 3, w + 6, h + 6, 0x05060f, 0.9);
  p.add?.(true);
  rect(p, x, y, w, h, c1, 0.5);
  for (let i = 0; i < 5; i++) rect(p, x + 6, y + 8 + i * (h / 6), w * (0.3 + r() * 0.6), 3, c2, 0.6);
  p.glow?.(x + w / 2, y + h / 2, Math.max(w, h) * 0.9, c1, 0.35);
  p.add?.(false);
}

// ---- the arenas ----------------------------------------------------------------------------------------------------
export const ARENAS: ArenaDef[] = [
  {
    id: 'neon',
    name: 'Neon Rooftop Grid',
    bg: 0x0a0820,
    accent: 0xff3ea5,
    accent2: 0x2de2ff,
    props: [190, 1090],
    ambient: 'city',
    sky: [0x0a0820, 0x2a0f4a],
    dark: true,
    layers: [
      {
        scroll: 0.05,
        draw(p, r) {
          sky(p, BAKE_Y, FLOOR_Y, [0x05041a, 0x140b3a, 0x3a1460, 0x7a1f6e, 0x2a0f4a]);
          stars(p, r, 60, BAKE_Y, 120, 0xb8a8ff);
          p.glow?.(640, 330, 520, 0xff3ea5, 0.22);
        },
      },
      { scroll: 0.18, draw: (p, r) => void towers(p, r, { base: 470, minH: 160, maxH: 520, wMin: 40, wMax: 90, color: 0x170d33, edge: 0x5a2a9a, windows: 0x8a5cff, winA: 0.45, antenna: 0xff3ea5 }) },
      {
        scroll: 0.4,
        draw(p, r) {
          const tops = towers(p, r, { base: 560, minH: 120, maxH: 360, wMin: 70, wMax: 140, color: 0x0e0a24, edge: 0x2de2ff, windows: 0x2de2ff, winA: 0.35, gap: 30 });
          for (let i = 0; i < tops.length; i += 4) {
            const x = tops[i]!;
            const y = tops[i + 1]! + 30;
            billboard(p, x - 40, y, 80, 46, i % 8 ? 0xff3ea5 : 0x2de2ff, 0xffffff, r);
          }
        },
      },
      {
        scroll: 0.75,
        draw(p) {
          // rooftop edge props: vents, a holo-sign frame, railing
          for (const x of [130, 1030]) {
            rect(p, x, 470, 120, 130, 0x120a26);
            p.line(x, 470, x + 120, 470, 2, 0xff3ea5, 0.7);
            for (let k = 0; k < 4; k++) p.line(x + 12, 490 + k * 24, x + 108, 490 + k * 24, 3, 0x2a1a4a);
          }
          for (let x = X0; x < X1; x += 46) p.line(x, 560, x, 600, 2, 0x2a1a4a);
          p.line(X0, 560, X1, 560, 3, 0x3a2a6a);
        },
      },
      { scroll: 1, draw: (p, r) => floor(p, r, 0x1a0f33, 0x07051a, 0x2de2ff, 0xff3ea5, [190, 0xff3ea5, 420, 0x2de2ff, 640, 0xff3ea5, 860, 0x8a5cff, 1090, 0x2de2ff]) },
    ],
    animMid(p, t, _A, q) {
      // flying traffic lanes at two depths
      p.add?.(true);
      for (let lane = 0; lane < 3; lane++) {
        const y = 190 + lane * 55;
        const n = Math.round(6 * q);
        for (let i = 0; i < n; i++) {
          const dir = lane % 2 ? -1 : 1;
          const x = ((t * (90 + lane * 40) * dir + i * 380 + lane * 150) % 2560 + 2560) % 2560 - 640;
          const c = lane === 1 ? 0xffd07a : 0xff6ad5;
          p.line(x, y, x - dir * 26, y, 3, c, 0.9);
          p.glow?.(x, y, 14, c, 0.6);
        }
      }
      // blinking billboard scan bar
      const scan = (t * 0.6) % 1;
      p.line(X0, 120 + scan * 380, X1, 120 + scan * 380, 2, 0x2de2ff, 0.08);
      p.add?.(false);
    },
    fg(p, t, A, q) {
      // rain streaks, whipped sideways by wind reactions
      const n = Math.round(50 * q);
      const slant = 6 + A.wind * 40;
      p.add?.(true);
      for (let i = 0; i < n; i++) {
        const x = ((i * 97.3 + t * 40) % 1500) - 110;
        const y = ((i * 53.1 + t * 900) % 760) - 80;
        p.line(x, y, x - slant, y + 22, 1.2, 0xa8c8ff, 0.22);
      }
      p.add?.(false);
    },
  },
  {
    id: 'orbital',
    name: 'Orbital Station Deck',
    bg: 0x02030c,
    accent: 0x4ab8ff,
    accent2: 0xffb02e,
    props: [120, 1160],
    ambient: 'hum',
    sky: [0x02030c, 0x0a1430],
    dark: true,
    layers: [
      {
        scroll: 0.03,
        draw(p, r) {
          sky(p, BAKE_Y, FLOOR_Y, [0x01020a, 0x050a1e, 0x0b1636, 0x101e48]);
          stars(p, r, 200, BAKE_Y, FLOOR_Y, 0xffffff);
          // nebula haze
          p.glow?.(300, 120, 380, 0x6a3ad8, 0.25);
          p.glow?.(1050, 60, 300, 0x2a8aff, 0.2);
          // the planet with bands and an atmosphere rim
          const cx = 860;
          const cy = 560;
          const R = 330;
          p.circle(cx, cy, R + 18, 0x4ab8ff, null, 0, 0.18);
          p.circle(cx, cy, R, 0x123a6a, null);
          for (let i = 0; i < 9; i++) {
            const yy = cy - R + (i + 0.5) * ((2 * R) / 9);
            const hw = Math.sqrt(Math.max(0, R * R - (yy - cy) ** 2));
            p.line(cx - hw, yy, cx + hw, yy, 14, i % 2 ? 0x1c5a8f : 0x0f3060, 0.8);
          }
          p.circle(cx + 90, cy - 80, R * 0.9, 0x02030c, null, 0, 0.35);
          ellipse(p, cx, cy, R + 6, R + 6, 4, 0x8fd8ff, 0.55, Math.PI * 1.05, Math.PI * 1.95, 60);
        },
      },
      {
        scroll: 0.15,
        draw(p) {
          // distant station ring (static part; ticks rotate in animFar)
          ellipse(p, 300, 200, 420, 90, 10, 0x1a2848, 1);
          ellipse(p, 300, 200, 420, 90, 2, 0x4ab8ff, 0.4);
        },
      },
      {
        scroll: 0.45,
        draw(p) {
          // the big window frame: struts and docking arms
          for (const x of [-200, 230, 640, 1050, 1480]) {
            rect(p, x - 18, BAKE_Y, 36, 1000, 0x0a0f20);
            p.line(x - 18, BAKE_Y, x - 18, 600, 2, 0x2a4a7a, 0.8);
          }
          rect(p, X0, 60, X1 - X0, 30, 0x0a0f20);
          rect(p, X0, 470, X1 - X0, 24, 0x0a0f20);
          p.line(X0, 470, X1, 470, 2, 0x4ab8ff, 0.5);
          // a docking arm reaching in
          p.poly([1500, 260, 1100, 300, 1090, 330, 1500, 320], 0x121a30);
          p.line(1100, 300, 1500, 260, 2, 0xffb02e, 0.6);
        },
      },
      {
        scroll: 0.8,
        draw(p) {
          for (const x of [70, 1110]) {
            p.poly([x, 600, x + 20, 500, x + 110, 500, x + 130, 600], 0x141e36);
            rect(p, x + 30, 515, 70, 30, 0x0b2a4a);
            p.line(x + 30, 515, x + 100, 515, 2, 0x4ab8ff, 0.8);
          }
        },
      },
      {
        scroll: 1,
        draw(p, r) {
          floor(p, r, 0x1a2440, 0x080c18, 0x4ab8ff, 0x8fd8ff, [230, 0x4ab8ff, 640, 0x8fd8ff, 1050, 0x4ab8ff]);
          // hazard stripes along the deck edge
          for (let x = X0; x < X1; x += 40) p.poly([x, 606, x + 20, 606, x + 8, 618, x - 12, 618], 0xffb02e, 0.55);
        },
      },
    ],
    animFar(p, t, _A, q) {
      // the station ring turns: light ticks travelling along it
      p.add?.(true);
      const n = Math.round(14 * q);
      for (let i = 0; i < n; i++) {
        const a = t * 0.15 + (i / n) * Math.PI * 2;
        const x = 300 + Math.cos(a) * 420;
        const y = 200 + Math.sin(a) * 90;
        if (Math.sin(a) > -0.2) p.glow?.(x, y, 9, i % 3 ? 0x4ab8ff : 0xffb02e, 0.8);
      }
      p.add?.(false);
    },
    animMid(p, t) {
      // warning lights on the struts
      p.add?.(true);
      for (const x of [230, 640, 1050]) {
        const on = Math.sin(t * 3 + x) > 0.4;
        if (on) p.glow?.(x, 78, 26, 0xff4a2e, 0.85);
      }
      // a shuttle drifting past the window
      const sx = ((t * 30) % 2600) - 800;
      p.add?.(false);
      p.poly([sx, 160, sx + 60, 150, sx + 80, 160, sx + 60, 170], 0x1a2440);
      p.add?.(true);
      p.glow?.(sx - 4, 160, 14, 0x8fd8ff, 0.8);
      p.add?.(false);
    },
    fg(p, t) {
      // a soft glass glare sweeping slowly
      const gx = ((t * 40) % 2400) - 600;
      p.add?.(true);
      p.poly([gx, -100, gx + 60, -100, gx - 200, 600, gx - 260, 600], 0xffffff, 0.025);
      p.add?.(false);
    },
  },
  {
    id: 'reactor',
    name: 'Reactor Core',
    bg: 0x02110f,
    accent: 0x3dffc8,
    accent2: 0x2a9dff,
    props: [150, 1130],
    ambient: 'reactor',
    sky: [0x02110f, 0x06302a],
    dark: true,
    layers: [
      { scroll: 0.05, draw: (p) => sky(p, BAKE_Y, FLOOR_Y, [0x010806, 0x03140f, 0x062820, 0x0a3a2e]) },
      {
        scroll: 0.2,
        draw(p) {
          // the giant core column (the glow pulses in animFar)
          rect(p, 520, BAKE_Y, 240, 1000, 0x062a22);
          for (let y = BAKE_Y; y < 600; y += 60) {
            rect(p, 510, y, 260, 12, 0x0b3d30);
            p.line(510, y, 770, y, 1.5, 0x3dffc8, 0.35);
          }
          // cooling towers either side
          for (const x of [120, 1160]) p.poly([x - 120, 600, x - 70, 120, x + 70, 120, x + 120, 600], 0x041a15);
        },
      },
      {
        scroll: 0.45,
        draw(p) {
          // conduits: thick pipes curving into the core
          for (const [y, c] of [
            [220, 0x0d2f2a],
            [330, 0x0a2622],
            [420, 0x0d2f2a],
          ] as const) {
            p.line(X0, y, 500, y, 26, c);
            p.line(780, y, X1, y, 26, c);
            p.line(X0, y - 10, 500, y - 10, 2, 0x1f6a58, 0.8);
            p.line(780, y - 10, X1, y - 10, 2, 0x1f6a58, 0.8);
          }
        },
      },
      {
        scroll: 0.78,
        draw(p) {
          // catwalk railing
          p.line(X0, 520, X1, 520, 4, 0x103a32);
          for (let x = X0; x < X1; x += 60) p.line(x, 520, x, 600, 3, 0x103a32);
          for (const x of [90, 1080]) {
            rect(p, x, 430, 110, 170, 0x0a2a24);
            for (let k = 0; k < 5; k++) rect(p, x + 14, 446 + k * 28, 82, 14, k % 2 ? 0x0e4034 : 0x0c3830);
          }
        },
      },
      { scroll: 1, draw: (p, r) => floor(p, r, 0x0b2a24, 0x020b09, 0x3dffc8, 0x3dffc8, [640, 0x3dffc8, 300, 0x2a9dff, 980, 0x2a9dff]) },
    ],
    animFar(p, t, A) {
      const pulse = 0.55 + 0.25 * Math.sin(t * 2.4) + A.superK * 0.5;
      p.add?.(true);
      rect(p, 560, BAKE_Y, 160, 1000, 0x3dffc8, 0.14 * pulse);
      rect(p, 610, BAKE_Y, 60, 1000, 0xc8fff0, 0.18 * pulse);
      p.glow?.(640, 300, 340, 0x3dffc8, 0.35 * pulse);
      p.add?.(false);
    },
    animMid(p, t, _A, q) {
      // energy flowing along the conduits into the core
      p.add?.(true);
      for (const y of [210, 320, 410]) {
        const n = Math.round(5 * q);
        for (let i = 0; i < n; i++) {
          const k = ((t * 0.5 + i / n + y * 0.001) % 1);
          const xl = X0 + k * (500 - X0);
          const xr = X1 - k * (X1 - 780);
          p.line(xl, y, xl + 40, y, 5, 0x3dffc8, 0.7);
          p.line(xr, y, xr - 40, y, 5, 0x3dffc8, 0.7);
        }
      }
      p.add?.(false);
    },
    fg(p, t, _A, q) {
      // steam rising from floor vents
      for (let i = 0; i < Math.round(8 * q); i++) {
        const x = 200 + i * 130 + Math.sin(t + i) * 20;
        const k = (t * 0.35 + i * 0.13) % 1;
        p.circle(x, 600 - k * 260, 20 + k * 50, 0xc8fff0, null, 0, 0.06 * (1 - k));
      }
    },
  },
  {
    id: 'cryo',
    name: 'Cryo Lab',
    bg: 0x040c1c,
    accent: 0x7fe8ff,
    accent2: 0xc8f4ff,
    props: [170, 1110],
    ambient: 'cold',
    sky: [0x040c1c, 0x0c2a48],
    dark: true,
    layers: [
      { scroll: 0.05, draw: (p) => sky(p, BAKE_Y, FLOOR_Y, [0x020814, 0x061630, 0x0c2a48, 0x123a5a]) },
      {
        scroll: 0.22,
        draw(p) {
          // frosted glass wall panels
          for (let x = X0; x < X1; x += 180) {
            rect(p, x + 6, 40, 168, 500, 0x0e2a46, 0.9);
            p.add?.(true);
            p.poly([x + 20, 60, x + 60, 60, x + 30, 520, x - 10, 520], 0xc8f4ff, 0.05);
            p.add?.(false);
            p.line(x + 6, 40, x + 6, 540, 3, 0x2a5a80);
          }
        },
      },
      {
        scroll: 0.5,
        draw(p, r) {
          // specimen pods with dark silhouettes inside
          for (let x = -460; x < 1900; x += 260) {
            rect(p, x - 46, 240, 92, 300, 0x061a2e);
            p.circle(x, 240, 46, 0x061a2e, null);
            p.add?.(true);
            rect(p, x - 38, 250, 76, 284, 0x2a9dff, 0.22);
            p.glow?.(x, 380, 90, 0x7fe8ff, 0.35);
            p.add?.(false);
            // a curled silhouette in the pod
            p.circle(x + (r() - 0.5) * 6, 340, 12, 0x0b2440, null);
            p.line(x, 352, x, 410, 6, 0x0b2440);
            p.line(x, 380, x - 14, 400, 5, 0x0b2440);
            rect(p, x - 50, 534, 100, 14, 0x10304e);
            p.line(x - 46, 540, x + 46, 540, 2, 0x7fe8ff, 0.8);
          }
        },
      },
      {
        scroll: 0.8,
        draw(p) {
          for (const x of [100, 1050]) {
            rect(p, x, 470, 140, 130, 0x0a2238);
            p.line(x, 470, x + 140, 470, 2, 0x7fe8ff, 0.6);
            // frost crust on the console edge
            for (let k = 0; k < 7; k++) p.poly([x + k * 20, 470, x + k * 20 + 10, 456 - (k % 3) * 5, x + k * 20 + 20, 470], 0xdff8ff, 0.7);
          }
        },
      },
      { scroll: 1, draw: (p, r) => floor(p, r, 0x1c3a5a, 0x081626, 0x7fe8ff, 0xc8f4ff, [170, 0x7fe8ff, 430, 0xc8f4ff, 690, 0x7fe8ff, 950, 0xc8f4ff]) },
    ],
    animMid(p, t, _A, q) {
      // bubbles rising in the pods and blinking status lights
      p.add?.(true);
      for (let x = -460; x < 1900; x += 260) {
        for (let i = 0; i < Math.round(3 * q); i++) {
          const k = (t * 0.25 + i * 0.33 + x * 0.0007) % 1;
          p.circle(x - 20 + i * 18, 530 - k * 270, 3, 0xc8f4ff, null, 0, 0.6 * (1 - k));
        }
        if (Math.sin(t * 2 + x) > 0.6) p.glow?.(x + 34, 540, 8, 0x3dff8a, 0.9);
      }
      p.add?.(false);
    },
    fg(p, t, _A, q) {
      // cold mist drifting along the floor
      for (let i = 0; i < Math.round(10 * q); i++) {
        const x = ((i * 170 + t * 25) % 1700) - 200;
        p.circle(x, 590 + Math.sin(t + i) * 6, 60 + (i % 3) * 20, 0xdff8ff, null, 0, 0.05);
      }
    },
  },
  {
    id: 'biodome',
    name: 'Bio-Dome Garden',
    bg: 0x02100e,
    accent: 0x4dffb0,
    accent2: 0xd26bff,
    props: [200, 470, 820, 1080],
    ambient: 'forest',
    sky: [0x02100e, 0x0a2a2a],
    dark: true,
    layers: [
      {
        scroll: 0.04,
        draw(p, r) {
          sky(p, BAKE_Y, FLOOR_Y, [0x010608, 0x041418, 0x082a2a, 0x0e3a30]);
          stars(p, r, 80, BAKE_Y, 200, 0xc8fff0);
          // the dome's glass ribs
          for (let i = -3; i <= 3; i++) ellipse(p, 640 + i * 40, 640, 900 - Math.abs(i) * 60, 900, 2, 0x2a8a7a, 0.35, Math.PI * 1.08, Math.PI * 1.92, 50);
          ellipse(p, 640, 640, 900, 900, 3, 0x4dffb0, 0.25, Math.PI * 1.08, Math.PI * 1.92, 60);
        },
      },
      {
        scroll: 0.25,
        draw(p, r) {
          // giant glowing mushroom-trees
          for (let x = X0 + 80; x < X1; x += 220 + r() * 120) {
            const h = 220 + r() * 160;
            p.line(x, 560, x + (r() - 0.5) * 40, 560 - h, 16, 0x0a2a26);
            const cx = x + (r() - 0.5) * 40;
            const cy = 560 - h;
            const c = r() < 0.5 ? 0x4dffb0 : 0xd26bff;
            p.poly([cx - 90, cy + 10, cx - 40, cy - 40, cx + 40, cy - 40, cx + 90, cy + 10], 0x0c3a34);
            p.add?.(true);
            p.glow?.(cx, cy, 120, c, 0.3);
            for (let k = 0; k < 7; k++) p.circle(cx - 70 + k * 23, cy + 6, 4, c, null, 0, 0.8);
            p.add?.(false);
          }
        },
      },
      {
        scroll: 0.5,
        draw(p, r) {
          // ferns and bulbs
          for (let x = X0; x < X1; x += 70 + r() * 50) {
            const h = 60 + r() * 120;
            for (let k = -2; k <= 2; k++) p.line(x, 580, x + k * 22, 580 - h + Math.abs(k) * 20, 5, 0x0c3a2c);
            if (r() < 0.4) {
              p.add?.(true);
              p.glow?.(x, 580 - h, 24, 0xd26bff, 0.6);
              p.add?.(false);
              p.circle(x, 580 - h, 6, 0xf2c8ff, null);
            }
          }
        },
      },
      {
        scroll: 0.82,
        draw(p) {
          for (const x of [200, 1080]) {
            p.poly([x - 70, 600, x - 40, 520, x + 40, 520, x + 70, 600], 0x0b2a24);
            p.line(x - 40, 520, x + 40, 520, 2, 0x4dffb0, 0.6);
          }
        },
      },
      { scroll: 1, draw: (p, r) => floor(p, r, 0x0e2a24, 0x030c0a, 0x4dffb0, 0x4dffb0, [300, 0xd26bff, 640, 0x4dffb0, 980, 0xd26bff]) },
    ],
    animMid(p, t) {
      // bulbs on the trees pulse slowly
      p.add?.(true);
      for (let i = 0; i < 8; i++) {
        const x = -400 + i * 320;
        p.glow?.(x, 300 + (i % 3) * 40, 40 + 14 * Math.sin(t * 1.5 + i), i % 2 ? 0xd26bff : 0x4dffb0, 0.35);
      }
      p.add?.(false);
    },
    fg(p, t, A, q) {
      // drifting spores
      p.add?.(true);
      for (let i = 0; i < Math.round(30 * q); i++) {
        const x = ((i * 113 + t * (14 + A.wind * 120)) % 1500) - 100;
        const y = 120 + ((i * 71) % 440) + Math.sin(t + i) * 14;
        p.glow?.(x, y, 5, i % 3 ? 0x9affd8 : 0xf2c8ff, 0.7);
      }
      p.add?.(false);
    },
  },
  {
    id: 'foundry',
    name: 'Plasma Foundry',
    bg: 0x120402,
    accent: 0xff6a1f,
    accent2: 0xffd23a,
    props: [140, 1140],
    ambient: 'forge',
    sky: [0x120402, 0x3a0e06],
    dark: true,
    layers: [
      {
        scroll: 0.05,
        draw(p) {
          sky(p, BAKE_Y, FLOOR_Y, [0x05030c, 0x0e0614, 0x1e0810, 0x3a1008]);
          p.glow?.(640, 560, 640, 0xff6a1f, 0.13);
        },
      },
      {
        scroll: 0.2,
        draw(p, r) {
          // smokestacks and gantries
          for (let x = X0; x < X1; x += 160 + r() * 120) {
            rect(p, x, 100 + r() * 120, 50, 600, 0x140610);
            rect(p, x - 6, 90 + r() * 120, 62, 14, 0x240c08);
          }
          for (let y = 160; y < 420; y += 130) p.line(X0, y, X1, y, 8, 0x200a06);
        },
      },
      {
        scroll: 0.45,
        draw(p) {
          // molten channels (static rim; the flow moves in animMid)
          for (const y of [380, 470]) {
            rect(p, X0, y - 16, X1 - X0, 32, 0x2a0e06);
            p.line(X0, y - 16, X1, y - 16, 3, 0x6a2a10);
          }
          // robotic arm bases
          for (const x of [300, 980]) {
            rect(p, x - 40, 470, 80, 130, 0x241010);
            p.circle(x, 470, 30, 0x2e1410, null);
          }
        },
      },
      {
        scroll: 0.8,
        draw(p) {
          for (const x of [80, 1080]) {
            p.poly([x, 600, x + 10, 500, x + 110, 500, x + 120, 600], 0x2a0e08);
            p.add?.(true);
            p.glow?.(x + 60, 500, 60, 0xff6a1f, 0.5);
            p.add?.(false);
            p.circle(x + 60, 500, 40, 0x3a1408, null);
            p.circle(x + 60, 500, 30, 0xff8a2a, null, 0, 0.9);
          }
        },
      },
      { scroll: 1, draw: (p, r) => floor(p, r, 0x2a0e08, 0x0a0302, 0xff6a1f, 0xffd23a, [300, 0xff6a1f, 640, 0xffd23a, 980, 0xff6a1f]) },
    ],
    animMid(p, t, _A, q) {
      // flowing plasma and two robotic arms swinging
      p.add?.(true);
      for (const y of [380, 470]) {
        p.line(X0, y, X1, y, 12, 0xff6a1f, 0.42);
        for (let i = 0; i < Math.round(10 * q); i++) {
          const x = ((t * 60 + i * 250 + y) % 2560) - 640;
          p.line(x, y, x + 60, y, 8, 0xffd23a, 0.7);
        }
      }
      p.add?.(false);
      for (const [x, ph] of [
        [300, 0],
        [980, 2],
      ] as const) {
        const a = -1.2 + Math.sin(t * 0.8 + ph) * 0.6;
        const ex = x + Math.cos(a) * 110;
        const ey = 470 + Math.sin(a) * 110;
        p.line(x, 470, ex, ey, 18, 0x3a1a14);
        p.line(ex, ey, ex + 50, ey + 30, 12, 0x3a1a14);
        p.add?.(true);
        p.glow?.(ex + 50, ey + 30, 16, 0xffd23a, 0.7);
        p.add?.(false);
      }
    },
    fg(p, t, _A, q) {
      // embers rising
      p.add?.(true);
      for (let i = 0; i < Math.round(26 * q); i++) {
        const k = (t * 0.3 + i * 0.037) % 1;
        const x = ((i * 89) % 1400) - 60 + Math.sin(t * 2 + i) * 10;
        p.circle(x, 620 - k * 640, 2, i % 2 ? 0xffd23a : 0xff6a1f, null, 0, 0.8 * (1 - k));
      }
      p.add?.(false);
    },
  },
  {
    id: 'skyrail',
    name: 'Sky-Rail Terminal',
    bg: 0x081428,
    accent: 0x3ad6ff,
    accent2: 0xffa040,
    props: [110, 1170],
    ambient: 'wind',
    sky: [0x081428, 0x2a3a6a],
    dark: true,
    layers: [
      {
        scroll: 0.04,
        draw(p) {
          sky(p, BAKE_Y, FLOOR_Y, [0x040a1c, 0x0a1634, 0x1c2850, 0x3a2e50, 0x6a3a48]);
          p.glow?.(900, 470, 320, 0xffa040, 0.22);
        },
      },
      { scroll: 0.14, draw: (p, r) => void towers(p, r, { base: 560, minH: 260, maxH: 700, wMin: 50, wMax: 110, color: 0x101a36, edge: 0x3a5a9a, windows: 0xffd08a, winA: 0.35, gap: 20, antenna: 0xff4a2e }) },
      {
        scroll: 0.35,
        draw(p) {
          // the maglev rails at two heights
          for (const y of [250, 360]) {
            p.line(X0, y, X1, y, 8, 0x141e3a);
            for (let x = X0; x < X1; x += 220) p.line(x, y, x, y + 300, 6, 0x141e3a);
            p.line(X0, y - 3, X1, y - 3, 2, 0x3ad6ff, 0.5);
          }
          // haze between the towers
          p.add?.(true);
          rect(p, X0, 420, X1 - X0, 180, 0x5a6aa0, 0.08);
          p.add?.(false);
        },
      },
      {
        scroll: 0.85,
        draw(p) {
          // lamp posts on the platform
          for (const x of [110, 1170]) {
            p.line(x, 600, x, 380, 6, 0x1a2848);
            p.line(x, 380, x + (x < 640 ? 40 : -40), 380, 5, 0x1a2848);
            p.add?.(true);
            p.glow?.(x + (x < 640 ? 40 : -40), 384, 40, 0xffd08a, 0.6);
            p.add?.(false);
          }
        },
      },
      {
        scroll: 1,
        draw(p, r) {
          floor(p, r, 0x1c2a4a, 0x060a16, 0x3ad6ff, 0xffa040, [110, 0xffd08a, 640, 0x3ad6ff, 1170, 0xffd08a]);
          // the platform underside edge (it floats)
          rect(p, X0, 700, X1 - X0, 40, 0x05070f);
          p.line(X0, 700, X1, 700, 3, 0x3ad6ff, 0.6);
        },
      },
    ],
    animMid(p, t) {
      // maglev trains on the two rails
      for (const [y, sp, dir] of [
        [250, 260, 1],
        [360, 380, -1],
      ] as const) {
        const len = 420;
        const x = (((t * sp * dir) % 3200) + 3200) % 3200 - 960;
        p.poly([x, y - 22, x + len, y - 22, x + len + 30, y - 8, x + len, y, x, y], 0x1a2a4a);
        p.add?.(true);
        for (let k = 0; k < 14; k++) rect(p, x + 14 + k * 29, y - 16, 18, 7, 0xffe2a8, 0.75);
        p.glow?.(dir > 0 ? x + len + 24 : x, y - 10, 30, 0x8fe8ff, 0.7);
        p.add?.(false);
      }
    },
    fg(p, t, A, q) {
      // wind-blown light streaks
      p.add?.(true);
      for (let i = 0; i < Math.round(8 * q); i++) {
        const x = ((i * 233 + t * (120 + A.wind * 600)) % 1600) - 160;
        const y = 140 + ((i * 97) % 400);
        p.line(x, y, x - 60 - A.wind * 120, y, 1.4, 0xc8e8ff, 0.18);
      }
      p.add?.(false);
    },
  },
  {
    id: 'techruins',
    name: 'Ancient Tech Ruins',
    bg: 0x0e0618,
    accent: 0xffc84a,
    accent2: 0x4adcff,
    props: [180, 520, 760, 1100],
    ambient: 'ruins',
    sky: [0x0e0618, 0x3a1a3a],
    dark: true,
    layers: [
      {
        scroll: 0.04,
        draw(p, r) {
          sky(p, BAKE_Y, FLOOR_Y, [0x06030e, 0x160a26, 0x3a1a3a, 0x6a2a3a, 0x8a4a2a]);
          stars(p, r, 90, BAKE_Y, 220, 0xffe8c8);
          p.glow?.(400, 500, 260, 0xffc84a, 0.25);
        },
      },
      {
        scroll: 0.2,
        draw(p, r) {
          // broken monolith silhouettes
          for (let x = X0; x < X1; x += 180 + r() * 140) {
            const h = 220 + r() * 300;
            const lean = (r() - 0.5) * 30;
            p.poly([x, 580, x + lean, 580 - h, x + 60 + lean, 580 - h + 30 * r(), x + 70, 580], 0x1a0e2a);
          }
        },
      },
      {
        scroll: 0.5,
        draw(p, r) {
          // crumbled pillars with glowing runes
          for (let x = X0 + 60; x < X1; x += 240) {
            const h = 160 + r() * 200;
            rect(p, x - 26, 580 - h, 52, h, 0x24142e);
            p.poly([x - 30, 580 - h, x - 10, 580 - h - 20, x + 6, 580 - h - 6, x + 30, 580 - h - 18, x + 30, 580 - h], 0x24142e);
            p.add?.(true);
            for (let k = 0; k < 4; k++) {
              const ry = 580 - h + 30 + k * 34;
              p.line(x - 10, ry, x + 10, ry, 2, k % 2 ? 0x4adcff : 0xffc84a, 0.75);
              p.line(x, ry - 8, x, ry + 8, 2, k % 2 ? 0x4adcff : 0xffc84a, 0.6);
            }
            p.add?.(false);
          }
        },
      },
      {
        scroll: 0.85,
        draw(p) {
          for (const x of [180, 1100]) {
            p.poly([x - 60, 600, x - 50, 540, x + 50, 530, x + 60, 600], 0x2a1830);
            p.line(x - 40, 560, x + 40, 556, 2, 0xffc84a, 0.6);
          }
        },
      },
      {
        scroll: 1,
        draw(p, r) {
          floor(p, r, 0x2a1830, 0x0a0410, 0xffc84a, 0xffc84a, [400, 0xffc84a, 880, 0x4adcff]);
          // circuit runes carved into the stone floor
          p.add?.(true);
          for (let x = -200; x < 1500; x += 150) {
            p.line(x, 640, x + 60, 640, 2, 0x4adcff, 0.35);
            p.line(x + 60, 640, x + 60, 670, 2, 0x4adcff, 0.35);
            p.circle(x + 60, 672, 3, 0x4adcff, null, 0, 0.5);
          }
          p.add?.(false);
        },
      },
    ],
    animMid(p, t) {
      // floating shards bobbing
      for (let i = 0; i < 7; i++) {
        const x = -200 + i * 260;
        const y = 220 + (i % 3) * 50 + Math.sin(t * 0.9 + i) * 14;
        const a = t * 0.3 + i;
        p.poly([x + Math.cos(a) * 18, y + Math.sin(a) * 8, x, y - 26, x - Math.cos(a) * 18, y - Math.sin(a) * 8, x, y + 22], 0x2a1838);
        p.add?.(true);
        p.line(x, y - 20, x, y + 16, 2, i % 2 ? 0x4adcff : 0xffc84a, 0.8);
        p.glow?.(x, y, 20, i % 2 ? 0x4adcff : 0xffc84a, 0.35);
        p.add?.(false);
      }
    },
    fg(p, t, _A, q) {
      p.add?.(true);
      for (let i = 0; i < Math.round(16 * q); i++) {
        const x = ((i * 151 + t * 10) % 1500) - 100;
        const y = 100 + ((i * 83) % 480) - Math.sin(t * 0.5 + i) * 20;
        p.circle(x, y, 1.6, 0xffe8a8, null, 0, 0.7);
      }
      p.add?.(false);
    },
  },
  {
    id: 'datavoid',
    name: 'Data Void',
    bg: 0x010208,
    accent: 0x2dff9a,
    accent2: 0xff3ad8,
    props: [160, 1120],
    ambient: 'data',
    sky: [0x010208, 0x06102a],
    dark: true,
    layers: [
      {
        scroll: 0.03,
        draw(p) {
          sky(p, BAKE_Y, FLOOR_Y, [0x000104, 0x020616, 0x061030, 0x0a1640]);
          // the horizon grid glow
          p.glow?.(640, 600, 800, 0x2dff9a, 0.12);
        },
      },
      {
        scroll: 0.18,
        draw(p) {
          // a far wireframe grid wall
          p.add?.(true);
          for (let x = X0; x < X1; x += 64) p.line(x, BAKE_Y, x, 560, 1, 0x1a4a8a, 0.25);
          for (let y = -200; y < 560; y += 64) p.line(X0, y, X1, y, 1, 0x1a4a8a, 0.25);
          p.add?.(false);
        },
      },
      { scroll: 0.5, draw: () => undefined },
      { scroll: 0.85, draw: () => undefined },
      { scroll: 1, draw: (p, r) => floor(p, r, 0x061430, 0x010208, 0x2dff9a, 0x2dff9a, [320, 0xff3ad8, 640, 0x2dff9a, 960, 0xff3ad8]) },
    ],
    animFar(p, t, _A, q) {
      // streaming data columns
      p.add?.(true);
      const cols = Math.round(26 * q);
      for (let i = 0; i < cols; i++) {
        const x = -600 + i * 96;
        for (let k = 0; k < 8; k++) {
          const y = ((t * (80 + (i % 5) * 30) + k * 50 + i * 37) % 700) - 100;
          rect(p, x, y, 4, 8, k === 0 ? 0xc8ffe0 : 0x2dff9a, 0.55 - k * 0.06);
        }
      }
      p.add?.(false);
    },
    animMid(p, t, A) {
      // floating wireframe geometry: rotating cubes and diamonds
      p.add?.(true);
      for (let i = 0; i < 5; i++) {
        const cx = 120 + i * 260;
        const cy = 200 + (i % 2) * 90 + Math.sin(t * 0.7 + i) * 20;
        const s = 40 + (i % 3) * 14;
        const a = t * (0.4 + i * 0.1);
        const pts: [number, number][] = [];
        for (let k = 0; k < 4; k++) pts.push([cx + Math.cos(a + (k * Math.PI) / 2) * s, cy + Math.sin(a + (k * Math.PI) / 2) * s * 0.45]);
        const c = i % 2 ? 0xff3ad8 : 0x2dff9a;
        for (let k = 0; k < 4; k++) {
          const [x1, y1] = pts[k]!;
          const [x2, y2] = pts[(k + 1) % 4]!;
          p.line(x1, y1 - s * 0.6, x2, y2 - s * 0.6, 2, c, 0.8);
          p.line(x1, y1 + s * 0.6, x2, y2 + s * 0.6, 2, c, 0.8);
          p.line(x1, y1 - s * 0.6, x1, y1 + s * 0.6, 2, c, 0.6);
        }
      }
      // a glitch line now and then (more after lightning)
      const g = (Math.sin(t * 7.3) > 0.97 ? 1 : 0) + A.strobe;
      if (g > 0.2) rect(p, X0, 140 + ((t * 977) % 400), X1 - X0, 3 + g * 4, 0xff3ad8, 0.3 * Math.min(1, g));
      p.add?.(false);
    },
    fg(p, t, _A, q) {
      p.add?.(true);
      for (let i = 0; i < Math.round(14 * q); i++) {
        const x = ((i * 173) % 1400) - 60;
        const y = ((t * 30 + i * 61) % 700) - 60;
        rect(p, x, y, 2, 2, 0x8affc8, 0.6);
      }
      p.add?.(false);
    },
  },
  {
    id: 'gravwell',
    name: 'Gravity Well Arena',
    bg: 0x05020e,
    accent: 0xa66bff,
    accent2: 0xff8a4a,
    props: [140, 1140],
    ambient: 'void',
    sky: [0x05020e, 0x1a0a3a],
    dark: true,
    layers: [
      {
        scroll: 0.03,
        draw(p, r) {
          sky(p, BAKE_Y, FLOOR_Y, [0x020108, 0x08041a, 0x140834, 0x1a0a3a]);
          stars(p, r, 160, BAKE_Y, FLOOR_Y, 0xe8d8ff);
        },
      },
      {
        scroll: 0.12,
        draw(p) {
          // the singularity: dark disk, accretion ring and lensing arcs
          const cx = 640;
          const cy = 170;
          p.glow?.(cx, cy, 420, 0xa66bff, 0.3);
          ellipse(p, cx, cy, 300, 54, 18, 0xff8a4a, 0.35);
          ellipse(p, cx, cy, 300, 54, 6, 0xffe0b0, 0.6);
          for (let k = 0; k < 3; k++) ellipse(p, cx, cy, 150 + k * 22, 150 + k * 22, 2, 0xd6c4ff, 0.3 - k * 0.08, Math.PI * 1.1, Math.PI * 1.9, 40);
          p.circle(cx, cy, 118, 0x000000, null);
          p.circle(cx, cy, 122, null, 0xffb07a, 3, 0.8);
        },
      },
      {
        scroll: 0.45,
        draw(p) {
          // the ring-shaped arena structure, curving away
          ellipse(p, 640, 760, 1100, 330, 34, 0x140a2a, 1, Math.PI * 1.04, Math.PI * 1.96, 80);
          ellipse(p, 640, 760, 1100, 330, 2, 0xa66bff, 0.6, Math.PI * 1.04, Math.PI * 1.96, 80);
          for (let i = 0; i < 12; i++) {
            const a = Math.PI * 1.08 + (i / 11) * Math.PI * 0.84;
            const x = 640 + Math.cos(a) * 1100;
            const y = 760 + Math.sin(a) * 330;
            p.line(x, y, x, y + 200, 10, 0x140a2a);
          }
        },
      },
      {
        scroll: 0.85,
        draw(p) {
          for (const x of [140, 1140]) {
            p.poly([x - 50, 600, x - 30, 520, x + 30, 520, x + 50, 600], 0x1a0e30);
            p.line(x - 30, 520, x + 30, 520, 2, 0xa66bff, 0.7);
          }
        },
      },
      { scroll: 1, draw: (p, r) => floor(p, r, 0x1a0e34, 0x05020e, 0xa66bff, 0xff8a4a, [640, 0xff8a4a, 330, 0xa66bff, 950, 0xa66bff]) },
    ],
    animFar(p, t, _A, q) {
      // matter streaming around the accretion ring
      p.add?.(true);
      const n = Math.round(24 * q);
      for (let i = 0; i < n; i++) {
        const a = t * 0.6 + (i / n) * Math.PI * 2;
        const x = 640 + Math.cos(a) * 300;
        const y = 170 + Math.sin(a) * 54;
        if (Math.sin(a) > -0.3 || Math.abs(Math.cos(a)) > 0.45) p.glow?.(x, y, 10, 0xffd0a0, 0.6);
      }
      p.add?.(false);
    },
    animMid(p, t) {
      // debris orbiting slowly
      for (let i = 0; i < 6; i++) {
        const a = t * 0.12 + i;
        const x = 640 + Math.cos(a) * (520 + i * 30);
        const y = 260 + Math.sin(a) * 60;
        p.poly([x - 10, y, x - 2, y - 8, x + 12, y - 4, x + 8, y + 8], 0x24163a);
      }
    },
  },
];

/** Old arena ids (earlier builds) to their new counterparts. */
export const LEGACY: Record<string, string> = {
  rooftop: 'neon',
  city: 'skyrail',
  sky: 'orbital',
  gym: 'reactor',
  forest: 'biodome',
  lava: 'foundry',
  ice: 'cryo',
  ruins: 'techruins',
};

export const arenaById = (id: string): ArenaDef => {
  const real = LEGACY[id] ?? id;
  return ARENAS.find((a) => a.id === real) ?? ARENAS[0]!;
};

/** The lobby hangar: drawn behind the menus (BackdropScene), never fought in. Same layer system as the arenas. */
export const HANGAR: ArenaDef = {
  id: 'hangar',
  name: 'Hangar',
  bg: 0x05060f,
  accent: 0x3df5ff,
  accent2: 0x8a5cff,
  props: [],
  ambient: 'hum',
  sky: [0x05060f, 0x101436],
  dark: true,
  layers: [
    {
      scroll: 0.04,
      draw(p, r) {
        // deep space through the hangar window, a planet rim and a nebula
        sky(p, BAKE_Y, FLOOR_Y, [0x020310, 0x070a24, 0x10123a, 0x1a1040]);
        stars(p, r, 140, BAKE_Y, 420, 0xcfe0ff);
        p.add?.(true);
        p.glow?.(300, 120, 420, 0x8a5cff, 0.25);
        p.glow?.(1000, 60, 360, 0x2de2ff, 0.16);
        p.add?.(false);
        p.circle(900, 760, 520, 0x0a0c26, null);
        ellipse(p, 900, 760, 520, 520, 6, 0x3df5ff, 0.55, Math.PI * 1.08, Math.PI * 1.92, 60);
        p.add?.(true);
        ellipse(p, 900, 760, 528, 528, 22, 0x3df5ff, 0.12, Math.PI * 1.08, Math.PI * 1.92, 60);
        p.add?.(false);
      },
    },
    {
      scroll: 0.14,
      draw(p) {
        // distant cruisers parked in orbit
        for (const [x, y, k] of [
          [140, 210, 1],
          [1180, 150, 0.7],
          [620, 90, 0.5],
        ] as const) {
          p.poly([x - 120 * k, y, x + 90 * k, y - 14 * k, x + 140 * k, y, x + 90 * k, y + 14 * k], 0x0c1030);
          p.line(x - 110 * k, y, x + 130 * k, y, 1.5, 0x5a7cff, 0.6);
          p.glow?.(x - 120 * k, y, 14 * k, 0x3df5ff, 0.7);
        }
      },
    },
    {
      scroll: 0.3,
      draw(p) {
        // the window frame: heavy struts with neon seams
        const strut = (x0: number, y0: number, x1: number, y1: number, w: number) => {
          p.line(x0, y0, x1, y1, w, 0x080a1c);
          p.line(x0, y0, x1, y1, 2, 0x2a3a7a, 0.9);
        };
        rect(p, X0, BAKE_Y, X1 - X0, 40 - BAKE_Y, 0x070818);
        for (let x = -600; x <= 1900; x += 310) strut(x, 40, x + 60, 470, 34);
        strut(X0, 40, X1, 40, 26);
        strut(X0, 470, X1, 470, 30);
        glowLine(p, X0, 470, X1, 470, 2, 0x3df5ff, 0.6);
        glowLine(p, X0, 40, X1, 40, 1.5, 0x8a5cff, 0.5);
      },
    },
    {
      scroll: 0.6,
      draw(p) {
        // side bays: walls with light panels, a catwalk, cargo crates
        for (const side of [-1, 1]) {
          const x = side < 0 ? -640 : 1360;
          const w = 560;
          const xl = side < 0 ? x : x - w + 560;
          rect(p, xl, 80, w, 540, 0x0a0c22);
          for (let y = 120; y < 460; y += 70) {
            rect(p, xl + 40, y, w - 80, 46, 0x10142e);
            p.line(xl + 40, y + 46, xl + w - 40, y + 46, 2, side < 0 ? 0x3df5ff : 0xff3ea5, 0.45);
          }
        }
        // catwalk
        p.line(X0, 400, X1, 400, 8, 0x0e1230);
        for (let x = X0; x < X1; x += 40) p.line(x, 370, x, 400, 2, 0x1a2250);
        p.line(X0, 370, X1, 370, 3, 0x2a3a7a);
        // crates
        for (const [x, w, h] of [
          [-80, 130, 90],
          [60, 90, 60],
          [1180, 140, 100],
          [1330, 90, 70],
        ] as const) {
          rect(p, x, 600 - h, w, h, 0x121634);
          p.line(x, 600 - h, x + w, 600 - h, 2, 0x5a7cff, 0.7);
          p.line(x + 10, 600 - h + 12, x + w - 10, 600 - h + 12, 4, 0xffd84a, 0.5);
        }
      },
    },
    {
      scroll: 1,
      draw(p, r) {
        floor(p, r, 0x141838, 0x05060f, 0x3df5ff, 0x3df5ff, [300, 0x3df5ff, 640, 0x8a5cff, 980, 0xff3ea5]);
        // the launch pad: concentric rings on the floor
        p.add?.(true);
        for (let i = 0; i < 3; i++) ellipse(p, 640, 640, 220 + i * 70, 34 + i * 11, 2.5 - i * 0.6, 0x3df5ff, 0.5 - i * 0.12, 0, Math.PI * 2, 56);
        p.add?.(false);
      },
    },
  ],
  animMid(p, t, _A, q) {
    // maintenance drones crossing the bay and blinking warning lights
    p.add?.(true);
    for (let i = 0; i < Math.round(4 * q) + 1; i++) {
      const x = ((t * (40 + i * 13) + i * 700) % 2200) - 460;
      const y = 180 + i * 50 + Math.sin(t * 1.3 + i) * 12;
      p.circle(x, y, 4, 0x0a0c22, null);
      p.glow?.(x, y, 10, i % 2 ? 0xff3ea5 : 0x3df5ff, 0.8);
    }
    const blink = Math.sin(t * 3) > 0.6 ? 1 : 0.2;
    for (const x of [-300, 1580]) p.glow?.(x, 90, 18, 0xff4a2e, 0.8 * blink);
    p.add?.(false);
  },
  animNear(p, t) {
    // a slow holographic ring over the pad and a scanning light
    p.add?.(true);
    const k = (t * 0.25) % 1;
    ellipse(p, 640, 640 - k * 240, 200 - k * 40, 30 - k * 6, 2, 0x3df5ff, 0.45 * (1 - k), 0, Math.PI * 2, 48);
    const sx = 640 + Math.sin(t * 0.4) * 520;
    beam(p, sx, -40, sx + Math.sin(t * 0.4) * 80, 600, 8, 90, 0x3df5ff, 0.03);
    p.add?.(false);
  },
  fg(p, t, _A, q) {
    p.add?.(true);
    for (let i = 0; i < Math.round(20 * q); i++) {
      const x = ((i * 137 + t * (8 + (i % 5) * 3)) % 1500) - 110;
      const y = 120 + ((i * 71) % 460) + Math.sin(t * 0.6 + i) * 14;
      p.circle(x, y, 1.4 + (i % 3) * 0.6, i % 3 ? 0xcfe8ff : 0x8a5cff, null, 0, 0.5);
    }
    p.add?.(false);
  },
};