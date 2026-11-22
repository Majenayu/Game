// Fighting styles (archetypes). Every element has 3, each with its OWN 3 powers (levels 1, 8, 20; 5 ranks each):
//   Vanguard: the all-rounder set (the original 30 powers, ids like fire1..fire3)
//   Striker:  close range and aggressive (dash-cuts, flurries, launchers, rains, self-buffs)
//   Warden:   defense and control (orbiting shields, counters, decoys, traps, walls, drains)
// Power III of every style is a super move. No cooldowns anywhere: MP and wind-up/recovery frames are the limits.
import type { ElementId } from './elementPrefs';
import type { EffectDef, HitDef, MoveDef } from './moves';

export const ARCHETYPE_IDS = ['classic', 'striker', 'warden'] as const;
export type Archetype = (typeof ARCHETYPE_IDS)[number];

export const ARCHETYPES: Record<Archetype, { name: string; role: string; blurb: string }> = {
  classic: { name: 'Vanguard', role: 'All-rounder', blurb: 'A bit of everything: a shot, a rush and a big finisher.' },
  striker: { name: 'Striker', role: 'Close range', blurb: 'Gets in your face: dash-cuts, flurries, launchers and power-ups.' },
  warden: { name: 'Warden', role: 'Defense and control', blurb: 'Holds the ground: shields, counters, decoys, traps and drains.' },
};

const H = (dmg: number, stun: number, kbx: number, kby: number, extra: Partial<HitDef> = {}): HitDef => ({
  dmg, stun, block: Math.round(stun * 0.6), kbx, kby, guardDmg: Math.round(dmg * 2.2), ...extra,
});
const A = (el: ElementId, arch: 'striker' | 'warden', slot: number, m: Omit<MoveDef, 'element' | 'anim' | 'id'> & { anim?: string }): MoveDef => ({
  ...m,
  element: el,
  anim: m.anim ?? (m.spawn?.kind === 'proj' || m.spawns ? 'cast' : 'power'),
  id: `${el}_${arch[0]}${slot}`,
});
const fx = (e: EffectDef) => e;
/** n projectiles falling on the foe's area, one after another */
const rain = (n: number, spread: number, look: string, hit: HitDef, delay0 = 10, gap = 7, vy = 1300): EffectDef[] =>
  Array.from({ length: n }, (_, i) => ({
    kind: 'proj' as const, atFoe: true, dx: Math.round(((i * 7) % n) * (spread / Math.max(1, n - 1)) - spread / 2), dy: -640,
    w: 40, h: 40, vy, life: 70, delay: delay0 + i * gap, hit, look,
  }));
/** n projectiles in a fan */
const fan = (n: number, look: string, hit: HitDef, vx = 1100, spreadVy = 260): EffectDef[] =>
  Array.from({ length: n }, (_, i) => ({
    kind: 'proj' as const, dx: 40, dy: -95, w: 30, h: 22, vx, vy: Math.round((i - (n - 1) / 2) * (spreadVy / Math.max(1, (n - 1) / 2))), life: 60, hit, look,
  }));
const orbitFx = (look: string, hit: HitDef, r = 70, life = 220, speed = 1, n = 1): EffectDef[] =>
  Array.from({ length: n }, (_, i) => ({
    kind: 'wall' as const, dx: 0, dy: -80, w: 36, h: 36, life, follow: true, blocksProj: true, rehit: 55, orbit: { r, speed, start: Math.floor((i * 32) / n) }, hit, look,
  }));

