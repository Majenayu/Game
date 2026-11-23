/**
 * Shadow Arena (the dark platform over the glitch city): the owner's picture arena.png. The stickman painted in the
 * middle of the picture is removed (the fighters stand there instead) and a turning shadow vortex covers the place
 * where its feet were. Smoke drifts on both sides, the circuit lines on the platform pulse with light, the city
 * below glitches and flickers, and every few seconds the vortex surges with a burst of dark sparks.
 * Music: "Null Signal", a fast 140 BPM driving loop in F# minor.
 */
import { glow, hash, timetable, type ArenaDef, type ArenaSound, type G, type Pt } from '../engine/arena';
import { burst, cutOut, flicker, glowAt, particles, wave, type Particles } from '../engine/fxkit';
import { startLab } from '../engine/lab';

const TAU = Math.PI * 2;
const FLOOR = 560;
const SURGE_PERIOD = 900;
const GLITCH_PERIOD = 420;
const VX = 690;
const VY = 512;
// circuit paths that carry pulses of light
const LINES: Pt[][] = [
  [{ x: 600, y: 580 }, { x: 585, y: 640 }, { x: 560, y: 768 }],
  [{ x: 640, y: 580 }, { x: 630, y: 680 }, { x: 610, y: 768 }],
  [{ x: 740, y: 580 }, { x: 755, y: 680 }, { x: 775, y: 768 }],
  [{ x: 780, y: 580 }, { x: 800, y: 650 }, { x: 830, y: 768 }],
  [{ x: 540, y: 520 }, { x: 420, y: 510 }, { x: 330, y: 525 }, { x: 210, y: 520 }],
  [{ x: 840, y: 520 }, { x: 960, y: 505 }, { x: 1060, y: 520 }, { x: 1180, y: 515 }],
  [{ x: 560, y: 545 }, { x: 430, y: 560 }, { x: 300, y: 555 }],
  [{ x: 820, y: 545 }, { x: 950, y: 560 }, { x: 1080, y: 552 }],
];
// glitch city boxes
const CITY: Array<[number, number, number, number]> = [
  [0, 420, 420, 768],
  [1140, 390, 1376, 640],
  [950, 640, 1376, 768],
];

interface Fx {
  violet: HTMLCanvasElement;
  pink: HTMLCanvasElement;
  smoke: Particles;
  smokeR: Particles;
  sparks: Particles;
}

function bake(img: HTMLCanvasElement): Fx {
  // paint out the painted stickman: head, body, arms and legs, with its glow
  cutOut(
    img,
    (g) => {
      g.moveTo(690 + 54, 216);
      g.arc(690, 216, 54, 0, TAU);
      g.moveTo(640, 255);
      g.lineTo(742, 255);
      g.lineTo(762, 365);
      g.lineTo(760, 398);
      g.lineTo(742, 402);
      g.lineTo(748, 528);
      g.lineTo(612, 532);
      g.lineTo(624, 402);
      g.lineTo(612, 400);
      g.lineTo(614, 330);
      g.closePath();
    },
    'row',
    8,
    false,
  );
  return {
    violet: glow('170,80,255'),
    pink: glow('255,80,200'),
    smoke: { n: 9, box: [140, 220, 500, 470], vx: 0.12, vy: -0.18, spread: 0.08, life: 700, size: [45, 85], sway: 30, rgb: '200,70,170', alpha: 0.09, kind: 'puff', seed: 3 },
    smokeR: { n: 9, box: [880, 220, 1300, 470], vx: -0.12, vy: -0.18, spread: 0.08, life: 700, size: [45, 85], sway: 30, rgb: '120,60,200', alpha: 0.09, kind: 'puff', seed: 13 },
    sparks: { n: 40, box: [VX - 60, VY - 12, VX + 60, VY + 6], vx: 0, vy: -2.4, spread: 1.6, grav: 0.03, life: 80, size: [1, 2.4], rgb: '210,140,255', rgb2: '255,120,220', alpha: 1, kind: 'ember', seed: 51 },
  };
}

function along(path: Pt[], t: number): Pt {
  const n = path.length - 1;
  const u = Math.min(n - 1e-6, Math.max(0, t * n));
  const i = Math.floor(u);
  const f = u - i;
  return { x: path[i].x + (path[i + 1].x - path[i].x) * f, y: path[i].y + (path[i + 1].y - path[i].y) * f };
}

/** the shadow vortex: a dark core with turning purple arms, seen flat on the platform */
function vortex(g: G, F: Fx, frame: number, surge: number): void {
  const rx = 150 + 20 * surge;
  const ry = 40 + 6 * surge;
  // dark core (also hides what is left of the painted feet)
  const gr = g.createRadialGradient(VX, VY, 0, VX, VY, rx);
  gr.addColorStop(0, 'rgba(5,0,15,0.95)');
  gr.addColorStop(0.35, 'rgba(25,5,45,0.8)');
  gr.addColorStop(0.7, 'rgba(60,15,100,0.35)');
  gr.addColorStop(1, 'rgba(60,15,100,0)');
  g.save();
  g.translate(VX, VY);
  g.scale(1, ry / rx);
  g.translate(-VX, -VY);
  g.fillStyle = gr;
  g.beginPath();
  g.arc(VX, VY, rx, 0, TAU);
  g.fill();
  g.restore();
  // turning arms
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  const spin = frame * 0.05;
  for (let k = 0; k < 4; k++) {
    for (let j = 0; j < 3; j++) {
      const f = 0.35 + j * 0.22;
      const a0 = spin * (1.4 - j * 0.3) + (k * TAU) / 4 + j;
      g.strokeStyle = `rgba(${j === 1 ? '255,110,220' : '190,110,255'},${(0.35 - j * 0.07) * (0.7 + 0.6 * surge)})`;
      g.lineWidth = 3 - j * 0.7;
      g.beginPath();
      g.ellipse(VX, VY, rx * f, ry * f, 0, a0, a0 + 1.4);
      g.stroke();
    }
  }
  g.globalCompositeOperation = 'source-over';
  glowAt(g, F.violet, VX, VY, rx * 1.1, ry * 1.6, 0.25 + 0.15 * wave(frame, 90) + 0.4 * surge);
}

