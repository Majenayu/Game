// Copy of the Lightning lab's base animations (gemini/parts/lightning/anims.ts, 2026-11-22) so the trial does not change
// when that lab is edited.
import { BASE, lerpPose, pose, type Face, type Pose } from './rig';

/** Hit data for an attack frame window (local space: x forward, y up negative, origin at the hip). */
export interface Hit {
  from: number;
  to: number;
  box: { x: number; y: number; w: number; h: number };
  dmg: number;
  /** knockback x and lift (px per frame at 60 Hz) */
  kb: number;
  lift: number;
  /** hit-stop frames and hitstun frames */
  stop: number;
  stun: number;
  /** effect at impact */
  fx: 'spark' | 'bolt' | 'big';
}
export interface Clip {
  name: string;
  frames: number;
  keys: Array<[number, Partial<Pose>, Ease?]>;
  face: Face;
  loop?: boolean;
  /** forward speed per frame window */
  move?: Array<[number, number, number]>;
  hits?: Hit[];
  /** frame from which a following attack may be queued (combo window) */
  cancel?: number;
  /** body glow 0..1 */
  charge?: Array<[number, number, number]>;
  /** special power events by frame */
  events?: Array<[number, string]>;
  /** the striking limb glows and crackles while the hit is live: front wrist, back wrist or front ankle */
  limb?: 'fw' | 'bw' | 'fa';
  /** power-up aura (lightning flames from the floor) strength by frame window */
  aura?: Array<[number, number, number]>;
  /** the arena darkens during this window (ultimate) */
  dim?: [number, number];
}

/** Easing into a key: 'out' (default, a fast snap that settles), 'io' (slow in and out, for wind-ups, holds and
 *  recoveries), 'in' (speeds up, for falls and slams), 'back' (overshoots a little and settles, for follow-through). */
export type Ease = 'out' | 'io' | 'in' | 'back';
const EASE: Record<Ease, (t: number) => number> = {
  out: (t) => 1 - Math.pow(1 - t, 3),
  io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  in: (t) => t * t * t,
  back: (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2),
};

export function sample(c: Clip, f: number): Pose {
  const ks = c.keys;
  if (f <= ks[0][0]) return pose(ks[0][1]);
  for (let i = 1; i < ks.length; i++) {
    if (f <= ks[i][0]) {
      const [fa, pa] = ks[i - 1];
      const [fb, pb, e] = ks[i];
      const t = (f - fa) / Math.max(1, fb - fa);
      return lerpPose(pose(pa), pose(pb), EASE[e ?? 'out'](t));
    }
  }
  return pose(ks[ks.length - 1][1]);
}
export function chargeAt(c: Clip, f: number): number {
  for (const [a, b, v] of c.charge ?? []) if (f >= a && f <= b) return v;
  return 0;
}
export function auraAt(c: Clip, f: number): number {
  for (const [a, b, v] of c.aura ?? []) if (f >= a && f <= b) return v * Math.min(1, (f - a + 1) / 8);
  return 0;
}
export function moveAt(c: Clip, f: number): number {
  for (const [a, b, v] of c.move ?? []) if (f >= a && f < b) return v;
  return 0;
}

// ---- stance poses ----
const STANCE = pose({});
const GUARD = pose({ lean: 12, fu: 45, fl: 125, bu: 25, bl: 140, ftu: 34, ftl: -44, btu: -30, btl: -20, y: 8, head: 8 });

/** Procedural loops: idle (breathing), walk, run, jump and fall. phase is in frames. */
export function idlePose(t: number): Pose {
  const b = Math.sin(t / 22);
  return pose({ y: b * 2.5, lean: 4 + b, fu: 62 + b * 3, fl: 98 - b * 4, bu: -30 - b * 2, bl: 135 + b * 3, head: -b, ftl: -24 - b * 2, btl: -4 - b });
}
export function walkPose(t: number, speed: number): Pose {
  const run = speed > 5.5;
  const p = (t * (run ? 0.26 : 0.17)) % (Math.PI * 2);
  const amp = run ? 46 : 34;
  const s = Math.sin(p);
  const c = Math.cos(p);
  return pose({
    y: -Math.abs(Math.cos(p)) * (run ? 6 : 3),
    lean: run ? 16 : 8,
    head: run ? -6 : 0,
    ftu: s * amp + 6,
    ftl: -10 - Math.max(0, c) * (run ? 70 : 40),
    btu: -s * amp + 6,
    btl: -10 - Math.max(0, -c) * (run ? 70 : 40),
    // like the reference: the front arm stays forward and the back arm stays back, they never hang flat on the body
    fu: (run ? 50 : 40) - s * (run ? 35 : 25),
    fl: run ? 95 : 65 + Math.max(0, -s) * 20,
    bu: (run ? -55 : -52) + s * (run ? 35 : 22),
    bl: run ? 95 : 22,
  });
}
export function airPose(vy: number): Pose {
  const up = vy < 0;
  return pose(
    up
      ? { lean: 4, ftu: 55, ftl: -95, btu: 5, btl: -55, fu: 110, fl: 40, bu: -40, bl: 60 }
      : { lean: 10, ftu: 30, ftl: -40, btu: -15, btl: -20, fu: 70, fl: 30, bu: -60, bl: 40 },
  );
}
export const guardPose = GUARD;

