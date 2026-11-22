// Stick figure rig: 14 joints (head, neck, spine, pelvis, shoulders, elbows, hands, hips, knees, feet) driven by
// keyframed poses, procedural idle/walk/run cycles and spring secondary motion. Drawn with thick rounded lines.

import type { Look } from '../content/looks';
import { BODIES, THICKNESS } from '../content/looks';
import type { Pen } from './pen';

export interface Pose {
  lean: number; // torso, degrees from vertical (+ = forward)
  hipY: number; // pelvis height above feet (px)
  head: number; // head tilt
  aSh: number; // front arm: shoulder angle from straight down (+ = forward)
  aEl: number; // elbow bend
  bSh: number; // back arm
  bEl: number;
  aHip: number; // front leg: hip angle from straight down (+ = forward)
  aKn: number; // knee bend (backward)
  bHip: number;
  bKn: number;
  rot: number; // whole body rotation (spins, knockdowns)
}

const P = (lean: number, hipY: number, head: number, aSh: number, aEl: number, bSh: number, bEl: number, aHip: number, aKn: number, bHip: number, bKn: number, rot = 0): Pose => ({
  lean, hipY, head, aSh, aEl, bSh, bEl, aHip, aKn, bHip, bKn, rot,
});

export const POSES: Record<string, Pose> = {
  idle: P(6, 61, 0, 40, -95, 25, -105, 14, 18, -12, 14),
  guard: P(-4, 57, -6, 75, -125, 68, -130, 18, 30, -16, 26),
  air: P(4, 64, 0, 120, -40, 60, -60, 45, 85, 15, 70),
  fall: P(0, 64, 4, 140, -20, -120, 20, 20, 40, -10, 30),
  hurt: P(-24, 58, -22, -40, -30, -70, -20, 22, 20, -18, 22),
  down: P(-85, 28, -10, -100, 10, -70, 20, 80, 10, 70, 20),
  win0: P(0, 62, -8, 172, -8, 20, -100, 8, 4, -8, 4),
  win1: P(40, 54, 20, 40, -40, 30, -50, 10, 10, -20, 20),
  win2: P(0, 62, -6, 100, -140, -100, 140, 12, 6, -12, 6),
  win3: P(4, 62, -4, 90, 0, 15, -90, 10, 6, -10, 6),
  win4: P(0, 62, 0, 150, -135, 15, -20, 8, 4, -8, 4),
  win5: P(-2, 62, -6, 70, -140, 60, -140, 10, 4, -10, 4),
  win6: P(-6, 63, -14, 165, 0, -30, -120, 14, 6, -14, 6),
  win7: P(4, 53, 0, 30, -60, -30, 60, 34, 12, -34, 12),
  swap: P(15, 66, 0, 150, 0, 120, 0, 40, 90, 10, 60),
  // attack keyframes: wind-up and strike
  jab1_w: P(4, 60, 0, 30, -120, 25, -100, 16, 18, -14, 16),
  jab1: P(14, 60, 0, 96, -4, 20, -110, 20, 16, -18, 16),
  jab2_w: P(-6, 60, 0, 40, -100, 40, -130, 16, 18, -14, 16),
  jab2: P(20, 59, 0, 30, -110, 98, -4, 24, 18, -22, 14),
  knee_w: P(0, 60, 0, 50, -100, 30, -100, 10, 20, -10, 20),
  knee: P(-6, 62, 0, 80, -110, 20, -80, 100, 125, -6, 10),
  kick_w: P(-10, 62, 0, 70, -90, 20, -100, 40, 70, -10, 10),
  kick: P(-28, 63, 8, 120, -30, -40, -40, 98, 6, -14, 8),
  uppercut_w: P(10, 52, 0, 20, -130, 30, -100, 24, 50, -10, 40),
  uppercut: P(4, 72, -16, 168, -20, 10, -60, 40, 30, -16, 20),
  heavy_w: P(-18, 58, 0, -60, -60, -70, -50, 24, 24, -20, 20),
  heavy: P(28, 56, 4, 100, -2, 88, -14, 34, 12, -34, 10),
  airkick_w: P(0, 64, 0, 110, -60, 70, -60, 50, 90, 10, 70),
  airkick: P(-12, 64, 4, 140, -30, -60, -30, 78, 2, -10, 90),
  cast_w: P(-8, 60, 0, -20, -80, -40, -70, 16, 20, -14, 18),
  cast: P(12, 60, 0, 92, -2, 84, -6, 22, 16, -20, 16),
  power_w: P(-6, 56, -10, 160, -30, 150, -40, 20, 30, -20, 26),
  power: P(18, 58, 0, 100, -4, 92, -10, 28, 16, -26, 14),
  rush_w: P(10, 54, 0, -40, -60, -50, -50, 30, 50, -24, 30),
  rush: P(42, 52, 10, 85, -4, -60, -10, 60, 40, -40, 20),
  beam_w: P(-10, 60, 0, 20, -120, 10, -110, 18, 20, -16, 20),
  beam: P(10, 60, 0, 92, 0, 92, 0, 22, 18, -20, 16),
  push_w: P(-14, 60, 0, 60, -140, 55, -140, 18, 20, -16, 20),
  push: P(22, 58, 0, 90, -6, 85, -6, 30, 12, -28, 10),
  spin_w: P(0, 60, 0, 90, -10, -90, 10, 30, 40, -20, 30),
  spin: P(0, 62, 0, 95, 0, -95, 0, 95, 0, -40, 20),
  zombie: P(14, 58, 18, 82, -6, 76, -10, 12, 16, -10, 18),
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function mix(a: Pose, b: Pose, t: number): Pose {
  const o = {} as Pose;
  for (const k of Object.keys(a) as (keyof Pose)[]) o[k] = lerp(a[k], b[k], t);
  return o;
}

export function walkPose(phase: number, run: boolean): Pose {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const amp = run ? 42 : 28;
  return P(run ? 22 : 8, 61 + Math.abs(c) * 2, 0, 20 - s * amp * 0.9, -60, 10 + s * amp * 0.9, -70, s * amp, 18 + Math.max(0, -c) * 40, -s * amp, 18 + Math.max(0, c) * 40);
}

// ---- forward kinematics -------------------------------------------------------------------------------------

const D = Math.PI / 180;
const L = { thigh: 31, shin: 31, torso: 44, neck: 5, head: 16, upper: 25, fore: 24 };

export interface Joints {
  pelvis: [number, number];
  neck: [number, number];
  head: [number, number];
  shoulder: [number, number];
  aEl: [number, number];
  aHand: [number, number];
  bEl: [number, number];
  bHand: [number, number];
  aKn: [number, number];
  aFoot: [number, number];
  bKn: [number, number];
  bFoot: [number, number];
}

/** Joint positions for a pose, feet at (x, y), facing `face` (1 right, -1 left), size `s`. */
export function solve(p: Pose, x: number, y: number, face: number, s: number): Joints {
  const f = face;
  const rot = p.rot * D * f;
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  const pivotY = y - p.hipY * s;
  // local coordinates (x forward, y down) around the pelvis, then rotate and mirror
  const tr = (lx: number, ly: number): [number, number] => {
    const rx = lx * f;
    return [x + rx * cr - ly * sr, pivotY + rx * sr + ly * cr];
  };
  const pel: [number, number] = [0, 0];
  const lean = p.lean * D;
  const neck: [number, number] = [Math.sin(lean) * L.torso * s, -Math.cos(lean) * L.torso * s];
  const ha = (p.lean + p.head) * D;
  const head: [number, number] = [neck[0] + Math.sin(ha) * (L.neck + L.head) * s, neck[1] - Math.cos(ha) * (L.neck + L.head) * s];
  const sh: [number, number] = [neck[0] - Math.sin(lean) * 4 * s, neck[1] + Math.cos(lean) * 4 * s];
  const limb = (o: [number, number], a: number, bend: number, l1: number, l2: number): [[number, number], [number, number]] => {
    const a1 = a * D;
    const j: [number, number] = [o[0] + Math.sin(a1) * l1 * s, o[1] + Math.cos(a1) * l1 * s];
    const a2 = (a + bend) * D;
    return [j, [j[0] + Math.sin(a2) * l2 * s, j[1] + Math.cos(a2) * l2 * s]];
  };
  // arms bend forward (negative bend = elbow points down/back), legs bend backward at the knee
  const [aE, aH] = limb(sh, p.aSh, -p.aEl * -1 * -1, L.upper, L.fore);
  const [bE, bH] = limb(sh, p.bSh, -p.bEl * -1 * -1, L.upper, L.fore);
  const [aK, aF] = limb(pel, p.aHip, -p.aKn, L.thigh, L.shin);
  const [bK, bF] = limb(pel, p.bHip, -p.bKn, L.thigh, L.shin);
  return {
    pelvis: tr(...pel),
    neck: tr(...neck),
    head: tr(...head),
    shoulder: tr(...sh),
    aEl: tr(...aE),
    aHand: tr(...aH),
    bEl: tr(...bE),
    bHand: tr(...bH),
    aKn: tr(...aK),
    aFoot: tr(...aF),
    bKn: tr(...bK),
    bFoot: tr(...bF),
  };
}

// ---- faces ------------------------------------------------------------------------------------------------------

export type Expression = 'neutral' | 'angry' | 'scared' | 'happy' | 'determined' | 'hurt' | 'dizzy' | 'smug' | 'shocked';

export interface DrawOpts {
  look: Look;
  element: number;
  elementLight: number;
  expression: Expression;
  /** 0..1 aura strength */
  aura: number;
  alpha?: number;
  /** spring state for scarf/cape (updated in place) */
  cloth?: { x: number; y: number }[];
  /** recoloured outline for team identity (optional) */
  teamColor?: number;
  zombie?: boolean;
  time: number;
  /** line weight multiplier (pulses during casts) */
  weight?: number;
  /** 0..1 MP fill: the joint light strips pulse brighter with more MP */
  mp?: number;
  /** boss rig: shoulder plates and a heavier core */
  boss?: boolean;
}

function drawFace(pen: Pen, hx: number, hy: number, r: number, face: number, o: DrawOpts, ink: number): void {
  const e = o.expression;
  const ex = hx + face * r * 0.28;
  const sp = r * 0.32;
  const ey = hy - r * 0.08;
  const w = Math.max(1.6, r * 0.13);
  const eyeL = ex - sp * 0.6;
  const eyeR = ex + sp * 0.6;
  const style = o.look.eyes;
  const dot = (x: number, y: number, rr: number) => pen.circle(x, y, rr, ink, null);
  if (e === 'dizzy') {
    for (const xx of [eyeL, eyeR]) {
      pen.line(xx - r * 0.1, ey - r * 0.1, xx + r * 0.1, ey + r * 0.1, w, ink);
      pen.line(xx - r * 0.1, ey + r * 0.1, xx + r * 0.1, ey - r * 0.1, w, ink);
    }
  } else if (e === 'hurt') {
    pen.line(eyeL - r * 0.11, ey - r * 0.1, eyeL + r * 0.08, ey, w, ink);
    pen.line(eyeL - r * 0.11, ey + r * 0.1, eyeL + r * 0.08, ey, w, ink);
    pen.line(eyeR + r * 0.11, ey - r * 0.1, eyeR - r * 0.08, ey, w, ink);
    pen.line(eyeR + r * 0.11, ey + r * 0.1, eyeR - r * 0.08, ey, w, ink);
  } else if (e === 'happy') {
    for (const xx of [eyeL, eyeR]) {
      pen.line(xx - r * 0.1, ey + r * 0.04, xx, ey - r * 0.08, w, ink);
      pen.line(xx, ey - r * 0.08, xx + r * 0.1, ey + r * 0.04, w, ink);
    }
  } else if (e === 'shocked' || e === 'scared') {
    for (const xx of [eyeL, eyeR]) pen.circle(xx, ey, r * 0.15, 0xffffff, ink, w * 0.8);
    dot(eyeL, ey, r * 0.06);
    dot(eyeR, ey, r * 0.06);
  } else {
    // style-dependent eyes for neutral / angry / determined / smug
    const rr = [0.09, 0.12, 0.08, 0.1, 0.14, 0.1, 0.09, 0.11][style]! * r;
    for (const xx of [eyeL, eyeR]) {
      if (style === 2 || style === 3 || e === 'smug') pen.line(xx - r * 0.09, ey, xx + r * 0.09, ey, w * 1.1, ink);
      else if (style === 7) {
        pen.line(xx - rr, ey, xx + rr, ey, w * 0.8, ink);
        pen.line(xx, ey - rr, xx, ey + rr, w * 0.8, ink);
      } else dot(xx, ey, rr);
      if (style === 1 || style === 4) pen.circle(xx + rr * 0.35, ey - rr * 0.35, rr * 0.35, 0xffffff, null);
    }
    if (e === 'angry' || e === 'determined' || style === 5) {
      const tilt = e === 'determined' ? 0.08 : 0.14;
      pen.line(eyeL - r * 0.14, ey - r * (0.2 + tilt), eyeL + r * 0.12, ey - r * 0.18, w, ink);
      pen.line(eyeR + r * 0.14, ey - r * (0.2 + tilt), eyeR - r * 0.12, ey - r * 0.18, w, ink);
    }
  }
  // mouth
  const my = hy + r * 0.36;
  const mx = ex;
  const m = e === 'happy' ? 2 : e === 'hurt' || e === 'angry' ? 5 : e === 'shocked' || e === 'scared' || e === 'dizzy' ? 3 : e === 'smug' ? 4 : o.look.mouth;
  const mw = r * 0.26;
  switch (m) {
    case 1:
      pen.line(mx - mw, my - r * 0.06, mx, my + r * 0.05, w, ink);
      pen.line(mx, my + r * 0.05, mx + mw, my - r * 0.06, w, ink);
      break;
    case 2:
      pen.poly([mx - mw, my - r * 0.07, mx + mw, my - r * 0.07, mx, my + r * 0.16], ink);
      break;
    case 3:
      pen.circle(mx, my, r * 0.11, ink, null);
      break;
    case 4:
      pen.line(mx - mw, my, mx + mw * 0.6, my - r * 0.06, w, ink);
      break;
    case 5:
      pen.line(mx - mw, my, mx + mw, my, w * 1.8, ink);
      pen.line(mx - mw * 0.9, my, mx + mw * 0.9, my, w * 0.6, 0xffffff);
      break;
    default:
      pen.line(mx - mw * 0.8, my, mx + mw * 0.8, my, w, ink);
  }
}

function drawHat(pen: Pen, j: Joints, r: number, face: number, hat: number, ink: number, el: number, w: number, light: number): void {
  const [hx, hy] = j.head;
  switch (hat) {
    case 1: // headband
      pen.line(hx - r * 0.95, hy - r * 0.45, hx + r * 0.95, hy - r * 0.45, w * 0.9, el);
      pen.line(hx - face * r * 0.9, hy - r * 0.45, hx - face * r * 1.8, hy - r * 0.15, w * 0.6, el);
      break;
    case 2: // spiky hair
      for (let i = -2; i <= 2; i++) pen.poly([hx + i * r * 0.36 - r * 0.2, hy - r * 0.8, hx + i * r * 0.36 + r * 0.2, hy - r * 0.8, hx + i * r * 0.42 - face * r * 0.2, hy - r * 1.55], ink);
      break;
    case 3: // cap
      pen.poly([hx - r, hy - r * 0.3, hx + r, hy - r * 0.3, hx + r * 0.7, hy - r * 1.05, hx - r * 0.7, hy - r * 1.05], el);
      pen.line(hx, hy - r * 0.35, hx + face * r * 1.6, hy - r * 0.3, w, el);
      break;
    case 4: // beanie
      pen.poly([hx - r * 1.02, hy - r * 0.25, hx + r * 1.02, hy - r * 0.25, hx + r * 0.6, hy - r * 1.15, hx - r * 0.6, hy - r * 1.15], el);
      pen.circle(hx, hy - r * 1.25, r * 0.28, el, null);
      break;
    case 5: // horns
      pen.poly([hx - r * 0.6, hy - r * 0.7, hx - r * 0.25, hy - r * 0.85, hx - r * 0.75, hy - r * 1.6], ink);
      pen.poly([hx + r * 0.6, hy - r * 0.7, hx + r * 0.25, hy - r * 0.85, hx + r * 0.75, hy - r * 1.6], ink);
      break;
    case 6: // top bun
      pen.circle(hx - face * r * 0.2, hy - r * 1.15, r * 0.42, ink, null);
      break;
    case 7: // antenna
      pen.line(hx, hy - r, hx + face * r * 0.4, hy - r * 1.8, w * 0.5, ink);
      pen.circle(hx + face * r * 0.4, hy - r * 1.85, r * 0.22, el, null);
      break;
    case 8: {
      // visor: a tinted band over the eyes (eyes stay visible through it) with a bright scan line
      const vy = hy - r * 0.1;
      pen.poly([hx - r * 0.95, vy - r * 0.26, hx + r * 0.95, vy - r * 0.26, hx + r * 0.9, vy + r * 0.2, hx - r * 0.9, vy + r * 0.2], el, 0.38);
      pen.add?.(true);
      pen.line(hx - r * 0.9, vy - r * 0.02, hx + r * 0.9, vy - r * 0.02, w * 0.35, light, 0.9);
      pen.add?.(false);
      pen.line(hx - r * 0.98, vy - r * 0.27, hx + r * 0.98, vy - r * 0.27, w * 0.4, ink);
      break;
    }
    case 9: {
      // holo halo: a glowing ring floating above the head
      pen.add?.(true);
      for (let i = 0; i < 16; i++) {
        const a0 = (i / 16) * Math.PI * 2;
        const a1 = ((i + 1) / 16) * Math.PI * 2;
        pen.line(hx + Math.cos(a0) * r * 0.85, hy - r * 1.45 + Math.sin(a0) * r * 0.22, hx + Math.cos(a1) * r * 0.85, hy - r * 1.45 + Math.sin(a1) * r * 0.22, w * 0.45, light, 0.85);
      }
      pen.glow?.(hx, hy - r * 1.45, r * 1.3, el, 0.35);
      pen.add?.(false);
      break;
    }
    case 10: {
      // cyber helm: a shell over the top of the head, a light seam and an ear pod
      pen.poly([hx - r * 1.05, hy - r * 0.1, hx - r * 0.85, hy - r * 0.8, hx - r * 0.3, hy - r * 1.12, hx + r * 0.4, hy - r * 1.1, hx + r * 0.95, hy - r * 0.7, hx + r * 1.05, hy - r * 0.1, hx + face * r * 0.2, hy - r * 0.42], ink);
      pen.add?.(true);
      pen.line(hx - r * 0.8, hy - r * 0.62, hx + r * 0.8, hy - r * 0.62, w * 0.35, light, 0.9);
      pen.add?.(false);
      pen.circle(hx - face * r * 0.75, hy - r * 0.05, r * 0.28, el, ink, w * 0.3);
      break;
    }
    case 11:
      // ear fins: two swept fins in the element colour
      for (const sgn of [-1, 1]) pen.poly([hx + sgn * r * 0.85, hy - r * 0.35, hx + sgn * r * 0.95, hy + r * 0.15, hx + sgn * r * 1.75 - face * r * 0.5, hy - r * 0.85], el);
      pen.add?.(true);
      pen.line(hx - r * 0.9, hy - r * 0.2, hx - r * 1.5 - face * r * 0.4, hy - r * 0.7, w * 0.3, light, 0.8);
      pen.line(hx + r * 0.9, hy - r * 0.2, hx + r * 1.5 - face * r * 0.4, hy - r * 0.7, w * 0.3, light, 0.8);
      pen.add?.(false);
      break;
    case 12:
      // crest: a raised fin along the top of the head
      pen.poly([hx + face * r * 0.6, hy - r * 0.8, hx - face * r * 0.6, hy - r * 0.8, hx - face * r * 1.3, hy - r * 1.7, hx + face * r * 0.2, hy - r * 1.25], el);
      pen.add?.(true);
      pen.line(hx + face * r * 0.2, hy - r * 1.0, hx - face * r * 1.1, hy - r * 1.55, w * 0.3, light, 0.9);
      pen.add?.(false);
      break;
  }
}


type V2 = [number, number];
/** part of a segment from t0 to t1 */
function seg(pen: Pen, p1: V2, p2: V2, t0: number, t1: number, w: number, c: number, a: number): void {
  pen.line(p1[0] + (p2[0] - p1[0]) * t0, p1[1] + (p2[1] - p1[1]) * t0, p1[0] + (p2[0] - p1[0]) * t1, p1[1] + (p2[1] - p1[1]) * t1, w, c, a);
}
/** short band across a segment at t */
function band(pen: Pen, p1: V2, p2: V2, t: number, half: number, w: number, c: number, a: number): void {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const l = Math.hypot(dx, dy) || 1;
  const nx = (-dy / l) * half;
  const ny = (dx / l) * half;
  const x = p1[0] + dx * t;
  const y = p1[1] + dy * t;
  pen.line(x - nx, y - ny, x + nx, y + ny, w, c, a);
}
function hex(pen: Pen, x: number, y: number, r: number, w: number, c: number, a: number): void {
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const a1 = ((i + 1) / 6) * Math.PI * 2 + Math.PI / 6;
    pen.line(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, w, c, a);
  }
}

