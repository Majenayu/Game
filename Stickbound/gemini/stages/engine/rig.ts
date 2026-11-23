/**
 * Rig for the Lightning avatar. A 2D skeleton (pelvis root, torso, head, two arms, two legs) drives a body that is
 * drawn as ONE continuous silhouette: limbs, torso, hands and feet share a single glowing outline, like the
 * reference art, so no joint ever shows as a separate piece. Only the head is a picture (from the parts sheet).
 * The character faces right in local space; the renderer mirrors it for facing left.
 *
 * Angles are degrees measured from straight down; positive turns toward the facing direction.
 *  - upper arm / thigh: absolute angle.  - forearm / shin: bend relative to the upper bone.
 */
export type Face = 'normal' | 'attack' | 'hurt' | 'ko';
export interface Pose {
  /** Extra root offset (local x forward, y down) for bobs, lunges and drops. */
  x: number;
  y: number;
  /** Whole-body rotation around the hip (KO falls, flips). Negative falls backwards. */
  rot: number;
  lean: number;
  head: number;
  /** front arm: upper, elbow bend; back arm. */
  fu: number;
  fl: number;
  bu: number;
  bl: number;
  /** front leg: thigh, knee bend (negative bends back); back leg. */
  ftu: number;
  ftl: number;
  btu: number;
  btl: number;
  /** Hands: 1 = fist, 0 = open (snaps at 0.5). */
  ffist: number;
  bfist: number;
}
export const NUM_KEYS = ['x', 'y', 'rot', 'lean', 'head', 'fu', 'fl', 'bu', 'bl', 'ftu', 'ftl', 'btu', 'btl', 'ffist', 'bfist'] as const;

/** Fighting stance like the reference art: wide legs, front fist raised forward, back fist across the chest. */
export const BASE: Pose = { x: 0, y: 0, rot: 0, lean: 4, head: 0, fu: 62, fl: 98, bu: -30, bl: 135, ftu: 32, ftl: -24, btu: -30, btl: -4, ffist: 1, bfist: 1 };
export const pose = (p: Partial<Pose>): Pose => ({ ...BASE, ...p });
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const o = { ...a };
  for (const k of NUM_KEYS) o[k] = a[k] + (b[k] - a[k]) * t;
  return o;
}

/** Bone lengths in rig units (the whole avatar is about 370 units tall). */
export const BONES = { torso: 104, upperArm: 60, forearm: 56, thigh: 76, shin: 74, head: 120 };
/** Body thickness in rig units and the outline around it. */
/** Body builds: thickness of limbs, shoulders and hips, fist size and head size (rig units). Slim is the default. */
export const BUILDS = {
  slim: { upper: 21, lower: 19, hip: 28, shoulder: 54, fist: 14, palm: 11, finger: 6, foot: 15, head: 120, out: 3.6 },
  medium: { upper: 27, lower: 25, hip: 34, shoulder: 70, fist: 17, palm: 13, finger: 7, foot: 16, head: 132, out: 3.9 },
  bold: { upper: 36, lower: 34, hip: 40, shoulder: 92, fist: 21, palm: 17, finger: 9, foot: 18, head: 150, out: 4.2 },
};
export type Build = keyof typeof BUILDS;
const W = { ...BUILDS.slim };
let OUT = W.out;
/** Switches the body build for every fighter. */
export function setBuild(b: Build): void {
  Object.assign(W, BUILDS[b]);
  OUT = W.out;
  BONES.head = W.head;
}
/** thin dark edge outside the yellow line, as in the reference art */
const EDGE = 1.6;
const GLOW = 4;

type Img = HTMLImageElement | HTMLCanvasElement;
export interface Parts {
  head: Img;
}
const HEAD_URL = new URL('../../characters/lightning/body/head.png', import.meta.url).href;
export async function loadParts(): Promise<Parts> {
  const head = await new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('missing part head'));
    im.src = HEAD_URL;
  });
  return { head };
}

