/**
 * Time Arena (the clockwork hall): the owner's picture arena.png, brought to life in time with a clock.
 * Every second the clock ticks: the painted minute hands step on, the big copper gears in the corners kick forward
 * and settle, and the pendulum reaches the end of its swing (one swing per second). The copper gears in the middle
 * turn all the time, meshing in opposite directions, the hour hands creep round and the small dial sweeps. Only the
 * real gear and hand pixels move (they are lifted off the picture by colour), so the wall behind their gaps stays
 * still. Every 25 seconds the great clock strikes three deep bells, a wave of light runs over the dials and the
 * gears jolt harder. Music: "Clockwork Hall", 120 BPM (two beats per second, so the music's tick-tock falls on the
 * clock's seconds), B minor, a music-box melody over pizzicato bass and a soft tick-tock.
 */
import { canvas, glow, hash, type ArenaDef, type ArenaSound, type G } from '../engine/arena';
import { cutOut, drawCut, glowAt, liftKeyed, particles, shaft, wave, type Cut, type Particles } from '../engine/fxkit';
import { startLab } from '../engine/lab';

const TAU = Math.PI * 2;
const FLOOR = 612;
const SEC = 60; // frames per clock second
const STRIKE_PERIOD = 1500; // 25 s between strikes
const STRIKE_AT = 600; // first strike at 10 s
const BONG_GAP = 80; // frames between the three bells

type Disc = [x: number, y: number, r: number];
// copper gears in the middle that turn all the time: centre, radius, speed (radians per frame; sign = direction)
// (centres found by unwrapping the picture around them until the rims came out straight)
const SPIN: Array<[x: number, y: number, r: number, speed: number]> = [
  [605, 311, 64, -0.008], // behind the front gear, meshing with it (the same size, so the same speed)
  [560, 297, 64, 0.008], // the front gear on the shelf
  [1137, 162, 28, 0.016], // small gear by the right clock
];
// big gears cut by the picture edges: they kick on every tick and settle (direction alternates so they mesh)
const ROCK: Array<[x: number, y: number, r: number, dir: number]> = [
  [48, 2, 172, 1],
  [427, 18, 150, -1],
  [1292, -28, 195, 1],
  [25, 470, 150, -1],
  [1352, 475, 152, 1],
];
// clock hands: pivot, tip, tail (length behind the pivot), half width, which key, how it moves
interface Hand {
  px: number;
  py: number;
  tx: number;
  ty: number;
  tail: number;
  half: number;
  key: 'teal' | 'pale' | 'slate';
  move: 'tick' | 'hour' | 'sweep';
}
const HANDS: Hand[] = [
  { px: 255, py: 224, tx: 262, ty: 134, tail: 0, half: 9, key: 'teal', move: 'tick' },
  { px: 255, py: 224, tx: 185, ty: 237, tail: 0, half: 10, key: 'teal', move: 'hour' },
  { px: 1142, py: 267, tx: 1247, ty: 221, tail: 74, half: 14, key: 'pale', move: 'tick' },
  { px: 1142, py: 267, tx: 1098, ty: 190, tail: 0, half: 10, key: 'pale', move: 'hour' },
  { px: 918, py: 177, tx: 980, ty: 119, tail: 0, half: 6, key: 'slate', move: 'sweep' },
];
const DIALS: Disc[] = [
  [255, 224, 120],
  [1142, 267, 130],
  [918, 177, 50],
];
const PIVOT = { x: 1063, y: 14 }; // the pendulum's hinge (the small ring at the top)
const BOB = { x: 994, y: 437, r: 57 };

interface Fx {
  spin: Cut[];
  rock: Array<{ gear: Cut; patch: Cut }>;
  hands: Cut[];
  small: Cut;
  pendulum: Cut;
  teal: HTMLCanvasElement;
  amber: HTMLCanvasElement;
  dust: Particles;
}

