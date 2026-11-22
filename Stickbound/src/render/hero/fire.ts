// Fire hero: big flickering flame hair, red headband with two rope-physics ribbon tails, angry slanted glowing eyes,
// and the super-power flame that engulfs the hero (reference R01 and R27).

import type { HC } from './draw';
import { rope } from './rope';

const RED = 0xe8321a;
const ORANGE = 0xff7a1f;
const YELLOW = 0xffd23a;
const WHITE_HOT = 0xfff4c0;

export function fireHead(c: HC): void {
  const { pen, hx, hy, r, t, face, back, a, o, cast } = c;
  const bandY = hy - r * 0.34;
  // hair cap: the upper head above the band, orange with a red rim
  const capPts = (rr: number): number[] => {
    const out: number[] = [];
    const a0 = Math.PI + Math.asin(0.34 * r / rr);
    const a1 = 2 * Math.PI - Math.asin(0.34 * r / rr);
    for (let i = 0; i <= 8; i++) {
      const ang = a0 + ((a1 - a0) * i) / 8;
      out.push(hx + Math.cos(ang) * rr, hy + Math.sin(ang) * rr);
    }
    return out;
  };
  pen.poly(capPts(r * 1.04), RED, a);
  pen.poly(capPts(r * 0.9), ORANGE, a);
  // flame hair: overlapping teardrops, tips swept back and flickering, as tall as the head
  const grow = 1 + cast * 0.55;
  const hb = hy - r * 0.7;
  const hh5 = [1.15, 1.7, 2.15, 1.8, 1.3];
  for (let layerI = 0; layerI < 3; layerI++) {
    const k = [1, 0.74, 0.5][layerI]!;
    const col = [RED, ORANGE, YELLOW][layerI]!;
    for (let i = 0; i < 5; i++) {
      const fl = 0.9 + 0.1 * Math.sin(t * 12 + i * 2.3) + 0.04 * Math.sin(t * 25 + i);
      const dx = (i - 2) * r * 0.42;
      const lean = back * r * (0.15 + 0.12 * Math.abs(i - 2)) + Math.sin(t * 8 + i * 1.7) * r * 0.12;
      teardrop(c, hx + dx * (0.85 + 0.15 * k), hb + r * 0.45, r * 0.95 * (0.5 + 0.5 * k), r * hh5[i]! * fl * grow * (0.55 + 0.45 * k), 11 + i + layerI * 5, col, a, lean, 0.5);
    }
  }  pen.add?.(true);
  pen.glow?.(hx, hy - r * 1.2, r * (2.2 + cast), ORANGE, 0.4 * a);
  for (let k = 0; k < 4; k++) {
    const ph = (t * 0.8 + k * 0.29) % 1;
    pen.circle(hx + Math.sin(k * 5 + t * 2) * r * 0.9, hy - r * 1.5 - ph * r * 2.6, r * 0.08 * (1 - ph) + 0.4, YELLOW, null, 0, a * (1 - ph));
  }
  pen.add?.(false);

  // headband with two long ribbon tails (rope physics)
  const bw = r * 0.27;
  pen.line(hx - r * 1.0, bandY + r * 0.02, hx, bandY - r * 0.02, bw, 0xc9261c, a);
  pen.line(hx, bandY - r * 0.02, hx + r * 1.0, bandY + r * 0.02, bw, 0xc9261c, a);
  pen.line(hx - r * 0.95, bandY - bw * 0.3, hx + r * 0.95, bandY - bw * 0.3, bw * 0.2, 0xff5a3a, a);
  const ax = hx + back * r * 0.96;
  const ay = bandY + r * 0.02;
  const cl = c.cloth;
  const spd = 0.5 + 0.5 * Math.min(1, Math.abs(c.j.aHand[0] - c.j.bHand[0]) / (c.H * 0.4));
  for (let k = 0; k < 2; k++) {
    rope(cl, 20 + k * 10, 8, ax, ay, back * (0.9 - k * 0.2), -0.25 + k * 0.85, r * 0.34, 0.33, t, k * 1.7, r * 0.3 * spd, 0.07);
    let px = ax;
    let py = ay + (k - 0.5) * bw * 0.4;
    for (let i = 0; i < 8; i++) {
      const p = cl[20 + k * 10 + i]!;
      const w0 = bw * 0.95 * (1 - i / 8 * 0.6);
      const w1 = bw * 0.95 * (1 - (i + 1) / 8 * 0.6);
      pen.poly([px, py - w0, p.x, p.y - w1, p.x, p.y + w1, px, py + w0], k ? 0xa51f18 : 0xd1281f, a);
      px = p.x;
      py = p.y;
    }
  }

  // eyes: big slanted glowing slits
  const e = o.expression;
  const ey = hy + r * 0.2;
  const exc = hx + face * r * 0.1;
  const W = r * 0.43;
  const hh = r * 0.19;
  const tl = e === 'angry' ? r * 0.18 : e === 'determined' || e === 'smug' ? r * 0.14 : r * 0.1;
  pen.add?.(true);
  pen.glow?.(exc, ey, r * 1.1, ORANGE, 0.45 * a);
  pen.add?.(false);
  for (const sg of [-1, 1]) {
    const cx = exc + sg * r * 0.42;
    const ox = cx + sg * W;
    const ix = cx - sg * W;
    if (e === 'happy') {
      pen.line(cx - W * 0.8, ey + hh * 0.5, cx, ey - hh * 1.3, r * 0.1, WHITE_HOT, a);
      pen.line(cx, ey - hh * 1.3, cx + W * 0.8, ey + hh * 0.5, r * 0.1, WHITE_HOT, a);
    } else if (e === 'hurt' || e === 'dizzy') {
      pen.line(cx - W * 0.5, ey - hh * 1.4, cx + W * 0.5, ey + hh * 1.4, r * 0.1, WHITE_HOT, a);
      pen.line(cx - W * 0.5, ey + hh * 1.4, cx + W * 0.5, ey - hh * 1.4, r * 0.1, WHITE_HOT, a);
    } else if (e === 'shocked' || e === 'scared') {
      pen.circle(cx, ey, r * 0.2, WHITE_HOT, ORANGE, r * 0.07, a);
    } else {
      const k = e === 'angry' ? 1.05 : 1;
      // orange rim then a white-yellow core
      pen.poly([ox, ey - tl, cx, ey - hh * 1.5 * k - tl * 0.1, ix, ey + tl, cx, ey + hh * 1.1], ORANGE, a);
      pen.poly([ox - sg * W * 0.12, ey - tl * 0.9, cx, ey - hh * 1.0, ix + sg * W * 0.12, ey + tl * 0.9, cx, ey + hh * 0.6], WHITE_HOT, a);
    }
  }
}

