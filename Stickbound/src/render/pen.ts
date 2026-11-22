// Drawing interface shared by the Phaser fight renderer and 2D canvas previews (Forge, lobby cards, Power Lab).
// Effects use two extras: `add(true)` switches to additive blending (light), and `glow` draws a soft light blob from
// a baked radial texture (no per-frame gradients).

import type Phaser from 'phaser';
import type { PartSet } from './hero/parts';

export interface Pen {
  line(x1: number, y1: number, x2: number, y2: number, w: number, color: number, alpha?: number): void;
  circle(x: number, y: number, r: number, fill: number | null, stroke: number | null, w?: number, alpha?: number): void;
  poly(points: number[], fill: number, alpha?: number): void;
  /** additive blending on/off for the following calls */
  add?(on: boolean): void;
  /** soft radial light of radius r */
  glow?(x: number, y: number, r: number, color: number, alpha?: number): void;
  /** an image part centred at (x, y), size w x h, rotated by rot (radians), mirrored if flip, with its baked glow */
  part?(set: PartSet, name: string, x: number, y: number, w: number, h: number, rot: number, flip: boolean, alpha: number, glow: number): void;
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

export const GLOW_KEY = 'fx-glow';

/** Bakes the soft glow texture once per Phaser game. */
export function bakeGlow(scene: Phaser.Scene): void {
  if (scene.textures.exists(GLOW_KEY)) return;
  const size = 128;
  const tex = scene.textures.createCanvas(GLOW_KEY, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.15)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

export class PhaserPen implements Pen {
  private cur: Phaser.GameObjects.Graphics;
  private pool: Phaser.GameObjects.Image[] = [];
  private used = 0;
  private partPool: Phaser.GameObjects.Image[] = [];
  private partUsed = 0;
  /** glow sprites drawn this frame (adaptive quality reads it) */
  glows = 0;
  maxGlows = 140;

  /** `g` normal layer; `gAdd` additive layer; `scene` for the pooled glow sprites. */
  constructor(
    public g: Phaser.GameObjects.Graphics,
    private gAdd?: Phaser.GameObjects.Graphics,
    private scene?: Phaser.Scene,
    private glowDepth = 5,
    private glowScroll = 1,
  ) {
    this.cur = g;
  }

  /** Call once per frame before drawing (clears both layers and recycles glow sprites). */
  begin(): void {
    this.g.clear();
    this.gAdd?.clear();
    for (let i = 0; i < this.used; i++) this.pool[i]!.setVisible(false);
    this.used = 0;
    this.glows = 0;
    this.cur = this.g;
    for (let i = 0; i < this.partUsed; i++) this.partPool[i]!.setVisible(false);
    this.partUsed = 0;
  }
  /** Destroys the pooled glow sprites (the graphics belong to the caller). */
  destroy(): void {
    for (const im of this.pool) im.destroy();
    this.pool.length = 0;
    this.used = 0;
    for (const im of this.partPool) im.destroy();
    this.partPool.length = 0;
    this.partUsed = 0;
  }

  add(on: boolean): void {
    this.cur = on && this.gAdd ? this.gAdd : this.g;
  }

  glow(x: number, y: number, r: number, color: number, alpha = 1): void {
    if (!this.scene || r <= 1 || alpha <= 0.01) return;
    if (this.used >= this.maxGlows) return;
    let img = this.pool[this.used];
    if (!img) {
      img = this.scene.add.image(0, 0, GLOW_KEY).setBlendMode(1).setDepth(this.glowDepth).setScrollFactor(this.glowScroll);
      this.pool.push(img);
    }
    this.used++;
    this.glows++;
    img.setVisible(true).setPosition(x, y).setScale((r * 2) / 128).setTint(color).setAlpha(Math.min(1, alpha));
  }

  /** Filled circle as a triangle fan. Phaser's fillCircle triangulates a path (earcut) on every render, which was
   *  the main CPU cost of drawing stick figures. */
  private disc(x: number, y: number, r: number): void {
    if (r <= 0.3) return;
    const n = r < 4 ? 8 : r < 10 ? 12 : r < 24 ? 16 : 24;
    const t = fan(n);
    for (let i = 0; i < n; i++) this.cur.fillTriangle(x, y, x + t[i * 2]! * r, y + t[i * 2 + 1]! * r, x + t[i * 2 + 2]! * r, y + t[i * 2 + 3]! * r);
  }

  line(x1: number, y1: number, x2: number, y2: number, w: number, color: number, alpha = 1): void {
    this.cur.lineStyle(w, color, alpha);
    this.cur.lineBetween(x1, y1, x2, y2);
    // round caps (hairlines do not need them)
    if (w < 3.2) return;
    this.cur.fillStyle(color, alpha);
    this.disc(x1, y1, w / 2);
    this.disc(x2, y2, w / 2);
  }


  /** Image part (hybrid hero renderer). Parts sit above the Graphics layer (depth 3) in draw order. */
  part(set: PartSet, name: string, x: number, y: number, w: number, h: number, rot: number, flip: boolean, alpha: number, glow: number): void {
    const sc = this.scene;
    const f = set.frames[name];
    if (!sc || !f || !sc.textures.exists(set.key)) return;
    const k = w / f.w;
    const one = (key: string, fw: number, fh: number, add: boolean, a: number) => {
      let img = this.partPool[this.partUsed];
      if (!img) {
        img = sc.add.image(0, 0, set.key, name);
        this.partPool.push(img);
      }
      const seq = this.partUsed++;
      img.setTexture(key, name).setVisible(true).setPosition(x, y).setRotation(rot).setFlipX(flip).setAlpha(Math.min(1, a)).setBlendMode(add ? 1 : 0).setDepth(3 + seq * 0.0004);
      img.setDisplaySize(fw * k, fh * k);
    };
    if (glow > 0.01 && sc.textures.exists(set.glowKey)) one(set.glowKey, f.w + set.pad * 2, f.h + set.pad * 2, true, glow);
    one(set.key, f.w, f.h, false, alpha);
    void h;
  }
  /** A ring as a triangle strip (strokeCircle goes through Phaser's path code, which is slow). */
  private ring(x: number, y: number, r: number, w: number): void {
    if (r <= 0.5) return;
    const n = r < 10 ? 12 : r < 40 ? 20 : 32;
    const t = fan(n);
    const ro = r + w / 2;
    const ri = Math.max(0, r - w / 2);
    for (let i = 0; i < n; i++) {
      const c0 = t[i * 2]!;
      const s0 = t[i * 2 + 1]!;
      const c1 = t[i * 2 + 2]!;
      const s1 = t[i * 2 + 3]!;
      this.cur.fillTriangle(x + c0 * ro, y + s0 * ro, x + c1 * ro, y + s1 * ro, x + c0 * ri, y + s0 * ri);
      this.cur.fillTriangle(x + c1 * ro, y + s1 * ro, x + c1 * ri, y + s1 * ri, x + c0 * ri, y + s0 * ri);
    }
  }

  circle(x: number, y: number, r: number, fill: number | null, stroke: number | null, w = 2, alpha = 1): void {
    if (fill !== null) {
      this.cur.fillStyle(fill, alpha);
      this.disc(x, y, r);
    }
    if (stroke !== null) {
      this.cur.fillStyle(stroke, alpha);
      this.ring(x, y, r, w);
    }
  }

  poly(points: number[], fill: number, alpha = 1): void {
    this.cur.fillStyle(fill, alpha);
    if (points.length === 6) {
      this.cur.fillTriangle(points[0]!, points[1]!, points[2]!, points[3]!, points[4]!, points[5]!);
      return;
    }
    if (points.length === 8) {
      // quads as two triangles (no path triangulation)
      this.cur.fillTriangle(points[0]!, points[1]!, points[2]!, points[3]!, points[4]!, points[5]!);
      this.cur.fillTriangle(points[0]!, points[1]!, points[4]!, points[5]!, points[6]!, points[7]!);
      return;
    }
    // larger shapes as a fan from the centroid (all our shapes are star-shaped around it); no earcut per frame
    let cx = 0;
    let cy = 0;
    const n = points.length / 2;
    for (let i = 0; i < points.length; i += 2) {
      cx += points[i]!;
      cy += points[i + 1]!;
    }
    cx /= n;
    cy /= n;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      this.cur.fillTriangle(cx, cy, points[i * 2]!, points[i * 2 + 1]!, points[j * 2]!, points[j * 2 + 1]!);
    }
  }
}

const css = (c: number, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
const glowCache = new Map<number, HTMLCanvasElement>();
function glowSprite(color: number): HTMLCanvasElement {
  let cv = glowCache.get(color);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const c = cv.getContext('2d')!;
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, css(color, 1));
    g.addColorStop(0.25, css(color, 0.55));
    g.addColorStop(0.6, css(color, 0.15));
    g.addColorStop(1, css(color, 0));
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
    glowCache.set(color, cv);
  }
  return cv;
}

