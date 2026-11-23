// Cuts a Gemini parts kit (parts on a #00FF00 background) into trimmed part PNGs and packs a WebP atlas.
// Usage: node tools/cut-parts.mjs <element>
// Input:  gemini/characters/<element>/kit.png and gemini/characters/<element>/parts.json:
//   { "region": [x0,y0,x1,y1], "erase": [[x0,y0,x1,y1]], "rowBand": 150, "minArea": 600,
//     "order": ["head_normal", ...]   // part name per grid cell, in reading order (rows top to bottom, left to right)
//     "maxSize": 128 }                // longest side of a part in the atlas, in px
// Output: gemini/characters/<element>/out/<name>.png (trimmed, soft edges, despilled) and
//         public/parts/<element>.webp + <element>.json (atlas and frames; shipped, see docs/ASSETS.md).
// Fix a wrong part order by editing "order" in parts.json and running again.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const el = process.argv[2];
if (!el) {
  console.error('usage: node tools/cut-parts.mjs <element>');
  process.exit(1);
}
const root = path.resolve(import.meta.dirname, '..');
const dir = path.join(root, 'gemini/characters', el);
const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'parts.json'), 'utf8'));
const { data, info } = await sharp(path.join(dir, cfg.kit ?? 'kit.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;

// 1. chroma key with soft edges and despill. d = how much greener than the other channels.
const T0 = 35;
const T1 = 120;
const rgba = Buffer.from(data);
for (let i = 0; i < W * H; i++) {
  const r = rgba[i * 4];
  const g = rgba[i * 4 + 1];
  const b = rgba[i * 4 + 2];
  const d = g - Math.max(r, b);
  let a = d <= T0 ? 1 : d >= T1 ? 0 : 1 - (d - T0) / (T1 - T0);
  if (d > 0) rgba[i * 4 + 1] = Math.max(Math.min(g, Math.max(r, b) + 4), 0); // despill: never greener than the other channels
  rgba[i * 4 + 3] = Math.round(a * 255);
}

// 2. connected components of the opaque mask inside the region (minus erase rects)
const [rx0, ry0, rx1, ry1] = cfg.region ?? [0, 0, W, H];
const mask = new Uint8Array(W * H);
for (let y = ry0; y < ry1; y++) for (let x = rx0; x < rx1; x++) if (rgba[(y * W + x) * 4 + 3] > 128) mask[y * W + x] = 1;
for (const [ex0, ey0, ex1, ey1] of cfg.erase ?? []) for (let y = ey0; y < ey1; y++) for (let x = ex0; x < ex1; x++) mask[y * W + x] = 0;
const label = new Int32Array(W * H);
const comps = [];
const stack = new Int32Array(W * H);
for (let s = 0; s < W * H; s++) {
  if (!mask[s] || label[s]) continue;
  const id = comps.length + 1;
  let sp = 0;
  stack[sp++] = s;
  label[s] = id;
  let x0 = W, y0 = H, x1 = 0, y1 = 0, area = 0;
  while (sp) {
    const p = stack[--sp];
    const px = p % W;
    const py = (p / W) | 0;
    area++;
    if (px < x0) x0 = px;
    if (px > x1) x1 = px;
    if (py < y0) y0 = py;
    if (py > y1) y1 = py;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = px + dx;
      const ny = py + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const q = ny * W + nx;
      if (mask[q] && !label[q]) {
        label[q] = id;
        stack[sp++] = q;
      }
    }
  }
  comps.push({ id, x0, y0, x1, y1, area });
}
const big = comps.filter((c) => c.area >= (cfg.minArea ?? 600));
const band = cfg.rowBand ?? 150;
big.sort((a, b) => Math.floor((a.y0 + a.y1) / 2 / band) - Math.floor((b.y0 + b.y1) / 2 / band) || a.x0 - b.x0);
const order = cfg.order ?? [];
if (order.length !== big.length) console.warn(`WARNING: found ${big.length} parts but parts.json lists ${order.length} names`);

// 3. crop each part (pixels of other components inside its box are cleared), trim, save
fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
const parts = [];
for (let n = 0; n < big.length; n++) {
  const c = big[n];
  const name = order[n] ?? `part_${n}`;
  const pad = 2;
  const x0 = Math.max(0, c.x0 - pad);
  const y0 = Math.max(0, c.y0 - pad);
  const x1 = Math.min(W - 1, c.x1 + pad);
  const y1 = Math.min(H - 1, c.y1 + pad);
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const si = ((y0 + y) * W + x0 + x) * 4;
      const di = (y * w + x) * 4;
      // keep the soft edge pixels around this component; clear pixels that belong to another component
      const lab = label[(y0 + y) * W + x0 + x];
      const own = lab === c.id || lab === 0;
      buf[di] = rgba[si];
      buf[di + 1] = rgba[si + 1];
      buf[di + 2] = rgba[si + 2];
      buf[di + 3] = own ? rgba[si + 3] : 0;
    }
  // sample the outline: along the middle row from the left, the first bright run (alpha > 0.9 and luma > 120)
  let outlinePx = 0;
  let oc = [255, 255, 255];
  const my = (h / 2) | 0;
  let run = 0;
  let sum = [0, 0, 0];
  for (let x = 0; x < w; x++) {
    const di = (my * w + x) * 4;
    const luma = 0.3 * buf[di] + 0.59 * buf[di + 1] + 0.11 * buf[di + 2];
    if (buf[di + 3] > 230 && luma > 110 && Math.max(buf[di], buf[di + 1], buf[di + 2]) - Math.min(buf[di], buf[di + 1], buf[di + 2]) > 70) {
      run++;
      sum = [sum[0] + buf[di], sum[1] + buf[di + 1], sum[2] + buf[di + 2]];
    } else if (run) break;
  }
  if (run) {
    outlinePx = run;
    oc = sum.map((v) => Math.round(v / run));
  }
  const png = await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  fs.writeFileSync(path.join(dir, 'out', `${name}.png`), png);
  parts.push({ name, w, h, outlinePx, outlineColor: oc, png });
  console.log(`${name}: ${w}x${h} outline ${outlinePx}px rgb(${oc})`);
}

