/**
 * Earth Arena (the ruined rune temple): the owner's picture arena.png with the floating rocks bobbing in the air,
 * the carved runes pulsing with light, warm light shafts, drifting dust and the floor circuits glowing. Every so
 * often the ground trembles: the rocks shake, a dust cloud rolls up from the floor and pebbles fall.
 * Music: "Rune Quake", a 100 BPM tribal loop in E with a Phrygian F and a deep earth drone underneath.
 */
import { canvas, glow, hash, timetable, type ArenaDef, type ArenaSound, type G } from '../engine/arena';
import { burst, drawCut, glowAt, liftDark, particles, shaft, wave, type Cut, type Particles } from '../engine/fxkit';

const FLOOR = 630;
const QUAKE_PERIOD = 1200;
// floating rock boxes (picture pixels), a little larger than each rock so the rock sits inside the ellipse
const ROCKS: Array<[number, number, number, number]> = [
  [256, 240, 348, 334],
  [252, 318, 316, 400],
  [312, 86, 354, 134],
  [774, 142, 814, 188],
  [762, 272, 808, 320],
  [1110, 108, 1166, 168],
  [1080, 196, 1120, 258],
  [1034, 384, 1068, 432],
  [760, 448, 793, 482],
];
// rune glows: centre x, y, half width, half height
const RUNES: Array<[number, number, number, number]> = [
  [172, 65, 30, 50],
  [455, 175, 50, 18],
  [945, 110, 18, 90],
  [1032, 285, 20, 55],
  [1242, 195, 30, 165],
  [430, 480, 55, 28],
  [1055, 495, 50, 28],
  [572, 260, 14, 45],
];

interface Fx {
  rocks: Cut[];
  amber: HTMLCanvasElement;
  warm: HTMLCanvasElement;
  dusty: HTMLCanvasElement;
  dust: Particles;
  cloud: Particles;
  pebbles: Particles;
}

function bake(img: HTMLCanvasElement): Fx {
  const [src, sg] = canvas(img.width, img.height);
  sg.drawImage(img, 0, 0);
  return {
    rocks: ROCKS.map(([x0, y0, x1, y1]) => liftDark(img, x0, y0, x1, y1, 80, 140, 4, src)),
    amber: glow('255,170,70'),
    warm: glow('255,215,150'),
    dusty: glow('205,170,120'),
    dust: { n: 70, box: [40, 220, 1340, 560], vx: 0.12, vy: -0.08, spread: 0.12, life: 600, size: [1, 2.2], sway: 16, rgb: '255,220,160', rgb2: '255,190,120', alpha: 0.6, kind: 'mote', seed: 9 },
    cloud: { n: 36, box: [80, 600, 1300, 660], vx: 0, vy: -0.7, spread: 0.6, life: 180, size: [30, 60], rgb: '205,170,120', alpha: 0.3, kind: 'puff', seed: 21 },
    pebbles: { n: 22, box: [150, 0, 1250, 60], vx: 0, vy: 1.5, spread: 0.4, grav: 0.09, life: 110, size: [1.5, 3], rgb: '70,55,45', alpha: 0.9, kind: 'dot', seed: 33, floorY: 690 },
  };
}

