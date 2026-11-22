// Lightning hero: big swept spiky hair with a yellow outline, wraparound yellow visor with a cyan frame and a bolt
// emblem, cyan ear disc, toothy grin, crackling arcs, and the storm that engulfs the hero on a super (R15).

import type { HC } from './draw';

const CYAN = 0x39c8ff;
const CYAN_HOT = 0xbff2ff;
const YEL = 0xffd21f;
const YEL_HOT = 0xfff6a8;

const rnd = (n: number) => {
  const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/** a jagged bolt with a cyan glow, a coloured body and a white core; `branch` adds one side fork */
function bolt(c: HC, x0: number, y0: number, x1: number, y1: number, segs: number, jag: number, seed: number, color: number, wMul: number, branch: boolean): void {
  const { pen, H, a } = c;
  let px = x0;
  let py = y0;
  for (let i = 1; i <= segs; i++) {
    const u = i / segs;
    const last = i === segs;
    const nx = x0 + (x1 - x0) * u + (last ? 0 : (rnd(seed + i * 3.7) - 0.5) * jag);
    const ny = y0 + (y1 - y0) * u + (last ? 0 : (rnd(seed + i * 5.3) - 0.5) * jag * 0.6);
    pen.line(px, py, nx, ny, H * 0.07 * wMul, CYAN, 0.3 * a);
    pen.line(px, py, nx, ny, H * 0.024 * wMul, color, 0.95 * a);
    pen.line(px, py, nx, ny, H * 0.009 * wMul, 0xffffff, a);
    if (branch && (i === Math.floor(segs / 3) || i === Math.floor((segs * 2) / 3))) {
      const dir = rnd(seed + i * 9.1) > 0.5 ? 1 : -1;
      bolt(c, nx, ny, nx + dir * H * 0.22 * (0.6 + rnd(seed + i)), ny + (y1 - y0) * 0.18, 3, jag * 0.6, seed + i * 11, color, wMul * 0.6, false);
    }
    px = nx;
    py = ny;
  }
}

export function lightningHead(c: HC): void {
  const { pen, hx, hy, r, face, back, a, o, t } = c;
  const f = face;
  // swept spiky hair: dark fill, yellow outline
  const tipU = [0.8, 0.4, 0.0, -0.4, -0.8];
  const tipH = [1.0, 1.45, 1.7, 1.45, 0.95];
  const flick = Math.floor(t * 10);
  const pts: number[] = [];
  const baseY = (u: number) => hy - Math.sqrt(Math.max(0.04, 1 - u * u)) * r * 0.86;
  pts.push(hx + f * r * 1.0, hy - r * 0.15);
  for (let i = 0; i < tipU.length; i++) {
    const u = tipU[i]!;
    const hgt = tipH[i]! * r * (1 + (rnd(flick * 3 + i) - 0.5) * 0.06 * (c.cast ? 4 : 1));
    pts.push(hx + f * (u + 0.2) * r, baseY(u + 0.2) - hgt * 0.1);
    pts.push(hx + f * u * r + back * r * 0.62, baseY(u) - hgt);
    const un = (tipU[i + 1] ?? -1.0) + 0.0;
    pts.push(hx + f * ((u + un) / 2) * r, baseY((u + un) / 2) - r * 0.12);
  }
  pts.push(hx - f * r * 1.0, hy - r * 0.15);
  for (let i = 0; i < pts.length - 2; i += 2) pen.line(pts[i]!, pts[i + 1]!, pts[i + 2]!, pts[i + 3]!, c.ow * 2.1, YEL, a);
  pen.poly(pts, 0x0c0c15, a);
  for (let i = 2; i < pts.length - 4; i += 2) pen.line(pts[i]!, pts[i + 1]!, pts[i + 2]!, pts[i + 3]!, c.ow * 0.55, YEL_HOT, a * 0.9);
  pen.add?.(true);
  pen.glow?.(hx + back * r * 0.2, hy - r * 1.1, r * 1.9, YEL, 0.22 * a);
  pen.add?.(false);

  // ear disc on the back side
  const ex = hx + back * r * 0.96;
  const ey = hy + r * 0.12;
  pen.circle(ex, ey, r * 0.33, CYAN, null, 0, a);
  pen.circle(ex, ey, r * 0.23, 0x07141f, null, 0, a);
  pen.circle(ex, ey, r * 0.09, CYAN_HOT, null, 0, a);

  // wraparound visor
  const sh = f * r * 0.1;
  const vy = hy - r * 0.02;
  const V: number[][] = [
    [-1.16, -0.34], [-0.55, -0.5], [0.55, -0.5], [1.16, -0.34],
    [1.16, 0.26], [0.55, 0.4], [-0.55, 0.4], [-1.16, 0.26],
  ];
  const mk = (k: number, dy = 0): number[] => V.flatMap(([x, y]) => [hx + sh + x! * r * k, vy + dy + y! * r * (k > 1 ? k * 1.08 : k)]);
  pen.poly(mk(1.1), CYAN, a);
  pen.poly(mk(1), 0xffd21f, a);
  pen.poly([hx + sh - r * 1.1, vy - r * 0.26, hx + sh - r * 0.55, vy - r * 0.46, hx + sh + r * 0.55, vy - r * 0.46, hx + sh + r * 1.1, vy - r * 0.26, hx + sh + r * 1.1, vy + r * 0.02, hx + sh - r * 1.1, vy + r * 0.02], 0xffe86a, a);
  pen.add?.(true);
  pen.line(hx + sh - r * 0.8, vy - r * 0.12, hx + sh + r * 0.1, vy - r * 0.22, r * 0.07, 0xffffff, 0.7 * a);
  pen.glow?.(hx + sh, vy, r * 1.3, YEL, 0.4 * a);
  pen.add?.(false);
  // bolt emblem
  const bx = hx + sh + f * r * 0.05;
  pen.poly([bx - r * 0.1, vy - r * 0.4, bx + r * 0.28, vy - r * 0.4, bx + r * 0.06, vy - r * 0.06, bx + r * 0.28, vy - r * 0.06, bx - r * 0.16, vy + r * 0.34, bx - r * 0.02, vy + r * 0.02, bx - r * 0.24, vy + r * 0.02], 0xfffdf0, a);

  // grin
  const e = o.expression;
  const gx = hx + f * r * 0.22;
  const gy = hy + r * 0.62;
  if (e === 'shocked' || e === 'scared') {
    pen.circle(gx, gy, r * 0.13, 0x05060c, 0xffffff, r * 0.05, a);
  } else if (e === 'hurt' || e === 'dizzy') {
    pen.line(gx - r * 0.25, gy, gx + r * 0.25, gy + r * 0.03, r * 0.07, 0xffffff, a);
  } else {
    const wide = e === 'happy' ? 0.6 : 0.5;
    const top: number[] = [];
    const bot: number[] = [];
    for (let i = 0; i <= 6; i++) {
      const u = (i / 6) * 2 - 1;
      const k = 1 - u * u;
      top.push(gx + u * wide * r, gy - r * 0.04 * k + (e === 'angry' ? u * f * r * 0.04 : 0));
      bot.push(gx + u * wide * r, gy + r * 0.3 * Math.pow(k, 0.9) - r * 0.02);
    }
    const poly = [...top];
    for (let i = bot.length - 2; i >= 0; i -= 2) poly.push(bot[i]!, bot[i + 1]!);
    pen.poly(poly, 0xffffff, a);
    for (const u of [-0.4, 0, 0.4]) pen.line(gx + u * wide * r, gy - r * 0.02, gx + u * wide * r, gy + r * 0.2 * (1 - u * u), r * 0.035, 0x1a1a2a, 0.85 * a);
  }

  lightningArcs(c);
}

/** crackling arcs jumping over the limbs (also drawn with the image-part head) */
export function lightningArcs(c: HC): void {
  const { pen, o, t, H, a } = c;
  const act = c.cast ? 6 : o.aura > 0.3 ? 2 : 0;
  const fr = Math.floor(t * 20);
  pen.add?.(true);
  for (let k = 0; k < act; k++) {
    const limbs = [c.j.aEl, c.j.aHand, c.j.aKn, c.j.aFoot, c.j.bEl, c.j.bHand, c.j.bKn, c.j.bFoot, c.j.pelvis, c.j.neck];
    const p = limbs[Math.floor(rnd(fr * 7 + k * 13) * limbs.length)]!;
    let px = p[0] + (rnd(fr + k) - 0.5) * c.lw * 2;
    let py = p[1] + (rnd(fr * 3 + k) - 0.5) * c.lw * 2;
    for (let i = 0; i < 4; i++) {
      const nx = px + (rnd(fr * 11 + k * 5 + i) - 0.5) * H * 0.1;
      const ny = py + (rnd(fr * 13 + k * 7 + i) - 0.5) * H * 0.1;
      pen.line(px, py, nx, ny, H * 0.012, k % 2 ? CYAN : YEL, 0.9 * a);
      pen.line(px, py, nx, ny, H * 0.004, 0xffffff, a);
      px = nx;
      py = ny;
    }
  }
  pen.add?.(false);
}

/** Storm around the hero on a super: tall branching bolts behind, ground discharge in front. */
export function lightningAura(c: HC, part: 'back' | 'front'): void {
  const { pen, j, H, t, a } = c;
  if (!c.cast) return;
  const cx = j.pelvis[0];
  const gy = c.gy;
  const fr = Math.floor(t * 24);
  pen.add?.(true);
  if (part === 'back') {
    pen.glow?.(cx, gy - H * 0.55, H * 1.5, CYAN, 0.5 * a);
    for (const sd of [-1, 1]) {
      pen.glow?.(cx + sd * H * 0.5, gy - H * 0.1, H * 0.75, CYAN, 0.7 * a);
      pen.glow?.(cx + sd * H * 0.5, gy - H * 0.05, H * 0.4, YEL_HOT, 0.7 * a);
    }
    pen.glow?.(cx, gy - H * 0.3, H * 0.8, YEL, 0.25 * a);
    for (let i = 0; i < 8; i++) {
      // bolts cluster at the sides, like the sheet's storm
      const u = [-0.95, -0.75, -0.55, -0.3, 0.3, 0.55, 0.75, 0.95][i]!;
      const x0 = cx + u * H * 0.55;
      const top = H * (0.9 + 0.9 * rnd(fr + i * 3)) * (Math.abs(u) > 0.5 ? 1.1 : 0.8);
      bolt(c, x0, gy, x0 + u * H * 0.22 + (rnd(fr * 3 + i) - 0.5) * H * 0.2, gy - top, 11, H * 0.15, fr * 17 + i * 31, i % 2 ? YEL : CYAN_HOT, Math.abs(u) > 0.5 ? 1.15 : 0.8, true);
    }
  } else {
    for (let i = 0; i < 6; i++) {
      const u = (i / 5) * 2 - 1;
      const x0 = cx + u * H * 0.62;
      bolt(c, x0, gy + H * 0.01, x0 + (rnd(fr + i * 3) - 0.5) * H * 0.3, gy - H * (0.35 + 0.35 * rnd(fr * 5 + i)), 5, H * 0.1, fr * 23 + i * 7, i % 2 ? CYAN_HOT : YEL, 0.9, false);
    }
    // ground ring and sparks
    const pulse = (t * 2.2) % 1;
    for (let i = 0; i < 24; i++) {
      const a0 = (i / 24) * Math.PI * 2;
      const a1 = ((i + 1) / 24) * Math.PI * 2;
      const R = H * (0.3 + 0.55 * pulse);
      pen.line(cx + Math.cos(a0) * R, gy + Math.sin(a0) * R * 0.18, cx + Math.cos(a1) * R, gy + Math.sin(a1) * R * 0.18, H * 0.012, CYAN_HOT, 0.8 * (1 - pulse) * a);
    }
    for (let k = 0; k < 10; k++) {
      const ph = (t * 1.3 + k * 0.1) % 1;
      pen.circle(cx + (rnd(k * 3.3 + fr * 0.05) - 0.5) * H * 1.2, gy - ph * H * 1.2, H * 0.01 + 0.4, k % 2 ? YEL_HOT : CYAN_HOT, null, 0, a * (1 - ph));
    }
  }
  pen.add?.(false);
}
