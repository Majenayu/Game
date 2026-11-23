/**
 * Rig for the Hero Trial avatars. Same skeleton, poses and one-piece glowing body as the Lightning avatar
 * (gemini/stages/engine/rig.ts). The heads (four faces) and the signature pieces (capes, shoulder pieces, wrist pieces,
 * scarf wrap, time gear, chest emblems) are pictures cut from the owner's parts sheets by cut.mjs; the body stays
 * code-drawn so its outline is one silhouette. The sparring dummy keeps a code-drawn head (heads.ts).
 * Angles are degrees from straight down; positive turns toward the facing direction (local +x).
 */
import type { Face, HeadSet } from './heads';
import type { ElementId, Kit } from './kits';
export type { Face };
export interface Pose {
  x: number;
  y: number;
  rot: number;
  lean: number;
  head: number;
  fu: number;
  fl: number;
  bu: number;
  bl: number;
  ftu: number;
  ftl: number;
  btu: number;
  btl: number;
  ffist: number;
  bfist: number;
}
export const NUM_KEYS = ['x', 'y', 'rot', 'lean', 'head', 'fu', 'fl', 'bu', 'bl', 'ftu', 'ftl', 'btu', 'btl', 'ffist', 'bfist'] as const;
export const BASE: Pose = { x: 0, y: 0, rot: 0, lean: 4, head: 0, fu: 62, fl: 98, bu: -30, bl: 135, ftu: 32, ftl: -24, btu: -30, btl: -4, ffist: 1, bfist: 1 };
export const pose = (p: Partial<Pose>): Pose => ({ ...BASE, ...p });
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const o = { ...a };
  for (const k of NUM_KEYS) o[k] = a[k] + (b[k] - a[k]) * t;
  return o;
}

export const BONES = { torso: 104, upperArm: 60, forearm: 56, thigh: 76, shin: 74, head: 120 };
export const BUILDS = {
  slim: { upper: 21, lower: 19, hip: 28, shoulder: 54, fist: 14, palm: 11, finger: 6, foot: 15, head: 120, out: 3.6 },
  medium: { upper: 27, lower: 25, hip: 34, shoulder: 70, fist: 17, palm: 13, finger: 7, foot: 16, head: 132, out: 3.9 },
  bold: { upper: 36, lower: 34, hip: 40, shoulder: 92, fist: 21, palm: 17, finger: 9, foot: 18, head: 150, out: 4.2 },
};
export type Build = keyof typeof BUILDS;
const W = { ...BUILDS.slim };
let OUT = W.out;
export function setBuild(b: Build): void {
  Object.assign(W, BUILDS[b]);
  OUT = W.out;
  BONES.head = W.head;
}
const EDGE = 1.6;
const GLOW = 4;

