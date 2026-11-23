/**
 * Animations for the Hero Trial. The procedural loops and the normal attacks (combo, heavy, dash) reuse the Lightning
 * lab's data (same skeleton, same frame data) so every hero moves with the same weight. Every power and every ultimate
 * has its own clip, built the way Lightning's moves are: a wind-up that loads the opposite way, a fast strike, a
 * follow-through that overshoots and settles, holds that keep drifting, and a slow recovery to the stance.
 * Power effects are spawned by events (see lab.ts); the clips carry pose and timing.
 */
import { CLIPS as L, airPose, auraAt, chargeAt, guardPose, idlePose, moveAt, sample, walkPose, type Ease } from './base';
import type { Kit } from './kits';
import { pose, type Face, type Pose } from './rig';
export { airPose, auraAt, chargeAt, guardPose, idlePose, moveAt, sample, walkPose };

export type Status = 'burn' | 'slow' | 'freeze' | 'root' | 'float' | 'bubble' | 'stop' | 'dazzle';
export interface Hit {
  from: number;
  to: number;
  box: { x: number; y: number; w: number; h: number };
  dmg: number;
  kb: number;
  lift: number;
  stop: number;
  stun: number;
  fx: 'spark' | 'bolt' | 'big';
  status?: Status;
  /** frames of the status */
  dur?: number;
}
type Key = [number, Partial<Pose>, Ease?];
export interface Clip {
  name: string;
  frames: number;
  keys: Key[];
  face: Face;
  loop?: boolean;
  move?: Array<[number, number, number]>;
  hits?: Hit[];
  cancel?: number;
  charge?: Array<[number, number, number]>;
  events?: Array<[number, string]>;
  limb?: 'fw' | 'bw' | 'fa';
  aura?: Array<[number, number, number]>;
  dim?: [number, number];
  /** render-only spin: the body turns round every 4 frames in this window (spinning kicks) */
  spin?: [number, number];
  /** the fighter does not flinch when hit during this window (armour) */
  armor?: [number, number];
  /** invulnerable window */
  invuln?: [number, number];
  /** power cost (shown in the panel) */
  mp?: number;
}

const STANCE = pose({});
const clone = (c: object): Clip => JSON.parse(JSON.stringify(c)) as Clip;
const clip = (name: string, frames: number, keys: Key[], extra: Partial<Clip> = {}): Clip => ({ name, frames, face: 'attack', keys, ...extra });

// ---- shared leg shapes (merged into a pose) ----
/** wide braced stance, front knee bent, back leg pushing */
const BRACE = { ftu: 48, ftl: -40, btu: -44, btl: -10 };
/** lunge: front knee deep, back leg long */
const LUNGE = { ftu: 56, ftl: -34, btu: -46, btl: -6 };
/** squat, both knees loaded */
const SQUAT = { ftu: 46, ftl: -76, btu: -38, btl: -46 };
/** kneel: front foot planted, back knee down */
const KNEEL = { ftu: 74, ftl: -114, btu: -14, btl: -86 };
/** tall: legs nearly straight (rising up) */
const TALL = { ftu: 28, ftl: -8, btu: -28, btl: -4 };

/**
 * Ultimate on Thunder God's timing (events at fixed frames): gather low with a slow breath, call, then one beat of the
 * arms on every strike (a -> b lands on the strike frame), a big wind-up and the final blow, then a slow recovery.
 */
interface UltPoses {
  gather: Partial<Pose>;
  call: Partial<Pose>;
  a: Partial<Pose>;
  b: Partial<Pose>;
  wind: Partial<Pose>;
  final: Partial<Pose>;
}
function ultimate(name: string, u: UltPoses): Clip {
  const deep = { ...u.gather, y: (u.gather.y ?? 0) + 5, head: (u.gather.head ?? 0) + 4 };
  const keys: Key[] = [
    [0, STANCE],
    [14, u.gather, 'io'],
    [36, deep, 'io'],
    [52, u.gather, 'io'],
    [58, u.call, 'out'],
  ];
  for (const h of [62, 72, 82, 92, 102]) {
    if (h > 62) keys.push([h - 5, u.a, 'io']);
    keys.push([h, u.b, 'out']);
  }
  keys.push([110, u.wind, 'io'], [114, u.final, 'out'], [124, { ...u.final, y: (u.final.y ?? 0) - 2 }, 'io'], [150, STANCE, 'io']);
  return {
    name: `${name} (ultimate)`,
    frames: 150,
    face: 'attack',
    keys,
    charge: [[0, 125, 1]],
    aura: [[0, 58, 1.1], [59, 125, 0.6]],
    dim: [0, 132],
    events: [[2, 'ultStart'], [56, 'ultCall'], [62, 'ultHit'], [72, 'ultHit'], [82, 'ultHit'], [92, 'ultHit'], [102, 'ultHit'], [114, 'ultFinal']],
  };
}