/**
 * A recoloured copy of the head picture, made once at load (per-frame canvas filters are slow on phones and missing
 * in some browsers). fn maps an RGB pixel to a new RGB pixel; alpha is kept.
 */
export function tintImage(src: Img, fn: (r: number, g: number, b: number) => [number, number, number]): Img {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext('2d')!;
  g.drawImage(src, 0, 0);
  const im = g.getImageData(0, 0, c.width, c.height);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const [r, gg, b] = fn(d[i], d[i + 1], d[i + 2]);
    d[i] = r;
    d[i + 1] = gg;
    d[i + 2] = b;
  }
  g.putImageData(im, 0, 0);
  return c;
}
const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
export const TINT = {
  gray: (r: number, g: number, b: number): [number, number, number] => {
    const l = clamp((0.3 * r + 0.59 * g + 0.11 * b) * 1.05);
    return [l, l, l];
  },
  ghost: (r: number, g: number, b: number): [number, number, number] => {
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    return [clamp(l * 0.5 + 40), clamp(l + 120), 255];
  },
  flash: (r: number, g: number, b: number): [number, number, number] => [clamp(r * 0.4 + 170), clamp(g * 0.4 + 170), clamp(b * 0.4 + 170)],
};
/** Colours of one look: outline, body fill, soft glow, and darker versions for the limbs behind the body. */
export interface Palette {
  line: string;
  fill: string;
  glow: string;
  backLine: string;
  backFill: string;
  /** outline colour while a power is charging (the outline turns electric) */
  charged: string;
  core: boolean;
}
export const PALETTES: Record<'hero' | 'dummy' | 'ghost' | 'flash', Palette> = {
  hero: { line: '#ffe27a', fill: '#121633', glow: 'rgba(255,226,122,0.16)', backLine: '#cdb25a', backFill: '#0c0f26', charged: '#8ff0ff', core: true },
  dummy: { line: '#d4d9e4', fill: '#24272f', glow: 'rgba(220,225,235,0.18)', backLine: '#9ca3b2', backFill: '#1a1c23', charged: '#ffffff', core: false },
  ghost: { line: '#9ff3ff', fill: 'rgba(60,150,255,0.55)', glow: 'rgba(120,230,255,0.35)', backLine: '#7fd8ff', backFill: 'rgba(40,110,220,0.5)', charged: '#ffffff', core: false },
  flash: { line: '#ffffff', fill: '#d8f6ff', glow: 'rgba(255,255,255,0.5)', backLine: '#ffffff', backFill: '#c4ecff', charged: '#ffffff', core: false },
};
/** What one fighter is drawn with: the head picture and the body colours. */
export interface Skin {
  head: Img;
  pal: Palette;
}

const PIVOT_HEAD = { u: 0.5, v: 0.97 };

type P = { x: number; y: number };
const D2R = Math.PI / 180;
/** Unit vector for an angle measured from straight down, positive toward +x. */
const dir = (a: number): P => ({ x: Math.sin(a * D2R), y: Math.cos(a * D2R) });
const add = (p: P, d: P, l: number): P => ({ x: p.x + d.x * l, y: p.y + d.y * l });

