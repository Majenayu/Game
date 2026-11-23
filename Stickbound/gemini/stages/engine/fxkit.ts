/**
 * Small toolkit for moving effects on top of an arena picture. All positions are in the picture's own pixels
 * (1376 x 768). Everything is a pure function of the frame number, so it is render only and repeatable.
 */
import { canvas, hash, slotStart, type G, type Pt } from './arena';

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ cutting parts out of the picture
export interface Cut {
  sprite: HTMLCanvasElement;
  /** top-left of the sprite in the picture */
  x: number;
  y: number;
}
/**
 * Cuts a shape out of the picture so it can move: returns the shape as a sprite, and fills the hole in the
 * picture by blending the pixels just outside it (along rows, or along columns for wide flat shapes).
 * shape() draws a filled path in picture pixels; pad grows the hole a little to catch soft edges.
 */
export function cutOut(img: HTMLCanvasElement, shape: (g: G) => void, fillDir: 'row' | 'col' = 'row', pad = 2, keepSprite = true): Cut {
  const W = img.width;
  const H = img.height;
  const [m, mg] = canvas(W, H);
  mg.fillStyle = '#fff';
  mg.strokeStyle = '#fff';
  mg.lineWidth = pad * 2;
  mg.lineJoin = 'round';
  mg.beginPath();
  shape(mg);
  mg.fill();
  if (pad > 0) mg.stroke();
  const md = mg.getImageData(0, 0, W, H).data;
  // bounding box of the mask
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (md[(y * W + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return { sprite: canvas(1, 1)[0], x: 0, y: 0 };
  const ig = img.getContext('2d', { willReadFrequently: true })!;
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  let sprite = canvas(1, 1)[0];
  if (keepSprite) {
    const [s, sg] = canvas(bw, bh);
    sg.drawImage(img, x0, y0, bw, bh, 0, 0, bw, bh);
    sg.globalCompositeOperation = 'destination-in';
    sg.drawImage(m, x0, y0, bw, bh, 0, 0, bw, bh);
    sprite = s;
  }
  // fill the hole
  const ex0 = Math.max(0, x0 - 2);
  const ey0 = Math.max(0, y0 - 2);
  const ew = Math.min(W - 1, x1 + 2) - ex0 + 1;
  const eh = Math.min(H - 1, y1 + 2) - ey0 + 1;
  const id = ig.getImageData(ex0, ey0, ew, eh);
  const p = id.data;
  const inMask = (x: number, y: number) => md[((y + ey0) * W + (x + ex0)) * 4 + 3] > 0;
  const lines = fillDir === 'row' ? eh : ew;
  const len = fillDir === 'row' ? ew : eh;
  const at = (l: number, k: number) => (fillDir === 'row' ? (l * ew + k) * 4 : (k * ew + l) * 4);
  const isM = (l: number, k: number) => (fillDir === 'row' ? inMask(k, l) : inMask(l, k));
  for (let l = 0; l < lines; l++) {
    let k = 0;
    while (k < len) {
      if (!isM(l, k)) {
        k++;
        continue;
      }
      const a = k - 1;
      let b = k;
      while (b < len && isM(l, b)) b++;
      // span a+1 .. b-1 is the hole; blend from pixel a to pixel b (or copy one side at the edge)
      const ia = a >= 0 ? at(l, a) : -1;
      const ib = b < len ? at(l, b) : -1;
      for (let q = k; q < b; q++) {
        const t = ia < 0 ? 1 : ib < 0 ? 0 : (q - a) / (b - a);
        const o = at(l, q);
        for (let c = 0; c < 3; c++) {
          const va = ia < 0 ? p[ib + c] : p[ia + c];
          const vb = ib < 0 ? p[ia + c] : p[ib + c];
          p[o + c] = va + (vb - va) * t;
        }
        p[o + 3] = 255;
      }
      k = b;
    }
  }
  ig.putImageData(id, ex0, ey0);
  // soften the filled band a little so the blend lines do not show
  ig.save();
  ig.globalAlpha = 0.5;
  ig.filter = 'blur(3px)';
  ig.beginPath();
  shape(ig);
  ig.clip();
  ig.drawImage(img, ex0, ey0, ew, eh, ex0, ey0, ew, eh);
  ig.restore();
  return { sprite, x: x0, y: y0 };
}
/**
 * Lifts a dark object (a floating rock or island) off a lighter background so it can bob: the sprite keeps only
 * the pixels darker than `hi` (fully kept below `lo`), taken from the box before the hole is filled; then the
 * ellipse inside the box is filled from its surroundings so nothing is left behind when the sprite moves.
 * Pass src = an untouched copy of the picture when boxes overlap, so one hole does not eat the next object.
 */
export function liftDark(img: HTMLCanvasElement, x0: number, y0: number, x1: number, y1: number, lo = 90, hi = 150, pad = 4, src: HTMLCanvasElement = img): Cut {
  const [s, sg] = canvas(x1 - x0, y1 - y0);
  sg.drawImage(src, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
  const d = sg.getImageData(0, 0, s.width, s.height);
  const p = d.data;
  const cx = (s.width - 1) / 2;
  const cy = (s.height - 1) / 2;
  for (let i = 0, n = 0; i < p.length; i += 4, n++) {
    const lum = p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11;
    const ex = ((n % s.width) - cx) / (cx + 0.5);
    const ey = (Math.floor(n / s.width) - cy) / (cy + 0.5);
    const edge = Math.min(1, Math.max(0, (1 - Math.sqrt(ex * ex + ey * ey)) * 6));
    const k = Math.min(1, Math.max(0, (hi - lum) / (hi - lo)));
    p[i + 3] = Math.round(p[i + 3] * k * edge);
  }
  sg.putImageData(d, 0, 0);
  cutOut(img, (g) => g.ellipse((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, 0, 0, TAU), 'row', pad, false);
  return { sprite: s, x: x0, y: y0 };
}
/**
 * Lifts only the pixels inside shape() that pass key(r, g, b) (for example a copper gear against the wall behind
 * it, or a bright clock hand against its dial), so the part can turn while the background in its gaps stays put.
 * The sprite is taken from src (an untouched copy of the picture); in img only the lifted pixels are filled,
 * from the nearest kept pixels on the same row, then smoothed.
 */
export function liftKeyed(img: HTMLCanvasElement, src: HTMLCanvasElement, shape: (g: G) => void, key: (r: number, g: number, b: number, x: number, y: number) => boolean, grow = 1): Cut {
  const W = img.width;
  const H = img.height;
  const [, mg] = canvas(W, H);
  mg.fillStyle = '#fff';
  mg.beginPath();
  shape(mg);
  mg.fill();
  const md = mg.getImageData(0, 0, W, H).data;
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (md[(y * W + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return { sprite: canvas(1, 1)[0], x: 0, y: 0 };
  x0 = Math.max(0, x0 - grow);
  y0 = Math.max(0, y0 - grow);
  x1 = Math.min(W - 1, x1 + grow);
  y1 = Math.min(H - 1, y1 + grow);
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const sd = src.getContext('2d', { willReadFrequently: true })!.getImageData(x0, y0, bw, bh);
  const sp = sd.data;
  // mask: inside the shape and passing the key, grown by `grow` pixels (inside the shape) to catch outlines
  const core = new Uint8Array(bw * bh);
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      const i = y * bw + x;
      if (md[((y + y0) * W + (x + x0)) * 4 + 3] > 0 && key(sp[i * 4], sp[i * 4 + 1], sp[i * 4 + 2], x + x0, y + y0)) core[i] = 1;
    }
  const mask = new Uint8Array(bw * bh);
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      if (md[((y + y0) * W + (x + x0)) * 4 + 3] === 0) continue;
      let v = 0;
      for (let dy = -grow; dy <= grow && !v; dy++)
        for (let dx = -grow; dx <= grow && !v; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < bw && yy < bh && core[yy * bw + xx]) v = core[y * bw + x] ? 2 : 1;
        }
      mask[y * bw + x] = v;
    }
  // sprite: the kept pixels, the grown rim a little softer
  const [s, sg] = canvas(bw, bh);
  const out = sg.createImageData(bw, bh);
  for (let i = 0; i < bw * bh; i++) {
    if (!mask[i]) continue;
    out.data[i * 4] = sp[i * 4];
    out.data[i * 4 + 1] = sp[i * 4 + 1];
    out.data[i * 4 + 2] = sp[i * 4 + 2];
    out.data[i * 4 + 3] = mask[i] === 2 ? 255 : 170;
  }
  sg.putImageData(out, 0, 0);
  // fill the lifted pixels in img along rows, from the kept pixels either side
  const ig = img.getContext('2d', { willReadFrequently: true })!;
  const id = ig.getImageData(x0, y0, bw, bh);
  const p = id.data;
  for (let y = 0; y < bh; y++) {
    let x = 0;
    while (x < bw) {
      if (!mask[y * bw + x]) {
        x++;
        continue;
      }
      const a = x - 1;
      let b = x;
      while (b < bw && mask[y * bw + b]) b++;
      const ia = a >= 0 ? (y * bw + a) * 4 : -1;
      const ib = b < bw ? (y * bw + b) * 4 : -1;
      for (let q = x; q < b; q++) {
        const t = ia < 0 ? 1 : ib < 0 ? 0 : (q - a) / (b - a);
        const o = (y * bw + q) * 4;
        for (let c = 0; c < 3; c++) {
          const va = ia < 0 ? p[ib + c] : p[ia + c];
          const vb = ib < 0 ? p[ia + c] : p[ib + c];
          p[o + c] = va + (vb - va) * t;
        }
      }
      x = b;
    }
  }
  // smooth the filled pixels (a few box-blur passes over the mask only) so row streaks do not show
  for (let pass = 0; pass < 3; pass++) {
    const copy = new Uint8ClampedArray(p);
    for (let y = 1; y < bh - 1; y++)
      for (let x = 1; x < bw - 1; x++) {
        if (!mask[y * bw + x]) continue;
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += copy[((y + dy) * bw + x + dx) * 4 + c];
          p[(y * bw + x) * 4 + c] = sum / 9;
        }
      }
  }
  ig.putImageData(id, x0, y0);
  return { sprite: s, x: x0, y: y0 };
}
/** Draws a cut sprite at its home place, moved by dx,dy and turned by ang around (px,py) (picture pixels). */
export function drawCut(g: G, c: Cut, dx = 0, dy = 0, ang = 0, px = 0, py = 0): void {
  if (!ang) {
    g.drawImage(c.sprite, c.x + dx, c.y + dy);
    return;
  }
  g.save();
  g.translate(px + dx, py + dy);
  g.rotate(ang);
  g.drawImage(c.sprite, c.x - px, c.y - py);
  g.restore();
}

// ------------------------------------------------------------------ particles
/** puff = a soft blob of smoke, fog or steam (needs a glow sprite, size = radius) */
export type Kind = 'dot' | 'glow' | 'spark' | 'streak' | 'leaf' | 'flake' | 'bubble' | 'ember' | 'mote' | 'puff';
export interface Particles {
  n: number;
  /** spawn box */
  box: [number, number, number, number];
  /** speed in picture pixels per frame */
  vx: number;
  vy: number;
  /** random extra speed (+-) */
  spread?: number;
  /** extra downward pull per frame */
  grav?: number;
  /** frames each particle lives */
  life: number;
  size: [number, number];
  /** side to side sway (pixels) */
  sway?: number;
  rgb: string;
  /** second colour some particles take */
  rgb2?: string;
  alpha: number;
  kind: Kind;
  seed: number;
  /** particles stop at this y (they fade out there) */
  floorY?: number;
}
export function particles(g: G, frame: number, P: Particles, glowSprite?: HTMLCanvasElement, power = 1): void {
  const [bx0, by0, bx1, by1] = P.box;
  const add = P.kind === 'glow' || P.kind === 'spark' || P.kind === 'ember' || P.kind === 'mote';
  if (add) g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < P.n; i++) {
    const off = hash(i * 13 + P.seed) * P.life;
    const tt = frame + off;
    const cyc = Math.floor(tt / P.life);
    const age = tt - cyc * P.life;
    const h1 = hash(i * 7919 + cyc * 104729 + P.seed);
    const h2 = hash(i * 31 + cyc * 7 + P.seed * 3 + 1);
    const h3 = hash(i * 17 + P.seed * 5 + 2);
    const sp = P.spread ?? 0;
    const vx = P.vx + (h2 - 0.5) * 2 * sp;
    const vy = P.vy + (h1 - 0.5) * 2 * sp;
    let x = bx0 + h1 * (bx1 - bx0) + vx * age;
    let y = by0 + h2 * (by1 - by0) + vy * age + 0.5 * (P.grav ?? 0) * age * age;
    if (P.sway) x += Math.sin(age * 0.05 + h3 * TAU) * P.sway;
    let fade = Math.sin((Math.PI * age) / P.life);
    if (P.floorY !== undefined && y > P.floorY) {
      fade *= Math.max(0, 1 - (y - P.floorY) / 12);
      y = P.floorY;
      if (fade <= 0) continue;
    }
    const a = P.alpha * fade * power;
    if (a < 0.01) continue;
    const size = P.size[0] + h3 * (P.size[1] - P.size[0]);
    const rgb = P.rgb2 && h3 > 0.6 ? P.rgb2 : P.rgb;
    g.globalAlpha = Math.min(1, a);
    switch (P.kind) {
      case 'dot':
      case 'flake':
        g.fillStyle = `rgb(${rgb})`;
        g.beginPath();
        g.arc(x, y, size, 0, TAU);
        g.fill();
        if (P.kind === 'flake' && size > 2.2) {
          g.globalAlpha = Math.min(1, a) * 0.35;
          g.beginPath();
          g.arc(x, y, size * 2, 0, TAU);
          g.fill();
        }
        break;
      case 'glow':
      case 'mote':
      case 'ember':
        if (glowSprite) {
          const s = size * (P.kind === 'ember' ? 3 : 4);
          g.drawImage(glowSprite, x - s / 2, y - s / 2, s, s);
        }
        g.fillStyle = `rgb(${rgb})`;
        g.beginPath();
        g.arc(x, y, size * (P.kind === 'mote' ? 0.5 : 0.7), 0, TAU);
        g.fill();
        break;
      case 'spark':
      case 'streak': {
        const len = P.kind === 'spark' ? 2.2 : 9;
        const ex = x - vx * len;
        const ey = y - (vy + (P.grav ?? 0) * age) * len;
        g.strokeStyle = `rgb(${rgb})`;
        g.lineWidth = size;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(ex, ey);
        g.lineTo(x, y);
        g.stroke();
        break;
      }
      case 'leaf': {
        g.save();
        g.translate(x, y);
        g.rotate(age * 0.06 * (h3 > 0.5 ? 1 : -1) + h1 * TAU);
        g.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(age * 0.08 + h2 * 6)));
        g.fillStyle = `rgb(${rgb})`;
        g.beginPath();
        g.ellipse(0, 0, size, size * 0.45, 0, 0, TAU);
        g.fill();
        g.restore();
        break;
      }
      case 'puff':
        if (glowSprite) g.drawImage(glowSprite, x - size, y - size * 0.7, size * 2, size * 1.4);
        break;
      case 'bubble':
        g.strokeStyle = `rgb(${rgb})`;
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(x, y, size, 0, TAU);
        g.stroke();
        g.fillStyle = `rgb(${rgb})`;
        g.beginPath();
        g.arc(x - size * 0.35, y - size * 0.35, size * 0.25, 0, TAU);
        g.fill();
        break;
    }
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
}

// ------------------------------------------------------------------ light
/** A light shaft: a 4-point shape, bright at the first edge (a,b), fading to the far edge (c,d). Added light. */
export function shaft(g: G, a: Pt, b: Pt, c: Pt, d: Pt, rgb: string, alpha: number): void {
  if (alpha <= 0.005) return;
  const gr = g.createLinearGradient((a.x + b.x) / 2, (a.y + b.y) / 2, (c.x + d.x) / 2, (c.y + d.y) / 2);
  gr.addColorStop(0, `rgba(${rgb},${alpha})`);
  gr.addColorStop(0.6, `rgba(${rgb},${alpha * 0.45})`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(a.x, a.y);
  g.lineTo(b.x, b.y);
  g.lineTo(c.x, c.y);
  g.lineTo(d.x, d.y);
  g.closePath();
  g.fill();
  g.globalCompositeOperation = 'source-over';
}
/** An added glow (sprite from glow()) centred at x,y. */
export function glowAt(g: G, sprite: HTMLCanvasElement, x: number, y: number, rx: number, ry: number, alpha: number): void {
  if (alpha <= 0.005) return;
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = Math.min(1, alpha);
  g.drawImage(sprite, x - rx, y - ry, rx * 2, ry * 2);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
}
/**
 * Strength 0..1 of a bursting effect at this frame. Bursts follow the same timetable as timetable() in arena.ts
 * (same period, n, salt, chance), so a sound made from that timetable starts with the burst.
 */
export function burst(frame: number, period: number, n: number, salt: number, chance: number, dur: number): number {
  const slotLen = period / n;
  const s = Math.floor(frame / slotLen);
  let best = 0;
  for (let k = s - Math.ceil(dur / slotLen) - 1; k <= s; k++) {
    if (k < 0 || hash(k * 31 + salt) > chance) continue;
    const u = (frame - slotStart(k, period, n, salt)) / dur;
    if (u >= 0 && u < 1) best = Math.max(best, Math.min(1, u * 8) * (1 - u) ** 0.7);
  }
  return best;
}
/** Smooth 0..1 wave with the given period in frames. */
export const wave = (frame: number, period: number, phase = 0) => 0.5 + 0.5 * Math.sin((frame / period) * TAU + phase);
/** Slow random flicker 0..1 (smooth noise from hashes). */
export function flicker(frame: number, rate: number, seed: number): number {
  const t = frame / rate;
  const i = Math.floor(t);
  const f = t - i;
  const s = f * f * (3 - 2 * f);
  return hash(i * 7 + seed) * (1 - s) + hash((i + 1) * 7 + seed) * s;
}