type Img = HTMLImageElement | HTMLCanvasElement;
export function tintImage(src: Img, fn: (r: number, g: number, b: number) => [number, number, number]): HTMLCanvasElement {
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
  flash: (r: number, g: number, b: number): [number, number, number] => [clamp(r * 0.4 + 170), clamp(g * 0.4 + 170), clamp(b * 0.4 + 170)],
  /** time-stopped: cold desaturated blue-grey */
  frozen: (r: number, g: number, b: number): [number, number, number] => {
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    return [clamp(l * 0.7 + 30), clamp(l * 0.8 + 50), clamp(l * 0.9 + 80)];
  },
};
export interface Palette {
  line: string;
  fill: string;
  glow: string;
  backLine: string;
  backFill: string;
  charged: string;
  core: boolean;
}
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shade = (h: string, k: number) => {
  const [r, g, b] = hex(h);
  return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
};
export function heroPalette(k: Kit): Palette {
  const [r, g, b] = hex(k.line);
  return { line: k.line, fill: k.fill, glow: `rgba(${r},${g},${b},0.18)`, backLine: shade(k.line, 0.78), backFill: '#07080f', charged: k.light, core: true };
}
export const PALETTES: Record<'dummy' | 'ghost' | 'flash' | 'frozen', Palette> = {
  dummy: { line: '#d4d9e4', fill: '#24272f', glow: 'rgba(220,225,235,0.18)', backLine: '#9ca3b2', backFill: '#1a1c23', charged: '#ffffff', core: false },
  ghost: { line: '#ffffff', fill: 'rgba(60,150,255,0.5)', glow: 'rgba(120,230,255,0.35)', backLine: '#dddddd', backFill: 'rgba(40,110,220,0.45)', charged: '#ffffff', core: false },
  flash: { line: '#ffffff', fill: '#e8eefc', glow: 'rgba(255,255,255,0.5)', backLine: '#ffffff', backFill: '#d0dcf4', charged: '#ffffff', core: false },
  frozen: { line: '#9fb4cc', fill: '#3a4658', glow: 'rgba(160,190,220,0.25)', backLine: '#7a8ca4', backFill: '#2a3444', charged: '#ffffff', core: false },
};
export function ghostPalette(k: Kit): Palette {
  const [r, g, b] = hex(k.line);
  return { line: k.light, fill: `rgba(${r},${g},${b},0.35)`, glow: `rgba(${r},${g},${b},0.35)`, backLine: k.line, backFill: `rgba(${r},${g},${b},0.25)`, charged: '#ffffff', core: false };
}
/** Head circle inside a head picture (px): centre and outer radius of the glowing ring. */
export interface Circle {
  cx: number;
  cy: number;
  r: number;
}
/** Signature pieces cut from the owner's parts sheets (gemini/characters/<el>/parts/<name>.png). */
export type PieceName = 'back' | 'shoulder' | 'wrist' | 'neck' | 'emblem';
export type Pieces = Partial<Record<PieceName, Img>>;
/** Pictures for one hero: the four faces with their head circles, and the pieces. */
export interface TrialParts {
  heads: Record<Face, Img>;
  circles: Record<Face, Circle>;
  pieces: Pieces;
}
const FACES: Face[] = ['normal', 'attack', 'hurt', 'ko'];
function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error(`missing part ${url}`));
    im.src = url;
  });
}
/** Loads the cut heads and pieces of one hero (made by cut.mjs). */
export async function loadTrialParts(el: ElementId): Promise<TrialParts> {
  const meta = (await (await fetch(new URL('../characters/hero-parts.json', import.meta.url).href)).json()) as Record<string, Record<string, { w: number; h: number } & Partial<Circle>>>;
  const m = meta[el];
  const url = (name: string) => new URL(`../characters/${el}/parts/${name}.png`, import.meta.url).href;
  const heads = {} as Record<Face, Img>;
  const circles = {} as Record<Face, Circle>;
  for (const f of FACES) {
    const e = m[`head_${f}`];
    heads[f] = await loadImg(url(`head_${f}`));
    circles[f] = { cx: e.cx!, cy: e.cy!, r: e.r! };
  }
  const pieces: Pieces = {};
  for (const name of ['back', 'shoulder', 'wrist', 'neck', 'emblem'] as PieceName[]) if (m[name]) pieces[name] = await loadImg(url(name));
  return { heads, circles, pieces };
}
/** What one fighter is drawn with. kit is set for element heroes (signature pieces and chest core). */
export interface Skin {
  heads: HeadSet | Record<Face, Img>;
  /** head circles of picture heads; code-drawn heads (the dummy) leave this out */
  circles?: Record<Face, Circle>;
  pieces?: Pieces;
  pal: Palette;
  kit?: Kit;
}

type P = { x: number; y: number };
const D2R = Math.PI / 180;
const dir = (a: number): P => ({ x: Math.sin(a * D2R), y: Math.cos(a * D2R) });
const add = (p: P, d: P, l: number): P => ({ x: p.x + d.x * l, y: p.y + d.y * l });