export const ARCHETYPE_POWERS: MoveDef[] = [
  // ================= Fire =================
  A('fire', 'striker', 1, { name: 'Cinder Flurry', mp: 15, startup: 6, active: 14, recovery: 14, multi: 4, selfVx: 220,
    box: { x: 10, y: -115, w: 75, h: 60 }, hit: H(16, 12, 120, 0, { status: ['burn', 40] }), anim: 'jab2' }),
  A('fire', 'striker', 2, { name: 'Rising Flare', mp: 30, startup: 5, active: 8, recovery: 26, invuln: [1, 9],
    box: { x: 0, y: -190, w: 70, h: 190 }, hit: H(95, 30, 300, -1600, { launch: true, status: ['burn', 60] }), anim: 'uppercut' }),
  A('fire', 'striker', 3, { name: 'Meteor Fall', mp: 55, startup: 18, active: 1, recovery: 24,
    spawns: rain(5, 260, 'meteor', H(48, 18, 300, -300, { status: ['burn', 60] })) }),
  A('fire', 'warden', 1, { name: 'Heat Ward', mp: 25, startup: 10, active: 1, recovery: 14, anim: 'cast',
    spawns: orbitFx('heatward', H(20, 12, 500, -200, { status: ['burn', 40] }), 74, 220, 1, 2) }),
  A('fire', 'warden', 2, { name: 'Backdraft', mp: 25, startup: 4, active: 30, recovery: 24, special: 'counter', anim: 'guard',
    hit: H(75, 28, 1300, -700, { launch: true, status: ['burn', 90] }) }),
  A('fire', 'warden', 3, { name: 'Kiln Dome', mp: 55, startup: 16, active: 1, recovery: 22,
    spawn: fx({ kind: 'zone', dx: -150, dy: -40, w: 300, h: 220, life: 110, follow: true, blocksProj: true, rehit: 26, hit: H(22, 10, 300, 0, { status: ['burn', 40] }), look: 'kiln' }) }),

  // ================= Water =================
  A('water', 'striker', 1, { name: 'Surf Strike', mp: 20, startup: 7, active: 12, recovery: 18, selfVx: 1300, invuln: [1, 5],
    box: { x: 0, y: -110, w: 70, h: 90 }, hit: H(60, 22, 900, -200), anim: 'rush' }),
  A('water', 'striker', 2, { name: 'Whirlpool Spin', mp: 30, startup: 9, active: 24, recovery: 18, multi: 6,
    box: { x: -80, y: -125, w: 160, h: 115 }, hit: H(20, 14, 600, 0, { pull: true }), anim: 'spin' }),
  A('water', 'striker', 3, { name: 'Geyser Barrage', mp: 55, startup: 16, active: 1, recovery: 24,
    spawns: [0, 1, 2].map((i) => ({ kind: 'strike' as const, atFoe: true, dx: (i - 1) * 90, dy: 0, w: 80, h: 300, life: 14, delay: 18 + i * 12, hit: H(55, 24, 200, -1400, { launch: true }), look: 'geyser' })) }),
  A('water', 'warden', 1, { name: 'Mist Double', mp: 20, startup: 4, active: 1, recovery: 12, special: 'decoy', value: 170, invuln: [1, 12], anim: 'cast',
    spawn: fx({ kind: 'trap', dx: 0, dy: 0, w: 46, h: 125, life: 240, blocksProj: true, hit: H(35, 26, 500, -300, { status: ['slow', 90] }), look: 'mistclone' }) }),
  A('water', 'warden', 2, { name: 'Leech Stream', mp: 30, startup: 12, active: 14, recovery: 20, multi: 5,
    box: { x: 20, y: -105, w: 320, h: 30 }, hit: H(22, 12, 120, 0, { drain: 40 }), anim: 'beam' }),
  A('water', 'warden', 3, { name: 'Monsoon', mp: 55, startup: 18, active: 1, recovery: 22,
    spawn: fx({ kind: 'zone', dx: 0, dy: -300, atFoe: true, w: 520, h: 600, life: 200, delay: 10, rehit: 26, hit: H(16, 8, 0, 0, { status: ['slow', 50] }), look: 'monsoon' }) }),

  // ================= Ice =================
  A('ice', 'striker', 1, { name: 'Frost Fang', mp: 15, startup: 6, active: 6, recovery: 16, selfVx: 700,
    box: { x: 10, y: -110, w: 80, h: 70 }, hit: H(55, 22, 600, -150, { status: ['slow', 90] }), anim: 'jab1' }),
  A('ice', 'striker', 2, { name: 'Shard Fan', mp: 30, startup: 12, active: 1, recovery: 20,
    spawns: fan(3, 'shard', H(34, 16, 400, 0, { status: ['slow', 60] }), 1250, 300) }),
  A('ice', 'striker', 3, { name: 'Crystal Lance', mp: 55, startup: 20, active: 10, recovery: 26, multi: 3,
    box: { x: 20, y: -118, w: 1000, h: 50 }, hit: H(48, 20, 400, -200, { status: ['freeze', 30] }), anim: 'beam' }),
  A('ice', 'warden', 1, { name: 'Frost Mirror', mp: 20, startup: 4, active: 30, recovery: 24, special: 'counter', anim: 'guard',
    hit: H(75, 22, 500, -200, { status: ['freeze', 50] }) }),
  A('ice', 'warden', 2, { name: 'Snow Double', mp: 25, startup: 4, active: 1, recovery: 12, special: 'decoy', value: 180, invuln: [1, 12], anim: 'cast',
    spawn: fx({ kind: 'trap', dx: 0, dy: 0, w: 50, h: 125, life: 260, blocksProj: true, hit: H(45, 22, 300, 0, { status: ['freeze', 40] }), look: 'snowclone' }) }),
  A('ice', 'warden', 3, { name: 'Deep Winter', mp: 55, startup: 18, active: 1, recovery: 22,
    spawn: fx({ kind: 'zone', dx: -450, dy: 0, w: 900, h: 260, life: 160, delay: 8, rehit: 24, hit: H(34, 14, 0, 0, { status: ['slow', 60] }), look: 'blizzard' }) }),

  // ================= Lightning =================
  A('lightning', 'striker', 1, { name: 'Volt Flurry', mp: 15, startup: 5, active: 14, recovery: 14, multi: 3,
    box: { x: 10, y: -115, w: 80, h: 60 }, hit: H(15, 12, 100, 0, { status: ['shock', 8] }), anim: 'jab2' }),
  A('lightning', 'striker', 2, { name: 'Rail Dash', mp: 30, startup: 6, active: 10, recovery: 22, selfVx: 2400, invuln: [1, 14],
    box: { x: -30, y: -115, w: 90, h: 100 }, hit: H(70, 26, 500, -300, { status: ['shock', 20] }), anim: 'rush' }),
  A('lightning', 'striker', 3, { name: 'Overcharge', mp: 50, startup: 14, active: 1, recovery: 16, special: 'buff', buff: 'speed', value: 240,
    spawn: fx({ kind: 'zone', dx: -110, dy: 0, w: 220, h: 200, life: 12, follow: true, hit: H(70, 26, 900, -600, { status: ['shock', 30] }), look: 'surge' }) }),
  A('lightning', 'warden', 1, { name: 'Coil Guard', mp: 25, startup: 10, active: 1, recovery: 14, anim: 'cast',
    spawns: orbitFx('coil', H(22, 14, 300, 0, { status: ['shock', 16] }), 66, 220, 2, 1) }),
  A('lightning', 'warden', 2, { name: 'Shock Mine', mp: 25, startup: 10, active: 1, recovery: 14,
    spawn: fx({ kind: 'trap', dx: 90, dy: 0, w: 60, h: 40, life: 420, delay: 16, hit: H(55, 34, 200, -500, { status: ['shock', 40] }), look: 'shockmine' }) }),
  A('lightning', 'warden', 3, { name: 'Chain Storm', mp: 55, startup: 16, active: 1, recovery: 22,
    spawns: [-360, -180, 0, 180, 360].map((dx, i) => ({ kind: 'strike' as const, atFoe: true, dx, dy: 0, w: 70, h: 720, life: 10, delay: 26 + ((i * 3) % 5) * 9, hit: H(60, 24, 200, -700, { status: ['shock', 24] }), look: 'chainbolt' })) }),

  // ================= Wind =================
  A('wind', 'striker', 1, { name: 'Gale Step', mp: 15, startup: 5, active: 10, recovery: 18, selfVx: 1900, invuln: [1, 8],
    box: { x: -20, y: -115, w: 80, h: 100 }, hit: H(45, 20, 500, -200), anim: 'rush' }),
  A('wind', 'striker', 2, { name: 'Updraft', mp: 25, startup: 5, active: 8, recovery: 24, invuln: [1, 8],
    box: { x: 0, y: -200, w: 80, h: 200 }, hit: H(80, 30, 200, -1800, { launch: true }), anim: 'uppercut' }),
  A('wind', 'striker', 3, { name: 'Tempest Fan', mp: 50, startup: 14, active: 1, recovery: 22,
    spawns: fan(5, 'galeblade', H(34, 14, 500, 0), 1450, 420) }),
  A('wind', 'warden', 1, { name: 'Gust Wall', mp: 20, startup: 10, active: 1, recovery: 14,
    spawn: fx({ kind: 'wall', dx: 80, dy: 0, w: 40, h: 170, life: 180, blocksProj: true, rehit: 30, hit: H(15, 16, 1600, -300), look: 'gustwall' }) }),
  A('wind', 'warden', 2, { name: 'Breeze Parry', mp: 20, startup: 4, active: 30, recovery: 24, special: 'counter', anim: 'guard',
    hit: H(55, 26, 2000, -500) }),
  A('wind', 'warden', 3, { name: 'Storm Eye', mp: 55, startup: 16, active: 1, recovery: 20,
    spawn: fx({ kind: 'zone', dx: -200, dy: -20, w: 400, h: 240, life: 150, follow: true, rehit: 18, hit: H(14, 10, 600, 0, { pull: true }), look: 'stormeye' }) }),

  // ================= Earth =================
  A('earth', 'striker', 1, { name: 'Quarry Charge', mp: 20, startup: 8, active: 14, recovery: 18, selfVx: 1200, armor: 24,
    box: { x: 0, y: -115, w: 80, h: 105 }, hit: H(65, 26, 1200, -300), anim: 'rush' }),
  A('earth', 'striker', 2, { name: 'Tremor Stomp', mp: 30, startup: 12, active: 1, recovery: 22,
    spawn: fx({ kind: 'zone', dx: -160, dy: 0, w: 380, h: 50, life: 10, follow: true, groundOnly: true, hit: H(80, 32, 300, -1200, { launch: true }), look: 'tremor' }) }),
  A('earth', 'striker', 3, { name: 'Mountain Drop', mp: 55, startup: 18, active: 1, recovery: 26,
    spawn: fx({ kind: 'strike', dx: 0, dy: 0, atFoe: true, w: 180, h: 720, life: 12, delay: 26, hit: H(170, 40, 500, -900, { launch: true }), look: 'mountain' }) }),
  A('earth', 'warden', 1, { name: 'Stone Skin', mp: 20, startup: 12, active: 1, recovery: 14, special: 'buff', buff: 'iron', value: 240, anim: 'cast' }),
  A('earth', 'warden', 2, { name: 'Spike Pit', mp: 25, startup: 12, active: 1, recovery: 16,
    spawn: fx({ kind: 'trap', dx: 120, dy: 0, w: 70, h: 30, life: 420, delay: 18, groundOnly: true, hit: H(75, 30, 100, -1100, { launch: true }), look: 'spikepit' }) }),
  A('earth', 'warden', 3, { name: 'Stone Prison', mp: 55, startup: 18, active: 1, recovery: 22,
    spawns: [-1, 1].map((s) => ({ kind: 'wall' as const, atFoe: true, dx: s * 110, dy: 0, w: 46, h: 190, life: 150, delay: 10, blocksProj: true, rehit: 40, hit: H(45, 20, 300, -400), look: 'prison' })) }),

  // ================= Leaf =================
  A('leaf', 'striker', 1, { name: 'Thorn Lash', mp: 15, startup: 7, active: 12, recovery: 16, multi: 4,
    box: { x: 20, y: -115, w: 140, h: 40 }, hit: H(16, 12, 200, 0), anim: 'jab1' }),
  A('leaf', 'striker', 2, { name: 'Seed Spray', mp: 25, startup: 10, active: 1, recovery: 18,
    spawns: fan(4, 'seed', H(26, 14, 300, 0, { status: ['root', 30] }), 1150, 240) }),
  A('leaf', 'striker', 3, { name: 'Petal Storm', mp: 55, startup: 16, active: 1, recovery: 22,
    spawns: rain(7, 320, 'petal', H(30, 14, 200, -200), 8, 6, 1100) }),
  A('leaf', 'warden', 1, { name: 'Leaf Ring', mp: 25, startup: 10, active: 1, recovery: 14, anim: 'cast',
    spawns: orbitFx('leafring', H(16, 10, 400, 0), 70, 220, 1, 2) }),
  A('leaf', 'warden', 2, { name: 'Snap Trap', mp: 25, startup: 4, active: 30, recovery: 24, special: 'counter', anim: 'guard',
    hit: H(45, 20, 200, 0, { status: ['root', 50] }) }),
  A('leaf', 'warden', 3, { name: 'Sap Siphon', mp: 55, startup: 18, active: 14, recovery: 24, multi: 5,
    box: { x: 20, y: -112, w: 560, h: 44 }, hit: H(26, 12, 120, 0, { drain: 40, status: ['root', 20] }), anim: 'beam' }),

  // ================= Light =================
  A('light', 'striker', 1, { name: 'Flash Step', mp: 20, startup: 8, active: 4, recovery: 20, special: 'teleportBehind', invuln: [1, 10],
    box: { x: 0, y: -115, w: 70, h: 100 }, hit: H(65, 24, 700, -300, { status: ['weak', 60] }), anim: 'jab1' }),
  A('light', 'striker', 2, { name: 'Prism Fan', mp: 30, startup: 12, active: 1, recovery: 20,
    spawns: fan(3, 'prism', H(40, 16, 450, 0), 1500, 200) }),
  A('light', 'striker', 3, { name: 'Daybreak', mp: 50, startup: 16, active: 1, recovery: 16, special: 'buff', buff: 'might', value: 240,
    spawn: fx({ kind: 'zone', dx: -130, dy: -20, w: 260, h: 240, life: 14, follow: true, hit: H(80, 30, 1000, -700, { status: ['weak', 90] }), look: 'daybreak' }) }),
  A('light', 'warden', 1, { name: 'Halo Ring', mp: 25, startup: 10, active: 1, recovery: 14, anim: 'cast',
    spawns: orbitFx('halo', H(18, 12, 300, 0, { status: ['weak', 40] }), 60, 220, 2, 2) }),
  A('light', 'warden', 2, { name: 'Mirror Image', mp: 25, startup: 4, active: 1, recovery: 12, special: 'decoy', value: 190, invuln: [1, 12], anim: 'cast',
    spawn: fx({ kind: 'trap', dx: 0, dy: 0, w: 46, h: 125, life: 240, blocksProj: true, hit: H(40, 24, 600, -300, { status: ['weak', 60] }), look: 'mirrorclone' }) }),
  A('light', 'warden', 3, { name: 'Starfall', mp: 55, startup: 16, active: 1, recovery: 22,
    spawns: rain(6, 420, 'star', H(36, 16, 200, -200, { status: ['weak', 40] }), 12, 8, 1500) }),

  // ================= Gravity =================
  A('gravity', 'striker', 1, { name: 'Crush Step', mp: 20, startup: 8, active: 10, recovery: 20, selfVx: 1500, invuln: [1, 6],
    box: { x: 0, y: -110, w: 80, h: 90 }, hit: H(55, 24, 200, 1400), anim: 'rush' }),
  A('gravity', 'striker', 2, { name: 'Return Comet', mp: 30, startup: 12, active: 1, recovery: 20,
    spawn: fx({ kind: 'proj', dx: 40, dy: -100, w: 46, h: 46, vx: 1100, life: 110, returnAt: 40, pierce: true, rehit: 30, hit: H(45, 20, 500, -200, { pull: true }), look: 'comet' }) }),
  A('gravity', 'striker', 3, { name: 'Meteor Shower', mp: 55, startup: 18, active: 1, recovery: 24,
    spawns: rain(5, 360, 'darkrock', H(46, 20, 100, 900), 12, 8, 1700) }),
  A('gravity', 'warden', 1, { name: 'Satellite', mp: 25, startup: 10, active: 1, recovery: 14, anim: 'cast',
    spawns: orbitFx('satellite', H(24, 14, 200, 600), 90, 220, 1, 1) }),
  A('gravity', 'warden', 2, { name: 'Repulse', mp: 25, startup: 4, active: 30, recovery: 24, special: 'counter', anim: 'guard',
    hit: H(60, 26, 2200, -600) }),
  A('gravity', 'warden', 3, { name: 'Gravity Cage', mp: 55, startup: 18, active: 1, recovery: 22,
    spawns: [
      { kind: 'zone' as const, atFoe: true, dx: -110, dy: 0, w: 220, h: 220, life: 90, delay: 12, rehit: 24, hit: H(20, 12, 400, 0, { pull: true, status: ['slow', 40] }), look: 'cage' },
    ] }),

  // ================= Time =================
  A('time', 'striker', 1, { name: 'Second Flurry', mp: 15, startup: 5, active: 14, recovery: 14, multi: 3,
    box: { x: 10, y: -115, w: 80, h: 60 }, hit: H(15, 12, 100, 0, { status: ['slow', 20] }), anim: 'jab2' }),
  A('time', 'striker', 2, { name: 'Blink Cut', mp: 30, startup: 6, active: 8, recovery: 22, selfVx: 2600, invuln: [1, 12],
    box: { x: -40, y: -115, w: 100, h: 100 }, hit: H(65, 24, 400, -300), anim: 'rush' }),
  A('time', 'striker', 3, { name: 'Haste Hour', mp: 50, startup: 14, active: 1, recovery: 14, special: 'buff', buff: 'speed', value: 270, anim: 'cast',
    spawn: fx({ kind: 'zone', dx: -100, dy: 0, w: 200, h: 200, life: 12, follow: true, hit: H(55, 24, 800, -500, { status: ['slow', 90] }), look: 'hourglass' }) }),
  A('time', 'warden', 1, { name: 'Hour Hand', mp: 25, startup: 10, active: 1, recovery: 14, anim: 'cast',
    spawns: orbitFx('hourhand', H(18, 12, 300, 0, { status: ['slow', 40] }), 80, 220, 1, 1) }),
  A('time', 'warden', 2, { name: 'Afterimage', mp: 25, startup: 4, active: 1, recovery: 12, special: 'decoy', value: 180, invuln: [1, 12], anim: 'cast',
    spawn: fx({ kind: 'trap', dx: 0, dy: 0, w: 46, h: 125, life: 240, blocksProj: true, hit: H(30, 22, 400, 0, { status: ['slow', 70] }), look: 'ghostclone' }) }),
  A('time', 'warden', 3, { name: 'Time Lock', mp: 55, startup: 4, active: 30, recovery: 24, special: 'counter', anim: 'guard',
    hit: H(110, 36, 900, -600, { status: ['freeze', 34] }) }),
];