function draw(g: G, F: Fx, frame: number, flash: number): void {
  const surge = burst(frame, SURGE_PERIOD, 2, 71, 0.9, 120);
  // smoke drifts on both sides
  particles(g, frame, F.smoke, F.pink);
  particles(g, frame, F.smokeR, F.violet);
  // a dark wisp column where the shadow rises from the vortex
  for (let i = 0; i < 6; i++) {
    const y = VY - 40 - ((frame * 0.6 + i * 60) % 360);
    const a = Math.max(0, 1 - (VY - y) / 360) * 0.18;
    const x = VX + Math.sin(frame * 0.02 + i * 2) * 25;
    glowAt(g, F.violet, x, y, 40, 26, a * (0.6 + surge));
  }
  // circuit lines pulse
  for (const [i, path] of LINES.entries()) {
    const t = ((frame / (100 + (i % 3) * 30) + hash(i * 9)) % 1 + 1) % 1;
    const p = along(path, t);
    glowAt(g, i % 2 ? F.pink : F.violet, p.x, p.y, 22, 10, 0.55 * Math.sin(Math.PI * t) * (0.7 + 0.5 * surge));
  }
  vortex(g, F, frame, surge);
  if (surge > 0) particles(g, frame, F.sparks, F.violet, surge);
  // the city below glitches: slices of the picture jump sideways for a few frames
  const gl = burst(frame, GLITCH_PERIOD, 3, 88, 0.8, 18);
  for (const [i, [x0, y0, x1, y1]] of CITY.entries()) {
    const f = flicker(frame, 8, i * 5);
    glowAt(g, i % 2 ? F.pink : F.violet, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) * 0.6, (y1 - y0) * 0.5, 0.06 + 0.08 * f);
    if (gl > 0) {
      for (let k = 0; k < 4; k++) {
        const h = hash(Math.floor(frame / 3) * 7 + k + i * 13);
        const y = y0 + h * (y1 - y0 - 10);
        const w = 40 + hash(k * 3 + Math.floor(frame / 3)) * 160;
        const x = x0 + hash(k * 5 + i + Math.floor(frame / 3)) * (x1 - x0 - w);
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = k % 2 ? `rgba(80,255,240,${0.25 * gl})` : `rgba(255,60,200,${0.25 * gl})`;
        g.fillRect(x, y, w, 3 + h * 6);
        g.globalCompositeOperation = 'source-over';
      }
    }
  }
  if (flash > 0) glowAt(g, F.violet, 688, 384, 700, 400, flash * 0.15);
}

function sounds(from: number, to: number): ArenaSound[] {
  return [
    ...timetable(from, to, SURGE_PERIOD, 2, 71, 0.9, () => ({ kind: 'hum', x: VX / 1376, big: true, ground: true })),
    ...timetable(from, to, GLITCH_PERIOD, 3, 88, 0.8, (s) => (hash(s * 13 + 4) < 0.5 ? { kind: 'crackle', x: hash(s * 3) > 0.5 ? 0.85 : 0.15, big: false, ground: false } : null)),
  ];
}

export const shadow: ArenaDef<Fx> = {
  id: 'shadowarena',
  name: 'Shadow Arena',
  icon: '🌑',
  image: new URL('./arena.png', import.meta.url).href,
  floor: FLOOR / 768,
  sky: '#0e0c22',
  ground: '#07060e',
  sfxLabel: 'Vortex hum and glitches',
  bake,
  draw,
  sounds,
  song: {
    title: 'Null Signal',
    bpm: 140,
    // F#m D E C#, F#m A B C#7
    prog: [
      { root: 42, tones: [0, 3, 7] },
      { root: 38, tones: [0, 4, 7] },
      { root: 40, tones: [0, 4, 7] },
      { root: 37, tones: [0, 4, 7] },
      { root: 42, tones: [0, 3, 7, 10] },
      { root: 45, tones: [0, 4, 7] },
      { root: 47, tones: [0, 3, 7] },
      { root: 37, tones: [0, 4, 7, 10] },
    ],
    lead: [
      [78, 0, 78, 81, 0, 80, 78, 0],
      [76, 0, 74, 0, 73, 0, 74, 76],
      [78, 0, 81, 0, 83, 0, 85, 0],
      [80, 0, 0, 77, 0, 0, 0, 0],
    ],
    drums: 'drive',
    bass: [0, 2, 4, 6, 8, 10, 12, 14],
    bassWave: 'sawtooth',
    bassCut: 800,
    arp: [0, 1, 2, 3, 2, 1, 0, 2],
    arpWave: 'square',
    arpCut: 1800,
    arpRate: 1,
    padWave: 'sawtooth',
    padLevel: 0.05,
    padCut: 800,
    leadWave: ['square', 'sawtooth'],
    echo: 3,
    leadAlways: true,
    bassVoice: 'drive',
    glitch: true,
  },
  // a dark low hum and a breathy hiss
  air: { cut: 500, level: 0.025, lfo: 0.1, depth: 200, drone: 46, droneLevel: 0.04 },
};

void startLab(shadow);