export interface Skeleton {
  hip: P;
  neck: P;
  headBase: P;
  fs: P; fe: P; fw: P;
  bs: P; be: P; bw: P;
  fh: P; fk: P; fa: P;
  bh: P; bk: P; ba: P;
  fwA: number; bwA: number; fsA: number; bsA: number;
  up: P;
  nrm: P;
}
export function solve(p: Pose): Skeleton {
  const hip = { x: 0, y: 0 };
  const up0 = dir(180 + p.lean);
  const up = { x: -up0.x, y: up0.y };
  const nrm = { x: -up.y, y: up.x };
  const neck = add(hip, up, BONES.torso);
  const headBase = add(neck, up, -W.head * 0.06);
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
export function footDrop(s: Skeleton): number {
  return Math.max(s.fa.y, s.ba.y) + 11;
}

export interface DrawOpts {
  face: Face;
  alpha?: number;
  charge?: number;
  bones?: boolean;
  t?: number;
  /** forward speed in rig units per frame (capes, scarves and tails stream back) */
  speed?: number;
  /** vertical speed (capes lift when falling) */
  vy?: number;
}

type Mode = 'glow' | 'edge' | 'line' | 'fill';
interface Pen {
  ctx: CanvasRenderingContext2D;
  mode: Mode;
  line: string;
  fill: string;
  glow: string;
}
const grow = (pen: Pen) => (pen.mode === 'glow' ? (OUT + EDGE + GLOW) * 2 : pen.mode === 'edge' ? (OUT + EDGE) * 2 : pen.mode === 'line' ? OUT * 2 : 0);
const colour = (pen: Pen) => (pen.mode === 'glow' ? pen.glow : pen.mode === 'edge' ? 'rgba(0,0,0,0.6)' : pen.mode === 'line' ? pen.line : pen.fill);

function bone(pen: Pen, A: P, B: P, w: number): void {
  const { ctx } = pen;
  ctx.strokeStyle = colour(pen);
  ctx.lineWidth = w + grow(pen);
  ctx.beginPath();
  ctx.moveTo(A.x, A.y);
  ctx.lineTo(B.x, B.y);
  ctx.stroke();
}
function smoothPath(ctx: CanvasRenderingContext2D, pts: P[]): void {
  ctx.beginPath();
  const n = pts.length;
  const mid = (a: P, b: P) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const m0 = mid(pts[n - 1], pts[0]);
  ctx.moveTo(m0.x, m0.y);
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n]);
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y);
  }
  ctx.closePath();
}
function shape(pen: Pen, pts: P[]): void {
  const { ctx } = pen;
  smoothPath(ctx, pts);
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
}
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
function footShape(pen: Pen, ankle: P, shinA: number): void {
  const a = Math.max(-40, Math.min(55, shinA * 0.5)) * D2R;
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const r = (x: number, y: number) => ({ x: ankle.x + x * c - y * sn, y: ankle.y + x * sn + y * c });
  const k = W.foot / 18;
  shape(pen, [r(-8 * k, -8 * k), r(8 * k, -8 * k), r(19 * k, 2 * k), r(19 * k, 10 * k), r(-11 * k, 10 * k)]);
}

