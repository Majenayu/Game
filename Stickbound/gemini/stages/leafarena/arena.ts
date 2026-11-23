/**
 * Leaf Arena (the glass-dome greenhouse): the owner's picture arena.png with falling leaves and petals, drifting
 * glowing spores, breathing mushroom lights, swaying light shafts and a gust that blows a flurry of leaves across
 * now and then. Music: "Greenhouse Bloom", a gentle 96 BPM tribal loop in G major.
 */
import { glow, hash, timetable, type ArenaDef, type ArenaSound, type G } from '../engine/arena';
import { burst, glowAt, particles, shaft, wave, type Particles } from '../engine/fxkit';

const FLOOR = 650;
const GUST_PERIOD = 1100;
// glowing mushroom caps: x, y, radius, colour
const CAPS: Array<[number, number, number, 'pink' | 'green' | 'blue']> = [
  [165, 322, 70, 'green'],
  [245, 402, 42, 'green'],
  [90, 402, 36, 'pink'],
  [150, 505, 32, 'blue'],
  [1232, 382, 90, 'pink'],
  [1102, 528, 26, 'pink'],
  [460, 405, 18, 'pink'],
  [880, 450, 16, 'pink'],
];
interface Fx {
  glows: Record<'pink' | 'green' | 'blue', HTMLCanvasElement>;
  leaves: Particles;
  petals: Particles;
  spores: Particles;
  gust: Particles;
}

function bake(): Fx {
  return {
    glows: { pink: glow('255,150,210'), green: glow('150,255,190'), blue: glow('120,190,255') },
    leaves: { n: 22, box: [-50, -30, 1300, 200], vx: 0.35, vy: 0.75, spread: 0.2, life: 760, size: [5, 8], sway: 22, rgb: '120,220,140', rgb2: '170,240,150', alpha: 0.85, kind: 'leaf', seed: 4, floorY: 700 },
    petals: { n: 14, box: [200, -30, 1200, 160], vx: 0.2, vy: 0.6, spread: 0.2, life: 900, size: [3, 5], sway: 26, rgb: '255,170,210', alpha: 0.85, kind: 'leaf', seed: 8, floorY: 700 },
    spores: { n: 55, box: [30, 120, 1340, 640], vx: 0.05, vy: -0.25, spread: 0.18, life: 500, size: [1, 2.2], sway: 14, rgb: '190,255,200', rgb2: '255,200,235', alpha: 0.8, kind: 'mote', seed: 12 },
    gust: { n: 34, box: [-120, 200, 40, 640], vx: 9, vy: 0.4, spread: 1.5, life: 170, size: [5, 8], sway: 30, rgb: '120,220,140', rgb2: '255,170,210', alpha: 0.95, kind: 'leaf', seed: 31 },
  };
}

function draw(g: G, F: Fx, frame: number, flash: number): void {
  shaft(g, { x: 290, y: 0 }, { x: 390, y: 0 }, { x: 400, y: 320 }, { x: 300, y: 320 }, '170,255,200', 0.07 + 0.06 * wave(frame, 340));
  shaft(g, { x: 500, y: 0 }, { x: 570, y: 0 }, { x: 570, y: 260 }, { x: 515, y: 260 }, '170,255,200', 0.06 + 0.05 * wave(frame, 290, 1));
  shaft(g, { x: 770, y: 0 }, { x: 850, y: 0 }, { x: 850, y: 310 }, { x: 790, y: 310 }, '255,170,220', 0.07 + 0.06 * wave(frame, 410, 3));
  // the big tree's crown glows softly
  glowAt(g, F.glows.green, 1140, 150, 160, 120, 0.1 + 0.08 * wave(frame, 260, 2));
  // mushrooms breathe, each on its own beat
  for (const [i, [x, y, r, c]] of CAPS.entries()) glowAt(g, F.glows[c], x, y, r * 1.5, r * 1.1, 0.12 + 0.14 * wave(frame, 150 + i * 37, i * 1.3));
  particles(g, frame, F.spores, F.glows.green);
  particles(g, frame, F.petals);
  particles(g, frame, F.leaves);
  const b = burst(frame, GUST_PERIOD, 2, 45, 0.85, 170);
  if (b > 0) particles(g, frame, F.gust, undefined, Math.min(1, b * 1.5));
  if (flash > 0) glowAt(g, F.glows.green, 688, 384, 700, 400, flash * 0.15);
}

function sounds(from: number, to: number): ArenaSound[] {
  return [
    ...timetable(from, to, GUST_PERIOD, 2, 45, 0.85, () => ({ kind: 'whoosh', x: 0.1, big: true, ground: false })),
    ...timetable(from, to, 400, 3, 70, 0.5, (s) => ({ kind: 'chime', x: hash(s * 3), big: false, ground: false })),
  ];
}

export const leaf: ArenaDef<Fx> = {
  id: 'leafarena',
  name: 'Leaf Arena',
  icon: '🍃',
  image: new URL('./arena.png', import.meta.url).href,
  floor: FLOOR / 768,
  sky: '#10302c',
  ground: '#3f8a70',
  sfxLabel: 'Leaves, breeze and chimes',
  bake,
  draw,
  sounds,
  song: {
    title: 'Greenhouse Bloom',
    bpm: 96,
    // G D Em C, G Bm C D
    prog: [
      { root: 55, tones: [0, 4, 7] },
      { root: 50, tones: [0, 4, 7] },
      { root: 52, tones: [0, 3, 7] },
      { root: 48, tones: [0, 4, 7, 11] },
      { root: 55, tones: [0, 4, 7, 14] },
      { root: 47, tones: [0, 3, 7] },
      { root: 48, tones: [0, 4, 7] },
      { root: 50, tones: [0, 4, 7, 10] },
    ],
    lead: [
      [79, 0, 78, 79, 81, 0, 79, 0],
      [78, 0, 74, 0, 76, 78, 0, 0],
      [76, 0, 79, 0, 84, 83, 81, 0],
      [79, 0, 78, 0, 74, 0, 0, 0],
    ],
    drums: 'tribal',
    bass: [0, 6, 10],
    bassWave: 'triangle',
    bassCut: 700,
    arp: [0, 1, 2, 3],
    arpWave: 'triangle',
    arpCut: 3000,
    arpRate: 2,
    padWave: 'sine',
    padLevel: 0.1,
    padCut: 2000,
    leadWave: ['triangle', 'sine'],
    echo: 4,
    leadAlways: true,
    leadVoice: 'flute',
    arpVoice: 'marimba',
    bell: true,
  },
  // soft breeze
  air: { cut: 700, level: 0.04, lfo: 0.05, depth: 300 },
};

