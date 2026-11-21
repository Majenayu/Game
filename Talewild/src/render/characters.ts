// Layered character builder (skin, hair colour and style, outfit) with 4-direction walk cycles,
// plus Nib, the ink-drop companion. Everything is drawn in code at load.

import type { Dir } from '../core/input';
import type { Look } from '../core/save';
import { HAIR_COLOURS, HAIR_STYLES, OUTFITS, SKINS } from '../content/looks';
import { ART_SCALE, makeCanvas, OUTLINE, PixelGrid, shade } from './pixels';

export const CHAR_W = 16 * ART_SCALE;
export const CHAR_H = 24 * ART_SCALE;
export const DIR_ORDER: Dir[] = ['down', 'left', 'right', 'up'];
export const WALK_FRAMES = 3;

/** frame 0 = standing, 1 = left foot forward, 2 = right foot forward */
function drawCharacter(look: Look, dir: Dir, frame: number): PixelGrid {
  const g = new PixelGrid(16, 24);
  const skin = SKINS[look.skin % SKINS.length]!;
  const hair = HAIR_COLOURS[look.hair % HAIR_COLOURS.length]!;
  const style = HAIR_STYLES[look.hairStyle % HAIR_STYLES.length]!;
  const [main, dark, accent] = OUTFITS[look.outfit % OUTFITS.length]!;
  const bob = frame === 0 ? 0 : 1;
  const boot = '#4a3022';
  const side = dir === 'left' || dir === 'right';

  // legs
  const legL = frame === 1 ? -1 : 0;
  const legR = frame === 2 ? -1 : 0;
  if (side) {
    const fwd = dir === 'right' ? 1 : -1;
    const a = frame === 1 ? fwd : frame === 2 ? -fwd : 0;
    g.rect(7 + a, 18, 2, 4, boot);
    g.rect(7 - a, 18, 2, 4, shade(boot, -0.25));
  } else {
    g.rect(5, 18 + legL, 2, 4 - legL, boot);
    g.rect(9, 18 + legR, 2, 4 - legR, boot);
  }

  // body (tunic with a darker side and an accent belt)
  const by = 11 + bob;
  g.rect(4, by, 8, 8 - bob, main);
  g.rect(side ? (dir === 'right' ? 4 : 10) : 10, by, 2, 8 - bob, dark);
  g.rect(4, by + 5, 8, 1, accent);
  // arms
  const swing = frame === 0 ? 0 : 1;
  if (side) {
    g.rect(7, by + 1 + (frame === 1 ? swing : 0), 2, 4, dark);
    g.set(7, by + 5 + (frame === 1 ? swing : 0), skin);
  } else {
    g.rect(3, by + 1 + (frame === 1 ? swing : 0), 1, 4, main);
    g.rect(12, by + 1 + (frame === 2 ? swing : 0), 1, 4, dark);
    g.set(3, by + 5 + (frame === 1 ? swing : 0), skin);
    g.set(12, by + 5 + (frame === 2 ? swing : 0), skin);
  }

  // head
  const hy = 2 + bob;
  g.rect(4, hy + 1, 8, 8, skin);
  g.rect(5, hy, 6, 1, skin);

  // hair (back layer first)
  if (style === 'long') {
    if (dir === 'up') g.rect(4, hy + 1, 8, 10, hair);
    else if (side) g.rect(dir === 'right' ? 4 : 9, hy + 2, 3, 9, hair);
    else {
      g.rect(3, hy + 2, 2, 9, hair);
      g.rect(11, hy + 2, 2, 9, hair);
    }
  }
  if (dir === 'up') {
    g.rect(4, hy, 8, 8, hair);
    if (style === 'bun') g.rect(6, hy - 2, 4, 3, hair);
  } else {
    g.rect(4, hy, 8, 3, hair);
    g.rect(5, hy - 1, 6, 1, hair);
    if (side) g.rect(dir === 'right' ? 4 : 10, hy + 2, 2, 4, hair);
    else {
      g.rect(4, hy + 2, 1, 3, hair);
      g.rect(11, hy + 2, 1, 3, hair);
    }
    if (style === 'bun') g.rect(6, hy - 3, 4, 3, hair);
  }
  if (style === 'cap') {
    g.rect(4, hy - 1, 8, 3, accent);
    if (dir === 'down') g.rect(4, hy + 2, 8, 1, shade(accent, -0.3));
    if (side) g.rect(dir === 'right' ? 11 : 1, hy + 2, 4, 1, shade(accent, -0.3));
  }

  // face
  if (dir === 'down') {
    g.set(6, hy + 5, OUTLINE);
    g.set(9, hy + 5, OUTLINE);
    g.set(5, hy + 6, '#e88c8c');
    g.set(10, hy + 6, '#e88c8c');
    g.rect(7, hy + 7, 2, 1, shade(skin, -0.3));
  } else if (side) {
    const ex = dir === 'right' ? 9 : 6;
    g.set(ex, hy + 5, OUTLINE);
    g.set(dir === 'right' ? 10 : 5, hy + 6, '#e88c8c');
  }

  g.outline();
  // ground shadow (drawn last, under the outline pass so it stays soft)
  for (let x = 4; x < 12; x++) if (!g.get(x, 22)) g.set(x, 22, 'rgba(0,0,0,0.25)');
  return g;
}