/** Back pieces 4 to 8 (the futuristic ones); 1 to 3 are cloth and drawn with springs. */
function drawTech(pen: Pen, j: Joints, face: number, s: number, w: number, o: DrawOpts, ink: number, el: number, light: number, a: number): void {
  const back = o.look.back;
  const t = o.time;
  const sx = j.shoulder[0] - face * w * 0.9;
  const sy = j.shoulder[1];
  const mx = (j.shoulder[0] + j.pelvis[0]) / 2 - face * w * 1.1;
  const my = (j.shoulder[1] + j.pelvis[1]) / 2;
  if (back === 4) {
    // jet pack: a housing on the back and two flickering thrusters
    pen.poly([mx - 7 * s, my - 16 * s, mx + 7 * s, my - 16 * s, mx + 7 * s, my + 12 * s, mx - 7 * s, my + 12 * s], ink, a);
    pen.line(mx - 7 * s, my - 4 * s, mx + 7 * s, my - 4 * s, w * 0.35, el, a);
    pen.add?.(true);
    const fl = 0.7 + 0.3 * Math.sin(t * 40);
    for (const dx of [-4, 4]) {
      pen.line(mx + dx * s, my + 13 * s, mx + dx * s, my + (22 + 8 * fl) * s, w * 0.7, light, 0.8 * a);
      pen.glow?.(mx + dx * s, my + 18 * s, 10 * s, el, 0.6 * a * fl);
    }
    pen.add?.(false);
  } else if (back === 5) {
    // energy wings: two light blades fanning from the shoulders
    const flap = Math.sin(t * 3) * 0.12;
    pen.add?.(true);
    for (let k = 0; k < 3; k++) {
      const ang = (-0.9 + k * 0.45 + flap) * 1;
      const len = (34 - k * 6) * s;
      const ex = sx - face * Math.cos(ang) * len;
      const ey = sy + Math.sin(ang) * len - 6 * s;
      pen.poly([sx, sy - 2 * s, ex, ey, sx - face * 6 * s, sy + 6 * s], el, 0.32 * a);
      pen.line(sx, sy, ex, ey, w * 0.3, light, 0.85 * a);
    }
    pen.add?.(false);
  } else if (back === 6 && o.cloth) {
    // holo cape: spring cloth in light, with scan lines
    const pts = o.cloth;
    while (pts.length < 5) pts.push({ x: j.shoulder[0], y: j.shoulder[1] });
    let px = j.shoulder[0];
    let py = j.shoulder[1];
    pen.add?.(true);
    for (let i = 0; i < 5; i++) {
      const p = pts[i]!;
      p.x += (px - face * 9 * s - p.x) * 0.35;
      p.y += (py + 9 * s - p.y) * 0.35 + Math.sin(t * 6 + i) * 0.6;
      const cw = w * 2.6 * (1 - i / 7);
      pen.line(px, py, p.x, p.y, cw, el, 0.3 * a);
      if ((i + Math.floor(t * 8)) % 2 === 0) pen.line(px, py, p.x, p.y, cw * 0.3, light, 0.6 * a);
      px = p.x;
      py = p.y;
    }
    pen.add?.(false);
  } else if (back === 7 && o.cloth) {
    // data tail: a spring chain of glowing blocks from the pelvis
    const pts = o.cloth;
    while (pts.length < 6) pts.push({ x: j.pelvis[0], y: j.pelvis[1] });
    let px = j.pelvis[0];
    let py = j.pelvis[1];
    for (let i = 0; i < 6; i++) {
      const p = pts[i]!;
      p.x += (px - face * 8 * s - p.x) * 0.3;
      p.y += (py + 2 * s - p.y) * 0.3 + Math.sin(t * 5 + i * 0.8) * 0.8;
      const q = (4 - i * 0.45) * s;
      pen.poly([p.x - q, p.y - q, p.x + q, p.y - q, p.x + q, p.y + q, p.x - q, p.y + q], i % 2 ? el : light, 0.85 * a);
      px = p.x;
      py = p.y;
    }
  } else if (back === 8) {
    // shoulder pylons: two light rods standing off the shoulders
    pen.add?.(true);
    for (const k of [0, 1]) {
      const bx = sx - face * k * 6 * s;
      pen.line(bx, sy, bx - face * 4 * s, sy - 22 * s, w * 0.6, el, a);
      pen.glow?.(bx - face * 4 * s, sy - 23 * s, 8 * s, light, 0.8 * a * (0.7 + 0.3 * Math.sin(t * 5 + k)));
    }
    pen.add?.(false);
  }
}

