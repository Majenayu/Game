/**
 * Lightning Arena ("Volt City" rooftop): the owner's picture arena.png, its storm effects (arenafx.ts),
 * thunder for every strike, and a 124 BPM synth battle loop in A minor.
 */
import type { ArenaDef } from '../engine/arena';
import { bakeBackFx, drawBackFx, strikes, strikesStarting, type BackFx } from './arenafx';

/** The floor is the bright yellow roof rail: the row in the lower band with the most yellow pixels. */
function yellowRail(d: ImageData): number {
  const { width: w, height: h, data } = d;
  let best = 0;
  let bestY = Math.round(h * 0.785);
  for (let y = Math.round(h * 0.6); y < Math.round(h * 0.92); y++) {
    let n = 0;
    for (let px = 0; px < w; px += 2) {
      const i = (y * w + px) * 4;
      if (data[i] > 190 && data[i + 1] > 170 && data[i + 2] < 140) n++;
    }
    if (n > best) {
      best = n;
      bestY = y;
    }
  }
  return bestY / h;
}

export const lightning: ArenaDef<BackFx> = {
  id: 'lightningarena',
  name: 'Lightning Arena',
  icon: '⚡',
  image: new URL('./arena.png', import.meta.url).href,
  floor: yellowRail,
  sky: '#0b1030',
  ground: '#0a0f2e',
  sfxLabel: 'Thunder and wind',
  bake: bakeBackFx,
  draw: drawBackFx,
  sounds: (from, to, storm) => strikesStarting(from, to, storm).map((s) => ({ kind: 'thunder', ...s })),
  hooks: { __strikes: strikes },
  song: {
    title: 'Volt City',
    bpm: 124,
    // Am F C G, then Dm F Am G
    prog: [
      { root: 57, tones: [0, 3, 7] },
      { root: 53, tones: [0, 4, 7] },
      { root: 48, tones: [0, 4, 7] },
      { root: 55, tones: [0, 4, 7] },
      { root: 50, tones: [0, 3, 7] },
      { root: 53, tones: [0, 4, 7] },
      { root: 57, tones: [0, 3, 7] },
      { root: 55, tones: [0, 4, 7] },
    ],
    lead: [
      [74, 0, 72, 74, 0, 77, 76, 74],
      [72, 0, 69, 72, 0, 74, 72, 69],
      [76, 0, 74, 76, 0, 79, 77, 76],
      [74, 0, 71, 74, 79, 0, 78, 79],
    ],
    drums: 'drive',
    bass: [0, 2, 3, 6, 8, 10, 11, 14],
    bassWave: 'sawtooth',
    bassCut: 1100,
    arp: [0, 1, 2, 1, 2, 3, 2, 1],
    arpWave: 'square',
    arpCut: 3200,
    arpRate: 1,
    padWave: 'sawtooth',
    padLevel: 0.07,
    padCut: 1300,
    leadWave: ['sawtooth', 'square'],
    echo: 3,
  },
  // low storm wind
  air: { cut: 420, level: 0.06, lfo: 0.09, depth: 220 },
};

