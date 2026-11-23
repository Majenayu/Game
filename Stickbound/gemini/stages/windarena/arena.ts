/**
 * Wind Arena (the sky platform): the owner's picture arena.png with the floating islands bobbing on the wind,
 * wind streaks and swirls sweeping across, leaves blowing past, light pulses running along the mag-rail tubes and
 * the light shafts breathing. Strong gusts blow a flurry of leaves and streaks across now and then.
 * Music: "Skyrail", a bright 124 BPM driving loop in D with an airy wind bed.
 */
import { canvas, glow, hash, timetable, type ArenaDef, type ArenaSound, type G, type Pt } from '../engine/arena';
import { burst, drawCut, glowAt, liftDark, particles, shaft, wave, type Cut, type Particles } from '../engine/fxkit';

const FLOOR = 605;
const GUST_PERIOD = 840;
// floating islands (boxes a little larger than each island)
const ISLANDS: Array<[number, number, number, number]> = [
  [130, 80, 412, 345],
  [92, 232, 204, 356],
  [388, 236, 452, 312],
  [460, 190, 566, 292],
  [680, 190, 900, 400],
];
// mag-rail tube paths the light pulses run along
const RAILS: Pt[][] = [
  [
    { x: 0, y: 465 },
    { x: 300, y: 420 },
    { x: 560, y: 400 },
    { x: 900, y: 372 },
  ],
  [
    { x: 1000, y: 320 },
    { x: 1200, y: 250 },
    { x: 1376, y: 205 },
  ],
];
// wind swirl arcs: centre, radius x, radius y
const SWIRLS: Array<[number, number, number, number]> = [
  [110, 215, 70, 22],
  [470, 300, 60, 18],
  [870, 200, 45, 30],
  [1180, 160, 110, 22],
];

interface Fx {
  islands: Cut[];
  mint: HTMLCanvasElement;
  leaves: Particles;
  streaks: Particles;
  gustLeaves: Particles;
  gustStreaks: Particles;
}

function bake(img: HTMLCanvasElement): Fx {
  const [src, sg] = canvas(img.width, img.height);
  sg.drawImage(img, 0, 0);
  return {
    islands: ISLANDS.map(([x0, y0, x1, y1]) => liftDark(img, x0, y0, x1, y1, 150, 205, 5, src)),
    mint: glow('150,255,215'),
    leaves: { n: 18, box: [-80, 80, 1100, 620], vx: 2.2, vy: 0.25, spread: 0.6, life: 520, size: [4, 7], sway: 26, rgb: '150,240,190', rgb2: '200,255,220', alpha: 0.85, kind: 'leaf', seed: 6 },
    streaks: { n: 16, box: [-200, 120, 1100, 560], vx: 6, vy: -0.3, spread: 0.8, life: 110, size: [1, 2], rgb: '210,255,235', alpha: 0.35, kind: 'streak', seed: 14 },
    gustLeaves: { n: 30, box: [-150, 150, 0, 600], vx: 10, vy: -0.2, spread: 1.6, life: 160, size: [4, 7], sway: 34, rgb: '150,240,190', rgb2: '200,255,220', alpha: 0.95, kind: 'leaf', seed: 41 },
    gustStreaks: { n: 26, box: [-250, 150, 200, 620], vx: 14, vy: -0.4, spread: 1.5, life: 110, size: [1.2, 2.5], rgb: '220,255,240', alpha: 0.55, kind: 'streak', seed: 43 },
  };
}

/** a point a fraction t of the way along a path */
function along(path: Pt[], t: number): Pt {
  const n = path.length - 1;
  const u = Math.min(n - 1e-6, Math.max(0, t * n));
  const i = Math.floor(u);
  const f = u - i;
  return { x: path[i].x + (path[i + 1].x - path[i].x) * f, y: path[i].y + (path[i + 1].y - path[i].y) * f };
}

