/**
 * Water Arena (the flooded harbour): the owner's picture arena.png with rain, rising bubbles, swaying light shafts,
 * flickering holo screens, glints on the water behind the dock, rain ripples on the wet floor and a wave that
 * splashes over the dock edge now and then. Music: "Tide Engine", a 112 BPM flowing loop in E minor.
 */
import { glow, hash, timetable, type ArenaDef, type ArenaSound, type G } from '../engine/arena';
import { burst, flicker, glowAt, particles, shaft, wave, type Particles } from '../engine/fxkit';

const FLOOR = 640;
const WAVE_PERIOD = 960;
interface Fx {
  cyan: HTMLCanvasElement;
  white: HTMLCanvasElement;
  rain: Particles;
  bubbles: Particles;
  spray: Particles;
}
// holo screens (x0, y0, x1, y1)
const HOLO: Array<[number, number, number, number]> = [
  [125, 80, 245, 280],
  [1055, 70, 1255, 370],
  [450, 245, 545, 300],
  [950, 285, 1035, 345],
];

function bake(): Fx {
  return {
    cyan: glow('90,230,255'),
    white: glow('220,250,255'),
    rain: { n: 120, box: [-100, -40, 1400, 500], vx: 1.2, vy: 9, life: 80, size: [0.8, 1.4], rgb: '200,240,255', alpha: 0.32, kind: 'streak', seed: 3, floorY: 760 },
    bubbles: { n: 40, box: [40, 300, 1340, 760], vx: 0, vy: -0.7, spread: 0.2, life: 420, size: [2, 6], sway: 6, rgb: '190,245,255', alpha: 0.5, kind: 'bubble', seed: 9 },
    spray: { n: 50, box: [300, 535, 1080, 548], vx: 0, vy: -3.4, spread: 1.3, grav: 0.12, life: 60, size: [1.5, 3], rgb: '220,250,255', alpha: 0.85, kind: 'dot', seed: 21, floorY: 575 },
  };
}

function draw(g: G, F: Fx, frame: number, flash: number): void {
  // light shafts sway in brightness
  shaft(g, { x: 230, y: 0 }, { x: 320, y: 0 }, { x: 600, y: 420 }, { x: 470, y: 440 }, '120,240,255', 0.1 * wave(frame, 300));
  shaft(g, { x: 470, y: 0 }, { x: 560, y: 0 }, { x: 880, y: 330 }, { x: 790, y: 360 }, '120,240,255', 0.09 * wave(frame, 380, 2));
  shaft(g, { x: 975, y: 0 }, { x: 1040, y: 0 }, { x: 990, y: 300 }, { x: 900, y: 300 }, '120,240,255', 0.08 * wave(frame, 260, 4));
  // holo screens flicker and roll a scan line
  for (const [i, [x0, y0, x1, y1]] of HOLO.entries()) {
    const f = flicker(frame, 8, 40 + i);
    glowAt(g, F.cyan, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) * 0.75, (y1 - y0) * 0.7, 0.08 + 0.1 * f);
    const sy = y0 + ((frame * 0.8 + i * 70) % (y1 - y0));
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(150,240,255,${0.18 * f})`;
    g.fillRect(x0, sy, x1 - x0, 3);
    g.globalCompositeOperation = 'source-over';
  }
  // glints on the water behind the dock
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const x = 420 + hash(i * 5) * 560;
    const y = 440 + hash(i * 9) * 95;
    const a = Math.max(0, Math.sin(frame * 0.05 + i * 1.7)) ** 3 * 0.5;
    if (a < 0.02) continue;
    g.fillStyle = `rgba(210,250,255,${a})`;
    g.fillRect(x - 9, y, 18, 1.6);
  }
  g.globalCompositeOperation = 'source-over';
  // rain ripples on the wet floor: rings that grow and fade
  g.lineWidth = 1.3;
  for (let i = 0; i < 18; i++) {
    const life = 50;
    const off = Math.floor(hash(i * 3 + 1) * life);
    const cyc = Math.floor((frame + off) / life);
    const age = (frame + off) % life;
    const x = 30 + hash(i * 11 + cyc * 7) * 1316;
    const y = 590 + hash(i * 13 + cyc * 3) ** 0.8 * 170;
    const r = 3 + age * 0.55 * (0.6 + (y - 590) / 170);
    g.strokeStyle = `rgba(210,250,255,${0.45 * (1 - age / life)})`;
    g.beginPath();
    g.ellipse(x, y, r, r * 0.3, 0, 0, Math.PI * 2);
    g.stroke();
  }
  particles(g, frame, F.bubbles);
  particles(g, frame, F.rain);
  // a wave hits the dock edge now and then
  const b = burst(frame, WAVE_PERIOD, 2, 61, 0.9, 90);
  if (b > 0) {
    glowAt(g, F.white, 690, 548, 420, 26, 0.35 * b);
    particles(g, frame, F.spray, undefined, b);
  }
  if (flash > 0) glowAt(g, F.cyan, 688, 384, 700, 400, flash * 0.15);
}

function sounds(from: number, to: number): ArenaSound[] {
  return [
    ...timetable(from, to, WAVE_PERIOD, 2, 61, 0.9, () => ({ kind: 'splash', x: 0.5, big: true, ground: true })),
    ...timetable(from, to, 300, 4, 88, 0.25, (s) => ({ kind: 'splash', x: hash(s * 5), big: false, ground: false })),
  ];
}

export const water: ArenaDef<Fx> = {
  id: 'waterarena',
  name: 'Water Arena',
  icon: '🌊',
  image: new URL('./arena.png', import.meta.url).href,
  floor: FLOOR / 768,
  sky: '#0d2a44',
  ground: '#3aa9bb',
  sfxLabel: 'Rain, waves and splashes',
  bake,
  draw,
  sounds,
  song: {
    title: 'Tide Engine',
    bpm: 112,
    // Em C G D, Em C Am B
    prog: [
      { root: 52, tones: [0, 3, 7] },
      { root: 48, tones: [0, 4, 7, 11] },
      { root: 55, tones: [0, 4, 7] },
      { root: 50, tones: [0, 4, 7] },
      { root: 52, tones: [0, 3, 7, 10] },
      { root: 48, tones: [0, 4, 7, 11] },
      { root: 57, tones: [0, 3, 7] },
      { root: 47, tones: [0, 4, 7] },
    ],
    lead: [
      [76, 0, 79, 0, 78, 76, 74, 0],
      [72, 0, 76, 0, 74, 72, 71, 0],
      [69, 72, 76, 0, 74, 0, 72, 71],
      [71, 0, 75, 0, 78, 0, 0, 0],
    ],
    drums: 'soft',
    bass: [0, 3, 6, 8, 11],
    bassWave: 'triangle',
    bassCut: 900,
    arp: [0, 1, 2, 3, 2, 1],
    arpWave: 'triangle',
    arpCut: 2600,
    arpRate: 1,
    padWave: 'triangle',
    padLevel: 0.09,
    padCut: 1600,
    leadWave: ['sine', 'triangle'],
    echo: 3,
    leadAlways: true,
    leadVoice: 'glass',
    arpVoice: 'drop',
    wobble: 0.12,
  },
  // rain and sea hiss
  air: { cut: 1400, level: 0.05, lfo: 0.06, depth: 500, band: true },
};

