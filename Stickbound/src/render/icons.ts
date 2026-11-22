// Element and status icons. Each element has its own shape, so the chart works without colour vision.

import { ELEMENTS, type ElementId, type IconShape } from '../content/elements';
import type { StatusId } from '../content/moves';

const PATHS: Record<IconShape, string> = {
  flame: 'M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 2-7 1 2 2 3 3 3 0-3 0-5 1-8z',
  drop: 'M12 2c4 6 7 9 7 13a7 7 0 0 1-14 0c0-4 3-7 7-13z',
  flake: 'M11 1h2v8l6-4 1 2-6 4 6 4-1 2-6-4v8h-2v-8l-6 4-1-2 6-4-6-4 1-2 6 4z',
  bolt: 'M14 1 4 14h7l-2 9 11-14h-7l1-8z',
  swirl: 'M3 8h11a3 3 0 1 0-3-3h2a1 1 0 1 1 1 1H3zm0 4h15a3 3 0 1 1-3 3h2a1 1 0 1 0 1-1H3zm0 4h7v2H3z',
  rock: 'M12 2 21 7v10l-9 5-9-5V7z',
  leaf: 'M4 20C4 9 10 4 21 3c-1 11-6 17-17 17zm2-2 9-9-1-1-9 9z',
  sun: 'M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zM11 0h2v4h-2zm0 20h2v4h-2zM0 11h4v2H0zm20 0h4v2h-4zM3.5 2 6.3 4.8 4.9 6.2 2 3.5zM17.7 17.8l2.8 2.8-1.4 1.4-2.8-2.8zM2 20.5l2.8-2.8 1.4 1.4L3.4 22zM17.8 6.3l2.8-2.8L22 4.9l-2.8 2.8z',
  well: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm0 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm-1 2h2v5h3l-4 4-4-4h3z',
  glass: 'M5 2h14v2l-5 8 5 8v2H5v-2l5-8-5-8zm3 2 4 6 4-6zm4 10-3 6h6z',
};

export function elementIcon(el: ElementId, size = 24, withBg = true): string {
  const info = ELEMENTS[el];
  const bg = withBg ? `<circle cx="12" cy="12" r="12" fill="${info.css[0]}"/>` : '';
  const fg = withBg ? '#ffffff' : info.css[0];
  return `<svg class="el-icon" width="${size}" height="${size}" viewBox="-2 -2 28 28" aria-label="${info.name}" role="img">${bg}<g transform="translate(2.4 2.4) scale(0.8)"><path d="${PATHS[info.icon]}" fill="${fg}" fill-rule="evenodd"/></g></svg>`;
}

export const STATUS_GLYPH: Record<StatusId, string> = {
  burn: 'M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 2-7 1 2 2 3 3 3 0-3 0-5 1-8z',
  slow: 'M4 6h16l-8 12z',
  freeze: 'M11 1h2v8l6-4 1 2-6 4 6 4-1 2-6-4v8h-2v-8l-6 4-1-2 6-4-6-4 1-2 6 4z',
  shock: 'M14 1 4 14h7l-2 9 11-14h-7l1-8z',
  root: 'M11 2h2v10l5 5-1.4 1.4L13 15v7h-2v-7l-3.6 3.4L6 17l5-5z',
  weak: 'M5 4h3l4 7 4-7h3l-5.5 9L19 20h-3l-4-6-4 6H5l5.5-7z',
  float: 'M12 2l6 7h-4v5h-4V9H6zM6 18h12v3H6z',
};

export const STATUS_NAME: Record<StatusId, string> = {
  burn: 'Burn',
  slow: 'Slow',
  freeze: 'Freeze',
  shock: 'Shock',
  root: 'Root',
  weak: 'Weak',
  float: 'Float',
};

export function statusIcon(s: StatusId, size = 18): string {
  return `<svg class="st-icon st-${s}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-label="${STATUS_NAME[s]}"><path d="${STATUS_GLYPH[s]}" fill="currentColor"/></svg>`;
}
