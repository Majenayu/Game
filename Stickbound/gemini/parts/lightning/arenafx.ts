/**
 * Moving effects on top of the arena picture (arena.png). Everything is placed in the picture's own pixels
 * (1376 x 768), so bolts hit the painted towers and the glow sits on the painted billboards and beams.
 * - the painted clouds drift slowly (two shifted copies of the cloud area, cross-faded so it loops cleanly)
 * - soft dark cloud wisps cross the sky
 * - lightning strikes the tower spires on a fixed timetable, lights up the clouds and flashes the sky and floor
 * - floodlight beams pulse, billboards glow, flicker and scan, spire lights blink, sparks float up
 * Render only: it reads the frame number, never the fight state, so the simulation stays deterministic.
 */
import { drawBolt, type Theme } from './fx';
import { bakeCloud } from './stage';

type G = CanvasRenderingContext2D;
interface Pt {
  x: number;
  y: number;
}
export interface BackFx {
  w: number;
  h: number;
  rail: number;
  cloud: HTMLCanvasElement;
  wisps: HTMLCanvasElement[];
  wispsLit: HTMLCanvasElement[];
  glow: HTMLCanvasElement;
  halo: Record<string, HTMLCanvasElement>;
}

// ---- places in the picture (pixels of the 1376 x 768 image)
/** bolt paths: from inside the clouds to a spire or rooftop */
const PATHS: Array<{ a: Pt; b: Pt }> = [
  { a: { x: 1168, y: 96 }, b: { x: 1136, y: 356 } },
  { a: { x: 1052, y: 188 }, b: { x: 1050, y: 262 } },
  { a: { x: 1046, y: 200 }, b: { x: 986, y: 372 } },
  { a: { x: 610, y: 238 }, b: { x: 603, y: 346 } },
  { a: { x: 566, y: 196 }, b: { x: 560, y: 258 } },
  { a: { x: 905, y: 226 }, b: { x: 908, y: 280 } },
  { a: { x: 1232, y: 30 }, b: { x: 1215, y: 90 } },
  { a: { x: 760, y: 214 }, b: { x: 682, y: 326 } },
  { a: { x: 1318, y: 70 }, b: { x: 1330, y: 166 } },
  { a: { x: 820, y: 236 }, b: { x: 850, y: 368 } },
];
/** cloud-to-cloud arcs (no ground contact) */
const ARCS: Array<{ a: Pt; b: Pt }> = [
  { a: { x: 470, y: 120 }, b: { x: 640, y: 170 } },
  { a: { x: 700, y: 90 }, b: { x: 900, y: 150 } },
  { a: { x: 950, y: 60 }, b: { x: 1120, y: 120 } },
];
const SPIRES: Pt[] = [
  { x: 1215, y: 86 },
  { x: 908, y: 276 },
  { x: 560, y: 256 },
  { x: 1330, y: 162 },
  { x: 1050, y: 258 },
  { x: 168, y: 40 },
];
const BOARDS: Array<{ x: number; y: number; w: number; h: number; col: string }> = [
  { x: 157, y: 55, w: 56, h: 220, col: '90,230,255' },
  { x: 152, y: 262, w: 68, h: 123, col: '255,200,230' },
  { x: 1155, y: 318, w: 18, h: 102, col: '255,90,200' },
  { x: 1178, y: 275, w: 32, h: 157, col: '90,230,255' },
  { x: 1267, y: 235, w: 73, h: 95, col: '90,200,255' },
  { x: 1228, y: 398, w: 57, h: 200, col: '255,150,220' },
  { x: 1305, y: 385, w: 57, h: 213, col: '90,230,255' },
  { x: 557, y: 318, w: 21, h: 25, col: '255,90,200' },
];
const GOLD_BEAMS: Pt[][] = [
  [{ x: 25, y: 0 }, { x: 95, y: 0 }, { x: 300, y: 580 }, { x: 170, y: 580 }],
  [{ x: 185, y: 0 }, { x: 290, y: 0 }, { x: 600, y: 590 }, { x: 420, y: 590 }],
];
const CYAN_BEAMS: Pt[][] = [
  [{ x: 440, y: 212 }, { x: 600, y: 410 }, { x: 505, y: 470 }],
  [{ x: 905, y: 248 }, { x: 1000, y: 470 }, { x: 830, y: 470 }],
  [{ x: 1160, y: 250 }, { x: 1110, y: 500 }, { x: 1010, y: 480 }],
];

