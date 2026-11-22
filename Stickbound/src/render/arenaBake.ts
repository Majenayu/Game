// Bakes arena layers into offscreen canvases (once per arena and quality) and draws arenas on 2D canvases (the
// previews and the Power Lab). The Phaser fight turns the same canvases into textures (arenaView.ts).
import { ARENAS, BAKE_H, BAKE_W, BAKE_X, BAKE_Y, rng, sweepBeams, type ArenaDef } from './arenas';
import type { ArenaReact } from './arenaReact';
import { CanvasPen } from './pen';

export type Quality = 'high' | 'medium' | 'low';
/** bake resolution per quality (backgrounds are soft and dark, so half resolution is fine) */
export const BAKE_SCALE: Record<Quality, number> = { high: 0.6, medium: 0.5, low: 0.4 };

const cache = new Map<string, HTMLCanvasElement>();
const order: string[] = [];

function bake(a: ArenaDef, from: number, to: number, scale: number): HTMLCanvasElement {
  const key = `${a.id}:${from}-${to}:${scale}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = Math.round(BAKE_W * scale);
  c.height = Math.round(BAKE_H * scale);
  const ctx = c.getContext('2d')!;
  ctx.setTransform(scale, 0, 0, scale, -BAKE_X * scale, -BAKE_Y * scale);
  const pen = new CanvasPen(ctx);
  for (let i = from; i <= to; i++) {
    // each layer has its own seed, so the art is the same every time
    a.layers[i]!.draw(pen, rng(ARENAS.indexOf(a) * 1000 + i * 77 + 13));
    ctx.globalCompositeOperation = 'source-over';
  }
  cache.set(key, c);
  order.push(key);
  // keep the textures of at most 3 arena/quality sets in memory (phones)
  while (order.length > 18) cache.delete(order.shift()!);
  return c;
}

export interface BakedLayer {
  canvas: HTMLCanvasElement;
  scroll: number;
  scale: number;
  key: string;
}

/** The arena's layers for a quality: high and medium keep every parallax layer; low merges the background. */
export function bakedLayers(a: ArenaDef, q: Quality): BakedLayer[] {
  const s = BAKE_SCALE[q];
  const n = a.layers.length;
  if (q === 'low') {
    return [
      { canvas: bake(a, 0, n - 2, s), scroll: 0.3, scale: s, key: `${a.id}:bg:${s}` },
      { canvas: bake(a, n - 1, n - 1, s), scroll: 1, scale: s, key: `${a.id}:floor:${s}` },
    ];
  }
  return a.layers.map((l, i) => ({ canvas: bake(a, i, i, s), scroll: l.scroll, scale: s, key: `${a.id}:${i}:${s}` }));
}

/** Draws an arena on a 2D canvas whose transform already maps world px. No parallax (previews are static). */
export function drawArenaCanvas(ctx: CanvasRenderingContext2D, pen: CanvasPen, a: ArenaDef, t: number, A: ArenaReact, q: Quality, part: 'back' | 'front'): void {
  const detail = q === 'high' ? 1 : q === 'medium' ? 0.6 : 0.35;
  if (part === 'back') {
    const layers = bakedLayers(a, q);
    layers.forEach((l, i) => {
      ctx.drawImage(l.canvas, BAKE_X, BAKE_Y, BAKE_W, BAKE_H);
      // the animated hooks sit at their parallax depth between the layers
      if (q !== 'low') {
        if (i === 1) a.animFar?.(pen, t, A, detail);
        if (i === 2) a.animMid?.(pen, t, A, detail);
      }
    });
    sweepBeams(pen, t, a, A, detail);
    a.animNear?.(pen, t, A, detail);
    A.drawFloor(pen, t, a.accent);
    ctx.globalCompositeOperation = 'source-over';
  } else if (q !== 'low') {
    a.fg?.(pen, t, A, detail);
    ctx.globalCompositeOperation = 'source-over';
  }
}
