/**
 * Fire Arena (the foundry): the owner's picture arena.png with moving lava falls, welding-spark showers from the
 * robot arms, rising embers, a flickering ceiling lamp and glowing floor reflections. Lava bursts from the pool now
 * and then. Music: "Forge Heart", a heavy 150 BPM half-time loop in D minor with a fire roar underneath.
 */
import { glow, timetable, type ArenaDef, type ArenaSound, type G } from '../engine/arena';
import { burst, flicker, glowAt, particles, wave, type Particles } from '../engine/fxkit';

const FLOOR = 640; // where the fighters stand (picture pixels)
// robot-arm tips that spray sparks, and the y where their sparks land
const TIPS = [
  { x: 465, y: 238, land: 525, salt: 11 },
  { x: 822, y: 268, land: 462, salt: 23 },
  { x: 1002, y: 342, land: 548, salt: 37 },
];
// lava falls (x0, y0, x1, y1)
const FALLS: Array<[number, number, number, number]> = [
  [238, 345, 300, 548],
  [382, 400, 432, 545],
  [1015, 440, 1050, 550],
];
const SPARK_PERIOD = 420;
const BURST_PERIOD = 900;

interface Fx {
  orange: HTMLCanvasElement;
  yellow: HTMLCanvasElement;
  falls: Particles[];
  sparks: Particles[];
  embers: Particles;
  burst: Particles;
}

function bake(): Fx {
  return {
    orange: glow('255,120,30'),
    yellow: glow('255,210,110'),
    falls: FALLS.map(([x0, y0, x1, y1], i) => ({
      n: 14,
      box: [x0 + 4, y0, x1 - 4, y0 + 20],
      vx: 0,
      vy: 2.2,
      spread: 0.4,
      life: Math.round((y1 - y0) / 2.2),
      size: [1.5, 3],
      rgb: '255,236,150',
      rgb2: '255,170,60',
      alpha: 0.55,
      kind: 'streak',
      seed: 100 + i,
      floorY: y1,
    })),
    sparks: TIPS.map((t) => ({
      n: 46,
      box: [t.x - 6, t.y - 2, t.x + 6, t.y + 4],
      vx: 0,
      vy: 1.2,
      spread: 1.4,
      grav: 0.12,
      life: 46,
      size: [1, 2],
      rgb: '255,230,140',
      rgb2: '255,150,50',
      alpha: 1,
      kind: 'spark',
      seed: t.salt,
      floorY: t.land,
    })),
    embers: {
      n: 60,
      box: [80, 260, 1300, 600],
      vx: 0.15,
      vy: -0.55,
      spread: 0.25,
      life: 420,
      size: [1, 2.4],
      sway: 10,
      rgb: '255,170,70',
      rgb2: '255,230,150',
      alpha: 0.85,
      kind: 'ember',
      seed: 7,
    },
    burst: {
      n: 40,
      box: [600, 515, 760, 530],
      vx: 0,
      vy: -3.2,
      spread: 1.8,
      grav: 0.09,
      life: 70,
      size: [1.5, 3],
      rgb: '255,200,90',
      rgb2: '255,110,30',
      alpha: 1,
      kind: 'ember',
      seed: 55,
      floorY: 540,
    },
  };
}

