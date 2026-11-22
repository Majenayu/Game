// The 30 powers: 3 per element, unlocked at levels 1, 8 and 20, each with 5 upgrade ranks.
// No cooldowns: MP cost and wind-up/recovery frames are the only limits.

import type { ElementId } from './elementPrefs';
import type { EffectDef, HitDef, MoveDef } from './moves';

export const POWER_UNLOCK_LEVELS = [1, 8, 20] as const;
export const MAX_RANK = 5;

/** Rank bonuses: damage percent, MP discount, extra status time percent (rank 3+), size/speed percent (rank 5). */
export const RANK_DMG = [0, 100, 110, 120, 130, 145];
export const RANK_MP_OFF = [0, 0, 2, 4, 6, 8];
export const RANK_STATUS_PCT = [0, 100, 100, 130, 130, 150];
export const RANK_SIZE_PCT = [0, 100, 100, 100, 100, 120];

const H = (dmg: number, stun: number, kbx: number, kby: number, extra: Partial<HitDef> = {}): HitDef => ({
  dmg, stun, block: Math.round(stun * 0.6), kbx, kby, guardDmg: Math.round(dmg * 2.2), ...extra,
});
const P = (el: ElementId, slot: number, m: Omit<MoveDef, 'element' | 'anim'> & { anim?: string }): MoveDef => ({
  ...m,
  element: el,
  anim: m.anim ?? (m.spawn?.kind === 'proj' ? 'cast' : 'power'),
  id: `${el}${slot}`,
});
const fx = (e: EffectDef) => e;

