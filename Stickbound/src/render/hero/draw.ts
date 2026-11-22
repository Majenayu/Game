// Neon hero renderer: smooth curved tubes, near-black fill, bright outline with a hotter inner line, round mitts,
// a ray-burst chest core. Replaces the straight-line stick for the elements listed in NEW_RENDERER.
// Signature pieces live in fire.ts and lightning.ts.

import type { Pen } from '../pen';
import type { DrawOpts, Joints } from '../rig';
import { drawHands, drawHat, drawSuit, drawTech } from '../rig';
import { BODIES } from '../../content/looks';
import { FILL, REF_H, SPEC, STYLE } from './heroSpec';
import { fireAura, fireHead } from './fire';
import { lightningAura, lightningHead } from './lightning';

export const NEW_RENDERER = new Set<string>(['fire', 'lightning']);

type V2 = [number, number];

export interface HC {
  pen: Pen;
  j: Joints;
  face: number;
  s: number;
  /** standing height in pixels */
  H: number;
  /** head radius */
  r: number;
  hx: number;
  hy: number;
  t: number;
  o: DrawOpts;
  a: number;
  neon: number;
  hot: number;
  cast: number;
  /** -face: the direction behind the hero */
  back: number;
  ow: number;
  lw: number;
  /** ground y under the feet */
  gy: number;
  cloth: { x: number; y: number }[];
}

type Shape =
  | { k: 'tube'; pts: V2[]; w: number; skip: number }
  | { k: 'taper'; a: V2; b: V2; w0: number; w1: number }
  | { k: 'dot'; x: number; y: number; r: number };

/** points along a quadratic curve that passes through the middle joint (smooth, no kink) */
function curve(a: V2, b: V2, c: V2, n: number): V2[] {
  const cx = 2 * b[0] - (a[0] + c[0]) / 2;
  const cy = 2 * b[1] - (a[1] + c[1]) / 2;
  const out: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const m = 1 - u;
    out.push([m * m * a[0] + 2 * m * u * cx + u * u * c[0], m * m * a[1] + 2 * m * u * cy + u * u * c[1]]);
  }
  return out;
}

function stroke(pen: Pen, sh: Shape, extra: number, color: number, a: number): void {
  if (sh.k === 'dot') {
    pen.circle(sh.x, sh.y, sh.r + extra / 2, color, null, 0, a);
  } else if (sh.k === 'tube') {
    const p = sh.pts;
    const w = sh.w + extra;
    for (let i = Math.min(sh.skip, p.length - 2); i < p.length - 1; i++) pen.line(p[i]![0], p[i]![1], p[i + 1]![0], p[i + 1]![1], w, color, a);
  } else {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const u0 = i / n;
      const u1 = (i + 1) / n;
      const w = sh.w0 + (sh.w1 - sh.w0) * ((u0 + u1) / 2) + extra;
      pen.line(sh.a[0] + (sh.b[0] - sh.a[0]) * u0, sh.a[1] + (sh.b[1] - sh.a[1]) * u0, sh.a[0] + (sh.b[0] - sh.a[0]) * u1, sh.a[1] + (sh.b[1] - sh.a[1]) * u1, w, color, a);
    }
  }
}

/** outline, hot inner line and fill passes for a set of shapes, so the parts merge into one silhouette */
function layer(c: HC, shapes: Shape[], fill: number): void {
  const { pen, a } = c;
  const hl = SPEC.hot * c.H;
  for (const sh of shapes) stroke(pen, sh, c.ow * 2, c.neon, a);
  for (const sh of shapes) stroke(pen, sh, hl * 2, c.hot, a);
  for (const sh of shapes) stroke(pen, sh, 0, fill, a);
}

function glowAlong(c: HC, a: V2, b: V2, n: number, w: number, k: number): void {
  const { pen } = c;
  if (!pen.glow) return;
  pen.add?.(true);
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1);
    pen.glow(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, w + SPEC.glowR * c.H * 1.1, c.neon, SPEC.glowA * k * c.a * 0.42);
  }
  pen.add?.(false);
}

const mixc = (a: number, b: number, k: number) => {
  const m = (sh: number) => Math.round(((a >> sh) & 255) * (1 - k) + ((b >> sh) & 255) * k) << sh;
  return m(16) | m(8) | m(0);
};