const ULTS: Record<Kit['id'], UltPoses> = {
  // arms raise a crown of fire, then each arm throws a fireball down at the foe
  fire: {
    gather: { y: 18, lean: 6, fu: 30, fl: 120, bu: -20, bl: 120, ...SQUAT, head: 8 },
    call: { y: -4, lean: -10, fu: 170, fl: 10, ffist: 0, bu: 160, bl: 20, bfist: 0, head: -12, ...TALL },
    a: { y: -2, lean: -8, fu: 165, fl: 20, ffist: 0, bu: 150, bl: 30, bfist: 0, head: -10, ...TALL },
    b: { y: 6, lean: 14, x: 6, fu: 70, fl: 0, ffist: 0, bu: 155, bl: 24, bfist: 0, head: 4, ...BRACE },
    wind: { y: -6, lean: -12, fu: 172, fl: 6, ffist: 0, bu: 162, bl: 14, bfist: 0, head: -14, ...TALL },
    final: { y: 12, lean: 22, x: 12, fu: 85, fl: 0, ffist: 0, bu: 75, bl: 10, bfist: 0, head: 6, ...LUNGE },
  },
  // the arms stir the whirlpool, sweeping in turn, then both push the wave out
  water: {
    gather: { y: 16, lean: 8, fu: 20, fl: 40, ffist: 0, bu: -50, bl: 40, bfist: 0, ...SQUAT, head: 8 },
    call: { y: 4, lean: -4, fu: 120, fl: 20, ffist: 0, bu: -130, bl: 20, bfist: 0, head: -6, ...BRACE },
    a: { y: 4, lean: -6, fu: 150, fl: 40, ffist: 0, bu: -60, bl: 60, bfist: 0, head: -6, ...BRACE },
    b: { y: 8, lean: 12, x: 6, fu: 60, fl: 10, ffist: 0, bu: 110, bl: 30, bfist: 0, head: 4, ...BRACE },
    wind: { y: -4, lean: -10, fu: 170, fl: 10, ffist: 0, bu: 160, bl: 10, bfist: 0, head: -10, ...TALL },
    final: { y: 14, lean: 24, x: 12, fu: 70, fl: 0, ffist: 0, bu: 60, bl: 10, bfist: 0, head: 6, ...LUNGE },
  },
  // arms crossed in the cold, flung open, then palms strike the floor for every spike, kneel for the last
  ice: {
    gather: { y: 16, lean: 8, fu: 100, fl: 130, bu: 110, bl: 130, head: 12, ...SQUAT },
    call: { y: -2, lean: -8, fu: 120, fl: 10, ffist: 0, bu: -120, bl: 10, bfist: 0, head: -10, ...TALL },
    a: { y: 8, lean: 14, fu: 70, fl: 20, ffist: 0, bu: -40, bl: 70, head: 6, ...BRACE },
    b: { y: 22, lean: 30, fu: 34, fl: 0, ffist: 0, bu: -60, bl: 60, head: 12, ...SQUAT },
    wind: { y: -6, lean: -8, fu: 170, fl: 10, ffist: 0, bu: 160, bl: 20, bfist: 0, head: -10, ...TALL },
    final: { y: 36, lean: 34, fu: 40, fl: 0, ffist: 0, bu: 30, bl: 10, bfist: 0, head: 16, ...KNEEL },
  },
  // the arms wheel round and round to drive the storm, then a palm thrust
  wind: {
    gather: { y: 14, lean: 2, fu: 60, fl: 100, bu: -60, bl: 100, ...SQUAT, head: 6 },
    call: { y: -6, lean: -6, fu: 150, fl: 30, ffist: 0, bu: -140, bl: 30, bfist: 0, head: -8, ...TALL },
    a: { x: -4, lean: -10, fu: 140, fl: 30, ffist: 0, bu: -40, bl: 90, bfist: 0, head: -6, ...BRACE },
    b: { x: 8, lean: 16, fu: 40, fl: 20, ffist: 0, bu: 130, bl: 30, bfist: 0, head: 4, ...BRACE },
    wind: { y: -4, lean: -12, fu: 160, fl: 40, ffist: 0, bu: -150, bl: 30, bfist: 0, head: -10, ...TALL },
    final: { y: 6, lean: 24, x: 16, fu: 92, fl: 0, ffist: 0, bu: -60, bl: 50, head: 2, ...LUNGE },
  },
  // fists raised, then a knee-up and a stomp for every falling boulder, a double fist into the ground to end
  earth: {
    gather: { y: 22, lean: 20, fu: 20, fl: 100, bu: -10, bl: 110, ...SQUAT, ftl: -86, head: 10 },
    call: { y: -6, lean: -10, fu: 170, fl: 30, bu: 160, bl: 40, head: -10, ...TALL },
    a: { y: -2, lean: -6, ftu: 100, ftl: -100, btu: -10, btl: -6, fu: 120, fl: 40, bu: -100, bl: 50, head: -4 },
    b: { y: 22, lean: 18, x: 4, ftu: 60, ftl: -60, btu: -40, btl: -40, fu: 40, fl: 70, bu: -40, bl: 90, head: 8 },
    wind: { y: -8, lean: -12, fu: 172, fl: 30, bu: 162, bl: 40, head: -12, ...TALL },
    final: { y: 30, lean: 36, x: 10, fu: 40, fl: 10, bu: 30, bl: 20, head: 14, ftu: 64, ftl: -100, btu: -30, btl: -70 },
  },
  // kneels with the palms on the soil, rises with open arms and conducts the bloom
  leaf: {
    gather: { y: 30, lean: 30, fu: 50, fl: 0, ffist: 0, bu: 40, bl: 10, bfist: 0, head: 14, ...KNEEL },
    call: { y: -2, lean: -8, fu: 140, fl: 40, ffist: 0, bu: 130, bl: 50, bfist: 0, head: -8, ...TALL },
    a: { y: 4, lean: -2, fu: 125, fl: 40, ffist: 0, bu: -60, bl: 60, bfist: 0, head: -4, ...BRACE },
    b: { y: 6, lean: 10, x: 4, fu: 80, fl: 10, ffist: 0, bu: -40, bl: 80, bfist: 0, head: 4, ...BRACE },
    wind: { y: -4, lean: -10, fu: 160, fl: 20, ffist: 0, bu: 150, bl: 30, bfist: 0, head: -10, ...TALL },
    final: { y: 8, lean: 16, x: 10, fu: 90, fl: 0, ffist: 0, bu: 80, bl: 10, bfist: 0, head: 4, ...BRACE },
  },
  // hands gather light at the chest, open wide, then point every ray down
  light: {
    gather: { y: 14, lean: 6, fu: 100, fl: 130, ffist: 0, bu: 110, bl: 130, bfist: 0, head: 12, ...SQUAT },
    call: { y: -6, lean: -10, fu: 140, fl: 10, ffist: 0, bu: -140, bl: 10, bfist: 0, head: -14, ...TALL },
    a: { y: -2, lean: -8, fu: 160, fl: 10, ffist: 0, bu: -60, bl: 70, bfist: 0, head: -8, ...TALL },
    b: { y: 4, lean: 12, x: 6, fu: 70, fl: 0, ffist: 0, bu: -50, bl: 80, bfist: 0, head: 4, ...BRACE },
    wind: { y: -8, lean: -12, fu: 150, fl: 6, ffist: 0, bu: -150, bl: 6, bfist: 0, head: -14, ...TALL },
    final: { y: 10, lean: 18, x: 10, fu: 90, fl: 0, ffist: 0, bu: 80, bl: 20, bfist: 0, head: 4, ...LUNGE },
  },
  // the open hand reaches for the foe and squeezes on every beat, then crushes it into the floor
  gravity: {
    gather: { y: 18, lean: 10, fu: 80, fl: 120, ffist: 1, bu: -40, bl: 120, head: 8, ...SQUAT },
    call: { x: 6, lean: 12, fu: 100, fl: 10, ffist: 0, bu: -40, bl: 90, head: 4, ...BRACE },
    a: { x: 6, y: 4, lean: 10, fu: 104, fl: 14, ffist: 0, bu: -40, bl: 90, head: 4, ...BRACE },
    b: { x: -2, y: 8, lean: -2, fu: 92, fl: 60, ffist: 1, bu: -50, bl: 100, head: -2, ...BRACE },
    wind: { y: -6, lean: -10, fu: 170, fl: 20, ffist: 1, bu: -50, bl: 80, head: -12, ...TALL },
    final: { y: 22, lean: 30, x: 8, fu: 40, fl: 20, ffist: 1, bu: -50, bl: 100, head: 10, ...SQUAT },
  },
  // the arm is the clock hand: it ticks down from twelve on every strike, then a sweep restarts time
  time: {
    gather: { y: 10, lean: 4, fu: 120, fl: 60, ffist: 0, bu: -40, bl: 100, head: 10, ...SQUAT },
    call: { y: -2, lean: -8, fu: 175, fl: 0, ffist: 0, bu: -40, bl: 80, head: -10, ...TALL },
    a: { y: 0, lean: -6, fu: 165, fl: 0, ffist: 0, bu: -40, bl: 80, head: -8, ...TALL },
    b: { y: 2, lean: -2, fu: 140, fl: 0, ffist: 0, bu: -40, bl: 80, head: -6, ...BRACE },
    wind: { y: -4, lean: -10, fu: 178, fl: 0, ffist: 0, bu: -50, bl: 70, head: -12, ...TALL },
    final: { y: 8, lean: 20, x: 10, fu: 60, fl: 0, ffist: 0, bu: -60, bl: 60, head: 6, ...LUNGE },
  },
};