/** teardrop flame body with a jagged tongue edge; the tip sways */
export function teardrop(c: HC, cx: number, gy: number, W: number, Hh: number, seed: number, color: number, alpha: number, lean = 0, jagAmp = 1): void {
  const pts: number[] = [];
  const N = 16;
  const t = c.t;
  const edge = (f: number, side: number, i: number) => {
    const hw = (W / 2) * Math.pow(1 - Math.pow(f, 1.5), 0.85);
    const jag = i % 2 ? 1 + 0.09 * jagAmp + 0.04 * Math.sin(t * 9 + seed + i) : 1 - 0.07 * jagAmp;
    const sway = Math.sin(t * 6 + seed) * W * 0.12 * f * f - W * 0.05 * f * f * f * side * 0;
    pts.push(cx + side * hw * jag + sway + lean * f * f, gy - Hh * f * (1 + (i % 2 ? 0.04 : 0) + 0.035 * Math.sin(t * 11 + seed * 2 + i)));
  };
  for (let i = 0; i <= N; i++) edge(i / N, -1, i);
  for (let i = N - 1; i >= 0; i--) edge(i / N, 1, i + 1);
  c.pen.poly(pts, color, alpha);
}

/** Super flame around the hero: back half behind, front half in front. Only while casting. */
export function fireAura(c: HC, part: 'back' | 'front'): void {
  const { pen, j, H, t, a } = c;
  if (!c.cast) return;
  const cx = j.pelvis[0];
  const gy = c.gy + H * 0.03;
  if (part === 'back') {
    pen.add?.(true);
    pen.glow?.(cx, gy - H * 0.6, H * 1.7, ORANGE, 0.5 * a);
    pen.glow?.(cx, gy - H * 0.2, H * 0.9, YELLOW, 0.55 * a);
    pen.add?.(false);
    for (const [dx, w, h, sd] of [[-0.6, 0.5, 1.0, 1], [0.62, 0.45, 0.9, 2], [-0.36, 0.6, 1.35, 3], [0.38, 0.6, 1.25, 4]] as const) {
      teardrop(c, cx + dx * H, gy, w * H, h * H, sd, RED, 0.95 * a);
      teardrop(c, cx + dx * H, gy, w * H * 0.7, h * H * 0.75, sd + 1, ORANGE, 0.95 * a);
    }
    teardrop(c, cx, gy, H * 1.4, H * 1.75, 5, RED, 0.97 * a);
    teardrop(c, cx, gy, H * 1.12, H * 1.5, 6, ORANGE, 0.97 * a);
    teardrop(c, cx, gy, H * 0.8, H * 1.12, 7, YELLOW, 0.97 * a);
    teardrop(c, cx, gy, H * 0.46, H * 0.65, 8, WHITE_HOT, 0.95 * a);
  } else {
    for (let i = 0; i < 6; i++) {
      const u = (i / 5) * 2 - 1;
      if (Math.abs(u) < 0.5) continue;
      const fl = 0.8 + 0.2 * Math.sin(t * 12 + i * 1.9);
      const h = H * (0.42 - 0.12 * Math.abs(u)) * fl;
      const x = cx + u * H * 0.58;
      teardrop(c, x, gy + H * 0.02, H * 0.34, h, i * 3, ORANGE, 0.92 * a);
      teardrop(c, x, gy + H * 0.02, H * 0.2, h * 0.65, i * 3 + 1, YELLOW, 0.92 * a);
    }
    pen.add?.(true);
    const pulse = (t * 1.6) % 1;
    for (let i = 0; i < 24; i++) {
      const a0 = (i / 24) * Math.PI * 2;
      const a1 = ((i + 1) / 24) * Math.PI * 2;
      const R = H * (0.35 + 0.5 * pulse);
      pen.line(cx + Math.cos(a0) * R, gy + Math.sin(a0) * R * 0.18, cx + Math.cos(a1) * R, gy + Math.sin(a1) * R * 0.18, H * 0.015, ORANGE, 0.7 * (1 - pulse) * a);
    }
    for (let k = 0; k < 14; k++) {
      const ph = (t * 0.7 + k * 0.071) % 1;
      pen.circle(cx + Math.sin(k * 7.3 + t) * H * 0.6, gy - ph * H * 2.1, H * 0.014 * (1 - ph) + 0.5, YELLOW, null, 0, a * (1 - ph));
    }
    pen.add?.(false);
  }
}