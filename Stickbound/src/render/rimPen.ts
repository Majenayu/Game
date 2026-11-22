// Pens that wrap another pen: the bright rim behind fighters and the flat-tinted floor reflection.
import type { Pen } from './pen';
/** Rim pen: draws a bright element-coloured outline behind figures, so they pop from the dark neon arenas. */
export class RimPen implements Pen {
  color = 0xdfe8ff;
  constructor(private p: Pen) {}
  line(x1: number, y1: number, x2: number, y2: number, w: number, _c: number, a = 1): void {
    this.p.line(x1, y1, x2, y2, w + 5, this.color, a * 0.9);
  }
  circle(x: number, y: number, r: number, fill: number | null, stroke: number | null, w = 2, a = 1): void {
    if (fill !== null || stroke !== null) this.p.circle(x, y, r + (stroke !== null ? w / 2 : 0) + 2.5, this.color, null, 0, a * 0.9);
  }
  poly(): void {}
}
/** Mirror pen: the floor reflection. Same shapes in one flat tint, so the reflection stays a soft hint. */
export class TintPen implements Pen {
  color = 0xffffff;
  constructor(private p: Pen) {}
  line(x1: number, y1: number, x2: number, y2: number, w: number, c: number, a = 1): void {
    this.p.line(x1, y1, x2, y2, w, mixC(c, this.color), a);
  }
  circle(x: number, y: number, r: number, fill: number | null, stroke: number | null, w = 2, a = 1): void {
    this.p.circle(x, y, r, fill === null ? null : mixC(fill, this.color), stroke === null ? null : mixC(stroke, this.color), w, a);
  }
  poly(points: number[], fill: number, a = 1): void {
    this.p.poly(points, mixC(fill, this.color), a);
  }
}
export function mixC(a: number, b: number): number {
  const r = (((a >> 16) & 255) + ((b >> 16) & 255)) >> 1;
  const g = (((a >> 8) & 255) + ((b >> 8) & 255)) >> 1;
  return (r << 16) | (g << 8) | (((a & 255) + (b & 255)) >> 1);
}

