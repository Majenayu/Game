/**
 * Ice Arena (the cryo lab): the owner's picture arena.png. The painted "Cryo Lab" logo and badge in the top left
 * corner are removed. Snow falls, cold fog rolls across the floor, the ceiling lamp's cone of light shimmers, the
 * cryo tubes glow, steam puffs out of the pipe and frost glints on the ice. Music: "Cryo Drift", a calm 90 BPM
 * loop in B minor with bells.
 */
import { glow, hash, timetable, type ArenaDef, type ArenaSound, type G } from '../engine/arena';
import { burst, cutOut, glowAt, particles, shaft, wave, type Particles } from '../engine/fxkit';
import { startLab } from '../engine/lab';

const FLOOR = 660;
const STEAM_PERIOD = 600;
const GLINT_PERIOD = 360;
// cryo tubes: x0, y0, x1, y1
const TUBES: Array<[number, number, number, number]> = [
  [150, 170, 225, 520],
  [340, 260, 400, 520],
  [455, 370, 495, 500],
];
// frost glint spots on the ice chunks
const GLINTS: Array<[number, number]> = [
  [60, 600],
  [190, 640],
  [330, 735],
  [1110, 600],
  [1260, 630],
  [1330, 720],
  [920, 690],
];

interface Fx {
  ice: HTMLCanvasElement;
  white: HTMLCanvasElement;
  snow: Particles;
  snowNear: Particles;
  fog: Particles;
  steam: Particles;
}

function bake(img: HTMLCanvasElement): Fx {
  // paint out the logo and the badge (filled from the ceiling either side)
  cutOut(img, (g) => g.rect(36, 8, 430, 64), 'row', 3, false);
  return {
    ice: glow('170,225,255'),
    white: glow('235,250,255'),
    snow: { n: 90, box: [0, -20, 1376, 300], vx: 0.15, vy: 0.55, spread: 0.15, life: 1100, size: [0.8, 1.8], sway: 18, rgb: '235,245,255', alpha: 0.8, kind: 'flake', seed: 2, floorY: 700 },
    snowNear: { n: 16, box: [0, -40, 1376, 200], vx: 0.3, vy: 1.1, spread: 0.2, life: 650, size: [2.4, 3.4], sway: 26, rgb: '245,250,255', alpha: 0.75, kind: 'flake', seed: 4, floorY: 760 },
    fog: { n: 14, box: [-100, 480, 1400, 610], vx: 0.25, vy: -0.02, spread: 0.1, life: 900, size: [75, 130], sway: 20, rgb: '220,240,255', alpha: 0.18, kind: 'puff', seed: 8 },
    // cold vapour pours out under the pipe bend and sinks
    steam: { n: 18, box: [915, 240, 985, 270], vx: -0.1, vy: 0.3, spread: 0.35, life: 140, size: [20, 50], sway: 10, rgb: '235,245,255', alpha: 0.3, kind: 'puff', seed: 16 },
  };
}