export const POWERS: MoveDef[] = [
  // ---- Fire ----
  P('fire', 1, { id: '', name: 'Hot Shot', mp: 20, startup: 12, active: 1, recovery: 18,
    spawn: fx({ kind: 'proj', dx: 40, dy: -95, w: 30, h: 26, vx: 900, life: 90, hit: H(70, 20, 500, -100, { status: ['burn', 120] }), look: 'fireball' }) }),
  P('fire', 2, { id: '', name: 'Scorch Dash', mp: 30, startup: 8, active: 16, recovery: 18, selfVx: 1500, invuln: [1, 6],
    box: { x: -10, y: -110, w: 70, h: 100 }, hit: H(80, 24, 700, -300, { status: ['burn', 90] }), anim: 'rush',
    spawn: fx({ kind: 'zone', dx: -40, dy: -24, w: 220, h: 24, life: 70, delay: 6, rehit: 30, groundOnly: true, hit: H(20, 8, 0, 0, { status: ['burn', 60] }), look: 'firetrail' }) }),
  P('fire', 3, { id: '', name: 'Furnace Rise', mp: 50, startup: 20, active: 1, recovery: 26,
    spawn: fx({ kind: 'strike', dx: 160, dy: 0, w: 80, h: 260, life: 22, delay: 14, hit: H(150, 40, 200, -1700, { launch: true, status: ['burn', 120] }), look: 'pillar' }) }),
  // ---- Water ----
  P('water', 1, { id: '', name: 'Jet Lance', mp: 20, startup: 10, active: 1, recovery: 18,
    spawn: fx({ kind: 'proj', dx: 40, dy: -95, w: 60, h: 20, vx: 1100, life: 50, hit: H(55, 20, 1400, -200), look: 'jet' }) }),
  P('water', 2, { id: '', name: 'Undertow', mp: 35, startup: 16, active: 1, recovery: 22,
    spawn: fx({ kind: 'proj', dx: 50, dy: -30, w: 70, h: 60, vx: 700, life: 150, pierce: true, groundOnly: true, hit: H(85, 26, 900, -700, { launch: true }), look: 'wave' }) }),
  P('water', 3, { id: '', name: 'Bubble Lock', mp: 50, startup: 18, active: 1, recovery: 24,
    spawn: fx({ kind: 'proj', dx: 50, dy: -100, w: 70, h: 70, vx: 500, life: 120, hit: H(90, 80, 0, -200, { status: ['float', 90] }), look: 'bubble' }) }),
  // ---- Ice ----
  P('ice', 1, { id: '', name: 'Rime Dart', mp: 20, startup: 8, active: 1, recovery: 16,
    spawn: fx({ kind: 'proj', dx: 40, dy: -95, w: 34, h: 14, vx: 1350, life: 60, hit: H(55, 18, 400, 0, { status: ['slow', 120] }), look: 'dart' }) }),
  P('ice', 2, { id: '', name: 'Glacier Gate', mp: 25, startup: 12, active: 1, recovery: 16,
    spawn: fx({ kind: 'wall', dx: 70, dy: 0, w: 34, h: 150, life: 200, blocksProj: true, hit: H(30, 14, 600, 0), look: 'icewall' }) }),
  P('ice', 3, { id: '', name: 'Permafrost', mp: 55, startup: 22, active: 1, recovery: 28,
    spawn: fx({ kind: 'zone', dx: -170, dy: 0, w: 340, h: 170, life: 20, follow: true, hit: H(110, 30, 500, -400, { status: ['freeze', 70] }), look: 'frostburst' }) }),
  // ---- Lightning ----
  P('lightning', 1, { id: '', name: 'Volt Hop', mp: 25, startup: 10, active: 4, recovery: 20, special: 'teleportBehind', invuln: [1, 12],
    box: { x: 0, y: -115, w: 60, h: 100 }, hit: H(75, 24, 800, -300, { status: ['shock', 20] }), anim: 'rush' }),
  P('lightning', 2, { id: '', name: 'Arc Lash', mp: 30, startup: 12, active: 12, recovery: 20, multi: 4,
    box: { x: 20, y: -110, w: 230, h: 40 }, hit: H(26, 14, 150, 0, { status: ['shock', 12] }), anim: 'beam' }),
  P('lightning', 3, { id: '', name: 'Storm Mark', mp: 50, startup: 14, active: 1, recovery: 22,
    spawn: fx({ kind: 'strike', dx: 0, dy: 0, atFoe: true, w: 90, h: 720, life: 14, delay: 40, hit: H(150, 40, 300, -900, { launch: true, status: ['shock', 30] }), look: 'bolt' }) }),
  // ---- Wind ----
  P('wind', 1, { id: '', name: 'Breeze Shove', mp: 15, startup: 9, active: 5, recovery: 16,
    box: { x: 10, y: -125, w: 110, h: 110 }, hit: H(40, 22, 1900, -350), anim: 'push' }),
  P('wind', 2, { id: '', name: 'Whirl Kick', mp: 30, startup: 10, active: 24, recovery: 18, multi: 6, selfVx: 380,
    box: { x: -50, y: -120, w: 140, h: 110 }, hit: H(24, 14, 250, -120), anim: 'spin' }),
  P('wind', 3, { id: '', name: 'Razor Draft', mp: 40, startup: 14, active: 1, recovery: 22,
    spawn: fx({ kind: 'proj', dx: 40, dy: -100, w: 50, h: 20, vx: 1500, life: 70, rehit: 7, pierce: true, hit: H(40, 14, 300, 0), look: 'blade' }) }),
  // ---- Earth ----
  P('earth', 1, { id: '', name: 'Boulder Lob', mp: 20, startup: 14, active: 1, recovery: 20,
    spawn: fx({ kind: 'proj', dx: 30, dy: -120, w: 44, h: 44, vx: 700, vy: -1100, gravity: 60, life: 120, hit: H(80, 26, 600, -400), look: 'boulder' }) }),
  P('earth', 2, { id: '', name: 'Granite Fist', mp: 30, startup: 16, active: 5, recovery: 22, armor: 20, selfVx: 300,
    box: { x: 10, y: -110, w: 80, h: 60 }, hit: H(120, 32, 1500, -500, { launch: true }), anim: 'heavy' }),
  P('earth', 3, { id: '', name: 'Groundbreak', mp: 50, startup: 20, active: 1, recovery: 24,
    spawn: fx({ kind: 'proj', dx: 30, dy: 0, w: 60, h: 60, vx: 1000, life: 80, pierce: true, groundOnly: true, hit: H(130, 34, 600, -1300, { launch: true }), look: 'quake' }) }),
  // ---- Leaf ----
  P('leaf', 1, { id: '', name: 'Vine Snare', mp: 20, startup: 11, active: 6, recovery: 20,
    box: { x: 20, y: -110, w: 290, h: 34 }, hit: H(50, 30, 900, -150, { pull: true }), anim: 'beam' }),
  P('leaf', 2, { id: '', name: 'Burr Mine', mp: 25, startup: 12, active: 1, recovery: 16,
    spawn: fx({ kind: 'trap', dx: 110, dy: 0, w: 60, h: 30, life: 420, delay: 20, groundOnly: true, hit: H(60, 20, 0, -300, { status: ['root', 110] }), look: 'mine' }) }),
  P('leaf', 3, { id: '', name: 'Thicket Rise', mp: 55, startup: 20, active: 1, recovery: 24, special: 'heal', value: 80,
    spawn: fx({ kind: 'zone', dx: 20, dy: 0, w: 460, h: 60, life: 40, delay: 10, groundOnly: true, hit: H(100, 30, 300, -600, { status: ['root', 90] }), look: 'roots' }) }),
  // ---- Light ----
  P('light', 1, { id: '', name: 'Bright Dart', mp: 20, startup: 9, active: 1, recovery: 16,
    spawn: fx({ kind: 'proj', dx: 40, dy: -95, w: 28, h: 28, vx: 1300, life: 70, hit: H(60, 20, 450, -100, { status: ['weak', 120] }), look: 'lightball' }) }),
  P('light', 2, { id: '', name: 'Sunlance', mp: 35, startup: 16, active: 8, recovery: 22, multi: 4,
    box: { x: 20, y: -112, w: 900, h: 30 }, hit: H(38, 16, 300, 0), anim: 'beam' }),
  P('light', 3, { id: '', name: 'Shine Shield', mp: 50, startup: 10, active: 1, recovery: 14, special: 'barrier', value: 60, anim: 'cast' }),
  // ---- Gravity ----
  P('gravity', 1, { id: '', name: 'Grav Well', mp: 25, startup: 12, active: 1, recovery: 20,
    spawn: fx({ kind: 'zone', dx: 120, dy: 0, w: 220, h: 200, life: 40, delay: 4, rehit: 10, hit: H(18, 12, 700, 0, { pull: true }), look: 'well' }) }),
  P('gravity', 2, { id: '', name: 'Anchor Drop', mp: 30, startup: 14, active: 1, recovery: 22,
    spawn: fx({ kind: 'strike', dx: 0, dy: 0, atFoe: true, w: 110, h: 720, life: 10, delay: 18, hit: H(110, 32, 100, 1800), look: 'press' }) }),
  P('gravity', 3, { id: '', name: 'Weightless', mp: 55, startup: 18, active: 1, recovery: 22,
    spawn: fx({ kind: 'proj', dx: 40, dy: -100, w: 90, h: 90, vx: 600, life: 110, pierce: true, hit: H(70, 30, 100, -900, { status: ['float', 150] }), look: 'zerog' }) }),
  // ---- Time ----
  P('time', 1, { id: '', name: 'Rewind Step', mp: 20, startup: 4, active: 1, recovery: 10, special: 'recall', invuln: [1, 14], anim: 'cast' }),
  P('time', 2, { id: '', name: 'Tick Field', mp: 35, startup: 14, active: 1, recovery: 20,
    spawn: fx({ kind: 'zone', dx: 60, dy: 0, w: 300, h: 200, life: 240, delay: 6, rehit: 20, hit: H(12, 6, 0, 0, { status: ['slow', 40] }), look: 'field' }) }),
  P('time', 3, { id: '', name: 'Freeze Frame', mp: 60, startup: 16, active: 1, recovery: 20,
    spawn: fx({ kind: 'proj', dx: 40, dy: -95, w: 40, h: 40, vx: 1200, life: 70, hit: H(0, 20, 0, 0, { status: ['freeze', 72] }), look: 'clock' }) }),
];