// ---------------------------------------------------------------- signature pieces
/** Glowing filled outline for accessory shapes (same look as the body). */
function piece(ctx: CanvasRenderingContext2D, pts: P[], fill: string | CanvasGradient, line: string, w = OUT * 1.6, glow = 10): void {
  smoothPath(ctx, pts);
  ctx.save();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowColor = line;
  ctx.shadowBlur = glow;
  ctx.strokeStyle = line;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.restore();
}
/** A ribbon that streams back from an anchor point, waving over time (tails, scarf, hair, cape edge). */
function ribbon(s: { t: number; speed: number; vy: number }, from: P, len: number, segs: number, baseAngle: number, wave: number, phase = 0): P[] {
  const pts: P[] = [from];
  let a = baseAngle;
  let p = from;
  const stream = Math.min(1, Math.abs(s.speed) / 8);
  for (let i = 1; i <= segs; i++) {
    const u = i / segs;
    // more speed: the ribbon flattens out behind; falling: it lifts
    const target = baseAngle - stream * 55 - Math.max(-30, Math.min(30, s.vy * 2));
    a += (target - a) * 0.35 + Math.sin(s.t / 7 + i * 0.9 + phase) * wave * u;
    p = add(p, dir(a), len / segs);
    pts.push(p);
  }
  return pts;
}
/** Band from a centre line with a width that tapers (closed polygon). */
function band(line: P[], w0: number, w1: number): P[] {
  const left: P[] = [];
  const right: P[] = [];
  for (let i = 0; i < line.length; i++) {
    const a = line[Math.max(0, i - 1)];
    const b = line[Math.min(line.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * (i / (line.length - 1))) / 2;
    left.push({ x: line[i].x - (dy / d) * w, y: line[i].y + (dx / d) * w });
    right.push({ x: line[i].x + (dy / d) * w, y: line[i].y - (dx / d) * w });
  }
  return [...left, ...right.reverse()];
}

/**
 * A picture piece: its anchor (ax, ay as fractions of the picture) goes to `at`, its longest side becomes `size` rig
 * units, turned by `rot` radians, mirrored when flip is set.
 */
function pic(ctx: CanvasRenderingContext2D, im: Img, at: P, size: number, rot = 0, ax = 0.5, ay = 0.5, flip = false): void {
  const k = size / Math.max(im.width, im.height);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(rot);
  ctx.scale(flip ? -k : k, k);
  ctx.drawImage(im, -ax * im.width, -ay * im.height);
  ctx.restore();
}
/** Screen angle (radians) of the bone from a to b. */
const angleOf = (a: P, b: P) => Math.atan2(b.y - a.y, b.x - a.x);

/** Pieces behind the whole body: capes, the wind scarf tails, the time gear, the back half of the gravity ring. */
function drawBack(ctx: CanvasRenderingContext2D, el: ElementId, k: Kit, pc: Pieces, s: Skeleton, o: DrawOpts, headBase: P, ha: number): void {
  const st = { t: o.t ?? 0, speed: o.speed ?? 0, vy: o.vy ?? 0 };
  const headC = add(headBase, dir(180 + ha), BONES.head * 0.42);
  const back = (u: number) => add(s.hip, s.up, BONES.torso * u);
  const stream = Math.min(1, Math.abs(st.speed) / 8);
  const sway = Math.sin(st.t / 22) * 0.05 - Math.max(-0.25, Math.min(0.25, st.vy * 0.03));
  if (el === 'wind') {
    // two scarf tails from the neck wrap, streaming back (colours of the sheet scarf)
    const root = add(back(0.96), s.nrm, -6);
    for (const [ph, len, w] of [[0, 150, 22], [2.2, 118, 17]] as const) {
      const pts = ribbon(st, root, len, 9, -70, 10, ph);
      piece(ctx, band(pts, w, 7), '#8ee8c4', '#3e9c7c', 3.5, 12);
    }
  } else if ((el === 'light' || el === 'gravity') && pc.back) {
    // the sheet cape hangs from the back of the shoulders and lifts toward horizontal with speed
    const top = add(back(0.97), s.nrm, -W.shoulder * 0.18);
    if (el === 'light') pic(ctx, pc.back, top, 205, -(0.95 - stream * 0.75) + sway, 0.1, 0.12, true);
    else pic(ctx, pc.back, top, 185, -(0.55 - stream * 0.45) + sway, 0.87, 0.1);
  } else if (el === 'time' && pc.back) {
    // big copper gear behind the head, turning slowly
    const c = add(add(headC, s.nrm, -BONES.head * 0.28), s.up, BONES.head * 0.16);
    pic(ctx, pc.back, c, BONES.head * 1.05, (st.t / 90) % (Math.PI * 2));
  }
  if (el === 'gravity') orbitRing(ctx, k, s, st.t, -1);
}
/** Gravity: a tilted ring orbiting the shoulders with small debris; side -1 draws the back half. */
function orbitRing(ctx: CanvasRenderingContext2D, k: Kit, s: Skeleton, t: number, side: -1 | 1): void {
  const c = add(s.hip, s.up, BONES.torso * 0.97);
  const rx = 62;
  const ry = 13;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(-0.12);
  ctx.shadowColor = k.line;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = side < 0 ? 'rgba(192,76,255,0.6)' : k.light;
  ctx.lineWidth = side < 0 ? 4.5 : 4;
  ctx.beginPath();
  if (side < 0) ctx.ellipse(0, 0, rx, ry, 0, Math.PI, Math.PI * 2);
  else ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const a = t / 30 + (i * Math.PI * 2) / 3;
    const front = Math.sin(a) > 0;
    if (front !== side > 0) continue;
    ctx.fillStyle = i ? k.light : k.accent;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rx, Math.sin(a) * ry, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
/** Shoulder piece size (rig units) per element. */
const SHOULDER: Partial<Record<ElementId, number>> = { ice: 50, earth: 62, light: 44, time: 42, leaf: 40 };
/** One shoulder piece sitting on a shoulder joint, tilted with the upper arm a little. */
function shoulderPiece(ctx: CanvasRenderingContext2D, el: ElementId, im: Img, sh: P, elbow: P, s: Skeleton): void {
  const size = SHOULDER[el] ?? 44;
  const tilt = Math.max(-0.5, Math.min(0.5, (angleOf(sh, elbow) - Math.PI / 2) * 0.3));
  if (el === 'leaf') {
    // a vine sprig along the upper arm
    pic(ctx, im, { x: (sh.x + elbow.x) / 2, y: (sh.y + elbow.y) / 2 }, size, angleOf(sh, elbow) - 0.9, 0.5, 0.5);
    return;
  }
  pic(ctx, im, add(sh, s.up, el === 'earth' ? 10 : 8), size, tilt, 0.5, el === 'ice' ? 0.75 : 0.6);
}
/** Pieces on the body (after the torso and front leg, before the head and front arm). */
function drawBodyPieces(ctx: CanvasRenderingContext2D, el: ElementId, pc: Pieces, s: Skeleton): void {
  if (pc.shoulder) shoulderPiece(ctx, el, pc.shoulder, s.bs, s.be, s);
  if (el === 'earth') rock(ctx, add(add(s.hip, s.up, BONES.torso * 0.35), s.nrm, -8), 18, 1.4, 7);
}
/** Pieces on the front arm (after it is drawn). */
function drawArmPieces(ctx: CanvasRenderingContext2D, el: ElementId, pc: Pieces, s: Skeleton, p: Pose): void {
  const mid = (a: P, b: P, u: number) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  if (pc.shoulder) shoulderPiece(ctx, el, pc.shoulder, s.fs, s.fe, s);
  if (el === 'earth') {
    rock(ctx, mid(s.fe, s.fw, 0.5), 17, (s.fwA + 90) * D2R, 17);
    if (p.ffist >= 0.5) rock(ctx, add(s.fw, dir(s.fwA), 9), 16, 0.2, 23);
  }
  if (pc.wrist) {
    const a = angleOf(s.fe, s.fw);
    // ice: a crystal gauntlet on the forearm, its tip pointing past the fist; leaf: vines wrapped round the wrist
    if (el === 'ice') pic(ctx, pc.wrist, mid(s.fe, s.fw, 0.62), 62, a + Math.PI, 0.5, 0.5);
    else pic(ctx, pc.wrist, mid(s.fe, s.fw, 0.7), 40, a, 0.5, 0.5);
  }
}
function rock(ctx: CanvasRenderingContext2D, c: P, r: number, a: number, seed: number): void {
  const pts: P[] = [];
  for (let i = 0; i < 6; i++) {
    const ang = a + (i / 6) * Math.PI * 2;
    const rr = r * (0.75 + (((seed * 7 + i * 13) % 10) / 10) * 0.4);
    pts.push({ x: c.x + Math.cos(ang) * rr, y: c.y + Math.sin(ang) * rr * 0.8 });
  }
  const gr = ctx.createLinearGradient(c.x, c.y - r, c.x, c.y + r);
  gr.addColorStop(0, '#7a5230');
  gr.addColorStop(1, '#2e1d10');
  ctx.save();
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.shadowColor = '#e09a48';
  ctx.shadowBlur = 8;
  ctx.strokeStyle = '#e09a48';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,208,138,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pts[0].x * 0.6 + c.x * 0.4, pts[0].y * 0.6 + c.y * 0.4);
  ctx.lineTo(pts[3].x * 0.5 + c.x * 0.5, pts[3].y * 0.5 + c.y * 0.5);
  ctx.stroke();
  ctx.restore();
}

/** Draws the avatar with its hip at (0,0) in the current transform (local space, facing +x). */
export function drawRig(ctx: CanvasRenderingContext2D, skin: Skin, p: Pose, o: DrawOpts): void {
  const s = solve(p);
  const pal = skin.pal;
  const kit = skin.kit;
  const el = kit?.id;
  const charge = o.charge ?? 0;
  const line = charge > 0.25 ? pal.charged : pal.line;
  const t = o.t ?? 0;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.rotate(p.rot * D2R);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const ha = p.lean * 0.6 + p.head;
  const pc = skin.pieces ?? {};
  if (kit && el) drawBack(ctx, el, kit, pc, s, o, s.headBase, ha);
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
  run(backGroup, true, ['glow']);
  run(bodyGroup, false, ['glow']);
  run(armGroup, false, ['glow']);
  run(backGroup, true, ['edge', 'line', 'fill']);
  run(bodyGroup, false, ['edge', 'line', 'fill']);
  if (kit && el) drawBodyPieces(ctx, el, pc, s);
  const armUp = p.fu > 125 && p.fu < 235;
  const frontArm = () => {
    run(armGroup, false, ['edge', 'line', 'fill']);
    dot({ ctx, mode: 'fill', line, fill: pal.fill, glow: pal.glow }, s.fs, W.upper / 2 - 1);
    if (kit && el) drawArmPieces(ctx, el, pc, s, p);
  };
  if (crossing) {
    run(backArm, false, ['glow']);
    run(backArm, false, ['edge', 'line', 'fill']);
  }
  // the chest emblem stays visible over a guarding back arm, as in the reference sheets
  if (pal.core && kit) chestCore(ctx, kit, s, t, charge, pc.emblem);
  if (armUp) frontArm();
  const head = skin.heads[o.face];
  ctx.save();
  ctx.translate(s.headBase.x, s.headBase.y);
  ctx.rotate(ha * D2R);
  // scale so the head circle is as wide as the Lightning head circle (about 0.85 of BONES.head), chin on the neck
  const c = skin.circles?.[o.face];
  if (c) {
    const hs = (BONES.head * 0.425) / c.r;
    ctx.scale(hs, hs);
    ctx.translate(-c.cx, -(c.cy + c.r));
  } else {
    const hs = (BONES.head * 0.85) / (head.width * 0.805);
    ctx.scale(hs, hs);
    ctx.translate(-(100 / 220) * head.width, -(head.height - 6));
  }
  ctx.drawImage(head, 0, 0);
  ctx.restore();
  // wind: the scarf wrap sits round the neck, over the chin edge
  if (el === 'wind' && pc.neck) pic(ctx, pc.neck, add(s.hip, s.up, BONES.torso * 0.97), 72, p.lean * 0.4 * D2R, 0.5, 0.4);
  if (!armUp) frontArm();
  if (kit && el === 'gravity') orbitRing(ctx, kit, s, t, 1);
  if (charge > 0.25 && kit) crackles(ctx, kit, s, t, charge);
  if (o.bones) drawBones(ctx, s);
  ctx.restore();
}

/** Element chest core: a glowing star burst in the element colours, pulsing; the emblem differs per element. */
function chestCore(ctx: CanvasRenderingContext2D, k: Kit, s: Skeleton, t: number, charge: number, emblem?: Img): void {
  const c = add(add(s.hip, s.up, BONES.torso * 0.62), s.nrm, 6);
  const pulse = 1 + Math.sin(t / 9) * 0.08 + charge * 0.35;
  const f = k.fx;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(pulse, pulse);
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, emblem ? 30 : 20);
  g.addColorStop(0, `rgba(${f.core},0.95)`);
  g.addColorStop(0.45, `rgba(${f.mid},0.55)`);
  g.addColorStop(1, `rgba(${f.glow},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, emblem ? 30 : 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  if (emblem) {
    // the sheet emblem, turning slowly for the time gear
    pic(ctx, emblem, { x: 0, y: 0 }, 42, k.id === 'time' ? t / 60 : 0);
    ctx.restore();
    return;
  }
  ctx.fillStyle = `rgba(${f.mid},0.85)`;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + (k.id === 'time' ? t / 60 : 0);
    const r = i % 2 ? 4 : i % 4 ? 9 : 13;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgb(${f.core})`;
  ctx.beginPath();
  ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Element energy along the limbs while charging (flickers, frost, swirls...), in the element colour. */
function crackles(ctx: CanvasRenderingContext2D, k: Kit, s: Skeleton, t: number, amt: number): void {
  const segs: Array<[P, P]> = [[s.fs, s.fe], [s.fh, s.fk], [s.bs, s.be], [s.fe, s.fw]];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(${k.fx.mid},${0.85 * amt})`;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  let seed = Math.floor(t / 3) * 7919;
  const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (const [a, b] of segs) {
    if (r() < 0.35) continue;
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const u = i / 5;
      // smooth wavy energy for most elements (lightning keeps its zigzag in its own lab)
      const off = Math.sin(t / 4 + i * 1.4 + r() * 2) * 10;
      const x = a.x + (b.x - a.x) * u + off;
      const y = a.y + (b.y - a.y) * u - Math.abs(off) * 0.6;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
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
export function jointWorld(p: Pose, j: P): P {
  const r = p.rot * D2R;
  return { x: j.x * Math.cos(r) - j.y * Math.sin(r), y: j.x * Math.sin(r) + j.y * Math.cos(r) };
}