/** Joint positions in local space (hip at 0,0, y down, facing +x), before the whole-body rotation. */
export interface Skeleton {
  hip: P;
  neck: P;
  headBase: P;
  fs: P; fe: P; fw: P;
  bs: P; be: P; bw: P;
  fh: P; fk: P; fa: P;
  bh: P; bk: P; ba: P;
  /** absolute angles of the forearms and shins (for hand and foot orientation) */
  fwA: number; bwA: number; fsA: number; bsA: number;
  /** torso axis (hip to neck) and its normal pointing forward */
  up: P;
  nrm: P;
}
export function solve(p: Pose): Skeleton {
  const hip = { x: 0, y: 0 };
  const up0 = dir(180 + p.lean);
  // dir(180 + lean) points up and toward -x for positive lean; mirror x so positive lean tilts forward
  const up = { x: -up0.x, y: up0.y };
  const nrm = { x: -up.y, y: up.x };
  const neck = add(hip, up, BONES.torso);
  // no neck: the head sits right on the shoulders, overlapping the top of the torso a little
  const headBase = add(neck, up, -W.head * 0.06);
  // arms hang from the two corners of the shoulder yoke (a slight three-quarter view, like the reference)
  const shoulder = add(hip, up, BONES.torso * 0.84);
  const fs = add(shoulder, nrm, W.shoulder / 2 - W.upper * 0.55);
  const bs = add(shoulder, nrm, -(W.shoulder / 2 - W.upper * 0.55));
  const fe = add(fs, dir(p.fu), BONES.upperArm);
  const fwA = p.fu + p.fl;
  const fw = add(fe, dir(fwA), BONES.forearm);
  const be = add(bs, dir(p.bu), BONES.upperArm);
  const bwA = p.bu + p.bl;
  const bw = add(be, dir(bwA), BONES.forearm);
  const fh = { x: 6, y: 0 };
  const bh = { x: -6, y: 0 };
  const fk = add(fh, dir(p.ftu), BONES.thigh);
  const fsA = p.ftu + p.ftl;
  const fa = add(fk, dir(fsA), BONES.shin);
  const bk = add(bh, dir(p.btu), BONES.thigh);
  const bsA = p.btu + p.btl;
  const ba = add(bk, dir(bsA), BONES.shin);
  return { hip, neck, headBase, fs, fe, fw, bs, be, bw, fh, fk, fa, bh, bk, ba, fwA, bwA, fsA, bsA, up, nrm };
}
/** Lowest point of the feet below the hip (used to stand on the floor). */
export function footDrop(s: Skeleton): number {
  return Math.max(s.fa.y, s.ba.y) + 11;
}

export interface DrawOpts {
  face: Face;
  alpha?: number;
  /** 0..1 electric charge: the outline turns cyan and crackles run along the limbs. */
  charge?: number;
  bones?: boolean;
  /** frame counter for animated details (crackles) */
  t?: number;
}

// ---------------------------------------------------------------- body shapes
/**
 * Every body piece is drawn three times with the same geometry: once wide and soft (glow), once wider than the body
 * (outline) and once at body width (fill). Pieces in one group share these passes, so where they meet the outlines
 * melt into one silhouette.
 */
type Mode = 'glow' | 'edge' | 'line' | 'fill';
interface Pen {
  ctx: CanvasRenderingContext2D;
  mode: Mode;
  line: string;
  fill: string;
  glow: string;
}
const grow = (pen: Pen) => (pen.mode === 'glow' ? (OUT + EDGE + GLOW) * 2 : pen.mode === 'edge' ? (OUT + EDGE) * 2 : pen.mode === 'line' ? OUT * 2 : 0);
const colour = (pen: Pen) => (pen.mode === 'glow' ? pen.glow : pen.mode === 'edge' ? 'rgba(18,12,0,0.6)' : pen.mode === 'line' ? pen.line : pen.fill);

/** A round-capped bone from A to B (a limb segment). */
function bone(pen: Pen, A: P, B: P, w: number): void {
  const { ctx } = pen;
  ctx.strokeStyle = colour(pen);
  ctx.lineWidth = w + grow(pen);
  ctx.beginPath();
  ctx.moveTo(A.x, A.y);
  ctx.lineTo(B.x, B.y);
  ctx.stroke();
}
/** A closed shape (torso, foot, hand): filled, plus a stroke of the outline width. */
function shape(pen: Pen, pts: P[]): void {
  const { ctx } = pen;
  ctx.beginPath();
  // smooth closed curve through the points (midpoint quadratic smoothing)
  const n = pts.length;
  const mid = (a: P, b: P) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const m0 = mid(pts[n - 1], pts[0]);
  ctx.moveTo(m0.x, m0.y);
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n]);
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y);
  }
  ctx.closePath();
  ctx.fillStyle = colour(pen);
  ctx.fill();
  const g = grow(pen);
  if (g > 0) {
    ctx.strokeStyle = colour(pen);
    ctx.lineWidth = g;
    ctx.stroke();
  }
}
function dot(pen: Pen, c: P, r: number): void {
  const { ctx } = pen;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r + grow(pen) / 2, 0, Math.PI * 2);
  ctx.fillStyle = colour(pen);
  ctx.fill();
}

