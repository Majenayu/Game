// Tiny pixel canvas: art is drawn at "art pixel" resolution and blown up 2x into real textures,
// so every sprite and tile shares the same pixel grid (storybook pixel-painterly, style A).

import { Rng } from '../core/rng';

export const ART_SCALE = 2;
export const OUTLINE = '#2b1d2e';

export class PixelGrid {
  readonly px: (string | null)[];

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.px = new Array(w * h).fill(null);
  }

  set(x: number, y: number, c: string | null): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = c;
  }

  get(x: number, y: number): string | null {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.px[y * this.w + x]!;
  }

  rect(x: number, y: number, w: number, h: number, c: string): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }

  /** Filled ellipse inside the box. */
  oval(x: number, y: number, w: number, h: number, c: string): void {
    const cx = x + w / 2 - 0.5;
    const cy = y + h / 2 - 0.5;
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) if (((i - cx) / (w / 2)) ** 2 + ((j - cy) / (h / 2)) ** 2 <= 1.02) this.set(i, j, c);
  }

  fill(c: string): void {
    this.px.fill(c);
  }

  /** Painterly flecks: random pixels of nearby shades. */
  flecks(rng: Rng, colours: string[], count: number, x = 0, y = 0, w = this.w, h = this.h): void {
    for (let n = 0; n < count; n++) this.set(x + rng.int(0, w - 1), y + rng.int(0, h - 1), rng.pick(colours));
  }

  /** Adds a 1-pixel dark outline around every opaque shape (the storybook ink line). */
  outline(colour = OUTLINE): void {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) !== null) continue;
        if (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1)) add.push(y * this.w + x);
      }
    for (const i of add) this.px[i] = colour;
  }

  /** Draws the grid into a 2D context at a position, scaled by ART_SCALE. */
  paint(ctx: CanvasRenderingContext2D, ox: number, oy: number, alpha = 1): void {
    ctx.globalAlpha = alpha;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.px[y * this.w + x];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(ox + x * ART_SCALE, oy + y * ART_SCALE, ART_SCALE, ART_SCALE);
      }
    ctx.globalAlpha = 1;
  }
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Mixes a hex colour towards black (amount < 0) or white (amount > 0). */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (v: number) => Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
