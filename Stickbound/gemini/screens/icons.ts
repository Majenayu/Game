/**
 * Icons cut from the owner's sheet gemini/extra/element-icons.png: the ten element badges, the six rank badges, the
 * coin, the XP star, the fireball and the chest. Each one is cut out of the sheet's dark background when the sheet
 * loads (alpha from the colour distance to the background round it), so it sits on any screen.
 * art.ts draws these in place of its own shapes once the sheet is loaded.
 */
import { loadRef, ref } from './refs';
import type { El, Tier } from './save';
import type { G } from './ui';

export type IconName = El | Tier | 'coin' | 'xp' | 'fireball' | 'chest';

const ELS: El[] = ['fire', 'water', 'ice', 'lightning', 'wind', 'earth', 'leaf', 'light', 'gravity', 'time'];
/** rough boxes on the 1376 x 768 sheet; the cut trims each one to the icon inside */
const BOX: Record<IconName, [number, number, number, number]> = {
  ...(Object.fromEntries(ELS.map((e, i) => [e, [112 + i * 128 - 64, 58, 128, 190]])) as Record<El, [number, number, number, number]>),
  bronze: [45, 325, 195, 185],
  silver: [252, 325, 205, 180],
  gold: [470, 315, 225, 195],
  platinum: [700, 305, 195, 220],
  diamond: [898, 305, 195, 205],
  champion: [1092, 285, 262, 235],
  coin: [68, 548, 160, 165],
  xp: [282, 542, 170, 175],
  fireball: [500, 535, 175, 175],
  chest: [706, 542, 208, 182],
};
const cut = new Map<IconName, HTMLCanvasElement>();
let started = false;

function make(sheet: HTMLCanvasElement, name: IconName): HTMLCanvasElement {
  const k = sheet.width / 1376;
  const [bx, by, bw, bh] = BOX[name];
  const x0 = Math.round(bx * k);
  const y0 = Math.round(by * k);
  const w = Math.round(bw * k);
  const h = Math.round(bh * k);
  const d = sheet.getContext('2d', { willReadFrequently: true })!.getImageData(x0, y0, w, h);
  const px = d.data;
  // the background: the median of the box's border
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const take = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    rs.push(px[i]);
    gs.push(px[i + 1]);
    bs.push(px[i + 2]);
  };
  for (let x = 0; x < w; x++) take(x, 0), take(x, h - 1);
  for (let y = 0; y < h; y++) take(0, y), take(w - 1, y);
  const med = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1];
  const br = med(rs);
  const bg = med(gs);
  const bb = med(bs);
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dr = px[i] - br;
      const dg = px[i + 1] - bg;
      const db = px[i + 2] - bb;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      const a = Math.max(0, Math.min(1, (dist - 14) / 70));
      if (a > 0) {
        // take the background back out of the edge colours
        px[i] = Math.max(0, Math.min(255, br + dr / a));
        px[i + 1] = Math.max(0, Math.min(255, bg + dg / a));
        px[i + 2] = Math.max(0, Math.min(255, bb + db / a));
      }
      px[i + 3] = Math.round(a * 255);
      if (a > 0.35) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  const full = document.createElement('canvas');
  full.width = w;
  full.height = h;
  full.getContext('2d')!.putImageData(d, 0, 0);
  if (maxX <= minX || maxY <= minY) return full;
  // trim to the solid part, with a little room for the glow
  const pad = Math.round(4 * k);
  const cx = Math.max(0, minX - pad);
  const cy = Math.max(0, minY - pad);
  const cw = Math.min(w, maxX + pad + 1) - cx;
  const ch = Math.min(h, maxY + pad + 1) - cy;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  c.getContext('2d')!.drawImage(full, cx, cy, cw, ch, 0, 0, cw, ch);
  return c;
}

/** starts loading the sheet; the icons show from the next frame after it arrives */
export function loadIcons(): Promise<void> {
  started = true;
  return loadRef('element-icons').then(
    (sheet) => {
      for (const n of Object.keys(BOX) as IconName[]) if (!cut.has(n)) cut.set(n, make(sheet, n));
    },
    () => undefined,
  );
}

/**
 * Draws an icon from the sheet centred on (x, y), its longer side `size` px. Returns false while the sheet is not
 * loaded yet, so the caller can draw its own shape for that frame.
 */
export function icon(g: G, name: IconName, x: number, y: number, size: number, alpha = 1): boolean {
  let c = cut.get(name);
  if (!c) {
    const sheet = ref('element-icons');
    if (sheet) {
      void loadIcons();
      c = cut.get(name);
    } else if (!started) void loadIcons();
  }
  if (!c) return false;
  const s = size / Math.max(c.width, c.height);
  const w = c.width * s;
  const h = c.height * s;
  if (alpha !== 1) {
    g.save();
    g.globalAlpha *= alpha;
  }
  g.drawImage(c, x - w / 2, y - h / 2, w, h);
  if (alpha !== 1) g.restore();
  return true;
}