// 4. scale to maxSize, pack on shelves with padding for the baked glow, write WebP atlas + JSON
const maxSize = cfg.maxSize ?? 128;
const PAD = 10;
const scaled = [];
for (const p of parts) {
  const k = Math.min(1, maxSize / Math.max(p.w, p.h));
  const w = Math.max(1, Math.round(p.w * k));
  const h = Math.max(1, Math.round(p.h * k));
  const img = await sharp(p.png).resize(w, h, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
  scaled.push({ ...p, sw: w, sh: h, k, img });
}
const ATLAS_W = 512;
let x = 0;
let y = 0;
let rowH = 0;
const frames = {};
for (const p of scaled) {
  const bw = p.sw + PAD * 2;
  const bh = p.sh + PAD * 2;
  if (x + bw > ATLAS_W) {
    x = 0;
    y += rowH;
    rowH = 0;
  }
  p.ax = x + PAD;
  p.ay = y + PAD;
  x += bw;
  rowH = Math.max(rowH, bh);
}
const ATLAS_H = y + rowH;
const atlas = Buffer.alloc(ATLAS_W * ATLAS_H * 4);
for (const p of scaled) {
  for (let yy = 0; yy < p.sh; yy++)
    for (let xx = 0; xx < p.sw; xx++) {
      const si = (yy * p.sw + xx) * 4;
      const di = ((p.ay + yy) * ATLAS_W + p.ax + xx) * 4;
      atlas[di] = p.img[si];
      atlas[di + 1] = p.img[si + 1];
      atlas[di + 2] = p.img[si + 2];
      atlas[di + 3] = p.img[si + 3];
    }
  frames[p.name] = { x: p.ax, y: p.ay, w: p.sw, h: p.sh, src: [p.w, p.h], outlinePx: +(p.outlinePx * p.k).toFixed(2), outline: (p.outlineColor[0] << 16) | (p.outlineColor[1] << 8) | p.outlineColor[2] };
}
const outDir = path.join(root, 'public/parts');
fs.mkdirSync(outDir, { recursive: true });
let q = 82;
let webp;
for (; q >= 40; q -= 8) {
  webp = await sharp(atlas, { raw: { width: ATLAS_W, height: ATLAS_H, channels: 4 } }).webp({ quality: q, alphaQuality: 90 }).toBuffer();
  if (webp.length <= 300 * 1024) break;
}
fs.writeFileSync(path.join(outDir, `${el}.webp`), webp);
fs.writeFileSync(path.join(outDir, `${el}.json`), JSON.stringify({ width: ATLAS_W, height: ATLAS_H, pad: PAD, frames }, null, 1));
console.log(`atlas ${ATLAS_W}x${ATLAS_H}, ${(webp.length / 1024).toFixed(0)} KB (quality ${q}) -> public/parts/${el}.webp`);
