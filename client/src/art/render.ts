import { FL, GI } from './packs.gen';

/** Unique ids for SVG gradients (many pictures share one page). */
let uid = 0;
export const nextId = (p: string): string => `${p}${(uid = (uid + 1) % 1e9)}`;
export const hx = (n: number): string => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
/** Mixes a colour toward white (t > 0) or black (t < 0). */
export function shade(n: number, t: number): number {
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const f = (c: number) => Math.round(t >= 0 ? c + (255 - c) * t : c * (1 + t));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}

/** A colour picture from the Fluent pack, placed in a box (x, y, size) of the parent SVG. */
export function flPart(name: string, x: number, y: number, size: number, extra = ''): string {
  const a = FL[name];
  if (!a) return '';
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 ${a[0]} ${a[1]}" ${extra}>${a[2]}</svg>`;
}
/**
 * A game-icons shape filled with a metal / colour gradient and a dark outline, placed in a box of the parent SVG.
 * game-icons bodies use fill="currentColor"; we replace it with the gradient.
 */
export function giPart(name: string, x: number, y: number, size: number, color: number, opts: { rot?: number; glow?: number; flip?: boolean } = {}): string {
  const a = GI[name];
  if (!a) return '';
  const id = nextId('g');
  const body = a[2].replace(/currentColor/g, `url(#${id})`);
  const cx = x + size / 2;
  const cy = y + size / 2;
  const tf = `${opts.rot ? `rotate(${opts.rot} ${cx} ${cy})` : ''}${opts.flip ? ` translate(${cx * 2} 0) scale(-1 1)` : ''}`;
  const glow = opts.glow
    ? `<filter id="${id}f" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="${opts.glow}" flood-color="${hx(color)}"/></filter>`
    : '';
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hx(shade(color, 0.55))}"/><stop offset=".5" stop-color="${hx(color)}"/><stop offset="1" stop-color="${hx(shade(color, -0.45))}"/></linearGradient>${glow}</defs>
    <g transform="${tf}"${opts.glow ? ` filter="url(#${id}f)"` : ''}><svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 ${a[0]} ${a[1]}" style="overflow:visible"><g stroke="${hx(shade(color, -0.7))}" stroke-width="${a[0] / 64}">${body}</g></svg></g>`;
}
/** A square icon frame (64x64) used for cards. */
export function frame(inner: string, border: string, bg = '#141a33'): string {
  return `<svg class="ico" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="62" height="62" rx="12" fill="${bg}" stroke="${border}" stroke-width="2.5"/>${inner}</svg>`;
}