export const ARCHETYPE_TEXT: Record<string, string> = {
  fire_s1: 'A fast burning punch combo while stepping forward.',
  fire_s2: 'An invincible rising punch that launches.',
  fire_s3: 'Super: a rain of meteors on the foe.',
  fire_w1: 'Two flames circle you, block shots and burn on touch.',
  fire_w2: 'Counter stance: if you are hit, you explode back.',
  fire_w3: 'Super: a burning dome around you that stops shots.',
  water_s1: 'Surf through the foe with a quick dash.',
  water_s2: 'A spinning whirlpool that pulls the foe in.',
  water_s3: 'Super: three geysers erupt under the foe.',
  water_w1: 'Leave a mist double behind and slip back.',
  water_w2: 'A stream that drains health from the foe.',
  water_w3: 'Super: a long rainstorm that slows the foe.',
  ice_s1: 'A quick lunge that slows.',
  ice_s2: 'Three ice shards in a fan.',
  ice_s3: 'Super: a giant ice lance across the arena.',
  ice_w1: 'Counter stance: freeze anyone who hits you.',
  ice_w2: 'Leave a snow double behind that freezes.',
  ice_w3: 'Super: a blizzard over most of the arena.',
  lightning_s1: 'A crackling punch combo.',
  lightning_s2: 'A lightning-fast dash through the foe.',
  lightning_s3: 'Super: burst and stay faster for 6 seconds.',
  lightning_w1: 'A charged coil circles you and shocks.',
  lightning_w2: 'A mine that shocks whoever steps near.',
  lightning_w3: 'Super: five bolts fall around the foe.',
  wind_s1: 'Dash through the foe on a gust.',
  wind_s2: 'An invincible rising kick that launches.',
  wind_s3: 'Super: five air blades in a wide fan.',
  wind_w1: 'A wall of wind that stops shots and pushes.',
  wind_w2: 'Counter stance: blow the attacker away.',
  wind_w3: 'Super: a storm around you that pulls foes in.',
  earth_s1: 'An armored charge that cannot be stopped.',
  earth_s2: 'Stomp to launch anyone standing near.',
  earth_s3: 'Super: a mountain drops on the foe.',
  earth_w1: 'Harden your skin: take less damage for 5 seconds.',
  earth_w2: 'A hidden spike pit that launches.',
  earth_w3: 'Super: two stone walls trap the foe.',
  leaf_s1: 'A fast thorn whip combo.',
  leaf_s2: 'Four rooting seeds in a fan.',
  leaf_s3: 'Super: a storm of sharp petals.',
  leaf_w1: 'Three leaves circle you and block shots.',
  leaf_w2: 'Counter stance: root anyone who hits you.',
  leaf_w3: 'Super: a vine beam that drains health.',
  light_s1: 'Flash behind the foe and strike.',
  light_s2: 'Three light rays in a fan.',
  light_s3: 'Super: a radiant burst, then hit harder for 6 seconds.',
  light_w1: 'Two halos circle you and weaken on touch.',
  light_w2: 'Leave a mirror image behind and slip back.',
  light_w3: 'Super: stars rain down around the foe.',
  gravity_s1: 'A heavy dash that slams the foe down.',
  gravity_s2: 'A comet that flies out and comes back.',
  gravity_s3: 'Super: dark rocks rain down on the foe.',
  gravity_w1: 'A rock circles you and knocks foes down.',
  gravity_w2: 'Counter stance: push the attacker far away.',
  gravity_w3: 'Super: a cage that holds the foe floating.',
  time_s1: 'A blur of quick punches that slow.',
  time_s2: 'Blink through the foe in an instant.',
  time_s3: 'Super: burst and stay fast for 7 seconds.',
  time_w1: 'A clock hand circles you and slows.',
  time_w2: 'Leave an afterimage behind and slip back.',
  time_w3: 'Super counter: freeze anyone who hits you, then strike.',
};