export const POWERS_BY_ELEMENT: Record<ElementId, [MoveDef, MoveDef, MoveDef]> = Object.fromEntries(
  (['fire', 'water', 'ice', 'lightning', 'wind', 'earth', 'leaf', 'light', 'gravity', 'time'] as ElementId[]).map((e) => [
    e,
    [1, 2, 3].map((s) => POWERS.find((p) => p.id === `${e}${s}`)!) as [MoveDef, MoveDef, MoveDef],
  ]),
) as Record<ElementId, [MoveDef, MoveDef, MoveDef]>;

export function powerById(id: string): MoveDef | undefined {
  return POWERS.find((p) => p.id === id);
}

/** Short player-facing description of each power (shown in the Avatars screen). */
export const POWER_TEXT: Record<string, string> = {
  fire1: 'A fireball that burns.',
  fire2: 'Dash through the foe and leave a burning trail.',
  fire3: 'A fire column erupts ahead and launches.',
  water1: 'A fast water jet that pushes far.',
  water2: 'A ground wave that rolls across the arena.',
  water3: 'A slow bubble that traps the foe in the air.',
  ice1: 'A quick dart that slows.',
  ice2: 'An ice wall that blocks projectiles.',
  ice3: 'Freeze everything around you.',
  lightning1: 'Teleport behind the foe and strike.',
  lightning2: 'A crackling beam that hits several times.',
  lightning3: 'Mark the spot under the foe; a bolt falls a moment later.',
  wind1: 'A strong shove that pushes the foe away.',
  wind2: 'A spinning multi-hit kick that moves forward.',
  wind3: 'A fast blade of air that cuts through.',
  earth1: 'An arcing boulder.',
  earth2: 'An armored punch that cannot be interrupted.',
  earth3: 'A shockwave along the floor; jump to dodge it.',
  leaf1: 'A long vine that pulls the foe in.',
  leaf2: 'A hidden mine that roots whoever steps on it.',
  leaf3: 'Roots burst along the floor and heal you a little.',
  light1: 'A fast light dart that weakens.',
  light2: 'A beam that crosses the whole arena.',
  light3: 'A shield that blocks the next hit and heals.',
  gravity1: 'A well that drags the foe toward it.',
  gravity2: 'Slam the foe into the floor from above.',
  gravity3: 'A slow field that makes the foe float.',
  time1: 'Jump back to where you stood 2 seconds ago.',
  time2: 'A field that slows anyone inside.',
  time3: 'A clock that freezes the foe for over a second.',
};