export function makeClips(k: Kit): Record<string, Clip> {
  const n = (key: string, name: string): Clip => ({ ...clone(L[key]), name });
  const C: Record<string, Clip> = {
    jab: n('jab', 'Jab'),
    cross: n('cross', 'Cross'),
    kick: n('kick', k.kick),
    rising: n('rising', k.rising),
    heavy: { ...n('heavy', k.heavy), mp: 0 },
    dash: n('dash', k.dash),
    hurt: n('hurt', 'Hurt'),
    ko: n('ko', 'KO fall'),
    victory: n('victory', 'Victory'),
    taunt: n('taunt', 'Taunt'),
  };
  const [p1, p2, p3] = k.powers;
  const power = (p: typeof p1, c: Clip) => (C[p.clip] = { ...c, name: p.name, mp: p.mp });
  switch (k.id) {
    case 'fire':
      // Hot Shot: both hands drawn back to the hip, a stepping two-palm push, the push kicks up and settles
      power(p1, clip(p1.name, 38, [
        [0, STANCE],
        [9, { y: 10, x: -4, lean: -10, fu: -20, fl: 120, bu: -40, bl: 110, head: -4, ftu: 40, ftl: -50, btu: -36, btl: -20 }, 'io'],
        [13, { y: 8, x: 12, lean: 16, fu: 90, fl: 0, ffist: 0, bu: 80, bl: 20, bfist: 0, ...LUNGE }],
        [18, { y: 6, x: 8, lean: 8, fu: 102, fl: 8, ffist: 0, bu: 72, bl: 28, bfist: 0, ...LUNGE }, 'back'],
        [26, { y: 4, x: 4, lean: 8, fu: 80, fl: 34, ffist: 0, bu: 30, bl: 70, ...BRACE }, 'io'],
        [38, STANCE, 'io'],
      ], { charge: [[0, 16, 0.8]], aura: [[0, 13, 0.45]], events: [[13, 'shoot']] }));
      // Scorch Dash: a low coil, the burst with the flaming fist in front, a skidding brake at the end
      power(p2, clip(p2.name, 34, [
        [0, STANCE],
        [6, { y: 16, lean: 26, fu: 20, fl: 120, bu: -60, bl: 100, head: 6, ftu: 44, ftl: -80, btu: -30, btl: -50 }, 'io'],
        [10, { y: 8, x: 6, lean: 40, fu: 95, fl: 6, ffist: 1, bu: -80, bl: 40, ftu: 50, ftl: -90, btu: -50, btl: -40 }],
        [24, { y: 6, x: 6, lean: 34, fu: 90, fl: 12, bu: -75, bl: 50, ftu: 30, ftl: -70, btu: -40, btl: -60 }, 'io'],
        [29, { y: 14, x: -6, lean: -12, fu: 50, fl: 80, bu: -50, bl: 90, head: -6, ftu: 56, ftl: -30, btu: -46, btl: -24 }],
        [34, STANCE, 'io'],
      ], {
        move: [[9, 25, 15]],
        invuln: [9, 14],
        limb: 'fw',
        charge: [[0, 26, 1]],
        aura: [[0, 9, 0.6]],
        events: [[9, 'trail']],
        hits: [{ from: 10, to: 25, box: { x: 20, y: -170, w: 130, h: 170 }, dmg: 12, kb: 7, lift: -5, stop: 6, stun: 32, fx: 'bolt', status: 'burn', dur: 120 }],
      }));
      // Furnace Rise: point at the floor under the foe, sink and load both fists, fling both arms up as the column erupts
      power(p3, clip(p3.name, 62, [
        [0, STANCE],
        [10, { x: 2, lean: 6, fu: 30, fl: 60, ffist: 0, head: 6 }, 'io'],
        [14, { x: 4, lean: 12, fu: 55, fl: 0, ffist: 0, bu: -40, bl: 90, head: 10, ...BRACE }],
        [22, { x: 4, lean: 10, fu: 50, fl: 10, ffist: 0, bu: -40, bl: 90, head: 8, ...BRACE }, 'io'],
        [31, { y: 18, lean: 14, fu: -10, fl: 120, bu: -30, bl: 120, head: 8, ...SQUAT }, 'io'],
        [34, { y: -6, x: 4, lean: -12, fu: 165, fl: 10, ffist: 0, bu: 150, bl: 20, bfist: 0, head: -12, ...TALL }],
        [46, { y: 0, x: 2, lean: -8, fu: 158, fl: 18, ffist: 0, bu: 142, bl: 26, bfist: 0, head: -8, ...TALL }, 'io'],
        [62, STANCE, 'io'],
      ], { charge: [[0, 50, 1]], aura: [[0, 34, 0.8]], events: [[14, 'mark'], [34, 'column']] }));
      break;
    case 'water':
      // Jet Lance: arms swing down and back, then the front arm fires with the back hand bracing it; the jet pushes back
      power(p1, clip(p1.name, 46, [
        [0, STANCE],
        [10, { y: 8, lean: -6, fu: -30, fl: 80, bu: -50, bl: 80, head: -2, ftu: 40, ftl: -40, btu: -36, btl: -14 }, 'io'],
        [14, { y: 10, x: 8, lean: 14, fu: 90, fl: 0, ffist: 0, bu: 72, bl: 30, bfist: 0, ...BRACE }],
        [22, { y: 12, x: 2, lean: 8, fu: 93, fl: 2, ffist: 0, bu: 70, bl: 34, bfist: 0, ...BRACE }, 'io'],
        [30, { y: 10, x: 4, lean: 12, fu: 89, fl: 0, ffist: 0, bu: 73, bl: 30, bfist: 0, ...BRACE }, 'io'],
        [36, { y: 6, lean: 2, fu: 80, fl: 30, ffist: 0, bu: 30, bl: 80, ...BRACE }, 'io'],
        [46, STANCE, 'io'],
      ], { charge: [[0, 34, 0.8]], aura: [[0, 14, 0.45]], events: [[14, 'jet'], [32, 'jetEnd']] }));
      // Undertow: sink low with both arms swung back, a low two-arm sweep along the floor sends the wave
      power(p2, clip(p2.name, 52, [
        [0, STANCE],
        [12, { y: 20, x: -4, lean: 20, fu: -50, fl: 40, ffist: 0, bu: -70, bl: 40, bfist: 0, head: 8, ftu: 50, ftl: -80, btu: -40, btl: -40 }, 'io'],
        [19, { y: 22, x: 14, lean: 34, fu: 60, fl: 0, ffist: 0, bu: 50, bl: 10, bfist: 0, head: 10, ftu: 56, ftl: -86, btu: -46, btl: -30 }],
        [26, { y: 16, x: 14, lean: 26, fu: 82, fl: 10, ffist: 0, bu: 70, bl: 20, bfist: 0, head: 6, ftu: 54, ftl: -70, btu: -46, btl: -24 }, 'back'],
        [38, { y: 6, x: 6, lean: 10, fu: 70, fl: 50, bu: 10, bl: 70, ...BRACE }, 'io'],
        [52, STANCE, 'io'],
      ], { charge: [[2, 22, 1]], aura: [[0, 18, 0.75]], events: [[19, 'slam']] }));
      // Bubble Lock: the hands cup a bubble at the chest and push it off gently
      power(p3, clip(p3.name, 44, [
        [0, STANCE],
        [11, { y: 6, lean: -2, fu: 40, fl: 110, ffist: 0, bu: 40, bl: 120, bfist: 0, head: 6 }, 'io'],
        [16, { y: 6, x: 6, lean: 10, fu: 85, fl: 20, ffist: 0, bu: 75, bl: 30, bfist: 0, ...BRACE }],
        [22, { y: 4, x: 8, lean: 12, fu: 95, fl: 10, ffist: 0, bu: 82, bl: 22, bfist: 0, ...BRACE }, 'back'],
        [32, { y: 2, x: 4, lean: 6, fu: 80, fl: 40, ffist: 0, bu: 50, bl: 60, bfist: 0, ...BRACE }, 'io'],
        [44, STANCE, 'io'],
      ], { charge: [[0, 20, 0.8]], aura: [[0, 16, 0.45]], events: [[16, 'shoot']] }));
      break;
    case 'ice':
      // Rime Dart: the hand cocks by the ear and flicks the shard out, follows through low
      power(p1, clip(p1.name, 32, [
        [0, STANCE],
        [7, { y: 4, lean: -8, fu: 150, fl: 110, ffist: 0, bu: -50, bl: 80, head: -4 }, 'io'],
        [10, { x: 8, lean: 16, fu: 88, fl: 0, ffist: 0, bu: -60, bl: 60, ftu: 40, ftl: -30, btu: -38, btl: -8 }],
        [15, { x: 10, lean: 20, fu: 60, fl: 10, ffist: 0, bu: -60, bl: 70, head: 6, ftu: 44, ftl: -32, btu: -40, btl: -8 }, 'back'],
        [32, STANCE, 'io'],
      ], { charge: [[0, 14, 0.8]], aura: [[0, 10, 0.45]], events: [[10, 'shoot']] }));
      // Glacier Gate: reach down to the floor ahead, then sweep the palm up as the wall rises
      power(p2, clip(p2.name, 40, [
        [0, STANCE],
        [7, { y: 14, lean: 18, fu: 20, fl: 20, ffist: 0, bu: -40, bl: 60, head: 10, ftu: 46, ftl: -60, btu: -36, btl: -30 }, 'io'],
        [10, { y: 2, x: 4, lean: 0, fu: 120, fl: 30, ffist: 0, bu: -40, bl: 80, head: -6, ...BRACE }],
        [14, { y: 0, x: 4, lean: 4, fu: 112, fl: 20, ffist: 0, bu: -40, bl: 80, head: -4, ...BRACE }, 'back'],
        [30, { y: 2, x: 2, lean: 2, fu: 100, fl: 40, ffist: 0, bu: -40, bl: 90, ...BRACE }, 'io'],
        [40, STANCE, 'io'],
      ], { charge: [[0, 20, 0.8]], aura: [[0, 16, 0.5]], events: [[10, 'cast']] }));
      // Permafrost: rise on the toes with both arms high, drop to one knee and slap both palms on the ice
      power(p3, clip(p3.name, 52, [
        [0, STANCE],
        [12, { y: -8, lean: -6, fu: 170, fl: 10, ffist: 0, bu: 160, bl: 20, bfist: 0, head: -8, ...TALL }, 'io'],
        [19, { y: 36, x: 6, lean: 30, fu: 40, fl: 0, ffist: 0, bu: 30, bl: 10, bfist: 0, head: 16, ...KNEEL }, 'in'],
        [24, { y: 34, x: 6, lean: 26, fu: 44, fl: 6, ffist: 0, bu: 34, bl: 14, bfist: 0, head: 12, ...KNEEL }, 'back'],
        [36, { y: 30, x: 4, lean: 24, fu: 46, fl: 10, ffist: 0, bu: 36, bl: 16, bfist: 0, head: 10, ...KNEEL }, 'io'],
        [52, STANCE, 'io'],
      ], { charge: [[2, 20, 1]], aura: [[0, 22, 0.9]], events: [[19, 'slam']] }));
      break;
    case 'wind': {
      // Breeze Shove: pull the palm in, then a stepping palm thrust
      power(p1, clip(p1.name, 36, [
        [0, STANCE],
        [8, { y: 6, x: -6, lean: -10, fu: 40, fl: 120, ffist: 0, bu: -50, bl: 80, ftu: 30, ftl: -30, btu: -40, btl: -10 }, 'io'],
        [11, { y: 4, x: 16, lean: 22, fu: 92, fl: 0, ffist: 0, bu: -60, bl: 50, ...LUNGE }],
        [16, { y: 4, x: 14, lean: 18, fu: 98, fl: 6, ffist: 0, bu: -60, bl: 56, ...LUNGE }, 'back'],
        [26, { y: 2, x: 6, lean: 8, fu: 80, fl: 30, ffist: 0, bu: -40, bl: 90, ...BRACE }, 'io'],
        [36, STANCE, 'io'],
      ], {
        charge: [[0, 15, 0.8]],
        aura: [[0, 11, 0.45]],
        events: [[11, 'shoot']],
        hits: [{ from: 11, to: 16, box: { x: 40, y: -200, w: 210, h: 200 }, dmg: 9, kb: 16, lift: -5, stop: 6, stun: 30, fx: 'bolt' }],
      }));
      // Whirl Kick: a crouch, the hop into the spin with the kicking leg out, the leg bobs while spinning, a landing crouch
      const hits: Hit[] = [];
      for (let i = 0; i < 6; i++) hits.push({ from: 8 + i * 5, to: 9 + i * 5, box: { x: -60, y: -160, w: 230, h: 160 }, dmg: i === 5 ? 6 : 3, kb: i === 5 ? 9 : 4.6, lift: i === 5 ? -9 : 0, stop: 3, stun: 22, fx: i === 5 ? 'bolt' : 'spark' });
      const spinA = { ftu: 96, ftl: -4, lean: -14, fu: -40, fl: 40, bu: 60, bl: 40, btu: -10, btl: -8, y: -24 };
      const spinB = { ftu: 90, ftl: -12, lean: -10, fu: -30, fl: 50, bu: 70, bl: 30, btu: -16, btl: -14, y: -30 };
      power(p2, clip(p2.name, 48, [
        [0, STANCE],
        [5, { y: 14, lean: 8, fu: 40, fl: 90, bu: -40, bl: 60, ...SQUAT }, 'io'],
        [10, spinA],
        [18, spinB, 'io'],
        [26, spinA, 'io'],
        [34, spinB, 'io'],
        [38, spinA, 'io'],
        [42, { y: 14, lean: 10, fu: 60, fl: 70, bu: -50, bl: 80, ...SQUAT }, 'in'],
        [48, STANCE, 'io'],
      ], { limb: 'fa', move: [[6, 38, 4.5]], spin: [8, 37], charge: [[6, 38, 0.8]], aura: [[0, 38, 0.5]], events: [[6, 'whirl']], hits }));
      // Razor Draft: three slashes of the hand, down, up and across, each one throws a blade
      power(p3, clip(p3.name, 46, [
        [0, STANCE],
        [8, { y: 4, lean: -8, fu: 160, fl: 40, ffist: 0, bu: -40, bl: 80 }, 'io'],
        [12, { x: 8, lean: 16, fu: 70, fl: 0, ffist: 0, bu: -50, bl: 80, ...BRACE }],
        [15, { x: 8, lean: 14, fu: 30, fl: 30, ffist: 0, bu: -50, bl: 80, ...BRACE }, 'io'],
        [18, { x: 10, lean: 4, fu: 120, fl: 0, ffist: 0, bu: -50, bl: 80, ...BRACE }],
        [21, { x: 8, lean: -2, fu: 150, fl: 60, ffist: 0, bu: 40, bl: 60, ...BRACE }, 'io'],
        [24, { x: 14, lean: 20, fu: 90, fl: 0, ffist: 0, bu: -70, bl: 40, ...LUNGE }],
        [30, { x: 12, lean: 16, fu: 86, fl: 6, ffist: 0, bu: -70, bl: 46, ...LUNGE }, 'back'],
        [46, STANCE, 'io'],
      ], { charge: [[0, 28, 0.8]], aura: [[0, 24, 0.45]], events: [[12, 'shoot'], [18, 'shoot'], [24, 'shoot']] }));
      break;
    }
    case 'earth': {
      // Boulder Lob: squat and scoop, heave the rock overhead, throw it forward and follow through
      power(p1, clip(p1.name, 42, [
        [0, STANCE],
        [5, { y: 22, lean: 24, fu: 30, fl: 20, ffist: 0, bu: 20, bl: 30, bfist: 0, head: 10, ftu: 50, ftl: -90, btu: -40, btl: -50 }, 'io'],
        [12, { y: -2, x: -4, lean: -16, fu: 175, fl: 30, ffist: 0, bu: 165, bl: 40, bfist: 0, head: -10, ...TALL }, 'io'],
        [16, { y: 4, x: 10, lean: 20, fu: 100, fl: 0, ffist: 0, bu: 95, bl: 10, bfist: 0, ...LUNGE }],
        [22, { y: 8, x: 12, lean: 26, fu: 70, fl: 10, ffist: 0, bu: 60, bl: 20, bfist: 0, head: 6, ...LUNGE }, 'back'],
        [42, STANCE, 'io'],
      ], { charge: [[0, 16, 0.8]], aura: [[0, 14, 0.5]], events: [[4, 'lift'], [16, 'shoot']] }));
      // Granite Fist: a deep coil with the back fist cocked, the armoured punch drives through, a heavy recovery
      power(p2, clip(p2.name, 48, [
        [0, STANCE],
        [14, { y: 12, x: -8, lean: -12, fu: 40, fl: 110, bu: -60, bl: 120, head: 4, ftu: 40, ftl: -50, btu: -40, btl: -24 }, 'io'],
        [19, { y: 6, x: 22, lean: 28, fu: -75, fl: 155, bu: 92, bl: 0, ...LUNGE, btu: -38, ftu: 40 }],
        [30, { y: 8, x: 24, lean: 26, fu: -70, fl: 150, bu: 88, bl: 6, ...LUNGE, btu: -38, ftu: 40 }, 'io'],
        [38, { y: 6, x: 10, lean: 10, fu: 30, fl: 100, bu: 20, bl: 100, ...BRACE }, 'io'],
        [48, STANCE, 'io'],
      ], {
        limb: 'bw',
        move: [[14, 20, 6]],
        armor: [0, 22],
        charge: [[0, 22, 1]],
        aura: [[0, 18, 0.7]],
        events: [[19, 'fist']],
        hits: [{ from: 19, to: 23, box: { x: 60, y: -150, w: 120, h: 90 }, dmg: 16, kb: 13, lift: -6, stop: 10, stun: 40, fx: 'big' }],
      }));
      // Groundbreak: the front knee lifts high, the stomp cracks the floor both ways
      power(p3, clip(p3.name, 52, [
        [0, STANCE],
        [13, { y: -6, lean: -4, ftu: 110, ftl: -110, btu: -10, btl: -6, fu: 120, fl: 40, bu: -110, bl: 40, head: -4 }, 'io'],
        [19, { y: 24, x: 6, lean: 18, ftu: 60, ftl: -60, btu: -40, btl: -40, fu: 40, fl: 60, bu: -40, bl: 90, head: 10 }, 'in'],
        [24, { y: 20, x: 6, lean: 16, ftu: 58, ftl: -56, btu: -40, btl: -36, fu: 44, fl: 64, bu: -40, bl: 94, head: 8 }, 'back'],
        [36, { y: 10, x: 4, lean: 10, fu: 50, fl: 80, bu: -40, bl: 110, ...BRACE }, 'io'],
        [52, STANCE, 'io'],
      ], { charge: [[2, 20, 1]], aura: [[0, 16, 0.75]], events: [[19, 'slam']] }));
      break;
    }
    case 'leaf':
      // Vine Snare: the arm whips the vine out, grips, then yanks it back with the whole body
      power(p1, clip(p1.name, 50, [
        [0, STANCE],
        [10, { y: 4, x: -4, lean: -10, fu: 160, fl: 60, ffist: 0, bu: -40, bl: 80 }, 'io'],
        [14, { x: 10, lean: 18, fu: 85, fl: 0, ffist: 0, bu: -50, bl: 70, ...BRACE }],
        [24, { x: 8, lean: 14, fu: 88, fl: 4, ffist: 1, bu: -50, bl: 70, ...BRACE }, 'io'],
        [30, { y: 10, x: -10, lean: -16, fu: 30, fl: 120, ffist: 1, bu: -60, bl: 60, head: -6, ftu: 24, ftl: -20, btu: -50, btl: -40 }],
        [38, { y: 8, x: -6, lean: -10, fu: 40, fl: 110, ffist: 1, bu: -50, bl: 80, head: -4, ftu: 26, ftl: -24, btu: -46, btl: -36 }, 'back'],
        [50, STANCE, 'io'],
      ], { charge: [[0, 30, 0.8]], aura: [[0, 14, 0.45]], events: [[14, 'vine'], [30, 'pull']] }));
      // Burr Mine: kneel, press the seed into the soil, rise
      power(p2, clip(p2.name, 36, [
        [0, STANCE],
        [9, { y: 32, lean: 34, fu: 54, fl: 20, ffist: 0, bu: -40, bl: 90, head: 14, ...KNEEL }, 'io'],
        [12, { y: 36, lean: 38, fu: 40, fl: 0, ffist: 0, bu: -40, bl: 90, head: 16, ...KNEEL }],
        [22, { y: 32, lean: 34, fu: 60, fl: 30, ffist: 0, bu: -40, bl: 90, head: 12, ...KNEEL }, 'io'],
        [36, STANCE, 'io'],
      ], { face: 'normal', aura: [[0, 12, 0.4]], events: [[12, 'mine']] }));
      // Thicket Rise: arms high, both palms slam the soil, rise with open arms as the roots grow
      power(p3, clip(p3.name, 60, [
        [0, STANCE],
        [16, { y: -4, lean: -6, fu: 150, fl: 30, ffist: 0, bu: 140, bl: 40, bfist: 0, head: -8, ...TALL }, 'io'],
        [22, { y: 30, x: 6, lean: 34, fu: 50, fl: 0, ffist: 0, bu: 40, bl: 10, bfist: 0, head: 14, ...KNEEL }, 'in'],
        [30, { y: 28, x: 6, lean: 30, fu: 54, fl: 6, ffist: 0, bu: 44, bl: 14, bfist: 0, head: 12, ...KNEEL }, 'back'],
        [42, { y: 2, lean: -4, fu: 140, fl: 40, ffist: 0, bu: 120, bl: 50, bfist: 0, head: -6, ...TALL }, 'io'],
        [60, STANCE, 'io'],
      ], { charge: [[0, 38, 1]], aura: [[0, 38, 0.8]], events: [[22, 'cast']] }));
      break;
    case 'light':
      // Bright Dart: a quick point, the shot kicks the hand up
      power(p1, clip(p1.name, 30, [
        [0, STANCE],
        [6, { lean: -6, fu: 60, fl: 90, ffist: 0, bu: -40, bl: 90, head: -2 }, 'io'],
        [9, { x: 6, lean: 12, fu: 92, fl: 0, ffist: 0, bu: -50, bl: 80, ...BRACE }],
        [13, { x: 4, lean: 8, fu: 100, fl: 4, ffist: 0, bu: -50, bl: 80, head: -4, ...BRACE }, 'back'],
        [30, STANCE, 'io'],
      ], { charge: [[0, 13, 0.8]], aura: [[0, 9, 0.45]], events: [[9, 'shoot']] }));
      // Sunlance: light gathered at the hip, a two-hand cannon braced against the beam's push
      power(p2, clip(p2.name, 56, [
        [0, STANCE],
        [12, { y: 10, x: -4, lean: -10, fu: 20, fl: 120, ffist: 0, bu: -10, bl: 130, bfist: 0, ftu: 40, ftl: -50, btu: -40, btl: -20 }, 'io'],
        [16, { y: 10, x: 10, lean: 16, fu: 90, fl: 0, ffist: 0, bu: 78, bl: 22, bfist: 0, ...BRACE }],
        [24, { y: 12, x: 4, lean: 10, fu: 92, fl: 2, ffist: 0, bu: 76, bl: 24, bfist: 0, ...BRACE }, 'io'],
        [32, { y: 11, x: 7, lean: 13, fu: 89, fl: 0, ffist: 0, bu: 79, bl: 20, bfist: 0, ...BRACE }, 'io'],
        [40, { y: 12, x: 3, lean: 9, fu: 92, fl: 2, ffist: 0, bu: 76, bl: 24, bfist: 0, ...BRACE }, 'io'],
        [46, { y: 6, lean: 0, fu: 70, fl: 40, ffist: 0, bu: 40, bl: 70, ...BRACE }, 'io'],
        [56, STANCE, 'io'],
      ], { charge: [[0, 44, 0.8]], aura: [[0, 16, 0.5]], events: [[16, 'beam'], [40, 'beamEnd']] }));
      // Shine Shield: arms cross over the chest, then fling wide open as the barrier lights up
      power(p3, clip(p3.name, 38, [
        [0, STANCE],
        [7, { y: 8, lean: 6, fu: 100, fl: 130, bu: 110, bl: 130, head: 10, ...SQUAT }, 'io'],
        [10, { y: -2, lean: -8, fu: 130, fl: 10, ffist: 0, bu: -130, bl: 10, bfist: 0, head: -10, ...TALL }],
        [16, { y: -2, lean: -6, fu: 124, fl: 16, ffist: 0, bu: -124, bl: 16, bfist: 0, head: -8, ...TALL }, 'back'],
        [28, { lean: -4, fu: 110, fl: 30, ffist: 0, bu: -100, bl: 30, bfist: 0, head: -4 }, 'io'],
        [38, STANCE, 'io'],
      ], { charge: [[0, 20, 0.8]], aura: [[0, 16, 0.5]], events: [[10, 'cast']] }));
      break;
    case 'gravity':
      // Grav Well: reach with the open palm, close the fist on the well and pull it in
      power(p1, clip(p1.name, 48, [
        [0, STANCE],
        [10, { x: 6, lean: 14, fu: 100, fl: 10, ffist: 0, bu: -40, bl: 90, ...BRACE }, 'io'],
        [14, { x: 6, lean: 10, fu: 96, fl: 30, ffist: 1, bu: -40, bl: 90, head: 6, ...BRACE }],
        [24, { y: 8, x: -6, lean: -10, fu: 60, fl: 110, ffist: 1, bu: -50, bl: 100, head: -4, ftu: 30, ftl: -30, btu: -46, btl: -30 }, 'io'],
        [34, { y: 8, x: -4, lean: -8, fu: 64, fl: 100, ffist: 1, bu: -50, bl: 100, head: -2, ftu: 30, ftl: -30, btu: -46, btl: -30 }, 'io'],
        [48, STANCE, 'io'],
      ], { charge: [[0, 34, 0.8]], aura: [[0, 14, 0.45]], events: [[14, 'well']] }));
      // Anchor Drop: the hand points up at the sky over the foe, then the fist drags the mass down
      power(p2, clip(p2.name, 58, [
        [0, STANCE],
        [10, { lean: -6, fu: 150, fl: 10, ffist: 0, bu: -40, bl: 80, head: -10 }, 'io'],
        [12, { lean: -6, fu: 155, fl: 0, ffist: 0, bu: -40, bl: 80, head: -10 }],
        [28, { y: -4, lean: -10, fu: 165, fl: 30, ffist: 1, bu: -40, bl: 80, head: -12, ...TALL }, 'io'],
        [32, { y: 18, lean: 26, fu: 40, fl: 30, ffist: 1, bu: -50, bl: 100, head: 10, ftu: 46, ftl: -70, btu: -40, btl: -40 }, 'in'],
        [38, { y: 14, lean: 22, fu: 44, fl: 34, ffist: 1, bu: -50, bl: 100, head: 8, ftu: 46, ftl: -64, btu: -40, btl: -36 }, 'back'],
        [58, STANCE, 'io'],
      ], { charge: [[0, 40, 1]], aura: [[0, 34, 0.8]], events: [[12, 'mark'], [32, 'drop']] }));
      // Weightless: sink with the palms low, then lift both palms up and rise on the toes
      power(p3, clip(p3.name, 54, [
        [0, STANCE],
        [14, { y: 14, lean: 10, fu: 40, fl: 80, ffist: 0, bu: 30, bl: 90, bfist: 0, head: 8, ...SQUAT }, 'io'],
        [20, { y: -10, lean: -10, fu: 150, fl: 30, ffist: 0, bu: 140, bl: 40, bfist: 0, head: -12, ...TALL }],
        [26, { y: -8, lean: -8, fu: 146, fl: 34, ffist: 0, bu: 136, bl: 44, bfist: 0, head: -10, ...TALL }, 'back'],
        [40, { y: -6, lean: -6, fu: 140, fl: 40, ffist: 0, bu: 130, bl: 50, bfist: 0, head: -8, ...TALL }, 'io'],
        [54, STANCE, 'io'],
      ], { charge: [[0, 36, 1]], aura: [[0, 36, 0.8]], events: [[20, 'cast']] }));
      break;
    case 'time':
      // Rewind Step: the hand turns back like a clock hand, the hero lands where it was and settles
      power(p1, clip(p1.name, 26, [
        [0, STANCE],
        [3, { lean: -4, fu: 120, fl: 50, ffist: 0, head: -4 }, 'io'],
        [4, { lean: -4, fu: 140, fl: 20, ffist: 0, head: -4 }],
        [10, { y: 10, lean: 10, fu: 60, fl: 30, ffist: 0, bu: -60, bl: 60, head: 6, ...SQUAT }, 'io'],
        [16, { y: 6, lean: 6, fu: 62, fl: 70, bu: -40, bl: 100, ...BRACE }, 'io'],
        [26, STANCE, 'io'],
      ], { face: 'normal', invuln: [0, 14], events: [[4, 'rewind']] }));
      // Tick Field: the arm sweeps from twelve down to the floor ahead, laying the field
      power(p2, clip(p2.name, 52, [
        [0, STANCE],
        [12, { lean: -8, fu: 175, fl: 0, ffist: 0, bu: -40, bl: 80, head: -10, ...TALL }, 'io'],
        [18, { y: 8, x: 8, lean: 18, fu: 45, fl: 0, ffist: 0, bu: -50, bl: 80, head: 8, ...BRACE }],
        [24, { y: 8, x: 8, lean: 16, fu: 40, fl: 4, ffist: 0, bu: -50, bl: 80, head: 8, ...BRACE }, 'back'],
        [36, { y: 6, x: 4, lean: 10, fu: 60, fl: 30, ffist: 0, bu: -40, bl: 100, ...BRACE }, 'io'],
        [52, STANCE, 'io'],
      ], { charge: [[0, 34, 1]], aura: [[0, 34, 0.8]], events: [[18, 'cast']] }));
      // Freeze Frame: the hand winds in, then shows the palm like a stop sign and holds it
      power(p3, clip(p3.name, 48, [
        [0, STANCE],
        [11, { y: 6, lean: -8, fu: 40, fl: 120, ffist: 0, bu: -40, bl: 90, head: -2 }, 'io'],
        [16, { x: 8, lean: 12, fu: 100, fl: 70, ffist: 0, bu: -50, bl: 80, ...BRACE }],
        [22, { x: 6, lean: 10, fu: 104, fl: 66, ffist: 0, bu: -50, bl: 80, ...BRACE }, 'back'],
        [34, { x: 6, lean: 10, fu: 100, fl: 72, ffist: 0, bu: -50, bl: 84, ...BRACE }, 'io'],
        [48, STANCE, 'io'],
      ], { charge: [[0, 20, 0.8]], aura: [[0, 16, 0.45]], events: [[16, 'shoot']] }));
      break;
  }
  C.ult = ultimate(k.ult, ULTS[k.id]);
  return C;
}
export const COMBO = ['jab', 'cross', 'kick', 'rising'];
