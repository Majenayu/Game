// Frame data for every move, as data. Units: frames at 60 Hz; boxes in pixels relative to the fighter's feet
// (x forward, y up is negative); speeds in centi-pixels per frame (100 = 1 px per frame).

import type { ElementId } from './elementPrefs';

export type StatusId = 'burn' | 'slow' | 'freeze' | 'shock' | 'root' | 'weak' | 'float';
export const STATUS_IDS: StatusId[] = ['burn', 'slow', 'freeze', 'shock', 'root', 'weak', 'float'];

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HitDef {
  dmg: number;
  /** hitstun frames */
  stun: number;
  /** blockstun frames */
  block: number;
  kbx: number;
  kby: number;
  /** guard stamina drained when blocked (0 to 1000 scale) */
  guardDmg: number;
  status?: [StatusId, number];
  /** sends the target into the air (knockdown on landing) */
  launch?: boolean;
  /** only hits grounded targets */
  groundOnly?: boolean;
  /** knockback points toward the attacker */
  pull?: boolean;
  /** cannot be guarded (only used by statuses that already need a telegraph) */
  unblockable?: boolean;
}

export type EffectKind = 'proj' | 'zone' | 'wall' | 'trap' | 'strike';

export interface EffectDef {
  kind: EffectKind;
  /** spawn offset from the owner's feet (px, facing right) */
  dx: number;
  dy: number;
  /** spawn at the foe's x position instead of next to the owner */
  atFoe?: boolean;
  w: number;
  h: number;
  vx?: number;
  vy?: number;
  gravity?: number;
  life: number;
  /** frames before the effect becomes active (telegraph) */
  delay?: number;
  hit?: HitDef;
  /** frames between repeated hits on the same target (0 = hit once) */
  rehit?: number;
  /** hit several targets / pass through */
  pierce?: boolean;
  /** stops enemy projectiles */
  blocksProj?: boolean;
  /** stays with the owner */
  follow?: boolean;
  /** only hits targets standing on the floor */
  groundOnly?: boolean;
  /** visual key for the renderer */
  look: string;
}

export type Special = 'teleportBehind' | 'recall' | 'barrier' | 'stunFoe' | 'heal';

export interface MoveDef {
  id: string;
  name: string;
  element?: ElementId;
  startup: number;
  active: number;
  recovery: number;
  box?: Box;
  hit?: HitDef;
  /** repeated hits during the active window (interval in frames) */
  multi?: number;
  /** MP cost (0 to 100) */
  mp?: number;
  /** own movement during startup+active (cpx/frame) */
  selfVx?: number;
  selfVy?: number;
  /** super armor from frame 1 to this frame */
  armor?: number;
  /** invulnerable frames [from, to] */
  invuln?: [number, number];
  /** effect spawned at the first active frame */
  spawn?: EffectDef;
  special?: Special;
  /** value for specials (heal amount, stun frames ...) */
  value?: number;
  /** animation key */
  anim: string;
  /** air move: ends when landing */
  air?: boolean;
}

const B = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });

// ---- basic moves --------------------------------------------------------------------------------------------

export const BASIC: Record<string, MoveDef> = {
  jab1: { id: 'jab1', name: 'Jab', startup: 4, active: 3, recovery: 10, box: B(8, -100, 50, 28), hit: { dmg: 34, stun: 17, block: 10, kbx: 260, kby: 0, guardDmg: 55 }, anim: 'jab1' },
  jab2: { id: 'jab2', name: 'Cross', startup: 5, active: 3, recovery: 11, box: B(8, -98, 54, 28), hit: { dmg: 36, stun: 18, block: 11, kbx: 300, kby: 0, guardDmg: 60 }, anim: 'jab2' },
  jab4: { id: 'jab4', name: 'Knee', startup: 6, active: 3, recovery: 12, box: B(6, -78, 48, 32), hit: { dmg: 40, stun: 19, block: 11, kbx: 320, kby: -150, guardDmg: 65 }, anim: 'knee' },
  fin3: { id: 'fin3', name: 'Roundhouse', startup: 7, active: 4, recovery: 18, box: B(4, -105, 66, 40), hit: { dmg: 58, stun: 26, block: 14, kbx: 1000, kby: -450, guardDmg: 120 }, anim: 'kick' },
  fin5: { id: 'fin5', name: 'Rising Kick', startup: 8, active: 4, recovery: 20, box: B(4, -125, 62, 70), hit: { dmg: 72, stun: 30, block: 16, kbx: 900, kby: -1250, guardDmg: 140, launch: true }, anim: 'uppercut' },
  heavy: { id: 'heavy', name: 'Heavy Swing', startup: 13, active: 4, recovery: 22, box: B(10, -110, 70, 56), hit: { dmg: 100, stun: 30, block: 17, kbx: 1350, kby: -700, guardDmg: 230, launch: true }, selfVx: 220, anim: 'heavy' },
  air: { id: 'air', name: 'Air Kick', startup: 5, active: 10, recovery: 10, box: B(2, -60, 54, 34), hit: { dmg: 46, stun: 20, block: 11, kbx: 520, kby: 250, guardDmg: 80 }, anim: 'airkick', air: true },
};

/** Basic combo order by combo length (3 at level 1, 4 at level 15, 5 at level 35). */
export const COMBOS: Record<number, string[]> = {
  3: ['jab1', 'jab2', 'fin3'],
  4: ['jab1', 'jab2', 'jab4', 'fin3'],
  5: ['jab1', 'jab2', 'jab4', 'jab2', 'fin5'],
};

// ---- zombie moves (Zombie Survival) --------------------------------------------------------------------------

export const ZOMBIE_MOVES: Record<string, MoveDef> = {
  zbite: { id: 'zbite', name: 'Bite', startup: 16, active: 4, recovery: 24, box: B(6, -100, 46, 40), hit: { dmg: 30, stun: 16, block: 10, kbx: 280, kby: 0, guardDmg: 70 }, anim: 'jab1' },
  zspit: {
    id: 'zspit', name: 'Spit', startup: 22, active: 1, recovery: 30, anim: 'cast',
    spawn: { kind: 'proj', dx: 30, dy: -90, w: 20, h: 20, vx: 650, vy: -300, gravity: 30, life: 120, hit: { dmg: 28, stun: 16, block: 10, kbx: 200, kby: 0, guardDmg: 60, status: ['slow', 60] }, look: 'spit' },
  },
  zslam: { id: 'zslam', name: 'Slam', startup: 26, active: 5, recovery: 30, box: B(0, -140, 100, 140), hit: { dmg: 80, stun: 28, block: 18, kbx: 1100, kby: -900, guardDmg: 260, launch: true }, armor: 26, anim: 'heavy' },
  zboom: { id: 'zboom', name: 'Burst', startup: 40, active: 3, recovery: 1, box: B(-90, -150, 180, 170), hit: { dmg: 110, stun: 30, block: 18, kbx: 1200, kby: -900, guardDmg: 300, launch: true }, anim: 'cast' },
};