export function drawHero(pen: Pen, j: Joints, face: number, s: number, o: DrawOpts): void {
  const style = o.style ?? 'classic';
  const sp = STYLE[style];
  const H = REF_H * s;
  const a = o.alpha ?? 1;
  const neon = o.element;
  const hot = o.elementLight;
  const cast = o.aura >= 1 ? 1 : 0;
  const lw = SPEC.limb * H * sp.limb * (o.weight ?? 1);
  const ow = SPEC.outline * H;
  const r = SPEC.head * H * [1, 1.08, 0.95, 0.9][o.look.head % 4]!;
  const cloth = o.cloth ?? [];
  // head sits directly on the torso (no neck)
  const hx = j.neck[0] + (j.head[0] - j.neck[0]) * 0.7;
  const hy = j.neck[1] + (j.head[1] - j.neck[1]) * 0.7;
  const fill = o.look.body === 0 ? mixc(FILL, neon, SPEC.tint) : BODIES[o.look.body % BODIES.length]!;
  const c: HC = { pen, j, face, s, H, r, hx, hy, t: o.time, o, a, neon, hot, cast, back: -face, ow, lw, gy: Math.max(j.aFoot[1], j.bFoot[1]), cloth };

  const el = o.el;
  // effect behind the hero
  if (el === 'fire') fireAura(c, 'back');
  else if (el === 'lightning') lightningAura(c, 'back');

  if (o.look.back > 3) drawTech(pen, j, face, s, lw, o, fill, neon, hot, a);

  // limbs as one smooth path each
  const lift = lw * 0.45;
  // render arms 22% longer than the sim rig (the sheets' arms reach mid-thigh)
  const arm = (sh: V2, e0: V2, h0: V2): Shape[] => {
    const e: V2 = [sh[0] + (e0[0] - sh[0]) * 1.22, sh[1] + (e0[1] - sh[1]) * 1.22];
    const h: V2 = [sh[0] + (h0[0] - sh[0]) * 1.22, sh[1] + (h0[1] - sh[1]) * 1.22];
    return [
      { k: 'tube', pts: curve(sh, e, h, 8), w: lw, skip: 2 },
      { k: 'dot', x: h[0], y: h[1], r: lw * SPEC.hand * 0.5 },
    ];
  };
  const leg = (p: V2, k: V2, f: V2): Shape[] => {
    const ft: V2 = [f[0], f[1] - lift];
    return [
      { k: 'tube', pts: curve(p, k, ft, 8), w: lw, skip: 0 },
      { k: 'tube', pts: [ft, [ft[0] + face * lw * SPEC.toe, ft[1]]], w: lw, skip: 0 },
    ];
  };
  const torsoW = SPEC.hip * H * sp.torso;
  const chestW = SPEC.chest * H * sp.torso;
  const torso: Shape = { k: 'taper', a: j.pelvis, b: [j.neck[0], j.neck[1] + r * 0.2], w0: torsoW, w1: chestW };

  // glows along the limbs and torso (baked sprites, no additive stroke overlap)
  glowAlong(c, j.pelvis, j.neck, 3, chestW * 0.5, 1);
  glowAlong(c, j.pelvis, j.aFoot, 2, lw * 0.5, 0.8);
  glowAlong(c, j.pelvis, j.bFoot, 2, lw * 0.5, 0.6);
  glowAlong(c, j.shoulder, j.aHand, 2, lw * 0.5, 0.8);

  const sA: V2 = [j.shoulder[0] + face * chestW * 0.3, j.shoulder[1]];
  const sB: V2 = [j.shoulder[0] - face * chestW * 0.3, j.shoulder[1]];
  const hA: V2 = [j.pelvis[0] + face * lw * 0.8, j.pelvis[1]];
  const hB: V2 = [j.pelvis[0] - face * lw * 0.8, j.pelvis[1]];
  layer(c, arm(sB, j.bEl, j.bHand), fill);
  layer(c, [...leg(hB, j.bKn, j.bFoot), ...leg(hA, j.aKn, j.aFoot), torso], fill);
  if (style === 'warden') wardenPlates(c, fill);
  layer(c, arm(sA, j.aEl, j.aHand), fill);
  if (style === 'striker') strikerBlades(c);

  // chest core
  core(c);

  // head
  pen.add?.(true);
  pen.glow?.(hx, hy, r * 2.1, neon, SPEC.glowA * 0.55 * a);
  pen.add?.(false);
  pen.circle(hx, hy, r + ow, el === 'lightning' ? 0x39c8ff : neon, null, 0, a);
  pen.circle(hx, hy, r + SPEC.hot * H, el === 'lightning' ? 0xbff2ff : hot, null, 0, a);
  pen.circle(hx, hy, r, fill, null, 0, a);
  if (o.teamColor !== undefined) pen.circle(hx, hy, r + ow + lw * 0.45, null, o.teamColor, lw * 0.3, a * 0.9);
  if (el === 'fire') fireHead(c);
  else if (el === 'lightning') lightningHead(c);

  // forge cosmetics that still apply
  const light = hot;
  if (o.look.suit) drawSuit(pen, j, s, lw, o, neon, light, a);
  if (o.look.hand) drawHands(pen, j, s, lw, o, neon, light, a, cast);
  if (o.look.hat > 0) drawHat(pen, j, r, face, o.look.hat, fill, neon, lw, light);

  if (el === 'fire') fireAura(c, 'front');
  else if (el === 'lightning') lightningAura(c, 'front');
}

