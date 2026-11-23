/**
 * Gravity Arena (the space platform at the black hole): the owner's picture arena.png with the accretion disks
 * turning, matter spiralling into the black hole and the two smaller vortices, the gyroscope ring spinning, debris
 * orbiting, the light pillars pulsing and stars twinkling. Every few seconds the black hole pulses: a ring of light
 * spreads out and the platform shimmers. Music: "Event Horizon", a slow 84 BPM loop in A minor with a deep drone.
 */
import { glow, hash, timetable, type ArenaDef, type ArenaSound, type G } from '../engine/arena';
import { burst, glowAt, particles, shaft, wave, type Particles } from '../engine/fxkit';

const TAU = Math.PI * 2;
const FLOOR = 630;
const PULSE_PERIOD = 960;
// disks: centre x, y, radius x, radius y, tilt, turn speed, dots
const DISKS: Array<[number, number, number, number, number, number, number]> = [
  [760, 290, 250, 62, 0.18, 0.006, 70],
  [1100, 440, 185, 50, -0.47, 0.009, 44],
  [300, 450, 115, 70, -0.15, 0.012, 30],
];
// light pillars: x0, x1, colour
const PILLARS: Array<[number, number, 'violet' | 'pink']> = [
  [320, 420, 'violet'],
  [1050, 1110, 'violet'],
  [60, 230, 'pink'],
  [1150, 1250, 'pink'],
];

interface Fx {
  violet: HTMLCanvasElement;
  pink: HTMLCanvasElement;
  white: HTMLCanvasElement;
  stars: Array<[number, number, number]>;
  motes: Particles;
}

function bake(): Fx {
  const stars: Array<[number, number, number]> = [];
  for (let i = 0; i < 70; i++) {
    const x = hash(i * 3 + 1) * 1376;
    const y = hash(i * 3 + 2) * 520;
    stars.push([x, y, hash(i * 3 + 3)]);
  }
  return {
    violet: glow('190,120,255'),
    pink: glow('255,130,220'),
    white: glow('255,235,255'),
    stars,
    motes: { n: 40, box: [0, 380, 1376, 560], vx: 0, vy: -0.35, spread: 0.15, life: 360, size: [1, 2], sway: 8, rgb: '230,190,255', alpha: 0.6, kind: 'mote', seed: 18 },
  };
}

