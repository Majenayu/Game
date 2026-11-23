// Cuts the lightning avatar parts out of "image (1).png" (transparent sheet, outlined parts), fills each part's
// inside with the dark body colour, trims it and writes parts/<name>.png plus rig.json (sizes).
// Run from Stickbound/: node gemini/parts/lightning/cut.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, 'image (1).png');
const OUT = join(here, 'parts');
mkdirSync(OUT, { recursive: true });

/** Body fill colour (the dark navy of the kit). */
const FILL = [20, 24, 51];
/** Boxes on the 1376x768 sheet: [x0, y0, x1, y1]. */
const BOXES = {
  head: [100, 50, 330, 275],
  ear: [480, 130, 540, 210],
  torso: [725, 40, 905, 295],
  pelvis: [1082, 108, 1240, 232],
  upperArm: [105, 325, 390, 485],
  forearm: [498, 362, 710, 458],
  hand: [816, 333, 1018, 482],
  fist: [1100, 342, 1265, 472],
  thigh: [105, 558, 415, 700],
  shin: [583, 588, 918, 682],
  foot: [1090, 560, 1285, 705],
};

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const rig = {};
for (const [name, [x0, y0, x1, y1]] of Object.entries(BOXES)) {
  const w = x1 - x0;
  const h = y1 - y0;
  const px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = ((y0 + y) * W + (x0 + x)) * 4;
      data.copy(px, (y * w + x) * 4, s, s + 4);
    }
  // Outside = transparent pixels reachable from the box border. Everything else that is transparent is inside.
  const solid = (i) => px[i * 4 + 3] > 60;
  const outside = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    if (outside[i] || solid(i)) continue;
    outside[i] = 1;
    const x = i % w;
    const y = (i / w) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w);
    if (y < h - 1) stack.push(i + w);
  }
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (outside[i]) {
      // keep soft glow edges and loose sparks as they are
      if (px[o + 3] < 8) continue;
    } else if (px[o + 3] < 250) {
      // inside: blend the body colour under the existing line
      const a = px[o + 3] / 255;
      for (let c = 0; c < 3; c++) px[o + c] = Math.round(px[o + c] * a + FILL[c] * (1 - a));
      px[o + 3] = 255;
    }
    const x = i % w;
    const y = (i / w) | 0;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;
  await sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: tw, height: th })
    .png()
    .toFile(join(OUT, `${name}.png`));
  rig[name] = { w: tw, h: th };
  console.log(name, tw, th);
}
writeFileSync(join(OUT, 'sizes.json'), JSON.stringify(rig, null, 2));