function draw(g: G, F: Fx, frame: number, flash: number): void {
  // the ceiling lamp's cone of light
  const lamp = 0.08 + 0.05 * wave(frame, 300) + 0.02 * wave(frame, 37, 1);
  shaft(g, { x: 560, y: 55 }, { x: 810, y: 55 }, { x: 860, y: 580 }, { x: 510, y: 580 }, '200,235,255', lamp);
  glowAt(g, F.white, 685, 55, 140, 22, 0.25 + 0.15 * wave(frame, 300));
  // cryo tubes glow
  for (const [i, [x0, y0, x1, y1]] of TUBES.entries()) glowAt(g, F.ice, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) * 1.1, (y1 - y0) * 0.6, 0.12 + 0.12 * wave(frame, 200 + i * 45, i));
  // frosted windows breathe
  glowAt(g, F.ice, 1160, 320, 170, 190, 0.06 + 0.05 * wave(frame, 420, 2));
  // steam from the pipe in puffs
  const st = burst(frame, STEAM_PERIOD, 2, 23, 0.9, 150);
  if (st > 0) particles(g, frame, F.steam, F.white, st);
  particles(g, frame, F.fog, F.white);
  particles(g, frame, F.snow);
  particles(g, frame, F.snowNear);
  // frost glints: a little star flashes on the ice now and then
  const gb = burst(frame, GLINT_PERIOD, 3, 57, 0.8, 40);
  if (gb > 0) {
    const s = Math.floor(frame / (GLINT_PERIOD / 3));
    const [x, y] = GLINTS[Math.floor(hash(s * 5 + 1) * GLINTS.length)];
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(240,250,255,${gb})`;
    g.lineWidth = 1.5;
    const r = 12 * gb;
    g.beginPath();
    g.moveTo(x - r, y);
    g.lineTo(x + r, y);
    g.moveTo(x, y - r);
    g.lineTo(x, y + r);
    g.stroke();
    g.globalCompositeOperation = 'source-over';
    glowAt(g, F.white, x, y, 14, 14, 0.6 * gb);
  }
  // the floor shines under the lamp
  glowAt(g, F.ice, 690, 650, 300, 40, 0.08 + 0.05 * wave(frame, 300));
  if (flash > 0) glowAt(g, F.white, 688, 384, 700, 400, flash * 0.15);
}

function sounds(from: number, to: number): ArenaSound[] {
  return [
    ...timetable(from, to, STEAM_PERIOD, 2, 23, 0.9, () => ({ kind: 'whoosh', x: 0.7, big: false, ground: false })),
    // only about half of the glints ring, so the chimes stay sparse
    ...timetable(from, to, GLINT_PERIOD, 3, 57, 0.8, (s) => (hash(s * 13 + 2) < 0.45 ? { kind: 'chime', x: GLINTS[Math.floor(hash(s * 5 + 1) * GLINTS.length)][0] / 1376, big: false, ground: false } : null)),
    ...timetable(from, to, 1300, 1, 91, 0.7, () => ({ kind: 'creak', x: 0.2, big: false, ground: true })),
  ];
}

export const ice: ArenaDef<Fx> = {
  id: 'icearena',
  name: 'Ice Arena',
  icon: '❄️',
  image: new URL('./arena.png', import.meta.url).href,
  floor: FLOOR / 768,
  sky: '#141c2e',
  ground: '#9ab8cc',
  sfxLabel: 'Steam, frost and ice creaks',
  bake,
  draw,
  sounds,
  song: {
    title: 'Cryo Drift',
    bpm: 90,
    // Bm Gmaj7 D A, Em Bm Gmaj7 F#
    prog: [
      { root: 47, tones: [0, 3, 7, 14] },
      { root: 43, tones: [0, 4, 7, 11] },
      { root: 50, tones: [0, 4, 7, 14] },
      { root: 45, tones: [0, 4, 7] },
      { root: 52, tones: [0, 3, 7, 10] },
      { root: 47, tones: [0, 3, 7] },
      { root: 43, tones: [0, 4, 7, 11] },
      { root: 42, tones: [0, 4, 7] },
    ],
    lead: [
      [83, 0, 81, 0, 78, 0, 81, 0],
      [83, 0, 0, 86, 85, 0, 81, 0],
      [79, 0, 78, 0, 76, 0, 74, 0],
      [73, 0, 78, 0, 0, 0, 0, 0],
    ],
    drums: 'soft',
    bass: [0, 7, 10],
    bassWave: 'sine',
    bassCut: 500,
    arp: [0, 2, 3, 1],
    arpWave: 'sine',
    arpCut: 4000,
    arpRate: 2,
    padWave: 'triangle',
    padLevel: 0.09,
    padCut: 2500,
    leadWave: ['sine', 'triangle'],
    echo: 5,
    leadAlways: true,
    leadVoice: 'glass',
    arpVoice: 'musicbox',
    bell: true,
  },
  // cold, thin wind
  air: { cut: 1500, level: 0.03, lfo: 0.05, depth: 600 },
};

void startLab(ice);