function draw(g: G, F: Fx, frame: number, flash: number): void {
  const gust = burst(frame, GUST_PERIOD, 2, 52, 0.85, 160);
  // light shafts from the top left
  shaft(g, { x: 100, y: 0 }, { x: 260, y: 0 }, { x: 420, y: 420 }, { x: 260, y: 420 }, '190,255,225', 0.05 + 0.05 * wave(frame, 360));
  shaft(g, { x: 330, y: 0 }, { x: 500, y: 0 }, { x: 620, y: 330 }, { x: 470, y: 330 }, '190,255,225', 0.04 + 0.04 * wave(frame, 300, 2));
  // the islands bob on the wind, each at its own pace, swaying more in a gust
  for (const [i, c] of F.islands.entries()) {
    const bob = Math.sin(frame * 0.018 + i * 1.3) * 4 + Math.sin(frame * 0.006 + i * 2.1) * 2;
    const sway = Math.sin(frame * 0.011 + i) * 0.012 + gust * 0.01;
    drawCut(g, c, gust * 2, bob, sway, c.x + c.sprite.width / 2, c.y + c.sprite.height / 2);
  }
  // wind swirls turning around their centres
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  for (const [i, [x, y, rx, ry]] of SWIRLS.entries()) {
    const a0 = frame * 0.03 + i * 2;
    g.strokeStyle = `rgba(210,255,235,${0.18 + 0.12 * wave(frame, 120 + i * 20, i) + 0.2 * gust})`;
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(x, y, rx, ry, -0.15, a0, a0 + 2.2);
    g.stroke();
    g.beginPath();
    g.ellipse(x, y, rx * 0.65, ry * 0.65, -0.15, a0 + 3, a0 + 4.6);
    g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
  // light pulses run along the rails
  for (const [r, path] of RAILS.entries())
    for (let k = 0; k < 3; k++) {
      const t = ((frame / (r ? 150 : 220) + k / 3 + r * 0.2) % 1 + 1) % 1;
      const p = along(path, t);
      glowAt(g, F.mint, p.x, p.y, 34, 12, 0.5 * Math.sin(Math.PI * t));
    }
  particles(g, frame, F.streaks);
  particles(g, frame, F.leaves);
  if (gust > 0) {
    particles(g, frame, F.gustStreaks, undefined, gust);
    particles(g, frame, F.gustLeaves, undefined, gust);
  }
  // the fog on the floor rolls
  for (const [x, y, rx, k] of [
    [300, 560, 260, 1],
    [800, 590, 300, 2],
    [1180, 640, 220, 3],
  ])
    glowAt(g, F.mint, x + Math.sin(frame * 0.004 + k) * 40, y, rx, rx * 0.15, 0.05 + 0.04 * wave(frame, 240 + k * 40, k));
  if (flash > 0) glowAt(g, F.mint, 688, 384, 700, 400, flash * 0.15);
}

function sounds(from: number, to: number): ArenaSound[] {
  return [
    ...timetable(from, to, GUST_PERIOD, 2, 52, 0.85, () => ({ kind: 'whoosh', x: 0.15, big: true, ground: false })),
    ...timetable(from, to, 420, 2, 66, 0.4, (s) => ({ kind: 'whoosh', x: hash(s * 9), big: false, ground: false })),
  ];
}

export const wind: ArenaDef<Fx> = {
  id: 'windarena',
  name: 'Wind Arena',
  icon: '🌪️',
  image: new URL('./arena.png', import.meta.url).href,
  floor: FLOOR / 768,
  sky: '#1c2a3c',
  ground: '#1a2030',
  sfxLabel: 'Gusts and wind',
  bake,
  draw,
  sounds,
  song: {
    title: 'Skyrail',
    bpm: 124,
    // D A Bm G, D C G A (D with a Mixolydian C)
    prog: [
      { root: 50, tones: [0, 4, 7] },
      { root: 45, tones: [0, 4, 7] },
      { root: 47, tones: [0, 3, 7] },
      { root: 43, tones: [0, 4, 7, 11] },
      { root: 50, tones: [0, 4, 7, 14] },
      { root: 48, tones: [0, 4, 7] },
      { root: 43, tones: [0, 4, 7] },
      { root: 45, tones: [0, 5, 7] },
    ],
    lead: [
      [78, 0, 81, 0, 83, 81, 78, 0],
      [79, 0, 76, 0, 74, 0, 76, 79],
      [81, 0, 83, 0, 86, 0, 83, 81],
      [78, 0, 76, 0, 78, 0, 0, 0],
    ],
    drums: 'drive',
    bass: [0, 3, 6, 8, 11, 14],
    bassWave: 'square',
    bassCut: 900,
    arp: [0, 1, 2, 3, 2, 1],
    arpWave: 'triangle',
    arpCut: 3500,
    arpRate: 1,
    padWave: 'triangle',
    padLevel: 0.07,
    padCut: 2200,
    leadWave: ['triangle', 'sawtooth'],
    echo: 3,
    leadAlways: true,
    leadVoice: 'flute',
    arpVoice: 'harp',
    sweep: 'up',
  },
  // airy wind bed with a strong swell
  air: { cut: 1100, level: 0.06, lfo: 0.09, depth: 700 },
};

