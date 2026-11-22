// Drawing interface shared by the Phaser fight renderer and 2D canvas previews (Forge, lobby cards, story panels).

import type Phaser from 'phaser';

export interface Pen {
  line(x1: number, y1: number, x2: number, y2: number, w: number, color: number, alpha?: number): void;
  circle(x: number, y: number, r: number, fill: number | null, stroke: number | null, w?: number, alpha?: number): void;
  poly(points: number[], fill: number, alpha?: number): void;
}

export class PhaserPen implements Pen {
  constructor(public g: Phaser.GameObjects.Graphics) {}

  line(x1: number, y1: number, x2: number, y2: number, w: number, color: number, alpha = 1): void {
    this.g.lineStyle(w, color, alpha);
    this.g.lineBetween(x1, y1, x2, y2);
    // round caps
    this.g.fillStyle(color, alpha);
    this.g.fillCircle(x1, y1, w / 2);
    this.g.fillCircle(x2, y2, w / 2);
  }

  circle(x: number, y: number, r: number, fill: number | null, stroke: number | null, w = 2, alpha = 1): void {
    if (fill !== null) {
      this.g.fillStyle(fill, alpha);
      this.g.fillCircle(x, y, r);
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