/** Suit patterns: light strips on the dark body. */
function drawSuit(pen: Pen, j: Joints, s: number, w: number, o: DrawOpts, el: number, light: number, a: number): void {
  const suit = o.look.suit ?? 0;
  if (!suit) return;
  const sw = Math.max(1.2, w * 0.32);
  pen.add?.(true);
  switch (suit) {
    case 1: // circuit
      seg(pen, j.pelvis, j.neck, 0.15, 0.85, sw, light, 0.8 * a);
      seg(pen, j.pelvis, j.aKn, 0.2, 0.8, sw, light, 0.6 * a);
      band(pen, j.pelvis, j.neck, 0.55, w * 0.9, sw, light, 0.8 * a);
      break;
    case 2: {
      // chevron on the chest
      const cx = (j.pelvis[0] + j.neck[0] * 3) / 4;
      const cy = (j.pelvis[1] + j.neck[1] * 3) / 4;
      pen.line(cx - 6 * s, cy - 5 * s, cx, cy + 2 * s, sw * 1.2, light, 0.9 * a);
      pen.line(cx, cy + 2 * s, cx + 6 * s, cy - 5 * s, sw * 1.2, light, 0.9 * a);
      break;
    }
    case 3: // split tone: the back limbs glow faintly
      seg(pen, j.pelvis, j.bKn, 0, 1, w * 0.6, el, 0.35 * a);
      seg(pen, j.bKn, j.bFoot, 0, 1, w * 0.6, el, 0.35 * a);
      seg(pen, j.shoulder, j.bEl, 0, 1, w * 0.6, el, 0.35 * a);
      seg(pen, j.bEl, j.bHand, 0, 1, w * 0.6, el, 0.35 * a);
      break;
    case 4: // spine strip
      seg(pen, j.pelvis, j.neck, 0.02, 0.98, sw * 1.3, light, 0.95 * a);
      break;
    case 5: {
      // hex plates on the chest and knees
      const cx = (j.pelvis[0] + j.neck[0] * 2) / 3;
      const cy = (j.pelvis[1] + j.neck[1] * 2) / 3;
      hex(pen, cx, cy - 6 * s, 6 * s, sw, light, 0.85 * a);
      hex(pen, j.aKn[0], j.aKn[1], 4 * s, sw, light, 0.7 * a);
      break;
    }
    case 6: // pin stripes along the upper limbs
      for (const [p1, p2] of [[j.shoulder, j.aEl], [j.pelvis, j.aKn], [j.shoulder, j.bEl], [j.pelvis, j.bKn]] as [V2, V2][]) seg(pen, p1, p2, 0.15, 0.85, sw * 0.8, light, 0.6 * a);
      break;
    case 7: {
      // pulse bands on forearms and shins
      const k = 0.5 + 0.5 * Math.sin(o.time * 5);
      for (const [p1, p2] of [[j.aEl, j.aHand], [j.bEl, j.bHand], [j.aKn, j.aFoot], [j.bKn, j.bFoot]] as [V2, V2][]) band(pen, p1, p2, 0.5, w * 0.75, sw * 1.2, light, (0.4 + 0.5 * k) * a);
      break;
    }
    case 8: // arc lines: two thin lines curving around the torso
      seg(pen, j.shoulder, j.pelvis, 0.1, 0.5, sw, el, 0.8 * a);
      seg(pen, j.aKn, j.aFoot, 0.1, 0.6, sw, el, 0.6 * a);
      seg(pen, j.aEl, j.aHand, 0.1, 0.7, sw, el, 0.6 * a);
      break;
  }
  pen.add?.(false);
}