function hash(n: number): number {
  let t = (n * 2654435761) >>> 0;
  t = Math.imul(t ^ (t >>> 16), 0x85ebca6b) >>> 0;
  t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35) >>> 0;
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** 1 inside the box, fading to 0 over `f` pixels outside it */
const box = (x: number, y: number, x0: number, x1: number, y0: number, y1: number, f: number) =>
  clamp(1 - Math.max(x0 - x, x - x1, y0 - y, y - y1, 0) / f) * clamp(Math.min(x - x0, x1 - x, y - y0, y1 - y) / f + 1);
function canvas(w: number, h: number): [HTMLCanvasElement, G] {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return [c, c.getContext('2d', { willReadFrequently: true })!];
}
function radial(rgb: string): HTMLCanvasElement {
  const [c, g] = canvas(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${rgb},1)`);
  gr.addColorStop(0.4, `rgba(${rgb},0.35)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return c;
}

/** Cut the cloud area out of the picture: greyish pixels in the sky band, minus towers, beams and painted bolts. */
export function bakeBackFx(img: HTMLCanvasElement, rail: number): BackFx {
  const W = img.width;
  const H = Math.round(img.height * 0.43);
  const [cloud, x] = canvas(W, H);
  x.drawImage(img, 0, 0);
  const id = x.getImageData(0, 0, W, H);
  const d = id.data;
  const sx = W / 1376;
  for (let py = 0; py < H; py++) {
    const y = py / sx;
    const yf = y < 225 ? 1 : clamp((305 - y) / 80);
    for (let px = 0; px < W; px++) {
      const i = (py * W + px) * 4;
      const xx = px / sx;
      const r = d[i];
      const gg = d[i + 1];
      const b = d[i + 2];
      const mx = Math.max(r, gg, b);
      const sat = mx - Math.min(r, gg, b);
      const lum = (r + gg + b) / 3;
      let a = clamp((95 - sat) / 45) * yf;
      if (lum > 175) a *= clamp((215 - lum) / 40);
      // only the cloud areas: the central storm mass, the top band, the clouds right of the tall tower
      a *= Math.max(box(xx, y, 430, 1160, -50, 250, 40), box(xx, y, 330, 1376, -50, 75, 30), box(xx, y, 1295, 1376, -50, 140, 25));
      if (xx > 1198 && xx < 1234 && y > 55) a = 0;
      d[i + 3] = Math.round(a * 255);
    }
  }
  x.putImageData(id, 0, 0);
  return {
    w: W,
    h: img.height,
    rail,
    cloud,
    wisps: [bakeCloud(900, 220, 4, false), bakeCloud(700, 180, 6, false)],
    wispsLit: [bakeCloud(900, 220, 4, true), bakeCloud(700, 180, 6, true)],
    glow: radial('255,255,255'),
    halo: { '90,230,255': radial('90,230,255'), '255,200,230': radial('255,200,230'), '255,90,200': radial('255,90,200'), '90,200,255': radial('90,200,255'), '255,150,220': radial('255,150,220'), '255,215,90': radial('255,215,90'), '255,60,80': radial('255,60,80') },
  };
}

// ---------------------------------------------------------------- lightning timetable
export interface Strike {
  path: { a: Pt; b: Pt };
  /** frame the strike started */
  start: number;
  t: number;
  a: number;
  big: boolean;
  seed: number;
  ground: boolean;
}
const FLICKER = [1, 0.3, 1, 0.85, 0.3, 0.95, 0.7, 0.55];
function slots(frame: number, P: number, salt: number, dur: number, list: Array<{ a: Pt; b: Pt }>, ground: boolean, out: Strike[]): void {
  const n = Math.floor(frame / P);
  for (const k of [n - 1, n]) {
    const start = k * P + Math.floor(hash(k * 7 + salt) * P * 0.6);
    const t = frame - start;
    if (t < 0 || t >= dur) continue;
    const h = hash(k * 13 + salt * 3 + 1);
    out.push({ path: list[Math.floor(h * list.length)], start, t, a: (1 - t / dur) * FLICKER[t % 8], big: hash(k * 31 + salt) > 0.5, seed: k * 101 + salt + Math.floor(t / 3) * 17, ground });
  }
}
/** Strikes alive at this frame. storm 0..1 (the ultimate) adds a fast extra timetable. */
export function strikes(frame: number, storm: number): Strike[] {
  const out: Strike[] = [];
  slots(frame, 140, 1, 22, PATHS, true, out);
  slots(frame, 205, 5, 18, PATHS, true, out);
  slots(frame, 90, 3, 12, ARCS, false, out);
  if (storm > 0.25) slots(frame, 30, 9, 14, PATHS, true, out);
  return out;
}
/** Strikes that began in (from, to]: the sound plays thunder for these. x is 0..1 across the picture. */
export function strikesStarting(from: number, to: number, storm: number): Array<{ x: number; big: boolean; ground: boolean }> {
  const out: Array<{ x: number; big: boolean; ground: boolean }> = [];
  if (to - from > 30) from = to - 30;
  for (let f = from + 1; f <= to; f++) for (const s of strikes(f, storm)) if (s.t === 0) out.push({ x: s.path.b.x / 1376, big: s.big, ground: s.ground });
  return out;
}