const lum = (r: number, g: number, b: number) => (r + g + b) / 3;
/** copper or its dark outline, not the cold wall, not the pale lit glass */
const copper = (loose: number) => (r: number, g: number, b: number) => r - b > loose && lum(r, g, b) < 185;
const KEYS = {
  teal: (r: number, g: number) => g > 170 && g - r > 35,
  // the right clock sits in a light beam: its hands are only a little greener than the pale wall
  pale: (r: number, g: number, b: number) => (lum(r, g, b) > 172 && g - r >= 6 && g >= b) || (g > 140 && g - r > 30),
  slate: (r: number, g: number, b: number) => lum(r, g, b) > 68 && g >= r && b >= r,
};

function bake(img: HTMLCanvasElement): Fx {
  const [src, sg] = canvas(img.width, img.height);
  sg.drawImage(img, 0, 0);
  // the turning gears. Most of the back gear is hidden behind the front one, so as it turns its hidden half would
  // come into view: it is drawn instead as a copy of the front gear (the same size and make), shaded to the back
  // gear's colour. Both middle gears come off the picture together, so the hole is filled from the wall around them.
  const [B, Fg] = [SPIN[0], SPIN[1]];
  // The front gear's right-hand windows show the back gear through them, so the front gear is rebuilt from its
  // clean lower-left fifth (it has 5 spokes and 15 teeth, so every fifth is the same), which also keeps the light
  // from turning with it.
  const front = fifthGear(src, Fg, 175, (r, g, b) => r - b > -12 && lum(r, g, b) < 225);
  liftKeyed(img, src, (g) => {
    g.arc(Fg[0], Fg[1], Fg[2], 0, TAU);
    g.moveTo(B[0] + B[2], B[1]);
    g.arc(B[0], B[1], B[2], 0, TAU);
  }, copper(-25));
  const back = shadedCopy(src, front, Fg, B, copper(-25));
  // (a stricter key here: the dark wall beside it is only a little blue)
  const right = liftKeyed(img, src, (g) => g.arc(SPIN[2][0], SPIN[2][1], SPIN[2][2], 0, TAU), copper(1));
  const spin = [back, front, right];
  // the small teal gear above the shelf has no copper in it: lift its whole disc
  const small = cutPiece(src, (g) => g.arc(733, 189, 25, 0, TAU));
  cutOut(img, (g) => g.arc(733, 189, 25, 0, TAU), 'row', 2, false);
  // the big edge gears (above the floor edge only). They stay painted in the picture; the filled hole is kept as
  // a patch that is drawn under the turned gear only while it kicks, so a settled gear costs nothing to draw.
  const ig = img.getContext('2d')!;
  const rock = ROCK.map(([x, y, r]) => {
    const k = copper(-25);
    const bx = Math.max(0, Math.floor(x - r - 2));
    const by = Math.max(0, Math.floor(y - r - 2));
    const bw = Math.min(img.width, Math.ceil(x + r + 2)) - bx;
    const bh = Math.min(img.height, Math.ceil(y + r + 2)) - by;
    const gear = liftKeyed(img, src, (g) => g.arc(x, y, r, 0, TAU), (R, G, B, _px, py) => py < 548 && k(R, G, B));
    // patch and restore are both limited to the gear's own disc (no other moving part reaches into it)
    const [patch, pg] = canvas(bw, bh);
    pg.beginPath();
    pg.arc(x - bx, y - by, r + 1, 0, TAU);
    pg.clip();
    pg.drawImage(img, bx, by, bw, bh, 0, 0, bw, bh);
    ig.save();
    ig.beginPath();
    ig.arc(x, y, r + 1, 0, TAU);
    ig.clip();
    ig.drawImage(src, bx, by, bw, bh, bx, by, bw, bh); // put the painted gear back
    ig.restore();
    return { gear, patch: { sprite: patch, x: bx, y: by } as Cut };
  });
  // the clock hands: a thin band along each hand, bright (or slate) pixels only, leaving the pivot ring alone
  const hands = HANDS.map((h) =>
    liftKeyed(img, src, (g) => {
      const len = Math.hypot(h.tx - h.px, h.ty - h.py);
      const ux = (h.tx - h.px) / len;
      const uy = (h.ty - h.py) / len;
      const nx = -uy * h.half;
      const ny = ux * h.half;
      const s0 = h.tail > 0 ? -h.tail : 7;
      const s1 = len + 4;
      g.moveTo(h.px + ux * s0 + nx, h.py + uy * s0 + ny);
      g.lineTo(h.px + ux * s1 + nx, h.py + uy * s1 + ny);
      g.lineTo(h.px + ux * s1 - nx, h.py + uy * s1 - ny);
      g.lineTo(h.px + ux * s0 - nx, h.py + uy * s0 - ny);
      g.closePath();
      if (h.tail > 0) {
        // keep the pivot ring out of the long hand
        g.moveTo(h.px + 8, h.py);
        g.arc(h.px, h.py, 8, 0, TAU, true);
      }
    }, KEYS[h.key]),
  );
  // the pendulum: rod and bob, cut whole from the untouched picture
  const pend = (g: G) => {
    g.moveTo(1052, 22);
    g.lineTo(1072, 22);
    g.lineTo(1010, 386);
    g.lineTo(990, 383);
    g.closePath();
    g.moveTo(BOB.x + BOB.r, BOB.y);
    g.arc(BOB.x, BOB.y, BOB.r, 0, TAU);
  };
  const pendulum = cutPiece(src, pend);
  cutOut(img, pend, 'row', 3, false);
  return {
    spin,
    rock,
    hands,
    small,
    pendulum,
    teal: glow('150,255,235'),
    amber: glow('255,190,110'),
    dust: { n: 50, box: [100, 0, 1300, 540], vx: 0.04, vy: 0.12, spread: 0.1, life: 700, size: [1, 2], sway: 12, rgb: '210,255,245', alpha: 0.55, kind: 'mote', seed: 5 },
  };
}