/** What a power does at its core, from its frame data (used for the variety test, the bot AI and the Power Lab). */
export function mechanicOf(mv: MoveDef): string {
  if (mv.special) return mv.special;
  const sp = mv.spawns ?? (mv.spawn ? [mv.spawn] : []);
  if (sp.some((e) => e.orbit)) return 'orbit';
  if (sp.some((e) => e.returnAt)) return 'boomerang';
  if (mv.hit?.drain || sp.some((e) => e.hit?.drain)) return 'drain';
  if (sp.length > 1) return sp[0]!.atFoe ? (sp[0]!.kind === 'proj' ? 'rain' : 'multistrike') : sp[0]!.kind === 'proj' ? 'fan' : 'walls';
  if (mv.box) {
    if ((mv.selfVx ?? 0) >= 900) return 'dash';
    if (mv.hit?.launch && mv.invuln) return 'rising';
    if (mv.multi) return mv.anim === 'beam' ? 'beam' : mv.anim === 'spin' ? 'spin' : 'flurry';
    if (mv.armor) return 'armor';
    return mv.box.w >= 200 ? 'reach' : 'melee';
  }
  const e = sp[0];
  if (!e) return 'other';
  if (e.kind === 'proj') return e.groundOnly ? 'wave' : e.gravity ? 'lob' : 'shot';
  if (e.kind === 'zone') return e.follow ? 'aura' : 'field';
  if (e.kind === 'strike') return e.atFoe ? 'drop' : 'pillar';
  return e.kind;
}