/** matter turning on a tilted disk; the inner dots move faster and drift inward */
function disk(g: G, frame: number, d: (typeof DISKS)[number], seed: number, pulse: number): void {
  const [cx, cy, rx, ry, tilt, spd, n] = d;
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const h = hash(i * 11 + seed);
    const life = 600 + h * 600;
    const age = (frame + hash(i * 5 + seed) * life) % life;
    const r = 1 - 0.65 * (age / life); // falls inward over its life
    const a = hash(i * 7 + seed) * TAU + (frame * spd) / (r * r * 0.6 + 0.4);
    const x = Math.cos(a) * rx * r;
    const y = Math.sin(a) * ry * r;
    const px = cx + x * c - y * s;
    const py = cy + x * s + y * c;
    // dots behind the hole (top half) are dimmer
    const back = Math.sin(a) < 0 ? 0.5 : 1;
    const al = Math.sin((Math.PI * age) / life) * back * (0.5 + 0.5 * pulse);
    g.globalAlpha = Math.min(1, al * 0.9);
    g.fillStyle = h > 0.6 ? 'rgb(255,220,250)' : 'rgb(230,160,255)';
    g.beginPath();
    g.arc(px, py, 0.8 + h * 1.6, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
  // a bright streak turning around the rim
  g.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const a0 = frame * spd * 1.4 + (k * TAU) / 3 + seed;
    g.strokeStyle = `rgba(255,210,250,${0.16 + 0.12 * pulse})`;
    g.lineWidth = 2.5 - k * 0.5;
    g.beginPath();
    g.ellipse(cx, cy, rx * (0.92 - k * 0.15), ry * (0.92 - k * 0.15), tilt, a0, a0 + 1.1);
    g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
}

function draw(g: G, F: Fx, frame: number, flash: number): void {
  const p = burst(frame, PULSE_PERIOD, 2, 29, 0.9, 140);
  // stars twinkle
  g.fillStyle = '#fff';
  for (const [i, [x, y, h]] of F.stars.entries()) {
    const tw = wave(frame, 90 + h * 200, i);
    g.globalAlpha = 0.15 + 0.6 * tw * tw;
    g.fillRect(x, y, 1.4 + h, 1.4 + h);
  }
  g.globalAlpha = 1;
  // light pillars pulse
  for (const [i, [x0, x1, c]] of PILLARS.entries()) {
    const rgb = c === 'violet' ? '180,100,255' : '255,90,200';
    shaft(g, { x: x0, y: 560 }, { x: x1, y: 560 }, { x: x1, y: 0 }, { x: x0, y: 0 }, rgb, 0.06 + 0.07 * wave(frame, 170 + i * 37, i) + 0.08 * p);
  }
  // the disks turn and feed the holes
  for (const [i, d] of DISKS.entries()) disk(g, frame, d, i * 101 + 3, i === 0 ? 0.5 + 0.5 * p : wave(frame, 200 + i * 50, i));
  // the hole's glow and its pulse ring
  glowAt(g, F.violet, 760, 290, 320, 120, 0.12 + 0.1 * wave(frame, 240) + 0.3 * p);
  if (p > 0) {
    const u = 1 - p;
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(240,190,255,${0.5 * p})`;
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(760, 290, 90 + u * 420, 30 + u * 130, 0.18, 0, TAU);
    g.stroke();
    g.globalCompositeOperation = 'source-over';
  }
  // gyroscope ring spins (a ring seen turning edge on)
  const sp = Math.cos(frame * 0.03);
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = 'rgba(220,200,255,0.45)';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(395, 170, Math.abs(sp) * 62 + 2, 72, 0, 0, TAU);
  g.stroke();
  g.globalCompositeOperation = 'source-over';
  glowAt(g, F.white, 395, 175, 18, 18, 0.35 + 0.25 * wave(frame, 60));
  // the satellite blinks
  if (frame % 90 < 8) glowAt(g, F.pink, 1150, 140, 10, 10, 0.9);
  // debris orbiting the black hole
  for (let i = 0; i < 9; i++) {
    const a = hash(i * 13) * TAU + frame * (0.002 + hash(i * 7) * 0.002);
    const rx = 330 + hash(i * 5) * 160;
    const ry = rx * 0.28;
    const x = 760 + Math.cos(a) * rx;
    const y = 290 + Math.sin(a) * ry + Math.cos(a) * rx * 0.18;
    const s = 2.5 + hash(i * 3) * 4;
    g.save();
    g.translate(x, y);
    g.rotate(frame * 0.01 * (i % 2 ? 1 : -1) + i);
    g.fillStyle = '#2a1f40';
    g.strokeStyle = 'rgba(220,170,255,0.7)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(-s, -s * 0.4);
    g.lineTo(s * 0.3, -s);
    g.lineTo(s, s * 0.2);
    g.lineTo(-s * 0.2, s);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }
  particles(g, frame, F.motes, F.violet);
  // the platform floor shimmers, brighter with each pulse
  glowAt(g, F.pink, 690 + Math.sin(frame * 0.006) * 200, 610, 300, 40, 0.08 + 0.05 * wave(frame, 200) + 0.15 * p);
  if (flash > 0) glowAt(g, F.white, 688, 384, 700, 400, flash * 0.15);
}

function sounds(from: number, to: number): ArenaSound[] {
  return [
    ...timetable(from, to, PULSE_PERIOD, 2, 29, 0.9, () => ({ kind: 'hum', x: 0.55, big: true, ground: false })),
    ...timetable(from, to, 700, 2, 47, 0.4, (s) => ({ kind: 'chime', x: hash(s * 7), big: false, ground: false })),
  ];
}

export const gravity: ArenaDef<Fx> = {
  id: 'gravityarena',
  name: 'Gravity Arena',
  icon: '🌀',
  image: new URL('./arena.png', import.meta.url).href,
  floor: FLOOR / 768,
  sky: '#120c26',
  ground: '#1c1430',
  sfxLabel: 'Black hole pulses and hum',
  bake,
  draw,
  sounds,
  song: {
    title: 'Event Horizon',
    bpm: 84,
    // Am F C G, Dm F Am E (slow, wide, space)
    prog: [
      { root: 45, tones: [0, 3, 7, 14] },
      { root: 41, tones: [0, 4, 7, 11] },
      { root: 48, tones: [0, 4, 7, 14] },
      { root: 43, tones: [0, 5, 7] },
      { root: 50, tones: [0, 3, 7, 10] },
      { root: 41, tones: [0, 4, 7, 11] },
      { root: 45, tones: [0, 3, 7] },
      { root: 40, tones: [0, 4, 7] },
    ],
    lead: [
      [76, 0, 0, 74, 72, 0, 71, 0],
      [72, 0, 0, 0, 69, 0, 0, 0],
      [76, 0, 77, 0, 79, 0, 76, 0],
      [75, 0, 0, 0, 0, 0, 0, 0],
    ],
    drums: 'soft',
    bass: [0, 10],
    bassWave: 'sine',
    bassCut: 400,
    arp: [0, 2, 1, 3],
    arpWave: 'sine',
    arpCut: 2500,
    arpRate: 2,
    padWave: 'sawtooth',
    padLevel: 0.09,
    padCut: 1100,
    leadWave: ['sine', 'triangle'],
    echo: 6,
    leadAlways: true,
    leadVoice: 'choir',
    sweep: 'down',
  },
  // a deep space drone with a faint hiss
  air: { cut: 300, level: 0.02, lfo: 0.04, depth: 120, drone: 36, droneLevel: 0.07 },
};