/** a gear with 5-fold symmetry rebuilt from one fifth of it (angles a0..a0+72 degrees), key pixels only */
function fifthGear(src: HTMLCanvasElement, c: readonly number[], a0: number, key: (r: number, g: number, b: number) => boolean): Cut {
  const [cx, cy, r] = c;
  const sd = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, src.width, src.height).data;
  const x0 = Math.floor(cx - r - 1);
  const y0 = Math.floor(cy - r - 1);
  const n = Math.ceil(2 * r + 3);
  const [s, sg] = canvas(n, n);
  const out = sg.createImageData(n, n);
  const step = TAU / 5;
  const base = (a0 * Math.PI) / 180;
  const at = (x: number, y: number, ch: number) => sd[(y * src.width + x) * 4 + ch];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dx = x0 + x + 0.5 - cx;
      const dy = y0 + y + 0.5 - cy;
      const rho = Math.hypot(dx, dy);
      if (rho > r) continue;
      let th = Math.atan2(dy, dx) - base;
      th = base + (((th % step) + step) % step);
      // bilinear sample of the picture at the matching point in the clean fifth
      const sx = cx + rho * Math.cos(th) - 0.5;
      const sy = cy + rho * Math.sin(th) - 0.5;
      const ix = Math.floor(sx);
      const iy = Math.floor(sy);
      const fx = sx - ix;
      const fy = sy - iy;
      const o = (y * n + x) * 4;
      for (let ch = 0; ch < 3; ch++)
        out.data[o + ch] =
          (at(ix, iy, ch) * (1 - fx) + at(ix + 1, iy, ch) * fx) * (1 - fy) + (at(ix, iy + 1, ch) * (1 - fx) + at(ix + 1, iy + 1, ch) * fx) * fy;
      out.data[o + 3] = key(out.data[o], out.data[o + 1], out.data[o + 2]) ? 255 : 0;
    }
  // even out the light and tint across the fifth (a beam crosses it), so the copies do not band
  const bins = 36;
  const sum = [0, 1, 2].map(() => new Float64Array(bins));
  const cnt = new Float64Array(bins);
  const binOf = (x: number, y: number) => {
    const dx = x0 + x + 0.5 - cx;
    const dy = y0 + y + 0.5 - cy;
    const th = (((Math.atan2(dy, dx) - base) % step) + step) % step;
    return [Math.min(bins - 1, Math.floor((th / step) * bins)), Math.hypot(dx, dy)];
  };
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const o = (y * n + x) * 4;
      const [b, rho] = binOf(x, y);
      if (!out.data[o + 3] || rho < r * 0.7) continue;
      for (let ch = 0; ch < 3; ch++) sum[ch][b] += out.data[o + ch];
      cnt[b]++;
    }
  const total = Math.max(1, cnt.reduce((a, v) => a + v, 0));
  const gain = [0, 1, 2].map((ch) => Array.from({ length: bins }, (_, b) => {
    const mean = sum[ch].reduce((a, v) => a + v, 0) / total;
    let s2 = 0;
    let c2 = 0;
    for (let k = -2; k <= 2; k++) {
      const j = Math.min(bins - 1, Math.max(0, b + k));
      s2 += sum[ch][j];
      c2 += cnt[j];
    }
    return c2 ? Math.min(1.4, Math.max(0.7, mean / (s2 / c2))) : 1;
  }));
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const o = (y * n + x) * 4;
      if (!out.data[o + 3]) continue;
      const b = binOf(x, y)[0];
      for (let ch = 0; ch < 3; ch++) out.data[o + ch] *= gain[ch][b];
    }
  // the hub is round: give it the average of each of its rings so the five copies do not show as slices
  const hubR = 14;
  const ring = Array.from({ length: hubR + 1 }, () => [0, 0, 0, 0]);
  const rhoAt = (x: number, y: number) => Math.hypot(x0 + x + 0.5 - cx, y0 + y + 0.5 - cy);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const k = Math.round(rhoAt(x, y));
      if (k > hubR) continue;
      const o = (y * n + x) * 4;
      for (let ch = 0; ch < 3; ch++) ring[k][ch] += out.data[o + ch];
      ring[k][3]++;
    }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const k = Math.round(rhoAt(x, y));
      if (k > hubR || !ring[k][3]) continue;
      const o = (y * n + x) * 4;
      for (let ch = 0; ch < 3; ch++) out.data[o + ch] = ring[k][ch] / ring[k][3];
      out.data[o + 3] = 255;
    }
  sg.putImageData(out, 0, 0);
  return { sprite: s, x: x0, y: y0 };
}
/** the gear sprite `from` (centred on a) moved to centre b and shaded to the mean colour of b's visible key pixels */
function shadedCopy(src: HTMLCanvasElement, from: Cut, a: readonly number[], b: readonly number[], key: (r: number, g: number, b: number) => boolean): Cut {
  const sd = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, src.width, src.height).data;
  const want = [0, 0, 0];
  let n = 0;
  for (let y = Math.floor(b[1] - b[2]); y <= b[1] + b[2]; y++)
    for (let x = Math.floor(b[0] - b[2]); x <= b[0] + b[2]; x++) {
      if (Math.hypot(x - b[0], y - b[1]) > b[2] || Math.hypot(x - a[0], y - a[1]) <= a[2]) continue;
      const i = (y * src.width + x) * 4;
      if (!key(sd[i], sd[i + 1], sd[i + 2])) continue;
      for (let c = 0; c < 3; c++) want[c] += sd[i + c];
      n++;
    }
  const w = from.sprite.width;
  const h = from.sprite.height;
  const [s, sg] = canvas(w, h);
  sg.drawImage(from.sprite, 0, 0);
  const d = sg.getImageData(0, 0, w, h);
  const have = [0, 0, 0];
  let m = 0;
  for (let i = 0; i < w * h; i++)
    if (d.data[i * 4 + 3] === 255) {
      for (let c = 0; c < 3; c++) have[c] += d.data[i * 4 + c];
      m++;
    }
  const gain = [0, 1, 2].map((c) => (n && m ? Math.min(1.2, Math.max(0.5, want[c] / n / (have[c] / m))) : 0.85));
  for (let i = 0; i < w * h; i++) for (let c = 0; c < 3; c++) d.data[i * 4 + c] *= gain[c];
  sg.putImageData(d, 0, 0);
  return { sprite: s, x: from.x + b[0] - a[0], y: from.y + b[1] - a[1] };
}
/** the shape as a sprite, taken from the picture without touching it */
function cutPiece(src: HTMLCanvasElement, shape: (g: G) => void): Cut {
  const [m, mg] = canvas(src.width, src.height);
  mg.drawImage(src, 0, 0);
  return cutOut(m, shape, 'row', 2, true);
}