/** Torso: a broad, rounded shoulder yoke tapering down to a narrow crotch where the legs start (no neck). */
function torsoShape(pen: Pen, s: Skeleton): void {
  const at = (k: number, side: number, half: number) => ({
    x: s.hip.x + s.up.x * BONES.torso * k + s.nrm.x * side * half,
    y: s.hip.y + s.up.y * BONES.torso * k + s.nrm.y * side * half,
  });
  const sh = W.shoulder / 2;
  shape(pen, [
    at(-0.06, -1, W.hip / 2),
    at(-0.06, 1, W.hip / 2),
    at(0.45, 1, W.hip / 2 + 7),
    at(0.8, 1, sh),
    at(1.0, 1, sh - 4),
    at(1.0, -1, sh - 4),
    at(0.8, -1, sh),
    at(0.45, -1, W.hip / 2 + 7),
  ]);
}/** Hand at the wrist: a round fist, or an open palm with fingers along the forearm direction. */
function handShape(pen: Pen, wrist: P, forearmA: number, fist: number): void {
  const d = dir(forearmA);
  const side = { x: -d.y, y: d.x };
  if (fist >= 0.5) {
    dot(pen, add(wrist, d, 8), W.fist);
    return;
  }
  const palm = add(wrist, d, 9);
  dot(pen, palm, W.palm);
  for (let i = 0; i < 4; i++) {
    const a = forearmA + (i - 1.5) * 13;
    const base = add(palm, side, (i - 1.5) * 5);
    bone(pen, base, add(base, dir(a), 18 - Math.abs(i - 1.5) * 2), W.finger);
  }
  const thumbBase = add(palm, side, 9);
  bone(pen, thumbBase, add(thumbBase, dir(forearmA - 55), 12), W.finger);
}
/** Foot: a rounded sneaker shape at the ankle, toe forward, tilting a little with the shin. */
function footShape(pen: Pen, ankle: P, shinA: number): void {
  const a = Math.max(-40, Math.min(55, shinA * 0.5)) * D2R;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const r = (x: number, y: number) => ({ x: ankle.x + x * c - y * sn, y: ankle.y + x * sn + y * c });
  const k = W.foot / 18;
  shape(pen, [r(-8 * k, -8 * k), r(8 * k, -8 * k), r(19 * k, 2 * k), r(19 * k, 10 * k), r(-11 * k, 10 * k)]);
}