function core(c: HC): void {
  const { pen, j, H, a } = c;
  const cx = j.neck[0] + (j.pelvis[0] - j.neck[0]) * SPEC.coreAt;
  const cy = j.neck[1] + (j.pelvis[1] - j.neck[1]) * SPEC.coreAt;
  const R = (c.cast ? SPEC.coreCast : SPEC.coreIdle) * H * (0.9 + 0.1 * Math.sin(c.t * 8));
  const mp = c.o.mp ?? 0.5;
  pen.add?.(true);
  pen.glow?.(cx, cy, R * 2.1, c.neon, (0.45 + 0.25 * mp) * a);
  // 8 rays, alternating long and short
  const spin = c.t * 0.6;
  for (let i = 0; i < 8; i++) {
    const ang = spin + (i / 8) * Math.PI * 2;
    const len = R * (i % 2 ? 0.8 : 1.15);
    const w = R * 0.16;
    const nx = -Math.sin(ang) * w;
    const ny = Math.cos(ang) * w;
    pen.poly([cx + nx, cy + ny, cx + Math.cos(ang) * len, cy + Math.sin(ang) * len, cx - nx, cy - ny], c.hot, a);
  }
  pen.circle(cx, cy, R * 0.5, c.hot, null, 0, a);
  pen.circle(cx, cy, R * 0.28, 0xffffff, null, 0, a);
  pen.add?.(false);
}

function wardenPlates(c: HC, fill: number): void {
  const { pen, j, H, a } = c;
  const sx = j.shoulder[0];
  const sy = j.shoulder[1] - c.r * 0.1;
  const R = c.r * 0.95;
  for (const d of [-1, 1]) {
    const px = sx + d * c.lw * 1.3;
    const pts: number[] = [];
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + Math.PI / 6;
      pts.push(px + Math.cos(ang) * R * 1.12, sy + Math.sin(ang) * R * 0.95);
    }
    const inner: number[] = [];
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + Math.PI / 6;
      inner.push(px + Math.cos(ang) * (R * 1.12 - c.ow), sy + Math.sin(ang) * (R * 0.95 - c.ow));
    }
    pen.poly(pts, c.neon, a);
    pen.poly(inner, fill, a);
    pen.line(px - R * 0.55, sy - R * 0.1, px + R * 0.55, sy - R * 0.1, c.ow * 0.8, c.hot, a);
  }
  // floating hex shield at the front hand
  const hp = j.aHand;
  const sx2 = hp[0] + c.face * H * 0.1;
  const sy2 = hp[1] - H * 0.04;
  const SR = H * 0.11;
  pen.add?.(true);
  pen.glow?.(sx2, sy2, SR * 2, c.neon, 0.35 * a);
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2 + Math.PI / 6 + c.t * 0.5;
    const a1 = ((i + 1) / 6) * Math.PI * 2 + Math.PI / 6 + c.t * 0.5;
    pen.line(sx2 + Math.cos(a0) * SR, sy2 + Math.sin(a0) * SR, sx2 + Math.cos(a1) * SR, sy2 + Math.sin(a1) * SR, c.ow * 1.3, c.hot, 0.95 * a);
  }
  pen.circle(sx2, sy2, SR * 0.8, c.neon, null, 0, 0.22 * a);
  pen.add?.(false);
}

function strikerBlades(c: HC): void {
  const { pen, j, H, a } = c;
  pen.add?.(true);
  for (const [e, h] of [[j.aEl, j.aHand], [j.bEl, j.bHand]] as [V2, V2][]) {
    const dx = h[0] - e[0];
    const dy = h[1] - e[1];
    const l = Math.hypot(dx, dy) || 1;
    const ux = dx / l;
    const uy = dy / l;
    const nx = -uy;
    const ny = ux;
    const bl = H * 0.35;
    const bw = H * 0.05;
    const tip: V2 = [e[0] + ux * bl, e[1] + uy * bl];
    const base1: V2 = [e[0] + ux * l * 0.15 + nx * bw, e[1] + uy * l * 0.15 + ny * bw];
    const base2: V2 = [e[0] + ux * l * 0.15 - nx * bw * 0.3, e[1] + uy * l * 0.15 - ny * bw * 0.3];
    pen.poly([base1[0], base1[1], tip[0], tip[1], base2[0], base2[1]], c.neon, 0.6 * a);
    pen.poly([base1[0] - nx * bw * 0.3, base1[1] - ny * bw * 0.3, tip[0], tip[1], base2[0] + nx * bw * 0.2, base2[1] + ny * bw * 0.2], c.hot, 0.95 * a);
  }
  pen.add?.(false);
}