/** clock seconds so far, with each step snapping on over 7 frames with a small overshoot */
function ticks(frame: number): number {
  const s = Math.floor(frame / SEC);
  const t = Math.min(1, (frame % SEC) / 7);
  const ease = 1 + 1.7 * Math.pow(t - 1, 3) + 0.7 * Math.pow(t - 1, 2); // easeOutBack
  return s + ease;
}
/** 0..1 kick after each tick: quick push, then a damped settle */
function kick(frame: number): number {
  const f = frame % SEC;
  return f < 4 ? f / 4 : Math.exp(-(f - 4) / 5) * Math.cos((f - 4) / 3.5);
}
/** 0..1 how strongly the great clock is striking (three bells) */
function strike(frame: number): number {
  const t = frame - STRIKE_AT;
  if (t < 0) return 0;
  const f = t % STRIKE_PERIOD;
  let v = 0;
  for (let k = 0; k < 3; k++) {
    const d = f - k * BONG_GAP;
    if (d >= 0 && d < 140) v = Math.max(v, Math.exp(-d / 40));
  }
  return v;
}

function draw(g: G, F: Fx, frame: number, flash: number): void {
  const st = strike(frame);
  // light shafts from the high windows
  shaft(g, { x: 560, y: 0 }, { x: 820, y: 0 }, { x: 900, y: 560 }, { x: 470, y: 560 }, '200,255,240', 0.05 + 0.04 * wave(frame, 420) + 0.05 * st);
  shaft(g, { x: 190, y: 0 }, { x: 260, y: 0 }, { x: 330, y: 380 }, { x: 250, y: 380 }, '200,255,240', 0.04 + 0.04 * wave(frame, 330, 1));
  shaft(g, { x: 1100, y: 0 }, { x: 1180, y: 0 }, { x: 1100, y: 420 }, { x: 1020, y: 420 }, '200,255,240', 0.04 + 0.04 * wave(frame, 370, 2));
  // the big edge gears kick forward on every tick (harder when the clock strikes)
  const k = kick(frame) * (0.022 + 0.03 * st);
  // (once a kick has settled the painted gear in the picture shows as it is, and nothing is drawn)
  if (Math.abs(k) > 0.0006)
    for (const [i, [x, y, , dir]] of ROCK.entries()) {
      drawCut(g, F.rock[i].patch);
      drawCut(g, F.rock[i].gear, 0, 0, dir * k, x, y);
    }
  // the middle gears turn steadily
  for (const [i, [x, y, , spd]] of SPIN.entries()) drawCut(g, F.spin[i], 0, 0, frame * spd, x, y);
  drawCut(g, F.small, 0, 0, -frame * 0.02, 733, 189);
  // clock hands: minute hands step once a second, hour hands creep, the small dial sweeps
  for (const [i, h] of HANDS.entries()) {
    const a = h.move === 'tick' ? (ticks(frame) / 60) * TAU : h.move === 'hour' ? (frame / (SEC * 720)) * TAU : (frame / (SEC * 8)) * TAU;
    drawCut(g, F.hands[i], 0, 0, a, h.px, h.py);
  }
  // the dials light up when the clock strikes
  if (st > 0.01) for (const [x, y, r] of DIALS) glowAt(g, F.teal, x, y, r, r, 0.35 * st);
  // the pendulum: one swing per second, at the end of each swing on the tick
  const ang = Math.sin(((frame - SEC / 2) / SEC) * Math.PI) * 0.06;
  drawCut(g, F.pendulum, 0, 0, ang, PIVOT.x, PIVOT.y);
  const bx = PIVOT.x + (BOB.x - PIVOT.x) * Math.cos(ang) - (BOB.y - PIVOT.y) * Math.sin(ang);
  const by = PIVOT.y + (BOB.x - PIVOT.x) * Math.sin(ang) + (BOB.y - PIVOT.y) * Math.cos(ang);
  glowAt(g, F.amber, bx - 15, by - 18, 30, 30, 0.15 + 0.35 * Math.abs(Math.cos(((frame - SEC / 2) / SEC) * Math.PI)) * 0.6 + 0.3 * st);
  particles(g, frame, F.dust, F.teal);
  // the floor gears glow and their light turns round
  for (let n = 0; n < 5; n++) {
    const x = 150 + n * 270;
    glowAt(g, F.teal, x + Math.sin(frame * 0.01 + n) * 20, 730, 120, 26, 0.1 + 0.1 * wave(frame, 180 + n * 30, n) + 0.25 * st);
  }
  glowAt(g, F.teal, 690, 590, 330, 40, 0.06 + 0.05 * wave(frame, 260) + 0.12 * st);
  if (flash > 0) glowAt(g, F.teal, 688, 384, 700, 400, flash * 0.15);
}