/** Draws the avatar with its hip at (0,0) in the current transform (local space, facing +x). */
export function drawRig(ctx: CanvasRenderingContext2D, skin: Skin, p: Pose, o: DrawOpts): void {
  const s = solve(p);
  const pal = skin.pal;
  const charge = o.charge ?? 0;
  const line = charge > 0.25 ? pal.charged : pal.line;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.rotate(p.rot * D2R);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const backLeg = (pen: Pen) => {
    bone(pen, s.bh, s.bk, W.upper);
    bone(pen, s.bk, s.ba, W.lower);
    footShape(pen, s.ba, s.bsA);
  };
  const backArm = (pen: Pen) => {
    bone(pen, s.bs, s.be, W.upper);
    bone(pen, s.be, s.bw, W.lower);
    handShape(pen, s.bw, s.bwA, p.bfist);
  };
  // when the back arm reaches across the chest (guard, fighting stance) it is drawn in front of the body
  const crossing = p.bl > 110 && s.bw.x > s.bs.x + 10;
  const backGroup = (pen: Pen) => {
    backLeg(pen);
    if (!crossing) backArm(pen);
  };
  const bodyGroup = (pen: Pen) => {
    bone(pen, s.fh, s.fk, W.upper);
    bone(pen, s.fk, s.fa, W.lower);
    footShape(pen, s.fa, s.fsA);
    torsoShape(pen, s);
  };
  const armGroup = (pen: Pen) => {
    bone(pen, s.fs, s.fe, W.upper);
    bone(pen, s.fe, s.fw, W.lower);
    handShape(pen, s.fw, s.fwA, p.ffist);
  };
  const run = (group: (pen: Pen) => void, back: boolean, passes: Mode[]) => {
    for (const mode of passes)
      group({ ctx, mode, line: back ? (charge > 0.25 ? pal.charged : pal.backLine) : line, fill: back ? pal.backFill : pal.fill, glow: pal.glow });
  };
  // one soft glow behind the whole figure
  run(backGroup, true, ['glow']);
  run(bodyGroup, false, ['glow']);
  run(armGroup, false, ['glow']);
  // back limbs, then the body (torso merged with the front leg), then the chest core, head and the front arm
  run(backGroup, true, ['edge', 'line', 'fill']);
  run(bodyGroup, false, ['edge', 'line', 'fill']);
  // a front arm raised above the shoulder goes behind the head (victory, Skyfall), otherwise in front of the body
  const armUp = p.fu > 125 && p.fu < 235;
  const frontArm = () => {
    run(armGroup, false, ['edge', 'line', 'fill']);
    // the arm grows out of the body: hide its outline cap where it starts on the torso
    dot({ ctx, mode: 'fill', line, fill: pal.fill, glow: pal.glow }, s.fs, W.upper / 2 - 1);
  };
  if (pal.core) chestCore(ctx, s, o.t ?? 0, charge);
  if (crossing) {
    run(backArm, false, ['glow']);
    run(backArm, false, ['edge', 'line', 'fill']);
  }
  if (armUp) frontArm();
  const ha = p.lean * 0.6 + p.head;
  ctx.save();
  ctx.translate(s.headBase.x, s.headBase.y);
  ctx.rotate(ha * D2R);
  const hs = BONES.head / skin.head.width;
  ctx.scale(hs, hs);
  ctx.translate(-PIVOT_HEAD.u * skin.head.width, -PIVOT_HEAD.v * skin.head.height);
  ctx.drawImage(skin.head, 0, 0);
  faceOverlay(ctx, skin.head.width, skin.head.height, o.face);
  ctx.restore();
  if (!armUp) frontArm();
  if (charge > 0.25) crackles(ctx, s, o.t ?? 0, charge);
  if (o.bones) drawBones(ctx, s);
  ctx.restore();
}