function draw(g: G, F: Fx, frame: number, flash: number): void {
  const q = burst(frame, QUAKE_PERIOD, 2, 61, 0.9, 150);
  // warm light shafts slowly breathe
  shaft(g, { x: 150, y: 0 }, { x: 350, y: 0 }, { x: 470, y: 540 }, { x: 270, y: 540 }, '255,210,140', 0.05 + 0.04 * wave(frame, 380));
  shaft(g, { x: 900, y: 0 }, { x: 1100, y: 0 }, { x: 930, y: 540 }, { x: 760, y: 540 }, '255,210,140', 0.05 + 0.04 * wave(frame, 330, 2));
  // runes pulse in turn, brighter during a tremor
  for (const [i, [x, y, rx, ry]] of RUNES.entries()) glowAt(g, F.amber, x, y, rx * 1.8, ry * 1.5, 0.12 + 0.2 * wave(frame, 200 + i * 29, i * 0.9) + 0.25 * q);
  // floating rocks bob, each on its own phase; they shake when the ground trembles
  for (const [i, c] of F.rocks.entries()) {
    const bob = Math.sin(frame * 0.02 + i * 1.7) * 3.5 + Math.sin(frame * 0.007 + i) * 2;
    const shake = q > 0 ? (hash(frame * 3 + i) - 0.5) * 4 * q : 0;
    drawCut(g, c, shake, bob, Math.sin(frame * 0.012 + i * 2) * 0.03, c.x + c.sprite.width / 2, c.y + c.sprite.height / 2);
  }
  particles(g, frame, F.dust, F.warm);
  // floor circuits glow and run
  for (const [x, y, rx, k] of [
    [140, 662, 90, 1],
    [470, 735, 110, 2],
    [920, 690, 120, 3],
    [1200, 735, 90, 4],
    [690, 600, 260, 5],
  ])
    glowAt(g, F.amber, x, y, rx, rx * 0.12, 0.1 + 0.1 * wave(frame, 160 + k * 31, k) + 0.15 * q);
  if (q > 0) {
    particles(g, frame, F.cloud, F.dusty, q);
    particles(g, frame, F.pebbles, undefined, q);
  }
  if (flash > 0) glowAt(g, F.warm, 688, 384, 700, 400, flash * 0.15);
}

function sounds(from: number, to: number): ArenaSound[] {
  return [
    ...timetable(from, to, QUAKE_PERIOD, 2, 61, 0.9, () => ({ kind: 'rumble', x: 0.5, big: true, ground: true })),
    ...timetable(from, to, 500, 3, 83, 0.45, (s) => ({ kind: 'crackle', x: hash(s * 5), big: false, ground: true })),
  ];
}

export const earth: ArenaDef<Fx> = {
  id: 'eartharena',
  name: 'Earth Arena',
  icon: '🪨',
  image: new URL('./arena.png', import.meta.url).href,
  floor: FLOOR / 768,
  sky: '#1c1a26',
  ground: '#2a2420',
  sfxLabel: 'Tremors and falling pebbles',
  bake,
  draw,
  sounds,
  song: {
    title: 'Rune Quake',
    bpm: 100,
    // Em F Em D, C D Em Em (E with a Phrygian F)
    prog: [
      { root: 40, tones: [0, 3, 7] },
      { root: 41, tones: [0, 4, 7] },
      { root: 40, tones: [0, 3, 7] },
      { root: 38, tones: [0, 4, 7] },
      { root: 36, tones: [0, 4, 7] },
      { root: 38, tones: [0, 4, 7] },
      { root: 40, tones: [0, 3, 7] },
      { root: 40, tones: [0, 3, 7, 10] },
    ],
    lead: [
      [76, 0, 77, 0, 79, 0, 77, 76],
      [74, 0, 76, 0, 0, 0, 71, 0],
      [72, 0, 74, 76, 79, 0, 77, 0],
      [76, 0, 0, 0, 0, 0, 0, 0],
    ],
    drums: 'tribal',
    bass: [0, 3, 8, 10],
    bassWave: 'sawtooth',
    bassCut: 500,
    // a sparse plucked-string figure (koto voice) over the drums
    arp: [0, 2, 1, 3, 0, 2, 3, 1],
    arpWave: 'sawtooth',
    arpCut: 2000,
    arpRate: 2,
    padWave: 'sawtooth',
    padLevel: 0.06,
    padCut: 700,
    leadWave: ['square', 'triangle'],
    echo: 3,
    leadAlways: true,
    leadVoice: 'brass',
    arpVoice: 'koto',
    taiko: true,
  },
  // a low earth drone under a dry wind
  air: { cut: 400, level: 0.035, lfo: 0.06, depth: 150, drone: 41, droneLevel: 0.05 },
};