/** Sprite sheet: 4 rows (down, left, right, up) x 3 frames, each CHAR_W x CHAR_H. */
export function buildCharacterSheet(look: Look): HTMLCanvasElement {
  const c = makeCanvas(CHAR_W * WALK_FRAMES, CHAR_H * DIR_ORDER.length);
  const ctx = c.getContext('2d')!;
  DIR_ORDER.forEach((dir, row) => {
    for (let f = 0; f < WALK_FRAMES; f++) drawCharacter(look, dir, f).paint(ctx, f * CHAR_W, row * CHAR_H);
  });
  return c;
}

/** Head-and-shoulders portrait for the dialogue box. */
export function buildPortrait(look: Look, size = 96): HTMLCanvasElement {
  const g = drawCharacter(look, 'down', 0);
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d')!;
  const scale = size / 16;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const col = g.get(x, y);
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x * scale, y * scale + scale, scale, scale);
    }
  return c;
}

// ---- Nib ------------------------------------------------------------------------------------------------------

export const NIB_W = 12 * ART_SCALE;
export const NIB_H = 14 * ART_SCALE;
const INK = '#283a7a';
const INK_LIGHT = '#5d79d6';
const NIB_GOLD = '#f2c14e';

function drawNib(dir: Dir, frame: number): PixelGrid {
  const g = new PixelGrid(12, 14);
  const b = frame; // bob
  g.rect(5, 0 + b, 2, 3, NIB_GOLD);
  g.set(5, 1 + b, shade(NIB_GOLD, -0.3));
  g.oval(1, 3 + b, 10, 9, INK);
  g.rect(4, 2 + b, 4, 2, INK);
  if (dir !== 'up') {
    const off = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    g.set(3 + off, 5 + b, INK_LIGHT);
    g.set(4 + off, 4 + b, INK_LIGHT);
    for (const ex of [4, 7]) {
      g.rect(ex + off, 6 + b, 2, 2, '#ffffff');
      g.set(ex + off + (off > 0 ? 1 : 0), 7 + b, OUTLINE);
    }
    g.set(5 + off, 9 + b, '#f08aa0');
    g.set(6 + off, 9 + b, '#f08aa0');
  } else {
    g.set(7, 5 + b, INK_LIGHT);
  }
  g.outline();
  for (let x = 3; x < 9; x++) if (!g.get(x, 13)) g.set(x, 13, 'rgba(0,0,0,0.25)');
  return g;
}

/** 4 rows (down, left, right, up) x 2 bob frames. */
export function buildNibSheet(): HTMLCanvasElement {
  const c = makeCanvas(NIB_W * 2, NIB_H * DIR_ORDER.length);
  const ctx = c.getContext('2d')!;
  DIR_ORDER.forEach((dir, row) => {
    for (let f = 0; f < 2; f++) drawNib(dir, f).paint(ctx, f * NIB_W, row * NIB_H);
  });
  return c;
}

export function buildNibPortrait(size = 96): HTMLCanvasElement {
  const g = drawNib('down', 0);
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d')!;
  const scale = Math.floor(size / 14);
  const ox = (size - 12 * scale) / 2;
  for (let y = 0; y < 14; y++)
    for (let x = 0; x < 12; x++) {
      const col = g.get(x, y);
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + x * scale, y * scale, scale, scale);
    }
  return c;
}