/** Hand effects. */
function drawHands(pen: Pen, j: Joints, s: number, w: number, o: DrawOpts, el: number, light: number, a: number, cast: number): void {
  const hand = o.look.hand ?? 0;
  if (!hand) return;
  const t = o.time;
  pen.add?.(true);
  for (const [hp, ep, k] of [[j.aHand, j.aEl, 1], [j.bHand, j.bEl, 0.7]] as [V2, V2, number][]) {
    switch (hand) {
      case 1:
        pen.glow?.(hp[0], hp[1], (10 + 10 * cast) * s, el, (0.6 + 0.3 * cast) * a * k);
        pen.circle(hp[0], hp[1], w * 0.55, light, null, 0, 0.8 * a);
        break;
      case 2: {
        // energy claws pointing along the forearm
        const dx = hp[0] - ep[0];
        const dy = hp[1] - ep[1];
        const l = Math.hypot(dx, dy) || 1;
        for (let c = -1; c <= 1; c++) {
          const ang = Math.atan2(dy, dx) + c * 0.28;
          pen.line(hp[0], hp[1], hp[0] + Math.cos(ang) * (9 + 4 * cast) * s, hp[1] + Math.sin(ang) * (9 + 4 * cast) * s, w * 0.3, light, 0.9 * a * k);
        }
        void l;
        break;
      }
      case 3:
        band(pen, ep, hp, 0.78, w * 0.85, w * 0.35, light, 0.85 * a * k);
        band(pen, ep, hp, 0.62, w * 0.75, w * 0.25, el, 0.7 * a * k);
        break;
      case 4:
        for (let i = 0; i < 3; i++) {
          const ang = t * 7 + i * 2.1 + k * 3;
          pen.circle(hp[0] + Math.cos(ang) * 8 * s, hp[1] + Math.sin(ang * 1.3) * 8 * s, 1.4 * s, light, null, 0, 0.9 * a * k);
        }
        break;
      case 5: {
        const ang = t * 4 + k * 3;
        const ox = hp[0] + Math.cos(ang) * 11 * s;
        const oy = hp[1] + Math.sin(ang) * 6 * s;
        pen.glow?.(ox, oy, 8 * s, el, 0.8 * a * k);
        pen.circle(ox, oy, 2.4 * s, light, null, 0, a * k);
        break;
      }
      case 6: {
        // shock gauntlets: jagged arcs across the fist
        const f = Math.floor(t * 18 + k * 5);
        const jx = ((f * 37) % 7) - 3;
        pen.line(hp[0] - 6 * s, hp[1] + jx * s, hp[0], hp[1] - jx * s, w * 0.25, light, 0.9 * a * k);
        pen.line(hp[0], hp[1] - jx * s, hp[0] + 6 * s, hp[1] + jx * 0.5 * s, w * 0.25, light, 0.9 * a * k);
        pen.circle(hp[0], hp[1], w * 1.05, null, el, w * 0.3, 0.8 * a * k);
        break;
      }
    }
  }
  pen.add?.(false);
}