function poly(g: G, pts: Pt[]): void {
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
  g.closePath();
}

/**
 * Draw the effects. The context must already map picture pixels (1376 x 768 space) to the stage.
 * flash: the fight's flash (big powers light the sky); storm 0..1 during the ultimate.
 */
export function drawBackFx(g: G, F: BackFx, frame: number, flash: number, storm: number): void {
  const k = F.w / 1376;
  const railY = F.rail * 768;
  const st = strikes(frame, storm);
  let sky = clamp(flash / 10);
  for (const s of st) sky = Math.max(sky, s.a * (s.ground ? (s.big ? 0.85 : 0.55) : 0.35));

  // 1. clouds drift: copy A fully, copy B cross-faded on top; each copy jumps back only while invisible
  const T = 1500;
  const D = 70;
  const pa = (frame / T) % 1;
  const pb = (frame / T + 0.5) % 1;
  const wb = 1 - Math.abs(2 * pb - 1);
  const ch = F.cloud.height / k;
  g.drawImage(F.cloud, (pa - 0.5) * D, 0, 1376, ch);
  g.globalAlpha = wb;
  g.drawImage(F.cloud, (pb - 0.5) * D, 0, 1376, ch);
  g.globalAlpha = 1;
  // dark wisps crossing the sky, slower one behind
  const wisp = (i: number, y: number, v: number, a: number, ph: number) => {
    const c = F.wisps[i];
    const period = 1376 + c.width;
    const x = ((frame * v + ph) % period) - c.width;
    g.globalAlpha = a;
    g.drawImage(c, x, y);
    if (sky > 0.02) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = sky * 0.5;
      g.drawImage(F.wispsLit[i], x, y);
      g.globalCompositeOperation = 'source-over';
    }
    g.globalAlpha = 1;
  };
  wisp(0, 20, 0.11, 0.42, 300);
  wisp(1, 120, 0.19, 0.32, 1500);

  g.save();
  g.globalCompositeOperation = 'lighter';
  // 2. lightning lights the clouds from inside, the whole sky flashes
  if (sky > 0.01) {
    g.globalAlpha = sky * 0.45;
    g.drawImage(F.cloud, (pa - 0.5) * D, 0, 1376, ch);
    g.globalAlpha = 1;
    g.fillStyle = `rgba(140,190,255,${0.13 * sky})`;
    g.fillRect(-40, -40, 1456, railY + 40);
    g.fillStyle = `rgba(140,190,255,${0.07 * sky})`;
    g.fillRect(-40, railY, 1456, 900 - railY);
  }
  for (const s of st) {
    g.globalAlpha = s.a * (s.big ? 0.75 : 0.5);
    g.drawImage(F.glow, s.path.a.x - 230, s.path.a.y - 120, 460, 240);
  }
  g.globalAlpha = 1;
  g.restore();
  // 3. the bolts
  for (const s of st) {
    const theme: Theme = s.big ? 'white' : 'cyan';
    drawBolt(g, s.path.a, s.path.b, s.seed, s.ground ? (s.big ? 1.9 : 1.3) : 1, s.a, theme, s.ground ? 3 : 2);
    if (s.ground) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = s.a * 0.9;
      g.drawImage(F.glow, s.path.b.x - 45, s.path.b.y - 45, 90, 90);
      g.restore();
    }
  }
  g.save();
  g.globalCompositeOperation = 'lighter';
  // 4. floodlights pulse
  GOLD_BEAMS.forEach((b, i) => {
    const a = 0.05 + 0.05 * Math.sin(frame * 0.03 + i * 1.7);
    const gr = g.createLinearGradient(0, 0, 0, 600);
    gr.addColorStop(0, `rgba(255,225,120,${a * 1.6})`);
    gr.addColorStop(1, 'rgba(255,225,120,0)');
    g.fillStyle = gr;
    poly(g, b);
    g.fill();
  });
  CYAN_BEAMS.forEach((b, i) => {
    const a = 0.05 + 0.05 * Math.sin(frame * 0.045 + i * 2.1);
    const gr = g.createLinearGradient(b[0].x, b[0].y, (b[1].x + b[2].x) / 2, (b[1].y + b[2].y) / 2);
    gr.addColorStop(0, `rgba(150,240,255,${a * 2})`);
    gr.addColorStop(1, 'rgba(150,240,255,0)');
    g.fillStyle = gr;
    poly(g, b);
    g.fill();
  });
  // 5. billboards: soft glow pulse and a scan line rolling down
  BOARDS.forEach((b, i) => {
    const pulse = 0.22 + 0.12 * Math.sin(frame * 0.05 + i * 1.3);
    g.globalAlpha = pulse;
    g.drawImage(F.halo[b.col], b.x - b.w * 0.6, b.y - b.h * 0.25, b.w * 2.2, b.h * 1.5);
    g.globalAlpha = 1;
    const by = b.y + ((frame * 0.9 + i * 47) % (b.h + 20)) - 10;
    const top = Math.max(b.y, by);
    const hgt = Math.min(b.y + b.h, by + Math.max(4, b.h * 0.05)) - top;
    if (hgt > 0) {
      g.fillStyle = 'rgba(255,255,255,0.16)';
      g.fillRect(b.x, top, b.w, hgt);
    }
  });
  // 6. red aircraft lights on the spires
  SPIRES.forEach((p, i) => {
    if ((frame + i * 37) % 90 < 10) {
      g.globalAlpha = 0.9;
      g.drawImage(F.halo['255,60,80'], p.x - 9, p.y - 9, 18, 18);
    }
  });
  // 7. sparks floating up through the beams and over the city
  for (let i = 0; i < 46; i++) {
    const a = hash(i * 3 + 1);
    const b = hash(i * 3 + 2);
    const vy = 0.18 + b * 0.35;
    const y = railY - 10 - ((b * 997 + frame * vy) % (railY - 60));
    const x = a * 1376 + Math.sin(frame * 0.02 + i) * 14 + frame * 0.08 * (a - 0.5);
    const xx = ((x % 1376) + 1376) % 1376;
    const tw = 0.4 + 0.6 * Math.max(0, Math.sin(frame * 0.09 + i * 1.9));
    const cyan = hash(i * 3 + 3) > 0.8;
    g.globalAlpha = 0.7 * tw;
    g.drawImage(F.halo[cyan ? '90,230,255' : '255,215,90'], xx - 6, y - 6, 12, 12);
    g.globalAlpha = 1;
    g.strokeStyle = cyan ? `rgba(170,245,255,${tw})` : `rgba(255,230,140,${tw})`;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(xx, y);
    g.lineTo(xx - 2, y + 5);
    g.stroke();
  }
  g.restore();
  // 8. little gold crackles in the air, like the painted ones
  for (let i = 0; i < 3; i++) {
    const P = 70 + i * 23;
    const n = Math.floor(frame / P);
    const t = frame - (n * P + Math.floor(hash(n * 5 + i) * P * 0.5));
    if (t < 0 || t > 7) continue;
    const cx = 120 + hash(n * 9 + i) * 1100;
    const cy = 120 + hash(n * 11 + i) * 380;
    drawBolt(g, { x: cx, y: cy }, { x: cx + 18 + hash(n + i) * 22, y: cy + 14 }, n * 7 + i + t, 0.6, (1 - t / 8) * 0.9, 'gold', 1);
  }
  // 9. billboards flicker now and then
  BOARDS.forEach((b, i) => {
    if (hash(i * 977 + Math.floor(frame / 6)) < 0.035) {
      g.fillStyle = 'rgba(6,8,26,0.55)';
      g.fillRect(b.x, b.y, b.w, b.h);
    }
  });
}
