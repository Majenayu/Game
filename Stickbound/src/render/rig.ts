// Stick figure rig: 14 joints (head, neck, spine, pelvis, shoulders, elbows, hands, hips, knees, feet) driven by
// keyframed poses, procedural idle/walk/run cycles and spring secondary motion. Drawn with thick rounded lines.

import type { Look } from '../content/looks';
import { BODIES, THICKNESS } from '../content/looks';
import type { Pen } from './pen';
import type { ElementId } from '../content/elements';
import type { Archetype } from '../content/archetypes';
import { drawHero, NEW_RENDERER } from './hero/draw';

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
  horse: P(0, 55, -4, 70, -118, 62, -122, 34, 14, -34, -14),
  cheer: P(0, 62, -6, 155, -6, -155, 6, 12, 2, -12, 2),
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
  /** 0..1 MP fill: the chest core glows brighter with more MP */
  mp?: number;
  /** boss rig: shoulder plates and a heavier core */
  boss?: boolean;
  /** the element (picks the signature piece and face) */
  el?: ElementId;
  /** fighting style: Striker is sleeker with forearm blades, Warden bulkier with armour and a barrier */
  style?: Archetype;
}

/** Neon face (reference sheets R01 to R21): glowing white eye slits or a visor on a dark head. The shape of the eyes
 *  carries the expression; a glowing mouth only for strong expressions. */
