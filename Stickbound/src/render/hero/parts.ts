import type Phaser from 'phaser';
// Image parts for the hybrid hero renderer (heads, hair, ear discs, cores, fists, feet), cut from the owner's Gemini
// parts kits by tools/cut-parts.mjs into public/parts/<element>.webp + .json. Loaded lazily per element; until a set
// has loaded (or when an element has no kit) the code-drawn head is used.

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
  src: [number, number];
  /** outline thickness in atlas pixels (at the atlas scale) */
  outlinePx: number;
  /** sampled outline colour 0xRRGGBB */
  outline: number;
}

export interface PartSet {
  el: string;
  img: HTMLImageElement;
  /** blurred tinted copy of the atlas (the outer glow), baked at load */
  glow: HTMLCanvasElement;
  frames: Record<string, Frame>;
  pad: number;
  key: string;
  glowKey: string;
}

const cache = new Map<string, PartSet | null | Promise<PartSet | null>>();
const BASE = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

export function getParts(el: string): PartSet | null {
  const c = cache.get(el);
  return c && !(c instanceof Promise) ? c : null;
}

function bakeGlow(img: HTMLImageElement, color: number, pad: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth;
  cv.height = img.naturalHeight;
  const ctx = cv.getContext('2d')!;
  ctx.shadowColor = `rgb(${(color >> 16) & 255},${(color >> 8) & 255},${color & 255})`;
  ctx.shadowBlur = pad * 0.9;
  ctx.shadowOffsetX = cv.width;
  // draw the atlas off canvas: only its blurred, tinted shadow lands on the canvas
  ctx.drawImage(img, -cv.width, 0);
  ctx.drawImage(img, -cv.width, 0);
  return cv;
}

/** Loads the part set for an element. Resolves to null when the element has no kit. Safe to call repeatedly. */
export function loadParts(el: string): Promise<PartSet | null> {
  const c = cache.get(el);
  if (c instanceof Promise) return c;
  if (c !== undefined) return Promise.resolve(c);
  const p = (async (): Promise<PartSet | null> => {
    try {
      const res = await fetch(`${BASE}parts/${el}.json`);
      if (!res.ok) return null;
      const meta = (await res.json()) as { pad: number; frames: Record<string, Frame> };
      const img = new Image();
      img.src = `${BASE}parts/${el}.webp`;
      await img.decode();
      const outline = meta.frames.head_normal?.outline ?? 0xffe14a;
      const set: PartSet = { el, img, glow: bakeGlow(img, outline, meta.pad), frames: meta.frames, pad: meta.pad, key: `parts-${el}`, glowKey: `parts-${el}-glow` };
      return set;
    } catch {
      return null;
    }
  })().then((s) => {
    cache.set(el, s);
    return s;
  });
  cache.set(el, p);
  return p;
}

/** Registers a loaded set as Phaser textures (once per game). */
export function registerParts(scene: Phaser.Scene, set: PartSet): void {
  if (scene.textures.exists(set.key)) return;
  const t = scene.textures.addImage(set.key, set.img);
  const g = scene.textures.addCanvas(set.glowKey, set.glow);
  if (!t || !g) return;
  for (const [name, f] of Object.entries(set.frames)) {
    t.add(name, 0, f.x, f.y, f.w, f.h);
    g.add(name, 0, f.x - set.pad, f.y - set.pad, f.w + set.pad * 2, f.h + set.pad * 2);
  }
}