/** The glowing lightning core on the chest (a small star burst with a bolt), pulsing gently. */
function chestCore(ctx: CanvasRenderingContext2D, s: Skeleton, t: number, charge: number): void {
  const c = add(add(s.hip, s.up, BONES.torso * 0.62), s.nrm, 6);
  const pulse = 1 + Math.sin(t / 9) * 0.08 + charge * 0.35;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(pulse, pulse);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 20);
  g.addColorStop(0, 'rgba(255,240,170,0.95)');
  g.addColorStop(0.45, 'rgba(255,200,60,0.55)');
  g.addColorStop(1, 'rgba(120,230,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // star spikes
  ctx.fillStyle = '#8ff0ff';
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 ? 4 : i % 4 ? 9 : 13;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.globalAlpha *= 0.8;
  ctx.fill();
  // bolt
  ctx.globalAlpha /= 0.8;
  ctx.fillStyle = '#fff6c4';
  ctx.beginPath();
  ctx.moveTo(1.5, -7);
  ctx.lineTo(-3.5, 1);
  ctx.lineTo(0, 1);
  ctx.lineTo(-1.5, 7);
  ctx.lineTo(3.5, -1);
  ctx.lineTo(0, -1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Small electric zigzags along the upper arm, the thigh and the shoulders while charging. */
function crackles(ctx: CanvasRenderingContext2D, s: Skeleton, t: number, k: number): void {
  const segs: Array<[P, P]> = [[s.fs, s.fe], [s.fh, s.fk], [s.bs, s.be], [s.fe, s.fw]];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(160,245,255,${0.9 * k})`;
  ctx.lineWidth = 2.2;
  let seed = Math.floor(t / 3) * 7919;
  const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (const [a, b] of segs) {
    if (r() < 0.35) continue;
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const u = i / 5;
      const x = a.x + (b.x - a.x) * u + (r() - 0.5) * 22;
      const y = a.y + (b.y - a.y) * u + (r() - 0.5) * 22;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Expressions painted over the mouth area of the head picture (and a cracked visor on KO). */
function faceOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, face: Face): void {
  if (face === 'normal') return;
  const mx = w * 0.62;
  const my = h * 0.79;
  ctx.save();
  ctx.fillStyle = '#141833';
  ctx.beginPath();
  ctx.ellipse(mx, my, w * 0.16, h * 0.08, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = 'round';
  if (face === 'attack') {
    // shouting mouth with teeth
    ctx.fillStyle = '#0a0b18';
    ctx.beginPath();
    ctx.ellipse(mx, my + 2, w * 0.1, h * 0.06, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4f6ff';
    ctx.fillRect(mx - w * 0.08, my - h * 0.04, w * 0.16, h * 0.025);
    ctx.fillStyle = '#ff6b8a';
    ctx.beginPath();
    ctx.ellipse(mx, my + h * 0.035, w * 0.05, h * 0.018, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (face === 'hurt') {
    ctx.strokeStyle = '#f4f6ff';
    ctx.lineWidth = w * 0.025;
    ctx.beginPath();
    ctx.moveTo(mx - w * 0.09, my);
    for (let i = 1; i <= 6; i++) ctx.lineTo(mx - w * 0.09 + (i * w * 0.18) / 6, my + (i % 2 ? -h * 0.02 : h * 0.02));
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#c9d3ea';
    ctx.lineWidth = w * 0.025;
    ctx.beginPath();
    ctx.moveTo(mx - w * 0.08, my + h * 0.01);
    ctx.lineTo(mx + w * 0.08, my - h * 0.01);
    ctx.stroke();
    // cracked visor
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = w * 0.012;
    ctx.beginPath();
    ctx.moveTo(w * 0.62, h * 0.36);
    ctx.lineTo(w * 0.68, h * 0.44);
    ctx.lineTo(w * 0.64, h * 0.5);
    ctx.moveTo(w * 0.68, h * 0.44);
    ctx.lineTo(w * 0.76, h * 0.42);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBones(ctx: CanvasRenderingContext2D, s: Skeleton): void {
  ctx.save();
  ctx.strokeStyle = '#ff2bd6';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 2;
  const seg = (a: P, b: P) => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };
  seg(s.hip, s.neck);
  seg(s.fs, s.fe); seg(s.fe, s.fw);
  seg(s.bs, s.be); seg(s.be, s.bw);
  seg(s.fh, s.fk); seg(s.fk, s.fa);
  seg(s.bh, s.bk); seg(s.bk, s.ba);
  for (const p of [s.hip, s.neck, s.fs, s.fe, s.fw, s.bs, s.be, s.bw, s.fk, s.fa, s.bk, s.ba]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
/** World position of a joint after the whole-body rotation (for hitboxes and effects). */
export function jointWorld(p: Pose, j: P): P {
  const r = p.rot * D2R;
  return { x: j.x * Math.cos(r) - j.y * Math.sin(r), y: j.x * Math.sin(r) + j.y * Math.cos(r) };
}
