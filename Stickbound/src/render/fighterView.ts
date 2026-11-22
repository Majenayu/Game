// Chooses a pose, expression and alpha for a fighter from sim state, and keeps per-fighter render state
// (walk phase, cloth springs, previous hand position for smear trails).

import { ELEMENTS } from '../content/elements';
import { DEFAULT_LOOK, lookFromSeed, type Look } from '../content/looks';
import { getMove } from '../sim/step';
import type { Fighter } from '../sim/types';
import { mix, POSES, walkPose, type Expression, type Pose } from './rig';

export interface ViewState {
  walk: number;
  cloth: { x: number; y: number }[];
  prevHand: [number, number] | null;
  look: Look;
}

const looks = new Map<string, Look>();

export function registerLook(id: string, look: Look): void {
  looks.set(id, look);
}

export function lookOf(f: Fighter): Look {
  if (f.spec.look && looks.has(f.spec.look)) return looks.get(f.spec.look)!;
  if (f.spec.kind !== 'stick') return { ...DEFAULT_LOOK, back: 0, mouth: 5, eyes: 3, hat: f.spec.kind === 'boss' ? 5 : 0 };
  return f.spec.look ? lookFromSeed(hashStr(f.spec.look)) : DEFAULT_LOOK;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const ease = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));

export function poseFor(f: Fighter, v: ViewState, time: number): { pose: Pose; expr: Expression; alpha: number } {
  const zombie = f.spec.kind !== 'stick';
  const base = zombie ? POSES.zombie! : POSES.idle!;
  let pose: Pose = base;
  let expr: Expression = 'neutral';
  let alpha = 1;
  const low = f.hp * 100 < f.hpMax * 25;

  switch (f.st) {
    case 'move': {
      const mv = getMove(f.move ?? '');
      if (!mv) break;
      const key = POSES[mv.anim] ? mv.anim : 'cast';
      const wind = POSES[`${key}_w`] ?? POSES.cast_w!;
      const strike = POSES[key]!;
      const s = mv.startup;
      if (f.mf <= s) pose = mix(base, wind, ease(f.mf / Math.max(1, s)));
      else if (f.mf <= s + mv.active) pose = mix(wind, strike, ease((f.mf - s) / 2));
      else pose = mix(strike, base, ease((f.mf - s - mv.active) / Math.max(1, mv.recovery)));
      if (key === 'spin') pose = { ...pose, rot: f.mf * 34 };
      expr = mv.element ? 'determined' : 'angry';
      break;
    }
    case 'walk':
      v.walk += Math.abs(f.vx) / 3000;
      pose = zombie ? { ...walkPose(v.walk, false), aSh: 82, aEl: -6, bSh: 76, bEl: -10, lean: 14, head: 18 } : walkPose(v.walk, false);
      break;
    case 'dash':
      pose = POSES.rush!;
      expr = 'determined';
      break;
    case 'air':
      pose = f.vy < 0 ? POSES.air! : POSES.fall!;
      break;
    case 'guard':
      pose = POSES.guard!;
      expr = 'determined';
      break;
    case 'stun':
    case 'gbreak':
      pose = f.ground ? POSES.hurt! : { ...POSES.hurt!, rot: -25 };
      expr = f.st === 'gbreak' ? 'dizzy' : 'hurt';
      if (f.status.freeze > 0) expr = 'shocked';
      break;
    case 'down':
      pose = { ...POSES.hurt!, rot: -84, hipY: 10 };
      expr = 'dizzy';
      break;
    case 'ko':
      pose = f.ground ? { ...POSES.hurt!, rot: -86, hipY: 9 } : { ...POSES.hurt!, rot: -40 - Math.min(40, f.sf * 3) };
      expr = 'dizzy';
      break;
    case 'win':
      pose = POSES[`win${v.look.pose % 4}`] ?? POSES.win0!;
      expr = 'happy';
      break;
    case 'swapout':
      pose = POSES.swap!;
      alpha = Math.max(0, 1 - Math.max(0, f.sf - 6) / 10);
      break;
    case 'swapin':
      pose = mix(POSES.swap!, base, f.sf / 14);
      alpha = Math.min(1, 0.3 + f.sf / 10);
      expr = 'determined';
      break;
    default: {
      const br = Math.sin(time * 3 + f.id) * 1.4;
      pose = { ...base, hipY: base.hipY + br * 0.5, aEl: base.aEl + br * 2, bEl: base.bEl - br * 2 };
      expr = low ? 'scared' : 'neutral';
    }
  }
  if (f.status.freeze > 0) expr = 'shocked';
  return { pose, expr, alpha };
}

export function elementColors(f: Fighter, look: Look): [number, number] {
  const [m, l] = ELEMENTS[f.spec.element].color;
  const auraOverride = [0, 0xffffff, 0xff4d8d, 0x00e0ff, 0xffd84a, 0x9b6bff, 0x55ff8a][look.aura] ?? 0;
  return [auraOverride || m, l];
}