function draw(g: G, F: Fx, frame: number, flash: number): void {
  // the lava pool and falls breathe
  const heat = 0.55 + 0.45 * flicker(frame, 40, 3);
  glowAt(g, F.orange, 665, 528, 300, 34, 0.35 * heat);
  for (const [i, [x0, y0, x1, y1]] of FALLS.entries()) {
    glowAt(g, F.orange, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) * 1.3, (y1 - y0) * 0.7, 0.22 + 0.18 * flicker(frame, 30, 20 + i));
    particles(g, frame, F.falls[i]);
  }
  // a lava burst from the pool now and then
  const b = burst(frame, BURST_PERIOD, 3, 77, 0.7, 80);
  if (b > 0) {
    glowAt(g, F.yellow, 680, 520, 160, 40, 0.5 * b);
    particles(g, frame, F.burst, F.orange, b);
  }
  // welding sparks: each arm sprays in bursts
  for (const [i, t] of TIPS.entries()) {
    const p = burst(frame, SPARK_PERIOD, 2, t.salt, 0.85, 150);
    if (p <= 0) continue;
    glowAt(g, F.yellow, t.x, t.y, 26, 26, 0.9 * p * (0.7 + 0.3 * flicker(frame, 3, i)));
    particles(g, frame, F.sparks[i], undefined, p);
    // the glow where they land
    glowAt(g, F.orange, t.x, t.land, 40, 10, 0.4 * p);
  }
  particles(g, frame, F.embers, F.orange);
  // ceiling lamp flicker
  const lamp = 0.6 + 0.4 * flicker(frame, 6, 9) * (flicker(frame, 90, 4) > 0.2 ? 1 : 0.3);
  glowAt(g, F.yellow, 690, 64, 130, 22, 0.35 * lamp);
  // warm reflections on the floor
  for (const [x, y, rx, k] of [
    [460, 632, 90, 1],
    [845, 630, 70, 2],
    [990, 718, 120, 3],
    [210, 688, 130, 4],
    [700, 676, 60, 5],
  ])
    glowAt(g, F.orange, x, y, rx, rx * 0.16, 0.16 + 0.12 * wave(frame, 140 + k * 23, k));
  if (flash > 0) glowAt(g, F.yellow, 688, 384, 700, 400, flash * 0.15);
}

function sounds(from: number, to: number): ArenaSound[] {
  const out: ArenaSound[] = [];
  for (const t of TIPS) out.push(...timetable(from, to, SPARK_PERIOD, 2, t.salt, 0.85, () => ({ kind: 'crackle', x: t.x / 1376, big: false, ground: false })));
  out.push(...timetable(from, to, BURST_PERIOD, 3, 77, 0.7, () => ({ kind: 'crackle', x: 0.5, big: true, ground: true })));
  return out;
}

export const fire: ArenaDef<Fx> = {
  id: 'firearena',
  name: 'Fire Arena',
  icon: '🔥',
  image: new URL('./arena.png', import.meta.url).href,
  floor: FLOOR / 768,
  sky: '#1a1224',
  ground: '#3a2c3c',
  sfxLabel: 'Sparks, lava and fire roar',
  bake,
  draw,
  sounds,
  song: {
    title: 'Forge Heart',
    bpm: 150,
    // Dm Eb Dm C, Bb C A A (D minor with a Phrygian Eb and a dark A major turn)
    prog: [
      { root: 50, tones: [0, 3, 7] },
      { root: 51, tones: [0, 4, 7] },
      { root: 50, tones: [0, 3, 7] },
      { root: 48, tones: [0, 4, 7] },
      { root: 46, tones: [0, 4, 7] },
      { root: 48, tones: [0, 4, 7] },
      { root: 45, tones: [0, 4, 7] },
      { root: 45, tones: [0, 4, 7, 10] },
    ],
    lead: [
      [74, 0, 74, 75, 74, 0, 72, 70],
      [72, 0, 72, 74, 72, 0, 70, 69],
      [69, 0, 70, 73, 76, 0, 74, 73],
      [74, 73, 0, 69, 0, 0, 0, 0],
    ],
    drums: 'half',
    bass: [0, 1, 3, 6, 8, 9, 11, 14],
    bassWave: 'sawtooth',
    bassCut: 1500,
    arp: [0, 2, 1, 2, 3, 2, 1, 2],
    arpWave: 'sawtooth',
    arpCut: 2400,
    arpRate: 2,
    padWave: 'sawtooth',
    padLevel: 0.05,
    padCut: 900,
    leadWave: ['sawtooth', 'sawtooth'],
    echo: 3,
    leadAlways: true,
    leadVoice: 'brass',
    bassVoice: 'drive',
    taiko: true,
    anvil: true,
  },
  // low fire roar
  air: { cut: 260, level: 0.07, lfo: 0.13, depth: 120, band: true },
};