function drawFace(pen: Pen, hx: number, hy: number, r: number, face: number, o: DrawOpts, ink: number, visor: boolean): void {
  void ink;
  const e = o.expression;
  const ex = hx + face * r * 0.22;
  const ey = hy - r * 0.05;
  const sp = r * 0.36;
  const eyeL = ex - sp;
  const eyeR = ex + sp;
  const w = Math.max(1.8, r * 0.2);
  const W = 0xffffff;
  const style = o.look.eyes;
  pen.add?.(true);
  pen.glow?.(ex, ey, r * 1.1, o.elementLight, 0.35);
  pen.add?.(false);
  const slit = (x: number, dir: number, tilt: number) => pen.line(x - r * 0.2, ey - tilt * dir * r, x + r * 0.2, ey + tilt * dir * r, w, W);
  if (e === 'dizzy') {
    for (const xx of [eyeL, eyeR]) {
      pen.line(xx - r * 0.13, ey - r * 0.13, xx + r * 0.13, ey + r * 0.13, w * 0.7, W);
      pen.line(xx - r * 0.13, ey + r * 0.13, xx + r * 0.13, ey - r * 0.13, w * 0.7, W);
    }
  } else if (e === 'hurt') {
    pen.line(eyeL - r * 0.15, ey - r * 0.12, eyeL + r * 0.1, ey, w * 0.7, W);
    pen.line(eyeL - r * 0.15, ey + r * 0.12, eyeL + r * 0.1, ey, w * 0.7, W);
    pen.line(eyeR + r * 0.15, ey - r * 0.12, eyeR - r * 0.1, ey, w * 0.7, W);
    pen.line(eyeR + r * 0.15, ey + r * 0.12, eyeR - r * 0.1, ey, w * 0.7, W);
  } else if (e === 'shocked' || e === 'scared') {
    pen.circle(eyeL, ey, r * 0.17, null, W, w * 0.55);
    pen.circle(eyeR, ey, r * 0.17, null, W, w * 0.55);
  } else if (e === 'happy') {
    for (const xx of [eyeL, eyeR]) {
      pen.line(xx - r * 0.16, ey + r * 0.06, xx, ey - r * 0.1, w * 0.75, W);
      pen.line(xx, ey - r * 0.1, xx + r * 0.16, ey + r * 0.06, w * 0.75, W);
    }
  } else if (visor || style === 4) {
    // visor band; its inner ends tilt down for anger
    const k = e === 'angry' ? 0.16 : e === 'determined' ? 0.08 : 0;
    const x0 = hx - r * 0.82;
    const x1 = hx + r * 0.82;
    const mid = ex;
    pen.poly([x0, ey - r * 0.2, mid, ey - r * (0.2 - k), x1, ey - r * 0.2, x1, ey + r * 0.14, mid, ey + r * 0.14, x0, ey + r * 0.14], o.elementLight, 0.95);
    pen.line(x0 + r * 0.1, ey - r * 0.04, x1 - r * 0.1, ey - r * 0.04, w * 0.45, W, 0.95);
  } else {
    // eye slits; fierce styles slant inward, sleepy ones are flat and thin
    const tilt = e === 'angry' ? 0.14 : e === 'determined' || style === 5 || style === 2 ? 0.09 : style === 3 ? 0 : 0.04;
    if (!o.el && (style === 0 || style === 1 || style === 6)) {
      const rr = (style === 1 ? 0.17 : 0.13) * r;
      pen.circle(eyeL, ey, rr, W, null);
      pen.circle(eyeR, ey, rr, W, null);
      if (tilt > 0.05) {
        pen.line(eyeL - r * 0.2, ey - r * 0.22, eyeL + r * 0.16, ey - r * 0.1, w * 0.7, W);
        pen.line(eyeR + r * 0.2, ey - r * 0.22, eyeR - r * 0.16, ey - r * 0.1, w * 0.7, W);
      }
    } else if (style === 7) {
      for (const xx of [eyeL, eyeR]) {
        pen.line(xx - r * 0.15, ey, xx + r * 0.15, ey, w * 0.6, W);
        pen.line(xx, ey - r * 0.15, xx, ey + r * 0.15, w * 0.6, W);
      }
    } else {
      slit(eyeL, 1, tilt);
      slit(eyeR, -1, tilt);
    }
  }
  // mouth: only for big feelings (and the grin style)
  const my = hy + r * 0.42;
  if (e === 'happy' || (o.look.mouth === 2 && e !== 'hurt' && e !== 'shocked' && e !== 'scared' && e !== 'dizzy')) {
    pen.poly([ex - r * 0.3, my - r * 0.08, ex + r * 0.3, my - r * 0.08, ex + r * 0.18, my + r * 0.12, ex - r * 0.18, my + r * 0.12], W, 0.95);
  } else if (e === 'angry' || e === 'hurt') pen.line(ex - r * 0.26, my, ex + r * 0.26, my, w * 0.6, W, 0.9);
  else if (e === 'shocked' || e === 'scared') pen.circle(ex, my, r * 0.12, null, W, w * 0.45);
  else if (e === 'smug' || o.look.mouth === 4) pen.line(ex - r * 0.22, my + r * 0.02, ex + r * 0.2, my - r * 0.07, w * 0.5, W, 0.85);
}
export function drawHat(pen: Pen, j: Joints, r: number, face: number, hat: number, ink: number, el: number, w: number, light: number): void {
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
export function drawTech(pen: Pen, j: Joints, face: number, s: number, w: number, o: DrawOpts, ink: number, el: number, light: number, a: number): void {
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
export function drawSuit(pen: Pen, j: Joints, s: number, w: number, o: DrawOpts, el: number, light: number, a: number): void {
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
export function drawHands(pen: Pen, j: Joints, s: number, w: number, o: DrawOpts, el: number, light: number, a: number, cast: number): void {
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

/** Faces per element (reference sheets): eye slits for fire, a visor for the rest. */
const VISOR: Record<ElementId, boolean> = { fire: false, ice: true, leaf: true, water: true, lightning: true, wind: true, earth: true, light: true, gravity: true, time: true };

/** Element signature pieces from the hero sheets, drawn on every avatar of that element. */
function drawSignature(pen: Pen, j: Joints, face: number, s: number, r: number, w: number, o: DrawOpts, neon: number, hot: number, body: number, a: number, layer: 'back' | 'front'): void {
  const el = o.el;
  if (!el) return;
  const behind = el === 'wind' || el === 'light' || el === 'gravity';
  if (layer === 'back' && !behind) return;
  const [hx, hy] = j.head;
  const t = o.time;
  const back = -face;
  switch (el) {
    case 'fire': {
      // red headband with two tails, flame hair licking up
      const by = hy - r * 0.42;
      pen.line(hx - r * 0.98, by, hx + r * 0.98, by, w * 0.55, 0xff2d2d, a);
      for (const k of [0, 1]) {
        const sw = Math.sin(t * 9 + k * 1.7) * 3 * s;
        pen.line(hx + back * r * 0.9, by, hx + back * r * (1.9 + k * 0.4), by + (4 + k * 7) * s + sw, w * (0.5 - k * 0.12), 0xff2d2d, a);
      }
      pen.add?.(true);
      for (let i = 0; i < 4; i++) {
        const fx = hx + (i - 1.5) * r * 0.42 + back * r * 0.12;
        const fl = (0.75 + 0.25 * Math.sin(t * 13 + i * 2.3)) * r * (i === 1 || i === 2 ? 1.1 : 0.75);
        pen.poly([fx - r * 0.2, hy - r * 0.75, fx + r * 0.2, hy - r * 0.75, fx + back * r * 0.18, hy - r * 0.75 - fl], i % 2 ? 0xffd23a : 0xff6a1f, 0.9 * a);
      }
      pen.add?.(false);
      break;
    }
    case 'water': {
      // wavy hair streaming back
      for (let k = 0; k < 3; k++) {
        let px = hx + face * r * (0.4 - k * 0.4);
        let py = hy - r * (0.95 - k * 0.15);
        for (let i = 1; i <= 7; i++) {
          const nx = px + back * 5.5 * s;
          const ny = py + Math.sin(t * 4 + i * 0.9 + k) * 3 * s + 1.8 * s;
          pen.line(px, py, nx, ny, w * (0.8 - i * 0.08), neon, a);
          if (i > 2) pen.line(px, py, nx, ny, w * (0.3 - i * 0.03), hot, 0.6 * a);
          px = nx;
          py = ny;
        }
      }
      break;
    }
    case 'ice': {
      // crystal crown
      for (let i = 0; i < 5; i++) {
        const cx = hx + (i - 2) * r * 0.38;
        const hgt = r * (i === 2 ? 1.05 : i === 1 || i === 3 ? 0.8 : 0.5);
        pen.poly([cx - r * 0.2, hy - r * 0.72, cx + r * 0.2, hy - r * 0.72, cx + (i - 2) * r * 0.08, hy - r * 0.72 - hgt], 0xc8f4ff, 0.95 * a);
        pen.line(cx, hy - r * 0.74, cx + (i - 2) * r * 0.08, hy - r * 0.72 - hgt, 1.2 * s, 0xffffff, a);
      }
      for (const [dx, h] of [[-7, 12], [0, 16], [7, 11]] as const) {
        const sx = j.shoulder[0] + dx * s;
        pen.poly([sx - 4 * s, j.shoulder[1], sx + 4 * s, j.shoulder[1], sx + dx * 0.3 * s, j.shoulder[1] - h * s], 0xc8f4ff, 0.85 * a);
      }
      break;
    }
    case 'lightning': {
      // swept spiky hair and crackling arcs
      for (let i = 0; i < 4; i++) {
        const bx = hx + face * r * (0.4 - i * 0.32);
        pen.poly([bx - r * 0.25, hy - r * 0.7, bx + r * 0.25, hy - r * 0.8, bx + back * r * (0.9 + i * 0.15), hy - r * (1.35 - i * 0.12)], 0xffe46b, 0.95 * a);
      }
      pen.add?.(true);
      const f = Math.floor(t * 14);
      for (let k = 0; k < 2; k++) {
        const ax = j.pelvis[0] + (((f * 37 + k * 53) % 40) - 20) * s;
        const ay = j.pelvis[1] - (((f * 17 + k * 29) % 50) + 5) * s;
        pen.line(ax, ay, ax + 7 * s, ay - 6 * s, 1.4 * s, hot, 0.9 * a);
        pen.line(ax + 7 * s, ay - 6 * s, ax + 3 * s, ay - 13 * s, 1.4 * s, hot, 0.9 * a);
      }
      pen.add?.(false);
      break;
    }
    case 'wind': {
      // a long scarf (spring tail) and its knot
      const pts = layer === 'back' ? o.cloth : undefined;
      if (pts) {
        while (pts.length < 18) pts.push({ x: j.neck[0], y: j.neck[1] });
        let px = j.neck[0];
        let py = j.neck[1] - 2 * s;
        for (let i = 12; i < 18; i++) {
          const p = pts[i]!;
          p.x += (px + back * 10 * s - p.x) * 0.3;
          p.y += (py + 2 * s - p.y) * 0.3 + Math.sin(t * 7 + i) * 0.9;
          pen.line(px, py, p.x, p.y, w * (0.9 - (i - 12) * 0.1), neon, a);
          px = p.x;
          py = p.y;
        }
      }
      if (layer === 'front') pen.line(j.neck[0] - 5 * s, j.neck[1] - 2 * s, j.neck[0] + 5 * s, j.neck[1] - 2 * s, w * 0.9, neon, a);
      break;
    }
    case 'earth': {
      // rock armour: shoulder boulders, fist rocks, a helmet crest
      const rock = (x: number, y: number, rr: number) => {
        pen.poly([x - rr, y, x - rr * 0.5, y - rr * 0.9, x + rr * 0.6, y - rr * 0.8, x + rr, y + rr * 0.1, x + rr * 0.4, y + rr * 0.8, x - rr * 0.6, y + rr * 0.7], 0x5a3a1c, a);
        pen.line(x - rr * 0.5, y - rr * 0.9, x + rr * 0.6, y - rr * 0.8, 1.6 * s, neon, a);
      };
      rock(j.shoulder[0] + back * 5 * s, j.shoulder[1] + 2 * s, 13 * s);
      rock(j.shoulder[0] - back * 6 * s, j.shoulder[1] - 1 * s, 10 * s);
      rock((j.aEl[0] + j.aHand[0]) / 2, (j.aEl[1] + j.aHand[1]) / 2, 8 * s);
      rock((j.bEl[0] + j.bHand[0]) / 2, (j.bEl[1] + j.bHand[1]) / 2, 7 * s);
      rock(j.aHand[0], j.aHand[1], 8.5 * s);
      pen.poly([hx - r * 0.9, hy - r * 0.45, hx - r * 0.5, hy - r * 1.02, hx + r * 0.5, hy - r * 1.02, hx + r * 0.9, hy - r * 0.45], 0x5a3a1c, a);
      pen.line(hx - r * 0.9, hy - r * 0.45, hx + r * 0.9, hy - r * 0.45, 1.6 * s, neon, a);
      break;
    }
    case 'leaf': {
      // vines curling round the front forearm
      const [e1x, e1y] = j.aEl;
      const [h1x, h1y] = j.aHand;
      for (let i = 0; i < 6; i++) {
        const u0 = i / 6;
        const u1 = (i + 1) / 6;
        const off = (u: number) => Math.sin(u * Math.PI * 4 + t * 3) * w * 0.7;
        pen.line(e1x + (h1x - e1x) * u0, e1y + (h1y - e1y) * u0 + off(u0), e1x + (h1x - e1x) * u1, e1y + (h1y - e1y) * u1 + off(u1), 1.4 * s, 0x3fbf4a, a);
      }
      pen.circle(e1x + (h1x - e1x) * 0.5, e1y + (h1y - e1y) * 0.5 - w * 0.6, 2.2 * s, 0x7ee36a, null, 0, a);
      // laurel crown: small leaves around the brow
      for (let i = 0; i < 7; i++) {
        const ang = Math.PI * (1.05 + i * 0.15);
        const lx = hx + Math.cos(ang) * r * 1.02;
        const ly = hy + Math.sin(ang) * r * 1.02;
        const tx = lx + Math.cos(ang - 0.6) * r * 0.42;
        const ty = ly + Math.sin(ang - 0.6) * r * 0.42;
        pen.poly([lx, ly, (lx + tx) / 2 + 2 * s, (ly + ty) / 2 - 2 * s, tx, ty, (lx + tx) / 2 - 2 * s, (ly + ty) / 2 + 2 * s], i % 2 ? 0x7ee36a : 0x3fbf4a, a);
      }
      break;
    }
    case 'light': {
      // floating halo and a short white cape
      if (layer === 'back') {
        capeTail(pen, j, face, s, w, o, 0xf6f0d8, 0.85 * a);
        break;
      }
      pen.add?.(true);
      ellipseRing(pen, hx, hy - r * 1.45 + Math.sin(t * 2) * 1.5 * s, r * 0.85, r * 0.24, w * 0.45, 0xfff2b0, 0.95 * a);
      pen.glow?.(hx, hy - r * 1.45, r * 1.4, 0xffe46b, 0.4 * a);
      pen.add?.(false);
      break;
    }
    case 'gravity': {
      // a ring orbiting the head, a dark cape
      if (layer === 'back') {
        capeTail(pen, j, face, s, w, o, 0x24103a, a);
        break;
      }
      const tilt = Math.sin(t * 1.6) * 0.35;
      pen.add?.(true);
      ellipseRing(pen, hx, hy - r * 0.1, r * 1.5, r * (0.35 + tilt * 0.3), w * 0.4, neon, 0.9 * a);
      const oa = t * 3;
      pen.glow?.(hx + Math.cos(oa) * r * 1.5, hy - r * 0.1 + Math.sin(oa) * r * 0.35, 6 * s, hot, a);
      pen.add?.(false);
      break;
    }
    case 'time': {
      // a gear crown
      const gx = hx;
      const gy = hy - r * 0.95;
      const gr = r * 0.5;
      const rot = t * 0.8;
      for (let i = 0; i < 8; i++) {
        const ang = rot + (i / 8) * Math.PI * 2;
        pen.line(gx + Math.cos(ang) * gr * 0.7, gy + Math.sin(ang) * gr * 0.7, gx + Math.cos(ang) * gr * 1.15, gy + Math.sin(ang) * gr * 1.15, w * 0.45, 0xd8a24a, a);
      }
      pen.circle(gx, gy, gr * 0.78, 0xb8862a, neon, 1.4 * s, a);
      pen.circle(gx, gy, gr * 0.3, body, null, 0, a);
      // gear pauldron on the front shoulder
      const px = j.shoulder[0] + face * 3 * s;
      const py = j.shoulder[1] + 2 * s;
      for (let i = 0; i < 8; i++) {
        const ang = -rot * 1.3 + (i / 8) * Math.PI * 2;
        pen.line(px + Math.cos(ang) * 6 * s, py + Math.sin(ang) * 6 * s, px + Math.cos(ang) * 10 * s, py + Math.sin(ang) * 10 * s, 3 * s, 0xd8a24a, a);
      }
      pen.circle(px, py, 7.5 * s, 0xb8862a, neon, 1.4 * s, a);
      pen.circle(px, py, 3 * s, hot, null, 0, a);
      break;
    }
  }
}
/** a mixed toward b by k (0..1) */
function tint(a: number, b: number, k: number): number {
  const m = (sh: number) => Math.round(((a >> sh) & 255) * (1 - k) + ((b >> sh) & 255) * k) << sh;
  return m(16) | m(8) | m(0);
}
function ellipseRing(pen: Pen, cx: number, cy: number, rx: number, ry: number, w: number, c: number, a: number): void {
  let px = cx + rx;
  let py = cy;
  for (let i = 1; i <= 20; i++) {
    const ang = (i / 20) * Math.PI * 2;
    const nx = cx + Math.cos(ang) * rx;
    const ny = cy + Math.sin(ang) * ry;
    pen.line(px, py, nx, ny, w, c, a);
    px = nx;
    py = ny;
  }
}
/** short cape from the shoulders (light and gravity signatures), on spring points 6 to 11 */
function capeTail(pen: Pen, j: Joints, face: number, s: number, w: number, o: DrawOpts, c: number, a: number): void {
  const pts = o.cloth;
  if (!pts) return;
  while (pts.length < 12) pts.push({ x: j.shoulder[0], y: j.shoulder[1] });
  let px = j.shoulder[0];
  let py = j.shoulder[1];
  for (let i = 6; i < 11; i++) {
    const p = pts[i]!;
    p.x += (px - face * 6 * s - p.x) * 0.32;
    p.y += (py + 8 * s - p.y) * 0.32 + Math.sin(o.time * 5 + i) * 0.5;
    pen.line(px, py, p.x, p.y, w * 2.3 * (1 - (i - 6) / 7), c, a);
    px = p.x;
    py = p.y;
  }
}

/** Draws a stick figure in the neon hero style of the reference sheets: a solid dark body with a bright element
 *  outline and soft glow, a dark head with glowing eyes or a visor, a star chest core that flares when casting, the
 *  element's signature piece, the style's silhouette (Striker blades, Warden armour and barrier), plus the Forge
 *  cosmetics. */
export function drawStick(pen: Pen, j: Joints, face: number, s: number, o: DrawOpts): void {
  if (o.el && !o.zombie && !o.boss && !LEGACY_ART && NEW_RENDERER.has(o.el)) return drawHero(pen, j, face, s, o);
  const style = o.style ?? 'classic';
  // the default body takes a faint tint of the element, as on the sheets (bronze earth, violet gravity, teal time)
  const body = o.zombie ? 0x0e1a10 : o.el && o.look.body === 0 ? tint(BODIES[0]!, o.element, 0.12) : BODIES[o.look.body % BODIES.length]!;
  const wMul = style === 'striker' ? 0.86 : style === 'warden' ? 1.16 : 1;
  const w = THICKNESS[o.look.thick % THICKNESS.length]! * s * (o.weight ?? 1) * 1.22 * wMul;
  const a = o.alpha ?? 1;
  const r = 16 * s * [1, 1.12, 0.95, 0.85][o.look.head % 4]!;
  const neon = o.zombie ? (o.boss ? 0xff3355 : 0x6aff5a) : o.element;
  const hot = o.zombie ? 0xd8ffc8 : o.elementLight;
  const cast = o.aura >= 1 ? 1 : 0;
  const mp = o.mp ?? 0.5;
  const ow = Math.max(1.6, w * 0.3);
  const t = o.time;
  // aura glow
  if (o.aura > 0 && pen.glow) {
    pen.add?.(true);
    pen.glow(j.pelvis[0], j.pelvis[1] - 18 * s, (62 + 20 * cast) * s, neon, (0.18 + 0.12 * cast) * o.aura * a);
    pen.add?.(false);
  }
  // Warden: an orbiting barrier of light shards behind the body
  if (style === 'warden' && !o.zombie) {
    pen.add?.(true);
    for (let i = 0; i < 3; i++) {
      const ang = t * 1.4 + (i / 3) * Math.PI * 2;
      if (Math.sin(ang) > 0) continue;
      const bx = j.pelvis[0] + Math.cos(ang) * 34 * s;
      const by = j.pelvis[1] - 26 * s + Math.sin(ang) * 8 * s;
      hex(pen, bx, by, 6 * s, 1.6 * s, hot, 0.75 * a);
    }
    pen.add?.(false);
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
      p.x += (px - face * 9 * s - p.x) * 0.35;
      p.y += (py + (o.look.back === 2 ? 9 : 3) * s - p.y) * 0.35 + Math.sin(t * 6 + i) * 0.6;
      const cw = (o.look.back === 2 ? w * 2.4 : w * 1.1) * (1 - i / (len * 1.4));
      pen.line(px, py, p.x, p.y, cw, neon, a);
      px = p.x;
      py = p.y;
    }
  } else if (o.look.back > 3) drawTech(pen, j, face, s, w, o, body, neon, hot, a);
  drawSignature(pen, j, face, s, r, w, o, neon, hot, body, a, 'back');
  // limbs in three passes per depth group: soft glow, neon outline, dark body
  const group = (segs: [V2, V2, number][]) => {
    if (pen.add) {
      pen.add(true);
      for (const [p1, p2, k] of segs) pen.line(p1[0], p1[1], p2[0], p2[1], w * k + ow * 2 + 7 * s, neon, 0.16 * a);
      pen.add(false);
    }
    for (const [p1, p2, k] of segs) pen.line(p1[0], p1[1], p2[0], p2[1], w * k + ow * 2, neon, a);
    for (const [p1, p2, k] of segs) pen.line(p1[0], p1[1], p2[0], p2[1], w * k, body, a);
  };
  group([
    [j.pelvis, j.bKn, 1],
    [j.bKn, j.bFoot, 1],
    [j.shoulder, j.bEl, 1],
    [j.bEl, j.bHand, 1],
  ]);
  group([
    [j.pelvis, j.neck, style === 'warden' ? 2.1 : style === 'striker' ? 1.55 : 1.8],
    [j.pelvis, j.aKn, 1],
    [j.aKn, j.aFoot, 1],
    [j.shoulder, j.aEl, 1],
    [j.aEl, j.aHand, 1],
  ]);
  // fists
  for (const [hp, k] of [[j.aHand, 0.68], [j.bHand, 0.64]] as [V2, number][]) {
    pen.circle(hp[0], hp[1], w * k + ow, neon, null, 0, a);
    pen.circle(hp[0], hp[1], w * k, body, null, 0, a);
  }
  // Striker: light blades along the forearms
  if (style === 'striker' && !o.zombie) {
    pen.add?.(true);
    for (const [e1, h1] of [[j.aEl, j.aHand], [j.bEl, j.bHand]] as [V2, V2][]) {
      const dx = h1[0] - e1[0];
      const dy = h1[1] - e1[1];
      const l = Math.hypot(dx, dy) || 1;
      const nx = (-dy / l) * 8 * s;
      const ny = (dx / l) * 8 * s;
      const tip = [h1[0] + dx * 0.55 + nx * 0.3, h1[1] + dy * 0.55 + ny * 0.3];
      pen.poly([e1[0] + dx * 0.05, e1[1] + dy * 0.05, tip[0]!, tip[1]!, e1[0] + dx * 0.6 + nx, e1[1] + dy * 0.6 + ny], neon, 0.55 * a);
      pen.poly([e1[0] + dx * 0.15, e1[1] + dy * 0.15, tip[0]!, tip[1]!, e1[0] + dx * 0.6 + nx * 0.6, e1[1] + dy * 0.6 + ny * 0.6], hot, 0.9 * a);
    }
    pen.add?.(false);
  }
  // Warden and bosses: armoured shoulder plates
  if (style === 'warden' || o.boss) {
    const sx = j.shoulder[0];
    const sy = j.shoulder[1];
    const k = o.boss ? 1.25 : 1;
    // one pad over each shoulder, sloping outward
    for (const d of [-1, 1]) {
      const px = sx + d * w * 1.25;
      const o1 = px + d * 9 * s * k;
      pen.poly([px - d * 3 * s, sy - 6 * s, o1, sy - 3 * s, o1 + d * 1.5 * s, sy + 6 * s * k, px - d * 2 * s, sy + 4 * s], neon, a);
      pen.poly([px - d * 1.5 * s, sy - 4.2 * s, o1 - d * 1.6 * s, sy - 1.8 * s, o1 - d * 0.8 * s, sy + 4.2 * s * k, px - d * 0.8 * s, sy + 2.6 * s], body, a);
      pen.line(px, sy - 2.2 * s, o1 - d * 2 * s, sy - 0.6 * s, 1.3 * s, hot, a);
    }
  }
  if (o.look.extra === 1) {
    pen.circle(j.aHand[0], j.aHand[1], w * 1.1, null, hot, w * 0.35, a);
    pen.circle(j.bHand[0], j.bHand[1], w * 1.05, null, hot, w * 0.35, a);
  }
  if (o.look.extra === 2) pen.line(j.pelvis[0] - w * 1.2, j.pelvis[1] - 2 * s, j.pelvis[0] + w * 1.2, j.pelvis[1] - 2 * s, w * 0.5, neon, a);
  drawSuit(pen, j, s, w, o, neon, hot, a);
  // chest core: a four-point star that flares when casting
  const cx = (j.pelvis[0] + j.neck[0] * 2.2) / 3.2;
  const cy = (j.pelvis[1] + j.neck[1] * 2.2) / 3.2;
  const cr = w * (o.boss ? 1.1 : 0.85) * (1 + cast * 0.5);
  pen.add?.(true);
  pen.glow?.(cx, cy, (12 + 26 * cast + 10 * mp) * s, neon, (0.45 + 0.2 * mp + 0.35 * cast) * a);
  pen.poly([cx, cy - cr, cx + cr * 0.25, cy - cr * 0.25, cx + cr, cy, cx + cr * 0.25, cy + cr * 0.25, cx, cy + cr, cx - cr * 0.25, cy + cr * 0.25, cx - cr, cy, cx - cr * 0.25, cy - cr * 0.25], hot, a);
  pen.circle(cx, cy, cr * 0.3, 0xffffff, null, 0, a);
  pen.add?.(false);
  drawHands(pen, j, s, w, o, neon, hot, a, cast);
  // head: dark with the neon outline, glowing eyes or visor
  const [hx, hy] = j.head;
  if (pen.add) {
    pen.add(true);
    pen.circle(hx, hy, r + ow + 5 * s, neon, null, 0, 0.14 * a);
    pen.add(false);
  }
  pen.circle(hx, hy, r + ow, neon, null, 0, a);
  pen.circle(hx, hy, r, body, null, 0, a);
  if (o.teamColor !== undefined) pen.circle(hx, hy, r + ow + w * 0.45, null, o.teamColor, w * 0.3, a * 0.9);
  // the default eye styles (0, 1, 6) take the element's face from its sheet; the other styles stay cosmetic
  drawFace(pen, hx, hy, r, face, o, body, !!o.el && VISOR[o.el] && (o.look.eyes <= 1 || o.look.eyes === 6));
  if (o.zombie) {
    // cyber zombie: glitching cracks on the head and body
    const gl = Math.floor(t * 9 + hx) % 5 === 0 ? 2 * s : 0;
    pen.add?.(true);
    pen.line(hx - face * r * 0.5 + gl, hy - r * 0.75, hx - face * r * 0.1, hy - r * 0.3, w * 0.25, o.boss ? 0xff3355 : 0x9cff6a, a);
    pen.line(cx - 4 * s, cy + 6 * s, cx + 3 * s, cy + 14 * s, w * 0.25, o.boss ? 0xff3355 : 0x9cff6a, 0.8 * a);
    pen.add?.(false);
  }
  if (o.look.extra === 3) {
    pen.circle(hx + face * r * 0.28 - r * 0.2, hy - r * 0.42, r * 0.2, null, hot, w * 0.25, a);
    pen.circle(hx + face * r * 0.28 + r * 0.25, hy - r * 0.42, r * 0.2, null, hot, w * 0.25, a);
  }
  if (o.look.extra === 4) pen.line(hx + face * r * 0.0, hy - r * 0.08, hx + face * r * 0.9, hy - r * 0.1, w * 0.9, 0x05060f, a);
  drawSignature(pen, j, face, s, r, w, o, neon, hot, body, a, 'front');
  drawHat(pen, j, r, face, o.look.hat, body, neon, w, hot);
}

/** ?legacyart=1 draws the old heroes (for before and after captures) */
const LEGACY_ART = typeof location !== 'undefined' && /legacyart/.test(location.search);
