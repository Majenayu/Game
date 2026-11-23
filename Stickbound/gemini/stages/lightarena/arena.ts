/**
 * Light Arena (the sun-deck of a space station): the owner's picture arena.png with turning sun rays in the big
 * window, a solar flare that flashes now and then, breathing light beams, flickering ceiling lamps, golden dust
 * and a shine that sweeps across the floor. Music: "Solar Hall", a bright 128 BPM loop in C major.
 */
import { glow, timetable, type ArenaDef, type ArenaSound, type G } from '../engine/arena';
import { burst, flicker, glowAt, particles, shaft, wave, type Particles } from '../engine/fxkit';

const FLOOR = 640;
const SUN = { x: 905, y: 300 };
const FLARE_PERIOD = 840;
// the window opening (octagon), rays are clipped to it
const WINDOW = [
  [640, 160],
  [1115, 155],
  [1215, 240],
  [1215, 330],
  [1145, 405],
  [640, 410],
  [565, 335],
  [565, 245],
];
const LAMPS: Array<[number, number, number]> = [
  [495, 62, 55],
  [828, 90, 22],
  [690, 115, 26],
  [1040, 92, 14],
  [1150, 28, 26],
];
interface Fx {
  gold: HTMLCanvasElement;
  white: HTMLCanvasElement;
  dust: Particles;
}

function bake(): Fx {
  return {
    gold: glow('255,225,150'),
    white: glow('255,250,230'),
    dust: { n: 70, box: [60, 40, 1320, 640], vx: 0.08, vy: -0.08, spread: 0.12, life: 600, size: [0.8, 2], sway: 8, rgb: '255,235,180', alpha: 0.75, kind: 'mote', seed: 5 },
  };
}

function draw(g: G, F: Fx, frame: number, flash: number): void {
  const flare = burst(frame, FLARE_PERIOD, 2, 19, 0.9, 120);
  // sun rays slowly turning inside the window
  g.save();
  g.beginPath();
  WINDOW.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.clip();
  g.globalCompositeOperation = 'lighter';
  const turn = frame * 0.0012;
  for (let i = 0; i < 14; i++) {
    const a = turn + (i / 14) * Math.PI * 2;
    const w = 0.035 + 0.02 * Math.sin(i * 2.3);
    const len = 520;
    const al = (0.05 + 0.04 * wave(frame, 200 + i * 13, i)) * (1 + flare * 2);
    const gr = g.createRadialGradient(SUN.x, SUN.y, 10, SUN.x, SUN.y, len);
    gr.addColorStop(0, `rgba(255,245,210,${al})`);
    gr.addColorStop(1, 'rgba(255,245,210,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(SUN.x, SUN.y);
    g.arc(SUN.x, SUN.y, len, a - w, a + w);
    g.closePath();
    g.fill();
  }
  g.restore();
  g.globalCompositeOperation = 'source-over';
  // the sun's core breathes; a flare blooms out over the deck
  glowAt(g, F.white, SUN.x, SUN.y, 120, 120, 0.25 + 0.12 * wave(frame, 180) + 0.6 * flare);
  if (flare > 0) {
    glowAt(g, F.gold, SUN.x, SUN.y, 600, 330, 0.35 * flare);
    // lens ghosts along the line from the sun through the middle of the view
    for (const [k, r] of [
      [0.5, 26],
      [0.9, 14],
      [1.4, 40],
    ])
      glowAt(g, F.gold, SUN.x + (688 - SUN.x) * k * 2, SUN.y + (420 - SUN.y) * k * 2, r, r, 0.3 * flare);
  }
  // beams from the ceiling
  shaft(g, { x: 455, y: 45 }, { x: 540, y: 75 }, { x: 420, y: 340 }, { x: 260, y: 300 }, '255,235,170', 0.1 + 0.07 * wave(frame, 320));
  shaft(g, { x: 1135, y: 20 }, { x: 1190, y: 30 }, { x: 1376, y: 260 }, { x: 1250, y: 300 }, '255,235,170', 0.09 + 0.07 * wave(frame, 280, 2));
  for (const [i, [x, y, r]] of LAMPS.entries()) {
    const f = flicker(frame, 5, 30 + i) > 0.12 ? 1 : 0.4;
    glowAt(g, F.gold, x, y, r * 1.6, r * 0.6, (0.2 + 0.1 * flicker(frame, 20, i)) * f);
  }
  particles(g, frame, F.dust, F.gold);
  // a shine sweeps across the floor
  const u = (frame % 600) / 600;
  if (u < 0.35) {
    const x = -200 + (u / 0.35) * 1800;
    const gr = g.createLinearGradient(x - 120, 0, x + 120, 0);
    gr.addColorStop(0, 'rgba(255,245,220,0)');
    gr.addColorStop(0.5, 'rgba(255,245,220,0.16)');
    gr.addColorStop(1, 'rgba(255,245,220,0)');
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(x - 140, 555);
    g.lineTo(x + 60, 555);
    g.lineTo(x + 140, 700);
    g.lineTo(x - 60, 700);
    g.closePath();
    g.fill();
    g.globalCompositeOperation = 'source-over';
  }
  if (flash > 0) glowAt(g, F.white, 688, 384, 700, 400, flash * 0.15);
}

function sounds(from: number, to: number): ArenaSound[] {
  return timetable(from, to, FLARE_PERIOD, 2, 19, 0.9, () => ({ kind: 'chime', x: SUN.x / 1376, big: true, ground: false }));
}

export const light: ArenaDef<Fx> = {
  id: 'lightarena',
  name: 'Light Arena',
  icon: '☀️',
  image: new URL('./arena.png', import.meta.url).href,
  floor: FLOOR / 768,
  sky: '#1e2236',
  ground: '#25242f',
  sfxLabel: 'Station hum and solar flares',
  bake,
  draw,
  sounds,
  song: {
    title: 'Solar Hall',
    bpm: 128,
    // C G Am F, C G F G
    prog: [
      { root: 48, tones: [0, 4, 7, 14] },
      { root: 55, tones: [0, 4, 7] },
      { root: 57, tones: [0, 3, 7] },
      { root: 53, tones: [0, 4, 7, 11] },
      { root: 48, tones: [0, 4, 7] },
      { root: 55, tones: [0, 4, 7] },
      { root: 53, tones: [0, 4, 7, 9] },
      { root: 55, tones: [0, 5, 7] },
    ],
    lead: [
      [76, 0, 79, 0, 84, 0, 83, 79],
      [79, 0, 0, 74, 79, 0, 81, 0],
      [77, 0, 81, 0, 84, 0, 86, 84],
      [83, 0, 79, 0, 81, 0, 0, 0],
    ],
    drums: 'drive',
    bass: [0, 3, 6, 8, 11, 14],
    bassWave: 'square',
    bassCut: 1000,
    arp: [0, 1, 2, 3, 2, 1, 2, 3],
    arpWave: 'square',
    arpCut: 4000,
    arpRate: 1,
    padWave: 'sawtooth',
    padLevel: 0.07,
    padCut: 2200,
    leadWave: ['square', 'triangle'],
    echo: 3,
    leadAlways: true,
    leadVoice: 'choir',
    arpVoice: 'harp',
    bell: true,
  },
  // station air hum
  air: { cut: 300, level: 0.03, lfo: 0.04, depth: 80, drone: 55, droneLevel: 0.025 },
};