/** Draws a stick figure: dark core lines, light-strip joints that pulse with MP, a chest energy core that flares when
 *  casting, suit patterns, hand effects, headgear and back pieces. */
export function drawStick(pen: Pen, j: Joints, face: number, s: number, o: DrawOpts): void {
  const ink = o.zombie ? 0x2c3a2a : BODIES[o.look.body % BODIES.length]!;
  const w = THICKNESS[o.look.thick % THICKNESS.length]! * s * (o.weight ?? 1);
  const a = o.alpha ?? 1;
  const r = 16 * s * [1, 1.12, 0.95, 0.85][o.look.head % 4]!;
  const auraC = o.element;
  const light = o.zombie ? 0x9cff6a : o.elementLight;
  const cast = o.aura >= 1 ? 1 : 0;
  const mp = o.mp ?? 0.5;
  // aura glow
  if (o.aura > 0) {
    if (pen.glow) {
      pen.add?.(true);
      pen.glow(j.pelvis[0], j.pelvis[1] - 18 * s, 70 * s, auraC, 0.22 * o.aura * a);
      pen.add?.(false);
    } else {
      pen.circle(j.pelvis[0], j.pelvis[1] - 18 * s, 62 * s, auraC, null, 0, 0.1 * o.aura * a);
      pen.circle(j.pelvis[0], j.pelvis[1] - 18 * s, 46 * s, auraC, null, 0, 0.12 * o.aura * a);
    }
  }
  // back cloth (scarf/cape) with spring trail
  if (o.look.back > 0 && o.look.back <= 3 && o.cloth) {
    const pts = o.cloth;
    const len = o.look.back === 3 ? 6 : 4;
    const anchor = o.look.back === 2 ? j.shoulder : j.neck;
    while (pts.length < len) pts.push({ x: anchor[0], y: anchor[1] });
    let px = anchor[0];
    let py = anchor[1];
    for (let i = 0; i < len; i++) {
      const p = pts[i]!;
      const target = { x: px - face * 9 * s, y: py + (o.look.back === 2 ? 9 : 3) * s };
      p.x += (target.x - p.x) * 0.35;
      p.y += (target.y - p.y) * 0.35 + Math.sin(o.time * 6 + i) * 0.6;
      const cw = (o.look.back === 2 ? w * 2.4 : w * 1.1) * (1 - i / (len * 1.4));
      pen.line(px, py, p.x, p.y, cw, auraC, a);
      px = p.x;
      py = p.y;
    }
  } else if (o.look.back > 3) drawTech(pen, j, face, s, w, o, ink, auraC, light, a);
  const limb = (p1: V2, p2: V2, ww = w) => pen.line(p1[0], p1[1], p2[0], p2[1], ww, ink, a);
  limb(j.pelvis, j.bKn);
  limb(j.bKn, j.bFoot);
  limb(j.shoulder, j.bEl);
  limb(j.bEl, j.bHand);
  limb(j.pelvis, j.neck, w * 1.12);
  limb(j.pelvis, j.aKn);
  limb(j.aKn, j.aFoot);
  limb(j.shoulder, j.aEl);
  limb(j.aEl, j.aHand);
  // boss rig: armoured shoulder plates
  if (o.boss) {
    pen.poly([j.shoulder[0] - 12 * s, j.shoulder[1] - 4 * s, j.shoulder[0] + 12 * s, j.shoulder[1] - 4 * s, j.shoulder[0] + 9 * s, j.shoulder[1] + 8 * s, j.shoulder[0] - 9 * s, j.shoulder[1] + 8 * s], ink, a);
    pen.line(j.shoulder[0] - 11 * s, j.shoulder[1] - 4 * s, j.shoulder[0] + 11 * s, j.shoulder[1] - 4 * s, w * 0.3, light, a);
  }
  // fists and feet
  pen.circle(j.aHand[0], j.aHand[1], w * 0.85, ink, null, 0, a);
  pen.circle(j.bHand[0], j.bHand[1], w * 0.8, ink, null, 0, a);
  if (o.look.extra === 1) {
    pen.circle(j.aHand[0], j.aHand[1], w * 0.95, null, auraC, w * 0.5, a);
    pen.circle(j.bHand[0], j.bHand[1], w * 0.9, null, auraC, w * 0.5, a);
  }
  if (o.look.extra === 2) pen.circle(j.pelvis[0], j.pelvis[1], w * 0.9, auraC, null, 0, a);
  drawSuit(pen, j, s, w, o, auraC, light, a);
  // light-strip joints: elbows and knees glow, brighter with more MP
  const pulse = (0.3 + 0.55 * mp) * (0.75 + 0.25 * Math.sin(o.time * 4 + j.pelvis[0] * 0.01));
  pen.add?.(true);
  for (const p of [j.aEl, j.bEl, j.aKn, j.bKn]) pen.circle(p[0], p[1], Math.max(1.3, w * 0.3), light, null, 0, pulse * a);
  pen.add?.(false);
  // chest energy core: a diamond that flares when casting
  const cx = (j.pelvis[0] + j.neck[0] * 2) / 3;
  const cy = (j.pelvis[1] + j.neck[1] * 2) / 3;
  const cr = w * (o.boss ? 0.95 : 0.75) * (1 + cast * 0.35);
  pen.poly([cx, cy - cr, cx + cr * 0.75, cy, cx, cy + cr, cx - cr * 0.75, cy], auraC, a);
  pen.add?.(true);
  pen.circle(cx, cy, cr * 0.38, 0xffffff, null, 0, 0.9 * a);
  pen.glow?.(cx, cy, (10 + 26 * cast + 6 * mp) * s, auraC, (0.45 + 0.4 * cast) * a);
  pen.add?.(false);
  drawHands(pen, j, s, w, o, auraC, light, a, cast);
  // head
  const [hx, hy] = j.head;
  pen.circle(hx, hy, r, o.zombie ? 0xb8d8a0 : 0xffffff, ink, w * 0.85, a);
  if (o.teamColor !== undefined) pen.circle(hx, hy, r + w * 0.9, null, o.teamColor, w * 0.35, a * 0.9);
  drawFace(pen, hx, hy, r, face, o, ink);
  if (o.zombie) {
    // cyber zombie: a glitching red eye-line and a circuit scar
    const gl = Math.floor(o.time * 9 + hx) % 5 === 0 ? 2 * s : 0;
    pen.add?.(true);
    pen.line(hx - r * 0.7 + gl, hy - r * 0.1, hx + r * 0.75 + gl, hy - r * 0.1, w * 0.4, 0xff3355, 0.85 * a);
    pen.glow?.(hx + face * r * 0.3, hy - r * 0.1, r * 0.9, 0xff3355, 0.35 * a);
    pen.add?.(false);
    pen.line(hx - face * r * 0.5, hy - r * 0.75, hx - face * r * 0.15, hy - r * 0.35, w * 0.25, 0x3a5a2a, a);
  }
  if (o.look.extra === 3) {
    pen.line(hx - r * 0.8, hy - r * 0.42, hx + r * 0.8, hy - r * 0.42, w * 0.5, ink, a);
    pen.circle(hx + face * r * 0.28 - r * 0.2, hy - r * 0.42, r * 0.2, auraC, ink, w * 0.3, a);
    pen.circle(hx + face * r * 0.28 + r * 0.25, hy - r * 0.42, r * 0.2, auraC, ink, w * 0.3, a);
  }
  if (o.look.extra === 4) pen.line(hx + face * r * 0.05, hy - r * 0.08, hx + face * r * 0.85, hy - r * 0.1, w * 1.1, ink, a);
  drawHat(pen, j, r, face, o.look.hat, ink, auraC, w, light);
}