function sounds(from: number, to: number): ArenaSound[] {
  const out: ArenaSound[] = [];
  for (let f = Math.max(Math.floor(from) + 1, STRIKE_AT); f <= to && out.length < 4; f++) {
    const t = (f - STRIKE_AT) % STRIKE_PERIOD;
    // the great clock: three deep bells
    if (t === 0 || t === BONG_GAP || t === BONG_GAP * 2) out.push({ kind: 'tick', x: 0.5, big: true, ground: false });
    // the edge gears groan as they jolt after the bells
    if (t === 20) out.push({ kind: 'creak', x: 0.1, big: false, ground: false });
    if (t === BONG_GAP + 20) out.push({ kind: 'creak', x: 0.9, big: false, ground: false });
  }
  // now and then a gear creaks between strikes
  for (let f = Math.floor(from) + 1; f <= to && out.length < 4; f++)
    if (f % 420 === 210 && hash(f * 7 + 3) < 0.6) out.push({ kind: 'creak', x: hash(f * 11), big: false, ground: false });
  return out;
}

export const time: ArenaDef<Fx> = {
  id: 'timearena',
  name: 'Time Arena',
  icon: '⏳',
  image: new URL('./arena.png', import.meta.url).href,
  floor: FLOOR / 768,
  sky: '#14303a',
  ground: '#10202a',
  sfxLabel: 'Clock bells and gear creaks',
  bake,
  draw,
  sounds,
  song: {
    title: 'Clockwork Hall',
    bpm: 120,
    // Bm G D A, Em G F#7 F#7
    prog: [
      { root: 47, tones: [0, 3, 7] },
      { root: 43, tones: [0, 4, 7] },
      { root: 50, tones: [0, 4, 7] },
      { root: 45, tones: [0, 4, 7] },
      { root: 52, tones: [0, 3, 7] },
      { root: 43, tones: [0, 4, 7, 11] },
      { root: 42, tones: [0, 4, 7, 10] },
      { root: 42, tones: [0, 4, 7, 10] },
    ],
    lead: [
      [83, 0, 86, 0, 90, 0, 88, 86],
      [86, 0, 83, 0, 86, 0, 91, 90],
      [88, 0, 86, 0, 85, 0, 82, 0],
      [85, 0, 90, 0, 0, 0, 0, 0],
    ],
    leadAlways: true,
    leadVoice: 'glass',
    drums: 'soft',
    bass: [0, 4, 8, 12],
    bassWave: 'triangle',
    bassCut: 900,
    bassVoice: 'pizz',
    arp: [0, 1, 2, 1, 3, 1, 2, 1],
    arpWave: 'sine',
    arpCut: 3000,
    arpRate: 2,
    arpVoice: 'musicbox',
    padWave: 'triangle',
    padLevel: 0.05,
    padCut: 1300,
    leadWave: ['triangle', 'sine'],
    echo: 3,
    clock: true,
  },
  // the hum of the machinery
  air: { cut: 350, level: 0.025, lfo: 0.07, depth: 100, drone: 55, droneLevel: 0.025 },
};

void startLab(time);
