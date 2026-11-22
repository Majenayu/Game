// Drawing interface shared by the Phaser fight renderer and 2D canvas previews (Forge, lobby cards, story panels).

import type Phaser from 'phaser';

export interface Pen {
  line(x1: number, y1: number, x2: number, y2: number, w: number, color: number, alpha?: number): void;
  circle(x: number, y: number, r: number, fill: number | null, stroke: number | null, w?: number, alpha?: number): void;
  poly(points: number[], fill: number, alpha?: number): void;
}

// Unit-circle tables for triangle fans (8 to 24 segments).
const FANS = new Map<number, Float32Array>();
function fan(n: number): Float32Array {
  let t = FANS.get(n);
  if (!t) {
    t = new Float32Array((n + 1) * 2);
    for (let i = 0; i <= n; i++) {
      t[i * 2] = Math.cos((i / n) * Math.PI * 2);
      t[i * 2 + 1] = Math.sin((i / n) * Math.PI * 2);
    }
    FANS.set(n, t);
  }
  return t;
}

export class PhaserPen implements Pen {
  constructor(public g: Phaser.GameObjects.Graphics) {}

  /** Filled circle as a triangle fan. Phaser's fillCircle triangulates a path (earcut) on every render, which was
   *  the main CPU cost of drawing stick figures. */
  private disc(x: number, y: number, r: number): void {
    if (r <= 0.3) return;
    const n = r < 4 ? 8 : r < 10 ? 12 : r < 24 ? 16 : 24;
    const t = fan(n);
    for (let i = 0; i < n; i++) this.g.fillTriangle(x, y, x + t[i * 2]! * r, y + t[i * 2 + 1]! * r, x + t[i * 2 + 2]! * r, y + t[i * 2 + 3]! * r);
  }

  line(x1: number, y1: number, x2: number, y2: number, w: number, color: number, alpha = 1): void {
    this.g.lineStyle(w, color, alpha);
    this.g.lineBetween(x1, y1, x2, y2);
    // round caps
    this.g.fillStyle(color, alpha);
    this.disc(x1, y1, w / 2);
    this.disc(x2, y2, w / 2);
  }

  circle(x: number, y: number, r: number, fill: number | null, stroke: number | null, w = 2, alpha = 1): void {
    if (fill !== null) {
      this.g.fillStyle(fill, alpha);
      this.disc(x, y, r);
    }
    if (stroke !== null) {
      this.g.lineStyle(w, stroke, alpha);
      this.g.strokeCircle(x, y, r);
    }
  }

  poly(points: number[], fill: number, alpha = 1): void {
    this.g.fillStyle(fill, alpha);
    this.g.beginPath();
    this.g.moveTo(points[0]!, points[1]!);
    for (let i = 2; i < points.length; i += 2) this.g.lineTo(points[i]!, points[i + 1]!);
    this.g.closePath();
    this.g.fillPath();
  }
}

const css = (c: number, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

export class CanvasPen implements Pen {
  constructor(public ctx: CanvasRenderingContext2D) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  line(x1: number, y1: number, x2: number, y2: number, w: number, color: number, alpha = 1): void {
    const c = this.ctx;
    c.strokeStyle = css(color, alpha);
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  }

  circle(x: number, y: number, r: number, fill: number | null, stroke: number | null, w = 2, alpha = 1): void {
    const c = this.ctx;
    c.beginPath();
    c.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
    if (fill !== null) {
      c.fillStyle = css(fill, alpha);
      c.fill();
    }
    if (stroke !== null) {
      c.strokeStyle = css(stroke, alpha);
      c.lineWidth = w;
      c.stroke();
    }
  }

  poly(points: number[], fill: number, alpha = 1): void {
    const c = this.ctx;
    c.fillStyle = css(fill, alpha);
    c.beginPath();
    c.moveTo(points[0]!, points[1]!);
    for (let i = 2; i < points.length; i += 2) c.lineTo(points[i]!, points[i + 1]!);
    c.closePath();
    c.fill();
  }
}