// ---- attacks and powers (frame data at 60 Hz) ----
export const CLIPS: Record<string, Clip> = {
  jab: {
    name: 'Jab',
    frames: 20,
    face: 'attack',
    cancel: 9,
    keys: [
      [0, STANCE],
      [3, { fu: 15, fl: 120, lean: 4 }],
      [6, { fu: 88, fl: 0, lean: 14, x: 6, ffist: 1 }],
      [11, { fu: 86, fl: 4, lean: 13, x: 6 }],
      [20, STANCE],
    ],
    move: [[4, 7, 2.5]],
    limb: 'fw',
    hits: [{ from: 6, to: 9, box: { x: 70, y: -118, w: 70, h: 44 }, dmg: 6, kb: 3, lift: 0, stop: 4, stun: 16, fx: 'spark' }],
  },
  cross: {
    name: 'Cross',
    frames: 24,
    face: 'attack',
    cancel: 11,
    keys: [
      [0, { ...STANCE, fu: 30 }],
      [4, { bu: -30, bl: 110, lean: 0, fu: 40, fl: 110 }],
      [8, { bu: 90, bl: 0, lean: 24, x: 14, fu: -75, fl: 155, btu: -34, ftu: 34 }],
      [14, { bu: 88, bl: 6, lean: 22, x: 14, fu: -75, fl: 155, btu: -34, ftu: 34 }],
      [24, STANCE],
    ],
    move: [[5, 9, 3.5]],
    limb: 'bw',
    hits: [{ from: 8, to: 11, box: { x: 72, y: -122, w: 80, h: 46 }, dmg: 8, kb: 4, lift: 0, stop: 5, stun: 18, fx: 'spark' }],
  },
  kick: {
    name: 'Thunder Kick',
    frames: 34,
    face: 'attack',
    cancel: 15,
    limb: 'fa',
    keys: [
      [0, STANCE],
      [5, { ftu: 70, ftl: -110, lean: -6, fu: 40, fl: 90, bu: -40, bl: 60 }],
      [10, { ftu: 98, ftl: -4, lean: -18, fu: -20, fl: 60, bu: -60, bl: 40, btu: -10, btl: -8, x: 10 }],
      [17, { ftu: 96, ftl: -6, lean: -18, fu: -20, fl: 60, bu: -60, bl: 40, btu: -10, x: 12 }],
      [26, { ftu: 40, ftl: -70, lean: 0 }],
      [34, STANCE],
    ],
    move: [[6, 12, 3]],
    charge: [[8, 18, 0.7]],
    hits: [{ from: 10, to: 14, box: { x: 60, y: -40, w: 110, h: 60 }, dmg: 11, kb: 6, lift: -6, stop: 7, stun: 30, fx: 'bolt' }],
  },
  heavy: {
    name: 'Volt Hammer',
    frames: 52,
    face: 'attack',
    keys: [
      [0, STANCE],
      [14, { y: 16, lean: -16, fu: 175, fl: 20, bu: 165, bl: 30, ftu: 34, ftl: -70, btu: -30, btl: -50, ffist: 1, bfist: 1 }],
      [20, { y: -10, lean: 38, fu: 70, fl: 10, bu: 80, bl: 10, x: 22, ftu: 40, ftl: -30, btu: -40, btl: -10 }],
      [30, { y: 4, lean: 40, fu: 40, fl: 20, bu: 50, bl: 20, x: 26, ftu: 46, ftl: -60, btu: -40, btl: -10 }],
      [52, STANCE],
    ],
    move: [[15, 22, 6]],
    limb: 'fw',
    aura: [[0, 16, 0.75]],
    charge: [[2, 20, 1]],
    events: [[19, 'slam']],
    hits: [{ from: 19, to: 23, box: { x: 40, y: -110, w: 120, h: 140 }, dmg: 18, kb: 12, lift: -11, stop: 10, stun: 44, fx: 'big' }],
  },
  dash: {
    name: 'Bolt Dash',
    frames: 22,
    face: 'normal',
    keys: [
      [0, { lean: 34, fu: -60, fl: 30, bu: -70, bl: 30, ftu: 40, ftl: -80, btu: -40, btl: -30, y: 6 }],
      [16, { lean: 30, fu: -60, fl: 30, bu: -70, bl: 30, ftu: 40, ftl: -80, btu: -40, btl: -30, y: 6 }],
      [22, STANCE],
    ],
    move: [[0, 14, 15]],
    events: [[0, 'trail']],
  },
  sparkStep: {
    name: 'Spark Step',
    frames: 46,
    face: 'attack',
    keys: [
      [0, STANCE],
      [8, { y: 14, lean: 20, fu: 120, fl: 30, ftu: 30, ftl: -60, btu: -30, btl: -40 }],
      [16, { lean: 10, bu: 100, bl: -20, fu: 10, fl: 120, x: 8 }],
      [26, { lean: 22, bu: 92, bl: 0, fu: 10, fl: 120, x: 14 }],
      [46, STANCE],
    ],
    charge: [[0, 16, 1]],
    limb: 'bw',
    aura: [[0, 9, 0.55]],
    events: [[9, 'teleport']],
    hits: [{ from: 16, to: 20, box: { x: 40, y: -130, w: 100, h: 80 }, dmg: 12, kb: 8, lift: -4, stop: 7, stun: 34, fx: 'bolt' }],
  },
  chainBolt: {
    name: 'Chain Bolt',
    frames: 56,
    face: 'attack',
    keys: [
      [0, STANCE],
      [12, { fu: 70, fl: 20, ffist: 0, lean: -6, bu: -30, bl: 90, y: 6 }],
      [16, { fu: 92, fl: 0, ffist: 0, lean: 8, bu: -40, bl: 60, x: 4 }],
      [44, { fu: 90, fl: 0, ffist: 0, lean: 8, bu: -40, bl: 60, x: 4 }],
      [56, STANCE],
    ],
    charge: [[0, 44, 0.8]],
    aura: [[0, 16, 0.5]],
    events: [[16, 'beam'], [37, 'beamEnd']],
    hits: [
      { from: 17, to: 18, box: { x: 70, y: -170, w: 430, h: 120 }, dmg: 5, kb: 2, lift: 0, stop: 3, stun: 20, fx: 'spark' },
      { from: 27, to: 28, box: { x: 70, y: -170, w: 430, h: 120 }, dmg: 5, kb: 2, lift: 0, stop: 3, stun: 20, fx: 'spark' },
      { from: 37, to: 38, box: { x: 70, y: -170, w: 430, h: 120 }, dmg: 7, kb: 6, lift: -3, stop: 6, stun: 26, fx: 'bolt' },
    ],
  },
  skyfall: {
    name: 'Skyfall Strike',
    frames: 70,
    face: 'attack',
    keys: [
      [0, STANCE],
      [14, { fu: 178, fl: 0, ffist: 0, bu: -30, bl: 80, lean: -8, y: 4 }],
      [44, { fu: 178, fl: 0, ffist: 0, bu: -30, bl: 80, lean: -8, y: 4 }],
      [52, { fu: 60, fl: 10, ffist: 1, lean: 16 }],
      [70, STANCE],
    ],
    charge: [[10, 44, 1]],
    aura: [[8, 44, 0.85]],
    events: [[14, 'mark'], [44, 'skybolt']],
  },
  rising: {
    name: 'Rising Volt',
    frames: 34,
    face: 'attack',
    limb: 'fw',
    keys: [
      [0, { ...STANCE }],
      [5, { y: 16, fu: -10, fl: 125, lean: 12, ftu: 40, ftl: -75, btu: -34, btl: -20 }],
      [9, { fu: 168, fl: 8, lean: -14, y: -14, x: 10, ftu: 22, ftl: -12, btu: -40, btl: -6, bu: -40, bl: 60 }],
      [17, { fu: 166, fl: 10, lean: -12, y: -10, x: 10, ftu: 22, ftl: -12, btu: -40, bu: -40, bl: 60 }],
      [34, STANCE],
    ],
    move: [[2, 10, 7]],
    charge: [[4, 16, 0.8]],
    hits: [{ from: 8, to: 12, box: { x: 10, y: -250, w: 150, h: 240 }, dmg: 10, kb: 3, lift: -17, stop: 8, stun: 42, fx: 'bolt' }],
  },
  thunderGod: {
    name: 'Thunder God (ultimate)',
    frames: 150,
    face: 'attack',
    keys: [
      [0, STANCE],
      [14, { y: 18, lean: 2, fu: 38, fl: 25, bu: -38, bl: 25, ftu: 40, ftl: -42, btu: -40, btl: -34, head: -6 }],
      [55, { y: 20, lean: 2, fu: 40, fl: 22, bu: -40, bl: 22, ftu: 40, ftl: -42, btu: -40, btl: -34, head: -10 }],
      [62, { fu: 176, fl: 0, ffist: 0, bu: -40, bl: 40, lean: -10, y: 4, ftu: 26, btu: -26 }],
      [112, { fu: 176, fl: 0, ffist: 0, bu: -40, bl: 40, lean: -10, y: 4, ftu: 26, btu: -26 }],
      [120, { fu: 75, fl: 5, ffist: 0, lean: 16, x: 8 }],
      [150, STANCE],
    ],
    charge: [[0, 125, 1]],
    aura: [[0, 58, 1.1], [59, 125, 0.6]],
    dim: [0, 132],
    events: [[56, 'ultCall'], [62, 'ultBolt'], [72, 'ultBolt'], [82, 'ultBolt'], [92, 'ultBolt'], [102, 'ultBolt'], [114, 'ultFinal']],
  },
  hurt: {    name: 'Hurt',
    frames: 22,
    face: 'hurt',
    keys: [
      [0, { lean: -24, head: -22, fu: -30, fl: 40, bu: -50, bl: 40, ftu: 20, ftl: -30, btu: -20, btl: -10, x: -6, ffist: 0, bfist: 0 }],
      [10, { lean: -14, head: -10, fu: 0, fl: 60, bu: -20, bl: 60 }],
      [22, STANCE],
    ],
  },
  ko: {
    name: 'KO fall',
    frames: 120,
    face: 'ko',
    keys: [
      [0, { lean: -30, head: -30, fu: -60, fl: 20, bu: -90, bl: 10, ftu: 40, ftl: -20, btu: 20, btl: -10, ffist: 0, bfist: 0 }],
      [18, { rot: -80, y: 0, lean: -10, head: -20, fu: -160, fl: 10, bu: -130, bl: 20, ftu: 30, ftl: -10, btu: 10, btl: -5, ffist: 0, bfist: 0 }],
      [80, { rot: -88, y: 0, lean: -10, head: -25, fu: -165, fl: 10, bu: -135, bl: 20, ftu: 30, ftl: -10, btu: 10, btl: -5, ffist: 0, bfist: 0 }],
      [100, { rot: -30, y: 30, lean: 20, ftu: 80, ftl: -120, btu: 40, btl: -110, fu: 40, fl: 30, bu: 30, bl: 40 }],
      [120, STANCE],
    ],
  },
  victory: {
    name: 'Victory',
    frames: 90,
    face: 'attack',
    loop: true,
    keys: [
      [0, STANCE],
      [12, { fu: 132, fl: 40, lean: -6, bu: -40, bl: 75, ftu: 22, ftl: -8, btu: -22, btl: -4, y: -4 }],
      [45, { fu: 128, fl: 48, lean: -4, bu: -40, bl: 75, ftu: 22, ftl: -8, btu: -22, btl: -4, y: 0 }],
      [60, { fu: 134, fl: 36, lean: -6, bu: -40, bl: 75, ftu: 22, ftl: -8, btu: -22, btl: -4, y: -4 }],
      [90, { fu: 132, fl: 40, lean: -6, bu: -40, bl: 75, ftu: 22, ftl: -8, btu: -22, btl: -4, y: -2 }],
    ],
    charge: [[0, 90, 0.5]],
    aura: [[0, 90, 0.35]],
  },
  taunt: {
    name: 'Taunt',
    frames: 60,
    face: 'normal',
    keys: [
      [0, STANCE],
      [10, { fu: 140, fl: 40, ffist: 0, lean: -4, head: 10 }],
      [20, { fu: 150, fl: 10, ffist: 0, lean: -4, head: 10 }],
      [30, { fu: 140, fl: 40, ffist: 0, lean: -4, head: 10 }],
      [40, { fu: 150, fl: 10, ffist: 0, lean: -4, head: 10 }],
      [60, STANCE],
    ],
  },
};
export const COMBO = ['jab', 'cross', 'kick', 'rising'];
export { BASE };