export class CanvasPen implements Pen {
  constructor(public ctx: CanvasRenderingContext2D) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  add(on: boolean): void {
    this.ctx.globalCompositeOperation = on ? 'lighter' : 'source-over';
  }

  glow(x: number, y: number, r: number, color: number, alpha = 1): void {
    if (r <= 1 || alpha <= 0.01) return;
    const c = this.ctx;
    const op = c.globalCompositeOperation;
    const ga = c.globalAlpha;
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = Math.min(1, alpha);
    c.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
    c.globalAlpha = ga;
    c.globalCompositeOperation = op;
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

  part(set: PartSet, name: string, x: number, y: number, w: number, h: number, rot: number, flip: boolean, alpha: number, glow: number): void {
    const f = set.frames[name];
    if (!f) return;
    const c = this.ctx;
    const k = w / f.w;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.scale(flip ? -1 : 1, 1);
    if (glow > 0.01) {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = Math.min(1, glow);
      const gw = (f.w + set.pad * 2) * k;
      const gh = (f.h + set.pad * 2) * k;
      c.drawImage(set.glow, f.x - set.pad, f.y - set.pad, f.w + set.pad * 2, f.h + set.pad * 2, -gw / 2, -gh / 2, gw, gh);
    }
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = Math.min(1, alpha);
    c.drawImage(set.img, f.x, f.y, f.w, f.h, -w / 2, -h / 2, w, h);
    c.restore();
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
