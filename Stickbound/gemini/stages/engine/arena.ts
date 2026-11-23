/**
 * What one arena folder gives the shared lab: the owner's picture, where its floor is,
 * the moving effects drawn on top (in the picture's own pixels), the sounds those effects make, and the music.
 * Effects are render only: they are a pure function of the frame number and never touch the fight.
 */
import type { Song, Air } from './audio';

export type G = CanvasRenderingContext2D;
export interface Pt {
  x: number;
  y: number;
}

/** A sound an effect makes when it starts. x is 0..1 across the picture (for panning). */
export interface ArenaSound {
  kind: SoundKind;
  x: number;
  big: boolean;
  ground: boolean;
}
export type SoundKind = 'thunder' | 'rumble' | 'crackle' | 'whoosh' | 'splash' | 'chime' | 'tick' | 'hum' | 'creak';

export interface ArenaDef<F = unknown> {
  /** folder name, e.g. 'firearena' */
  id: string;
  /** shown in the panel, e.g. 'Fire Arena' */
  name: string;
  /** panel heading icon */
  icon: string;
  /** URL of the picture */
  image: string;
  /**
   * Where the fighters stand, as a fraction of the picture height,
   * or a function that finds it in the picture (it gets the pixels and returns the fraction).
   */
  floor: number | ((img: ImageData) => number);
  /** colour used past the picture's top edge and bottom edge on tall screens */
  sky: string;
  ground: string;
  /** how much slower than the fighters the picture pans (0 = fixed to the stage) */
  pan?: number;
  /** label for the effects sound switch */
  sfxLabel: string;
  bake?: (img: HTMLCanvasElement, floor: number) => F;
  /** storm = 0..1 how dark the ultimate made the arena, flash = 0..1 the screen flash */
  draw?: (g: G, fx: F, frame: number, flash: number, storm: number) => void;
  /** sounds for effects that began in frames (from, to] */
  sounds?: (from: number, to: number, storm: number) => ArenaSound[];
  song: Song;
  air: Air;
  /** extra test hooks put on window */
  hooks?: Record<string, unknown>;
}

/** The lab's list of arenas (folder, name), for the arena switcher. */
export const ARENAS: Array<[string, string]> = [
  ['lightningarena', 'Lightning'],
  ['firearena', 'Fire'],
  ['waterarena', 'Water'],
  ['icearena', 'Ice'],
  ['windarena', 'Wind'],
  ['eartharena', 'Earth'],
  ['leafarena', 'Leaf'],
  ['lightarena', 'Light'],
  ['shadowarena', 'Shadow'],
  ['gravityarena', 'Gravity'],
  ['timearena', 'Time'],
];

// ------------------------------------------------------------------ helpers for arena effects
/** 0..1 hash of an integer (render only, never the fight RNG) */
export function hash(n: number): number {
  let h = (n | 0) * 374761393 + 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export function canvas(w: number, h: number): [HTMLCanvasElement, G] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return [c, c.getContext('2d')!];
}
/** a soft round glow sprite of one colour ('r,g,b') */
export function glow(rgb: string, size = 64): HTMLCanvasElement {
  const [c, g] = canvas(size, size);
  const r = size / 2;
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, `rgba(${rgb},1)`);
  gr.addColorStop(0.35, `rgba(${rgb},0.45)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  return c;
}
/**
 * Cut part of the picture into its own sprite: pixels inside the box for which keep(r,g,b) is 0..1.
 * Used to lift clouds, water, leaves or flames off the picture so they can move.
 */
export function lift(img: HTMLCanvasElement, x0: number, y0: number, x1: number, y1: number, keep: (r: number, g: number, b: number, x: number, y: number) => number): HTMLCanvasElement {
  const sx = img.width / 1376;
  const [c, g] = canvas((x1 - x0) * sx, (y1 - y0) * sx);
  g.drawImage(img, x0 * sx, y0 * sx, (x1 - x0) * sx, (y1 - y0) * sx, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  for (let i = 0, n = 0; i < p.length; i += 4, n++) {
    const k = keep(p[i], p[i + 1], p[i + 2], x0 + (n % c.width) / sx, y0 + Math.floor(n / c.width) / sx);
    p[i + 3] = Math.round(p[i + 3] * clamp01(k));
  }
  g.putImageData(d, 0, 0);
  return c;
}
/** Draws a lifted sprite at its home place shifted by dx,dy, cross-faded so a looping drift has no jump. */
export function drift(g: G, sprite: HTMLCanvasElement, x0: number, y0: number, w: number, h: number, frame: number, period: number, dx: number, dy: number, alpha = 1): void {
  const t = (frame % period) / period;
  for (const k of [0, 1]) {
    const u = (t + k * 0.5) % 1;
    const a = Math.sin(Math.PI * u) * alpha;
    if (a <= 0.002) continue;
    g.globalAlpha = a;
    g.drawImage(sprite, x0 + (u - 0.5) * dx, y0 + (u - 0.5) * dy, w, h);
  }
  g.globalAlpha = 1;
}
/** Sounds of a repeating timetable: event i of `n` slots fires at frame k*period + offset(i). */
export function timetable(from: number, to: number, period: number, n: number, salt: number, chance: number, make: (slot: number, cycle: number) => ArenaSound | null): ArenaSound[] {
  const out: ArenaSound[] = [];
  const slotLen = period / n;
  const first = Math.floor(from / slotLen);
  const last = Math.floor(to / slotLen);
  for (let s = first; s <= last && out.length < 4; s++) {
    if (hash(s * 31 + salt) > chance) continue;
    const at = s * slotLen + Math.floor(hash(s * 17 + salt + 5) * slotLen * 0.6);
    if (at > from && at <= to) {
      const e = make(s, Math.floor(s / n));
      if (e) out.push(e);
    }
  }
  return out;
}
/** Starting frame of timetable slot s (same placement as timetable()). */
export function slotStart(s: number, period: number, n: number, salt: number): number {
  const slotLen = period / n;
  return s * slotLen + Math.floor(hash(s * 17 + salt + 5) * slotLen * 0.6);
}

/**
 * Finds a floor edge: the row in the band (fractions y0..y1) where the picture changes most from the row above
 * (sum of brightness steps), weighted to prefer rows where the lower part is a wide flat surface.
 */
export function floorByEdge(d: ImageData, y0: number, y1: number): number {
  const { width: w, height: h, data } = d;
  const lum = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
  };
  let best = -1;
  let bestY = Math.round(h * (y0 + y1) / 2);
  for (let y = Math.round(h * y0) + 2; y < Math.round(h * y1); y++) {
    let s = 0;
    for (let x = Math.round(w * 0.2); x < w * 0.8; x += 2) s += Math.abs(lum(x, y) - lum(x, y - 2));
    if (s > best) {
      best = s;
      bestY = y;
    }
  }
  return bestY / h;
}
